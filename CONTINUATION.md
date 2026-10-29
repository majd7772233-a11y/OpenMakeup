# CONTINUATION.md — Canonical Open Makeup Handoff

Last reconciled with live GitHub on 2026-10-29 at workflow 40925261408. This is the authoritative restart anchor. The final “Current checkpoint” below supersedes older historical checkpoints and stale test counts. Always inspect live GitHub again because another continuation may have moved the branch.

## 1. Immediate resume protocol

When a new conversation says “continue where we stopped”:
1. Start with GitHub reads immediately; do not ask the user to repeat context or lead with a generic status preamble.
2. Read `CONTINUATION.md`, `GPT.md` and `ROADMAP.md`, then fetch live branch HEAD, PR #3, newest workflow run/jobs/logs and artifacts.
3. Last verified baseline: code/test HEAD `97b6ea132e0e51f4cecf93a3707efbc93b78bdf3` passed run [40924643713](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40924643713); previous docs HEAD `94adeeff3daddd4027af15c405db908db370ceba` passed run [40925261408](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40925261408). A newer documentation-only checkpoint may be at live branch HEAD; inspect the actual SHA and newest run before asserting its status.
4. If current-head CI is failing, inspect actual logs, fix the demonstrated cause on the same branch, add regression coverage, and verify a newer passing run. Never call an in-progress run green.
5. Do not restart completed Stage 10 software work by default; the remaining milestone is physical-device acceptance. Do not claim the hardware matrix passed unless it actually ran.
6. Keep PR #3 open and unmerged unless the user explicitly requests otherwise. Never sign/publish or commit credentials without explicit release direction and owner-controlled signing.
7. Repository docs are English; answer the user in Arabic unless they change language.

## 2. Repository and exact position

- Repository: https://github.com/majd7772233-a11y/OpenMakeup
- Working branch: `feat/open-makeup-arabic-mobile-lifecycle`
- PR #3: https://github.com/majd7772233-a11y/OpenMakeup/pull/3 — **OPEN, NOT MERGED**.
- Code/test HEAD: `97b6ea132e0e51f4cecf93a3707efbc93b78bdf3`; latest production lifecycle fix: `b732b5b4e754e2268b5913f25c7ee6d592ae34aa`; last independently verified docs HEAD: `94adeeff3daddd4027af15c405db908db370ceba`. Fetch live branch for any newer checkpoint-only commit.
- CI is green on both the exact code/test HEAD (run 40924643713) and the newer docs HEAD (run 40925261408). Both logged 110 tests, 110 pass, 0 fail; full and production audits reported zero vulnerabilities; typecheck, runtime assets, Vite, Android assets/APKs, metadata, checksums and uploads passed.
- Debug ZIP: [12920531479](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40925261408/artifacts/12920531479) (14,972,396 bytes). Unsigned release-candidate ZIP: [12919943291](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40925261408/artifacts/12919943291) (13,630,756 bytes).
- App identity: version 1.5.0 / versionCode 6 / `com.magd.openmakeup` / minSdk 23. Preserve public SDK contracts.
- Stages 1–10 have source implementation and automated CI evidence. Stage 10's **physical-device gate is not complete**.

## Latest verified CI and live workflow state

- Last independently verified docs head `94adeeff3daddd4027af15c405db908db370ceba` passed [workflow 40925261408](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40925261408) on 2026-10-29. Logs: 110/110 tests, 0 failures; full and production dependency audits each reported 0 vulnerabilities; typecheck, local runtime assets, Vite, Android packaging, debug/unsigned-release builds, release metadata/checksums and both artifact uploads passed. Any newer checkpoint-only HEAD must be verified separately.
- Latest code/test head `97b6ea132e0e51f4cecf93a3707efbc93b78bdf3` passed [workflow 40924643713](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40924643713). The lifecycle implementation originated in `b732b5b4e754e2268b5913f25c7ee6d592ae34aa`, with later test assertion commits in the commit history.
- Latest artifact ZIPs: debug [12920531479](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40925261408/artifacts/12920531479), 14,972,396 bytes, archive digest `ae02daf653dcf043da798e0cb5a69c65103eafa1d8d767eb7de461ce45a2ec25`; unsigned release [12919943291](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40925261408/artifacts/12919943291), 13,630,756 bytes, archive digest `b0927992450de0f57ab29c17d2e8f9f3cb013d2ae400b5e8a31cd364561ce9a4`. These hashes are artifact-ZIP digests; the APK checksum manifest is inside the artifacts.
- Non-blocking Actions/Node deprecation notices appear in CI, but no workflow step failed. The release APK remains **unsigned**.
- **Still not verified on physical devices:** Android 6/7 permission/resume, repeated camera switching/rollback, rotation/alignment, real gallery/save/share, screen-reader/focus behavior, WebGL restoration and sustained GPU/thermal stability.
- This checkpoint must be refreshed whenever HEAD moves.

