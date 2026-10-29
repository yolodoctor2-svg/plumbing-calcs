/* Workspace Planner · Waste & vent sizer (DWV)
 * Client-side only. Values from UPC Tables 702.1, 702.1(1), 702.2, 703.2,
 * 1002.2 and 1014.2.1 as published in the UPC text (verify against the
 * printed 2024 edition). Never add a number here that is not in those tables.
 */
(function () {
  'use strict';

  // ---------- Code tables ----------
  var SIZES = [1.25, 1.5, 2, 3, 4, 5, 6, 8, 10, 12];
  var SL = { 1.25: '1¼″', 1.5: '1½″', 2: '2″', 2.5: '2½″', 3: '3″', 3.5: '3½″', 4: '4″', 4.5: '4½″', 5: '5″', 6: '6″', 8: '8″', 10: '10″', 12: '12″' };
  // UPC 910.4 + Appendix B 101.6.1: combination waste & vent pipe and traps are two pipe sizes over
  // the Chapter 7 size. Sizes recognized for this: 2, 2½, 3, 3½, 4, 4½, 5, 6 … (below 2″ the normal series).
  var CWV_SIZES = [1.25, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 8, 10, 12];
  function cwvUp(s) { var i = CWV_SIZES.indexOf(+s); return i < 0 ? s : CWV_SIZES[Math.min(i + 2, CWV_SIZES.length - 1)]; }
  var CWV_COLOR = '#0e7490';
  // Table 703.2 (drainage excludes trap arm). Index matches SIZES.
  var T703 = {
    H: [1, 1, 8, 35, 216, 428, 720, 2640, 4680, 8200],
    V: [1, 2, 16, 48, 256, 600, 1380, 3600, 5600, 8400],
    VLEN: [45, 65, 85, 212, 300, 390, 510, 750, null, null],
    VENT: [1, 8, 24, 84, 256, 600, 1380, 3600, null, null]
  };
  // Table 702.1(1): max DFU on a trap and trap arm.
  var T7021_1 = { 1.25: 1, 1.5: 3, 2: 4, 3: 6, 4: 8 };
  // Table 1002.2: max trap-arm length (in). Note 2: WC 6 ft.
  var T1002 = { 1.25: 30, 1.5: 42, 2: 60, 3: 72, 4: 120 };
  // Table 702.2: intermittent flow gpm -> DFU (>50 gpm: AHJ).
  var T702_2 = [[7.5, 1], [15, 2], [30, 4], [50, 6]];
  // Table 1014.2.1: hydromechanical grease interceptor sizing (gravity flow, 1/4"/ft).
  var T1014 = [
    { d: 2, full: 20, m1: 20, m2: 10 }, { d: 3, full: 60, m1: 75, m2: 35 }, { d: 4, full: 125, m1: 150, m2: 75 },
    { d: 5, full: 230, m1: 250, m2: 125 }, { d: 6, full: 375, m1: 400, m2: 200 }
  ];

  // Fixture catalog. pub/asm = Table 702.1 public / assembly DFU. trap = min trap & arm (in).
  // n2: sink/urinal/dishwasher (703.2 note 2). min2: 702.1 note 2 (2" min drain). six: six-unit trap.
  var FX = {
    wc_fv:   { n: 'WC, flush valve 1.6 GPF', pre: 'WC', g: 'r', ic: 'fa-toilet', trap: 3, pub: 4, asm: 6, wc: 1, row: 'Water closet, 1.6 GPF flushometer valve' },
    wc_fv_hi:{ n: 'WC, flush valve >1.6 GPF', pre: 'WC', g: 'r', ic: 'fa-toilet', trap: 3, pub: 6, asm: 8, wc: 1, row: 'Water closet, greater than 1.6 GPF flushometer valve' },
    wc_ft:   { n: 'WC, flushometer tank 1.6 GPF', pre: 'WC', g: 'r', ic: 'fa-toilet', trap: 3, pub: 4, asm: 6, wc: 1, row: 'Water closet, 1.6 GPF flushometer tank' },
    wc_tank: { n: 'WC, gravity tank 1.6 GPF', pre: 'WC', g: 'r', ic: 'fa-toilet', trap: 3, pub: 4, asm: 6, wc: 1, row: 'Water closet, 1.6 GPF gravity tank' },
    wc_tank_hi:{ n: 'WC, gravity tank >1.6 GPF', pre: 'WC', g: 'r', ic: 'fa-toilet', trap: 3, pub: 6, asm: 8, wc: 1, row: 'Water closet, greater than 1.6 GPF gravity tank' },
    ur_int:  { n: 'Urinal, integral trap 1.0 GPF', pre: 'UR', g: 'r', ic: 'fa-person', trap: 2, pub: 2, asm: 5, n2: 1, min2: 1, row: 'Urinal, integral trap 1.0 GPF' },
    ur_int_hi:{ n: 'Urinal, integral trap >1.0 GPF', pre: 'UR', g: 'r', ic: 'fa-person', trap: 2, pub: 2, asm: 6, n2: 1, row: 'Urinal, integral trap greater than 1.0 GPF' },
    ur_exp:  { n: 'Urinal, exposed trap', pre: 'UR', g: 'r', ic: 'fa-person', trap: 1.5, pub: 2, asm: 5, n2: 1, min2: 1, row: 'Urinal, exposed trap' },
    ur_nw:   { n: 'Urinal, nonwater', pre: 'UR', g: 'r', ic: 'fa-person', trap: 2, pub: 1, asm: 1, n2: 1, row: 'Nonwater urinal with drain cleansing action' },
    lav:     { n: 'Lavatory', pre: 'LAV', g: 'r', ic: 'fa-sink', trap: 1.25, pub: 1, asm: 1, lav: 1, row: 'Lavatory' },
    lav_set: { n: 'Lavatories in sets', pre: 'LAV', g: 'r', ic: 'fa-sink', trap: 1.5, pub: 2, asm: 2, row: 'Lavatories in sets' },
    df:      { n: 'Drinking fountain / cooler', pre: 'DF', g: 'r', ic: 'fa-glass-water', trap: 1.25, pub: 0.5, asm: 1, row: 'Drinking fountain or water cooler' },
    sh:      { n: 'Shower, single head', pre: 'SH', g: 'r', ic: 'fa-shower', trap: 2, pub: 2, asm: 2, row: 'Shower, single-head trap' },
    wfn:     { n: 'Washfountain (1½″)', pre: 'WF', g: 'r', ic: 'fa-hands-bubbles', trap: 1.5, pub: 2, asm: 2, row: 'Washfountain, 1½″' },
    mop2:    { n: 'Service / mop basin, 2″', pre: 'MS', g: 's', ic: 'fa-broom', trap: 2, pub: 3, asm: 3, row: 'Service or mop basin, 2″' },
    mop3:    { n: 'Service / mop basin, 3″', pre: 'MS', g: 's', ic: 'fa-broom', trap: 3, pub: 3, asm: 3, row: 'Service or mop basin, 3″' },
    svc_fr:  { n: 'Service sink, flushing rim', pre: 'SS', g: 's', ic: 'fa-broom', trap: 3, pub: 6, asm: 6, six: 1, row: 'Sink, service, flushing rim' },
    clin:    { n: 'Clinical sink', pre: 'CS', g: 's', ic: 'fa-sink', trap: 3, pub: 6, asm: 6, six: 1, n2: 1, row: 'Sink, clinical' },
    fd:      { n: 'Floor drain', pre: 'FD', g: 's', ic: 'fa-circle-dot', trap: 2, pub: 2, asm: 2, row: 'Floor drain' },
    fd_em:   { n: 'Floor drain, emergency', pre: 'FD', g: 's', ic: 'fa-circle-dot', trap: 2, pub: 0, asm: 0, row: 'Floor drain, emergency' },
    fs:      { n: 'Floor sink (indirect receptor)', pre: 'FS', g: 's', ic: 'fa-square', trap: 2, pub: 0, asm: 0, rec: 1, row: 'Receptor, indirect waste. Table 702.1 gives no DFU number (note 1: Table 702.2 on what drains in). Flat DFU by size is your design value (Sizing settings)' },
    sink_cfw:{ n: 'Sink, commercial w/ food waste', pre: 'SK', g: 'k', ic: 'fa-sink', trap: 1.5, pub: 3, asm: 3, n2: 1, min2: 1, vol: 1, row: 'Sink, commercial with food waste' },
    sink_sp15:{ n: 'Sink, special purpose 1½″', pre: 'SK', g: 'k', ic: 'fa-sink', trap: 1.5, pub: 3, asm: 3, n2: 1, min2: 1, vol: 1, row: 'Sink, special purpose, 1½″' },
    sink_sp2:{ n: 'Sink, special purpose 2″', pre: 'SK', g: 'k', ic: 'fa-sink', trap: 2, pub: 4, asm: 4, n2: 1, vol: 1, row: 'Sink, special purpose, 2″' },
    sink_sp3:{ n: 'Sink, special purpose 3″', pre: 'SK', g: 'k', ic: 'fa-sink', trap: 3, pub: 6, asm: 6, n2: 1, six: 1, vol: 1, row: 'Sink, special purpose, 3″' },
    bar:     { n: 'Bar sink', pre: 'BS', g: 'k', ic: 'fa-martini-glass', trap: 1.5, pub: 2, asm: 2, n2: 1, min2: 1, vol: 1, row: 'Sink, bar (public)' },
    fwd:     { n: 'Food waste disposer, commercial', pre: 'FWD', g: 'k', ic: 'fa-recycle', trap: 2, pub: 3, asm: 3, row: 'Food waste disposer, commercial' },
    ddw:     { n: 'Dishwasher, independent drain', pre: 'DW', g: 'k', ic: 'fa-utensils', trap: 1.5, pub: 2, asm: 2, n2: 1, min2: 1, row: 'Dishwasher, domestic, with independent drain' },
    cdw:     { n: 'Dishwasher, commercial (indirect)', pre: 'CDW', g: 'k', ic: 'fa-utensils', trap: 0, pub: 0, asm: 0, gpm: 1, n2: 1, row: 'Not in Table 702.1. DFU from rated gpm (Table 702.2); discharge indirect to a receptor' }
  };
  var SPECIAL = {
    J:     { n: 'Junction / fitting', pre: 'J' },
    GI:    { n: 'Grease interceptor (HGI)', pre: 'GI' },
    LOAD:  { n: 'Custom DFU load', pre: 'LOAD' },
    VJ:    { n: 'Vent junction', pre: 'VJ' },
    VTR:   { n: 'Vent through roof', pre: 'VTR' },
    SEWER: { n: 'Building sewer', pre: 'SEWER' }
  };
  // Palette groups: { h: title, k: key } starts a collapsible group.
  var PALETTE = [
    { h: 'Restroom', k: 'rr' },
    { t: 'wc_fv', name: 'WC · flush valve, floor-mount', p: { mount: 'Floor' } },
    { t: 'wc_fv', name: 'WC · flush valve, wall-hung', p: { mount: 'Wall-hung' } },
    { t: 'ur_int', name: 'Urinal · integral trap' },
    { t: 'lav', name: 'Lavatory' },
    { t: 'df', name: 'Drinking fountain' },
    { h: 'Kitchen / grease', k: 'kg' },
    { t: 'sink_cfw', name: '3-compartment sink', p: { n: 3, L: 18, W: 18, D: 12 } },
    { t: 'sink_sp15', name: 'Prep sink', p: { n: 1, L: 24, W: 24, D: 12 } },
    { t: 'cdw', name: 'Commercial dishwasher', p: { gpm: 15 } },
    { t: 'fs', name: 'Floor sink (indirect receptor)', p: { trapSel: 2 } },
    { t: 'GI', name: 'Grease interceptor', p: { rated: '' } },
    { h: 'Drains & service', k: 'ds' },
    { t: 'fd', name: 'Floor drain' },
    { t: 'mop2', name: 'Mop / service basin, 2″' },
    { t: 'sh', name: 'Shower' },
    { h: 'Custom & piping', k: 'pipe' },
    { t: 'LOAD', name: 'Custom DFU load', p: { dfu: 6, min: 0 } },
    { t: 'J', name: 'Junction / fitting' },
    { t: 'VTR', name: 'Vent through roof' },
    { t: 'SEWER', name: 'Building sewer' },
    { h: 'Misc', k: 'misc', closed: 1 },
    { t: 'wc_ft', name: 'WC · flushometer tank', p: { mount: 'Floor' } },
    { t: 'wc_tank', name: 'WC · gravity tank', p: { mount: 'Floor' } },
    { t: 'wc_fv_hi', name: 'WC · flush valve >1.6 GPF', p: { mount: 'Floor' } },
    { t: 'wc_tank_hi', name: 'WC · gravity tank >1.6 GPF', p: { mount: 'Floor' } },
    { t: 'ur_exp', name: 'Urinal · exposed trap' },
    { t: 'ur_nw', name: 'Urinal · nonwater' },
    { t: 'ur_int_hi', name: 'Urinal · integral trap >1.0 GPF' },
    { t: 'lav_set', name: 'Lavatories in sets' },
    { t: 'wfn', name: 'Washfountain' },
    { t: 'svc_fr', name: 'Service sink, flushing rim' },
    { t: 'clin', name: 'Clinical sink' },
    { t: 'mop3', name: 'Mop / service basin, 3″' },
    { t: 'fd_em', name: 'Emergency floor drain' },
    { t: 'sink_sp2', name: 'Special-purpose sink, 2″', p: { n: 1, L: 24, W: 24, D: 14 } },
    { t: 'sink_sp3', name: 'Special-purpose sink, 3″', p: { n: 1, L: 24, W: 24, D: 14 } },
    { t: 'bar', name: 'Bar sink', p: { n: 1, L: 12, W: 12, D: 8 } },
    { t: 'ddw', name: 'Dishwasher, independent drain' },
    { t: 'fwd', name: 'Food waste disposer' }
  ];

  var GW_COLOR = '#8b5a2b', VENT_COLOR = '#059669';
  var LS_DRAFT = 'workspacePlannerDwvDraft_v1', LS_STD = 'workspacePlannerDwvStandard_v1', LS_UI = 'workspacePlannerDwvUi_v1';
  // UPC 708.0: 1/4\"/ft (2%) minimum; 4\" and larger may run at 1/8\"/ft (1%) where first approved by the AHJ.
  var SLOPES = { '1/4': { frac: '1/4″/ft', dec: 0.0208, pct: '2%' }, '1/8': { frac: '1/8″/ft', dec: 0.0104, pct: '1%' } };

  function defaultSettings() {
    return {
      mins: { wc_fv: 4, wc_fv_hi: 4 },
      carryDown: true, noReduce: true,
      minBD: { on: false, size: 4 }, minUG: { on: false, size: 2 },
      maxWC3: 5, autoArm: false, period: 2, gwFlow: true, allow18: true,
      // Floor sink flat DFU by trap size: design values. Defaults = Table 702.1(1) max for the trap (702.1 trap-size basis).
      fsDfu: { 1.5: 3, 2: 4, 3: 6, 4: 8 }
    };
  }
  function loadStandard() {
    try { var s = JSON.parse(localStorage.getItem(LS_STD) || 'null'); if (s && s.mins) return mergeSettings(s); } catch (e) {}
    return defaultSettings();
  }
  function mergeSettings(s) { var d = defaultSettings(); for (var k in s) d[k] = s[k]; return d; }

  // ---------- State ----------
  var P = null;
  var fileHandle = null, fileName = '', dirty = false;
  var undoStack = [];
  var sel = null;
  var tool = 'select';
  var pending = null;
  var armed = null;
  var view = { x: 0, y: 0, s: 1 };
  var R = null;
  var $ = function (id) { return document.getElementById(id); };

  function newProject(name) {
    var st = loadStandard();
    return { app: 'workspace-planner-dwv', version: 1, name: name || 'Untitled DWV', occ: 'public', settings: st, nodes: [], pipes: [], seq: 1 };
  }
  function uid() { return 'n' + (P.seq++); }
  function nodeById(id) { for (var i = 0; i < P.nodes.length; i++) if (P.nodes[i].id === id) return P.nodes[i]; return null; }
  function pipeById(id) { for (var i = 0; i < P.pipes.length; i++) if (P.pipes[i].id === id) return P.pipes[i]; return null; }
  function isFix(n) { return !!(n && FX[n.t]); }
  function nextLabel(t) {
    var pre = (FX[t] || SPECIAL[t]).pre, mx = 0;
    P.nodes.forEach(function (n) { var m = (n.lbl || '').match(new RegExp('^' + pre + '-(\\d+)$')); if (m) mx = Math.max(mx, +m[1]); });
    return pre + '-' + (mx + 1);
  }
  function snapshot() { undoStack.push(JSON.stringify(P)); if (undoStack.length > 60) undoStack.shift(); }
  function mutate(fn) { snapshot(); fn(); dirty = true; refresh(); }

  // ---------- Compute ----------
  function sizeIdx(s) { return SIZES.indexOf(+s); }
  function capFor(i, o, slope) {
    var c = (o === 'V' ? T703.V : T703.H)[i];
    if (o === 'H' && slope === '1/8' && SIZES[i] >= 4) c = Math.floor(c * 0.8); // 703.2 note 5
    return c;
  }
  function dfuFromGpm(g) {
    g = +g || 0; if (g <= 0) return 0;
    for (var i = 0; i < T702_2.length; i++) if (g <= T702_2[i][0]) return T702_2[i][1];
    return null; // over 50 gpm: AHJ
  }
  // Indirect waste receptor (floor sink). Table 702.1 note 1: sized on the drainage capacity of what
  // drains into it, per Table 702.2. Order: typed DFU > equipment gpm (702.2) > fixtures drawn into it >
  // trap-size basis (702.1: units based on trap size; Table 702.1(1) max for that trap) as a design default.
  function fsFlat(tr) { var m = (P.settings && P.settings.fsDfu) || {}; var v = m[tr]; if (v === undefined || v === '' || !isFinite(+v)) v = T7021_1[tr]; return +v || 0; }
  function recInfo(n) {
    var p = n.p || {}, tr = trapOf(n);
    if (p.dfuOv !== undefined && p.dfuOv !== null && p.dfuOv !== '' && isFinite(+p.dfuOv)) return { dfu: Math.max(0, +p.dfuOv), basis: 'dfu', why: 'DFU typed in (your value)' };
    var g = +p.gpm || 0;
    if (g > 0) { var d = dfuFromGpm(g); return { dfu: d, basis: 'gpm', why: d === null ? g + ' gpm is over 50: the AHJ sets the DFU (Table 702.2)' : g + ' gpm of equipment → ' + d + ' DFU (Table 702.2)' }; }
    var t = fsFlat(tr), fed = P.pipes.some(function (q) { return q.k !== 'v' && q.b === n.id; });
    return { dfu: t, basis: 'flat', why: 'Flat ' + t + ' DFU for a ' + SL[tr] + ' floor sink (design value, editable in Sizing settings; default = Table 702.1(1) max for that trap, 702.1).' + (fed ? ' Fixtures drawn into it add their own DFU on top.' : '') };
  }
  function ownDfu(n) {
    if (isFix(n)) {
      var f = FX[n.t];
      if (f.rec) return recInfo(n).dfu;
      if (f.gpm) return dfuFromGpm(n.p && n.p.gpm);
      return P.occ === 'assembly' ? f.asm : f.pub;
    }
    if (n.t === 'LOAD') return +(n.p && n.p.dfu) || 0;
    return 0;
  }
  function trapOf(n) {
    var f = FX[n.t]; if (!f) return 0;
    if (f.rec) return +(n.p && n.p.trapSel) || f.trap;
    return f.trap;
  }
  // Length in feet: a typed value wins; otherwise measured from the scaled plan (horizontal runs only).
  function geomLen(p) { var pts = pathPts(p); if (!pts) return 0; var L = 0; for (var i = 1; i < pts.length; i++) L += Math.sqrt(Math.pow(pts[i][0] - pts[i - 1][0], 2) + Math.pow(pts[i][1] - pts[i - 1][1], 2)); return L; }
  function pipeLen(p) {
    if (p.len !== '' && p.len !== null && p.len !== undefined && !isNaN(parseFloat(p.len))) return { ft: parseFloat(p.len), src: 'manual' };
    if (P.scale && p.k !== 'v' && p.role !== 'stack') return { ft: geomLen(p) / P.scale, src: 'plan' };
    return { ft: null, src: '' };
  }
  function userMin(n) { var m = P.settings.mins[n.t]; return m ? +m : 0; }
  function emptyAgg() { return { dfu: 0, wc: 0, six: 0, n2: 0, lavs: 0, nonLav: 0, fx: [], cmin: 0, umin: 0, umsrc: '', gal: 0, ahj: false }; }

  function compute() {
    var out = { pipe: {}, node: {}, checks: [], fails: 0, warns: 0 };
    var down = {}, ups = {}, vdown = {}, vups = {};
    P.pipes.forEach(function (p) {
      if (p.k === 'v') { vdown[p.a] = p; (vups[p.b] = vups[p.b] || []).push(p); }
      else { down[p.a] = p; (ups[p.b] = ups[p.b] || []).push(p); }
    });
    out.down = down; out.ups = ups;
    var agg = {}, visiting = {};
    function A(id) {
      if (agg[id]) return agg[id];
      if (visiting[id]) return emptyAgg();
      visiting[id] = 1;
      var n = nodeById(id), a = emptyAgg();
      if (n) {
        var d = ownDfu(n);
        if (d === null) { a.ahj = true; d = 0; }
        a.dfu += d;
        if (isFix(n)) {
          var f = FX[n.t]; a.fx.push(n.id);
          if (f.wc) a.wc++;
          if (f.six) a.six++;
          if (f.n2 && d > 1) a.n2++;
          if (f.lav) a.lavs++; else a.nonLav++;
          if (f.min2) a.cmin = Math.max(a.cmin, 2);
          var um = userMin(n); if (um > a.umin) { a.umin = um; a.umsrc = n.lbl; }
          if (f.vol && n.p && +n.p.n) a.gal += (+n.p.n) * (+n.p.L || 0) * (+n.p.W || 0) * (+n.p.D || 0) / 231;
        } else if (n.t === 'LOAD') {
          a.nonLav++;
          if (+n.p.min) a.cmin = Math.max(a.cmin, +n.p.min);
        }
      }
      (ups[id] || []).forEach(function (p) {
        var u = A(p.a);
        a.dfu += u.dfu; a.wc += u.wc; a.six += u.six; a.n2 += u.n2; a.lavs += u.lavs; a.nonLav += u.nonLav;
        a.fx = a.fx.concat(u.fx); a.cmin = Math.max(a.cmin, u.cmin); a.gal += u.gal; a.ahj = a.ahj || u.ahj;
        if (P.settings.carryDown && u.umin > a.umin) { a.umin = u.umin; a.umsrc = u.umsrc; }
      });
      if (n && n.t === 'GI') { out.node[id] = { galIn: a.gal }; a.gal = 0; }
      delete visiting[id]; agg[id] = a; return a;
    }
    P.nodes.forEach(function (n) { A(n.id); });
    out.agg = agg;

    function reachesGI(id) {
      var guard = 0, cur = id;
      while (guard++ < 500) {
        var p = down[cur]; if (!p) return false;
        var b = nodeById(p.b); if (!b) return false;
        if (b.t === 'GI') return true;
        cur = b.id;
      }
      return false;
    }

    function armContOf(p) {
      var guard = 0, cur = p;
      while (guard++ < 200) {
        var a = nodeById(cur.a);
        if (!a || a.t !== 'J' || vdown[a.id] || (ups[a.id] || []).length !== 1) return null;
        var u = ups[a.id][0], ua = nodeById(u.a);
        if (isFix(ua)) return FX[ua.t].gpm ? null : u;
        cur = u;
      }
      return null;
    }
    function armChain(p) {
      var out2 = [p], cur = p, guard = 0;
      while (guard++ < 200) {
        var b = nodeById(cur.b); if (!b || b.t !== 'J' || vdown[b.id] || (ups[b.id] || []).length !== 1) break;
        var nx = down[b.id]; if (!nx) break;
        out2.push(nx); cur = nx;
      }
      return out2;
    }
    var memo = {};
    function sizePipe(p) {
      if (memo[p.id]) return memo[p.id];
      memo[p.id] = { size: 2, code: 2, pending: true };
      var a = nodeById(p.a), b = nodeById(p.b), ag = agg[p.a] || emptyAgg();
      var r = { id: p.id, dfu: ag.dfu, wc: ag.wc, reasons: [], design: false, forced: false, gw: reachesGI(p.a) };
      var arm = isFix(a) && !FX[a.t].gpm;
      var contOf = arm ? null : armContOf(p);
      if (contOf) {
        // A junction between a trap and its vent/next fitting: still the same trap arm.
        var ar = sizePipe(contOf);
        r.role = 'arm'; r.o = 'H'; r.cont = true; r.armPipe = contOf.id; r.size = ar.size; r.code = ar.code; r.design = ar.design; r.cwv = ar.cwv; r.conv = ar.conv;
        if (r.cwv) { r.reasons = ['Continues ' + (nodeById(contOf.a) || {}).lbl + ' trap arm (CWV)']; r.capS = ar.capS; r.util = ar.capS ? ag.dfu / ar.capS : 0; r.slope = '1/4'; r.slopeWhy = ar.slopeWhy; r.upMax = ar.size; memo[p.id] = r; return r; }
        r.reasons = ['Continues ' + (nodeById(contOf.a) || {}).lbl + ' trap arm']; r.capS = T7021_1[r.size] === undefined ? null : T7021_1[r.size];
        r.util = r.capS ? ag.dfu / r.capS : 0; r.slope = '1/4'; r.slopeWhy = 'Trap arm: 1/4″/ft (708.0 minimum)'; r.upMax = ar.size;
        memo[p.id] = r; return r;
      }
      var role = p.role && p.role !== 'auto' ? p.role : (b && b.t === 'SEWER' ? 'bd' : 'branch');
      if (arm) role = 'arm';
      r.role = role; r.o = role === 'stack' ? 'V' : 'H';
      var code = 0;
      if (arm) {
        code = trapOf(a); r.reasons.push('Trap ' + SL[code] + ' (702.1)');
        var lim = T7021_1[code];
        if (lim !== undefined && ag.dfu > lim) {
          for (var j = sizeIdx(code); j < SIZES.length; j++) { if (T7021_1[SIZES[j]] === undefined || T7021_1[SIZES[j]] >= ag.dfu) { code = SIZES[j]; break; } }
          r.reasons.push('702.1(1) arm load');
        }
      } else {
        var lavRule = ag.lavs > 0 && ag.nonLav === 0 && ag.lavs <= 8; // note 7: 1½″ vertical, or horizontal at 1/4″/ft (always 1/4″ below 4″)
        for (var i = 0; i < SIZES.length; i++) {
          var s = SIZES[i], c = capFor(i, r.o, '1/4');
          if (s === 1.5 && lavRule) { code = s; r.lavCap = true; r.reasons.push('703.2 note 7: ' + ag.lavs + ' lav(s) on 1½″'); break; }
          if (s === 1.5 && r.o === 'V' && ag.n2 > 0) continue;
          if (s <= 2 && (ag.wc > 0 || ag.six > 0)) continue;
          if (s === 3 && (ag.wc > Math.min(5, +P.settings.maxWC3) || ag.six > 5)) continue;
          if (c >= ag.dfu) { code = s; r.reasons.push('703.2 ' + (r.o === 'V' ? 'vertical' : 'horizontal') + ' ≤' + c + ' DFU'); break; }
        }
        if (!code) { code = 12; r.reasons.push('Exceeds Table 703.2'); }
        if (ag.cmin > code) { code = ag.cmin; r.reasons.push('702.1 note 2: 2″ min drain'); }
      }
      r.cwv = !!p.cwv;
      if (r.cwv) {
        // UPC 910.4: waste pipe and trap two pipe sizes over the Chapter 7 size (load-based per 910.7).
        r.conv = code; code = cwvUp(code); r.reasons.push('CWV: 2 sizes over ' + SL[r.conv] + ' (910.4, Appendix B 101.6.1)');
      }
      var upMax = 0, upMaxCode = 0;
      (ups[p.a] || []).forEach(function (u) { var rr = sizePipe(u); upMax = Math.max(upMax, rr.size); upMaxCode = Math.max(upMaxCode, rr.code); });
      var size = code;
      r.code = code;
      var um = arm ? userMin(a) : (P.settings.carryDown ? ag.umin : 0);
      if (um > size) { size = um; r.design = true; r.reasons.push('Design min ' + SL[um] + (arm ? '' : ' (from ' + ag.umsrc + ')')); }
      if (P.settings.noReduce && !arm && upMax > size) { size = upMax; r.design = true; r.reasons.push('No reduction downstream'); }
      if (role === 'bd' && P.settings.minBD.on && +P.settings.minBD.size > size) { size = +P.settings.minBD.size; r.design = true; r.reasons.push('Design min building drain'); }
      if (p.ug && P.settings.minUG.on && +P.settings.minUG.size > size) { size = +P.settings.minUG.size; r.design = true; r.reasons.push('Design min underground'); }
      if (!arm && b && b.t === 'GI' && P.settings.gwFlow && ag.gal > 0) {
        var gload = ag.gal * 0.75 / (+P.settings.period || 2), grow = null;
        T1014.forEach(function (t) { if (!grow && t.full >= gload) grow = t; });
        if (grow && grow.d > size) { size = grow.d; r.design = true; r.reasons.push('GW line sized for ' + gload.toFixed(1) + ' gpm (Table 1014.2.1 full-pipe flow)'); }
      }
      if (arm && !r.cwv) {
        // Developed arm length: this pipe plus any junction-to-junction continuation before the next vent or merge.
        var chain = armChain(p), tot = 0, known = 0, src = 'manual';
        chain.forEach(function (q) { var L = pipeLen(q); if (L.ft !== null) { tot += L.ft; known++; if (L.src === 'plan') src = 'plan'; } });
        var lenIn = known ? Math.round(tot * 12) : 0;
        r.chain = chain.map(function (q) { return q.id; }); r.lenSrc = src;
        if (lenIn) {
          var maxIn = FX[a.t].wc ? 72 : (size > 4 ? 120 : T1002[size]);
          if (!FX[a.t].wc && lenIn > maxIn && P.settings.autoArm) {
            for (var k = sizeIdx(size) + 1; k < SIZES.length; k++) { var mm = SIZES[k] > 4 ? 120 : T1002[SIZES[k]]; if (mm >= lenIn) { size = SIZES[k]; maxIn = mm; r.design = true; r.reasons.push('Upsized for arm length'); break; } }
          }
          r.armMax = maxIn; r.lenIn = lenIn; r.armOK = lenIn <= maxIn;
        }
      }
      if (p.force) { var fz = +p.force; r.forced = true; r.under = fz < size; size = fz; r.reasons.push('Forced ' + SL[fz]); }
      r.size = size;
      // Slope is chosen by the tool, never entered. UPC 708.0: 1/4″/ft minimum; 1/8″/ft only for 4″+ where first approved by the AHJ.
      if (r.o === 'H' && r.cwv) { r.slope = '1/4'; r.slopeWhy = 'CWV: 1/4″/ft (708.0 minimum; Appendix B 101.3 lays long runs at the minimum permissible slope)'; }
      else if (r.o === 'H') {
        r.slope = '1/4'; r.slopeWhy = arm ? 'Trap arm: 1/4″/ft (708.0 minimum)' : (size < 4 ? 'Under 4″: 1/4″/ft is the 708.0 minimum' : '');
        if (!arm && size >= 4) {
          var c8 = capFor(sizeIdx(size), 'H', '1/8');
          if (r.gw) r.slopeWhy = 'GW line: Table 1014.2.1 flows assume 1/4″/ft (note 2)';
          else if (!P.settings.allow18) r.slopeWhy = '1/8″/ft option is off in Sizing settings';
          else if (ag.dfu <= c8) { r.slope = '1/8'; r.ahj = true; r.slopeWhy = 'Fits 1/8″/ft: ' + fmtDfu(ag.dfu) + ' ≤ ' + c8 + ' DFU (703.2 note 5, 80%). Needs AHJ approval (708.0)'; }
          else r.slopeWhy = 'Needs 1/4″/ft: ' + fmtDfu(ag.dfu) + ' DFU is over the 1/8″/ft limit of ' + c8 + ' (703.2 note 5)';
        }
      }
      if (r.cwv) r.capS = arm ? (T7021_1[r.conv] === undefined ? null : T7021_1[r.conv]) : (sizeIdx(r.conv) < 0 ? null : capFor(sizeIdx(r.conv), r.o, '1/4')); // load limit of the Chapter 7 size it was stepped up from
      else if (!arm) r.capS = r.lavCap && size === 1.5 ? 8 : (sizeIdx(size) < 0 ? null : capFor(sizeIdx(size), r.o, r.slope));
      else r.capS = T7021_1[size] === undefined ? null : T7021_1[size];
      r.util = r.lavCap && size === 1.5 && !r.cwv ? ag.lavs / 8 : (r.capS ? ag.dfu / r.capS : 0);
      var PL = pipeLen(p); r.lenFt = PL.ft; r.lenSrc = r.lenSrc || PL.src;
      if (r.o === 'V' && p.len && sizeIdx(size) >= 0) { var vl = T703.VLEN[sizeIdx(size)]; r.vlenMax = vl; r.vlenOK = !vl || parseFloat(p.len) <= vl; }
      r.upMax = upMax;
      memo[p.id] = r; return r;
    }
    P.pipes.forEach(function (p) { if (p.k !== 'v') out.pipe[p.id] = sizePipe(p); });
    // Dead-end stub (upstream end of a main with nothing on it yet): same size as the line it joins.
    P.pipes.forEach(function (p) {
      var r = out.pipe[p.id]; if (!r || p.k === 'v' || r.role === 'arm' || r.cwv || (ups[p.a] || []).length || (agg[p.a] && agg[p.a].dfu > 0) || isFix(nodeById(p.a))) return;
      var cur = p, g = 0, sz = 0;
      while (cur && g++ < 500) { var nx = down[cur.b]; if (!nx) break; var rn = out.pipe[nx.id]; if (rn && rn.dfu > 0) { sz = rn.size; break; } cur = nx; }
      if (sz > r.size && sizeIdx(sz) >= 0) { r.size = sz; r.stub = true; r.reasons = ['Upstream end of the line, no load yet: sized as the line it joins']; r.util = 0; r.capS = capFor(sizeIdx(sz), r.o, '1/4'); if (r.o === 'H') { r.slope = '1/4'; r.ahj = false; r.slopeWhy = 'Dead-end stub kept at 1/4″/ft'; } }
    });

    var vmemo = {};
    function served(id, guard) {
      if (vmemo[id]) return vmemo[id];
      guard = guard || 0; if (guard > 500) return {};
      var set = {}, n = nodeById(id);
      if (n && n.t !== 'VJ' && n.t !== 'VTR') {
        if (isFix(n)) set[n.id] = 1;
        else {
          var arms = (ups[id] || []).filter(function (p) { return isFix(nodeById(p.a)); });
          var src = arms.length ? arms.map(function (p) { return p.a; }) : (agg[id] ? agg[id].fx : []);
          src.forEach(function (f) { set[f] = 1; });
        }
      }
      (vups[id] || []).forEach(function (p) { var s2 = served(p.a, guard + 1); for (var k in s2) set[k] = 1; });
      vmemo[id] = set; return set;
    }
    P.pipes.forEach(function (p) {
      if (p.k !== 'v') return;
      var set = served(p.a), dfu = 0, wc = 0, six = 0;
      for (var k in set) { var fn = nodeById(k); if (!fn) continue; var d = ownDfu(fn) || 0; dfu += d; if (FX[fn.t].wc) wc++; if (FX[fn.t].six) six++; }
      var a = nodeById(p.a), drain = 0;
      if (a && down[a.id] && out.pipe[down[a.id].id]) drain = out.pipe[down[a.id].id].size;
      var minV = Math.max(1.25, drain / 2), size = 0;
      for (var i = 0; i < 8; i++) {
        var s = SIZES[i]; if (s < minV) continue;
        if (s === 1.5 && (wc || six)) continue;
        if (T703.VENT[i] >= dfu) { size = s; break; }
      }
      if (!size) size = 8;
      // UPC 910.3: a CWV vent's area is at least half the inside area of the drain served (nominal sizes here).
      var cw = a && down[a.id] && out.pipe[down[a.id].id] && out.pipe[down[a.id].id].cwv, cwMin = 0;
      if (!cw && a) cw = (ups[a.id] || []).some(function (q) { return out.pipe[q.id] && out.pipe[q.id].cwv; });
      if (cw) {
        var dr = drain; (ups[a.id] || []).forEach(function (q) { if (out.pipe[q.id] && out.pipe[q.id].cwv) dr = Math.max(dr, out.pipe[q.id].size); });
        for (var ci = 0; ci < CWV_SIZES.length; ci++) if (CWV_SIZES[ci] >= dr / Math.SQRT2 - 1e-9) { cwMin = CWV_SIZES[ci]; break; }
        if (cwMin > size) size = cwMin; drain = dr;
      }
      var under = false;
      if (p.force) { under = +p.force < Math.max(minV, cwMin); size = +p.force; }
      out.pipe[p.id] = { id: p.id, vent: true, dfu: dfu, size: size, half: drain / 2, wc: wc, under: under, cwv: !!cw, cwMin: cwMin };
    });

    // ---------- Checks ----------
    var C = out.checks, MU = muteOf(); out.ignored = []; out.offN = 0; out.failPid = {};
    // rule: check id (can be turned off for the project). keys: element-specific ids that Ignore stores.
    // pids: pipes whose red ! badge this check drives.
    function add(lvl, tag, html, ref, rule, keys, pids) {
      rule = rule || 'ok';
      if (rule !== 'ok' && MU.rules[rule]) { out.offN++; return; }
      if (keys === undefined || keys === null) keys = [rule + ':' + (ref || '')];
      if (typeof keys === 'string') keys = [keys];
      var c = { lvl: lvl, tag: tag, html: html, ref: ref, rule: rule, keys: keys };
      if (rule !== 'ok' && lvl !== 'ok' && keys.length && keys.every(function (k) { return MU.keys[k]; })) { out.ignored.push(c); return; }
      C.push(c); if (lvl === 'fail') out.fails++; if (lvl === 'warn') out.warns++;
      if (lvl === 'fail') (pids || (ref && pipeById(ref) ? [ref] : [])).forEach(function (q) { out.failPid[q] = 1; });
    }
    var MUT = {}; // elements dropped from list-style checks because they were ignored (shown under "Show ignored")
    function ign(rule, id) { if (MU.rules[rule]) return true; if (MU.keys[rule + ':' + id]) { (MUT[rule] = MUT[rule] || {})[id] = 1; return true; } return false; }
    var armsNoLen = 0;
    R = out; // so pipeName can read roles
    P.pipes.forEach(function (p) {
      var r = out.pipe[p.id]; if (!r || r.vent) return;
      var a = nodeById(p.a), nm = pipeName(p);
      if (r.role === 'arm' && r.cont) return;
      if (r.role === 'arm') {
        if (r.lenIn && !r.cwv) {
          if (!r.armOK) add('fail', 'UPC', '<b>' + nm + '</b> ' + SL[r.size] + ' runs ' + fmtFtIn(r.lenIn) + ' to its vent' + (r.lenSrc === 'plan' ? ' (measured on plan)' : '') + '. Max is ' + fmtFtIn(r.armMax) + ' (Table 1002.2' + (FX[a.t].wc ? ' note 2' : '') + ').', p.id, 'armLen');
        } else if (!r.cwv && !ign('armNoLen', p.id)) armsNoLen++;
        if (r.capS !== null && r.dfu > r.capS) add('fail', 'UPC', '<b>' + nm + '</b> carries ' + fmtDfu(r.dfu) + ' DFU on a ' + SL[r.size] + ' trap arm. Max is ' + r.capS + ' (Table 702.1(1)).', p.id, 'armDfu');
      } else {
        if (r.util > 1) add('fail', 'UPC', '<b>' + nm + '</b> carries ' + fmtDfu(r.dfu) + ' DFU on ' + SL[r.size] + '. Max is ' + r.capS + ' (Table 703.2' + (r.cwv ? ', for the ' + SL[r.conv] + ' it is stepped up from' : '') + ').', p.id, 'cap');
        else if (r.util >= 0.7) add('warn', 'UPC', '<b>' + nm + '</b> is at ' + Math.round(r.util * 100) + '% of ' + SL[r.size] + ' ' + (r.o === 'V' ? 'vertical' : 'horizontal') + ' capacity (' + fmtDfu(r.dfu) + ' of ' + r.capS + (r.lavCap && r.size === 1.5 ? ' lavs' : ' DFU') + ').', p.id, 'capWarn');
        if (r.vlenOK === false) add('fail', 'UPC', '<b>' + nm + '</b> is ' + p.len + ' ft long. Max vertical length for ' + SL[r.size] + ' is ' + r.vlenMax + ' ft (Table 703.2).', p.id, 'vlen');
        if (r.upMax > r.size) add('fail', 'Check', '<b>' + nm + '</b> is smaller than the pipe feeding it (' + SL[r.upMax] + ' to ' + SL[r.size] + ').', p.id, 'reduce');
      }
      if (r.under) add('fail', 'Check', '<b>' + nm + '</b> is forced to ' + SL[r.size] + ', below the required size.', p.id, 'forced');
      if (agg[p.a] && agg[p.a].ahj && r.role !== 'arm') add('warn', 'UPC', '<b>' + nm + '</b> includes a discharge over 50 gpm. The AHJ sets that DFU (Table 702.2).', p.id, 'ahj50');
    });
    // ---- connection state: main network, open ends, fixtures not tied in ----
    var NET = networks(); out.net = NET; out.open = {}; out.fixOff = {};
    var mainNodes = NET.main ? NET.main.nodes : {}, deadEnds = [], heads = 0, outlet = null;
    if (NET.main && !NET.main.sewer) {
      // no sewer yet: the main's outlet is its most loaded downstream end
      Object.keys(mainNodes).forEach(function (id) { if (!down[id] && (ups[id] || []).length && (!outlet || (agg[id] || {}).dfu > (agg[outlet] || {}).dfu)) outlet = id; });
    }
    P.nodes.forEach(function (n) {
      if (n.t !== 'J') return;
      var deg = P.pipes.filter(function (q) { return q.k !== 'v' && (q.a === n.id || q.b === n.id); }).length;
      if (deg !== 1 || vdown[n.id]) return;
      if (!down[n.id]) { if (n.id === outlet) out.open[n.id] = 'outlet'; else { out.open[n.id] = 'dead'; if (!ign('open', n.id)) deadEnds.push(n); } }
      else { out.open[n.id] = 'head'; heads++; }
    });
    var offFix = P.nodes.filter(function (n) { if (!isFix(n)) return false; var off = !mainNodes[n.id]; if (off) out.fixOff[n.id] = 1; return off && !ign('offFix', n.id); });
    var loosePipes = P.pipes.filter(function (q) { return q.k !== 'v' && !(NET.main && NET.comp[q.id] === NET.main.id) && !ign('loose', q.id); });
    function keysOf(rule, list) { return list.map(function (x) { return rule + ':' + x.id; }); }
    function pipesInto(list) { var o = []; list.forEach(function (n) { (ups[n.id] || []).forEach(function (q) { o.push(q.id); }); }); return o; }
    if (deadEnds.length) add('fail', 'Check', deadEnds.length + ' pipe' + (deadEnds.length > 1 ? 's end' : ' ends') + ' unconnected (red ring): ' + deadEnds.slice(0, 6).map(function (n) { return n.lbl; }).join(', ') + (deadEnds.length > 6 ? '…' : '') + '. Flow goes nowhere. Drag the end onto the main, or draw to it.', deadEnds[0].id, 'open', keysOf('open', deadEnds), pipesInto(deadEnds));
    if (outlet) add('info', 'Check', 'Main outlet at <b>' + nodeById(outlet).lbl + '</b> (amber ring). Add the Building sewer there to finish the system.', outlet, 'outlet');
    if (offFix.length && P.pipes.some(function (q) { return q.k !== 'v'; })) add('warn', 'Check', offFix.length + ' fixture' + (offFix.length > 1 ? 's are' : ' is') + ' not on the main network (dimmed): ' + offFix.slice(0, 6).map(function (n) { return n.lbl; }).join(', ') + (offFix.length > 6 ? '…' : '') + '.', offFix[0].id, 'offFix', keysOf('offFix', offFix));
    if (loosePipes.length && NET.main) add('warn', 'Check', loosePipes.length + ' pipe' + (loosePipes.length > 1 ? 's are' : ' is') + ' not tied into the main network (orange). Their DFU does not reach the main.', loosePipes[0].id, 'loose', keysOf('loose', loosePipes));
    if (NET.main && !deadEnds.length && !loosePipes.length && !offFix.length) add('ok', 'Check', 'Everything drawn is tied into the main network' + (NET.main.sewer ? ' and the building sewer' : '') + '.');
    // ---- flow direction ----
    var hasSewer = P.nodes.some(function (n) { return n.t === 'SEWER'; }), flowIssues = 0;
    if (hasSewer) P.nodes.forEach(function (n) {
      if (n.t === 'SEWER' || down[n.id]) return;
      var ins = ups[n.id] || []; if (!ins.length) return;
      if (out.open[n.id] === 'dead') { ins.forEach(function (p) { if (out.pipe[p.id]) out.pipe[p.id].flowBad = true; }); flowIssues++; return; } // already listed as an open end
      var mains = ins.filter(function (p) { var r = out.pipe[p.id]; return !(r && r.role === 'arm') && !p.br; });
      ins.forEach(function (p) { if (out.pipe[p.id]) out.pipe[p.id].flowBad = true; });
      flowIssues++;
      if (mains.length >= 2) add('fail', 'Check', 'Flows meet head-on at <b>' + n.lbl + '</b> (' + mains.map(pipeName).join(' and ') + '). Select one and use Flip flow.', mains[0].id, 'headon', 'headon:' + n.id, ins.map(function (q) { return q.id; }));
      else add('fail', 'Check', 'Flow ends at <b>' + n.lbl + '</b> and never reaches the building sewer (' + pipeName(ins[0]) + '). Draw upstream to downstream, or Flip flow.', ins[0].id, 'noSewer', 'noSewer:' + n.id, ins.map(function (q) { return q.id; }));
    });
    P.nodes.forEach(function (n) {
      if (n.t !== 'J' || !n.p || !n.p.fit) return;
      var f = n.p.fit;
      if (f.type === 'against') { flowIssues++; add('fail', 'Check', 'Branch enters the main against its flow at <b>' + n.lbl + '</b> (' + f.ang + '° to the flow). Redraw the last leg toward the flow, or Flip flow on the main.', n.id, 'against'); }
      else if (f.type === 'tee90') add('info', 'UPC', '<b>' + n.lbl + '</b> ties in at 90° in plan. 706.3: horizontal lines joining horizontal lines enter through 45° wye branches, combination wye and one-eighth bend branches, or other approved fittings of equivalent sweep.', n.id, 'tee90');
    });
    if (hasSewer && !flowIssues && P.pipes.some(function (p) { return p.k !== 'v'; })) add('ok', 'Check', 'Every drain flows downhill to the building sewer; arrows on each horizontal pipe show the direction.');
    else if (!hasSewer && P.pipes.some(function (p) { return p.k !== 'v'; })) add('info', 'Check', 'No building sewer drawn yet, so flow direction toward the sewer is not checked. Pipes flow the way they were drawn (arrows).', null, 'noSewerInfo', 'noSewerInfo:');
    var fvMin = +P.settings.mins.wc_fv || 0;
    function isFV(id) { var fn = nodeById(id); return fn && (fn.t === 'wc_fv' || fn.t === 'wc_fv_hi'); }
    if (fvMin > 3 && P.nodes.some(function (n) { return isFV(n.id); })) {
      var fvPipes = P.pipes.filter(function (p) { var r = out.pipe[p.id]; return r && !r.vent && agg[p.a] && agg[p.a].fx.some(isFV); });
      var fvBad = fvPipes.filter(function (p) { return out.pipe[p.id].size < fvMin; });
      if (fvBad.length) add('fail', 'Design rule', 'Flush-valve WC path should be ' + SL[fvMin] + ' or larger: ' + fvBad.map(pipeName).join(', ') + '.', fvBad[0].id, 'fvMin', keysOf('fvMin', fvBad), fvBad.map(function (q) { return q.id; }));
      else add('ok', 'Design rule', 'Every flush-valve WC path is ' + SL[fvMin] + ' or larger (' + fvPipes.length + ' pipes, from each WC arm to the sewer).');
    }
    var lavMin = +P.settings.mins.lav || 0;
    if (lavMin && P.nodes.some(function (n) { return n.t === 'lav'; })) add('ok', 'Design rule', 'Lavatory arms are ' + SL[lavMin] + ', your minimum (code allows ' + SL[1.25] + ').');
    var maxWC3 = 0; P.pipes.forEach(function (p) { var r = out.pipe[p.id]; if (r && !r.vent && r.role !== 'arm' && r.size === 3) maxWC3 = Math.max(maxWC3, r.wc); });
    if (P.nodes.some(function (n) { return isFix(n) && FX[n.t].wc; })) {
      var lim3 = Math.min(5, +P.settings.maxWC3);
      add('ok', lim3 < 5 ? 'Design rule' : 'UPC', 'Most WCs on any 3″ pipe: ' + maxWC3 + '. Limit is ' + lim3 + ' (703.2 note 4' + (lim3 < 5 ? ', your stricter limit' : '') + '). 2″ never carries a WC (note 3).');
    }
    var hPipes = P.pipes.filter(function (p) { var r = out.pipe[p.id]; return r && !r.vent && r.o === 'H'; });
    if (hPipes.length) {
      var at8 = hPipes.filter(function (p) { return out.pipe[p.id].slope === '1/8'; });
      var big4 = hPipes.filter(function (p) { var r = out.pipe[p.id]; return r.role !== 'arm' && r.size >= 4 && r.slope === '1/4'; });
      add('ok', 'UPC', 'Slopes are set by the sizer: 1/4″/ft (0.0208) on every horizontal pipe under 4″ and on trap arms, the 708.0 minimum.' + (big4.length ? ' ' + big4.length + ' pipe' + (big4.length > 1 ? 's' : '') + ' 4″ or larger also stay at 1/4″/ft (load over the 1/8″ limit, grease line, or option off).' : ''));
      if (at8.length) add('info', 'AHJ approval', at8.length + ' pipe' + (at8.length > 1 ? 's' : '') + ' 4″ or larger run at 1/8″/ft (0.0104): ' + at8.slice(0, 4).map(pipeName).join(', ') + (at8.length > 4 ? '…' : '') + '. 708.0 allows this only where 1/4″/ft is impractical, with AHJ approval first. Limits drop to 80% (703.2 note 5).', at8[0].id, 'slope18', keysOf('slope18', at8));
    }
    var fixNoVent = P.nodes.filter(function (n) {
      if (!isFix(n) || FX[n.t].gpm) return false;
      if (vdown[n.id]) return false;
      var d = down[n.id]; if (d && vdown[d.b]) return false;
      if (d && out.pipe[d.id] && out.pipe[d.id].cwv) return false; // vented by the combination waste & vent system (910)
      return !ign('noVent', n.id);
    });
    if (P.nodes.some(isFix)) {
      if (fixNoVent.length) add('warn', 'UPC', 'No vent drawn yet for ' + fixNoVent.slice(0, 6).map(function (n) { return n.lbl; }).join(', ') + (fixNoVent.length > 6 ? '…' : '') + '. Each trap needs a vent (1002.1).', fixNoVent[0].id, 'noVent', keysOf('noVent', fixNoVent));
      else if (!MUT.noVent && !MU.rules.noVent) add('ok', 'UPC', 'Every trap has a vent drawn. Vents are at least 1¼″ and at least ½ the drain size (703.2 note 6).');
    }
    P.pipes.forEach(function (p) { if (p.k === 'v' && out.pipe[p.id].under) add('fail', 'UPC', 'Vent <b>' + pipeName(p) + '</b> ' + (out.pipe[p.id].cwv ? 'is under the CWV vent minimum ' + SL[out.pipe[p.id].cwMin] + ' (910.3: area at least ½ the drain served) or 703.2 note 6.' : 'is under 1¼″ or under ½ its drain size (703.2 note 6).'), p.id, 'ventUnder', null, [p.id]); });
    P.nodes.forEach(function (n) {
      if (n.t !== 'GI') return;
      var ins = ups[n.id] || [], gal = (out.node[n.id] && out.node[n.id].galIn) || 0, inSize = 0;
      ins.forEach(function (p) { inSize = Math.max(inSize, out.pipe[p.id].size); });
      var per = +P.settings.period || 2, load = gal * 0.75 / per;
      var row = null; T1014.forEach(function (t) { if (!row && t.d >= inSize) row = t; });
      var sug = row ? (per === 1 ? row.m1 : row.m2) : null;
      var rated = +(n.p && n.p.rated) || 0;
      out.node[n.id] = { gal: gal, load: load, inSize: inSize, row: row, sug: sug, rated: rated, per: per };
      if (!ins.length) { add('info', 'UPC', n.lbl + ' has no grease waste connected yet.', n.id, 'giInfo', 'giNone:' + n.id); return; }
      if (row && load > row.full) add('warn', 'UPC', n.lbl + ' inlet ' + SL[inSize] + ' carries ' + row.full + ' gpm full-pipe flow, but the fixture load is ' + load.toFixed(1) + ' gpm (Table 1014.2.1). Upsize the GW line.', n.id, 'gi', 'giLine:' + n.id);
      var useR = rated || sug;
      if (useR && gal > 0) {
        if (load > useR) add('fail', 'UPC', n.lbl + ' is rated ' + useR + ' gpm, but the ' + per + '-min load is ' + load.toFixed(1) + ' gpm (Example 1014.2.1).', n.id, 'gi', 'giRate:' + n.id);
        else add('ok', 'UPC', n.lbl + ' at ' + useR + ' gpm' + (rated ? '' : ' (suggested from Table 1014.2.1)') + ' covers the ' + per + '-min load of ' + load.toFixed(1) + ' gpm (' + gal.toFixed(1) + ' gal × 0.75 ÷ ' + per + ').', n.id);
        if (gal > 2.5 * useR) add('fail', 'UPC', n.lbl + ' gets ' + gal.toFixed(1) + ' gal of fixture volume, over 2.5 × ' + useR + ' = ' + (2.5 * useR).toFixed(1) + ' gal (1014.2.1).', n.id, 'gi', 'giVol:' + n.id);
        else add('ok', 'UPC', n.lbl + ' fixture volume ' + gal.toFixed(1) + ' gal is within 2.5 × ' + useR + ' gpm = ' + (2.5 * useR).toFixed(1) + ' gal (1014.2.1).', n.id);
      } else if (!gal) add('info', 'UPC', n.lbl + ': enter compartment sizes on the grease sinks to size it. Sizing TBD.', n.id, 'giInfo', 'giTbd:' + n.id);
      var outP = down[n.id];
      var vented = !!vdown[n.id] || !!(outP && P.pipes.some(function (q) { return q.k === 'v' && q.a === outP.b; }));
      add(vented ? 'ok' : 'warn', 'UPC', n.lbl + (vented ? ' has a vent downstream (1014.2.2).' : ' needs a vent downstream (1014.2.2).'), n.id, vented ? 'ok' : 'gi', 'giVent:' + n.id);
      add('info', 'UPC', n.lbl + ' needs a vented flow control upstream (1014.2). It is not drawn.', n.id, 'giInfo', 'giFc:' + n.id);
    });
    // ---- fixtures that add no DFU ----
    var flatFs = [];
    P.nodes.forEach(function (n) {
      if (n.t === 'LOAD') { if (!(+(n.p && n.p.dfu) > 0) && !ign('zeroDfu', n.id)) add('warn', 'Check', '<b>' + n.lbl + '</b> is a custom load of 0 DFU. Enter its DFU in the inspector.', n.id, 'zeroDfu'); return; }
      if (!isFix(n)) return;
      var f = FX[n.t];
      if (f.rec) {
        var ri = recInfo(n);
        if (ri.basis === 'flat') flatFs.push(n);
        else if (ri.basis === 'dfu' && ri.dfu === 0) add('warn', 'Check', '<b>' + n.lbl + '</b> has 0 DFU typed in, so it adds nothing downstream.', n.id, 'zeroDfu');
        return;
      }
      var d = ownDfu(n);
      if (d !== 0) return;
      if (n.t === 'fd_em') add('info', 'UPC', '<b>' + n.lbl + '</b> (emergency floor drain) is 0 DFU in Table 702.1.', n.id, 'zeroDfu');
      else if (f.gpm) add('warn', 'Check', '<b>' + n.lbl + '</b> adds 0 DFU: no rated gpm entered. Enter the rated discharge (Table 702.2: up to 7½ gpm = 1, to 15 = 2, to 30 = 4, to 50 = 6).', n.id, 'zeroDfu');
      else add('warn', 'Check', '<b>' + n.lbl + '</b> adds 0 DFU.', n.id, 'zeroDfu');
    });
    if (flatFs.length) add('info', 'Design value', flatFs.length + ' floor sink' + (flatFs.length > 1 ? 's use' : ' uses') + ' a flat DFU by size (' + [2, 3, 4].map(function (t) { return SL[t] + ' ' + fsFlat(t); }).join(' · ') + '; edit in Sizing settings). UPC Table 702.1 lists indirect waste receptors with no DFU number (note 1: size on what drains in, Table 702.2); enter a gpm override where you have it.', flatFs[0].id, 'recDefault', keysOf('recDefault', flatFs));
    // ---- combination waste & vent (UPC 910) ----
    var cwvP = P.pipes.filter(function (q) { var r = out.pipe[q.id]; return r && !r.vent && r.cwv; });
    if (cwvP.length) {
      // group CWV pipes into systems (connected through shared nodes)
      var sysOf = {}, systems = [];
      cwvP.forEach(function (q) {
        if (sysOf[q.id] !== undefined) return;
        var sysI = systems.length, sy = { pipes: [], nodes: {} }; systems.push(sy);
        var stack = [q];
        while (stack.length) {
          var c = stack.pop(); if (sysOf[c.id] !== undefined) continue;
          sysOf[c.id] = sysI; sy.pipes.push(c); sy.nodes[c.a] = 1; sy.nodes[c.b] = 1;
          cwvP.forEach(function (o) { if (sysOf[o.id] === undefined && (o.a === c.a || o.a === c.b || o.b === c.a || o.b === c.b)) stack.push(o); });
        }
      });
      systems.forEach(function (sy) {
        var first = sy.pipes[0], ids = sy.pipes.map(function (q) { return q.id; }), tag = first.id;
        var bad = {}; sy.pipes.forEach(function (q) { (agg[q.a] || emptyAgg()).fx.forEach(function (fid) { var fn = nodeById(fid); if (fn && (FX[fn.t].wc || FX[fn.t].pre === 'UR')) bad[fid] = fn.lbl; }); });
        var badL = Object.keys(bad).map(function (k) { return bad[k]; });
        if (badL.length) add('fail', 'UPC', 'Combination waste & vent run ' + pipeName(first) + ' serves ' + badL.join(', ') + '. No water closet or urinal on a CWV system (910.7).', first.id, 'cwvWC', 'cwvWC:' + tag, ids);
        var vert = sy.pipes.filter(function (q) { return out.pipe[q.id].o === 'V'; });
        if (vert.length) add('fail', 'UPC', 'CWV ' + vert.map(pipeName).join(', ') + ' is vertical. 910.5: no vertical waste pipe in a CWV system except the fixture tailpiece (2 ft max); branches may offset at 45°.', vert[0].id, 'cwvVert', keysOf('cwvVert', vert), vert.map(function (q) { return q.id; }));
        var vents = P.pipes.filter(function (q) { if (q.k !== 'v') return false; var vn = nodeById(q.a); return sy.nodes[q.a] || (vn && isFix(vn) && down[vn.id] && sysOf[down[vn.id].id] !== undefined); });
        if (!vents.length) add('fail', 'UPC', 'CWV run ' + pipeName(first) + ' has no vent. 910.3: each CWV system needs a vent, connected downstream of the uppermost fixture, with at least ½ the inside area of the drain it serves.', first.id, 'cwvVent', 'cwvVent:' + tag);
        else add('ok', 'UPC', 'CWV run ' + pipeName(first) + ': vent ' + vents.map(function (q) { return SL[out.pipe[q.id].size]; }).join(', ') + ' (910.3: area ≥ ½ the drain; sized on nominal diameters, check the pipe material’s inside diameter). Keep the vent downstream of the uppermost fixture.');
        // 910.3: a branch over 15 ft is separately vented
        sy.pipes.forEach(function (q) {
          var fa = nodeById(q.a); if (!isFix(fa)) return;
          var chain = [q], cur = q, g = 0;
          while (g++ < 200) { var b = nodeById(cur.b); if (!b || b.t !== 'J' || (ups[b.id] || []).length !== 1) break; var nx = down[b.id]; if (!nx || sysOf[nx.id] === undefined) break; chain.push(nx); cur = nx; }
          var L = 0, known = true; chain.forEach(function (c) { var pl = pipeLen(c); if (pl.ft === null) known = false; else L += pl.ft; });
          var vented = vdown[fa.id] || chain.some(function (c) { return vdown[c.b]; });
          if (known && L > 15 && !vented) add('warn', 'UPC', '<b>' + fa.lbl + '</b> CWV branch is ' + fmtFtIn(Math.round(L * 12)) + ' long. 910.3: a branch over 15 ft is separately vented.', q.id, 'cwvBranch');
        });
        if (sy.pipes.some(function (q) { return out.pipe[q.id].gw; })) add('warn', 'UPC', 'CWV run ' + pipeName(first) + ' carries grease waste. Appendix B 101.2: restaurant kitchen equipment shall not be connected to a CWV system.', first.id, 'cwvGrease', 'cwvGrease:' + tag);
      });
      add('info', 'AHJ approval', cwvP.length + ' pipe' + (cwvP.length > 1 ? 's are' : ' is') + ' combination waste & vent. 910.1: only where structural conditions preclude a conventional system; 910.2: construction documents approved by the AHJ before install. Sized 2 pipe sizes over Chapter 7 (910.4, Appendix B 101.6.1); trap-arm length and trap-vent checks do not apply on these runs. Each CWV vent needs an accessible cleanout (910.6).', cwvP[0].id, 'cwvAHJ', 'cwvAHJ:');
    }
    if (armsNoLen) add('info', 'Check', armsNoLen + ' trap arm' + (armsNoLen > 1 ? 's have' : ' has') + ' no length yet. Tap an arm to enter one, or load a scaled plan so lengths are measured.', null, 'armNoLen', P.pipes.filter(function (q) { var r = out.pipe[q.id]; return r && r.role === 'arm' && !r.cont && !r.lenIn && !r.cwv && !ign('armNoLen', q.id); }).map(function (q) { return 'armNoLen:' + q.id; }));
    Object.keys(MUT).forEach(function (rule) {
      var ids = Object.keys(MUT[rule]), names = ids.map(function (id) { var n = nodeById(id), q = pipeById(id); return n ? n.lbl : q ? pipeName(q) : id; });
      out.ignored.push({ lvl: 'warn', tag: 'Check', rule: rule, ref: ids[0], keys: ids.map(function (id) { return rule + ':' + id; }), html: esc(RULES[rule] || rule) + ': ' + esc(names.join(', ')) });
    });
    var lvlOrder = { fail: 0, warn: 1, ok: 2, info: 3 };
    C.sort(function (x, y) { return lvlOrder[x.lvl] - lvlOrder[y.lvl]; });

    var tot = 0, bd = 0, gi = 0, hasSewer = false;
    P.nodes.forEach(function (n) {
      if (n.t === 'SEWER') { hasSewer = true; tot += agg[n.id].dfu; }
      if (n.t === 'GI' && out.node[n.id]) gi += (out.node[n.id].rated || out.node[n.id].sug || 0);
    });
    if (!hasSewer) P.nodes.forEach(function (n) { if (!down[n.id] && n.t !== 'VTR' && n.t !== 'VJ') tot += agg[n.id].dfu; });
    P.pipes.forEach(function (p) { var r = out.pipe[p.id]; if (r && !r.vent && r.role === 'bd') bd = Math.max(bd, r.size); });
    out.tot = tot; out.bd = bd; out.gi = gi;
    return out;
  }

  // Ignored checks (per element) and checks turned off (per rule) live in the project file.
  function muteOf() { if (!P.mute || typeof P.mute !== 'object') P.mute = {}; if (!P.mute.keys || typeof P.mute.keys !== 'object') P.mute.keys = {}; if (!P.mute.rules || typeof P.mute.rules !== 'object') P.mute.rules = {}; return P.mute; }
  var RULES = {
    armLen: 'Trap arm too long (Table 1002.2)', armDfu: 'Trap arm over its DFU (Table 702.1(1))', armNoLen: 'Trap arm has no length',
    cap: 'Pipe over capacity (Table 703.2)', capWarn: 'Pipe at 70%+ of capacity', vlen: 'Vertical length limit (Table 703.2)',
    reduce: 'Pipe smaller than the one feeding it', forced: 'Forced size below required', ahj50: 'Discharge over 50 gpm (AHJ)',
    open: 'Pipe ends unconnected', outlet: 'Main outlet without a sewer', offFix: 'Fixture not on the main network', loose: 'Pipe not tied into the main',
    headon: 'Flows meet head-on', noSewer: 'Flow never reaches the sewer', against: 'Branch enters against the flow', tee90: '90° tie-in note (706.3)', noSewerInfo: 'No building sewer drawn',
    fvMin: 'Flush-valve WC path minimum', slope18: '1/8″/ft runs need AHJ approval', noVent: 'Trap with no vent drawn (1002.1)', ventUnder: 'Vent under its minimum size',
    gi: 'Grease interceptor sizing', giInfo: 'Grease interceptor notes', zeroDfu: 'Fixture or load adds 0 DFU', recDefault: 'Floor sink on flat design DFU',
    cwvWC: 'WC or urinal on a CWV system (910.7)', cwvVert: 'Vertical pipe in a CWV system (910.5)', cwvVent: 'CWV system without a vent (910.3)', cwvBranch: 'CWV branch over 15 ft unvented (910.3)', cwvGrease: 'Grease waste on a CWV system (App. B)', cwvAHJ: 'CWV needs AHJ approval (910.1/910.2)'
  };
  function fmtFtIn(inches) { var f = Math.floor(inches / 12), i = Math.round(inches - f * 12); return f + '′-' + i + '″'; }
  function fmtDfu(d) { return (Math.round((+d || 0) * 10) / 10).toString(); }
  function pipeName(p) {
    var a = nodeById(p.a), b = nodeById(p.b);
    if (p.k === 'v') return 'V ' + (a ? a.lbl : '?') + '→' + (b ? b.lbl : '?');
    var r = R && R.pipe && R.pipe[p.id];
    if (r && r.cont) { var ap = pipeById(r.armPipe), fa = ap && nodeById(ap.a); return (fa ? fa.lbl : '?') + ' arm (' + (a ? a.lbl : '?') + '→' + (b ? b.lbl : '?') + ')'; }
    if (r && r.role === 'arm') return (a ? a.lbl : '?') + ' arm';
    var pre = r ? ({ branch: 'B', stack: 'Stack', bd: 'BD' }[r.role] || 'B') : 'B';
    if (r && r.gw) pre = 'GW';
    return pre + ' ' + (a ? a.lbl : '?') + '→' + (b ? b.lbl : '?');
  }

  // ---------- Rendering ----------
  var svg, gWorld;
  function el(tag, attrs, parent) {
    var e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e); return e;
  }
  function txt(parent, attrs, s) { var t = el('text', attrs, parent); t.textContent = s; return t; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function utilColor(u) { return u > 1 ? '#ef4444' : u >= 0.7 ? '#f59e0b' : '#10b981'; }
  var WID = { 1.25: 3.5, 1.5: 4.5, 2: 5.5, 2.5: 6.5, 3: 7.5, 3.5: 8.5, 4: 9.5, 4.5: 10.2, 5: 11, 6: 12, 8: 14, 10: 15, 12: 16 };
  var ICON = { 'fa-toilet': '\uf7d8', 'fa-person': '\uf183', 'fa-sink': '\ue06d', 'fa-glass-water': '\ue4f4', 'fa-shower': '\uf2cc', 'fa-hands-bubbles': '\ue05e', 'fa-broom': '\uf51a', 'fa-circle-dot': '\uf192', 'fa-square': '\uf0c8', 'fa-martini-glass': '\uf57b', 'fa-recycle': '\uf1b8', 'fa-utensils': '\uf2e7' };

  function pathPts(p) {
    var a = nodeById(p.a), b = nodeById(p.b); if (!a || !b) return null;
    if (Array.isArray(p.v)) return [[a.x, a.y]].concat(p.v.map(function (q) { return [q[0], q[1]]; })).concat([[b.x, b.y]]);
    if (p.st || Math.abs(a.x - b.x) < 1 || Math.abs(a.y - b.y) < 1) return [[a.x, a.y], [b.x, b.y]];
    var vFirst = p.vf !== undefined && p.vf !== null ? !!p.vf : (isFix(a) || a.t === 'LOAD' || (p.k === 'v'));
    return vFirst ? [[a.x, a.y], [a.x, b.y], [b.x, b.y]] : [[a.x, a.y], [b.x, a.y], [b.x, b.y]];
  }
  function ext(n) {
    if (!n) return [0, 0];
    var e = isFix(n) ? [40, 27] : ({ GI: [42, 22], LOAD: [40, 22], VTR: [24, 11], SEWER: [34, 13] }[n.t] || [3, 3]);
    // When a fixture's name is drawn under its (small) symbol, keep pipe labels clear of it too.
    return [e[0] * GS, e[1] * GS + (isFix(n) && LBELOW ? LBELOW : 0)];
  }
  // Glyph scale: a fixture symbol is drawn 80 units wide at scale 1. On a scaled plan it is sized
  // to about 1.5 ft so it sits on the drawing; unscaled diagrams use half the original size too.
  var GS = 0.5, LS = 1, LBELOW = 0;
  var SYM_FT = 1.5;
  function glyphScale() { return P && P.scale && P.bg ? Math.max(0.06, Math.min(0.75, SYM_FT * P.scale / 80)) : 0.5; }
  function sclBy(g, x, y, k) { if (k !== 1) g.setAttribute('transform', 'translate(' + x + ' ' + y + ') scale(' + k + ') translate(' + (-x) + ' ' + (-y) + ')'); return g; }
  function scl(g, x, y) { return sclBy(g, x, y, GS); }
  // Text inside a scaled symbol: never smaller than minPx on screen.
  function TS(base, minPx) { return Math.max(base, minPx / (view.s * GS)); }
  // Best label spot on the longest leg once node boxes are trimmed off. room = usable length.
  function labelPos(pts, a, b, isVent) {
    var best = null;
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i].slice(), p1 = pts[i + 1].slice(), vert = Math.abs(p0[0] - p1[0]) < 1, ax = vert ? 1 : 0;
      var dir = p1[ax] > p0[ax] ? 1 : -1;
      if (i === 0) p0[ax] += dir * ext(a)[ax];
      if (i === pts.length - 2) p1[ax] -= dir * ext(b)[ax];
      var room = (p1[ax] - p0[ax]) * dir;
      var score = room * (vert && !isVent ? 0.9 : 1);
      if (!best || score > best.score) best = { x: (p0[0] + p1[0]) / 2, y: (p0[1] + p1[1]) / 2, vert: vert, room: room, score: score, top: Math.min(p0[1], p1[1]) };
    }
    if (isVent && best.vert && isFix(a)) best.y = best.top + 12 * GS;
    return best;
  }

  function render() {
    if (!svg) return;
    var w = svg.clientWidth || 800, h = svg.clientHeight || 500;
    svg.setAttribute('viewBox', view.x + ' ' + view.y + ' ' + (w / view.s) + ' ' + (h / view.s));
    while (gWorld.firstChild) gWorld.removeChild(gWorld.firstChild);
    GS = glyphScale();
    LS = Math.max(GS, 0.9 / view.s);          // pipe labels: shrink with the symbols but stay >= ~10 px text
    var bh = 54 * GS * view.s;                // fixture box height on screen
    LBELOW = bh < 46 ? (TS(10.5, 9) * GS + 3 / view.s) : 0;
    renderBg();
    var gp = el('g', {}, gWorld), gn = el('g', {}, gWorld), gl = el('g', {}, gWorld);
    var HIT = Math.max(18 * GS, 16 / view.s), SW = Math.max(GS * 1.4, 0.35);
    var order = P.pipes.slice().sort(function (x, y) { return (x.k === 'v' ? 0 : 1) - (y.k === 'v' ? 0 : 1) || (((R.pipe[y.id] || {}).dfu || 0) - ((R.pipe[x.id] || {}).dfu || 0)); });
    // Pipe labels keep a readable screen size, so skip any that would overlap one already drawn
    // (the selected pipe always shows; every value is also in the table and inspector).
    var placed = [];
    function roomFor(cx, cy, w2, h2, force) {
      var bx = { x0: cx - w2 / 2, y0: cy - h2 / 2, x1: cx + w2 / 2, y1: cy + h2 / 2 };
      if (!force && placed.some(function (q) { return bx.x0 < q.x1 && bx.x1 > q.x0 && bx.y0 < q.y1 && bx.y1 > q.y0; })) return false;
      placed.push(bx); return true;
    }
    order.forEach(function (p) {
      var pts = pathPts(p); if (!pts) return;
      var r = R.pipe[p.id] || {}, a = nodeById(p.a), bN = nodeById(p.b);
      var d = 'M' + pts.map(function (q) { return q[0] + ' ' + q[1]; }).join(' L');
      var isSel = sel && sel.kind === 'pipe' && sel.id === p.id;
      var isNew = routeNew && routeNew[p.id];
      if (isSel || isNew) el('path', { d: d, fill: 'none', stroke: isNew ? '#fde68a' : '#a5b4fc', 'stroke-width': ((p.k === 'v' ? 3 : (WID[r.size] || 6)) + 9) * SW, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.8 }, gp);
      var bad = r.under || (r.upMax > r.size);
      var fail = pipeFails(p, r), inMain = p.k === 'v' || pipeInMain(p.id), isHov = hoverPid === p.id;
      if (p.k === 'v') {
        el('path', { d: d, fill: 'none', stroke: bad ? '#ef4444' : VENT_COLOR, 'stroke-width': 2.5 * SW, 'stroke-dasharray': (7 * SW) + ' ' + (5 * SW), 'stroke-linecap': 'round' }, gp);
      } else {
        // colour by connection: on the main network = drain/grease hue; not tied in = orange
        var col = !inMain ? LOOSE_COLOR : r.gw ? GW_COLOR : r.cwv ? CWV_COLOR : r.role === 'arm' ? ARM_COLOR : DRAIN_COLOR;
        if (UI.showDfu && inMain && r.role !== 'arm' && !r.gw && !r.cwv) col = utilColor(r.util);
        var pw0 = (WID[r.size] || 6) * SW;
        if (r.cwv) {
          // combination waste & vent: wide pipe with a light core line (reads as "oversized, air on top")
          el('path', { d: d, fill: 'none', stroke: col, 'stroke-width': pw0 + 2 * SW, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'data-col': inMain ? 'main' : 'loose', 'data-pid': p.id, 'data-cwv': p.id }, gp);
          el('path', { d: d, fill: 'none', stroke: '#cffafe', 'stroke-width': Math.max(pw0 * 0.32, 0.6 * SW), 'stroke-dasharray': (6 * SW) + ' ' + (4 * SW), 'stroke-linecap': 'round', 'pointer-events': 'none' }, gp);
        } else el('path', { d: d, fill: 'none', stroke: col, 'stroke-width': pw0, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'data-col': inMain ? 'main' : 'loose', 'data-pid': p.id }, gp);
      }
      el('path', { d: d, fill: 'none', stroke: 'transparent', 'stroke-width': HIT, 'data-pipe': p.id, style: 'cursor:pointer' }, gp);
      if (p.k !== 'v' && r.o === 'H' && (isSel || isHov || r.flowBad || UI.showDfu)) flowArrows(pts, a, bN, gl, r.flowBad ? '#dc2626' : '#1e293b');
      var L = labelPos(pts, a, bN, p.k === 'v'), lp = [L.x, L.y, L.vert];
      if (p.k !== 'v' && !UI.showDfu) {
        // Minimal canvas: just the size, in a small pill that is also the info target.
        if (r.cont && !isSel) return;
        var st = (SL[r.size] || '') + (r.cwv ? ' CWV' : ''), pw = st.length * 6.2 + 10 + (fail ? 12 : 0), ph = 15;
        var fits = (L.room >= (L.vert ? ph + 4 : pw + 4) * LS) && roomFor(lp[0], lp[1], (pw + 3) * LS, (ph + 3) * LS, isSel);
        var gi = sclBy(el('g', { 'data-pipe': p.id, 'data-info': p.id, style: 'cursor:pointer' }, gl), lp[0], lp[1], LS);
        if (fits) {
          el('rect', { x: lp[0] - pw / 2, y: lp[1] - ph / 2, width: pw, height: ph, rx: 7.5, fill: '#fff', stroke: isSel ? '#4f46e5' : inMain ? '#cbd5e1' : LOOSE_COLOR, 'stroke-width': isSel ? 1.8 : 1.1 }, gi);
          txt(gi, { x: lp[0] - (fail ? 6 : 0), y: lp[1] + 3.8, 'font-size': 10.5, 'font-weight': 700, 'text-anchor': 'middle', fill: r.gw ? GW_COLOR : r.cwv ? CWV_COLOR : '#0f172a' }, st);
          if (fail) { el('circle', { cx: lp[0] + pw / 2 - 8, cy: lp[1], r: 5, fill: '#dc2626', 'data-fail': p.id }, gi); txt(gi, { x: lp[0] + pw / 2 - 8, y: lp[1] + 3, 'font-size': 8, 'font-weight': 800, 'text-anchor': 'middle', fill: '#fff' }, '!'); }
        } else {
          el('circle', { cx: lp[0], cy: lp[1], r: 4, fill: fail ? '#dc2626' : '#fff', stroke: fail ? '#fff' : inMain ? '#64748b' : LOOSE_COLOR, 'stroke-width': 1.4 }, gi);
        }
        return;
      }
      if (p.k === 'v') {
        if (!SL[r.size] || L.room < 22 * LS) return;
        txt(sclBy(el('g', {}, gl), lp[0], lp[1], LS), { x: lp[0] + (lp[2] ? 6 : 0), y: lp[1] + (lp[2] ? 4 : -6), 'font-size': 11, 'font-weight': 700, fill: '#047857', stroke: '#fff', 'stroke-width': 3, 'paint-order': 'stroke', 'text-anchor': lp[2] ? 'start' : 'middle', 'data-pipe': p.id }, SL[r.size]);
      } else {
        var s = (r.gw ? 'GW ' : '') + (r.cwv ? 'CWV ' : '') + fmtDfu(r.dfu) + ' DFU · ' + (SL[r.size] || '');
        var s2 = r.slope ? '@ ' + SLOPES[r.slope].frac + ' (' + SLOPES[r.slope].dec + ')' : '';
        var badge = r.design || r.forced;
        var tw = Math.max(s.length * 5.9 + 12 + (badge ? 14 : 0), s2.length * 4.9 + 12);
        var hh = s2 ? 30 : 20;
        if (r.cont) return; // continuation of an arm: the first piece carries the label
        var lenTxt = r.lenFt !== null && r.lenFt !== undefined && r.o === 'H' && P.scale ? fmtFtIn(Math.round(r.lenFt * 12)) : '';
        if (lenTxt) { s2 = (s2 ? s2 + ' · ' : '') + lenTxt; tw = Math.max(tw, s2.length * 4.9 + 12); }
        var need = (L.vert ? hh + 6 : tw + 6) * LS;
        if (L.room < need && !isSel) return;
        if (!roomFor(lp[0], lp[1], (tw + 4) * LS, (hh + 3) * LS, isSel)) return;
        var border = r.role === 'arm' ? ((r.armOK === false) ? '#ef4444' : '#94a3b8') : utilColor(r.util);
        if (bad) border = '#ef4444';
        var g = sclBy(el('g', { 'data-pipe': p.id, style: 'cursor:pointer' }, gl), lp[0], lp[1], LS);
        var y0 = s2 ? -5 : 0;
        el('rect', { x: lp[0] - tw / 2, y: lp[1] - hh / 2, width: tw, height: hh, rx: 10, fill: '#fff', stroke: border, 'stroke-width': 1.5 }, g);
        txt(g, { x: lp[0] - (badge ? 7 : 0), y: lp[1] + 4 + y0, 'font-size': 11, 'font-weight': 600, 'text-anchor': 'middle', fill: r.gw ? GW_COLOR : '#0f172a' }, s);
        if (s2) txt(g, { x: lp[0], y: lp[1] + 11, 'font-size': 9, 'font-weight': r.ahj ? 700 : 500, 'text-anchor': 'middle', fill: r.ahj ? '#b45309' : '#64748b' }, s2);
        if (badge) {
          el('circle', { cx: lp[0] + tw / 2 - 11, cy: lp[1] + y0, r: 6.5, fill: r.forced ? '#64748b' : '#4f46e5' }, g);
          txt(g, { x: lp[0] + tw / 2 - 11, y: lp[1] + 3 + y0, 'font-size': 8.5, 'font-weight': 700, 'text-anchor': 'middle', fill: '#fff' }, r.forced ? 'F' : 'D');
        }
      }
    });
    P.nodes.forEach(function (n) {
      var isSel = sel && sel.kind === 'node' && sel.id === n.id, isPend = pending === n.id;
      var g = scl(el('g', { 'data-node': n.id, style: 'cursor:pointer' }, gn), n.x, n.y);
      var offNet = isFix(n) && R.fixOff && R.fixOff[n.id];
      if (offNet) { g.setAttribute('opacity', '0.55'); g.setAttribute('data-off', '1'); }
      var stroke = isPend ? '#059669' : isSel ? '#4f46e5' : '#cbd5e1', sw = isSel || isPend ? 2.5 : 1.5;
      if (n.t !== 'J' && n.t !== 'VJ') {
        // Tap target: at least ~44 px on screen even when the drawn symbol is tiny.
        var he = isFix(n) ? [40, 27] : ({ GI: [42, 22], LOAD: [40, 22], VTR: [24, 11], SEWER: [34, 13] }[n.t] || [20, 20]);
        var hx = Math.max(he[0], 22 / (view.s * GS)), hy = Math.max(he[1], 22 / (view.s * GS));
        el('rect', { x: n.x - hx, y: n.y - hy, width: 2 * hx, height: 2 * hy, fill: 'transparent', 'class': 'hit' }, g);
      }
      if (isFix(n)) {
        var f = FX[n.t], big = !LBELOW;
        el('rect', { x: n.x - 40, y: n.y - 27, width: 80, height: 54, rx: 9, fill: '#fff', stroke: stroke, 'stroke-width': sw }, g);
        txt(g, { x: n.x, y: big ? n.y - 4 : n.y + 8, 'text-anchor': 'middle', 'font-size': big ? 16 : 24, fill: f.vol ? GW_COLOR : '#4f46e5', style: 'font-family:"Font Awesome 6 Free";font-weight:900' }, ICON[f.ic] || '\uf0c8');
        var halo = { stroke: '#fff', 'stroke-width': 3, 'paint-order': 'stroke', 'stroke-linejoin': 'round' };
        if (big) {
          txt(g, { x: n.x, y: n.y + 10, 'text-anchor': 'middle', 'font-size': TS(10.5, 9), 'font-weight': 600, fill: '#334155' }, n.lbl);
          var tr = trapOf(n), um = userMin(n);
          var sub = f.gpm ? ((n.p && n.p.gpm) || 0) + ' gpm · indirect' : f.rec ? ({ dfu: 'DFU typed', gpm: (+n.p.gpm) + ' gpm', drawn: 'indirect in', trap: SL[tr] + ' trap basis' })[recInfo(n).basis] : (tr ? SL[Math.max(tr, um)] + ' arm' : '');
          txt(g, { x: n.x, y: n.y + 21, 'text-anchor': 'middle', 'font-size': TS(9, 7.5), fill: um > tr ? '#4f46e5' : '#94a3b8', 'font-weight': um > tr ? 700 : 400 }, sub);
        } else {
          // Small symbol: name goes under the box with a halo so it reads over the plan.
          var lf = TS(10.5, 9);
          var a1 = { x: n.x, y: n.y + 27 + lf * 0.95, 'text-anchor': 'middle', 'font-size': lf, 'font-weight': 700, fill: '#334155' };
          for (var hk in halo) a1[hk] = hk === 'stroke-width' ? 3 * lf / 10.5 : halo[hk];
          txt(g, a1, n.lbl);
        }
        var dv = ownDfu(n), br = TS(11, 8.5);
        el('circle', { cx: n.x + 40, cy: n.y - 27, r: br, fill: '#4f46e5', stroke: '#fff', 'stroke-width': br * 0.12 }, g);
        txt(g, { x: n.x + 40, y: n.y - 27 + br * 0.36, 'text-anchor': 'middle', 'font-size': dv === null ? br * 0.72 : br * 0.95, 'font-weight': 700, fill: '#fff' }, dv === null ? 'AHJ' : fmtDfu(dv));
      } else if (n.t === 'J' || n.t === 'VJ') {
        el('circle', { cx: n.x, cy: n.y, r: Math.max(14, 12 / (view.s * GS)), fill: 'transparent' }, g);
        el('circle', { cx: n.x, cy: n.y, r: Math.max(isSel || isPend ? 7 : 4.5, (isSel || isPend ? 5 : 3) / (view.s * GS)), fill: n.t === 'VJ' ? VENT_COLOR : '#334155', stroke: isSel || isPend ? stroke : '#fff', 'stroke-width': 2 }, g);
      } else if (n.t === 'GI') {
        var rr = R.node[n.id] || {};
        el('rect', { x: n.x - 42, y: n.y - 22, width: 84, height: 44, rx: 8, fill: '#fdf6ee', stroke: isSel || isPend ? stroke : GW_COLOR, 'stroke-width': 2 }, g);
        txt(g, { x: n.x, y: n.y - 4, 'text-anchor': 'middle', 'font-size': TS(11, 8.5), 'font-weight': 700, fill: GW_COLOR }, n.lbl + ' · HGI');
        var gpm = rr.rated || rr.sug;
        txt(g, { x: n.x, y: n.y + 11 + Math.max(0, TS(10, 7.5) - 10), 'text-anchor': 'middle', 'font-size': TS(10, 7.5), fill: '#78350f' }, gpm && rr.gal ? gpm + ' gpm' + (rr.rated ? '' : ' (sugg.)') : 'sizing TBD');
      } else if (n.t === 'LOAD') {
        el('rect', { x: n.x - 40, y: n.y - 22, width: 80, height: 44, rx: 8, fill: '#fff', stroke: stroke, 'stroke-width': sw, 'stroke-dasharray': '4 3' }, g);
        txt(g, { x: n.x, y: n.y - 3, 'text-anchor': 'middle', 'font-size': TS(10.5, 8.5), 'font-weight': 600, fill: '#334155' }, n.lbl);
        txt(g, { x: n.x, y: n.y + 12 + Math.max(0, TS(10, 7.5) - 10), 'text-anchor': 'middle', 'font-size': TS(10, 7.5), fill: '#4f46e5' }, fmtDfu(+n.p.dfu || 0) + ' DFU');
      } else if (n.t === 'VTR') {
        el('rect', { x: n.x - 24, y: n.y - 11, width: 48, height: 22, rx: 6, fill: '#ecfdf5', stroke: isSel || isPend ? stroke : VENT_COLOR, 'stroke-width': 1.5 }, g);
        txt(g, { x: n.x, y: n.y + 4, 'text-anchor': 'middle', 'font-size': TS(10, 8), 'font-weight': 700, fill: '#047857' }, 'VTR');
      } else if (n.t === 'SEWER') {
        el('rect', { x: n.x - 34, y: n.y - 13, width: 68, height: 26, rx: 7, fill: '#f1f5f9', stroke: stroke, 'stroke-width': sw }, g);
        txt(g, { x: n.x, y: n.y + 4, 'text-anchor': 'middle', 'font-size': TS(10.5, 8), 'font-weight': 700, fill: '#334155' }, 'SEWER ▸');
      }
    });
    // open ends: red ring = flow goes nowhere, amber = main outlet waiting for the sewer, grey = upstream end
    P.nodes.forEach(function (n) {
      var st = R.open && R.open[n.id]; if (!st) return;
      var k = 1 / view.s, col = st === 'dead' ? '#dc2626' : st === 'outlet' ? '#d97706' : '#94a3b8', rr = (st === 'head' ? 5 : 7) * k;
      el('circle', { cx: n.x, cy: n.y, r: rr, fill: '#fff', stroke: col, 'stroke-width': (st === 'head' ? 1.6 : 2.6) * k, 'data-open': st, 'pointer-events': 'none' }, gl);
      if (st === 'dead') el('circle', { cx: n.x, cy: n.y, r: rr * 0.32, fill: col, 'pointer-events': 'none' }, gl);
    });
    P.nodes.forEach(function (n) {
      if (n.t !== 'J' || !n.p || !n.p.fit) return;
      var k = 1 / view.s, f = n.p.fit, t = f.type === 'wye' ? 'Y 45°' : f.type === 'tee90' ? 'CW 90°' : '⚠ ' + f.ang + '°';
      if (view.s * GS < 0.2 && !(sel && sel.id === n.id)) return;
      txt(gl, { x: n.x + 6 * k, y: n.y - 6 * k, 'font-size': 8 * k, 'font-weight': 700, fill: f.type === 'against' ? '#dc2626' : '#475569', stroke: '#fff', 'stroke-width': 3 * k, 'paint-order': 'stroke', 'pointer-events': 'none', 'data-fit': n.id }, t);
    });
    renderOverlay();
    renderSide();
  }
  var DRAIN_COLOR = '#1d4ed8', ARM_COLOR = '#64748b', LOOSE_COLOR = '#f97316', hoverPid = null;
  function pipeInMain(pid) { var N = R.net; return !!(N && N.main && N.comp[pid] === N.main.id); }
  // Red ! = a failing check on this pipe that has not been ignored or turned off.
  // One-tap floor sink size: trap 2″ / 3″ / 4″ (keys 2, 3, 4 with it selected).
  function fsSwitch(n) {
    var cur = trapOf(n), sizes = [2, 3, 4]; if (sizes.indexOf(cur) < 0) sizes.unshift(cur);
    return '<span class="inline-flex items-center gap-1 text-xs text-slate-600">Size <span class="inline-flex rounded-md border border-slate-200 overflow-hidden" data-fs-switch="' + n.id + '">' + sizes.map(function (t) { return '<button type="button" data-act="fsSize" data-fsnode="' + n.id + '" data-v="' + t + '" class="px-2.5 py-1 min-w-[40px] font-semibold ' + (t === cur ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700') + '">' + SL[t] + '</button>'; }).join('') + '</span></span>';
  }
  function setFsSize(id, t) { var n = nodeById(id); if (!n || !FX[n.t] || !FX[n.t].rec) return; t = +t; if (trapOf(n) === t) return; mutate(function () { n.p = n.p || {}; n.p.trapSel = t; }); toast(n.lbl + ': ' + SL[t] + ' floor sink, ' + fmtDfu(ownDfu(n)) + ' DFU.'); }
  function pipeFails(p, r) { return !!(R && R.failPid && R.failPid[p.id]); }
  function checksFor(id) { return (R.checks || []).filter(function (c) { return c.ref === id || c.keys.some(function (k) { return k.slice(k.indexOf(':') + 1) === id; }); }).filter(function (c) { return c.lvl !== 'ok'; }); }
  function ignBtns(c, small) {
    var k = encodeURIComponent(c.keys.join('|'));
    return '<span class="inline-flex gap-1 ml-1 align-middle whitespace-nowrap"><button type="button" data-ign="' + k + '" title="Ignore this warning for this item (saved in the .dwv)" class="text-[10px] px-1.5 py-0.5 rounded border border-slate-200 bg-white text-slate-500 hover:text-slate-800"><i class="fas fa-eye-slash mr-0.5"></i>Ignore</button>' + (small ? '' : '<button type="button" data-rule-off="' + c.rule + '" title="Turn this check off for the whole project (Sizing settings to turn it back on)" class="text-[10px] px-1.5 py-0.5 rounded border border-slate-200 bg-white text-slate-500 hover:text-slate-800"><i class="fas fa-ban mr-0.5"></i>Rule off</button>') + '</span>';
  }
  // Popover / tooltip text for one pipe segment.
  function pipeTip(pid, sticky) {
    var p = pipeById(pid), r = p && R.pipe[pid]; if (!p || !r) return '';
    var a = nodeById(p.a), b = nodeById(p.b), row = function (k, v) { return '<div class="flex justify-between gap-3"><span class="text-slate-500">' + k + '</span><span class="font-semibold text-right">' + v + '</span></div>'; };
    var h = '<div class="font-semibold text-slate-900 mb-1">' + esc(pipeName(p)) + '</div>';
    if (p.k === 'v') return h + row('Vent', SL[r.size]) + row('Serves', fmtDfu(r.dfu) + ' DFU');
    var meas = r.lenFt !== null && r.lenFt !== undefined ? fmtFtIn(Math.round(r.lenFt * 12)) : (p.len ? p.len + ' ft' : '—');
    h += row('Size', SL[r.size] + (r.cwv ? ' CWV (from ' + SL[r.conv] + ')' : '') + (r.design ? ' <span class="tag tag-design">Design</span>' : ''));
    h += row('DFU', (r.gw ? 'GW ' : '') + fmtDfu(r.dfu));
    if (r.capS) h += row('Capacity', Math.round((r.util || 0) * 100) + '% of ' + r.capS + (r.role === 'arm' ? ' (702.1(1))' : ' (703.2)'));
    h += row('Slope', r.slope ? SLOPES[r.slope].frac + ' (' + SLOPES[r.slope].dec + ')' + (r.ahj ? ' · AHJ' : '') : 'vertical');
    h += row('Run', (r.o === 'V' ? 'Vertical' : 'Horizontal') + ' · ' + (r.cwv ? 'combination waste & vent' : r.role === 'arm' ? 'trap arm' : r.role === 'bd' ? 'building drain' : r.role === 'stack' ? 'stack' : 'branch'));
    h += row('Length', meas + (r.lenIn ? ' · arm ' + fmtFtIn(r.lenIn) + '/' + fmtFtIn(r.armMax) : ''));
    h += row('Flow', esc(a ? a.lbl : '?') + ' → ' + esc(b ? b.lbl : '?'));
    var bc = bendCount(pathPts(p)); if (bc.n45 + bc.n90 + bc.other) h += row('Bends', bendText(bc));
    [a, b].forEach(function (n) { if (n && n.p && n.p.fit) h += row('Tie-in ' + esc(n.lbl), fitName(n.p.fit)); });
    if (!pipeInMain(pid)) h += '<div class="mt-1 text-orange-600 font-semibold">Not connected to the main network.</div>';
    if (sticky && a && FX[a.t] && FX[a.t].rec) h += '<div class="mt-1.5">' + esc(a.lbl) + ' ' + fsSwitch(a) + ' <span class="text-slate-500">' + fmtDfu(ownDfu(a)) + ' DFU</span></div>';
    var cs = checksFor(pid).filter(function (c) { return c.lvl === 'fail' || c.lvl === 'warn'; });
    cs.slice(0, 3).forEach(function (c) { h += '<div class="mt-1 ' + (c.lvl === 'fail' ? 'text-red-600' : 'text-amber-700') + '">' + c.html + (sticky ? ' ' + ignBtns(c, true) : '') + '</div>'; });
    var ni = (R.ignored || []).filter(function (c) { return c.ref === pid; }).length; if (ni) h += '<div class="mt-1 text-[10px] text-slate-400">' + ni + ' ignored warning' + (ni > 1 ? 's' : '') + ' on this pipe</div>';
    return h;
  }
  function showTip(pid, cx, cy, sticky) {
    var tip = $('dwvTip'); if (!tip) return;
    var h = pipeTip(pid, sticky); if (!h) { hideTip(); return; }
    tip.style.pointerEvents = sticky ? 'auto' : 'none';
    tip.innerHTML = h + (sticky ? '<div class="mt-1.5 text-[10px] text-slate-400">Tap elsewhere to close · full detail below</div>' : '');
    tip.classList.remove('hidden'); tip.setAttribute('data-tip', pid);
    // Fixed to the viewport above everything (the phone inspector sheet overlaps the canvas).
    if (tip.parentNode !== document.body) document.body.appendChild(tip);
    tip.style.position = 'fixed'; tip.style.zIndex = '80';
    var W = window.innerWidth, H = window.innerHeight, tw = tip.offsetWidth, th = tip.offsetHeight;
    var x = cx + 14, y = cy + 14;
    if (sticky) { x = cx - tw / 2; y = cy - th - 22; if (y < 6) y = cy + 26; } // tapped: sit above the finger, off the pipe's grips
    if (x + tw > W - 6) x = Math.max(6, sticky ? W - tw - 6 : cx - tw - 14);
    if (x < 6) x = 6;
    if (y + th > H - 6) y = Math.max(6, cy - th - 14);
    var ib = $('insp') && $('insp').getBoundingClientRect();
    if (sticky && ib && ib.height && y < ib.bottom && y + th > ib.top && x < ib.right && x + tw > ib.left) { y = ib.top - th - 6 >= 6 ? ib.top - th - 6 : Math.min(H - th - 6, ib.bottom + 6); }
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  function hideTip() { var tip = $('dwvTip'); if (tip) { tip.classList.add('hidden'); tip.removeAttribute('data-tip'); } }
  // Small downhill arrow on each horizontal leg, a third of the way from the upstream end.
  function flowArrows(pts, a, b, g, col) {
    var k = 1 / view.s, S = 5.5 * k;
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i], p1 = pts[i + 1], L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      if (L * view.s < 40) continue;
      var ux = (p1[0] - p0[0]) / L, uy = (p1[1] - p0[1]) / L, t = i === 0 && pts.length > 2 ? 0.5 : 0.3;
      var start = i === 0 ? ext(a)[Math.abs(ux) > Math.abs(uy) ? 0 : 1] : 0;
      var cx = p0[0] + ux * Math.max(start + 3 * S, L * t), cy = p0[1] + uy * Math.max(start + 3 * S, L * t);
      el('path', { d: 'M' + (cx + ux * S) + ' ' + (cy + uy * S) + ' L' + (cx - ux * S - uy * S * 0.8) + ' ' + (cy - uy * S + ux * S * 0.8) + ' L' + (cx - ux * S + uy * S * 0.8) + ' ' + (cy - uy * S - ux * S * 0.8) + ' Z', fill: col, stroke: '#fff', 'stroke-width': 1.2 * k, 'stroke-linejoin': 'round', 'pointer-events': 'none', 'data-arrow': '1' }, g);
    }
  }

  // ---------- Side panels ----------
  var TAGC = { 'Design value': 'tag tag-design', 'UPC': 'tag tag-upc', 'Design rule': 'tag tag-design', 'Check': 'tag tag-upc', 'AHJ approval': 'tag tag-ahj', 'Display': 'tag tag-upc' };
  function slopeCell(r) {
    if (!r.slope) return '<span class="text-slate-500">vert.</span>';
    var S = SLOPES[r.slope];
    return '<span class="' + (r.ahj ? 'text-amber-700 font-semibold' : 'text-slate-700') + '" title="' + esc(r.slopeWhy || '') + '">' + S.frac.replace('/ft', '') + '<span class="block text-[9px] font-normal text-slate-400">' + S.dec + (r.ahj ? ' · AHJ' : '') + '</span></span>';
  }
  function renderSide() {
    $('dwvTot').textContent = fmtDfu(R.tot);
    $('dwvBD').textContent = R.bd ? SL[R.bd] : '—';
    $('dwvGI').textContent = R.gi ? R.gi : '—';
    $('dwvIssues').textContent = R.fails;
    $('dwvIssues').className = 'text-xl font-bold ' + (R.fails ? 'text-red-600' : 'text-emerald-600');
    var fsb = $('fsSumBadge'); if (fsb) { fsb.textContent = R.fails || ''; fsb.classList.toggle('hidden', !R.fails); }
    var pill = $('dwvPill'); if (pill) pill.innerHTML = '<span>' + fmtDfu(R.tot) + ' DFU</span><span class="text-slate-300">|</span><span>BD ' + (R.bd ? SL[R.bd] : '—') + '</span><span class="text-slate-300">|</span><span class="' + (R.fails ? 'text-red-600' : 'text-emerald-600') + '"><i class="fas ' + (R.fails ? 'fa-circle-xmark' : 'fa-circle-check') + '"></i> ' + R.fails + '</span>';
    var rows = P.pipes.filter(function (p) { return p.k !== 'v'; }).map(function (p) { return { p: p, r: R.pipe[p.id] }; });
    rows.sort(function (x, y) { return ((x.r.role === 'arm') - (y.r.role === 'arm')) || (x.r.dfu - y.r.dfu); });
    var showArms = $('dwvShowArms') && $('dwvShowArms').checked;
    $('segRows').innerHTML = rows.filter(function (o) { return showArms || o.r.role !== 'arm'; }).map(function (o) {
      var r = o.r, col = r.role === 'arm' ? '#94a3b8' : (r.gw ? GW_COLOR : utilColor(r.util)), u = Math.round(Math.min(r.util, 1) * 100);
      var on = sel && sel.kind === 'pipe' && sel.id === o.p.id;
      return '<tr data-sel-pipe="' + o.p.id + '" class="border-t border-slate-100 cursor-pointer ' + (on ? 'bg-indigo-50' : 'hover:bg-slate-50') + '"><td class="py-1 pr-1 text-slate-700 break-words" title="' + esc(r.reasons.join('; ')) + '">' + esc(pipeName(o.p)) + '</td><td class="text-right">' + fmtDfu(r.dfu) + '</td><td class="text-right font-semibold whitespace-nowrap">' + SL[r.size] + (r.design ? '<sup class="text-indigo-600 text-[9px]">D</sup>' : '') + '</td><td class="text-center leading-tight">' + slopeCell(r) + '</td><td><div class="flex items-center gap-1"><div class="h-1.5 flex-1 rounded bg-slate-100 overflow-hidden"><div class="h-full" style="width:' + u + '%;background:' + col + '"></div></div><span class="text-[10px] text-slate-500 w-11 text-right">' + (r.lavCap && r.size === 1.5 ? r.dfu + 'L/8' : fmtDfu(r.dfu) + '/' + (r.capS == null ? '—' : r.capS)) + '</span></div></td></tr>';
    }).join('') || '<tr><td colspan="5" class="py-3 text-slate-400">No pipes yet. Use the Pipe tool to connect fixtures toward the sewer.</td></tr>';
    $('slopeNote').innerHTML = 'Slopes are picked by the sizer: 1/4″/ft (0.0208) is the UPC 708.0 minimum. 4″ and larger drop to 1/8″/ft (0.0104) only when the load fits 80% of the Table 703.2 limit (note 5); that needs AHJ approval (708.0). Grease lines stay at 1/4″/ft (Table 1014.2.1 note 2). D = upsized by your design rules.';
    var ic = { ok: '<i class="fas fa-circle-check text-emerald-600 mt-0.5"></i>', warn: '<i class="fas fa-triangle-exclamation text-amber-500 mt-0.5"></i>', fail: '<i class="fas fa-circle-xmark text-red-500 mt-0.5"></i>', info: '<i class="fas fa-circle-info text-slate-400 mt-0.5"></i>' };
    var cl = { ok: '', warn: 'text-amber-800', fail: 'text-red-700', info: 'text-slate-500' };
    var nIg = (R.ignored || []).length;
    $('checks').innerHTML = (R.checks.map(function (c) {
      return '<li class="flex gap-2 ' + cl[c.lvl] + (c.ref ? ' cursor-pointer' : '') + '"' + (c.ref ? ' data-ref="' + c.ref + '"' : '') + ' data-chk="' + c.rule + '">' + ic[c.lvl] + '<span class="flex-1">' + c.html + ' <span class="' + TAGC[c.tag] + '">' + c.tag + '</span>' + (c.lvl !== 'ok' && c.rule !== 'ok' ? ignBtns(c) : '') + '</span></li>';
    }).join('') || '<li class="text-slate-400">Add fixtures to see code checks.</li>') +
      (nIg || R.offN ? '<li class="pt-1 border-t border-slate-100 flex flex-wrap gap-2 items-center text-slate-500">' + (nIg ? '<button type="button" data-act="toggleIgn" class="text-[11px] underline">' + (UI.showIgn ? 'Hide' : 'Show') + ' ' + nIg + ' ignored</button>' : '') + (R.offN ? '<span class="text-[11px]">' + Object.keys(muteOf().rules).length + ' check rule' + (Object.keys(muteOf().rules).length > 1 ? 's' : '') + ' off (Sizing settings)</span>' : '') + '</li>' : '') +
      (UI.showIgn ? (R.ignored || []).map(function (c) { return '<li class="flex gap-2 text-slate-400 line-through decoration-slate-300" data-ignored="1">' + ic[c.lvl] + '<span class="flex-1">' + c.html + ' <button type="button" data-unign="' + encodeURIComponent(c.keys.join('|')) + '" class="no-underline text-[10px] px-1.5 py-0.5 rounded border border-slate-200 bg-white text-indigo-600" style="text-decoration:none"><i class="fas fa-rotate-left mr-0.5"></i>Restore</button></span></li>'; }).join('') : '');
    renderInspector();
    if (document.activeElement !== $('dwvName')) $('dwvName').value = P.name;
    $('dwvDirty').textContent = dirty ? '● Unsaved changes (draft kept on this device)' : (fileName ? 'Saved · ' + fileName : 'Draft autosaved on this device');
    document.querySelectorAll('[data-occ]').forEach(function (b) { var on = b.getAttribute('data-occ') === P.occ; b.className = 'px-2 py-1 ' + (b.getAttribute('data-occ') === 'assembly' ? 'border-l border-slate-200 ' : '') + (on ? 'bg-indigo-600 text-white' : 'text-slate-600 bg-white'); });
  }

  function sizeOptions(cur, from, allowNone) {
    var o = allowNone ? '<option value="">Auto</option>' : '';
    SIZES.forEach(function (s) { if (s >= (from || 0)) o += '<option value="' + s + '"' + (+cur === s ? ' selected' : '') + '>' + SL[s] + '</option>'; });
    return o;
  }
  function inp(label, html) { return '<label class="text-xs text-slate-600 inline-flex items-center gap-1">' + label + ' ' + html + '</label>'; }
  var IC = 'text-xs border border-slate-200 rounded px-1.5 py-1 bg-white';

  function renderInspector() {
    var box = $('insp'); if (!box) return;
    if (box.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') return; // don't clobber typing
    var h = '';
    if (!sel) {
      var hint = {
        select: 'Tap a fixture or pipe to edit it. Drag a node to move it, or drag empty space to pan. Pinch or scroll to zoom.',
        pipe: trace.pts.length ? 'Tap the next bend. Ends by itself on a fixture, junction or pipe (it ties in there). Finish: Enter, double-click, tap the last point again or Finish. Esc/Backspace removes the last point.' : 'Pipe: draw the MAIN first, point to point in the direction of flow (toward the sewer). Then start at each fixture and draw its BRANCH with 45°/90° bends, ending on the main anywhere. Snaps 90/45°' + (UI.ortho === false ? ' (off)' : '') + ', endpoints, pipes; Shift = free.',
        vent: trace.pts.length ? 'Tap the next point. End on a VTR or vent, or finish to drop a vent junction.' : 'Vent: start at a fixture or junction and draw up toward a VTR, point to point.',
        'delete': 'Tap a node or pipe to delete it.'
      }[tool];
      var btns = '';
      if (isDrawTool() && trace.pts.length) btns = '<button data-act="finishTrace" class="text-xs bg-indigo-600 text-white rounded px-2.5 py-1"><i class="fas fa-check mr-1"></i>Finish</button><button data-act="popVertex" class="text-xs border border-slate-200 bg-white rounded px-2.5 py-1"><i class="fas fa-delete-left mr-1"></i>Undo point</button><button data-act="cancelTrace" class="text-xs border border-slate-200 bg-white rounded px-2.5 py-1">Cancel</button>';
      if (calib) hint = calib.pts.length ? 'Calibrate: tap the second point.' : 'Calibrate: tap the first point of a dimension you know.';
      if (armed !== null) { hint = 'Stamp: tap the canvas to place ' + PALETTE[armed].name + '. Keep tapping to place more.'; btns = '<button data-act="stopStamp" class="text-xs border border-slate-200 bg-white rounded px-2.5 py-1"><i class="fas fa-stop mr-1"></i>Stop (Esc)</button>'; }
      box.innerHTML = '<span class="text-xs text-slate-500 flex-1 min-w-[200px]"><i class="fas fa-circle-info mr-1"></i>' + hint + '</span>' + (btns ? '<span class="flex gap-2">' + btns + '</span>' : '');
      layoutFs(); return;
    }
    if (sel.kind === 'node') {
      var n = nodeById(sel.id); if (!n) { sel = null; return renderInspector(); }
      var f = FX[n.t], sp = SPECIAL[n.t];
      h += inp('Label', '<input data-f="lbl" value="' + esc(n.lbl) + '" class="' + IC + ' w-20 font-semibold">');
      if (f) {
        var same = Object.keys(FX).filter(function (k) { return FX[k].g === f.g; });
        h += inp('Type', '<select data-f="t" class="' + IC + ' max-w-[220px]">' + same.map(function (k) { return '<option value="' + k + '"' + (k === n.t ? ' selected' : '') + '>' + FX[k].n + '</option>'; }).join('') + '</select>');
        if (f.wc) h += inp('Mount', '<select data-f="p.mount" class="' + IC + '"><option' + (n.p.mount !== 'Wall-hung' ? ' selected' : '') + '>Floor</option><option' + (n.p.mount === 'Wall-hung' ? ' selected' : '') + '>Wall-hung</option></select>');
        if (f.gpm) h += inp('Rated gpm', '<input data-f="p.gpm" type="number" inputmode="decimal" min="0" step="0.5" value="' + esc(n.p.gpm || 0) + '" class="' + IC + ' w-16">');
        if (f.rec) {
          h += inp('gpm override', '<input data-f="p.gpm" type="number" inputmode="decimal" min="0" step="0.5" value="' + esc(+n.p.gpm ? n.p.gpm : '') + '" placeholder="—" class="' + IC + ' w-16" title="Optional: rated discharge of what drains into it. Replaces the flat DFU with the Table 702.2 value.">');
          h += inp('DFU override', '<input data-f="p.dfuOv" type="number" inputmode="decimal" min="0" step="0.5" value="' + esc(n.p.dfuOv === undefined || n.p.dfuOv === null ? '' : n.p.dfuOv) + '" placeholder="auto" class="' + IC + ' w-14">');
        }
        if (f.rec) h += fsSwitch(n);
        if (f.vol) {
          h += inp('Compartments', '<input data-f="p.n" type="number" min="0" step="1" value="' + esc(n.p.n || 0) + '" class="' + IC + ' w-12">');
          h += inp('L×W×D (in)', '<input data-f="p.L" type="number" min="0" value="' + esc(n.p.L || 0) + '" class="' + IC + ' w-12">×<input data-f="p.W" type="number" min="0" value="' + esc(n.p.W || 0) + '" class="' + IC + ' w-12">×<input data-f="p.D" type="number" min="0" value="' + esc(n.p.D || 0) + '" class="' + IC + ' w-12">');
        }
        var d = ownDfu(n), tr = trapOf(n), um = userMin(n);
        h += '<span class="text-xs text-slate-600">DFU <b class="text-slate-900">' + (d === null ? 'AHJ (>50 gpm)' : fmtDfu(d)) + '</b> <span class="text-slate-400">' + (f.rec ? '' : P.occ) + '</span></span>';
        if (f.rec) { var ri = recInfo(n); h += '<span class="text-[11px] w-full ' + (ri.basis === 'flat' ? 'text-indigo-700' : 'text-slate-500') + '" data-rec-basis="' + ri.basis + '"><i class="fas fa-circle-info mr-1"></i>' + esc(ri.why) + (ri.basis === 'flat' ? ' <span class="tag tag-design">Design value</span>' : ri.basis === 'gpm' ? ' <span class="tag tag-upc">UPC</span>' : '') + '</span>'; }
        else if (d === 0) h += '<span class="text-[11px] w-full text-amber-700" data-zero-dfu="1"><i class="fas fa-triangle-exclamation mr-1"></i>This fixture adds 0 DFU' + (f.gpm ? ': enter its rated gpm (Table 702.2).' : n.t === 'fd_em' ? ' (Table 702.1 value for an emergency floor drain).' : '.') + '</span>';
        var onCwv = downOf(n.id) && R.pipe[downOf(n.id).id] && R.pipe[downOf(n.id).id].cwv;
        if (onCwv) h += '<span class="text-[11px] w-full text-cyan-800"><i class="fas fa-wind mr-1"></i>On a combination waste & vent run (UPC 910): trap is 2 pipe sizes over normal (' + SL[R.pipe[downOf(n.id).id].size] + '); trap-arm length and separate trap vent checks are skipped.</span>';
        if (tr) h += '<span class="text-xs text-slate-600">Arm <b class="text-slate-900">' + SL[Math.max(tr, um)] + '</b> ' + (um > tr ? '<span class="tag tag-design">Design rule</span> <span class="text-slate-400">code ' + SL[tr] + '</span>' : '<span class="tag tag-upc">UPC</span>') + '</span>';
        h += '<span class="text-[11px] text-slate-400 w-full">Table 702.1 row: ' + esc(f.row) + '</span>';
      } else if (n.t === 'GI') {
        var rr = R.node[n.id] || {};
        h += inp('Rated gpm', '<input data-f="p.rated" type="number" min="0" step="1" value="' + esc(n.p.rated || '') + '" placeholder="' + (rr.sug || '') + '" class="' + IC + ' w-16">');
        h += '<span class="text-xs text-slate-600">Fixture volume <b>' + (rr.gal || 0).toFixed(1) + ' gal</b> · ' + (rr.per || 2) + '-min load <b>' + (rr.load || 0).toFixed(1) + ' gpm</b>' + (rr.row ? ' · Table 1014.2.1, ' + SL[rr.inSize] + ' inlet: <b>' + rr.sug + ' gpm</b>' : '') + '</span>';
        h += '<span class="text-[11px] text-slate-400 w-full">Hydromechanical only (Table 1014.2.1 and Example 1014.2.1). Gravity interceptor sizing is not built. Enter compartment sizes on each grease sink.</span>';
      } else if (n.t === 'LOAD') {
        h += inp('DFU', '<input data-f="p.dfu" type="number" min="0" step="0.5" value="' + esc(n.p.dfu || 0) + '" class="' + IC + ' w-16">');
        h += inp('Min drain', '<select data-f="p.min" class="' + IC + '">' + sizeOptions(n.p.min, 0, true) + '</select>');
        h += '<span class="text-[11px] text-slate-400 w-full">For equipment or groups not in Table 702.1. Example: continuous flow is 2 DFU per gpm (702.3).</span>';
      } else {
        h += '<span class="text-xs text-slate-500">' + sp.n + (R.agg[n.id] && n.t !== 'VJ' && n.t !== 'VTR' ? ' · carries ' + fmtDfu(R.agg[n.id].dfu) + ' DFU' : '') + '</span>';
        if (n.p && n.p.fit) h += '<span class="text-xs ' + (n.p.fit.type === 'against' ? 'text-red-600' : 'text-slate-600') + '">Tie-in: <b>' + fitName(n.p.fit) + '</b> · branch meets the main at ' + n.p.fit.ang + '°</span>';
      }
    } else {
      var p = pipeById(sel.id); if (!p) { sel = null; return renderInspector(); }
      var r = R.pipe[p.id];
      h += '<span class="font-semibold text-slate-800 text-sm">' + esc(pipeName(p)) + '</span>';
      if (p.k === 'v') {
        h += '<span class="text-xs text-slate-600">Vent serving <b>' + fmtDfu(r.dfu) + ' DFU</b>: <b>' + SL[r.size] + '</b>. From the 703.2 vent column, at least 1¼″ and at least ½ the drain' + (r.half ? ' (' + r.half + '″)' : '') + '.</span>';
        h += inp('Force size', '<select data-f="force" class="' + IC + '">' + sizeOptions(p.force, 1.25, true) + '</select>');
      } else {
        if (r.role !== 'arm') h += inp('Role', '<select data-f="role" class="' + IC + '">' + [['auto', 'Auto'], ['branch', 'Branch (H)'], ['stack', 'Stack (V)'], ['bd', 'Building drain (H)']].map(function (o) { return '<option value="' + o[0] + '"' + ((p.role || 'auto') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>');
        var meas = P.scale && r.role !== 'stack' ? geomLen(p) / P.scale : null;
        h += inp(r.role === 'arm' ? (r.cont ? 'Piece length (ft)' : 'Arm piece (ft)') : 'Length (ft)', '<input data-f="len" type="number" inputmode="decimal" min="0" step="0.25" value="' + esc(p.len || '') + '" placeholder="' + (meas !== null ? (Math.round(meas * 100) / 100) : '') + '" class="' + IC + ' w-20">');
        if (meas !== null) h += '<span class="text-[11px] ' + (p.len ? 'text-amber-700' : 'text-slate-500') + '">' + (p.len ? 'Typed value overrides the plan (' + fmtFtIn(Math.round(meas * 12)) + '). Clear it to use the plan.' : 'Measured on plan: <b>' + fmtFtIn(Math.round(meas * 12)) + '</b>') + '</span>';
        if (r.role !== 'arm') h += '<label class="text-xs text-slate-600 inline-flex items-center gap-1"><input type="checkbox" data-f="ug"' + (p.ug ? ' checked' : '') + '> Underground</label>';
        h += '<span class="inline-flex items-center gap-1"><label class="text-xs text-cyan-800 inline-flex items-center gap-1 font-medium" title="Combination waste & vent (UPC 910): horizontal waste pipe oversized 2 pipe sizes so it also vents the traps on it. AHJ approval first."><input type="checkbox" data-f="cwv"' + (p.cwv ? ' checked' : '') + '> CWV</label><button data-act="cwvRun" class="text-[11px] text-cyan-800 underline px-1" title="' + (p.cwv ? 'Clear combination waste & vent on this pipe and everything upstream' : 'Mark this pipe and every drain pipe upstream of it as combination waste & vent') + '">' + (p.cwv ? 'clear upstream' : '+ upstream') + '</button></span>';
        h += inp('Force size', '<select data-f="force" class="' + IC + '">' + sizeOptions(p.force, 1.25, true) + '</select>');
        if (r.slope) h += '<span class="text-xs text-slate-600">Slope <b class="' + (r.ahj ? 'text-amber-700' : 'text-slate-900') + '">' + SLOPES[r.slope].frac + ' (' + SLOPES[r.slope].dec + ')</b> ' + (r.ahj ? '<span class="tag tag-ahj">AHJ approval</span>' : '<span class="tag tag-upc">UPC</span>') + '</span>';
        else h += '<span class="text-xs text-slate-600">Vertical (no slope)</span>';
        h += '<span class="text-xs text-slate-600"><b class="text-slate-900">' + fmtDfu(r.dfu) + ' DFU → ' + SL[r.size] + '</b> ' + (r.design ? '<span class="tag tag-design">Design rule</span>' : '<span class="tag tag-upc">UPC</span>') + '</span>';
        h += '<span class="text-[11px] text-slate-500 w-full">' + esc(r.reasons.concat(r.slopeWhy ? [r.slopeWhy] : []).join(' · ')) + (r.lenIn ? ' · arm ' + fmtFtIn(r.lenIn) + ' of ' + fmtFtIn(r.armMax) + ' max' : '') + '</span>';
      }
      var bc = bendCount(pathPts(p)), fa = nodeById(p.a), fb = nodeById(p.b);
      h += '<span class="text-xs text-slate-600"><i class="fas fa-arrow-right-long text-slate-400 mr-1"></i>Flow <b>' + esc(fa ? fa.lbl : '?') + ' → ' + esc(fb ? fb.lbl : '?') + '</b>' + (bc.n45 + bc.n90 + bc.other ? ' · ' + bendText(bc) : '') + '</span>';
      if (p.k !== 'v') h += '<label class="text-xs text-slate-600 inline-flex items-center gap-1" title="The main network is the one with the building sewer; without a sewer, the one you mark here (else the longest)."><input type="checkbox" data-f="main"' + (pipeInMain(p.id) && R.net && R.net.main && R.net.main.main ? ' checked' : '') + '> Mark as main</label><span class="text-[11px] ' + (pipeInMain(p.id) ? 'text-blue-700' : 'text-orange-600 font-semibold') + '">' + (pipeInMain(p.id) ? 'On the main network' : 'Not tied into the main') + '</span>';
      h += '<button data-act="flip" class="text-xs border border-slate-200 bg-white rounded px-2 py-1" title="Reverse the flow of this segment and its run"><i class="fas fa-right-left mr-1"></i>Flip flow</button>';
    }
    var mine = checksFor(sel.id).filter(function (c) { return c.lvl === 'fail' || c.lvl === 'warn'; });
    if (mine.length && window.innerWidth >= 768) h += '<div class="w-full flex flex-col gap-1" data-insp-checks="1">' + mine.slice(0, 4).map(function (c) { return '<div class="text-[11px] ' + (c.lvl === 'fail' ? 'text-red-700' : 'text-amber-800') + '"><i class="fas ' + (c.lvl === 'fail' ? 'fa-circle-xmark' : 'fa-triangle-exclamation') + ' mr-1"></i>' + c.html + ignBtns(c, true) + '</div>'; }).join('') + '</div>';
    h += '<button data-act="del" class="ml-auto text-xs text-red-600 border border-red-200 bg-white rounded px-2 py-1"><i class="fas fa-trash-can mr-1"></i>Delete</button>';
    box.innerHTML = h;
    layoutFs();
  }

  function onInspectorChange(e) {
    var t = e.target, f = t.getAttribute('data-f'); if (!f || !sel) return;
    var obj = sel.kind === 'node' ? nodeById(sel.id) : pipeById(sel.id); if (!obj) return;
    var v = t.type === 'checkbox' ? t.checked : t.value;
    if (document.activeElement === t && t.tagName === 'INPUT') t.blur();
    mutate(function () {
      if (f === 'p.dfuOv') { obj.p = obj.p || {}; if (v === '' || v === null) delete obj.p.dfuOv; else obj.p.dfuOv = Math.max(0, +v || 0); }
      else if (f.indexOf('p.') === 0) { obj.p = obj.p || {}; obj.p[f.slice(2)] = v; }
      else if (f === 't') { obj.t = v; }
      else if (f === 'force') { obj.force = v ? +v : null; }
      else if (f === 'lbl') { obj.lbl = String(v).trim() || obj.lbl; }
      else if (f === 'cwv') { if (v) obj.cwv = 1; else delete obj.cwv; }
      else if (f === 'main') { var cm = networks().comp; P.pipes.forEach(function (q) { if (q.k === 'v') return; if (cm[q.id] === cm[obj.id]) { if (v) q.main = 1; else delete q.main; } else if (v) delete q.main; }); }
      else obj[f] = v;
    });
  }

  // ---------- Settings panel ----------
  function renderSettings() {
    var S = P.settings, h = '';
    var keys = Object.keys(FX).filter(function (k) { return FX[k].trap; });
    $('minRows').innerHTML = keys.map(function (k) {
      var f = FX[k], um = +S.mins[k] || 0, design = um > f.trap;
      return '<tr class="border-t border-slate-100"><td class="px-2 py-1 text-slate-700">' + f.n + '</td><td class="px-1 py-1 text-center text-slate-600">' + SL[f.trap] + '</td><td class="px-1 py-1 text-center"><select data-min="' + k + '" class="text-xs border ' + (design ? 'border-indigo-300 bg-indigo-50 font-semibold' : 'border-slate-200 bg-white') + ' rounded px-1 py-0.5">' + SIZES.filter(function (s) { return s >= f.trap && s <= 6; }).map(function (s) { return '<option value="' + s + '"' + ((um > f.trap ? um : f.trap) === s ? ' selected' : '') + '>' + SL[s] + '</option>'; }).join('') + '</select></td><td class="px-2 py-1 text-right"><span class="' + (design ? 'tag tag-design' : 'tag tag-upc') + '">' + (design ? 'Design rule' : 'UPC') + '</span></td></tr>';
    }).join('');
    function sw(key, on) { return '<span class="sw' + (on ? ' on' : '') + '" data-sw="' + key + '" role="switch" aria-checked="' + (on ? 'true' : 'false') + '" tabindex="0"></span>'; }
    function row(swh, title, tag, desc, extra) {
      return '<div class="flex items-start gap-3">' + swh + '<div class="flex-1"><div class="font-medium text-slate-800">' + title + ' <span class="' + (TAGC[tag] || 'tag tag-design') + '">' + tag + '</span></div><div class="text-slate-500">' + desc + '</div>' + (extra || '') + '</div></div>';
    }
    var fixed = '<span class="w-[34px] flex-none text-center text-slate-300"><i class="fas fa-sliders"></i></span>';
    h += row(sw('showDfu', !!UI.showDfu), 'Show DFU labels on the canvas', 'Display', 'Off: each pipe shows only its size; hover or tap the size for DFU, slope, length, flow and checks. On: full labels, utilisation colours and flow arrows on every pipe. Saved on this device.');
    h += row(sw('carryDown', S.carryDown), 'Carry fixture minimums downstream', 'Design rule', 'No pipe downstream of a fixture gets smaller than that fixture\'s minimum. Example: a 4″ flush-valve WC keeps its whole path at 4″.');
    h += row(sw('noReduce', S.noReduce), 'Never reduce size downstream', 'Design rule', 'Each pipe is at least as big as the largest pipe feeding it. With this off, a reduction is still flagged.');
    h += row(sw('minBD', S.minBD.on), 'Minimum building drain', 'Design rule', 'Applies to pipes with the Building drain role.', '<select data-set="minBD" class="mt-1 text-xs border border-slate-200 rounded px-1 py-0.5">' + sizeOptions(S.minBD.size, 2) + '</select>');
    h += row(sw('minUG', S.minUG.on), 'Minimum underground / below slab', 'Design rule', 'Applies to pipes marked Underground in the inspector. Check your local amendments for any below-slab minimum.', '<select data-set="minUG" class="mt-1 text-xs border border-slate-200 rounded px-1 py-0.5">' + sizeOptions(S.minUG.size, 1.25) + '</select>');
    h += row(sw('gwFlow', S.gwFlow), 'Size grease line into interceptor by flow', 'Design rule', 'Upsize the GW pipe entering an interceptor until its Table 1014.2.1 full-pipe flow covers the fixture load.');
    h += row(sw('allow18', S.allow18), 'Use 1/8″/ft on 4″ and larger when it fits', 'AHJ approval', 'UPC 708.0 sets 1/4″/ft (2%) as the minimum. Pipe 4″ and larger may run at 1/8″/ft (1%) where 1/4″ is impractical and the AHJ approves first. The sizer picks 1/8″ only when the load fits 80% of the 703.2 limit (note 5). Grease lines into an interceptor stay at 1/4″. Off: every horizontal pipe at 1/4″/ft.');
    h += row(sw('autoArm', S.autoArm), 'Upsize trap arm when it runs long', 'Design rule', 'If an arm runs past the Table 1002.2 length for its size, step it up to the size that allows that length.');
    h += row(fixed, 'Max WCs on 3″', +S.maxWC3 < 5 ? 'Design rule' : 'UPC', 'UPC 703.2 note 4 allows 5. Some local amendments allow fewer.', '<select data-set="maxWC3" class="mt-1 text-xs border border-slate-200 rounded px-1 py-0.5">' + [5, 4, 3, 2].map(function (v) { return '<option value="' + v + '"' + (+S.maxWC3 === v ? ' selected' : '') + '>' + v + '</option>'; }).join('') + '</select>');
    h += row(fixed, 'Grease drainage period', 'UPC', 'Example 1014.2.1 uses a 1-minute or 2-minute period for hydromechanical interceptors.', '<select data-set="period" class="mt-1 text-xs border border-slate-200 rounded px-1 py-0.5"><option value="1"' + (+S.period === 1 ? ' selected' : '') + '>1 minute</option><option value="2"' + (+S.period === 2 ? ' selected' : '') + '>2 minutes</option></select>');
    h += row(fixed, 'Occupancy column', 'UPC', 'The Table 702.1 DFU column. Commercial work only.', '<div class="mt-1 inline-flex rounded-md border border-slate-200 overflow-hidden text-[11px] font-medium"><button type="button" data-occ="public" class="px-2 py-1">Public</button><button type="button" data-occ="assembly" class="px-2 py-1 border-l border-slate-200">Assembly</button></div>');
    var MU = muteOf(), offK = Object.keys(RULES).filter(function (k) { return MU.rules[k]; }), nIgn = Object.keys(MU.keys).length;
    var fsd = S.fsDfu || {};
    h += row(fixed, 'Floor sink flat DFU by size', 'Design value', 'UPC Table 702.1 lists indirect waste receptors with no DFU number (note 1: size on what drains in, Table 702.2). These flat values are yours; defaults are the Table 702.1(1) maximum for each trap size (702.1: units based on trap size). A gpm override on a floor sink replaces them.', '<div class="mt-1 flex flex-wrap gap-2">' + [2, 3, 4].map(function (t) { return '<label class="inline-flex items-center gap-1 text-[11px]">' + SL[t] + ' <input data-fsdfu="' + t + '" type="number" min="0" step="0.5" value="' + esc(fsd[t] !== undefined ? fsd[t] : T7021_1[t]) + '" class="w-14 text-xs border border-slate-200 rounded px-1 py-0.5"> DFU</label>'; }).join('') + '</div>');
    h += '<div class="pt-2 border-t border-slate-100"><div class="font-medium text-slate-800">Code checks for this project <span class="tag tag-upc">Check</span></div><div class="text-slate-500 mb-1">Turn a check off for the whole project (saved in the .dwv). Single warnings can be ignored from the Code checks list instead.' + (nIgn ? ' ' + nIgn + ' item warning' + (nIgn > 1 ? 's' : '') + ' ignored. <button type="button" data-act="unignAll" class="underline text-indigo-600">Restore all</button>' : '') + '</div><div class="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">' + Object.keys(RULES).map(function (k) { return '<label class="inline-flex items-center gap-1.5 text-[11px] ' + (MU.rules[k] ? 'text-slate-400 line-through' : 'text-slate-700') + '"><input type="checkbox" data-rule="' + k + '"' + (MU.rules[k] ? '' : ' checked') + '> ' + RULES[k] + '</label>'; }).join('') + '</div></div>';
    $('sysRules').innerHTML = h;
    if (svg && P) { R = compute(); renderSide(); }
  }
  function onSettings(e) {
    var t = e.target, S = P.settings;
    var k = t.getAttribute('data-min');
    if (k) { mutate(function () { var v = +t.value; if (v <= FX[k].trap) delete S.mins[k]; else S.mins[k] = v; }); renderSettings(); renderPalette(); return; }
    var fz = t.getAttribute('data-fsdfu');
    if (fz) { mutate(function () { S.fsDfu = S.fsDfu || {}; var v = t.value; if (v === '' || !isFinite(+v)) delete S.fsDfu[fz]; else S.fsDfu[fz] = Math.max(0, +v); }); renderSettings(); renderPalette(); return; }
    var s = t.getAttribute('data-set');
    if (s) { mutate(function () { if (s === 'minBD' || s === 'minUG') S[s].size = +t.value; else S[s] = +t.value; }); renderSettings(); }
  }
  function onSettingsClick(e) {
    var swEl = e.target.closest('[data-sw]');
    var ru = e.target.closest('[data-rule]');
    if (ru) { var rk = ru.getAttribute('data-rule'), on = ru.checked; mutate(function () { var M = muteOf(); if (on) delete M.rules[rk]; else M.rules[rk] = 1; }); renderSettings(); return; }
    if (swEl && swEl.getAttribute('data-sw') === 'showDfu') { UI.showDfu = !UI.showDfu; saveUI(); render(); renderSettings(); return; }
    if (swEl) { var k = swEl.getAttribute('data-sw'), S = P.settings; mutate(function () { if (k === 'minBD' || k === 'minUG') S[k].on = !S[k].on; else S[k] = !S[k]; }); renderSettings(); }
  }

  // ---------- Interaction ----------
  function toWorld(evt) {
    var pt = svg.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY;
    var m = svg.getScreenCTM(); if (!m) return { x: 0, y: 0 };
    var w = pt.matrixTransform(m.inverse()); return { x: w.x, y: w.y };
  }
  function snap(v) { var u = P && P.scale && P.bg ? Math.max(1, P.scale / 4) : 10; return Math.round(v / u) * u; }
  function placeNode(item, x, y, stamp) {
    var n = { id: null, t: item.t, x: snap(x), y: snap(y), lbl: '', p: JSON.parse(JSON.stringify(item.p || {})) };
    snapshot(); n.id = uid(); n.lbl = nextLabel(item.t); P.nodes.push(n); dirty = true;
    sel = stamp ? null : { kind: 'node', id: n.id }; lastPlaced = n.id; refresh();
    return n;
  }
  function downOf(id) { for (var i = 0; i < P.pipes.length; i++) if (P.pipes[i].k !== 'v' && P.pipes[i].a === id) return P.pipes[i]; return null; }
  function canDrain(a, b) {
    if (!a || !b || a.id === b.id) return 'Pick two different nodes.';
    if (a.t === 'SEWER' || a.t === 'VTR' || a.t === 'VJ') return 'A drain can\'t start at a ' + SPECIAL[a.t].n.toLowerCase() + '.';
    if (b.t === 'VTR' || b.t === 'VJ') return 'Use the Vent tool for vents.';
    if (isFix(b) && !FX[b.t].rec) return 'Fixtures only drain out. Connect to a junction, floor sink, interceptor or sewer.';
    if (b.t === 'LOAD') return 'A custom load only drains out.';
    if (downOf(a.id)) return a.lbl + ' already drains somewhere. Delete that pipe first.';
    var cur = b.id, guard = 0;
    while (cur && guard++ < 1000) { if (cur === a.id) return 'That would make a loop.'; var d = downOf(cur); cur = d ? d.b : null; }
    return '';
  }
  function canVent(a, b) {
    if (!a || !b || a.id === b.id) return 'Pick two different nodes.';
    if (a.t === 'SEWER' || a.t === 'VTR') return 'A vent can\'t start there.';
    if (b.t !== 'VJ' && b.t !== 'VTR') return 'Vents run to a vent junction or a VTR.';
    if (P.pipes.some(function (p) { return p.k === 'v' && p.a === a.id; })) return a.lbl + ' already has a vent.';
    var cur = b.id, guard = 0;
    while (cur && guard++ < 1000) { if (cur === a.id) return 'That would make a loop.'; var d = null; for (var i = 0; i < P.pipes.length; i++) if (P.pipes[i].k === 'v' && P.pipes[i].a === cur) d = P.pipes[i]; cur = d ? d.b : null; }
    return '';
  }
  function newPipe(a, b, k, st) { var o = { id: uid(), a: a, b: b, k: k, role: 'auto', len: '', ug: false, force: null }; if (st) o.st = 1; return o; }
  function connect(aId, bId, kind) {
    var a = nodeById(aId), b = nodeById(bId);
    var err = kind === 'v' ? canVent(a, b) : canDrain(a, b);
    if (err) { toast(err); return false; }
    mutate(function () { P.pipes.push(newPipe(aId, bId, kind)); });
    return true;
  }
  function deleteSel(target) {
    target = target || sel; if (!target) return;
    mutate(function () {
      if (target.kind === 'node') { P.nodes = P.nodes.filter(function (n) { return n.id !== target.id; }); P.pipes = P.pipes.filter(function (p) { return p.a !== target.id && p.b !== target.id; }); }
      else P.pipes = P.pipes.filter(function (p) { return p.id !== target.id; });
    });
    if (sel && target.id === sel.id) sel = null;
    if (pending === target.id) pending = null;
    refresh();
  }

  var drag = null, multi = false;
  function hitTarget(e) { return e.target.closest ? e.target.closest('[data-node],[data-pipe]') : null; }
  function onDown(e) {
    if (e.button && e.button !== 0) return;
    if (multi) return;
    lastPtr = e.pointerType || 'mouse';
    var t = hitTarget(e), w = toWorld(e);
    var gr = e.target.closest ? e.target.closest('[data-grip]') : null;
    if (gr && tool === 'select') { hideTip(); var gp2 = gr.getAttribute('data-grip').split(':'); if (startGrip(e, gp2[0], +gp2[1], w)) return; }
    if (lastPtr === 'touch' && tool === 'select' && !armed && t && t.hasAttribute('data-info')) {
      // tap on a size pill: select it and pop its details up right there
      var ip = t.getAttribute('data-info'); sel = { kind: 'pipe', id: ip }; refresh(); showTip(ip, e.clientX, e.clientY, true); return;
    }
    if (lastPtr === 'touch') hideTip();
    if (calib) { calibClick(w); return; }
    // Stamp and Trace act on a tap (pointer up without moving) so a drag still pans.
    if (armed !== null || isDrawTool()) {
      drag = { type: 'pan', sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y, moved: false, pid: e.pointerId, tap: armed !== null ? 'stamp' : 'trace', w: w, free: !!e.shiftKey, slop: lastPtr === 'touch' ? 14 : 8 };
      try { svg.setPointerCapture(e.pointerId); } catch (x) {}
      return;
    }
    if (tool === 'select' && !t && P.bg && !P.bg.locked && !P.bg.hidden && inBg(w)) {
      drag = { type: 'bg', sx: w.x, sy: w.y, ox: P.bg.x, oy: P.bg.y, moved: false, pid: e.pointerId };
      try { svg.setPointerCapture(e.pointerId); } catch (x) {}
      return;
    }
    if (tool === 'delete') { if (t) deleteSel(t.hasAttribute('data-node') ? { kind: 'node', id: t.getAttribute('data-node') } : { kind: 'pipe', id: t.getAttribute('data-pipe') }); return; }
    if (tool === 'select' && t && t.hasAttribute('data-node')) {
      var nid = t.getAttribute('data-node'), n = nodeById(nid);
      sel = { kind: 'node', id: nid };
      drag = { type: 'node', id: nid, sx: w.x, sy: w.y, ox: n.x, oy: n.y, moved: false, pid: e.pointerId };
      try { svg.setPointerCapture(e.pointerId); } catch (x) {}
      refresh(); return;
    }
    if (tool === 'select' && t && t.hasAttribute('data-pipe')) { sel = { kind: 'pipe', id: t.getAttribute('data-pipe') }; refresh(); return; }
    if (tool === 'select' && sel) { sel = null; refresh(); }
    drag = { type: 'pan', sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y, moved: false, pid: e.pointerId };
    try { svg.setPointerCapture(e.pointerId); } catch (x) {}
  }
  function onMove(e) {
    if (gripDrag) { moveGrip(e); return; }
    if (!drag && !multi && (isDrawTool() || calib) && e.pointerType !== 'touch') { traceHover(toWorld(e), !!e.shiftKey); return; }
    if (!drag && !multi && e.pointerType !== 'touch') {
      // hover: show the segment's details next to the cursor
      var ht = hitTarget(e), hp = ht && ht.hasAttribute('data-pipe') ? ht.getAttribute('data-pipe') : null;
      if (hp !== hoverPid) { hoverPid = hp; render(); }
      if (hp) showTip(hp, e.clientX, e.clientY, false); else hideTip();
      return;
    }
    if (!drag || multi || e.pointerId !== drag.pid) return;
    if (drag.type === 'pan') {
      var dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) <= (drag.tap ? (drag.slop || 8) : 3)) return;
      drag.moved = true;
      view.x = drag.ox - dx / view.s; view.y = drag.oy - dy / view.s; render(); return;
    }
    if (drag.type === 'bg') {
      var wb = toWorld(e), bx = Math.round(drag.ox + wb.x - drag.sx), by = Math.round(drag.oy + wb.y - drag.sy);
      if (!drag.moved && (bx !== P.bg.x || by !== P.bg.y)) { snapshot(); drag.moved = true; }
      if (drag.moved) { P.bg.x = bx; P.bg.y = by; dirty = true; renderBg(); }
      return;
    }
    var w = toWorld(e), n = nodeById(drag.id); if (!n) return;
    var nx = snap(drag.ox + (w.x - drag.sx)), ny = snap(drag.oy + (w.y - drag.sy));
    if (!drag.moved && (nx !== n.x || ny !== n.y)) { snapshot(); drag.moved = true; }
    if (drag.moved) {
      // keep the first/last leg of drawn polylines square: slide the neighbouring vertex along
      P.pipes.forEach(function (p) {
        if (!Array.isArray(p.v) || !p.v.length || (p.a !== n.id && p.b !== n.id)) return;
        var q = p.a === n.id ? p.v[0] : p.v[p.v.length - 1];
        if (Math.abs(q[1] - n.y) < 0.6) q[1] = ny; else if (Math.abs(q[0] - n.x) < 0.6) q[0] = nx;
      });
      n.x = nx; n.y = ny; dirty = true; render();
    }
  }
  function onUp() {
    if (gripDrag) { endGrip(); return; }
    var d = drag; drag = null; if (!d) return;
    if (d.type === 'node' && d.moved) { var dn = nodeById(d.id), only = {}; if (dn && dn.t === 'J') { only[dn.id] = 1; heal(only); } refresh(); }
    if (d.type === 'bg' && d.moved) refresh();
    if (d.tap && !d.moved && !multi) {
      if (d.tap === 'stamp' && armed !== null) { placeNode(PALETTE[armed], d.w.x, d.w.y, true); }
      else if (d.tap === 'trace') traceClick(d.w, d.free);
    }
  }
  function onWheel(e) { e.preventDefault(); zoomAt(toWorld(e), Math.exp(-e.deltaY * 0.0015)); }
  function zoomAt(w, f) {
    var ns = Math.min(10, Math.max(0.03, view.s * f));
    view.x = w.x - (w.x - view.x) * view.s / ns; view.y = w.y - (w.y - view.y) * view.s / ns; view.s = ns; render();
  }
  var pinch = null;
  function onTouchStart(e) { if (e.touches.length === 2) { multi = true; drag = null; pinch = { d: dist(e.touches) }; } }
  function onTouchMove(e) { if (e.touches.length === 2 && pinch) { e.preventDefault(); var d = dist(e.touches); zoomAt(toWorld(mid(e.touches)), d / pinch.d); pinch.d = d; } }
  function onTouchEnd(e) { if (e.touches.length < 2) { pinch = null; if (!e.touches.length) multi = false; } }
  function dist(t) { var dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY; return Math.sqrt(dx * dx + dy * dy) || 1; }
  function mid(t) { return { clientX: (t[0].clientX + t[1].clientX) / 2, clientY: (t[0].clientY + t[1].clientY) / 2 }; }

  function fit() {
    var I = fsInsets(), w = (svg.clientWidth || 800) - I.l - I.r, h = (svg.clientHeight || 500) - I.t - I.b;
    if (w < 120 || h < 120) { I = { l: 0, t: 0, r: 0, b: 0 }; w = svg.clientWidth || 800; h = svg.clientHeight || 500; }
    var bb = bgBox();
    if (!P.nodes.length && !bb) { view = { x: -40, y: -40, s: 1 }; render(); return; }
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, gs = glyphScale();
    P.nodes.forEach(function (n) { x0 = Math.min(x0, n.x - 50 * gs); y0 = Math.min(y0, n.y - 40 * gs); x1 = Math.max(x1, n.x + 50 * gs); y1 = Math.max(y1, n.y + 40 * gs); });
    if (bb) { x0 = Math.min(x0, bb.x0); y0 = Math.min(y0, bb.y0); x1 = Math.max(x1, bb.x1); y1 = Math.max(y1, bb.y1); }
    var pad = 16, s = Math.min((w - pad * 2) / (x1 - x0), (h - pad * 2) / (y1 - y0));
    var minS = bb ? 0.03 : ((svg.clientWidth || 800) < 640 ? 0.55 : 0.3);
    s = Math.max(minS, Math.min(1.5, s));
    view.s = s;
    view.x = (x1 - x0) * s > w ? x0 - pad / s : x0 - (w / s - (x1 - x0)) / 2;
    view.y = (y1 - y0) * s > h ? y0 - pad / s : y0 - (h / s - (y1 - y0)) / 2;
    view.x -= I.l / s; view.y -= I.t / s;
    render();
  }

  // ---------- Palette ----------
  var UI = (function () { try { return JSON.parse(localStorage.getItem(LS_UI) || 'null') || {}; } catch (e) { return {}; } })();
  UI.groups = UI.groups || {};
  function saveUI() { try { localStorage.setItem(LS_UI, JSON.stringify(UI)); } catch (e) {} }
  function grpOpen(k) { if (UI.groups[k] === undefined) return !PALETTE.some(function (it) { return it.h && it.k === k && it.closed; }); return UI.groups[k] !== false; }
  function renderPalette() {
    var groups = [], cur = null;
    PALETTE.forEach(function (it, i) { if (it.h) { cur = { h: it.h, k: it.k, items: [] }; groups.push(cur); } else cur.items.push(i); });
    function head(g, big) {
      var open = grpOpen(g.k);
      return '<button type="button" data-grp-toggle="' + g.k + '" aria-expanded="' + open + '" class="w-full flex items-center gap-2 text-left ' + (big ? 'py-2 text-xs' : 'py-1.5 text-[11px]') + ' font-semibold uppercase tracking-wide text-slate-500 hover:text-indigo-600"><i class="fas fa-chevron-down text-[10px] transition-transform grp-chev"></i><span class="flex-1">' + g.h + '</span><span class="text-[10px] font-medium normal-case tracking-normal text-slate-400">' + g.items.length + '</span></button>';
    }
    var list = '', sheet = '';
    groups.forEach(function (g) {
      var open = grpOpen(g.k), cl = open ? '' : ' grp-closed';
      list += '<div class="pal-grp' + cl + '" data-grp="' + g.k + '">' + head(g) + '<div class="grp-body space-y-1 pb-1">';
      sheet += '<div class="pal-grp' + cl + '" data-grp="' + g.k + '">' + head(g, true) + '<div class="grp-body grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 pb-2">';
      g.items.forEach(function (i) {
        var it = PALETTE[i], f = FX[it.t], d = f ? (f.rec ? fmtDfu(fsFlat(+(it.p && it.p.trapSel) || f.trap)) : f.gpm ? (it.p && +it.p.gpm ? fmtDfu(dfuFromGpm(it.p.gpm)) : 'gpm') : fmtDfu(P.occ === 'assembly' ? f.asm : f.pub)) : '';
        var icon = f ? f.ic : ({ J: 'fa-circle-nodes', GI: 'fa-oil-can', LOAD: 'fa-plus', VTR: 'fa-wind', SEWER: 'fa-arrow-right-to-bracket' }[it.t]);
        var color = (f && f.vol) || it.t === 'GI' ? ' style="color:' + GW_COLOR + '"' : '';
        var um = f ? +P.settings.mins[it.t] || 0 : 0;
        var sub = f ? (f.rec ? '2″/3″/4″ · flat DFU' : f.trap ? SL[Math.max(f.trap, um)] + ' arm' + (um > f.trap ? ' · design' : '') : (it.p && +it.p.gpm ? it.p.gpm + ' gpm · indirect' : 'indirect waste')) : SPECIAL[it.t].n;
        list += '<div data-pal="' + i + '" title="' + esc(it.name) + '" class="chip flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 hover:border-indigo-300 hover:bg-indigo-50 cursor-grab select-none"><span class="w-7 h-7 flex-none rounded-md bg-indigo-50 text-indigo-600 inline-flex items-center justify-center text-sm"' + color + '><i class="fas ' + icon + '"></i></span><span class="flex-1 min-w-0"><span class="block text-xs font-medium text-slate-700 leading-snug break-words">' + it.name + '</span><span class="block text-[10px] leading-snug ' + (um > (f ? f.trap : 0) ? 'text-indigo-600' : 'text-slate-400') + '">' + sub + '</span></span>' + (d ? '<span class="flex-none text-[10px] font-semibold text-indigo-700 bg-indigo-50 rounded-full px-1.5">' + d + '</span>' : '') + '</div>';
        sheet += '<div data-pal="' + i + '" class="chip relative rounded-xl border border-slate-200 bg-white pt-2 pb-1.5 px-1 text-center select-none">' + (d ? '<span class="absolute top-1 right-1 text-[9px] font-semibold text-indigo-700 bg-indigo-50 rounded-full px-1">' + d + '</span>' : '') + '<i class="fas ' + icon + ' text-indigo-600 text-lg"' + color + '></i><div class="text-[11px] text-slate-700 mt-1 leading-tight break-words">' + it.name + '</div></div>';
      });
      list += '</div></div>'; sheet += '</div></div>';
    });
    $('palList').innerHTML = list; $('sheetList').innerHTML = sheet;
    markArmed();
  }
  function toggleGroup(k) {
    UI.groups[k] = !grpOpen(k); saveUI();
    document.querySelectorAll('[data-grp="' + k + '"]').forEach(function (g) { g.classList.toggle('grp-closed', !grpOpen(k)); var b = g.querySelector('[data-grp-toggle]'); if (b) b.setAttribute('aria-expanded', grpOpen(k)); });
    layoutFs();
  }
  function markArmed() { document.querySelectorAll('[data-pal]').forEach(function (c) { var on = armed !== null && +c.getAttribute('data-pal') === armed; c.classList.toggle('ring-2', on); c.classList.toggle('ring-indigo-500', on); }); }
  var palDrag = null;
  function onPalDown(e) {
    var c = e.target.closest && e.target.closest('[data-pal]'); if (!c) return;
    palDrag = { i: +c.getAttribute('data-pal'), sx: e.clientX, sy: e.clientY, ghost: null, mouse: e.pointerType !== 'touch' };
  }
  function onPalMove(e) {
    if (!palDrag || !palDrag.mouse) return;
    if (!palDrag.ghost && Math.abs(e.clientX - palDrag.sx) + Math.abs(e.clientY - palDrag.sy) > 6) {
      var g = document.createElement('div'); g.className = 'fixed z-50 pointer-events-none rounded-lg border border-indigo-400 bg-white/90 shadow px-2 py-1 text-xs font-medium text-indigo-700';
      g.textContent = PALETTE[palDrag.i].name; document.body.appendChild(g); palDrag.ghost = g;
    }
    if (palDrag.ghost) { palDrag.ghost.style.left = (e.clientX + 8) + 'px'; palDrag.ghost.style.top = (e.clientY + 8) + 'px'; }
  }
  function onPalUp(e) {
    if (!palDrag) return;
    var d = palDrag; palDrag = null;
    if (d.ghost) {
      d.ghost.remove();
      var r = svg.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) { var w = toWorld(e); placeNode(PALETTE[d.i], w.x, w.y); }
      return;
    }
    if (Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) < 10) {
      armed = armed === d.i ? null : d.i;
      if (armed !== null) { sel = null; pending = null; if (tool !== 'select') setTool('select', true); else render(); }
      markArmed(); renderInspector();
      if (armed !== null) toast('Stamp: tap the canvas to place ' + PALETTE[d.i].name + '. Keep tapping for more; Esc or Stop ends it.');
    }
  }

  function setTool(t, keepArmed) {
    if (t === 'trace') t = 'pipe'; // Trace and Pipe are one polyline tool now
    var from = sel && sel.kind === 'node' ? nodeById(sel.id) : null;
    tool = t; pending = null; trace.pts = []; trace.hover = null; calib = null; if (!keepArmed) { armed = null; markArmed(); }
    // Pipe with a fixture selected starts that fixture's branch right away (fast on touch).
    if (t === 'pipe' && from && isFix(from) && !downOf(from.id)) { trace.pts = [{ x: from.x, y: from.y, node: from.id, kind: 'node', fix: true }]; sel = null; }
    if (t === 'vent' && from && from.t !== 'VTR' && from.t !== 'SEWER' && !P.pipes.some(function (p) { return p.k === 'v' && p.a === from.id; })) { trace.pts = [{ x: from.x, y: from.y, node: from.id, kind: 'node', fix: isFix(from) }]; sel = null; }
    setTimeout(syncDrawBar, 0);
    document.querySelectorAll('[data-tool]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-tool') === t ? 'true' : 'false'); });
    if (svg) svg.style.cursor = t === 'select' ? 'default' : 'crosshair';
    if (t === 'pipe' && P.bg && !P.scale) toast(P.bg ? 'Set the plan scale (Plan button) so traced lengths are measured.' : 'Tip: load a plan with Plan › Import so traced lengths are measured.');
    refresh();
  }

  // ---------- Fullscreen ----------
  // Native Fullscreen API on the whole page where supported (so settings, menus and the file
  // picker stay reachable), plus a CSS fixed overlay that also covers iPhone Safari.
  var fsNative = false;
  function isFs() { return document.body.classList.contains('fs'); }
  function nativeEl() { return document.fullscreenElement || document.webkitFullscreenElement || null; }
  function moveTo(id, slot) { var e = $(id), t = $(slot); if (e && t && e.parentNode !== t) t.appendChild(e); }
  function setFs(on, opts) {
    opts = opts || {};
    var b = document.body;
    if (on === isFs()) return;
    b.classList.toggle('fs', on);
    if (on) {
      moveTo('hdrActions', 'fsActions'); moveTo('nameRow', 'fsSumTop'); moveTo('banner', 'fsSumTop');
      var wide = innerWidth >= 1024;
      b.classList.toggle('fs-pal-off', UI.fsPal === false);
      b.classList.toggle('fs-sum-on', UI.fsSum === undefined ? innerWidth >= 1280 : !!UI.fsSum && wide);
      if (!opts.auto) {
        var de = document.documentElement, rq = de.requestFullscreen || de.webkitRequestFullscreen;
        if (rq) { try { var pr = rq.call(de); fsNative = true; if (pr && pr.catch) pr.catch(function () { fsNative = false; }); } catch (e) { fsNative = false; } }
      }
    } else {
      moveTo('hdrActions', 'hdrSlot'); moveTo('nameRow', 'nameSlot'); moveTo('banner', 'bannerSlot');
      b.classList.remove('fs-sum-on');
      if (nativeEl()) { var ex = document.exitFullscreen || document.webkitExitFullscreen; try { var q = ex.call(document); if (q && q.catch) q.catch(function () {}); } catch (e) {} }
      fsNative = false;
    }
    if (innerWidth < 640 && !opts.auto) { UI.fsPhone = on; saveUI(); }
    var fb = $('fsBtn'); if (fb) { fb.setAttribute('aria-pressed', on ? 'true' : 'false'); fb.title = on ? 'Exit full screen (Esc)' : 'Full screen'; fb.innerHTML = '<i class="fas ' + (on ? 'fa-compress' : 'fa-expand') + '"></i><span class="lbl">' + (on ? 'Exit' : 'Full screen') + '</span>'; }
    layoutFs();
    setTimeout(function () { layoutFs(); fit(); }, 80);
  }
  function onNativeChange() { if (!nativeEl() && fsNative) { fsNative = false; setFs(false); } }
  function togglePanel(which) {
    var b = document.body;
    if (which === 'pal') {
      if (innerWidth >= 1024) { b.classList.toggle('fs-pal-off'); UI.fsPal = !b.classList.contains('fs-pal-off'); }
      else { b.classList.toggle('sheet-min'); }
    } else {
      b.classList.toggle('fs-sum-on'); if (innerWidth >= 1024) UI.fsSum = b.classList.contains('fs-sum-on');
    }
    saveUI(); layoutFs();
  }
  function layoutFs() {
    var b = document.body, st = document.documentElement.style;
    if (!isFs()) {
      ['--tbh', '--palw', '--sumw', '--sheeth', '--insph'].forEach(function (k) { st.removeProperty(k); });
      // keep page content scrollable above the fixture sheet
      b.style.paddingBottom = innerWidth < 1024 && $('sheet') ? Math.round($('sheet').getBoundingClientRect().height + 12) + 'px' : '';
      return;
    }
    b.style.paddingBottom = '';
    var wide = innerWidth >= 1024, tb = $('toolbar').getBoundingClientRect();
    var palOn = wide && !b.classList.contains('fs-pal-off'), sumOn = wide && b.classList.contains('fs-sum-on');
    var sh = !wide && $('sheet') ? $('sheet').getBoundingClientRect().height : 0;
    st.setProperty('--tbh', Math.round(tb.bottom + 8) + 'px');
    st.setProperty('--palw', palOn ? '256px' : '0px');
    st.setProperty('--sumw', sumOn ? '376px' : '0px');
    st.setProperty('--sheeth', Math.round(sh) + 'px');
    st.setProperty('--insph', Math.round($('insp').getBoundingClientRect().height || 0) + 'px');
    var pb = $('fsPalBtn'), sb = $('fsSumBtn');
    if (pb) pb.setAttribute('aria-pressed', (wide ? palOn : !b.classList.contains('sheet-min')) ? 'true' : 'false');
    if (sb) sb.setAttribute('aria-pressed', b.classList.contains('fs-sum-on') ? 'true' : 'false');
  }
  // Visible part of the canvas, in screen px, once floating panels are taken off.
  function fsInsets() {
    if (!isFs()) return { l: 0, t: 0, r: 0, b: 0 };
    var cs = getComputedStyle(document.documentElement), px = function (k) { return parseFloat(cs.getPropertyValue(k)) || 0; };
    var narrowSum = innerWidth < 1024 && document.body.classList.contains('fs-sum-on');
    return { l: px('--palw'), t: px('--tbh'), r: px('--sumw'), b: px('--sheeth') + (narrowSum ? 0 : px('--insph')) + 8 };
  }

  // ---------- Plan background ----------
  // P.bg holds metadata only (position, size in world units, scale info). The image itself lives in
  // bgSrc so undo snapshots and autosave stay small; it is embedded when a .dwv is saved.
  var gBg = null, gOv = null, bgSrc = null, bgEl = null, bgShown = '';
  var lastPlaced = null, routeNew = null, routeCtx = null, calib = null;
  var trace = { pts: [], hover: null };
  var SCALES = [
    ['1/16″ = 1′-0″', 192], ['3/32″ = 1′-0″', 128], ['1/8″ = 1′-0″', 96], ['3/16″ = 1′-0″', 64], ['1/4″ = 1′-0″', 48],
    ['3/8″ = 1′-0″', 32], ['1/2″ = 1′-0″', 24], ['3/4″ = 1′-0″', 16], ['1″ = 1′-0″', 12], ['1″ = 10′', 120], ['1″ = 20′', 240],
    ['1:50', 50], ['1:100', 100], ['1:200', 200]
  ];
  // Sheet sizes (inches, long side first) to estimate DPI of a raster plan.
  var SHEETS = [['ARCH D 36×24', 36, 24], ['ARCH E 48×36', 48, 36], ['ARCH E1 42×30', 42, 30], ['ARCH C 24×18', 24, 18], ['ANSI D 34×22', 34, 22], ['ANSI E 44×34', 44, 34], ['ANSI B 17×11 (tabloid)', 17, 11], ['Letter 11×8.5', 11, 8.5]];
  function scaleLabel(N) { for (var i = 0; i < SCALES.length; i++) if (Math.abs(SCALES[i][1] - N) < 1e-6) return SCALES[i][0]; return '1:' + (Math.round(N * 100) / 100); }
  // Returns N where 1 paper inch = N real inches (1/8"=1'-0" -> 96, 1:100 -> 100).
  function parseScale(str) {
    str = String(str || '').replace(/[″”]/g, '"').replace(/[′’]/g, "'").trim(); if (!str) return null;
    var m = str.match(/^1\s*:\s*(\d+(?:\.\d+)?)$/); if (m) return +m[1];
    var lhs = str.split('=')[0], rhs = str.indexOf('=') >= 0 ? str.split('=')[1] : "1'";
    var a = null; m = lhs.match(/^\s*(?:(\d+)\s+)?(\d+)\s*\/\s*(\d+)\s*"?\s*$/);
    if (m) a = (m[1] ? +m[1] : 0) + (+m[2]) / (+m[3]);
    else { m = lhs.match(/^\s*(\d*\.?\d+)\s*"?\s*$/); if (m) a = +m[1]; }
    if (!a) return null;
    var ft = parseFtIn(rhs); if (!ft) return null;
    return ft * 12 / a;
  }
  // "12'-6\"", "12' 6", "12.5", "150\"" -> feet
  function parseFtIn(str) {
    str = String(str || '').replace(/[″”]/g, '"').replace(/[′’]/g, "'").trim(); if (!str) return null;
    var m = str.match(/^(\d+(?:\.\d+)?)\s*'\s*-?\s*(?:(\d+(?:\.\d+)?)\s*(?:(\d+)\s*\/\s*(\d+))?\s*"?)?$/);
    if (m) return +m[1] + ((m[2] ? +m[2] : 0) + (m[3] ? +m[3] / +m[4] : 0)) / 12;
    m = str.match(/^(\d+(?:\.\d+)?)\s*"$/); if (m) return +m[1] / 12;
    m = str.match(/^(\d+(?:\.\d+)?)$/); if (m) return +m[1];
    return null;
  }
  function bgBox() {
    var b = P && P.bg; if (!b || !bgSrc || b.hidden) return null;
    var cx = b.x + b.w / 2, cy = b.y + b.h / 2, odd = (b.rot || 0) % 180 !== 0, hw = (odd ? b.h : b.w) / 2, hh = (odd ? b.w : b.h) / 2;
    return { x0: cx - hw, y0: cy - hh, x1: cx + hw, y1: cy + hh };
  }
  function inBg(w) { var bb = bgBox(); return !!bb && w.x >= bb.x0 && w.x <= bb.x1 && w.y >= bb.y0 && w.y <= bb.y1; }
  // The base raster (bgEl) and a sharp tile (tileEl) share one rotated group. The tile is the
  // visible part of the original PDF page re-rendered by pdf.js at screen resolution.
  var bgG = null, tileEl = null, tile = null, tileTimer = null, tileTask = null, tileBusy = false, tileUrl = null;
  var bgPdf = null, bgPdfDoc = null, bgPdfPage = null, bgPdfKey = null, hiRes = true;
  var TILE_MAX_PX = 4.2e6, TILE_MAX_SIDE = 4096; // stay far below iOS Safari's canvas memory limit
  function renderBg() {
    if (!gBg) return;
    var b = P && P.bg;
    if (!b || !bgSrc) { if (bgG) { bgG.remove(); bgG = null; bgEl = null; bgShown = ''; } dropTile(); return; }
    if (!bgG) { bgG = el('g', { 'pointer-events': 'none' }, gBg); bgEl = el('image', { preserveAspectRatio: 'none' }, bgG); tileEl = null; }
    if (bgShown !== bgSrc) { bgEl.setAttribute('href', bgSrc); bgShown = bgSrc; }
    bgEl.setAttribute('x', b.x); bgEl.setAttribute('y', b.y); bgEl.setAttribute('width', b.w); bgEl.setAttribute('height', b.h);
    bgG.setAttribute('opacity', b.opacity == null ? 0.6 : b.opacity);
    bgG.setAttribute('transform', 'rotate(' + (b.rot || 0) + ' ' + (b.x + b.w / 2) + ' ' + (b.y + b.h / 2) + ')');
    bgG.style.display = b.hidden ? 'none' : '';
    if (tile && tileEl && (tile.bx !== b.x || tile.by !== b.y)) dropTile(); // plan moved: old tile is stale
    scheduleTile();
  }
  function dropTile() { if (tileEl) { tileEl.remove(); tileEl = null; } if (tileUrl) { URL.revokeObjectURL(tileUrl); tileUrl = null; } tile = null; }
  function scheduleTile() { clearTimeout(tileTimer); tileTimer = setTimeout(renderTile, 220); }
  function pdfB64(u8) { var s = '', CH = 0x8000; for (var i = 0; i < u8.length; i += CH) s += String.fromCharCode.apply(null, u8.subarray(i, i + CH)); return btoa(s); }
  function b64Pdf(str) { var bin = atob(str), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
  function setBgPdf(bytes) { bgPdf = bytes || null; bgPdfDoc = null; bgPdfPage = null; bgPdfKey = null; dropTile(); idbSet('bgpdf', bytes || ''); }
  function getTilePage() {
    var b = P.bg, key = (bgPdf && bgPdf.length) + ':' + (b.pdfPage || 1);
    if (bgPdfPage && bgPdfKey === key) return Promise.resolve(bgPdfPage);
    return loadPdfJs().then(function (lib) {
      // pdf.js transfers the buffer to its worker, so always hand it a copy.
      return bgPdfDoc ? bgPdfDoc : lib.getDocument({ data: bgPdf.slice() }).promise.then(function (d) { bgPdfDoc = d; return d; });
    }).then(function (d) { return d.getPage(Math.min(d.numPages, b.pdfPage || 1)); }).then(function (pg) { bgPdfPage = pg; bgPdfKey = key; return pg; });
  }
  // Visible part of the page in page-frame (unrotated) world coords.
  function visiblePageRect(b) {
    var w = svg.clientWidth || 800, h = svg.clientHeight || 500, vw = w / view.s, vh = h / view.s, pad = 0.12;
    var x0 = view.x - vw * pad, y0 = view.y - vh * pad, x1 = view.x + vw * (1 + pad), y1 = view.y + vh * (1 + pad);
    var cx = b.x + b.w / 2, cy = b.y + b.h / 2, a = -(b.rot || 0) * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    var xs = [], ys = [];
    [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].forEach(function (q) { var dx = q[0] - cx, dy = q[1] - cy; xs.push(cx + dx * ca - dy * sa); ys.push(cy + dx * sa + dy * ca); });
    var r = { x0: Math.max(b.x, Math.min.apply(null, xs)), y0: Math.max(b.y, Math.min.apply(null, ys)), x1: Math.min(b.x + b.w, Math.max.apply(null, xs)), y1: Math.min(b.y + b.h, Math.max.apply(null, ys)) };
    return r.x1 > r.x0 && r.y1 > r.y0 ? r : null;
  }
  function renderTile() {
    var b = P && P.bg;
    if (!hiRes || !b || b.kind !== 'pdf' || !bgPdf || b.hidden || !svg || !bgG) return;
    if (tileBusy) { scheduleTile(); return; }
    var dpr = Math.min(3, window.devicePixelRatio || 1), dev = view.s * dpr; // device px per world unit
    var baseRes = (b.prevW || b.w) / b.w; // base raster px per world unit
    if (dev <= baseRes * 1.15) { dropTile(); return; } // base image is already sharp enough
    var vr = visiblePageRect(b); if (!vr) return;
    var k = dev, pw = (vr.x1 - vr.x0) * k, ph = (vr.y1 - vr.y0) * k;
    var lim = Math.min(1, Math.sqrt(TILE_MAX_PX / (pw * ph)), TILE_MAX_SIDE / pw, TILE_MAX_SIDE / ph);
    k *= lim; pw = Math.max(1, Math.floor(pw * lim)); ph = Math.max(1, Math.floor(ph * lim));
    if (tile && tile.k >= k * 0.98 && tile.x0 <= vr.x0 + 0.5 && tile.y0 <= vr.y0 + 0.5 && tile.x1 >= vr.x1 - 0.5 && tile.y1 >= vr.y1 - 0.5 && tile.k <= k * 1.6) return; // current tile still covers it
    tileBusy = true;
    var want = { x0: vr.x0, y0: vr.y0, x1: vr.x0 + pw / k, y1: vr.y0 + ph / k, k: k, bx: b.x, by: b.y };
    getTilePage().then(function (pg) {
      // world units -> PDF points: world = pt * b.r
      var S = k * b.r, vp = pg.getViewport({ scale: S, offsetX: -(vr.x0 - b.x) * k, offsetY: -(vr.y0 - b.y) * k });
      var c = document.createElement('canvas'); c.width = pw; c.height = ph;
      var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, pw, ph);
      tileTask = pg.render({ canvasContext: ctx, viewport: vp });
      return tileTask.promise.then(function () {
        return new Promise(function (res) { c.toBlob(function (bl) { c.width = c.height = 0; res(bl); }, 'image/png'); });
      });
    }).then(function (bl) {
      tileBusy = false; tileTask = null;
      if (!bl || !P.bg || P.bg !== b || !bgG) return;
      var url = URL.createObjectURL(bl);
      if (!tileEl) tileEl = el('image', { preserveAspectRatio: 'none', 'data-tile': '1' }, bgG);
      tileEl.setAttribute('href', url);
      tileEl.setAttribute('x', want.x0); tileEl.setAttribute('y', want.y0); tileEl.setAttribute('width', want.x1 - want.x0); tileEl.setAttribute('height', want.y1 - want.y0);
      if (tileUrl) URL.revokeObjectURL(tileUrl); tileUrl = url; tile = want;
      if (window.__dwvTileDone) window.__dwvTileDone(want);
    }).catch(function () { tileBusy = false; tileTask = null; });
  }
  // ---- draft storage for the plan image (too big for localStorage) ----
  function idb(fn) {
    try {
      var rq = indexedDB.open('workspacePlannerDwv', 1);
      rq.onupgradeneeded = function () { rq.result.createObjectStore('kv'); };
      rq.onsuccess = function () { try { fn(rq.result.transaction('kv', 'readwrite').objectStore('kv')); } catch (e) {} };
    } catch (e) {}
  }
  function idbSet(k, v) { idb(function (st) { st.put(v, k); }); }
  function idbGet(k, cb) { idb(function (st) { var r = st.get(k); r.onsuccess = function () { cb(r.result || null); }; r.onerror = function () { cb(null); }; }); }
  function setBgSrc(src) { bgSrc = src; idbSet('bg', src || ''); }

  // ---- import ----
  var MAX_STORE = 3200; // longest side kept in the file (px)
  function toStoredDataUrl(canvasOrImg, w, h) {
    var k = Math.min(1, MAX_STORE / Math.max(w, h)), c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
    var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(canvasOrImg, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.82);
  }
  var pdfDoc = null, pdfName = '', pdfBytes = null;
  var PREVIEW_MAX = 2000; // the quick-load preview raster (longest side, px) saved with the PDF
  function loadPdfLib() {
    if (window.PDFLib) return Promise.resolve(window.PDFLib);
    return new Promise(function (res, rej) {
      var sc = document.createElement('script'); sc.src = new URL('../vendor/pdf-lib.min.js', document.baseURI).href;
      sc.onload = function () { res(window.PDFLib); }; sc.onerror = function () { rej(new Error('pdf-lib unavailable')); };
      document.head.appendChild(sc);
    });
  }
  // Keep only the chosen page so .dwv files stay small. Falls back to the whole file.
  function extractPage(bytes, n) {
    return loadPdfLib().then(function (L) {
      return L.PDFDocument.load(bytes.slice(), { ignoreEncryption: true }).then(function (src) {
        if (src.getPageCount() === 1) return { bytes: bytes, page: 1 };
        return L.PDFDocument.create().then(function (out) {
          return out.copyPages(src, [n - 1]).then(function (pp) { out.addPage(pp[0]); return out.save({ useObjectStreams: true }); });
        }).then(function (u8) { return { bytes: new Uint8Array(u8), page: 1 }; });
      });
    }).catch(function () { return { bytes: bytes, page: n }; });
  }
  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    return new Promise(function (res, rej) {
      var sc = document.createElement('script'); sc.src = new URL('../vendor/pdfjs/pdf.min.js', document.baseURI).href;
      sc.onload = function () { window.pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('../vendor/pdfjs/pdf.worker.min.js', document.baseURI).href; res(window.pdfjsLib); };
      sc.onerror = function () { rej(new Error('Could not load the PDF reader. Check the connection.')); };
      document.head.appendChild(sc);
    });
  }
  function importFile(f) {
    if (!f) return;
    var isPdf = /pdf$/i.test(f.type) || /\.pdf$/i.test(f.name);
    planMsg('Reading ' + f.name + '…');
    if (isPdf) {
      f.arrayBuffer().then(function (buf) { pdfBytes = new Uint8Array(buf); return loadPdfJs().then(function (lib) { return lib.getDocument({ data: pdfBytes.slice() }).promise; }); })
        .then(function (doc) { pdfDoc = doc; pdfName = f.name; $('planPageRow').classList.remove('hidden'); $('planPage').max = doc.numPages; $('planPage').value = 1; $('planPages').textContent = 'of ' + doc.numPages; return renderPdfPage(1); })
        .catch(function (e) { planMsg(e.message || 'Could not read that PDF.'); });
      return;
    }
    var rd = new FileReader();
    rd.onload = function () {
      var im = new Image();
      im.onload = function () {
        var src = toStoredDataUrl(im, im.naturalWidth, im.naturalHeight);
        installBg({ kind: 'image', name: f.name, w: im.naturalWidth, h: im.naturalHeight }, src);
      };
      im.onerror = function () { planMsg('That image could not be read. Use PNG, JPG or PDF.'); };
      im.src = rd.result;
    };
    rd.readAsDataURL(f);
  }
  function renderPdfPage(n) {
    if (!pdfDoc) return Promise.resolve();
    n = Math.max(1, Math.min(pdfDoc.numPages, +n || 1));
    planMsg('Rendering page ' + n + '…');
    return pdfDoc.getPage(n).then(function (pg) {
      var v1 = pg.getViewport({ scale: 1 }); // PDF points: 72 per inch of paper
      // World units stay at the same scale as before (r = 3200 px on the long side) so measurements
      // in older files are unchanged; the stored preview raster itself is smaller.
      var r = Math.min(4, MAX_STORE / Math.max(v1.width, v1.height)), pr = Math.min(r, PREVIEW_MAX / Math.max(v1.width, v1.height));
      var vp = pg.getViewport({ scale: pr }), c = document.createElement('canvas');
      c.width = Math.round(vp.width); c.height = Math.round(vp.height);
      var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      return pg.render({ canvasContext: ctx, viewport: vp }).promise.then(function () {
        var src = c.toDataURL('image/jpeg', 0.8);
        planMsg('Keeping the vector page…');
        return (pdfBytes ? extractPage(pdfBytes, n) : Promise.resolve(null)).then(function (ex) {
          installBg({ kind: 'pdf', name: pdfName, page: n, w: Math.round(v1.width * r), h: Math.round(v1.height * r), ptW: v1.width, ptH: v1.height, r: r, prevW: c.width, pdfPage: ex ? ex.page : null }, src, ex ? ex.bytes : null);
        });
      });
    });
  }
  function installBg(meta, src, pdfB) {
    var hadScale = P.bg && P.scale;
    mutate(function () {
      P.bg = { kind: meta.kind, name: meta.name, page: meta.page || null, w: meta.w, h: meta.h, x: 0, y: 0, rot: 0, opacity: 0.6, locked: true, hidden: false,
        ptW: meta.ptW || null, ptH: meta.ptH || null, r: meta.r || null, prevW: meta.prevW || null, pdfPage: meta.pdfPage || null, dpi: meta.kind === 'image' ? (P.bg && P.bg.dpi) || 150 : null, N: null, method: null };
      P.scale = null;
    });
    setBgPdf(pdfB || null); setBgSrc(src); renderBg(); fit(); renderPlanPanel();
    planMsg((meta.kind === 'pdf' ? 'PDF page ' + meta.page + ' loaded' : 'Image loaded') + '. Now set the scale.' + (hadScale ? ' (Previous scale cleared.)' : ''));
  }
  // ---- scale ----
  function applyScaleN(N) {
    if (!P.bg || !N) return;
    var pxPerPaperIn = P.bg.kind === 'pdf' ? 72 * P.bg.r : (+$('planDpi').value || P.bg.dpi || 0);
    if (!pxPerPaperIn) { planMsg('Enter the image DPI, or pick its sheet size.'); return; }
    mutate(function () { if (P.bg.kind !== 'pdf') P.bg.dpi = pxPerPaperIn; P.bg.N = N; P.bg.method = 'scale'; P.scale = pxPerPaperIn * 12 / N; });
    renderPlanPanel(); fit(); planMsg('Scale set: ' + scaleLabel(N) + '.');
  }
  function applyCalib(feet) {
    if (!calib || calib.pts.length < 2 || !feet) return;
    var a = calib.pts[0], b = calib.pts[1], d = Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
    if (d < 2) { planMsg('Pick two points farther apart.'); return; }
    mutate(function () { P.scale = d / feet; if (P.bg) { P.bg.method = 'calib'; P.bg.N = null; P.bg.calFt = feet; } });
    calib = null; renderOverlay(); renderPlanPanel(); planMsg('Calibrated: ' + fmtFtIn(Math.round(feet * 12)) + ' between the two points.');
  }
  function startCalib() { calib = { pts: [] }; openPlan(false); toast('Calibrate: tap the first point of a known dimension.'); renderInspector(); }
  function calibClick(w) {
    calib.pts.push({ x: w.x, y: w.y });
    if (calib.pts.length === 1) { toast('Now tap the second point.'); renderOverlay(); return; }
    renderOverlay(); openPlan(true);
    var d = Math.sqrt(Math.pow(calib.pts[1].x - calib.pts[0].x, 2) + Math.pow(calib.pts[1].y - calib.pts[0].y, 2));
    $('planCalRow').classList.remove('hidden'); $('planKnown').focus();
    planMsg('Two points picked (' + Math.round(d) + ' px apart). Type the real distance and press Apply.');
  }
  // ---- panel ----
  function planMsg(t) { var m = $('planMsg'); if (m) m.textContent = t || ''; }
  function openPlan(open) { $('planWrap').classList.toggle('open', open !== false); if (open !== false) renderPlanPanel(); }
  function renderPlanPanel() {
    var b = P.bg, has = !!b;
    $('planHas').classList.toggle('hidden', !has);
    $('planInfo').textContent = has ? (b.kind === 'pdf' ? 'PDF · ' + b.name + ' · page ' + b.page + ' · sheet ' + (Math.round(b.ptW / 72 * 100) / 100) + '″ × ' + (Math.round(b.ptH / 72 * 100) / 100) + '″ (from the PDF)' + (bgPdf ? ' · vector page kept, sharp at any zoom (' + (Math.round(bgPdf.length / 1024 / 102.4) / 10) + ' MB)' : ' · raster only (older file): re-import the PDF for sharp zoom') : 'Image · ' + b.name + ' · ' + b.w + ' × ' + b.h + ' px') : 'No plan loaded.';
    $('planDpiRow').classList.toggle('hidden', !has || b.kind === 'pdf');
    if (has && b.kind !== 'pdf' && document.activeElement !== $('planDpi')) $('planDpi').value = b.dpi || 150;
    $('planScaleNow').innerHTML = !has ? '' : (P.scale ? '<b>' + (b.method === 'calib' ? 'Calibrated' : scaleLabel(b.N)) + '</b> · ' + (Math.round(P.scale * 100) / 100) + ' px per ft' + (b.kind === 'pdf' && b.method === 'scale' ? ' · exact from PDF page size' : '') : '<span class="text-amber-700 font-semibold">Scale not set. Lengths will not be measured.</span>');
    if (has) {
      $('planOpacity').value = Math.round((b.opacity == null ? 0.6 : b.opacity) * 100);
      $('planLock').classList.toggle('on', !!b.locked); $('planHide').classList.toggle('on', !!b.hidden);
    }
    var chip = $('planChip'); if (chip) chip.classList.toggle('hidden', !(has && !P.scale));
  }
  function planOp(fn, noUndo) { if (!P.bg) return; if (noUndo) { fn(); dirty = true; refresh(); } else mutate(fn); renderPlanPanel(); }
  function initPlan() {
    var sel = $('planScaleSel');
    sel.innerHTML = '<option value="">Pick a scale…</option>' + SCALES.map(function (s) { return '<option value="' + s[1] + '">' + s[0] + '</option>'; }).join('') + '<option value="custom">Custom…</option>';
    $('planSheet').innerHTML = '<option value="">Sheet size…</option>' + SHEETS.map(function (s, i) { return '<option value="' + i + '">' + s[0] + '</option>'; }).join('');
    $('planBtn').addEventListener('click', function () { openPlan(true); });
    $('planClose').addEventListener('click', function () { openPlan(false); });
    $('planBackdrop').addEventListener('click', function () { openPlan(false); });
    $('planImport').addEventListener('click', function () { var i = $('planFile'); i.value = ''; i.click(); });
    $('planFile').addEventListener('change', function (e) { importFile(e.target.files && e.target.files[0]); });
    $('planPageGo').addEventListener('click', function () { renderPdfPage($('planPage').value); });
    sel.addEventListener('change', function () { $('planScaleTxt').classList.toggle('hidden', sel.value !== 'custom'); });
    $('planSheet').addEventListener('change', function () { var s = SHEETS[+$('planSheet').value]; if (!s || !P.bg) return; var long = Math.max(P.bg.w, P.bg.h); $('planDpi').value = Math.round(long / s[1] * 10) / 10; });
    $('planApply').addEventListener('click', function () {
      var N = sel.value === 'custom' ? parseScale($('planScaleTxt').value) : +sel.value;
      if (!N) { planMsg(sel.value === 'custom' ? 'Could not read that scale. Try 1/8"=1\'-0" or 1:100.' : 'Pick a scale first.'); return; }
      applyScaleN(N);
    });
    $('planCalib').addEventListener('click', function () { if (!P.bg) { planMsg('Import a plan first.'); return; } startCalib(); });
    $('planCalApply').addEventListener('click', function () { var f = parseFtIn($('planKnown').value); if (!f) { planMsg('Type a distance like 12\'-6" or 12.5'); return; } applyCalib(f); $('planCalRow').classList.add('hidden'); });
    $('planOpacity').addEventListener('input', function () { if (!P.bg) return; P.bg.opacity = +$('planOpacity').value / 100; dirty = true; renderBg(); });
    $('planOpacity').addEventListener('change', function () { refresh(); });
    $('planLock').addEventListener('click', function () { planOp(function () { P.bg.locked = !P.bg.locked; }, true); toast(P.bg.locked ? 'Plan locked.' : 'Plan unlocked: drag it with the Select tool to move it.'); });
    $('planHide').addEventListener('click', function () { planOp(function () { P.bg.hidden = !P.bg.hidden; }, true); renderBg(); });
    $('planRot').addEventListener('click', function () { planOp(function () { P.bg.rot = ((P.bg.rot || 0) + 90) % 360; }); renderBg(); });
    $('planRemove').addEventListener('click', function () { if (!confirm('Remove the plan background? Undo brings it back.')) return; mutate(function () { P.bg = null; P.scale = null; }); renderBg(); renderPlanPanel(); });
    $('planChip').addEventListener('click', function () { openPlan(true); });
    renderPlanPanel();
  }

  // ---------- Snapping, Trace and Auto-route ----------
  function dd(a, b) { return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2)); }
  function nearestOnSeg(p, a, b) {
    var dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy, t = L2 ? ((p.x - a[0]) * dx + (p.y - a[1]) * dy) / L2 : 0;
    t = Math.max(0, Math.min(1, t)); return { x: a[0] + t * dx, y: a[1] + t * dy, t: t };
  }
  function drainPipes() { return P.pipes.filter(function (p) { return p.k !== 'v'; }); }
  function isDrawTool() { return tool === 'pipe' || tool === 'vent'; }
  function drawKind() { return tool === 'vent' ? 'v' : 'd'; }
  // kind 'd' looks at drain pipes, 'v' at vents, 'all' at both. Vertices of a pipe count as endpoints.
  function nearPipe(w, R, only, kind) {
    var best = null, bv = null, list = only || (kind === 'v' ? P.pipes.filter(function (p) { return p.k === 'v'; }) : kind === 'all' ? P.pipes : drainPipes());
    list.forEach(function (p) {
      var pts = pathPts(p); if (!pts) return;
      for (var k = 1; k < pts.length - 1; k++) { var dv = dd({ x: pts[k][0], y: pts[k][1] }, w); if (dv <= R * 0.8 && (!bv || dv < bv.d)) bv = { pipe: p.id, x: pts[k][0], y: pts[k][1], d: dv, seg: [pts[k - 1], pts[k]], vtx: true }; }
      for (var i = 0; i < pts.length - 1; i++) { var q = nearestOnSeg(w, pts[i], pts[i + 1]), d = dd(q, w); if (d <= R && (!best || d < best.d)) best = { pipe: p.id, x: q.x, y: q.y, d: d, seg: [pts[i], pts[i + 1]] }; }
    });
    return bv || best; // a bend vertex (endpoint snap) wins over a point on the pipe
  }
  function nearNode(w, R, vent, noFix) {
    var best = null, hit = 22 / view.s;
    P.nodes.forEach(function (n) {
      if (!vent && (n.t === 'VJ' || n.t === 'VTR')) return;
      if (noFix && isFix(n) && !FX[n.t].rec) return;
      var e = ext(n), dx = Math.abs(w.x - n.x), dy = Math.abs(w.y - n.y), d;
      // boxes: same generous target as the tap area, so a tap on a tiny symbol still lands on it
      if (isFix(n) || n.t === 'GI' || n.t === 'LOAD' || n.t === 'SEWER' || n.t === 'VTR') d = dx <= Math.max(e[0] + R / 2, hit) && dy <= Math.max(e[1] + R / 2, hit) ? Math.sqrt(dx * dx + dy * dy) * 0.5 : null;
      else d = Math.sqrt(dx * dx + dy * dy) <= R ? Math.sqrt(dx * dx + dy * dy) : null;
      if (d !== null && (!best || d < best.d)) best = { node: n.id, x: n.x, y: n.y, d: d };
    });
    return best;
  }
  function angDeg(a, b) { return Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI; }
  // Ortho / 45 deg from the previous vertex, then snap to a node (endpoint), a pipe vertex, or a
  // point on a pipe. Landing on a pipe keeps a 45/90 angle relative to that pipe.
  function snapPoint(w, prev, free, kind) {
    kind = kind || drawKind();
    var R = snapPx() / view.s, q = { x: w.x, y: w.y };
    var f0 = trace.pts[0] && trace.pts[0].node && nodeById(trace.pts[0].node);
    var nn = nearNode(w, R, kind === 'v', kind !== 'v' && prev && f0 && isFix(f0) && !FX[f0.t].rec); if (nn) { var nd = nodeById(nn.node); return { x: nn.x, y: nn.y, node: nn.node, kind: 'node', fix: isFix(nd) }; }
    var ortho = UI.ortho !== false && !free && prev;
    if (ortho) {
      var dx = w.x - prev.x, dy = w.y - prev.y, ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
      var ux = Math.cos(ang), uy = Math.sin(ang), L = dx * ux + dy * uy; q = { x: prev.x + L * ux, y: prev.y + L * uy };
      if (Math.abs(ux) < 1e-9) q.x = prev.x; if (Math.abs(uy) < 1e-9) q.y = prev.y;
    }
    var pk = kind === 'v' ? (prev ? 'v' : 'all') : 'd'; // a vent ends on vents only, never on a drain
    var np = nearPipe(w, R, null, pk) || (ortho ? nearPipe(q, R, null, pk) : null);
    if (np) {
      if (np.vtx) return { x: np.x, y: np.y, pipe: np.pipe, kind: 'pipe', vtx: true };
      if (ortho) {
        // try every 45 deg step relative to the pipe and globally; keep the hit nearest the cursor
        var s0 = np.seg[0], s1 = np.seg[1], vx = s1[0] - s0[0], vy = s1[1] - s0[1], sa = Math.atan2(vy, vx), bestHit = null;
        for (var k = 0; k < 16; k++) {
          var a2 = k < 8 ? sa + k * Math.PI / 4 : (k - 8) * Math.PI / 4, ux2 = Math.cos(a2), uy2 = Math.sin(a2), den = ux2 * vy - uy2 * vx;
          if (Math.abs(den) < 1e-9) continue;
          var t = ((s0[0] - prev.x) * vy - (s0[1] - prev.y) * vx) / den, u = ((s0[0] - prev.x) * uy2 - (s0[1] - prev.y) * ux2) / den;
          if (t <= 0 || u < 0 || u > 1) continue;
          var hit = { x: prev.x + t * ux2, y: prev.y + t * uy2 }, dh = dd(hit, w);
          if (dh <= 3 * R && (!bestHit || dh < bestHit.d)) bestHit = { x: hit.x, y: hit.y, d: dh };
        }
        if (bestHit) {
          var rel = Math.abs(((Math.atan2(bestHit.y - prev.y, bestHit.x - prev.x) - sa) * 180 / Math.PI) % 180); if (rel > 90) rel = 180 - rel;
          return { x: bestHit.x, y: bestHit.y, pipe: np.pipe, kind: 'pipe', perp: Math.abs(rel - 90) < 1 };
        }
      }
      var perp = prev ? Math.abs(((Math.atan2(np.y - prev.y, np.x - prev.x) - Math.atan2(np.seg[1][1] - np.seg[0][1], np.seg[1][0] - np.seg[0][0])) * 180 / Math.PI + 360) % 180 - 90) < 1 : false;
      return { x: np.x, y: np.y, pipe: np.pipe, kind: 'pipe', perp: perp };
    }
    if (!P.scale && !free) { q.x = Math.round(q.x / 10) * 10; q.y = Math.round(q.y / 10) * 10; if (prev && ortho) { if (Math.abs(q.x - prev.x) < 6) q.x = prev.x; if (Math.abs(q.y - prev.y) < 6) q.y = prev.y; } }
    return { x: q.x, y: q.y, kind: 'free' };
  }
  function traceHover(w, free) {
    if (calib) { calib.hover = w; renderOverlay(); return; }
    var last = trace.pts[trace.pts.length - 1];
    trace.hover = snapPoint(w, last, free); renderOverlay();
  }
  function traceClick(w, free) {
    var last = trace.pts[trace.pts.length - 1], sp = snapPoint(w, last, free);
    if (last && dd(sp, last) < 8 / view.s) { if (trace.pts.length > 1) finishTrace(); return; } // tapping the last point again ends
    trace.pts.push(sp); trace.hover = null;
    if (trace.pts.length > 1 && sp.kind !== 'free') { finishTrace(); return; } // landed on a fixture, node or pipe
    renderOverlay(); renderInspector(); syncDrawBar();
  }
  function popVertex() { trace.pts.pop(); trace.hover = null; renderOverlay(); renderInspector(); syncDrawBar(); }
  function cancelTrace() { trace.pts = []; trace.hover = null; renderOverlay(); renderInspector(); syncDrawBar(); }
  function syncDrawBar() {
    var b = $('drawBar'); if (!b) return;
    var on = isDrawTool() && trace.pts.length > 0;
    b.classList.toggle('hidden', !on);
    if (on) { var f = trace.pts[0], fn = f.node && nodeById(f.node); $('drawMsg').textContent = (tool === 'vent' ? 'Vent' : fn && isFix(fn) ? 'Branch from ' + fn.lbl : 'Main') + ' · ' + trace.pts.length + ' point' + (trace.pts.length > 1 ? 's' : '') + (fn && isFix(fn) ? ' · end it on a main' : ''); }
  }
  // Split pipe pid at (x,y) with a new junction; both pieces keep the drawn route.
  function splitPipe(pid, x, y) {
    var p = pipeById(pid); if (!p) return null;
    var a = nodeById(p.a), b = nodeById(p.b), tol = 2 / Math.max(view.s, 0.05) + 1, at = { x: x, y: y };
    if (dd(a, at) <= tol) return a.id;
    if (dd(b, at) <= tol) return b.id;
    var pts = pathPts(p), bi = 0, bd = 1e18;
    for (var i = 0; i < pts.length - 1; i++) { var q = nearestOnSeg(at, pts[i], pts[i + 1]), d = dd(q, at); if (d < bd - 1e-9) { bd = d; bi = i; } }
    var inner = pts.slice(1, -1).map(function (q) { return [q[0], q[1]]; });
    // a vertex at the split point is dropped (the junction takes its place)
    var v1 = inner.slice(0, bi), v2 = inner.slice(bi);
    if (v1.length && dd({ x: v1[v1.length - 1][0], y: v1[v1.length - 1][1] }, at) <= tol) v1.pop();
    if (v2.length && dd({ x: v2[0][0], y: v2[0][1] }, at) <= tol) v2.shift();
    var jt = p.k === 'v' ? 'VJ' : 'J';
    var j = { id: uid(), t: jt, x: x, y: y, lbl: nextLabel(jt), p: {} }; P.nodes.push(j);
    var np = newPipe(j.id, p.b, p.k); np.role = p.role; np.ug = p.ug; np.force = p.force; if (p.br) np.br = 1;
    p.v = v1; np.v = v2; delete p.st; delete p.vf; delete np.st; delete np.vf;
    if (p.len) { p.len = ''; }
    p.b = j.id; P.pipes.push(np);
    return j.id;
  }
  function isNet(n) { return n.t === 'SEWER' || n.t === 'GI' || !!downOf(n.id) || P.pipes.some(function (q) { return q.k !== 'v' && q.b === n.id; }); }
  // Tie-in fitting for a branch entering a main at junction jid; dirIn = flow direction of the
  // incoming leg (unit-ish vector). The main's direction is its flow (a->b) at the junction.
  function tieFitting(jid, dirIn) {
    var j = nodeById(jid); if (!j || j.t !== 'J') return;
    var out = downOf(jid), mp = out ? pathPts(out) : null;
    if (!mp) { var inn = P.pipes.filter(function (q) { return q.k !== 'v' && q.b === jid; })[0]; mp = inn ? pathPts(inn).slice(-2) : null; }
    if (!mp) return;
    var m0 = out ? mp[0] : mp[0], m1 = out ? mp[1] : mp[1], mx = m1[0] - m0[0], my = m1[1] - m0[1];
    var ang = Math.acos(Math.max(-1, Math.min(1, (dirIn[0] * mx + dirIn[1] * my) / (Math.hypot(dirIn[0], dirIn[1]) * Math.hypot(mx, my) || 1)))) * 180 / Math.PI;
    var a = Math.round(ang);
    j.p.fit = { ang: a, type: a <= 60 ? 'wye' : a <= 120 ? 'tee90' : 'against' };
  }
  function legDir(fromPt, toPt) { return [toPt[0] - fromPt[0], toPt[1] - fromPt[1]]; }
  function finishTrace() {
    var pts = trace.pts.slice(), kind = drawKind(); trace.pts = []; trace.hover = null; syncDrawBar();
    if (pts.length < 2) { renderOverlay(); renderInspector(); return; }
    snapshot(); var keep = undoStack[undoStack.length - 1];
    try {
      var tol = 3 / Math.max(view.s, 0.05) + 1;
      function resolve(v, end) {
        if (v.node) return v.node;
        if (v.pipe) { var np = nearPipe(v, tol, null, kind === 'v' ? 'all' : 'd'); if (np) return splitPipe(np.pipe, Math.round(np.x * 10) / 10, Math.round(np.y * 10) / 10); }
        var jt = kind === 'v' ? 'VJ' : 'J', j = { id: uid(), t: jt, x: Math.round(v.x * 10) / 10, y: Math.round(v.y * 10) / 10, lbl: nextLabel(jt), p: {} }; P.nodes.push(j); return j.id;
      }
      var s = pts[0], e = pts[pts.length - 1];
      var aId = resolve(s), bId = resolve(e);
      if (aId === bId) throw new Error('Start and end are the same point.');
      var A = nodeById(aId), B = nodeById(bId), inner = pts.slice(1, -1).map(function (q) { return [Math.round(q.x * 10) / 10, Math.round(q.y * 10) / 10]; });
      var fwd;
      if (kind === 'v') fwd = !(A.t === 'VTR' || (s.kind === 'free' && e.kind !== 'free' && B.t !== 'VTR' && B.t !== 'VJ'));
      else {
        // Deterministic flow: fixtures drain out, the sewer only receives, a node that already drains
        // can only receive more; otherwise the line flows the way it was drawn. A line started on the
        // loose downstream end of another line continues it; one ending there (from empty space) is a
        // backwards-drawn extension and is turned to continue it.
        var fix = function (n) { return isFix(n) && !FX[n.t].rec; };
        var hasUp = function (id) { return P.pipes.some(function (q) { return q.k !== 'v' && q.b === id; }); };
        var dA = !!downOf(aId), dB = !!downOf(bId);
        if (fix(A)) fwd = true; else if (fix(B)) fwd = false;
        else if (A.t === 'SEWER') fwd = false; else if (B.t === 'SEWER') fwd = true;
        else if (dA && !dB) fwd = false; else if (dB && !dA) fwd = true;
        else if (dA && dB) throw new Error('Both ends already drain somewhere. Connect one end to a loose end, a fixture or the sewer.');
        else if (!hasUp(aId) && hasUp(bId) && s.kind === 'free') fwd = false;
        else fwd = true;
      }
      var up = fwd ? aId : bId, dn = fwd ? bId : aId, v = fwd ? inner : inner.slice().reverse();
      var err = kind === 'v' ? canVent(nodeById(up), nodeById(dn)) : canDrain(nodeById(up), nodeById(dn));
      if (err) throw new Error(err);
      var pp = newPipe(up, dn, kind); pp.v = v; if (kind === 'd' && isFix(nodeById(up))) pp.br = 1;
      P.pipes.push(pp);
      var path = pathPts(pp);
      var endedOnPipe = fwd ? e.kind === 'pipe' : s.kind === 'pipe';
      if (kind === 'd' && endedOnPipe) tieFitting(dn, legDir(path[path.length - 2], path[path.length - 1]));
      var tied = heal();
      dirty = true; refresh();
      pp = pipeById(pp.id) || pp;
      var tot = geomLen(pp), bends = bendCount(pathPts(pp) || path);
      var dnN = nodeById(dn), fitTxt = dnN && dnN.p && dnN.p.fit ? ' · ' + fitName(dnN.p.fit) + ' at ' + dnN.lbl : '';
      toast((kind === 'v' ? 'Vent' : pp.br ? 'Branch' : 'Main') + ' drawn' + (P.scale ? ', ' + fmtFtIn(Math.round(tot / P.scale * 12)) : '') + (bends.n45 + bends.n90 ? ' · ' + bendText(bends) : '') + fitTxt + (tied ? ' · tied in ' + tied + ' loose end' + (tied > 1 ? 's' : '') : '') + '.');
    } catch (ex) {
      if (undoStack[undoStack.length - 1] === keep) { P = JSON.parse(undoStack.pop()); }
      toast(ex.message || String(ex)); refresh();
    }
  }
  function bendCount(pts) {
    var o = { n45: 0, n90: 0, other: 0 };
    for (var i = 1; i < pts.length - 1; i++) {
      var a1 = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]), a2 = Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]);
      var t = Math.abs(((a2 - a1) * 180 / Math.PI + 540) % 360 - 180);
      if (t < 2) continue; if (Math.abs(t - 45) < 3) o.n45++; else if (Math.abs(t - 90) < 3) o.n90++; else o.other++;
    }
    return o;
  }
  function bendText(b) { var t = []; if (b.n90) t.push(b.n90 + ' × ¼ bend'); if (b.n45) t.push(b.n45 + ' × ⅛ bend'); if (b.other) t.push(b.other + ' other'); return t.join(', '); }
  function fitName(f) { return f.type === 'wye' ? '45° wye' : f.type === 'tee90' ? '90° tie-in (combo wye & ⅛ bend)' : 'enters against flow (' + f.ang + '°)'; }
  // Flip the flow of a pipe and the straight run it belongs to (through plain junctions, not fixture branches).
  // Mark (or clear) combination waste & vent on a pipe and every drain pipe upstream of it.
  function cwvRun(pid) {
    var p0 = pipeById(pid); if (!p0 || p0.k === 'v') return;
    var on = !p0.cwv, seen = {}, list = [p0], n = 0;
    mutate(function () {
      while (list.length) {
        var q = list.pop(); if (seen[q.id]) continue; seen[q.id] = 1; n++;
        if (on) q.cwv = 1; else delete q.cwv;
        P.pipes.forEach(function (u) { if (u.k !== 'v' && u.b === q.a && !seen[u.id]) list.push(u); });
      }
    });
    toast(n + ' pipe' + (n > 1 ? 's' : '') + (on ? ' marked combination waste & vent (UPC 910): sized 2 pipe sizes up, trap-arm/vent checks replaced by 910 checks.' : ' back to conventional drainage.'));
  }
  function flipRun(pid) {
    var p0 = pipeById(pid); if (!p0) return;
    var run = {}; run[pid] = 1; var stack = [p0];
    var isBranch = function (q) { var r = R.pipe[q.id]; return q.br || isFix(nodeById(q.a)) || isFix(nodeById(q.b)) || (r && r.role === 'arm'); };
    if (!isBranch(p0)) while (stack.length) {
      var p = stack.pop();
      [p.a, p.b].forEach(function (nid) {
        var n = nodeById(nid); if (!n || n.t !== 'J') return;
        var nb = P.pipes.filter(function (q) { return q.k === p0.k && !run[q.id] && (q.a === nid || q.b === nid) && !isBranch(q); });
        if (nb.length === 1) { run[nb[0].id] = 1; stack.push(nb[0]); }
      });
    }
    snapshot(); var keep = undoStack[undoStack.length - 1];
    Object.keys(run).forEach(function (id) { var q = pipeById(id), t = q.a; q.a = q.b; q.b = t; if (Array.isArray(q.v)) q.v.reverse(); delete q.vf; });
    // valid only if no node now drains two ways, no fixture receives flow, and no loop
    var bad = '', outs = {};
    P.pipes.forEach(function (q) { if (q.k !== p0.k) return; if (outs[q.a]) bad = (nodeById(q.a) || {}).lbl + ' would drain two ways'; outs[q.a] = 1; var bn = nodeById(q.b); if (q.k === 'd' && isFix(bn) && !FX[bn.t].rec) bad = 'a fixture would receive flow'; });
    if (!bad) P.nodes.forEach(function (n) { var cur = n.id, g = 0, seen = {}; while (cur && g++ < 2000) { if (seen[cur]) { bad = 'it would make a loop'; break; } seen[cur] = 1; var d = P.pipes.filter(function (q) { return q.k === p0.k && q.a === cur; })[0]; cur = d ? d.b : null; } });
    if (bad) { if (undoStack[undoStack.length - 1] === keep) P = JSON.parse(undoStack.pop()); toast('Can\'t flip: ' + bad + '.'); refresh(); return; }
    // tie-in fittings along the run depend on the main's direction
    P.nodes.forEach(function (n) { if (n.p && n.p.fit) { var br = P.pipes.filter(function (q) { return q.k === 'd' && q.b === n.id && q.br; })[0]; if (br) { var bp = pathPts(br); tieFitting(n.id, legDir(bp[bp.length - 2], bp[bp.length - 1])); } } });
    dirty = true; refresh(); toast('Flow flipped on ' + Object.keys(run).length + ' segment' + (Object.keys(run).length > 1 ? 's' : '') + '.');
  }
  // AutoCAD-style grips on the selected pipe: squares at both ends and every bend.
  function drawGrips(p, k) {
    var pts = pathPts(p); if (!pts) return;
    var g = gripDrag && gripDrag.pid === p.id ? gripDrag : null;
    if (g && g.moved) {
      var pv = pts.map(function (q) { return [q[0], q[1]]; }); pv[g.idx] = [g.pos.x, g.pos.y];
      el('polyline', { points: pv.map(function (q) { return q[0] + ',' + q[1]; }).join(' '), fill: 'none', stroke: '#4f46e5', 'stroke-width': 2.5 * k, 'stroke-dasharray': (7 * k) + ' ' + (4 * k), 'pointer-events': 'none' }, gOv);
      var sp = g.snap;
      if (sp && sp.kind !== 'free') { var S = 8 * k; if (sp.kind === 'node' && sp.fix) el('circle', { cx: sp.x, cy: sp.y, r: 11 * k, fill: 'none', stroke: '#059669', 'stroke-width': 2.5 * k, 'data-snap': 'node', 'pointer-events': 'none' }, gOv); else if (sp.kind === 'node' || sp.vtx) el('rect', { x: sp.x - S, y: sp.y - S, width: 2 * S, height: 2 * S, fill: 'none', stroke: '#059669', 'stroke-width': 2.5 * k, 'data-snap': 'end', 'pointer-events': 'none' }, gOv); else el('path', { d: 'M' + sp.x + ' ' + (sp.y - S * 1.1) + ' L' + (sp.x + S) + ' ' + (sp.y + S * 0.7) + ' L' + (sp.x - S) + ' ' + (sp.y + S * 0.7) + ' Z', fill: 'none', stroke: '#d97706', 'stroke-width': 2.5 * k, 'data-snap': 'on', 'pointer-events': 'none' }, gOv); }
    }
    var hit = (lastPtr === 'touch' ? 22 : 12) * k, sz = 5 * k;
    pts.forEach(function (q, i) {
      var end = i === 0 || i === pts.length - 1, x = g && g.moved && g.idx === i ? g.pos.x : q[0], y = g && g.moved && g.idx === i ? g.pos.y : q[1];
      var gg = el('g', { 'data-grip': p.id + ':' + i, style: 'cursor:move', 'pointer-events': 'all' }, gOv);
      el('rect', { x: x - hit, y: y - hit, width: 2 * hit, height: 2 * hit, fill: 'transparent' }, gg);
      el('rect', { x: x - sz, y: y - sz, width: 2 * sz, height: 2 * sz, fill: end ? '#4f46e5' : '#fff', stroke: end ? '#fff' : '#4f46e5', 'stroke-width': 1.5 * k }, gg);
    });
  }
  function renderOverlay() {
    if (!gOv) return;
    while (gOv.firstChild) gOv.removeChild(gOv.firstChild);
    var k = 1 / view.s;
    if (calib) {
      var cp = calib.pts.slice(); if (cp.length === 1 && calib.hover) cp.push(calib.hover);
      if (cp.length === 2) el('line', { x1: cp[0].x, y1: cp[0].y, x2: cp[1].x, y2: cp[1].y, stroke: '#db2777', 'stroke-width': 2 * k, 'stroke-dasharray': (6 * k) + ' ' + (4 * k) }, gOv);
      calib.pts.forEach(function (q) { el('circle', { cx: q.x, cy: q.y, r: 6 * k, fill: 'none', stroke: '#db2777', 'stroke-width': 2 * k }, gOv); el('circle', { cx: q.x, cy: q.y, r: 1.5 * k, fill: '#db2777' }, gOv); });
      return;
    }
    if (tool === 'select' && sel && sel.kind === 'pipe' && pipeById(sel.id)) { drawGrips(pipeById(sel.id), k); return; }
    if (!isDrawTool()) return;
    var col = tool === 'vent' ? '#059669' : '#4f46e5';
    var pts = trace.pts.slice(), hv = trace.hover;
    if (pts.length) {
      var all = hv ? pts.concat([hv]) : pts;
      el('polyline', { points: pts.map(function (q) { return q.x + ',' + q.y; }).join(' '), fill: 'none', stroke: col, 'stroke-width': 3 * k, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, gOv);
      if (hv) { var l0 = pts[pts.length - 1]; el('line', { x1: l0.x, y1: l0.y, x2: hv.x, y2: hv.y, stroke: col, 'stroke-width': 2.5 * k, 'stroke-dasharray': (8 * k) + ' ' + (5 * k), 'stroke-linecap': 'round' }, gOv); }
      pts.forEach(function (q, i) { el('circle', { cx: q.x, cy: q.y, r: (i === pts.length - 1 ? 6 : 4.5) * k, fill: i === pts.length - 1 ? '#fff' : col, stroke: col, 'stroke-width': 2 * k }, gOv); });
      if (hv) {
        var l = pts[pts.length - 1], mx = (l.x + hv.x) / 2, my = (l.y + hv.y) / 2, a = Math.round(((-angDeg(l, hv)) + 360) % 360);
        var tx = (P.scale ? fmtFtIn(Math.round(dd(l, hv) / P.scale * 12)) + ' · ' : '') + a + '°';
        var tot = 0; for (var i = 1; i < all.length; i++) tot += dd(all[i - 1], all[i]);
        if (P.scale && all.length > 2) tx += ' (run ' + fmtFtIn(Math.round(tot / P.scale * 12)) + ')';
        txt(gOv, { x: mx, y: my - 9 * k, 'font-size': 12 * k, 'font-weight': 700, fill: '#312e81', stroke: '#fff', 'stroke-width': 3.5 * k, 'paint-order': 'stroke', 'text-anchor': 'middle' }, tx);
      }
    }
    if (hv) {
      var S = 7 * k, g = el('g', { 'pointer-events': 'none' }, gOv);
      if (hv.kind === 'node' && hv.fix) el('circle', { cx: hv.x, cy: hv.y, r: 11 * k, fill: 'none', stroke: '#059669', 'stroke-width': 2.5 * k }, g);
      else if (hv.kind === 'node' || hv.vtx) el('rect', { x: hv.x - S, y: hv.y - S, width: 2 * S, height: 2 * S, fill: 'none', stroke: '#059669', 'stroke-width': 2.5 * k, 'data-snap': 'end' }, g);
      else if (hv.kind === 'pipe' && hv.perp) { el('path', { d: 'M' + (hv.x - S) + ' ' + (hv.y + S) + ' H' + (hv.x + S) + ' M' + hv.x + ' ' + (hv.y + S) + ' V' + (hv.y - S), fill: 'none', stroke: '#d97706', 'stroke-width': 2.5 * k, 'data-snap': 'perp' }, g); }
      else if (hv.kind === 'pipe') el('path', { d: 'M' + hv.x + ' ' + (hv.y - S * 1.1) + ' L' + (hv.x + S) + ' ' + (hv.y + S * 0.7) + ' L' + (hv.x - S) + ' ' + (hv.y + S * 0.7) + ' Z', fill: 'none', stroke: '#d97706', 'stroke-width': 2.5 * k, 'data-snap': 'on' }, g);
      else el('circle', { cx: hv.x, cy: hv.y, r: 3.5 * k, fill: col }, g);
    }
  }

  // ---- Auto-route: every unconnected fixture to the nearest point on a main/branch ----
  function lineRun(pid) {
    // pipes collinear with pid, joined through junctions
    var set = {}, stack = [pid];
    function dirOf(p) { var pts = pathPts(p); if (!pts || pts.length !== 2) return null; return Math.abs(pts[0][1] - pts[1][1]) < 1 ? ['h', pts[0][1]] : Math.abs(pts[0][0] - pts[1][0]) < 1 ? ['v', pts[0][0]] : null; }
    var d0 = dirOf(pipeById(pid)); set[pid] = 1;
    if (!d0) return set;
    while (stack.length) {
      var p = pipeById(stack.pop());
      [p.a, p.b].forEach(function (nid) {
        var n = nodeById(nid); if (!n || n.t !== 'J') return;
        drainPipes().forEach(function (q) { if (set[q.id] || (q.a !== nid && q.b !== nid)) return; var d = dirOf(q); if (d && d[0] === d0[0] && Math.abs(d[1] - d0[1]) < 1 && !isFix(nodeById(q.a))) { set[q.id] = 1; stack.push(q.id); } });
      });
    }
    return set;
  }
  function autoRoute(mode) {
    var selPipe = sel && sel.kind === 'pipe' ? pipeById(sel.id) : null;
    if (mode === 'selected' && (!selPipe || selPipe.k === 'v')) { toast('Select a main or branch pipe first, or use Nearest line.'); return; }
    var fixtures = P.nodes.filter(function (n) { return isFix(n) && !FX[n.t].gpm && !downOf(n.id); });
    if (!fixtures.length) { toast('Every fixture is already connected.'); return; }
    var isArmPipe = function (p) { var r = R.pipe[p.id]; return isFix(nodeById(p.a)) || (r && r.role === 'arm'); };
    var cand = mode === 'selected' ? lineRun(selPipe.id) : null;
    if (!cand) { cand = {}; drainPipes().forEach(function (p) { if (!isArmPipe(p) && (R.pipe[p.id] || {}).role !== 'stack') cand[p.id] = 1; }); }
    if (!Object.keys(cand).length) { toast('Draw a main or branch first (Trace or Pipe tool), then Auto-route.'); return; }
    snapshot(); var keep = undoStack[undoStack.length - 1];
    var made = {}, n = 0, skipped = [];
    fixtures.sort(function (a, b) { return a.x - b.x || a.y - b.y; }).forEach(function (f) {
      var best = null;
      Object.keys(cand).forEach(function (pid) {
        var p = pipeById(pid), pts = p && pathPts(p); if (!pts) return;
        for (var i = 0; i < pts.length - 1; i++) { var q = nearestOnSeg(f, pts[i], pts[i + 1]), d = dd(q, f); if (!best || d < best.d) best = { pid: pid, x: q.x, y: q.y, d: d }; }
      });
      if (!best) { skipped.push(f.lbl); return; }
      var before = P.pipes.length, jid = splitPipe(best.pid, Math.round(best.x * 10) / 10, Math.round(best.y * 10) / 10);
      P.pipes.slice(before).forEach(function (q) { if (cand[best.pid]) cand[q.id] = 1; made[q.id] = 1; });
      var err = canDrain(f, nodeById(jid)); if (err) { skipped.push(f.lbl); return; }
      var arm = newPipe(f.id, jid, 'd'); var jn = nodeById(jid);
      if (Math.abs(jn.x - f.x) > 0.5 && Math.abs(jn.y - f.y) > 0.5) arm.vf = Math.abs(best.y - f.y) >= Math.abs(best.x - f.x) ? 1 : 0;
      P.pipes.push(arm); made[arm.id] = 1; n++;
    });
    if (!n) { if (undoStack[undoStack.length - 1] === keep) P = JSON.parse(undoStack.pop()); toast('Nothing could be routed' + (skipped.length ? ': ' + skipped.join(', ') : '') + '.'); refresh(); return; }
    dirty = true; routeNew = made; routeCtx = { mode: mode, sel: selPipe ? selPipe.id : null, keep: keep, n: n };
    refresh();
    var over = P.pipes.filter(function (p) { var r = R.pipe[p.id]; return made[p.id] && r && r.role === 'arm' && r.armOK === false; }).length;
    showRouteBar('Auto-routed ' + n + ' fixture' + (n > 1 ? 's' : '') + ' to the ' + (mode === 'selected' ? 'selected line' : 'nearest line') + '.' + (over ? ' ' + over + ' arm' + (over > 1 ? 's exceed' : ' exceeds') + ' Table 1002.2.' : '') + (skipped.length ? ' Skipped: ' + skipped.join(', ') + '.' : '') + (P.scale ? '' : ' No plan scale, so arm lengths are not checked.'));
  }
  function showRouteBar(msg) { var b = $('routeBar'); $('routeMsg').textContent = msg; b.classList.remove('hidden'); $('routeMode').value = routeCtx ? routeCtx.mode : 'nearest'; }
  function hideRouteBar() { $('routeBar').classList.add('hidden'); routeNew = null; routeCtx = null; render(); }
  function undoRoute() { if (routeCtx && undoStack[undoStack.length - 1] === routeCtx.keep) { P = JSON.parse(undoStack.pop()); dirty = true; } var c = routeCtx; hideRouteBar(); refresh(); return c; }
  function initRoute() {
    $('routeBtn').addEventListener('click', function () { if (routeCtx) undoRoute(); autoRoute(sel && sel.kind === 'pipe' && pipeById(sel.id) && pipeById(sel.id).k !== 'v' ? 'selected' : 'nearest'); });
    $('routeAccept').addEventListener('click', function () { var n = routeCtx ? routeCtx.n : 0; hideRouteBar(); toast('Kept ' + n + ' routed arm' + (n === 1 ? '' : 's') + '. Undo still works.'); });
    $('routeUndo').addEventListener('click', function () { undoRoute(); toast('Auto-route undone.'); });
    $('routeMode').addEventListener('change', function () { var c = undoRoute(); if (c && c.sel) sel = { kind: 'pipe', id: c.sel }; autoRoute($('routeMode').value); });
    $('orthoBtn').addEventListener('click', function () { UI.ortho = UI.ortho === false; saveUI(); syncOrtho(); });
    syncOrtho();
  }
  function syncOrtho() { var b = $('orthoBtn'); if (b) b.setAttribute('aria-pressed', UI.ortho !== false ? 'true' : 'false'); }

  // ---------- Topology: connect / heal / grips ----------
  var lastPtr = 'mouse';
  function snapPx() { return lastPtr === 'touch' ? 22 : 18; }
  function drainAt(nid) { return P.pipes.filter(function (q) { return q.k !== 'v' && (q.a === nid || q.b === nid); }); }
  function netError(kind) {
    var outs = {}, bad = '';
    P.pipes.forEach(function (q) {
      if ((q.k === 'v') !== (kind === 'v')) return;
      if (q.a === q.b) bad = 'a pipe would start and end on the same point';
      if (outs[q.a]) bad = ((nodeById(q.a) || {}).lbl || 'a node') + ' would drain two ways'; outs[q.a] = 1;
      var bn = nodeById(q.b);
      if (kind !== 'v' && isFix(bn) && !FX[bn.t].rec) bad = 'a fixture would receive flow';
      if (kind !== 'v' && bn && (bn.t === 'VTR' || bn.t === 'VJ')) bad = 'a drain would run into a vent';
    });
    if (bad) return bad;
    var seenAll = {};
    P.nodes.forEach(function (n) {
      if (bad || seenAll[n.id]) return;
      var cur = n.id, g = 0, seen = {};
      while (cur && g++ < 3000) { if (seen[cur]) { bad = 'it would make a loop'; return; } seen[cur] = 1; seenAll[cur] = 1; var d = null; for (var i = 0; i < P.pipes.length; i++) { var q = P.pipes[i]; if (((q.k === 'v') === (kind === 'v')) && q.a === cur) { d = q; break; } } cur = d ? d.b : null; }
    });
    return bad;
  }
  // The chain of pipes from node nid through plain 2-way junctions (a loose line hanging off nid).
  function chainFrom(nid, firstPipe) {
    var out = [firstPipe], cur = firstPipe, at = nid, g = 0;
    while (g++ < 500) {
      var far = cur.a === at ? cur.b : cur.a, fn = nodeById(far);
      if (!fn || fn.t !== 'J') break;
      var nb = drainAt(far).filter(function (q) { return q !== cur; });
      if (nb.length !== 1 || P.pipes.some(function (q) { return q.k === 'v' && (q.a === far || q.b === far); })) break;
      out.push(nb[0]); at = far; cur = nb[0];
    }
    return out;
  }
  function reversePipe(q) { var t = q.a; q.a = q.b; q.b = t; if (Array.isArray(q.v)) q.v.reverse(); else { var pts = pathPts(q); q.v = pts ? pts.slice(1, -1).reverse().map(function (z) { return [z[0], z[1]]; }) : []; delete q.vf; delete q.st; } }
  function ensureV(q) { if (!Array.isArray(q.v)) { var pts = pathPts(q); q.v = pts ? pts.slice(1, -1).map(function (z) { return [z[0], z[1]]; }) : []; delete q.vf; delete q.st; } }
  function lastLegInto(q) { var pts = pathPts(q); return legDir(pts[pts.length - 2], pts[pts.length - 1]); }
  // Merge loose junction nid into a target: { node: id } or { pipe: id, x, y } (split there).
  // Fixes flow so the loose line drains into the target when the target already drains.
  // Returns '' on success or an error (and leaves P unchanged).
  function mergeInto(nid, target) {
    var saved = JSON.stringify(P);
    try {
      var n = nodeById(nid); if (!n) throw new Error('gone');
      var own = drainAt(nid)[0]; if (!own) throw new Error('nothing attached');
      var mid = target.node;
      if (!mid && target.pipe) mid = splitPipe(target.pipe, Math.round(target.x * 10) / 10, Math.round(target.y * 10) / 10);
      if (!mid || mid === nid) throw new Error('nothing to connect to');
      var m = nodeById(mid), fixM = isFix(m) && !FX[m.t].rec;
      if (fixM && own.b === nid) chainFrom(nid, own).forEach(reversePipe); // a fixture only drains out
      P.pipes.forEach(function (q) { if (q.a === nid) q.a = mid; if (q.b === nid) q.b = mid; });
      P.nodes = P.nodes.filter(function (x) { return x.id !== nid; });
      // the joined line flowed away from here but the target already drains: turn the line so it drains in
      if (!fixM && own.a === mid && P.pipes.filter(function (q) { return q.k !== 'v' && q.a === mid; }).length > 1) chainFrom(mid, own).forEach(reversePipe);
      var err = netError('d'); if (err) throw new Error(err);
      if (m.t === 'J' && own.b === mid && downOf(mid) && P.pipes.filter(function (q) { return q.k !== 'v' && q.b === mid; }).length >= 2) tieFitting(mid, lastLegInto(own));
      return '';
    } catch (e) { P = JSON.parse(saved); return e.message || String(e); }
  }
  // Two pipes meeting at a plain junction (one in, one out, nothing else): join them back into one.
  function healJoint(nid) {
    var n = nodeById(nid); if (!n || n.t !== 'J') return false;
    var at = drainAt(nid); if (at.length !== 2) return false;
    if (P.pipes.some(function (q) { return q.k === 'v' && (q.a === nid || q.b === nid); })) return false;
    var q1 = at.filter(function (q) { return q.b === nid; })[0], q2 = at.filter(function (q) { return q.a === nid; })[0];
    if (!q1 || !q2 || q1.br || isFix(nodeById(q1.a))) return false;
    ensureV(q1); ensureV(q2);
    var p0 = q1.v.length ? q1.v[q1.v.length - 1] : [nodeById(q1.a).x, nodeById(q1.a).y], p2 = q2.v.length ? q2.v[0] : [nodeById(q2.b).x, nodeById(q2.b).y];
    var cross = (n.x - p0[0]) * (p2[1] - n.y) - (n.y - p0[1]) * (p2[0] - n.x), straight = Math.abs(cross) < 1e-6 * (1 + Math.hypot(n.x - p0[0], n.y - p0[1]) * Math.hypot(p2[0] - n.x, p2[1] - n.y));
    q1.v = q1.v.concat(straight ? [] : [[n.x, n.y]]).concat(q2.v); q1.b = q2.b; q1.len = ''; if (q2.main) q1.main = 1;
    P.pipes = P.pipes.filter(function (q) { return q !== q2; }); P.nodes = P.nodes.filter(function (x) { return x.id !== nid; });
    return true;
  }
  // Any loose junction (one drain pipe) within snap distance of another node or pipe gets connected.
  function heal(onlyIds) {
    var tol = snapPx() / view.s, made = 0, skip = {}, g = 0;
    while (g++ < 80) {
      var did = false;
      for (var i = 0; i < P.nodes.length && !did; i++) {
        var n = P.nodes[i];
        if (n.t !== 'J' || skip[n.id] || (onlyIds && !onlyIds[n.id])) continue;
        var mine = drainAt(n.id); if (mine.length !== 1) continue;
        if (P.pipes.some(function (q) { return q.k === 'v' && (q.a === n.id || q.b === n.id); })) continue;
        var own = mine[0], other = own.a === n.id ? own.b : own.a, tgt = null, bd = 1e18;
        P.nodes.forEach(function (m) {
          if (m.id === n.id || m.id === other || m.t === 'VJ' || m.t === 'VTR' || (isFix(m) && !FX[m.t].rec)) return;
          var d = dd(m, n), e = ext(m), inBox = (m.t !== 'J') && Math.abs(m.x - n.x) <= e[0] + tol / 2 && Math.abs(m.y - n.y) <= e[1] + tol / 2;
          if ((d <= tol || inBox) && d < bd) { bd = d; tgt = { node: m.id }; }
        });
        if (!tgt) drainPipes().forEach(function (q) {
          if (q === own || q.a === n.id || q.b === n.id) return;
          var pts = pathPts(q); if (!pts) return;
          for (var s = 0; s < pts.length - 1; s++) { var pr = nearestOnSeg(n, pts[s], pts[s + 1]), d = dd(pr, n); if (d <= tol && d < bd) { bd = d; tgt = { pipe: q.id, x: pr.x, y: pr.y }; } }
        });
        if (!tgt) { skip[n.id] = 1; continue; }
        var err = mergeInto(n.id, tgt);
        if (err) skip[n.id] = 1; else { made++; did = true; }
      }
      if (!did) break;
    }
    return made;
  }
  // ---- network / main ----
  function networks() {
    var comp = {}, id = 0, adj = {};
    P.pipes.forEach(function (q) { if (q.k === 'v') return; (adj[q.a] = adj[q.a] || []).push(q); (adj[q.b] = adj[q.b] || []).push(q); });
    var info = [];
    P.pipes.forEach(function (q) {
      if (q.k === 'v' || comp[q.id] !== undefined) return;
      var c = { id: id++, pipes: [], nodes: {}, len: 0, sewer: false, main: false }, st = [q]; comp[q.id] = c.id;
      while (st.length) {
        var p = st.pop(); c.pipes.push(p.id); c.len += geomLen(p); if (p.main) c.main = true;
        [p.a, p.b].forEach(function (nid) { c.nodes[nid] = 1; var nn = nodeById(nid); if (nn && nn.t === 'SEWER') c.sewer = true; if (nn && isFix(nn) && !FX[nn.t].rec && nid === p.a) return; (adj[nid] || []).forEach(function (o) { if (comp[o.id] === undefined) { comp[o.id] = c.id; st.push(o); } }); });
      }
      info.push(c);
    });
    var main = info.filter(function (c) { return c.sewer; })[0] || info.filter(function (c) { return c.main; })[0] || info.slice().sort(function (a, b) { return b.len - a.len; })[0] || null;
    return { comp: comp, list: info, main: main };
  }
  function orthoFrom(w, prev, free) {
    var q = { x: w.x, y: w.y };
    if (prev && UI.ortho !== false && !free) {
      var dx = w.x - prev.x, dy = w.y - prev.y, ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4), ux = Math.cos(ang), uy = Math.sin(ang), L = dx * ux + dy * uy;
      q = { x: prev.x + L * ux, y: prev.y + L * uy }; if (Math.abs(ux) < 1e-9) q.x = prev.x; if (Math.abs(uy) < 1e-9) q.y = prev.y;
    }
    return q;
  }
  // ---- grips (Select tool) ----
  var gripDrag = null;
  function gripPts(p) { return pathPts(p) || []; }
  function startGrip(e, pid, idx, w) {
    var p = pipeById(pid); if (!p) return false;
    gripDrag = { pid: pid, idx: idx, n: gripPts(p).length, sx: e.clientX, sy: e.clientY, moved: false, pos: w, snap: null, ptr: e.pointerId };
    try { svg.setPointerCapture(e.pointerId); } catch (x) {}
    return true;
  }
  function moveGrip(e) {
    var g = gripDrag; if (!g) return;
    if (!g.moved && Math.abs(e.clientX - g.sx) + Math.abs(e.clientY - g.sy) <= (lastPtr === 'touch' ? 10 : 4)) return;
    g.moved = true;
    var p = pipeById(g.pid), pts = gripPts(p), w = toWorld(e), end = g.idx === 0 || g.idx === pts.length - 1;
    var nb = pts[g.idx === 0 ? 1 : g.idx - 1], prev = nb ? { x: nb[0], y: nb[1] } : null;
    var R = snapPx() / view.s, sp = null;
    if (end && p.k !== 'v') {
      // look for something to connect to, ignoring the pipe itself and the node it hangs from
      var own = g.idx === 0 ? p.a : p.b, nn = null, bd = 1e18;
      P.nodes.forEach(function (m) { if (m.id === own || m.t === 'VJ' || m.t === 'VTR') return; if (isFix(m) && !FX[m.t].rec && g.idx !== 0) return; var e2 = ext(m), d = dd(m, w), box = m.t !== 'J' && Math.abs(m.x - w.x) <= Math.max(e2[0], 22 / view.s) && Math.abs(m.y - w.y) <= Math.max(e2[1], 22 / view.s); if ((d <= R || box) && d < bd) { bd = d; nn = m; } });
      if (nn) sp = { x: nn.x, y: nn.y, node: nn.id, kind: 'node', fix: isFix(nn) };
      else {
        var cand = drainPipes().filter(function (q) { return q.id !== p.id; }), np = nearPipe(w, R, cand, 'd');
        if (np) sp = { x: np.x, y: np.y, pipe: np.pipe, kind: 'pipe', vtx: np.vtx };
      }
    }
    if (!sp) { var o = orthoFrom(w, prev, !!e.shiftKey); sp = { x: o.x, y: o.y, kind: 'free' }; }
    g.pos = { x: sp.x, y: sp.y }; g.snap = sp;
    renderOverlay();
  }
  function endGrip() {
    var g = gripDrag; gripDrag = null; if (!g) return;
    if (!g.moved) { renderOverlay(); return; }
    var p = pipeById(g.pid); if (!p) { refresh(); return; }
    snapshot(); var keep = undoStack[undoStack.length - 1], saved = JSON.stringify(P);
    var pts = gripPts(p), last = pts.length - 1, msg = '';
    if (g.idx > 0 && g.idx < last) {
      ensureV(p); p.v[g.idx - 1] = [Math.round(g.pos.x * 10) / 10, Math.round(g.pos.y * 10) / 10]; p.len = '';
      msg = 'Bend moved.';
    } else {
      ensureV(p);
      var endKey = g.idx === 0 ? 'a' : 'b', oldN = p[endKey], jt = p.k === 'v' ? 'VJ' : 'J';
      var j = { id: uid(), t: jt, x: Math.round(g.pos.x * 10) / 10, y: Math.round(g.pos.y * 10) / 10, lbl: nextLabel(jt), p: {} };
      P.nodes.push(j); p[endKey] = j.id; p.len = '';
      // the old junction may now just join two pieces of a main: make it one pipe again
      var on = nodeById(oldN);
      if (on && on.t === 'J' && p.k !== 'v') { if (on.p && on.p.fit) delete on.p.fit; healJoint(oldN); }
      if (on && on.t === 'J' && p.k !== 'v' && !drainAt(oldN).length && !P.pipes.some(function (q) { return q.a === oldN || q.b === oldN; })) P.nodes = P.nodes.filter(function (x) { return x.id !== oldN; });
      var sp = g.snap;
      if (sp && sp.kind !== 'free' && p.k !== 'v') {
        var err = mergeInto(j.id, sp.node ? { node: sp.node } : { pipe: sp.pipe, x: sp.x, y: sp.y });
        if (err) { P = JSON.parse(saved); if (undoStack[undoStack.length - 1] === keep) undoStack.pop(); toast('Can\'t connect there: ' + err + '.'); refresh(); return; }
        msg = 'Connected.';
      } else if (sp && sp.kind !== 'free' && p.k === 'v' && sp.node) {
        P.pipes.forEach(function (q) { if (q.a === j.id) q.a = sp.node; if (q.b === j.id) q.b = sp.node; }); P.nodes = P.nodes.filter(function (x) { return x.id !== j.id; });
        if (netError('v')) { P = JSON.parse(saved); if (undoStack[undoStack.length - 1] === keep) undoStack.pop(); toast('Can\'t connect the vent there.'); refresh(); return; }
        msg = 'Vent connected.';
      } else msg = p.k === 'v' ? 'Vent end moved.' : 'Disconnected. The open end is marked red until it ties in.';
    }
    dirty = true; refresh(); toast(msg);
  }

  // ---------- Files (.dwv = JSON) ----------
  var hasFS = typeof window.showSaveFilePicker === 'function' && typeof window.showOpenFilePicker === 'function';
  function serialize() {
    var o = JSON.parse(JSON.stringify(P)), rr = compute(); R = rr;
    // Read-only summary for anyone opening the file. Ignored on load; everything is recomputed.
    if (o.bg && bgSrc) o.bg.src = bgSrc; // embed the plan so the file is self-contained
    if (o.bg && o.bg.kind === 'pdf' && bgPdf) o.bg.pdf = pdfB64(bgPdf); // original vector page (base64)
    o.results = { note: 'Computed by Workspace Planner. Ignored when opened; recomputed from nodes and pipes.', totalDfu: rr.tot, buildingDrain: rr.bd || null,
      pipes: P.pipes.filter(function (p) { return p.k !== 'v'; }).map(function (p) { var r = rr.pipe[p.id]; return { id: p.id, run: pipeName(p), dfu: r.dfu, size: r.size, orientation: r.o, slope: r.slope ? SLOPES[r.slope].frac : null, slopeFtPerFt: r.slope ? SLOPES[r.slope].dec : null, ahjApproval: !!r.ahj, design: !!r.design }; }) };
    return JSON.stringify(o, null, 2);
  }
  function validate(obj) {
    if (!obj || obj.app !== 'workspace-planner-dwv' || !Array.isArray(obj.nodes) || !Array.isArray(obj.pipes)) throw new Error('That file is not a .dwv project.');
    obj.settings = mergeSettings(obj.settings || {});
    if (obj.occ !== 'assembly') obj.occ = 'public';
    delete obj.slope; delete obj.results;
    if (obj.bg && (typeof obj.bg !== 'object' || !(obj.bg.w > 0) || !(obj.bg.h > 0))) obj.bg = null;
    if (!(+obj.scale > 0)) obj.scale = null; else obj.scale = +obj.scale; // slope is computed now; old files may carry a global slope
    obj.nodes.forEach(function (n) { n.p = n.p || {}; if (!FX[n.t] && !SPECIAL[n.t]) throw new Error('Unknown node type: ' + n.t); });
    obj.pipes.forEach(function (p) { if (p.v !== undefined) { if (!Array.isArray(p.v)) delete p.v; else p.v = p.v.filter(function (q) { return Array.isArray(q) && isFinite(q[0]) && isFinite(q[1]); }).map(function (q) { return [+q[0], +q[1]]; }); } });
    var ids = {}; obj.nodes.forEach(function (n) { ids[n.id] = 1; });
    obj.pipes = obj.pipes.filter(function (p) { return ids[p.a] && ids[p.b]; });
    obj.seq = Math.max(+obj.seq || 1, obj.nodes.length + obj.pipes.length + 1);
    while (obj.nodes.some(function (n) { return n.id === 'n' + obj.seq; }) || obj.pipes.some(function (p) { return p.id === 'n' + obj.seq; })) obj.seq++;
    obj.name = String(obj.name || 'Untitled DWV');
    var mu = obj.mute && typeof obj.mute === 'object' ? obj.mute : {}, clean = { keys: {}, rules: {} };
    if (mu.keys && typeof mu.keys === 'object') Object.keys(mu.keys).forEach(function (k) { if (mu.keys[k]) clean.keys[String(k).slice(0, 200)] = 1; });
    if (mu.rules && typeof mu.rules === 'object') Object.keys(mu.rules).forEach(function (k) { if (mu.rules[k] && RULES[k]) clean.rules[k] = 1; });
    obj.mute = clean;
    obj.pipes.forEach(function (p) { if (p.cwv) p.cwv = 1; else delete p.cwv; });
    return obj;
  }
  function loadProject(obj, name, handle) {
    var src = obj && obj.bg && typeof obj.bg.src === 'string' ? obj.bg.src : null;
    var pdf64 = obj && obj.bg && typeof obj.bg.pdf === 'string' ? obj.bg.pdf : null, pdfU = null;
    if (pdf64) { try { pdfU = b64Pdf(pdf64); } catch (e) { pdfU = null; } }
    if (obj && obj.bg) { delete obj.bg.src; delete obj.bg.pdf; }
    P = validate(obj);
    if (P.bg) { setBgPdf(P.bg.kind === 'pdf' ? pdfU : null); setBgSrc(src); } else { bgShown = ''; setBgPdf(null); }
    routeNew = null; routeCtx = null; if ($('routeBar')) $('routeBar').classList.add('hidden'); trace.pts = []; calib = null; syncDrawBar();
    renderBg(); renderPlanPanel(); fileName = name || ''; fileHandle = handle || null; dirty = false; undoStack = []; sel = null; pending = null;
    renderPalette(); renderSettings(); refresh(); fit();
  }
  function safeName() { return (P.name || 'project').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'project'; }
  function writeHandle(h) { return h.createWritable().then(function (w) { return w.write(serialize()).then(function () { return w.close(); }); }); }
  function saveAs() {
    if (hasFS) {
      return window.showSaveFilePicker({ suggestedName: safeName() + '.dwv', types: [{ description: 'DWV project', accept: { 'application/json': ['.dwv'] } }] })
        .then(function (h) { return writeHandle(h).then(function () { fileHandle = h; fileName = h.name; dirty = false; refresh(); toast('Saved ' + h.name); }); })
        .catch(function (e) { if (e && e.name === 'AbortError') return; download(); });
    }
    download(); return Promise.resolve();
  }
  function save() {
    if (fileHandle) return writeHandle(fileHandle).then(function () { dirty = false; refresh(); toast('Saved ' + fileName); }).catch(function () { return saveAs(); });
    return saveAs();
  }
  function download() {
    var blob = new Blob([serialize()], { type: 'application/json' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = safeName() + '.dwv';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    fileName = a.download; dirty = false; refresh(); toast('Downloaded ' + a.download + '. On iPhone it goes to Files › Downloads.');
  }
  function openFile() {
    if (dirty && !confirm('Discard unsaved changes on the canvas?')) return;
    if (hasFS) {
      window.showOpenFilePicker({ types: [{ description: 'DWV project', accept: { 'application/json': ['.dwv', '.json'] } }] })
        .then(function (hs) { return hs[0].getFile().then(function (f) { return f.text().then(function (t) { loadProject(JSON.parse(t), f.name, hs[0]); toast('Opened ' + f.name); }); }); })
        .catch(function (e) { if (e && e.name === 'AbortError') return; toast(e && e.message ? e.message : 'Could not open that file.'); });
      return;
    }
    var inpEl = $('dwvFileInput'); inpEl.value = ''; inpEl.click();
  }
  function onFileInput(e) {
    var f = e.target.files && e.target.files[0]; if (!f) return;
    var rd = new FileReader();
    rd.onload = function () { try { loadProject(JSON.parse(rd.result), f.name, null); toast('Opened ' + f.name); } catch (err) { toast(err.message || 'Could not open that file.'); } };
    rd.readAsText(f);
  }
  function newFile() { if (dirty && !confirm('Discard unsaved changes on the canvas?')) return; loadProject(newProject(), '', null); }

  // ---------- Sample (commercial) ----------
  function sample() {
    var p = newProject('Sample · cafe restroom + kitchen');
    var N = [], E = [], id = 1;
    function n(t, x, y, lbl, pp) { var o = { id: 's' + (id++), t: t, x: x, y: y, lbl: lbl, p: pp || {} }; N.push(o); return o.id; }
    function d(a, b, extra) { var o = { id: 's' + (id++), a: a, b: b, k: 'd', role: 'auto', len: '', ug: false, force: null }; for (var k in extra || {}) o[k] = extra[k]; E.push(o); }
    function v(a, b) { E.push({ id: 's' + (id++), a: a, b: b, k: 'v', role: 'auto', len: '', ug: false, force: null }); }
    var L1 = n('lav', 60, 120, 'LAV-1'), L2 = n('lav', 180, 120, 'LAV-2'), U1 = n('ur_int', 300, 120, 'UR-1'),
        W1 = n('wc_fv', 420, 120, 'WC-1', { mount: 'Wall-hung' }), W2 = n('wc_fv', 540, 120, 'WC-2', { mount: 'Floor' });
    var J1 = n('J', 180, 230, 'J-1'), J2 = n('J', 300, 230, 'J-2'), J3 = n('J', 420, 230, 'J-3'), J4 = n('J', 540, 230, 'J-4'),
        ST = n('J', 660, 230, 'J-5'), SB = n('J', 660, 620, 'J-6');
    var K1 = n('sink_cfw', 100, 390, '3CS-1', { n: 3, L: 18, W: 18, D: 12 }), K2 = n('sink_sp15', 240, 390, 'PREP-1', { n: 1, L: 24, W: 24, D: 12 }), K3 = n('fd', 380, 390, 'FD-1');
    var KJ1 = n('J', 100, 480, 'J-7'), KJ2 = n('J', 240, 480, 'J-8'), KJ3 = n('J', 380, 480, 'J-9');
    var GI = n('GI', 545, 480, 'GI-1', { rated: 35 }), GO = n('J', 610, 480, 'J-10'), J6 = n('J', 610, 620, 'J-11'), SW = n('SEWER', 860, 620, 'SEWER-1');
    d(L1, J1, { len: 2 }); d(L2, J1, { len: 1.5 }); d(J1, J2); d(U1, J2, { len: 2 }); d(J2, J3); d(W1, J3, { len: 4 }); d(J3, J4); d(W2, J4, { len: 4 }); d(J4, ST);
    d(ST, SB, { role: 'stack', len: 12 }); d(SB, SW, { role: 'bd' });
    d(K1, KJ1, { len: 1.5 }); d(KJ1, KJ2); d(K2, KJ2, { len: 3.83 }); d(KJ2, KJ3); d(K3, KJ3, { len: 2 }); d(KJ3, GI); d(GI, GO); d(GO, J6); d(J6, SB, { role: 'bd' });
    var VA = n('VJ', 60, 50, 'VJ-1'), VB = n('VJ', 180, 50, 'VJ-2'), VC = n('VJ', 300, 50, 'VJ-3'), VD = n('VJ', 420, 50, 'VJ-4'), VE = n('VJ', 540, 50, 'VJ-5'), VF = n('VJ', 660, 50, 'VJ-6'), R1 = n('VTR', 660, -10, 'VTR-1');
    v(L1, VA); v(L2, VB); v(U1, VC); v(W1, VD); v(W2, VE); v(VA, VB); v(VB, VC); v(VC, VD); v(VD, VE); v(VE, VF); v(ST, VF); v(VF, R1);
    var KD = n('VJ', 610, 310, 'VJ-10'), KC = n('VJ', 380, 310, 'VJ-9'), KB = n('VJ', 240, 310, 'VJ-8'), KA = n('VJ', 100, 310, 'VJ-7'), K0 = n('VJ', -20, 310, 'VJ-11'), R2 = n('VTR', -20, -10, 'VTR-2');
    v(GO, KD); v(KD, KC); v(K3, KC); v(KC, KB); v(K2, KB); v(KB, KA); v(K1, KA); v(KA, K0); v(K0, R2);
    p.nodes = N; p.pipes = E; p.seq = id + 1;
    return p;
  }

  // ---------- Misc ----------
  var toastT = null;
  function toast(msg) {
    var t = $('dwvToast'); if (!t) return; t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.add('hidden'); }, 2800);
  }
  var saveT = null;
  function refresh() {
    R = compute(); render();
    clearTimeout(saveT); saveT = setTimeout(function () { try { localStorage.setItem(LS_DRAFT, JSON.stringify({ p: P, fileName: fileName, dirty: dirty })); } catch (e) {} }, 250);
  }
  function undo() {
    if (!undoStack.length) { toast('Nothing to undo.'); return; }
    P = JSON.parse(undoStack.pop()); dirty = true; sel = null; pending = null; if (routeCtx) { routeNew = null; routeCtx = null; $('routeBar').classList.add('hidden'); } renderPalette(); renderSettings(); renderPlanPanel(); refresh();
  }
  function openSettings(open) { $('setWrap').classList.toggle('open', open !== false); if (open !== false) renderSettings(); }
  function initTheme() {
    var k = 'workspacePlannerTheme_v1', b = $('themeToggle'); if (!b) return;
    function sync() { var d = document.documentElement.classList.contains('dark'); $('themeToggleIcon').className = 'fas ' + (d ? 'fa-sun' : 'fa-moon'); }
    b.addEventListener('click', function () { var d = !document.documentElement.classList.contains('dark'); document.documentElement.classList.toggle('dark', d); try { localStorage.setItem(k, d ? 'dark' : 'light'); } catch (e) {} sync(); });
    sync();
  }

  function init() {
    svg = $('cv'); gBg = el('g', {}, svg); gWorld = el('g', {}, svg); gOv = el('g', { 'pointer-events': 'none' }, svg);
    var restored = false;
    try {
      var dr = JSON.parse(localStorage.getItem(LS_DRAFT) || 'null');
      if (dr && dr.p) { P = validate(dr.p); fileName = dr.fileName || ''; dirty = !!dr.dirty; restored = true; }
      if (restored && P.bg) idbGet('bg', function (src) {
        if (!src) return;
        bgSrc = src;
        idbGet('bgpdf', function (u) { if (u && u.length && P.bg && P.bg.kind === 'pdf') { bgPdf = u; bgPdfDoc = null; bgPdfPage = null; } renderBg(); renderPlanPanel(); });
        renderBg(); renderPlanPanel(); fit();
      });
    } catch (e) {}
    if (!restored) P = sample();
    R = compute();
    renderPalette(); renderSettings();
    svg.addEventListener('pointerdown', onDown);
    svg.addEventListener('pointermove', onMove);
    svg.addEventListener('pointerup', onUp);
    svg.addEventListener('pointercancel', onUp);
    svg.addEventListener('wheel', onWheel, { passive: false });
    svg.addEventListener('touchstart', onTouchStart, { passive: true });
    svg.addEventListener('touchmove', onTouchMove, { passive: false });
    svg.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('pointerdown', onPalDown);
    document.addEventListener('pointermove', onPalMove);
    document.addEventListener('pointerup', onPalUp);
    document.querySelectorAll('[data-tool]').forEach(function (b) { b.addEventListener('click', function () { setTool(b.getAttribute('data-tool')); }); });
    $('dwvUndo').addEventListener('click', undo);
    function center() { var r = svg.getBoundingClientRect(); return toWorld({ clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }); }
    $('zoomIn').addEventListener('click', function () { zoomAt(center(), 1.25); });
    $('zoomOut').addEventListener('click', function () { zoomAt(center(), 0.8); });
    $('zoomFit').addEventListener('click', fit);
    document.addEventListener('click', function (e) {
      var o = e.target.closest('[data-occ]'); if (o) { var v = o.getAttribute('data-occ'); if (v !== P.occ) { mutate(function () { P.occ = v; }); renderPalette(); } return; }
      var sp = e.target.closest('[data-sel-pipe]'); if (sp) { sel = { kind: 'pipe', id: sp.getAttribute('data-sel-pipe') }; refresh(); return; }
      var ig = e.target.closest('[data-ign]');
      if (ig) { var ks = decodeURIComponent(ig.getAttribute('data-ign')).split('|'); mutate(function () { var M = muteOf(); ks.forEach(function (k) { M.keys[k] = 1; }); }); var tp2 = $('dwvTip'); if (tp2 && !tp2.classList.contains('hidden') && tp2.getAttribute('data-tip')) { var r1 = tp2.getBoundingClientRect(); showTip(tp2.getAttribute('data-tip'), r1.left - 14, r1.top - 14, true); } toast('Ignored. "Show ignored" under Code checks restores it.'); return; }
      var ui = e.target.closest('[data-unign]');
      if (ui) { var ks2 = decodeURIComponent(ui.getAttribute('data-unign')).split('|'); mutate(function () { var M = muteOf(); ks2.forEach(function (k) { delete M.keys[k]; }); }); return; }
      var ro = e.target.closest('[data-rule-off]');
      if (ro) { var rk = ro.getAttribute('data-rule-off'); mutate(function () { muteOf().rules[rk] = 1; }); renderSettings(); toast('"' + (RULES[rk] || rk) + '" is off for this project. Turn it back on in Sizing settings.'); return; }
      var rf = e.target.closest('[data-ref]'); if (rf) { var id = rf.getAttribute('data-ref'); sel = { kind: nodeById(id) ? 'node' : 'pipe', id: id }; refresh(); return; }
      var act = e.target.closest('[data-act]');
      if (act) {
        var an = act.getAttribute('data-act');
        if (an === 'del') { deleteSel(); return; }
        if (an === 'stopStamp') { armed = null; markArmed(); renderInspector(); return; }
        if (an === 'finishTrace') { finishTrace(); return; }
        if (an === 'cancelTrace') { cancelTrace(); return; }
        if (an === 'popVertex') { popVertex(); return; }
        if (an === 'flip') { flipRun(sel.id); return; }
        if (an === 'fsSize') { setFsSize(act.getAttribute('data-fsnode'), act.getAttribute('data-v')); var tp = $('dwvTip'); if (tp && tp.getAttribute('data-tip') && !tp.classList.contains('hidden')) { var r0 = tp.getBoundingClientRect(); showTip(tp.getAttribute('data-tip'), r0.left - 14, r0.top - 14, true); } return; }
        if (an === 'cwvRun') { cwvRun(sel.id); return; }
        if (an === 'toggleIgn') { UI.showIgn = !UI.showIgn; renderSide(); return; }
        if (an === 'unignAll') { mutate(function () { muteOf().keys = {}; }); renderSettings(); return; }
      }
      var fm = e.target.closest('[data-file]');
      if (fm) {
        var a = fm.getAttribute('data-file'); $('fileMenu').classList.add('hidden');
        if (a === 'new') newFile(); else if (a === 'open') openFile(); else if (a === 'save') save(); else if (a === 'saveas') saveAs();
        else if (a === 'sample') { if (!dirty || confirm('Replace the canvas with the sample layout?')) loadProject(sample(), '', null); }
        else if (a === 'print') window.print();
        return;
      }
      var gt = e.target.closest('[data-grp-toggle]'); if (gt) { toggleGroup(gt.getAttribute('data-grp-toggle')); return; }
      if (e.target.closest('#fsBtn')) { setFs(!isFs()); return; }
      if (e.target.closest('#fsPalBtn')) { togglePanel('pal'); return; }
      if (e.target.closest('#fsSumBtn') || e.target.closest('#fsSumClose')) { togglePanel('sum'); return; }
      if (e.target.closest('#fsWarn')) { toast('Values come from the UPC text and still need checking against the printed 2024 edition and local amendments.'); return; }
      if (e.target.closest('#fileBtn')) { $('fileMenu').classList.toggle('hidden'); return; }
      if (!e.target.closest('#fileMenu')) $('fileMenu').classList.add('hidden');
    });
    $('insp').addEventListener('change', onInspectorChange);
    $('dwvName').addEventListener('change', function (e) { var v = e.target.value.trim() || 'Untitled DWV'; mutate(function () { P.name = v; }); });
    $('dwvFileInput').addEventListener('change', onFileInput);
    $('gearBtn').addEventListener('click', function () { openSettings(true); });
    $('setClose').addEventListener('click', function () { openSettings(false); });
    $('setBackdrop').addEventListener('click', function () { openSettings(false); });
    $('setPanel').addEventListener('change', onSettings);
    $('setPanel').addEventListener('click', onSettingsClick);
    $('setReset').addEventListener('click', function () { mutate(function () { var d = defaultSettings(); d.mins = {}; d.carryDown = true; P.settings = d; }); renderSettings(); renderPalette(); toast('Reset to UPC minimums.'); });
    $('setSave').addEventListener('click', function () { try { localStorage.setItem(LS_STD, JSON.stringify(P.settings)); toast('Saved as your standard for new projects.'); } catch (e) { toast('Could not save.'); } });
    $('dwvShowArms').addEventListener('change', renderSide);
    $('sheetToggle').addEventListener('click', function () { document.body.classList.toggle('sheet-min'); });
    document.addEventListener('keydown', function (e) {
      if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      var k = (e.key || '').toLowerCase();
      if ((e.metaKey || e.ctrlKey) && k === 'z') { e.preventDefault(); undo(); }
      else if ((e.metaKey || e.ctrlKey) && k === 's') { e.preventDefault(); if (e.shiftKey) saveAs(); else save(); }
      else if ((e.metaKey || e.ctrlKey) && k === 'o') { e.preventDefault(); openFile(); }
      else if ((e.key === 'Delete' || e.key === 'Backspace' || e.key === 'Escape') && isDrawTool() && trace.pts.length) { e.preventDefault(); popVertex(); }
      else if (e.key === 'Delete' || e.key === 'Backspace') { if (sel) { e.preventDefault(); deleteSel(); } }
      else if (e.key === 'Enter' && isDrawTool() && trace.pts.length) { e.preventDefault(); finishTrace(); }
      else if (e.key === 'Escape' && calib) { calib = null; cancelTrace(); }
      else if (e.key === 'Escape' && routeCtx) { hideRouteBar(); }
      else if (e.key === 'Escape') {
        var busy = $('planWrap').classList.contains('open') ||  $('setWrap').classList.contains('open') || !$('fileMenu').classList.contains('hidden') || pending || armed !== null;
        pending = null; armed = null; markArmed(); openSettings(false); openPlan(false); $('fileMenu').classList.add('hidden');
        if (!busy && isFs()) setFs(false); else refresh();
      }
      else if (!e.metaKey && !e.ctrlKey && /^[234]$/.test(k) && sel && sel.kind === 'node' && nodeById(sel.id) && FX[nodeById(sel.id).t] && FX[nodeById(sel.id).t].rec) { setFsSize(sel.id, +k); }
      else if (!e.metaKey && !e.ctrlKey) { if (k === 'v') setTool('select'); else if (k === 't') setTool('pipe'); else if (k === 'p') setTool('pipe'); else if (k === 'e') setTool('vent'); else if (k === 'd') setTool('delete'); }
    });
    svg.addEventListener('dblclick', function (e) { if (isDrawTool() && trace.pts.length >= 2) { e.preventDefault(); finishTrace(); } });
    svg.addEventListener('pointerleave', function () { if (trace.hover) { trace.hover = null; renderOverlay(); } if (hoverPid) { hoverPid = null; render(); } if (!($('dwvTip') && $('dwvTip').textContent.indexOf('Tap elsewhere') >= 0)) hideTip(); });
    initPlan(); initRoute();
    document.addEventListener('fullscreenchange', onNativeChange);
    document.addEventListener('webkitfullscreenchange', onNativeChange);
    window.addEventListener('resize', function () { layoutFs(); });
    if (window.ResizeObserver) { var ro = new ResizeObserver(function () { layoutFs(); }); ['toolbar', 'sheet', 'insp'].forEach(function (k) { if ($(k)) ro.observe($(k)); }); }
    if (window.ResizeObserver) { var first = true; new ResizeObserver(function () { if (first) { first = false; fit(); } else render(); }).observe(svg); }
    initTheme();
    refresh(); fit();
    if (location.hash === '#fullscreen' || (innerWidth < 640 && UI.fsPhone !== false)) setFs(true, { auto: true });
    if (location.hash === '#settings') openSettings(true);
    window.DWV = {
      get project() { return P; }, get results() { return R; },
      connect: connect, setTool: setTool, fit: fit, setFs: setFs, isFs: isFs, serialize: serialize, sample: sample,
      load: function (o, name) { loadProject(o, name || '', null); },
      place: function (t, x, y, p) { return placeNode({ t: t, p: p || {} }, x, y).id; },
      get view() { return view; }, get bgSrc() { return bgSrc; }, get bgPdfBytes() { return bgPdf ? bgPdf.length : 0; }, get tile() { return tile; }, setHiRes: function (v) { hiRes = !!v; if (!hiRes) dropTile(); else scheduleTile(); }, refresh: function () { refresh(); }, get ui() { return UI; }, heal: function () { var n = heal(); refresh(); return n; }, get tracePts() { return trace.pts; }, get tool() { return tool; }, parseScale: parseScale, parseFtIn: parseFtIn,
      trace: function (pts, free) { if (!isDrawTool()) setTool('pipe'); pts.forEach(function (q) { traceClick(q, free); }); if (trace.pts.length) finishTrace(); },
      draw: function (kind, pts, free) { sel = null; setTool(kind === 'v' ? 'vent' : 'pipe'); pts.forEach(function (q) { traceClick(q, free); }); if (trace.pts.length) finishTrace(); },
      flip: function (pid) { flipRun(pid); }, snapAt: function (x, y, prev) { return snapPoint({ x: x, y: y }, prev || trace.pts[trace.pts.length - 1]); },
      autoRoute: autoRoute, acceptRoute: function () { hideRouteBar(); }, undoRoute: undoRoute
    };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
