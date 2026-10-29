# Open Makeup — Project Roadmap

**Canonical continuation checkpoint:** [CONTINUATION.md](./CONTINUATION.md). Read it first when continuing in a new conversation; it contains non-negotiable working rules, exact CI state and the physical-device acceptance matrix.

- **Repository/branch:** `majd7772233-a11y/OpenMakeup` / `feat/open-makeup-arabic-mobile-lifecycle`
- **Latest CI-verified code-bearing HEAD:** `b402cb3d68ba7f5a3f023d54d93419dedf18ff44`; full workflow [40737590458](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40737590458) passed on this exact revision. The later documentation-only HEAD `4ac12e0963f4a7b0a70f1403cdab7b4ffb46f8b4` also passed run [40738255041](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40738255041), with 108/108 tests and both audits at zero vulnerabilities.
- **Latest full CI:** **108/108 tests passed**, zero failures; full and production dependency audits each reported **0 vulnerabilities**; SDK type-check, source/dist local runtime assets, Vite build, Android packaging, debug and unsigned-release APK builds, release metadata/checksums and both artifact uploads passed.
- **Debug artifact:** [Open-Makeup-debug-apk](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40737590458/artifacts/12838835197), ZIP 14,972,389 bytes.
- **Unsigned release candidate:** [Open-Makeup-release-candidate](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40737590458/artifacts/12837274032), ZIP 13,630,732 bytes.
- Stage 10 now includes face-effect/material correctness plus persistence, interrupted camera startup/resume, bounded capture/export and Android I/O safeguards.
- **Remaining gate:** Physical Android 6/7 and broader camera/permission/lifecycle/orientation/capture/storage/share/accessibility/WebGL/thermal tests have not been performed. PR #3 remains open/unmerged; the release APK is unsigned.
- **Roadmap:** Stage 8 redesigned the workspace, Stage 9 adds 3D Liquid Glass motion, and Stage 10 combines effect/material hardening with stability, persistence, camera lifecycle, export and Android I/O/performance safeguards.
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
- All six existing makeup layers, twelve categorized curated looks, clear action and face controls work or show an honest actionable error.
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
- `src/core/camera-capabilities.js`: facing-mode validation, capability checks and defensive camera enumeration.
- `src/core/performance-profile.js`: conservative/balanced camera resolution, antialias and pixel-ratio profile selection.
- `src/core/capture-frame.js`: temporary WebGL render target, top-origin RGBA conversion and mirrored still capture.
- `src/ui/look-presets.js`: twelve data-driven curated looks in four localized groups.
- `tests/stage5-engine.test.js`, `tests/capture-frame.test.js` and `tests/release-readiness.test.js`: camera/performance contracts, image-row orientation and release-readiness checks.
- `tests/runtime-reliability.test.js`: Node built-in runtime reliability tests.
- `assets/models/face.glb`, `assets/shaders/**`, `assets/patterns/**`, `public/mediapipe/**`: bundled runtime/model/shader/pattern assets.
- `android/app/src/main/java/com/magd/openmakeup/MainActivity.java`: WebViewAssetLoader host, permission bridge, external links, camera pause/resume and Back integration.
- `.github/workflows/android.yml`: install, full and production dependency audits, type-check, tests, Vite build, Android asset packaging, debug/unsigned release APK builds, version validation, SHA-256 checksums and artifact upload.

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
**Code revision validated by CI:** 96020600bcb3c72e3681470435bf3d5a0769bc70  
**CI run:** [39853574683](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/39853574683) — 51 tests passed, zero failed; type-check, Vite build, Android asset packaging, APK build and upload passed.  
**APK artifact:** [Open-Makeup-debug-apk](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/39853574683/artifacts/12458157274)

#### Delivered

