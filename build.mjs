// Production build: src/ -> docs/ (served by GitHub Pages). Readable sources stay in src/.
//   node build.mjs
import { build, transform } from 'esbuild';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const SRC = 'src', OUT = 'docs';
const TARGET = ['es2020'];
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const cp = (a, b) => { fs.mkdirSync(path.dirname(path.join(OUT, b)), { recursive: true }); fs.copyFileSync(path.join(SRC, a), path.join(OUT, b)); };
const write = (f, s) => { fs.mkdirSync(path.dirname(path.join(OUT, f)), { recursive: true }); fs.writeFileSync(path.join(OUT, f), s); };
const read = (f) => fs.readFileSync(path.join(SRC, f), 'utf8');
const minJs = async (code, format) => (await transform(code, { minify: true, target: TARGET, format, legalComments: 'none' })).code;
const minCss = async (code) => (await transform(code, { loader: 'css', minify: true, target: TARGET })).code;

// 1) Waste & vent sizer (Cyrex's Plumbing Sizer Studio): ES modules -> one minified bundle, CSS inlined.
await build({ entryPoints: [`${SRC}/dwv/js/main.js`], bundle: true, format: 'esm', minify: true, target: TARGET, outfile: `${OUT}/dwv/app.js`, legalComments: 'none' });
let dwv = read('dwv/index.html');
dwv = dwv.replace('<link rel="stylesheet" href="style.css">', `<style>${await minCss(read('dwv/style.css'))}</style>`)
         .replace('<script type="module" src="js/main.js"></script>', '<script type="module" src="app.js"></script>');
write('dwv/index.html', dwv);

// 2) Storm + classic sizer: compiled Tailwind (instead of the 300 KB runtime Play CDN) + minified JS.
for (const [dir, files] of [['storm', ['roof-drain.js', 'log-pdf.js']], ['classic', ['dwv-sizer.js']]]) {
  execFileSync('node_modules/.bin/tailwindcss', ['-c', 'tailwind.config.cjs', '-i', 'tools/tw-input.css', '--content', `${SRC}/${dir}/**/*.{html,js}`, '-o', `${OUT}/${dir}/tw.css`, '--minify'], { stdio: 'pipe' });
  for (const f of files) write(`${dir}/${f}`, await minJs(read(`${dir}/${f}`), f === 'log-pdf.js' ? 'esm' : undefined));
  write(`${dir}/index.html`, read(`${dir}/index.html`));
}

// 3) Shared static files + self-hosted, pinned vendor libs (loaded lazily by the pages).
for (const f of ['index.html', 'manifest.webmanifest', 'favicon.svg', 'favicon.ico', 'favicon-32x32.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png',
  'vendor/pdfjs/pdf.min.js', 'vendor/pdfjs/pdf.worker.min.js', 'vendor/pdf-lib.min.js', 'vendor/fa/fa-subset.css', 'vendor/fa/fa-subset.woff2']) cp(f, f);
write('.nojekyll', '');

// 4) Service worker: precache the app shell (instant + offline repeat loads); PDF libs cached on first use.
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'favicon.svg', 'apple-touch-icon.png', 'icon-192.png',
  'dwv/', 'dwv/app.js', 'storm/', 'storm/tw.css', 'storm/roof-drain.js', 'classic/', 'classic/tw.css', 'classic/dwv-sizer.js',
  'vendor/fa/fa-subset.css', 'vendor/fa/fa-subset.woff2'];
const h = crypto.createHash('sha256');
for (const f of SHELL.concat(['dwv/index.html', 'storm/index.html', 'classic/index.html', 'storm/log-pdf.js'])) if (!f.endsWith('/') && f !== './') h.update(fs.readFileSync(path.join(OUT, f)));
const VERSION = h.digest('hex').slice(0, 12);
write('sw.js', await minJs(read('sw.js').replace('__VERSION__', VERSION).replace("'__SHELL__'", JSON.stringify(SHELL).slice(1, -1))));
for (const page of ['dwv/index.html', 'storm/index.html', 'classic/index.html']) {
  const f = path.join(OUT, page);
  fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace('</body>', `<script>if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('../sw.js',{scope:'../'});</script>\n</body>`));
}

// Report sizes
const sizes = {};
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => { const p = path.join(d, e.name); e.isDirectory() ? walk(p) : (sizes[path.relative(OUT, p)] = fs.statSync(p).size); });
walk(OUT);
console.log('build', VERSION);
for (const [f, s] of Object.entries(sizes).sort()) console.log(String(s).padStart(9), f);
