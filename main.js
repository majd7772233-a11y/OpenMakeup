import { OpenMakeup, MORPH_CONTROLS } from './src/index.js';
import { hasLiveCameraTrack, waitForCameraFrames } from './src/core/cameraReadiness.js';

const $ = (id) => document.getElementById(id);
const statusText = $('status-text');
const statusBox = $('status');
const statusIcon = $('status-icon');
const actionButtons = [...document.querySelectorAll('.makeup-grid button, .looks button, .quick-actions button, .switches input')];
const sliders = [];
let engineReady = false;
let currentLanguage = 'ar';
let isFullscreenPreview = false;
let resumeInProgress = false;
let hiddenAt = 0;
let lastStatusKey = 'statusLoading';

const dictionaries = {
  ar: {
    tagline:'جمالك، بطريقتك', livePreview:'المعاينة المباشرة', fullscreenTitle:'تكبير المعاينة إلى ملء الشاشة',
    studioChip:'✦ استوديو الجمال المباشر', statusLoading:'جارٍ تجهيز الاستوديو...', looksTitle:'إطلالات سريعة',
    looksSubtitle:'اختاري ألوانك بلمسة واحدة', rose:'وردي', berry:'توتي', nude:'طبيعي', makeupTitle:'مستحضرات التجميل',
    lipstick:'ملمع الشفاه', eyeshadow:'ظلال لامعة', eyeline:'كحل العين', blush:'أحمر الخدود',
    foundation:'كريم الأساس', mascara:'ماسكارا', clear:'مسح المكياج', reset:'إعادة ضبط الملامح',
    sculptTitle:'تعديل ملامح الوجه', sculptSubtitle:'تحكم دقيق بالتغييرات', morphLoading:'جارٍ تحميل أدوات تعديل الوجه...',
    wireframe:'عرض الشبكة', blur:'تنعيم ناعم', privacy:'تتم معالجة معاينة الكاميرا على جهازك. لا يرفع التطبيق بث الكاميرا إلى خادم.',
    footer:'Open Makeup · صُنع للإبداع ✦', aboutSubtitle:'لمسة من السحر، بتقنيات مفتوحة المصدر.',
    closeAbout:'إغلاق شاشة عن التطبيق', aboutIntro:'استوديو تجميل افتراضي تفاعلي يتيح لك تجربة ألوان المكياج واستكشاف تعديل ملامح الوجه عبر الكاميرا، بواجهة زجاجية أنيقة.',
    aboutMediaPipe:'يتتبع نقاط الوجه داخل الصورة لتتحرك التأثيرات معه لحظيًا.',
    aboutWebGL:'رسوم ثلاثية الأبعاد وتأثيرات تظليل تُعرض باستخدام معالج الرسوميات.',
    aboutLocalTitle:'⌁ معالجة محلية', aboutLocal:'المعاينة تُعالج محليًا ضمن التطبيق، ويُطلب إذن الكاميرا من أندرويد.',
    aboutAndroidTitle:'◇ أندرويد 6.0+', aboutAndroid:'مصمم لأندرويد 6.0 وما بعده، بحسب دعم WebView والرسوميات في الجهاز.',
    creatorLabel:'تطوير', aboutDetails:'MediaPipe إطار مفتوح المصدر من Google لتقنيات الإدراك والتعلم الآلي. يستخدم التطبيق حل Face Mesh مع رسوم WebGL. قد تختلف النتائج بحسب الإضاءة والكاميرا وأداء الجهاز وإصدار Android System WebView.',
    projectButton:'المشروع على GitHub ↗', contactButton:'تواصل مع المطوّر ↗', version:'Open Makeup · الإصدار 1.2.0',
    aboutFooter:'للإبداع، لا للكمال.', statusWaiting:'محرك الوجه غير جاهز بعد. انتظر قليلًا من فضلك.',
    statusActionError:'تعذّر تنفيذ الإجراء', statusReady:'الكاميرا تعمل والاستوديو جاهز. جرّب إطلالة.',
    statusNoCamera:'المحرك جاهز. إذا لم تظهر المعاينة، تحقق من إذن الكاميرا وAndroid System WebView.',
    statusEngineError:'تعذّر تشغيل محرك الوجه. تحقق من إذن الكاميرا ودعم WebGL وحدّث Android System WebView.',
    statusStudio:'الاستوديو جاهز', statusRose:'تم تطبيق الإطلالة الوردية.', statusBerry:'تم تطبيق الإطلالة التوتية.',
    statusNude:'تم تطبيق الإطلالة الطبيعية.', statusLipstick:'تم تطبيق ملمع الشفاه.', statusEyeshadow:'تم تطبيق ظلال العيون.',
    statusEyeline:'تم تطبيق كحل العين.', statusBlush:'تم تطبيق أحمر الخدود.', statusFoundation:'تم تطبيق كريم الأساس.',
    statusMascara:'تم تطبيق الماسكارا.', statusClear:'تم مسح المكياج.', statusReset:'تمت إعادة ضبط ملامح الوجه.',
    statusWireframe:'تم تحديث عرض الشبكة.', statusBlur:'تم تحديث التنعيم.', statusErrorFallback:'حدث خطأ غير متوقع.',
    statusFullscreen:'تم تفعيل المعاينة بملء الشاشة.', statusCameraResume:'جارٍ استئناف الكاميرا...',
    statusCameraResumeError:'تعذّر استئناف الكاميرا. يمكنك إعادة المحاولة دون فقد الإطلالة.',
    retryCamera:'إعادة محاولة الكاميرا',
    statusSessionRestoreWarning:'عاد الاستوديو للعمل، لكن تعذّر استعادة بعض التأثيرات المحفوظة.',
    fullscreenExit:'إنهاء ملء الشاشة',
    morphFallback:'لا توجد أدوات لتعديل الوجه في النموذج المضمّن.', liftBrow:'رفع الحاجب', plumpLips:'امتلاء الشفاه',
    plumpLipsVariant:'امتلاء الشفاه (بديل)', slimNose:'تنحيف الأنف', noseBridge:'تعديل جسر الأنف',
    fullerCheeks:'امتلاء الخدين', jawAngle:'تحديد زاوية الفك', jawWide:'عرض الفك',
    liftBrowAbout:'رفع الطرف الخارجي للحاجب', plumpLipsAbout:'زيادة امتلاء الشفاه',
    plumpLipsVariantAbout:'نسخة بديلة لامتلاء الشفاه', slimNoseAbout:'تضييق الأنف', noseBridgeAbout:'تعديل المنطقة بين العينين',
    fullerCheeksAbout:'إضافة امتلاء للخدين', jawAngleAbout:'إبراز زاوية الفك', jawWideAbout:'توسيع زاوية الفك',
    advancedControl:'تحكم متقدم', switchLanguage:'EN · English'
  },
  en: {
    tagline:'Your look, your rules', livePreview:'Live preview', fullscreenTitle:'Expand preview to full screen',
    studioChip:'✦ LIVE BEAUTY STUDIO', statusLoading:'Preparing your studio...', looksTitle:'Quick looks',
    looksSubtitle:'Try a color story in one tap', rose:'Rose', berry:'Berry', nude:'Nude', makeupTitle:'Makeup',
    lipstick:'Lip gloss', eyeshadow:'Glitter shadow', eyeline:'Eyeliner', blush:'Blush',
    foundation:'Foundation', mascara:'Mascara', clear:'Clear makeup', reset:'Reset face shape',
    sculptTitle:'Face sculpt', sculptSubtitle:'Fine-tune your features', morphLoading:'Loading face controls...',
    wireframe:'Mesh view', blur:'Soft focus', privacy:'Your camera preview is processed on this device. The app does not upload your camera feed to a server.',
    footer:'Open Makeup · Made for creativity ✦', aboutSubtitle:'A little magic, powered by open technology.',
    closeAbout:'Close About screen', aboutIntro:'An interactive virtual beauty studio to explore makeup colors and face-shaping controls through your camera, wrapped in a polished glass-inspired interface.',
    aboutMediaPipe:'Tracks facial landmarks so makeup effects can follow your face in real time.',
    aboutWebGL:'GPU-powered 3D rendering and shader effects create the virtual makeup layers.',
    aboutLocalTitle:'⌁ On-device processing', aboutLocal:'The preview is processed locally in the app; Android asks for camera permission.',
    aboutAndroidTitle:'◇ Android 6.0+', aboutAndroid:'Designed for Android 6.0 and newer, depending on device WebView and graphics support.',
    creatorLabel:'Created with care by', aboutDetails:'MediaPipe is Google’s open-source framework for machine-learning perception. This app uses Face Mesh with WebGL rendering. Results vary with lighting, camera quality, device performance, and Android System WebView.',
    projectButton:'View project on GitHub ↗', contactButton:'Contact the creator ↗', version:'Open Makeup · Version 1.2.0',
    aboutFooter:'Made for creativity, not perfection.', statusWaiting:'The face engine is not ready yet. Please wait a moment.',
    statusActionError:'Could not complete action', statusReady:'Camera is live and the studio is ready. Try a look.',
    statusNoCamera:'Engine ready. If the preview is blank, check camera permission and Android System WebView.',
    statusEngineError:'Could not start the face engine. Check camera permission, WebGL support, and Android System WebView.',
    statusStudio:'Studio ready', statusRose:'Rose look applied.', statusBerry:'Berry look applied.',
    statusNude:'Nude look applied.', statusLipstick:'Lip gloss applied.', statusEyeshadow:'Eyeshadow applied.',
    statusEyeline:'Eyeliner applied.', statusBlush:'Blush applied.', statusFoundation:'Foundation applied.',
    statusMascara:'Mascara applied.', statusClear:'Makeup cleared.', statusReset:'Face shape reset.',
    statusWireframe:'Mesh view updated.', statusBlur:'Soft focus updated.', statusErrorFallback:'Something unexpected went wrong.',
    statusFullscreen:'Full-screen preview enabled.', statusCameraResume:'Resuming camera...',
    statusCameraResumeError:'Could not resume the camera. Retry without losing your saved look.',
    retryCamera:'Retry camera',
    statusSessionRestoreWarning:'The studio resumed, but some saved effects could not be restored.',
    fullscreenExit:'Exit full screen',
    morphFallback:'No face-shape controls were found in the bundled model.', liftBrow:'Brow lift', plumpLips:'Lip plump',
    plumpLipsVariant:'Lip plump (variant)', slimNose:'Nose slim', noseBridge:'Nose bridge',
    fullerCheeks:'Fuller cheeks', jawAngle:'Jaw angle', jawWide:'Jaw width',
    liftBrowAbout:'Lift the outer brow corner', plumpLipsAbout:'Add fullness to the lips',
    plumpLipsVariantAbout:'Alternative lip fullness control', slimNoseAbout:'Narrow the nose',
    noseBridgeAbout:'Adjust the bridge between the eyes', fullerCheeksAbout:'Add fullness to the cheeks',
    jawAngleAbout:'Define the jaw angle', jawWideAbout:'Widen the jaw angle',
    advancedControl:'Advanced control', switchLanguage:'عربي · العربية'
  }
};

