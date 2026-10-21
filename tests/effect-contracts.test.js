import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { OpenMakeup } from '../src/OpenMakeup.js';
import { CATEGORIES } from '../src/categories.js';
import { MORPH_CONTROLS, MORPH_TARGETS_EXTRA } from '../src/morphs.js';
import { MakeupEngine } from '../src/core/MakeupEngine.js';
import { calculateVideoBoxLayout } from '../src/core/videoLayout.js';
import { Vector3 } from 'three';

const manifest = JSON.parse(readFileSync(new URL('../assets/patterns/patterns.json', import.meta.url), 'utf8'));
const catalog = JSON.parse(readFileSync(new URL('../docs/pattern-catalog.json', import.meta.url), 'utf8'));

function mockTexture() {
  return { userData: {}, disposed: false, dispose() { this.disposed = true; } };
}

test('only implemented bundled pattern categories are published and all catalog paths exist', () => {
  const expectedCategories = ['blush', 'eyeshadow', 'eyeline', 'mascara'];
  assert.deepEqual(Object.keys(manifest.categories).sort(), Object.keys(CATEGORIES).sort());
  assert.deepEqual(expectedCategories.filter((name) => manifest.categories[name].length > 0), expectedCategories);
  assert.deepEqual(manifest.categories.foundation, []);
  assert.deepEqual(manifest.categories.lipstick, []);

  const diskIds = new Set();
  for (const [category, patterns] of Object.entries(manifest.categories)) {
    for (const pattern of patterns) {
      assert.equal(pattern.bundled, true, `${category}/${pattern.id} must ship offline`);
      assert.match(String(pattern.id), /^\d+$/);
      assert.equal(pattern.file, `patterns/${category}/${pattern.id}.png`);
      assert.ok(readFileSync(new URL(`../assets/${pattern.file}`, import.meta.url)).length > 1000);
      diskIds.add(`${category}:${pattern.id}`);
    }
  }

  assert.equal(catalog.length, diskIds.size);
  for (const item of catalog) {
    assert.ok(diskIds.has(`${item.makeup_type}:${item.pattern_id}`));
    assert.ok(readFileSync(new URL(`../${item.target_file}`, import.meta.url)).length > 1000);
  }
});

test('every friendly morph mapping references a real GLB morph target', () => {
  const glb = readFileSync(new URL('../assets/models/face.glb', import.meta.url));
  assert.equal(glb.toString('ascii', 0, 4), 'glTF');
  assert.equal(glb.readUInt32LE(4), 2);
  const jsonLength = glb.readUInt32LE(12);
  const gltf = JSON.parse(glb.toString('utf8', 20, 20 + jsonLength).trim());
  const mesh = gltf.meshes[0];
  const targetNames = mesh.extras.targetNames;
  assert.equal(mesh.primitives[0].targets.length, targetNames.length);
  for (let i = 0; i <= 5; i++) assert.ok(mesh.primitives[0].attributes[`TEXCOORD_${i}`] !== undefined);
  const faceController = readFileSync(new URL('../src/core/FaceMeshModelController.js', import.meta.url), 'utf8');
  assert.match(faceController, /geo\.attributes\.texcoord_4 \|\| geo\.attributes\.uv4/);
  assert.match(faceController, /const shadowUv = geo\.attributes\.uv3/);

  const missingFriendlyTargets = [...new Set(Object.values(MORPH_CONTROLS).map((item) => item.target))]
    .filter((target) => !targetNames.includes(target));
  assert.deepEqual(missingFriendlyTargets, []);
  assert.deepEqual(MORPH_TARGETS_EXTRA.filter((target) => !targetNames.includes(target)), []);
  for (const target of targetNames) {
    const isFriendly = Object.values(MORPH_CONTROLS).some((control) => control.target === target);
    assert.equal(isFriendly || MORPH_TARGETS_EXTRA.includes(target), true, `unclassified GLB target ${target}`);
  }
});

