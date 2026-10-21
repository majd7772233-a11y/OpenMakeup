# Open Makeup — Project Roadmap

**Last updated:** 2026-10-21  
**Code revision validated by CI:** `0f4590431e168976c3c2605ce4c14dd09b82156e`  
**Working branch:** `feat/open-makeup-arabic-mobile-lifecycle`  
**Related pull request:** [#3 — Arabic-first mobile UI, fullscreen preview, and camera recovery](https://github.com/majd7772233-a11y/OpenMakeup/pull/3)  
**Engineering protocol:** [Promt.txt](https://github.com/majd7772233-a11y/gpts/blob/main/Promt.txt)

## 1. Product Objective

Build a trustworthy, attractive, Arabic-first virtual makeup studio for Android and the web. The studio uses a live camera preview, MediaPipe FaceMesh, Three.js/WebGL shaders, makeup layers, and face-shaping controls. English remains available as a persistent secondary language.

The product is judged by real user behavior, not only compilation. A visible action must work or report a meaningful error; camera and face-tracking states must be truthful; the UI must reflect engine state; and recoverable interruptions must not silently discard the user's chosen look.

## 2. Final Definition of Success

- Arabic is the default language; English switching updates all visible/accessibility strings, dynamic controls, status messages, dialogs and layout direction.
- Essential model/shader/texture/material resources are loaded before the SDK becomes ready. The app verifies that video frames advance before enabling makeup controls.
- No operation reports success if layer activation or a requested asset failed.
- Face-attached effects hide after tracking disappears for several consecutive results and return when the face is detected again, without erasing the selected look.
- Background/resume recovery checks repeated video-frame progression, can recreate the engine and offers a retry action; it never blindly reloads the page and silently loses session state.
- Layer/preset selections, morph values and visual toggles stay synchronized with the engine and persist across supported recoveries.
- All six existing makeup layers, three quick looks, clear action and face controls work or show an honest actionable error.
- Mobile layouts remain accessible and usable; fullscreen video/effect alignment is verified across supported aspect ratios.
- Custom color/intensity controls, before/after comparison, photo capture/save/share, named custom looks, undo/redo, camera switching, onboarding and a richer preset library follow only after existing behavior is dependable.
- Automated tests, type-check, web bundle and Android debug APK build pass. Device-specific claims are made only after an actual target-device test.

## 3. Repository Baseline and Architecture

### Main components

- `index.html`: responsive studio UI, Arabic/English labels, preview, makeup controls, morph controls, settings, About dialog, fullscreen preview and camera-retry affordance.
- `main.js`: UI orchestration, language switching, status feedback, makeup/session state, Android Back/pause/resume hooks and camera recovery.
- `src/OpenMakeup.js`: public SDK wrapper, category/finish/color resolution, pattern selection and face morph API.
- `src/categories.js`, `src/morphs.js`, `src/config.js`: effect categories/defaults, morph mappings and runtime asset URLs.
- `src/core/MakeupEngine.js`: Three.js scene/renderer, video texture, model/material loading, MediaPipe tracking, effect layers, morphing and camera lifecycle/disposal.
- `src/core/FaceMeshModelController.js`: GLTF model loading and landmark fitting.
- `src/core/FaceNurbsModelController.js`: NURBS geometry for eyeliner and mascara.
- `src/core/materials.js`, `src/core/faceWarpMaterial.js`: shader/texture loaders and render materials.
- `src/core/cameraReadiness.js`: live-track and repeated frame-progression verification.
- `tests/runtime-reliability.test.js`: Node built-in runtime reliability tests.
- `assets/models/face.glb`, `assets/shaders/**`, `assets/patterns/**`, `public/mediapipe/**`: bundled runtime/model/shader/pattern assets.
- `android/app/src/main/java/com/magd/openmakeup/MainActivity.java`: WebViewAssetLoader host, permission bridge, external links, camera pause/resume and Back integration.
- `.github/workflows/android.yml`: install, type-check, tests, Vite build, Android asset packaging, Gradle APK build and artifact upload.

### Platforms and technical constraints

- Android application ID: `com.magd.openmakeup`; minimum API 23 (Android 6.0); compile/target SDK 35.
- Android host is Java and embeds the web app through `https://appassets.androidplatform.net/assets/www/index.html`.
- Web runtime: ES modules, Vite 8, TypeScript 5.9 declarations/type-checking, Three.js 0.184 and MediaPipe global scripts. CI uses Node 22 and Gradle 8.9.
- The app bundles its model, shader, pattern and MediaPipe files for local/offline startup. Camera permission, WebView implementation and GPU/WebGL support remain runtime dependencies.
- Camera/face processing is intended to remain on-device. Do not add camera uploads or remote frame streaming.
- Preserve the public SDK API where possible. Replace silent failures with precise errors.

## 4. Source-Verified Defects at the Initial Stage-1 Audit

The following defects were confirmed in the source before Stage 1:

1. `FaceMeshModelController` started a GLTF load in its constructor while `MakeupEngine` started a second load, duplicating work and making completion order ambiguous.
2. `_loadFaceAndMaterials()` resolved after the GLTF model loaded but did not await shader/material/texture loaders; the UI could enable controls before effects existed.
3. GLTF failures had no rejected-promise path, so startup could hang rather than expose a useful error.
4. Shader fetches treated non-success HTTP responses as text, and texture loads were fire-and-forget.
5. `MakeupEngine.setAR()` swallowed activation errors; `OpenMakeup.apply()` also caught pattern failures and returned an apparent success.
6. Eye-shadow shimmer mode 7 set `_noise = 7` while comparable foundation/blush material modes used `0.7`.
7. Missing-face results did not hide stale face-attached effects.
8. Camera recovery checked track liveness and `video.readyState`, not continued frame progression; the previous fallback reloaded the page and could discard a look.
9. Startup failure left controls disabled with no explicit retry.
10. No focused automated runtime tests existed.
11. The quick-look transaction could return failure while other concurrently applying layers were still pending.
12. Lipstick pattern assets were listed even though the current renderer had no lipstick pattern assignment.

## 5. Runtime State Contract

The required initialization sequence is:

1. Load the face model once; reject if the file/geometry is invalid.
2. Load all required shader sources and textures; construct materials/effect meshes and clean up fulfilled resources if another required load fails.
3. Configure MediaPipe and the camera.
4. Complete camera start with a bounded wait and invalidate late completion if the engine was stopped/disposed.
5. In the user-facing app, confirm a live enabled video track and at least two observed advances of `video.currentTime`.
6. Load the bundled pattern manifest; do not start an incomplete app if it is missing or malformed.
7. Restore session state, then enable controls and report readiness.

A user operation must either complete and update engine/UI/session state or fail with a clear message. Selected makeup state is separate from tracking visibility: tracking loss hides attached meshes but does not erase the chosen layers. Camera recovery must preserve local session state.

Local storage key `openMakeupSessionState` stores `makeup`, `morphs`, `activeLook`, `wireframe`, and `blur`; language uses `openMakeupLanguage`. Storage is optional and parsed defensively.

## 6. Ordered Development Stages

The stages are whole execution units. Their checklists describe work inside each stage, not smaller deliveries that can be marked complete independently.

### Stage 1 — Runtime Reliability, Truthful State, and Camera Recovery

**Status:** Source implementation and automated CI pass. Physical-device acceptance remains pending.  
**Code revision validated by CI:** `0f4590431e168976c3c2605ce4c14dd09b82156e`  
**CI run:** [39675435438](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/39675435438)

Implementation delivered:
- One explicit, awaitable GLTF model load with failure reporting.
- Awaited shader/texture/material initialization, HTTP checks and cleanup of successfully loaded materials if another required material fails.
- Bounded camera startup, generation-based cancellation of late starts after stop/timeout, MediaPipe/render/geometry/material/texture cleanup, and no swallowed layer activation errors.
- Two-sample frame-progression checks on app startup and native/DOM resume, native pause handling, controlled engine recreation and visible retry; no blind page reload.
- Face-tracking-loss handling, active layer state, selected UI styles, local session restoration and transactional quick-look rollback.
- Required pattern-manifest validation, honest unsupported-pattern behavior, and TypeScript declaration updates for asynchronous `start()`.
- Eleven focused Node tests wired into GitHub Actions.

Acceptance criteria:
1. Required model/shader/texture/material resources are awaited and failures reject startup with useful information.
2. Face-model loading begins once per engine initialization.
3. Layer activation and requested pattern failures propagate instead of becoming false success.
4. No-face results hide stale effects while keeping selected state for reacquisition.
5. Startup/resume confirms repeated frame progression. A single stale-to-new frame followed by a freeze is not accepted as a healthy camera.
6. Background/resume and controlled engine recreation preserve the look/morph/toggle state; there is no blind reload.
7. Startup failure stops streams and invalidates camera-start promises that finish after a timeout/disposal.
8. Quick-look failure waits for all concurrent layer operations to settle before rollback.
9. Unsupported lipstick patterns are not advertised through `getPatterns()`; attempting unsupported pattern application fails honestly.
10. `npm test`, `npm run typecheck`, `npm run build`, Android debug APK build and artifact upload pass on the validated commit.
11. Background/resume, permissions and rendered-effect alignment still require physical Android 6/7 testing. Since this session had no connected physical device, this is explicitly outstanding; do not describe Stage 1 as physically verified.

### Stage 2 — Makeup Effect and Face-Control Correctness

**Dependencies:** Stage 1 runtime contract.  
**Primary files:** `src/OpenMakeup.js`, `src/categories.js`, `src/morphs.js`, `src/core/MakeupEngine.js`, `src/core/materials.js`, shaders/model assets, `assets/patterns/patterns.json`, `docs/pattern-catalog.json`, effect tests and UI controls.

Required work:
- Audit each of the six products end-to-end: masks, UV channels, material uniforms, layer order, mirroring, occlusion, mouth/eye movement and removal.
- Implement a correct lipstick pattern-to-shader path or permanently remove unsupported lipstick patterns from the shipped catalogue/assets; never expose nonfunctional options.
- Validate matte, shimmer, glossy and glitter semantics against the actual shaders.
- Give every face-shaping control a distinct user-readable name, description and sensible bounds. Hide raw/debug targets from normal users.
- Verify individual layer clearing, clear-all, preset layering/rollback and missing texture behavior.

Acceptance criteria:
- Each visible effect is visually verified on a supported device or shows a clear unsupported/failure state.
- Public API, pattern catalogue and renderer support agree.
- Every regular-user morph slider produces the intended documented change, and reset updates both engine and UI.
- Regression tests cover category mappings, effect errors and selected-layer state.

### Stage 3 — Complete Mobile UI/UX, Localization and Accessibility

**Dependencies:** Stages 1 and 2.  
**Primary files:** `index.html`, `main.js`, Android resources, UI modules/styles and UI-verification documentation.

Required work:
- Organize the phone workflow around preview and daily-use makeup. Put advanced face-shaping and debug controls behind clear sections/views.
- Add durable selection, progress/error states and reset/undo affordances tied to actual engine state.
- Refine phone/tablet, narrow screen, portrait/landscape and fullscreen layouts, including camera/canvas alignment.
- Complete Arabic/English localization for dynamic labels, errors, retry UI, accessibility labels, dialogs, About content and metadata.
- Improve focus trapping/return, Back/Escape behavior, accessible zoom, contrast, touch targets and reduced-motion support.
- Keep the glass-inspired design without crowding common interactions.
- Distinguish camera failure, no detected face, poor lighting, unsupported graphics and missing assets.

Acceptance criteria:
- Visible and accessible text follows language and direction.
- No overlapping/clipped controls at supported breakpoints.
- Selected/loading/error states match actual engine state.
- Fullscreen and normal preview remain aligned across the tested aspect-ratio matrix.
- The main flow is understandable without knowledge of SDK or debug names.

### Stage 4 — Personalization, Color/Strength, Capture and History

**Dependencies:** Stages 1–3.  
**Primary files:** UI/session modules, effect APIs, persistence, Android save/share integration if required, tests and docs.

Required work:
- Add real color pickers and per-layer intensity/opacity/finish controls backed by shader uniforms.
- Add deterministic before/after comparison and temporary original-camera preview.
- Add photo capture, local save and explicit share intent with correct mirror/orientation and permission/error handling.
- Add named custom looks with local save/load/delete and a validated versioned storage schema.
- Add undo/redo for ordered effect and morph operations.
- Preserve on-device processing and only share after explicit user action.

Acceptance criteria:
- Users can create, save, relaunch and restore custom looks accurately.
- Captures match chosen effect state, orientation and mirror behavior.
- Comparison doesn't mutate selected state; undo/redo reverses the intended sequence.
- Storage/share failures are clear and do not corrupt saved looks.

### Stage 5 — Camera Switching, Onboarding, Preset Library, Performance and Release

**Dependencies:** Stages 1–4.  
**Primary files:** Android host/manifest, camera module, UI/localization, preset/catalogue assets, workflows, README and release notes.

Required work:
- Add front/back camera switching with capability checks, stream replacement and track disposal.
- Add dismissible first-run guidance for permission, framing, lighting and core controls, plus a meaningful face-detection state.
- Expand curated, categorized looks via maintainable data-driven definitions.
- Profile sustained performance/thermal impact, tune camera/render resolution and handle WebGL context loss.
- Perform final compatibility, accessibility, dependency/security, offline asset and release-build checks.
- Verify artifact/version metadata; publish a verifiable release package and notes.

Acceptance criteria:
- Camera switching has no duplicate streams or frozen preview on supported hardware.
- Onboarding doesn't repeatedly block returning users.
- Performance is measured on a defined device matrix with clear fallback behavior.
- CI, release build and critical user workflows pass; device results are documented honestly.

## 7. Project-Wide Quality Gates

For every stage:
- Inspect affected files and callers; successful compilation is not evidence of UI correctness.
- Run `npm test`, `npm run typecheck`, and `npm run build`; build the Android APK and upload the artifact through GitHub Actions.
- Preserve the app ID, minimum API, public SDK contracts and on-device camera processing.
- Do not hide unsupported behavior with no-ops or fake success.
- Keep camera data local unless the user explicitly initiates capture/share.
- Update both `ROADMAP.md` and `GPT.md` with current implementation and actual CI/device evidence.
- Mark device-specific validation unverified when not physically performed.

## 8. Current Operational State

- PR #3 remains open; work remains on `feat/open-makeup-arabic-mobile-lifecycle`.
- Source revision `0f4590431e168976c3c2605ce4c14dd09b82156e` passed GitHub Actions run [39675435438](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/39675435438), including eleven runtime tests, type-check, Vite bundle, Android debug APK build and artifact upload.
- An earlier build failure at `042651ebc59d05b797a40eefc5d70f69c6669c69` was traced to duplicate declarations for `resumeInProgress` and `hiddenAt`; fixed in `9dabba92c57100213942b8f5e49e4b1879a9ef9f`. The successful final code run is later than that fix and includes further camera/session corrections.
- The workflow validates the build and automated helper/SDK tests, not real WebView, GPU shader output or physical camera behavior.
- No physical Android device was run in this session. Stage 1 implementation/CI is complete, but physical device acceptance is still outstanding; do not mark the whole stage unconditionally complete.
- Stage 2 must not begin until the target-device gate is completed or explicitly blocked for lack of a test device.