function createEngine() {
  return new OpenMakeup({
    video: $('video'),
    renderCanvas: $('renderCanvas'),
    assetsBaseUrl: './assets',
    mediapipeBaseUrl: './mediapipe/face_mesh',
    aiColor: async () => '#c21f4d',
  });
}

let mk = createEngine();
const SESSION_KEY = 'openMakeupSessionState';

function readSessionState() {
  const fallback = { makeup: {}, morphs: {}, activeLook: null, wireframe: false, blur: false };
  try {
    const parsed = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    if (!parsed || typeof parsed !== 'object') return fallback;
    const makeup = parsed.makeup && typeof parsed.makeup === 'object' ? parsed.makeup : {};
    const rawMorphs = parsed.morphs && typeof parsed.morphs === 'object' ? parsed.morphs : {};
    const morphs = {};
    for (const [name, value] of Object.entries(rawMorphs)) {
      if (Number.isFinite(Number(value))) morphs[name] = Math.max(-1, Math.min(1.5, Number(value)));
    }
    return {
      makeup,
      morphs,
      activeLook: typeof parsed.activeLook === 'string' ? parsed.activeLook : null,
      wireframe: parsed.wireframe === true,
      blur: parsed.blur === true,
    };
  } catch (_) {
    return fallback;
  }
}
const sessionState = readSessionState();

