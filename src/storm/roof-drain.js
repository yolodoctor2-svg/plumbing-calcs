/* 2024 UPC Ch. 11 + Appendix D — roof drain / storm pipe sizing.
   Storm package: Tables 1103.1, 1103.2, 1103.3, Appendix D rainfall and scuppers. */
(function (global) {
  'use strict';

  var FACTOR = 0.0104;

  var VERT = [
    { size: 2, gpm: 30, area1: 2880 },
    { size: 3, gpm: 92, area1: 8800 },
    { size: 4, gpm: 192, area1: 18400 },
    { size: 5, gpm: 360, area1: 34600 },
    { size: 6, gpm: 563, area1: 54000 },
    { size: 8, gpm: 1208, area1: 116000 }
  ];

  var HORIZ = {
    '1/8': [
      { size: 3, gpm: 34, area1: 3288 },
      { size: 4, gpm: 78, area1: 7520 },
      { size: 5, gpm: 139, area1: 13360 },
      { size: 6, gpm: 222, area1: 21400 },
      { size: 8, gpm: 478, area1: 46000 },
      { size: 10, gpm: 860, area1: 82800 },
      { size: 12, gpm: 1384, area1: 133200 },
      { size: 15, gpm: 2473, area1: 238000 }
    ],
    '1/4': [
      { size: 3, gpm: 48, area1: 4640 },
      { size: 4, gpm: 110, area1: 10600 },
      { size: 5, gpm: 196, area1: 18880 },
      { size: 6, gpm: 314, area1: 30200 },
      { size: 8, gpm: 677, area1: 65200 },
      { size: 10, gpm: 1214, area1: 116800 },
      { size: 12, gpm: 1953, area1: 188000 },
      { size: 15, gpm: 3491, area1: 336000 }
    ],
    '1/2': [
      { size: 3, gpm: 68, area1: 6576 },
      { size: 4, gpm: 156, area1: 15040 },
      { size: 5, gpm: 278, area1: 26720 },
      { size: 6, gpm: 445, area1: 42800 },
      { size: 8, gpm: 956, area1: 92000 },
      { size: 10, gpm: 1721, area1: 165600 },
      { size: 12, gpm: 2768, area1: 266400 },
      { size: 15, gpm: 4946, area1: 476000 }
    ]
  };

  /* Table 1103.3 areas at 2 in/h. Other rates: allowable = area_at_2 × (2/R). */
  var GUTTER = {
    '1/16': { 3: 340, 4: 720, 5: 1250, 6: 1920, 7: 2760, 8: 3980, 10: 7200 },
    '1/8': { 3: 480, 4: 1020, 5: 1760, 6: 2720, 7: 3900, 8: 5600, 10: 10200 },
    '1/4': { 3: 680, 4: 1440, 5: 2500, 6: 3840, 7: 5520, 8: 7960, 10: 14400 },
    '1/2': { 3: 960, 4: 2040, 5: 3540, 6: 5540, 7: 7800, 8: 11200, 10: 20000 }
  };
  var GUTTER_SIZES = [3, 4, 5, 6, 7, 8, 10];

  /* Appendix D Table D 104.1. null = dash (not listed). */
  var SCUPPER = {
    '0.5': { 6: 6, 12: 13, 18: 19, 24: 25, 30: 32, 36: 38 },
    '1': { 6: 17, 12: 35, 18: 53, 24: 71, 30: 89, 36: 107 },
    '1.5': { 6: 31, 12: 64, 18: 97, 24: 130, 30: 163, 36: 196 },
    '2': { 6: null, 12: 98, 18: 149, 24: 200, 30: 251, 36: 302 },
    '2.5': { 6: null, 12: 136, 18: 207, 24: 278, 30: 349, 36: 420 },
    '3': { 6: null, 12: 177, 18: 271, 24: 364, 30: 458, 36: 551 },
    '3.5': { 6: null, 12: null, 18: 339, 24: 457, 30: 575, 36: 693 },
    '4': { 6: null, 12: null, 18: 412, 24: 556, 30: 700, 36: 844 }
  };

  /* Appendix D Table D 101.1 — 60-minute, 100-year, inches per hour. */
  var CITIES = [
    ['Alabama', 'Birmingham', 3.7],
    ['Alabama', 'Huntsville', 3.3],
    ['Alabama', 'Mobile', 4.5],
    ['Alabama', 'Montgomery', 3.8],
    ['Alaska', 'Aleutian Islands', 1.0],
    ['Alaska', 'Anchorage', 0.6],
    ['Alaska', 'Bethel', 0.8],
    ['Alaska', 'Fairbanks', 1.0],
    ['Alaska', 'Juneau', 0.6],
    ['Arizona', 'Flagstaff', 2.3],
    ['Arizona', 'Phoenix', 2.2],
    ['Arizona', 'Tucson', 3.0],
    ['Arkansas', 'Eudora', 3.8],
    ['Arkansas', 'Ft. Smith', 3.9],
    ['Arkansas', 'Jonesboro', 3.5],
    ['Arkansas', 'Little Rock', 3.7],
    ['California', 'Eureka', 1.5],
    ['California', 'Lake Tahoe', 1.3],
    ['California', 'Los Angeles', 2.0],
    ['California', 'Lucerne Valley', 2.5],
    ['California', 'Needles', 1.5],
    ['California', 'Palmdale', 3.0],
    ['California', 'Redding', 1.5],
    ['California', 'San Diego', 1.5],
    ['California', 'San Francisco', 1.5],
    ['California', 'San Luis Obispo', 1.5],
    ['Colorado', 'Craig', 1.5],
    ['Colorado', 'Denver', 2.2],
    ['Colorado', 'Durango', 1.8],
    ['Colorado', 'Stratton', 3.0],
    ['Connecticut', 'Hartford', 2.8],
    ['Connecticut', 'New Haven', 3.0],
    ['Delaware', 'Dover', 3.5],
    ['Delaware', 'Rehoboth Beach', 3.6],
    ['District of Columbia', 'Washington', 4.0],
    ['Florida', 'Daytona Beach', 4.0],
    ['Florida', 'Ft. Myers', 4.0],
    ['Florida', 'Jacksonville', 4.3],
    ['Florida', 'Melbourne', 4.0],
    ['Florida', 'Miami', 4.5],
    ['Florida', 'Palm Beach', 5.0],
    ['Florida', 'Tampa', 4.2],
    ['Florida', 'Tallahassee', 4.1],
    ['Georgia', 'Atlanta', 3.5],
    ['Georgia', 'Brunswick', 4.0],
    ['Georgia', 'Macon', 3.7],
    ['Georgia', 'Savannah', 4.0],
    ['Georgia', 'Thomasville', 4.0],
    ['Idaho', 'Boise', 1.0],
    ['Idaho', 'Idaho Falls', 1.2],
    ['Idaho', 'Lewiston', 1.0],
    ['Idaho', 'Twin Falls', 1.1],
    ['Illinois', 'Chicago', 2.7],
    ['Illinois', 'Harrisburg', 3.1],
    ['Illinois', 'Peoria', 2.9],
    ['Illinois', 'Springfield', 3.0],
    ['Indiana', 'Evansville', 3.0],
    ['Indiana', 'Indianapolis', 2.8],
    ['Indiana', 'Richmond', 2.7],
    ['Indiana', 'South Bend', 2.7],
    ['Iowa', 'Council Bluffs', 3.7],
    ['Iowa', 'Davenport', 3.0],
    ['Iowa', 'Des Moines', 3.4],
    ['Iowa', 'Sioux City', 3.6],
    ['Kansas', 'Goodland', 3.5],
    ['Kansas', 'Salina', 3.8],
    ['Kansas', 'Topeka', 3.8],
    ['Kansas', 'Wichita', 3.9],
    ['Kentucky', 'Bowling Green', 2.9],
    ['Kentucky', 'Lexington', 2.9],
    ['Kentucky', 'Louisville', 2.8],
    ['Kentucky', 'Paducah', 3.0],
    ['Louisiana', 'Monroe', 3.8],
    ['Louisiana', 'New Orleans', 4.5],
    ['Louisiana', 'Shreveport', 4.0],
    ['Maine', 'Bangor', 2.2],
    ['Maine', 'Kittery', 2.4],
    ['Maine', 'Millinocket', 2.0],
    ['Maryland', 'Baltimore', 3.6],
    ['Maryland', 'Frostburg', 2.9],
    ['Maryland', 'Ocean City', 3.7],
    ['Massachusetts', 'Adams', 2.6],
    ['Massachusetts', 'Boston', 2.7],
    ['Massachusetts', 'Springfield', 2.7],
    ['Michigan', 'Detroit', 2.5],
    ['Michigan', 'Grand Rapids', 2.6],
    ['Michigan', 'Kalamazoo', 2.7],
    ['Michigan', 'Traverse City', 2.2],
    ['Minnesota', 'Duluth', 2.6],
    ['Minnesota', 'Grand Forks', 2.5],
    ['Minnesota', 'Minneapolis', 3.0],
    ['Minnesota', 'Worthington', 3.4],
    ['Mississippi', 'Biloxi', 4.5],
    ['Mississippi', 'Columbus', 3.5],
    ['Mississippi', 'Jackson', 3.8],
    ['Missouri', 'Independence', 3.7],
    ['Missouri', 'Jefferson City', 3.4],
    ['Missouri', 'St. Louis', 3.2],
    ['Missouri', 'Springfield', 3.7],
    ['Montana', 'Billings', 1.8],
    ['Montana', 'Glendive', 2.5],
    ['Montana', 'Great Falls', 1.8],
    ['Montana', 'Missoula', 1.3],
    ['Nebraska', 'Omaha', 3.6],
    ['Nebraska', 'North Platte', 3.5],
    ['Nebraska', 'Scotts Bluff', 2.8],
    ['Nevada', 'Las Vegas', 1.5],
    ['Nevada', 'Reno', 1.2],
    ['Nevada', 'Winnemucca', 1.0],
    ['New Hampshire', 'Berlin', 2.2],
    ['New Hampshire', 'Manchester', 2.5],
    ['New Jersey', 'Atlantic City', 3.4],
    ['New Jersey', 'Paterson', 3.0],
    ['New Jersey', 'Trenton', 3.2],
    ['New Mexico', 'Albuquerque', 2.0],
    ['New Mexico', 'Carlsbad', 2.6],
    ['New Mexico', 'Gallup', 2.1],
    ['New York', 'Binghamton', 2.4],
    ['New York', 'Buffalo', 2.3],
    ['New York', 'New York City', 3.1],
    ['New York', 'Schenectady', 2.5],
    ['New York', 'Syracuse', 2.4],
    ['North Carolina', 'Asheville', 3.2],
    ['North Carolina', 'Charlotte', 3.4],
    ['North Carolina', 'Raleigh', 4.0],
    ['North Carolina', 'Wilmington', 4.4],
    ['North Dakota', 'Bismarck', 2.7],
    ['North Dakota', 'Fargo', 2.9],
    ['North Dakota', 'Minot', 2.6],
    ['Ohio', 'Cincinnati', 2.8],
    ['Ohio', 'Cleveland', 2.4],
    ['Ohio', 'Columbus', 2.7],
    ['Ohio', 'Toledo', 2.6],
    ['Ohio', 'Youngstown', 2.4],
    ['Oklahoma', 'Boise City', 3.4],
    ['Oklahoma', 'Muskogee', 4.0],
    ['Oklahoma', 'Oklahoma City', 4.1],
    ['Oregon', 'Medford', 1.3],
    ['Oregon', 'Ontario', 1.0],
    ['Oregon', 'Portland', 1.3],
    ['Pennsylvania', 'Erie', 2.4],
    ['Pennsylvania', 'Harrisburg', 2.9],
    ['Pennsylvania', 'Philadelphia', 3.2],
    ['Pennsylvania', 'Pittsburgh', 2.5],
    ['Pennsylvania', 'Scranton', 2.8],
    ['Rhode Island', 'Newport', 3.0],
    ['Rhode Island', 'Providence', 2.9],
    ['South Carolina', 'Charleston', 4.1],
    ['South Carolina', 'Columbia', 3.5],
    ['South Carolina', 'Greenville', 3.3],
    ['South Dakota', 'Lemmon', 2.7],
    ['South Dakota', 'Rapid City', 2.7],
    ['South Dakota', 'Sioux Falls', 3.4],
    ['Tennessee', 'Knoxville', 3.1],
    ['Tennessee', 'Memphis', 3.5],
    ['Tennessee', 'Nashville', 3.0],
    ['Texas', 'Corpus Christi', 4.6],
    ['Texas', 'Dallas', 4.2],
    ['Texas', 'El Paso', 2.0],
    ['Texas', 'Houston', 4.6],
    ['Texas', 'Lubbock', 3.3],
    ['Texas', 'San Antonio', 4.4],
    ['Utah', 'Bluff', 2.0],
    ['Utah', 'Cedar City', 1.5],
    ['Utah', 'Salt Lake City', 1.3],
    ['Vermont', 'Bennington', 2.5],
    ['Vermont', 'Burlington', 2.3],
    ['Vermont', 'Rutland', 2.4],
    ['Virginia', 'Charlottesville', 3.4],
    ['Virginia', 'Norfolk', 4.0],
    ['Virginia', 'Richmond', 4.0],
    ['Virginia', 'Roanoke', 3.3],
    ['Washington', 'Seattle', 1.0],
    ['Washington', 'Spokane', 1.0],
    ['Washington', 'Walla Walla', 1.0],
    ['West Virginia', 'Charleston', 2.9],
    ['West Virginia', 'Martinsburg', 3.0],
    ['West Virginia', 'Morgantown', 2.7],
    ['Wisconsin', 'Green Bay', 2.5],
    ['Wisconsin', 'Lacrosse', 2.9],
    ['Wisconsin', 'Milwaukee', 2.7],
    ['Wisconsin', 'Sheboygan', 2.1],
    ['Wisconsin', 'Wausau', 2.5],
    ['Wyoming', 'Casper', 1.9],
    ['Wyoming', 'Cheyenne', 2.5],
    ['Wyoming', 'Evanston', 1.3],
    ['Wyoming', 'Rock Springs', 1.4]
  ];

  function num(v) {
    if (v == null) return NaN;
    var n = Number(String(v).trim().replace(/,/g, ''));
    return Number.isFinite(n) ? n : NaN;
  }

  function pickPipe(rows, area, R, Q) {
    var i, row, allowable;
    for (i = 0; i < rows.length; i++) {
      row = rows[i];
      allowable = row.area1 / R;
      if (allowable + 1e-6 >= area && row.gpm + 1e-6 >= Q) {
        return { size: row.size, gpm: row.gpm, area1: row.area1, allowable: allowable, util: (area / allowable) * 100, ok: true };
      }
    }
    row = rows[rows.length - 1];
    allowable = row.area1 / R;
    return { size: row.size, gpm: row.gpm, area1: row.area1, allowable: allowable, util: (area / allowable) * 100, ok: false };
  }

  function pickGutter(slope, area, R) {
    var table = GUTTER[slope];
    var i, size, area2, allowable;
    if (!table) return null;
    for (i = 0; i < GUTTER_SIZES.length; i++) {
      size = GUTTER_SIZES[i];
      area2 = table[size];
      allowable = area2 * (2 / R);
      if (allowable + 1e-6 >= area) {
        return { size: size, area2: area2, allowable: allowable, util: (area / allowable) * 100, ok: true };
      }
    }
    size = GUTTER_SIZES[GUTTER_SIZES.length - 1];
    area2 = table[size];
    allowable = area2 * (2 / R);
    return { size: size, area2: area2, allowable: allowable, util: (area / allowable) * 100, ok: false };
  }

  function compute(input) {
    var roof = num(input.area);
    var R = num(input.rainfall);
    var drains = parseInt(input.drains, 10);
    var wallMode = input.wallMode || 'none';
    var wall = num(input.wallArea);
    var slope = input.slope || '1/8';
    var gutterSlope = input.gutterSlope || slope;
    var wallAdd = 0;

    if (!Number.isFinite(roof) || roof <= 0) return { ok: false, error: 'Enter a horizontally projected roof area greater than zero.' };
    if (!Number.isFinite(R) || R <= 0) return { ok: false, error: 'Enter a design rainfall rate greater than zero.' };
    if (!Number.isFinite(drains) || drains < 1) return { ok: false, error: 'Number of primary roof drains must be a whole number of at least 1.' };
    if (!HORIZ[slope]) return { ok: false, error: 'Choose a horizontal pipe slope of 1/8, 1/4, or 1/2 inch per foot.' };
    if (wallMode !== 'none' && wallMode !== 'one' && wallMode !== 'two') wallMode = 'none';
    if (wallMode !== 'none') {
      if (!Number.isFinite(wall) || wall < 0) return { ok: false, error: 'Wall area must be zero or a positive number of square feet.' };
      wallAdd = wallMode === 'one' ? 0.5 * wall : 0.35 * wall;
    } else {
      wall = 0;
    }
    if (!GUTTER[gutterSlope]) gutterSlope = slope;

    var totalArea = roof + wallAdd;
    var perArea = totalArea / drains;
    var qEach = perArea * R * FACTOR;
    var qTotal = totalArea * R * FACTOR;
    var vertical = pickPipe(VERT, perArea, R, qEach);
    var horizontal = pickPipe(HORIZ[slope], perArea, R, qEach);
    var gutter = pickGutter(gutterSlope, perArea, R);
    var combined = drains > 1 ? pickPipe(HORIZ[slope], totalArea, R, qTotal) : null;

    return {
      ok: true,
      roof: roof,
      rainfall: R,
      drains: drains,
      wallMode: wallMode,
      wall: wallMode === 'none' ? 0 : wall,
      wallAdd: wallAdd,
      slope: slope,
      gutterSlope: gutterSlope,
      totalArea: totalArea,
      perArea: perArea,
      qEach: qEach,
      qTotal: qTotal,
      vertical: vertical,
      horizontal: horizontal,
      gutter: gutter,
      combined: combined
    };
  }

  function scupperGpm(head, width) {
    var row = SCUPPER[String(head)];
    if (!row) return undefined;
    if (!Object.prototype.hasOwnProperty.call(row, width) && !Object.prototype.hasOwnProperty.call(row, Number(width))) return undefined;
    var key = Object.prototype.hasOwnProperty.call(row, width) ? width : Number(width);
    return row[key];
  }

  function fmt(n, digits) {
    if (!Number.isFinite(n)) return '—';
    return n.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: 0 });
  }
  function fmtFixed(n, digits) {
    if (!Number.isFinite(n)) return '—';
    return n.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
  }
    var SLOPE_DEC = { '1/16': '0.005', '1/8': '0.01', '1/4': '0.02', '1/2': '0.04' };
  function slopeLabel(slope) {
    var dec = SLOPE_DEC[slope];
    return dec ? (slope + '″/ft (' + dec + ')') : (slope + '″/ft');
  }

