# GPT.md — Open Makeup Engineering Notebook

**Last updated:** 2026-10-21  
**Repository:** https://github.com/majd7772233-a11y/OpenMakeup  
**Active branch:** `feat/open-makeup-arabic-mobile-lifecycle`  
**Related pull request:** [#3](https://github.com/majd7772233-a11y/OpenMakeup/pull/3)  
**Mandatory execution protocol:** [Promt.txt](https://github.com/majd7772233-a11y/gpts/blob/main/Promt.txt)

## 1. Project Intent and Non-Negotiable Requirements

Open Makeup is an offline-capable virtual makeup web/Android app using Three.js WebGL effects and MediaPipe FaceMesh. The application must be Arabic-first with persistent English switching, responsive on phones/tablets, polished but not cramped, and honest about engine operations. Camera and face processing should remain on-device.

The product must be assessed by user-visible behavior, not only successful build output. A visible button cannot be a no-op or produce a false success message. Camera startup/resume, tracking loss, session persistence, effect loading and error recovery are part of correctness.

The user's workflow requires whole-stage implementation rather than partial delivery. Maintain both `ROADMAP.md` and `GPT.md` in clear English, update them with actual progress/evidence and never claim tests or device checks that were not performed.

## 2. Current Technical Environment

- Web app and SDK: JavaScript ESM, Vite 8, TypeScript 5.9 declarations/type-check, Three.js 0.184, MediaPipe global scripts.
- Android host: Java, AndroidX WebKit 1.12.1, Gradle 8.9 in CI.
- CI: Node 22; `npm install`, `npm run typecheck`, `npm test`, `npm run build`, embed `dist/` into Android assets, `gradle --no-daemon -p android assembleDebug`, upload debug APK.
- App ID: `com.magd.openmakeup`; min Android API 23 (Android 6), target/compile SDK 35.
- Android host loads `https://appassets.androidplatform.net/assets/www/index.html` via `WebViewAssetLoader`, constrains WebView camera permission to the trusted local origin, and forwards pause/resume/back behavior.
- Offline runtime assets live in `assets/models`, `assets/shaders`, `assets/patterns`, and `public/mediapipe`.

## 3. Architecture and Ownership

- `index.html`: visual UI, responsive styling, translated static text, camera retry button, About dialog, fullscreen controls.
- `main.js`: translations, status messages, event handlers, engine creation, session persistence, layer/preset state, camera recovery, Android Back/resume hooks.
- `src/OpenMakeup.js`: SDK wrapper, category/color/finish/pattern resolution and morph API.
- `src/categories.js`, `src/morphs.js`, `src/config.js`: categories, defaults, morph mappings, asset URLs.
- `src/core/MakeupEngine.js`: Three.js scene/rendering, camera and face tracking, model/material orchestration, layers, morphs, lifecycle/disposal.
- `src/core/FaceMeshModelController.js`: GLTF face model loading and landmark fitting.
- `src/core/FaceNurbsModelController.js`: eyeliner/mascara NURBS geometry.
- `src/core/materials.js`, `src/core/faceWarpMaterial.js`: shader/texture loading and render materials.
- `src/core/cameraReadiness.js`: live track and progressing-frame detection shared by UI and tests.
- `tests/runtime-reliability.test.js`: Node built-in tests for camera readiness and SDK errors.
- `.github/workflows/android.yml`: quality checks and Android debug APK pipeline.

## 4. Important Runtime Contracts

### Initialization

The face model is loaded once by `MakeupEngine._loadFaceAndMaterials()`. `FaceMeshModelController.loadModel()` returns a shared Promise and rejects if the file is unavailable, the geometry is invalid, or no mesh exists. Shader fetches check HTTP status. Textures are Promise-loaded with failures surfaced.

`MakeupEngine.init()` awaits model/material loading, MediaPipe setup and bounded camera startup. The app layer additionally waits for `video.currentTime` progression before enabling controls and announcing the camera ready. UI controls stay disabled when startup fails, and the retry button reconstructs the engine.

### Applying and removing effects

`OpenMakeup.apply()` must be called after `init()`. It resolves the requested category/options, awaits a requested pattern before activating the layer, and propagates activation or texture failures. `MakeupEngine.setAR()` validates material/mesh readiness and no longer swallows errors. The UI shows success only when its awaited action resolves.

The engine tracks selected layers in `_activeLayers` separately from `_faceVisible`. Three consecutive no-face results hide stale face-attached layers; selected categories remain in memory and reappear after a face is detected. `clearAll()` clears selected makeup, while `clearPart()` removes one selected layer.

Current pattern mapping in the engine: foundation, eyeliner, mascara, eyeshadow and blush can assign patterns to existing uniforms. The lipstick pattern path is explicitly rejected if requested because a correct lipstick pattern mapping still needs shader-level investigation; handle this in Stage 2. Do not make unsupported features silently succeed.

### Camera lifecycle and local session

`waitForCameraFrames(video)` requires a live enabled video track and advancing `currentTime`; a live track with frozen frames is treated as failure. DOM visibility resume and native Android resume both validate frame progression. Recovery stops/detaches the old stream, attempts camera restart, and on failure recreates the engine. It must not use a blind `window.location.reload()`.

Local storage key `openMakeupSessionState` stores:
`{ makeup: { [category]: options }, morphs: { [targetName]: number }, activeLook: string|null, wireframe: boolean, blur: boolean }`.
Language uses `openMakeupLanguage`. Storage access is best-effort and parsed defensively. Recovery restores layer options, morph values and toggles, then re-synchronizes UI states.

Native app resume calls `window.handleOpenMakeupResume()` after WebView resume. The handler now actively waits for a new frame rather than only looking at track liveness. If frame time does not advance within 1.8 seconds, it invokes camera recovery.

## 5. Source-Confirmed Baseline Defects

Before Stage 1:
1. Face model loading started in both the controller constructor and engine initialization, allowing duplicate model requests.
2. Engine initialization resolved as soon as the GLTF model loaded, while shader/material/texture loads continued asynchronously.
3. GLTF model loading had no rejection path for loader errors.
4. Shader fetches did not check non-2xx HTTP results, and texture-load errors did not reject initialization.
5. Layer activation and requested pattern errors were swallowed; UI could claim success although nothing was applied.
6. Eye-shadow finish mode 7 used `_noise = 7`, unlike the related material finish scale of `0.7`.
7. Missing-face frames did not hide stale attached effects.
8. Camera resume verified the track/readyState only and could fall back to a page reload, discarding the current look.
9. Startup failure left disabled controls without an actionable retry.
10. There was no automated runtime unit-test suite.

Device-specific risks still requiring physical verification: CameraUtils restart behavior on Android 6/7; native Activity background/resume; shader compilation/UV channels; fullscreen video/canvas alignment; permissions and real-device performance.

## 6. Stage-1 Implementation History

### Commits made on the active branch for Stage 1

- `fcf83bc6a314cb30f1b2e87e6fd1d89bc76a2e7e`: promise-based single face-model loading and failure checks in shaders/textures.
- `e99f77fa49af3d3e743e13dcf3b46de9acc7c914`: awaited model/material setup, tracking visibility, truthful effect activation and corrected shimmer scale.
- `1918925ff22a5c66bf01bbb208d428bc61db9c28`: SDK effect failure propagation and camera readiness helper.
- `19cc753e0bf0f1f047b5a6d5e69d6cfd820f642d`: camera retry UI and six runtime reliability tests wired into CI.
- `042651ebc59d05b797a40eefc5d70f69c6669c69`: frame-verified recovery and local session preservation.
- `9dabba92c57100213942b8f5e49e4b1879a9ef9f`: fixed duplicate lifecycle variable declarations found by Vite build; stop and detach any stream if startup fails.
- `eb1c6093b29f434db908aee9b7bf487c425b4aea`: verify frame progression after native resume even when visibilitychange may not fire; keep active look styling visible.

### Automated verification so far

- CI run `39673759476` at commit `19cc753e0bf0f1f047b5a6d5e69d6cfd820f642d` succeeded, including six tests, type-check, web bundle, APK assembly and artifact upload.
- CI run `39673858897` at `042651ebc59d05b797a40eefc5d70f69c6669c69`: six tests and type-check passed, but Vite build failed due duplicate `resumeInProgress` and `hiddenAt` declarations. Fixed in `9dabba92...`.
- Current head after native resume hardening: `eb1c6093b29f434db908aee9b7bf487c425b4aea`. A workflow run for an earlier corrected head was still in progress when this note was authored; poll the latest workflow for this branch and reconcile this note with the result before Stage 1 close.
- No physical Android device was run during this tool session. Do not claim lifecycle behavior is verified on real Android 6/7 hardware. Stage 1 may be code-complete but remains pending final CI and physical-device acceptance.

## 7. Build and Test Commands

- `npm install`
- `npm test`
- `npm run typecheck`
- `npm run build`
- Android CI assembles with `gradle --no-daemon -p android assembleDebug` after bundling and copying `dist/.` into `android/app/src/main/assets/www/`.

The test suite uses Node's built-in test runner; it validates pure camera readiness behavior and SDK error propagation, not WebView, real MediaPipe, WebGL shader output or hardware camera behavior.

## 8. Permanent Engineering Rules

- Never store tokens/passwords/private keys in this repository or either memory file.
- Do not claim success based only on file existence, a successful SDK call that swallowed errors, or a green compile step.
- Inspect all callers after changing lifecycle/effect contracts.
- Do not hide unsupported behavior with no-op functions or fake success messages.
- Never blindly reload the app for a recoverable camera failure; preserve session state.
- Distinguish automated verification from physical-device validation.
- After each significant implementation or CI result, update both `ROADMAP.md` and `GPT.md`.

## 9. Exact Resume Procedure

1. Read this file and `ROADMAP.md`.
2. Fetch the branch's current head and latest GitHub Actions run.
3. Check all job steps, especially `npm test`, type-check, Vite build, APK build and artifact upload.
4. Fix all failures within Stage 1 rather than declaring completion after a partial green run.
5. Update both files with the current commit SHA, workflow result and any still-unverified target-device acceptance criteria.
6. Do not begin Stage 2 until the Stage-1 completion gate is genuinely met or explicitly blocked by unavailable physical-device access.
