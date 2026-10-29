import { RGBAFormat, SRGBColorSpace, UnsignedByteType, WebGLRenderTarget } from 'three';

export function rgbaPixelsTopOrigin(pixels, width, height) {
  if (!ArrayBuffer.isView(pixels) || !Number.isInteger(width) || !Number.isInteger(height)
      || width < 1 || height < 1 || pixels.length !== width * height * 4) {
    throw new Error('Pixel data must contain exactly width × height × 4 RGBA values.');
  }
  const output = new Uint8Array(pixels.length);
  const rowBytes = width * 4;
  for (let y = 0; y < height; y += 1) {
    const sourceOffset = (height - 1 - y) * rowBytes;
    output.set(pixels.subarray(sourceOffset, sourceOffset + rowBytes), y * rowBytes);
  }
  return output;
}

/**
 * Copy WebGL bottom-origin RGBA into an existing ImageData-like buffer, orienting
 * the rows for Canvas and mirroring the final image without allocating another
 * full-frame byte array or mirrored canvas.
 */
export function copyRgbaPixelsTopOriginMirrored(pixels, width, height, destination) {
  const expectedLength = width * height * 4;
  if (!ArrayBuffer.isView(pixels) || !ArrayBuffer.isView(destination)
      || !Number.isInteger(width) || !Number.isInteger(height)
      || width < 1 || height < 1
      || pixels.length !== expectedLength || destination.length !== expectedLength) {
    throw new Error('Source and destination must contain exactly width × height × 4 RGBA values.');
  }
  const rowBytes = width * 4;
  for (let y = 0; y < height; y += 1) {
    const sourceRow = (height - 1 - y) * rowBytes;
    const destinationRow = y * rowBytes;
    for (let x = 0; x < width; x += 1) {
      const sourcePixel = sourceRow + (width - 1 - x) * 4;
      const destinationPixel = destinationRow + x * 4;
      destination[destinationPixel] = pixels[sourcePixel];
      destination[destinationPixel + 1] = pixels[sourcePixel + 1];
      destination[destinationPixel + 2] = pixels[sourcePixel + 2];
      destination[destinationPixel + 3] = pixels[sourcePixel + 3];
    }
  }
  return destination;
}

export function calculateCaptureSize(rawWidth, rawHeight, maxDimension = 2560, maxPixels = Infinity) {
  if (!Number.isFinite(rawWidth) || !Number.isFinite(rawHeight) || rawWidth < 1 || rawHeight < 1) {
    throw new Error('Capture source dimensions must be positive finite numbers.');
  }
  const dimensionLimit = Number.isFinite(maxDimension) && maxDimension >= 1 ? maxDimension : 2560;
  let scale = Math.min(1, dimensionLimit / Math.max(rawWidth, rawHeight));
  if (Number.isFinite(maxPixels) && maxPixels >= 1) {
    scale = Math.min(scale, Math.sqrt(maxPixels / (rawWidth * rawHeight)));
  }
  let width = Math.max(1, Math.round(rawWidth * scale));
  let height = Math.max(1, Math.round(rawHeight * scale));
  if (Number.isFinite(maxPixels) && maxPixels >= 1) {
    while (width * height > maxPixels) {
      if (width / rawWidth >= height / rawHeight && width > 1) width -= 1;
      else if (height > 1) height -= 1;
      else break;
    }
  }
  return { width, height };
}

export function withSceneVisibilityForCapture(engine, mode, render) {
  if (mode !== 'original') return render();
  const scene = engine && engine.scene;
  const videoPlane = engine && engine.videoPlane;
  if (!scene || !videoPlane || typeof scene.traverse !== 'function') {
    throw new Error('Original capture requires a ready scene with a camera video plane.');
  }
  const previousVisibility = [];
  scene.traverse((object) => {
    previousVisibility.push([object, object.visible]);
    if (object !== scene) object.visible = object === videoPlane;
  });
  try {
    return render();
  } finally {
    for (const [object, visible] of previousVisibility) object.visible = visible;
  }
}

export function renderSceneToPngDataUrl(engine, documentRef = document, maxDimension = 2560, options = {}) {
  const renderer = engine && engine.renderer;
  if (!renderer || !engine.scene || !engine.camera3D || !renderer.domElement) {
    throw new Error('A ready WebGL renderer, scene and camera are required for capture.');
  }
  if (renderer.getContext && renderer.getContext().isContextLost()) {
    throw new Error('The WebGL context is lost; retry capture after graphics recover.');
  }
  const source = renderer.domElement;
  const rawWidth = Number(source.width), rawHeight = Number(source.height);
  if (!Number.isFinite(rawWidth) || !Number.isFinite(rawHeight) || rawWidth < 1 || rawHeight < 1) {
    throw new Error('The renderer has no drawable pixels yet.');
  }
  const { width, height } = calculateCaptureSize(rawWidth, rawHeight, maxDimension, options.maxPixels);
  const target = new WebGLRenderTarget(width, height, {
    format: RGBAFormat,
    type: UnsignedByteType,
    depthBuffer: true,
    stencilBuffer: false,
  });
  target.texture.colorSpace = SRGBColorSpace;
  const pixels = new Uint8Array(width * height * 4);
  const previousTarget = typeof renderer.getRenderTarget === 'function' ? renderer.getRenderTarget() : null;
  try {
    renderer.setRenderTarget(target);
    withSceneVisibilityForCapture(engine, options.mode, () => {
      renderer.render(engine.scene, engine.camera3D);
      renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels);
    });
  } finally {
    renderer.setRenderTarget(previousTarget || null);
    target.dispose();
  }

  const outputCanvas = documentRef.createElement('canvas');
  outputCanvas.width = width;
  outputCanvas.height = height;
  const outputContext = outputCanvas.getContext('2d');
  if (!outputContext) throw new Error('Could not create the photo pixel canvas.');
  const imageData = outputContext.createImageData(width, height);
  copyRgbaPixelsTopOriginMirrored(pixels, width, height, imageData.data);
  outputContext.putImageData(imageData, 0, 0);
  const dataUrl = outputCanvas.toDataURL('image/png');
  if (!dataUrl || !dataUrl.startsWith('data:image/png;base64,') || dataUrl.length < 1000) {
    throw new Error('Photo capture returned an empty image.');
  }
  return { dataUrl, width, height };
}
