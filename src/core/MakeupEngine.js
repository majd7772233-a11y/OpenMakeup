import {
    Group,
    LinearFilter,
    OrthographicCamera,
    RGBAFormat,
    Scene,
    Vector2,
    Vector3,
    Vector4,
    WebGLRenderer,
    VideoTexture,
    MeshBasicMaterial,
    PlaneGeometry,
    SRGBColorSpace,
    Mesh,
    ClampToEdgeWrapping,
    TextureLoader,
    Float32BufferAttribute,
} from 'three';

import { FaceMeshModelController } from './FaceMeshModelController.js';
import {
    createLeftEyeNurbsMesh,
    createRightEyeNurbsMesh,
    updateFaceNurbsMesh,
} from './FaceNurbsModelController.js';
import {
    loadBlurMat,
    loadBlushMat,
    loadEyeLineMat,
    loadEyeShadowMat,
    loadFoundationMat,
    loadLipMats,
    loadMascaraMat,
} from './materials.js';
import { loadFaceWarpMat } from './faceWarpMaterial.js';
import { createAssetResolver, defaultConfig, resolveAsset } from '../config.js';
import { calculateVideoBoxLayout } from './videoLayout.js';
import { waitForCameraFrames } from './cameraReadiness.js';
import { normalizeCameraFacingMode, supportsCameraFacingMode } from './camera-capabilities.js';
import { resolvePerformanceProfile } from './performance-profile.js';
import {
    MORPH_CONTROLS, MORPH_TARGETS_EXTRA, MORPH_WEIGHT_MIN, MORPH_WEIGHT_MAX, resolveMorphTarget,
} from '../morphs.js';

const KNOWN_MORPH_INPUTS = new Set([
    ...Object.keys(MORPH_CONTROLS),
    ...Object.values(MORPH_CONTROLS).map((control) => control.target),
    ...MORPH_TARGETS_EXTRA,
]);

const PATTERN_TARGETS = {
    blush: { material: 'blushMat', uniform: '_EyeShadowTexture', flipY: false },
    eyeshadow: { material: 'eyeShadowMat', uniform: '_EyeShadowTexture', flipY: false },
    eyeline: { material: 'eyeLineMat', uniform: 'map', flipY: true },
    mascara: { material: 'mascaraMat', uniform: 'map', flipY: true },
};

/** Convert a '#rrggbb' string to a THREE.Vector4 with alpha 1. */
function hexToVector4(hex) {
    const cleanHex = String(hex).replace(/^#/, '');
    if (!/^[0-9a-fA-F]{6}$/.test(cleanHex)) {
        throw new Error('Invalid color value: ' + hex);
    }
    const r = parseInt(cleanHex.slice(0, 2), 16);
    const g = parseInt(cleanHex.slice(2, 4), 16);
    const b = parseInt(cleanHex.slice(4, 6), 16);
    return new Vector4(r / 255, g / 255, b / 255, 1);
}

function withTimeout(promise, timeoutMs, message) {
    let timer = null;
    return Promise.race([
        Promise.resolve(promise),
        new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error(message)), timeoutMs);
        }),
    ]).finally(() => {
        if (timer !== null) clearTimeout(timer);
    });
}

/**
 * MakeupEngine — the real-time AR makeup renderer.
 *
 * Instantiable and DOM-decoupled: pass in your own <video> and canvas elements
 * and a configurable asset base. The old document CustomEvents (setAR /
 * setPattern / ClearAll / ClearPartOfMakeUp) are now methods.
 *
 * MediaPipe FaceMesh / Camera are NOT imported here (the legacy @mediapipe
 * packages are global-script libraries that break ESM bundlers). Instead they
 * are taken from `window.FaceMesh` / `window.Camera` (load them via a <script>
 * tag) or injected via the `faceMeshClass` / `cameraClass` options.
 */
