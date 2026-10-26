# CONTINUATION.md — Canonical Open Makeup Handoff

Last reconciled with live GitHub on 2026-10-24. This is the authoritative restart anchor for any new conversation that says “continue where we stopped”. Always check live GitHub again because the branch may move after this file is written.

## 1. Immediate resume protocol

Do not greet, give a generic status preamble, ask the user to repeat the request, or start from a stale conversational commit. Begin with GitHub tool calls immediately:

1. Read CONTINUATION.md, GPT.md and ROADMAP.md.
2. Fetch the live branch head, PR #3 metadata, the newest GitHub Actions run/jobs/logs, and artifacts.
3. Compare live status with this checkpoint. The latest completed code-bearing CI run is 40102119131 on HEAD 0459aaa6e9201cfb9200ca4d65e00f09e6297cc5; it passed 74/74 tests, both dependency audits (0 vulnerabilities each), type-check, source/dist asset checks, Vite build, Android packaging, both APK builds, metadata/checksum verification and artifact uploads. This documentation sync triggers a new run, so inspect it rather than assuming it passed.
4. Resume from the real live HEAD. Do not replay superseded failures, revert newer commits, or reimplement completed Stage-5 features merely because earlier chat messages describe an intermediate state.
5. If the current-head CI is failing, read its actual logs, fix the specific cause on the same branch, add/regress a test, then confirm a new green run. Never call an in-progress run successful.
6. If the current-head CI is green, do not rewrite finished stages. Continue with the outstanding physical device/release gate or a concrete, evidence-based defect found in review.
7. No explanatory preamble is needed when the next conversation starts. Act first, using GitHub tool calls immediately, without announcing what you are about to do. Do not ask for information already recorded here or in the repository.

## 2. Repository and exact position

- Repository: https://github.com/majd7772233-a11y/OpenMakeup
- Working branch: feat/open-makeup-arabic-mobile-lifecycle
- PR #3: https://github.com/majd7772233-a11y/OpenMakeup/pull/3
- Latest code-bearing HEAD verified by full CI: `0459aaa6e9201cfb9200ca4d65e00f09e6297cc5`. Run [40102119131](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40102119131) passed on that exact revision: 74/74 tests; full and production audits both report zero vulnerabilities; TypeScript, Vite, local source/dist camera/model asset checks, Android packaging, debug and unsigned-release builds, metadata checks, checksum generation and both artifact uploads passed. This documentation synchronization will create a docs-only commit and a new workflow; fetch live HEAD and its actual CI result on resume.
- PR #3 was OPEN and NOT MERGED. Keep it open/unmerged unless the user explicitly requests a merge.
- Android app version 1.5.0, versionCode 6, applicationId com.magd.openmakeup, minSdk 23 / Android 6.0. Preserve app ID, minSdk and public SDK contracts unless expressly directed otherwise.
- The planned roadmap has exactly five stages. Source implementation and automated CI for Stages 1–5 are complete on the verified revision. No Stage 6 is part of the current agreed roadmap.

## 3. Latest verified CI and live workflow state

### Latest completed full pipeline on the code-bearing HEAD before this documentation sync

- Run: https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40102119131
- Tested code head: `0459aaa6e9201cfb9200ca4d65e00f09e6297cc5`. Conclusion: **SUCCESS**.
- Test summary from the actual job log: **74 tests, 74 passed, 0 failed**.
- Full dependency audit (including development tooling): **0 vulnerabilities**; production-only audit: **0 vulnerabilities**.
- TypeScript check, source camera/model asset checks, tests, Vite build, built camera/model asset checks, Android asset packaging, Gradle debug/unsigned-release APK builds, version metadata checks, SHA-256 generation and both APK artifact uploads all passed.

Artifacts from run 40102119131 (the digests below are for uploaded ZIP archives, not APK-internal hashes):

- Debug artifact ID 12562958707: https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40102119131/artifacts/12562958707
  - ZIP size: 14,959,841 bytes
  - ZIP SHA-256: `44143d6d16ff8d4c162c3f796be75f7e47bb33de2c9f90adcbf18204f1559353`
- Unsigned release-candidate artifact ID 12563113048: https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40102119131/artifacts/12563113048
  - ZIP size: 13,621,537 bytes
  - ZIP SHA-256: `cc1f6f13aa512fdc5e6ccc82780974dd0faee855897f6df64b728ffd586051c1`

### Current checkpoint update

The lifecycle-restart reliability fix and its regression tests are verified on `0459aaa6e9201cfb9200ca4d65e00f09e6297cc5`. The documentation-only synchronization will advance the branch and trigger another workflow; do not assume that newest run is green until its result is fetched.
### Earlier verified checkpoints

- Run 40097505589 on 02c2f7ab32023c0d8f22661a3171b5e8f6368775 also passed 71/71 tests and both audits and uploaded artifacts.
- Latest code-focused complete pipeline: run 40097038958 on code revision 4be895e51332e647a4e2b3bb457f48567bfbd564, also 71 tests passed, 0 failed.
- Intermediate Stage-5 failures came from tests/assertions that had not been updated to the implemented capture route or actual camera rollback message; those were fixed in later commits. The full current-code pipeline succeeded afterwards. Inspect live logs; do not resurrect old failures.

