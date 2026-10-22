import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeCameraFacingMode, nextCameraFacingMode, supportsCameraFacingMode, countVideoInputDevices } from '../src/core/camera-capabilities.js';
import { resolvePerformanceProfile } from '../src/core/performance-profile.js';
import { CATEGORIES, resolveCategory } from '../src/categories.js';
import { LOOK_PRESETS, LOOK_PRESET_GROUPS } from '../src/ui/look-presets.js';

const engine = readFileSync(new URL('../src/core/MakeupEngine.js', import.meta.url), 'utf8');
const sdk = readFileSync(new URL('../src/OpenMakeup.js', import.meta.url), 'utf8');

test('camera-facing modes are constrained to browser-supported front/back values', () => {
  assert.equal(normalizeCameraFacingMode('user'), 'user');
  assert.equal(normalizeCameraFacingMode('environment'), 'environment');
  assert.equal(normalizeCameraFacingMode('left'), null);
  assert.equal(nextCameraFacingMode('user'), 'environment');
  assert.equal(nextCameraFacingMode('environment'), 'user');
});

test('camera-switch capability checks require media capture and honor explicit unsupported constraints', () => {
  assert.equal(supportsCameraFacingMode(null), false);
  assert.equal(supportsCameraFacingMode({ getUserMedia() {}, getSupportedConstraints: () => ({ facingMode: false }) }), false);
  assert.equal(supportsCameraFacingMode({ getUserMedia() {}, getSupportedConstraints: () => ({ facingMode: true }) }), true);
  assert.equal(supportsCameraFacingMode({ getUserMedia() {} }), true);
  assert.equal(supportsCameraFacingMode({}), false);
});

test('camera enumeration is defensive on older WebViews and counts only video inputs', async () => {
  assert.equal(await countVideoInputDevices(null), null);
  assert.equal(await countVideoInputDevices({ enumerateDevices: async () => { throw new Error('blocked'); } }), null);
  assert.equal(await countVideoInputDevices({ enumerateDevices: async () => [
    { kind: 'videoinput' }, { kind: 'audioinput' }, { kind: 'videoinput' },
  ] }), 2);
});

test('render profile caps high-DPI work and selects a cheaper profile for constrained devices', () => {
  const constrained = resolvePerformanceProfile({ devicePixelRatio: 3, hardwareConcurrency: 2, deviceMemory: 2 });
  assert.equal(constrained.tier, 'conservative');
  assert.deepEqual(constrained.camera, { width: 640, height: 480 });
  assert.equal(constrained.maxPixelRatio, 1);
  assert.equal(constrained.antialias, false);

  const balanced = resolvePerformanceProfile({ devicePixelRatio: 3, hardwareConcurrency: 8, deviceMemory: 8 });
  assert.equal(balanced.tier, 'balanced');
  assert.deepEqual(balanced.camera, { width: 960, height: 540 });
  assert.equal(balanced.maxPixelRatio, 1.5);
  assert.equal(balanced.antialias, true);
});

test('curated looks are unique, grouped, localized by key, and contain valid SDK options', async () => {
  const { dictionaries } = await import('../src/ui/locales.js');
  assert.ok(LOOK_PRESETS.length >= 12);
  assert.ok(LOOK_PRESET_GROUPS.length >= 4);
  assert.equal(new Set(LOOK_PRESETS.map((look) => look.id)).size, LOOK_PRESETS.length);
  for (const group of LOOK_PRESET_GROUPS) {
    assert.ok(dictionaries.ar[group.labelKey] && dictionaries.en[group.labelKey], group.labelKey);
    assert.ok(LOOK_PRESETS.some((look) => look.group === group.id));
  }
  for (const look of LOOK_PRESETS) {
    assert.ok(dictionaries.ar[look.labelKey] && dictionaries.en[look.labelKey], look.labelKey);
    assert.ok(LOOK_PRESET_GROUPS.some((group) => group.id === look.group));
    assert.ok(Object.keys(look.layers).length >= 3);
    for (const [inputName, options] of Object.entries(look.layers)) {
      const category = resolveCategory(inputName);
      assert.ok(category && CATEGORIES[category], look.id + ': unknown category ' + inputName);
      assert.match(options.color, /^#[0-9a-f]{6}$/i, look.id + '/' + category + ': invalid color');
      assert.ok(Number.isFinite(options.intensity) && options.intensity >= 0 && options.intensity <= 1);
      if (CATEGORIES[category].supportsFinish) assert.ok(['matte', 'shimmer', 'glossy', 'glitter'].includes(options.finish));
      else assert.equal(options.finish, undefined);
      if (options.pattern != null) assert.ok(['blush', 'eyeshadow', 'eyeline', 'mascara'].includes(category));
    }
  }
});

test('engine switching replaces the stream, validates facing mode and rolls back failed requests', () => {
  assert.match(engine, /async switchCamera\\(facingMode\\)/);
  assert.match(engine, /_stopAttachedVideoTracks\\(\\)/);
  assert.match(engine, /await waitForCameraFrames\\(this\\.video/);
  assert.match(engine, /previous camera was restored/i);
  assert.match(engine, /facingMode: this\\._cameraFacingMode/);
  assert.match(sdk, /switchCamera\\(facingMode\\)/);
});

test('WebGL context loss releases the frame loop and restoration requests a fresh render', () => {
  assert.match(engine, /webglcontextlost/);
  assert.match(engine, /webglcontextrestored/);
  assert.match(engine, /_notifyWebGLContextChange\\('restore-failed'\\)/);
  assert.match(engine, /if \\(this\\._webglContextLost\\)/);
  assert.match(engine, /performanceProfile\\.maxPixelRatio/);
});
