import { MakeupEngine } from './core/MakeupEngine.js';
import { CATEGORIES, resolveCategory, AI_SENTINEL } from './categories.js';
import { MORPH_CONTROLS } from './morphs.js';

// Used when a category's default color is `ai` but no aiColor provider is set,
// or when AI resolution fails — keeps `apply()` from ever producing no color.
const FALLBACK_AI_COLOR = '#b4002e';

// Only advertise pattern categories with a real renderer mapping and bundled
// mask files. Foundation/lipstick placeholders are deliberately not published.
const PATTERN_RENDER_SUPPORT = new Set([
  'blush', 'eyeshadow', 'eyeline', 'mascara',
]);

function validatePatternManifest(manifest) {
  if (!manifest || !manifest.categories || typeof manifest.categories !== 'object' || Array.isArray(manifest.categories)) {
    throw new Error('Pattern manifest has no valid categories object.');
  }

  for (const category of Object.keys(CATEGORIES)) {
    const entries = manifest.categories[category];
    if (!Array.isArray(entries)) throw new Error(`Pattern manifest category "${category}" must be an array.`);
    if (!PATTERN_RENDER_SUPPORT.has(category) && entries.length) {
      throw new Error(`Pattern manifest advertises "${category}" without a supported renderer.`);
    }
    const seen = new Set();
    for (const entry of entries) {
      const id = String(entry && entry.id != null ? entry.id : '');
      if (!/^\d+$/.test(id)) throw new Error(`Invalid pattern id in category "${category}".`);
      if (seen.has(id)) throw new Error(`Duplicate pattern id "${id}" in category "${category}".`);
      seen.add(id);
      if (entry.file !== `patterns/${category}/${id}.png`) {
        throw new Error(`Pattern "${id}" has an invalid asset path for "${category}".`);
      }
      if (entry.bundled !== true) {
        throw new Error(`Pattern "${id}" for "${category}" is not bundled for offline use.`);
      }
    }
  }
  return manifest.categories;
}

/** Normalize '#rgb' / 'rgb' / '#rrggbb' / 'rrggbb' to '#rrggbb', or null. */
function normalizeHex(input) {
  if (typeof input !== 'string') return null;
  let h = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(h)) h = h.split('').map((c) => c + c).join('');
  if (/^[0-9a-fA-F]{6}$/.test(h)) return '#' + h.toLowerCase();
  return null;
}

/**
 * OpenMakeup — the public SDK API.
 *
 * Wraps MakeupEngine with a clean per-category interface:
 *   apply(category, { color, pattern, finish })
 * Every parameter has a sensible default, so `apply('eyeline')` works on its
 * own (black, built-in pattern). `finish` only applies to categories that
 * support it (foundation, blush, lipstick, eyeshadow).
 *
 * @example
 * const mk = new OpenMakeup({
 *   video: document.querySelector('#cam'),
 *   renderCanvas: document.querySelector('#out'),
 *   assetsBaseUrl: '/assets',
 *   aiColor: async () => '#c21f4d', // used for lipstick's default color
 * });
 * await mk.init();
 * await mk.apply('lipstick', { finish: 'glossy' });   // color from aiColor
 * await mk.apply('eyeline', { pattern: 1 });           // color defaults to black
 * await mk.apply('eyeshadow', { color: '#7a3b9d', pattern: 3, finish: 'glitter' });
 * mk.clear('eyeshadow');
 * mk.clearAll();
 */
