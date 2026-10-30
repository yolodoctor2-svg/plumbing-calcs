// @generated imports (tools/gen_imports.py)
// @end imports
/* Shared app state (Cyrex's Plumbing Sizer Studio, split into ES modules). */
/* =========================================================================
   2. APPLICATION STATE
   ========================================================================= */
export const state = {
  tool: 'select',
  ortho: false,
  symbolScale: 1.2,
  schedFilter: 'ALL',
  layers: { waste: true, vent: true, labels: true },
  pxPerFoot: 10.0,
  cam: { x: 60, y: 50, zoom: 1.0 },
  plan: {
    surface: null,
    pdfDoc: null,
    pageNum: 1,
    totalPages: 1,
    opacity: 0.70,
    width: 1000,
    height: 700
  },
  nodes: [],
  pipes: [],
  nextId: 1,
  selected: null,
  activeChainNodeId: null,
  calibratePt1: null,
  pendingCalibrateDistPx: 0
};

export const PIPE_SIZES = [1.25, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0, 8.0, 10.0, 12.0, 15.0];
export const SIZE_LABELS = {
  1.25: '1-1/4"', 1.5: '1-1/2"', 2: '2"', 2.5: '2-1/2"',
  3: '3"', 4: '4"', 5: '5"', 6: '6"', 8: '8"', 10: '10"', 12: '12"', 15: '15"'
};
export const SIZE_COLORS = {
  1.25: '#a3e635', 1.5: '#facc15', 2.0: '#22d3ee', 2.5: '#38bdf8',
  3.0: '#3b82f6', 4.0: '#a855f7', 5.0: '#d946ef', 6.0: '#ec4899', 8.0: '#f43f5e',
  10.0: '#be123c', 12.0: '#881337', 15.0: '#4c0519'
};
export function fmtSize(sz) { return SIZE_LABELS[sz] || (sz + '"'); }

// Fixture catalog (list), the armed catalog code and the palette category tab.
export const CAT = { list: [], sel: 'WC-P16', category: 'ALL' };
// Pointer state shared by the renderer and the input handlers.
export const ix = { mouse: { x: 0, y: 0 }, snap: null };
export const $ = (id) => document.getElementById(id);