function persistSessionState() {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(sessionState)); } catch (_) {}
}

function updateLayerButtonStates() {
  const buttonIds = { lipstick: 'lipstick', eyeshadow: 'eyeshadow', eyeline: 'eyeline',
    blush: 'blush', foundation: 'foundation', mascara: 'mascara' };
  for (const [category, id] of Object.entries(buttonIds)) {
    const button = $(id);
    const active = Object.prototype.hasOwnProperty.call(sessionState.makeup, category);
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  for (const look of ['rose', 'berry', 'nude']) {
    const button = $('look-' + look);
    const active = sessionState.activeLook === look;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
}

async function restoreSessionState() {
  const restoreErrors = [];
  for (const [category, options] of Object.entries(sessionState.makeup)) {
    try {
      await mk.apply(category, options || {});
    } catch (error) {
      restoreErrors.push(category + ': ' + (error && error.message ? error.message : String(error)));
      delete sessionState.makeup[category];
    }
  }
  for (const [name, value] of Object.entries(sessionState.morphs)) {
    try { mk.setMorph(name, value); } catch (error) { restoreErrors.push(name + ': ' + (error.message || String(error))); }
  }
  try {
    mk.setWireframe(sessionState.wireframe);
    mk.setBlur(sessionState.blur);
  } catch (error) {
    restoreErrors.push('view settings: ' + (error.message || String(error)));
  }
  $('wireframe').checked = sessionState.wireframe;
  $('blur').checked = sessionState.blur;
  for (const item of sliders) {
    if (Object.prototype.hasOwnProperty.call(sessionState.morphs, item.name)) {
      item.input.value = String(sessionState.morphs[item.name]);
      item.output.textContent = Number(item.input.value).toFixed(2);
    }
  }
  updateLayerButtonStates();
  persistSessionState();
  return restoreErrors;
}

async function applyLayer(category, options) {
  const result = await mk.apply(category, options);
  sessionState.makeup[category] = JSON.parse(JSON.stringify(options || {}));
  sessionState.activeLook = null;
  updateLayerButtonStates();
  persistSessionState();
  return result;
}

async function restoreMakeupSnapshot(snapshot) {
  mk.clearAll();
  for (const [category, options] of Object.entries(snapshot)) await mk.apply(category, options || {});
}

function t(key) { return dictionaries[currentLanguage][key] || dictionaries.en[key] || key; }

function setStatus(message, kind = 'info') {
  if (message !== t(lastStatusKey)) lastStatusKey = null;
  statusText.textContent = message;
  statusBox.classList.toggle('status-error', kind === 'error');
  statusBox.classList.toggle('status-success', kind === 'success');
  statusIcon.textContent = kind === 'error' ? '⚠' : kind === 'success' ? '✓' : '✦';
}

function setStatusKey(key, kind = 'info') { lastStatusKey = key; setStatus(t(key), kind); }

function applyLanguage(language) {
  currentLanguage = language === 'en' ? 'en' : 'ar';
  document.documentElement.lang = currentLanguage;
  document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.getAttribute('data-i18n');
    if (dictionaries[currentLanguage][key]) element.textContent = dictionaries[currentLanguage][key];
  });
  document.querySelectorAll('[data-i18n-title]').forEach((element) => {
    element.title = t(element.getAttribute('data-i18n-title'));
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((element) => {
    element.setAttribute('aria-label', t(element.getAttribute('data-i18n-aria')));
  });
  $('language-toggle').textContent = t('switchLanguage');
  $('language-toggle').setAttribute('aria-label', currentLanguage === 'ar' ? 'Switch to English' : 'التبديل إلى العربية');
  $('fullscreen-preview').setAttribute('aria-label', t(isFullscreenPreview ? 'fullscreenExit' : 'fullscreenTitle'));
  $('fullscreen-preview').title = t(isFullscreenPreview ? 'fullscreenExit' : 'fullscreenTitle');
  renderMorphLabels();
  const statusKind = statusBox.classList.contains('status-error') ? 'error' : statusBox.classList.contains('status-success') ? 'success' : 'info';
  if (lastStatusKey) setStatus(t(lastStatusKey), statusKind);
  else setStatus(t(statusKind === 'error' ? 'statusActionError' : statusKind === 'success' ? 'statusReady' : 'statusLoading'), statusKind);
  try { localStorage.setItem('openMakeupLanguage', currentLanguage); } catch (_) {}
}

try {
  const savedLanguage = localStorage.getItem('openMakeupLanguage');
  if (savedLanguage === 'en') currentLanguage = 'en';
} catch (_) {}
$('language-toggle').addEventListener('click', () => applyLanguage(currentLanguage === 'ar' ? 'en' : 'ar'));

async function runAction(labelKey, action) {
  if (!engineReady) {
    setStatusKey('statusWaiting', 'error');
    return false;
  }
  try {
    await action();
    setStatus(t(labelKey), 'success');
    return true;
  } catch (error) {
    console.error(error);
    setStatus(t('statusActionError') + ' — ' + (error && error.message ? error.message : t('statusErrorFallback')), 'error');
    return false;
  }
}

async function applyLook({ name, lipstick, blush, shadow }) {
  const previousMakeup = JSON.parse(JSON.stringify(sessionState.makeup));
  const nextMakeup = {
    ...previousMakeup,
    lipstick: { color: lipstick, finish: 'glossy' },
    blush: { color: blush },
    eyeshadow: { color: shadow, pattern: 1, finish: 'glitter' },
  };
  try {
    await Promise.all(Object.entries({
      lipstick: nextMakeup.lipstick,
      blush: nextMakeup.blush,
      eyeshadow: nextMakeup.eyeshadow,
    }).map(([category, options]) => mk.apply(category, options)));
  } catch (error) {
    try { await restoreMakeupSnapshot(previousMakeup); } catch (rollbackError) {
      console.error('Could not roll back a partially applied look:', rollbackError);
    }
    throw error;
  }
  sessionState.makeup = nextMakeup;
  sessionState.activeLook = name;
  updateLayerButtonStates();
  persistSessionState();
}

function openAbout() {
  const modal = $('about-modal');
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  $('close-about').focus();
}
function closeAbout() {
  const modal = $('about-modal');
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  $('open-about').focus();
}
$('open-about').addEventListener('click', openAbout);
$('close-about').addEventListener('click', closeAbout);
$('about-modal').addEventListener('click', (event) => {
  if (event.target === $('about-modal')) closeAbout();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if ($('about-modal').classList.contains('open')) closeAbout();
    else if (isFullscreenPreview) exitFullscreenPreview();
  }
});
$('about-source').addEventListener('click', () => { window.location.href = 'https://github.com/majd7772233-a11y/OpenMakeup'; });
$('about-email').addEventListener('click', () => { window.location.href = 'mailto:majd7772233@gmail.com?subject=Open%20Makeup'; });

function enterFullscreenPreview() {
  if (isFullscreenPreview) return;
  isFullscreenPreview = true;
  $('stage').classList.add('fullscreen');
  document.body.classList.add('preview-fullscreen');
  $('fullscreen-preview').textContent = '⤢';
  $('fullscreen-preview').setAttribute('aria-label', t('fullscreenExit'));
  $('fullscreen-preview').title = t('fullscreenExit');
  setStatusKey('statusFullscreen', 'success');
  try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); } catch (_) {}
  if (window.mk && window.mk.engine && window.mk.engine._sizeToVideoBox) {
    setTimeout(() => window.mk.engine._sizeToVideoBox(), 80);
    setTimeout(() => window.mk.engine._sizeToVideoBox(), 350);
  }
}
function exitFullscreenPreview() {
  if (!isFullscreenPreview) return;
  isFullscreenPreview = false;
  $('stage').classList.remove('fullscreen');
  document.body.classList.remove('preview-fullscreen');
  $('fullscreen-preview').textContent = '⛶';
  $('fullscreen-preview').setAttribute('aria-label', t('fullscreenTitle'));
  $('fullscreen-preview').title = t('fullscreenTitle');
  try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (_) {}
  if (window.mk && window.mk.engine && window.mk.engine._sizeToVideoBox) {
    setTimeout(() => window.mk.engine._sizeToVideoBox(), 80);
    setTimeout(() => window.mk.engine._sizeToVideoBox(), 350);
  }
}
$('fullscreen-preview').addEventListener('click', () => isFullscreenPreview ? exitFullscreenPreview() : enterFullscreenPreview());
window.isPreviewFullscreen = () => isFullscreenPreview;
window.handleAndroidBack = () => {
  if (isFullscreenPreview) { exitFullscreenPreview(); return true; }
  if ($('about-modal').classList.contains('open')) { closeAbout(); return true; }
  return false;
};

