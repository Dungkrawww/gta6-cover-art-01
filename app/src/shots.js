// Fixed scenes for screenshots: ?shot=cover shows the cover alone, ?shot=editor shows
// the editor with a sample photo loaded, ?shot=portrait a tall cover, ?shot=selftest
// exports all three sizes and reports the results into the page for a headless check.
// `layout`, `grade`, `size`, `caption`, `subtitle`, `photos` (comma list of sample ids)
// and `stars` pick the scene. window.__shotReady is set once painted.
import { SAMPLES } from './main.js';
import { exportCover, SIZES } from './cover.js';

function sampleSrc(id) {
  const found = SAMPLES.find((s) => s.id === id);
  return found ? found.src : SAMPLES[0].src;
}

async function paintCover(api, query) {
  const { state, loadImage, redraw, setSize } = api;
  if (query.get('size')) setSize(query.get('size'));
  if (query.get('layout')) state.layout = query.get('layout');
  if (query.get('grade')) state.grade = query.get('grade');
  if (query.get('caption')) state.title = query.get('caption');
  if (query.get('subtitle')) state.subtitle = query.get('subtitle');
  if (query.get('badge') !== null) state.badge = query.get('badge') ?? '';
  if (query.get('stars')) state.stars = Number(query.get('stars'));
  const photos = (query.get('photos') ?? 'pier,boulevard,boardwalk,neon-street').split(',');
  const loads = [];
  state.panels.forEach((panel, i) => {
    panel.src = sampleSrc(photos[i % photos.length]);
    panel.zoom = 1.15 + (i % 3) * 0.1;
    panel.ox = ((i % 3) - 1) * 0.05;
    panel.oy = (i % 2 === 0 ? -0.04 : 0.04);
    loads.push(loadImage(panel.src));
  });
  await Promise.all(loads.map((p) => p.catch(() => null)));
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('40px Pacifico'),
    ]);
  } catch (e) { /* fonts fall back to sans-serif; the cover still draws */ }
  redraw();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}

export async function runShot(shot, query, api) {
  const { state, redraw } = api;
  if (shot === 'cover' || shot === 'portrait') {
    document.body.classList.add('shot-cover');
    await paintCover(api, query);
    return;
  }
  if (shot === 'editor') {
    await paintCover(api, query);
    return;
  }
  if (shot === 'selftest') {
    document.body.classList.add('shot-cover');
    await paintCover(api, query);
    const results = [];
    try {
      for (const sizeId of Object.keys(SIZES)) {
        const [w, h] = SIZES[sizeId];
        const made = exportCover(state, api.getImage, w, h);
        const ok = made.width === w && made.height === h;
        const blob = await new Promise((resolve) => made.toBlob(resolve, 'image/png'));
        results.push({ size: `${w}x${h}`, canvasOk: ok, blobBytes: blob ? blob.size : 0 });
      }
      const report = { ok: results.every((r) => r.canvasOk && r.blobBytes > 10000), results, errors: document.getElementById('errors')?.textContent ?? '' };
      document.getElementById('selftest').textContent = JSON.stringify(report);
      document.title = 'SELFTEST ' + JSON.stringify(report);
    } catch (err) {
      document.getElementById('selftest').textContent = JSON.stringify({ ok: false, error: String(err) });
      document.title = 'SELFTEST FAIL ' + String(err);
    }
    window.__shotReady = true;
    return;
  }
  redraw();
  window.__shotReady = true;
}