1. **Shader-backed personalization:** SDK apply(category, { intensity }) validates the inclusive 0–1 range and defaults to 1. The engine maps the value to a real uIntensity uniform on all six existing layer materials; the foundation, blush, lipstick, eyeshadow, eyeliner and mascara fragment shaders use it to scale effect opacity. TypeScript declarations match runtime behavior.
2. **Color and supported finish editor:** a per-category color picker, intensity slider and finish selector are available; finish is disabled for categories that do not support it. Arabic and English include the editor labels and status messages.
3. **Original/applied comparison:** the control temporarily hides the rendered makeup canvas to expose the original camera preview beneath it. It does not clear or rewrite selected engine/session state.
4. **Photo capture:** Stage 4 initially used a preserved drawing buffer. Stage 5 replaces that steady-state GPU cost with a temporary `WebGLRenderTarget`, keeps `preserveDrawingBuffer: false`, converts readback rows to top-origin RGBA and mirrors the exported PNG. Unit tests verify row ordering, while actual device color/mirror orientation remains a physical-device check.
5. **Explicit saving and sharing:** browser mode downloads the PNG and uses Web Share files when available, with download fallback. Android saves through MediaStore on Android Q+ and permission-gated Pictures storage on Android 6–9; sharing uses an app-cache FileProvider URI and an explicit ACTION_SEND chooser. Captured images are not uploaded automatically.
6. **Versioned local state and named looks:** studio state migrates the older unversioned session schema, validates categories/colors/intensity/finish/morph values and avoids overwriting recognized future session versions. Named looks use openMakeupCustomLooksV1, allow at most 100 entries, cap names at 40 characters, prevent case-insensitive duplicates after collapsing repeated whitespace before comparison and isolate corrupt records.
7. **Undo/redo:** bounded 50-step before/after history covers actions wrapped through the studio action runner and committed morph-slider gestures. Applying a saved snapshot reverts to the prior snapshot if an application fails.
8. **Truthful persistence/lifecycle states:** failed named-look writes roll back in-memory save/delete operations instead of announcing success. Stage-4 controls join the camera restart disable/enable gating. Storage permission denial and capture/save/share failures have localized status messages.
9. **Android build identity:** versionCode 5 / versionName 1.4.0; application ID and minSdk remain unchanged. FileProvider configuration is constrained to the local image-sharing cache path.

#### Automated verification

- Added tests/studio-state.test.js for schema migration/validation, future-version rejection, history semantics, custom-look parsing, and a regression proving repeated whitespace cannot bypass case-insensitive duplicate checks.
- Extended tests/effect-contracts.test.js for SDK intensity validation/forwarding and all six engine-uniform mappings.
- Extended tests/accessibility-ui.test.js for the stage-4 controls, comparison/capture/share/history wiring, future-schema protection and camera lifecycle control state.
- CI run [39853574683](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/39853574683) passed **51 tests, 0 failures**, followed by type-check, web bundle, Android asset packaging, debug APK build and artifact upload.
- CI does not verify an actual device camera frame, physical mirror/orientation, legacy storage permission prompts, gallery visibility, system share chooser, face tracking under live lighting or GPU performance.

#### Consolidated physical-device matrix — pending

The combined physical matrix was scheduled after Stage 4 but was **not performed**: this connector session has no attached/configured physical Android device. Stage 5 implementation and CI proceeded without pretending that hardware acceptance passed. Required tests remain: launch/permission denial; repeated pause/resume; front/rear camera switching and duplicate-stream/frozen-preview checks; all six makeup layers and twelve curated looks; face loss/reacquisition; morph/state persistence; portrait/landscape/fullscreen alignment; capture color/orientation/mirroring; gallery save/permission denial; share chooser; WebGL context loss/recovery; and sustained GPU/thermal/resource stability. Record actual model, Android/WebView versions, exact steps and outcomes when a real device is available. This remains the final hardware release gate.

Acceptance criteria status:
- [x] Shader-backed intensity wired to all six layer shaders.
- [x] Color/finish/intensity editor, before/after comparison, capture/save/share path, named looks and undo/redo implemented.
- [x] Versioned state validation and persistence failure handling avoid overwriting recognized future data or showing false success.
- [x] 51 automated tests and full CI build/package/APK/artifact pipeline passed.
- [ ] Physical Android 6/7 regression has not been performed; camera alignment, old-version permission flow, gallery/share behavior and sustained GPU cost remain unverified.
- [ ] Run and document the consolidated Stages 1–4 device matrix before closing the hardware release gate.

### Stage 5 — Camera Switching, Onboarding, Preset Library, Performance and Release

