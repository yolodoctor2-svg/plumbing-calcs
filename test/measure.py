"""Cold-load measurement (no cache) with mobile-ish throttling: 4x CPU slowdown, 10 Mbps / 40 ms RTT.
usage: measure.py label=url [label=url ...]"""
import sys, json
from playwright.sync_api import sync_playwright
READY = {'dwv': "document.querySelectorAll('.fixture-card').length>0 || document.querySelectorAll('[data-pal]').length>0",
         'storm': "document.getElementById('rdResults') && document.getElementById('rdResults').innerText.length>20"}
def ready_expr(label): return READY['storm'] if 'storm' in label else READY['dwv']
out = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    for arg in sys.argv[1:]:
        label, url = arg.split('=', 1)
        runs = []
        for i in range(3):
            ctx = b.new_context(viewport={'width': 1440, 'height': 900}); pg = ctx.new_page()
            cdp = ctx.new_cdp_session(pg)
            cdp.send('Network.enable'); cdp.send('Network.setCacheDisabled', {'cacheDisabled': True})
            cdp.send('Network.emulateNetworkConditions', {'offline': False, 'latency': 40, 'downloadThroughput': 10e6 / 8, 'uploadThroughput': 5e6 / 8})
            cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
            sizes = {}
            cdp.on('Network.loadingFinished', lambda e: sizes.__setitem__(e['requestId'], e['encodedDataLength']))
            pg.goto(url, wait_until='load', timeout=120000)
            pg.wait_for_function(ready_expr(label), timeout=120000)
            t = pg.evaluate('''(()=>{const n=performance.getEntriesByType('navigation')[0];const fcp=performance.getEntriesByName('first-contentful-paint')[0];return {dcl:Math.round(n.domContentLoadedEventEnd),load:Math.round(n.loadEventEnd),fcp:fcp?Math.round(fcp.startTime):null,ready:Math.round(performance.now())}})()''')
            pg.wait_for_timeout(1500)  # let late requests finish so bytes are complete
            t['requests'] = len(sizes); t['kb'] = round(sum(sizes.values()) / 1024)
            runs.append(t); ctx.close()
        med = {k: sorted(r[k] for r in runs if r[k] is not None)[1] if all(r[k] is not None for r in runs) else None for k in runs[0]}
        med['label'] = label; out.append(med); print(json.dumps(med), flush=True)
    b.close()
