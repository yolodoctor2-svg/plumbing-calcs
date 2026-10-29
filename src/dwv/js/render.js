// @generated imports (tools/gen_imports.py)
import { getFixtureSpec } from './catalog.js';
import { CAT, SIZE_COLORS, fmtSize, ix, state } from './state.js';
import { showToast } from './ui.js';
// @end imports
/* =========================================================================
   7. DUAL CANVAS ENGINE & AUTOCAD ZOOM/PAN NAVIGATION
   ========================================================================= */
export const canvasWrap = document.getElementById('canvasWrap');
export const bgCanvas = document.getElementById('bgCanvas');
export const bgCtx = bgCanvas.getContext('2d', { alpha: true });
export const fgCanvas = document.getElementById('fgCanvas');
export const fgCtx = fgCanvas.getContext('2d');
// Canvas size in CSS pixels; the backing store is multiplied by devicePixelRatio
// so lines, tags and the plan stay sharp on phones/iPads/retina screens.
export const view = { w: 300, h: 250, dpr: 1 };



export function resizeCanvases() {
  const rect = canvasWrap.getBoundingClientRect();
  const w = Math.max(300, Math.floor(rect.width));
  const h = Math.max(250, Math.floor(rect.height));
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  if (view.w !== w || view.h !== h || view.dpr !== dpr || bgCanvas.width !== Math.round(w * dpr)) {
    view.w = w; view.h = h; view.dpr = dpr;
    bgCanvas.width = Math.round(w * dpr);
    bgCanvas.height = Math.round(h * dpr);
    fgCanvas.width = Math.round(w * dpr);
    fgCanvas.height = Math.round(h * dpr);
    requestBgRender();
    requestFgRender();
  }
}

export function initRender() {
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => resizeCanvases()).observe(canvasWrap);
  }
  window.addEventListener('resize', resizeCanvases);
}

export function screenToWorld(sx, sy) {
  return {
    x: (sx - state.cam.x) / state.cam.zoom,
    y: (sy - state.cam.y) / state.cam.zoom
  };
}

export function fitView() {
  resizeCanvases();
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  if (state.plan.surface && state.plan.width > 0) {
    minX = Math.min(minX, 0);
    minY = Math.min(minY, 0);
    maxX = Math.max(maxX, state.plan.width);
    maxY = Math.max(maxY, state.plan.height);
  }

  if (state.nodes.length > 0) {
    state.nodes.forEach(n => {
      minX = Math.min(minX, n.x - 30);
      minY = Math.min(minY, n.y - 30);
      maxX = Math.max(maxX, n.x + 30);
      maxY = Math.max(maxY, n.y + 30);
    });
  }

  if (!isFinite(minX)) {
    minX = 0; minY = 0; maxX = 1000; maxY = 700;
  }

  const bbW = Math.max(50, maxX - minX);
  const bbH = Math.max(50, maxY - minY);
  const pad = 45;

  const zx = (view.w - pad * 2) / bbW;
  const zy = (view.h - pad * 2) / bbH;
  state.cam.zoom = Math.max(0.06, Math.min(2.5, Math.min(zx, zy)));
  state.cam.x = (view.w - bbW * state.cam.zoom) / 2 - minX * state.cam.zoom;
  state.cam.y = (view.h - bbH * state.cam.zoom) / 2 - minY * state.cam.zoom;

  requestBgRender();
  requestFgRender();
  showToast('Zoom Extents (Fit All)');
}

let bgQueued = false;
export function requestBgRender() {
  if (!bgQueued) {
    bgQueued = true;
    requestAnimationFrame(renderBgCanvas);
  }
}

