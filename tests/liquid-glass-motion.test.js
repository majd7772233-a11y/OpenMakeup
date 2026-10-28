import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeLiquidGlassMotion } from '../src/ui/liquid-glass-motion.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const main = readFileSync(new URL('../main.js', import.meta.url), 'utf8');

function createMedia(matches) {
  const listeners = new Set();
  return {
    matches,
    addEventListener(_event, listener) { listeners.add(listener); },
    removeEventListener(_event, listener) { listeners.delete(listener); },
    emit() { for (const listener of listeners) listener({ matches: this.matches }); },
  };
}

function createTarget() {
  const listeners = new Map();
  const values = {};
  return {
    dataset: {},
    style: { values, setProperty(name, value) { values[name] = value; } },
    getBoundingClientRect() { return { left: 10, top: 20, width: 200, height: 100 }; },
    addEventListener(name, handler) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(handler);
    },
    removeEventListener(name, handler) { listeners.get(name)?.delete(handler); },
    dispatch(name, event = {}) {
      for (const handler of listeners.get(name) || []) handler(event);
    },
    listenerCount(name) { return (listeners.get(name) || new Set()).size; },
  };
}

function createHarness({ reduced = false, fine = true } = {}) {
  const target = createTarget();
  const reducedMedia = createMedia(reduced);
  const fineMedia = createMedia(fine);
  const root = {
    querySelectorAll(selector) {
      assert.equal(selector, '[data-glass-tilt], [data-workspace-panel]');
      return [target];
    },
  };
  const view = {
    matchMedia(query) {
      return query.includes('prefers-reduced-motion') ? reducedMedia : fineMedia;
    },
  };
  return { target, reducedMedia, fineMedia, teardown: initializeLiquidGlassMotion({ root, view }) };
}

test('Stage 9 adds layered rose-purple glass depth and bilingual workspace panel motion hooks', () => {
  assert.match(html, /<header class="topbar" data-glass-tilt>/);
  assert.match(html, /class="workspace-chip" aria-hidden="true" data-glass-tilt/);
  assert.match(html, /perspective\(1100px\)/);
  assert.match(html, /rotateX\(var\(--glass-rotate-x/);
  assert.match(html, /rotateY\(var\(--glass-rotate-y/);
  assert.match(html, /@keyframes glass-ambient-drift/);
  assert.match(html, /@keyframes glass-panel-enter/);
  assert.match(html, /--pink:#f071a7/);
  assert.match(html, /--purple:#9d76ff/);
  assert.match(html, /prefers-reduced-motion:reduce/);
  assert.match(main, /initializeLiquidGlassMotion\(\)/);
  assert.match(main, /targetPanel\.classList\.add\('glass-panel-enter'\)/);
});

test('fine pointer movement maps to bounded 3D tilt and a moving highlight, then resets on leave', () => {
  const { target, teardown } = createHarness();
  target.dispatch('pointermove', { pointerType: 'mouse', clientX: 160, clientY: 45 });
  assert.equal(target.dataset.glassTiltActive, 'true');
  assert.equal(target.style.values['--glass-rotate-x'], '2.25deg');
  assert.equal(target.style.values['--glass-rotate-y'], '2.75deg');
  assert.equal(target.style.values['--glass-light-x'], '75%');
  assert.equal(target.style.values['--glass-light-y'], '25%');

  target.dispatch('pointerleave');
  assert.equal(target.dataset.glassTiltActive, undefined);
  assert.equal(target.style.values['--glass-rotate-x'], '0deg');
  assert.equal(target.style.values['--glass-rotate-y'], '0deg');
  assert.equal(target.style.values['--glass-light-x'], '50%');
  teardown();
  assert.equal(target.listenerCount('pointermove'), 0);
});

test('touch input never tilts glass and reduced motion disables and resets active transforms', () => {
  const { target, reducedMedia, teardown } = createHarness();
  target.dispatch('pointermove', { pointerType: 'touch', clientX: 180, clientY: 60 });
  assert.equal(target.dataset.glassTiltActive, undefined);

  target.dispatch('pointermove', { pointerType: 'mouse', clientX: 180, clientY: 60 });
  assert.equal(target.dataset.glassTiltActive, 'true');
  reducedMedia.matches = true;
  reducedMedia.emit();
  assert.equal(target.dataset.glassTiltActive, undefined);
  assert.equal(target.style.values['--glass-rotate-x'], '0deg');
  target.dispatch('pointermove', { pointerType: 'mouse', clientX: 180, clientY: 60 });
  assert.equal(target.dataset.glassTiltActive, undefined);

  reducedMedia.matches = false;
  reducedMedia.emit();
  target.dispatch('pointermove', { pointerType: 'pen', clientX: 180, clientY: 60 });
  assert.equal(target.dataset.glassTiltActive, 'true');
  teardown();
  assert.equal(target.listenerCount('pointercancel'), 0);
});

test('unsupported motion environments fail closed without throwing', () => {
  assert.doesNotThrow(() => initializeLiquidGlassMotion({ root: null, view: null }));
  assert.doesNotThrow(() => initializeLiquidGlassMotion({ root: { querySelectorAll: () => [] }, view: { matchMedia: () => ({ matches: false }) } }));
});