let engineStarting = false;
async function startEngine() {
  if (engineStarting) return false;
  engineStarting = true;
  $('camera-retry').hidden = true;
  actionButtons.forEach((button) => { button.disabled = true; });
  setStatusKey('statusLoading');
  try {
    await mk.init();
    await waitForCameraFrames($('video'), { timeoutMs: 6000, pollIntervalMs: 150 });
    buildMorphSliders();
    const restoreErrors = await restoreSessionState();
    engineReady = true;
    actionButtons.forEach((button) => { button.disabled = false; });
    if (restoreErrors.length) {
      setStatus(t('statusSessionRestoreWarning') + ' ' + restoreErrors.join(' · '), 'error');
    } else {
      setStatusKey('statusReady', 'success');
    }
    return true;
  } catch (error) {
    console.error('Open Makeup initialization failed:', error);
    engineReady = false;
    try { if (mk) mk.stop(); } catch (stopError) { console.warn('Could not stop failed startup:', stopError); }
    const failedStream = $('video').srcObject;
    if (failedStream && failedStream.getTracks) {
      failedStream.getTracks().forEach((track) => { try { track.stop(); } catch (_) {} });
      $('video').srcObject = null;
    }
    actionButtons.forEach((button) => { button.disabled = true; });
    setStatus(t('statusEngineError') + ' ' + (error && error.message ? error.message : t('statusErrorFallback')), 'error');
    $('morph-panel').textContent = t('morphFallback');
    $('camera-retry').hidden = false;
    return false;
  } finally {
    engineStarting = false;
  }
}

