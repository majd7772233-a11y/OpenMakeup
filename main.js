import { OpenMakeup, MORPH_CONTROLS, MORPH_WEIGHT_MIN, MORPH_WEIGHT_MAX } from './src/index.js';
import { hasLiveCameraTrack, waitForCameraFrames } from './src/core/cameraReadiness.js';
import { countVideoInputDevices, nextCameraFacingMode } from './src/core/camera-capabilities.js';
import { LOOK_PRESETS, LOOK_PRESET_GROUPS } from './src/ui/look-presets.js';
import { renderSceneToPngDataUrl } from './src/core/capture-frame.js';
import { dictionaries, translate } from './src/ui/locales.js';
import { normalizeStudioState, StudioHistory, createCustomLook, parseCustomLooks, normalizeCustomLookName, hasCustomLookName, CUSTOM_LOOKS_VERSION } from './src/ui/studio-state.js';
import { scaleFontDeclarations } from './src/ui/font-scaling.js';
import { initializeLiquidGlassMotion } from './src/ui/liquid-glass-motion.js';
import { createDebouncedCall } from './src/ui/session-persistence.js';

const $ = (id) => document.getElementById(id);
const statusText = $('status-text');
const statusBox = $('status');
const statusIcon = $('status-icon');
const actionButtonSelector = '.makeup-grid button, .preset-library button, .looks button, .quick-actions button, .switches input, .studio-tool-panel button, .studio-tool-panel input, .studio-tool-panel select, .preview-tools button';
const getActionButtons = () => [...document.querySelectorAll(actionButtonSelector)];
const sliders = [];
let engineReady = false;
let hostStopGeneration = 0;
let hostBackgrounded = false;
let restartStartupWhenVisible = false;
let currentLanguage = 'ar';
const FONT_SIZE_KEY = 'openMakeupFontSizeV1';
const appStyleElement = document.querySelector('style');
const BASE_APP_CSS = appStyleElement ? appStyleElement.textContent : '';
const DEFAULT_FONT_SIZE = 12;
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 20;
let currentFontSize = DEFAULT_FONT_SIZE;
let settingsOpener = null;
let isFullscreenPreview = false;
let resumeInProgress = false;
let resumeRequestedWhileRecovering = false;
let hiddenAt = 0;
let lastStatusKey = 'statusLoading';
let lastTrackingState = 'waiting';
let aboutOpener = null;
let currentEditorCategory = 'lipstick';
let isOriginalPreview = false;
let lastCaptureDataUrl = null;
let isApplyingHistory = false;
let morphHistoryBefore = null;
let sessionStateWriteBlocked = false;
let sessionPersistenceUnavailable = false;
let sessionPersistenceScheduler = null;
let customLooksWriteBlocked = false;
let currentCameraFacingMode = 'user';
let cameraSwitchInProgress = false;
let cameraSwitchSupported = false;
let webglContextLost = false;
let onboardingDismissedThisSession = false;
let onboardingOpener = null;
const ONBOARDING_KEY = 'openMakeupOnboardingDismissedV1';

function createEngine() {
  return new OpenMakeup({
    onFaceTrackingChange: (detected) => setTrackingState(detected ? 'detected' : 'noFace'),
    onWebGLContextChange: (state) => handleWebGLContextChange(state),
    camera: { facingMode: currentCameraFacingMode },
    video: $('video'),
    renderCanvas: $('renderCanvas'),
    assetsBaseUrl: './assets',
    mediapipeBaseUrl: './mediapipe/face_mesh',
    aiColor: async () => '#c21f4d',
  });
}

let mk = createEngine();
const SESSION_KEY = 'openMakeupSessionState';
const CUSTOM_LOOKS_KEY = 'openMakeupCustomLooksV1';
const DEFAULT_LAYER_OPTIONS = {
  lipstick: { color: '#c21f4d', finish: 'glossy', intensity: 1 },
  eyeshadow: { color: '#7a3b9d', finish: 'glitter', pattern: 1, intensity: 1 },
  eyeline: { color: '#000000', pattern: 1, intensity: 1 },
  blush: { color: '#e26d7a', finish: 'matte', intensity: 1 },
  foundation: { color: '#d9b89c', finish: 'matte', intensity: 1 },
  mascara: { color: '#000000', pattern: 1, intensity: 1 },
};
const FINISH_CATEGORIES = new Set(['lipstick', 'eyeshadow', 'blush', 'foundation']);

function readSessionState() {
  let raw = null;
  try { raw = localStorage.getItem(SESSION_KEY); } catch (_) { sessionPersistenceUnavailable = true; return normalizeStudioState(null); }
  try { return normalizeStudioState(raw); }
  catch (error) {
    if (/Unsupported Open Makeup studio-state schema version/i.test(String(error && error.message))) {
      sessionStateWriteBlocked = true;
      sessionPersistenceUnavailable = true;
      console.warn('A newer studio-state schema was found; preserving it without overwriting.');
    } else console.warn('Stored studio state was invalid; using safe defaults.', error);
    return normalizeStudioState(null);
  }
}
const sessionState = readSessionState();
const studioHistory = new StudioHistory(50);
let customLooks = readStoredCustomLooks();
function getStudioSnapshot() { return normalizeStudioState(sessionState); }
function studioStateChanged(before, after) { return JSON.stringify(before) !== JSON.stringify(after); }


function persistSessionState() {
  if (sessionPersistenceScheduler) sessionPersistenceScheduler.cancel();
  if (sessionStateWriteBlocked) {
    sessionPersistenceUnavailable = true;
    return false;
  }
  sessionState.schemaVersion = 1;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionState));
    sessionPersistenceUnavailable = false;
    return true;
  } catch (_) {
    sessionPersistenceUnavailable = true;
    return false;
  }
}

function writeScheduledSessionState() {
  const wasUnavailable = sessionPersistenceUnavailable;
  const saved = persistSessionState();
  if (!saved) setStatusKey('statusSessionNotSaved', 'error');
  else if (wasUnavailable && lastStatusKey === 'statusSessionNotSaved') setStatusKey('statusReady', 'success');
  return saved;
}

sessionPersistenceScheduler = createDebouncedCall(writeScheduledSessionState, 180);