test('finish modes set real shader uniforms with consistent values', () => {
  const engine = Object.create(MakeupEngine.prototype);
  Object.assign(engine, {
    _activeLayers: new Set(),
    _syncFaceLayerVisibility() {},
    foundationMat: { uniforms: { _MainColor: { value: null }, _noise: { value: -1 } } },
    foundationMesh: {},
    blushMat: { uniforms: { _ShadowColor: { value: null }, _noise: { value: -1 } } },
    blushMesh: {},
    eyeShadowMat: { uniforms: { _ShadowColor: { value: null }, _noise: { value: -1 } } },
    eyeShadowMesh: {},
    lipsMat: { uniforms: { _MainColor: { value: null }, _shine: { value: 0 }, _bright: { value: 0 } } },
    lipsMesh: {},
    eyeLineMat: { uniforms: { color: { value: null } } },
    eyeLineLeftNurbs: { mesh: {} }, eyeLineRightNurbs: { mesh: {} },
    mascaraMat: { uniforms: { color: { value: null } } },
    mascaraLeftNurbs: { mesh: {} }, mascaraRightNurbs: { mesh: {} },
  });

  for (const category of ['foundation', 'blush', 'eyeshadow']) {
    engine.setAR(category, '#abcdef', '1');
    const materialName = { foundation: 'foundationMat', blush: 'blushMat', eyeshadow: 'eyeShadowMat' }[category];
    assert.equal(engine[materialName].uniforms._noise.value, 0);
    engine.setAR(category, '#abcdef', '7');
    assert.equal(engine[materialName].uniforms._noise.value, 0.7);
    engine.setAR(category, '#abcdef', '5');
    assert.equal(engine[materialName].uniforms._noise.value, 1);
  }

  engine.setAR('lipstick', '#abcdef', '2');
  assert.equal(engine.lipsMat.uniforms._shine.value, 0.9);
  assert.equal(engine.lipsMat.uniforms._bright.value, 0);
  engine.setAR('lipstick', '#abcdef', '5');
  assert.equal(engine.lipsMat.uniforms._shine.value, 0.3);
  assert.equal(engine.lipsMat.uniforms._bright.value, 0.6);
  engine.setAR('eyeline', '#123456');
  engine.setAR('mascara', '#654321');
  assert.equal(engine._activeLayers.size, 6);
});

test('finish activation rejects missing uniforms and unsupported mode values', () => {
  const engine = Object.create(MakeupEngine.prototype);
  Object.assign(engine, {
    _activeLayers: new Set(),
    _syncFaceLayerVisibility() {},
    foundationMat: { uniforms: { _MainColor: { value: null } } },
    foundationMesh: {},
  });
  assert.throws(() => engine.setAR('foundation', '#123456', '1'), /missing required uniform "_noise"/);
  engine.foundationMat.uniforms._noise = { value: 0 };
  assert.throws(() => engine.setAR('foundation', '#123456', '99'), /Unsupported finish mode/);
  assert.throws(() => engine.setAR('foundation', 'not-a-color', '1'), /Invalid color value/);
  assert.throws(() => engine.setAR('foundation', '#abcdef00', '1'), /Invalid color value/);
});

test('custom pattern switching disposes replaced texture and reset restores default', async () => {
  const engine = Object.create(MakeupEngine.prototype);
  const defaultTexture = mockTexture();
  const createdTextures = [];
  Object.assign(engine, {
    assets: { pattern: (category, id) => `./assets/patterns/${category}/${id}.png` },
    _texLoader: {
      load(url, onLoad) {
        const texture = mockTexture();
        createdTextures.push({ url, texture });
        onLoad(texture);
      },
    },
    _defaultPatternTextures: new Map([['blush', defaultTexture]]),
    _activePatternTextures: new Map(),
    blushMat: { uniforms: { _EyeShadowTexture: { value: defaultTexture } } },
  });

  assert.equal(await engine.setPattern('blush', 6413), true);
  const first = createdTextures[0];
  assert.equal(engine.blushMat.uniforms._EyeShadowTexture.value, first.texture);
  assert.equal(first.texture.flipY, false);
  assert.equal(await engine.setPattern('blush', 6415), true);
  assert.equal(first.texture.disposed, true);
  const second = createdTextures[1];
  assert.equal(engine.blushMat.uniforms._EyeShadowTexture.value, second.texture);
  assert.equal(await engine.setPattern('blush', null), true);
  assert.equal(engine.blushMat.uniforms._EyeShadowTexture.value, defaultTexture);
  assert.equal(second.texture.disposed, true);
  assert.equal(defaultTexture.disposed, false);
});

