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
  engine.stop();
  finishStart();

  await assert.rejects(pendingStart, /Camera could not start: Camera startup was cancelled/);
  assert.equal(engine._cameraRunning, false);
  assert.ok(stopCalls >= 2);
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

test('SDK apply propagates pattern-loading errors instead of swallowing them', async () => {
  const sdk = new OpenMakeup({ video: {}, renderCanvas: {} });
  sdk._ready = true;
  sdk._patterns.eyeshadow = [{ id: '6309', bundled: true }];
  sdk.engine.setPattern = async () => { throw new Error('pattern texture missing'); };
  sdk.engine.setAR = () => { throw new Error('must not activate before pattern loads'); };
  await assert.rejects(sdk.apply('eyeshadow', { pattern: 1 }), /pattern texture missing/);
});
