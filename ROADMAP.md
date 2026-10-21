# Open Makeup — Project Roadmap

**Last updated:** 2026-10-21  
**Working branch:** `feat/open-makeup-arabic-mobile-lifecycle`  
**Related pull request:** [#3 — Arabic-first mobile UI, fullscreen preview, and camera recovery](https://github.com/majd7772233-a11y/OpenMakeup/pull/3)  
**Engineering protocol:** [Promt.txt](https://github.com/majd7772233-a11y/gpts/blob/main/Promt.txt)

## 1. Product Objective

Build a trustworthy, attractive, Arabic-first virtual makeup studio for Android and the web. The studio uses a live camera preview, MediaPipe FaceMesh, Three.js/WebGL shaders, makeup layers, and face-shaping controls. English remains available as a persistent secondary language.

The product must be judged by its real user behavior, not only by compilation. A visible action must work or report a meaningful error; camera and face tracking states must be truthful; the UI must reflect engine state; and recoverable interruptions must not silently discard the user's chosen look.

## 2. Final Definition of Success

- Arabic is the default language; English switching updates all visible and accessible user-facing strings, dynamic controls, status messages, dialogs, and layout direction.
- Startup does not announce readiness until essential model/shader/texture/material resources and camera startup have succeeded. The Android UI additionally verifies that video frames advance before enabling makeup controls.
- No operation reports success if activating a layer or loading a requested asset failed.
- Makeup remains attached to a tracked face; after tracking disappears for several consecutive results, face-attached layers are hidden and restored when tracking returns.
- Background/resume recovery checks new video frames, supports controlled reinitialization and an explicit retry action, and restores the last local session rather than blindly reloading the page.
- Makeup-layer selections, quick-look selection, morph values and visual toggles stay synchronized with the engine and persist across supported recoveries/restarts.
- The six existing makeup layers, three quick looks, clear action, and face controls either work or provide an honest, actionable error.
- Mobile layouts are responsive, accessible, and spacious enough to use. Fullscreen preview maintains video/effect alignment across supported aspect ratios.
- Custom color/strength controls, compare-before-after, capture/save/share, named custom looks, undo/redo, camera switching, onboarding and a richer preset library are added only after existing engine behavior is dependable.
- Automated tests, type-check, production web bundle and Android debug APK build pass. Device-specific behavior is recorded as physically verified only when it has actually been tested on the target hardware.

## 3. Repository Baseline and Architecture

### Main components

- `index.html`: single-page responsive studio UI, Arabic/English strings via `data-i18n`, makeup buttons, quick looks, morph controls, settings, About dialog, fullscreen preview and camera-retry affordance.
- `main.js`: UI orchestration, language switching, status feedback, makeup/session state, Android Back/resume hooks and camera recovery.
- `src/OpenMakeup.js`: public SDK wrapper, category/finish/color resolution, pattern selection and face morph API.
- `src/categories.js`, `src/morphs.js`, `src/config.js`: canonical effect categories/defaults, morph mappings, runtime asset configuration.
- `src/core/MakeupEngine.js`: Three.js scene and renderer; video texture; model/material orchestration; MediaPipe FaceMesh and Camera; effect layers; morphing; camera lifecycle.
- `src/core/FaceMeshModelController.js`: GLTF face model load and landmark fitting.
- `src/core/FaceNurbsModelController.js`: NURBS geometry for eyeliner and mascara.
- `src/core/materials.js`, `src/core/faceWarpMaterial.js`: GLSL shader/texture loaders and materials.
- `src/core/cameraReadiness.js`: camera-track and new-frame readiness verification.
- `assets/models/face.glb`, `assets/shaders/**`, `assets/patterns/**`, `public/mediapipe/**`: bundled runtime/model/shader/pattern assets.
- `android/app/src/main/java/com/magd/openmakeup/MainActivity.java`: WebViewAssetLoader host, camera permission bridge, external links, lifecycle and Back integration.
- `.github/workflows/android.yml`: dependency install, SDK type-check, Node tests, Vite build, Android asset packaging, Gradle debug APK and artifact upload.

### Platforms and technical constraints

- Android application ID: `com.magd.openmakeup`; minimum API 23 (Android 6.0); compile/target SDK 35.
- Android host is Java and embeds the web app in Android WebView via `https://appassets.androidplatform.net/assets/www/index.html`.
- Web runtime: ES modules, Vite 8, TypeScript 5.9 for declarations/type-checking, Three.js 0.184, MediaPipe global-script packages; CI uses Node 22 and Gradle 8.9.
- The application bundles model, shader, patterns and MediaPipe runtime files for local/offline startup. Camera permission, WebView behavior and GPU/WebGL support remain platform dependencies.
- Camera/face processing is intended to remain local; do not introduce camera uploads or remote frame streaming.
- Preserve the SDK public API wherever possible. When behavior previously failed silently, prefer clear errors to false success.

## 4. Source-Verified Defects at the Initial Stage-1 Audit

The following defects were confirmed from the pre-Stage-1 source:

1. `FaceMeshModelController` started a GLTF load in its constructor while `MakeupEngine` started a second load. This duplicated work and made load completion ordering ambiguous.
2. `_loadFaceAndMaterials()` launched the shader/material loaders in detached promises and resolved its own load promise as soon as the GLTF model arrived. UI initialization could complete before textures and materials were available.
3. GLTF load failure had no promise rejection path, so initialization could hang rather than provide a useful error.
4. Shader source fetches treated non-success HTTP responses as text, and texture loads were fire-and-forget; asset failures could surface much later during rendering.
5. `MakeupEngine.setAR()` caught and discarded errors; `OpenMakeup.apply()` also caught pattern failures and still returned an apparently successful result.
6. Eye-shadow shimmer mode 7 assigned `_noise = 7` while comparable foundation/blush modes used `0.7`.
7. Missing-face results did not transition the renderer into a “tracking lost” state, so stale face-attached effects could remain visible.
8. Camera recovery checked track liveness and `video.readyState`, not whether new frames were arriving. The old recovery path reloaded the page and could discard the chosen look.
9. Initialization failure left controls disabled without an explicit retry action. The UI lacked a durable state model for selected makeup and morph settings.
10. The previous GitHub Actions workflow had no focused runtime test suite.

### Risks requiring target-device validation

- Exact `@mediapipe/camera_utils` start/stop behavior on Android 6/7 WebView versions.
- Camera frame progression after native Activity pause/resume and repeated background/foreground cycles.
- Shader compilation, face UV-channel availability, effect alignment and occlusion across GPUs/WebView versions.
- Fullscreen video/canvas alignment across portrait/landscape and different camera/screen aspect ratios.
- Sustained frame rate, battery/thermal load and WebGL context-loss recovery.
- Permission denial/revocation and recovery when no camera device is available.

These are not considered verified merely because the APK builds.

## 5. Runtime State Contract

The required initialization sequence is:

1. Load the face model once and reject failed or invalid model loads.
2. Load all required shader sources and textures; construct the materials and effect meshes.
3. Configure MediaPipe and the camera.
4. Complete camera start with a bounded wait.
5. In the user-facing app, confirm that a live enabled video track exists and `video.currentTime` advances.
6. Restore session data, then enable controls and display readiness.

Every user action must either complete and update engine/UI/session state or fail with an actionable message. Selected makeup and tracking visibility are separate: tracking loss hides face-attached meshes but does not erase the selected look. Failed camera recovery must preserve locally stored session state and provide a retry path.

Local session schema: `openMakeupSessionState` stores `makeup`, `morphs`, `activeLook`, `wireframe`, and `blur`. The language preference remains stored separately under `openMakeupLanguage`. Storage is optional; malformed or unavailable storage must not prevent startup.

## 6. Ordered Development Stages

The stages are whole execution units. Their checklists are implementation work inside each stage, not subdivisions or permission to deliver partial results.

### Stage 1 — Runtime Reliability, Truthful State, and Camera Recovery

**Status:** Implementation committed; final CI and physical-device acceptance still pending.  
**Dependencies:** Existing Arabic/mobile UI baseline in PR #3.  
**Key files:** `src/core/MakeupEngine.js`, `src/core/FaceMeshModelController.js`, `src/core/materials.js`, `src/core/faceWarpMaterial.js`, `src/OpenMakeup.js`, `src/core/cameraReadiness.js`, `main.js`, `index.html`, `tests/runtime-reliability.test.js`, `package.json`, `.github/workflows/android.yml`.

Implementation scope:
- Make model loading explicit, single-flight, awaitable and rejection-aware; remove constructor-triggered duplicate loads.
- Await required shader, texture, material and camera-start operations before SDK initialization succeeds. Bound camera startup, clean up failed initialization, and show useful errors.
- Check shader HTTP status and reject texture/model failures rather than proceeding with invalid resources.
- Propagate layer activation and requested pattern failures to callers; never announce false success.
- Correct the eye-shadow shimmer/noise scale discrepancy.
- Hide face-attached effects after three consecutive no-face results and restore selected layers when tracking returns.
- Verify frame progression during app startup, DOM visibility resume and native Android resume, even if the track still reports `live`.
- Replace blind page reload recovery with controlled engine restart, local session restoration and a visible retry action.
- Persist makeup layer options, quick-look selection, morph values and view toggles; keep layer/preset states visibly and accessibly synchronized.
- Add focused automated tests for camera-frame checks and SDK failure propagation; include tests in CI.
- Review disposal of tracks, MediaPipe, animation loop, model geometry, materials and textures.
- Synchronize the roadmap and engineering notebook with current code, actual CI results and hardware-verification limits.

Acceptance criteria:
1. Required model/shader/texture/material resources are awaited and a missing resource rejects initialization with a useful error.
2. Model loading is initiated once per engine startup.
3. The SDK does not return success when a requested layer activation or pattern operation failed.
4. No-face results hide stale effects while preserving the selected look for reacquisition.
5. Startup and resume verify advancing frames; a stalled frame condition produces a visible error/retry route.
6. Background/resume or engine recreation preserves saved makeup and morph/toggle state; no blind reload discards session data.
7. A failed startup stops any stream acquired during the failed attempt.
8. `npm test`, `npm run typecheck`, `npm run build`, and Android debug APK CI pass at the final relevant head.
9. Repeated background/resume, camera permission denial, and effect behavior are tested on target Android 6/7 devices when such devices are available. If not available, keep the stage explicitly blocked for device acceptance rather than marking it fully complete.
10. The final branch diff, workflow result, artifact and docs are reviewed before calling the stage complete.

### Stage 2 — Makeup Effect and Face-Control Correctness

**Dependencies:** Stage 1 runtime contract.  
**Primary files:** `src/OpenMakeup.js`, `src/categories.js`, `src/morphs.js`, `src/core/MakeupEngine.js`, `src/core/materials.js`, shader/model assets, `assets/patterns/patterns.json`, `docs/pattern-catalog.json`, effect tests and UI controls.

Required work:
- Audit each of the six products end-to-end: masks, UV channels, material uniforms, layer order, mirroring, occlusion, mouth/eye movement and removal.
- Align pattern catalog and renderer support for every advertised category. Implement correct texture/shader mapping or explicitly constrain public capabilities rather than silently ignoring an effect.
- Validate finish semantics and shader modes for matte, shimmer, glossy and glitter.
- Give every exposed face-shaping control a distinct user-readable name/description and sensible bounds. Hide raw debug targets from normal users.
- Verify one-layer clearing, clear-all, preset application/rollback, layering and missing texture behavior.

Acceptance criteria:
- Every visible effect either visibly performs its declared behavior on a supported device or reports a clear unsupported/failure state.
- Pattern catalog, category API and render-engine mappings agree.
- No morph slider is presented as a meaningful control without a mapped and documented behavior.
- Tests cover category-to-engine mapping, error paths and selected-layer state.

### Stage 3 — Complete Mobile UI/UX, Localization and Accessibility

**Dependencies:** Stages 1 and 2.  
**Primary files:** `index.html`, `main.js`, Android resources, focused UI modules/styles and UI verification documentation.

Required work:
- Organize daily workflow around preview and makeup. Put advanced face-shaping and debug controls behind clear sections or focused views.
- Add durable visual selected state, progress/error states and reset/undo affordances tied to true runtime state.
- Refine phone/tablet, narrow screen, portrait/landscape and fullscreen layouts; ensure camera and effect canvas remain aligned.
- Complete Arabic/English translation of status/error text, dynamic control names, accessibility labels, dialogs, About content and metadata.
- Improve dialog focus trapping/return, keyboard/Back/Escape handling, accessible zoom, contrast, motion preferences and touch targets.
- Keep the glass-inspired design without crowding basic interactions.
- Distinguish “camera not ready”, “no face found”, poor lighting, unsupported graphics and missing assets.

Acceptance criteria:
- Visible text and accessible labels follow the selected language and text direction.
- No controls are clipped or overlapping at supported breakpoints.
- UI selection/loading/error states match actual engine state.
- Fullscreen and normal preview remain aligned on the test matrix.
- The main workflow is understandable without knowledge of internal SDK/debug names.

### Stage 4 — Personalization, Color/Strength Controls, Capture and History

**Dependencies:** Stages 1–3.  
**Primary files:** UI/session modules, SDK effect APIs, persistence, Android save/share integration if required, tests and docs.

Required work:
- Add a real color picker and per-layer intensity/opacity/finish controls backed by shader uniforms.
- Add deterministic before/after comparison and temporary original-camera preview.
- Add photo capture, local save and explicit share intent with accurate mirror/orientation and permission/error handling.
- Add named custom looks with local save/load/delete and a versioned, validated storage schema.
- Add undo/redo for ordered effect and morph operations.
- Preserve the on-device processing privacy model and only share content after explicit user action.

Acceptance criteria:
- Users can create, save, relaunch, and restore a custom look correctly.
- Captured images match chosen effect state, orientation and mirror behavior.
- Comparison does not mutate saved selection; undo/redo reverses the intended operation sequence.
- Storage/share failures are shown clearly and do not corrupt saved looks.

### Stage 5 — Camera Switching, Onboarding, Preset Library, Performance and Release

**Dependencies:** Stages 1–4.  
**Primary files:** Android host/manifest, camera module, UI/localization, preset/catalogue assets, workflows, README and release notes.

Required work:
- Add front/back camera switching with capability checks, stream replacement and clean track disposal.
- Add dismissible first-run guidance for permissions, framing, lighting and core controls, plus a meaningful face-detection state.
- Expand curated, categorized looks through maintainable data-driven definitions.
- Profile performance and thermal impact; tune camera/render resolution; handle WebGL context loss.
- Perform final compatibility, accessibility, dependency/security, offline asset and release-build checks.
- Verify artifact and app-version metadata; publish a verifiable release package and notes.

Acceptance criteria:
- Camera switching never leaves duplicate streams or a frozen preview on supported hardware.
- Onboarding does not repeatedly block returning users.
- Performance is measured on a defined device matrix with clear fallback behavior.
- CI, release build and critical user workflows pass; device results are recorded accurately.

## 7. Project-Wide Quality Gates

For every stage:
- Inspect affected files, callers and integration boundaries; compilation is not evidence of UI correctness.
- Run `npm test`, `npm run typecheck`, and `npm run build`; run `gradle --no-daemon -p android assembleDebug` through the configured CI pipeline.
- Preserve the application ID, minimum API, existing public SDK behavior and on-device camera processing.
- Do not silently ignore missing assets or effect failures.
- Keep actual camera data local unless the user explicitly initiates capture/share.
- Update both `ROADMAP.md` and `GPT.md` in the same execution cycle as significant findings and before stage completion.
- Mark device-specific validation unverified when it has not actually been performed.

## 8. Current Operational State

- PR #3 remains open; the current work stays on `feat/open-makeup-arabic-mobile-lifecycle`.
- Stage 1 source changes include promise-based single model loading, awaited shader/texture/material setup, propagated effect errors, tracking-loss handling, camera frame progression checks, a session store, retry UI and six Node tests.
- At the initial Stage-1 CI attempt on commit `042651ebc59d05b797a40eefc5d70f69c6669c69`, all six tests and type-check passed, but Vite build failed because `resumeInProgress` and `hiddenAt` were declared twice. This was fixed in commit `9dabba92c57100213942b8f5e49e4b1879a9ef9f`; native resume was further hardened in `eb1c6093b29f434db908aee9b7bf487c425b4aea`.
- The new head still needs its latest CI run to complete. No Android physical-device test was performed by the repository tools in this session; stage acceptance remains pending until CI is green and Android 6/7 lifecycle/effect behavior is physically tested or explicitly blocked.
- Do not start Stage 2 until the Stage 1 completion gate is satisfied.
