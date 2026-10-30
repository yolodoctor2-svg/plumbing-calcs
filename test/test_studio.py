"""Plumbing Sizer Studio: original single file vs. ported modules must behave the same.
usage: python test_studio.py ORIGINAL_URL PORT_URL [shots_dir]"""
import sys, json, os
from playwright.sync_api import sync_playwright
ORIG, PORT = sys.argv[1], sys.argv[2]
SHOTS = sys.argv[3] if len(sys.argv) > 3 else None
PLAN = '/workspace/dwv-build/test/plans/plan-eighth-36x24.pdf'
ok, bad = [], []
def check(name, cond, info=''):
    (ok if cond else bad).append(name); print(('ok ' if cond else '!! ') + name + ('' if cond else ' :: ' + str(info)[:600]), flush=True)
ST = {'orig': 'state', 'port': 'window.PSS.state'}

def scenario(pg, kind, fixtures=('WC-P', 'WC-P', 'LAV-C', 'FS-2', 'UR-W')):
    S = ST[kind]
    def click_world(x, y, button='left'):
        sx, sy = pg.evaluate(f'([x,y])=>{{const s={S};const r=document.getElementById("fgCanvas").getBoundingClientRect();return [r.left+s.cam.x+x*s.cam.zoom, r.top+s.cam.y+y*s.cam.zoom]}}', [x, y])
        pg.mouse.move(sx, sy); pg.wait_for_timeout(40); pg.mouse.click(sx, sy, button=button); pg.wait_for_timeout(40)
    def tool(t): pg.evaluate(f'setTool("{t}")')
    def fixture(code, x, y):
        pg.evaluate(f'(()=>{{ {"CAT.sel" if kind=="port" else "selectedCatalogCode"} = "{code}"; }})()'.replace('CAT.sel', 'window.PSS.CAT.sel')); tool('fixture'); click_world(x, y)
    pg.evaluate(f'(()=>{{const s={S}; s.cam.x=60; s.cam.y=50; s.cam.zoom=1; requestFgRender(); requestBgRender();}})()')
    xs = [100 + 100 * i for i in range(len(fixtures))]
    for code, x in zip(fixtures, xs): fixture(code, x, 100)
    tool('stack'); click_world(650, 300)
    tool('pipe')
    click_world(100, 300); click_world(650, 300)            # main
    pg.keyboard.press('Escape')
    for x in xs:
        click_world(x, 100); click_world(x, 300); pg.keyboard.press('Escape')   # branches tee into main
    tool('vtr'); click_world(650, 30)
    tool('vent'); click_world(100, 100); click_world(100, 30); click_world(650, 30); pg.keyboard.press('Escape')
    tool('select'); pg.wait_for_timeout(200)
    return pg.evaluate(f'''(()=>{{const s={S}; return {{nodes:s.nodes.length, pipes:s.pipes.map(p=>[p.system,p.n1,p.n2,+(p.calc.dfu||0).toFixed(2),p.calc.size,p.calc.wcCount||0,+(p.calc.lengthFt||0).toFixed(2),(p.calc.warnings||[]).join('|')])}}}})()''')

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    res = {}
    for kind, url in (('orig', ORIG), ('port', PORT)):
        ctx = b.new_context(viewport={'width': 1440, 'height': 900}, accept_downloads=True); pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('dialog', lambda d: d.accept())
        pg.goto(url, wait_until='load'); pg.wait_for_timeout(500)
        res[kind] = scenario(pg, kind)
        res[kind]['sched'] = pg.inner_text('#systemSummaryStats')
        res[kind]['rows'] = pg.locator('#scheduleTableBody tr').count()
        with pg.expect_download() as dl: pg.evaluate('saveProjectFile()')
        path = f'/tmp/studio-{kind}.plumb.json'; dl.value.save_as(path); res[kind]['file'] = path
        with pg.expect_download() as dl: pg.evaluate('exportCSV()')
        cp = f'/tmp/studio-{kind}.csv'; dl.value.save_as(cp); res[kind]['csv'] = open(cp).read()
        check(kind + ': no page errors', not errs, errs)
        if kind == 'port':
            if SHOTS: pg.screenshot(path=os.path.join(SHOTS, 'dwv-desktop-drawn.png'))
            check('port: pdf.js not loaded before a PDF is imported', pg.evaluate('!window.pdfjsLib'))
            # open the ORIGINAL's saved project in the port (file-format compatibility)
            pg.evaluate('confirmClearDrawing()')
            pg.set_input_files('#projectFileInput', '/tmp/studio-orig.plumb.json'); pg.wait_for_timeout(600)
            again = pg.evaluate('window.PSS.state.pipes.map(p=>[p.system,+(p.calc.dfu||0).toFixed(2),p.calc.size])')
            check('port opens a .plumb.json saved by the original file, same sizes', again == [[r[0], r[3], r[4]] for r in res['orig']['pipes']], again)
            # PDF underlay: lazy pdf.js
            pg.set_input_files('#planFileInput', PLAN); pg.wait_for_timeout(2500)
            check('PDF plan import loads pdf.js on demand and renders', pg.evaluate('!!window.pdfjsLib && !!window.PSS.state.plan.surface'), pg.evaluate('window.PSS.state.plan.width'))
            if SHOTS: pg.screenshot(path=os.path.join(SHOTS, 'dwv-desktop-pdf.png'))
            # node drag recomputes lengths (rAF-batched)
            n = pg.evaluate('window.PSS.state.nodes.find(n=>n.type==="fixture").id')
            check('port: no page errors after open/PDF', not errs, errs)
        ctx.close()
    o, q = res['orig'], res['port']
    check('same node count', o['nodes'] == q['nodes'], (o['nodes'], q['nodes']))
    check('same pipes, DFU, sizes, WC counts, lengths, warnings', o['pipes'] == q['pipes'], json.dumps([o['pipes'], q['pipes']])[:1500])
    check('drawing produced a real network (main carries all DFU)', max(r[3] for r in q['pipes']) >= 15, q['pipes'])
    check('same schedule summary', o['sched'] == q['sched'], (o['sched'], q['sched']))
    check('same schedule rows', o['rows'] == q['rows'])
    check('same CSV export', o['csv'] == q['csv'])
    fo, fq = json.load(open(o['file'])), json.load(open(q['file']))
    for k in ('savedAt',): fo.pop(k); fq.pop(k)
    check('same .plumb.json content (except timestamp)', json.dumps(fo, sort_keys=True) == json.dumps(fq, sort_keys=True))
    # IPC mode must be unchanged vs. the original file (same drawing, codeMode switched to IPC2024)
    ipc = {}
    for kind, url in (('orig', ORIG), ('port', PORT)):
        ctx = b.new_context(viewport={'width': 1440, 'height': 900}); pg = ctx.new_page(); pg.on('dialog', lambda d: d.accept())
        pg.goto(url, wait_until='load'); pg.wait_for_timeout(500)
        pg.evaluate('document.getElementById("codeMode").value="IPC2024"')
        r = scenario(pg, kind); pg.evaluate('recalculateNetwork()')
        ipc[kind] = pg.evaluate(f'(()=>{{const s={ST[kind]}; return PIPES}})()'.replace('PIPES', "s.pipes.map(p=>[p.system,p.n1,p.n2,+(p.calc.dfu||0).toFixed(2),p.calc.size,p.calc.wcCount||0,+(p.calc.lengthFt||0).toFixed(2),(p.calc.warnings||[]).join('|')])"))
        ctx.close()
    check('IPC mode: same pipes/sizes/warnings as the original', ipc['orig'] == ipc['port'], json.dumps(ipc)[:1500])

    # UPC 2024 fixes (intentional divergence from the original): 4 public WCs on one horizontal main
    upc = {}
    for kind, url in (('orig', ORIG), ('port', PORT)):
        ctx = b.new_context(viewport={'width': 1440, 'height': 900}); pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('dialog', lambda d: d.accept())
        pg.goto(url, wait_until='load'); pg.wait_for_timeout(500)
        upc[kind] = scenario(pg, kind, ('WC-P', 'WC-P', 'WC-P', 'WC-P'))['pipes']
        if kind == 'port':
            main = max(upc[kind], key=lambda r: r[3])
            check('UPC: 4 WCs / 24 DFU main stays 3" (2024 note 4: six WCs on 3")', main[4] == 3 and main[5] == 4 and not main[7], main)
            # 1/8 slope: only building drain >= 4", with AHJ warning; elsewhere warned, never silently upsized
            res8 = pg.evaluate("""(()=>{const s=window.PSS.state; s.pipes.filter(p=>p.system==='waste').forEach(p=>p.slope=0.125);
                recalculateNetwork(); const w=s.pipes.filter(p=>p.system==='waste'); const m=w.reduce((a,p)=>p.calc.dfu>a.calc.dfu?p:a);
                const before=[m.calc.size, m.calc.warnings.join('|')]; m.isBuildingDrain=1; recalculateNetwork();
                return {branch: before, drain: [m.calc.size, m.calc.warnings.join('|')]};})()""")
            check('UPC: 1/8"/ft on a non-building-drain pipe is warned (708.1), size not bumped', res8['branch'][0] == 3 and 'not permitted' in res8['branch'][1], res8)
            check('UPC: 1/8"/ft on a 3" building drain warned (708.1 needs >=4")', 'requires' in res8['drain'][1], res8)
            big = pg.evaluate("""(()=>{const s=window.PSS.state; const w=s.pipes.filter(p=>p.system==='waste'); const m=w.reduce((a,p)=>p.calc.dfu>a.calc.dfu?p:a);
                m.manualMinSize=4; recalculateNetwork(); return [m.calc.size, m.calc.warnings.join('|')];})()""")
            check('UPC: 1/8"/ft on a 4" building drain -> x0.8 + AHJ approval warning', big[0] == 4 and 'AHJ' in big[1], big)
            cw = pg.evaluate("""(()=>{const s=window.PSS.state; const w=s.pipes.filter(p=>p.system==='waste'); const m=w.reduce((a,p)=>p.calc.dfu>a.calc.dfu?p:a);
                m.manualMinSize=0; m.slope=0.25; m.isCWV=1; recalculateNetwork(); const r=[m.calc.size, m.calc.warnings.join('|')]; m.isCWV=0;
                document.getElementById('codeMode').value='UPC2024_APPC'; recalculateNetwork(); const a=[m.calc.size, m.calc.warnings.join('|')];
                document.getElementById('codeMode').value='UPC2024'; recalculateNetwork(); return {cwv:r, appc:a};})()""")
            check('UPC: CWV pipe flags WCs (910.7) and upsizes two sizes', '910.7' in cw['cwv'][1] and cw['cwv'][0] == 4, cw)
            check('App. C mode: 4 WCs on a 3" building drain bumped to 4" (C 304.2 note 2)', cw['appc'][0] == 4 and 'C 304.2' in cw['appc'][1], cw)
            check('UPC: no page errors', not errs, errs)
        ctx.close()
    om = max(upc['orig'], key=lambda r: r[3])
    check('original file still bumps 4 WCs to 4" (documents the intended change)', om[4] == 4, om)

    # Pure code-table unit tests (node)
    import subprocess
    ut = subprocess.run(['node', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'test_codetables.mjs')], capture_output=True, text=True)
    print(ut.stdout.strip().splitlines()[-1])
    check('codetables unit tests (node test/test_codetables.mjs)', ut.returncode == 0, ut.stdout[-1200:])

    # touch / phone
    ctx = b.new_context(viewport={'width': 430, 'height': 932}, is_mobile=True, has_touch=True, device_scale_factor=3); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(PORT, wait_until='load'); pg.wait_for_timeout(400)
    check('phone: canvas backing store uses devicePixelRatio', pg.evaluate('document.getElementById("fgCanvas").width === Math.round(window.PSS.view.w*3)'), pg.evaluate('[document.getElementById("fgCanvas").width, window.PSS.view.w]'))
    S = 'window.PSS.state'
    def tap_world(x, y):
        sx, sy = pg.evaluate(f'([x,y])=>{{const s={S};const r=document.getElementById("fgCanvas").getBoundingClientRect();return [r.left+s.cam.x+x*s.cam.zoom, r.top+s.cam.y+y*s.cam.zoom]}}', [x, y])
        pg.touchscreen.tap(sx, sy); pg.wait_for_timeout(60)
    pg.evaluate('(()=>{const s=window.PSS.state; s.cam.x=20; s.cam.y=20; s.cam.zoom=1;})()')
    pg.evaluate('window.PSS.CAT.sel="WC-P"; setTool("fixture")'); tap_world(40, 60)
    pg.evaluate('setTool("stack")'); tap_world(200, 200)
    pg.evaluate('setTool("pipe")'); tap_world(40, 60); tap_world(200, 200)
    r = pg.evaluate('window.PSS.state.pipes.map(p=>[p.calc.dfu,p.calc.size])')
    check('phone: tap to place fixture, stack and draw a waste pipe', r == [[6, 3]], r)
    pg.evaluate('setTool("select")')
    cx = pg.evaluate('window.PSS.state.cam.x')
    # one-finger pan on empty canvas via CDP touch events
    cdp = ctx.new_cdp_session(pg)
    def touch(t, pts): cdp.send('Input.dispatchTouchEvent', {'type': t, 'touchPoints': [{'x': x, 'y': y} for x, y in pts]})
    touch('touchStart', [(300, 600)]); touch('touchMove', [(250, 600)]); touch('touchMove', [(200, 600)]); touch('touchEnd', []); pg.wait_for_timeout(100)
    check('phone: one-finger drag on empty canvas pans', abs(pg.evaluate('window.PSS.state.cam.x') - (cx - 100)) < 2, (cx, pg.evaluate('window.PSS.state.cam.x')))
    z = pg.evaluate('window.PSS.state.cam.zoom')
    touch('touchStart', [(150, 500), (250, 500)]); touch('touchMove', [(100, 500), (300, 500)]); touch('touchEnd', []); pg.wait_for_timeout(100)
    check('phone: pinch zooms', abs(pg.evaluate('window.PSS.state.cam.zoom') / z - 2) < 0.05, pg.evaluate('window.PSS.state.cam.zoom'))
    if SHOTS: pg.screenshot(path=os.path.join(SHOTS, 'dwv-phone.png'))
    check('phone: no page errors', not errs, errs)
    b.close()
print('PASS', len(ok), 'FAIL', len(bad)); [print('  ', x) for x in bad]