**Status:** Stage 5 source implementation and CI/release-candidate pipeline are delivered. **Physical-device compatibility, camera-switch behavior, and sustained thermal/performance measurement remain unverified**, so a production-release readiness claim is not made.  
**Source implementation revision:** `4be895e51332e647a4e2b3bb457f48567bfbd564`. The source-identical branch head `1607c2d2338981f103b73a8deef5b2fe46f4c86b` also passed the full pipeline in [run 40099405201](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40099405201) — **71/71 tests passed**, both audits reported zero vulnerabilities, local camera/model files were verified before and after Vite, and both APK artifacts uploaded.  
**Release identity:** Android `1.5.0` / versionCode `6`; application ID and minSdk preserved.

#### Delivered

1. **Front/rear camera switching:** the SDK exposes `canSwitchCamera()`, `cameraFacingMode` and `switchCamera('user' | 'environment')`. It checks browser constraint support, creates a replacement MediaPipe camera controller with the requested facing mode, stops/releases the previous stream tracks, waits for video frames to progress, verifies the reported facing mode when the browser exposes it, and attempts rollback to the prior camera after a failed switch. If both the requested switch and rollback fail, the UI attempts local camera recovery/reinitialization before re-enabling tools.
2. **Dismissible first-run guidance:** Arabic-first/English guidance explains permission, framing, lighting and core actions. “Start camera” and “skip guide” both dismiss it; the dismissal is persisted in local storage when available. Escape and Android Back dismiss the modal, focus is contained/restored, and permission still comes from Android/WebView at runtime.
3. **Data-driven preset library:** twelve curated looks, localized in Arabic and English, grouped as Everyday, Soft/Romantic, Bold and Evening. Definitions live in `src/ui/look-presets.js`, include supported layer colors/intensity/finish/pattern choices, validate against the category contract, and apply transactionally with rollback on a failure.
4. **Tracking and graphics recovery:** retains the face-detection live state; WebGL context loss pauses rendering, exposes a recovery status, and attempts to resume camera frames after context restoration. A retry action rebuilds the local engine if automatic recovery fails.
5. **Lower sustained render-buffer cost:** disables persistent `preserveDrawingBuffer`, caps pixel ratio, disables antialiasing and uses 640×480 for constrained devices (≤4 reported logical cores or ≤4 GB reported memory); other devices use a bounded 960×540 profile and at most 1.5 renderer pixel ratio. These are defensive defaults, **not a claim of measured thermal performance**.
6. **Release hardening:** full dependency audit (including development tooling) and production-only audit; TypeScript check, test suite, web build, local runtime asset packaging, Gradle debug plus unsigned release APKs, Android version metadata checks, generated SHA-256 sums, and uploads of debug/release candidate artifacts with the audit report, lockfile and release notes.
7. **Local camera runtime repair:** a deeper file-tree audit found that `index.html` referenced a missing `public/mediapipe/camera_utils/camera_utils.js`. Added an offline first-party adapter implementing the used MediaPipe `Camera` surface, including front/rear constraints, video-frame scheduling, idempotent track cleanup and cancellation of late permission results. Tests exercise these behaviors, and CI checks both source and Vite output asset existence.
8. **SDK/documentation contracts:** JSDoc and TypeScript expose the camera APIs and WebGL context callback. README and release notes distinguish the unsigned release candidate from a signed distribution build.

#### Automated verification

- Latest verified full pipeline on the code-bearing head passed in [run 40102119131](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40102119131) on `0459aaa6e9201cfb9200ca4d65e00f09e6297cc5`: **74 tests, 0 failures**, both audits zero vulnerabilities, SDK type-check, Vite, source/dist camera and model checks, Android packaging, Gradle debug/unsigned-release builds, version metadata, checksum generation and both artifact uploads passed.
- Both the full audit (including development tooling) and `npm audit --omit=dev --audit-level=high` reported **0 vulnerabilities** in the validated report.
- Artifact names: `Open-Makeup-debug-apk` and `Open-Makeup-release-candidate`. The latter contains the unsigned APK, `APK-SHA256SUMS.txt`, `RELEASE_NOTES.md`, full npm audit report and lockfile.
- An unsigned release APK must be signed with the project owner's release key before distribution. CI does not sign or invent a release key.

