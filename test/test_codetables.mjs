// Unit tests for src/dwv/js/codetables.js (UPC 2024 / Clark Co. rules). Run: node test/test_codetables.mjs
import { sizeWastePipeByCode as W, sizeVentPipeByCode as V, cwvUpsize, cwvCheck, UPC_703_2 } from '../src/dwv/js/codetables.js';
let pass = 0, fail = 0;
const t = (name, cond, info = '') => { if (cond) { pass++; console.log('ok ' + name); } else { fail++; console.log('!! ' + name + ' :: ' + JSON.stringify(info)); } };
const U = 'UPC2024';
const has = (r, re) => r.warnings.some(w => re.test(w));

// Table 703.2 values (2024 UPC)
t('703.2 horizontal column', JSON.stringify(UPC_703_2.horizontal.map(r => [r.size, r.maxDfu])) === JSON.stringify([[1.25,1],[1.5,1],[2,8],[3,35],[4,216],[5,428],[6,720],[8,2640],[10,4680],[12,8200]]));
t('703.2 vent column', JSON.stringify(UPC_703_2.vent.map(r => [r.size, r.maxDfu, r.maxLen])) === JSON.stringify([[1.25,1,45],[1.5,8,60],[2,24,120],[3,84,212],[4,256,300],[5,600,390],[6,1380,510],[8,3600,750]]));
t('no 2-1/2" in UPC waste ladder', !UPC_703_2.horizontal.some(r => r.size === 2.5) && !UPC_703_2.vent.some(r => r.size === 2.5));
// 1-1/2" horizontal = 1 DFU
t('1.5" horiz: 1 DFU fits', W(1, 0, 1.5, 0.25, U).size === 1.5);
t('1.5" horiz: 2 DFU -> 2"', W(2, 0, 1.5, 0.25, U).size === 2);
t('note 7: 3 public lavs (3 DFU) on 1.5" at 1/4', W(3, 0, 1.5, 0.25, U, { lavOnly: true, lavCount: 3 }).size === 1.5);
t('note 7: 9 lavs (9 DFU) not on 1.5" -> 3"', W(9, 0, 1.5, 0.25, U, { lavOnly: true, lavCount: 9 }).size === 3);
t('note 7 not at 1/8', W(3, 0, 1.5, 0.125, U, { lavOnly: true, lavCount: 3 }).size === 2);
// Note 4 (2024): six WCs or five six-unit traps on 3", no horizontal/vertical split
t('4 WCs / 26 DFU -> 3"', W(26, 4, 3, 0.25, U).size === 3);
t('6 WCs / 24 DFU -> 3"', W(24, 6, 3, 0.25, U).size === 3);
t('7 WCs -> 4" with note-4 warning', (r => r.size === 4 && has(r, /note 4/))(W(28, 7, 3, 0.25, U)));
t('6 six-unit traps -> 4"', W(30, 0, 2, 0.25, U, { sixUnitCount: 6 }).size === 4);
t('5 six-unit traps / 30 DFU -> 3"', W(30, 0, 3, 0.25, U, { sixUnitCount: 5 }).size === 3);
t('3" by DFU still capped at 35', W(36, 2, 3, 0.25, U).size === 4);
t('WC forces >= 3" (note 3)', W(4, 1, 1.5, 0.25, U).size === 3);
// Large sizes
t('300 DFU -> 5"', W(300, 0, 1.5, 0.25, U).size === 5);
t('721 DFU -> 8" (6" = 720)', W(721, 0, 1.5, 0.25, U).size === 8);
t('2000 DFU -> 8" (was 1920 cap)', W(2000, 0, 1.5, 0.25, U).size === 8);
t('9000 DFU -> 12" + exceeds warning', (r => r.size === 12 && has(r, /exceeds Table 703.2/))(W(9000, 0, 1.5, 0.25, U)));
// 708.1 slope rules
t('1/8 bldg drain 4": 172 DFU ok, AHJ warning', (r => r.size === 4 && has(r, /AHJ/) && has(r, /172\.8/))(W(172, 0, 1.5, 0.125, U, { isBuildingDrain: true })));
t('1/8 bldg drain: 173 DFU -> 5"', W(173, 0, 1.5, 0.125, U, { isBuildingDrain: true }).size === 5);
t('1/8 on a branch: warned, not silently upsized', (r => r.size === 2 && has(r, /not permitted/))(W(6, 0, 2, 0.125, U)));
t('1/8 on a 3" bldg drain: warned <4"', (r => r.size === 3 && has(r, /requires ≥4"/))(W(20, 1, 3, 0.125, U, { isBuildingDrain: true })));
t('illegal 0.2"/ft slope flagged, sized x0.8 (30 > 28 -> 4")', (r => has(r, /not permitted/) && r.size === 4)(W(30, 0, 3, 0.2, U)));
t('1/4 slope has no slope warning', W(30, 0, 3, 0.25, U).warnings.length === 0);
// Vents (904.1 / 904.2)
t('vent 20 DFU 200 ft: 2" fails 120 ft -> 3" (one size up, no limit)', (r => r.size === 3 && has(r, /904\.2/))(V(20, 1.25, 2, 200, U)));
t('vent >= half the drain', V(1, 1.25, 4, 10, U).size === 2);
t('vent 4000 DFU: no crash, 8" + exceeds warning', (r => r.size === 8 && r.exceeds && has(r, /exceeds/))(V(4000, 1.25, 8, 100, U)));
t('vent 3000 DFU 900 ft: flagged, not silent', (r => r.exceeds && has(r, /engineer/))(V(3000, 1.25, 8, 900, U)));
t('vent 600 DFU 100 ft -> 5"', V(600, 1.25, 4, 100, U).size === 5);
t('vent never 2.5" in UPC', V(30, 1.25, 2, 10, U).size === 3);
// IPC mode unchanged
t('IPC waste unchanged (3 WCs -> 4")', W(18, 3, 3, 0.25, 'IPC2024').size === 4);
t('IPC vent unchanged (2.5" row)', V(30, 1.25, 2, 10, 'IPC2024').size === 2.5);
// CWV (Appendix B 101.6.1 size ladder)
t('CWV two sizes: 2->3, 3->4, 4->5, 1.5->2.5', [2, 3, 4, 1.5].map(cwvUpsize).join() === '3,4,5,2.5');
// Appendix C engineered mode (Tables C 304.2 / C 304.3) — Cyrex's original large-pipe values
const C = 'UPC2024_APPC';
t('App C bldg drain 1/4: 6" = 840', W(840, 0, 1.5, 0.25, C, { isBuildingDrain: true }).size === 6 && W(841, 0, 1.5, 0.25, C, { isBuildingDrain: true }).size === 8);
t('App C bldg drain 1/4: 8" = 1920', W(1920, 0, 1.5, 0.25, C, { isBuildingDrain: true }).size === 8);
t('App C bldg drain 1/8: 4" = 180 + AHJ', (r => r.size === 4 && has(r, /AHJ/))(W(180, 0, 1.5, 0.125, C, { isBuildingDrain: true })));
t('App C bldg drain 2-1/2" = 24 at 1/4', W(24, 0, 1.5, 0.25, C, { isBuildingDrain: true }).size === 2.5);
t('App C branch: C 304.3 (3" = 20, 2 WCs max)', W(20, 2, 3, 0.25, C).size === 3 && W(21, 2, 3, 0.25, C).size === 4 && W(12, 3, 3, 0.25, C).size === 4);
t('App C vent warns Table C 401.1 not implemented', has(V(10, 1.25, 2, 10, C), /C 401\.1/));
// CWV checks
t('CWV: 2" -> 3" with 910.4 note', (r => r.size === 3 && has(r, /910\.4/))(cwvCheck(2, [{ code: 'FD-2' }], 10)));
t('CWV: WC/urinal flagged (910.7)', has(cwvCheck(3, [{ code: 'WC-P', isWC: true }, { code: 'UR-W' }], 10), /910\.7/));
t('CWV: bar sink / kitchen flagged (B 101.2)', has(cwvCheck(2, [{ code: 'SK-B2' }], 10), /B 101\.2/));
t('CWV: branch > 15 ft flagged (910.3)', has(cwvCheck(2, [{ code: 'FD-2' }], 20), /15'/));
console.log(`PASS ${pass} FAIL ${fail}`);
process.exit(fail ? 1 : 0);
