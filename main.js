import { OpenMakeup, MORPH_CONTROLS } from './src/index.js';

const status = document.getElementById('status');
const $ = (id) => document.getElementById(id);
const actionButtons = [...document.querySelectorAll('.controls button, .looks button')];
const sliders = [];
let engineReady = false;

const mk = new OpenMakeup({
  video: $('video'),
  renderCanvas: $('renderCanvas'),
  assetsBaseUrl: './assets',
  mediapipeBaseUrl: './mediapipe/face_mesh',
  aiColor: async () => '#c21f4d',
});

function setStatus(message, kind = 'info') {
  status.textContent = message;
  status.style.color = kind === 'error' ? '#ffb4c3' : kind === 'success' ? '#c8f5df' : '#e5cbd9';
  status.style.borderColor = kind === 'error' ? '#ff829744' : kind === 'success' ? '#80e8b044' : '#ffffff0d';
}

async function runAction(label, action) {
  if (!engineReady) {
    setStatus('The face engine is not ready yet. Please wait a moment.', 'error');
    return;
  }
  try {
    await action();
    setStatus(label, 'success');
  } catch (error) {
    console.error(error);
    setStatus(label + ' — ' + (error?.message || 'Something went wrong.'), 'error');
  }
}

function applyLook({ lipstick, blush, shadow }) {
  return Promise.all([
    mk.apply('lipstick', { color: lipstick, finish: 'glossy' }),
    mk.apply('blush', { color: blush }),
    mk.apply('eyeshadow', { color: shadow, pattern: 1, finish: 'glitter' }),
  ]);
}

function openAbout() {
  const modal = $('about-modal');
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  $('close-about').focus();
}
function closeAbout() {
  const modal = $('about-modal');
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  $('open-about').focus();
}

$('open-about').addEventListener('click', openAbout);
$('close-about').addEventListener('click', closeAbout);
$('about-modal').addEventListener('click', (event) => {
  if (event.target === $('about-modal')) closeAbout();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && $('about-modal').classList.contains('open')) closeAbout();
});
$('about-source').addEventListener('click', () => {
  window.location.href = 'https://github.com/majd7772233-a11y/OpenMakeup';
});
$('about-email').addEventListener('click', () => {
  window.location.href = 'mailto:majd7772233@gmail.com?subject=Open%20Makeup';
});

async function startEngine() {
  actionButtons.forEach((button) => { button.disabled = true; });
  setStatus('Loading local face model and shaders…');
  try {
    await mk.init();
    engineReady = true;
    actionButtons.forEach((button) => { button.disabled = false; });
    setStatus('Studio ready. Allow camera access when Android asks, then try a look.', 'success');
    buildMorphSliders();
    if (!$('video').srcObject) {
      setTimeout(() => {
        if (!$('video').srcObject) {
          setStatus('Engine ready. If the preview is blank, check camera permission and Android System WebView.');
        }
      }, 3500);
    }
  } catch (error) {
    console.error(error);
    setStatus('Could not start the face engine: ' + (error?.message || error) +
      '. Check that the device supports WebGL and update Android System WebView.', 'error');
    $('morph-panel').innerHTML = '<p class="hint">Face controls are unavailable until the face engine starts successfully.</p>';
  }
}

$('lipstick').onclick = () => runAction('Lip gloss applied.', () => mk.apply('lipstick', { finish: 'glossy' }));
$('eyeshadow').onclick = () => runAction('Glitter eyeshadow applied.', () => mk.apply('eyeshadow', { color: '#7a3b9d', pattern: 1, finish: 'glitter' }));
$('eyeline').onclick = () => runAction('Eyeliner applied.', () => mk.apply('eyeline', { pattern: 1 }));
$('blush').onclick = () => runAction('Blush applied.', () => mk.apply('blush', { color: '#e26d7a' }));
$('foundation').onclick = () => runAction('Foundation applied.', () => mk.apply('foundation', { color: '#d9b89c', finish: 'matte' }));
$('mascara').onclick = () => runAction('Mascara applied.', () => mk.apply('mascara', {}));
$('clear').onclick = () => runAction('All makeup cleared.', () => { mk.clearAll(); });

$('look-rose').onclick = () => runAction('Rose look applied.', () =>
  applyLook({ lipstick: '#e76c91', blush: '#e88a9d', shadow: '#a55a98' }));
$('look-berry').onclick = () => runAction('Berry look applied.', () =>
  applyLook({ lipstick: '#9c315f', blush: '#b84e76', shadow: '#633b87' }));
$('look-nude').onclick = () => runAction('Nude look applied.', () =>
  applyLook({ lipstick: '#bd927b', blush: '#d4a18d', shadow: '#927d9b' }));

function makeSlider(name, about) {
  const row = document.createElement('label');
  row.className = 'slider';
  const title = document.createElement('span');
  title.textContent = name;
  if (about) {
    const detail = document.createElement('i');
    detail.textContent = ' — ' + about;
    title.appendChild(detail);
  }
  const input = document.createElement('input');
  input.type = 'range';
  input.min = '-1';
  input.max = '1.5';
  input.step = '0.05';
  input.value = '0';
  input.setAttribute('aria-label', name);
  const output = document.createElement('output');
  output.textContent = '0.00';
  row.append(title, input, output);
  input.addEventListener('input', () => {
    output.textContent = Number(input.value).toFixed(2);
    try {
      mk.setMorph(name, Number(input.value));
    } catch (error) {
      console.warn('Could not update face shape:', error);
    }
  });
  $('morph-panel').appendChild(row);
  sliders.push({ input, output });
}

function buildMorphSliders() {
  const panel = $('morph-panel');
  panel.replaceChildren();
  const friendly = {};
  for (const [name, cfg] of Object.entries(MORPH_CONTROLS || {})) {
    friendly[cfg.target] = { name, about: cfg.about };
  }

  const targets = mk.getMorphTargets();
  if (targets.length) {
    for (const target of targets) {
      const item = friendly[target];
      makeSlider(item ? item.name : target, item ? item.about : 'advanced control');
    }
  } else {
    for (const [name, cfg] of Object.entries(MORPH_CONTROLS || {})) {
      makeSlider(name, cfg.about);
    }
  }

  if (!sliders.length) {
    panel.innerHTML = '<p class="hint">No face-shape controls were found in the bundled model.</p>';
  }
}

$('reset-morph').onclick = () => runAction('Face shape reset.', () => {
  mk.resetMorph();
  for (const slider of sliders) {
    slider.input.value = '0';
    slider.output.textContent = '0.00';
  }
});
$('wireframe').onchange = (event) => runAction('Mesh view updated.', () => mk.setWireframe(event.target.checked));
$('blur').onchange = (event) => runAction('Soft-focus layer updated.', () => mk.setBlur(event.target.checked));

window.addEventListener('beforeunload', () => {
  try { mk.dispose(); } catch (error) { console.debug(error); }
});

window.mk = mk;
startEngine();
