// @generated imports (tools/gen_imports.py)
import { saveProjectFile } from './file.js';
import { closeFixtureManagerModal } from './palette.js';
import { fgCanvas, fitView, requestBgRender, requestFgRender, screenToWorld } from './render.js';
import { recalculateNetwork, requestRecalc } from './sizing.js';
import { CAT, ix, state } from './state.js';
import { deleteSelected, renderScheduleTable, setTool, showToast, updateInspector } from './ui.js';
// @end imports
let isPanning = false;
let isDraggingNode = false;
let draggedNode = null;
let spacePressed = false;
let lastMouseScreen = { x: 0, y: 0 };
let lastMmbClickTime = 0;

/* =========================================================================
   8. INTERACTION & AUTOCAD CONTROLS
   ========================================================================= */
export function findSnapTarget(wx, wy) {
  const snapRad = (15 / state.cam.zoom) * state.symbolScale;
  let bestNode = null, bestNodeDist = snapRad;
  for (const n of state.nodes) {
    const d = Math.hypot(n.x - wx, n.y - wy);
    if (d < bestNodeDist) { bestNodeDist = d; bestNode = n; }
  }
  if (bestNode) return { type: 'node', node: bestNode, x: bestNode.x, y: bestNode.y };

  const nodeMap = new Map();
  state.nodes.forEach(n => nodeMap.set(n.id, n));
  let bestPipe = null, bestPt = null, bestPipeDist = snapRad;

  for (const p of state.pipes) {
    if (!state.layers[p.system]) continue;
    const a = nodeMap.get(p.n1), b = nodeMap.get(p.n2);
    if (!a || !b) continue;
    const proj = projectPointToSegment(wx, wy, a.x, a.y, b.x, b.y);
    if (proj.dist < bestPipeDist) {
      bestPipeDist = proj.dist;
      bestPipe = p;
      bestPt = { x: proj.x, y: proj.y };
    }
  }
  if (bestPipe) return { type: 'pipe', pipe: bestPipe, x: bestPt.x, y: bestPt.y };
  return null;
}

export function projectPointToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return { x: x1, y: y1, dist: Math.hypot(px - x1, py - y1) };
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0.05, Math.min(0.95, t));
  const cx = x1 + t * dx, cy = y1 + t * dy;
  return { x: cx, y: cy, dist: Math.hypot(px - cx, py - cy) };
}

export function splitPipeAtPoint(pipe, x, y) {
  const jNode = { id: state.nextId++, x, y, type: 'junction' };
  state.nodes.push(jNode);
  const origN2 = pipe.n2;
  pipe.n2 = jNode.id;
  state.pipes.push({
    id: state.nextId++, n1: jNode.id, n2: origN2,
    system: pipe.system, slope: pipe.slope,
    manualMinSize: pipe.manualMinSize || 0, calc: {}
  });
  return jNode;
}