#### Hardware acceptance — pending / not performed

No physical-device camera test, UI accessibility audit on an actual handset, or sustained thermal test was run in this connector session. A passing CI build cannot demonstrate that a particular Android WebView switches lenses, avoids freezing/duplicate streams, restores after real GPU context loss, aligns effects in all orientations, or remains thermally stable.

| Planned target class | Test focus | Evidence status |
|---|---|---|
| Android 6 / API 23 and Android 7 / API 24–25 with older/low-memory WebView/GPU | Permission flow, local/offline startup, camera constraints, mirror/alignment, storage and share compatibility | **Not tested on device** |
| Mid-range Android with front/rear cameras and 4–6 GB RAM | Switch forward/back repeatedly, tracking reacquisition, background/resume, portrait/landscape and save/share | **Not tested on device** |
| Higher-DPR / newer Android device | High-DPI profile, full-screen composition, WebGL loss/restore, sustained temperature/frame stability | **Not tested on device** |

The matrix above is a **test plan**, not a record of tested devices. Record device model, Android version, System WebView version, steps, expected/actual output and defects when physical access is available.

#### Acceptance status

- [x] Camera-switch SDK API, facing-mode checks, track cleanup, frame progression and rollback implementation.
- [x] Onboarding dismissal persistence and bilingual guidance.
- [x] Twelve validated data-driven looks across four localized groups.
- [x] Conservative/balanced performance defaults; WebGL context-loss callback and recovery path; temporary-target capture tests.
- [x] Full and production dependency audit, type-check, 74-test full suite including camera lifecycle race regressions, web build, debug and unsigned release APK build, checksum generation and artifact upload passed on the validated revision.
- [ ] Physical front/rear switch and failed-switch recovery verified on supported hardware.
- [ ] Sustained performance/thermal impact measured on a defined physical device matrix.
- [ ] Physical portrait/landscape, capture, accessibility, permission, gallery/share and Android 6/7 compatibility checks recorded before a production release.

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

- Latest verified code-bearing HEAD: 0e18bacf2716eca99f72383015bdb580e63ff279; run [40511322876](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40511322876) completed successfully with **87/87 tests**, zero reported vulnerabilities in both dependency audits, TypeScript checks, local runtime asset checks, Vite bundle, Android packaging, debug and unsigned-release APK builds, release metadata/checksum verification and both artifact uploads.
- Stage 8 redesigned the interaction shell: a glass-inspired workspace header, a fixed four-section mobile navigation tied to the existing looks/customize/saved/sculpt panels, accessible focus/keyboard operation, reduced-motion handling and responsive desktop layout.
- The Liquid.png reference was treated as visual inspiration only. The app's rose/pink and purple colors remain the brand palette; the reference's blue/teal palette was not copied.
- PR #3 remains open and unmerged. Do not merge unless explicitly requested.
- Artifacts: debug [12738041479](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40511322876/artifacts/12738041479); unsigned release candidate [12736474787](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40511322876/artifacts/12736474787).
- App identity: Android 1.5.0 / versionCode 6 / applicationId com.magd.openmakeup / minSdk 23. The release candidate is unsigned.
- Physical Android 6/7 and the broader hardware acceptance matrix have not been performed; this remains a release gate.
- Keep CONTINUATION.md, GPT.md and ROADMAP.md synchronized after meaningful changes.
## Stage 6 — Global Font Size Settings and Persistence

**Status:** Implemented and CI-verified on code-bearing head `c2d4ceb8f584ed040df2c957d3b51d7b2c185c70` (run 40505687165; 86/86 tests). This stage was explicitly requested after the original five-stage plan and is tracked separately without rewriting their completion history.

### Scope and behavior

- Add an accessible Settings dialog reachable from the main app header, localized in Arabic and English and respecting RTL/LTR.
- Add a global font-size slider with a default value of **12**, adjustable from 10 to 20 in integer steps, with a visible numeric readout and reset-to-default action.
- Scale numeric `font-size` declarations (including responsive `clamp()`) and numeric CSS `font` shorthand sizes, preserving the source stylesheet at level 12; do not resize camera/video or WebGL dimensions.
- Persist the setting under `openMakeupFontSizeV1`; restore it at startup and safely fall back to 12 when storage is unavailable or the stored value is invalid/out of range.
- Support dialog focus containment/restoration, Escape, backdrop close and Android Back; keep keyboard and touch operation available.
- Add bilingual/accessibility/source-contract regression tests; run the complete test, typecheck, web build, Android package/APK and artifact pipeline.

