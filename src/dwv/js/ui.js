// @generated imports (tools/gen_imports.py)
import { getFixtureSpec } from './catalog.js';
import { applyInstanceAsDefault, renderFixtureCatalog } from './palette.js';
import { requestFgRender } from './render.js';
import { recalculateNetwork, togglePipeFlow } from './sizing.js';
import { PIPE_SIZES, SIZE_COLORS, fmtSize, ix, state } from './state.js';
// @end imports
/* =========================================================================
   9. INSPECTOR, SCHEDULE & MODALS
   ========================================================================= */
export function closeScaleModal(apply) {
  document.getElementById('scaleModal').classList.remove('open');
  if (apply && state.pendingCalibrateDistPx > 0) {
    const feet = parseFloat(document.getElementById('scaleFeetInput').value) || 10;
    if (feet > 0) {
      state.pxPerFoot = state.pendingCalibrateDistPx / feet;
      document.getElementById('hudScale').textContent = `${state.pxPerFoot.toFixed(1)} px = 1'`;
      recalculateNetwork();
      showToast(`Scale calibrated: ${state.pxPerFoot.toFixed(1)} px = 1.0 ft.`);
    }
  }
  setTool('select');
}

export function openConfirmClearModal() {
  document.getElementById('clearModal').classList.add('open');
}

export function confirmClearDrawing() {
  document.getElementById('clearModal').classList.remove('open');
  state.nodes = [];
  state.pipes = [];
  state.selected = null;
  state.activeChainNodeId = null;
  recalculateNetwork();
  updateInspector();
  showToast('Cleared all placed fixtures and pipes.');
}

