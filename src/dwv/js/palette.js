// @generated imports (tools/gen_imports.py)
import { getFixtureSpec, saveFixtureCatalog } from './catalog.js';
import { recalculateNetwork } from './sizing.js';
import { CAT, fmtSize, state } from './state.js';
import { setTool, showToast, updateInspector } from './ui.js';
// @end imports
/* =========================================================================
   4. FIXTURE LIST & 3-DOT DIALOG
   ========================================================================= */
export function setCategory(cat, el) {
  CAT.category = cat;
  document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  renderFixtureCatalog();
}

export function renderFixtureCatalog() {
  const container = document.getElementById('fixtureListContainer');
  if (!container) return;
  const query = (document.getElementById('fixtureSearch')?.value || '').trim().toLowerCase();
  document.getElementById('fixtureCountLabel').textContent = CAT.list.length;

  const filtered = CAT.list.filter(f => {
    if (CAT.category !== 'ALL' && f.category !== CAT.category) return false;
    if (query && !f.code.toLowerCase().includes(query) && !f.name.toLowerCase().includes(query)) return false;
    return true;
  });

  const frag = document.createDocumentFragment();
  filtered.forEach(f => {
    const isSel = f.code === CAT.sel && state.tool === 'fixture';
    const card = document.createElement('div');
    card.className = 'fixture-card' + (isSel ? ' selected' : '');
    card.onclick = () => {
      CAT.sel = f.code;
      setTool('fixture');
    };
    card.innerHTML = `
      <div class="fc-top">
        <span class="fc-badge" style="background:${f.color}">${f.code}</span>
        <span class="fc-name">${f.name}</span>
      </div>
      <div class="fc-meta">
        <span class="fc-pill dfu">${Number(f.dfu).toFixed(1)} DFU</span>
        <span class="fc-pill">W: ${fmtSize(f.minWaste)}</span>
        <span class="fc-pill">V: ${fmtSize(f.minVent)}</span>
        ${f.isWC ? '<span class="fc-pill wc">WC</span>' : ''}
      </div>
    `;
    frag.appendChild(card);
  });
  container.innerHTML = '';
  container.appendChild(frag);
}

export function openFixtureManagerModal() {
  document.getElementById('modalFixtureSearch').value = '';
  renderModalFixtureTable();
  document.getElementById('fixtureManagerModal').classList.add('open');
}

export function closeFixtureManagerModal() {
  document.getElementById('fixtureManagerModal').classList.remove('open');
  renderFixtureCatalog();
  recalculateNetwork();
  updateInspector();
}