function scheduleSessionStatePersistence() {
  if (sessionStateWriteBlocked) {
    sessionPersistenceUnavailable = true;
    return false;
  }
  sessionPersistenceScheduler.schedule();
  return true;
}

function flushSessionStatePersistence() {
  if (!sessionPersistenceScheduler || !sessionPersistenceScheduler.pending) return true;
  return sessionPersistenceScheduler.flush();
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
  document.querySelectorAll('[data-preset-id]').forEach((button) => {
    const active = sessionState.activeLook === button.dataset.presetId;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
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
  refreshLayerEditor();
  renderCustomLooks();
  updateHistoryButtons();
  persistSessionState();
  return restoreErrors;
}

async function applyLayer(category, options) {
  const appliedOptions = { ...(options || {}), intensity: options && options.intensity != null ? options.intensity : 1 };
  const result = await mk.apply(category, appliedOptions);
  sessionState.makeup[category] = JSON.parse(JSON.stringify(appliedOptions));
  sessionState.activeLook = null;
  currentEditorCategory = category;
  updateLayerButtonStates();
  refreshLayerEditor();
  persistSessionState();
  return result;
}

async function restoreMakeupSnapshot(snapshot) {
  mk.clearAll();
  for (const [category, options] of Object.entries(snapshot)) await mk.apply(category, options || {});
}

async function applyStudioSnapshot(nextValue) {
  const next = normalizeStudioState(nextValue), previous = getStudioSnapshot();
  const applyValues = async (state) => {
    await restoreMakeupSnapshot(state.makeup);
    mk.resetMorph();
    for (const [name, value] of Object.entries(state.morphs)) mk.setMorph(name, value);
    mk.setWireframe(state.wireframe); mk.setBlur(state.blur);
    Object.assign(sessionState, normalizeStudioState(state));
    $('wireframe').checked = sessionState.wireframe; $('blur').checked = sessionState.blur;
    for (const item of sliders) {
      const value = Object.prototype.hasOwnProperty.call(sessionState.morphs, item.name) ? sessionState.morphs[item.name] : 0;
      item.input.value = String(value); item.output.textContent = Number(value).toFixed(2);
    }
    updateLayerButtonStates(); refreshLayerEditor(); persistSessionState();
  };
  try { await applyValues(next); }
  catch (error) {
    try { await applyValues(previous); } catch (rollbackError) { console.error('Studio rollback failed:', rollbackError); }
    throw error;
  }
}

function updateHistoryButtons() {
  const undo = $('undo-action'), redo = $('redo-action');
  if (undo) undo.disabled = !studioHistory.canUndo || !engineReady || webglContextLost;
  if (redo) redo.disabled = !studioHistory.canRedo || !engineReady || webglContextLost;
}
function invalidateCapture() {
  lastCaptureDataUrl = null;
  const thumbnail = $('capture-thumbnail');
  if (thumbnail) { thumbnail.removeAttribute('src'); thumbnail.hidden = true; }
  const save = $('save-photo'), share = $('share-photo');
  if (save) save.disabled = true;
  if (share) share.disabled = true;
}
function downloadCapture(dataUrl) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = 'Open-Makeup-' + new Date().toISOString().replace(/[:.]/g, '-') + '.png';
  link.rel = 'noopener'; document.body.appendChild(link); link.click(); link.remove();
}
function captureCurrentFrame() {
  if (!engineReady || !mk.engine || !mk.engine.renderer || !mk.engine.scene || !mk.engine.camera3D || webglContextLost) {
    throw new Error('Capture is unavailable before the camera and renderer are ready.');
  }
  // A temporary render target keeps preserveDrawingBuffer disabled in live
  // rendering, avoiding a permanent mobile GPU/memory penalty.
  const nativeBridge = window.OpenMakeupBridge;
  const nativeCapture = !!(nativeBridge
    && (typeof nativeBridge.saveImage === 'function' || typeof nativeBridge.shareImage === 'function'));
  // Android WebView has a tighter memory budget: cap both each dimension and
  // total pixels before allocating the render target, RGBA buffers and canvases.
  const maxDimension = nativeCapture ? 1920 : 2560;
  const maxPixels = nativeCapture ? 2500000 : 6500000;
  const { dataUrl } = renderSceneToPngDataUrl(mk.engine, document, maxDimension, {
    mode: isOriginalPreview ? 'original' : 'makeup',
    maxPixels,
  });
  lastCaptureDataUrl = dataUrl;
  $('capture-thumbnail').src = dataUrl; $('capture-thumbnail').hidden = false;
  $('save-photo').disabled = false; $('share-photo').disabled = false;
  return dataUrl;
}
function ensureCapture() { return lastCaptureDataUrl || captureCurrentFrame(); }
function nativeImageResult(operation, result) {
  if (operation === 'save') {
    if (result === 'saved') setStatusKey('statusCaptureSaved', 'success');
    else if (result === 'permission_denied') setStatusKey('statusStoragePermissionDenied', 'error');
    else setStatusKey('statusSaveFailure', 'error');
  } else if (operation === 'share' && result === 'failed') setStatusKey('statusShareFailure', 'error');
}
window.onNativeImageResult = nativeImageResult;
function saveCurrentPhoto() {
  const image = ensureCapture(), bridge = window.OpenMakeupBridge;
  if (bridge && typeof bridge.saveImage === 'function') {
    const result = bridge.saveImage(image, 'Open-Makeup-' + Date.now() + '.png');
    if (result === 'saved') setStatusKey('statusCaptureSaved', 'success');
    else if (result === 'permission_required') setStatusKey('statusStoragePermission', 'info');
    else if (result === 'failed') setStatusKey('statusSaveFailure', 'error');
    return;
  }
  downloadCapture(image); setStatusKey('statusDownloadSaved', 'success');
}
async function shareCurrentPhoto() {
  const image = ensureCapture(), bridge = window.OpenMakeupBridge;
  if (bridge && typeof bridge.shareImage === 'function') {
    const result = bridge.shareImage(image, 'Open-Makeup-' + Date.now() + '.png');
    setStatusKey(result === 'share_started' ? 'statusShareStarted' : 'statusShareFailure', result === 'share_started' ? 'info' : 'error');
    return;
  }
  try {
    const blob = await (await fetch(image)).blob();
    const file = new File([blob], 'Open-Makeup.png', { type: 'image/png' });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ title: 'Open Makeup', files: [file] }); setStatusKey('statusShareStarted', 'info'); }
      catch (error) { if (error && error.name === 'AbortError') setStatusKey('statusShareCancelled', 'info'); else throw error; }
    } else { downloadCapture(image); setStatusKey('statusShareUnsupported', 'error'); }
  } catch (error) { console.error('Photo sharing failed:', error); setStatusKey('statusShareFailure', 'error'); }
}

