"""Regenerate the import header of every module in src/dwv/js from what each file uses.
Run after editing modules: python3 tools/gen_imports.py"""
import re, glob, os
D = 'src/dwv/js'
files = sorted(f for f in glob.glob(D + '/*.js') if not f.endswith('main.js'))
HDR = '// @generated imports (tools/gen_imports.py)\n'
body, exports = {}, {}
for f in files:
    s = open(f).read()
    if s.startswith(HDR):
        s = s.split('// @end imports\n', 1)[1]
    body[f] = s
    exports[f] = re.findall(r'^export (?:async )?(?:function|const|let) (\w+)', s, flags=re.M)
owner = {}
for f, names in exports.items():
    for n in names:
        assert n not in owner, ('duplicate export', n, f, owner.get(n)); owner[n] = f
for f in files:
    s = body[f]
    code = re.sub(r"//[^\n]*", '', s)
    own = set(re.findall(r'^(?:export )?(?:async )?(?:function|const|let) (\w+)', s, flags=re.M))
    need = {}
    for n, of in owner.items():
        if of == f or n in own: continue
        if re.search(r'(?<![\w.$])' + re.escape(n) + r'\b', code):
            need.setdefault(of, []).append(n)
    lines = [HDR] + ["import { %s } from './%s';\n" % (', '.join(sorted(v)), os.path.basename(k)) for k, v in sorted(need.items())] + ['// @end imports\n']
    open(f, 'w').write(''.join(lines) + s)
print({os.path.basename(f): len(exports[f]) for f in files})
