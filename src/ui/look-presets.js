export const LOOK_PRESET_GROUPS = [
  { id: 'daily', labelKey: 'presetGroupDaily' },
  { id: 'romantic', labelKey: 'presetGroupRomantic' },
  { id: 'statement', labelKey: 'presetGroupStatement' },
  { id: 'evening', labelKey: 'presetGroupEvening' },
];

export const LOOK_PRESETS = [
  { id: 'nude-day', group: 'daily', labelKey: 'presetNudeDay', accent: '#bd927b', layers: {
    foundation: { color: '#d9b89c', finish: 'matte', intensity: 0.25 },
    lipstick: { color: '#bd927b', finish: 'glossy', intensity: 0.52 },
    blush: { color: '#d4a18d', finish: 'matte', intensity: 0.40 },
    eyeshadow: { color: '#927d9b', finish: 'shimmer', pattern: 1, intensity: 0.28 },
  }},
  { id: 'peach-glow', group: 'daily', labelKey: 'presetPeachGlow', accent: '#e7a07e', layers: {
    foundation: { color: '#d9b89c', finish: 'matte', intensity: 0.22 },
    lipstick: { color: '#d67c63', finish: 'glossy', intensity: 0.58 },
    blush: { color: '#ec9478', finish: 'shimmer', intensity: 0.55 },
    eyeshadow: { color: '#c98c66', finish: 'shimmer', pattern: 1, intensity: 0.32 },
  }},
  { id: 'soft-rose', group: 'daily', labelKey: 'presetSoftRose', accent: '#dc7898', layers: {
    lipstick: { color: '#d46d8e', finish: 'glossy', intensity: 0.54 },
    blush: { color: '#df7f9b', finish: 'matte', intensity: 0.42 },
    eyeshadow: { color: '#a86e9a', finish: 'shimmer', pattern: 1, intensity: 0.38 },
    mascara: { color: '#17101e', pattern: 1, intensity: 0.54 },
  }},
  { id: 'rose-classic', group: 'romantic', labelKey: 'presetRoseClassic', accent: '#e76c91', layers: {
    lipstick: { color: '#c94370', finish: 'glossy', intensity: 0.76 },
    blush: { color: '#e88a9d', finish: 'matte', intensity: 0.57 },
    eyeshadow: { color: '#a55a98', finish: 'glitter', pattern: 2, intensity: 0.46 },
    eyeline: { color: '#281324', pattern: 1, intensity: 0.45 },
  }},
  { id: 'mauve-dream', group: 'romantic', labelKey: 'presetMauveDream', accent: '#a675a4', layers: {
    lipstick: { color: '#9d557d', finish: 'glossy', intensity: 0.67 },
    blush: { color: '#c17b9d', finish: 'shimmer', intensity: 0.42 },
    eyeshadow: { color: '#8d6098', finish: 'glitter', pattern: 3, intensity: 0.55 },
    mascara: { color: '#140f1b', pattern: 2, intensity: 0.62 },
  }},
  { id: 'pink-blossom', group: 'romantic', labelKey: 'presetPinkBlossom', accent: '#f09dbd', layers: {
    lipstick: { color: '#e880a7', finish: 'glossy', intensity: 0.63 },
    blush: { color: '#f09bb3', finish: 'matte', intensity: 0.50 },
    eyeshadow: { color: '#c07db6', finish: 'shimmer', pattern: 4, intensity: 0.42 },
    foundation: { color: '#e2c3ad', finish: 'matte', intensity: 0.20 },
  }},
  { id: 'berry-bold', group: 'statement', labelKey: 'presetBerryBold', accent: '#9c315f', layers: {
    lipstick: { color: '#9c315f', finish: 'glossy', intensity: 0.88 },
    blush: { color: '#b84e76', finish: 'matte', intensity: 0.63 },
    eyeshadow: { color: '#633b87', finish: 'glitter', pattern: 5, intensity: 0.60 },
    eyeline: { color: '#160d20', pattern: 2, intensity: 0.62 },
  }},
  { id: 'ruby-night', group: 'statement', labelKey: 'presetRubyNight', accent: '#b72f50', layers: {
    lipstick: { color: '#b72f50', finish: 'glossy', intensity: 0.92 },
    blush: { color: '#a83d61', finish: 'matte', intensity: 0.48 },
    eyeshadow: { color: '#5e335f', finish: 'glitter', pattern: 6, intensity: 0.58 },
    eyeline: { color: '#120b17', pattern: 3, intensity: 0.70 },
    mascara: { color: '#110d15', pattern: 2, intensity: 0.66 },
  }},
  { id: 'plum-smoke', group: 'statement', labelKey: 'presetPlumSmoke', accent: '#704a83', layers: {
    lipstick: { color: '#87456d', finish: 'glossy', intensity: 0.72 },
    blush: { color: '#a5638c', finish: 'shimmer', intensity: 0.35 },
    eyeshadow: { color: '#4b315f', finish: 'glitter', pattern: 7, intensity: 0.74 },
    eyeline: { color: '#130c1b', pattern: 4, intensity: 0.75 },
    mascara: { color: '#100d16', pattern: 3, intensity: 0.70 },
  }},
  { id: 'bronze-evening', group: 'evening', labelKey: 'presetBronzeEvening', accent: '#b57b4e', layers: {
    foundation: { color: '#d9b89c', finish: 'matte', intensity: 0.30 },
    lipstick: { color: '#a65c4d', finish: 'glossy', intensity: 0.68 },
    blush: { color: '#c87865', finish: 'shimmer', intensity: 0.50 },
    eyeshadow: { color: '#97633e', finish: 'glitter', pattern: 8, intensity: 0.61 },
    mascara: { color: '#1b1110', pattern: 1, intensity: 0.65 },
  }},
  { id: 'golden-hour', group: 'evening', labelKey: 'presetGoldenHour', accent: '#d7a34b', layers: {
    lipstick: { color: '#c9825e', finish: 'glossy', intensity: 0.64 },
    blush: { color: '#e19a6c', finish: 'shimmer', intensity: 0.58 },
    eyeshadow: { color: '#c79246', finish: 'glitter', pattern: 9, intensity: 0.70 },
    eyeline: { color: '#342014', pattern: 5, intensity: 0.54 },
  }},
  { id: 'midnight', group: 'evening', labelKey: 'presetMidnight', accent: '#554080', layers: {
    lipstick: { color: '#75406e', finish: 'glossy', intensity: 0.75 },
    blush: { color: '#89577e', finish: 'matte', intensity: 0.40 },
    eyeshadow: { color: '#41305f', finish: 'glitter', pattern: 10, intensity: 0.82 },
    eyeline: { color: '#0e0b14', pattern: 6, intensity: 0.80 },
    mascara: { color: '#0b0a10', pattern: 4, intensity: 0.78 },
  }},
];
