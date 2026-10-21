/**
 * OpenMakeupSDK — face morph (reshape) controls.
 *
 * Maps friendly control names to the morph target names baked into face.glb.
 * Weights are clamped by contract to this tested interval so extreme values do
 * not generate unstable geometry or overflow the model's Float32 influence array.
 */
export const MORPH_WEIGHT_MIN = -1;
export const MORPH_WEIGHT_MAX = 1.5;
export const MORPH_CONTROLS = {
  browLift:   { target: 'facemesh9',      about: 'lift the outer brow corner' },
  lipPlump:   { target: 'facemesh4',      about: 'plump the lips (filler look)' },
  lipPlump2:  { target: 'facemesh5',      about: 'plump the lips (variant)' },
  noseSlim:   { target: 'facemesh7',      about: 'narrow the nose' },
  noseBridge: { target: 'facemesh11',     about: 'reduce the nose bridge between the eyes' },
  cheeks:     { target: 'facemesh10',     about: 'fuller cheeks' },
  jawAngle:   { target: 'facemesh12',     about: 'define the jaw angle' },
  jawWide:    { target: 'facemesh12.001', about: 'move the jaw angle away from the ear' },
};

// Variants not given a friendly name yet — still drivable via their raw target name.
export const MORPH_TARGETS_EXTRA = [
  'facemesh10.001',
  'facemesh10.002',
  'facemesh12.002',
  'facemesh9.001',
];

/** Resolve a control name (friendly or raw glb target) to the glb target name. */
export function resolveMorphTarget(name) {
  if (MORPH_CONTROLS[name]) return MORPH_CONTROLS[name].target;
  return name; // assume it's already a raw target name
}
