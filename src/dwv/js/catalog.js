// @generated imports (tools/gen_imports.py)
import { renderFixtureCatalog, renderModalFixtureTable } from './palette.js';
import { recalculateNetwork } from './sizing.js';
import { CAT } from './state.js';
import { showToast } from './ui.js';
// @end imports
/* =========================================================================
   1. UPC 2024 FACTORY DEFAULT FIXTURES (46 FIXTURES)
   ========================================================================= */
export const DEFAULT_UPC_FIXTURES = [
  { code: 'WC-P',   name: 'Water Closet, Public (Flushometer >1.6 gpf)', category: 'RESTROOM', dfu: 6.0, minWaste: 3.0, minVent: 2.0, isWC: true,  color: '#2563eb' },
  { code: 'WC-P16', name: 'Water Closet, Public (1.6 gpf Low-Flow)',     category: 'RESTROOM', dfu: 4.0, minWaste: 3.0, minVent: 2.0, isWC: true,  color: '#3b82f6' },
  { code: 'WC-R',   name: 'Water Closet, Private / Residential (1.6 gpf)',category: 'RESTROOM', dfu: 3.0, minWaste: 3.0, minVent: 1.5, isWC: true,  color: '#60a5fa' },
  { code: 'WC-R6',  name: 'Water Closet, Private (>1.6 gpf)',            category: 'RESTROOM', dfu: 4.0, minWaste: 3.0, minVent: 2.0, isWC: true,  color: '#3b82f6' },
  { code: 'UR-W',   name: 'Urinal, Wall-Mounted (≤1.0 gpf)',             category: 'RESTROOM', dfu: 2.0, minWaste: 2.0, minVent: 1.5, isWC: false, color: '#0891b2' },
  { code: 'UR-P',   name: 'Urinal, Pedestal or >1.0 gpf',                category: 'RESTROOM', dfu: 6.0, minWaste: 2.0, minVent: 2.0, isWC: false, color: '#0e7490' },
  { code: 'UR-NW',  name: 'Urinal, Nonwater (Waterless)',                category: 'RESTROOM', dfu: 1.0, minWaste: 2.0, minVent: 1.5, isWC: false, color: '#06b6d4' },
  { code: 'LAV-1',  name: 'Lavatory, Single (1-1/4" Trap)',              category: 'RESTROOM', dfu: 1.0, minWaste: 1.25,minVent: 1.25,isWC: false, color: '#14b8a6' },
  { code: 'LAV-C',  name: 'Lavatory, Commercial (1-1/2" Drain)',         category: 'RESTROOM', dfu: 1.0, minWaste: 1.5, minVent: 1.25,isWC: false, color: '#0d9488' },
  { code: 'LAV-S',  name: 'Lavatory, in Sets of 2 or 3',                 category: 'RESTROOM', dfu: 2.0, minWaste: 1.5, minVent: 1.5, isWC: false, color: '#0f766e' },
  { code: 'WF-15',  name: 'Washfountain (1-1/2" Trap)',                  category: 'RESTROOM', dfu: 2.0, minWaste: 1.5, minVent: 1.5, isWC: false, color: '#10b981' },
  { code: 'WF-20',  name: 'Washfountain (2" Trap)',                      category: 'RESTROOM', dfu: 3.0, minWaste: 2.0, minVent: 1.5, isWC: false, color: '#059669' },
  { code: 'BID',    name: 'Bidet',                                       category: 'RESTROOM', dfu: 1.0, minWaste: 1.25,minVent: 1.25,isWC: false, color: '#38bdf8' },
  { code: 'FD-E',   name: 'Floor Drain, Emergency / Restroom (Clark Co.)', category: 'DRAIN',  dfu: 0.0, minWaste: 2.0, minVent: 1.5, isWC: false, color: '#22c55e' },
  { code: 'FD-2',   name: 'Floor Drain, Standard Active (2" Trap)',      category: 'DRAIN',    dfu: 2.0, minWaste: 2.0, minVent: 1.5, isWC: false, color: '#16a34a' },
  { code: 'FD-3',   name: 'Floor Drain, High-Capacity (3" Trap)',        category: 'DRAIN',    dfu: 3.0, minWaste: 3.0, minVent: 1.5, isWC: false, color: '#15803d' },
  { code: 'FD-4',   name: 'Floor Drain, Heavy Duty (4" Trap)',           category: 'DRAIN',    dfu: 4.0, minWaste: 4.0, minVent: 2.0, isWC: false, color: '#166534' },
  { code: 'FD-FP',  name: 'Floor Drain, Fire Pump Rm (Clark Co. 3" Min)',category: 'DRAIN',    dfu: 0.0, minWaste: 3.0, minVent: 1.5, isWC: false, color: '#dc2626' },
  { code: 'FS-2',   name: 'Floor Sink / Indirect Receptor (2" Trap)',    category: 'DRAIN',    dfu: 2.0, minWaste: 2.0, minVent: 1.5, isWC: false, color: '#84cc16' },
  { code: 'FS-3',   name: 'Floor Sink / Indirect Receptor (3" Trap)',    category: 'DRAIN',    dfu: 4.0, minWaste: 3.0, minVent: 2.0, isWC: false, color: '#65a30d' },
  { code: 'FS-4',   name: 'Floor Sink / Indirect Receptor (4" Trap)',    category: 'DRAIN',    dfu: 6.0, minWaste: 4.0, minVent: 2.0, isWC: false, color: '#4d7c0f' },
  { code: 'GI-2',   name: 'Grease Interceptor, Hydromechanical (2")',    category: 'DRAIN',    dfu: 3.0, minWaste: 2.0, minVent: 1.5, isWC: false, color: '#eab308' },
  { code: 'GI-3',   name: 'Grease Interceptor, Commercial (3")',         category: 'DRAIN',    dfu: 4.0, minWaste: 3.0, minVent: 2.0, isWC: false, color: '#ca8a04' },
  { code: 'GI-4',   name: 'Grease Interceptor, Gravity (4")',            category: 'DRAIN',    dfu: 6.0, minWaste: 4.0, minVent: 2.0, isWC: false, color: '#a16207' },
  { code: 'OI-3',   name: 'Sand / Oil Interceptor (3" Trap)',            category: 'DRAIN',    dfu: 6.0, minWaste: 3.0, minVent: 2.0, isWC: false, color: '#78716c' },
  { code: 'TD-2',   name: 'Trench Drain / Area Drain (2" Trap)',         category: 'DRAIN',    dfu: 2.0, minWaste: 2.0, minVent: 1.5, isWC: false, color: '#4ade80' },
  { code: 'SK-3C',  name: 'Sink, Commercial 3-Comp / Pot / Scullery',    category: 'SINK',     dfu: 3.0, minWaste: 2.0, minVent: 1.5, isWC: false, color: '#f97316' },
  { code: 'SK-PR',  name: 'Sink, Commercial Prep / Vegetable (1-1/2")',  category: 'SINK',     dfu: 2.0, minWaste: 1.5, minVent: 1.5, isWC: false, color: '#fb923c' },
  { code: 'SK-HW',  name: 'Sink, Commercial Handwash',                   category: 'SINK',     dfu: 1.0, minWaste: 1.5, minVent: 1.25,isWC: false, color: '#fdba74' },
  { code: 'SK-K',   name: 'Sink, Kitchen / Breakroom (w/ or w/o Disp.)', category: 'SINK',     dfu: 2.0, minWaste: 1.5, minVent: 1.5, isWC: false, color: '#ea580c' },
  { code: 'SK-B1',  name: 'Sink, Bar (Private, 1-1/2" Trap)',            category: 'SINK',     dfu: 1.0, minWaste: 1.5, minVent: 1.5, isWC: false, color: '#f59e0b' },
  { code: 'SK-B2',  name: 'Sink, Bar (Commercial, 2" Trap)',             category: 'SINK',     dfu: 2.0, minWaste: 2.0, minVent: 1.5, isWC: false, color: '#d97706' },
  { code: 'MS-3',   name: 'Mop Basin / Service Sink (3" Floor Mounted)', category: 'SINK',     dfu: 3.0, minWaste: 3.0, minVent: 1.5, isWC: false, color: '#8b5cf6' },
  { code: 'SS-2',   name: 'Service / Janitor Sink (2" Wall Trap)',       category: 'SINK',     dfu: 2.0, minWaste: 2.0, minVent: 1.5, isWC: false, color: '#a78bfa' },
  { code: 'DW-C',   name: 'Dishwasher, Commercial (2" Trap)',            category: 'SINK',     dfu: 2.0, minWaste: 2.0, minVent: 1.5, isWC: false, color: '#ec4899' },
  { code: 'DW-R',   name: 'Dishwasher, Residential / Breakroom',         category: 'SINK',     dfu: 2.0, minWaste: 1.5, minVent: 1.5, isWC: false, color: '#f472b6' },
  { code: 'CW-R',   name: 'Clothes Washer, Domestic (2" Standpipe)',     category: 'SINK',     dfu: 3.0, minWaste: 2.0, minVent: 1.5, isWC: false, color: '#6366f1' },
  { code: 'CW-C',   name: 'Clothes Washer, Commercial',                  category: 'SINK',     dfu: 4.0, minWaste: 2.0, minVent: 1.5, isWC: false, color: '#4f46e5' },
  { code: 'LT-1',   name: 'Laundry Tub (1 or 2 Compartments)',           category: 'SINK',     dfu: 2.0, minWaste: 1.5, minVent: 1.5, isWC: false, color: '#818cf8' },
  { code: 'DF-1',   name: 'Drinking Fountain / Water Cooler',            category: 'SINK',     dfu: 0.5, minWaste: 1.25,minVent: 1.25,isWC: false, color: '#38bdf8' },
  { code: 'DF-2',   name: 'Drinking Fountain, Bi-Level (2 Units)',       category: 'SINK',     dfu: 1.0, minWaste: 1.25,minVent: 1.25,isWC: false, color: '#0284c7' },
  { code: 'SH-1',   name: 'Shower, Single-Head Stall (2" Trap)',         category: 'MED',      dfu: 2.0, minWaste: 2.0, minVent: 1.5, isWC: false, color: '#06b6d4' },
  { code: 'SH-G',   name: 'Shower, Gang (per head)',                     category: 'MED',      dfu: 1.0, minWaste: 2.0, minVent: 1.5, isWC: false, color: '#0891b2' },
  { code: 'BT-1',   name: 'Bathtub (with or without Overhead Shower)',   category: 'MED',      dfu: 2.0, minWaste: 1.5, minVent: 1.5, isWC: false, color: '#0284c7' },
  { code: 'SK-CL',  name: 'Sink, Clinical / Bedpan Washer (3")',         category: 'MED',      dfu: 6.0, minWaste: 3.0, minVent: 2.0, isWC: true,  color: '#e11d48' },
  { code: 'SK-SRG', name: 'Sink, Surgical / Medical Scrub',              category: 'MED',      dfu: 3.0, minWaste: 1.5, minVent: 1.5, isWC: false, color: '#f43f5e' },
  { code: 'DENT',   name: 'Dental Unit / Cuspidor or Aspirator',         category: 'MED',      dfu: 1.0, minWaste: 1.25,minVent: 1.25,isWC: false, color: '#fb7185' }
];