A non-blocking GitHub Actions warning says some actions targeting Node.js 20 will be forced to Node.js 24. It is workflow maintenance information, not a failed build; do not blindly bump major versions as unrelated work.

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

- Repository: `majd7772233-a11y/OpenMakeup`.
- Working branch: `feat/open-makeup-arabic-mobile-lifecycle`.
- PR #3: https://github.com/majd7772233-a11y/OpenMakeup/pull/3 — **OPEN, NOT MERGED**. Do not merge unless the user explicitly asks.
- Latest code-bearing HEAD verified by run 40102119131: `0459aaa6e9201cfb9200ca4d65e00f09e6297cc5`. This documentation synchronization will make a docs-only commit; on resume fetch the live HEAD and newest CI rather than checking out a recorded parent.
- Latest completed full CI on the code-bearing head: [Run 40102119131](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40102119131) on `0459aaa6e9201cfb9200ca4d65e00f09e6297cc5`: **74/74 tests**, full and production audits zero vulnerabilities, typecheck/Vite/source+dist asset checks/Android packaging/debug and unsigned-release builds/checksums/both artifact uploads passed.
- Debug artifact: [12562958707](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40102119131/artifacts/12562958707), ZIP 14,959,841 bytes, SHA-256 `44143d6d16ff8d4c162c3f796be75f7e47bb33de2c9f90adcbf18204f1559353`.
- Unsigned release candidate: [12563113048](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40102119131/artifacts/12563113048), ZIP 13,621,537 bytes, SHA-256 `cc1f6f13aa512fdc5e6ccc82780974dd0faee855897f6df64b728ffd586051c1`.
- This docs synchronization triggers a new workflow; on resume fetch its actual result and do not infer that it passed.
- App identity: Android `1.5.0`, `versionCode 6`, `applicationId com.magd.openmakeup`, `minSdk 23`. Preserve ID, minimum SDK and public SDK contracts.
- Exactly five planned stages exist; Stages 1–5 have source implementation and automated CI evidence. No Stage 6 is part of the agreement.
- Source-review follow-up verified by run 40102119131: fixed a lifecycle race where `stop()` could leave an unresolved camera-start promise/frame callback blocking the next start, and a late stale start could clear or stop a newer start. Regression tests cover permission-prompt restart, in-flight frame restart and engine promise ownership. All 74 CI tests passed on code head `0459aaa6e9201cfb9200ca4d65e00f09e6297cc5`.
- Physical Android 6/7 and broader camera/permission/resume/orientation/capture/storage/share/accessibility/WebGL/thermal tests have **not been performed**. This is the real-device release gate. The release APK is unsigned.

### Immediate resume procedure

1. Start with GitHub calls, not a greeting, generic progress preamble, or questions. The user explicitly requested that a new chat saying “اكمل من حيث توقفت” resume directly, without any explanatory opening; act first.
2. Fetch live branch HEAD, PR #3, newest Actions run/jobs/logs/artifacts, then read `CONTINUATION.md`, `GPT.md`, `ROADMAP.md`. Do not rely only on recorded SHAs because this docs save triggers CI.
3. The five agreed stages have already been implemented and all 74 automated tests plus the full CI/release-candidate pipeline passed on the last verified code HEAD (run 40102119131). Do not create an unrequested Stage 6 or rewrite completed stages. The remaining project gate is the actual hardware matrix; if a real device is accessible, run/document it. If none is available, keep it honestly pending and review only concrete software issues supported by evidence.
4. If current-head CI fails, inspect actual log output, identify the precise root cause, fix it on this branch and add a regression test; rerun and verify a newer green workflow before claiming completion.
5. Never claim hardware/accessibility/thermal verification from CI. Record exact physical device/model, Android and WebView versions, steps and results only when truly run.
6. Keep PR #3 open/unmerged; keep camera/face processing local; never sign/publish or commit credentials. Keep these three memory files synchronized after meaningful changes.


## 7. Newly requested Stage 6 — Global Font Size Settings

- User explicitly requested a new stage adding a global “Font size” setting with default **12**, applied throughout the app. This request authorizes Stage 6 despite the earlier five-stage roadmap; do not delete or rewrite Stages 1–5.
- Implementation files: `index.html` (header settings action, dialog and scaled CSS declarations), `main.js` (bounded value, persistence, dialog lifecycle/focus/Android Back), `src/ui/locales.js` (Arabic and English strings), and `tests/accessibility-ui.test.js` (regressions).
- Preference key: `openMakeupFontSizeV1`; range 10–20 integer px, default 12. At 12, existing design sizing is preserved; other values scale all authored CSS text while leaving camera/WebGL dimensions untouched.
- CI is pending for the commit that introduces this stage until a live Actions result is fetched. Do not call it validated before the current-head workflow completes.
- Existing physical-device release gate remains open; test the setting at small/large values on a handset when the consolidated Android 6/7 matrix is run.
