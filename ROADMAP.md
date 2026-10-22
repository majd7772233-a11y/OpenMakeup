# Open Makeup — Project Roadmap

**Last updated:** 2026-10-22  
**Stage 4 code revision validated by CI:** defe336265a24f9720b6283c1bddfb6b749a195c  
**CI run:** [39851101915](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/39851101915) — 50 tests passed, 0 failed; type-check, Vite build, Android asset packaging, debug APK build and artifact upload passed.  
**APK artifact:** [Open-Makeup-debug-apk](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/39851101915/artifacts/12456698785) — 14,952,872 bytes; SHA-256 295198706052fb40b8f5932d794ecece48e9efa218d8896e481665b035446d09.  
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
- Stage 4 provides shader-backed per-layer color/intensity/finish controls, original-camera comparison, explicit photo capture/save/share, named local looks, and undo/redo.
- Stage 5 still covers camera switching, onboarding, a richer curated preset library, performance/context-loss work and release hardening.
- Automated tests, type-check, web bundle and Android debug APK build pass. Device-specific claims are made only after an actual target-device test.

## 3. Repository Baseline and Architecture

### Main components

- `index.html`: responsive studio UI, Arabic/English labels, preview, makeup controls, morph controls, settings, About dialog, fullscreen preview and camera-retry affordance.
- `main.js`: UI orchestration, localization, versioned session and named-look persistence, shader intensity editor, comparison/capture/share controls, undo/redo and camera lifecycle recovery.
- `src/ui/studio-state.js`: versioned state normalization/migration, custom-look validation and bounded undo/redo history.
- `src/ui/locales.js`: independently testable Arabic/English dictionaries and safe count interpolation.
- `src/OpenMakeup.js`: public SDK wrapper, category/finish/color/intensity resolution, pattern selection and face morph API.
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
11. Physical Android 6/7 background/resume, permission, and effect-alignment tests are intentionally batched into a combined regression pass after Stage 4, per user direction. Until that pass, mark hardware-specific behavior as unverified; automated CI is not a device test.

### Stage 2 — Makeup Effect and Face-Control Correctness

**Status:** Implementation and automated CI complete. Real-device visual/camera validation is deliberately deferred to the combined regression pass after Stage 4, per user direction.  
**Code revision validated by CI:** `a3f4f89a5e40c9a26ea882b58185057b5cb2f743`  
**CI run:** [39680814807](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/39680814807)

#### Findings addressed

1. The pattern manifest and docs catalog claimed more patterns than the renderer safely supported. Placeholder masks and nonfunctional foundation/lipstick entries are no longer advertised. The shipped catalogue contains 69 real local masks across blush, eyeshadow, eyeliner and mascara (4 blush, 49 eyeshadow, 12 eyeliner, 4 mascara).
2. Pattern IDs are validated against the manifest. The SDK distinguishes a 1-based `pattern` position from explicit `patternId`; unsupported categories, path-like IDs, unknown IDs, malformed paths and non-bundled manifest records fail rather than silently applying another texture.
3. Switching and clearing patterns restore defaults, dispose replaced GPU textures, and prevent stale asynchronous loads from overwriting newer selections after a race.
4. Material code and shaders agree on finish uniforms. Foundation declares and uses `_noise`; foundation’s fragment shader adds subtle procedural finish variation; foundation, blush and eyeshadow use normalized noise levels (0 / 0.7 / 1). Lipstick modes set the actual `_shine` and `_bright` uniforms.
5. Camera-sensitive foundation, blush and lipstick materials receive the current world-space camera position on render/results updates.
6. Clearing one layer resets its custom pattern and disposes its active texture. Active effect selection remains separate from face-tracking visibility.
7. The GLB audit confirmed friendly morph controls map to actual model targets. The everyday studio presents named controls rather than raw `facemeshN` names; the engine rejects unknown morphs and non-finite weights.
8. Normal preview (`cover`) and fullscreen preview (`contain`) now share one video/canvas sizing calculation so the face effects use the same viewport rectangle.
9. README and TypeScript documentation now describe actual pattern/parameter contracts.

#### Implementation and test scope delivered

