// @generated imports (tools/gen_imports.py)
import { saveFixtureCatalog } from './catalog.js';
import { renderFixtureCatalog } from './palette.js';
import { requestBgRender, requestFgRender } from './render.js';
import { recalculateNetwork } from './sizing.js';
import { CAT, state } from './state.js';
import { showToast, updateInspector } from './ui.js';
// @end imports
/* =========================================================================
   3. SAVE & REOPEN PROJECT FILE (.plumb.json)
   ========================================================================= */
export function getPlanDataUrl() {
  if (!state.plan.surface) return null;
  try {
    if (state.plan.surface instanceof HTMLCanvasElement) {
      return state.plan.surface.toDataURL('image/jpeg', 0.78);
    } else if (state.plan.surface instanceof HTMLImageElement) {
      const c = document.createElement('canvas');
      c.width = state.plan.width;
      c.height = state.plan.height;
      const cx = c.getContext('2d');
      cx.drawImage(state.plan.surface, 0, 0);
      return c.toDataURL('image/jpeg', 0.78);
    }
  } catch (e) {
    console.warn('Could not serialize background plan:', e);
  }
  return null;
}

export function saveProjectFile() {
  const planDataUrl = getPlanDataUrl();
  const project = {
    version: "1.0",
    appName: "PlumbingSizerStudio",
    savedAt: new Date().toISOString(),
    codeMode: document.getElementById('codeMode').value,
    defaultSlope: parseFloat(document.getElementById('defaultSlope').value) || 0.25,
    pxPerFoot: state.pxPerFoot,
    symbolScale: state.symbolScale,
    cam: state.cam,
    nextId: state.nextId,
    nodes: state.nodes,
    pipes: state.pipes,
    fixtureCatalog: CAT.list,
    plan: {
      width: state.plan.width,
      height: state.plan.height,
      opacity: state.plan.opacity,
      pageNum: state.plan.pageNum,
      totalPages: state.plan.totalPages,
      dataUrl: planDataUrl
    }
  };

  const json = JSON.stringify(project);
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  const d = new Date();
  const dateStr = d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,'0') + "-" + String(d.getDate()).padStart(2,'0');
  a.download = `plumbing_project_${dateStr}.plumb.json`;
  a.href = URL.createObjectURL(blob);
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  showToast(`Saved project: ${state.nodes.length} nodes, ${state.pipes.length} pipes.`);
}

export function initFile() {
document.getElementById('projectFileInput').addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  try {
    showToast(`Opening "${file.name}"...`);
    const text = await file.text();
    const proj = JSON.parse(text);

    if (!proj || !Array.isArray(proj.nodes) || !Array.isArray(proj.pipes)) {
      throw new Error("Invalid project file structure (missing nodes/pipes).");
    }

    if (proj.codeMode) document.getElementById('codeMode').value = proj.codeMode;
    if (proj.defaultSlope) document.getElementById('defaultSlope').value = proj.defaultSlope;
    if (proj.symbolScale) {
      state.symbolScale = proj.symbolScale;
      document.getElementById('symbolScaleSlider').value = proj.symbolScale;
    }
    if (proj.pxPerFoot) {
      state.pxPerFoot = proj.pxPerFoot;
      document.getElementById('hudScale').textContent = `${state.pxPerFoot.toFixed(1)} px = 1'`;
    }

    if (Array.isArray(proj.fixtureCatalog) && proj.fixtureCatalog.length > 0) {
      CAT.list = proj.fixtureCatalog;
      saveFixtureCatalog();
      renderFixtureCatalog();
    }

    state.nodes = proj.nodes;
    state.pipes = proj.pipes;
    state.nextId = proj.nextId || (Math.max(0, ...state.nodes.map(n=>n.id), ...state.pipes.map(p=>p.id)) + 1);
    if (proj.cam) state.cam = proj.cam;

    if (proj.plan && proj.plan.dataUrl) {
      const img = new Image();
      img.onload = () => {
        state.plan.surface = img;
        state.plan.width = proj.plan.width || img.width;
        state.plan.height = proj.plan.height || img.height;
        state.plan.opacity = proj.plan.opacity ?? 0.70;
        document.getElementById('planOpacity').value = Math.round(state.plan.opacity * 100);
        requestBgRender();
      };
      img.src = proj.plan.dataUrl;
    } else {
      state.plan.surface = null;
      requestBgRender();
    }

    state.selected = null;
    state.activeChainNodeId = null;
    recalculateNetwork();
    updateInspector();
    requestFgRender();
    showToast(`Project loaded: ${state.nodes.length} fixtures/nodes, ${state.pipes.length} pipes.`);
  } catch (err) {
    console.error('Project open error:', err);
    showToast('Failed to open project: ' + (err.message || 'Corrupted file'));
  }
  e.target.value = '';
});
}