## 4. Implemented work by stage

### Stage 1 — Runtime/lifecycle reliability
- Explicit asset/model load failures and SDK failure propagation.
- Camera startup verifies actual live tracks and frame progression; stalled/single-frame camera states are detected.
- Safe stop/dispose, cancellation of late startup and controlled pause/resume.
- Camera recovery preserves state and must not blindly reload the page.

### Stage 2 — Effect and face-control contracts
- Validated layer, color, finish and pattern inputs; model/UV and morph mappings; shader uniform contracts; pattern reset/disposal/race protection; video/canvas layout consistency.
- Only real bundled patterns are advertised: blush, eyeshadow, eyeliner and mascara, 69 assets total.
- Foundation and lipstick do not have supported pattern mapping. Do not advertise fake pattern support or restore empty manifest entries until real masks, correct shader/UV mapping and tests exist.

### Stage 3 — Mobile UI, localization and accessibility
- Arabic-first UI with English switch and RTL/LTR changes; responsive phone/short-landscape styles; visible focus, reduced motion, touch-sized controls, headings and live status regions.
- About dialog focus trap/restore, Escape and Android Back behavior.
- Stable face detected/lost callbacks without duplicate state notifications.

### Stage 4 — Personalization, capture and history
- Per-layer color/intensity (0–1), finishes only where implemented, six supported layers, before/after comparison.
- Mirrored PNG capture/preview and explicit save/share. Browser download/Web Share fallback, Android MediaStore/FileProvider paths.
- Versioned local sessions and named custom looks, defensive migration, isolation of corrupt records, rollback on failed save/delete and 50-snapshot undo/redo.
- Fixed custom look duplicate check to collapse repeated whitespace before case-insensitive comparison (e.g. Rose Evening vs. Rose   Evening).

### Stage 5 — Camera, onboarding, curated looks, performance and release hardening
- SDK API: canSwitchCamera(), cameraFacingMode and switchCamera('user' | 'environment'). A switch requests facing constraints, stops old tracks, waits for fresh frames, validates reported facing mode when available and attempts rollback to the prior camera. Unsupported switching must be clearly disabled/reported, never fake-success.
- Arabic-first/English onboarding for permission, framing, lighting and core tools; start/skip dismissal persists when storage is available; Escape/Android Back and focus handling are wired.
- Twelve data-defined curated looks in four localized groups: Everyday, Soft/Romantic, Bold and Evening. Preset options are checked against supported categories/settings and failed application rolls back.
- Local offline camera adapter at public/mediapipe/camera_utils/camera_utils.js, matching the local relative path referenced by index.html. It implements the needed Camera API surface, facing constraints, frame scheduling, idempotent track cleanup and cancellation of late permission results. CI verifies existence in source and in built Vite output. This fixed a real missing-file defect discovered during deeper source-tree review.
- Conservative profile for devices reporting <=4 logical cores or <=4 GB memory: camera 640×480, renderer pixel ratio <=1 and no antialias. Balanced profile: camera 960×540 and renderer DPR <=1.5. These are defensive heuristics, not measured thermal-performance claims.
- WebGL lost/restored/restore-failed callback and guarded render behavior with visible recovery/reinitialization path.
- Live renderer uses preserveDrawingBuffer=false. Still photos are drawn via a temporary WebGLRenderTarget, converted from bottom-origin RGBA row order to top-origin, output as sRGB and mirrored. Tests cover row direction and malformed pixel data.
- Release CI runs full and production audits, TypeScript, tests, Vite, local source/dist asset checks, Android packaging, debug and unsigned release APK builds, version checks, checksum generation and artifact uploads.

## 5. Remaining gate: physical-device acceptance