test('unsupported pattern application is rejected before any file load', async () => {
  const engine = Object.create(MakeupEngine.prototype);
  let loaded = false;
  Object.assign(engine, {
    assets: { pattern: () => { loaded = true; return './fake.png'; } },
    _texLoader: { load() { loaded = true; } },
    _defaultPatternTextures: new Map(),
    _activePatternTextures: new Map(),
  });
  await assert.rejects(engine.setPattern('foundation', 6421), /not implemented/);
  await assert.rejects(engine.setPattern('lipstick', 6427), /not implemented/);
  assert.equal(loaded, false);
});

test('the latest pattern request wins when texture loads finish out of order', async () => {
  const engine = Object.create(MakeupEngine.prototype);
  const defaultTexture = mockTexture();
  const pending = [];
  const created = [];
  Object.assign(engine, {
    assets: { pattern: (category, id) => `./assets/patterns/${category}/${id}.png` },
    _texLoader: {
      load(url, onLoad) {
        const texture = mockTexture();
        created.push(texture);
        pending.push({ url, onLoad: () => onLoad(texture) });
      },
    },
    _defaultPatternTextures: new Map([['blush', defaultTexture]]),
    _activePatternTextures: new Map(),
    _patternRequestVersions: new Map(),
    blushMat: { uniforms: { _EyeShadowTexture: { value: defaultTexture } } },
  });

  const first = engine.setPattern('blush', 6413);
  const second = engine.setPattern('blush', 6415);
  assert.equal(pending.length, 2);
  pending[1].onLoad();
  assert.equal(await second, true);
  pending[0].onLoad();
  assert.equal(await first, false);
  assert.equal(engine.blushMat.uniforms._EyeShadowTexture.value, created[1]);
  assert.equal(created[0].disposed, true);
  assert.equal(created[1].disposed, false);
});

test('failed pattern replacement keeps the previous texture active', async () => {
  const engine = Object.create(MakeupEngine.prototype);
  const defaultTexture = mockTexture();
  const activeTexture = mockTexture();
  Object.assign(engine, {
    assets: { pattern: (category, id) => `./assets/patterns/${category}/${id}.png` },
    _texLoader: { load(url, onLoad, onProgress, onError) { onError(new Error('offline asset')); } },
    _defaultPatternTextures: new Map([['blush', defaultTexture]]),
    _activePatternTextures: new Map([['blush', activeTexture]]),
    blushMat: { uniforms: { _EyeShadowTexture: { value: activeTexture } } },
  });

  await assert.rejects(engine.setPattern('blush', 6413), /Could not load pattern.*offline asset/);
  assert.equal(engine.blushMat.uniforms._EyeShadowTexture.value, activeTexture);
  assert.equal(activeTexture.disposed, false);
});

test('camera-sensitive materials receive the camera world position', () => {
  const engine = Object.create(MakeupEngine.prototype);
  Object.assign(engine, {
    camera3D: {
      updateMatrixWorld() {},
      getWorldPosition(target) { return target.set(12, 34, 56); },
    },
    _cameraWorldPosition: new Vector3(),
    foundationMat: { uniforms: { uCameraPosition: { value: new Vector3() } } },
    blushMat: { uniforms: { uCameraPosition: { value: new Vector3() } } },
    lipsMat: { uniforms: { cameraPosition: { value: new Vector3() } } },
  });
  engine._updateCameraUniforms();
  assert.deepEqual(engine.foundationMat.uniforms.uCameraPosition.value.toArray(), [12, 34, 56]);
  assert.deepEqual(engine.blushMat.uniforms.uCameraPosition.value.toArray(), [12, 34, 56]);
  assert.deepEqual(engine.lipsMat.uniforms.cameraPosition.value.toArray(), [12, 34, 56]);
});