async function reinitializeEngine() {
  if (engineStarting) return false;
  try { if (mk) mk.dispose(); } catch (error) { console.warn('Engine disposal before retry failed:', error); }
  mk = createEngine();
  window.mk = mk;
  engineReady = false;
  return startEngine();
}

$('camera-retry').addEventListener('click', () => { reinitializeEngine(); });



$('lipstick').onclick = () => runAction('statusLipstick', () => applyLayer('lipstick', { finish: 'glossy' }));
$('eyeshadow').onclick = () => runAction('statusEyeshadow', () => applyLayer('eyeshadow', { color: '#7a3b9d', pattern: 1, finish: 'glitter' }));
$('eyeline').onclick = () => runAction('statusEyeline', () => applyLayer('eyeline', { pattern: 1 }));
$('blush').onclick = () => runAction('statusBlush', () => applyLayer('blush', { color: '#e26d7a' }));
$('foundation').onclick = () => runAction('statusFoundation', () => applyLayer('foundation', { color: '#d9b89c', finish: 'matte' }));
$('mascara').onclick = () => runAction('statusMascara', () => applyLayer('mascara', {}));
$('clear').onclick = () => runAction('statusClear', () => { mk.clearAll(); sessionState.makeup = {}; sessionState.activeLook = null; updateLayerButtonStates(); persistSessionState(); });
$('look-rose').onclick = () => runAction('statusRose', () => applyLook({ name: 'rose', lipstick: '#e76c91', blush: '#e88a9d', shadow: '#a55a98' }));
$('look-berry').onclick = () => runAction('statusBerry', () => applyLook({ name: 'berry', lipstick: '#9c315f', blush: '#b84e76', shadow: '#633b87' }));
$('look-nude').onclick = () => runAction('statusNude', () => applyLook({ name: 'nude', lipstick: '#bd927b', blush: '#d4a18d', shadow: '#927d9b' }));

