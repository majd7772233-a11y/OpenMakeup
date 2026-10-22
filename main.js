import { OpenMakeup, MORPH_CONTROLS, MORPH_WEIGHT_MIN, MORPH_WEIGHT_MAX } from './src/index.js';
import { hasLiveCameraTrack, waitForCameraFrames } from './src/core/cameraReadiness.js';
import { dictionaries, translate } from './src/ui/locales.js';

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
let lastTrackingState = 'waiting';
let aboutOpener = null;

function createEngine() {
  return new OpenMakeup({
    onFaceTrackingChange: (detected) => setTrackingState(detected ? 'detected' : 'noFace'),
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
    const validMorphs = new Set(Object.keys(MORPH_CONTROLS || {}));
    const morphs = {};
    for (const [name, value] of Object.entries(rawMorphs)) {
      // Previous builds exposed raw Blender target names. Only restore stable,
      // friendly controls in the everyday studio UI.
      if (validMorphs.has(name) && Number.isFinite(Number(value))) {
        morphs[name] = Math.max(MORPH_WEIGHT_MIN, Math.min(MORPH_WEIGHT_MAX, Number(value)));
      }
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

function t(key, values = {}) { return translate(currentLanguage, key, values); }

function setTrackingState(state) {
  lastTrackingState = ['waiting', 'noFace', 'detected'].includes(state) ? state : 'waiting';
  const chip = $('tracking-state'), label = $('tracking-text');
  if (!chip || !label) return;
  const key = { waiting: 'trackingWaiting', noFace: 'trackingNoFace', detected: 'trackingDetected' }[lastTrackingState];
  chip.dataset.state = lastTrackingState;
  label.textContent = t(key);
  chip.setAttribute('aria-label', t(key));
}

function describeError(error) {
  const raw = [error && error.name, error && error.message, error].filter(Boolean).join(' ');
  if (/NotAllowedError|PermissionDeniedError|permission denied|access denied|not allowed/i.test(raw)) return t('errorCameraPermission');
  if (/timed?\s*out|timeout|no frames|frame progression/i.test(raw)) return t('errorCameraTimeout');
  if (/webgl|graphics context|renderer.*(fail|create)|context lost/i.test(raw)) return t('errorWebGL');
  if (/manifest|shader|texture|model|\.glb|asset|failed to fetch|http \d{3}/i.test(raw)) return t('errorAssets');
  return t('errorGeneric');
}

function setStatus(message, kind = 'info') {
  if (message !== t(lastStatusKey)) lastStatusKey = null;
  statusText.textContent = message;
  statusBox.classList.toggle('status-error', kind === 'error');
  statusBox.classList.toggle('status-success', kind === 'success');
  statusIcon.textContent = kind === 'error' ? '⚠' : kind === 'success' ? '✓' : '✦';
  statusBox.setAttribute('aria-busy', String(['statusLoading', 'statusCameraResume'].includes(lastStatusKey)));
}

function setStatusKey(key, kind = 'info') { lastStatusKey = key; setStatus(t(key), kind); }

function applyLanguage(language) {
  currentLanguage = language === 'en' ? 'en' : 'ar';
  document.documentElement.lang = currentLanguage;
  document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
  document.title = t('documentTitle');
  const description = document.querySelector('meta[name="description"]');
  if (description) description.setAttribute('content', t('metaDescription'));
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
  $('language-toggle').setAttribute('aria-label', t('switchLanguageAria'));
  $('fullscreen-preview').setAttribute('aria-label', t(isFullscreenPreview ? 'fullscreenExit' : 'fullscreenTitle'));
  $('fullscreen-preview').title = t(isFullscreenPreview ? 'fullscreenExit' : 'fullscreenTitle');
  renderMorphLabels();
  setTrackingState(lastTrackingState);
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
    setStatus(t('statusActionError') + ' — ' + describeError(error), 'error');
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
  const results = await Promise.allSettled(Object.entries({
    lipstick: nextMakeup.lipstick,
    blush: nextMakeup.blush,
    eyeshadow: nextMakeup.eyeshadow,
  }).map(([category, options]) => mk.apply(category, options)));
  const failure = results.find((result) => result.status === 'rejected');
  if (failure) {
    // Wait for every concurrent layer operation to finish before rolling back;
    // a late resolve must not mutate the face after the rollback has completed.
    try { await restoreMakeupSnapshot(previousMakeup); } catch (rollbackError) {
      console.error('Could not roll back a partially applied look:', rollbackError);
    }
    throw failure.reason;
  }
  sessionState.makeup = nextMakeup;
  sessionState.activeLook = name;
  updateLayerButtonStates();
  persistSessionState();
}

function openAbout() {
  const modal = $('about-modal');
  if (modal.classList.contains('open')) return;
  aboutOpener = document.activeElement;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  $('close-about').focus();
}
function closeAbout() {
  const modal = $('about-modal');
  if (!modal.classList.contains('open')) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  const target = aboutOpener && typeof aboutOpener.focus === 'function' ? aboutOpener : $('open-about');
  aboutOpener = null;
  target.focus();
}
function trapAboutFocus(event) {
  const modal = $('about-modal');
  if (!modal.classList.contains('open') || event.key !== 'Tab') return;
  const focusable = [...modal.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter((element) => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true');
  if (!focusable.length) { event.preventDefault(); modal.focus(); return; }
  const first = focusable[0], last = focusable[focusable.length - 1];
  if (event.shiftKey && (document.activeElement === first || document.activeElement === modal)) {
    event.preventDefault(); last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault(); first.focus();
  }
}
$('open-about').addEventListener('click', openAbout);
$('close-about').addEventListener('click', closeAbout);
$('about-modal').addEventListener('click', (event) => {
  if (event.target === $('about-modal')) closeAbout();
});
document.addEventListener('keydown', (event) => {
  if ($('about-modal').classList.contains('open')) {
    if (event.key === 'Escape') { event.preventDefault(); closeAbout(); return; }
    trapAboutFocus(event);
    return;
  }
  if (event.key === 'Escape' && isFullscreenPreview) { event.preventDefault(); exitFullscreenPreview(); }
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
  $('fullscreen-preview').setAttribute('aria-pressed', 'true');
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
  $('fullscreen-preview').setAttribute('aria-pressed', 'false');
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
    setTrackingState(mk.engine && mk.engine._reportedFaceTrackingState === false ? 'noFace' : (mk.engine && mk.engine._faceVisible ? 'detected' : 'waiting'));
    actionButtons.forEach((button) => { button.disabled = false; });
    if (restoreErrors.length) {
      console.warn('Session restore failures:', restoreErrors);
      setStatus(t('statusSessionRestoreWarning', { count: restoreErrors.length }), 'error');
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
    setTrackingState('waiting');
    setStatus(t('statusEngineError') + ' ' + describeError(error), 'error');
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
  input.min = String(MORPH_WEIGHT_MIN);
  input.max = String(MORPH_WEIGHT_MAX);
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

  const targets = new Set(mk.getMorphTargets());
  for (const [name, config] of Object.entries(MORPH_CONTROLS || {})) {
    // Render documented user-facing controls only; raw facemeshN target names
    // are implementation details and should not leak into the normal UI.
    if (targets.size && !targets.has(config.target)) continue;
    makeSlider(name, config.about);
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
  setTrackingState('waiting');
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
