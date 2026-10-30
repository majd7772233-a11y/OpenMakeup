import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  getDialogFocusableElements,
  getWorkspaceTabTargetIndex,
  trapDialogFocus,
} from '../src/ui/accessibility.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function createDialog(specs = []) {
  const document = {
    activeElement: null,
    defaultView: {
      getComputedStyle(element) {
        return element.style || { display: 'block', visibility: 'visible' };
      },
    },
  };
  const dialog = makeElement(document, null, {
    attributes: { tabindex: '-1', 'aria-hidden': 'false' },
  });
  dialog.focus = () => {
    document.activeElement = dialog;
    dialog.focusCalls += 1;
  };
  const elements = specs.map((spec) => {
    const parent = spec.parent === 'hidden'
      ? makeElement(document, dialog, { attributes: { hidden: '' } })
      : spec.parent === 'aria-hidden'
        ? makeElement(document, dialog, { attributes: { 'aria-hidden': 'true' } })
        : spec.parent === 'inert'
          ? makeElement(document, dialog, { attributes: { inert: '' } })
          : dialog;
    const element = makeElement(document, parent, spec);
    return element;
  });
  dialog.querySelectorAll = (selector) => {
    dialog.lastSelector = selector;
    return elements;
  };
  dialog.contains = (target) => {
    let current = target;
    while (current) {
      if (current === dialog) return true;
      current = current.parentElement;
    }
    return false;
  };
  return { document, dialog, elements };
}

function makeElement(document, parent, spec = {}) {
  const attributes = new Map(Object.entries(spec.attributes || {}));
  const element = {
    ownerDocument: document,
    parentElement: parent,
    style: spec.style || { display: 'block', visibility: 'visible' },
    hidden: spec.hidden === true,
    disabled: spec.disabled === true,
    focusCalls: 0,
    hasAttribute(name) {
      return attributes.has(name);
    },
    getAttribute(name) {
      return attributes.has(name) ? attributes.get(name) : null;
    },
    focus() {
      document.activeElement = element;
      element.focusCalls += 1;
    },
  };
  return element;
}

function keyEvent(key = 'Tab', shiftKey = false) {
  return {
    key,
    shiftKey,
    prevented: false,
    preventDefault() {
      this.prevented = true;
    },
  };
}

test('dialog focus candidates cover native controls and custom keyboard-focusable elements', () => {
  const { dialog, elements } = createDialog([
    {}, // button
    {}, // anchor
    {}, // input
    {}, // select
    {}, // textarea
    {}, // summary
    { attributes: { tabindex: '0' } },
  ]);
  const focusable = getDialogFocusableElements(dialog);
  assert.deepEqual(focusable, elements);
  assert.match(dialog.lastSelector, /select/);
  assert.match(dialog.lastSelector, /textarea/);
  assert.match(dialog.lastSelector, /summary/);
});

test('dialog focus candidates exclude disabled, hidden, inert and negative-tabindex descendants', () => {
  const { dialog, elements } = createDialog([
    {},
    { disabled: true },
    { hidden: true },
    { attributes: { hidden: '' } },
    { attributes: { 'aria-hidden': 'true' } },
    { parent: 'hidden' },
    { parent: 'aria-hidden' },
    { parent: 'inert' },
    { style: { display: 'none', visibility: 'visible' } },
    { style: { display: 'block', visibility: 'hidden' } },
    { attributes: { tabindex: '-1' } },
  ]);
  assert.deepEqual(getDialogFocusableElements(dialog), [elements[0]]);
});

test('dialog focus candidates exclude descendants of a CSS-hidden ancestor', () => {
  const { dialog, elements } = createDialog([{ parent: 'normal' }]);
  const hiddenParent = makeElement(dialog.ownerDocument, dialog, {
    style: { display: 'none', visibility: 'visible' },
  });
  elements[0].parentElement = hiddenParent;
  assert.deepEqual(getDialogFocusableElements(dialog), []);
});

test('Tab from the last candidate wraps to the first candidate', () => {
  const { document, dialog, elements } = createDialog([{}, {}, {}]);
  document.activeElement = elements[2];
  const event = keyEvent();
  assert.equal(trapDialogFocus(event, dialog), true);
  assert.equal(event.prevented, true);
  assert.equal(document.activeElement, elements[0]);
});

