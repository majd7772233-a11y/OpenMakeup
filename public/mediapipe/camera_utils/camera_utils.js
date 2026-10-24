/**
 * Local camera adapter for the subset of the MediaPipe Camera API used by Open Makeup.
 *
 * Kept in the app bundle so camera startup and switching do not depend on a CDN or
 * a package-install-time side effect. The public surface matches `new Camera(video, { onFrame, width, height, facingMode })`.
 */
(function installOpenMakeupCamera(root) {
  'use strict';

  if (!root) return;

  function stopTracks(stream) {
    if (!stream || typeof stream.getTracks !== 'function') return;
    for (const track of stream.getTracks()) {
      try { track.stop(); } catch (_) {}
    }
  }

  function positiveDimension(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.round(number) : fallback;
  }

  class Camera {
    constructor(videoElement, options) {
      if (!videoElement) throw new TypeError('Camera requires a video element.');
      this.video = videoElement;
      this.options = options || {};
      this.stream = null;
      this.running = false;
      this._generation = 0;
      this._starting = null;
      this._frameHandle = null;
      this._frameHandleType = null;
      this._lastFrameTime = null;
      this._processingFrame = false;
    }

    start() {
      if (this.running) return Promise.resolve(this);
      if (this._starting) return this._starting;

      const generation = ++this._generation;
      const pending = this._start(generation);
      this._starting = pending;
      pending.then(
        () => { if (this._starting === pending) this._starting = null; },
        () => { if (this._starting === pending) this._starting = null; }
      );
      return pending;
    }

    async _start(generation) {
      const navigatorObject = root.navigator;
      const mediaDevices = navigatorObject && navigatorObject.mediaDevices;
      if (!mediaDevices || typeof mediaDevices.getUserMedia !== 'function') {
        throw new Error('This WebView does not expose camera capture. Update Android System WebView and retry.');
      }

      const videoConstraints = {
        width: { ideal: positiveDimension(this.options.width, 640) },
        height: { ideal: positiveDimension(this.options.height, 480) },
      };
      const facingMode = this.options.facingMode;
      if (facingMode === 'user' || facingMode === 'environment') {
        videoConstraints.facingMode = { ideal: facingMode };
      }

      let stream;
      try {
        stream = await mediaDevices.getUserMedia({ audio: false, video: videoConstraints });
        if (generation !== this._generation) {
          stopTracks(stream);
          throw new Error('Camera startup was cancelled by a lifecycle change.');
        }

        this.stream = stream;
        this.video.muted = true;
        this.video.autoplay = true;
        if (typeof this.video.setAttribute === 'function') {
          this.video.setAttribute('playsinline', '');
          this.video.setAttribute('autoplay', '');
          this.video.setAttribute('muted', '');
        }
        this.video.srcObject = stream;
        if (typeof this.video.play === 'function') await this.video.play();

        if (generation !== this._generation) {
          stopTracks(stream);
          if (this.video.srcObject === stream) this.video.srcObject = null;
          if (this.stream === stream) this.stream = null;
          throw new Error('Camera startup was cancelled by a lifecycle change.');
        }

        this.running = true;
        this._lastFrameTime = null;
        this._scheduleNextFrame(generation);
        return this;
      } catch (error) {
        this.running = false;
        if (stream) {
          stopTracks(stream);
          if (this.video.srcObject === stream) this.video.srcObject = null;
          if (this.stream === stream) this.stream = null;
        }
        throw error;
      }
    }

    _scheduleNextFrame(generation) {
      if (!this.running || generation !== this._generation || this._frameHandle !== null) return;
      const video = this.video;

      if (typeof video.requestVideoFrameCallback === 'function') {
        this._frameHandleType = 'video';
        this._frameHandle = video.requestVideoFrameCallback((_now, metadata) => {
          this._frameHandle = null;
          this._frameHandleType = null;
          const frameTime = metadata && Number.isFinite(metadata.mediaTime)
            ? metadata.mediaTime : Number(video.currentTime);
          void this._processFrame(generation, frameTime);
        });
        return;
      }

      if (typeof root.requestAnimationFrame !== 'function') {
        this._reportError(new Error('This WebView does not support camera frame scheduling.'));
        return;
      }

      this._frameHandleType = 'animation';
      this._frameHandle = root.requestAnimationFrame(() => {
        this._frameHandle = null;
        this._frameHandleType = null;
        void this._processFrame(generation, Number(video.currentTime));
      });
    }

    async _processFrame(generation, frameTime) {
      if (!this.running || generation !== this._generation) return;
      const video = this.video;
      const frameReady = Number(video.readyState) >= 2
        && Number(video.videoWidth) > 0
        && Number(video.videoHeight) > 0;
      const hasNewFrame = Number.isFinite(frameTime) && frameTime !== this._lastFrameTime;

      if (frameReady && hasNewFrame && !this._processingFrame) {
        this._lastFrameTime = frameTime;
        this._processingFrame = true;
        try {
          if (typeof this.options.onFrame === 'function') await this.options.onFrame();
        } catch (error) {
          this._reportError(error);
        } finally {
          this._processingFrame = false;
        }
      }

      this._scheduleNextFrame(generation);
    }

    _reportError(error) {
      if (typeof this.options.onError === 'function') {
        try { this.options.onError(error); } catch (_) {}
      } else if (root.console && typeof root.console.error === 'function') {
        root.console.error('OpenMakeup camera frame failed:', error);
      }
    }

    stop() {
      this._generation += 1;
      this.running = false;

      if (this._frameHandle !== null) {
        if (this._frameHandleType === 'video' && typeof this.video.cancelVideoFrameCallback === 'function') {
          try { this.video.cancelVideoFrameCallback(this._frameHandle); } catch (_) {}
        } else if (this._frameHandleType === 'animation' && typeof root.cancelAnimationFrame === 'function') {
          try { root.cancelAnimationFrame(this._frameHandle); } catch (_) {}
        }
      }
      this._frameHandle = null;
      this._frameHandleType = null;

      const stream = this.stream;
      this.stream = null;
      stopTracks(stream);
      if (this.video.srcObject === stream) this.video.srcObject = null;
      if (typeof this.video.pause === 'function') {
        try { this.video.pause(); } catch (_) {}
      }
      this._lastFrameTime = null;
    }
  }

  root.Camera = Camera;
})(typeof window !== 'undefined' ? window : globalThis);
