/**
 * Camera readiness helpers shared by the UI and runtime tests.
 * A live track can still be paired with a frozen WebView video frame.
 */
export function hasLiveCameraTrack(video) {
  const stream = video && video.srcObject;
  if (!stream || typeof stream.getVideoTracks !== 'function') return false;
  return stream.getVideoTracks().some((track) =>
    track && track.readyState === 'live' && track.enabled !== false
  );
}

export async function waitForCameraFrames(video, options = {}) {
  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 6000;
  const pollIntervalMs = Number.isFinite(options.pollIntervalMs) ? options.pollIntervalMs : 150;
  const now = options.now || (() => Date.now());
  const sleep = options.sleep || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const deadline = now() + timeoutMs;
  let previousTime = Number(video && video.currentTime) || 0;

  while (now() <= deadline) {
    if (!hasLiveCameraTrack(video)) throw new Error('No live camera video track is available.');
    const currentTime = Number(video.currentTime) || 0;
    if (video.readyState >= 2 && currentTime > previousTime + 0.001) return true;
    await sleep(Math.max(1, Math.min(pollIntervalMs, deadline - now())));
  }
  throw new Error('The camera track is live, but new video frames are not arriving.');
}
