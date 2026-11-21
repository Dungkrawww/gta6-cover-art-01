// Neon Coast Cover Studio: wires the editor — photo tray, layouts, grades, lettering,
// panel crop (drag + wheel + slider), undo/redo and PNG export in three post sizes.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import { renderCover, exportCover, GRADE_IDS, LAYOUT_IDS, SIZES, SIZE_IDS } from './cover.js';
import { runShot } from './shots.js';

export const SAMPLES = [
  { id: 'pier', src: 'samples/pier.jpg', label: 'Pier' },
  { id: 'boulevard', src: 'samples/boulevard.jpg', label: 'Boulevard' },
  { id: 'boardwalk', src: 'samples/boardwalk.webp', label: 'Boardwalk' },
  { id: 'neon-street', src: 'samples/neon-street.webp', label: 'Neon street' },
];

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const panelHint = document.getElementById('panelHint');

const imageCache = new Map();
const resolvedImages = new Map();

/** Loads an image from a URL (sample path or upload data: URI), cached per URL. */
export function loadImage(url) {
  if (!imageCache.has(url)) {
    imageCache.set(url, new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Could not load ' + url));
      img.src = url;
    }));
  }
  return imageCache.get(url);
}

/** The image for a panel source, or null while it is still loading / missing. */
export function getImage(src) {
  return resolvedImages.get(src) ?? null;
}

function trackImage(url, promise) {
  promise.then((img) => { resolvedImages.set(url, img); redraw(); }).catch(() => {
    status.textContent = 'Could not load that photo.';
  });
  return promise;
}

function defaultPanels() {
  const cycle = ['samples/pier.jpg', 'samples/boulevard.jpg', 'samples/boardwalk.webp', 'samples/neon-street.webp'];
  const panels = [];
  for (let i = 0; i < 9; i++) {
    panels.push({
      src: cycle[i % cycle.length],
      zoom: 1.15,
      ox: ((i % 3) - 1) * 0.06,
      oy: (i % 2 === 0 ? -0.04 : 0.05),
    });
  }
  return panels;
}

export function defaultState() {
  return {
    layout: 'hero',
    grade: 'sunset',
    size: '1080x1080',
    title: 'NEON SHORE',
    subtitle: 'Vice City nights',
    badge: 'EST. 2026',
    stars: 4,
    grain: true,
    vignette: true,
    frame: true,
    selected: 0,
    currentSample: 'samples/boardwalk.webp',
    panels: defaultPanels(),
  };
}

export const state = defaultState();
let currentRects = [];
let snapshots = [];
let historyIndex = -1;

function syncInputs() {
  document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
  document.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
  document.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('active', b.dataset.size === state.size));
  document.getElementById('title').value = state.title;
  document.getElementById('subtitle').value = state.subtitle;
  document.getElementById('badge').value = state.badge;
  document.getElementById('stars').value = String(state.stars);
  document.getElementById('grain').checked = state.grain;
  document.getElementById('vignette').checked = state.vignette;
  document.getElementById('frame').checked = state.frame;
  document.getElementById('zoom').value = String(state.panels[state.selected]?.zoom ?? 1);
  document.getElementById('undo').disabled = historyIndex <= 0;
  document.getElementById('redo').disabled = historyIndex >= snapshots.length - 1;
  const sel = state.selected + 1;
  panelHint.textContent = `Panel ${sel} selected — drag the photo to move it, scroll or use Zoom to crop. Click a photo below to put it in this panel.`;
}

export function redraw() {
  const [w, h] = SIZES[state.size];
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  currentRects = renderCover(canvas, state, getImage);
  syncInputs();
}

/** Pushes the current state onto the undo stack. */
export function commit() {
  snapshots = snapshots.slice(0, historyIndex + 1);
  snapshots.push(JSON.stringify(state));
  if (snapshots.length > 40) snapshots.shift();
  historyIndex = snapshots.length - 1;
  syncInputs();
}

function applySnapshot(json) {
  const next = JSON.parse(json);
  for (const key of Object.keys(next)) state[key] = next[key];
  state.panels.forEach((p) => { if (p.src) trackImage(p.src, loadImage(p.src)); });
  redraw();
}

function undo() {
  if (historyIndex <= 0) return;
  historyIndex--;
  applySnapshot(snapshots[historyIndex]);
  status.textContent = 'Undid that change.';
}

function redo() {
  if (historyIndex >= snapshots.length - 1) return;
  historyIndex++;
  applySnapshot(snapshots[historyIndex]);
  status.textContent = 'Redid that change.';
}

/** Assigns `src` to the selected panel and preloads it. */
export function assignPhoto(src) {
  state.currentSample = src;
  state.panels[state.selected].src = src;
  state.panels[state.selected].zoom = 1.15;
  state.panels[state.selected].ox = 0;
  state.panels[state.selected].oy = 0;
  trackImage(src, loadImage(src));
  commit();
  redraw();
}

/** Puts the current sample photo in every panel, each with its own crop. */
export function fillAllPanels() {
  const src = state.currentSample;
  state.panels.forEach((p, i) => {
    p.src = src;
    p.zoom = 1.2 + (i % 3) * 0.15;
    p.ox = ((i % 3) - 1) * 0.08;
    p.oy = (i % 2 === 0 ? -0.05 : 0.05);
  });
  trackImage(src, loadImage(src));
  commit();
  redraw();
  status.textContent = 'One photo in every panel — pick a layout to see the collage.';
}

