"""Storm calculator: planner original vs. ported page. usage: test_storm.py ORIG_URL PORT_URL [shots_dir]"""
import sys, os
from playwright.sync_api import sync_playwright
ORIG, PORT = sys.argv[1], sys.argv[2]; SHOTS = sys.argv[3] if len(sys.argv) > 3 else None
ok, bad = [], []
def check(name, cond, info=''):
    (ok if cond else bad).append(name); print(('ok ' if cond else '!! ') + name + ('' if cond else ' :: ' + str(info)[:500]), flush=True)
CASES = [('5000', '2', '1/8'), ('12000', '1', '1/4'), ('800', '1', '1/16'), ('60000', '1', '1/8')]
def run(pg):
    out = {'rain': pg.input_value('#rdRain'), 'city': pg.input_value('#rdCity')}
    res = []
    for area, drains, slope in CASES:
        pg.fill('#rdArea', area); pg.fill('#rdDrains', drains)
        if pg.locator(f'[data-slope="{slope}"]').count(): pg.click(f'[data-slope="{slope}"]')
        pg.wait_for_timeout(80); res.append(pg.inner_text('#rdResults'))
    out['res'] = res
    t = pg.inner_text('#rdResults'); out['order'] = (t.lower().find('horizontal'), t.lower().find('vertical'))
    out['gutter_visible'] = pg.locator('text=Semi-circular gutter').count() > 0 and pg.locator('text=Semi-circular gutter').first.is_visible()
    pg.select_option('#rdWhatKind', index=1) if pg.locator('#rdWhatKind option').count() > 1 else None
    pg.wait_for_timeout(80); out['whatif'] = pg.inner_text('#rdWhatOut')
    return out
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    R = {}
    for kind, url in (('orig', ORIG), ('port', PORT)):
        ctx = b.new_context(viewport={'width': 1280, 'height': 900}, accept_downloads=True); pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e))); reqs = []; pg.on('request', lambda r: reqs.append(r.url))
        pg.goto(url, wait_until='load'); pg.wait_for_timeout(400)
        R[kind] = run(pg)
        check(kind + ': no page errors', not errs, errs)
        if kind == 'port':
            check('Las Vegas 1.5 in/h is the default', R[kind]['rain'] == '1.5' and 'Las Vegas' in R[kind]['city'], R[kind])
            o = R[kind]['order']; check('horizontal shown before vertical', 0 <= o[0] < o[1], o)
            check('gutter card hidden', not R[kind]['gutter_visible'])
            check('no third-party requests (no Tailwind/FA CDN)', all(u.startswith('http://localhost') or u.startswith('https://yolodoctor2-svg.github.io') for u in reqs), [u for u in reqs if 'localhost' not in u])
            # right-click default city
            pg.click('#rdCity', button='right'); pg.wait_for_timeout(100)
            check('right-click on city opens "Set as default location"', pg.locator('#rdCityMenu').is_visible())
            pg.keyboard.press('Escape')
            # log + PDF export (client-side)
            pg.fill('#rdArea', '5000'); pg.fill('#rdProject', 'Test project'); pg.click('#rdLogAdd'); pg.fill('#rdArea', '9000'); pg.click('#rdLogAdd')
            if SHOTS: pg.screenshot(path=os.path.join(SHOTS, 'storm-desktop.png'), full_page=True)
            with pg.expect_download(timeout=20000) as dl: pg.click('#rdPrint')
            path = '/tmp/storm-log.pdf'; dl.value.save_as(path); data = open(path, 'rb').read()
            check('log PDF downloads and is a PDF', data[:5] == b'%PDF-' and len(data) > 1500, len(data))
            import subprocess
            txt = subprocess.run(['pdftotext', '-layout', path, '-'], capture_output=True, text=True).stdout
            check('PDF has title, code tables and both areas', 'Test project' in txt and '1103.2' in txt and 'Area 1' in txt and 'Area 2' in txt, txt[:400])
            check('port: no page errors after export', not errs, errs)
        ctx.close()
    check('identical results for all cases', R['orig']['res'] == R['port']['res'], [R['orig']['res'][0][:300], R['port']['res'][0][:300]])
    check('identical what-if output', R['orig']['whatif'] == R['port']['whatif'], (R['orig']['whatif'][:200], R['port']['whatif'][:200]))
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, device_scale_factor=3); pg = ctx.new_page()
    pg.goto(PORT, wait_until='load'); pg.wait_for_timeout(300)
    if SHOTS: pg.screenshot(path=os.path.join(SHOTS, 'storm-phone.png'))
    b.close()
print('PASS', len(ok), 'FAIL', len(bad)); [print('  ', x) for x in bad]
