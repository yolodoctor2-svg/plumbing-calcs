# Plumbing tools

Static site (GitHub Pages, no server, no login): https://yolodoctor2-svg.github.io/plumbing-calcs/

| Path | Tool |
|---|---|
| `dwv/` | Waste & vent sizer — Cyrex's **Plumbing Sizer Studio** (source of truth: `source/cyrex-dwv-sizer.html`) |
| `storm/` | Roof drain & storm pipe calculator (from Workspace Planner) |
| `classic/` | Classic DWV sizer from Workspace Planner (`.dwv` files) |

## Layout
- `src/` readable sources. `docs/` is the built site GitHub Pages serves (do not edit by hand).
- `src/dwv/js/*.js` ES modules: `state`, `catalog` (UPC fixture defaults), `sizing` (waste/vent graph + tables),
  `render` (dual canvas), `interaction` (mouse/keys/touch), `plan` (PDF/image underlay), `file` (.plumb.json),
  `palette` (fixture list + library editor), `ui` (inspector, schedule, modals), `main` (entry).
- `src/vendor/` pinned, self-hosted libs: pdf.js 3.11.174, pdf-lib 1.17.1 (both lazy-loaded), Font Awesome 6.4.0 subset.

## Build
```
npm install
node build.mjs            # src -> docs (esbuild bundle/minify, Tailwind compile, service worker)
python3 tools/fa_subset.py  # only when icons change (needs fonttools + brotli)
```

## Swapping in a new copy of the DWV sizer
1. Save the new single-file HTML to `source/cyrex-dwv-sizer.html`.
2. `python3 tools/split_cyrex.py` (check the line ranges in it first), then `python3 tools/gen_imports.py`.
3. Re-apply the site additions (see git history of `src/dwv`): lazy pdf.js loader, init functions,
   devicePixelRatio canvases, rAF-batched recalc/schedule, touch + phone drawers.
4. `node build.mjs`, run `test/test_studio.py ORIGINAL_URL PORT_URL`.

## Tests
- `test/test_studio.py` original single file vs. ported modules (same pipes/DFU/sizes/schedule/CSV/.plumb.json, PDF lazy load, touch).
- `test/test_storm.py` planner storm page vs. port; PDF log export.
- Classic sizer: the planner's Playwright suite (`/workspace/dwv-build/test/t1..t7.py URL`).
- `test/measure.py` cold-load timing with throttling.