function downloadCanvas(exported, w, h) {
  return new Promise((resolve) => {
    exported.toBlob((blob) => {
      if (!blob) { status.textContent = 'Export failed — try again.'; resolve(false); return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `neon-coast-${w}x${h}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      resolve(true);
    }, 'image/png');
  });
}

/** Exports the cover at one size and downloads the PNG. */
export async function exportOne(sizeId) {
  const [w, h] = SIZES[sizeId];
  const exported = exportCover(state, getImage, w, h);
  const ok = await downloadCanvas(exported, w, h);
  if (ok) status.textContent = `Saved neon-coast-${w}x${h}.png`;
  return ok;
}

/** Exports all three post sizes, one PNG each. */
export async function exportAll() {
  for (const sizeId of SIZE_IDS) {
    await exportOne(sizeId);
    await new Promise((r) => setTimeout(r, 200));
  }
  status.textContent = 'Saved all three sizes: 1080x1080, 1080x1350, 1920x1080.';
}

// ---- Panel picking and cropping on the canvas ----
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * canvas.width,
    y: ((e.clientY - r.top) / r.height) * canvas.height,
  };
}

function hitPanel(p) {
  for (let i = currentRects.length - 1; i >= 0; i--) {
    const rect = currentRects[i];
    if (p.x >= rect.x && p.x <= rect.x + rect.w && p.y >= rect.y && p.y <= rect.y + rect.h) return rect.panel;
  }
  return null;
}

let drag = null;
let wheelTimer = 0;

canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const hit = hitPanel(p);
  if (hit === null) return;
  state.selected = hit;
  const panel = state.panels[hit];
  drag = { x: p.x, y: p.y, ox: panel.ox, oy: panel.oy, moved: false, rect: currentRects.find((r) => r.panel === hit) };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});

canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const panel = state.panels[state.selected];
  const dx = (p.x - drag.x) / drag.rect.w;
  const dy = (p.y - drag.y) / drag.rect.h;
  if (Math.abs(dx) > 0.002 || Math.abs(dy) > 0.002) drag.moved = true;
  panel.ox = drag.ox + dx;
  panel.oy = drag.oy + dy;
  redraw();
});

canvas.addEventListener('pointerup', () => {
  if (drag && drag.moved) commit();
  drag = null;
});

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const panel = state.panels[state.selected];
  panel.zoom = Math.min(3, Math.max(1, panel.zoom * Math.exp(-e.deltaY * 0.0012)));
  redraw();
  clearTimeout(wheelTimer);
  wheelTimer = setTimeout(commit, 400);
}, { passive: false });

// ---- Controls ----
document.querySelectorAll('[data-layout]').forEach((b) => b.addEventListener('click', () => {
  state.layout = b.dataset.layout;
  commit();
  redraw();
}));
document.querySelectorAll('[data-grade]').forEach((b) => b.addEventListener('click', () => {
  state.grade = b.dataset.grade;
  commit();
  redraw();
}));
document.querySelectorAll('[data-size]').forEach((b) => b.addEventListener('click', () => {
  state.size = b.dataset.size;
  commit();
  redraw();
}));
document.querySelectorAll('[data-sample]').forEach((b) => b.addEventListener('click', () => {
  assignPhoto(b.dataset.sample);
  document.querySelectorAll('[data-sample]').forEach((x) => x.classList.toggle('active', x === b));
}));

document.getElementById('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
document.getElementById('title').addEventListener('change', commit);
document.getElementById('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
document.getElementById('subtitle').addEventListener('change', commit);
document.getElementById('badge').addEventListener('input', (e) => { state.badge = e.target.value; redraw(); });
document.getElementById('badge').addEventListener('change', commit);
document.getElementById('stars').addEventListener('change', (e) => { state.stars = Number(e.target.value); commit(); redraw(); });
document.getElementById('grain').addEventListener('change', (e) => { state.grain = e.target.checked; commit(); redraw(); });
document.getElementById('vignette').addEventListener('change', (e) => { state.vignette = e.target.checked; commit(); redraw(); });
document.getElementById('frame').addEventListener('change', (e) => { state.frame = e.target.checked; commit(); redraw(); });
document.getElementById('zoom').addEventListener('input', (e) => {
  state.panels[state.selected].zoom = Number(e.target.value);
  redraw();
});
document.getElementById('zoom').addEventListener('change', commit);
document.getElementById('resetCrop').addEventListener('click', () => {
  const panel = state.panels[state.selected];
  panel.zoom = 1;
  panel.ox = 0;
  panel.oy = 0;
  commit();
  redraw();
});
document.getElementById('fillAll').addEventListener('click', fillAllPanels);
document.getElementById('undo').addEventListener('click', undo);
document.getElementById('redo').addEventListener('click', redo);
document.getElementById('exportOne').addEventListener('click', () => exportOne(state.size));
document.getElementById('exportAll').addEventListener('click', exportAll);
document.getElementById('upload').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    assignPhoto(reader.result);
    status.textContent = `Loaded ${file.name} — it never leaves this machine.`;
  };
  reader.readAsDataURL(file);
});
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (e.shiftKey) redo();
    else undo();
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
});

window.addEventListener('error', (e) => {
  const box = document.getElementById('errors');
  if (box) box.textContent += e.message + ' | ';
});

// ---- Boot ----
SAMPLES.forEach((s) => trackImage(s.src, loadImage(s.src)));

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), {
    state, redraw, commit, loadImage, getImage, exportOne, exportAll,
    assignPhoto, setSize: (sizeId) => { state.size = sizeId; redraw(); },
  });
} else {
  commit();
  redraw();
}

if (document.fonts) {
  Promise.all([
    document.fonts.load('100px Anton'),
    document.fonts.load('40px Pacifico'),
  ]).catch(() => {}).finally(() => redraw());
  document.fonts.ready.then(() => redraw());
}
