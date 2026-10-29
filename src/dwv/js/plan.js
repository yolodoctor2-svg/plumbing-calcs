// @generated imports (tools/gen_imports.py)
import { canvasWrap, fitView, requestBgRender, requestFgRender } from './render.js';
import { state } from './state.js';
import { showToast } from './ui.js';
// @end imports
/* =========================================================================
   5. PDF & IMAGE UNDERLAY LOADER
   ========================================================================= */
// pdf.js (self-hosted, pinned 3.11.174) is only fetched the first time a PDF plan is imported.
let pdfjsReady = null;
export function loadPdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (!pdfjsReady) {
    pdfjsReady = new Promise((res, rej) => {
      const base = new URL('../vendor/pdfjs/', document.baseURI).href;
      const sc = document.createElement('script');
      sc.src = base + 'pdf.min.js';
      sc.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = base + 'pdf.worker.min.js'; res(window.pdfjsLib); };
      sc.onerror = () => { pdfjsReady = null; rej(new Error('Could not load the PDF reader (offline?)')); };
      document.head.appendChild(sc);
    });
  }
  return pdfjsReady;
}

export function initPlan() {
document.getElementById('planFileInput').addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  await handlePlanFile(file);
  e.target.value = '';
});

canvasWrap.addEventListener('dragover', e => e.preventDefault());
canvasWrap.addEventListener('drop', async e => {
  e.preventDefault();
  const file = e.dataTransfer.files && e.dataTransfer.files[0];
  if (file) await handlePlanFile(file);
});
}

export async function handlePlanFile(file) {
  showToast(`Loading "${file.name}"...`);
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  if (isPdf) {
    try {
      const arrayBuf = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuf);
      const pdfjsLib = await loadPdfJs();
      const loadingTask = pdfjsLib.getDocument({ data: uint8, isEvalSupported: false });
      const pdfDoc = await loadingTask.promise;
      state.plan.pdfDoc = pdfDoc;
      state.plan.pageNum = 1;
      state.plan.totalPages = pdfDoc.numPages;

      document.getElementById('pdfPageControls').style.display = pdfDoc.numPages > 1 ? 'inline-flex' : 'none';
      await renderPdfPageToBuffer(1, true);
    } catch (err) {
      console.error('PDF load error:', err);
      showToast('PDF Error: ' + (err.message || 'Check file format'));
    }
  } else {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      state.plan.pdfDoc = null;
      document.getElementById('pdfPageControls').style.display = 'none';
      state.plan.surface = img;
      state.plan.width = img.width;
      state.plan.height = img.height;
      fitView();
      showToast(`Loaded plan (${img.width}×${img.height}px).`);
    };
    img.src = url;
  }
}

export async function renderPdfPageToBuffer(pageNum, shouldFit = false) {
  if (!state.plan.pdfDoc) return;
  showToast(`Rendering page ${pageNum}/${state.plan.totalPages}...`);
  const page = await state.plan.pdfDoc.getPage(pageNum);
  const baseVp = page.getViewport({ scale: 1.0 });

  const maxSide = Math.max(baseVp.width, baseVp.height);
  const targetScale = Math.min(2.0, Math.max(1.0, 2000 / maxSide));
  const viewport = page.getViewport({ scale: targetScale });

  const offCanvas = document.createElement('canvas');
  offCanvas.width = Math.round(viewport.width);
  offCanvas.height = Math.round(viewport.height);
  const offCtx = offCanvas.getContext('2d', { alpha: false });

  offCtx.fillStyle = '#ffffff';
  offCtx.fillRect(0, 0, offCanvas.width, offCanvas.height);

  await page.render({ canvasContext: offCtx, viewport }).promise;

  state.plan.surface = offCanvas;
  state.plan.width = offCanvas.width;
  state.plan.height = offCanvas.height;
  document.getElementById('pdfPageLabel').textContent = `${pageNum}/${state.plan.totalPages}`;

  if (shouldFit) fitView();
  else requestBgRender();
  showToast(`PDF Page ${pageNum}/${state.plan.totalPages} loaded.`);
}

export async function changePdfPage(delta) {
  if (!state.plan.pdfDoc) return;
  const next = state.plan.pageNum + delta;
  if (next < 1 || next > state.plan.totalPages) return;
  state.plan.pageNum = next;
  await renderPdfPageToBuffer(next, false);
}

export function updatePlanOpacity(val) {
  state.plan.opacity = Number(val) / 100;
  requestBgRender();
}

export function updateSymbolScale(val) {
  state.symbolScale = parseFloat(val) || 1.2;
  requestFgRender();
}