function t(key, values = {}) { return translate(currentLanguage, key, values); }

function syncCompareControl() {
  const button = $('compare-toggle');
  const label = $('compare-label');
  if (!button || !label) return;
  const nextKey = isOriginalPreview ? 'compareAfter' : 'compareBeforeAfter';
  button.setAttribute('aria-pressed', String(isOriginalPreview));
  label.textContent = t(nextKey);
  button.title = t(nextKey);
}

function normalizeFontSize(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_FONT_SIZE;
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(parsed)));
}

function applyFontSize(value, persist = true) {
  currentFontSize = normalizeFontSize(value);
  const scale = currentFontSize / DEFAULT_FONT_SIZE;
  if (appStyleElement) appStyleElement.textContent = scaleFontDeclarations(BASE_APP_CSS, scale);
  $('font-size-setting').value = String(currentFontSize);
  $('font-size-value').value = String(currentFontSize);
  $('font-size-value').textContent = String(currentFontSize);
  if (persist) {
    try { localStorage.setItem(FONT_SIZE_KEY, String(currentFontSize)); } catch (_) {}
  }
}

function openSettings() {
  const modal = $('settings-modal');
  if (modal.classList.contains('open')) return;
  settingsOpener = document.activeElement;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  $('close-settings').focus();
}

function closeSettings() {
  const modal = $('settings-modal');
  if (!modal.classList.contains('open')) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  const target = settingsOpener && typeof settingsOpener.focus === 'function' ? settingsOpener : $('open-settings');
  settingsOpener = null;
  target.focus();
}

function trapSettingsFocus(event) {
  const modal = $('settings-modal');
  if (!modal.classList.contains('open') || event.key !== 'Tab') return;
  const focusable = [...modal.querySelectorAll('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter((element) => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true');
  if (!focusable.length) { event.preventDefault(); modal.focus(); return; }
  const first = focusable[0], last = focusable[focusable.length - 1];
  if (event.shiftKey && (document.activeElement === first || document.activeElement === modal)) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

$('open-settings').addEventListener('click', openSettings);
$('close-settings').addEventListener('click', closeSettings);
$('done-settings').addEventListener('click', closeSettings);
$('settings-modal').addEventListener('click', (event) => { if (event.target === $('settings-modal')) closeSettings(); });
$('font-size-setting').addEventListener('input', (event) => applyFontSize(event.currentTarget.value));
$('reset-settings').addEventListener('click', () => applyFontSize(DEFAULT_FONT_SIZE));
try { applyFontSize(localStorage.getItem(FONT_SIZE_KEY) ?? DEFAULT_FONT_SIZE, false); }
catch (_) { applyFontSize(DEFAULT_FONT_SIZE, false); }

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
  document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
    element.setAttribute('placeholder', t(element.getAttribute('data-i18n-placeholder')));
  });
  document.querySelectorAll('[data-i18n-alt]').forEach((element) => {
    element.setAttribute('alt', t(element.getAttribute('data-i18n-alt')));
  });
  $('language-toggle').textContent = t('switchLanguage');
  $('language-toggle').setAttribute('aria-label', t('switchLanguageAria'));
  $('fullscreen-preview').setAttribute('aria-label', t(isFullscreenPreview ? 'fullscreenExit' : 'fullscreenTitle'));
  $('fullscreen-preview').title = t(isFullscreenPreview ? 'fullscreenExit' : 'fullscreenTitle');
  syncCompareControl();
  renderMorphLabels();
  setTrackingState(lastTrackingState);
  refreshLayerEditor(); renderPresetLibrary(); renderCustomLooks(); updateHistoryButtons();
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


const workspaceTabButtons = [...document.querySelectorAll('[data-workspace-tab]')];
const workspacePanels = [...document.querySelectorAll('[data-workspace-panel]')];