export class OpenMakeup {
  /**
   * @param {object} options
   * @param {HTMLVideoElement}  options.video
   * @param {HTMLCanvasElement} options.renderCanvas
   * @param {HTMLCanvasElement} [options.overlayCanvas]
   * @param {string} [options.assetsBaseUrl]
   * @param {string} [options.mediapipeBaseUrl]
   * @param {object} [options.faceMesh]
   * @param {object} [options.camera]
   * @param {object} [options.defaults]  per-category default overrides, e.g.
   *                                      { lipstick: { color: '#ff0000' } }
   * @param {(category: string) => (string|Promise<string>)} [options.aiColor]
   *                                      provider for categories whose default
   *                                      color is `ai` (lipstick by default)
   * @param {(detected: boolean) => void} [options.onFaceTrackingChange]
   *                                      notified after stable face detection/loss
   */
  constructor(options = {}) {
    const {
      video, renderCanvas, overlayCanvas,
      assetsBaseUrl, mediapipeBaseUrl, faceMesh, camera,
      defaults = {}, aiColor = null, onFaceTrackingChange = null,
    } = options;

    this.engine = new MakeupEngine({
      video, renderCanvas, overlayCanvas,
      assetsBaseUrl, mediapipeBaseUrl, faceMesh, camera, onFaceTrackingChange,
    });

    this._aiColor = typeof aiColor === 'function' ? aiColor : null;

    // merge consumer default overrides over the built-in category defaults
    this._categories = {};
    for (const [name, cfg] of Object.entries(CATEGORIES)) {
      this._categories[name] = {
        ...cfg,
        defaults: { ...cfg.defaults, ...(defaults[name] || {}) },
      };
    }

    this._patterns = {}; // category -> [{ id, file, bundled }]
    this._ready = false;
  }

  /** Boot the engine and validate the bundled pattern manifest. */
  async init(onReady) {
    if (this._ready) return this;
    await this.engine.init();
    try {
      const manifestUrl = this.engine.assets.manifest();
      const response = await fetch(manifestUrl);
      if (!response.ok) throw new Error(`Pattern manifest request failed (HTTP ${response.status}).`);
      const manifest = await response.json();
      this._patterns = validatePatternManifest(manifest);
    } catch (error) {
      this._patterns = {};
      this._ready = false;
      try { this.engine.dispose(); } catch (disposeError) {
        console.warn('OpenMakeup: engine cleanup after manifest failure failed:', disposeError);
      }
      const detail = error && error.message ? error.message : String(error || 'unknown manifest error');
      throw new Error('OpenMakeup: required pattern manifest could not be loaded. ' + detail);
    }
    this._ready = true;
    if (onReady) {
      try { onReady(this); } catch (callbackError) {
        console.warn('OpenMakeup: onReady callback failed:', callbackError);
      }
    }
    return this;
  }

  get ready() {
    return this._ready;
  }

  /** List usable bundled patterns for a category: [{ number, id, bundled: true }]. */
  getPatterns(category) {
    const name = resolveCategory(category);
    if (!name || !PATTERN_RENDER_SUPPORT.has(name)) return [];
    return (this._patterns[name] || [])
      .filter((pattern) => pattern.bundled === true)
      .map((pattern, i) => ({
        number: i + 1,
        id: pattern.id,
        bundled: true,
      }));
  }

  /** The canonical category names supported by the SDK. */
  get categories() {
    return Object.keys(this._categories);
  }

  /**
   * Apply (or update) a makeup layer. Resolves missing parameters from the
   * category defaults. Returns the resolved { category, color, finish, pattern }.
   */
  async apply(category, opts = {}) {
    const name = resolveCategory(category);
    if (!name) throw new Error(`OpenMakeup: unknown category "${category}"`);
    if (!this._ready) throw new Error('OpenMakeup: await init() before applying makeup.');
    const cfg = this._categories[name];
    const color = await this._resolveColor(name, opts);
    const colorMode = this._resolveColorMode(name, opts);
    const patternId = this._resolvePatternId(name, opts);

    // Supported categories restore their built-in texture when no pattern is
    // requested. This prevents a previous pattern from sticking to a new look.
    if (patternId != null) {
      const applied = await this.engine.setPattern(cfg.engine, patternId);
      if (applied === false) throw new Error(`OpenMakeup: pattern update for "${name}" was superseded by a newer selection.`);
    } else if (PATTERN_RENDER_SUPPORT.has(name)) {
      const reset = await this.engine.setPattern(cfg.engine, null);
      if (reset === false) throw new Error(`OpenMakeup: could not restore the default pattern for "${name}".`);
    }
    this.engine.setAR(cfg.engine, color, colorMode);

    return {
      category: name,
      color,
      finish: cfg.supportsFinish ? (opts.finish ?? cfg.defaults.finish) : null,
      pattern: patternId,
    };
  }

