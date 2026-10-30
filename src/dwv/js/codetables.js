/* Pure code-table sizing (no DOM). Imported by sizing.js and by the node unit tests.
 *
 * UPC mode = 2024 UPC as adopted by Clark County (Southern Nevada Amendments, eff. Jan 11, 2026).
 * Source: IAPMO 2024 UPC (official read-only e-book): Table 703.2 printed p.133, 708.1, 904.1/904.2,
 *   910.3-910.7 p.151, Appendix B p.315, Tables C 304.2 / C 304.3 p.320.
 * 'UPC2024_APPC' = Appendix C alternate (engineered) method: building drains/runouts by Table C 304.2,
 *   horizontal fixture branches by Table C 304.3 (Clark County adopts App. C, SNA 101.6).
 * IPC mode is Cyrex's original table, left unchanged.
 */

// Table 703.2 (2024 UPC). Horizontal = based on 1/4"/ft (note 5). There is no 2-1/2" column in Table 703.2.
export const UPC_703_2 = {
  horizontal: [
    { size: 1.25, maxDfu: 1 },
    { size: 1.5,  maxDfu: 1 },     // note 7: up to 8 public lavatories at 1/4"/ft
    { size: 2.0,  maxDfu: 8 },
    { size: 3.0,  maxDfu: 35 },    // note 4: not to exceed six WCs or five six-unit traps
    { size: 4.0,  maxDfu: 216 },
    { size: 5.0,  maxDfu: 428 },
    { size: 6.0,  maxDfu: 720 },
    { size: 8.0,  maxDfu: 2640 },
    { size: 10.0, maxDfu: 4680 },
    { size: 12.0, maxDfu: 8200 }
  ],
  vertical: [
    { size: 1.25, maxDfu: 1,    maxLen: 45 },
    { size: 1.5,  maxDfu: 2,    maxLen: 65 },
    { size: 2.0,  maxDfu: 16,   maxLen: 85 },
    { size: 3.0,  maxDfu: 48,   maxLen: 212 },
    { size: 4.0,  maxDfu: 256,  maxLen: 300 },
    { size: 5.0,  maxDfu: 600,  maxLen: 390 },
    { size: 6.0,  maxDfu: 1380, maxLen: 510 },
    { size: 8.0,  maxDfu: 3600, maxLen: 750 },
    { size: 10.0, maxDfu: 5600, maxLen: Infinity },
    { size: 12.0, maxDfu: 8400, maxLen: Infinity }
  ],
  vent: [
    { size: 1.25, maxDfu: 1,    maxLen: 45 },
    { size: 1.5,  maxDfu: 8,    maxLen: 60 },
    { size: 2.0,  maxDfu: 24,   maxLen: 120 },
    { size: 3.0,  maxDfu: 84,   maxLen: 212 },
    { size: 4.0,  maxDfu: 256,  maxLen: 300 },
    { size: 5.0,  maxDfu: 600,  maxLen: 390 },
    { size: 6.0,  maxDfu: 1380, maxLen: 510 },
    { size: 8.0,  maxDfu: 3600, maxLen: 750 }
  ],
  eighthSlopeFactor: 0.8,          // note 5
  maxWcOn3: 6,                     // note 4 (2024): six water closets ...
  maxSixUnitOn3: 5,                // ... or five six-unit traps
  maxPublicLavOn1_5: 8             // note 7
};

const EPS = 1e-6;
export const isQuarter = (s) => s >= 0.25 - EPS;
export const isEighth = (s) => Math.abs(s - 0.125) < EPS;
const f = (v) => (Math.round(v * 10) / 10).toString();

/**
 * Size a waste pipe.
 * opts (UPC only): { sixUnitCount, lavCount, lavOnly, isBuildingDrain }
 */
