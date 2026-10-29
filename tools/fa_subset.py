"""Build a Font Awesome 6.4.0 solid subset: only the icons the storm + classic pages use.
Writes src/vendor/fa/fa-subset.css and fa-subset.woff2."""
import re, glob, subprocess
css = open('src/vendor/fa/all.min.css').read()
used = set()
for f in glob.glob('src/storm/*') + glob.glob('src/classic/*'):
    if f.endswith(('.html', '.js')):
        used |= set(re.findall(r'\bfa-([a-z0-9-]+)', open(f).read()))
skip = {'solid', 'regular', 'brands', 'classic', 'spin', 'fw', 'lg', 'xs', 'sm', 'xl', '2x', 'pulse'}
rules, cps = [], set()
for name in sorted(used - skip):
    m = re.search(r'\.fa-' + re.escape(name) + r':before[^{]*\{content:"\\([0-9a-f]+)"', css)
    if not m: print('no glyph for', name); continue
    cps.add(int(m.group(1), 16)); rules.append('.fa-%s:before{content:"\\%s"}' % (name, m.group(1)))
# glyphs referenced directly in the classic sizer's SVG symbols
for cp in re.findall(r"\\u([0-9a-fA-F]{4})", open('src/classic/dwv-sizer.js').read()):
    if int(cp, 16) >= 0xe000: cps.add(int(cp, 16))
base = ('@font-face{font-family:"Font Awesome 6 Free";font-style:normal;font-weight:900;font-display:block;src:url(fa-subset.woff2) format("woff2")}'
        '.fa,.fas,.fa-solid{-moz-osx-font-smoothing:grayscale;-webkit-font-smoothing:antialiased;display:var(--fa-display,inline-block);font-style:normal;font-variant:normal;line-height:1;text-rendering:auto;font-family:"Font Awesome 6 Free";font-weight:900}'
        '')
open('src/vendor/fa/fa-subset.css', 'w').write(base + ''.join(rules) + '\n')
subprocess.run(['.venv/bin/pyftsubset', 'src/vendor/fa/fa-solid-900.woff2', '--unicodes=' + ','.join('U+%04X' % c for c in sorted(cps)),
                '--flavor=woff2', '--output-file=src/vendor/fa/fa-subset.woff2', '--layout-features=*', '--no-hinting'], check=True)
print(len(rules), 'icons,', len(cps), 'glyphs')
