export const CAMERA_FACING_MODES = Object.freeze(['user', 'environment']);

export function normalizeCameraFacingMode(value) {
  return CAMERA_FACING_MODES.includes(value) ? value : null;
}

export function nextCameraFacingMode(value) {
  return value === 'environment' ? 'user' : 'environment';
}

export function supportsCameraFacingMode(mediaDevices) {
  if (!mediaDevices || typeof mediaDevices.getUserMedia !== 'function') return false;
  if (typeof mediaDevices.getSupportedConstraints !== 'function') return true;
  try {
    const supported = mediaDevices.getSupportedConstraints();
    return !supported || supported.facingMode !== false;
  } catch (_) {
    // Older WebViews may throw here despite supporting getUserMedia.
    return true;
  }
}

export async function countVideoInputDevices(mediaDevices) {
  if (!mediaDevices || typeof mediaDevices.enumerateDevices !== 'function') return null;
  try {
    const devices = await mediaDevices.enumerateDevices();
    if (!Array.isArray(devices)) return null;
    return devices.filter((device) => device && device.kind === 'videoinput').length;
  } catch (_) {
    return null;
  }
}