export function sizeWastePipeByCode(dfu, wcCount, minTrapSize, slope, codeMode, opts = {}) {
  let reqSize = Math.max(1.25, minTrapSize || 1.25);
  const warnings = [];
  if (wcCount > 0 && reqSize < 3.0) reqSize = 3.0;   // Table 703.2 note 3

  if (codeMode === 'UPC2024_APPC') return sizeWasteAppendixC(dfu, wcCount, reqSize, slope, opts, warnings);
  if (codeMode === 'UPC2024') {
    const T = UPC_703_2;
    const s = (slope === undefined || slope === null || isNaN(slope)) ? 0.25 : Number(slope);
    const six = opts.sixUnitCount || 0;
    let factor = 1.0;
    if (!isQuarter(s)) {
      // 708.1: min 1/4"/ft; 1/8"/ft only for building drain piping >= 4" with prior AHJ approval.
      factor = T.eighthSlopeFactor;
      if (!isEighth(s)) {
        warnings.push(`Slope ${s}"/ft not permitted: 708.1 min 1/4"/ft (1/8" only on bldg drain ≥4" w/ AHJ). Sized at 1/8" capacity (×0.8).`);
      } else if (!opts.isBuildingDrain) {
        warnings.push('1/8"/ft not permitted on this pipe: 708.1 allows it only on building drain ≥4" w/ AHJ approval. Sized at ×0.8.');
      }
    }
    // Table 703.2 note 4 (2024): 3" not to exceed six WCs or five six-unit traps (no horizontal/vertical split).
    if (reqSize <= 3.0 && (wcCount > T.maxWcOn3 || six > T.maxSixUnitOn3)) {
      reqSize = 4.0;
      warnings.push(wcCount > T.maxWcOn3
        ? `${wcCount} WCs > UPC 3" max (6, Table 703.2 note 4) → 4"`
        : `${six} six-unit traps > UPC 3" max (5, Table 703.2 note 4) → 4"`);
    }
    for (const row of T.horizontal) {
      if (row.size < reqSize - EPS) continue;
      let cap = row.maxDfu * factor;
      // note 7: up to 8 public lavatories on a 1-1/2" horizontal branch at 1/4"/ft
      if (row.size === 1.5 && opts.lavOnly && (opts.lavCount || 0) <= T.maxPublicLavOn1_5 && isQuarter(s)) cap = Math.max(cap, dfu);
      if (dfu <= cap + EPS) {
        if (factor !== 1.0 && opts.isBuildingDrain && isEighth(s)) {
          if (row.size >= 4.0) warnings.push(`1/8"/ft on building drain: ×0.8 capacity (${f(cap)} DFU). Requires prior AHJ approval (708.1).`);
          else warnings.push(`1/8"/ft not permitted on a ${row.size}" building drain (708.1 requires ≥4"). Sized at ×0.8.`);
        }
        return { size: row.size, warnings };
      }
    }
    const last = T.horizontal[T.horizontal.length - 1];
    warnings.push(`${f(dfu)} DFU exceeds Table 703.2 (12" = ${f(last.maxDfu * factor)} DFU) — engineer the drain`);
    return { size: last.size, warnings };
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

// Original vent table (kept for IPC mode, unchanged behaviour).
const LEGACY_VENT = [
  { size: 1.25, maxDfu: 1,   maxLen: 45 },
  { size: 1.5,  maxDfu: 8,   maxLen: 60 },
  { size: 2.0,  maxDfu: 24,  maxLen: 120 },
  { size: 2.5,  maxDfu: 48,  maxLen: 180 },
  { size: 3.0,  maxDfu: 84,  maxLen: 212 },
  { size: 4.0,  maxDfu: 256, maxLen: 300 },
  { size: 6.0,  maxDfu: 1380,maxLen: 510 }
];

/**
 * Size a vent. UPC: Table 703.2 vent column + 904.1 (≥1-1/4", ≥ half the drain) + 904.2
 * (a minimum-sized vent increased one pipe size for its entire length has no length limit).
 * Never throws; never returns a size that fails the table without a warning.
 */
export function sizeVentPipeByCode(dfu, minFixtureVent, largestConnectedWaste, devLenFt, codeMode) {
  let reqSize = Math.max(1.25, minFixtureVent || 1.25, (largestConnectedWaste || 1.25) / 2);
  const warnings = [];
  const len = devLenFt || 0;
  if (codeMode !== 'UPC2024' && codeMode !== 'UPC2024_APPC') {
    for (const row of LEGACY_VENT) {
      if (row.size >= reqSize && dfu <= row.maxDfu) {
        if (len > row.maxLen) {
          warnings.push(`Len (${len.toFixed(0)}') > max (${row.maxLen}')`);
          continue;
        }
        return { size: row.size, warnings };
      }
    }
    return { size: 6.0, warnings };
  }
  if (codeMode === 'UPC2024_APPC') warnings.push('App. C mode: vent sized by Table 703.2 (Table C 401.1 not implemented)');
  const T = UPC_703_2.vent;
  const idx = T.findIndex(r => r.size >= reqSize - EPS && dfu <= r.maxDfu);
  if (idx < 0) {
    warnings.push(`${f(dfu)} DFU exceeds Table 703.2 vent column (8" = 3600 DFU) — engineer the vent`);
    return { size: 8.0, warnings, exceeds: true };
  }
  const row = T[idx];
  if (len <= row.maxLen) return { size: row.size, warnings };
  const up = T[idx + 1];
  if (up) {
    warnings.push(`Len ${len.toFixed(0)}' > ${row.maxLen}' for ${row.size}" → ${up.size}" for full length (904.2: no length limit)`);
    return { size: up.size, warnings };
  }
  warnings.push(`Len ${len.toFixed(0)}' > ${row.maxLen}' for 8" vent and no larger size in Table 703.2 — engineer the vent`);
  return { size: row.size, warnings, exceeds: true };
}

/* Appendix C (alternate, engineered) drain sizing — IAPMO 2024 UPC printed p.320. */
// Table C 304.2 Building drains and building sewers (and runouts from stacks): [1/16, 1/8, 1/4, 1/2] in./ft; null = not listed
export const UPC_C304_2 = [
  { size: 2.0,  cap: [null, null, 21, 26] },
  { size: 2.5,  cap: [null, null, 24, 31] },
  { size: 3.0,  cap: [null, 20, 42, 50] },      // note 2: max two WCs (or two bathroom groups)
  { size: 4.0,  cap: [null, 180, 216, 250] },
  { size: 5.0,  cap: [null, 390, 480, 575] },
  { size: 6.0,  cap: [null, 700, 840, 1000] },
  { size: 8.0,  cap: [1400, 1600, 1920, 2300] },
  { size: 10.0, cap: [2500, 2900, 3500, 4200] },
  { size: 12.0, cap: [3900, 4600, 5600, 6700] },
  { size: 15.0, cap: [7000, 8300, 10000, 12000] }
];
// Table C 304.3 horizontal fixture branch column (note 1: does not include branches of the building drain)
export const UPC_C304_3_BRANCH = [
  { size: 1.5, maxDfu: 3 }, { size: 2.0, maxDfu: 6 }, { size: 2.5, maxDfu: 12 }, { size: 3.0, maxDfu: 20 },
  { size: 4.0, maxDfu: 160 }, { size: 5.0, maxDfu: 360 }, { size: 6.0, maxDfu: 620 }, { size: 8.0, maxDfu: 1400 },
  { size: 10.0, maxDfu: 2500 }, { size: 12.0, maxDfu: 3900 }, { size: 15.0, maxDfu: 7000 }
];
function sizeWasteAppendixC(dfu, wcCount, reqSize, slope, opts, warnings) {
  const s = (slope === undefined || slope === null || isNaN(slope)) ? 0.25 : Number(slope);
  if (reqSize <= 3.0 && wcCount > 2) {   // C 304.2 note 2 / C 304.3 note 2
    reqSize = 4.0;
    warnings.push(`${wcCount} WCs > App. C 3" max (2, Table C 304.2/C 304.3 note 2) → 4"`);
  }
  if (opts.isBuildingDrain) {
    const col = s >= 0.5 - EPS ? 3 : s >= 0.25 - EPS ? 2 : isEighth(s) ? 1 : Math.abs(s - 0.0625) < EPS ? 0 : -1;
    if (col < 0) {
      warnings.push(`Slope ${s}"/ft not in Table C 304.2 — sized at 1/8" column`);
    }
    const c = col < 0 ? 1 : col;
    if (c < 2) warnings.push(`${c === 1 ? '1/8' : '1/16'}"/ft building drain: requires prior AHJ approval (708.1 / 718.1)`);
    for (const row of UPC_C304_2) {
      if (row.size < reqSize - EPS) continue;
      const cap = row.cap[c];
      if (cap !== null && dfu <= cap + EPS) {
        if (c === 1 && row.size < 4.0) warnings.push(`1/8"/ft not permitted on a ${row.size}" building drain (708.1 requires ≥4")`);
        return { size: row.size, warnings };
      }
    }
    warnings.push(`${f(dfu)} DFU exceeds Table C 304.2 — engineer the drain`);
    return { size: 15.0, warnings };
  }
  if (!isQuarter(s)) warnings.push(`${s}"/ft not permitted on a horizontal branch (708.1). Table C 304.3 assumes code slope.`);
  for (const row of UPC_C304_3_BRANCH) {
    if (row.size < reqSize - EPS) continue;
    if (dfu <= row.maxDfu + EPS) return { size: row.size, warnings };
  }
  warnings.push(`${f(dfu)} DFU exceeds Table C 304.3 — engineer the branch`);
  return { size: 15.0, warnings };
}

/* Combination waste & vent (910 / Appendix B, IAPMO 2024 UPC printed p.151, p.315). */
// Appendix B 101.6.1 recognized sizes: 2, 2-1/2, 3, 3-1/2, 4, 4-1/2, 5, 6 in. ("etc.")
export const CWV_SIZES = [2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 6.0];
export function cwvUpsize(d) {
  const i = CWV_SIZES.findIndex(x => Math.abs(x - d) < EPS);
  if (i < 0) {
    if (d < 2.0) return d < 1.5 - EPS ? 2.0 : 2.5;  // 1-1/4 -> 2 , 1-1/2 -> 2-1/2 (two sizes)
    return null;
  }
  return CWV_SIZES[i + 2] ?? null;
}

// Fixtures that may not connect to a CWV system. Codes are Cyrex's library codes.
const CWV_KITCHEN = new Set(['SK-3C', 'SK-PR', 'DW-C', 'GI-2', 'GI-3', 'GI-4', 'SK-B2']);
/**
 * CWV check for one waste pipe marked as combination waste & vent (910 / App. B).
 * chapter7Size = size Chapter 7 would require; fixtures = [{code, isWC}]
 */
export function cwvCheck(chapter7Size, fixtures, lengthFt) {
  const warnings = [];
  let size = cwvUpsize(chapter7Size);
  if (size === null) { warnings.push(`CWV: ${chapter7Size}" + two sizes is beyond the App. B 101.6.1 sizes — engineer`); size = chapter7Size; }
  else warnings.push(`CWV 910.4: two sizes over Chapter 7 (${chapter7Size}" → ${size}"); traps also two sizes over normal (B 101.5)`);
  for (const fx of fixtures) {
    const code = fx.code || '';
    if (fx.isWC || /^UR/.test(code)) warnings.push(`910.7: ${code} — no water closet or urinal on a CWV system`);
    else if (CWV_KITCHEN.has(code)) warnings.push(`B 101.2: ${code} — restaurant kitchen equipment shall not connect to a CWV system (confirm bar sinks with AHJ)`);
  }
  if ((lengthFt || 0) > 15) warnings.push(`910.3: branch ${lengthFt.toFixed(0)}' > 15' must be separately vented`);
  warnings.push('910.3: vent area ≥ ½ drain area, connected downstream of the uppermost fixture; 910.5: no vertical waste except tailpiece ≤ 2 ft');
  return { size, warnings };
}