export function updateInspector() {
  const box = document.getElementById('inspectorContent');
  if (!state.selected) {
    box.innerHTML = 'Select any fixture, pipe, or stack on the canvas to inspect or override its properties. You can also drag fixtures in Select (V) mode.';
    return;
  }

  if (state.selected.kind === 'node') {
    const n = state.nodes.find(x => x.id === state.selected.id);
    if (!n) return;
    if (n.type === 'fixture') {
      const spec = getFixtureSpec(n);
      box.innerHTML = `
        <div style="font-weight:700; color:#38bdf8; margin-bottom:4px;">${spec.code} — ${spec.name}</div>
        <div class="prop-row"><label>Plan Tag</label><input type="text" value="${n.tag || spec.code}" oninput="updateSelectedNode('tag', this.value)"></div>
        <div class="prop-row"><label>Instance DFU</label><input type="number" step="0.5" min="0" value="${spec.dfu}" oninput="updateSelectedNode('dfuOverride', this.value)"></div>
        <div class="prop-row">
          <label>Min Waste Ø</label>
          <select onchange="updateSelectedNode('minWasteOverride', this.value)">
            ${[1.25, 1.5, 2, 2.5, 3, 4, 6].map(s => `<option value="${s}" ${spec.minWaste===s?'selected':''}>${fmtSize(s)}</option>`).join('')}
          </select>
        </div>
        <div class="prop-row">
          <label>Min Vent Ø</label>
          <select onchange="updateSelectedNode('minVentOverride', this.value)">
            ${[1.25, 1.5, 2, 2.5, 3, 4].map(s => `<option value="${s}" ${spec.minVent===s?'selected':''}>${fmtSize(s)}</option>`).join('')}
          </select>
        </div>
        <div style="display:flex; gap:4px; margin-top:8px;">
          <button class="btn success" style="flex:1; justify-content:center; padding:3px 4px; font-size:10px;" onclick="applyInstanceAsDefault(${n.id})" title="Save these values as the permanent default for all ${spec.code} fixtures">
            ⭐ Set as Default
          </button>
          <button class="btn danger" style="padding:3px 6px; font-size:10px;" onclick="deleteSelected()">Delete</button>
        </div>
      `;
    } else {
      box.innerHTML = `
        <div style="font-weight:700; color:#c084fc;">Node #${n.id} (${n.type.toUpperCase()})</div>
        <button class="btn danger" style="width:100%; justify-content:center; margin-top:8px;" onclick="deleteSelected()">Delete Node</button>
      `;
    }
  } else if (state.selected.kind === 'pipe') {
    const p = state.pipes.find(x => x.id === state.selected.id);
    if (!p) return;
    const c = p.calc || {};
    const warnHtml = (c.warnings && c.warnings.length)
      ? `<div style="margin-top:4px; padding:3px 6px; background:rgba(234,179,8,0.18); border:1px solid #eab308; border-radius:4px; color:#fde047; font-size:10px;">⚠️ ${c.warnings.join('<br>')}</div>`
      : '';
    box.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
        <span style="font-weight:700; color:${p.system==='vent'?'#fb923c':'#38bdf8'};">${p.system.toUpperCase()} PIPE #P-${p.id}</span>
        <button class="btn" style="padding:2px 6px; font-size:10px;" onclick="togglePipeFlow(${p.id})" title="Flip gravity flow direction">⇄ Reverse Flow</button>
      </div>
      <div class="prop-row"><label>Cumulative Load</label><b>${(c.dfu || 0).toFixed(1)} DFU (${c.wcCount || 0} WCs)</b></div>
      <div class="prop-row"><label>Calculated Size</label><b style="color:#4ade80; font-size:12.5px;">Ø ${fmtSize(c.size || 2)}</b></div>
      <div class="prop-row"><label>Length</label><span>${(c.lengthFt || 0).toFixed(1)} ft</span></div>
      <div class="prop-row">
        <label>Min Size Override</label>
        <select onchange="updateSelectedPipe('manualMinSize', this.value)">
          <option value="0" ${!p.manualMinSize?'selected':''}>Auto (Code Table)</option>
          ${PIPE_SIZES.map(s => `<option value="${s}" ${Number(p.manualMinSize)===s?'selected':''}>Min ${fmtSize(s)}</option>`).join('')}
        </select>
      </div>
      ${p.system !== 'vent' ? `
      <div class="prop-row">
        <label>Slope</label>
        <select onchange="updateSelectedPipe('slope', this.value)">
          <option value="0.25" ${!(Number(p.slope) < 0.25) ? 'selected' : ''}>1/4" / ft</option>
          <option value="0.125" ${Number(p.slope) === 0.125 ? 'selected' : ''}>1/8" / ft</option>
        </select>
      </div>
      <div class="prop-row" title="UPC 708.1: 1/8&quot;/ft is permitted only on building drain piping 4&quot; and larger, with prior AHJ approval">
        <label>Building Drain</label>
        <input type="checkbox" style="width:14px;height:14px;" ${p.isBuildingDrain ? 'checked' : ''} onchange="updateSelectedPipe('isBuildingDrain', this.checked ? 1 : 0)">
      </div>` : ''}
      ${warnHtml}
      <button class="btn danger" style="width:100%; justify-content:center; margin-top:6px;" onclick="deleteSelected()">Delete Pipe</button>
    `;
  }
}

export function updateSelectedNode(prop, val) {
  if (!state.selected || state.selected.kind !== 'node') return;
  const n = state.nodes.find(x => x.id === state.selected.id);
  if (!n) return;
  n[prop] = prop === 'tag' ? val : parseFloat(val);
  recalculateNetwork();
}

export function updateSelectedPipe(prop, val) {
  if (!state.selected || state.selected.kind !== 'pipe') return;
  const p = state.pipes.find(x => x.id === state.selected.id);
  if (!p) return;
  p[prop] = parseFloat(val);
  recalculateNetwork();
  updateInspector();
}

export function setSchedFilter(filter) {
  state.schedFilter = filter;
  document.getElementById('schedTabAll').classList.toggle('active', filter === 'ALL');
  document.getElementById('schedTabWaste').classList.toggle('active', filter === 'waste');
  document.getElementById('schedTabVent').classList.toggle('active', filter === 'vent');
  renderScheduleTable();
}

// Schedule table rebuilds are batched to one per frame and skipped while a fixture is being dragged.
let schedQueued = false, schedPending = false;
export function requestScheduleRender() {
  if (ix.dragging) { schedPending = true; return; }
  if (schedQueued) return;
  schedQueued = true;
  requestAnimationFrame(() => { schedQueued = false; schedPending = false; renderScheduleTable(); });
}

export function renderScheduleTable() {
  const tbody = document.getElementById('scheduleTableBody');
  const fixtures = state.nodes.filter(n => n.type === 'fixture');
  const totalDfu = fixtures.reduce((acc, f) => acc + getFixtureSpec(f).dfu, 0);
  document.getElementById('systemSummaryStats').textContent =
    `Total: ${totalDfu.toFixed(1)} DFU | ${fixtures.length} Fixtures | ${state.pipes.length} Pipes`;

  const frag = document.createDocumentFragment();
  state.pipes
    .filter(p => state.schedFilter === 'ALL' || p.system === state.schedFilter)
    .forEach(p => {
      const tr = document.createElement('tr');
      if (state.selected && state.selected.kind === 'pipe' && state.selected.id === p.id) tr.className = 'selected-row';
      const c = p.calc || {};
      const sz = c.size || 1.5;
      tr.innerHTML = `
        <td>P-${p.id}</td>
        <td style="color:${p.system==='vent'?'#fb923c':'#38bdf8'}; font-weight:600;">${p.system.toUpperCase()}</td>
        <td>${(c.dfu || 0).toFixed(1)}</td>
        <td>${fmtSize(c.minReq || 1.25)}</td>
        <td style="font-weight:700; color:${SIZE_COLORS[sz] || '#fff'}">Ø ${fmtSize(sz)}</td>
        <td>${(c.lengthFt || 0).toFixed(1)}'</td>
      `;
      tr.onclick = () => {
        state.selected = { kind: 'pipe', id: p.id };
        updateInspector();
        renderScheduleTable();
        requestFgRender();
      };
      frag.appendChild(tr);
    });
  tbody.innerHTML = '';
  tbody.appendChild(frag);
}

export function setTool(tool) {
  state.tool = tool;
  state.activeChainNodeId = null;
  state.calibratePt1 = null;
  ['select', 'fixture', 'pipe', 'stack', 'vent', 'vtr'].forEach(t => {
    const btn = document.getElementById('tool-' + t);
    if (btn) {
      btn.classList.remove('active', 'active-vent');
      if (t === tool) btn.classList.add(tool === 'vent' || tool === 'vtr' ? 'active-vent' : 'active');
    }
  });
  document.getElementById('btnCalibrate').classList.toggle('active', tool === 'calibrate');
  document.getElementById('hudTool').textContent = `Tool: ${tool.toUpperCase()}`;
  renderFixtureCatalog();
  requestFgRender();
}

export function toggleOrtho() {
  state.ortho = !state.ortho;
  document.getElementById('btnOrtho').classList.toggle('active', state.ortho);
}

export function toggleLayer(layer) {
  state.layers[layer] = !state.layers[layer];
  const mapBtn = { waste: 'visWaste', vent: 'visVent', labels: 'visLabels' };
  document.getElementById(mapBtn[layer]).classList.toggle('active', state.layers[layer]);
  requestFgRender();
}

export function deleteSelected() {
  if (!state.selected) return;
  if (state.selected.kind === 'node') {
    const id = state.selected.id;
    state.nodes = state.nodes.filter(n => n.id !== id);
    state.pipes = state.pipes.filter(p => p.n1 !== id && p.n2 !== id);
  } else if (state.selected.kind === 'pipe') {
    state.pipes = state.pipes.filter(p => p.id !== state.selected.id);
  }
  state.selected = null;
  state.activeChainNodeId = null;
  recalculateNetwork();
  updateInspector();
}

export function exportCSV() {
  let csv = 'Pipe_ID,System,Cumulative_DFU,WC_Count,Min_Required_Dia,Calculated_Pipe_Size,Length_Ft,Slope_In_Per_Ft\n';
  state.pipes.forEach(p => {
    const c = p.calc || {};
    csv += `P-${p.id},${p.system.toUpperCase()},${(c.dfu||0).toFixed(1)},${c.wcCount||0},"${fmtSize(c.minReq||1.25)}","${fmtSize(c.size||1.5)}",${(c.lengthFt||0).toFixed(2)},${p.slope||0.25}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'plumbing_pipe_schedule.csv';
  a.click();
}

let toastTimer = null;
export function showToast(msg) {
  const el = document.getElementById('statusToast');
  el.textContent = msg;
  el.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.style.display = 'none'; }, 4500);
}
