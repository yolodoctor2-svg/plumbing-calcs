// @generated imports (tools/gen_imports.py)
import { getFixtureSpec } from './catalog.js';
import { requestFgRender } from './render.js';
import { state } from './state.js';
import { requestScheduleRender, showToast, updateInspector } from './ui.js';
// @end imports
/* =========================================================================
   6. SIZING ENGINE & FLIP FLOW SUPPORT
   ========================================================================= */


export function sizeWastePipeByCode(dfu, wcCount, minTrapSize, slope, codeMode) {
  let reqSize = Math.max(1.25, minTrapSize || 1.25);
  const warnings = [];
  if (wcCount > 0 && reqSize < 3.0) reqSize = 3.0;

  if (codeMode === 'UPC2024') {
    const upcLimits = [
      { size: 1.25, maxDfu: 1 },
      { size: 1.5,  maxDfu: 2 },
      { size: 2.0,  maxDfu: 8 },
      { size: 2.5,  maxDfu: 14 },
      { size: 3.0,  maxDfu: 35 },
      { size: 4.0,  maxDfu: slope < 0.2 ? 180 : 216 },
      { size: 6.0,  maxDfu: slope < 0.2 ? 700 : 840 },
      { size: 8.0,  maxDfu: slope < 0.2 ? 1600 : 1920 }
    ];
    if (wcCount > 3 && reqSize <= 3.0) {
      reqSize = 4.0;
      warnings.push(`${wcCount} WCs > UPC 3" max (3) → 4"`);
    }
    for (const row of upcLimits) {
      if (row.size >= reqSize && dfu <= row.maxDfu) return { size: row.size, warnings };
    }
    return { size: 8.0, warnings };
  } else {
    const ipcLimits = [
      { size: 1.25, maxDfu: 1 },
      { size: 1.5,  maxDfu: 3 },
      { size: 2.0,  maxDfu: 6 },
      { size: 2.5,  maxDfu: 12 },
      { size: 3.0,  maxDfu: 20 },
      { size: 4.0,  maxDfu: 160 },
      { size: 6.0,  maxDfu: 620 },
      { size: 8.0,  maxDfu: 1400 }
    ];
    if (wcCount > 2 && reqSize <= 3.0) {
      reqSize = 4.0;
      warnings.push(`${wcCount} WCs > IPC 3" max (2) → 4"`);
    }
    for (const row of ipcLimits) {
      if (row.size >= reqSize && dfu <= row.maxDfu) return { size: row.size, warnings };
    }
    return { size: 8.0, warnings };
  }
}

export function sizeVentPipeByCode(dfu, minFixtureVent, largestConnectedWaste, devLenFt) {
  let reqSize = Math.max(1.25, minFixtureVent || 1.25, (largestConnectedWaste || 1.25) / 2);
  const warnings = [];
  const upcVentTable = [
    { size: 1.25, maxDfu: 1,   maxLen: 45 },
    { size: 1.5,  maxDfu: 8,   maxLen: 60 },
    { size: 2.0,  maxDfu: 24,  maxLen: 120 },
    { size: 2.5,  maxDfu: 48,  maxLen: 180 },
    { size: 3.0,  maxDfu: 84,  maxLen: 212 },
    { size: 4.0,  maxDfu: 256, maxLen: 300 },
    { size: 6.0,  maxDfu: 1380,maxLen: 510 }
  ];
  for (const row of upcVentTable) {
    if (row.size >= reqSize && dfu <= row.maxDfu) {
      if (devLenFt > row.maxLen) {
        warnings.push(`Len (${devLenFt.toFixed(0)}') > max (${row.maxLen}')`);
        continue;
      }
      return { size: row.size, warnings };
    }
  }
  return { size: 6.0, warnings };
}

export function togglePipeFlow(pipeId) {
  const p = state.pipes.find(x => x.id === pipeId);
  if (!p) return;
  const temp = p.n1;
  p.n1 = p.n2;
  p.n2 = temp;
  p.manualFlowReversed = !p.manualFlowReversed;
  recalculateNetwork();
  updateInspector();
  requestFgRender();
  showToast(`Reversed flow direction on Pipe #P-${p.id}`);
}

