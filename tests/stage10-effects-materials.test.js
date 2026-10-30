import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TextureLoader, Vector2 } from 'three';
import { MakeupEngine } from '../src/core/MakeupEngine.js';
import { OpenMakeup } from '../src/OpenMakeup.js';
import {
  loadLipMats,
  loadBlushMat,
  loadEyeShadowMat,
  loadMascaraMat,
  loadEyeLineMat,
} from '../src/core/materials.js';
import { LOOK_PRESETS } from '../src/ui/look-presets.js';

const manifest = JSON.parse(readFileSync(new URL('../assets/patterns/patterns.json', import.meta.url), 'utf8'));

function createAssetResolver() {
  return {
    shader: (folder, file) => `${folder}/${file}`,
    shaderRoot: (file) => `root/${file}`,
  };
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

test('Stage 10 disposes textures already loaded when a later bundled texture or shader fails', async () => {
  const originalLoad = TextureLoader.prototype.load;
  const originalFetch = globalThis.fetch;
  const assets = createAssetResolver();
  const scenarios = [
    { name: 'lip materials', load: loadLipMats, failTexture: 'noize.PNG', expectedTextures: 3 },
    { name: 'blush material', load: loadBlushMat, failTexture: 'foundation_mask.PNG', expectedTextures: 1 },
    { name: 'eyeshadow material', load: loadEyeShadowMat, failTexture: 'foundation_mask2.PNG', expectedTextures: 1 },
    { name: 'mascara material', load: loadMascaraMat, failShader: 'fragment.glsl', expectedTextures: 1 },
    { name: 'eyeliner material', load: loadEyeLineMat, failShader: 'fragment.glsl', expectedTextures: 1 },
  ];
  try {
    for (const scenario of scenarios) {
      const loadedTextures = [];
      TextureLoader.prototype.load = function (url, onLoad, _onProgress, onError) {
        if (scenario.failTexture && String(url).includes(scenario.failTexture)) {
          queueMicrotask(() => onError(new Error('simulated texture failure')));
          return null;
        }
        const texture = { disposed: false, dispose() { this.disposed = true; } };
        loadedTextures.push({ url: String(url), texture });
        queueMicrotask(() => onLoad(texture));
        return texture;
      };
      globalThis.fetch = async (url) => {
        if (scenario.failShader && String(url).includes(scenario.failShader)) {
          return { ok: false, status: 503, text: async () => 'simulated shader failure' };
        }
        return { ok: true, status: 200, text: async () => 'precision highp float; void main() {}' };
      };
      await assert.rejects(scenario.load(assets), /simulated texture failure|HTTP 503/, scenario.name);
      assert.equal(loadedTextures.length, scenario.expectedTextures, scenario.name + ' loaded the expected partial texture set');
      assert.ok(loadedTextures.every(({ texture }) => texture.disposed), scenario.name + ' must dispose partial textures');
    }
  } finally {
    TextureLoader.prototype.load = originalLoad;
    globalThis.fetch = originalFetch;
  }
});

test('Stage 10: a late async color provider cannot overwrite a newer apply for the same face layer', async () => {
  const oldColor = deferred();
  const activated = [];
  const intensities = [];
  const sdk = new OpenMakeup({ video: {}, renderCanvas: {}, aiColor: () => oldColor.promise });
  sdk._ready = true;
  sdk.engine.setAR = (category, color, finishMode) => activated.push({ category, color, finishMode });
  sdk.engine.setIntensity = (_category, intensity) => intensities.push(intensity);
  const olderApply = sdk.apply('lipstick');
  const newerResult = await sdk.apply('lipstick', { color: '#2255cc', finish: 'matte', intensity: 0.42 });
  oldColor.resolve('#ff0000');
  await assert.rejects(olderApply, /apply for "lipstick" was superseded by a newer selection/);
  assert.deepEqual(activated, [{ category: 'lipstick', color: '#2255cc', finishMode: '1' }]);
  assert.deepEqual(intensities, [0.42]);
  assert.equal(newerResult.color, '#2255cc');
});

test('Stage 10: clear and dispose cancel pending async apply operations', async () => {
  const clearColor = deferred();
  const clearCalls = [];
  const clearSdk = new OpenMakeup({ video: {}, renderCanvas: {}, aiColor: () => clearColor.promise });
  clearSdk._ready = true;
  clearSdk.engine.clearPart = (category) => clearCalls.push(category);
  clearSdk.engine.setAR = () => assert.fail('a cleared layer must not reactivate on a late color result');
  clearSdk.engine.setIntensity = () => assert.fail('a cleared layer must not receive late intensity');
  const pendingClear = clearSdk.apply('lipstick');
  clearSdk.clear('lipstick');
  clearColor.resolve('#fa1234');
  await assert.rejects(pendingClear, /superseded by a newer selection/);
  assert.deepEqual(clearCalls, ['lipstick']);

  const disposeColor = deferred();
  const disposeSdk = new OpenMakeup({ video: {}, renderCanvas: {}, aiColor: () => disposeColor.promise });
  disposeSdk._ready = true;
  let disposed = false;
  disposeSdk.engine.dispose = () => { disposed = true; };
  disposeSdk.engine.setAR = () => assert.fail('disposed SDK must not apply a late color result');
  disposeSdk.engine.setIntensity = () => assert.fail('disposed SDK must not update a late intensity');
  const pendingDispose = disposeSdk.apply('lipstick');
  disposeSdk.dispose();
  disposeColor.resolve('#12fabc');
  await assert.rejects(pendingDispose, /superseded by a newer selection/);
  assert.equal(disposed, true);
  assert.equal(disposeSdk.ready, false);
});

test('Stage 10: every curated look references a valid 1-based bundled pattern index', () => {
  assert.equal(LOOK_PRESETS.length, 12);
  for (const look of LOOK_PRESETS) {
    for (const [category, options] of Object.entries(look.layers)) {
      if (options.pattern == null) continue;
      const available = manifest.categories[category];
      assert.ok(Array.isArray(available), `${look.id}/${category}: missing pattern category`);
      assert.ok(
        Number.isInteger(options.pattern) && options.pattern >= 1 && options.pattern <= available.length,
        `${look.id}/${category}: pattern ${options.pattern} is not a valid 1-based index (count ${available.length})`,
      );
      const selected = available[options.pattern - 1];
      assert.equal(selected.bundled, true, `${look.id}/${category}: pattern is not bundled`);
      assert.equal(selected.file, `patterns/${category}/${selected.id}.png`);
    }
  }
});

test('Stage 10: soft-focus blur resolution tracks the source camera frame, not window dimensions', () => {
  const engine = Object.create(MakeupEngine.prototype);
  const resolution = new Vector2(1440, 900);
  engine.video = { videoWidth: 640, videoHeight: 480 };
  engine.blurMat = { uniforms: { resolution: { value: resolution } } };

  assert.equal(engine._syncVideoTextureResolution(), true);
  assert.deepEqual(resolution.toArray(), [640, 480]);

  engine.video.videoWidth = 1280;
  engine.video.videoHeight = 720;
  assert.equal(engine._syncVideoTextureResolution(), true);
  assert.deepEqual(resolution.toArray(), [1280, 720]);

  engine.video.videoWidth = 0;
  assert.equal(engine._syncVideoTextureResolution(), false);
  assert.deepEqual(resolution.toArray(), [1280, 720], 'missing metadata must not replace a valid source size');

  const engineSource = readFileSync(new URL('../src/core/MakeupEngine.js', import.meta.url), 'utf8');
  const layoutSource = engineSource.slice(engineSource.indexOf('_sizeToVideoBox ='), engineSource.indexOf('_resizeOverlay ='));
  assert.match(layoutSource, /_syncVideoTextureResolution\(\)/);

  const shader = readFileSync(new URL('../assets/shaders/bluremask/fragment.glsl', import.meta.url), 'utf8');
  assert.match(shader, /uniform vec2 resolution/);
  assert.match(shader, /blurScale \/ resolution\.x/);
  assert.match(shader, /blurScale \/ resolution\.y/);
});
