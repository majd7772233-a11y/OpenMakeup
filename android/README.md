# Open Makeup for Android

**Display name:** Open Makeup  
**Application ID:** `com.magd.openmakeup`  
**Minimum Android:** Android 6.0 (API 23)  
**Version:** 1.2.0

The app keeps the existing OpenMakeup JavaScript/Three.js/MediaPipe engine and hosts it locally in Android WebView. This avoids a costly native rewrite and keeps the web demo and Android app on the same engine.

## Features in this Android build

- Real-time virtual makeup and face sculpt controls from the existing SDK.
- One-tap Rose, Berry, and Nude looks.
- Arabic-first interface with a persistent Arabic/English language switch and RTL/LTR layouts.
- Mobile-first responsive controls and an animated About screen matching the site's dark, glass-inspired visual style.
- Full-screen camera preview with an exit control and Android Back handling.
- Camera pause/resume recovery when the app moves to the background and returns.
- Camera permission is requested at runtime and WebView camera access is restricted to the local app origin.
- Bundled model, shader, pattern, MediaPipe Face Mesh, and camera utility files for offline startup.
- Clearer startup and action errors when the face engine or device graphics support is unavailable.
- About links open in an external browser or email app.

## Android compatibility

The Android project sets `minSdk 23`, so Android 6.0 Marshmallow and Android 7.x meet the OS minimum. Actual face tracking still depends on the device's installed Android System WebView, WebGL/GPU support, camera, and available memory. The minimum SDK is not a guarantee that every old device can run the graphics engine smoothly.

## Build

The GitHub Actions workflow installs npm dependencies, bundles the web app and local runtime assets, copies `dist/` into `android/app/src/main/assets/www/`, then builds the debug APK.

For a local web bundle, from the repository root:

```bash
npm install
npm install --no-save --package-lock=false @mediapipe/camera_utils@0.3.1675466862
npm run typecheck
npm run build
```

Then copy the contents of `dist/` into `android/app/src/main/assets/www/` and build the `android` project with Android Studio or Gradle 8.9+ and JDK 17.

The camera preview and face effects must still be verified on a physical Android 6/7 device; a successful CI build alone does not prove device-level camera/WebGL compatibility.