No physical Android handset test has been performed in this connector session. It is not a passing result. CI cannot demonstrate real camera switching, OEM WebView/GPU behavior, actual gallery/share surfaces, screen-reader output or sustained thermal stability.

Run one consolidated device matrix when real devices are accessible; the user's prior preference was to batch hardware tests, not repeat them after every stage:

1. Android 6 / API 23 and Android 7 / API 24–25: fresh install, fully local/offline startup, camera permission grant/deny/retry, local model/camera assets.
2. Front→rear→front switching repeatedly; fresh frames, old-track termination, tracking reacquisition, failed-switch rollback and recovery.
3. Repeated background/foreground and screen-off/on; no duplicate streams, freeze, blind page reload or lost session.
4. Six layers, twelve presets, intensity/color/finish/pattern validation, morph controls, before/after, saved looks and undo/redo.
5. Portrait, landscape, rotation and fullscreen: video/canvas/effect alignment, mirroring/crop and output photo orientation.
6. Capture and inspect actual PNG color/orientation, thumbnail, gallery visibility, Android 6–9 storage permission allow/deny, Android 10+ MediaStore, FileProvider share chooser and external target.
7. Screen reader, keyboard/focus order, contrast, touch targets, reduced motion, Arabic RTL and English LTR.
8. WebGL context loss/restoration where reproducible.
9. Sustained low-memory run: freeze/crash/OOM, resource growth, frame progression, temperature and throttling over a recorded interval.

Record actual device model, Android version, System WebView version, steps, expected/actual outcomes, logs and evidence. The matrix in ROADMAP.md is a test plan, not proof that any named device passed. If no physical device is available to the current session, do not pretend to run it; continue only evidence-based source/CI review and keep the gate explicitly open.

The release APK is unsigned. Only the repository owner's key can sign it. Never invent, generate, request, expose or commit signing credentials.

## 6. Mandatory rules

These are the most important instructions and must survive every handoff:

1. Start working immediately when the user says “continue where we stopped”: read this file and inspect GitHub before responding. No greeting, generic status preamble, repeated questions or empty promises.
2. The user expects full stage completion, not partial implementations, serial fragments, or a claim of completion while listed work remains. Complete as much of the whole scope as possible in the current turn; do not ask for confirmation when intent and constraints are already recorded.
3. Work directly on the connected GitHub repo and current working branch. Inspect live HEAD first. Do not fabricate commits, changed files, CI results, artifact URLs, or hashes.
4. Keep PR #3 open/unmerged unless the user explicitly asks to merge.
5. Run/check the full automated pipeline after changes. If a test/build fails, inspect actual job logs, identify the exact failure, fix it, add/adjust a regression test, then verify a new successful run. Do not state that a running job passed.
6. Clearly distinguish source inspection, unit tests, CI build, physical-device tests and signed release. Never claim a device/accessibility/performance test that was not actually done.
7. Update CONTINUATION.md after every meaningful change of stop point, and keep GPT.md and ROADMAP.md synchronized with the actual code and evidence. Repo memory/docs are in English; respond to the user in Arabic unless they change language.
8. Preserve app identity and API: applicationId com.magd.openmakeup, minSdk 23, existing public SDK contracts. Inspect callers whenever changing lifecycle/API behavior.
9. Keep camera and face processing on-device. No automatic frame/photo upload, telemetry or new remote CDN runtime dependency. Capture/share only after explicit user action.
10. Do not fake effects or success, silently hide errors, expose unsupported patterns or create no-op controls. Use truthful failure reporting, rollback and state-preserving recovery.
11. Never blindly reload the app to recover camera. Preserve local session and attempt controlled recovery.
12. Never commit secrets, tokens, passwords, private keys or release signing materials.
13. Do not re-ask decisions already stored in this file or GPT.md. The user is frustrated by repeated restarts and incomplete stages; inspect repository evidence and act carefully.
14. No signing/publishing/merging unless explicitly requested and the proper release gate/evidence exists.
15. The latest repository state outranks older conversation snippets. Always fetch live HEAD and Actions first so newer commits from another continuation are not overwritten or redundantly recreated.

## 7. Inspect these files first

