# Open Makeup Android — Version 1.5.0

**Build identity:** versionCode 6 · applicationId com.magd.openmakeup  
**Minimum Android API:** 23 (Android 6.0)  
**Release-candidate status:** CI-built unsigned APK; a production signing key is still required.

## Added
- Front/rear camera switching with facing-mode capability checks, fresh-frame verification, track disposal and attempted rollback to the previous camera.
- Dismissible Arabic-first/English first-run guide for camera permission, framing, lighting and core controls.
- A first-party local camera adapter at the exact path referenced by the app shell; CI verifies it exists in source and the Vite build, preventing a missing runtime script from being masked by successful APK compilation.
- Twelve data-driven looks grouped into Everyday, Soft/Romantic, Bold and Evening collections.
- Conservative camera/render profiles for limited-memory or low-core devices, capped renderer pixel ratio, and photo capture through a temporary WebGL render target.
- WebGL context-loss/restoration handling with a frame-progression check and a visible recovery action if automatic restoration fails.
- Camera lifecycle restart hardening: unresolved permission requests and pending frame callbacks from an old generation can no longer block or overwrite a restarted camera; stale engine-start promises cannot clear or stop the newer start.

## Retained
- All six makeup layers and their validated intensity/color/finish contracts.
- Local named looks, 50-step undo/redo history, mirrored PNG capture, explicit save/share actions and Arabic/English localization.
- Bundled MediaPipe runtime/model/shader/pattern assets and on-device face processing.

## Verification boundary
- GitHub Actions run the 74-test suite, audit full and production dependencies, type-check the SDK, verify that the local camera utility/model exist in source and in the Vite build, package Android assets, build debug and unsigned release APKs, verify version metadata, compute SHA-256 checksums and upload both artifacts. Latest verified code-bearing run: [40102119131](https://github.com/majd7772233-a11y/OpenMakeup/actions/runs/40102119131) on `0459aaa6e9201cfb9200ca4d65e00f09e6297cc5`: 74 passed, 0 failed; both audits reported zero vulnerabilities.
- An unsigned APK is not a distributable signed production release. Sign it with the project owner's release key outside this workflow before general distribution.
- No physical Android 6/7 device test has been performed in this connector session. Camera switching, permission prompts, portrait/landscape alignment, gallery/share flows, WebGL restoration and sustained thermal/GPU performance remain device-matrix gates; a green CI run is not physical-device evidence.
