# CONTINUATION.md — Canonical Open Makeup Handoff

Last reconciled with live GitHub on 2026-10-28. This is the authoritative restart anchor for any new conversation that says “continue where we stopped”. Always check live GitHub again because the branch may move after this file is written.

## 1. Immediate resume protocol

Do not greet, give a generic status preamble, ask the user to repeat the request, or start from a stale conversational commit. Begin with GitHub tool calls immediately:

1. Read CONTINUATION.md, GPT.md and ROADMAP.md.
2. Fetch the live branch head, PR #3 metadata, the newest GitHub Actions run/jobs/logs, and artifacts.
3. Compare live status with this checkpoint. The latest code-bearing HEAD cd6d51bd28343f51d1c039f247459b6d1967776a passed [workflow 40731209686](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40731209686): 107/107 tests passed; both full and production dependency audits reported zero vulnerabilities; typecheck, local runtime assets, Vite, Android packaging, debug and unsigned-release APK builds, metadata/checksums and both uploads all passed. The documentation-only follow-up triggers a separate run; inspect live Actions before claiming the documentation HEAD independently verified.
4. Resume from the real live HEAD. Do not replay superseded failures, revert newer commits, or reimplement completed Stage-5 features merely because earlier chat messages describe an intermediate state.
5. If the current-head CI is failing, read its actual logs, fix the specific cause on the same branch, add/regress a test, then confirm a new green run. Never call an in-progress run successful.
6. If the current-head CI is green, do not rewrite finished stages. Continue with the outstanding physical device/release gate or a concrete, evidence-based defect found in review.
7. No explanatory preamble is needed when the next conversation starts. Act first, using GitHub tool calls immediately, without announcing what you are about to do. Do not ask for information already recorded here or in the repository.

## 2. Repository and exact position

- Repository: https://github.com/majd7772233-a11y/OpenMakeup
- Working branch: feat/open-makeup-arabic-mobile-lifecycle
- PR #3: https://github.com/majd7772233-a11y/OpenMakeup/pull/3
- Latest Stage 10 code-bearing HEAD verified by full CI: cd6d51bd28343f51d1c039f247459b6d1967776a. Run [40731209686](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40731209686) passed on that exact revision: **107/107 tests**; full and production dependency audits both reported **0 vulnerabilities**; typecheck, local runtime assets, Vite, Android packaging, debug and unsigned-release APK builds, metadata/checksums and both artifact uploads all passed. Debug artifact [12833634599](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40731209686/artifacts/12833634599) is 14,972,293 bytes (ZIP); unsigned release-candidate artifact [12835695531](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40731209686/artifacts/12835695531) is 13,630,170 bytes (ZIP).
- PR #3 was OPEN and NOT MERGED. Keep it open/unmerged unless the user explicitly requests a merge.
- Android app version 1.5.0, versionCode 6, applicationId com.magd.openmakeup, minSdk 23 / Android 6.0. Preserve app ID, minSdk and public SDK contracts unless expressly directed otherwise.
- Stages 1–5 retain their original implementation history. Stages 6 (global font-size setting), 7 (user-visible behavior correctness), 8 (full UI/UX redesign), 9 (3D Liquid Glass motion), and 10 (effects/material correctness plus stability, persistence, camera lifecycle, export and Android performance) have implementation and automated CI evidence.

## 3. Latest verified CI and live workflow state

- Run: [40731209686](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40731209686)
- Code-bearing head: cd6d51bd28343f51d1c039f247459b6d1967776a. Conclusion: **SUCCESS**.
- Test summary from the actual job log: **107 tests, 107 passed, 0 failed**.
- Full dependency audit (including development tooling): **0 vulnerabilities**; production-only audit: **0 vulnerabilities**.
- TypeScript, source/dist camera/model asset checks, Vite build, Android asset packaging, Gradle debug/unsigned-release APK builds, release metadata checks, SHA-256 generation and both artifact uploads all passed.
- Debug artifact ID 12833634599: https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40731209686/artifacts/12833634599 (ZIP 14,972,293 bytes).
- Unsigned release-candidate artifact ID 12835695531: https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40731209686/artifacts/12835695531 (ZIP 13,630,170 bytes).
- The documentation-only follow-up commit triggers a separate workflow; inspect that live run before claiming the current documentation HEAD independently verified.
- Non-blocking Node.js/Actions runtime deprecation notices do not change this successful result.
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
- tests/ — 71 tests passed on the verified checkpoint.

## 8. Exact stop point and immediate next action

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

### Immediate resume procedure

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
