import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createDebouncedCall } from '../src/ui/session-persistence.js';
import { calculateCaptureSize } from '../src/core/capture-frame.js';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const main = read('../main.js');
const activity = read('../android/app/src/main/java/com/magd/openmakeup/MainActivity.java');
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('Stage 10 coalesces high-frequency persistence requests and writes only the latest value', async () => {
  const writes = [];
  const persistence = createDebouncedCall((value) => { writes.push(value); return true; }, 12);
  persistence.schedule('first');
  persistence.schedule('middle');
  persistence.schedule('latest');
  assert.equal(persistence.pending, true);
  await delay(30);
  assert.deepEqual(writes, ['latest']);
  assert.equal(persistence.pending, false);
});

test('Stage 10 flushes the final slider value immediately and cancels the scheduled duplicate', async () => {
  const writes = [];
  const persistence = createDebouncedCall((value) => { writes.push(value); return 'stored:' + value; }, 40);
  persistence.schedule('last-drag-value');
  assert.equal(persistence.flush(), 'stored:last-drag-value');
  assert.deepEqual(writes, ['last-drag-value']);
  await delay(55);
  assert.deepEqual(writes, ['last-drag-value']);
  assert.equal(persistence.pending, false);
});

test('Stage 10 cancellation drops a pending write without executing it', async () => {
  let writes = 0;
  const persistence = createDebouncedCall(() => { writes += 1; }, 10);
  persistence.schedule();
  persistence.cancel();
  await delay(25);
  assert.equal(writes, 0);
  assert.equal(persistence.pending, false);
});

test('Stage 10 Android capture uses a lower pixel budget and flushes pending session state on pause', () => {
  assert.match(main, /nativeCapture \? 1920 : 2560/);
  assert.match(main, /nativeCapture \? 2500000 : 6500000/);
  assert.match(main, /scheduleSessionStatePersistence\(\)/);
  assert.match(main, /flushSessionStatePersistence\(\);[\s\S]*?if \(!engineReady\) return;/);
  assert.match(main, /createDebouncedCall\(writeScheduledSessionState, 180\)/);
  assert.match(activity, /MAX_CAPTURE_PIXELS = 4_000_000L/);
  assert.match(activity, /bounds\.outWidth \* \(long\) bounds\.outHeight > MAX_CAPTURE_PIXELS/);
});

test('Stage 10 Android image export cleans partial files and bounds retained share cache', () => {
  assert.match(activity, /legacyTarget\.delete\(\)/);
  assert.match(activity, /private void pruneShareCache\(File directory, File protectedFile\)/);
  assert.match(activity, /protectedFile != null && file\.equals\(protectedFile\)/);
  assert.match(activity, /retainedOtherFiles >= SHARE_CACHE_MAX_FILES - 1/);
  assert.match(activity, /SHARE_CACHE_MAX_AGE_MS/);
  assert.match(activity, /SHARE_CACHE_MAX_FILES = 10/);
  const shareMethod = activity.slice(activity.indexOf('private void beginShareImage'), activity.indexOf('private final class OpenMakeupBridge'));
  assert.ok(shareMethod.indexOf('pruneShareCache(directory, target)') > shareMethod.indexOf('bitmap.compress'));
  assert.ok(shareMethod.indexOf('pruneShareCache(directory, target)') < shareMethod.indexOf('FileProvider.getUriForFile'));
});

test('Stage 10 capture budget remains bounded for native portrait and landscape previews', () => {
  for (const [width, height] of [[1080, 2400], [2400, 1080], [1920, 1920], [3840, 2160]]) {
    const size = calculateCaptureSize(width, height, 1920, 2500000);
    assert.ok(size.width <= 1920);
    assert.ok(size.height <= 1920);
    assert.ok(size.width * size.height <= 2500000);
  }
});