export function renderBgCanvas() {
  bgQueued = false;
  bgCtx.setTransform(1, 0, 0, 1, 0, 0);
  bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
  bgCtx.save();
  bgCtx.scale(view.dpr, view.dpr);
  bgCtx.translate(state.cam.x, state.cam.y);
  bgCtx.scale(state.cam.zoom, state.cam.zoom);

  if (state.plan.surface) {
    bgCtx.save();
    bgCtx.globalAlpha = state.plan.opacity;
    bgCtx.drawImage(state.plan.surface, 0, 0);
    bgCtx.restore();
  } else {
    const step = 50;
    const tl = screenToWorld(0, 0);
    const br = screenToWorld(view.w, view.h);
    const startX = Math.floor(tl.x / step) * step;
    const startY = Math.floor(tl.y / step) * step;
    if ((br.x - startX) / step < 120) {
      bgCtx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
      bgCtx.lineWidth = 1 / state.cam.zoom;
      bgCtx.beginPath();
      for (let x = startX; x <= br.x; x += step) { bgCtx.moveTo(x, tl.y); bgCtx.lineTo(x, br.y); }
      for (let y = startY; y <= br.y; y += step) { bgCtx.moveTo(tl.x, y); bgCtx.lineTo(br.x, y); }
      bgCtx.stroke();
    }
  }
  bgCtx.restore();
}

let fgQueued = false;
export function requestFgRender() {
  if (!fgQueued) {
    fgQueued = true;
    requestAnimationFrame(renderFgCanvas);
  }
}

