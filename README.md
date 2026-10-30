# Plumbing tools

Static site (GitHub Pages, no server, no login): https://yolodoctor2-svg.github.io/plumbing-calcs/

| Path | Tool |
|---|---|
| `dwv/` | Waste & vent sizer — Cyrex's **Plumbing Sizer Studio** (source of truth: `source/cyrex-dwv-sizer.html`) |
| `storm/` | Roof drain & storm pipe calculator (from Workspace Planner) |
| `classic/` | Classic DWV sizer from Workspace Planner (`.dwv` files) |

## Layout
- `src/` readable sources. `docs/` is the built site GitHub Pages serves (do not edit by hand).
- `src/dwv/js/*.js` ES modules: `state`, `catalog` (UPC fixture defaults), `sizing` (waste/vent graph), `codetables` (pure UPC 2024 Table 703.2 / 708.1 / 904 sizing, unit-tested),
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
- `test/test_studio.py` original single file vs. ported modules (same pipes/DFU/sizes/schedule/CSV/.plumb.json, PDF lazy load, touch),
  IPC-mode parity, and the intentional UPC 2024 fixes (note 4 six WCs on 3", 708.1 1/8" slope rules). Also runs `test/test_codetables.mjs`.
- `test/test_codetables.mjs` (`node test/test_codetables.mjs`) Table 703.2 values, notes 3/4/5/7, 708.1, 904.1/904.2, App. B CWV ladder.

## UPC 2024 corrections (Oct 2026)
UPC mode deliberately differs from `source/cyrex-dwv-sizer.html`: 1-1/2" horizontal = 1 DFU; no 2-1/2" row (not in Table 703.2);
5"/10"/12" added; 6" = 720, 8" = 2640; 1/8"/ft = x0.8 and only on a pipe marked *Building Drain* >= 4" (AHJ warning), otherwise warned;
3" holds six WCs or five six-unit traps; vents per Table 703.2 incl. 5"/8", 904.2 one-size-up instead of silent fallthrough.
New mode *UPC 2024 App. C (engineered)*: building drains by Table C 304.2 (the source's 840/1920/180 values), branches by Table C 304.3.
Per-pipe *Comb. Waste & Vent* flag: +2 sizes on the Appendix B ladder, 910.7 / B 101.2 / 910.3 checks. IPC mode unchanged.
Source: IAPMO 2024 UPC (official read-only e-book), printed pp. 131-133, 151-152, 315, 320.
- `test/test_storm.py` planner storm page vs. port; PDF log export.
- Classic sizer: the planner's Playwright suite (`/workspace/dwv-build/test/t1..t7.py URL`).
- `test/measure.py` cold-load timing with throttling.
