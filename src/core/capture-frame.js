import { RGBAFormat, UnsignedByteType, WebGLRenderTarget } from 'three';

export function renderSceneToPngDataUrl(engine, documentRef = document, maxDimension = 2560) {
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
  const scale = Math.min(1, maxDimension / Math.max(rawWidth, rawHeight));
  const width = Math.max(1, Math.round(rawWidth * scale));
  const height = Math.max(1, Math.round(rawHeight * scale));
  const target = new WebGLRenderTarget(width, height, {
    format: RGBAFormat,
    type: UnsignedByteType,
    depthBuffer: true,
    stencilBuffer: false,
  });
  const pixels = new Uint8Array(width * height * 4);
  const previousTarget = typeof renderer.getRenderTarget === 'function' ? renderer.getRenderTarget() : null;
  try {
    renderer.setRenderTarget(target);
    renderer.render(engine.scene, engine.camera3D);
    renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels);
  } finally {
    renderer.setRenderTarget(previousTarget || null);
    target.dispose();
  }

  const pixelsCanvas = documentRef.createElement('canvas');
  pixelsCanvas.width = width;
  pixelsCanvas.height = height;
  const pixelsContext = pixelsCanvas.getContext('2d');
  if (!pixelsContext) throw new Error('Could not create the photo pixel canvas.');
  const imageData = pixelsContext.createImageData(width, height);
  const rowBytes = width * 4;
  for (let y = 0; y < height; y += 1) {
    const sourceOffset = (height - 1 - y) * rowBytes;
    imageData.data.set(pixels.subarray(sourceOffset, sourceOffset + rowBytes), y * rowBytes);
  }
  pixelsContext.putImageData(imageData, 0, 0);

  const mirrored = documentRef.createElement('canvas');
  mirrored.width = width;
  mirrored.height = height;
  const mirrorContext = mirrored.getContext('2d');
  if (!mirrorContext) throw new Error('Could not create the mirrored photo canvas.');
  mirrorContext.translate(width, 0);
  mirrorContext.scale(-1, 1);
  mirrorContext.drawImage(pixelsCanvas, 0, 0);
  const dataUrl = mirrored.toDataURL('image/png');
  if (!dataUrl || !dataUrl.startsWith('data:image/png;base64,') || dataUrl.length < 1000) {
    throw new Error('Photo capture returned an empty image.');
  }
  return { dataUrl, width, height };
}
