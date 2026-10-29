/* Plumbing Sizer Studio (Cyrex's DWV / DFU sizer) — entry module.
 * Source of truth: source/cyrex-dwv-sizer.html, split into ES modules:
 *   state.js       shared state, pipe sizes/colours
 *   catalog.js     UPC 2024 / Clark Co. fixture defaults, saved catalog, per-fixture spec
 *   sizing.js      waste + vent graph, DFU accumulation, UPC/IPC size tables
 *   render.js      dual canvas (plan layer + drawing layer), camera, fit
 *   interaction.js mouse, keyboard, touch (pinch/pan) and snapping
 *   plan.js        PDF/image underlay (pdf.js lazy-loaded on first PDF)
 *   file.js        .plumb.json save/open
 *   palette.js     fixture list + library editor
 *   ui.js          inspector, pipe schedule, modals, toolbar, CSV, toast
 */
import * as stateM from './state.js';
import * as catalog from './catalog.js';
import * as sizing from './sizing.js';
import * as render from './render.js';
import * as interaction from './interaction.js';
import * as plan from './plan.js';
import * as file from './file.js';
import * as palette from './palette.js';
import * as ui from './ui.js';

// The markup uses inline onclick="fn()" handlers (as in the original file), so expose the functions globally.
for (const m of [catalog, sizing, render, interaction, plan, file, palette, ui]) {
  for (const [k, v] of Object.entries(m)) if (typeof v === 'function') window[k] = v;
}
window.PSS = { state: stateM.state, CAT: stateM.CAT, ix: stateM.ix, view: render.view };

render.initRender();
plan.initPlan();
file.initFile();
interaction.initInteraction();

catalog.loadFixtureCatalog();
palette.renderFixtureCatalog();
render.resizeCanvases();
sizing.recalculateNetwork();

// Narrow screens: slide-over drawers for the fixture list and the inspector/schedule.
const narrow = () => window.matchMedia('(max-width: 1000px)').matches;
document.getElementById('btnDrawerLeft').addEventListener('click', () => { document.body.classList.remove('show-right'); document.body.classList.toggle('show-left'); });
document.getElementById('btnDrawerRight').addEventListener('click', () => { document.body.classList.remove('show-left'); document.body.classList.toggle('show-right'); });
document.getElementById('fixtureListContainer').addEventListener('click', (e) => { if (narrow() && e.target.closest('.fixture-card')) document.body.classList.remove('show-left'); });
document.getElementById('fgCanvas').addEventListener('touchstart', () => { if (narrow()) document.body.classList.remove('show-left', 'show-right'); }, { passive: true });