- CONTINUATION.md — canonical handoff and rules.
- GPT.md — engineering notebook/history.
- ROADMAP.md — five-stage acceptance and hardware matrix.
- src/core/MakeupEngine.js — camera lifecycle, switch, WebGL restore, performance setup.
- src/core/camera-capabilities.js — facing mode and device enumeration.
- public/mediapipe/camera_utils/camera_utils.js — local offline Camera adapter.
- src/core/cameraReadiness.js — live-track and advancing-frame checks.
- src/core/performance-profile.js — conservative/balanced profile.
- src/core/capture-frame.js — temporary render target, sRGB, row orientation and mirroring.
- src/ui/look-presets.js — 12 looks.
- src/ui/locales.js — Arabic and English dictionaries.
- main.js and index.html — screen wiring, onboarding, camera switch, recovery.
- android/app/build.gradle and .github/workflows/android.yml — Android identity and CI.
- tests/ — latest Stage 10 checkpoint: 110/110 tests passed in workflows 40924643713 and 40925261408; see the final authoritative checkpoint below.

## 8. Historical stop point before Stage 6 (superseded by the current checkpoint above)

### Snapshot at handoff

- Repository: majd7772233-a11y/OpenMakeup.
- Working branch: feat/open-makeup-arabic-mobile-lifecycle.
- PR #3: https://github.com/majd7772233-a11y/OpenMakeup/pull/3 — **OPEN, NOT MERGED**. Do not merge unless explicitly requested.
- Latest code-bearing HEAD verified by run 40511322876: 0e18bacf2716eca99f72383015bdb580e63ff279; 87/87 tests, full and production audits with zero reported vulnerabilities, TypeScript, local assets, Vite, Android packaging, debug/unsigned-release builds, metadata/checksums and both artifact uploads passed.
- Debug artifact: [12738041479](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40511322876/artifacts/12738041479), ZIP 14,967,923 bytes.
- Unsigned release candidate: [12736474787](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40511322876/artifacts/12736474787), ZIP 13,627,264 bytes.
- App identity: Android 1.5.0, versionCode 6, applicationId com.magd.openmakeup, minSdk 23. Preserve identity and SDK contracts. Release candidate remains unsigned.
- Stages 1–8 have implementation and automated CI evidence.
- Physical Android 6/7 and broader camera/permission/resume/orientation/capture/storage/share/accessibility/WebGL/thermal tests have **not** been performed; this is still the hardware release gate.

### Historical resume procedure (superseded)

1. Fetch live HEAD, PR #3 and newest Actions run/jobs/logs/artifacts; inspect the newest run rather than assuming it passed.
2. If current-head CI fails, read its actual logs, fix the proven root cause on this branch, add regression coverage and verify a newer green run.
3. Never claim hardware/accessibility/thermal verification from CI. Record exact device/model, Android and WebView versions, steps and results only when genuinely run.
4. Keep PR #3 open/unmerged; keep camera/face processing local; never sign/publish or commit credentials. Keep CONTINUATION.md, GPT.md and ROADMAP.md synchronized.

## Stage 6 — Global Font Size Settings and Persistence

- Implemented Settings dialog in the header, Arabic/English localization, slider default 12 and integer range 10–20, persistence via openMakeupFontSizeV1, reset action, and keyboard/focus/Android Back behavior.
- Font scaling covers numeric font-size, responsive clamp() and numeric CSS font shorthand sizes. Level 12 preserves the authored stylesheet exactly; camera/video and WebGL dimensions are not resized.
- Full CI verification on code-bearing head 0e18bacf2716eca99f72383015bdb580e63ff279, run 40511322876, is successful; the physical-device usability/accessibility check is pending.

## Stage 7 — User-Visible Behavior Correctness (CI verified)

- Original-mode capture renders only the live video plane; comparison changes invalidate stale captures. Compare label/title/aria-pressed refresh with language changes.
- Font scaling handles font-size, clamp() and CSS font shorthand; setting text describes a level rather than px.
- Persistence failures are communicated after actions, undo/redo, morph changes and at startup. Protection against overwriting future saved schemas is preserved.
- Escape/Android Back no longer starts the camera during onboarding. Camera direction is called verified only when the browser reports a matching facing mode.
- Non-lipstick glossy is hidden where it maps to the same renderer mode as glitter.

## Stage 8 — Full UI and UX Redesign (CI verified)