export const STORAGE_KEY = 'user_plumb_defaults_v10';

export function loadFixtureCatalog() {
  CAT.list = JSON.parse(JSON.stringify(DEFAULT_UPC_FIXTURES));
  try {
    const raw = window.localStorage && localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length >= 5) {
        CAT.list = parsed;
      }
    }
  } catch (e) {}
  catalogChanged();
}

let byCode = null;
export function catalogChanged() { byCode = null; }
export function lookup(code) {
  if (!byCode || byCode.src !== CAT.list) {
    byCode = new Map(); byCode.src = CAT.list;
    CAT.list.forEach(f => { if (!byCode.has(f.code)) byCode.set(f.code, f); });
  }
  return byCode.get(code);
}

export function saveFixtureCatalog() {
  catalogChanged();
  try {
    if (window.localStorage) localStorage.setItem(STORAGE_KEY, JSON.stringify(CAT.list));
  } catch (e) {}
}

export function saveAsMyDefaults() {
  saveFixtureCatalog();
  showToast('⭐ Saved current fixture catalog as your permanent user defaults!');
}

export function resetDefaultFixtures() {
  if (!confirm('Revert all fixtures back to factory default UPC 2024 & Clark County values?')) return;
  CAT.list = JSON.parse(JSON.stringify(DEFAULT_UPC_FIXTURES));
  saveFixtureCatalog();
  renderFixtureCatalog();
  renderModalFixtureTable();
  recalculateNetwork();
  showToast('Restored factory UPC 2024 defaults.');
}

export function getFixtureSpec(node) {
  const cat = lookup(node.fixtureCode) || DEFAULT_UPC_FIXTURES[0];
  return {
    code: cat.code,
    name: cat.name,
    color: cat.color || '#3b82f6',
    dfu: node.dfuOverride !== undefined && node.dfuOverride !== null ? Number(node.dfuOverride) : Number(cat.dfu),
    minWaste: node.minWasteOverride ? Number(node.minWasteOverride) : Number(cat.minWaste),
    minVent: node.minVentOverride ? Number(node.minVentOverride) : Number(cat.minVent),
    isWC: node.isWCOverride !== undefined ? Boolean(node.isWCOverride) : Boolean(cat.isWC)
  };
}
