function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

/**
 * Conservative defaults for low-memory/mobile devices, with a bounded balanced
 * profile elsewhere. Runtime signals are hints: camera and GPU recovery are
 * still required because browsers may hide hardware details.
 */
export function resolvePerformanceProfile(environment = {}) {
  const devicePixelRatio = positiveNumber(environment.devicePixelRatio) || 1;
  const hardwareConcurrency = positiveNumber(environment.hardwareConcurrency);
  const deviceMemory = positiveNumber(environment.deviceMemory);
  const constrained = (hardwareConcurrency !== null && hardwareConcurrency <= 4)
    || (deviceMemory !== null && deviceMemory <= 4);

  return Object.freeze({
    tier: constrained ? 'conservative' : 'balanced',
    camera: Object.freeze(constrained
      ? { width: 640, height: 480 }
      : { width: 960, height: 540 }),
    maxPixelRatio: constrained ? 1 : Math.min(devicePixelRatio, 1.5),
    antialias: !constrained,
  });
}
