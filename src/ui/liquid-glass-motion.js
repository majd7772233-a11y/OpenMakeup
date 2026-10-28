/**
 * Pointer-driven Liquid Glass depth for fine-pointer devices.
 * Touch input is never interpreted as tilt; reduced-motion preferences reset
 * transforms immediately. No sensors, external assets, timers, or GPU canvas
 * are added by this module.
 */
export function initializeLiquidGlassMotion({ root = globalThis.document, view = globalThis.window } = {}) {
  if (!root || typeof root.querySelectorAll !== 'function' || !view || typeof view.matchMedia !== 'function') {
    return () => {};
  }

  let reducedMotion;
  let finePointer;
  try {
    reducedMotion = view.matchMedia('(prefers-reduced-motion: reduce)');
    finePointer = view.matchMedia('(hover: hover) and (pointer: fine)');
  } catch (_) {
    return () => {};
  }
  const targets = [...root.querySelectorAll('[data-glass-tilt], [data-workspace-panel]')];
  if (!targets.length) return () => {};

  const isEnabled = () => !reducedMotion.matches && finePointer.matches;
  let enabled = isEnabled();

  const setProperty = (target, name, value) => {
    if (target.style && typeof target.style.setProperty === 'function') target.style.setProperty(name, value);
  };

  const resetTarget = (target) => {
    setProperty(target, '--glass-rotate-x', '0deg');
    setProperty(target, '--glass-rotate-y', '0deg');
    setProperty(target, '--glass-light-x', '50%');
    setProperty(target, '--glass-light-y', '50%');
    if (target.dataset) delete target.dataset.glassTiltActive;
  };

  const resetAll = () => targets.forEach(resetTarget);

  const handlers = targets.map((target) => {
    const onPointerMove = (event) => {
      if (!enabled || (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen')) return;
      if (typeof target.getBoundingClientRect !== 'function') return;
      const rect = target.getBoundingClientRect();
      if (!(rect.width > 0) || !(rect.height > 0)) return;
      const clamp = (value) => Math.max(-1, Math.min(1, value));
      const x = clamp(((event.clientX - rect.left) / rect.width - 0.5) * 2);
      const y = clamp(((event.clientY - rect.top) / rect.height - 0.5) * 2);
      const rotateX = Math.round(-y * 4.5 * 100) / 100;
      const rotateY = Math.round(x * 5.5 * 100) / 100;
      setProperty(target, '--glass-rotate-x', rotateX + 'deg');
      setProperty(target, '--glass-rotate-y', rotateY + 'deg');
      setProperty(target, '--glass-light-x', Math.round((x + 1) * 50) + '%');
      setProperty(target, '--glass-light-y', Math.round((y + 1) * 50) + '%');
      if (target.dataset) target.dataset.glassTiltActive = 'true';
    };
    const onPointerLeave = () => resetTarget(target);
    target.addEventListener('pointermove', onPointerMove, { passive: true });
    target.addEventListener('pointerleave', onPointerLeave, { passive: true });
    target.addEventListener('pointercancel', onPointerLeave, { passive: true });
    return { target, onPointerMove, onPointerLeave };
  });

  const onPreferenceChange = () => {
    enabled = isEnabled();
    if (!enabled) resetAll();
  };
  const subscribe = (media) => {
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', onPreferenceChange);
      return () => media.removeEventListener('change', onPreferenceChange);
    }
    if (typeof media.addListener === 'function') {
      media.addListener(onPreferenceChange);
      return () => media.removeListener(onPreferenceChange);
    }
    return () => {};
  };
  const unsubscribeMedia = [subscribe(reducedMotion), subscribe(finePointer)];

  return () => {
    unsubscribeMedia.forEach((unsubscribe) => unsubscribe());
    handlers.forEach(({ target, onPointerMove, onPointerLeave }) => {
      target.removeEventListener('pointermove', onPointerMove);
      target.removeEventListener('pointerleave', onPointerLeave);
      target.removeEventListener('pointercancel', onPointerLeave);
      resetTarget(target);
    });
  };
}