export function renderFgCanvas() {
  fgQueued = false;
  fgCtx.setTransform(1, 0, 0, 1, 0, 0);
  fgCtx.clearRect(0, 0, fgCanvas.width, fgCanvas.height);

  fgCtx.save();
  fgCtx.scale(view.dpr, view.dpr);
  fgCtx.translate(state.cam.x, state.cam.y);
  fgCtx.scale(state.cam.zoom, state.cam.zoom);

  const invZ = (1 / state.cam.zoom) * state.symbolScale;
  const nodeMap = new Map();
  state.nodes.forEach(n => nodeMap.set(n.id, n));

  // 1. Draw Pipes
  state.pipes.forEach(p => {
    if (!state.layers[p.system]) return;
    const n1 = nodeMap.get(p.n1);
    const n2 = nodeMap.get(p.n2);
    if (!n1 || !n2) return;

    const isSel = state.selected && state.selected.kind === 'pipe' && state.selected.id === p.id;
    const sz = p.calc?.size || 2.0;
    const baseColor = p.system === 'vent' ? '#fb923c' : (SIZE_COLORS[sz] || '#38bdf8');

    fgCtx.save();
    fgCtx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
    fgCtx.lineWidth = (isSel ? 7.5 : 5.5) * invZ;
    fgCtx.lineCap = 'round';
    fgCtx.beginPath();
    fgCtx.moveTo(n1.x, n1.y);
    fgCtx.lineTo(n2.x, n2.y);
    fgCtx.stroke();

    fgCtx.strokeStyle = isSel ? '#ffffff' : baseColor;
    fgCtx.lineWidth = (isSel ? 5 : 3.5) * invZ;
    if (p.system === 'vent') {
      fgCtx.setLineDash([7 * invZ, 5 * invZ]);
    }
    fgCtx.beginPath();
    fgCtx.moveTo(n1.x, n1.y);
    fgCtx.lineTo(n2.x, n2.y);
    fgCtx.stroke();
    fgCtx.restore();

    // Flow Direction Arrow
    const mx = (n1.x + n2.x) / 2;
    const my = (n1.y + n2.y) / 2;
    const hasFlow = (p.calc?.dfu || 0) > 0 || (p.calc?.fixtureSet && p.calc.fixtureSet.size > 0);

    if (hasFlow) {
      const dir = p.calc?.flowDir || 1;
      const angle = dir === 1 ? Math.atan2(n2.y - n1.y, n2.x - n1.x) : Math.atan2(n1.y - n2.y, n1.x - n2.x);
      const aLen = 6 * invZ;

      fgCtx.save();
      fgCtx.translate(mx, my);
      fgCtx.rotate(angle);
      fgCtx.strokeStyle = '#ffffff';
      fgCtx.lineWidth = 2 * invZ;
      fgCtx.beginPath();
      fgCtx.moveTo(-aLen, -aLen * 0.7);
      fgCtx.lineTo(aLen * 0.5, 0);
      fgCtx.lineTo(-aLen, aLen * 0.7);
      fgCtx.stroke();
      fgCtx.restore();
    }

    if (state.layers.labels) {
      const dfuTxt = (p.calc?.dfu ?? 0).toFixed(1);
      const sysPre = p.system === 'vent' ? 'V ' : '';
      drawFastTag(mx, my - 13 * invZ, `${sysPre}Ø ${fmtSize(sz)} (${dfuTxt} DFU)`, baseColor, isSel, invZ);
    }
  });

  // 2. Active Rubberband Line
  if ((state.tool === 'pipe' || state.tool === 'vent') && state.activeChainNodeId) {
    const startNode = nodeMap.get(state.activeChainNodeId);
    if (startNode) {
      fgCtx.save();
      fgCtx.strokeStyle = state.tool === 'vent' ? '#fb923c' : '#38bdf8';
      fgCtx.lineWidth = 3 * invZ;
      fgCtx.setLineDash([6 * invZ, 4 * invZ]);
      fgCtx.beginPath();
      fgCtx.moveTo(startNode.x, startNode.y);
      fgCtx.lineTo(ix.mouse.x, ix.mouse.y);
      fgCtx.stroke();
      fgCtx.restore();
    }
  }
  if (state.tool === 'calibrate' && state.calibratePt1) {
    fgCtx.save();
    fgCtx.strokeStyle = '#facc15';
    fgCtx.lineWidth = 3 * invZ;
    fgCtx.beginPath();
    fgCtx.moveTo(state.calibratePt1.x, state.calibratePt1.y);
    fgCtx.lineTo(ix.mouse.x, ix.mouse.y);
    fgCtx.stroke();
    fgCtx.restore();
  }

  // 3. Nodes
  state.nodes.forEach(n => {
    const isSel = state.selected && state.selected.kind === 'node' && state.selected.id === n.id;
    drawNodeSymbol(n, isSel, invZ, 1.0);
  });

  // 4. Ghost Placement Preview
  if (state.tool === 'fixture') {
    const previewNode = { x: ix.mouse.x, y: ix.mouse.y, type: 'fixture', fixtureCode: CAT.sel, tag: CAT.sel };
    drawNodeSymbol(previewNode, false, invZ, 0.72);
  } else if (state.tool === 'stack' || state.tool === 'vtr') {
    const previewNode = { x: ix.mouse.x, y: ix.mouse.y, type: state.tool };
    drawNodeSymbol(previewNode, false, invZ, 0.72);
  }

  // 5. Magnetic Snap Indicator
  if (ix.snap) {
    fgCtx.save();
    const color = ix.snap.type === 'node' ? '#22c55e' : '#facc15';
    fgCtx.strokeStyle = color;
    fgCtx.lineWidth = 2.5 * invZ;
    fgCtx.beginPath();
    fgCtx.arc(ix.snap.x, ix.snap.y, 11 * invZ, 0, Math.PI * 2);
    fgCtx.stroke();
    const msg = ix.snap.type === 'node' ? 'Snap Node' : 'Tee / Split Pipe';
    drawFastTag(ix.snap.x, ix.snap.y + 18 * invZ, msg, color, false, invZ);
    fgCtx.restore();
  }

  fgCtx.restore();
}

