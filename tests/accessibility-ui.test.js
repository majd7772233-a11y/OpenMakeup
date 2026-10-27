import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dictionaries, translate } from '../src/ui/locales.js';
import { MakeupEngine } from '../src/core/MakeupEngine.js';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const main = readFileSync(new URL('../main.js', import.meta.url), 'utf8');

test('all HTML text and accessibility attributes have Arabic and English translations', () => {
  const keys = [...new Set([...html.matchAll(/data-i18n(?:-title|-aria|-placeholder)?="([^"]+)"/g)].map((match) => match[1]))];
  assert.ok(keys.length >= 20);
  for (const key of keys) {
    assert.equal(typeof dictionaries.ar[key], 'string', `Arabic translation missing for ${key}`);
    assert.equal(typeof dictionaries.en[key], 'string', `English translation missing for ${key}`);
    assert.ok(dictionaries.ar[key].trim().length > 0);
    assert.ok(dictionaries.en[key].trim().length > 0);
  }
  for (const key of ['documentTitle', 'metaDescription', 'trackingWaiting', 'trackingNoFace', 'trackingDetected',
    'errorCameraPermission', 'errorCameraTimeout', 'errorWebGL', 'errorAssets', 'errorGeneric']) {
    assert.ok(dictionaries.ar[key] && dictionaries.en[key], `runtime locale key missing: ${key}`);
  }
});

test('locale translator interpolates restore counts and unknown keys remain visible', () => {
  assert.match(translate('en', 'statusSessionRestoreWarning', { count: 2 }), /2/);
  assert.match(translate('ar', 'statusSessionRestoreWarning', { count: 3 }), /3/);
  assert.equal(translate('en', 'not-a-real-key'), 'not-a-real-key');
});

test('phone workflow keeps makeup central and hides advanced/debug controls in native details', () => {
  assert.match(html, /id="daily-controls"[^>]*aria-labelledby="looks-title"/);
  assert.match(html, /<details class="panel advanced-panel" id="advanced-controls">/);
  assert.match(html, /<summary class="advanced-summary">/);
  for (const id of ['reset-morph', 'wireframe', 'blur']) assert.ok(html.indexOf(`id="${id}"`) > html.indexOf('id="advanced-controls"'));
});

test('skip navigation, semantic headings and separate polite live regions exist', () => {
  assert.match(html, /class="skip-link" href="#daily-controls"/);
  assert.match(html, /<main class="app" id="app-main">/);
  assert.match(html, /<h3 class="section-label" id="makeup-title"/);
  assert.match(html, /id="status-text"[^>]*role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(html, /id="tracking-state"[^>]*role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(html, /id="renderCanvas" aria-hidden="true"/);
});

test('authored HTML IDs are unique', () => {
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'duplicate HTML id');
});

test('touch targets, visible focus, landscape layout and reduced-motion support exist', () => {
  assert.match(html, /\.icon-btn\{min-width:44px\}/);
  assert.match(html, /\.look,\.makeup-btn,\.quick-actions button,\.about-actions button,#camera-retry\{min-height:44px\}/);
  assert.match(html, /button:focus-visible,input:focus-visible,summary:focus-visible,a:focus-visible/);
  assert.match(html, /prefers-reduced-motion:reduce/);
  assert.match(html, /orientation:landscape\) and \(max-height:520px\)/);
});

test('About dialog traps focus, restores its opener and handles Escape/Android Back', () => {
  assert.match(main, /aboutOpener = document\.activeElement/);
  assert.match(main, /function trapAboutFocus\(event\)/);
  assert.match(main, /event\.shiftKey/);
  assert.match(main, /function closeAbout\(\)[\s\S]*?target\.focus\(\)/);
  assert.match(main, /window\.handleAndroidBack = \(\) =>/);
  assert.match(main, /if \(event\.key === 'Escape'\)/);
});

test('metadata, tracking and errors use localized messages instead of raw exceptions', () => {
  assert.match(main, /document\.title = t\('documentTitle'\)/);
  assert.match(main, /description\.setAttribute\('content', t\('metaDescription'\)\)/);
  assert.match(main, /function describeError\(error\)/);
  assert.match(main, /return t\('errorCameraPermission'\)/);
  assert.match(main, /return t\('errorWebGL'\)/);
  assert.match(main, /return t\('errorAssets'\)/);
  assert.doesNotMatch(main, /setStatus\(t\('statusEngineError'\) \+ ' ' \+ \(error && error\.message/);
});

test('face tracking callback emits transitions once and isolates consumer callback errors', () => {
  const calls = [];
  const engine = Object.create(MakeupEngine.prototype);
  engine._reportedFaceTrackingState = null;
  engine.onFaceTrackingChange = (state) => calls.push(state);
  engine._notifyFaceTrackingState(false); engine._notifyFaceTrackingState(false);
  engine._notifyFaceTrackingState(true); engine._notifyFaceTrackingState(true);
  engine._notifyFaceTrackingState(false);
  assert.deepEqual(calls, [false, true, false]);
  engine.onFaceTrackingChange = () => { throw new Error('consumer callback'); };
  assert.doesNotThrow(() => engine._notifyFaceTrackingState(true));
});


test('stage-4 personalization, capture and history controls have accessible hooks', () => {
  for (const id of ['personalization-panel','editor-category','editor-color','layer-intensity','layer-finish',
    'apply-layer-settings','compare-toggle','capture-photo','save-photo','share-photo','capture-thumbnail',
    'custom-looks-panel','custom-look-name','custom-look-select','save-custom-look','load-custom-look',
    'delete-custom-look','undo-action','redo-action']) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  assert.match(html, /id="compare-toggle"[^>]*aria-pressed="false"/);
  assert.match(html, /id="layer-intensity"[^>]*type="range"[^>]*min="0"[^>]*max="1"/);
  assert.match(main, /renderSceneToPngDataUrl\(mk\.engine/);
  assert.match(readFileSync(new URL('../src/core/capture-frame.js', import.meta.url), 'utf8'), /mirrorContext\.scale\(-1, 1\)/);
  assert.match(main, /window\.OpenMakeupBridge/);
  assert.match(main, /navigator\.share/);
  assert.match(main, /studioHistory\.undo\(\)/);
  assert.match(main, /studioHistory\.redo\(\)/);
  assert.match(main, /\.studio-tool-panel button, \.studio-tool-panel input, \.studio-tool-panel select/);
  assert.match(main, /renderCustomLooks\(\);\s*updateHistoryButtons\(\);/);
});

test('future persistence schemas are preserved instead of overwritten', () => {
  assert.match(main, /if \(sessionStateWriteBlocked\) \{/);
  assert.match(main, /sessionPersistenceUnavailable = true/);
  assert.match(main, /customLooksWriteBlocked\) \{ setStatusKey\('statusStoredSchemaUnsupported'/);
  assert.match(main, /Unsupported Open Makeup studio-state schema version/i);
  assert.match(main, /Number\(parsed\.version\) > CUSTOM_LOOKS_VERSION/);
  assert.match(main, /if \(!persistCustomLooks\(\)\) \{ customLooks = previousLooks; renderCustomLooks\(\); return; \}/);
});


test('font-size setting is bilingual, defaults to 12, persists, scales all authored CSS text and supports reset', () => {
  for (const key of ['settingsTitle','settingsDescription','openSettings','closeSettings','fontSizeLabel','fontSizeUnit','fontSizeHelp','resetFontSize','doneSettings']) {
    assert.equal(typeof dictionaries.ar[key], 'string', `Arabic translation missing for ${key}`);
    assert.equal(typeof dictionaries.en[key], 'string', `English translation missing for ${key}`);
  }
  assert.match(html, /id="open-settings"/);
  assert.match(html, /id="settings-modal"[^>]*role="dialog"[^>]*aria-modal="true"/);
  assert.match(html, /id="font-size-setting" type="range" min="10" max="20" step="1" value="12"/);
  assert.match(html, /id="font-size-value"[^>]*>12<\/output>/);
  assert.match(html, /font-size:[0-9.]+px/);
  assert.match(main, /scaleFontDeclarations\(BASE_APP_CSS, scale\);/);
  assert.match(main, /const DEFAULT_FONT_SIZE = 12/);
  assert.match(main, /const FONT_SIZE_KEY = 'openMakeupFontSizeV1'/);
  assert.match(main, /function normalizeFontSize\(value\)/);
  assert.match(main, /Math\.min\(MAX_FONT_SIZE, Math\.max\(MIN_FONT_SIZE, Math\.round\(parsed\)\)\)/);
  assert.match(main, /scaleFontDeclarations\(BASE_APP_CSS, scale\);/);
  assert.match(main, /localStorage\.setItem\(FONT_SIZE_KEY, String\(currentFontSize\)\)/);
  assert.match(main, /\$\('reset-settings'\)\.addEventListener\('click', \(\) => applyFontSize\(DEFAULT_FONT_SIZE\)\)/);
  assert.match(main, /function trapSettingsFocus\(event\)/);
  assert.match(main, /if \(\$\('settings-modal'\)\.classList\.contains\('open'\)\) \{ closeSettings\(\); return true; \}/);
});


test('comparison state drives its label, preview, and fresh photo capture consistently', () => {
  assert.ok(main.includes('function syncCompareControl()'));
  assert.ok(main.includes("renderSceneToPngDataUrl(mk.engine, document, 2560, { mode: isOriginalPreview ? 'original' : 'makeup' })"));
  const handler = main.slice(main.indexOf("$('compare-toggle').addEventListener"), main.indexOf('const morphNames'));
  assert.ok(handler.includes('invalidateCapture()'));
  assert.ok(handler.includes('syncCompareControl()'));
});

test('persistent state failures are surfaced instead of being followed by a false success status', () => {
  assert.ok(main.includes('let sessionPersistenceUnavailable = false'));
  assert.ok(main.includes("if (sessionPersistenceUnavailable) setStatusKey('statusSessionNotSaved', 'error')"));
  assert.match(dictionaries.ar.statusSessionNotSaved, /الجلسة الحالية فقط/);
  assert.match(dictionaries.en.statusSessionNotSaved, /session only/);
});

test('onboarding Back and Escape never start the camera as a side effect', () => {
  assert.ok(main.includes("if (event.key === 'Escape') { event.preventDefault(); return; }"));
  assert.ok(main.includes("if ($('onboarding-modal').classList.contains('open')) return false;"));
});

test('finish selector hides an indistinguishable non-lipstick glossy option', () => {
  assert.ok(main.includes("glossyOption.hidden = currentEditorCategory !== 'lipstick'"));
  assert.ok(main.includes("currentEditorCategory !== 'lipstick' && finish === 'glossy'"));
});


test('startup reports when the app cannot persist studio changes', () => {
  assert.ok(main.includes("else if (sessionPersistenceUnavailable) {\n      setStatusKey('statusSessionNotSaved', 'error');"));
});
