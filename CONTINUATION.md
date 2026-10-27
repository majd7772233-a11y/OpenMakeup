# CONTINUATION.md — Canonical Open Makeup Handoff

Last reconciled with live GitHub on 2026-10-27. This is the authoritative restart anchor for any new conversation that says “continue where we stopped”. Always check live GitHub again because the branch may move after this file is written.

## 1. Immediate resume protocol

Do not greet, give a generic status preamble, ask the user to repeat the request, or start from a stale conversational commit. Begin with GitHub tool calls immediately:

1. Read CONTINUATION.md, GPT.md and ROADMAP.md.
2. Fetch the live branch head, PR #3 metadata, the newest GitHub Actions run/jobs/logs, and artifacts.
3. Compare live status with this checkpoint. Latest verified code-bearing HEAD is 0e18bacf2716eca99f72383015bdb580e63ff279; run 40511322876 passed 87/87 tests, both dependency audits (0 vulnerabilities each), TypeScript, local asset checks, Vite, Android packaging, debug and unsigned-release APK builds, metadata/checksum verification and both artifact uploads. This docs sync triggers a new run; inspect its actual result.
4. Resume from the real live HEAD. Do not replay superseded failures, revert newer commits, or reimplement completed Stage-5 features merely because earlier chat messages describe an intermediate state.
5. If the current-head CI is failing, read its actual logs, fix the specific cause on the same branch, add/regress a test, then confirm a new green run. Never call an in-progress run successful.
6. If the current-head CI is green, do not rewrite finished stages. Continue with the outstanding physical device/release gate or a concrete, evidence-based defect found in review.
7. No explanatory preamble is needed when the next conversation starts. Act first, using GitHub tool calls immediately, without announcing what you are about to do. Do not ask for information already recorded here or in the repository.

## 2. Repository and exact position

- Repository: https://github.com/majd7772233-a11y/OpenMakeup
- Working branch: feat/open-makeup-arabic-mobile-lifecycle
- PR #3: https://github.com/majd7772233-a11y/OpenMakeup/pull/3
- Latest code-bearing HEAD verified by full CI: 0e18bacf2716eca99f72383015bdb580e63ff279. Run [40511322876](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40511322876) passed on that exact revision: 87/87 tests; full and production audits both report zero vulnerabilities; TypeScript, local source/dist camera/model asset checks, Vite, Android packaging, debug and unsigned-release builds, metadata checks, checksum generation and both artifact uploads passed. This documentation synchronization will create a docs-only commit and a new workflow; fetch live HEAD and its actual result on resume.
- PR #3 was OPEN and NOT MERGED. Keep it open/unmerged unless the user explicitly requests a merge.
- Android app version 1.5.0, versionCode 6, applicationId com.magd.openmakeup, minSdk 23 / Android 6.0. Preserve app ID, minSdk and public SDK contracts unless expressly directed otherwise.
- Stages 1–5 retain their original implementation history. Stages 6 (global font-size setting), 7 (user-visible behavior correctness), and 8 (full UI/UX redesign) were explicitly requested, implemented and CI-verified.

## 3. Latest verified CI and live workflow state

- Run: [40511322876](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40511322876)
- Code-bearing head: 0e18bacf2716eca99f72383015bdb580e63ff279. Conclusion: **SUCCESS**.
- Test summary from the actual job log: **87 tests, 87 passed, 0 failed**.
- Full dependency audit (including development tooling): **0 vulnerabilities**; production-only audit: **0 vulnerabilities**.
- TypeScript check, source camera/model asset checks, Vite build, dist asset checks, Android asset packaging, Gradle debug/unsigned-release APK builds, release metadata checks, SHA-256 generation and both artifact uploads all passed.
- Debug artifact ID 12738041479: https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40511322876/artifacts/12738041479 (ZIP 14,967,923 bytes).
- Unsigned release-candidate artifact ID 12736474787: https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40511322876/artifacts/12736474787 (ZIP 13,627,264 bytes).
- This documentation update triggers another workflow; inspect it live and do not infer its result.
- Non-blocking Vite bundle-size and GitHub Actions runtime deprecation notices do not change the successful result.

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