- Reference: majd7772233-a11y/gpts/Liquid.png. Implemented translucent glass layers, highlights and depth while preserving Open Makeup's pink/rose and purple palette.
- Added a workspace intro, coherent glass restyling for the header/preview/status/panels/fields/presets, and a fixed four-section mobile nav for Looks, Customize, Saved and Sculpt.
- Navigation is wired to the existing panels, exposes selected state, supports keyboard arrows/Home/End, is bilingual, and respects reduced-motion. On larger screens all panels remain visible.
- Existing IDs and real behavior for camera, makeup layer editing, undo/redo, compare/capture/save/share, saved looks, face morphs, settings and onboarding remain intact.
- Run 40511322876 passed 87/87 tests and the complete dependency audit, typecheck, web build, Android packaging/build/checksum/artifact pipeline.
- No real Android device or assistive-technology validation has been performed. Confirm screen fit, preview visibility during section switching, glass rendering and accessibility on target Android/WebView devices before treating the UX acceptance gate as complete.


## Stage 9 — 3D Liquid Glass and motion (CI verified)

- Builds on Stage 8's glass workspace and preserves the existing rose/pink and purple identity; no external visual assets, remote scripts, motion sensors, or new runtime dependencies were added.
- Adds bounded 3D perspective tilt to the top bar, workspace panels and glass chip for fine-pointer devices; touch pointers are ignored, transforms reset on leave, and `prefers-reduced-motion` is honored.
- Adds subtle desktop ambient rose/purple motion, a decorative logo/sparkle effect and short mobile workspace-panel entry animation.
- CI passed on code-bearing commit `1fe59559ffa9d4795f23df097b3e97b5b32e47c1` in [workflow 40701117560](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40701117560): 91/91 tests and complete dependency, build, checksum and artifact pipeline.
- Real Android/WebView visual, accessibility, performance and thermal acceptance remains unperformed.

## Stage 10 — Stability, Persistence, Camera, Export and Android Performance (CI verified; includes effect/material fixes)

**Initial Stage 10 implementation checkpoint:** commit `cd6d51bd28343f51d1c039f247459b6d1967776a` passed workflow 40731209686 with 107 tests. The later share-cache fix and contract correction are the current code-bearing HEAD `b402cb3d68ba7f5a3f023d54d93419dedf18ff44`, verified in workflow 40737590458 with 108/108 tests.

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

## Current checkpoint — 2026-10-29 (authoritative; supersedes older checkpoint snapshots)

### Code and verified workflow state
- Repository: https://github.com/majd7772233-a11y/OpenMakeup
- Branch: `feat/open-makeup-arabic-mobile-lifecycle`; PR #3 remains **OPEN, NOT MERGED**: https://github.com/majd7772233-a11y/OpenMakeup/pull/3
- Latest code/test HEAD: `97b6ea132e0e51f4cecf93a3707efbc93b78bdf3`; lifecycle behavior fix: `b732b5b4e754e2268b5913f25c7ee6d592ae34aa`; test-boundary follow-ups: `a2fd395f23d90f295256ea170564471e798b352a` and `97b6ea132e0e51f4cecf93a3707efbc93b78bdf3`.
- That exact code/test HEAD passed workflow [40924643713](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40924643713): 110/110 tests, 0 failures; full and production audits reported 0 vulnerabilities; typecheck, local assets, Vite, Android packaging, debug/unsigned-release builds, metadata/checksums and uploads passed.
- The last independently CI-verified docs HEAD was `94adeeff3daddd4027af15c405db908db370ceba`; its run [40925261408](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40925261408) also passed with 110/110 tests, both audits at zero vulnerabilities, and all build/checksum/upload steps successful.
- Artifacts from that last completed run: [Debug ZIP 12920531479](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40925261408/artifacts/12920531479) (14,972,396 bytes, archive ZIP digest `ae02daf653dcf043da798e0cb5a69c65103eafa1d8d767eb7de461ce45a2ec25`); [unsigned release ZIP 12919943291](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40925261408/artifacts/12919943291) (13,630,756 bytes, archive ZIP digest `b0927992450de0f57ab29c17d2e8f9f3cb013d2ae400b5e8a31cd364561ce9a4`). These digests apply to the uploaded ZIP artifacts, not directly to the APK files.
- Documentation checkpoint commits after `94adee` update only `CONTINUATION.md`, `GPT.md` and `ROADMAP.md`. The immediately preceding checkpoint commit `45f28987510b5a368d43599b79f2deeeb94ef533` had workflow [40926938409](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40926938409) **in progress** at the last observation. This newer documentation commit triggers another workflow too. On resume, fetch the live branch HEAD and latest run and verify its actual conclusion; never infer success from an older run.
- Android identity remains version 1.5.0 / versionCode 6 / applicationId `com.magd.openmakeup` / minSdk 23. The release APK remains **unsigned**. CI emitted non-blocking Actions/Node deprecation notices; they did not fail the last completed green run.