export function recalculateNetwork() {
  const codeMode = document.getElementById('codeMode').value;
  const defSlope = parseFloat(document.getElementById('defaultSlope').value) || 0.25;
  const nodeMap = new Map();
  state.nodes.forEach(n => nodeMap.set(n.id, n));

  state.pipes.forEach(p => {
    const n1 = nodeMap.get(p.n1);
    const n2 = nodeMap.get(p.n2);
    const distPx = (n1 && n2) ? Math.hypot(n2.x - n1.x, n2.y - n1.y) : 0;
    p.calc = {
      dfu: 0, wcCount: 0, minReq: 1.25,
      size: p.manualMinSize || 1.5,
      lengthFt: distPx / (state.pxPerFoot || 10),
      flowDir: 1, warnings: [], fixtureSet: new Set()
    };
  });

  // 1. Waste Graph
  const wastePipes = state.pipes.filter(p => p.system !== 'vent');
  const wasteAdj = new Map();
  state.nodes.forEach(n => wasteAdj.set(n.id, []));
  wastePipes.forEach(p => {
    if (wasteAdj.has(p.n1) && wasteAdj.has(p.n2)) {
      wasteAdj.get(p.n1).push({ pipe: p, neighbor: p.n2 });
      wasteAdj.get(p.n2).push({ pipe: p, neighbor: p.n1 });
    }
  });

  const visitedWaste = new Set();
  const wasteParentNode = new Map();
  const wasteParentPipe = new Map();
  const queue = [];

  state.nodes.filter(n => n.type === 'stack').forEach(s => {
    visitedWaste.add(s.id);
    queue.push(s.id);
  });

  for (let qi = 0; qi < queue.length; qi++) {
    const curr = queue[qi];
    for (const edge of (wasteAdj.get(curr) || [])) {
      if (!visitedWaste.has(edge.neighbor)) {
        visitedWaste.add(edge.neighbor);
        wasteParentNode.set(edge.neighbor, curr);
        wasteParentPipe.set(edge.neighbor, edge.pipe);
        queue.push(edge.neighbor);
      }
    }
  }

  state.nodes.forEach(n => {
    if (!visitedWaste.has(n.id) && (wasteAdj.get(n.id) || []).length > 0) {
      const comp = [];
      const q2 = [n.id];
      const seen2 = new Set([n.id]);
      for (let qi = 0; qi < q2.length; qi++) {
        const u = q2[qi];
        comp.push(nodeMap.get(u));
        for (const e of (wasteAdj.get(u) || [])) {
          if (!seen2.has(e.neighbor)) { seen2.add(e.neighbor); q2.push(e.neighbor); }
        }
      }
      const root = comp.reverse().find(x => x.type !== 'fixture') || comp[0];
      visitedWaste.add(root.id);
      const q3 = [root.id];
      for (let qi = 0; qi < q3.length; qi++) {
        const curr = q3[qi];
        for (const edge of (wasteAdj.get(curr) || [])) {
          if (!visitedWaste.has(edge.neighbor)) {
            visitedWaste.add(edge.neighbor);
            wasteParentNode.set(edge.neighbor, curr);
            wasteParentPipe.set(edge.neighbor, edge.pipe);
            q3.push(edge.neighbor);
          }
        }
      }
    }
  });

  const nodeUpstreamFixtures = new Map();
  state.nodes.forEach(n => nodeUpstreamFixtures.set(n.id, new Set()));

  state.nodes.filter(n => n.type === 'fixture').forEach(fixNode => {
    let curr = fixNode.id;
    const safety = new Set();
    while (curr && !safety.has(curr)) {
      safety.add(curr);
      nodeUpstreamFixtures.get(curr).add(fixNode.id);
      const pPipe = wasteParentPipe.get(curr);
      const nextNode = wasteParentNode.get(curr);
      if (pPipe && nextNode) {
        pPipe.calc.fixtureSet.add(fixNode.id);
        pPipe.calc.flowDir = (pPipe.n1 === curr && pPipe.n2 === nextNode) ? 1 : -1;
      }
      curr = nextNode;
    }
  });

  wastePipes.forEach(p => {
    let sumDfu = 0, wcCount = 0, maxMinWaste = 1.25;
    p.calc.fixtureSet.forEach(fid => {
      const fn = nodeMap.get(fid);
      if (fn) {
        const spec = getFixtureSpec(fn);
        sumDfu += spec.dfu;
        if (spec.isWC) wcCount += 1;
        if (spec.minWaste > maxMinWaste) maxMinWaste = spec.minWaste;
      }
    });
    p.calc.dfu = sumDfu;
    p.calc.wcCount = wcCount;
    p.calc.minReq = Math.max(maxMinWaste, p.manualMinSize || 0);
    const sized = sizeWastePipeByCode(sumDfu, wcCount, p.calc.minReq, p.slope || defSlope, codeMode);
    p.calc.size = Math.max(sized.size, p.manualMinSize || 0);
    p.calc.warnings = sized.warnings;
  });

  // 2. Vent Graph
  const ventPipes = state.pipes.filter(p => p.system === 'vent');
  const ventAdj = new Map();
  state.nodes.forEach(n => ventAdj.set(n.id, []));
  ventPipes.forEach(p => {
    if (ventAdj.has(p.n1) && ventAdj.has(p.n2)) {
      ventAdj.get(p.n1).push({ pipe: p, neighbor: p.n2 });
      ventAdj.get(p.n2).push({ pipe: p, neighbor: p.n1 });
    }
  });

  const visitedVent = new Set();
  const ventParentNode = new Map();
  const ventParentPipe = new Map();
  const vQueue = [];
  state.nodes.filter(n => n.type === 'vtr').forEach(v => {
    visitedVent.add(v.id);
    vQueue.push(v.id);
  });

  for (let qi = 0; qi < vQueue.length; qi++) {
    const curr = vQueue[qi];
    for (const edge of (ventAdj.get(curr) || [])) {
      if (!visitedVent.has(edge.neighbor)) {
        visitedVent.add(edge.neighbor);
        ventParentNode.set(edge.neighbor, curr);
        ventParentPipe.set(edge.neighbor, edge.pipe);
        vQueue.push(edge.neighbor);
      }
    }
  }

  state.nodes.forEach(n => {
    if (!visitedVent.has(n.id) && (ventAdj.get(n.id) || []).length > 0) {
      const comp = [];
      const q = [n.id];
      const seen = new Set([n.id]);
      for (let qi = 0; qi < q.length; qi++) {
        const u = q[qi];
        comp.push(nodeMap.get(u));
        for (const e of (ventAdj.get(u) || [])) {
          if (!seen.has(e.neighbor)) { seen.add(e.neighbor); q.push(e.neighbor); }
        }
      }
      const root = comp.reverse().find(x => x.type !== 'fixture') || comp[0];
      visitedVent.add(root.id);
      const q2 = [root.id];
      for (let qi = 0; qi < q2.length; qi++) {
        const curr = q2[qi];
        for (const edge of (ventAdj.get(curr) || [])) {
          if (!visitedVent.has(edge.neighbor)) {
            visitedVent.add(edge.neighbor);
            ventParentNode.set(edge.neighbor, curr);
            ventParentPipe.set(edge.neighbor, edge.pipe);
            q2.push(edge.neighbor);
          }
        }
      }
    }
  });

  state.nodes.forEach(n => {
    if ((ventAdj.get(n.id) || []).length === 0) return;
    const served = new Set();
    if (n.type === 'fixture') served.add(n.id);
    const up = nodeUpstreamFixtures.get(n.id);
    if (up) up.forEach(fid => served.add(fid));
    if (served.size === 0) return;

    let curr = n.id;
    const safety = new Set();
    while (curr && !safety.has(curr)) {
      safety.add(curr);
      const vPipe = ventParentPipe.get(curr);
      const nextNode = ventParentNode.get(curr);
      if (vPipe && nextNode) {
        served.forEach(fid => vPipe.calc.fixtureSet.add(fid));
        vPipe.calc.flowDir = (vPipe.n1 === curr && vPipe.n2 === nextNode) ? 1 : -1;
      }
      curr = nextNode;
    }
  });

  ventPipes.forEach(p => {
    let sumDfu = 0, maxMinVent = 1.25, largestWaste = 1.25;
    p.calc.fixtureSet.forEach(fid => {
      const fn = nodeMap.get(fid);
      if (fn) {
        const spec = getFixtureSpec(fn);
        sumDfu += spec.dfu;
        if (spec.minVent > maxMinVent) maxMinVent = spec.minVent;
        if (spec.minWaste > largestWaste) largestWaste = spec.minWaste;
      }
    });
    p.calc.dfu = sumDfu;
    p.calc.minReq = Math.max(maxMinVent, largestWaste / 2, p.manualMinSize || 0);
    const sized = sizeVentPipeByCode(sumDfu, maxMinVent, largestWaste, p.calc.lengthFt);
    p.calc.size = Math.max(sized.size, p.manualMinSize || 0);
    p.calc.warnings = sized.warnings;
  });

  requestScheduleRender();
  requestFgRender();
}

// Coalesce repeated recalcs (e.g. every mousemove while dragging a fixture) into one per frame.
let recalcQueued = false;
export function requestRecalc() {
  if (recalcQueued) return;
  recalcQueued = true;
  requestAnimationFrame(() => { recalcQueued = false; recalculateNetwork(); });
}
