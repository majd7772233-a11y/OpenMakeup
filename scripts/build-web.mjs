import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const publicAssets = 'public/assets';
const cameraUtilsSource = 'node_modules/@mediapipe/camera_utils';
const cameraUtilsTarget = 'public/mediapipe/camera_utils';

rmSync(publicAssets, { recursive: true, force: true });
mkdirSync('public', { recursive: true });
cpSync('assets', publicAssets, { recursive: true });

rmSync(cameraUtilsTarget, { recursive: true, force: true });
cpSync(cameraUtilsSource, cameraUtilsTarget, { recursive: true });

execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], {
  stdio: 'inherit',
});
