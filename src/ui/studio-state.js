import { CATEGORIES, resolveCategory } from '../categories.js';
import { MORPH_CONTROLS, MORPH_WEIGHT_MIN, MORPH_WEIGHT_MAX } from '../morphs.js';

export const STUDIO_STATE_VERSION = 1;
export const CUSTOM_LOOKS_VERSION = 1;
export const CUSTOM_LOOKS_LIMIT = 100;
export const CUSTOM_LOOK_NAME_LIMIT = 40;
const PATTERN_CATEGORIES = new Set(['blush', 'eyeshadow', 'eyeline', 'mascara']);
const FINISHES = new Set(['matte', 'shimmer', 'glossy', 'glitter']);
const MORPH_NAMES = new Set(Object.keys(MORPH_CONTROLS || {}));

export function emptyStudioState() {
  return { schemaVersion: STUDIO_STATE_VERSION, makeup: {}, morphs: {}, activeLook: null, wireframe: false, blur: false };
}
function safeClone(value) { return JSON.parse(JSON.stringify(value)); }
function normalizedColor(value) {
  if (typeof value !== 'string') return null;
  let color = value.trim().replace(/^#/, '');
  if (/^[\da-f]{3}$/i.test(color)) color = color.split('').map((part) => part + part).join('');
  return /^[\da-f]{6}$/i.test(color) ? '#' + color.toLowerCase() : null;
}
function normalizeLayerOptions(category, raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const config = CATEGORIES[category], result = {};
  const color = normalizedColor(raw.color);
  if (color) result.color = color;
  else if (typeof config.defaults.color === 'string' && normalizedColor(config.defaults.color)) result.color = normalizedColor(config.defaults.color);
  else if (category === 'lipstick') result.color = '#b4002e';
  const intensity = raw.intensity == null ? 1 : Number(raw.intensity);
  result.intensity = Number.isFinite(intensity) && intensity >= 0 && intensity <= 1 ? intensity : 1;
  if (config.supportsFinish) result.finish = FINISHES.has(raw.finish) ? raw.finish : config.defaults.finish;
  if (PATTERN_CATEGORIES.has(category)) {
    if ((Number.isInteger(raw.pattern) && raw.pattern >= 1) || (typeof raw.pattern === 'string' && /^\d+$/.test(raw.pattern))) result.pattern = raw.pattern;
    if (raw.patternId != null && /^\d+$/.test(String(raw.patternId))) result.patternId = String(raw.patternId);
  }
  return result;
}

/** Migrate the pre-v1 session shape, while rejecting unknown future versions. */
export function normalizeStudioState(input) {
  let parsed = input;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch (_) { return emptyStudioState(); }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return emptyStudioState();
  const version = parsed.schemaVersion ?? parsed.version;
  if (version != null && version !== STUDIO_STATE_VERSION) throw new Error('Unsupported Open Makeup studio-state schema version: ' + version);
  const makeup = {};
  if (parsed.makeup && typeof parsed.makeup === 'object' && !Array.isArray(parsed.makeup)) {
    for (const [key, rawOptions] of Object.entries(parsed.makeup)) {
      const category = resolveCategory(key);
      const options = category ? normalizeLayerOptions(category, rawOptions) : null;
      if (category && options) makeup[category] = options;
    }
  }
  const morphs = {};
  if (parsed.morphs && typeof parsed.morphs === 'object' && !Array.isArray(parsed.morphs)) {
    for (const [name, raw] of Object.entries(parsed.morphs)) {
      const value = Number(raw);
      if (MORPH_NAMES.has(name) && Number.isFinite(value) && value >= MORPH_WEIGHT_MIN && value <= MORPH_WEIGHT_MAX) morphs[name] = value;
    }
  }
  return {
    schemaVersion: STUDIO_STATE_VERSION, makeup, morphs,
    activeLook: typeof parsed.activeLook === 'string' && parsed.activeLook.length <= 80 ? parsed.activeLook : null,
    wireframe: parsed.wireframe === true, blur: parsed.blur === true,
  };
}

export class StudioHistory {
  constructor(limit = 50) {
    this.limit = Math.max(1, Math.floor(Number(limit) || 50));
    this.entries = [];
    this.cursor = 0;
  }
  get canUndo() { return this.cursor > 0; }
  get canRedo() { return this.cursor < this.entries.length; }
  record(before, after) {
    const previous = normalizeStudioState(before), next = normalizeStudioState(after);
    if (JSON.stringify(previous) === JSON.stringify(next)) return false;
    this.entries.splice(this.cursor);
    this.entries.push({ before: safeClone(previous), after: safeClone(next) });
    if (this.entries.length > this.limit) this.entries.shift();
    this.cursor = this.entries.length;
    return true;
  }
  undo() {
    if (!this.canUndo) return null;
    this.cursor -= 1;
    return safeClone(this.entries[this.cursor].before);
  }
  redo() {
    if (!this.canRedo) return null;
    const state = safeClone(this.entries[this.cursor].after);
    this.cursor += 1;
    return state;
  }
  clear() { this.entries = []; this.cursor = 0; }
}

export function createCustomLook(name, state, id = null, updatedAt = Date.now()) {
  const cleanName = String(name == null ? '' : name).trim().replace(/\s+/g, ' ');
  if (!cleanName) throw new Error('A custom look needs a name.');
  if (cleanName.length > CUSTOM_LOOK_NAME_LIMIT) throw new Error('Custom-look name is too long.');
  const lookId = id == null ? 'look-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9) : String(id);
  if (!/^[\w-]{1,80}$/.test(lookId)) throw new Error('Invalid custom-look identifier.');
  return { id: lookId, name: cleanName, state: normalizeStudioState(state),
    updatedAt: Number.isFinite(Number(updatedAt)) ? Number(updatedAt) : Date.now() };
}
export function parseCustomLooks(input) {
  let parsed = input;
  if (typeof parsed === 'string') { try { parsed = JSON.parse(parsed); } catch (_) { return []; } }
  if (!parsed || typeof parsed !== 'object' || parsed.version !== CUSTOM_LOOKS_VERSION || !Array.isArray(parsed.looks)) return [];
  const ids = new Set(), names = new Set(), looks = [];
  for (const item of parsed.looks.slice(0, CUSTOM_LOOKS_LIMIT)) {
    try {
      const look = createCustomLook(item && item.name, item && item.state, item && item.id, item && item.updatedAt);
      const folded = look.name.toLocaleLowerCase();
      if (ids.has(look.id) || names.has(folded)) continue;
      ids.add(look.id); names.add(folded); looks.push(look);
    } catch (_) { /* Drop a corrupt record without losing valid records. */ }
  }
  return looks;
}