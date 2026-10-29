# CONTINUATION.md — Canonical Open Makeup Handoff

Last reconciled with live GitHub on 2026-10-29 at workflow 40931351904. This is the authoritative restart anchor. The final “Current checkpoint” below supersedes older historical checkpoints and stale test counts. Always inspect live GitHub again because another continuation may have moved the branch.

## 1. Immediate resume protocol

When a new conversation says “continue where we stopped”:
1. Start with GitHub reads immediately; do not ask the user to repeat context or lead with a generic status preamble.
2. Read `CONTINUATION.md`, `GPT.md` and `ROADMAP.md`, then fetch live branch HEAD, PR #3, newest workflow run/jobs/logs and artifacts.
3. Latest verified code/test HEAD is `d487b4d7abd9d8f9615ddeaf8e6d135e06a00ca3`; workflow [40931351904](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40931351904) passed with 115/115 tests. Always inspect the live branch and newest workflow after documentation syncs.
4. If current-head CI is failing, inspect actual logs, fix the demonstrated cause on the same branch, add regression coverage, and verify a newer passing run. Never call an in-progress run green.
5. Do not restart completed Stage 10 software work by default; the remaining milestone is physical-device acceptance. Do not claim the hardware matrix passed unless it actually ran.
6. Keep PR #3 open and unmerged unless the user explicitly requests otherwise. Never sign/publish or commit credentials without explicit release direction and owner-controlled signing.
7. Repository docs are English; answer the user in Arabic unless they change language.

## 2. Repository and exact position

- Repository: https://github.com/majd7772233-a11y/OpenMakeup
- Working branch: `feat/open-makeup-arabic-mobile-lifecycle`
- Latest code/test HEAD: [`d487b4d`](https://github.com/majd7772233-a11y/OpenMakeup/commit/d487b4d7abd9d8f9615ddeaf8e6d135e06a00ca3); Stage 11 adds camera pause-race protection, lower-memory photo composition, safe share failure handling and asynchronous Android image export.
- Full CI [run 40931351904](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40931351904) passed on the exact code/test HEAD: **115/115 tests passed, 0 failures**; full and production dependency audits both reported 0 vulnerabilities; type-check, local runtime assets, Vite, Android asset packaging, Debug/unsigned-Release APK builds, metadata, checksums and uploads passed.
- Debug archive [artifact 12922563239](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40931351904/artifacts/12922563239): 14,972,960 bytes. Unsigned release archive [artifact 12922698045](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40931351904/artifacts/12922698045): 13,631,579 bytes. The sizes refer to uploaded ZIP files; the release archive contains `APK-SHA256SUMS.txt`.
- Android identity remains version 1.5.0 / versionCode 6 / applicationId `com.magd.openmakeup` / minSdk 23.
- PR #3 remains **OPEN, NOT MERGED**: https://github.com/majd7772233-a11y/OpenMakeup/pull/3. The release APK is unsigned.

## Latest verified CI and live workflow state

- Run [40931351904](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40931351904) completed successfully on code/test HEAD `d487b4d7abd9d8f9615ddeaf8e6d135e06a00ca3` on 2026-10-29.
- Test log: **115 pass, 0 fail**. Both full and production dependency audits reported zero vulnerabilities. SDK type-check, local camera/model checks, Vite and built assets, Android asset packaging, debug and unsigned release APK builds, release metadata/checksums and both uploads all succeeded.
- Artifacts: debug [12922563239](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40931351904/artifacts/12922563239), ZIP 14,972,960 bytes; unsigned release [12922698045](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40931351904/artifacts/12922698045), ZIP 13,631,579 bytes. ZIP sizes are not the APK file sizes.
- Non-blocking notices may still appear for Vite chunk size and GitHub Actions/Node deprecations; no step failed in this run.
- Device-specific behavior is **not** proved by CI. The consolidated Android 6/7 camera, permission/resume, orientation, gallery/share, accessibility, WebGL and sustained GPU/thermal acceptance gate remains open.
- On resume, re-read the live branch and latest workflow: the documentation update itself triggers a separate workflow which must be checked rather than assumed successful.

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


## Current checkpoint — 2026-10-29 (authoritative; supersedes older checkpoint snapshots)

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
