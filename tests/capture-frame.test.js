import test from 'node:test';
import assert from 'node:assert/strict';
import { rgbaPixelsTopOrigin, copyRgbaPixelsTopOriginMirrored, renderSceneToPngDataUrl, withSceneVisibilityForCapture, calculateCaptureSize } from '../src/core/capture-frame.js';

test('WebGL RGBA rows are flipped into top-origin image order without channel reordering', () => {
  // The first row returned by readRenderTargetPixels is the bottom image row.
  const bottomThenTop = Uint8Array.from([
    1, 2, 3, 4, 5, 6, 7, 8,
    9, 10, 11, 12, 13, 14, 15, 16,
  ]);
  assert.deepEqual([...rgbaPixelsTopOrigin(bottomThenTop, 2, 2)], [
    9, 10, 11, 12, 13, 14, 15, 16,
    1, 2, 3, 4, 5, 6, 7, 8,
  ]);
});

test('capture pixel conversion rejects malformed dimensions and incomplete RGBA data', () => {
  assert.throws(() => rgbaPixelsTopOrigin(new Uint8Array(3), 1, 1), /exactly width/);
  assert.throws(() => rgbaPixelsTopOrigin(new Uint8Array(4), 0, 1), /exactly width/);
});


test('original-mode capture hides effect objects, keeps the video plane, and restores visibility', () => {
  const scene = { visible: true };
  const plane = { visible: true };
  const effects = { visible: true };
  const nestedEffect = { visible: false };
  scene.traverse = (callback) => [scene, plane, effects, nestedEffect].forEach(callback);
  const engine = { scene, videoPlane: plane };

  const result = withSceneVisibilityForCapture(engine, 'original', () => {
    assert.equal(scene.visible, true);
    assert.equal(plane.visible, true);
    assert.equal(effects.visible, false);
    assert.equal(nestedEffect.visible, false);
    return 'rendered';
  });

  assert.equal(result, 'rendered');
  assert.equal(plane.visible, true);
  assert.equal(effects.visible, true);
  assert.equal(nestedEffect.visible, false);
});

test('makeup-mode capture leaves the scene untouched', () => {
  const scene = { visible: true };
  const plane = { visible: true };
  const effects = { visible: true };
  scene.traverse = (callback) => [scene, plane, effects].forEach(callback);
  const engine = { scene, videoPlane: plane };
  assert.equal(withSceneVisibilityForCapture(engine, 'makeup', () => effects.visible), true);
  assert.equal(plane.visible, true);
  assert.equal(effects.visible, true);
});


test('capture dimensions cap both the longest side and total pixel count', () => {
  const landscape = calculateCaptureSize(4000, 3000, 1920, 2500000);
  assert.ok(landscape.width <= 1920);
  assert.ok(landscape.height <= 1920);
  assert.ok(landscape.width * landscape.height <= 2500000);
  assert.ok(Math.abs(landscape.width / landscape.height - 4 / 3) < 0.002);

  const portrait = calculateCaptureSize(1080, 2400, 1920, 2500000);
  assert.ok(portrait.width <= 1920);
  assert.ok(portrait.height <= 1920);
  assert.ok(portrait.width * portrait.height <= 2500000);
});

test('capture dimension calculation rejects invalid sizes before allocation', () => {
  assert.throws(() => calculateCaptureSize(0, 10), /positive finite numbers/);
  assert.throws(() => calculateCaptureSize(Infinity, 10), /positive finite numbers/);
});


test('mirrored top-origin pixel copy combines vertical correction and horizontal mirroring in one destination', () => {
  const source = new Uint8Array([
    1, 2, 3, 4,       5, 6, 7, 8,       // WebGL bottom row
    9, 10, 11, 12,    13, 14, 15, 16,    // WebGL top row
  ]);
  const destination = new Uint8ClampedArray(16);
  assert.equal(copyRgbaPixelsTopOriginMirrored(source, 2, 2, destination), destination);
  assert.deepEqual([...destination], [
    13, 14, 15, 16,   9, 10, 11, 12,     // mirrored top row
    5, 6, 7, 8,       1, 2, 3, 4,        // mirrored bottom row
  ]);
  assert.throws(() => copyRgbaPixelsTopOriginMirrored(source, 2, 2, new Uint8Array(15)), /exactly width/);
});

test('capture encodes a mirrored still using a single canvas and the expected pixel order', () => {
  const sourcePixels = new Uint8Array([
    1, 2, 3, 4,       5, 6, 7, 8,
    9, 10, 11, 12,    13, 14, 15, 16,
  ]);
  let canvasCount = 0;
  let writtenPixels = null;
  const documentRef = {
    createElement(tag) {
      assert.equal(tag, 'canvas');
      canvasCount += 1;
      return {
        width: 0, height: 0,
        getContext(type) {
          assert.equal(type, '2d');
          return {
            createImageData(width, height) {
              return { data: new Uint8ClampedArray(width * height * 4) };
            },
            putImageData(data) { writtenPixels = [...data.data]; },
          };
        },
        toDataURL(type) {
          assert.equal(type, 'image/png');
          return 'data:image/png;base64,' + 'a'.repeat(1100);
        },
      };
    },
  };
  const renderer = {
    domElement: { width: 2, height: 2 },
    getContext: () => ({ isContextLost: () => false }),
    getRenderTarget: () => null,
    setRenderTarget() {},
    render() {},
    readRenderTargetPixels(_target, _x, _y, width, height, destination) {
      assert.equal(width, 2);
      assert.equal(height, 2);
      destination.set(sourcePixels);
    },
  };
  const result = renderSceneToPngDataUrl({ renderer, scene: {}, camera3D: {} }, documentRef, 2560);
  assert.equal(canvasCount, 1, 'capture should not allocate a second mirrored canvas');
  assert.deepEqual(writtenPixels, [
    13, 14, 15, 16,   9, 10, 11, 12,
    5, 6, 7, 8,       1, 2, 3, 4,
  ]);
  assert.equal(result.width, 2);
  assert.equal(result.height, 2);
});