export class MakeupEngine {
    /**
     * @param {object} options
     * @param {HTMLVideoElement}  options.video         camera video element (required)
     * @param {HTMLCanvasElement} options.renderCanvas  WebGL output canvas (required)
     * @param {HTMLCanvasElement} [options.overlayCanvas] optional 2D overlay canvas
     * @param {string} [options.assetsBaseUrl]    base path for shaders/models/patterns
     * @param {string} [options.mediapipeBaseUrl] base path for the MediaPipe runtime files
     * @param {object} [options.faceMesh]         MediaPipe FaceMesh options override
     * @param {object} [options.camera]           { width, height } override
     * @param {Function} [options.faceMeshClass]  MediaPipe FaceMesh class (defaults to window.FaceMesh)
     * @param {Function} [options.cameraClass]    MediaPipe Camera class (defaults to window.Camera)
     */
    constructor(options = {}) {
        const {
            video,
            renderCanvas,
            overlayCanvas = null,
            assetsBaseUrl,
            mediapipeBaseUrl,
            faceMesh,
            camera,
            faceMeshClass,
            cameraClass,
            onFaceTrackingChange = null,
            onWebGLContextChange = null,
        } = options;

        if (!video) throw new Error('MakeupEngine: `video` element is required');
        if (!renderCanvas) throw new Error('MakeupEngine: `renderCanvas` element is required');

        this.video = video;
        this.renderCanvas = renderCanvas;
        this.overlayCanvas = overlayCanvas;
        this.overlayCtx = overlayCanvas ? overlayCanvas.getContext('2d') : null;

        this.assets = createAssetResolver(assetsBaseUrl ?? defaultConfig.assetsBaseUrl);
        this.mediapipeBaseUrl = mediapipeBaseUrl ?? defaultConfig.mediapipeBaseUrl;
        const deviceProfile = resolvePerformanceProfile({
            devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
            hardwareConcurrency: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : undefined,
            deviceMemory: typeof navigator !== 'undefined' ? navigator.deviceMemory : undefined,
        });
        this.performanceProfile = deviceProfile;
        this.config = {
            faceMesh: { ...defaultConfig.faceMesh, ...(faceMesh || {}) },
            camera: { ...defaultConfig.camera, ...deviceProfile.camera, ...(camera || {}) },
        };
        this._cameraFacingMode = normalizeCameraFacingMode(this.config.camera.facingMode) || 'user';
        this._cameraFacingModeVerified = false;

        // MediaPipe classes (injected or resolved from globals at init)
        this._FaceMeshClass = faceMeshClass || null;
        this._CameraClass = cameraClass || null;

        // three.js state
        this.scene = null;
        this.camera3D = null;
        this.renderer = null;
        this.sceneSize = new Vector2();
        this.videoTexture = null;
        this.videoPlane = null;

        // face model + makeup
        this.faceModel = null;
        this.faceObject3D = null;
        this.blureMesh = null;
        this.blushMesh = null;
        this.lipsMesh = null;
        this.eyeShadowMesh = null;
        this.foundationMesh = null;
        this.eyeLineLeftNurbs = null;
        this.eyeLineRightNurbs = null;
        this.mascaraLeftNurbs = null;
        this.mascaraRightNurbs = null;

        this.blurMat = null;
        this.blushMat = null;
        this.lipsMat = null;
        this.eyeShadowMat = null;
        this.foundationMat = null;
        this.eyeLineMat = null;
        this.mascaraMat = null;

        this._texLoader = new TextureLoader();
        this._rafId = null;
        this._camera = null;
        this._faceMesh = null;
        this._ready = false;
        this._initPromise = null;
        this._cameraStartPromise = null;
        this._cameraStartToken = null;
        this._cameraRunning = false;
        this._lifecycleGeneration = 0;
        this._activeLayers = new Set();
        this._faceVisible = false;
        this._noFaceFrames = 0;
        this._reportedFaceTrackingState = null;
        this.onFaceTrackingChange = typeof onFaceTrackingChange === 'function' ? onFaceTrackingChange : null;
        this.onWebGLContextChange = typeof onWebGLContextChange === 'function' ? onWebGLContextChange : null;
        this._webglContextLost = false;
        this._onWebGLContextLost = (event) => {
            if (event && typeof event.preventDefault === 'function') event.preventDefault();
            if (this._webglContextLost) return;
            this._webglContextLost = true;
            if (this._rafId != null) cancelAnimationFrame(this._rafId);
            this._rafId = null;
            this._notifyWebGLContextChange('lost');
        };
        this._onWebGLContextRestored = () => {
            if (!this.renderer) return;
            this._webglContextLost = false;
            try {
                this.renderer.resetState();
                if (this.videoTexture) this.videoTexture.needsUpdate = true;
                for (const texture of this._defaultPatternTextures.values()) texture.needsUpdate = true;
                for (const texture of this._activePatternTextures.values()) texture.needsUpdate = true;
                this._sizeToVideoBox();
                this._syncFaceLayerVisibility();
                if (this._cameraRunning && this._rafId == null) this._animate();
                this._notifyWebGLContextChange('restored');
            } catch (error) {
                console.error('OpenMakeupSDK: WebGL context restoration failed:', error);
                this._notifyWebGLContextChange('restore-failed');
            }
        };
        this._wireframeEnabled = false;
        this._blurEnabled = false;
        this._defaultPatternTextures = new Map();
        this._activePatternTextures = new Map();
        this._patternRequestVersions = new Map();
        this._cameraWorldPosition = new Vector3();

        // face reshape (morph) state
        this.faceVideoMesh = null;     // camera video projected onto the morphable face mesh
        this.wireMesh = null;          // debug wireframe of the morphed mesh
        this._morphReady = false;
        this._morphDeltas = null;      // geometry.morphAttributes.position (deltas per target)
        this._morphDict = null;        // glb target name -> index
        this._morphInfluences = null;  // Float32Array, one weight per target
        this._basePos = null;          // unmorphed fit position attribute (for the warp shader)
        this._pendingMorph = {};       // morph() calls made before the model finished loading
        this._morphModelIPD = null;    // eye distance in the original model space (scale ref)
        this.morphGain = 1.0;          // global multiplier for morph strength (tunable)
    }

    /** Set up the scene, load the face model + materials, start tracking. */
    async init(onReady) {
        if (this._ready) return this;
        if (this._initPromise) return this._initPromise;

        this._initPromise = (async () => {
            try {
                this._resolveMediaPipeClasses();
                this._setupScene();
                this._sizeToVideoBox();
                window.addEventListener('resize', this._sizeToVideoBox);
                this.video.addEventListener('loadedmetadata', this._sizeToVideoBox);
                if (this.overlayCanvas) {
                    this._resizeOverlay();
                    window.addEventListener('resize', this._resizeOverlay);
                }

                await this._loadFaceAndMaterials();
                this._setupFaceMesh();
                this._setupCamera();
                await withTimeout(
                    this.start(),
                    12000,
                    'Camera startup timed out. Check camera permission and try again.',
                );
                this._ready = true;
                if (onReady) {
                    try { onReady(this); } catch (callbackError) {
                        console.warn('OpenMakeupSDK: onReady callback failed:', callbackError);
                    }
                }
                return this;
            } catch (error) {
                this._ready = false;
                this.dispose();
                throw error;
            } finally {
                this._initPromise = null;
            }
        })();
        return this._initPromise;
    }

    _resolveMediaPipeClasses() {
        if (!this._FaceMeshClass && typeof window !== 'undefined') this._FaceMeshClass = window.FaceMesh;
        if (!this._CameraClass && typeof window !== 'undefined') this._CameraClass = window.Camera;
        if (!this._FaceMeshClass) {
            throw new Error('OpenMakeupSDK: MediaPipe FaceMesh not found. Load @mediapipe/face_mesh (window.FaceMesh) via a <script> tag, or pass `faceMeshClass`.');
        }
        if (!this._CameraClass) {
            throw new Error('OpenMakeupSDK: MediaPipe Camera not found. Load @mediapipe/camera_utils (window.Camera) via a <script> tag, or pass `cameraClass`.');
        }
    }

    _setupScene() {
        this.scene = new Scene();
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera3D = new OrthographicCamera(
            -width / 2, width / 2,
            height / 2, -height / 2,
            200, 1000,
        );
        this.camera3D.position.set(0, 0, 500);
        this.camera3D.lookAt(0, 0, 0);
        this.camera3D.updateProjectionMatrix();

        this.renderer = new WebGLRenderer({
            canvas: this.renderCanvas,
            alpha: true,
            antialias: this.performanceProfile.antialias,
            preserveDrawingBuffer: false,
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.performanceProfile.maxPixelRatio));
        this.renderCanvas.addEventListener('webglcontextlost', this._onWebGLContextLost, false);
        this.renderCanvas.addEventListener('webglcontextrestored', this._onWebGLContextRestored, false);

        this.videoTexture = new VideoTexture(this.video);
        this.videoTexture.minFilter = LinearFilter;
        this.videoTexture.magFilter = LinearFilter;
        this.videoTexture.format = RGBAFormat;
        this.videoTexture.colorSpace = SRGBColorSpace;
        const videoMaterial = new MeshBasicMaterial({ map: this.videoTexture });
        this.videoPlane = new Mesh(new PlaneGeometry(1, 1), videoMaterial);
        this.videoPlane.renderOrder = -10;
        this.scene.add(this.videoPlane);
    }

