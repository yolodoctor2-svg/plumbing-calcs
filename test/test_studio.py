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

def scenario(pg, kind):
    S = ST[kind]
    def click_world(x, y, button='left'):
        sx, sy = pg.evaluate(f'([x,y])=>{{const s={S};const r=document.getElementById("fgCanvas").getBoundingClientRect();return [r.left+s.cam.x+x*s.cam.zoom, r.top+s.cam.y+y*s.cam.zoom]}}', [x, y])
        pg.mouse.move(sx, sy); pg.wait_for_timeout(40); pg.mouse.click(sx, sy, button=button); pg.wait_for_timeout(40)
    def tool(t): pg.evaluate(f'setTool("{t}")')
    def fixture(code, x, y):
        pg.evaluate(f'(()=>{{ {"CAT.sel" if kind=="port" else "selectedCatalogCode"} = "{code}"; }})()'.replace('CAT.sel', 'window.PSS.CAT.sel')); tool('fixture'); click_world(x, y)
    pg.evaluate(f'(()=>{{const s={S}; s.cam.x=60; s.cam.y=50; s.cam.zoom=1; requestFgRender(); requestBgRender();}})()')
    fixture('WC-P', 100, 100); fixture('WC-P', 200, 100); fixture('LAV-C', 300, 100); fixture('FS-2', 400, 100); fixture('UR-W', 500, 100)
    tool('stack'); click_world(650, 300)
    tool('pipe')
    click_world(100, 300); click_world(650, 300)            # main
    pg.keyboard.press('Escape')
    for x in (100, 200, 300, 400, 500):
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