test('SDK rejects unsupported patterns, invalid colors and invalid finishes', async () => {
  const sdk = new OpenMakeup({ video: {}, renderCanvas: {} });
  sdk._ready = true;
  sdk._patterns = { blush: [{ id: 6413, bundled: true }] };
  sdk.engine.setPattern = async () => { throw new Error('pattern should not load'); };
  sdk.engine.setAR = () => { throw new Error('effect should not activate'); };
  await assert.rejects(sdk.apply('foundation', { pattern: 1 }), /patterns are not supported for "foundation"/);
  await assert.rejects(sdk.apply('blush', { color: 'bad-color' }), /invalid color/);
  await assert.rejects(sdk.apply('lipstick', { finish: 'mirror' }), /finish "mirror" is not supported/);
  await assert.rejects(sdk.apply('eyeline', { finish: 'glossy' }), /finish "glossy" is not supported/);
});

test('SDK accepts an explicit listed pattern ID and rejects unknown IDs', async () => {
  const sdk = new OpenMakeup({ video: {}, renderCanvas: {} });
  sdk._ready = true;
  sdk._patterns = { eyeshadow: manifest.categories.eyeshadow };
  const patternCalls = [];
  sdk.engine.setPattern = async (...args) => { patternCalls.push(args); return true; };
  sdk.engine.setAR = () => true;
  const selected = manifest.categories.eyeshadow[2];
  const result = await sdk.apply('eyeshadow', { patternId: selected.id });
  assert.deepEqual(patternCalls, [['eyeshadow', selected.id]]);
  assert.equal(result.pattern, selected.id);
  await assert.rejects(sdk.apply('eyeshadow', { patternId: 999999 }), /pattern id "999999" is not available/);
  await assert.rejects(sdk.apply('eyeshadow', { patternId: '../patterns/lipstick/6427.png' }), /pattern id ".+" is not available/);
});

test('SDK apply restores a supported category default pattern when omitted', async () => {
  const sdk = new OpenMakeup({ video: {}, renderCanvas: {} });
  sdk._ready = true;
  let patternCall;
  sdk.engine.setPattern = async (...args) => { patternCall = args; };
  sdk.engine.setAR = () => true;
  const result = await sdk.apply('blush', { color: '#123456' });
  assert.deepEqual(patternCall, ['blush', null]);
  assert.equal(result.pattern, null);
});

