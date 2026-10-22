import test from 'node:test';
import assert from 'node:assert/strict';
import { rgbaPixelsTopOrigin } from '../src/core/capture-frame.js';

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
