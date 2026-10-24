import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const cameraSource = readFileSync(new URL('../public/mediapipe/camera_utils/camera_utils.js', import.meta.url), 'utf8');

function createHarness(overrides = {}) {
  const frameCallbacks = new Map();
  let nextHandle = 1;
  let requestedConstraints = null;
  let tracksStopped = 0;
  let getUserMediaCalls = 0;
  const track = { stop() { tracksStopped += 1; } };
  const stream = {
    getTracks: () => [track],
    getVideoTracks: () => [track],
  };
  const video = {
    srcObject: null,
    muted: false,
    autoplay: false,
    readyState: 4,
    videoWidth: 640,
    videoHeight: 480,
    currentTime: 0,
    attributes: {},
    setAttribute(name, value) { this.attributes[name] = value; },
    async play() {},
    pause() {},
    requestVideoFrameCallback(callback) {
      const id = nextHandle++;
      frameCallbacks.set(id, callback);
      return id;
    },
    cancelVideoFrameCallback(id) { frameCallbacks.delete(id); },
  };
  const window = {
    navigator: {
      mediaDevices: {
        async getUserMedia(constraints) {
          getUserMediaCalls += 1;
          requestedConstraints = constraints;
          if (overrides.getUserMedia) return overrides.getUserMedia(constraints, stream);
          return stream;
        },
      },
    },
    console: { error() {} },
    setTimeout,
    requestAnimationFrame(callback) {
      const id = nextHandle++;
      frameCallbacks.set(id, callback);
      return id;
    },
    cancelAnimationFrame(id) { frameCallbacks.delete(id); },
  };
  runInNewContext(cameraSource, { window });
  return {
    Camera: window.Camera,
    video,
    stream,
    frameCallbacks,
    requested: () => requestedConstraints,
    stopped: () => tracksStopped,
    calls: () => getUserMediaCalls,
    window,
  };
}

async function drainMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
}

test('local camera utility exposes Camera and requests the selected lens with bounded ideal dimensions', async () => {
  const h = createHarness();
  const camera = new h.Camera(h.video, {
    width: 640, height: 480, facingMode: 'environment', onFrame: async () => {},
  });
  await camera.start();
  assert.equal(typeof h.Camera, 'function');
  assert.equal(h.requested().audio, false);
  assert.equal(h.requested().video.facingMode.ideal, 'environment');
  assert.equal(h.requested().video.width.ideal, 640);
  assert.equal(h.requested().video.height.ideal, 480);
  assert.equal(h.video.srcObject, h.stream);
  assert.equal(h.video.attributes.playsinline, '');
  camera.stop();
});

test('local camera utility processes fresh video frames without overlapping callbacks', async () => {
  const h = createHarness();
  let frames = 0;
  let releaseFrame;
  const camera = new h.Camera(h.video, {
    onFrame: async () => {
      frames += 1;
      if (releaseFrame) await new Promise((resolve) => { releaseFrame = resolve; });
    },
  });
  await camera.start();
  h.video.currentTime = 1;
  const first = h.frameCallbacks.entries().next().value;
  h.frameCallbacks.delete(first[0]);
  first[1](0, { mediaTime: 1 });
  await drainMicrotasks();
  assert.equal(frames, 1);
  const second = h.frameCallbacks.entries().next().value;
  h.frameCallbacks.delete(second[0]);
  second[1](0, { mediaTime: 1 });
  await drainMicrotasks();
  assert.equal(frames, 1, 'same frame timestamp must not be submitted twice');
  h.video.currentTime = 2;
  const third = h.frameCallbacks.entries().next().value;
  h.frameCallbacks.delete(third[0]);
  third[1](0, { mediaTime: 2 });
  await drainMicrotasks();
  assert.equal(frames, 2);
  camera.stop();
});

test('stop cancels frame scheduling, stops tracks and detaches the active stream', async () => {
  const h = createHarness();
  const camera = new h.Camera(h.video, { onFrame: async () => {} });
  await camera.start();
  assert.equal(h.frameCallbacks.size, 1);
  camera.stop();
  assert.equal(camera.running, false);
  assert.equal(h.frameCallbacks.size, 0);
  assert.equal(h.stopped(), 1);
  assert.equal(h.video.srcObject, null);
  assert.equal(h.calls(), 1);
});

test('late camera permission completion after stop cannot resurrect a stream', async () => {
  let resolveStream;
  const h = createHarness({
    getUserMedia: () => new Promise((resolve) => { resolveStream = resolve; }),
  });
  const camera = new h.Camera(h.video, { onFrame: async () => {} });
  const pendingStart = camera.start();
  camera.stop();
  resolveStream(h.stream);
  await assert.rejects(pendingStart, /cancelled by a lifecycle change/i);
  assert.equal(camera.running, false);
  assert.equal(h.video.srcObject, null);
  assert.equal(h.stopped(), 1);
});

test('camera utility gives an actionable error when the WebView has no camera capture API', async () => {
  const h = createHarness();
  h.window.navigator.mediaDevices = {};
  const camera = new h.Camera(h.video, {});
  await assert.rejects(camera.start(), /does not expose camera capture/i);
});