test('SDK initializes with valid bundled manifest and rejects a manifest that advertises non-bundled files', async () => {
  const sdk = new OpenMakeup({ video: {}, renderCanvas: {} });
  sdk.engine.init = async () => {};
  sdk.engine.dispose = () => {};
  sdk.engine.assets = { manifest: () => './assets/patterns/patterns.json' };
  const originalFetch = globalThis.fetch;
  let responseManifest = manifest;
  globalThis.fetch = async () => ({ ok: true, json: async () => responseManifest });
  try {
    await sdk.init();
    assert.equal(sdk.ready, true);
    assert.equal(sdk.getPatterns('blush').length, manifest.categories.blush.length);
    assert.equal(sdk.getPatterns('foundation').length, 0);

    const invalidSdk = new OpenMakeup({ video: {}, renderCanvas: {} });
    let disposed = false;
    invalidSdk.engine.init = async () => {};
    invalidSdk.engine.dispose = () => { disposed = true; };
    invalidSdk.engine.assets = { manifest: () => './assets/patterns/patterns.json' };
    responseManifest = structuredClone(manifest);
    responseManifest.categories.blush[0].bundled = false;
    await assert.rejects(invalidSdk.init(), /not bundled for offline use/);
    assert.equal(invalidSdk.ready, false);
    assert.equal(disposed, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test('category configuration maps every public category to a live engine layer', async () => {
  const sdk = new OpenMakeup({ video: {}, renderCanvas: {} });
  sdk._ready = true;
  sdk._patterns = { blush: [], eyeshadow: [], eyeline: [], mascara: [] };
  const activations = [];
  const textureResets = [];
  sdk.engine.setAR = (category, color, finish) => { activations.push({ category, color, finish }); };
  sdk.engine.setPattern = async (category, id) => { textureResets.push([category, id]); };

  for (const category of Object.keys(CATEGORIES)) await sdk.apply(category);
  assert.deepEqual(activations.map((item) => item.category), Object.values(CATEGORIES).map((config) => config.engine));
  assert.deepEqual(textureResets, [
    ['blush', null], ['eyeshadow', null], ['eyeline', null], ['mascara', null],
  ]);
});

test('clearing a single layer and clearing all restore default patterns and dispose custom textures', () => {
  const engine = Object.create(MakeupEngine.prototype);
  const categories = ['blush', 'eyeshadow', 'eyeline', 'mascara'];
  const defaults = Object.fromEntries(categories.map((category) => [category, mockTexture()]));
  const active = Object.fromEntries(categories.map((category) => [category, mockTexture()]));
  Object.assign(engine, {
    _activeLayers: new Set(['blush', 'eyeshadow', 'eyeline', 'mascara', 'lipstick']),
    _defaultPatternTextures: new Map(Object.entries(defaults)),
    _activePatternTextures: new Map(Object.entries(active)),
    _syncFaceLayerVisibility() {},
    blushMat: { uniforms: { _EyeShadowTexture: { value: active.blush } } },
    eyeShadowMat: { uniforms: { _EyeShadowTexture: { value: active.eyeshadow } } },
    eyeLineMat: { uniforms: { map: { value: active.eyeline } } },
    mascaraMat: { uniforms: { map: { value: active.mascara } } },
  });

  engine.clearPart('blush');
  assert.equal(engine._activeLayers.has('blush'), false);
  assert.equal(engine._activeLayers.has('eyeshadow'), true);
  assert.equal(engine.blushMat.uniforms._EyeShadowTexture.value, defaults.blush);
  assert.equal(active.blush.disposed, true);

  engine.clearAll();
  assert.equal(engine._activeLayers.size, 0);
  for (const category of categories) assert.equal(active[category].disposed, true);
  assert.equal(engine.eyeShadowMat.uniforms._EyeShadowTexture.value, defaults.eyeshadow);
  assert.equal(engine.eyeLineMat.uniforms.map.value, defaults.eyeline);
  assert.equal(engine.mascaraMat.uniforms.map.value, defaults.mascara);
});

test('tracking visibility hides stale makeup without deleting layer selections', () => {
  const engine = Object.create(MakeupEngine.prototype);
  const layers = {
    faceVideoMesh: { visible: false }, blushMesh: { visible: false },
    lipsMesh: { visible: false }, eyeShadowMesh: { visible: false },
    foundationMesh: { visible: false }, blureMesh: { visible: false },
    wireMesh: { visible: false },
    eyeLineLeftNurbs: { mesh: { visible: false } }, eyeLineRightNurbs: { mesh: { visible: false } },
    mascaraLeftNurbs: { mesh: { visible: false } }, mascaraRightNurbs: { mesh: { visible: false } },
  };
  Object.assign(engine, layers, {
    _faceVisible: true, _activeLayers: new Set(['blush', 'eyeline']),
    _blurEnabled: true, _wireframeEnabled: true,
  });
  engine._syncFaceLayerVisibility();
  assert.equal(engine.blushMesh.visible, true);
  assert.equal(engine.eyeLineLeftNurbs.mesh.visible, true);
  assert.equal(engine.lipsMesh.visible, false);
  assert.equal(engine.blureMesh.visible, true);
  assert.equal(engine.wireMesh.visible, true);

  engine._faceVisible = false;
  engine._syncFaceLayerVisibility();
  assert.equal(engine.blushMesh.visible, false);
  assert.equal(engine.eyeLineRightNurbs.mesh.visible, false);
  assert.equal(engine.blureMesh.visible, false);
  assert.equal(engine.wireMesh.visible, false);
  assert.equal(engine._activeLayers.has('blush'), true);
  assert.equal(engine._activeLayers.has('eyeline'), true);
});

test('camera uniforms referenced by shaders exist and receive runtime updates', () => {
  const foundationFragment = readFileSync(new URL('../assets/shaders/foundation/fragment.glsl', import.meta.url), 'utf8');
  const blushVertex = readFileSync(new URL('../assets/shaders/blush/vertex.glsl', import.meta.url), 'utf8');
  const lipFragment = readFileSync(new URL('../assets/shaders/lip/fragment.glsl', import.meta.url), 'utf8');
  const materialLoaders = readFileSync(new URL('../src/core/materials.js', import.meta.url), 'utf8');
  const foundationLoader = materialLoaders.match(/export async function loadFoundationMat\(assets\) \{[\s\S]*?\n\}/)?.[0] || '';
  assert.match(foundationFragment, /uniform float _noise;/);
  assert.match(foundationFragment, /uniform vec3 uCameraPosition;/);
  assert.match(foundationLoader, /_noise: \{ value: 0\.0 \}/);
  assert.match(blushVertex, /uniform vec3 uCameraPosition;/);
  assert.match(lipFragment, /uniform vec3 cameraPosition;/);
});

test('normal UI uses only friendly morph controls, not raw GLB target names', () => {
  const mainSource = readFileSync(new URL('../main.js', import.meta.url), 'utf8');
  assert.match(mainSource, /for \(const \[name, config\] of Object\.entries\(MORPH_CONTROLS \|\| \{\}\)\)/);
  assert.match(mainSource, /validMorphs\.has\(name\)/);
  assert.doesNotMatch(mainSource, /makeSlider\(item \? item\.name : target/);
});

test('morph API rejects unknown names/non-finite weights and drives valid model targets', () => {
  const glb = readFileSync(new URL('../assets/models/face.glb', import.meta.url));
  const jsonLength = glb.readUInt32LE(12);
  const gltf = JSON.parse(glb.toString('utf8', 20, 20 + jsonLength).trim());
  const targetNames = gltf.meshes[0].extras.targetNames;
  const engine = Object.create(MakeupEngine.prototype);
  engine._morphReady = true;
  engine._morphDict = Object.fromEntries(targetNames.map((name, index) => [name, index]));
  engine._morphInfluences = new Float32Array(targetNames.length);
  engine._pendingMorph = {};
  engine.setMorph('noseSlim', 0.65);
  assert.ok(Math.abs(engine._morphInfluences[engine._morphDict[MORPH_CONTROLS.noseSlim.target]] - 0.65) < 1e-6);
  engine.setMorph('facemesh10.001', 0.25);
  assert.equal(engine._morphInfluences[engine._morphDict['facemesh10.001']], 0.25);
  assert.throws(() => engine.setMorph('faceSlimMagic', 0.5), /unknown face morph/);
  assert.throws(() => engine.setMorph('noseSlim', Number.NaN), /finite number/);
  engine.resetMorph();
  assert.ok(engine._morphInfluences.every((weight) => weight === 0));
});

test('preview and fullscreen use matching video/canvas fit rectangles', () => {
  const cover = calculateVideoBoxLayout(640, 480, 1000, 500, 'cover');
  assert.deepEqual(cover, { width: 1000, height: 750, left: 0, top: -125 });

  const contain = calculateVideoBoxLayout(640, 480, 1000, 500, 'contain');
  assert.deepEqual(contain, { width: 667, height: 500, left: 167, top: 0 });

  const portraitContain = calculateVideoBoxLayout(1280, 720, 360, 800, 'contain');
  assert.deepEqual(portraitContain, { width: 360, height: 203, left: 0, top: 299 });

  assert.deepEqual(calculateVideoBoxLayout(0, 720, 360, 800, 'contain'), {
    width: 0, height: 0, left: 0, top: 0,
  });
});

test('video and WebGL canvas retain the same front-camera mirror transform', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /#video\{[^}]*transform:scaleX\(-1\)/);
  assert.match(html, /#renderCanvas\{[^}]*transform:scaleX\(-1\)/);
});
