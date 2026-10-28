import test from 'node:test';
import assert from 'node:assert/strict';
import { OpenMakeup } from '../src/OpenMakeup.js';
import { MakeupEngine } from '../src/core/MakeupEngine.js';
import { hasLiveCameraTrack, waitForCameraFrames } from '../src/core/cameraReadiness.js';

function makeVideo({ trackState = 'live', enabled = true, currentTime = 0, readyState = 2 } = {}) {
  return { currentTime, readyState, srcObject: {
    getVideoTracks: () => [{ readyState: trackState, enabled }],
    getTracks: () => [{ stop() {} }],
  } };
}

test('SDK initialization rejects a missing pattern manifest and disposes the engine', async () => {
  const sdk = new OpenMakeup({ video: {}, renderCanvas: {} });
  let disposed = false;
  sdk.engine.init = async () => {};
  sdk.engine.dispose = () => { disposed = true; };
  sdk.engine.assets = { manifest: () => '/assets/patterns/patterns.json' };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 404 });
  try {
    await assert.rejects(sdk.init(), /required pattern manifest could not be loaded.*HTTP 404/);
    assert.equal(sdk.ready, false);
    assert.equal(disposed, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('camera readiness requires a live, enabled video track', () => {
  assert.equal(hasLiveCameraTrack(makeVideo()), true);
  assert.equal(hasLiveCameraTrack(makeVideo({ trackState: 'ended' })), false);
  assert.equal(hasLiveCameraTrack(makeVideo({ enabled: false })), false);
  assert.equal(hasLiveCameraTrack({ currentTime: 0, readyState: 2, srcObject: null }), false);
});

test('camera readiness resolves only after video time advances', async () => {
  const video = makeVideo();
  let clock = 0;
  const ready = await waitForCameraFrames(video, {
    timeoutMs: 300,
    pollIntervalMs: 50,
    now: () => clock,
    sleep: async (ms) => { clock += ms; if (clock >= 100) video.currentTime += 0.04; },
  });
  assert.equal(ready, true);
});

test('camera readiness rejects a live track that produces no frames', async () => {
  const video = makeVideo();
  let clock = 0;
  await assert.rejects(waitForCameraFrames(video, {
    timeoutMs: 120,
    pollIntervalMs: 40,
    now: () => clock,
    sleep: async (ms) => { clock += ms; },
  }), /new video frames are not arriving/);
});

test('camera readiness rejects a single new frame followed by a freeze', async () => {
  const video = makeVideo();
  let clock = 0;
  let emitted = false;
  await assert.rejects(waitForCameraFrames(video, {
    timeoutMs: 220,
    pollIntervalMs: 40,
    now: () => clock,
    sleep: async (ms) => {
      clock += ms;
      if (clock >= 80 && !emitted) {
        video.currentTime += 0.04;
        emitted = true;
      }
    },
  }), /new video frames are not arriving/);
});

test('camera readiness rejects when the track ends during startup', async () => {
  const video = makeVideo();
  let clock = 0;
  await assert.rejects(waitForCameraFrames(video, {
    timeoutMs: 200,
    pollIntervalMs: 20,
    now: () => clock,
    sleep: async (ms) => {
      clock += ms;
      if (clock >= 40) video.srcObject.getVideoTracks = () => [{ readyState: 'ended', enabled: true }];
    },
  }), /No live camera video track/);
});

test('engine cancels a late camera start after stop', async () => {
  let finishStart;
  let stopCalls = 0;
  const engine = Object.create(MakeupEngine.prototype);
  Object.assign(engine, {
    _camera: {
      start: () => new Promise((resolve) => { finishStart = resolve; }),
      stop: () => { stopCalls += 1; },
    },
    _cameraRunning: false,
    _cameraStartPromise: null,
    _lifecycleGeneration: 0,
    _faceVisible: false,
    _noFaceFrames: 0,
    _rafId: null,
    _activeLayers: new Set(),
    video: { srcObject: null },
    _animate() {},
    _syncFaceLayerVisibility() {},
  });

  const pendingStart = engine.start();
  assert.equal(typeof pendingStart.then, 'function');
  await Promise.resolve(); // allow the deferred start body to invoke camera.start()
  engine.stop();
  finishStart();

  await assert.rejects(pendingStart, /Camera could not start: Camera startup was cancelled/);
  assert.equal(engine._cameraRunning, false);
  assert.ok(stopCalls >= 2);
});

test('engine restart replaces an unresolved start without the stale promise clearing or stopping it', async () => {
  const resolvers = [];
  let stopCalls = 0;
  const camera = {
    start: () => new Promise((resolve) => { resolvers.push(resolve); }),
    stop: () => { stopCalls += 1; },
  };
  const engine = Object.create(MakeupEngine.prototype);
  Object.assign(engine, {
    _camera: camera,
    _cameraRunning: false,
    _cameraStartPromise: null,
    _cameraStartToken: null,
    _lifecycleGeneration: 0,
    _faceVisible: false,
    _noFaceFrames: 0,
    _rafId: null,
    _activeLayers: new Set(),
    video: { srcObject: null },
    _animate() {},
    _syncFaceLayerVisibility() {},
    _stopAttachedVideoTracks() {},
  });

  const staleStart = engine.start();
  await Promise.resolve();
  engine.stop();
  const currentStart = engine.start();
  await Promise.resolve();
  assert.equal(resolvers.length, 2);
  assert.notEqual(staleStart, currentStart);
  const currentSharedStart = engine._cameraStartPromise;
  assert.ok(currentSharedStart, 'the current shared start promise must be registered');

  resolvers[0]();
  await assert.rejects(staleStart, /Camera could not start: Camera startup was cancelled/);
  assert.equal(engine._cameraStartPromise, currentSharedStart);
  assert.equal(engine._cameraRunning, false);
  assert.equal(stopCalls, 1, 'the stale start must not stop the current camera request');

  resolvers[1]();
  assert.equal(await currentStart, engine);
  assert.equal(engine._cameraRunning, true);
  assert.equal(engine._cameraStartPromise, null);
  assert.equal(stopCalls, 1);
});

test('SDK start returns a promise that settles with camera startup', async () => {
  const sdk = new OpenMakeup({ video: {}, renderCanvas: {} });
  let resolveStart;
  sdk.engine.start = () => new Promise((resolve) => { resolveStart = resolve; });
  const startResult = sdk.start();
  assert.equal(typeof startResult.then, 'function');
  let finished = false;
  startResult.then(() => { finished = true; });
  await Promise.resolve();
  assert.equal(finished, false);
  resolveStart();
  assert.equal(await startResult, sdk);
});

test('SDK apply propagates effect activation errors instead of reporting success', async () => {
  const sdk = new OpenMakeup({ video: {}, renderCanvas: {} });
  sdk._ready = true;
  sdk.engine.setAR = () => { throw new Error('lipstick material is not ready'); };
  await assert.rejects(sdk.apply('lipstick'), /lipstick material is not ready/);
});

test('SDK does not advertise lipstick patterns without a renderer mapping', () => {
  const sdk = new OpenMakeup({ video: {}, renderCanvas: {} });
  sdk._patterns.lipstick = [{ id: '6427', bundled: true }];
  sdk._patterns.blush = [{ id: '6413', bundled: true }];
  assert.deepEqual(sdk.getPatterns('lipstick'), []);
  assert.deepEqual(sdk.getPatterns('blush'), [{ number: 1, id: '6413', bundled: true }]);
});

test('SDK apply propagates pattern-loading errors instead of swallowing them', async () => {
  const sdk = new OpenMakeup({ video: {}, renderCanvas: {} });
  sdk._ready = true;
  sdk._patterns.eyeshadow = [{ id: '6309', bundled: true }];
  sdk.engine.setPattern = async () => { throw new Error('pattern texture missing'); };
  sdk.engine.setAR = () => { throw new Error('must not activate before pattern loads'); };
  await assert.rejects(sdk.apply('eyeshadow', { pattern: 1 }), /pattern texture missing/);
});

test('engine cancels model/material initialization on background stop before starting camera', async () => {
  let finishMaterials;
  let cameraSetupCalls = 0;
  let faceSetupCalls = 0;
  let disposeCalls = 0;
  const originalWindow = globalThis.window;
  globalThis.window = { addEventListener() {}, removeEventListener() {} };
  const engine = Object.create(MakeupEngine.prototype);
  Object.assign(engine, {
    _ready: false, _initPromise: null, _lifecycleGeneration: 0,
    _camera: null, _cameraRunning: false, _cameraStartPromise: null, _cameraStartToken: null,
    _faceVisible: false, _noFaceFrames: 0, _rafId: null, _activeLayers: new Set(),
    video: { addEventListener() {}, removeEventListener() {} }, overlayCanvas: null,
    _resolveMediaPipeClasses() {}, _setupScene() {}, _sizeToVideoBox() {},
    _loadFaceAndMaterials: () => new Promise((resolve) => { finishMaterials = resolve; }),
    _setupFaceMesh() { faceSetupCalls += 1; },
    _setupCamera() { cameraSetupCalls += 1; },
    _syncFaceLayerVisibility() {},
    dispose() { disposeCalls += 1; this._ready = false; },
  });
  try {
    const pendingInit = engine.init();
    await Promise.resolve();
    assert.equal(typeof finishMaterials, 'function');
    engine.stop();
    finishMaterials();
    await assert.rejects(pendingInit, /Engine initialization was cancelled by a lifecycle change/);
    assert.equal(faceSetupCalls, 0);
    assert.equal(cameraSetupCalls, 0);
    assert.equal(disposeCalls, 1);
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});
