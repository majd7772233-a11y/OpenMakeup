const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  'summary',
  '[contenteditable="true"]',
  '[tabindex]'
].join(', ');

function isUnavailable(element, container) {
  let current = element;
  while (current) {
    if (current.hidden === true
      || current.hasAttribute?.('hidden')
      || current.hasAttribute?.('inert')
      || current.getAttribute?.('aria-hidden') === 'true') {
      return true;
    }

    const view = current.ownerDocument?.defaultView;
    if (view && typeof view.getComputedStyle === 'function') {
      const style = view.getComputedStyle(current);
      if (style && (style.display === 'none'
        || style.visibility === 'hidden'
        || style.visibility === 'collapse'
        || style.contentVisibility === 'hidden')) {
        return true;
      }
    }

    if (current === container) return false;
    current = current.parentElement;
  }
  return true;
}

/**
 * Return keyboard-tabbable descendants in their document order.
 * Hidden, disabled, inert and aria-hidden descendants are never included.
 */
export function getDialogFocusableElements(container) {
  if (!container || typeof container.querySelectorAll !== 'function') return [];
  return [...container.querySelectorAll(FOCUSABLE_SELECTOR)].filter((element) => {
    if (!element || element.disabled === true || isUnavailable(element, container)) return false;
    const tabIndex = element.getAttribute?.('tabindex');
    if (tabIndex !== null && tabIndex !== undefined && tabIndex.trim() !== '' && Number(tabIndex) < 0) return false;
    return true;
  });
}

/**
 * Keep Tab navigation inside an open dialog. Returns true only when the
 * function handled the key and moved focus or focused the dialog fallback.
 */
export function trapDialogFocus(event, container) {
  if (!event || event.key !== 'Tab' || !container || typeof container.querySelectorAll !== 'function') return false;

  const focusable = getDialogFocusableElements(container);
  if (focusable.length === 0) {
    event.preventDefault();
    if (typeof container.focus === 'function') container.focus();
    return true;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = container.ownerDocument?.activeElement ?? null;
  const activeInside = active === container
    || (typeof container.contains === 'function' && container.contains(active));
  const activeOutside = !activeInside;

  if (event.shiftKey && (active === first || active === container || activeOutside)) {
    event.preventDefault();
    last.focus();
    return true;
  }
  if (!event.shiftKey && (active === last || active === container || activeOutside)) {
    event.preventDefault();
    first.focus();
    return true;
  }
  return false;
}

/**
 * Calculate the next mobile workspace button index with wrapped, RTL-aware
 * horizontal arrows and the standard Home/End shortcuts.
 */
export function getWorkspaceTabTargetIndex(currentIndex, key, direction, count) {
  if (!Number.isInteger(count) || count < 1) return -1;
  const current = Number.isInteger(currentIndex) && currentIndex >= 0 && currentIndex < count
    ? currentIndex
    : 0;

  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;

  const rtlStep = direction === 'rtl' ? 1 : -1;
  if (key === 'ArrowLeft') return (current + rtlStep + count) % count;
  if (key === 'ArrowRight') return (current - rtlStep + count) % count;
  return null;
}