const morphNames = {
  browLift:['liftBrow','liftBrowAbout'], lipPlump:['plumpLips','plumpLipsAbout'],
  lipPlump2:['plumpLipsVariant','plumpLipsVariantAbout'], noseSlim:['slimNose','slimNoseAbout'],
  noseBridge:['noseBridge','noseBridgeAbout'], cheeks:['fullerCheeks','fullerCheeksAbout'],
  jawAngle:['jawAngle','jawAngleAbout'], jawWide:['jawWide','jawWideAbout']
};
function localizedMorphName(name, about) {
  const keys = morphNames[name];
  if (keys) return t(keys[about ? 1 : 0]);
  if (/^facemesh/i.test(name)) return about ? t('advancedControl') : (currentLanguage === 'ar' ? 'تعديل إضافي للوجه' : 'Extra face control');
  return about ? t('advancedControl') : name;
}
function renderMorphLabels() {
  document.querySelectorAll('.slider').forEach((row) => {
    const name = row.dataset.controlName;
    const about = row.dataset.controlAbout;
    if (!name) return;
    const title = row.querySelector('.slider-name');
    if (title) {
      title.textContent = localizedMorphName(name, false);
      if (about) {
        const detail = document.createElement('i');
        detail.textContent = localizedMorphName(name, true);
        title.appendChild(detail);
      }
    }
    const input = row.querySelector('input');
    if (input) input.setAttribute('aria-label', localizedMorphName(name, false));
  });
}
function makeSlider(name, about) {
  const row = document.createElement('label');
  row.className = 'slider';
  row.dataset.controlName = name;
  row.dataset.controlAbout = about || '';
  const title = document.createElement('span');
  title.className = 'slider-name';
  title.textContent = localizedMorphName(name, false);
  if (about) {
    const detail = document.createElement('i');
    detail.textContent = localizedMorphName(name, true);
    title.appendChild(detail);
  }
  const input = document.createElement('input');
  input.type = 'range';
  input.min = '-1';
  input.max = '1.5';
  input.step = '0.05';
  input.value = '0';
  input.setAttribute('aria-label', localizedMorphName(name, false));
  const output = document.createElement('output');
  output.textContent = '0.00';
  row.appendChild(title);
  row.appendChild(input);
  row.appendChild(output);
  input.addEventListener('input', () => {
    output.textContent = Number(input.value).toFixed(2);
    const value = Number(input.value);
    sessionState.morphs[name] = value;
    persistSessionState();
    try { mk.setMorph(name, value); } catch (error) {
      console.warn('Could not update face shape:', error);
      setStatus(t('statusActionError') + ' — ' + (error.message || t('statusErrorFallback')), 'error');
    }
  });
  $('morph-panel').appendChild(row);
  sliders.push({ input, output, name });
}
function buildMorphSliders() {
  const panel = $('morph-panel');
  while (panel.firstChild) panel.removeChild(panel.firstChild);
  sliders.length = 0;
  const friendly = {};
  for (const [name, cfg] of Object.entries(MORPH_CONTROLS || {})) friendly[cfg.target] = { name, about: cfg.about };
  const targets = mk.getMorphTargets();
  if (targets.length) {
    for (const target of targets) {
      const item = friendly[target];
      makeSlider(item ? item.name : target, item ? item.about : '');
    }
  } else {
    for (const [name, cfg] of Object.entries(MORPH_CONTROLS || {})) makeSlider(name, cfg.about);
  }
  if (!sliders.length) panel.textContent = t('morphFallback');
}
$('reset-morph').onclick = () => runAction('statusReset', () => {
  mk.resetMorph();
  sessionState.morphs = {};
  persistSessionState();
  for (const slider of sliders) { slider.input.value = '0'; slider.output.textContent = '0.00'; }
});
$('wireframe').onchange = async (event) => {
  const value = event.target.checked;
  const ok = await runAction('statusWireframe', () => {
    mk.setWireframe(value);
    sessionState.wireframe = value;
    persistSessionState();
  });
  if (!ok) event.target.checked = sessionState.wireframe;
};
$('blur').onchange = async (event) => {
  const value = event.target.checked;
  const ok = await runAction('statusBlur', () => {
    mk.setBlur(value);
    sessionState.blur = value;
    persistSessionState();
  });
  if (!ok) event.target.checked = sessionState.blur;
};