export function onMouseDown(e) {
  const rect = fgCanvas.getBoundingClientRect();
  const sx = e.clientX - rect.left, sy = e.clientY - rect.top;

  if (e.button === 1 || (e.button === 0 && spacePressed)) {
    if (e.button === 1) {
      const now = performance.now();
      if (now - lastMmbClickTime < 350) {
        fitView();
        isPanning = false;
        lastMmbClickTime = 0;
        e.preventDefault();
        return;
      }
      lastMmbClickTime = now;
    }

    isPanning = true;
    lastMouseScreen = { x: sx, y: sy };
    fgCanvas.style.cursor = 'grabbing';
    e.preventDefault();
    return;
  }

  if (e.button === 2) {
    state.activeChainNodeId = null;
    state.calibratePt1 = null;
    requestFgRender();
    return;
  }

  let pt = screenToWorld(sx, sy);
  if ((state.ortho || e.shiftKey) && state.activeChainNodeId) {
    const startNode = state.nodes.find(n => n.id === state.activeChainNodeId);
    if (startNode && !ix.snap) pt = applyOrthoSnap(startNode.x, startNode.y, pt.x, pt.y);
  }

  if (state.tool === 'calibrate') {
    if (!state.calibratePt1) {
      state.calibratePt1 = pt;
      showToast('Scale Calibration: Click the second point on the plan.');
    } else {
      const distPx = Math.hypot(pt.x - state.calibratePt1.x, pt.y - state.calibratePt1.y);
      state.calibratePt1 = null;
      if (distPx > 2) {
        state.pendingCalibrateDistPx = distPx;
        document.getElementById('scaleModal').classList.add('open');
        document.getElementById('scaleFeetInput').focus();
      }
    }
    requestFgRender();
    return;
  }

  if (state.tool === 'select') {
    if (ix.snap && ix.snap.type === 'node') {
      state.selected = { kind: 'node', id: ix.snap.node.id };
      isDraggingNode = true;
      draggedNode = ix.snap.node;
    } else if (ix.snap && ix.snap.type === 'pipe') {
      state.selected = { kind: 'pipe', id: ix.snap.pipe.id };
    } else {
      state.selected = null;
    }
    updateInspector();
    renderScheduleTable();
    requestFgRender();
    return;
  }

  if (state.tool === 'fixture') {
    const countSame = state.nodes.filter(n => n.type === 'fixture' && n.fixtureCode === CAT.sel).length + 1;
    const newNode = {
      id: state.nextId++, x: pt.x, y: pt.y,
      type: 'fixture', fixtureCode: CAT.sel,
      tag: `${CAT.sel}-${countSame}`
    };
    state.nodes.push(newNode);
    state.selected = { kind: 'node', id: newNode.id };
    recalculateNetwork();
    updateInspector();
    return;
  }

  if (state.tool === 'stack' || state.tool === 'vtr') {
    let targetNode = null;
    if (ix.snap && ix.snap.type === 'node') {
      targetNode = ix.snap.node;
      targetNode.type = state.tool;
    } else if (ix.snap && ix.snap.type === 'pipe') {
      targetNode = splitPipeAtPoint(ix.snap.pipe, ix.snap.x, ix.snap.y);
      targetNode.type = state.tool;
    } else {
      targetNode = { id: state.nextId++, x: pt.x, y: pt.y, type: state.tool };
      state.nodes.push(targetNode);
    }
    state.selected = { kind: 'node', id: targetNode.id };
    recalculateNetwork();
    updateInspector();
    return;
  }

  if (state.tool === 'pipe' || state.tool === 'vent') {
    const sys = state.tool === 'vent' ? 'vent' : 'waste';
    let targetNode = null;
    if (ix.snap && ix.snap.type === 'node') {
      targetNode = ix.snap.node;
    } else if (ix.snap && ix.snap.type === 'pipe') {
      targetNode = splitPipeAtPoint(ix.snap.pipe, ix.snap.x, ix.snap.y);
    } else {
      targetNode = { id: state.nextId++, x: pt.x, y: pt.y, type: 'junction' };
      state.nodes.push(targetNode);
    }

    if (state.activeChainNodeId && state.activeChainNodeId !== targetNode.id) {
      const exists = state.pipes.some(p =>
        p.system === sys &&
        ((p.n1 === state.activeChainNodeId && p.n2 === targetNode.id) ||
         (p.n1 === targetNode.id && p.n2 === state.activeChainNodeId))
      );
      if (!exists) {
        const newPipe = {
          id: state.nextId++, n1: state.activeChainNodeId, n2: targetNode.id,
          system: sys, slope: parseFloat(document.getElementById('defaultSlope').value) || 0.25,
          manualMinSize: 0, calc: {}
        };
        state.pipes.push(newPipe);
        state.selected = { kind: 'pipe', id: newPipe.id };
      }
    }
    state.activeChainNodeId = targetNode.id;
    recalculateNetwork();
    updateInspector();
  }
}

export function onMouseMove(e) {
  const rect = fgCanvas.getBoundingClientRect();
  const sx = e.clientX - rect.left, sy = e.clientY - rect.top;

  if (isPanning) {
    const dx = sx - lastMouseScreen.x;
    const dy = sy - lastMouseScreen.y;
    state.cam.x += dx;
    state.cam.y += dy;
    lastMouseScreen = { x: sx, y: sy };
    requestBgRender();
    requestFgRender();
    return;
  }

  let pt = screenToWorld(sx, sy);

  if (isDraggingNode && draggedNode) {
    draggedNode.x = pt.x;
    draggedNode.y = pt.y;
    ix.dragging = true;
    requestRecalc();
    return;
  }

  const prevSnap = ix.snap;
  ix.snap = findSnapTarget(pt.x, pt.y);

  if (ix.snap) {
    ix.mouse = { x: ix.snap.x, y: ix.snap.y };
  } else if ((state.ortho || e.shiftKey) && state.activeChainNodeId) {
    const startNode = state.nodes.find(n => n.id === state.activeChainNodeId);
    ix.mouse = startNode ? applyOrthoSnap(startNode.x, startNode.y, pt.x, pt.y) : pt;
  } else {
    ix.mouse = pt;
  }

  document.getElementById('hudCoords').textContent =
    `${(ix.mouse.x / state.pxPerFoot).toFixed(1)}', ${(ix.mouse.y / state.pxPerFoot).toFixed(1)}'`;

  if (state.tool !== 'select' || ix.snap !== prevSnap) {
    requestFgRender();
  }
}

export function onMouseUp() {
  if (isPanning) {
    isPanning = false;
    fgCanvas.style.cursor = 'crosshair';
  }
  isDraggingNode = false;
  draggedNode = null;
  if (ix.dragging) { ix.dragging = false; recalculateNetwork(); }
}