    _syncVideoTextureResolution() {
        const uniform = this.blurMat && this.blurMat.uniforms && this.blurMat.uniforms.resolution;
        const resolution = uniform && uniform.value;
        const width = Number(this.video && this.video.videoWidth);
        const height = Number(this.video && this.video.videoHeight);
        if (!resolution || !(width > 0) || !(height > 0) || !Number.isFinite(width) || !Number.isFinite(height)) {
            return false;
        }
        if (typeof resolution.set === 'function') resolution.set(width, height);
        else { resolution.x = width; resolution.y = height; }
        return true;
    }

    _sizeToVideoBox = () => {
        const container = this.video.parentElement;
        if (!container) return;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        const vidW = this.video.videoWidth || containerWidth;
        const vidH = this.video.videoHeight || containerHeight;

        if (containerWidth <= 0 || containerHeight <= 0) return;
        // The blur shader samples the live VideoTexture, so its pixel step must
        // use source-frame dimensions rather than the browser window size.
        this._syncVideoTextureResolution();
        const fitMode = container.classList && container.classList.contains('fullscreen') ? 'contain' : 'cover';
        const layout = calculateVideoBoxLayout(vidW, vidH, containerWidth, containerHeight, fitMode);
        const { width: targetWidth, height: targetHeight } = layout;
        if (targetWidth <= 0 || targetHeight <= 0) return;

        this.sceneSize.set(targetWidth, targetHeight);

        const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, this.performanceProfile.maxPixelRatio));
        this.renderer.setPixelRatio(dpr);
        this.renderer.setSize(targetWidth, targetHeight, false);

        const el = this.renderer.domElement;
        el.style.position = 'absolute';
        el.style.left = `${layout.left}px`;
        el.style.top = `${layout.top}px`;
        el.style.pointerEvents = 'none';
        el.style.maxWidth = 'none';
        el.style.width = `${targetWidth}px`;
        el.style.height = `${targetHeight}px`;

        this.camera3D.left = -targetWidth / 2;
        this.camera3D.right = targetWidth / 2;
        this.camera3D.top = targetHeight / 2;
        this.camera3D.bottom = -targetHeight / 2;
        this.camera3D.updateProjectionMatrix();

        if (this.videoPlane && this.videoPlane.geometry) {
            this.videoPlane.geometry.dispose();
        }
        this.videoPlane.geometry = new PlaneGeometry(targetWidth, targetHeight);
        this.videoPlane.position.set(0, 0, 0);
    };

    _resizeOverlay = () => {
        if (!this.overlayCanvas) return;
        this.overlayCanvas.width = window.innerWidth;
        this.overlayCanvas.height = window.innerHeight;
    };

    async _loadFaceAndMaterials() {
        this.faceModel = new FaceMeshModelController(
            this.assets.model('face.glb'),
            this.sceneSize,
            this.scene,
        );
        // Model loading is explicit and awaited exactly once.
        const mesh = await this.faceModel.loadModel();
        this.faceObject3D = new Group();
        mesh.visible = false;
        this.faceObject3D.add(mesh);
        this.scene.add(this.faceObject3D);
        this._ensureMorphBuffers();

        const refractUniforms = {
            tScene: { value: this.videoTexture },
            transmission: { value: 1.0 },
            roughTransmission: { value: 0.4 },
            resolution: { value: new Vector2(window.innerWidth, window.innerHeight) },
            strength: { value: 1.0 },
            ior: { value: 1.0 },
        };

        // Material loaders reject when a required shader or texture is absent;
        // the UI must not be told that an incompletely loaded engine is ready.
        const materialResults = await Promise.allSettled([
            loadFaceWarpMat(this.assets, this.videoTexture),
            loadBlurMat(this.assets, refractUniforms),
            loadBlushMat(this.assets),
            loadLipMats(this.assets),
            loadEyeShadowMat(this.assets),
            loadFoundationMat(this.assets),
            loadEyeLineMat(this.assets),
            loadMascaraMat(this.assets),
        ]);
        const materialFailure = materialResults.find((result) => result.status === 'rejected');
        if (materialFailure) {
            // Promise.allSettled lets every in-flight load finish so materials
            // that succeeded before another asset failed can be disposed too.
            const disposedTextures = new Set();
            for (const result of materialResults) {
                if (result.status !== 'fulfilled') continue;
                const material = result.value;
                if (material && material.uniforms) {
                    for (const uniform of Object.values(material.uniforms)) {
                        const texture = uniform && uniform.value;
                        if (texture && texture.isTexture && !disposedTextures.has(texture)) {
                            disposedTextures.add(texture);
                            texture.dispose();
                        }
                    }
                }
                if (material && material.dispose) material.dispose();
            }
            throw materialFailure.reason;
        }
        const [
            faceWarpMat,
            blurMat,
            blushMat,
            lipsMat,
            eyeShadowMat,
            foundationMat,
            eyeLineMat,
            mascaraMat,
        ] = materialResults.map((result) => result.value);

        this.blurMat = blurMat;
        // The camera may have delivered metadata while materials were loading;
        // sync again now that the resolution uniform is available.
        this._syncVideoTextureResolution();
        this.blushMat = blushMat;
        this.lipsMat = lipsMat;
        this.eyeShadowMat = eyeShadowMat;
        this.foundationMat = foundationMat;
        this.eyeLineMat = eyeLineMat;
        this.mascaraMat = mascaraMat;
        this._defaultPatternTextures = new Map([
            ['blush', this.blushMat.uniforms._EyeShadowTexture.value],
            ['eyeshadow', this.eyeShadowMat.uniforms._EyeShadowTexture.value],
            ['eyeline', this.eyeLineMat.uniforms.map.value],
            ['mascara', this.mascaraMat.uniforms.map.value],
        ]);
        this._activePatternTextures.clear();
        this._updateCameraUniforms();

        this.faceVideoMesh = new Mesh(mesh.geometry, faceWarpMat);
        this.faceVideoMesh.renderOrder = 1;
        this.faceVideoMesh.position.setZ(0.5);
        this.faceVideoMesh.frustumCulled = false;
        this.faceVideoMesh.visible = false;
        this.faceObject3D.add(this.faceVideoMesh);

        const wireMat = new MeshBasicMaterial({
            color: 0x00ff88,
            wireframe: true,
            transparent: true,
            opacity: 0.9,
            depthTest: false,
            depthWrite: false,
        });
        this.wireMesh = new Mesh(mesh.geometry, wireMat);
        this.wireMesh.renderOrder = 999;
        this.wireMesh.frustumCulled = false;
        this.wireMesh.visible = false;
        this.faceObject3D.add(this.wireMesh);

        this.blureMesh = new Mesh(mesh.geometry, this.blurMat);
        this.blureMesh.renderOrder = 0;
        this.blureMesh.position.setZ(0);
        this.blureMesh.visible = false;
        this.faceObject3D.add(this.blureMesh);

        this.blushMesh = new Mesh(mesh.geometry, this.blushMat);
        this.blushMesh.renderOrder = 2;
        this.blushMesh.position.setZ(2);
        this.blushMesh.visible = false;
        this.faceObject3D.add(this.blushMesh);

        this.lipsMesh = new Mesh(mesh.geometry, this.lipsMat);
        this.lipsMesh.renderOrder = 3;
        this.lipsMesh.position.setZ(3);
        this.lipsMesh.visible = false;
        this.faceObject3D.add(this.lipsMesh);

        this.eyeShadowMesh = new Mesh(mesh.geometry, this.eyeShadowMat);
        this.eyeShadowMesh.renderOrder = 3;
        this.eyeShadowMesh.position.setZ(3);
        this.eyeShadowMesh.visible = false;
        this.faceObject3D.add(this.eyeShadowMesh);

        this.foundationMesh = new Mesh(mesh.geometry, this.foundationMat);
        this.foundationMesh.renderOrder = 1;
        this.foundationMesh.position.setZ(1);
        this.foundationMesh.visible = false;
        this.faceObject3D.add(this.foundationMesh);

        this.eyeLineLeftNurbs = createLeftEyeNurbsMesh([], this.eyeLineMat, this.sceneSize.x, this.sceneSize.y);
        this.eyeLineLeftNurbs.mesh.renderOrder = 14;
        this.eyeLineLeftNurbs.mesh.position.setZ(15);
        this.eyeLineLeftNurbs.mesh.visible = false;
        this.scene.add(this.eyeLineLeftNurbs.mesh);

        this.eyeLineRightNurbs = createRightEyeNurbsMesh([], this.eyeLineMat, this.sceneSize.x, this.sceneSize.y);
        this.eyeLineRightNurbs.mesh.renderOrder = 14;
        this.eyeLineRightNurbs.mesh.position.setZ(15);
        this.eyeLineRightNurbs.mesh.visible = false;
        this.scene.add(this.eyeLineRightNurbs.mesh);

        this.mascaraLeftNurbs = createLeftEyeNurbsMesh([], this.mascaraMat, this.sceneSize.x, this.sceneSize.y);
        this.mascaraLeftNurbs.mesh.renderOrder = 15;
        this.mascaraLeftNurbs.mesh.position.setZ(50);
        this.mascaraLeftNurbs.mesh.visible = false;
        this.scene.add(this.mascaraLeftNurbs.mesh);

        this.mascaraRightNurbs = createRightEyeNurbsMesh([], this.mascaraMat, this.sceneSize.x, this.sceneSize.y);
        this.mascaraRightNurbs.mesh.renderOrder = 15;
        this.mascaraRightNurbs.mesh.position.setZ(50);
        this.mascaraRightNurbs.mesh.visible = false;
        this.scene.add(this.mascaraRightNurbs.mesh);
    }

    _setupFaceMesh() {
        this._faceMesh = new this._FaceMeshClass({
            locateFile: (file) => resolveAsset(this.mediapipeBaseUrl, file),
        });
        this._faceMesh.setOptions(this.config.faceMesh);
        this._faceMesh.onResults(this._onResults);
    }

    _setupCamera() {
        this._camera = new this._CameraClass(this.video, {
            onFrame: async () => {
                await this._faceMesh.send({ image: this.video });
            },
            width: this.config.camera.width,
            height: this.config.camera.height,
            facingMode: this._cameraFacingMode,
        });
    }

    _onResults = (results) => {
        this._updateCameraUniforms();
        if (this.overlayCtx) {
            this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
        }

        const landmarks = results.multiFaceLandmarks && results.multiFaceLandmarks[0];
        if (!landmarks || landmarks.length === 0) {
            this._noFaceFrames += 1;
            // Hide stale face-attached makeup after a short grace period to avoid
            // flicker from one intermittently missed detection.
            if (this._noFaceFrames >= 3) {
                if (this._faceVisible) { this._faceVisible = false; this._syncFaceLayerVisibility(); }
                this._notifyFaceTrackingState(false);
            }
            if (this.renderer && !this._webglContextLost) this.renderer.render(this.scene, this.camera3D);
            return;
        }

        this._noFaceFrames = 0;
        this._faceVisible = true;
        this._notifyFaceTrackingState(true);
        this._syncFaceLayerVisibility();
        if (this.faceModel && this.faceModel.scene != null) {
            this.faceModel.updateWithLandmarks(landmarks);
            this._applyMorph();
            if (this.lipsMat) this.faceModel.calculateLipOpen(landmarks, this.lipsMat);
            if (this.eyeLineLeftNurbs) updateFaceNurbsMesh(landmarks, this.eyeLineLeftNurbs, this.sceneSize.x, this.sceneSize.y, true);
            if (this.eyeLineRightNurbs) updateFaceNurbsMesh(landmarks, this.eyeLineRightNurbs, this.sceneSize.x, this.sceneSize.y, false);
            if (this.mascaraLeftNurbs) updateFaceNurbsMesh(landmarks, this.mascaraLeftNurbs, this.sceneSize.x, this.sceneSize.y, true);
            if (this.mascaraRightNurbs) updateFaceNurbsMesh(landmarks, this.mascaraRightNurbs, this.sceneSize.x, this.sceneSize.y, false);
        }
        if (this.renderer && !this._webglContextLost) this.renderer.render(this.scene, this.camera3D);
    };

    _notifyFaceTrackingState(detected) {
        const state = detected === true;
        if (this._reportedFaceTrackingState === state) return;
        this._reportedFaceTrackingState = state;
        if (this.onFaceTrackingChange) {
            try { this.onFaceTrackingChange(state); }
            catch (error) { console.warn('OpenMakeup: face-tracking callback failed:', error); }
        }
    }

    _syncFaceLayerVisibility() {
        const faceVisible = this._faceVisible;
        if (this.faceVideoMesh) this.faceVideoMesh.visible = faceVisible;
        if (this.blushMesh) this.blushMesh.visible = faceVisible && this._activeLayers.has('blush');
        if (this.lipsMesh) this.lipsMesh.visible = faceVisible && this._activeLayers.has('lipstick');
        if (this.eyeShadowMesh) this.eyeShadowMesh.visible = faceVisible && this._activeLayers.has('eyeshadow');
        if (this.foundationMesh) this.foundationMesh.visible = faceVisible && this._activeLayers.has('foundation');
        if (this.eyeLineLeftNurbs) this.eyeLineLeftNurbs.mesh.visible = faceVisible && this._activeLayers.has('eyeline');
        if (this.eyeLineRightNurbs) this.eyeLineRightNurbs.mesh.visible = faceVisible && this._activeLayers.has('eyeline');
        if (this.mascaraLeftNurbs) this.mascaraLeftNurbs.mesh.visible = faceVisible && this._activeLayers.has('mascara');
        if (this.mascaraRightNurbs) this.mascaraRightNurbs.mesh.visible = faceVisible && this._activeLayers.has('mascara');
        if (this.blureMesh) this.blureMesh.visible = faceVisible && this._blurEnabled;
        if (this.wireMesh) this.wireMesh.visible = faceVisible && this._wireframeEnabled;
    };

    // Camera results drive steady-state rendering; this method only paints a wake-up frame.
    // Avoid keeping a second perpetual render loop alive beside MediaPipe's frame callback.
    _animate = () => {
        this._rafId = null;
        if (this._webglContextLost) return;
        this._updateCameraUniforms();
        if (this.renderer && !this._webglContextLost) this.renderer.render(this.scene, this.camera3D);
    };

    _updateCameraUniforms() {
        if (!this.camera3D) return;
        this.camera3D.updateMatrixWorld();
        this.camera3D.getWorldPosition(this._cameraWorldPosition);
        for (const material of [this.foundationMat, this.blushMat, this.lipsMat]) {
            const uniform = material && material.uniforms &&
                (material.uniforms.uCameraPosition || material.uniforms.cameraPosition);
            if (uniform && uniform.value && typeof uniform.value.copy === 'function') {
                uniform.value.copy(this._cameraWorldPosition);
            }
        }
    }

    /* ───────────────────────── control API (was DOM events) ───────────────────────── */

    /** Apply / update a makeup layer. (was the `setAR` event) */
    setAR(arType, colorCode, colorMode) {
        const color = hexToVector4(colorCode);
        const requireUniform = (material, uniformName, effectName) => {
            const uniform = material && material.uniforms && material.uniforms[uniformName];
            if (!uniform) {
                throw new Error(`The ${effectName} shader is missing required uniform "${uniformName}".`);
            }
            return uniform;
        };
        const write = (material, uniformName, value, effectName) => {
            requireUniform(material, uniformName, effectName).value = value;
        };
        const ready = (material, mesh, name) => {
            if (!material || !mesh) {
                throw new Error(`The ${name} effect is not ready. Wait for the studio to finish loading and retry.`);
            }
        };
        const mode = colorMode == null ? null : String(colorMode);
        const setNoiseFinish = (material, name) => {
            const noise = ({ '1': 0, '5': 1, '7': 0.7 })[mode];
            if (noise == null) throw new Error(`Unsupported finish mode "${colorMode}" for ${name}.`);
            write(material, '_noise', noise, name);
        };

        if (arType === 'foundation') {
            ready(this.foundationMat, this.foundationMesh, 'foundation');
            write(this.foundationMat, '_MainColor', color, 'foundation');
            setNoiseFinish(this.foundationMat, 'foundation');
        } else if (arType === 'blush') {
            ready(this.blushMat, this.blushMesh, 'blush');
            write(this.blushMat, '_ShadowColor', color, 'blush');
            setNoiseFinish(this.blushMat, 'blush');
        } else if (arType === 'lipstick') {
            ready(this.lipsMat, this.lipsMesh, 'lipstick');
            write(this.lipsMat, '_MainColor', color, 'lipstick');
            const lipstickFinish = ({
                '1': { shine: 0, bright: 0 },
                '2': { shine: 0.9, bright: 0 },
                '5': { shine: 0.3, bright: 0.6 },
                '7': { shine: 0.5, bright: 0 },
            })[mode];
            if (!lipstickFinish) throw new Error(`Unsupported finish mode "${colorMode}" for lipstick.`);
            write(this.lipsMat, '_shine', lipstickFinish.shine, 'lipstick');
            write(this.lipsMat, '_bright', lipstickFinish.bright, 'lipstick');
        } else if (arType === 'eyeshadow') {
            ready(this.eyeShadowMat, this.eyeShadowMesh, 'eyeshadow');
            write(this.eyeShadowMat, '_ShadowColor', color, 'eyeshadow');
            setNoiseFinish(this.eyeShadowMat, 'eyeshadow');
        } else if (arType === 'eyeline') {
            ready(this.eyeLineMat, this.eyeLineLeftNurbs && this.eyeLineLeftNurbs.mesh, 'eyeliner');
            ready(this.eyeLineMat, this.eyeLineRightNurbs && this.eyeLineRightNurbs.mesh, 'eyeliner');
            write(this.eyeLineMat, 'color', color, 'eyeliner');
        } else if (arType === 'mascara') {
            ready(this.mascaraMat, this.mascaraLeftNurbs && this.mascaraLeftNurbs.mesh, 'mascara');
            ready(this.mascaraMat, this.mascaraRightNurbs && this.mascaraRightNurbs.mesh, 'mascara');
            write(this.mascaraMat, 'color', color, 'mascara');
        } else {
            throw new Error('Unknown makeup layer: ' + arType);
        }

        this._activeLayers.add(arType);
        this._syncFaceLayerVisibility();
        return true;
    }

    /** Set the shader-backed opacity multiplier for a makeup layer. */
    setIntensity(arType, intensity) {
        if (typeof intensity !== 'number' || !Number.isFinite(intensity) || intensity < 0 || intensity > 1) {
            throw new Error('Makeup intensity must be a finite number from 0 to 1.');
        }
        const materials = {
            foundation: this.foundationMat, blush: this.blushMat, lipstick: this.lipsMat,
            eyeshadow: this.eyeShadowMat, eyeline: this.eyeLineMat, mascara: this.mascaraMat,
        };
        const material = materials[arType];
        const uniform = material && material.uniforms && material.uniforms.uIntensity;
        if (!uniform) throw new Error(`The ${arType} effect is not ready or lacks the uIntensity shader uniform.`);
        uniform.value = intensity;
        return intensity;
    }

    /** Hide every makeup layer. (was the `ClearAll` event) */
    clearAll() {
        for (const category of Object.keys(PATTERN_TARGETS)) this._resetPattern(category);
        this._activeLayers.clear();
        this._syncFaceLayerVisibility();
    }

    /** Hide one makeup layer. (was the `ClearPartOfMakeUp` event) */
    clearPart(action) {
        if (!['foundation', 'blush', 'lipstick', 'eyeshadow', 'eyeline', 'mascara'].includes(action)) return;
        if (PATTERN_TARGETS[action]) this._resetPattern(action);
        this._activeLayers.delete(action);
        this._syncFaceLayerVisibility();
    }

    /** Apply a bundled alpha-mask pattern; null restores the built-in texture. */
    async setPattern(armode, imageId, isCurrentRequest = null) {
        const target = PATTERN_TARGETS[armode];
        if (!target) {
            throw new Error(`Pattern support is not implemented for makeup layer "${armode}".`);
        }

        if (imageId == null) {
            if (typeof isCurrentRequest === 'function' && !isCurrentRequest()) return false;
            return this._resetPattern(armode);
        }
        if (!/^\d+$/.test(String(imageId))) {
            throw new Error(`Invalid pattern id "${imageId}" for "${armode}".`);
        }

        const material = this[target.material];
        const uniform = material && material.uniforms && material.uniforms[target.uniform];
        if (!uniform) throw new Error(`The ${armode} shader has no pattern uniform "${target.uniform}".`);

        const requestVersion = this._nextPatternRequestVersion(armode);
        const current = this._activePatternTextures.get(armode);
        if (current && current.userData && String(current.userData.openMakeupPatternId) === String(imageId)) {
            return true;
        }

        // Load before swapping. If a second user action or a clear/dispose
        // happens while this texture is in flight, the older request is cancelled
        // and its decoded texture is immediately disposed instead of winning late.
        const texture = await this._fetchPatternTexture(armode, imageId);
        if (this._patternRequestVersions.get(armode) !== requestVersion
            || (typeof isCurrentRequest === 'function' && !isCurrentRequest())) {
            texture.dispose();
            return false;
        }

        texture.flipY = target.flipY;
        texture.userData = texture.userData || {};
        texture.userData.openMakeupPatternId = String(imageId);
        const previous = this._activePatternTextures.get(armode);
        uniform.value = texture;
        this._activePatternTextures.set(armode, texture);
        if (previous && previous !== texture) previous.dispose();
        return true;
    }

    _nextPatternRequestVersion(armode) {
        if (!this._patternRequestVersions) this._patternRequestVersions = new Map();
        const version = (this._patternRequestVersions.get(armode) || 0) + 1;
        this._patternRequestVersions.set(armode, version);
        return version;
    }

    _resetPattern(armode) {
        const target = PATTERN_TARGETS[armode];
        if (!target) return false;
        // A reset or clear supersedes all outstanding loads for this category.
        this._nextPatternRequestVersion(armode);
        const defaultTexture = this._defaultPatternTextures.get(armode);
        const material = this[target.material];
        const uniform = material && material.uniforms && material.uniforms[target.uniform];
        if (!defaultTexture || !uniform) return false;

        const previous = this._activePatternTextures.get(armode);
        uniform.value = defaultTexture;
        this._activePatternTextures.delete(armode);
        if (previous && previous !== defaultTexture) previous.dispose();
        return true;
    }



    /** Load an asset from the bundled pattern folder. IDs are numeric manifest keys. */
    _fetchPatternTexture(armode, id) {
        const url = this.assets.pattern(armode, id);
        return new Promise((resolve, reject) => {
            this._texLoader.load(
                url,
                (texture) => {
                    texture.format = RGBAFormat;
                    texture.minFilter = LinearFilter;
                    texture.magFilter = LinearFilter;
                    texture.wrapS = ClampToEdgeWrapping;
                    texture.wrapT = ClampToEdgeWrapping;
                    texture.flipY = false;
                    resolve(texture);
                },
                undefined,
                (error) => {
                    const detail = error && error.message ? error.message : String(error || 'unknown texture error');
                    reject(new Error(`Could not load pattern "${id}" for "${armode}" from "${url}": ${detail}`));
                },
            );
        });
    }



    /* ───────────────────────── face reshape (morph) ───────────────────────── */

    _ensureMorphBuffers() {
        if (this._morphReady) return;
        const mesh = this.faceModel && this.faceModel.mesh;
        const geo = mesh && mesh.geometry;
        if (!geo || !geo.attributes.position) return;

        // unmorphed fit position, consumed by the warp shader as `aBasePos`
        const len = geo.attributes.position.array.length;
        this._basePos = new Float32BufferAttribute(new Float32Array(len), 3);
        geo.setAttribute('aBasePos', this._basePos);

        this._morphDeltas = (geo.morphAttributes && geo.morphAttributes.position) || [];
        this._morphDict = mesh.morphTargetDictionary || {};
        this._morphInfluences = new Float32Array(this._morphDeltas.length);
        this._morphReady = true;

        console.info(
            `OpenMakeupSDK: morph targets loaded = ${this._morphDeltas.length}`,
            Object.keys(this._morphDict),
        );
        if (this._morphDeltas.length === 0) {
            console.warn('OpenMakeupSDK: no morph attributes on the geometry — face.glb may have been exported without morph targets, or the loader dropped them.');
        }

        // flush any morph() calls made before the model was ready
        const pending = this._pendingMorph;
        this._pendingMorph = {};
        for (const name in pending) this.setMorph(name, pending[name]);
    }

    _applyMorph() {
        if (!this._morphReady) return;
        const geo = this.faceModel.mesh.geometry;
        const pos = geo.attributes.position;
        const arr = pos.array;

        // capture the unmorphed landmark-fit (just written by updateWithLandmarks)
        this._basePos.array.set(arr);
        this._basePos.needsUpdate = true;

        // The morph deltas live in the original model space (Z-up, model scale).
        // The live mesh is the landmark fit (Y-up, pixel scale). Convert:
        //   - scale by eye-distance ratio (model -> live)
        //   - swap Y/Z so model "height" (Z) maps to live "up" (Y)
        const k = this._morphScale() * this.morphGain;

        let any = false;
        for (let m = 0; m < this._morphInfluences.length; m++) {
            const infl = this._morphInfluences[m];
            if (!infl) continue;
            any = true;
            const d = this._morphDeltas[m].array;
            const w = infl * k;
            for (let i = 0; i < arr.length; i += 3) {
                arr[i]     += w * d[i];       // X  (width)        <- model X
                arr[i + 1] += w * d[i + 2];   // Y  (live up)      <- model Z (height)
                arr[i + 2] += w * d[i + 1];   // Z  (live depth)   <- model Y (depth)
            }
        }
        if (any) {
            pos.needsUpdate = true;
            geo.computeVertexNormals();
        }
    }

    /** Scale factor mapping model-space deltas into the live landmark-fit space. */
    _morphScale() {
        const op = this.faceModel && this.faceModel.originalPositions;
        if (!op) return 1;
        if (this._morphModelIPD == null) this._morphModelIPD = this._ipd(op, 33, 263);
        if (!this._morphModelIPD) return 1;
        const liveIPD = this._ipd(this._basePos.array, 33, 263);
        return liveIPD / this._morphModelIPD;
    }

    _ipd(a, i, j) {
        const dx = a[i * 3] - a[j * 3];
        const dy = a[i * 3 + 1] - a[j * 3 + 1];
        const dz = a[i * 3 + 2] - a[j * 3 + 2];
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /** Set one reshape control with a finite weight in MORPH_WEIGHT_MIN..MORPH_WEIGHT_MAX. */
    setMorph(name, value) {
        if (typeof name !== 'string' || !KNOWN_MORPH_INPUTS.has(name)) {
            throw new Error(`OpenMakeupSDK: unknown face morph "${name}". Use a documented control or a model target name.`);
        }
        if (!Number.isFinite(value)) {
            throw new Error(`OpenMakeupSDK: morph weight for "${name}" must be a finite number.`);
        }
        if (value < MORPH_WEIGHT_MIN || value > MORPH_WEIGHT_MAX) {
            throw new Error(`OpenMakeupSDK: morph weight for "${name}" must be within ${MORPH_WEIGHT_MIN}..${MORPH_WEIGHT_MAX}.`);
        }
        if (!this._morphReady) {
            this._pendingMorph[name] = value;
            return true;
        }
        const target = resolveMorphTarget(name);
        const idx = this._morphDict[target];
        if (idx == null || !this._morphInfluences || idx >= this._morphInfluences.length) {
            throw new Error(`OpenMakeupSDK: model does not contain the required morph target "${target}".`);
        }
        this._morphInfluences[idx] = value;
        return true;
    }

    /** Apply a map of reshape controls, e.g. { noseSlim: 0.6, cheeks: 0.3 }. */
    morph(map = {}) {
        if (!map || typeof map !== 'object' || Array.isArray(map)) {
            throw new Error('OpenMakeupSDK: morph() expects an object of control names and finite weights.');
        }
        for (const [name, value] of Object.entries(map)) this.setMorph(name, value);
        return true;
    }

    /** Reset all reshape controls to 0. */
    resetMorph() {
        if (this._morphInfluences) this._morphInfluences.fill(0);
        this._pendingMorph = {};
    }

    /** Available morph target names baked into the model. */
    getMorphTargets() {
        return this._morphDict ? Object.keys(this._morphDict) : [];
    }

    /* ───────────────────────── debug ───────────────────────── */

    /** Show/hide a wireframe of the morphed face mesh (to verify morph deformation). */
    setWireframe(on) {
        if (!this.wireMesh) throw new Error('Wireframe view is not ready.');
        this._wireframeEnabled = !!on;
        this._syncFaceLayerVisibility();
        return true;
    }

    /** Show/hide the blur/refraction layer (off by default). */
    setBlur(on) {
        if (!this.blureMesh) throw new Error('Soft-focus effect is not ready.');
        this._blurEnabled = !!on;
        this._syncFaceLayerVisibility();
        return true;
    }

    /* ───────────────────────── lifecycle ───────────────────────── */

    get cameraFacingMode() {
        return this._cameraFacingMode;
    }

    /** True only when the browser reports the camera's actual facing mode. */
    get cameraFacingModeVerified() {
        return this._cameraFacingModeVerified === true;
    }

    canSwitchCamera() {
        const mediaDevices = typeof navigator !== 'undefined' ? navigator.mediaDevices : null;
        return !!this._CameraClass && supportsCameraFacingMode(mediaDevices);
    }

    _notifyWebGLContextChange(state) {
        if (!this.onWebGLContextChange) return;
        try { this.onWebGLContextChange(state); }
        catch (error) { console.warn('OpenMakeupSDK: WebGL context callback failed:', error); }
    }

    async _startCameraWithFacingMode(mode) {
        this.stop();
        this._stopAttachedVideoTracks();
        if (this._camera && typeof this._camera.stop === 'function') {
            try { this._camera.stop(); } catch (_) {}
        }
        this._camera = null;
        this._cameraFacingMode = mode;
        this._cameraFacingModeVerified = false;
        this.config.camera = { ...this.config.camera, facingMode: mode };
        this._setupCamera();
        await this.start();
        await waitForCameraFrames(this.video, { timeoutMs: 6000, pollIntervalMs: 150 });

        const stream = this.video && this.video.srcObject;
        const tracks = stream && typeof stream.getVideoTracks === 'function' ? stream.getVideoTracks() : [];
        const settings = tracks[0] && typeof tracks[0].getSettings === 'function' ? tracks[0].getSettings() : null;
        const actual = normalizeCameraFacingMode(settings && settings.facingMode);
        this._cameraFacingModeVerified = actual === mode;
        if (actual && actual !== mode) {
            this._cameraFacingModeVerified = false;
            throw new Error('Requested the ' + mode + '-facing camera, but the browser opened ' + actual + '.');
        }
    }

    async switchCamera(facingMode) {
        const target = normalizeCameraFacingMode(facingMode);
        if (!target) throw new Error('Camera facing mode must be "user" or "environment".');
        if (!this._ready) throw new Error('OpenMakeupSDK: initialize the engine before switching cameras.');
        if (!this.canSwitchCamera()) throw new Error('Camera switching is not supported by this browser or device.');

        const previous = this._cameraFacingMode || 'user';
        if (target === previous && this._cameraRunning) return target;

        let firstFailure;
        try {
            await this._startCameraWithFacingMode(target);
            return target;
        } catch (error) {
            firstFailure = error;
        }

        if (previous !== target) {
            try {
                await this._startCameraWithFacingMode(previous);
            } catch (rollbackError) {
                const rollbackDetail = rollbackError && rollbackError.message ? rollbackError.message : String(rollbackError);
                const failureDetail = firstFailure && firstFailure.message ? firstFailure.message : String(firstFailure);
                throw new Error('Camera switch failed (' + failureDetail + '); restoring the previous camera also failed (' + rollbackDetail + ').');
            }
        }
        const detail = firstFailure && firstFailure.message ? firstFailure.message : String(firstFailure);
        throw new Error('Could not switch to the ' + target + ' camera; the ' + previous + ' camera was restored. ' + detail);
    }

    async start() {
        if (!this._camera) throw new Error('Camera controller is not initialized.');
        if (this._cameraRunning) return this;
        if (this._cameraStartPromise) return this._cameraStartPromise;

        const camera = this._camera;
        const generation = this._lifecycleGeneration;
        const startToken = {};
        this._cameraStartToken = startToken;
        // Defer the body by one microtask so the promise/token are installed
        // before a custom Camera.start() can throw synchronously.
        const startPromise = Promise.resolve().then(async () => {
            try {
                if (this._rafId == null) this._animate();
                await camera.start();
                // A timed-out initialization or background/stop event may have
                // invalidated this start while its browser permission promise
                // was still pending. Never let a late completion revive it.
                if (generation !== this._lifecycleGeneration || this._camera !== camera) {
                    throw new Error('Camera startup was cancelled by a lifecycle change.');
                }
                this._cameraRunning = true;
                return this;
            } catch (error) {
                if (generation === this._lifecycleGeneration && this._camera === camera) {
                    this.stop();
                } else {
                    const newerStartActive = !!this._cameraStartToken
                        && this._cameraStartToken !== startToken;
                    // Never stop/detach resources belonging to a newer start.
                    if (this._camera !== camera || (!newerStartActive && !this._cameraRunning)) {
                        try { camera.stop(); } catch (_) {}
                    }
                    if (!newerStartActive && !this._cameraRunning) {
                        this._stopAttachedVideoTracks();
                    }
                }
                const detail = error && error.message ? error.message : String(error || 'unknown camera error');
                throw new Error('Camera could not start: ' + detail);
            } finally {
                // The old start must not clear a newer start's in-flight promise.
                if (this._cameraStartToken === startToken) {
                    this._cameraStartToken = null;
                    this._cameraStartPromise = null;
                }
            }
        });
        this._cameraStartPromise = startPromise;
        return startPromise;
    }

    _stopAttachedVideoTracks() {
        if (!this.video || !this.video.srcObject || !this.video.srcObject.getTracks) return;
        const stream = this.video.srcObject;
        stream.getTracks().forEach((track) => { try { track.stop(); } catch (_) {} });
        if (this.video.srcObject === stream) this.video.srcObject = null;
    }

    stop() {
        // Invalidate pending Camera.start() calls before they can complete late.
        this._lifecycleGeneration += 1;
        // A browser permission request may remain unresolved; allow an immediate
        // new start while the old generation is being safely discarded.
        this._cameraStartPromise = null;
        this._cameraStartToken = null;
        if (this._camera && this._camera.stop) {
            try { this._camera.stop(); } catch (error) { console.warn('OpenMakeupSDK: camera stop failed:', error); }
        }
        this._cameraRunning = false;
        this._faceVisible = false;
        this._noFaceFrames = 0;
        this._syncFaceLayerVisibility();
        if (this._rafId != null) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
    }

    dispose() {
        this.stop();
        // Invalidate async texture loads so their late callbacks cannot mutate
        // materials after their scene has been disposed.
        for (const category of Object.keys(PATTERN_TARGETS)) this._nextPatternRequestVersion(category);
        if (typeof window !== 'undefined') {
            window.removeEventListener('resize', this._sizeToVideoBox);
            window.removeEventListener('resize', this._resizeOverlay);
        }
        if (this.video && this._sizeToVideoBox) this.video.removeEventListener('loadedmetadata', this._sizeToVideoBox);
        if (this.renderCanvas) {
            this.renderCanvas.removeEventListener('webglcontextlost', this._onWebGLContextLost, false);
            this.renderCanvas.removeEventListener('webglcontextrestored', this._onWebGLContextRestored, false);
        }
        if (this.video && this.video.srcObject && this.video.srcObject.getTracks) {
            this.video.srcObject.getTracks().forEach((track) => { try { track.stop(); } catch (_) {} });
            this.video.srcObject = null;
        }
        if (this._faceMesh && this._faceMesh.close) {
            try { this._faceMesh.close(); } catch (_) {}
        }
        this._faceMesh = null;

        const seenGeometries = new Set();
        const seenMaterials = new Set();
        const seenTextures = new Set();
        const disposeMaterial = (material) => {
            if (!material || seenMaterials.has(material)) return;
            seenMaterials.add(material);
            if (material.uniforms) {
                for (const uniform of Object.values(material.uniforms)) {
                    const value = uniform && uniform.value;
                    if (value && value.isTexture && !seenTextures.has(value)) {
                        seenTextures.add(value);
                        value.dispose();
                    }
                }
            }
            material.dispose();
        };
        if (this.scene) {
            this.scene.traverse((object) => {
                if (object.geometry && !seenGeometries.has(object.geometry)) {
                    seenGeometries.add(object.geometry);
                    object.geometry.dispose();
                }
                if (Array.isArray(object.material)) object.material.forEach(disposeMaterial);
                else disposeMaterial(object.material);
            });
        }
        if (this.videoTexture && !seenTextures.has(this.videoTexture)) {
            seenTextures.add(this.videoTexture);
            this.videoTexture.dispose();
        }
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer = null;
        }

        this._ready = false;
        this._camera = null;
        this._cameraRunning = false;
        this._activeLayers.clear();
        this._faceVisible = false;
        this.scene = null;
        this.camera3D = null;
        this.faceModel = null;
        this.faceObject3D = null;
        this.videoPlane = null;
        this.videoTexture = null;
        this.blureMesh = null;
        this.blushMesh = null;
        this.lipsMesh = null;
        this.eyeShadowMesh = null;
        this.foundationMesh = null;
        this.faceVideoMesh = null;
        this.wireMesh = null;
        this.eyeLineLeftNurbs = null;
        this.eyeLineRightNurbs = null;
        this.mascaraLeftNurbs = null;
        this.mascaraRightNurbs = null;
        this.blurMat = null;
        this.blushMat = null;
        this.lipsMat = null;
        this.eyeShadowMat = null;
        this.foundationMat = null;
        this.eyeLineMat = null;
        this.mascaraMat = null;
        this._morphReady = false;
        this._morphDeltas = null;
        this._morphDict = null;
        this._morphInfluences = null;
        this._basePos = null;
        this._pendingMorph = {};
        this._defaultPatternTextures.clear();
        this._activePatternTextures.clear();
    }
}