/*
 * Camera recovery verifies actual frame progression and preserves the local
 * session. It never blindly reloads the page as a fallback.
 */
function stopAndDetachCamera() {
  const video = $('video');
  const stream = video.srcObject;
  if (stream && stream.getTracks) stream.getTracks().forEach((track) => { try { track.stop(); } catch (_) {} });
  video.srcObject = null;
}

async function recoverCamera() {
  if (document.hidden || !engineReady || resumeInProgress) return false;
  resumeInProgress = true;
  hiddenAt = 0;
  actionButtons.forEach((button) => { button.disabled = true; });
  setStatusKey('statusCameraResume');
  try {
    try { mk.stop(); } catch (error) { console.warn('Camera pause before recovery failed:', error); }
    stopAndDetachCamera();
    await mk.start();
    await waitForCameraFrames($('video'), { timeoutMs: 6000, pollIntervalMs: 150 });
    actionButtons.forEach((button) => { button.disabled = false; });
    setStatusKey('statusReady', 'success');
    if (mk.engine && mk.engine._sizeToVideoBox) mk.engine._sizeToVideoBox();
    return true;
  } catch (error) {
    console.warn('Camera recovery failed; attempting a controlled local-engine restart:', error);
    setStatusKey('statusCameraResumeError', 'error');
    stopAndDetachCamera();
    let restarted = false;
    try { restarted = await reinitializeEngine(); } catch (restartError) {
      console.error('Full camera recovery failed:', restartError);
    }
    if (!restarted) {
      $('camera-retry').hidden = false;
      setStatusKey('statusCameraResumeError', 'error');
    }
    return restarted;
  } finally {
    resumeInProgress = false;
  }
}