### Acceptance gates

- [x] Settings dialog, bilingual labels, slider and reset action implemented.
- [x] Default 12 and persisted bounded setting with automatic whole-studio text scaling.
- [x] Keyboard/focus and Android Back close behavior wired.
- [x] Automated regression tests added.
- [x] Full code-bearing CI passed in run 40505687165 with 86/86 tests and all APK/artifact steps green.
- [ ] Physical-device usability/accessibility check remains part of the consolidated hardware matrix; CI is not physical-device evidence.


## Stage 7 — User-Visible Behavior Correctness

**Status:** Implemented and verified by full CI on code-bearing head `c2d4ceb8f584ed040df2c957d3b51d7b2c185c70`.

### Delivered
- [x] Original-mode capture renders the live video plane without makeup/morph/debug layers; switching comparison mode invalidates stale capture data.
- [x] Compare label, title and `aria-pressed` derive from one state and refresh on language changes.
- [x] Font scaling covers numeric `font-size`, responsive `clamp()` and CSS `font` shorthand sizes; user-facing copy describes a size level rather than px.
- [x] Persistence failures are surfaced after actions, undo/redo, morph changes and at startup.
- [x] Escape/Android Back no longer starts the camera as a side effect of leaving first-run guidance.
- [x] Camera direction is claimed as confirmed only when the browser reports the actual facing mode; otherwise the UI says it is unverified.
- [x] The non-lipstick glossy option is hidden when it maps to the same renderer mode as glitter.
- [x] Regression coverage added for capture/visibility restoration, typography scaling, persistence, onboarding behavior and camera-facing verification.

### Verification and remaining gate
- [x] [Run 40505687165](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40505687165): 86/86 tests, 0 failures; full and production audits both reported zero vulnerabilities; type-check, local assets, Vite, Android packaging, debug/unsigned-release builds, metadata/checksums and both artifacts passed.
- [ ] Physical-device camera/capture/storage/accessibility and sustained-performance checks remain pending. CI is not hardware evidence.

## Stage 8 — Full UI and UX Redesign

**Status:** Implemented and verified by full CI on code-bearing head 0e18bacf2716eca99f72383015bdb580e63ff279.

### Delivered
- [x] Added a compact workspace introduction and original liquid-glass-inspired surfaces, layered highlights and depth, using the established pink/rose and purple palette rather than copying the reference image's colors.
- [x] Reworked the workspace visual hierarchy: larger live preview, glass preview/status surfaces, refined editor/preset controls, and clearer spacing and contrast.
- [x] Added mobile bottom navigation for **Looks**, **Customize**, **Saved**, and **Sculpt**. Each item is connected to the existing real section and reflects the selected state; on wider screens, every panel remains available in the full workspace layout.
- [x] Added keyboard navigation between mobile sections, bilingual labels, explicit panel associations, visible focus, touch-sized controls and reduced-motion handling.
- [x] Preserved existing IDs and action wiring for camera switch/fullscreen, presets, makeup layers, compare/capture/save/share, undo/redo, custom looks, advanced morphs, settings and onboarding.
- [x] Added a regression test for preserved rose/purple colors, mobile navigation, panel associations, bilingual labels and keyboard/reduced-motion behavior.

### Verification and remaining gate
- [x] [Run 40511322876](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40511322876): 87/87 tests, 0 failures; full and production dependency audits each reported zero vulnerabilities; typecheck, local asset checks, Vite, Android packaging, debug and unsigned-release builds, metadata/checksums and both artifact uploads passed.
- [ ] Physical-device visual usability and accessibility checks remain pending. CI does not prove behavior on real Android/WebView versions.

### Stage 9 — 3D Liquid Glass Experience and Animation

**Status:** source implementation and full automated CI verified on code-bearing HEAD `1fe59559ffa9d4795f23df097b3e97b5b32e47c1`; workflow [40701117560](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40701117560) passed.