### Exact stopping point
The **software implementation and automated-CI part of Stage 10** (stability, persistence, camera lifecycle, capture/export and Android performance, plus material/effect integrity) is complete and verified. Do not restart the finished work unless a fresh source review or device test demonstrates a defect.

Latest lifecycle follow-up prevents startup from reporting readiness after it was interrupted during asynchronous session restoration: recheck the lifecycle generation, browser visibility and native background state before marking the engine ready; clean stale SDK/camera state while retaining the retry signal. Browser-only visibility return can retry the interrupted startup. Android restart remains gated through native `onResume`; Android `onPause` alone is not definitive backgrounding because camera-permission UI can trigger it. Regression coverage is in `tests/stage10-stability-export.test.js`.

Other completed Stage 10 software safeguards include debounced/versioned session persistence with boundary flushes and future-schema preservation; texture disposal on partial material-load failure; stale color/pattern request invalidation; camera-frame readiness and failed-switch rollback; bounded render-target/PNG capture; legacy Android storage work off the UI thread; partial-file cleanup and bounded share cache.

### Still remaining — physical-device release gate
No physical-device acceptance run is documented as completed. Execute a consolidated matrix rather than repeatedly doing device checks after every code stage:

1. **Android 6/API 23 and Android 7/API 24–25:** fresh install, local/offline start, camera permission grant/deny/retry, local camera/model assets, stop/resume and legacy storage.
2. **Camera/lifecycle:** repeat front→rear→front; prove old tracks stop and frames advance; tracking reacquisition and rollback on failed switch; permission prompt versus real background/foreground; screen-off/on.
3. **Layout/capture:** portrait, landscape, rotation/fullscreen; face/effect alignment, mirroring/crop and output orientation; inspect actual PNG color and thumbnail.
4. **Storage/share:** gallery visibility, Android 6–9 storage permission paths, Android 10+ MediaStore, FileProvider chooser and external share target; failure paths must leave no partial files.
5. **Session/accessibility:** session and custom-look restore, undo/redo, corrupt/future-version data; Arabic RTL/English LTR, TalkBack, keyboard/focus, contrast, touch targets and reduced motion.
6. **Sustained GPU run:** record device model, Android and System WebView versions, duration, frame progression, freezes/crashes/OOM, resource growth, temperature and throttling; test WebGL loss/restore if reproducible.

Record actual device/OS/WebView, steps, expected versus actual results, logs and evidence. This is a test plan, not proof. Without device access, keep the gate pending and perform only evidence-based source review—never pretend CI proves hardware behavior.

### Next action
1. First read all three handoff files and fetch live GitHub branch/PR/workflow state.
2. Verify the newest workflow on the live docs HEAD, because this synchronization itself triggers CI.
3. If no newer code appeared, do **not** restart software Stage 10. The next milestone is the consolidated physical-device matrix. Turn any reproduced failure into a focused fix plus regression test, then rerun full CI.
4. After device acceptance and any fixes, run final release-readiness review. Signing, publishing and merging are separate explicit decisions. Never request or commit a private signing key.
5. `ROADMAP.md` currently defines no later software stage. Do not invent “Stage 11”; determine any next code stage only after the Stage 10 device gate/release review clarifies real remaining work.

### Permanent boundaries
- Camera and face processing remain local/offline; no automatic uploads, telemetry or runtime CDN assets.
- Preserve app ID, version contract, minSdk 23 and public SDK API; inspect callers after lifecycle/API changes.
- No fake success, swallowed errors, blind reload-based recovery, or unsupported effects.
- Keep PR #3 open/unmerged unless explicitly asked to merge; generated release output remains unsigned.
- Update this file, `GPT.md` and `ROADMAP.md` together after meaningful changes. Repo docs in English; user-facing responses in Arabic.