test('Stage 10 cancels in-flight camera initialization only when the native Activity is fully stopped', () => {
  const engine = read('../src/core/MakeupEngine.js');
  assert.match(main, /window\.handleOpenMakeupHostStop = \(\) => cancelStartupForHostStop\(\)/);
  assert.match(main, /startHostStopGeneration !== hostStopGeneration/);
  assert.match(main, /let hostBackgrounded = false/);
  assert.match(main, /restartStartupWhenVisible && !document\.hidden && !hostBackgrounded/);
  assert.match(main, /hostBackgrounded = false;[\s\S]*?window\.handleOpenMakeupResume/);
  assert.match(engine, /initializationGeneration !== this\._lifecycleGeneration/);
  assert.match(activity, /protected void onStop\(\)/);
  assert.match(activity, /handleOpenMakeupHostStop/);
  assert.match(main, /onPause can be triggered by Android's camera-permission prompt/);
});

test('Stage 11 Android image save and share decode and write on worker threads', () => {
  assert.match(activity, /saveImageInBackground\(dataUrl, name\)/);
  assert.match(activity, /private void saveImageInBackground\(String dataUrl, String requestedName\)\s*\{\s*Thread saveThread = new Thread\(\(\) -> \{[\s\S]*?decodePngDataUrl\(dataUrl\)[\s\S]*?saveBitmapToGallery\(bitmap, requestedName\)/);
  assert.match(activity, /private void shareImageInBackground\(String dataUrl, String requestedName\)\s*\{\s*Thread shareThread = new Thread\(\(\) -> \{[\s\S]*?decodePngDataUrl\(dataUrl\)[\s\S]*?beginShareImage\(bitmap, requestedName\)/);
  const bridge = activity.slice(activity.indexOf('private final class OpenMakeupBridge'), activity.indexOf('protected void onPause()'));
  assert.match(bridge, /saveImage\(String dataUrl, String requestedName\)[\s\S]*?saveImageInBackground\(dataUrl, name\);\s*return "save_started"/);
  assert.match(bridge, /shareImage\(String dataUrl, String requestedName\)[\s\S]*?shareImageInBackground\(dataUrl, safeImageName\(requestedName\)\);\s*return "share_started"/);
  assert.match(activity, /synchronized \(MainActivity\.this\)[\s\S]*?pendingSaveDataUrl != null/);
  assert.match(activity, /if \(!bitmap\.compress\(Bitmap\.CompressFormat\.PNG, 100, output\)\) \{\s*try \{ target\.delete\(\)/);
  assert.match(activity, /catch \(Exception exception\) \{\s*try \{ target\.delete\(\)/);
});

test('Stage 10 does not publish engine readiness after a host stop during async session restoration', () => {
  const startup = main.slice(main.indexOf('async function startEngine()'), main.indexOf('\nasync function reinitializeEngine()'));
  const restoreIndex = startup.indexOf('const restoreErrors = await restoreSessionState();');
  const readinessIndex = startup.indexOf('engineReady = true;', restoreIndex);
  const guardIndex = startup.indexOf('if (startHostStopGeneration !== hostStopGeneration || document.hidden || hostBackgrounded)', restoreIndex);
  assert.ok(restoreIndex >= 0, 'startup must restore saved session state');
  assert.ok(guardIndex > restoreIndex && guardIndex < readinessIndex,
    'lifecycle must be rechecked after the last awaited restoration and before publishing readiness');
  assert.ok(startup.slice(guardIndex, readinessIndex).includes('mk.stop()'));
  assert.ok(startup.slice(guardIndex, readinessIndex).includes('stopAndDetachCamera()'));
  assert.ok(startup.slice(guardIndex, readinessIndex).includes('restartStartupWhenVisible = true'));
});

test('Stage 10 clears the browser-only background flag on visibility return before retrying startup', () => {
  const visibleBranch = main.slice(main.indexOf("document.addEventListener('visibilitychange'"));
  const clearIndex = visibleBranch.indexOf('if (!window.OpenMakeupBridge) hostBackgrounded = false;');
  const retryIndex = visibleBranch.indexOf('else if (!engineReady && restartStartupWhenVisible && !engineStarting && !hostBackgrounded)');
  assert.ok(clearIndex >= 0 && retryIndex > clearIndex,
    'browser visibility must clear its host-background marker before deciding whether startup can retry');
});

test('Stage 10 invalidates camera recovery across host stop and retries when resume races the stale promise', () => {
  const recovery = main.slice(main.indexOf('async function recoverCamera()'), main.indexOf('function pauseCameraForBackground()'));
  const hostStop = main.slice(main.indexOf('function cancelStartupForHostStop()'), main.indexOf('window.handleOpenMakeupPause'));
  const resume = main.slice(main.indexOf('window.handleOpenMakeupResume = async () =>'));
  const startIndex = recovery.indexOf('await mk.start()');
  const startGuard = recovery.indexOf('if (!lifecycleStillCurrent())', startIndex);
  const framesIndex = recovery.indexOf('await waitForCameraFrames', startIndex);
  const frameGuard = recovery.indexOf('if (!lifecycleStillCurrent())', framesIndex);
  assert.ok(startIndex >= 0 && startGuard > startIndex && startGuard < framesIndex,
    'recovery must validate the host generation after the asynchronous camera start');
  assert.ok(framesIndex >= 0 && frameGuard > framesIndex,
    'recovery must validate the host generation after frame progression too');
  assert.match(hostStop, /hostStopGeneration \+= 1;[\s\S]*?hostBackgrounded = true/);
  assert.match(resume, /if \(resumeInProgress\) \{\s*\/\/ onResume can arrive[\s\S]*?resumeRequestedWhileRecovering = true;/);
  assert.match(recovery, /const retryAfterInterruption = recoveryCancelled[\s\S]*?resumeRequestedWhileRecovering[\s\S]*?Promise\.resolve\(\)\.then\(\(\) => recoverCamera\(\)\)/);
});


test('Stage 11 camera recovery invalidates on transient Android onPause as well as host stop', () => {
  const recovery = main.slice(main.indexOf('async function recoverCamera()'), main.indexOf('function pauseCameraForBackground()'));
  const pause = main.slice(main.indexOf('function pauseCameraForBackground()'), main.indexOf('function cancelStartupForHostStop()'));
  assert.match(main, /let cameraPauseGeneration = 0;/);
  assert.match(recovery, /const recoveryCameraPauseGeneration = cameraPauseGeneration/);
  assert.match(recovery, /recoveryCameraPauseGeneration === cameraPauseGeneration/);
  assert.match(pause, /if \(!engineReady\) return;[\s\S]*?cameraPauseGeneration \+= 1;[\s\S]*?mk\.stop\(\)/);
  assert.ok(pause.indexOf('if (!engineReady) return;') < pause.indexOf('cameraPauseGeneration += 1;'),
    'a transient permission prompt during initial startup must not invalidate startup');
});

test('Stage 11 share action handles capture failures before native or web share begins', () => {
  const share = main.slice(main.indexOf('async function shareCurrentPhoto()'), main.indexOf('\nfunction t(key', main.indexOf('async function shareCurrentPhoto()')));
  assert.ok(share.indexOf('try {') >= 0 && share.indexOf('try {') < share.indexOf('ensureCapture()'),
    'ensureCapture must execute inside the share failure boundary');
  assert.match(share, /catch \(error\)[\s\S]*?setStatusKey\('statusShareFailure', 'error'\)/);
});