export function drawNodeSymbol(n, isSel, invZ, alpha) {
  fgCtx.save();
  fgCtx.globalAlpha = alpha;

  if (n.type === 'junction') {
    fgCtx.fillStyle = isSel ? '#ffffff' : '#0f172a';
    fgCtx.strokeStyle = '#38bdf8';
    fgCtx.lineWidth = 2 * invZ;
    fgCtx.beginPath();
    fgCtx.arc(n.x, n.y, (isSel ? 5.5 : 4) * invZ, 0, Math.PI * 2);
    fgCtx.fill();
    fgCtx.stroke();
  } else if (n.type === 'stack') {
    const r = 14 * invZ;
    fgCtx.fillStyle = '#581c87';
    fgCtx.strokeStyle = isSel ? '#ffffff' : '#e879f9';
    fgCtx.lineWidth = 3 * invZ;
    fgCtx.beginPath();
    fgCtx.arc(n.x, n.y, r, 0, Math.PI * 2);
    fgCtx.fill();
    fgCtx.stroke();
    fgCtx.fillStyle = '#ffffff';
    fgCtx.font = `bold ${9.5 * invZ}px sans-serif`;
    fgCtx.textAlign = 'center';
    fgCtx.textBaseline = 'middle';
    fgCtx.fillText('STACK', n.x, n.y);
  } else if (n.type === 'vtr') {
    const r = 14 * invZ;
    fgCtx.fillStyle = '#7c2d12';
    fgCtx.strokeStyle = isSel ? '#ffffff' : '#fb923c';
    fgCtx.lineWidth = 3 * invZ;
    fgCtx.beginPath();
    fgCtx.moveTo(n.x, n.y - r);
    fgCtx.lineTo(n.x + r, n.y + r * 0.85);
    fgCtx.lineTo(n.x - r, n.y + r * 0.85);
    fgCtx.closePath();
    fgCtx.fill();
    fgCtx.stroke();
    fgCtx.fillStyle = '#ffffff';
    fgCtx.font = `bold ${9.5 * invZ}px sans-serif`;
    fgCtx.textAlign = 'center';
    fgCtx.textBaseline = 'middle';
    fgCtx.fillText('VTR', n.x, n.y + r * 0.25);
  } else if (n.type === 'fixture') {
    const spec = getFixtureSpec(n);
    const r = 13 * invZ;
    fgCtx.fillStyle = '#0f172a';
    fgCtx.strokeStyle = isSel ? '#ffffff' : spec.color;
    fgCtx.lineWidth = (isSel ? 4 : 3) * invZ;
    fgCtx.beginPath();
    fgCtx.arc(n.x, n.y, r, 0, Math.PI * 2);
    fgCtx.fill();
    fgCtx.stroke();

    fgCtx.fillStyle = '#ffffff';
    fgCtx.font = `bold ${9 * invZ}px sans-serif`;
    fgCtx.textAlign = 'center';
    fgCtx.textBaseline = 'middle';
    fgCtx.fillText(n.tag || spec.code, n.x, n.y);

    if (state.layers.labels && alpha === 1.0) {
      drawFastTag(n.x, n.y + r + 9 * invZ, `${spec.dfu.toFixed(1)} DFU`, spec.color, false, invZ * 0.88);
    }
  }
  fgCtx.restore();
}

export const tw10 = new Map();
export function textWidth10(text) {
  let w = tw10.get(text);
  if (w === undefined) {
    const f = fgCtx.font;
    fgCtx.font = 'bold 10px sans-serif';
    w = fgCtx.measureText(text).width;
    fgCtx.font = f;
    if (tw10.size > 4000) tw10.clear();
    tw10.set(text, w);
  }
  return w;
}

export function drawFastTag(wx, wy, text, borderColor, highlight, invZ) {
  fgCtx.save();
  const fontSize = 10 * invZ;
  fgCtx.font = `bold ${fontSize}px sans-serif`;
  const tw = textWidth10(text) * invZ;
  const bw = tw + 8 * invZ;
  const bh = fontSize + 5 * invZ;

  fgCtx.fillStyle = highlight ? '#1d4ed8' : 'rgba(15, 23, 42, 0.92)';
  fgCtx.strokeStyle = highlight ? '#ffffff' : borderColor;
  fgCtx.lineWidth = 1.3 * invZ;
  fgCtx.fillRect(wx - bw / 2, wy - bh / 2, bw, bh);
  fgCtx.strokeRect(wx - bw / 2, wy - bh / 2, bw, bh);

  fgCtx.fillStyle = '#ffffff';
  fgCtx.textAlign = 'center';
  fgCtx.textBaseline = 'middle';
  fgCtx.fillText(text, wx, wy);
  fgCtx.restore();
}
