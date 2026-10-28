/**
 * Coalesce repeated synchronous writes during high-frequency UI interactions.
 * Call flush() on commit/background so the latest value is never left pending.
 */
export function createDebouncedCall(callback, delayMs = 180) {
  if (typeof callback !== 'function') throw new TypeError('A debounced callback is required.');
  const delay = Number.isFinite(delayMs) ? Math.max(0, delayMs) : 180;
  let timer = null;
  let pending = false;
  let latestArgs = [];

  function schedule(...args) {
    latestArgs = args;
    pending = true;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (!pending) return;
      pending = false;
      const argsToRun = latestArgs;
      latestArgs = [];
      callback(...argsToRun);
    }, delay);
  }

  function flush() {
    if (!pending) return undefined;
    if (timer !== null) clearTimeout(timer);
    timer = null;
    pending = false;
    const argsToRun = latestArgs;
    latestArgs = [];
    return callback(...argsToRun);
  }

  function cancel() {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    pending = false;
    latestArgs = [];
  }

  return {
    schedule,
    flush,
    cancel,
    get pending() { return pending; },
  };
}
