# Open Makeup — Project Roadmap

**Last updated:** 2026-10-22  
**Stage 2 code revision validated by CI:** `a5fcc28287b2a6214d52c7c9a99a3e327c0640df`  
**CI run:** [39680109245](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/39680109245)  
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
11. Physical Android 6/7 background/resume, permission, and effect-alignment tests are intentionally batched into a combined regression pass after Stage 4, per user direction. Until that pass, mark hardware-specific behavior as unverified; automated CI is not a device test.

### Stage 2 — Makeup Effect and Face-Control Correctness

**Status:** Implementation and automated CI complete. Real-device visual/camera validation is deliberately deferred to the combined regression pass after Stage 4, per user direction.  
**Code revision validated by CI:** `a5fcc28287b2a6214d52c7c9a99a3e327c0640df`  
**CI run:** [39680109245](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/39680109245)

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
- Added 21 tests in `tests/effect-contracts.test.js`, in addition to the 11 runtime tests in `tests/runtime-reliability.test.js`.

#### Completion evidence and deferred device boundary

- CI run [39680109245](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/39680109245) passed **32 Node tests, 0 failures**, SDK type-check, Vite web bundle, Android asset packaging, debug APK build and artifact upload. Artifact: `Open-Makeup-debug-apk`.
- Automated tests validate SDK/material state, bundled assets/catalogue integrity, GLB morph/UV contracts, layer mappings, finish uniforms, texture races/cleanup, invalid input handling and preview layout. They do not establish subjective shader appearance under live lighting or physical camera alignment.
- Foundation/lipstick pattern masks remain intentionally unsupported until proper category-specific mapping and assets exist. The SDK publishes no choices for those categories and rejects attempts.
- Physical Android 6/7 rendering, repeated resume, touch/permission workflows and performance will be checked together after Stage 4. This is intentionally deferred verification, not a claimed success.

Acceptance criteria:
1. Every advertised pattern has a real bundled file, valid manifest ID/path and renderer mapping; unsupported foundation/lipstick patterns are not advertised.
2. Invalid colors, finishes, categories and explicit pattern IDs fail clearly instead of being silently substituted.
3. Custom pattern selection, switching, reset, clear-one, clear-all, asset failure, racing loads and disposal have automated coverage and correct resource ownership.
4. All six categories map to a real engine layer; finish settings assign existing uniforms; missing uniforms and unsupported values fail explicitly.
5. Friendly morph controls map to existing GLB targets; the regular UI hides raw target names and the API rejects unknown names/non-finite values.
6. Normal/fullscreen camera-canvas rectangles use one shared fit calculation and preserve the mirror transform.
7. README, TypeScript definitions, manifest and catalogue agree with runtime support.
8. `npm test` (32 tests), `npm run typecheck`, `npm run build`, Android debug APK build and artifact upload pass at the recorded revision.
9. Live visual appearance/camera alignment remain unverified until the combined after-Stage-4 device pass; proceed with Stage 3 and Stage 4 without repeating that physical test for each stage.

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
- At the end of Stage 4, execute one consolidated physical-device regression pass covering Stages 1–4: Android 6/7 launch and permission denial, repeated camera pause/resume, all six makeup layers and presets, face-tracking loss/reacquisition, morph controls, preview/fullscreen alignment in portrait/landscape, capture/save/share if implemented, and resource/performance stability. Record device model, Android/WebView versions, steps, results and defects in both project memory files.

Acceptance criteria:
- Users can create, save, relaunch and restore custom looks accurately.
- Captures match chosen effect state, orientation and mirror behavior.
- Comparison doesn't mutate selected state; undo/redo reverses the intended sequence.
- Storage/share failures are clear and do not corrupt saved looks.
- The combined Stages 1–4 physical-device matrix is executed and documented, or the exact unavailable-device blocker is recorded without claiming a pass.

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
- Stage 2 revision `a5fcc28287b2a6214d52c7c9a99a3e327c0640df` passed GitHub Actions run [39680109245](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/39680109245): 32 tests pass, zero fail, plus type-check, web bundle, Android asset packaging, debug APK build and artifact upload.
- CI does not simulate physical camera behavior, real Android WebView or shader appearance under live lighting. Per the user's time-saving instruction, physical Android 6/7 testing for Stages 1–4 is scheduled as one combined pass after Stage 4.
- PR #3 remains open and unmerged. The APK artifact `Open-Makeup-debug-apk` is attached to run [39680109245](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/39680109245).
- Next eligible stage: Stage 3 — Complete Mobile UI/UX, Localization and Accessibility. The roadmap contains five stages total.
