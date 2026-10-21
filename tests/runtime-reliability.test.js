import test from 'node:test';
import assert from 'node:assert/strict';
import { OpenMakeup } from '../src/OpenMakeup.js';
import { hasLiveCameraTrack, waitForCameraFrames } from '../src/core/cameraReadiness.js';

function makeVideo({ trackState = 'live', enabled = true, currentTime = 0, readyState = 2 } = {}) {
  return { currentTime, readyState, srcObject: {
    getVideoTracks: () => [{ readyState: trackState, enabled }],
    getTracks: () => [{ stop() {} }],
  } };
}

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