- Preserves Open Makeup's rose/pink and purple colors, Stage 8's four-tab navigation, and existing camera/effect/state/capture APIs.
- Adds bounded pointer-driven 3D tilt (fine pointers only), moving highlight coordinates, glass depth/shadow response, and pointer-leave reset.
- Adds subtle desktop ambient gradient drift and decorative sparkle/glow; keeps mobile ambient effects static to limit graphics work, with short entry motion when switching mobile workspace panels.
- Honors `prefers-reduced-motion` both in CSS and at runtime; never treats touch movement as tilt. No new dependencies, remote assets or sensors.
- CI log confirmed **91/91 tests passed**, both dependency audits reported 0 vulnerabilities, TypeScript/source assets/Vite/Android packaging/debug and unsigned release builds/checksums/uploads all succeeded.
- Debug artifact [12822525083](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40701117560/artifacts/12822525083) (ZIP 14,969,610 bytes); unsigned release candidate [12821667719](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40701117560/artifacts/12821667719) (ZIP 13,628,657 bytes).
- Physical-device Android/WebView rendering, assistive technology and sustained GPU/thermal behavior remain outside CI and are still unverified.


### Stage 10 — Stability, Persistence, Camera, Export and Android Performance

**Status:** latest code-bearing HEAD `b402cb3d68ba7f5a3f023d54d93419dedf18ff44`; full CI [40737590458](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40737590458) passed with 108/108 tests. This supersedes the initial Stage 10 checkpoint.

#### Effect and resource correctness
- All seven material loaders dispose any acquired textures on subsequent shader/texture failure and propagate the original load failure.
- Per-category asynchronous generations prevent stale color/pattern operations from overriding newer selections; clear and dispose cancel pending work.
- Soft-focus blur resolution tracks intrinsic camera-frame size and ignores invalid zero/missing video metadata.
- Regression coverage verifies all 12 curated looks reference real bundled pattern assets in the right category.

#### Persistence and camera lifecycle
- Session persistence coalesces rapid changes with a bounded 180 ms debounce, and flushes the newest pending value on commit/background/page exit. Versioned data is normalized, and future schemas are not overwritten.
- Engine initialization records a lifecycle generation and aborts after asynchronous model/material loading if the host stopped the engine, before face/camera startup.
- Android onStop cancels interrupted startup and gates restart until the Activity resumes; onPause is not treated as full backgrounding, avoiding confusion with the system camera permission prompt.
- Camera recovery validates live tracks and advancing video frames; camera switching attempts rollback if the requested facing mode fails. UI does not claim verified facing mode when runtime evidence is unavailable.

#### Capture/export and Android performance
- Capture uses a temporary render target rather than preserveDrawingBuffer, with native limits of 1920 pixels per dimension / 2.5 million total pixels and browser limits of 2560 / 6.5 million.
- Android bridge independently rejects malformed or oversized PNG payloads above 4 million pixels.
- Legacy Android gallery-save writes run on a worker thread instead of the UI thread; bitmaps are recycled and failures reported to the web UI.
- Partial/failed gallery and share files are removed; the share cache is bounded to 10 images and 7 days.
- Regression tests cover debounce/flush/cancel, portrait/landscape memory limits, initialization canceled while loading, Android resume gating, background-thread save, failed-file cleanup and cache bounds.

#### Verified CI and release gate
- Run [40737590458](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40737590458): **108/108 tests passed**, full and production dependency audits reported 0 vulnerabilities, typecheck/source assets/Vite/Android packaging/debug+unsigned release builds/metadata/SHA-256/uploads passed.
- Debug artifact [12838835197](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40737590458/artifacts/12838835197) (ZIP, 14,972,389 bytes); unsigned release-candidate artifact [12837274032](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40737590458/artifacts/12837274032) (ZIP, 13,630,732 bytes).
- **Still pending:** physical Android 6/7 camera permission and resume, device rotation, real image save/share, face alignment under motion/lighting, accessibility, sustained WebGL/GPU performance and thermal testing. CI does not substitute for hardware testing. PR #3 remains open/unmerged and release artifact unsigned.


## Stage 10 review follow-up — Android share-cache bound (CI verified)