- Audited `src/categories.js`, `src/morphs.js`, `src/OpenMakeup.js`, `src/index.d.ts`, `src/core/MakeupEngine.js`, `src/core/materials.js`, `src/core/FaceMeshModelController.js`, related GLSL shaders, GLB UV/morph data, UI morph controls, manifests/catalogue and README.
- Added strict finish/color/pattern validation and explicit errors for unsupported modes instead of silent fallbacks.
- Made pattern state consistent across apply, reapply, single-layer clear, clear-all, failed loads, racing loads and engine disposal.
- Added `src/core/videoLayout.js` for mathematically consistent cover/contain preview sizing.
- Centralized face-morph bounds as `MORPH_WEIGHT_MIN = -1` and `MORPH_WEIGHT_MAX = 1.5` across engine, UI sliders, saved-state restoration and TypeScript declarations; the SDK rejects values outside the interval.
- Added 21 tests in `tests/effect-contracts.test.js`, in addition to the 11 runtime tests in `tests/runtime-reliability.test.js`.

#### Completion evidence and deferred device boundary

- CI run [39680814807](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/39680814807) passed **32 Node tests, 0 failures**, SDK type-check, Vite web bundle, Android asset packaging, debug APK build and artifact upload. Artifact: `Open-Makeup-debug-apk`.
- Automated tests validate SDK/material state, bundled assets/catalogue integrity, GLB morph/UV contracts, layer mappings, finish uniforms, texture races/cleanup, invalid input handling and preview layout. They do not establish subjective shader appearance under live lighting or physical camera alignment.
- Foundation/lipstick pattern masks remain intentionally unsupported until proper category-specific mapping and assets exist. The SDK publishes no choices for those categories and rejects attempts.
- Physical Android 6/7 rendering, repeated resume, touch/permission workflows and performance will be checked together after Stage 4. This is intentionally deferred verification, not a claimed success.

Acceptance criteria:
1. Every advertised pattern has a real bundled file, valid manifest ID/path and renderer mapping; unsupported foundation/lipstick patterns are not advertised.
2. Invalid colors, finishes, categories and explicit pattern IDs fail clearly instead of being silently substituted.
3. Custom pattern selection, switching, reset, clear-one, clear-all, asset failure, racing loads and disposal have automated coverage and correct resource ownership.
4. All six categories map to a real engine layer; finish settings assign existing uniforms; missing uniforms and unsupported values fail explicitly.
5. Friendly morph controls map to existing GLB targets; the regular UI hides raw target names and the API rejects unknown names, non-finite values and weights outside -1..1.5.
6. Normal/fullscreen camera-canvas rectangles use one shared fit calculation and preserve the mirror transform.
7. README, TypeScript definitions, manifest and catalogue agree with runtime support.
8. `npm test` (32 tests), `npm run typecheck`, `npm run build`, Android debug APK build and artifact upload pass at the recorded revision.
9. Live visual appearance/camera alignment remain unverified until the combined after-Stage-4 device pass; proceed with Stage 3 and Stage 4 without repeating that physical test for each stage.

### Stage 3 — Complete Mobile UI/UX, Localization and Accessibility

**Status:** Implementation and automated CI complete. Physical Android/WebView/GPU validation remains deliberately batched after Stage 4 per user direction.  
**Code revision validated by CI:** `9d9029a0e397627c624d49294d1f835808de2a12`  
**CI run:** [39833650293](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/39833650293)

#### Delivered

1. **Daily mobile workflow:** preview and makeup/quick-look choices stay in the main path; face-shaping sliders, wireframe and blur moved into a native expandable Advanced section.
2. **Small-screen and landscape layout:** added styles for widths at or below 380px/330px and short landscape screens; expanded the morph list instead of trapping it in a short nested scroller; safe areas remain respected.
3. **Localization:** moved dictionaries to `src/ui/locales.js`; 48 HTML-bound translation keys have both Arabic and English values. Language changes update document title/description, direction, status/error copy, tracking state and accessibility labels. Restore warnings interpolate the number of settings that could not be restored.
4. **Truthful face-tracking feedback:** added a distinct polite live region for “looking for a face / no face detected / face detected”, driven from stable engine callbacks after missing-face grace frames. Consumer callback failures are isolated and do not break tracking.
5. **Actionable errors:** camera permission, timeout/frame progression, WebGL and bundled-asset failures map to Arabic/English guidance rather than showing raw internal exceptions in the interface.
6. **Keyboard and dialog accessibility:** skip-to-makeup link, semantic section heading, visible focus rings, 44px primary controls, `aria-pressed` fullscreen state, separate polite status regions, About dialog description, focus trapping/return, Escape/Android Back handling, body scroll lock, and reduced-motion rules.
7. **Android build identity:** updated app version to 1.3.0.

