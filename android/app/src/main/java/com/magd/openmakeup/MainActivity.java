package com.magd.openmakeup;

import android.Manifest;
import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.media.MediaScannerConnection;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.io.IOException;
import androidx.core.content.FileProvider;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.annotation.NonNull;
import androidx.webkit.WebViewAssetLoader;

public class MainActivity extends Activity {
    private static final int CAMERA_REQUEST = 41;
    private static final int STORAGE_REQUEST = 42;
    private static final int MAX_CAPTURE_DATA_URL_LENGTH = 32_000_000;
    // The web capture path is capped more tightly on Android; retain a native
    // pixel-count guard against unexpectedly large bridge payloads.
    private static final long MAX_CAPTURE_PIXELS = 4_000_000L;
    private static final long SHARE_CACHE_MAX_AGE_MS = 7L * 24L * 60L * 60L * 1000L;
    private static final int SHARE_CACHE_MAX_FILES = 10;
    private static final String APP_ORIGIN = "https://appassets.androidplatform.net";
    private WebView webView;
    private PermissionRequest pendingWebPermission;
    private String pendingSaveDataUrl;
    private String pendingSaveName;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        webView.setBackgroundColor(0xFF100D18);
        setContentView(webView);

        WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.getSettings().setMediaPlaybackRequiresUserGesture(false);
        webView.getSettings().setAllowFileAccess(false);
        webView.getSettings().setAllowContentAccess(false);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme();
                if ("mailto".equalsIgnoreCase(scheme)) {
                    openExternal(uri);
                    return true;
                }
                if ("https".equalsIgnoreCase(scheme)
                        && "github.com".equalsIgnoreCase(uri.getHost())) {
                    openExternal(uri);
                    return true;
                }
                return !"https".equalsIgnoreCase(scheme)
                        || !APP_ORIGIN.equals(uri.getScheme() + "://" + uri.getHost());
            }

            @Override
            public android.webkit.WebResourceResponse shouldInterceptRequest(
                    WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }
        });
        webView.addJavascriptInterface(new OpenMakeupBridge(), "OpenMakeupBridge");
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> handleWebPermission(request));
            }
        });

        webView.loadUrl(APP_ORIGIN + "/assets/www/index.html");
    }

    private void openExternal(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (Exception exception) {
            // Keep the app usable even if no browser or email app is installed.
        }
    }

    private void handleWebPermission(PermissionRequest request) {
        boolean trustedOrigin = request.getOrigin() != null
                && APP_ORIGIN.equals(request.getOrigin().getScheme() + "://"
                + request.getOrigin().getHost());
        if (!trustedOrigin) {
            request.deny();
            return;
        }

        boolean asksForCamera = false;
        for (String resource : request.getResources()) {
            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) {
                asksForCamera = true;
                break;
            }
        }
        if (!asksForCamera) {
            request.deny();
            return;
        }

        if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
        } else {
            pendingWebPermission = request;
            requestPermissions(new String[]{Manifest.permission.CAMERA}, CAMERA_REQUEST);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions,
                                           @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == STORAGE_REQUEST) {
            String dataUrl;
            String name;
            synchronized (this) {
                dataUrl = pendingSaveDataUrl;
                name = pendingSaveName;
                pendingSaveDataUrl = null;
                pendingSaveName = null;
            }
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            if (granted && dataUrl != null) {
                saveImageInBackground(dataUrl, name);
            } else {
                notifyWebImageResult("save", granted ? "failed" : "permission_denied");
            }
            return;
        }
        if (requestCode != CAMERA_REQUEST) return;

        PermissionRequest pending = pendingWebPermission;
        pendingWebPermission = null;
        if (pending == null) return;

        if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            pending.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
        } else {
            pending.deny();
        }
    }


    private void saveImageInBackground(String dataUrl, String requestedName) {
        Thread saveThread = new Thread(() -> {
            Bitmap bitmap = null;
            boolean saved = false;
            try {
                bitmap = decodePngDataUrl(dataUrl);
                if (bitmap != null) saved = saveBitmapToGallery(bitmap, requestedName);
            } catch (Exception exception) {
                // Report storage-provider and decode failures without blocking the WebView thread.
            } finally {
                if (bitmap != null && !bitmap.isRecycled()) bitmap.recycle();
            }
            notifyWebImageResult("save", saved ? "saved" : "failed");
        }, "OpenMakeup-gallery-save");
        saveThread.start();
    }

    private void shareImageInBackground(String dataUrl, String requestedName) {
        Thread shareThread = new Thread(() -> {
            Bitmap bitmap = decodePngDataUrl(dataUrl);
            if (bitmap == null) {
                notifyWebImageResult("share", "failed");
                return;
            }
            beginShareImage(bitmap, requestedName);
        }, "OpenMakeup-image-share");
        shareThread.start();
    }

    private String safeImageName(String requested) {
        String name = requested == null ? "" : requested.replaceAll("[^A-Za-z0-9._-]", "_");
        if (name.isEmpty()) name = "Open-Makeup-" + System.currentTimeMillis();
        if (!name.toLowerCase().endsWith(".png")) name += ".png";
        return name;
    }

    private void notifyWebImageResult(String operation, String status) {
        String safeOperation = operation.replaceAll("[^a-z]", "");
        String safeStatus = status.replaceAll("[^a-z_]", "");
        runOnUiThread(() -> {
            if (webView != null) {
                webView.evaluateJavascript("window.onNativeImageResult && window.onNativeImageResult('"
                        + safeOperation + "','" + safeStatus + "')", null);
            }
        });
    }

    private boolean hasValidPngDataUrlEnvelope(String dataUrl) {
        return dataUrl != null && dataUrl.length() <= MAX_CAPTURE_DATA_URL_LENGTH
                && dataUrl.startsWith("data:image/png;base64,");
    }

    private Bitmap decodePngDataUrl(String dataUrl) {
        if (!hasValidPngDataUrlEnvelope(dataUrl)) return null;
        try {
            byte[] bytes = Base64.decode(dataUrl.substring(dataUrl.indexOf(',') + 1), Base64.DEFAULT);
            BitmapFactory.Options bounds = new BitmapFactory.Options();
            bounds.inJustDecodeBounds = true;
            BitmapFactory.decodeByteArray(bytes, 0, bytes.length, bounds);
            if (bounds.outWidth <= 0 || bounds.outHeight <= 0
                    || bounds.outWidth > 4096 || bounds.outHeight > 4096
                    || (long) bounds.outWidth * (long) bounds.outHeight > MAX_CAPTURE_PIXELS) return null;
            return BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

    private boolean saveBitmapToGallery(Bitmap bitmap, String requestedName) {
        if (bitmap == null || bitmap.isRecycled()) return false;
        OutputStream output = null;
        Uri inserted = null;
        File legacyTarget = null;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.Images.Media.DISPLAY_NAME, safeImageName(requestedName));
                values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
                values.put(MediaStore.Images.Media.RELATIVE_PATH,
                        Environment.DIRECTORY_PICTURES + "/Open Makeup");
                values.put(MediaStore.Images.Media.IS_PENDING, 1);
                inserted = getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
                if (inserted == null) return false;
                output = getContentResolver().openOutputStream(inserted);
                if (output == null || !bitmap.compress(Bitmap.CompressFormat.PNG, 100, output)) {
                    getContentResolver().delete(inserted, null, null);
                    return false;
                }
                output.close();
                output = null;
                ContentValues publish = new ContentValues();
                publish.put(MediaStore.Images.Media.IS_PENDING, 0);
                if (getContentResolver().update(inserted, publish, null, null) <= 0) {
                    getContentResolver().delete(inserted, null, null);
                    return false;
                }
                return true;
            }
            if (checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) return false;
            File directory = new File(Environment.getExternalStoragePublicDirectory(
                    Environment.DIRECTORY_PICTURES), "Open Makeup");
            if (!directory.exists() && !directory.mkdirs()) return false;
            legacyTarget = new File(directory, safeImageName(requestedName));
            boolean compressed;
            try (FileOutputStream legacyOutput = new FileOutputStream(legacyTarget)) {
                compressed = bitmap.compress(Bitmap.CompressFormat.PNG, 100, legacyOutput);
            }
            if (!compressed) {
                legacyTarget.delete();
                return false;
            }
            MediaScannerConnection.scanFile(this, new String[]{legacyTarget.getAbsolutePath()},
                    new String[]{"image/png"}, null);
            return true;
        } catch (Exception exception) {
            if (inserted != null) {
                try { getContentResolver().delete(inserted, null, null); } catch (Exception ignored) {}
            }
            if (legacyTarget != null && legacyTarget.exists()) {
                try { legacyTarget.delete(); } catch (Exception ignored) {}
            }
            return false;
        } finally {
            if (output != null) {
                try { output.close(); } catch (IOException ignored) {}
            }
        }
    }

    /**
     * Keep the file being handed to FileProvider plus at most nine retained
     * images, so the total cache never exceeds SHARE_CACHE_MAX_FILES after a
     * successful new export. The protected file is not evicted by timestamp.
     */
    private void pruneShareCache(File directory, File protectedFile) {
        File[] files = directory.listFiles((parent, name) ->
                name != null && name.startsWith("Open-Makeup-")
                        && name.toLowerCase(java.util.Locale.ROOT).endsWith(".png"));
        if (files == null) return;
        java.util.Arrays.sort(files, (left, right) ->
                Long.compare(right.lastModified(), left.lastModified()));
        long cutoff = System.currentTimeMillis() - SHARE_CACHE_MAX_AGE_MS;
        int retainedOtherFiles = 0;
        for (File file : files) {
            if (protectedFile != null && file.equals(protectedFile)) continue;
            if (file.lastModified() < cutoff
                    || retainedOtherFiles >= SHARE_CACHE_MAX_FILES - 1) {
                try { file.delete(); } catch (Exception ignored) {}
            } else {
                retainedOtherFiles++;
            }
        }
    }

    private void beginShareImage(Bitmap bitmap, String requestedName) {
        File directory = new File(getCacheDir(), "OpenMakeup");
        if (!directory.exists() && !directory.mkdirs()) {
            if (bitmap != null && !bitmap.isRecycled()) bitmap.recycle();
            notifyWebImageResult("share", "failed");
            return;
        }
        File target = new File(directory, safeImageName(requestedName));
        try (FileOutputStream output = new FileOutputStream(target)) {
            if (!bitmap.compress(Bitmap.CompressFormat.PNG, 100, output)) {
                try { target.delete(); } catch (Exception ignored) {}
                notifyWebImageResult("share", "failed");
                return;
            }
        } catch (Exception exception) {
            try { target.delete(); } catch (Exception ignored) {}
            notifyWebImageResult("share", "failed");
            return;
        } finally {
            if (bitmap != null && !bitmap.isRecycled()) bitmap.recycle();
        }
        // Prune after writing, not before: include this just-created image in
        // the bound and protect it until the chooser has a usable URI.
        pruneShareCache(directory, target);
        try {
            Uri uri = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", target);
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType("image/png");
            send.putExtra(Intent.EXTRA_STREAM, uri);
            send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            runOnUiThread(() -> {
                try {
                    startActivity(Intent.createChooser(send, "Share Open Makeup photo"));
                    notifyWebImageResult("share", "share_opened");
                } catch (Exception exception) {
                    try { target.delete(); } catch (Exception ignored) {}
                    notifyWebImageResult("share", "failed");
                }
            });
        } catch (Exception exception) {
            try { target.delete(); } catch (Exception ignored) {}
            notifyWebImageResult("share", "failed");
        }
    }

    private final class OpenMakeupBridge {
        @JavascriptInterface
        public String saveImage(String dataUrl, String requestedName) {
            if (!hasValidPngDataUrlEnvelope(dataUrl)) return "failed";
            String name = safeImageName(requestedName);
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q
                    && checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                synchronized (MainActivity.this) {
                    // Keep at most one permission-gated export request; the UI also
                    // disables its action until the asynchronous callback arrives.
                    if (pendingSaveDataUrl != null) return "failed";
                    pendingSaveDataUrl = dataUrl;
                    pendingSaveName = name;
                }
                runOnUiThread(() -> {
                    if (webView == null || isFinishing()) {
                        synchronized (MainActivity.this) {
                            pendingSaveDataUrl = null;
                            pendingSaveName = null;
                        }
                        notifyWebImageResult("save", "failed");
                        return;
                    }
                    requestPermissions(
                            new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, STORAGE_REQUEST);
                });
                return "permission_required";
            }
            saveImageInBackground(dataUrl, name);
            return "save_started";
        }

        @JavascriptInterface
        public String shareImage(String dataUrl, String requestedName) {
            if (!hasValidPngDataUrlEnvelope(dataUrl)) return "failed";
            shareImageInBackground(dataUrl, safeImageName(requestedName));
            return "share_started";
        }
    }

    @Override
    protected void onPause() {
        if (webView != null) {
            // Let the web runtime stop an already-running camera before WebView
            // timers are paused. The JavaScript handler ignores incomplete startup.
            webView.evaluateJavascript(
                    "if(window.handleOpenMakeupPause){window.handleOpenMakeupPause();}", null);
            webView.onPause();
        }
        super.onPause();
    }

    @Override
    protected void onStop() {
        // onStop distinguishes true backgrounding from the transient camera
        // permission prompt, which may only trigger onPause().
        if (webView != null) {
            webView.evaluateJavascript(
                    "if(window.handleOpenMakeupHostStop){window.handleOpenMakeupHostStop();}", null);
        }
        super.onStop();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
            webView.postDelayed(() -> {
                if (webView != null) {
                    webView.evaluateJavascript(
                            "if(window.handleOpenMakeupResume){window.handleOpenMakeupResume();}", null);
                }
            }, 250);
        }
    }

    @Override
    public void onBackPressed() {
        if (webView == null) {
            super.onBackPressed();
            return;
        }
        webView.evaluateJavascript(
                "(function(){return !!(window.handleAndroidBack && window.handleAndroidBack());})()",
                value -> {
                    if (!"true".equals(value)) {
                        if (webView != null && webView.canGoBack()) {
                            webView.goBack();
                        } else {
                            MainActivity.super.onBackPressed();
                        }
                    }
                });
    }

    @Override
    protected void onDestroy() {
        synchronized (this) {
            pendingSaveDataUrl = null;
            pendingSaveName = null;
        }
        if (pendingWebPermission != null) {
            pendingWebPermission.deny();
            pendingWebPermission = null;
        }
        if (webView != null) {
            webView.stopLoading();
            webView.onPause();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