function activateWorkspaceTab(name, options = {}) {
  const targetPanel = workspacePanels.find((panel) => panel.dataset.workspacePanel === name);
  if (!targetPanel) return;
  workspaceTabButtons.forEach((button) => {
    const selected = button.dataset.workspaceTab === name;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  workspacePanels.forEach((panel) => panel.classList.toggle('workspace-tab-inactive', panel !== targetPanel));
  if (name === 'sculpt') $('advanced-controls').open = true;
  if (window.matchMedia && window.matchMedia('(max-width: 759px)').matches
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    targetPanel.classList.remove('glass-panel-enter');
    void targetPanel.offsetWidth;
    targetPanel.classList.add('glass-panel-enter');
  }
  if (options.focus) {
    const activeButton = workspaceTabButtons.find((button) => button.dataset.workspaceTab === name);
    if (activeButton) activeButton.focus();
  }
  if (options.scroll && window.matchMedia && window.matchMedia('(max-width: 759px)').matches) {
    window.requestAnimationFrame(() => {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      targetPanel.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest' });
    });
  }
}

workspaceTabButtons.forEach((button) => {
  button.addEventListener('click', () => activateWorkspaceTab(button.dataset.workspaceTab, { scroll: true }));
  button.addEventListener('keydown', (event) => {
    const current = workspaceTabButtons.indexOf(button);
    let next = current;
    if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = workspaceTabButtons.length - 1;
    else if (event.key === 'ArrowLeft') next = (current + (document.documentElement.dir === 'rtl' ? 1 : -1) + workspaceTabButtons.length) % workspaceTabButtons.length;
    else if (event.key === 'ArrowRight') next = (current + (document.documentElement.dir === 'rtl' ? -1 : 1) + workspaceTabButtons.length) % workspaceTabButtons.length;
    else return;
    event.preventDefault();
    activateWorkspaceTab(workspaceTabButtons[next].dataset.workspaceTab, { focus: true, scroll: true });
  });
});
activateWorkspaceTab('looks');
initializeLiquidGlassMotion();

async function runAction(labelKey, action) {
  if (!engineReady || webglContextLost) { setStatusKey(webglContextLost ? 'statusGraphicsLost' : 'statusWaiting', 'error'); return false; }
  const before = getStudioSnapshot();
  try {
    await action();
    const after = getStudioSnapshot();
    if (!isApplyingHistory && studioStateChanged(before, after)) {
      studioHistory.record(before, after); invalidateCapture();
    }
    updateHistoryButtons();
    if (sessionPersistenceUnavailable) setStatusKey('statusSessionNotSaved', 'error');
    else setStatus(t(labelKey), 'success');
    return true;
  } catch (error) {
    console.error(error);
    setStatus(t('statusActionError') + ' — ' + describeError(error), 'error');
    updateHistoryButtons();
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

function hasDismissedOnboarding() {
  if (onboardingDismissedThisSession) return true;
  try { return localStorage.getItem(ONBOARDING_KEY) === '1'; }
  catch (_) { return false; }
}

function openOnboarding() {
  const modal = $('onboarding-modal');
  if (!modal || hasDismissedOnboarding()) { startEngine(); return; }
  onboardingOpener = document.activeElement;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  $('onboarding-start').focus();
}

function dismissOnboardingAndStart() {
  const modal = $('onboarding-modal');
  if (modal && modal.classList.contains('open')) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }
  onboardingDismissedThisSession = true;
  try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch (_) {}
  if (onboardingOpener && onboardingOpener !== document.body && typeof onboardingOpener.focus === 'function') {
    onboardingOpener.focus();
  }
  onboardingOpener = null;
  startEngine();
}

function trapOnboardingFocus(event) {
  const modal = $('onboarding-modal');
  if (!modal || !modal.classList.contains('open') || event.key !== 'Tab') return;
  const focusable = [...modal.querySelectorAll('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')]
    .filter((element) => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true');
  if (!focusable.length) { event.preventDefault(); modal.focus(); return; }
  const first = focusable[0], last = focusable[focusable.length - 1];
  if (event.shiftKey && (document.activeElement === first || document.activeElement === modal)) {
    event.preventDefault(); last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault(); first.focus();
  }
}
$('onboarding-start').addEventListener('click', dismissOnboardingAndStart);
$('onboarding-skip').addEventListener('click', dismissOnboardingAndStart);

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
  if ($('onboarding-modal').classList.contains('open')) {
    if (event.key === 'Escape') { event.preventDefault(); return; }
    trapOnboardingFocus(event);
    return;
  }
  if ($('settings-modal').classList.contains('open')) {
    if (event.key === 'Escape') { event.preventDefault(); closeSettings(); return; }
    trapSettingsFocus(event);
    return;
  }
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
  if ($('onboarding-modal').classList.contains('open')) return false;
  if ($('settings-modal').classList.contains('open')) { closeSettings(); return true; }
  if ($('about-modal').classList.contains('open')) { closeAbout(); return true; }
  return false;
};

let engineStarting = false;
async function startEngine() {
  if (engineStarting) return false;
  if (document.hidden || hostBackgrounded) {
    restartStartupWhenVisible = true;
    return false;
  }
  engineStarting = true;
  const startHostStopGeneration = hostStopGeneration;
  $('camera-retry').hidden = true;
  getActionButtons().forEach((button) => { button.disabled = true; });
  setStatusKey('statusLoading');
  try {
    // A native host may stop the app while model/material initialization is
    // pending. Reuse a completed SDK instance on resume; don't let init()'s
    // ready fast path skip restarting its stopped camera.
    if (mk.ready) await mk.start();
    else await mk.init();
    if (startHostStopGeneration !== hostStopGeneration || document.hidden || hostBackgrounded) {
      try { mk.stop(); } catch (_) {}
      stopAndDetachCamera();
      restartStartupWhenVisible = true;
      return false;
    }
    await waitForCameraFrames($('video'), { timeoutMs: 6000, pollIntervalMs: 150 });
    if (startHostStopGeneration !== hostStopGeneration || document.hidden || hostBackgrounded) {
      try { mk.stop(); } catch (_) {}
      stopAndDetachCamera();
      restartStartupWhenVisible = true;
      return false;
    }
    buildMorphSliders();
    const restoreErrors = await restoreSessionState();
    // Session restoration is asynchronous too: a host stop can race with any
    // awaited layer apply, so do not publish readiness from a stale startup.
    if (startHostStopGeneration !== hostStopGeneration || document.hidden || hostBackgrounded) {
      engineReady = false;
      try { mk.stop(); } catch (_) {}
      stopAndDetachCamera();
      restartStartupWhenVisible = true;
      return false;
    }
    engineReady = true;
    restartStartupWhenVisible = false;
    setTrackingState(mk.engine && mk.engine._reportedFaceTrackingState === false ? 'noFace' : (mk.engine && mk.engine._faceVisible ? 'detected' : 'waiting'));
    getActionButtons().forEach((button) => { button.disabled = false; });
    renderCustomLooks();
    updateHistoryButtons();
    await refreshCameraSwitchAvailability();
    $('camera-retry').textContent = t('retryCamera');
    if (sessionStateWriteBlocked || customLooksWriteBlocked) {
      setStatusKey('statusStoredSchemaUnsupported', 'error');
    } else if (restoreErrors.length) {
      console.warn('Session restore failures:', restoreErrors);
      setStatus(t('statusSessionRestoreWarning', { count: restoreErrors.length }), 'error');
    } else if (sessionPersistenceUnavailable) {
      setStatusKey('statusSessionNotSaved', 'error');
    } else {
      setStatusKey('statusReady', 'success');
    }
    return true;
  } catch (error) {
    engineReady = false;
    try { if (mk) mk.stop(); } catch (stopError) { console.warn('Could not stop failed startup:', stopError); }
    const failedStream = $('video').srcObject;
    if (failedStream && failedStream.getTracks) {
      failedStream.getTracks().forEach((track) => { try { track.stop(); } catch (_) {} });
      $('video').srcObject = null;
    }
    // Cancellation caused by backgrounding is not a user-facing camera error.
    // Resume will retry against a fresh lifecycle generation.
    if (startHostStopGeneration !== hostStopGeneration || document.hidden || hostBackgrounded) {
      restartStartupWhenVisible = true;
      return false;
    }
    console.error('Open Makeup initialization failed:', error);
    getActionButtons().forEach((button) => { button.disabled = true; });
    setTrackingState('waiting');
    setStatus(t('statusEngineError') + ' ' + describeError(error), 'error');
    $('morph-panel').textContent = t('morphFallback');
    $('camera-retry').hidden = false;
    return false;
  } finally {
    engineStarting = false;
    // If the app returned before the stale initializer settled, retry exactly
    // once after its promise has relinquished ownership.
    if (restartStartupWhenVisible && !document.hidden && !hostBackgrounded && !engineReady) {
      restartStartupWhenVisible = false;
      Promise.resolve().then(() => startEngine());
    }
  }
}

async function reinitializeEngine() {
  if (engineStarting) return false;
  webglContextLost = false;
  cameraSwitchInProgress = false;
  try { if (mk) mk.dispose(); } catch (error) { console.warn('Engine disposal before retry failed:', error); }
  mk = createEngine();
  window.mk = mk;
  engineReady = false;
  return startEngine();
}

$('camera-retry').addEventListener('click', () => {
  $('camera-retry').hidden = true;
  reinitializeEngine();
});

async function refreshCameraSwitchAvailability() {
  const button = $('switch-camera');
  if (!button) return;
  try {
    const supported = !!(mk && typeof mk.canSwitchCamera === 'function' && mk.canSwitchCamera());
    const count = await countVideoInputDevices(typeof navigator !== 'undefined' ? navigator.mediaDevices : null);
    cameraSwitchSupported = supported && (count == null || count >= 2);
  } catch (error) {
    console.warn('Could not query camera-switch capabilities:', error);
    cameraSwitchSupported = false;
  }
  button.disabled = !engineReady || !cameraSwitchSupported || cameraSwitchInProgress || webglContextLost;
  button.setAttribute('aria-disabled', String(button.disabled));
  button.setAttribute('aria-label', t('switchCamera'));
  button.title = cameraSwitchSupported ? t('switchCamera') : t('cameraSwitchUnsupported');
}

async function switchCameraFromButton() {
  if (!engineReady || !cameraSwitchSupported || cameraSwitchInProgress || webglContextLost) return;
  cameraSwitchInProgress = true;
  const previous = currentCameraFacingMode;
  const priorStates = new Map(getActionButtons().map((button) => [button, button.disabled]));
  getActionButtons().forEach((button) => { button.disabled = true; });
  setStatusKey('statusCameraSwitching');
  try {
    await mk.switchCamera(nextCameraFacingMode(previous));
    currentCameraFacingMode = mk.cameraFacingMode || nextCameraFacingMode(previous);
    invalidateCapture();
    setTrackingState('waiting');
    const verifiedFacingMode = mk.cameraFacingModeVerified === true;
    if (verifiedFacingMode) {
      setStatusKey(currentCameraFacingMode === 'environment' ? 'statusCameraRear' : 'statusCameraFront', 'success');
    } else {
      setStatusKey('statusCameraDirectionUnverified', 'info');
    }
  } catch (error) {
    console.warn('Camera switch failed:', error);
    currentCameraFacingMode = (mk && mk.cameraFacingMode) || previous;

    // If the requested camera AND rollback both failed, recover the previous
    // stream (or rebuild the local engine) before re-enabling studio controls.
    const cameraStillRunning = !!(mk && mk.engine && mk.engine._cameraRunning);
    if (!cameraStillRunning) {
      try {
        await recoverCamera();
      } catch (recoveryError) {
        console.error('Camera recovery after a failed switch also failed:', recoveryError);
      }
    }
    setStatusKey('statusCameraSwitchFailure', 'error');
  } finally {
    cameraSwitchInProgress = false;
    getActionButtons().forEach((button) => {
      button.disabled = (priorStates.get(button) === true) || !engineReady || webglContextLost;
    });
    updateHistoryButtons();
    await refreshCameraSwitchAvailability();
  }
}

$('switch-camera').addEventListener('click', switchCameraFromButton);

function handleWebGLContextChange(state) {
  if (state === 'lost') {
    webglContextLost = true;
    getActionButtons().forEach((button) => { button.disabled = true; });
    setStatusKey('statusGraphicsLost', 'error');
    $('camera-retry').hidden = true;
    try { if (mk) mk.stop(); } catch (_) {}
    stopAndDetachCamera();
    window.setTimeout(() => {
      if (!webglContextLost) return;
      $('camera-retry').textContent = t('retryGraphics');
      $('camera-retry').hidden = false;
      setStatusKey('statusGraphicsRestoreFailed', 'error');
      refreshCameraSwitchAvailability();
    }, 5000);
    return;
  }
  if (state === 'restored') {
    webglContextLost = false;
    $('camera-retry').textContent = t('retryCamera');
    $('camera-retry').hidden = true;
    refreshCameraSwitchAvailability();
    if (engineReady) {
      setStatusKey('statusGraphicsRestored');
      recoverCamera();
    }
    return;
  }
  webglContextLost = true;
  getActionButtons().forEach((button) => { button.disabled = true; });
  $('camera-retry').textContent = t('retryGraphics');
  $('camera-retry').hidden = false;
  setStatusKey('statusGraphicsRestoreFailed', 'error');
  refreshCameraSwitchAvailability();
}



$('lipstick').onclick = () => runAction('statusLipstick', () => applyLayer('lipstick', { finish: 'glossy' }));
$('eyeshadow').onclick = () => runAction('statusEyeshadow', () => applyLayer('eyeshadow', { color: '#7a3b9d', pattern: 1, finish: 'glitter' }));
$('eyeline').onclick = () => runAction('statusEyeline', () => applyLayer('eyeline', { pattern: 1 }));
$('blush').onclick = () => runAction('statusBlush', () => applyLayer('blush', { color: '#e26d7a' }));
$('foundation').onclick = () => runAction('statusFoundation', () => applyLayer('foundation', { color: '#d9b89c', finish: 'matte' }));
$('mascara').onclick = () => runAction('statusMascara', () => applyLayer('mascara', {}));
$('clear').onclick = () => runAction('statusClear', () => { mk.clearAll(); sessionState.makeup = {}; sessionState.activeLook = null; updateLayerButtonStates(); persistSessionState(); });
async function applyLookPreset(preset) {
  const previousMakeup = JSON.parse(JSON.stringify(sessionState.makeup));
  const nextMakeup = JSON.parse(JSON.stringify(preset.layers));
  try {
    await restoreMakeupSnapshot(nextMakeup);
  } catch (error) {
    try { await restoreMakeupSnapshot(previousMakeup); }
    catch (rollbackError) { console.error('Could not restore makeup after preset failure:', rollbackError); }
    throw error;
  }
  sessionState.makeup = nextMakeup;
  sessionState.activeLook = preset.id;
  currentEditorCategory = Object.prototype.hasOwnProperty.call(nextMakeup, 'lipstick')
    ? 'lipstick' : (Object.keys(nextMakeup)[0] || 'lipstick');
  updateLayerButtonStates();
  refreshLayerEditor();
  persistSessionState();
}

function renderPresetLibrary() {
  const root = $('preset-library');
  if (!root) return;
  while (root.firstChild) root.removeChild(root.firstChild);
  for (const group of LOOK_PRESET_GROUPS) {
    const section = document.createElement('section');
    section.className = 'preset-group';
    section.setAttribute('aria-labelledby', 'preset-group-' + group.id);
    const heading = document.createElement('h3');
    heading.className = 'preset-group-title';
    heading.id = 'preset-group-' + group.id;
    heading.textContent = t(group.labelKey);
    section.appendChild(heading);
    const grid = document.createElement('div');
    grid.className = 'preset-grid';
    for (const preset of LOOK_PRESETS.filter((item) => item.group === group.id)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'look preset-button';
      button.id = 'preset-' + preset.id;
      button.dataset.presetId = preset.id;
      button.style.setProperty('--dot', preset.accent);
      button.style.setProperty('--preset-color', preset.accent);
      button.setAttribute('aria-label', t(preset.labelKey));
      button.setAttribute('aria-pressed', String(sessionState.activeLook === preset.id));
      const dot = document.createElement('span');
      dot.className = 'dot';
      dot.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.className = 'preset-name';
      label.textContent = t(preset.labelKey);
      button.append(dot, label);
      button.addEventListener('click', () => runAction('statusPresetApplied', () => applyLookPreset(preset)));
      grid.appendChild(button);
    }
    section.appendChild(grid);
    root.appendChild(section);
  }
  updateLayerButtonStates();
}

function refreshLayerEditor() {
  const categoryInput = $('editor-category'), colorInput = $('editor-color');
  const intensityInput = $('layer-intensity'), intensityOutput = $('layer-intensity-value'), finishInput = $('layer-finish');
  if (!categoryInput || !colorInput || !intensityInput || !finishInput) return;
  categoryInput.value = currentEditorCategory;
  const layer = sessionState.makeup[currentEditorCategory] || DEFAULT_LAYER_OPTIONS[currentEditorCategory] || {};
  const defaults = DEFAULT_LAYER_OPTIONS[currentEditorCategory] || {};
  colorInput.value = /^#[0-9a-f]{6}$/i.test(layer.color || '') ? layer.color : defaults.color || '#c21f4d';
  const intensity = Number.isFinite(Number(layer.intensity)) ? Math.max(0, Math.min(1, Number(layer.intensity))) : 1;
  intensityInput.value = String(intensity); intensityOutput.textContent = Math.round(intensity * 100) + '%';
  finishInput.disabled = !FINISH_CATEGORIES.has(currentEditorCategory);
  const glossyOption = finishInput.querySelector('option[value="glossy"]');
  if (glossyOption) glossyOption.hidden = currentEditorCategory !== 'lipstick';
  let finish = layer.finish || defaults.finish || 'matte';
  if (!FINISH_CATEGORIES.has(currentEditorCategory)) finish = 'matte';
  else if (currentEditorCategory !== 'lipstick' && finish === 'glossy') finish = 'glitter';
  finishInput.value = finish;
}
$('editor-category').addEventListener('change', (event) => { currentEditorCategory = event.target.value; refreshLayerEditor(); });
$('layer-intensity').addEventListener('input', (event) => {
  $('layer-intensity-value').textContent = Math.round(Number(event.target.value) * 100) + '%';
});
$('apply-layer-settings').addEventListener('click', () => runAction('statusLayerCustomized', async () => {
  const category = $('editor-category').value, previous = sessionState.makeup[category] || {};
  const options = { ...previous, color: $('editor-color').value, intensity: Number($('layer-intensity').value) };
  if (FINISH_CATEGORIES.has(category)) options.finish = $('layer-finish').value; else delete options.finish;
  await applyLayer(category, options);
}));
function readStoredCustomLooks() {
  let raw;
  try { raw = localStorage.getItem(CUSTOM_LOOKS_KEY); } catch (_) { return []; }
  if (!raw) return [];
  let parsed;
  try { parsed = JSON.parse(raw); } catch (_) { return []; }
  if (parsed && Number.isFinite(Number(parsed.version)) && Number(parsed.version) > CUSTOM_LOOKS_VERSION) {
    customLooksWriteBlocked = true;
    console.warn('A newer custom-look schema was found; preserving it without overwriting.');
    return [];
  }
  return parseCustomLooks(parsed);
}
function persistCustomLooks() {
  if (customLooksWriteBlocked) { setStatusKey('statusStoredSchemaUnsupported', 'error'); return false; }
  try {
    localStorage.setItem(CUSTOM_LOOKS_KEY, JSON.stringify({ version: CUSTOM_LOOKS_VERSION, looks: customLooks }));
    return true;
  } catch (_) {
    setStatusKey('statusSaveFailure', 'error');
    return false;
  }
}
function renderCustomLooks() {
  const select = $('custom-look-select'); if (!select) return;
  const selected = select.value;
  while (select.firstChild) select.removeChild(select.firstChild);
  const placeholder = document.createElement('option'); placeholder.value = ''; placeholder.textContent = t('savedLookPlaceholder'); select.appendChild(placeholder);
  for (const look of customLooks) {
    const option = document.createElement('option'); option.value = look.id; option.textContent = look.name; select.appendChild(option);
  }
  select.value = customLooks.some((look) => look.id === selected) ? selected : '';
  $('load-custom-look').disabled = customLooks.length === 0; $('delete-custom-look').disabled = customLooks.length === 0;
}
$('save-custom-look').addEventListener('click', () => {
  if (customLooksWriteBlocked) { setStatusKey('statusStoredSchemaUnsupported', 'error'); return; }
  if (!engineReady) { setStatusKey('statusWaiting', 'error'); return; }
  const name = normalizeCustomLookName($('custom-look-name').value);
  if (!name) { setStatusKey('statusCustomLookNameRequired', 'error'); $('custom-look-name').focus(); return; }
  if (hasCustomLookName(customLooks, name)) {
    setStatusKey('statusCustomLookDuplicate', 'error'); return;
  }
  try {
    const snapshot = getStudioSnapshot(); snapshot.activeLook = null;
    const look = createCustomLook(name, snapshot);
    const previousLooks = customLooks;
    customLooks = [...customLooks, look].slice(-100);
    if (!persistCustomLooks()) { customLooks = previousLooks; renderCustomLooks(); return; }
    renderCustomLooks(); $('custom-look-select').value = look.id; $('custom-look-name').value = '';
    setStatusKey('statusCustomLookSaved', 'success');
  } catch (error) { console.error('Could not save custom look:', error); setStatusKey('statusSaveFailure', 'error'); }
});
$('load-custom-look').addEventListener('click', () => {
  const look = customLooks.find((item) => item.id === $('custom-look-select').value);
  if (!look) { setStatusKey('statusCustomLookSelect', 'error'); return; }
  runAction('statusCustomLookLoaded', () => applyStudioSnapshot(look.state));
});
$('delete-custom-look').addEventListener('click', () => {
  const look = customLooks.find((item) => item.id === $('custom-look-select').value);
  if (!look) { setStatusKey('statusCustomLookSelect', 'error'); return; }
  if (!window.confirm(t('confirmDeleteCustomLook', { name: look.name }))) return;
  const previousLooks = customLooks;
  customLooks = customLooks.filter((item) => item.id !== look.id);
  if (!persistCustomLooks()) { customLooks = previousLooks; renderCustomLooks(); return; }
  renderCustomLooks();
  setStatusKey('statusCustomLookDeleted', 'success');
});
$('undo-action').addEventListener('click', async () => {
  if (!studioHistory.canUndo || !engineReady) return;
  const target = studioHistory.undo(); isApplyingHistory = true;
  try { await applyStudioSnapshot(target); if (sessionPersistenceUnavailable) setStatusKey('statusSessionNotSaved', 'error'); else setStatusKey('statusUndo', 'success'); invalidateCapture(); }
  catch (error) { console.error('Undo failed:', error); studioHistory.redo(); setStatusKey('statusActionError', 'error'); }
  finally { isApplyingHistory = false; updateHistoryButtons(); }
});
$('redo-action').addEventListener('click', async () => {
  if (!studioHistory.canRedo || !engineReady) return;
  const target = studioHistory.redo(); isApplyingHistory = true;
  try { await applyStudioSnapshot(target); if (sessionPersistenceUnavailable) setStatusKey('statusSessionNotSaved', 'error'); else setStatusKey('statusRedo', 'success'); invalidateCapture(); }
  catch (error) { console.error('Redo failed:', error); studioHistory.undo(); setStatusKey('statusActionError', 'error'); }
  finally { isApplyingHistory = false; updateHistoryButtons(); }
});
$('compare-toggle').addEventListener('click', () => {
  isOriginalPreview = !isOriginalPreview;
  $('renderCanvas').style.visibility = isOriginalPreview ? 'hidden' : 'visible';
  syncCompareControl();
  invalidateCapture();
  setStatusKey(isOriginalPreview ? 'statusCompareOriginal' : 'statusCompareApplied');
});
$('capture-photo').addEventListener('click', () => {
  try { captureCurrentFrame(); setStatusKey('statusCaptureReady', 'success'); }
  catch (error) { console.error('Photo capture failed:', error); setStatusKey('statusCaptureFailure', 'error'); }
});
$('save-photo').addEventListener('click', () => {
  try { saveCurrentPhoto(); } catch (error) { console.error('Photo save failed:', error); setStatusKey('statusSaveFailure', 'error'); }
});
$('share-photo').addEventListener('click', () => { shareCurrentPhoto(); });


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
  input.addEventListener('pointerdown', () => { morphHistoryBefore = getStudioSnapshot(); });
  input.addEventListener('keydown', (event) => {
    if (!morphHistoryBefore && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(event.key)) morphHistoryBefore = getStudioSnapshot();
  });
  input.addEventListener('input', () => {
    if (!morphHistoryBefore) morphHistoryBefore = getStudioSnapshot();
    invalidateCapture();
    output.textContent = Number(input.value).toFixed(2);
    const value = Number(input.value);
    sessionState.morphs[name] = value;
    const persistenceScheduled = scheduleSessionStatePersistence();
    if (!persistenceScheduled && !sessionStateWriteBlocked && lastStatusKey !== 'statusSessionNotSaved') {
      setStatusKey('statusSessionNotSaved', 'error');
    }
    try { mk.setMorph(name, value); } catch (error) {
      console.warn('Could not update face shape:', error);
      setStatus(t('statusActionError') + ' — ' + describeError(error), 'error');
    }
    updateHistoryButtons();
  });
  input.addEventListener('change', () => {
    if (morphHistoryBefore) {
      const after = getStudioSnapshot();
      if (studioStateChanged(morphHistoryBefore, after)) studioHistory.record(morphHistoryBefore, after);
      morphHistoryBefore = null; updateHistoryButtons();
    }
    // Commit the last slider value at the end of a pointer/keyboard interaction.
    flushSessionStatePersistence();
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
  if (document.hidden || hostBackgrounded || !engineReady) return false;
  if (resumeInProgress) {
    // A foreground transition can race the recovery started before backgrounding.
    // Remember it only when a pause occurred during the active recovery.
    if (hiddenAt && !document.hidden && !hostBackgrounded) resumeRequestedWhileRecovering = true;
    return false;
  }

  resumeInProgress = true;
  const recoveryHostStopGeneration = hostStopGeneration;
  let recoveryCancelled = false;
  // A new recovery owns any previously queued resume; newer races set it again.
  resumeRequestedWhileRecovering = false;
  hiddenAt = 0;
  setTrackingState('waiting');
  getActionButtons().forEach((button) => { button.disabled = true; });
  setStatusKey('statusCameraResume');

  const lifecycleStillCurrent = () =>
    recoveryHostStopGeneration === hostStopGeneration && !document.hidden && !hostBackgrounded;
  const stopInterruptedRecovery = () => {
    recoveryCancelled = true;
    try { if (mk) mk.stop(); } catch (_) {}
    stopAndDetachCamera();
  };

  try {
    try { mk.stop(); } catch (error) { console.warn('Camera pause before recovery failed:', error); }
    stopAndDetachCamera();
    await mk.start();
    // Never let a late camera start revive a stream after onStop/backgrounding.
    if (!lifecycleStillCurrent()) {
      stopInterruptedRecovery();
      return false;
    }
    await waitForCameraFrames($('video'), { timeoutMs: 6000, pollIntervalMs: 150 });
    if (!lifecycleStillCurrent()) {
      stopInterruptedRecovery();
      return false;
    }
    getActionButtons().forEach((button) => { button.disabled = false; });
    renderCustomLooks();
    updateHistoryButtons();
    setStatusKey('statusReady', 'success');
    if (mk.engine && mk.engine._sizeToVideoBox) mk.engine._sizeToVideoBox();
    return true;
  } catch (error) {
    // Lifecycle cancellation is not a camera failure: don't rebuild an engine
    // while the host is stopped, and don't publish an error for a hidden app.
    if (!lifecycleStillCurrent()) {
      stopInterruptedRecovery();
      return false;
    }
    console.warn('Camera recovery failed; attempting a controlled local-engine restart:', error);
    setStatusKey('statusCameraResumeError', 'error');
    stopAndDetachCamera();
    let restarted = false;
    try { restarted = await reinitializeEngine(); } catch (restartError) {
      console.error('Full camera recovery failed:', restartError);
    }
    if (!lifecycleStillCurrent()) {
      stopInterruptedRecovery();
      return false;
    }
    if (!restarted) {
      $('camera-retry').hidden = false;
      setStatusKey('statusCameraResumeError', 'error');
    }
    return restarted;
  } finally {
    resumeInProgress = false;
    const retryAfterInterruption = recoveryCancelled
      && resumeRequestedWhileRecovering
      && !document.hidden
      && !hostBackgrounded
      && engineReady;
    if (retryAfterInterruption) {
      resumeRequestedWhileRecovering = false;
      // Let this recovery release ownership before starting the foreground retry.
      Promise.resolve().then(() => recoverCamera());
    } else if (!recoveryCancelled || (!document.hidden && !hostBackgrounded)) {
      resumeRequestedWhileRecovering = false;
    }
  }
}
function pauseCameraForBackground() {
  // Commit any pending slider write before WebView timers pause or the process backgrounds.
  flushSessionStatePersistence();
  // onPause can be triggered by Android's camera-permission prompt. Only the
  // fully-stopped host callback below cancels startup, so permission UX remains intact.
  if (!engineReady) return;
  hiddenAt = Date.now();
  if (mk) {
    try { mk.stop(); } catch (error) { console.warn('Camera pause failed:', error); }
    stopAndDetachCamera();
  }
}

function cancelStartupForHostStop() {
  // Every true host stop invalidates in-flight camera recovery as well as startup.
  hostStopGeneration += 1;
  hostBackgrounded = true;
  if (!engineReady && engineStarting) {
    restartStartupWhenVisible = true;
    try { if (mk) mk.stop(); } catch (error) { console.warn('Startup cancellation failed:', error); }
    stopAndDetachCamera();
    return;
  }
  pauseCameraForBackground();
}

window.handleOpenMakeupPause = () => {
  pauseCameraForBackground();
};

// Called only when the native Activity is fully stopped (not merely paused for
// the runtime permission dialog). This closes the startup/background race.
window.handleOpenMakeupHostStop = () => cancelStartupForHostStop();

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Browser tabs can be safely cancelled immediately. Android uses onStop
    // separately because onPause may represent the permission prompt itself.
    if (!window.OpenMakeupBridge && !engineReady && engineStarting) cancelStartupForHostStop();
    else pauseCameraForBackground();
    return;
  }
  // Browser tabs have no native onResume callback; visibility is their
  // authoritative lifecycle signal. Android keeps this flag until its host resumes.
  if (!window.OpenMakeupBridge) hostBackgrounded = false;
  if (hiddenAt && engineReady) recoverCamera();
  else if (!engineReady && restartStartupWhenVisible && !engineStarting && !hostBackgrounded) {
    restartStartupWhenVisible = false;
    startEngine();
  }
});



window.addEventListener('resize', () => {
  if (mk.engine && mk.engine._sizeToVideoBox) mk.engine._sizeToVideoBox();
});
window.addEventListener('pagehide', () => {
  flushSessionStatePersistence();
  try { mk.stop(); } catch (_) {}
});
window.addEventListener('beforeunload', () => {
  flushSessionStatePersistence();
  try { mk.dispose(); } catch (error) { console.debug(error); }
});

window.mk = mk;
let resumeCheckInProgress = false;
window.handleOpenMakeupResume = async () => {
  // Only the native Activity resume callback clears the fully-stopped state.
  hostBackgrounded = false;
  if (document.hidden) return;
  if (resumeInProgress) {
    // onResume can arrive before a recovery's stale async work has settled.
    resumeRequestedWhileRecovering = true;
    return;
  }
  if (resumeCheckInProgress) return;
  if (!engineReady) {
    if (engineStarting) {
      restartStartupWhenVisible = true;
      return;
    }
    if (restartStartupWhenVisible) {
      restartStartupWhenVisible = false;
      await startEngine();
    }
    return;
  }
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
renderPresetLibrary();
updateLayerButtonStates();
if (hasDismissedOnboarding()) startEngine(); else openOnboarding();