#### Automated verification

- Added 9 accessibility/localization/UI contract tests in `tests/accessibility-ui.test.js`; the existing 32 runtime/effect tests remain intact.
- CI run [39833650293](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/39833650293) passed **41 tests, 0 failures**, SDK type-check, Vite bundle, Android asset packaging, debug APK build and artifact upload.
- This run validates code contracts and build output. It does not verify actual screen-reader behavior, contrast on every display profile, physical-device layout, touch feel or live camera/GPU output on Android 6/7.

Acceptance criteria:
1. Daily makeup stays primary; sculpting/debug controls are grouped in an expandable section.
2. Arabic and English cover every HTML-bound visible/accessibility string and runtime error/tracking state; locale updates direction and metadata.
3. Camera feedback distinguishes startup, no face and face detected without removing selected makeup.
4. About focus stays in the dialog while open, returns to its opener on close, and Escape/Android Back close the top surface.
5. Main touch controls use 44px targets, focus remains visible, skip navigation works, and reduced-motion preferences disable decorative motion.
6. Narrow-phone and short-landscape layouts have responsive rules and no authored duplicate HTML IDs.
7. `npm test` (41 tests), type-check, web build, Android asset packaging, debug APK build and upload pass at the recorded revision.
8. Target-device screen reader, contrast, portrait/landscape, camera-resume and shader appearance are not claimed verified; run the combined Stages 1–4 physical-device matrix after Stage 4.

### Stage 4 — Personalization, Color/Strength, Capture and History

**Status:** Source implementation and automated CI complete. The consolidated physical-device matrix is **not yet performed**; this connector session has no attached Android 6/7 handset or configured physical-device runner. Hardware acceptance remains an explicit blocker, not a claimed pass.  
**Code revision validated by CI:** defe336265a24f9720b6283c1bddfb6b749a195c  
**CI run:** [39851101915](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/39851101915) — 50 tests passed, zero failed; type-check, Vite build, Android asset packaging, APK build and upload passed.  
**APK artifact:** [Open-Makeup-debug-apk](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/39851101915/artifacts/12456698785)

#### Delivered

1. **Shader-backed personalization:** SDK apply(category, { intensity }) validates the inclusive 0–1 range and defaults to 1. The engine maps the value to a real uIntensity uniform on all six existing layer materials; the foundation, blush, lipstick, eyeshadow, eyeliner and mascara fragment shaders use it to scale effect opacity. TypeScript declarations match runtime behavior.
2. **Color and supported finish editor:** a per-category color picker, intensity slider and finish selector are available; finish is disabled for categories that do not support it. Arabic and English include the editor labels and status messages.
3. **Original/applied comparison:** the control temporarily hides the rendered makeup canvas to expose the original camera preview beneath it. It does not clear or rewrite selected engine/session state.
4. **Photo capture:** capture requests a fresh renderer frame and exports a mirrored PNG into a capped-size canvas, then shows a preview before save/share actions are enabled. preserveDrawingBuffer is enabled for capture; its sustained GPU/memory cost still needs target-device measurement.
5. **Explicit saving and sharing:** browser mode downloads the PNG and uses Web Share files when available, with download fallback. Android saves through MediaStore on Android Q+ and permission-gated Pictures storage on Android 6–9; sharing uses an app-cache FileProvider URI and an explicit ACTION_SEND chooser. Captured images are not uploaded automatically.
6. **Versioned local state and named looks:** studio state migrates the older unversioned session schema, validates categories/colors/intensity/finish/morph values and avoids overwriting recognized future session versions. Named looks use openMakeupCustomLooksV1, allow at most 100 entries, cap names at 40 characters, prevent case-insensitive duplicates and isolate corrupt records.
7. **Undo/redo:** bounded 50-step before/after history covers actions wrapped through the studio action runner and committed morph-slider gestures. Applying a saved snapshot reverts to the prior snapshot if an application fails.
8. **Truthful persistence/lifecycle states:** failed named-look writes roll back in-memory save/delete operations instead of announcing success. Stage-4 controls join the camera restart disable/enable gating. Storage permission denial and capture/save/share failures have localized status messages.
9. **Android build identity:** versionCode 5 / versionName 1.4.0; application ID and minSdk remain unchanged. FileProvider configuration is constrained to the local image-sharing cache path.

