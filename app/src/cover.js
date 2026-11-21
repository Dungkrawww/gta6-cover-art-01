// Neon Coast cover engine: multi-panel layouts, gradient-map grades, Anton/Pacifico
// lettering, grain, vignette and a halftone title block. Vanilla canvas 2D, no libraries.

export const GRADES = {
  sunset: { name: 'Sunset', accent: '#ff2e88', stops: [[0, [26, 11, 46]], [0.35, [122, 28, 86]], [0.65, [255, 94, 98]], [0.85, [255, 177, 102]], [1, [255, 231, 176]]] },
  neon: { name: 'Neon', accent: '#00e5ff', stops: [[0, [8, 8, 38]], [0.35, [64, 16, 110]], [0.6, [255, 46, 136]], [0.85, [0, 229, 255]], [1, [214, 255, 255]]] },
  vice: { name: 'Vice', accent: '#b537f2', stops: [[0, [18, 8, 43]], [0.4, [90, 32, 140]], [0.65, [181, 55, 242]], [0.85, [255, 140, 92]], [1, [255, 207, 92]]] },
  gold: { name: 'Gold', accent: '#ffb347', stops: [[0, [28, 16, 5]], [0.4, [96, 58, 16]], [0.7, [201, 123, 30]], [0.9, [255, 196, 92]], [1, [255, 233, 168]]] },
  mono: { name: 'Mono', accent: '#ffffff', stops: [[0, [10, 10, 12]], [0.5, [118, 118, 122]], [1, [245, 245, 248]]] },
};
export const GRADE_IDS = Object.keys(GRADES);
export const LAYOUTS = {
  hero: 'Hero + three',
  fullbleed: 'Full bleed',
  grid4: 'Four panels',
  grid9: 'Nine panels',
  tilted: 'Tilted snapshot',
};
export const LAYOUT_IDS = Object.keys(LAYOUTS);
export const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};
export const SIZE_IDS = Object.keys(SIZES);

const FRAME_COLOR = '#f7f2e8';

/** Builds a 256-entry luminance lookup table from a grade's colour stops. */
export function buildGradeLUT(gradeId) {
  const grade = GRADES[gradeId] ?? GRADES.sunset;
  const lut = new Uint8Array(256 * 3);
  const stops = grade.stops;
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let a = stops[0];
    let b = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s][0] && t <= stops[s + 1][0]) { a = stops[s]; b = stops[s + 1]; break; }
    }
    const span = b[0] - a[0] || 1;
    const f = Math.min(1, Math.max(0, (t - a[0]) / span));
    lut[i * 3] = Math.round(a[1][0] + (b[1][0] - a[1][0]) * f);
    lut[i * 3 + 1] = Math.round(a[1][1] + (b[1][1] - a[1][1]) * f);
    lut[i * 3 + 2] = Math.round(a[1][2] + (b[1][2] - a[1][2]) * f);
  }
  return lut;
}

/** Remaps every pixel of `imageData` through the grade lookup table, in place. */
export function applyGrade(imageData, lut) {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000 | 0;
    const o = lum * 3;
    d[i] = lut[o];
    d[i + 1] = lut[o + 1];
    d[i + 2] = lut[o + 2];
  }
}

/** Draws `img` cover-fitting rect (x, y, w, h), with zoom and pan offsets in panel fractions. */
export function drawCoverFit(ctx, img, x, y, w, h, zoom, ox, oy) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(w / iw, h / ih) * (zoom || 1);
  const dw = iw * scale;
  const dh = ih * scale;
  const maxOx = dw > w ? (dw - w) / 2 / w : 0;
  const maxOy = dh > h ? (dh - h) / 2 / h : 0;
  const cx = Math.min(maxOx, Math.max(-maxOx, ox || 0));
  const cy = Math.min(maxOy, Math.max(-maxOy, oy || 0));
  ctx.drawImage(img, x + (w - dw) / 2 + cx * w, y + (h - dh) / 2 + cy * h, dw, dh);
}

/** Panel rectangles for a layout, in canvas pixels. `frame` adds a white gutter. */
export function layoutRects(layout, W, H, frame) {
  const g = frame ? Math.max(2, Math.round(Math.min(W, H) * 0.008)) : 0;
  const x0 = g;
  const y0 = g;
  const w = W - g * 2;
  const h = H - g * 2;
  switch (layout) {
    case 'fullbleed':
      return [{ panel: 0, x: x0, y: y0, w, h }];
    case 'grid4': {
      const cw = (w - g) / 2;
      const ch = (h - g) / 2;
      return [
        { panel: 0, x: x0, y: y0, w: cw, h: ch },
        { panel: 1, x: x0 + cw + g, y: y0, w: cw, h: ch },
        { panel: 2, x: x0, y: y0 + ch + g, w: cw, h: ch },
        { panel: 3, x: x0 + cw + g, y: y0 + ch + g, w: cw, h: ch },
      ];
    }
    case 'grid9': {
      const cw = (w - g * 2) / 3;
      const ch = (h - g * 2) / 3;
      const rects = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          rects.push({ panel: r * 3 + c, x: x0 + c * (cw + g), y: y0 + r * (ch + g), w: cw, h: ch });
        }
      }
      return rects;
    }
    case 'tilted': {
      const sw = w * 0.54;
      const sh = h * 0.52;
      return [
        { panel: 0, x: x0, y: y0, w, h },
        { panel: 1, x: x0 + w * 0.26, y: y0 + h * 0.18, w: sw, h: sh, rotate: -0.1 },
      ];
    }
    case 'hero':
    default: {
      const heroH = h * 0.6;
      const rowH = h - heroH - g;
      const cw = (w - g * 2) / 3;
      return [
        { panel: 0, x: x0, y: y0, w, h: heroH },
        { panel: 1, x: x0, y: y0 + heroH + g, w: cw, h: rowH },
        { panel: 2, x: x0 + cw + g, y: y0 + heroH + g, w: cw, h: rowH },
        { panel: 3, x: x0 + cw * 2 + g * 2, y: y0 + heroH + g, w: cw, h: rowH },
      ];
    }
  }
}