function inch(size) { return size + '″'; }

  function utilClass(util, ok) {
    if (!ok || util > 100) return 'bg-red-500';
    if (util >= 85) return 'bg-amber-500';
    return 'bg-emerald-500';
  }

  var openSections = {};

  function pipeCard(key, title, tableName, pick, slopeNote) {
    var bar = Math.max(0, Math.min(100, pick.util));
    var status = pick.ok
      ? '<p class="text-sm text-slate-600 mt-1">Smallest listed size where allowable area and gpm both cover the design.</p>'
      : '<p class="text-sm font-medium text-red-700 mt-1">Exceeds Table ' + tableName + ' — split drains or engineer a special design. Largest listed size is shown and is not adequate.</p>';
    var slope = slopeNote ? '<p class="text-xs text-slate-500 mt-1">' + slopeNote + '</p>' : '';
    var sizeWord = pick.ok ? inch(pick.size) : ('Exceeds · ' + inch(pick.size));
    return (
      '<details class="rd-sec rounded-lg border ' + (pick.ok ? 'border-slate-200' : 'border-red-300') + ' bg-white" data-sec="' + key + '"' + (openSections[key] ? ' open' : '') + '>' +
        '<summary class="cursor-pointer list-none px-4 py-3 flex items-center justify-between gap-3">' +
          '<span class="min-w-0">' +
            '<span class="block text-xs font-semibold uppercase tracking-wide text-indigo-600">' + title + '</span>' +
            '<span class="block text-xl font-semibold text-slate-900 mt-0.5">' + sizeWord + '</span>' +
          '</span>' +
          '<span class="shrink-0 text-sm font-semibold ' + (pick.ok ? 'text-slate-800' : 'text-red-700') + '">' + fmtFixed(pick.util, 1) + '%</span>' +
        '</summary>' +
        '<div class="px-4 pb-4 border-t border-slate-100">' +
          status + slope +
          '<dl class="mt-3 grid grid-cols-2 gap-2 text-sm">' +
            '<div><dt class="text-slate-500">Listed capacity</dt><dd class="font-medium text-slate-800">' + fmt(pick.gpm, 0) + ' gpm</dd></div>' +
            '<div><dt class="text-slate-500">Max area at this rainfall</dt><dd class="font-medium text-slate-800">' + fmt(pick.allowable, 0) + ' sq ft</dd></div>' +
            '<div><dt class="text-slate-500">Area at 1 in/h</dt><dd class="font-medium text-slate-800">' + fmt(pick.area1, 0) + ' sq ft</dd></div>' +
            '<div><dt class="text-slate-500">Utilization</dt><dd class="font-medium text-slate-800">' + fmtFixed(pick.util, 1) + '%</dd></div>' +
          '</dl>' +
          '<div class="mt-3 h-1.5 rounded bg-slate-100 overflow-hidden" aria-hidden="true"><div class="h-1.5 ' + utilClass(pick.util, pick.ok) + '" style="width:' + bar + '%"></div></div>' +
          '<p class="text-[11px] text-slate-400 mt-2">Utilization = design area ÷ allowable area. Allowable = (area at 1 in/h) ÷ R.</p>' +
        '</div>' +
      '</details>'
    );
  }

  function gutterCard(pick, slope) {
    var bar = Math.max(0, Math.min(100, pick.util));
    var status = pick.ok
      ? '<p class="text-sm text-slate-600 mt-1">Smallest semi-circular gutter whose scaled allowable area covers the design area.</p>'
      : '<p class="text-sm font-medium text-red-700 mt-1">Exceeds Table 1103.3 — split the roof or engineer a special gutter. Largest listed size is not adequate.</p>';
    return (
      '<article class="rounded-lg border ' + (pick.ok ? 'border-slate-200' : 'border-red-300') + ' bg-white p-4">' +
        '<h3 class="text-xs font-semibold uppercase tracking-wide text-indigo-600">Semi-circular gutter · Table 1103.3</h3>' +
        '<p class="text-xl font-semibold text-slate-900 mt-1">' + (pick.ok ? 'Recommended: ' : 'Largest listed: ') + inch(pick.size) + ' @ ' + slope + '″/ft</p>' +
        status +
        '<dl class="mt-3 grid grid-cols-2 gap-2 text-sm">' +
          '<div><dt class="text-slate-500">Area at 2 in/h</dt><dd class="font-medium text-slate-800">' + fmt(pick.area2, 0) + ' sq ft</dd></div>' +
          '<div><dt class="text-slate-500">Max area at this rainfall</dt><dd class="font-medium text-slate-800">' + fmt(pick.allowable, 0) + ' sq ft</dd></div>' +
          '<div class="col-span-2"><dt class="text-slate-500">Utilization</dt><dd class="font-medium text-slate-800">' + fmtFixed(pick.util, 1) + '%</dd></div>' +
        '</dl>' +
        '<div class="mt-3 h-1.5 rounded bg-slate-100 overflow-hidden" aria-hidden="true"><div class="h-1.5 ' + utilClass(pick.util, pick.ok) + '" style="width:' + bar + '%"></div></div>' +
        '<p class="text-[11px] text-slate-400 mt-2">Allowable = (area at 2 in/h) × (2 ÷ R). Rates other than 2 in/h are scaled from that column; 3–6 in/h columns are not stored separately.</p>' +
      '</article>'
    );
  }

  function render(result) {
    var el = document.getElementById('rdResults');
    if (!el) return;
    if (!result.ok) {
      el.innerHTML = '<div class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">' + result.error + '</div>';
      return;
    }
    var r = result;
    var allOk = r.vertical.ok && r.horizontal.ok && (!r.combined || r.combined.ok);
    var banner = allOk
      ? '<div class="rounded-lg bg-indigo-600 text-white p-4"><p class="text-xs uppercase tracking-wide text-indigo-100">Recommended each primary drain</p><p class="text-lg font-semibold mt-1">' +
          inch(r.horizontal.size) + ' horizontal @ ' + slopeLabel(r.slope) + ' · ' + inch(r.vertical.size) + ' vertical</p></div>'
      : '<div class="rounded-lg bg-red-700 text-white p-4"><p class="text-xs uppercase tracking-wide text-red-100">Does not fit the published tables</p><p class="text-sm mt-1">One or more picks exceed Table 1103.2 or 1103.1. Split the area across more drains or get a special design. Do not treat the largest listed size as adequate.</p></div>';

    var wallLine = r.wallMode === 'none'
      ? 'No wall contribution.'
      : (r.wallMode === 'one'
          ? 'One adjacent wall: add 50% of ' + fmt(r.wall, 0) + ' sq ft = ' + fmt(r.wallAdd, 0) + ' sq ft (UPC 1103.4 simplified).'
          : 'Two adjacent equal walls: add 35% of ' + fmt(r.wall, 0) + ' sq ft total = ' + fmt(r.wallAdd, 0) + ' sq ft (UPC 1103.4 simplified).');

    var flow =
      '<article class="rounded-lg border border-slate-200 bg-white p-4">' +
        '<h3 class="text-xs font-semibold uppercase tracking-wide text-indigo-600">Design flow</h3>' +
        '<p class="font-mono text-sm text-slate-700 mt-2">Q = A × R × 0.0104</p>' +
        '<p class="font-mono text-sm text-slate-800">Q<sub>each</sub> = ' + fmt(r.perArea, 1) + ' × ' + fmt(r.rainfall, 2) + ' × 0.0104 = <strong>' + fmtFixed(r.qEach, 1) + ' gpm</strong></p>' +
        (r.drains > 1 ? '<p class="font-mono text-sm text-slate-800">Q<sub>total</sub> = ' + fmt(r.totalArea, 1) + ' × ' + fmt(r.rainfall, 2) + ' × 0.0104 = <strong>' + fmtFixed(r.qTotal, 1) + ' gpm</strong></p>' : '') +
        '<ul class="mt-3 text-sm text-slate-600 space-y-1">' +
          '<li>Projected roof: ' + fmt(r.roof, 0) + ' sq ft</li>' +
          '<li>' + wallLine + '</li>' +
          '<li>Tributary total: ' + fmt(r.totalArea, 0) + ' sq ft</li>' +
          '<li>Primary drains: ' + r.drains + ' → design area each ' + fmt(r.perArea, 1) + ' sq ft</li>' +
        '</ul>' +
        '<p class="text-[11px] text-slate-400 mt-2">Horizontal and vertical sizes below are for the per-drain area. A pipe is accepted only when both allowable area and listed gpm cover the design.</p>' +
      '</article>';

    var combined = '';
    if (r.combined) {
      combined = pipeCard(
        'combined',
        'Combined horizontal main · Table 1103.2',
        '1103.2',
        r.combined,
        'Same slope (' + slopeLabel(r.slope) + '), full tributary area if one storm main carries every primary drain. Not a substitute for a branched layout.'
      );
    }

    el.innerHTML = banner + flow +
      '<div class="grid gap-3">' +
        pipeCard('horizontal', 'Horizontal storm drain · Table 1103.2', '1103.2', r.horizontal, 'Slope ' + slopeLabel(r.slope) + '. Sized for one primary drain.') +
        combined +
        pipeCard('vertical', 'Roof drain / vertical leader · Table 1103.1', '1103.1', r.vertical, 'Vertical rainwater conductor. No slope term in this table.') +
      '</div>' +
      '<p class="text-xs text-slate-500">2024 UPC Table 1103.2, then Table 1103.1; Appendix D</p>';
    el.querySelectorAll('details.rd-sec').forEach(function (d) {
      d.addEventListener('toggle', function () {
        openSections[d.getAttribute('data-sec')] = d.open;
      });
    });
  }

  function renderScupper(qEach) {
    var out = document.getElementById('rdScupperOut');
    if (!out) return;
    var head = document.getElementById('rdHead').value;
    var width = Number(document.getElementById('rdWidth').value);
    var gpm = scupperGpm(head, width);
    if (gpm == null) {
      out.innerHTML = '<p class="text-sm text-slate-700">Not listed in Table D 104.1 for a ' + width + '″ scupper at ' + head + '″ head (table shows a dash). Increase width or reduce head.</p>';
      return;
    }
    var compare = '';
    if (Number.isFinite(qEach) && qEach > 0) {
      if (gpm + 1e-6 >= qEach) {
        compare = '<p class="text-sm text-emerald-700 mt-1">Listed ' + gpm + ' gpm covers this drain’s ' + fmtFixed(qEach, 1) + ' gpm.</p>';
      } else {
        var n = Math.ceil(qEach / gpm);
        compare = '<p class="text-sm text-amber-800 mt-1">Listed ' + gpm + ' gpm is below this drain’s ' + fmtFixed(qEach, 1) + ' gpm. About ' + n + ' of this size would match the flow by straight division — confirm head, width, and roof structure with the design professional.</p>';
      }
    }
    out.innerHTML = '<p class="text-lg font-semibold text-slate-900">' + gpm + ' gpm</p><p class="text-xs text-slate-500">Table D 104.1 · ' + width + '″ wide · ' + head + '″ head. Head is depth above the scupper opening bottom. Opening height shall be at least twice the design head.</p>' + compare;
  }

  var lockRain = false;
  var lastQ = NaN;
  var lastResult = null;

  function whatRows(kind, slope) {
    if (kind === 'vertical') return VERT;
    return HORIZ[slope] || HORIZ['1/8'];
  }

  function fillWhatSizes(result) {
    var kindEl = document.getElementById('rdWhatKind');
    var sizeEl = document.getElementById('rdWhatSize');
    if (!kindEl || !sizeEl) return;
    var kind = kindEl.value === 'vertical' ? 'vertical' : 'horizontal';
    var slope = result && result.ok ? result.slope : '1/8';
    var rows = whatRows(kind, slope);
    var prev = sizeEl.value;
    var html = '';
    var i;
    for (i = 0; i < rows.length; i++) html += '<option value="' + rows[i].size + '">' + rows[i].size + '″</option>';
    sizeEl.innerHTML = html;
    if (prev && sizeEl.querySelector('option[value="' + prev + '"]')) sizeEl.value = prev;
    else if (result && result.ok) {
      var rec = kind === 'vertical' ? result.vertical.size : result.horizontal.size;
      if (sizeEl.querySelector('option[value="' + rec + '"]')) sizeEl.value = String(rec);
    }
  }

  function renderWhatIf(result) {
    var out = document.getElementById('rdWhatOut');
    if (!out) return;
    fillWhatSizes(result);
    if (!result || !result.ok) {
      out.innerHTML = '<p class="text-slate-500">Enter a roof area and rainfall to compare a size.</p>';
      return;
    }
    var kindEl = document.getElementById('rdWhatKind');
    var sizeEl = document.getElementById('rdWhatSize');
    var kind = kindEl.value === 'vertical' ? 'vertical' : 'horizontal';
    var size = Number(sizeEl.value);
    var rows = whatRows(kind, result.slope);
    var row = null;
    var i;
    for (i = 0; i < rows.length; i++) if (rows[i].size === size) row = rows[i];
    if (!row) {
      out.textContent = 'That size is not in this table.';
      return;
    }
    var allowable = row.area1 / result.rainfall;
    var load = result.qEach;
    var util = (load / row.gpm) * 100;
    var over = util > 100.05;
    out.innerHTML =
      '<dl class="grid sm:grid-cols-3 gap-3">' +
        '<div class="rounded-md bg-slate-50 px-3 py-2"><dt class="text-xs text-slate-500">Current load</dt><dd class="font-semibold text-slate-900">' + fmtFixed(load, 1) + ' gpm</dd></div>' +
        '<div class="rounded-md bg-slate-50 px-3 py-2"><dt class="text-xs text-slate-500">Max load</dt><dd class="font-semibold text-slate-900">' + fmt(row.gpm, 0) + ' gpm</dd></div>' +
        '<div class="rounded-md px-3 py-2 ' + (over ? 'bg-red-50' : 'bg-slate-50') + '"><dt class="text-xs text-slate-500">Utilization</dt><dd class="font-semibold ' + (over ? 'text-red-700' : 'text-slate-900') + '">' + fmtFixed(util, 1) + '%</dd></div>' +
      '</dl>' +
      '<p class="text-[11px] text-slate-400 mt-2">' +
        (kind === 'horizontal' ? 'Horizontal Table 1103.2 at ' + slopeLabel(result.slope) : 'Vertical Table 1103.1') +
        ' · ' + size + '″. Max area at this rainfall is ' + fmt(allowable, 0) + ' sq ft against ' + fmt(result.perArea, 0) + ' sq ft per drain' +
        (over ? '. Over 100% — this size does not cover the design flow.' : '.') +
      '</p>';
  }

  function cityKey(row) { return row[0] + '|' + row[1]; }

  function fillCities(filter) {
    var sel = document.getElementById('rdCity');
    if (!sel) return;
    var current = sel.value;
    var q = (filter || '').trim().toLowerCase();
    var html = '<option value="">Custom rainfall</option>';
    var i, row, label, match;
    var lastState = '';
    for (i = 0; i < CITIES.length; i++) {
      row = CITIES[i];
      label = row[1] + ', ' + row[0];
      match = !q || label.toLowerCase().indexOf(q) !== -1 || String(row[2]).indexOf(q) !== -1;
      if (!match) continue;
      if (row[0] !== lastState) {
        if (lastState) html += '</optgroup>';
        html += '<optgroup label="' + row[0] + '">';
        lastState = row[0];
      }
      html += '<option value="' + cityKey(row) + '">' + row[1] + ' — ' + row[2] + ' in/h</option>';
    }
    if (lastState) html += '</optgroup>';
    html += '<optgroup label="Hawaii"><option value="__hawaii" disabled>Consult local data (about 1.5–8 in/h)</option></optgroup>';
    sel.innerHTML = html;
    if (current && sel.querySelector('option[value="' + CSS.escape(current) + '"]')) sel.value = current;
    else if (!q) sel.value = savedDefault().city || 'Nevada|Las Vegas';
  }

  var DEFAULT_KEY = 'workspacePlannerStormDefault_v1';

  function savedDefault() {
    try {
      var raw = localStorage.getItem(DEFAULT_KEY);
      if (!raw) return { city: 'Nevada|Las Vegas', rain: '1.5' };
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.rain == null) return { city: 'Nevada|Las Vegas', rain: '1.5' };
      return { city: parsed.city || '', rain: String(parsed.rain) };
    } catch (e) {
      return { city: 'Nevada|Las Vegas', rain: '1.5' };
    }
  }

  function setDefaultFromCity() {
    var city = document.getElementById('rdCity');
    var rain = document.getElementById('rdRain');
    var payload = { city: city && city.value ? city.value : '', rain: rain ? rain.value : '1.5' };
    try { localStorage.setItem(DEFAULT_KEY, JSON.stringify(payload)); } catch (e) {}
  }

  function readInput() {
    var slopeBtn = document.querySelector('[data-slope][aria-pressed="true"]');
    var follow = document.getElementById('rdGutterFollow');
    var gutterSel = document.getElementById('rdGutterSlope');
    var slope = slopeBtn ? slopeBtn.getAttribute('data-slope') : '1/8';
    var wallModeEl = document.querySelector('input[name="rdWall"]:checked');
    return {
      area: document.getElementById('rdArea').value,
      rainfall: document.getElementById('rdRain').value,
      drains: document.getElementById('rdDrains').value,
      slope: slope,
      gutterSlope: (follow && gutterSel) ? (follow.checked ? slope : gutterSel.value) : slope,
      wallMode: wallModeEl ? wallModeEl.value : 'none',
      wallArea: document.getElementById('rdWallArea').value
    };
  }

  function syncGutterControl() {
    var follow = document.getElementById('rdGutterFollow');
    var gutterSel = document.getElementById('rdGutterSlope');
    var slopeBtn = document.querySelector('[data-slope][aria-pressed="true"]');
    var slope = slopeBtn ? slopeBtn.getAttribute('data-slope') : '1/8';
    if (follow && follow.checked) {
      gutterSel.value = slope;
      gutterSel.disabled = true;
    } else if (gutterSel) {
      gutterSel.disabled = false;
    }
  }

  function paintSlope(slope) {
    document.querySelectorAll('[data-slope]').forEach(function (btn) {
      var on = btn.getAttribute('data-slope') === slope;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.className = on
        ? 'rd-slope flex-1 text-sm font-medium py-1.5 leading-tight bg-indigo-600 text-white'
        : 'rd-slope flex-1 text-sm font-medium py-1.5 leading-tight bg-white text-slate-600 hover:bg-slate-50';
    });
  }

  function syncWallFields() {
    var mode = document.querySelector('input[name="rdWall"]:checked');
    var wrap = document.getElementById('rdWallFields');
    var label = document.getElementById('rdWallLabel');
    var hint = document.getElementById('rdWallHint');
    var m = mode ? mode.value : 'none';
    wrap.classList.toggle('hidden', m === 'none');
    if (m === 'one') {
      label.textContent = 'Wall area (sq ft)';
      hint.textContent = 'One wall: 50% of this area is added to the projected roof.';
    } else if (m === 'two') {
      label.textContent = 'Total area of the two adjacent walls (sq ft)';
      hint.textContent = 'Two adjacent equal walls: 35% of this total is added to the projected roof.';
    }
  }

  function recalc() {
    syncGutterControl();
    var result = compute(readInput());
    lastQ = result.ok ? result.qEach : NaN;
    lastResult = result;
    render(result);
    renderScupper(lastQ);
    renderWhatIf(result);
  }

  function bind() {
    fillCities('');
    var city = document.getElementById('rdCity');
    var def = savedDefault();
    if (def.city && city.querySelector('option[value="' + CSS.escape(def.city) + '"]')) city.value = def.city;
    else city.value = '';
    document.getElementById('rdRain').value = def.rain || '1.2';
    paintSlope('1/8');
    syncWallFields();

    var menu = document.createElement('div');
    menu.id = 'rdCityMenu';
    menu.className = 'hidden fixed z-50 min-w-[11rem] rounded-md border border-slate-200 bg-white shadow-lg py-1 text-sm';
    menu.innerHTML = '<button type="button" class="w-full text-left px-3 py-2 hover:bg-indigo-50 text-slate-700">Set as default location</button>';
    document.body.appendChild(menu);
    function hideMenu() { menu.classList.add('hidden'); }
    city.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      menu.style.left = Math.min(e.clientX, window.innerWidth - 190) + 'px';
      menu.style.top = Math.min(e.clientY, window.innerHeight - 48) + 'px';
      menu.classList.remove('hidden');
    });
    menu.querySelector('button').addEventListener('click', function () {
      setDefaultFromCity();
      hideMenu();
    });
    document.addEventListener('click', hideMenu);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hideMenu(); });
    window.addEventListener('scroll', hideMenu, true);

    document.getElementById('rdCitySearch').addEventListener('input', function (e) {
      var keep = city.value;
      fillCities(e.target.value);
      if (keep && city.querySelector('option[value="' + CSS.escape(keep) + '"]')) city.value = keep;
    });
    city.addEventListener('change', function () {
      if (!city.value || city.value === '__hawaii') return;
      var i, row;
      for (i = 0; i < CITIES.length; i++) {
        row = CITIES[i];
        if (cityKey(row) === city.value) {
          lockRain = true;
          document.getElementById('rdRain').value = String(row[2]);
          lockRain = false;
          break;
        }
      }
      recalc();
    });
    document.getElementById('rdRain').addEventListener('input', function () {
      if (!lockRain) city.value = '';
      recalc();
    });
    ['rdArea', 'rdDrains', 'rdWallArea'].forEach(function (id) {
      document.getElementById(id).addEventListener('input', recalc);
    });
    document.querySelectorAll('[data-slope]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        paintSlope(btn.getAttribute('data-slope'));
        recalc();
      });
    });
    var gutterFollow = document.getElementById('rdGutterFollow');
    var gutterSlope = document.getElementById('rdGutterSlope');
    if (gutterFollow) gutterFollow.addEventListener('change', recalc);
    if (gutterSlope) gutterSlope.addEventListener('change', function () {
      if (gutterFollow) gutterFollow.checked = false;
      recalc();
    });
    document.querySelectorAll('input[name="rdWall"]').forEach(function (el) {
      el.addEventListener('change', function () {
        syncWallFields();
        recalc();
      });
    });
    var whatKind = document.getElementById('rdWhatKind');
    var whatSize = document.getElementById('rdWhatSize');
    if (whatKind) whatKind.addEventListener('change', function () { renderWhatIf(lastResult); });
    if (whatSize) whatSize.addEventListener('change', function () { renderWhatIf(lastResult); });
    document.getElementById('rdHead').addEventListener('change', function () { renderScupper(lastQ); });
    document.getElementById('rdWidth').addEventListener('change', function () { renderScupper(lastQ); });
    var LOG_KEY = 'workspacePlannerStormLog_v1';
    function loadLog() {
      try {
        var raw = JSON.parse(localStorage.getItem(LOG_KEY) || '{}');
        return { title: raw.title || '', rows: Array.isArray(raw.rows) ? raw.rows : [] };
      } catch (e) { return { title: '', rows: [] }; }
    }
    function saveLog(log) {
      try { localStorage.setItem(LOG_KEY, JSON.stringify(log)); } catch (e) {}
    }
    function paintLog() {
      var log = loadLog();
      var title = document.getElementById('rdProject');
      var list = document.getElementById('rdLogList');
      if (title && document.activeElement !== title) title.value = log.title;
      if (!list) return;
      if (!log.rows.length) {
        list.innerHTML = '<p class="text-slate-400">No areas yet. Size one roof, name it, then add it.</p>';
        return;
      }
      list.innerHTML = log.rows.map(function (row, i) {
        var flag = (row.hOk && row.vOk) ? '' : ' <span class="text-red-700">over table</span>';
        return '<div class="flex items-start justify-between gap-3 border-t border-slate-100 py-2">' +
          '<div><div class="font-medium text-slate-800">' + (i + 1) + '. ' + row.label + flag + '</div>' +
          '<div class="text-xs text-slate-500">' + row.roof + ' sq ft · ' + row.rainfall + ' in/h · ' +
          row.hSize + '″ horiz (' + row.hUtil + '%) · ' + row.vSize + '″ vert (' + row.vUtil + '%)</div></div>' +
          '<button type="button" data-log-remove="' + i + '" class="text-xs text-slate-400 hover:text-red-600">Remove</button></div>';
      }).join('');
    }
    function cityName() {
      var sel = document.getElementById('rdCity');
      if (!sel || !sel.value) return 'Custom';
      var opt = sel.options[sel.selectedIndex];
      return opt ? opt.textContent.replace(/\s+/g, ' ').trim() : 'Custom';
    }
    function addLogRow() {
      if (!lastResult || !lastResult.ok) {
        document.getElementById('rdLogStatus').textContent = 'Size a valid area before adding it.';
        return;
      }
      var r = lastResult;
      var label = (document.getElementById('rdLabel').value || '').trim() || ('Area ' + (loadLog().rows.length + 1));
      var log = loadLog();
      log.title = document.getElementById('rdProject').value || log.title;
      log.rows.push({
        label: label.slice(0, 80),
        city: cityName().slice(0, 80),
        rainfall: Number(r.rainfall.toFixed(2)),
        roof: Math.round(r.roof),
        drains: r.drains,
        slope: r.slope,
        perArea: Number(r.perArea.toFixed(1)),
        qEach: Number(r.qEach.toFixed(1)),
        hSize: r.horizontal.size,
        hUtil: Number(r.horizontal.util.toFixed(1)),
        hGpm: r.horizontal.gpm,
        hOk: !!r.horizontal.ok,
        vSize: r.vertical.size,
        vUtil: Number(r.vertical.util.toFixed(1)),
        vGpm: r.vertical.gpm,
        vOk: !!r.vertical.ok
      });
      saveLog(log);
      paintLog();
      document.getElementById('rdLogStatus').textContent = 'Added ' + label + '.';
      var n = log.rows.length + 1;
      document.getElementById('rdLabel').value = 'Area ' + n;
    }
    async function exportLogPdf() {
      var statusEl = document.getElementById('rdLogStatus');
      var log = loadLog();
      log.title = (document.getElementById('rdProject').value || '').trim() || log.title || 'Storm drainage log';
      saveLog(log);
      if (!log.rows.length) {
        statusEl.textContent = 'Add at least one area first.';
        return;
      }
      statusEl.textContent = 'Building PDF…';
      var blob;
      try {
        // Built in the browser (the planner compiled LaTeX on its server; this site has no server).
        var mod = await import(new URL('log-pdf.js', document.baseURI).href);
        blob = await mod.buildStormLogPdf(log);
      } catch (e) {
        statusEl.textContent = 'PDF export failed: ' + (e && e.message ? e.message : e);
        return;
      }
      var a = document.createElement('a');
      var url = URL.createObjectURL(blob);
      a.href = url;
      a.download = (log.title || 'storm-log').replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 60) + '.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      statusEl.textContent = 'PDF downloaded.';
    }
    paintLog();
    document.getElementById('rdProject').addEventListener('change', function () {
      var log = loadLog();
      log.title = document.getElementById('rdProject').value;
      saveLog(log);
    });
    document.getElementById('rdLogAdd').addEventListener('click', addLogRow);
    document.getElementById('rdLogClear').addEventListener('click', function () {
      saveLog({ title: document.getElementById('rdProject').value || '', rows: [] });
      paintLog();
      document.getElementById('rdLogStatus').textContent = 'Log cleared.';
    });
    document.getElementById('rdLogList').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-log-remove]');
      if (!btn) return;
      var log = loadLog();
      log.rows.splice(Number(btn.getAttribute('data-log-remove')), 1);
      saveLog(log);
      paintLog();
    });
    var printBtn = document.getElementById('rdPrint');
    if (printBtn) printBtn.addEventListener('click', function () {
      document.getElementById('rdLog').scrollIntoView({ behavior: 'smooth', block: 'start' });
      exportLogPdf();
    });

    var themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', function () {
        var dark = !document.documentElement.classList.contains('dark');
        document.documentElement.classList.toggle('dark', dark);
        var icon = document.getElementById('themeToggleIcon');
        if (icon) icon.className = dark ? 'fas fa-sun' : 'fas fa-moon';
        try { localStorage.setItem('workspacePlannerTheme_v1', dark ? 'dark' : 'light'); } catch (e) {}
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', dark ? '#0f172a' : '#4f46e5');
      });
      if (document.documentElement.classList.contains('dark')) {
        var icon0 = document.getElementById('themeToggleIcon');
        if (icon0) icon0.className = 'fas fa-sun';
      }
    }
    recalc();
  }

  global.RoofDrain = {
    compute: compute,
    scupperGpm: scupperGpm,
    CITIES: CITIES,
    VERT: VERT,
    HORIZ: HORIZ,
    GUTTER: GUTTER,
    FACTOR: FACTOR
  };

  if (global.document) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
    else bind();
  }
})(typeof window !== 'undefined' ? window : globalThis);
