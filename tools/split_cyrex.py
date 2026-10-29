"""One-shot splitter: Cyrex's single-file sizer -> ES modules (src/dwv/js/*.js).
Re-run with a newer copy of his HTML: python3 tools/split_cyrex.py path/to/file.html
(Line ranges below match the Oct 29 2026 copy; re-check them if his file changes.)"""
import re, sys, pathlib
SRC = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else 'source/cyrex-dwv-sizer.html')
L = SRC.read_text().split('\n')
def rng(a, b): return '\n'.join(L[a-1:b])
OUT = pathlib.Path('src/dwv'); (OUT/'js').mkdir(parents=True, exist_ok=True)
# css + html
start_css = next(i for i,l in enumerate(L) if l.strip()=='<style>')
end_css = next(i for i,l in enumerate(L) if l.strip()=='</style>')
(OUT/'style.css').write_text('\n'.join(x[2:] if x.startswith('  ') else x for x in L[start_css+1:end_css]) + '\n')
b0 = next(i for i,l in enumerate(L) if l.strip()=='<body>')
s0 = next(i for i,l in enumerate(L) if l.strip()=='<script>' and i > b0)
(OUT/'body.html').write_text('\n'.join(L[b0+1:s0]) + '\n')
mods = {
 'catalog':  [(808, 898), (1316, 1327)],
 'state':    [(900, 938)],
 'file':     [(940, 1060)],
 'palette':  [(1062, 1209), (1329, 1354)],
 'plan':     [(1211, 1311)],
 'sizing':   [(1313, 1315), (1355, 1660)],
 'render':   [(1662, 1669), (1678, 2007)],
 'interaction': [(1670, 1677), (2009, 2319)],
 'ui':       [(2321, 2546)],
}
REN = [(r'\bfixtureCatalog\b', 'CAT.list'), (r'\bselectedCatalogCode\b', 'CAT.sel'), (r'\bactiveCategory\b', 'CAT.category'),
       (r'\bmouseWorld\b', 'ix.mouse'), (r'\bsnapTarget\b', 'ix.snap')]
for name, rs in mods.items():
    txt = '\n\n'.join(rng(a, b) for a, b in rs)
    for pat, rep in REN: txt = re.sub(pat, rep, txt)
    txt = re.sub(r'^let CAT\.(list|sel|category) = .*\n', '', txt, flags=re.M)
    txt = re.sub(r'^let ix\.(mouse|snap) = .*\n', '', txt, flags=re.M)
    (OUT/'js'/(name + '.js')).write_text(txt + '\n')
print('ok')