- Source review found that pruning the share cache *before* writing a new PNG could retain 10 old files and then add an 11th. The code now writes first, protects the new target, removes stale/overflow files while retaining at most nine other images, and deletes the target when FileProvider/chooser startup fails.
- Regression coverage now checks the protected-target policy, post-write pruning order, ten-image ceiling and failed-handoff cleanup. The previous source-contract test was updated to the new method signature after the first CI run caught that expected test contract mismatch.
- Fix commit: [0d2953e](https://github.com/majd7772233-a11y/OpenMakeup/commit/0d2953e395c6aaf4f6ac66e57da2da81ebd21080). Test-contract follow-up / code-bearing HEAD: [b402cb3](https://github.com/majd7772233-a11y/OpenMakeup/commit/b402cb3d68ba7f5a3f023d54d93419dedf18ff44).
- Full pipeline [40737590458](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40737590458) passed on the exact HEAD: **108/108 tests**, 0 failures; full and production dependency audits both reported 0 vulnerabilities; typecheck, assets, Vite, Android packaging, debug and unsigned release builds, metadata/checksums and uploads passed.
- Debug [artifact 12838835197](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40737590458/artifacts/12838835197), ZIP 14,972,389 bytes, SHA-256 `0c4a198144ccadbef46c12af314d6f0a9e27f9465180eeb765d140ec83cba875`. Unsigned release candidate [artifact 12837274032](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40737590458/artifacts/12837274032), ZIP 13,630,732 bytes, SHA-256 `4fe996ec2a99b672f49a35347730737f6900ccaff7e7d7cd23a955079aaf0f58`.
- Physical Android 6/7 camera/storage/share, accessibility, sustained GPU and thermal tests remain **not performed**. PR #3 remains open/unmerged; the release candidate is unsigned.

## Current checkpoint — 2026-10-29

- Latest verified code-bearing HEAD: `b402cb3d68ba7f5a3f023d54d93419dedf18ff44`, workflow [40737590458](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40737590458), 108/108 tests, both audits at zero vulnerabilities, Android debug and unsigned release artifacts uploaded.
- Latest verified documentation-only HEAD before this sync: `4ac12e0963f4a7b0a70f1403cdab7b4ffb46f8b4`, workflow [40738255041](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40738255041), 108/108 tests and successful artifact uploads.
- Hardware release gate remains pending: physical Android 6/7 camera permission/resume, rotation, real save/share, face alignment, accessibility, sustained GPU performance and thermals. PR #3 remains open/unmerged; release APK unsigned.
- This documentation-only refresh triggers a fresh CI run; verify its live result before claiming this revision passed.

## Stage 10 acceptance follow-up — startup lifecycle races (2026-10-29)

- **Resolved in code:** startup now revalidates host-stop generation, browser visibility and native background state after asynchronous session restoration and before publishing engine readiness. Stale startup is stopped and detached without discarding the retry signal.
- **Resolved in code:** ordinary browser visibility return clears the browser-only background marker so an interrupted startup can retry. Android retains native `onResume` control to avoid confusing the camera permission prompt with a full background transition.
- Added regression tests to `tests/stage10-stability-export.test.js`; latest code/test HEAD `97b6ea132e0e51f4cecf93a3707efbc93b78bdf3` passed [workflow 40924643713](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40924643713) with 110/110 tests, zero failures, both dependency audits at zero vulnerabilities and successful web/Android build, metadata, checksum and artifact steps.
- Artifacts from that exact head: [debug ZIP 12919048404](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40924643713/artifacts/12919048404) (14,972,391 bytes; SHA-256 `d8e47bbf03238aa451cb1192ed2babee99c832833fdb880988797c88eccc38c8`); [unsigned release ZIP 12918728789](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40924643713/artifacts/12918728789) (13,630,754 bytes; SHA-256 `b93122fe38b7a4bb8ba7f49970c8c2c0bd806aa8fd4096660e63686f23cfd204`).
- Device acceptance remains a release gate—not verified by automation: Android 6/7 permission/resume, front/back camera and orientation, real gallery/share outputs, face alignment, accessibility and sustained GPU/thermal behavior. PR #3 remains open/unmerged, and release APK unsigned.
- This documentation-sync commit starts a fresh Actions run; verify its result separately.

