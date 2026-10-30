/* Pure code-table sizing (no DOM). Imported by sizing.js and by the node unit tests.
 *
 * UPC mode = 2024 UPC as adopted by Clark County (Southern Nevada Amendments, eff. Jan 11, 2026).
 * Values verified against the 2024 UPC model text as reproduced in the 2025 CPC (Table 703.2, 708.1, 904.1/904.2):
 *   https://gocodebook.com/us/california/california-plumbing-code/sanitary-drainage/sizing-and-fixture-units/maximum-loading-and-length-limits
 *   https://gocodebook.com/library/us/ca/ca-plumbing-code/chapter-7-sanitary-drainage/708.1-general
 * Final check against the printed 2024 UPC is still recommended.
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
  if (codeMode !== 'UPC2024') {
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

/* Combination waste & vent (910 / Appendix B). Not wired into the drawing UI; provided for the framework. */
export const CWV_SIZES = [2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 6.0];   // Appendix B 101.6.1
export function cwvUpsize(d) {
  const i = CWV_SIZES.findIndex(x => Math.abs(x - d) < EPS);
  if (i < 0) {
    if (d < 2.0) return d < 1.5 - EPS ? 2.0 : 2.5;  // 1-1/4 -> 2 , 1-1/2 -> 2-1/2 (two sizes)
    return null;
  }
  return CWV_SIZES[i + 2] ?? null;
}