export function initInteraction() {
fgCanvas.addEventListener('wheel', e => {
  e.preventDefault();
  const rect = fgCanvas.getBoundingClientRect();
  const sx = e.clientX - rect.left, sy = e.clientY - rect.top;

  const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
  const newZoom = Math.max(0.05, Math.min(20, state.cam.zoom * zoomFactor));

  const wx = (sx - state.cam.x) / state.cam.zoom;
  const wy = (sy - state.cam.y) / state.cam.zoom;

  state.cam.zoom = newZoom;
  state.cam.x = sx - wx * newZoom;
  state.cam.y = sy - wy * newZoom;

  lastMouseScreen = { x: sx, y: sy };

  requestBgRender();
  requestFgRender();
}, { passive: false });


fgCanvas.addEventListener('mousedown', onMouseDown);
fgCanvas.addEventListener('mousemove', onMouseMove);
window.addEventListener('mouseup', onMouseUp);
initTouch();

fgCanvas.addEventListener('dblclick', e => {
  if (!ix.snap) fitView();
});


fgCanvas.addEventListener('contextmenu', e => e.preventDefault());

window.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    saveProjectFile();
    return;
  }

  if (e.code === 'Space') {
    spacePressed = true;
    if (!isPanning) fgCanvas.style.cursor = 'grab';
  }
  if (e.key === 'Escape') {
    state.activeChainNodeId = null;
    state.calibratePt1 = null;
    closeFixtureManagerModal();
    requestFgRender();
  }
  if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
  if (e.key.toLowerCase() === 'v') setTool('select');
  if (e.key.toLowerCase() === 'f') setTool('fixture');
  if (e.key.toLowerCase() === 'w') setTool('pipe');
  if (e.key.toLowerCase() === 's') setTool('stack');
  if (e.key.toLowerCase() === 'd') setTool('vent');
  if (e.key.toLowerCase() === 't') setTool('vtr');
});

window.addEventListener('keyup', e => {
  if (e.code === 'Space') {
    spacePressed = false;
    if (!isPanning) fgCanvas.style.cursor = 'crosshair';
  }
});
}

export function applyOrthoSnap(x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
  return { x: x1 + Math.cos(angle) * dist, y: y1 + Math.sin(angle) * dist };
}

/* ---------- Touch (iPhone / iPad): tap = click, 1-finger drag on empty canvas pans,
   drag a fixture in Select to move it, 2 fingers pinch-zoom + pan. ---------- */
export function fakeEvt(t, extra) {
  return Object.assign({ clientX: t.clientX, clientY: t.clientY, button: 0, shiftKey: false, preventDefault() {} }, extra || {});
}
export function initTouch() {
  let pinch = null, touchPan = null;
  const dist = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1;
  const mid = (a, b) => ({ x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 });
  fgCanvas.style.touchAction = 'none';
  fgCanvas.addEventListener('touchstart', e => {
    e.preventDefault();
    const rect = fgCanvas.getBoundingClientRect();
    if (e.touches.length >= 2) {
      onMouseUp(); touchPan = null;
      const m = mid(e.touches[0], e.touches[1]);
      pinch = { d: dist(e.touches[0], e.touches[1]), m: { x: m.x - rect.left, y: m.y - rect.top }, zoom: state.cam.zoom, cam: { x: state.cam.x, y: state.cam.y } };
      return;
    }
    const t = e.touches[0];
    onMouseMove(fakeEvt(t));               // no hover on touch: compute the snap under the finger first
    if (state.tool === 'select' && !ix.snap) {
      touchPan = { x: t.clientX, y: t.clientY };
      return;
    }
    onMouseDown(fakeEvt(t));
  }, { passive: false });
  fgCanvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const rect = fgCanvas.getBoundingClientRect();
    if (pinch && e.touches.length >= 2) {
      const d = dist(e.touches[0], e.touches[1]);
      const m = mid(e.touches[0], e.touches[1]);
      const mx = m.x - rect.left, my = m.y - rect.top;
      const z = Math.max(0.05, Math.min(20, pinch.zoom * d / pinch.d));
      const wx = (pinch.m.x - pinch.cam.x) / pinch.zoom, wy = (pinch.m.y - pinch.cam.y) / pinch.zoom;
      state.cam.zoom = z;
      state.cam.x = mx - wx * z;
      state.cam.y = my - wy * z;
      requestBgRender(); requestFgRender();
      return;
    }
    const t = e.touches[0];
    if (!t) return;
    if (touchPan) {
      state.cam.x += t.clientX - touchPan.x;
      state.cam.y += t.clientY - touchPan.y;
      touchPan = { x: t.clientX, y: t.clientY };
      requestBgRender(); requestFgRender();
      return;
    }
    onMouseMove(fakeEvt(t));
  }, { passive: false });
  const end = e => {
    e.preventDefault();
    if (e.touches.length === 0) { pinch = null; touchPan = null; onMouseUp(); }
    else if (e.touches.length === 1 && pinch) { pinch = null; touchPan = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }
  };
  fgCanvas.addEventListener('touchend', end, { passive: false });
  fgCanvas.addEventListener('touchcancel', end, { passive: false });
}
