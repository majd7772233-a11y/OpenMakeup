# OpenMakeup for Android

This Android app keeps the existing OpenMakeup JavaScript/Three.js/MediaPipe engine and hosts it locally in Android WebView. It is intentionally a thin wrapper, not a native rewrite.

## Build

The GitHub Actions workflow installs the existing npm dependencies plus MediaPipe Camera Utils, bundles the web app, copies the generated `dist/` into `android/app/src/main/assets/www/`, then builds the debug APK.

For a local build, from the repository root:

```bash
npm install
npm install --no-save --package-lock=false @mediapipe/camera_utils@0.3.1675466862
npm run build
```

Then copy the contents of `dist/` into `android/app/src/main/assets/www/` and build the `android` project with Android Studio or Gradle 8.9+ and JDK 17.

The camera is requested only through Android's runtime permission flow. MediaPipe, shaders, face model, and pattern textures are packaged with the app; the first version does not need a backend.
