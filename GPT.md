# GPT.md — Open Makeup Engineering Notebook

**Canonical restart file:** [CONTINUATION.md](./CONTINUATION.md) — strict rules, exact branch position, CI state and release gate. Read first in a new conversation.
**Code implementation revision:** 4be895e51332e647a4e2b3bb457f48567bfbd564.
**Last live branch checkpoint before this documentation update:** 4789bcc6ca6a8c3b9deb21607674f56d0186b9e3. Latest complete run 40097778274 passed 71/71 on parent docs-only commit edcc7f73f0a3ee9adc7175fb811312cd7fc1c73f. Run 40098001152 was in progress on 4789 during APK build; re-fetch latest Actions after this commit.


**Canonical restart file:** [CONTINUATION.md](./CONTINUATION.md) — exact branch/checkpoint, rules and next action. Read it first when continuing in a new conversation.


**Last updated:** 2026-10-24  
**Repository:** https://github.com/majd7772233-a11y/OpenMakeup  
**Working branch:** `feat/open-makeup-arabic-mobile-lifecycle`  
**Stage 5 code revision:** 4be895e51332e647a4e2b3bb457f48567bfbd564  
**Latest complete pipeline:** [Run 40097778274](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40097778274) on docs-only descendant edcc7f73f0a3ee9adc7175fb811312cd7fc1c73f — 71 tests passed, 0 failed; full and production audits reported 0 vulnerabilities; type-check, tests, Vite, local source/dist assets, Android packaging, debug and unsigned release builds, metadata, checksums and uploads passed.
**Latest debug artifact:** [Open-Makeup-debug-apk](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40097778274/artifacts/12561413416) — ZIP 14,959,770 bytes; ZIP SHA-256 d838bcbe83df2c91e7d8eaab0fbdccf53881e07485ae66dacf7a213184d27a63.
**Latest unsigned release candidate:** [Open-Makeup-release-candidate](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40097778274/artifacts/12561343806) — ZIP 13,621,519 bytes; ZIP SHA-256 f2caac39f412f2849505490ddb72a0f159ce4c6fd9189a3f050b494bd5be9238.
**Local camera asset correction:** deeper tree inspection found that the HTML pointed to a camera utility file that was not checked into the repo. A first-party offline Camera adapter is now bundled and covered by lifecycle tests; CI verifies both the source and built asset.  
**Implementation-specific rollback regression run:** [39866096959](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/39866096959) verified the camera rollback recovery and its additional assertions before the local-camera audit.  
**Related PR:** [#3](https://github.com/majd7772233-a11y/OpenMakeup/pull/3), still open/unmerged.  
**Mandatory execution protocol:** [Promt.txt](https://github.com/majd7772233-a11y/gpts/blob/main/Promt.txt)

## 1. Project Intent and Non-Negotiable Requirements

Open Makeup is an offline-capable virtual makeup web/Android app built around Three.js WebGL effects and MediaPipe FaceMesh. The UI must be Arabic-first with persistent English switching, responsive on phones/tablets, polished but not cramped, and truthful about engine behavior. Camera and face processing must remain on-device.

The product is judged by visible user behavior, not only build output. A visible operation must work or return a useful failure; camera startup/resume, tracking loss, session persistence and effects correctness are part of product quality.

The user's workflow requires complete stage execution rather than partial delivery. Keep `ROADMAP.md` and `GPT.md` synchronized and in English. Never claim a test/device check that was not actually performed.

## 2. Current Technical Environment

- Web app/SDK: JavaScript ESM, Vite 8, TypeScript 5.9 declarations/type-check, Three.js 0.184, MediaPipe global-script packages.
- Android host: Java, AndroidX WebKit 1.12.1, Gradle 8.9 in CI.
- CI runs Node 22; `npm install`, full and production dependency audits, `npm run typecheck`, `npm test`, `npm run build`, embeds `dist/` into Android assets, builds both debug and unsigned release APKs, verifies version metadata, emits APK SHA-256 checksums and uploads debug/release/audit artifacts.
- Package ID: `com.magd.openmakeup`; minimum Android API 23; compile/target SDK 35.
- Android host loads `https://appassets.androidplatform.net/assets/www/index.html` via `WebViewAssetLoader`, restricts camera permission to the local origin and forwards camera pause/resume and Back.
- Runtime assets: `assets/models`, `assets/shaders`, `assets/patterns`, `public/mediapipe`.

## 3. Architecture and Ownership

- `index.html`: responsive UI, translated labels, preview, camera-retry action, About dialog and fullscreen controls.
- `main.js`: UI orchestration, localization, camera recovery, versioned session/named-look persistence, layer personalization, before/after comparison, capture/save/share and history.
- `src/ui/studio-state.js`: versioned state normalization/migration, custom-look validation and bounded undo/redo history.
- `src/ui/locales.js`: Arabic/English dictionaries and safe string/count interpolation, imported by the app and directly covered by tests.
- `src/OpenMakeup.js`: public SDK wrapper, category/color/finish/pattern handling and morph APIs.
- `src/categories.js`, `src/morphs.js`, `src/config.js`: category/default definitions, morph mapping and asset URLs.
- `src/core/MakeupEngine.js`: render scene, camera/video texture, GLTF/material orchestration, MediaPipe, effect layers, morphing, lifecycle and disposal.
- `src/core/FaceMeshModelController.js`: awaitable GLTF model loading and face landmark fitting.
- `src/core/FaceNurbsModelController.js`: eyeliner/mascara NURBS geometry.
- `src/core/materials.js`, `src/core/faceWarpMaterial.js`: GLSL/texture loading.
- `src/core/cameraReadiness.js`: live-track and repeated-frame progression checks.
- `src/core/camera-capabilities.js`: facing-mode validation and camera enumeration.
- `src/core/performance-profile.js`: bounded camera resolution, renderer pixel ratio and antialias selection.
- `src/core/capture-frame.js`: temporary WebGL render target and top-origin/mirrored RGBA-to-PNG capture.
- `src/ui/look-presets.js`: twelve data-driven, bilingual curated-look definitions.
- `tests/runtime-reliability.test.js`: Node test runner tests for startup, camera readiness, cancellation, and truthful SDK error paths.

## 4. Runtime Contracts

### Initialization

The model is loaded exactly once by `MakeupEngine._loadFaceAndMaterials()`. `FaceMeshModelController.loadModel()` returns a shared Promise and rejects for unavailable/invalid model data. Shader fetches check HTTP status. Texture/material loaders are awaited; fulfilled material resources are disposed if another required material load fails.

Engine startup awaits MediaPipe configuration and camera startup with a timeout. Lifecycle generation changes invalidate camera starts that complete late after stop/disposal, and any late stream is stopped/detached. The app then confirms at least two observed advances of `video.currentTime` before enabling controls. For layout, `src/core/videoLayout.js` computes a shared video/canvas rectangle: cover in normal preview and contain in fullscreen, with both layers retaining the same mirror transform.

The bundled `patterns.json` manifest is required for this studio build. A missing/invalid manifest fails initialization and disposes the running engine instead of leaving quick looks/pattern actions broken after a false-ready status.

### Makeup effects and advertised patterns

`OpenMakeup.apply()` requires successful initialization. It loads any requested pattern before activating the layer and propagates failures. `MakeupEngine.setAR()` validates material/mesh readiness and does not swallow errors.

The SDK supports bundled masks for blush, eyeshadow, eyeliner and mascara only (69 files: 4 blush, 49 eyeshadow, 12 eyeliner, 4 mascara). Foundation and lipstick entries are empty because their placeholders lacked dependable category-specific mapping; the API returns no options and rejects direct pattern attempts for those categories. Do not restore the entries without real masks, shader/UV mapping and tests. Manifest validation enforces category support, numeric IDs, exact asset paths and `bundled: true`.

### Face tracking and layer visibility

Selected effect layers (`_activeLayers`) are separate from tracking state (`_faceVisible`). Three consecutive results without landmarks hide face-attached effects but keep selection state. When tracking returns, selected layers reappear. This includes NURBS-based eyeliner/mascara meshes, which live directly in the scene rather than under the face group.

### Camera lifecycle and local session

`waitForCameraFrames()` requires a live enabled video track and two observed `currentTime` increases. This avoids treating a single late frame as proof that a frozen preview recovered.

When the app backgrounds, both DOM visibility handling and native `MainActivity.onPause()` call `window.handleOpenMakeupPause()` once the studio is ready; that stops the engine camera and detaches tracks. Native resume calls `window.handleOpenMakeupResume()`, which tests new frame progression and invokes controlled recovery when needed. It never blindly reloads the page.

Local storage key `openMakeupSessionState` stores:
`{ makeup: { [category]: options }, morphs: { [targetName]: number }, activeLook: string|null, wireframe: boolean, blur: boolean }`.
Language uses `openMakeupLanguage`. Recovery restores effect options/morphs/toggles and updates selection states. Quick-look application awaits every concurrent layer operation; on any failure it waits for all operations to settle before rolling back, preventing late effects from applying after rollback.

## 5. Defects Confirmed at the Initial Stage-1 Audit

1. Face-model loading started in both the controller constructor and engine initialization.
2. Engine initialization resolved when the model arrived while material/shader/texture loaders were still running.
3. GLTF model failures had no rejection path.
4. Shader HTTP errors could be treated as shader source and texture failures did not reject startup.
5. Layer activation and pattern errors were swallowed, creating false success indications.
6. Eye-shadow shimmer mode 7 used `_noise = 7` instead of the corresponding `0.7` scale.
7. Missing-face frames didn't hide stale face-attached effects.
8. Resume only checked track state/readyState and could reload away the current look.
9. Startup failure had no retry action, and UI state did not survive a recoverable restart.
10. There was no focused runtime test suite.
11. Concurrent preset failure could roll back before all pending layer actions finished.
12. Lipstick pattern assets were advertised despite lacking a renderer mapping.

## 6. Stage-1 Change and Validation History

### Code commits on the active branch

- `fcf83bc6a314cb30f1b2e87e6fd1d89bc76a2e7e`: one explicit promise-based model load; shader/texture loaders report failures.
- `e99f77fa49af3d3e743e13dcf3b46de9acc7c914`: awaited model/materials, truthful layer state, tracking-loss hiding and corrected shimmer scale.
- `1918925ff22a5c66bf01bbb208d428bc61db9c28`: SDK failure propagation and camera frame-readiness helper.
- `19cc753e0bf0f1f047b5a6d5e69d6cfd820f642d`: retry UI and initial tests wired into CI.
- `042651ebc59d05b797a40eefc5d70f69c6669c69`: frame-verified recovery/session preservation; its Vite build exposed duplicate lifecycle declarations.
- `9dabba92c57100213942b8f5e49e4b1879a9ef9f`: fixed duplicate lifecycle declarations and stopped acquired tracks if startup fails.
- `eb1c6093b29f434db908aee9b7bf487c425b4aea`: native resume frame check and visible active-preset style.
- `2242f261ca924b599afec72235fa29aa5827f8c0`: created the original roadmap and engineering notebook.
- `342275f2cabbf52c7634ffbcfd020ffa3970bf9e`: stronger multi-frame verification, native pause hook, and single-frame-then-freeze regression test.
- `0f53acea593da775254e5a7ea94bbb62d6ed3840`: return/type the asynchronous SDK camera-start promise.
- `d72db3cfe25910ba2a317da8eff0c53c89c92834`: invalidate late camera starts after stop/disposal.
- `68e8b259ae15f00ad54c439e7a9c5bb3d843bc82`: add a regression test for cancelled late camera startup.
- `f2d0ddb852c358b8754bf47cb0830565d4f8480f`: dispose fulfilled materials when a required parallel material load fails.
- `9212756663c6df511cf86a4fb0474eb6f05255a6`: reject missing/malformed pattern manifest and test cleanup.
- `a2b3c90ac038044a31547b119f863a621bd0afe2`: wait for all quick-look layers to settle before rollback.
- `0f4590431e168976c3c2605ce4c14dd09b82156e`: stop advertising unsupported lipstick patterns; document async start and pattern limitation.

### Automated verification

- CI run [39675435438](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/39675435438) completed successfully on code revision `0f4590431e168976c3c2605ce4c14dd09b82156e`, including eleven Node tests, SDK type-check, Vite bundle, Android debug APK build and artifact upload.
- An earlier run failed only because Vite found duplicate `resumeInProgress`/`hiddenAt` declarations; that regression was fixed and the later run above passed.
- The eleven Stage-1 tests cover manifest failure/cleanup, track readiness, progressing/stalled frames, single-frame-then-freeze, ended tracks, late start cancellation, SDK startup promises and truthful errors.
- Stage 2 added 21 tests in `tests/effect-contracts.test.js` for real manifest files, GLB UV/morph mappings, finish uniforms, layer mappings, pattern resets/disposal/races, invalid inputs, morph UI/API and preview layout. CI run [39680109245](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/39680109245) passed all 32 tests, type-check, Vite build, Android packaging, APK build and artifact upload on revision `a3f4f89a5e40c9a26ea882b58185057b5cb2f743`.
- CI does not simulate real Android WebView, GPU shader appearance or a physical camera. By user request, physical Android 6/7 tests for Stages 1–4 will be run together after Stage 4, before Stage 5; until then hardware-specific behavior stays marked unverified.

## 7. Stage-2 Effect and Face-Control Changes

### Source commits
- `068b14a320214dd3a4ddd7c0f7bcfd17e0eb29d2`: reconciled manifest, docs catalogue and README with 69 real local pattern masks; removed placeholder foundation/lipstick entries.
- `2e4caeca317ee28650df599fc654796d102495e5`: validated finish uniforms, added camera-position synchronization, foundation finish rendering, and custom-pattern reset/disposal.
- `41abb5f76a618ab7671e70cc7636c047cc2a3fed`: strict SDK validation for manifest/color/finish/pattern IDs; typed explicit `patternId`; everyday morph UI limited to friendly controls; initial effect tests.
- `efe787839e7a9ee997017818efb66373ab4e8e2d`: expanded GLB, material, pattern and layer-clearing tests; float assertion corrected afterward.
- `a7f49c77019bdc23f088c415b6ff71b484899710`: added the missing foundation `_noise` material uniform.
- `22ef63649ca7096f829b2876033a4181c26a2a5a`: applied Float32 tolerance in morph assertions.
- `439a09f66985c85ff6e0b9cb8ef30c432f15556d`: made async pattern changes latest-wins and disposed late superseded textures.
- `cb6731fde8dd90668e7bdc4e2eb4534debf7fd4d`: shared cover/contain calculation for normal/fullscreen video-canvas alignment.
- `a5fcc28287b2a6214d52c7c9a99a3e327c0640df`: strict hex validation, explicit pattern-ID tests, and SDK pattern documentation.
- `a3f4f89a5e40c9a26ea882b58185057b5cb2f743`: exported common morph bounds (-1..1.5), enforced them in engine/UI/session restore/TypeScript, and added boundary regression assertions.

### Current effect contracts
- Only blush, eyeshadow, eyeliner and mascara advertise patterns. Foundation/lipstick remain unsupported until real assets and renderer mappings exist.
- `pattern` is a 1-based visible list position; `patternId` names a specific ID returned by `getPatterns()`. Unknown IDs, path-like values, unsupported categories and invalid manifest records reject.
- Custom textures reset on reapply/clear, replacements are disposed, and stale async loads cannot overwrite newer selections.
- Foundation/blush/eyeshadow finish modes set `_noise` to 0, 0.7 or 1; foundation declares and consumes the uniform. Lipstick modes set `_shine`/`_bright`; unsupported finish values reject.
- Eight friendly morph controls map to real GLB targets; raw extra targets are not exposed in the regular UI. `MORPH_WEIGHT_MIN = -1` and `MORPH_WEIGHT_MAX = 1.5` are exported from the SDK entry point; engine calls outside the interval reject, while UI inputs and restored values use the same constants.
- `videoLayout.js` ensures normal cover and fullscreen contain use consistent video/canvas geometry. Physical visual alignment is deferred.

### Validation evidence
- CI [run 39680814807](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/39680814807): 32 tests passed, zero failures; type-check, Vite bundle, Android packaging, debug APK and artifact upload passed.
- Target-device camera/shader appearance/performance tests are deliberately batched until after Stage 4. Do not describe them as passed before an actual device matrix is executed.
- Next stage: Stage 3 — Complete Mobile UI/UX, Localization and Accessibility. Total roadmap stages: **5**.

## 8. Stage-3 Mobile UI, Localization and Accessibility Changes

### Source revisions and scope
- `a58e52614ff33fbb9a51628b7ff43626823f4fe5`: reorganized the mobile first-run path, extracted locale strings, localized runtime copy, introduced face-tracking UI, focus-managed About dialog, responsive/accessibility CSS and localized error categories.
- `89ca2ae7ab45997ac7e5846b9d9b3110c759e6cf`: added the typed `onFaceTrackingChange` SDK option and engine callback for stable face/no-face transitions, 9 UI/accessibility tests, and Android version 1.3.0.
- `9d9029a0e397627c624d49294d1f835808de2a12`: corrected the Android Back test to inspect the actual `window.handleAndroidBack` host bridge. The previous test failed because it expected a function declaration while the app intentionally exports a window arrow callback.
- PR #3 remains open and unmerged.

### Behavior contracts delivered
- The home path emphasizes live preview, quick looks and makeup categories; optional sculpt/mesh/blur options sit inside native `details/summary`.
- `src/ui/locales.js` exports `dictionaries` and `translate(language, key, values)`. Tests assert both locales exist for every HTML `data-i18n`, `data-i18n-title` and `data-i18n-aria` key. Dynamic locale switching updates `lang`, `dir`, title/description and live UI labels.
- Status messages use classified localized categories. Raw engine exception text is logged for diagnosis but not shown in the main status region.
- Face tracking reports a detected state on stable detection, waits through three missing-face results before reporting loss, and suppresses repeated identical notifications. A consumer callback cannot crash the render callback.
- About dialog captures/restores opener focus, traps Tab/Shift+Tab, closes on Escape/Android Back and locks body scrolling while open.
- Skip navigation, semantic headings, visible keyboard focus, separate polite status live regions, 44px touch controls, narrow/short-landscape styles and `prefers-reduced-motion` support are present.
- Android app version is `1.3.0`; application ID and minSdk are unchanged.

### Validation evidence
- CI [run 39833650293](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/39833650293): **41 tests passed, 0 failed**, SDK type-check, Vite build, Android asset packaging, debug APK build and artifact upload passed.
- This is source/CI verification, not an assistive-technology or physical-device audit. Installed WebView/GPU behavior, touch feel, screen-reader output and device contrast stay unverified.
- The combined Stages 1–4 physical-device matrix did not happen before Stage 5 because no device/runner is connected. Keep it as an open pre-release gate and run it as one batch when hardware is available.
- Next eligible stage: Stage 4 — Personalization, Color/Strength, Capture and History. Total roadmap stages: **5**.

## 9. Stage-4 Personalization, Capture, Local Looks and History

### Current revision and verification
- Code revision: 96020600bcb3c72e3681470435bf3d5a0769bc70.
- CI [run 39853574683](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/39853574683) passed **51 tests, 0 failures**, TypeScript type-check, Vite build, Android asset packaging, Gradle debug APK and artifact upload.
- Artifact: [Open-Makeup-debug-apk](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/39853574683/artifacts/12458157274), 14,952,886 bytes; SHA-256 a64042d50bff5b7ca07cca91178268c57176ec38f921773011affb8b07f774fe.
- Android versionCode 5 / versionName 1.4.0; package id and minimum SDK unchanged.

### Implementation
- OpenMakeup.apply(category, { intensity }) validates finite intensity 0–1 (default 1), forwards it to MakeupEngine.setIntensity and returns it in the applied result. The engine requires a real uIntensity uniform mapped to foundation, blush, lipstick, eyeshadow, eyeliner and mascara; all six fragment shaders use it to scale effect alpha.
- A per-layer category/color/intensity/finish editor has Arabic/English labels and disables finish for categories without finish support. Before/after hides the makeup renderer without changing the selected look.
- Capture renders a fresh scene and exports a capped-size mirrored PNG preview. Android save uses MediaStore on Android Q+ and permission-gated Pictures storage on API 23–28. Android sharing writes to app cache and opens an explicit FileProvider ACTION_SEND chooser. Browser saves download the photo; file sharing uses Web Share when available, with a download fallback.
- Custom looks use the openMakeupCustomLooksV1 schema, max 100 records and names up to 40 characters. Studio sessions migrate the previous unversioned schema. Corrupt records are isolated, recognized future schemas are not overwritten, and failed save/delete attempts roll back in-memory changes. A Stage-4 audit also fixed duplicate-name detection to collapse repeated whitespace before case-insensitive comparison.
- Undo/redo stores up to 50 snapshots and restores makeup/morph/toggles together, reverting when applying a snapshot fails. Stage-4 controls participate in camera lifecycle disable/re-enable handling.
- preserveDrawingBuffer is enabled for photo capture and may impose GPU/memory cost. Measure sustained impact on real devices; CI cannot validate performance.

### Device acceptance boundary
- No physical Android 6/7 test has been run or is claimed. This connector session has no attached physical handset or configured physical-device runner.
- Pending matrix: first launch and permission denial; pause/resume cycles; all six layers/quick looks; tracking loss/reacquisition; morph controls/state restoration; portrait/landscape/fullscreen alignment; capture mirror/orientation; gallery save and permission denial; share chooser; and sustained GPU/resource stability.
- Record the actual model, Android and System WebView versions, exact steps/results and defects when a device is available. This remains the open hardware release gate.

## 10. Build and Test Commands

- `npm install`
- `npm audit --json` (full tree, including development dependencies)
- `npm audit --omit=dev --audit-level=high` (production dependencies)
- `npm test`
- `npm run typecheck`
- `npm run build`
- CI packages web assets into Android, runs `gradle --no-daemon -p android assembleDebug assembleRelease`, validates version metadata, writes `APK-SHA256SUMS.txt`, and uploads `Open-Makeup-debug-apk` plus `Open-Makeup-release-candidate`.

## 11. Permanent Engineering Rules

- Never store tokens/passwords/private keys in this repository or either memory file.
- Don't claim functionality from class existence, green compilation, or a swallowed SDK error.
- Inspect all call sites after changing lifecycle/API contracts.
- Don't silently ignore unsupported effects; remove them from advertised choices or implement them correctly.
- Never blindly reload the app to recover camera; preserve local session state.
- Distinguish automated verification from physical-device verification.
- Update both `ROADMAP.md` and `GPT.md` after implementation and test results.

## 12. Exact Resume Procedure

Read [CONTINUATION.md](./CONTINUATION.md) first. It is the canonical handoff with the strict rules, latest CI evidence, artifact IDs, exact branch and remaining physical-device gate.

1. Start immediately with GitHub calls; no greeting, generic preamble or repeated questions.
2. Fetch the live branch HEAD, PR #3 and latest Actions status/logs/artifacts. Do not assume the historical SHA remains HEAD.
3. If current-head CI is green, do not reimplement Stages 1–5. The remaining release gate is consolidated physical Android 6/7 and other device acceptance, documented in CONTINUATION.md.
4. If a live check fails, inspect actual logs, fix the root cause on this branch, add regression coverage and verify a newer successful run.
5. Keep PR #3 open/unmerged; preserve local-only processing and do not claim physical tests from CI.
6. Keep CONTINUATION.md, GPT.md and ROADMAP.md synchronized after meaningful changes.

## Stage-5 Implementation and Release-Candidate Record

### Implemented

- SDK API: `canSwitchCamera()`, `cameraFacingMode` and `switchCamera('user' | 'environment')`. Switching creates a new MediaPipe camera controller, stops old tracks, waits for frame progression, validates observed facing mode when exposed by the browser, and attempts rollback. If switching and rollback both fail, the UI attempts local stream recovery/engine restart before enabling studio tools.
- First-run guidance: Arabic-first/English, permission/framing/lighting/core-tool hints, dismissible with start or skip buttons, persistent dismissal when storage is available, Escape/Android Back and focus management.
- Presets: twelve maintainable data-defined looks in four localized groups, with category-validated shader settings and rollback if a layer fails.
- Performance/resilience: conservative 640×480/DPR≤1/no antialias for constrained detected devices, balanced 960×540/DPR≤1.5 otherwise; live renderer uses `preserveDrawingBuffer: false`; photo capture uses a temporary WebGL render target; WebGL context loss/restoration triggers statuses and camera-recovery path.
- Local camera utility: a first-party offline adapter supplies the Camera API surface referenced by `index.html`; it handles facing-mode constraints, decoded-frame scheduling, stop/track cleanup and late permission cancellation. CI checks the file before and after Vite packaging.
- Release pipeline: full npm dependency audit and production-only audit, TypeScript, 71-test suite, Vite bundle, Android asset checks, Android packaging, debug plus unsigned release APKs, version/code checks, SHA-256 sums, artifact upload, full audit report and locked package metadata in the release-candidate artifact.

### Automated evidence

- [Run 40097038958](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40097038958): 71 tests passed, 0 failed; both full and production audits reported zero vulnerabilities; type-check, source/dist local runtime asset checks, Vite build, Android packaging, Gradle debug/unsigned-release builds, metadata, checksum generation and both artifact uploads passed.
- Both full and production dependency audits reported zero vulnerabilities in that run. Artifact ZIP digests and the APK checksum file are attached to the linked artifacts.

### Explicitly not verified

- No physical Android device has been exercised here. Actual camera switching and rollback, repeated camera resume, Android 6/7 permission behavior, screen reader/contrast, capture mirror and color, gallery/share, WebGL recovery under real GPU resets and sustained thermal/frame stability remain unverified.
- Runtime-derived resolution/antialias settings are defensive defaults. They are not benchmark measurements. The test matrix in ROADMAP.md is a plan, not proof that named devices have passed.
- The release APK is unsigned; never generate or commit the owner's signing key.