let tempCanvas = null;

/** Draws one photo panel, graded, into `rect` (rotated for the tilted snapshot). */
export function drawPanel(ctx, img, rect, panel, gradeId, lut, frame) {
  const W = ctx.canvas.width;
  ctx.save();
  if (rect.rotate) {
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    ctx.translate(cx, cy);
    ctx.rotate(rect.rotate);
    ctx.translate(-cx, -cy);
    const b = Math.max(6, Math.round(W * 0.018));
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = Math.round(W * 0.03);
    ctx.fillStyle = FRAME_COLOR;
    ctx.fillRect(rect.x - b, rect.y - b, rect.w + b * 2, rect.h + b * 2);
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
  }
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (!tempCanvas) tempCanvas = document.createElement('canvas');
  const tw = Math.max(2, Math.round(rect.w));
  const th = Math.max(2, Math.round(rect.h));
  if (tempCanvas.width !== tw || tempCanvas.height !== th) {
    tempCanvas.width = tw;
    tempCanvas.height = th;
  }
  const tctx = tempCanvas.getContext('2d', { willReadFrequently: true });
  tctx.clearRect(0, 0, tw, th);
  if (img) drawCoverFit(tctx, img, 0, 0, tw, th, panel.zoom, panel.ox, panel.oy);
  else { tctx.fillStyle = '#241335'; tctx.fillRect(0, 0, tw, th); }
  const imageData = tctx.getImageData(0, 0, tw, th);
  applyGrade(imageData, lut);
  tctx.putImageData(imageData, 0, 0);
  ctx.drawImage(tempCanvas, rect.x, rect.y);
  ctx.restore();
}

