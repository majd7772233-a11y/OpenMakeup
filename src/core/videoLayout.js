/**
 * Compute the CSS rectangle for the video texture/canvas pair.
 * The preview uses "cover" in the card and "contain" in fullscreen; using the
 * same rectangle for the WebGL canvas keeps FaceMesh effects aligned with the
 * actual visible video region.
 */
export function calculateVideoBoxLayout(videoWidth, videoHeight, containerWidth, containerHeight, fit = 'cover') {
  const vw = Number(videoWidth);
  const vh = Number(videoHeight);
  const cw = Number(containerWidth);
  const ch = Number(containerHeight);
  if (![vw, vh, cw, ch].every(Number.isFinite) || vw <= 0 || vh <= 0 || cw <= 0 || ch <= 0) {
    return { width: 0, height: 0, left: 0, top: 0 };
  }

  const videoAspect = vw / vh;
  const containerAspect = cw / ch;
  let width;
  let height;

  if (fit === 'contain') {
    if (videoAspect > containerAspect) {
      width = cw;
      height = cw / videoAspect;
    } else {
      height = ch;
      width = ch * videoAspect;
    }
  } else if (videoAspect > containerAspect) {
    height = ch;
    width = height * videoAspect;
  } else {
    width = cw;
    height = width / videoAspect;
  }

  width = Math.round(width);
  height = Math.round(height);
  return {
    width,
    height,
    left: Math.round((cw - width) / 2),
    top: Math.round((ch - height) / 2),
  };
}
