import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const html = read('../index.html');
const main = read('../main.js');
const locales = read('../src/ui/locales.js');
const gradle = read('../android/app/build.gradle');
const workflow = read('../.github/workflows/android.yml');
const readme = read('../README.md');
const releaseNotes = read('../RELEASE_NOTES.md');

function localeHas(language, key) {
  const start = locales.indexOf('  ' + language + ': {');
  const next = language === 'ar' ? locales.indexOf('  en: {', start) : locales.indexOf('\n  }\n};', start);
  const section = locales.slice(start, next < 0 ? locales.length : next);
  return section.includes(key + ':');
}

test('release candidate Android identity and notes agree', () => {
  assert.match(gradle, /versionCode 6/);
  assert.match(gradle, /versionName '1\.5\.0'/);
  assert.match(gradle, /minSdk 23/);
  assert.match(gradle, /applicationId 'com\.magd\.openmakeup'/);
  assert.match(releaseNotes, /Version 1\.5\.0/);
  assert.match(releaseNotes, /unsigned/i);
  assert.match(releaseNotes, /physical Android 6\/7/i);
});

test('stage-five UI includes accessible camera switching and dismissible first-run guidance', () => {
  for (const id of ['switch-camera', 'preset-library', 'onboarding-modal', 'onboarding-start', 'onboarding-skip']) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  for (const fn of ['refreshCameraSwitchAvailability', 'switchCameraFromButton', 'openOnboarding', 'dismissOnboardingAndStart', 'handleWebGLContextChange', 'renderPresetLibrary']) {
    assert.ok(main.includes(fn), 'Missing UI handler ' + fn);
  }
  assert.match(main, /openMakeupOnboardingDismissedV1/);
});

test('all stage-five controls and curated look names are localized in Arabic and English', () => {
  const keys = [
    'switchCamera', 'cameraSwitchUnsupported', 'statusCameraSwitching', 'statusCameraFront',
    'statusCameraRear', 'statusCameraSwitchFailure', 'onboardingTitle', 'onboardingIntro',
    'onboardingPermissionTitle', 'onboardingPermission', 'onboardingFramingTitle', 'onboardingFraming',
    'onboardingLightingTitle', 'onboardingLighting', 'onboardingToolsTitle', 'onboardingTools',
    'onboardingStart', 'onboardingSkip', 'statusGraphicsLost', 'statusGraphicsRestored',
    'statusGraphicsRestoreFailed', 'retryGraphics', 'statusPresetApplied', 'presetGroupDaily',
    'presetGroupRomantic', 'presetGroupStatement', 'presetGroupEvening', 'presetNudeDay',
    'presetPeachGlow', 'presetSoftRose', 'presetRoseClassic', 'presetMauveDream',
    'presetPinkBlossom', 'presetBerryBold', 'presetRubyNight', 'presetPlumSmoke',
    'presetBronzeEvening', 'presetGoldenHour', 'presetMidnight',
  ];
  for (const key of keys) {
    assert.ok(localeHas('ar', key), 'Arabic locale missing ' + key);
    assert.ok(localeHas('en', key), 'English locale missing ' + key);
  }
});

test('CI audits production dependencies and builds checksummed debug and release APK artifacts', () => {
  assert.match(workflow, /npm audit --omit=dev --audit-level=high/);
  assert.match(workflow, /assembleDebug assembleRelease/);
  assert.match(workflow, /sha256sum/);
  assert.match(workflow, /Open-Makeup-debug-apk/);
  assert.match(workflow, /Open-Makeup-release-candidate/);
  assert.match(readme, /camera switching/i);
  assert.match(readme, /12 curated looks/i);
});

test('runtime assets stay local and camera/photo data is not sent to remote endpoints', () => {
  assert.match(html, /src="\.\/mediapipe\/camera_utils\/camera_utils\.js"/);
  assert.match(html, /src="\.\/mediapipe\/face_mesh\/face_mesh\.js"/);
  assert.doesNotMatch(main, /fetch\(['"]https?:\/\/[^'"]*(?:camera|frame|image|photo)/i);
});