#### Automated verification

- Added tests/studio-state.test.js for schema migration/validation, future-version rejection, history semantics and custom-look parsing.
- Extended tests/effect-contracts.test.js for SDK intensity validation/forwarding and all six engine-uniform mappings.
- Extended tests/accessibility-ui.test.js for the stage-4 controls, comparison/capture/share/history wiring, future-schema protection and camera lifecycle control state.
- CI run [39851101915](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/39851101915) passed **50 tests, 0 failures**, followed by type-check, web bundle, Android asset packaging, debug APK build and artifact upload.
- CI does not verify an actual device camera frame, physical mirror/orientation, legacy storage permission prompts, gallery visibility, system share chooser, face tracking under live lighting or GPU performance.

#### Consolidated physical-device matrix — pending

Not yet run on a physical Android 6/7 device: launch and camera-permission denial; repeated background/resume; all six makeup layers and quick looks; face-loss/reacquisition; morph sliders and persisted state; portrait/landscape/fullscreen alignment; capture orientation/mirroring; gallery save and permission denial; system share chooser; sustained rendering/resource stability. Record the real device model, Android and WebView versions, exact steps, results and defects once hardware is available. CI is not a substitute. This remains the open hardware release gate before Stage 5 can be considered release-ready.

Acceptance criteria status:
- [x] Shader-backed intensity wired to all six layer shaders.
- [x] Color/finish/intensity editor, before/after comparison, capture/save/share path, named looks and undo/redo implemented.
- [x] Versioned state validation and persistence failure handling avoid overwriting recognized future data or showing false success.
- [x] 50 automated tests and full CI build/package/APK/artifact pipeline passed.
- [ ] Physical Android 6/7 regression has not been performed; camera alignment, old-version permission flow, gallery/share behavior and sustained GPU cost remain unverified.
- [ ] Run and document the consolidated Stages 1–4 device matrix before closing the hardware release gate.

### Stage 5 — Camera Switching, Onboarding, Preset Library, Performance and Release

**Dependencies:** Stages 1–4 plus the consolidated physical-device regression pass scheduled at the end of Stage 4.  
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
- Stage 1 source and runtime-reliability tests passed CI; device acceptance is intentionally deferred rather than blocking further implementation.
- Stage 2 revision `a3f4f89a5e40c9a26ea882b58185057b5cb2f743` passed GitHub Actions run [39680814807](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/39680814807): 32 tests pass, zero fail, plus type-check, web bundle, Android asset packaging, debug APK build and artifact upload.
- CI does not simulate physical camera behavior, real Android WebView or shader appearance under live lighting. Per the user's time-saving instruction, Stages 1–4 use one combined physical-device matrix. It is **still pending/not performed** because this connector session has no physical Android 6/7 target; keep camera/image orientation, storage permission, gallery/share and sustained GPU performance as unverified release checks.
- PR #3 remains open and unmerged. The APK artifact `Open-Makeup-debug-apk` is attached to run [39680814807](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/39680814807).
- Stage 3 revision 9d9029a0e397627c624d49294d1f835808de2a12 passed CI run [39833650293](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/39833650293): 41 tests passed, zero failed.
- Stage 4 revision defe336265a24f9720b6283c1bddfb6b749a195c passed CI run [39851101915](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/39851101915): 50 tests passed, zero failed; type-check, web build, Android packaging, APK build and artifact upload passed. Version is 1.4.0 / version code 5.
- Physical Android 6/7 testing for Stages 1–4 is **not performed** because no physical target is attached to this connector session. Camera and image orientation, legacy permissions, gallery/share and GPU performance remain unverified.
- Next implementation stage: Stage 5 — Camera Switching, Onboarding, Preset Library, Performance and Release. Total roadmap stages: **5**.
