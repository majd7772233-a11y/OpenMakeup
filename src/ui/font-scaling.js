/**
 * Scale authored typography declarations without touching layout dimensions.
 * Supports font-size (including clamp()) and numeric CSS font shorthand sizes.
 * A factor of 1 returns the source verbatim, preserving the designed default.
 */
export function scaleFontDeclarations(css, scale) {
  if (typeof css !== 'string') throw new TypeError('CSS source must be a string.');
  const factor = Number(scale);
  if (!Number.isFinite(factor) || factor <= 0) throw new RangeError('Font scale must be a positive finite number.');
  if (factor === 1) return css;

  const scaleDimensions = (value) => value.replace(
    /(-?(?:\d+(?:\.\d*)?|\.\d+))(px|rem|em|vw|vh|vmin|vmax|%)/gi,
    (_, rawNumber, unit) => `${Number((Number(rawNumber) * factor).toFixed(3))}${unit}`,
  );

  return css
    .replace(/font-size:([^;}]+)/gi, (declaration, value) => `font-size:${scaleDimensions(value)}`)
    .replace(/font:([^;}]+)/gi, (declaration, value) => `font:${scaleDimensions(value)}`);
}
