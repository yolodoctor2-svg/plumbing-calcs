import sys
from playwright.sync_api import sync_playwright
URL = sys.argv[1]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 1440, 'height': 900}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto(URL, wait_until='networkidle'); pg.wait_for_timeout(300)
    print('fixtures', pg.locator('.fixture-card').count(), 'errs', errs)
    b.close()
