# GPT.md — Open Makeup Engineering Notebook

**Canonical restart file:** [CONTINUATION.md](./CONTINUATION.md). Read it first whenever a new conversation says “continue where we stopped”; it contains the strict rules, exact stop point, CI evidence and pending release gate.

- **Repository:** https://github.com/majd7772233-a11y/OpenMakeup
- **Working branch:** `feat/open-makeup-arabic-mobile-lifecycle`
- **Latest CI-verified code/test HEAD:** [`b3ee9d7`](https://github.com/majd7772233-a11y/OpenMakeup/commit/b3ee9d701cebc3caf241655989040950bcb33903) — [workflow 41045980672](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/41045980672) passed on that exact revision.
- **Latest full CI:** **132 tests passed, 0 failed**; full and production dependency audits each reported 0 vulnerabilities; type-check, local assets, Vite, Android packaging, debug/unsigned-release builds, metadata/checksums and both artifact uploads passed.
- **Debug artifact:** [Open-Makeup-debug-apk](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/41045980672/artifacts/12971749685), ZIP 14,973,258 bytes.
- **Unsigned release candidate:** [Open-Makeup-release-candidate](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/41045980672/artifacts/12972228387), ZIP 13,631,885 bytes. The release ZIP includes `APK-SHA256SUMS.txt`.
- **Stage 10 review follow-up:** the code/test commit adds checks for stale camera recovery across native host-stop/resume races.
- **Android identity:** 1.5.0 / versionCode 6 / applicationId `com.magd.openmakeup` / minSdk 23.
- **PR #3:** https://github.com/majd7772233-a11y/OpenMakeup/pull/3 — open and unmerged.
- **Device acceptance:** not performed. Physical Android 6/7 and broader camera/lifecycle/orientation/storage/share/accessibility/WebGL/thermal checks remain the release gate. CI does not prove these behaviors; the release candidate is unsigned.
- **Working protocol:** [Promt.txt](https://github.com/majd7772233-a11y/gpts/blob/main/Promt.txt).

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
- Historical Stage-4 note: the initial photo path used `preserveDrawingBuffer`. Stage 5 replaced it with `preserveDrawingBuffer: false` and a temporary WebGL render target for still-photo capture. Real-device sustained GPU/thermal impact remains unmeasured.

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
- Update `CONTINUATION.md`, `ROADMAP.md` and `GPT.md` together after implementation and test results.
- After asynchronous startup/session restoration, revalidate lifecycle generation and browser/native foreground state immediately before publishing engine readiness; stale startup must be cleaned up and must not race a new camera start.
- Android `onPause` may occur around camera permission UI and is not alone proof of full backgrounding. Use the correct host lifecycle stop/resume gates; Android restart is controlled through `onResume`.
- Persistence must coalesce noisy edits yet flush the newest valid state at explicit commit and real background/page-exit boundaries. Preserve unknown future schemas rather than silently downgrading or overwriting them.
- Failed material loads must dispose acquired textures; stale asynchronous color/pattern work must not replace newer user intent.
- Capture/export must enforce dimension/pixel budgets, validate PNG payloads on the native boundary, avoid unnecessary UI-thread storage work, and delete partial files when saves/shares fail. Enforce share-cache limits after adding the new file.
- Camera and face processing remain local/offline. Do not add automatic uploads, telemetry or runtime CDN dependencies.
- Keep Android app identity/version contract (1.5.0 / code 6 / `com.magd.openmakeup` / minSdk 23) and existing public SDK API contracts unless a requested, tested migration demands otherwise.
- Keep PR #3 open/unmerged unless the user explicitly asks to merge; generated release APK remains unsigned. Never claim signing, accessibility, physical-device compatibility or thermal performance without evidence.

## 12. Exact Resume Procedure

Read `CONTINUATION.md` first; its final “Current checkpoint” is the canonical stop point, and the live branch may have moved since it was recorded.

1. On a new “continue where we stopped” request, act with GitHub calls immediately; no generic preamble or repeat questions.
2. Check live branch HEAD, PR #3 and newest Actions run/jobs/logs/artifacts before relying on remembered state.
3. Last verified baseline at 2026-10-29: docs HEAD `94adeeff3daddd4027af15c405db908db370ceba`, workflow [40925261408](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40925261408); code/test HEAD `97b6ea132e0e51f4cecf93a3707efbc93b78bdf3`, workflow [40924643713](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40924643713); both passed with 110/110 tests and both audits reporting zero vulnerabilities. Artifact IDs from the last completed green run are 12920531479 and 12919943291. Fetch the live branch and latest workflow for any newer docs-only checkpoint.
4. Do not reimplement finished Stage 10 features. Its software/CI gate passed; physical-device acceptance remains unperformed and is the next milestone.
5. If a current workflow fails, inspect logs, fix the actual root cause, add regression coverage, and rerun until the exact new HEAD is green. Do not infer success from an earlier workflow.
6. Record physical-device evidence with model, Android version, System WebView version, steps and actual result. If devices are unavailable, leave the gate open and continue source-backed review without claiming device validation.
7. Don't merge, sign, publish or handle secrets unless explicitly directed by the user and within owner-controlled release procedures.

## Stage-5 Implementation and Release-Candidate Record

### Implemented

- SDK API: `canSwitchCamera()`, `cameraFacingMode` and `switchCamera('user' | 'environment')`. Switching creates a new MediaPipe camera controller, stops old tracks, waits for frame progression, validates observed facing mode when exposed by the browser, and attempts rollback. If switching and rollback both fail, the UI attempts local stream recovery/engine restart before enabling studio tools.
- First-run guidance: Arabic-first/English, permission/framing/lighting/core-tool hints, dismissible with start or skip buttons, persistent dismissal when storage is available, Escape/Android Back and focus management.
- Presets: twelve maintainable data-defined looks in four localized groups, with category-validated shader settings and rollback if a layer fails.
- Performance/resilience: conservative 640×480/DPR≤1/no antialias for constrained detected devices, balanced 960×540/DPR≤1.5 otherwise; live renderer uses `preserveDrawingBuffer: false`; photo capture uses a temporary WebGL render target; WebGL context loss/restoration triggers statuses and camera-recovery path.
- Local camera utility: a first-party offline adapter supplies the Camera API surface referenced by `index.html`; it handles facing-mode constraints, decoded-frame scheduling, stop/track cleanup and late permission cancellation. CI checks the file before and after Vite packaging.
- Release pipeline: full npm dependency audit and production-only audit, TypeScript, 74-test suite, Vite bundle, Android asset checks, Android packaging, debug plus unsigned release APKs, version/code checks, SHA-256 sums, artifact upload, full audit report and locked package metadata in the release-candidate artifact.

### Automated evidence

- Latest verified complete code pipeline: [Run 40505687165](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40505687165) on `c2d4ceb8f584ed040df2c957d3b51d7b2c185c70`: 86 tests passed, 0 failed; full and production audits reported zero vulnerabilities; type-check, local camera/model asset checks, Vite, Android packaging, Gradle debug/unsigned-release builds, metadata, checksum generation and both artifact uploads passed. Earlier implementation validation is retained in git history.
- Both full and production dependency audits reported zero vulnerabilities in that run. The artifact ZIP digests and APK checksum file are attached to the linked artifacts.

### Post-checkpoint lifecycle reliability follow-up (CI verified)

- Source review found that `Camera.stop()` did not release an unresolved `_starting` promise or per-frame processing lock. A later permission result/frame callback could stall or clobber the restarted camera.
- The bundled camera adapter now clears its start slot and processing lock on stop, and stale generations cannot reset the newer generation's running/frame state.
- `MakeupEngine.start()` now owns a per-start token; `stop()` invalidates that token immediately and stale completion cannot clear or stop a newer start. Regression tests cover these races; run 40102119131 confirms the then-current 74-test suite and full Android artifact pipeline passed.

### Explicitly not verified

- No physical Android device has been exercised here. Actual camera switching and rollback, repeated camera resume, Android 6/7 permission behavior, screen reader/contrast, capture mirror and color, gallery/share, WebGL recovery under real GPU resets and sustained thermal/frame stability remain unverified.
- Runtime-derived resolution/antialias settings are defensive defaults. They are not benchmark measurements. The test matrix in ROADMAP.md is a plan, not proof that named devices have passed.
- The release APK is unsigned; never generate or commit the owner's signing key.


## Stage 6 — Global Font Size Settings (new user request)

- User requested a Settings option labelled “Font size”, default **12**, applied throughout the application; this is an explicit new stage after the five previously planned stages.
- Implemented Settings dialog in the header, Arabic/English localization, integer slider 10–20, numeric output, reset-to-12, localStorage persistence key `openMakeupFontSizeV1`, startup restore with bounded validation, and dialog keyboard/focus/Android Back handling.
- CSS typography scaling uses a shared helper for numeric `font-size`, responsive `clamp()` and numeric `font` shorthand sizes. Level 12 preserves the authored stylesheet, and camera/WebGL dimensions are untouched.
- Regression tests are included. The current code-bearing head passed full CI in run 40505687165; physical-device checks remain pending.


## Stage 7 — User-Visible Behavior Correctness (CI verified)

- Code-bearing head: `c2d4ceb8f584ed040df2c957d3b51d7b2c185c70`; full workflow [40505687165](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40505687165) succeeded.
- Before/after capture renders the selected mode, stale captures are invalidated when comparison changes, and the compare label/title/accessibility state refresh after localization changes.
- Typography scaling now handles numeric `font-size`, responsive `clamp()` and numeric CSS `font` shorthand sizes. Setting copy describes a level instead of px.
- Storage failures are surfaced after actions and at startup, rather than replaced with success-looking statuses. Protection against overwriting future saved schemas is preserved.
- Onboarding Escape/Android Back no longer starts the camera. Camera direction is considered confirmed only when exposed by the browser; otherwise the UI says it is unverified.
- The non-lipstick glossy choice is hidden where it maps to the same engine mode as glitter.
- CI: 86/86 tests passed; both dependency audits reported zero vulnerabilities; type-check, local assets, Vite, Android packaging, APK builds, metadata/checksums and artifacts passed.
- No physical device has been tested. Camera, capture, gallery/share, accessibility, WebGL recovery and sustained performance remain hardware acceptance items.

## Stage 8 — Full UI and UX Redesign (CI verified)

- Code-bearing head: 0e18bacf2716eca99f72383015bdb580e63ff279; full workflow [40511322876](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40511322876) succeeded.
- Reviewed Liquid.png as an inspiration reference. Adopted translucent glass surfaces, luminous edges, layered depth and a calmer layout, but retained Open Makeup's pink/rose and purple identity rather than importing the reference's blue/teal colors.
- Added a short workspace intro and restyled the header, live-preview card, status surface, controls, presets and form fields to a coherent liquid-glass system.
- Added a four-item mobile navigation connected to existing Looks / Customize / Saved / Sculpt panels. It is active only on narrow layouts; desktop still exposes the full panel layout. Added keyboard arrows/Home/End, selected state, bilingual labels, visible focus and reduced-motion styling.
- Preserved the underlying existing camera, shader, capture/share, saved-look and face-morph action IDs/wiring; this stage reorganizes presentation instead of replacing behavior.
- CI: 87/87 tests passed; both dependency audits reported zero vulnerabilities; TypeScript, local assets, Vite, Android packaging, debug/unsigned-release builds, metadata/checksums and both uploads passed.
- No physical Android device or assistive-technology run has been performed. Actual mobile fit, focus order, camera preview while switching sections, and glass effects under low-end GPU conditions remain to be validated on devices.

## Stage 9 — 3D Liquid Glass and Animation (CI verified)

- Source changes introduce pointer-driven 3D glass tilt for fine pointers only; transforms are bounded and reset when the pointer leaves.
- Desktop gets a restrained animated ambient rose/purple light and decorative glow/sparkle. Mobile keeps the ambient layer static and animates only the selected workspace panel.
- Touch input is ignored by the tilt controller; `prefers-reduced-motion` disables active tilt and animation. No sensors, dependencies, remote assets, camera changes or SDK API changes were introduced.
- Node regression coverage includes tilt/highlight calculations, touch handling, reduced-motion changes, cleanup, and UI integration.
- Exact code-bearing revision `1fe59559ffa9d4795f23df097b3e97b5b32e47c1` passed workflow [40701117560](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40701117560): 91/91 tests, zero vulnerabilities in full/production audits, successful typecheck, web build, Android debug/unsigned release APK builds and artifact uploads.
- Artifacts: [debug APK ZIP 12822525083](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40701117560/artifacts/12822525083) and [unsigned release ZIP 12821667719](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40701117560/artifacts/12821667719). The release candidate remains unsigned.
- Device-level Android/WebView visual/accessibility/performance/thermal checks remain unperformed; automated CI is not a substitute for the physical-device matrix.


## Stage 10 — Stability, Persistence, Camera, Export and Android Performance (CI verified; includes effect/material fixes)

**Latest code-bearing commit:** cd6d51bd28343f51d1c039f247459b6d1967776a; **full CI:** [workflow 40731209686](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40731209686).

### Effects/material integrity
- All seven texture-backed material loaders dispose textures already acquired if a subsequent texture or shader operation fails, while preserving the original failure.
- Per-category asynchronous request generations prevent late AI/color results or texture pattern loads from replacing newer selections. Clearing one/all layers and disposing the SDK invalidates in-flight apply operations.
- Soft-focus blur resolution tracks intrinsic camera-frame dimensions, resynchronizes after material creation and video-layout/metadata changes, and does not overwrite a valid resolution with missing/zero metadata.
- All 12 curated looks have regression coverage confirming their pattern indices resolve to bundled assets in the correct category.

### Persistence and lifecycle
- Session edits use a bounded 180 ms debounce to coalesce rapid writes; explicit commits, pause/background transitions and page exit flush the most recent pending value.
- Session state remains versioned and defensively normalized; unknown future schemas are preserved rather than overwritten.
- Engine initialization captures a lifecycle generation and aborts after model/material loading if the host stopped it, before face/camera startup begins.
- Android onStop is treated separately from onPause so the system camera-permission prompt does not get mistaken for full backgrounding. A stopped startup is cancelled and retry waits for the Activity's resume callback; stale initialization cannot compete with a new camera start.
- Camera switching still verifies a live track and advancing frames, attempts rollback on failure, and UI messaging does not claim a facing mode unless reported by the runtime.

### Capture/export and Android memory
- PNG capture uses temporary render targets rather than permanently enabling preserveDrawingBuffer, with dimension and total-pixel limits (Android: max dimension 1920 / 2.5 million pixels; browser: 2560 / 6.5 million pixels).
- Native decoding independently validates PNG signature, dimensions, and a 4-million-pixel ceiling.
- Legacy Android gallery-save permission callbacks now perform bitmap compression and storage I/O on a worker thread, not the UI thread; bitmaps are recycled and the result returns to the web UI.
- Failed or partial gallery/share files are deleted. The share cache is bounded to 10 PNGs and prunes files older than 7 days.
- Regression tests cover debounce/flush/cancel, capture budgets in portrait/landscape, lifecycle cancellation and delayed resume, Android background save, partial-file cleanup, and cache limits.

### CI evidence and remaining acceptance
- Workflow 40731209686 on this commit: **107 tests passed, 0 failed**; full audit including development dependencies reported 0 vulnerabilities and the production audit reported 0 vulnerabilities.
- SDK typecheck, local camera/model asset checks, Vite build, Android asset packaging, Gradle debug and unsigned-release APK builds, metadata validation, SHA-256 generation and artifact uploads all passed.
- Debug artifact [12833634599](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40731209686/artifacts/12833634599) (ZIP, 14,972,293 bytes); unsigned release candidate [12835695531](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40731209686/artifacts/12835695531) (ZIP, 13,630,170 bytes). The release candidate is not signed.
- Physical Android 6/7 camera permission/resume, orientation, real image save/share, face alignment, accessibility, sustained GPU performance and thermal acceptance have not been performed. CI does not replace that device matrix. Keep PR #3 open/unmerged unless explicitly asked to merge.


## Stage 10 review follow-up — Android share-cache bound (CI verified)

- Source review found that pruning the share cache *before* writing a new PNG could retain 10 old files and then add an 11th. The code now writes first, protects the new target, removes stale/overflow files while retaining at most nine other images, and deletes the target when FileProvider/chooser startup fails.
- Regression coverage now checks the protected-target policy, post-write pruning order, ten-image ceiling and failed-handoff cleanup. The previous source-contract test was updated to the new method signature after the first CI run caught that expected test contract mismatch.
- Fix commit: [0d2953e](https://github.com/majd7772233-a11y/OpenMakeup/commit/0d2953e395c6aaf4f6ac66e57da2da81ebd21080). Test-contract follow-up / code-bearing HEAD: [b402cb3](https://github.com/majd7772233-a11y/OpenMakeup/commit/b402cb3d68ba7f5a3f023d54d93419dedf18ff44).
- Full pipeline [40737590458](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40737590458) passed on the exact HEAD: **108/108 tests**, 0 failures; full and production dependency audits both reported 0 vulnerabilities; typecheck, assets, Vite, Android packaging, debug and unsigned release builds, metadata/checksums and uploads passed.
- Debug [artifact 12838835197](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40737590458/artifacts/12838835197), ZIP 14,972,389 bytes, SHA-256 `0c4a198144ccadbef46c12af314d6f0a9e27f9465180eeb765d140ec83cba875`. Unsigned release candidate [artifact 12837274032](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40737590458/artifacts/12837274032), ZIP 13,630,732 bytes, SHA-256 `4fe996ec2a99b672f49a35347730737f6900ccaff7e7d7cd23a955079aaf0f58`.
- Physical Android 6/7 camera/storage/share, accessibility, sustained GPU and thermal tests remain **not performed**. PR #3 remains open/unmerged; the release candidate is unsigned.

## Stage 11 — Second-pass stability, photo export and Android performance (CI verified)

**Code/test commit:** [`d487b4d`](https://github.com/majd7772233-a11y/OpenMakeup/commit/d487b4d7abd9d8f9615ddeaf8e6d135e06a00ca3)  
**Full CI:** [run 40931351904](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40931351904) — **115/115 tests passed**, 0 failures; both dependency audits reported 0 vulnerabilities, and type-check, local assets, Vite, Android packaging, debug/unsigned-release builds, metadata/checksums and uploads passed.

### Delivered
- **Camera lifecycle:** added a distinct camera-pause generation. A recovery attempt now becomes stale if Android calls `onPause` during it, even when that pause is only a transient permission dialog. Initial startup is not invalidated by this guard while the engine is not yet ready. Existing host-stop generation and queued-resume behavior remain intact.
- **Photo export memory:** changed still-image composition to write WebGL's bottom-origin RGBA pixels directly into one destination canvas while correcting vertical orientation and mirroring horizontally. This removes the second full-size canvas and an intermediate full-frame byte-array copy. Regression tests verify exact pixel order and that capture creates only one canvas.
- **Share failure behavior:** moved `ensureCapture()` inside the full share error boundary, so capture/WebGL/native-bridge failures produce a localized share-failure status instead of an unhandled rejected promise.
- **Android export responsiveness:** PNG payload decoding, gallery writing and share-file creation now run on worker threads instead of synchronously in the JavaScript bridge call. The bridge returns `save_started` / `share_started` immediately and reports final results back to the UI. Legacy storage permission handling remains supported; the pending permission request keeps its bounded single-request policy, and UI state prevents duplicate save/share work.
- **Feedback and cleanup:** added Arabic/English “saving photo” status, tracks native in-flight save/share actions, and restores action availability when the native completion/failure callback arrives.

### Automated evidence and remaining boundary
- New regression coverage verifies pixel mapping/single-canvas capture, share capture-error handling, transient Android pause invalidation and off-thread image export contracts.
- The successful CI run built both APK variants and uploaded [Debug artifact 12922563239](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40931351904/artifacts/12922563239) and [unsigned release artifact 12922698045](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40931351904/artifacts/12922698045). The release ZIP includes the APK checksum manifest.
- This is automated/source verification only. Physical Android 6/7 device testing, real chooser/gallery behavior, WebView-specific camera permission/lifecycle races, observed memory use and sustained GPU/thermal behavior remain **not performed** and are still required before release acceptance.


## Stage 12 — UX behavior and accessibility regression (CI verified)

**Code/test HEAD:** [`b3ee9d7`](https://github.com/majd7772233-a11y/OpenMakeup/commit/b3ee9d701cebc3caf241655989040950bcb33903)  
**Full CI:** [run 41045980672](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/41045980672) — **132/132 tests passed**, 0 failures. Full and production dependency audits both reported **0 vulnerabilities**. Type-check, local runtime assets, Vite, Android asset packaging, debug and unsigned-release APK builds, release metadata/checksums and both artifact uploads all passed.

### Delivered
- **Contrast:** corrected primary gradient-button text from white to dark `#100d18`; a regression test samples 10,001 points across the declared two-stop CSS gradient and verifies a minimum contrast ratio of approximately **4.647:1** against the text.
- **Touch targets:** all user-operated range inputs (layer intensity, face morph controls and font-size setting) now have a minimum 44 CSS-pixel block size, including compact mobile layouts.
- **Skip navigation:** the skip link now targets a focusable `#daily-controls` section (`tabindex="-1"`) so keyboard users can move to the primary controls.
- **Landmark semantics:** removed the redundant `role="group"` from the native `<nav>`; its localized accessible name and native navigation landmark remain.
- **Shared dialog keyboard handling:** added `src/ui/accessibility.js` and moved About, Settings and Onboarding focus trapping to one tested helper. It filters disabled, hidden, inert, `aria-hidden`, CSS-hidden and negative-tabindex descendants; wraps Tab/Shift+Tab at dialog boundaries; redirects focus back inside if it escapes; and falls back to the dialog when no focusable child exists.
- **RTL/LTR workspace keys:** extracted the four-section navigation index logic; arrow direction reverses with document direction, wraps at either end, and Home/End select the first/last workspace controls.

### Regression coverage and limits
- Added 17 tests, bringing the suite from 115 to **132 passing tests**. Fourteen behavior tests exercise the shared focus and direction helpers; UI checks cover visible focus selectors, skip destination, range-control touch size and gradient contrast.
- These are Node-level behavior tests against the shared helper with a controlled DOM-like fixture, plus source/markup contracts. They are **not** a full browser end-to-end run and do not represent a TalkBack, screen-reader or physical-device test.
- Latest CI built and uploaded [Debug archive 12971749685](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/41045980672/artifacts/12971749685) (ZIP, 14,973,258 bytes) and [unsigned release archive 12972228387](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/41045980672/artifacts/12972228387) (ZIP, 13,631,885 bytes). The release archive contains the APK checksum manifest and is not signed.
- Android identity remains version 1.5.0 / versionCode 6 / applicationId `com.magd.openmakeup` / minSdk 23. PR #3 remains open and unmerged.

### Remaining acceptance
The consolidated Android 6/API 23 and Android 7/API 24–25 matrix remains unperformed. In particular, verify TalkBack announcements, real Tab/Shift+Tab behavior in the Android WebView, touch operation on device, Arabic/English reading order, zoom/text scaling, portrait/landscape navigation, and reduced-motion behavior on actual supported devices. CI proves the automated code/build contracts only.


## Current checkpoint — 2026-10-30 (authoritative; supersedes older checkpoint snapshots)

### Code and verified workflow state
- Repository: https://github.com/majd7772233-a11y/OpenMakeup
- Working branch: `feat/open-makeup-arabic-mobile-lifecycle`; PR #3 remains **OPEN, NOT MERGED**: https://github.com/majd7772233-a11y/OpenMakeup/pull/3
- Latest CI-verified code/test commit: [`b3ee9d7`](https://github.com/majd7772233-a11y/OpenMakeup/commit/b3ee9d701cebc3caf241655989040950bcb33903) — “Increase touch height for accessible range controls”. It includes the Stage 12 implementation and the preceding accessibility regression-test commits.
- Full CI [run 41045980672](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/41045980672) completed successfully on that exact HEAD: **132/132 tests**, 0 failures; full and production dependency audits reported 0 vulnerabilities; type-check, local runtime assets, Vite, Android packaging, Debug and unsigned-Release APK builds, metadata/checksums and both artifact uploads all succeeded.
- Debug ZIP [artifact 12971749685](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/41045980672/artifacts/12971749685): 14,973,258 bytes. Unsigned release ZIP [artifact 12972228387](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/41045980672/artifacts/12972228387): 13,631,885 bytes. These are archive sizes, not raw APK sizes; the release archive contains `APK-SHA256SUMS.txt`.
- Android identity remains version 1.5.0 / versionCode 6 / applicationId `com.magd.openmakeup` / minSdk 23. The release APK remains **unsigned**.
- Non-blocking Vite chunk-size and GitHub Actions/Node deprecation notices remain; no CI step failed.
- PR #3 is still **open and unmerged**.

### Exact stopping point — Stage 12
Stage 12 UX/accessibility software work is implemented and CI-verified:
- Primary gradient buttons use dark text and the regression suite verifies at least 4.5:1 contrast across 10,001 interpolated gradient samples (measured minimum approximately 4.647:1).
- All range controls used by the editor, face sculpting and settings have a 44 CSS-pixel minimum touch height.
- The skip link can focus its destination; the bottom mobile workspace navigation is represented by a correctly named native navigation landmark.
- About, Settings and Onboarding share a single focus-trapping implementation that handles hidden/disabled/inert candidates, wrapping at both ends, escaped focus, the empty-dialog case and browser-native movement within the dialog.
- Workspace arrow-key navigation follows RTL/LTR direction, wraps correctly and supports Home/End.
- The suite contains 132 passing tests. The new behavior tests run against a controlled DOM-like fixture in Node; they are not a full browser E2E test or assistive-technology run.

### Still remaining — physical-device and assistive-technology acceptance
No physical-device or real screen-reader acceptance run is documented as completed. Do not mark the following as passed until actually exercised:
1. **Android 6/API 23 and Android 7/API 24–25:** fresh install, local startup, permission prompts, camera switching, background/foreground and screen rotation.
2. **TalkBack and WebView:** announcements/labels, dialog entry/exit and focus restoration, swipe order, keyboard Tab/Shift+Tab, arrows, Enter/Space, Escape/Android Back, hidden content and focus visibility.
3. **Mobile usability:** touch range controls at 44 px, fixed bottom navigation, narrow/landscape layouts, zoom and font scaling without overlap or obscured controls.
4. **Localization:** Arabic RTL and English LTR reading/focus order, translated names for dynamic controls, dialogs and error/status announcements.
5. **Visual accessibility:** contrast on actual displays, reduced-motion preference, focus-ring visibility and readability at increased font sizes.
6. **Existing release matrix:** camera permission/resume, gallery/share, orientation and capture alignment, WebGL recovery and sustained low-memory/GPU/thermal behavior.

Record device model, Android and System WebView versions, assistive-technology version, steps, expected/actual results and evidence. This list is a test plan, not a claim of completion.

### Next action
1. Perform the consolidated physical Android/TalkBack acceptance matrix when target devices are available.
2. Fix only reproduced defects and add regression coverage, then rerun full CI.
3. Do not invent another development stage until device acceptance/release-readiness review identifies a real remaining need.
4. Keep PR #3 open/unmerged unless explicitly requested; do not sign or publish the release candidate without explicit release direction and owner-controlled signing.

### Permanent boundaries
- Camera and face processing stay local/offline. No frame/photo uploads, telemetry or new runtime CDN dependency.
- Preserve applicationId `com.magd.openmakeup`, minSdk 23, existing version contract and public SDK API.
- No fake success, swallowed errors or blind page reload for camera recovery.
- Never commit tokens, passwords, private keys or release signing material.
- Repository docs remain English; answer the user in Arabic.

### Code and verified workflow state
- Repository: https://github.com/majd7772233-a11y/OpenMakeup
- Working branch: `feat/open-makeup-arabic-mobile-lifecycle`; PR #3 remains **OPEN, NOT MERGED**: https://github.com/majd7772233-a11y/OpenMakeup/pull/3
- Latest CI-verified code/test commit: [`d487b4d`](https://github.com/majd7772233-a11y/OpenMakeup/commit/d487b4d7abd9d8f9615ddeaf8e6d135e06a00ca3) — “Move Android photo export work off the WebView bridge thread”.
- Full CI [run 40931351904](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40931351904) passed on that exact commit: **115/115 tests**, 0 failures; full and production dependency audits both reported zero vulnerabilities; type-check, local runtime assets, Vite, Android packaging, debug and unsigned-release APK builds, metadata/checksums and both artifact uploads all succeeded.
- Debug ZIP [artifact 12922563239](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40931351904/artifacts/12922563239): 14,972,960 bytes. Unsigned release ZIP [artifact 12922698045](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40931351904/artifacts/12922698045): 13,631,579 bytes. The release ZIP contains the APK checksum manifest; these are ZIP sizes, not raw APK sizes.
- Android identity remains version 1.5.0 / versionCode 6 / applicationId `com.magd.openmakeup` / minSdk 23. Release APK remains **unsigned**.
- Non-blocking Vite chunk-size and Actions/Node deprecation notices remain; no CI step failed.

### Exact stopping point
Stage 11 software hardening is implemented and CI-verified. It builds on Stage 10 rather than claiming physical acceptance:
- A camera-pause generation invalidates a recovery interrupted by `onPause`, including transient permission UI, without cancelling initial startup.
- Photo capture corrects WebGL row orientation and mirroring into one output canvas, avoids an extra full-size canvas and temporary RGBA copy, and is covered by pixel-level regression tests.
- The share failure boundary includes capture setup, so a lost WebGL context or failed capture gets a user-facing error.
- Native save/share moves PNG decoding and filesystem work off the synchronous WebView bridge call; results arrive through the native callback, and the UI prevents duplicate operations while pending.
- Automated evidence is [run 40931351904](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40931351904); 115/115 tests passed, both dependency audits reported zero vulnerabilities, and both APK variants were produced/uploaded.

### Still remaining — physical-device release gate
No physical-device acceptance run is documented as completed. Run one consolidated matrix before treating this build as release-ready:

1. **Android 6/API 23 and Android 7/API 24–25:** fresh install, fully local startup, camera permission grant/deny/retry, bundled assets and legacy storage.
2. **Camera/lifecycle:** repeated front→rear→front switching, old-track termination, fresh frames, failed-switch rollback, permission prompt versus real background/foreground, screen-off/on, and `onPause` while startup or recovery is in flight.
3. **Layout/capture:** portrait, landscape, rotation/fullscreen, effect alignment and mirroring; inspect actual PNG orientation/color and thumbnail.
4. **Storage/share:** gallery visibility, Android 6–9 permission path, Android 10+ MediaStore, FileProvider chooser/external app and failure cleanup; ensure repeated save/share taps do not create runaway memory/threads.
5. **Session/accessibility:** session and named-look restoration, undo/redo, corrupt/future schema, Arabic RTL/English LTR, TalkBack, keyboard focus, contrast, touch targets and reduced motion.
6. **WebGL/performance:** context loss/restoration if reproducible and sustained low-memory testing, recording device model, Android/System WebView versions, duration, frame progression, crashes/freezes/OOM, memory growth, temperature and throttling.

Record device model, Android and WebView versions, steps, expected/actual behavior and evidence. This checklist is a plan, not proof; CI has not performed it.

### Next action
1. On each continuation, read this file, `GPT.md` and `ROADMAP.md`, then fetch the live branch head, PR #3 and newest Actions workflow/jobs/logs/artifacts.
2. After the device matrix, address only reproduced failures and rerun full CI.
3. Do not invent a later stage until device acceptance/release-readiness review identifies a real remaining need.
4. Keep PR #3 open/unmerged unless explicitly requested to merge. Do not sign or publish the release candidate without explicit direction and owner-controlled signing.

### Permanent boundaries
- Camera and face processing stay local/offline. No frame/photo uploads, telemetry or new runtime CDN dependency.
- Preserve applicationId `com.magd.openmakeup`, version contract, minSdk 23 and public SDK API.
- No fake success, swallowed errors or blind page reload for camera recovery.
- Never commit tokens, passwords, private keys or signing material.
- Repository docs remain English; user-facing response remains Arabic.