function pauseCameraForBackground() {
  // Do not interrupt an in-flight first permission/startup flow. Once the
  // studio is usable, release its camera promptly when the host backgrounds it.
  if (!engineReady) return;
  hiddenAt = Date.now();
  if (mk) {
    try { mk.stop(); } catch (error) { console.warn('Camera pause failed:', error); }
    stopAndDetachCamera();
  }
}

window.handleOpenMakeupPause = () => {
  pauseCameraForBackground();
};

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pauseCameraForBackground();
    return;
  }
  if (hiddenAt && engineReady) recoverCamera();
});



window.addEventListener('resize', () => {
  if (mk.engine && mk.engine._sizeToVideoBox) mk.engine._sizeToVideoBox();
});
window.addEventListener('pagehide', () => {
  try { mk.stop(); } catch (_) {}
});
window.addEventListener('beforeunload', () => {
  try { mk.dispose(); } catch (error) { console.debug(error); }
});

window.mk = mk;
let resumeCheckInProgress = false;
window.handleOpenMakeupResume = async () => {
  if (document.hidden || !engineReady || resumeInProgress || resumeCheckInProgress) return;
  resumeCheckInProgress = true;
  try {
    // Native Activity resume may occur without a reliable DOM visibilitychange.
    // Confirm fresh frames even when the browser still reports a live track.
    await waitForCameraFrames($('video'), { timeoutMs: 1800, pollIntervalMs: 150 });
  } catch (error) {
    console.warn('Camera frame progression check failed after native resume:', error);
    if (!hiddenAt) hiddenAt = Date.now();
    await recoverCamera();
  } finally {
    resumeCheckInProgress = false;
  }
};
applyLanguage(currentLanguage);
updateLayerButtonStates();
startEngine();