test('Shift+Tab from the first candidate wraps to the last candidate', () => {
  const { document, dialog, elements } = createDialog([{}, {}, {}]);
  document.activeElement = elements[0];
  const event = keyEvent('Tab', true);
  assert.equal(trapDialogFocus(event, dialog), true);
  assert.equal(event.prevented, true);
  assert.equal(document.activeElement, elements[2]);
});

test('focus restored to the dialog container enters its first or last candidate', () => {
  const forward = createDialog([{}, {}]);
  forward.document.activeElement = forward.dialog;
  const forwardEvent = keyEvent();
  assert.equal(trapDialogFocus(forwardEvent, forward.dialog), true);
  assert.equal(forward.document.activeElement, forward.elements[0]);

  const backward = createDialog([{}, {}]);
  backward.document.activeElement = backward.dialog;
  const backwardEvent = keyEvent('Tab', true);
  assert.equal(trapDialogFocus(backwardEvent, backward.dialog), true);
  assert.equal(backward.document.activeElement, backward.elements[1]);
});

test('focus moved outside an open dialog is redirected back in both directions', () => {
  const forward = createDialog([{}, {}]);
  const outsideForward = makeElement(forward.document, null);
  forward.document.activeElement = outsideForward;
  assert.equal(trapDialogFocus(keyEvent(), forward.dialog), true);
  assert.equal(forward.document.activeElement, forward.elements[0]);

  const backward = createDialog([{}, {}]);
  const outsideBackward = makeElement(backward.document, null);
  backward.document.activeElement = outsideBackward;
  assert.equal(trapDialogFocus(keyEvent('Tab', true), backward.dialog), true);
  assert.equal(backward.document.activeElement, backward.elements[1]);
});

test('a dialog with no focusable descendants receives focus instead of leaking Tab', () => {
  const { document, dialog } = createDialog([]);
  const event = keyEvent();
  assert.equal(trapDialogFocus(event, dialog), true);
  assert.equal(event.prevented, true);
  assert.equal(document.activeElement, dialog);
  assert.equal(dialog.focusCalls, 1);
});

test('Tab inside the middle of a dialog is left to the browser native order', () => {
  const { document, dialog, elements } = createDialog([{}, {}, {}]);
  document.activeElement = elements[1];
  const event = keyEvent();
  assert.equal(trapDialogFocus(event, dialog), false);
  assert.equal(event.prevented, false);
  assert.equal(document.activeElement, elements[1]);
});

test('non-Tab keyboard events are never intercepted by the dialog focus helper', () => {
  const { document, dialog, elements } = createDialog([{}, {}]);
  document.activeElement = elements[0];
  const event = keyEvent('Escape');
  assert.equal(trapDialogFocus(event, dialog), false);
  assert.equal(event.prevented, false);
});

test('workspace navigation uses wrapped right/left arrows in LTR documents', () => {
  assert.equal(getWorkspaceTabTargetIndex(1, 'ArrowRight', 'ltr', 4), 2);
  assert.equal(getWorkspaceTabTargetIndex(0, 'ArrowLeft', 'ltr', 4), 3);
  assert.equal(getWorkspaceTabTargetIndex(3, 'ArrowRight', 'ltr', 4), 0);
});

test('workspace navigation reverses horizontal arrows for RTL documents', () => {
  assert.equal(getWorkspaceTabTargetIndex(1, 'ArrowLeft', 'rtl', 4), 2);
  assert.equal(getWorkspaceTabTargetIndex(0, 'ArrowRight', 'rtl', 4), 3);
  assert.equal(getWorkspaceTabTargetIndex(3, 'ArrowLeft', 'rtl', 4), 0);
});

test('workspace Home and End keys select first and last controls', () => {
  assert.equal(getWorkspaceTabTargetIndex(2, 'Home', 'rtl', 4), 0);
  assert.equal(getWorkspaceTabTargetIndex(0, 'End', 'ltr', 4), 3);
});

test('workspace navigation ignores unrelated keys and handles invalid counts safely', () => {
  assert.equal(getWorkspaceTabTargetIndex(2, 'Enter', 'rtl', 4), null);
  assert.equal(getWorkspaceTabTargetIndex(0, 'ArrowLeft', 'rtl', 0), -1);
});
