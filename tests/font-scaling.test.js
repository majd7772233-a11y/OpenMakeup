import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scaleFontDeclarations } from '../src/ui/font-scaling.js';

test('font scaling covers numeric dimensions, font shorthand, and clamp-based responsive sizes', () => {
  const css = '.body{font:14px/1.5 system-ui;line-height:1.5}.title{font-size:clamp(21px,5vw,28px)}.panel{width:280px}';
  const scaled = scaleFontDeclarations(css, 1.5);
  assert.ok(scaled.includes('font:21px/1.5 system-ui'));
  assert.ok(scaled.includes('font-size:clamp(31.5px,7.5vw,42px)'));
  assert.ok(scaled.includes('width:280px'));
  assert.equal(scaled, scaleFontDeclarations(css, 1.5));
});

test('default scale preserves source CSS exactly and invalid factors are rejected', () => {
  const css = '.a{font-size:13.3333px;font:14px/1.5 sans-serif}';
  assert.equal(scaleFontDeclarations(css, 1), css);
  assert.throws(() => scaleFontDeclarations(css, 0), /positive finite number/);
  assert.throws(() => scaleFontDeclarations(null, 2), /CSS source must be a string/);
});

test('the actual app stylesheet contains font-size declarations the old px-only matcher missed', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const start = html.indexOf('<style>');
  const end = html.indexOf('</style>', start);
  assert.ok(start >= 0 && end > start, 'inline stylesheet must exist');
  const css = html.slice(start + 7, end);
  assert.ok(css.includes('font-size:clamp('));
  const scaled = scaleFontDeclarations(css, 20 / 12);
  assert.notEqual(scaled, css);
  assert.ok(scaled.includes('font-size:clamp(35px,8.333vw,46.667px)'));
});