export function renderModalFixtureTable() {
  const tbody = document.getElementById('modalFixtureTableBody');
  const q = (document.getElementById('modalFixtureSearch').value || '').trim().toLowerCase();
  tbody.innerHTML = '';

  CAT.list.forEach((f, idx) => {
    if (q && !f.code.toLowerCase().includes(q) && !f.name.toLowerCase().includes(q)) return;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="fc-badge" style="background:${f.color}; width:100%;">${f.code}</span></td>
      <td><input type="text" value="${f.name.replace(/"/g, '&quot;')}" onchange="updateCatalogRow(${idx}, 'name', this.value)"></td>
      <td>
        <select onchange="updateCatalogRow(${idx}, 'category', this.value)">
          <option value="RESTROOM" ${f.category==='RESTROOM'?'selected':''}>Restroom</option>
          <option value="DRAIN" ${f.category==='DRAIN'?'selected':''}>Drains</option>
          <option value="SINK" ${f.category==='SINK'?'selected':''}>Sinks</option>
          <option value="MED" ${f.category==='MED'?'selected':''}>Med/Bath</option>
        </select>
      </td>
      <td><input type="number" step="0.5" min="0" value="${f.dfu}" onchange="updateCatalogRow(${idx}, 'dfu', this.value)"></td>
      <td>
        <select onchange="updateCatalogRow(${idx}, 'minWaste', this.value)">
          ${[1.25, 1.5, 2, 2.5, 3, 4, 6].map(s => `<option value="${s}" ${Number(f.minWaste)===s?'selected':''}>${fmtSize(s)}</option>`).join('')}
        </select>
      </td>
      <td>
        <select onchange="updateCatalogRow(${idx}, 'minVent', this.value)">
          ${[1.25, 1.5, 2, 2.5, 3, 4].map(s => `<option value="${s}" ${Number(f.minVent)===s?'selected':''}>${fmtSize(s)}</option>`).join('')}
        </select>
      </td>
      <td style="text-align:center;">
        <input type="checkbox" style="width:14px;height:14px;" ${f.isWC?'checked':''} onchange="updateCatalogRow(${idx}, 'isWC', this.checked)">
      </td>
      <td style="text-align:center;">
        <button class="btn danger" style="padding:2px 6px;" onclick="deleteCatalogFixture(${idx})">✕</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

export function updateCatalogRow(idx, field, val) {
  const item = CAT.list[idx];
  if (!item) return;
  if (field === 'dfu' || field === 'minWaste' || field === 'minVent') {
    item[field] = Math.max(0, parseFloat(val) || 0);
  } else if (field === 'isWC') {
    item.isWC = Boolean(val);
  } else {
    item[field] = val;
  }
  saveFixtureCatalog();
  renderFixtureCatalog();
  recalculateNetwork();
}

export function addNewFixtureFromModal() {
  const code = (document.getElementById('newFixCode').value || '').trim().toUpperCase();
  const name = (document.getElementById('newFixName').value || '').trim();
  const category = document.getElementById('newFixCat').value;
  const dfu = Math.max(0, parseFloat(document.getElementById('newFixDfu').value) || 0);
  const minWaste = parseFloat(document.getElementById('newFixWaste').value) || 2.0;
  const minVent = parseFloat(document.getElementById('newFixVent').value) || 1.5;
  const isWC = document.getElementById('newFixWC').checked;

  if (!code) { showToast('Please enter a short Code for the new fixture.'); return; }
  if (CAT.list.some(f => f.code === code)) {
    showToast(`Fixture code "${code}" already exists.`);
    return;
  }
  CAT.list.unshift({ code, name: name || code, category, dfu, minWaste, minVent, isWC, color: '#3b82f6' });
  CAT.sel = code;
  document.getElementById('newFixCode').value = '';
  document.getElementById('newFixName').value = '';
  saveFixtureCatalog();
  renderModalFixtureTable();
  renderFixtureCatalog();
  showToast(`Added custom fixture "${code}" to defaults.`);
}

export function deleteCatalogFixture(idx) {
  CAT.list.splice(idx, 1);
  saveFixtureCatalog();
  renderModalFixtureTable();
  renderFixtureCatalog();
}

export function applyInstanceAsDefault(nodeId) {
  const n = state.nodes.find(x => x.id === nodeId);
  if (!n || n.type !== 'fixture') return;

  const spec = getFixtureSpec(n);
  let cat = CAT.list.find(f => f.code === n.fixtureCode);
  if (!cat) {
    cat = { code: n.fixtureCode, name: n.fixtureCode, category: 'DRAIN', dfu: spec.dfu, minWaste: spec.minWaste, minVent: spec.minVent, isWC: spec.isWC, color: '#3b82f6' };
    CAT.list.unshift(cat);
  } else {
    cat.dfu = spec.dfu;
    cat.minWaste = spec.minWaste;
    cat.minVent = spec.minVent;
  }

  // Clear specific overrides so it gracefully adopts the newly saved default
  delete n.dfuOverride;
  delete n.minWasteOverride;
  delete n.minVentOverride;

  saveFixtureCatalog();
  renderFixtureCatalog();
  recalculateNetwork();
  updateInspector();
  showToast(`⭐ Saved ${cat.code} (${cat.dfu} DFU, ${fmtSize(cat.minWaste)} waste) as new default!`);
}
