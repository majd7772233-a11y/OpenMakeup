# GPT.md — Open Makeup Engineering Notebook

**Last updated:** 2026-10-22  
**Repository:** https://github.com/majd7772233-a11y/OpenMakeup  
**Working branch:** `feat/open-makeup-arabic-mobile-lifecycle`  
**Stage 3 code revision validated by CI:** `9d9029a0e397627c624d49294d1f835808de2a12`  
**CI run:** [39833650293](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/39833650293)  
**Related PR:** [#3](https://github.com/majd7772233-a11y/OpenMakeup/pull/3)  
**Mandatory execution protocol:** [Promt.txt](https://github.com/majd7772233-a11y/gpts/blob/main/Promt.txt)

## 1. Project Intent and Non-Negotiable Requirements

Open Makeup is an offline-capable virtual makeup web/Android app built around Three.js WebGL effects and MediaPipe FaceMesh. The UI must be Arabic-first with persistent English switching, responsive on phones/tablets, polished but not cramped, and truthful about engine behavior. Camera and face processing must remain on-device.

The product is judged by visible user behavior, not only build output. A visible operation must work or return a useful failure; camera startup/resume, tracking loss, session persistence and effects correctness are part of product quality.

The user's workflow requires complete stage execution rather than partial delivery. Keep `ROADMAP.md` and `GPT.md` synchronized and in English. Never claim a test/device check that was not actually performed.

## 2. Current Technical Environment

- Web app/SDK: JavaScript ESM, Vite 8, TypeScript 5.9 declarations/type-check, Three.js 0.184, MediaPipe global-script packages.
- Android host: Java, AndroidX WebKit 1.12.1, Gradle 8.9 in CI.
- CI runs Node 22; `npm install`, `npm run typecheck`, `npm test`, `npm run build`, embeds `dist/` into Android assets, runs `gradle --no-daemon -p android assembleDebug` and uploads a debug APK.
- Package ID: `com.magd.openmakeup`; minimum Android API 23; compile/target SDK 35.
- Android host loads `https://appassets.androidplatform.net/assets/www/index.html` via `WebViewAssetLoader`, restricts camera permission to the local origin and forwards camera pause/resume and Back.
- Runtime assets: `assets/models`, `assets/shaders`, `assets/patterns`, `public/mediapipe`.

## 3. Architecture and Ownership

- `index.html`: responsive UI, translated labels, preview, camera-retry action, About dialog and fullscreen controls.
- `main.js`: UI orchestration, language switching, localized state/error messages, makeup/session state, accessible About dialog, fullscreen, Android Back/pause/resume hooks and camera recovery.
- `src/ui/locales.js`: Arabic/English dictionaries and safe string/count interpolation, imported by the app and directly covered by tests.
- `src/OpenMakeup.js`: public SDK wrapper, category/color/finish/pattern handling and morph APIs.
- `src/categories.js`, `src/morphs.js`, `src/config.js`: category/default definitions, morph mapping and asset URLs.
- `src/core/MakeupEngine.js`: render scene, camera/video texture, GLTF/material orchestration, MediaPipe, effect layers, morphing, lifecycle and disposal.
- `src/core/FaceMeshModelController.js`: awaitable GLTF model loading and face landmark fitting.
- `src/core/FaceNurbsModelController.js`: eyeliner/mascara NURBS geometry.
- `src/core/materials.js`, `src/core/faceWarpMaterial.js`: GLSL/texture loading.
- `src/core/cameraReadiness.js`: live-track and repeated-frame progression checks.
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
- Per user direction, run the combined physical-device matrix for Stages 1–4 after Stage 4, before Stage 5. Do not schedule separate device checks after every earlier stage.
- Next eligible stage: Stage 4 — Personalization, Color/Strength, Capture and History. Total roadmap stages: **5**.

## 9. Build and Test Commands

- `npm install`
- `npm test`
- `npm run typecheck`
- `npm run build`
- CI also packages web assets into Android and runs `gradle --no-daemon -p android assembleDebug`; the debug APK is uploaded as workflow artifact `Open-Makeup-debug-apk`.

## 10. Permanent Engineering Rules

- Never store tokens/passwords/private keys in this repository or either memory file.
- Don't claim functionality from class existence, green compilation, or a swallowed SDK error.
- Inspect all call sites after changing lifecycle/API contracts.
- Don't silently ignore unsupported effects; remove them from advertised choices or implement them correctly.
- Never blindly reload the app to recover camera; preserve local session state.
- Distinguish automated verification from physical-device verification.
- Update both `ROADMAP.md` and `GPT.md` after implementation and test results.

## 11. Exact Resume Procedure

1. Read both project memory files.
2. Fetch branch head and latest GitHub Actions run.
3. Check `npm test`, type-check, Vite bundle, APK build and artifact upload.
4. Stage 3 UI/UX/localization/accessibility implementation and CI are complete at revision `9d9029a0e397627c624d49294d1f835808de2a12`. Continue with Stage 4 and fix in-scope regressions.
5. At the end of Stage 4, run and document one combined physical-device regression pass for Stages 1–4.
6. Until that pass occurs, mark camera/rendering, screen-reader, device layout and performance unverified; do not block Stage 4 solely because device tests are deferred.