/** A five-point star path centred at (cx, cy) with outer radius r. */
export function starPath(ctx, cx, cy, r) {
  const inner = r * 0.45;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/** The heat meter: five stars, `filled` of them gold, in a dark pill top-right. */
export function drawStarMeter(ctx, W, H, filled) {
  const pad = Math.round(W * 0.02);
  const star = Math.max(10, Math.round(W * 0.026));
  const gap = Math.round(star * 0.35);
  const pillW = star * 2 * 5 + gap * 4 + pad * 2;
  const pillH = star * 2 + pad;
  const x = W - pad - pillW;
  const y = pad;
  ctx.save();
  ctx.fillStyle = 'rgba(10, 4, 24, 0.55)';
  roundRect(ctx, x, y, pillW, pillH, pillH / 2);
  ctx.fill();
  for (let i = 0; i < 5; i++) {
    const cx = x + pad + star + i * (star * 2 + gap) - star;
    const cy = y + pillH / 2;
    starPath(ctx, cx + star, cy, star);
    ctx.fillStyle = i < filled ? '#ffd166' : 'rgba(255, 255, 255, 0.28)';
    ctx.fill();
    ctx.lineWidth = Math.max(1, star * 0.08);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.stroke();
  }
  ctx.restore();
}

/** A diagonal badge ribbon across the top-left corner, with `text` along it. */
export function drawBadgeRibbon(ctx, W, H, text) {
  if (!text) return;
  const bandH = Math.max(14, Math.round(H * 0.038));
  ctx.save();
  const m = Math.min(W, H) * 0.09;
  ctx.translate(m, m);
  ctx.rotate(-Math.PI / 4);
  const grad = ctx.createLinearGradient(-W * 0.3, 0, W * 0.3, 0);
  grad.addColorStop(0, '#ff2e88');
  grad.addColorStop(1, '#b537f2');
  ctx.fillStyle = grad;
  ctx.fillRect(-W * 0.3, 0, W * 0.6, bandH);
  ctx.fillStyle = '#ffffff';
  ctx.font = `${Math.round(bandH * 0.58)}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  try { ctx.letterSpacing = '2px'; } catch (e) { /* older canvas: no letter spacing */ }
  ctx.fillText(text.toUpperCase(), 0, bandH / 2 + 1);
  ctx.restore();
}

/** A row of halftone dots along the top of the title band. */
export function drawHalftoneStrip(ctx, W, bandTop, bandH) {
  const gap = Math.max(8, Math.round(W * 0.028));
  const cy = bandTop + bandH * 0.32;
  ctx.save();
  for (let x = gap / 2; x < W; x += gap) {
    const r = (Math.sin(x * 0.011) * 0.5 + 0.5) * Math.max(2, W * 0.007) + 1;
    ctx.beginPath();
    ctx.arc(x, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.30)';
    ctx.fill();
  }
  ctx.restore();
}

let grainPattern = null;

/** Film grain: a tiled random-noise pattern over the whole cover. */
export function drawGrain(ctx, W, H) {
  if (!grainPattern) {
    const tile = document.createElement('canvas');
    tile.width = 140;
    tile.height = 140;
    const tctx = tile.getContext('2d');
    const data = tctx.createImageData(140, 140);
    for (let i = 0; i < data.data.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      data.data[i] = v;
      data.data[i + 1] = v;
      data.data[i + 2] = v;
      data.data[i + 3] = 30;
    }
    tctx.putImageData(data, 0, 0);
    grainPattern = ctx.createPattern(tile, 'repeat');
  }
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = grainPattern;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** A soft dark vignette closing in from the edges. */
export function drawVignette(ctx, W, H) {
  const grad = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.32, W / 2, H / 2, Math.max(W, H) * 0.78);
  grad.addColorStop(0, 'rgba(8, 3, 20, 0)');
  grad.addColorStop(1, 'rgba(8, 3, 20, 0.38)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

/** The title block: sunset strip, halftone dots, Anton title, Pacifico subtitle. */
export function drawTitleBlock(ctx, W, H, state) {
  const bandTop = H * 0.74;
  const bandH = H - bandTop;
  const shade = ctx.createLinearGradient(0, bandTop, 0, H);
  shade.addColorStop(0, 'rgba(10, 4, 24, 0)');
  shade.addColorStop(0.45, 'rgba(10, 4, 24, 0.72)');
  shade.addColorStop(1, 'rgba(10, 4, 24, 0.88)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, bandTop, W, bandH);
  const strip = ctx.createLinearGradient(0, 0, W, 0);
  strip.addColorStop(0, '#ff2e88');
  strip.addColorStop(0.5, '#ff9a3d');
  strip.addColorStop(1, '#ffd166');
  ctx.fillStyle = strip;
  ctx.fillRect(0, bandTop, W, Math.max(3, H * 0.006));
  drawHalftoneStrip(ctx, W, bandTop, bandH);
  const title = (state.title || '').trim().toUpperCase();
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  if (title) {
    let size = Math.min(W * 0.115, H * 0.15);
    ctx.font = `${size}px Anton, sans-serif`;
    while (ctx.measureText(title).width > W * 0.92 && size > 14) {
      size -= 2;
      ctx.font = `${size}px Anton, sans-serif`;
    }
    const titleY = H * 0.885;
    const fill = ctx.createLinearGradient(0, titleY - size, W, titleY);
    fill.addColorStop(0, '#ff5e8a');
    fill.addColorStop(0.55, '#ff9a3d');
    fill.addColorStop(1, '#ffd166');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, size * 0.07);
    ctx.strokeStyle = 'rgba(16, 4, 28, 0.9)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = size * 0.12;
    ctx.strokeText(title, W / 2, titleY);
    ctx.fillStyle = fill;
    ctx.fillText(title, W / 2, titleY);
    ctx.shadowBlur = 0;
  }
  const subtitle = (state.subtitle || '').trim();
  if (subtitle) {
    const subSize = Math.max(14, Math.round(Math.min(W * 0.042, H * 0.05)));
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = grade.accent;
    ctx.shadowBlur = subSize * 0.7;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(subtitle, W / 2, H * 0.962);
    ctx.shadowBlur = 0;
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Renders the whole cover onto `canvas` from `state`, resolving photos with
 * `getImage(src)` (an image, or null). Returns the panel rects it drew.
 */
export function renderCover(canvas, state, getImage) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = state.frame ? FRAME_COLOR : '#160a24';
  ctx.fillRect(0, 0, W, H);
  const lut = buildGradeLUT(state.grade);
  const rects = layoutRects(state.layout, W, H, state.frame);
  for (const rect of rects) {
    const panel = state.panels[rect.panel] ?? { src: null, zoom: 1, ox: 0, oy: 0 };
    const img = panel.src ? getImage(panel.src) : null;
    drawPanel(ctx, img, rect, panel, state.grade, lut, state.frame);
  }
  drawTitleBlock(ctx, W, H, state);
  drawBadgeRibbon(ctx, W, H, state.badge);
  drawStarMeter(ctx, W, H, state.stars || 0);
  if (state.grain) drawGrain(ctx, W, H);
  if (state.vignette) drawVignette(ctx, W, H);
  return rects;
}

/** Renders the cover at export size (w x h) on a fresh canvas and returns it. */
export function exportCover(state, getImage, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  renderCover(canvas, state, getImage);
  return canvas;
}