  /** Hide one makeup layer. */
  clear(category) {
    const name = resolveCategory(category);
    if (!name) throw new Error(`OpenMakeup: unknown category "${category}"`);
    this.engine.clearPart(this._categories[name].engine);
  }

  /** Hide every makeup layer. */
  clearAll() {
    this.engine.clearAll();
  }

  /* ───────────────────────── face reshape (morph) ───────────────────────── */

  /**
   * Reshape the face. Accepts friendly controls and/or raw glb target names:
   *   mk.morph({ noseSlim: 0.6, cheeks: 0.3, jawWide: 0.4, browLift: 0.5 });
   * Weights are typically 0..1 (negative or >1 exaggerate).
   */
  morph(map = {}) {
    this.engine.morph(map);
  }

  /** Set a single reshape control. */
  setMorph(name, value) {
    this.engine.setMorph(name, value);
  }

  /** Reset all reshape controls to 0. */
  resetMorph() {
    this.engine.resetMorph();
  }

  /** Friendly reshape control names (see morphs.js for what each does). */
  get morphControls() {
    return Object.keys(MORPH_CONTROLS);
  }

  /** All morph target names baked into the model (friendly + raw). */
  getMorphTargets() {
    return this.engine.getMorphTargets();
  }

  /** Debug: show/hide a wireframe of the morphed face mesh. */
  setWireframe(on) {
    this.engine.setWireframe(on);
  }

  /** Show/hide the blur/refraction layer (off by default). */
  setBlur(on) {
    this.engine.setBlur(on);
  }

  start() { return this.engine.start().then(() => this); }
  stop() { this.engine.stop(); }
  dispose() { this.engine.dispose(); }

  /* ───────────────────────── internals ───────────────────────── */

  async _resolveColor(name, opts) {
    const cfg = this._categories[name];
    let color = opts.color != null ? opts.color : cfg.defaults.color;

    if (color === AI_SENTINEL) {
      if (!this._aiColor) return FALLBACK_AI_COLOR;
      try {
        color = await this._aiColor(name);
      } catch (_) {
        return FALLBACK_AI_COLOR;
      }
    }

    const normalized = normalizeHex(color);
    if (!normalized) {
      throw new Error(`OpenMakeup: invalid color for "${name}". Use #RGB or #RRGGBB.`);
    }
    return normalized;
  }

  _resolveColorMode(name, opts) {
    const cfg = this._categories[name];
    if (!cfg.supportsFinish) {
      if (opts.finish != null) {
        throw new Error(`OpenMakeup: finish "${opts.finish}" is not supported for "${name}".`);
      }
      return undefined;
    }

    const finish = opts.finish != null ? opts.finish : cfg.defaults.finish;
    if (!Object.prototype.hasOwnProperty.call(cfg.finishMap, finish)) {
      throw new Error(`OpenMakeup: finish "${finish}" is not supported for "${name}".`);
    }
    return cfg.finishMap[finish];
  }

  _resolvePatternId(name, opts) {
    const cfg = this._categories[name];
    const hasExplicitId = opts.patternId != null;
    const requested = hasExplicitId
      ? opts.patternId
      : (opts.pattern != null ? opts.pattern : cfg.defaults.pattern);
    if (requested == null) return null;

    if (!PATTERN_RENDER_SUPPORT.has(name)) {
      throw new Error(`OpenMakeup: patterns are not supported for "${name}" yet.`);
    }

    const list = this._patterns[name] || [];
    if (hasExplicitId) {
      const entry = list.find((pattern) => String(pattern.id) === String(requested));
      if (entry) return entry.id;
      throw new Error(`OpenMakeup: pattern id "${requested}" is not available for "${name}".`);
    }
    if (Number.isInteger(requested) && requested >= 1 && requested <= list.length) {
      return list[requested - 1].id;
    }
    const entry = list.find((pattern) => String(pattern.id) === String(requested));
    if (entry) return entry.id;
    throw new Error(`OpenMakeup: pattern "${requested}" is not available for "${name}" (valid positions: 1..${list.length}).`);
  }


}
