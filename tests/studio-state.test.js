import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStudioState, emptyStudioState, StudioHistory, createCustomLook, parseCustomLooks,
  STUDIO_STATE_VERSION, CUSTOM_LOOKS_VERSION } from '../src/ui/studio-state.js';

test('legacy sessions migrate into a versioned and defensively normalized schema', () => {
  const state = normalizeStudioState(JSON.stringify({
    makeup: { lipstick: { color: '#A12', finish: 'glossy', intensity: 0.42 },
      unknownLayer: { color: '#000000' }, foundation: { color: 'bad', intensity: 9 },
      mascara: { pattern: 1, finish: 'glitter' } },
    morphs: { noseSlim: 0.4, bogus: 1, jawWide: 50, cheeks: Infinity }, wireframe: true, blur: false, activeLook: 'rose',
  }));
  assert.equal(state.schemaVersion, STUDIO_STATE_VERSION);
  assert.deepEqual(state.makeup.lipstick, { color: '#aa1122', intensity: 0.42, finish: 'glossy' });
  assert.deepEqual(state.makeup.foundation, { color: '#d9b89c', intensity: 1, finish: 'matte' });
  assert.deepEqual(state.makeup.mascara, { color: '#000000', intensity: 1 });
  assert.deepEqual(state.morphs, { noseSlim: 0.4 });
  assert.equal(state.wireframe, true);
});
test('invalid JSON and missing values fall back safely; unknown future schemas are rejected', () => {
  assert.deepEqual(normalizeStudioState('{broken'), emptyStudioState());
  assert.deepEqual(normalizeStudioState(null), emptyStudioState());
  assert.throws(() => normalizeStudioState({ schemaVersion: 2 }), /Unsupported.*version/);
});
test('history supports ordered undo/redo, truncates redo after a new branch, and honors its limit', () => {
  const first = emptyStudioState();
  const second = normalizeStudioState({ ...first, makeup: { blush: { color: '#d45b70', intensity: 0.6 } } });
  const third = normalizeStudioState({ ...second, morphs: { noseSlim: 0.3 } });
  const history = new StudioHistory(2);
  assert.equal(history.record(first, second), true);
  assert.equal(history.record(second, third), true);
  assert.deepEqual(history.undo(), second);
  assert.deepEqual(history.redo(), third);
  assert.deepEqual(history.undo(), second);
  assert.equal(history.record(second, first), true);
  assert.equal(history.canRedo, false);
  history.record(first, second); history.record(second, third); history.record(third, first);
  assert.equal(history.entries.length, 2);
});
test('history keeps defensive copies and ignores no-op transitions', () => {
  const first = emptyStudioState(), history = new StudioHistory();
  assert.equal(history.record(first, first), false);
  const next = normalizeStudioState({ ...first, wireframe: true });
  history.record(first, next); next.wireframe = false;
  assert.equal(history.undo().wireframe, false);
});
test('custom looks validate names, normalize snapshots, and ignore duplicate/corrupt records', () => {
  const state = normalizeStudioState({ makeup: { blush: { color: '#f06', intensity: 0.75 } }, morphs: { cheeks: 0.2 } });
  assert.throws(() => createCustomLook(' ', state), /needs a name/);
  assert.throws(() => createCustomLook('x'.repeat(41), state), /too long/);
  const look = createCustomLook(' Rose   Evening ', state, 'rose-evening', 123);
  assert.equal(look.name, 'Rose Evening');
  assert.deepEqual(look.state.makeup.blush, { color: '#ff0066', intensity: 0.75, finish: 'matte' });
  assert.equal(parseCustomLooks({ version: CUSTOM_LOOKS_VERSION, looks: [look, look, { id: 'bad', name: '', state }] }).length, 1);
  assert.deepEqual(parseCustomLooks({ version: 99, looks: [look] }), []);
});