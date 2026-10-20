import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  optimizeDeps: {
    include: ['three', '@mediapipe/face_mesh', '@mediapipe/camera_utils'],
  },
});
