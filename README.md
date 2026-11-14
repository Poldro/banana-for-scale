# Banana for Scale

Scroll or swipe from a banana down to the Planck length (10⁻³⁵ m) and up to the edge of the
observable universe (10²⁷ m) — 34 stops across about 62 orders of magnitude, each with a short,
data-rich fact and a comparison in bananas.

Built with SvelteKit (static), Svelte 5, GSAP's Observer plugin and a plain 2D canvas.

## How it works

- **Even scroll per stop.** The position is a continuous index over the stops; the size exponent
  (log₁₀ metres) is interpolated linearly between neighbours, so the empty gap between an atom and
  its nucleus costs as much scrolling as going from a bee to a banana.
- **Layered zoom.** Every stop is drawn at `10^(stopExp − viewExp)` times its natural size and
  cross-fades as it grows or shrinks out of view (`src/lib/scale.ts`, `src/lib/render/`).
- **Neighbours for scale.** While resting on a stop, the next smaller stop is drawn beside the
  subject at true scale (inside a magnifier when it would be a speck) and the next bigger stop
  appears as the dashed edge of a true-scale circle underneath. The text panel names both, with
  the size ratio, and they are clickable (`src/lib/render/reference.ts`).
- **3D models.** 26 of the 34 stops can be shown as rotatable three.js models
  (`src/lib/three/`), from quantum foam to the cosmic microwave background. Most are built in
  code from real data (orbital elements, galaxy sky positions and distances, the Evans–Fung
  red-cell profile); the rest use public-domain or CC0 scans, models, maps and elevation tiles. One shared off-screen WebGL canvas renders each
  model and the result is copied into the 2D scene, so models zoom, fade and act as scale
  references exactly like photos. three.js is loaded on demand; without WebGL, or with the 3D
  switch off (remembered per browser), the 2D picture is shown instead. Drag sideways, swipe
  sideways or press ←/→ to rotate. Eight stops stay 2D on purpose: the empty desert and the
  point-like quarks have nothing to model, a photo beats any model for the hurricane and the Orion
  Nebula, and no freely licensed model of the tardigrade, bee, human or whale was good enough.
- **Input.** Wheel, touch drag, keyboard (↑/↓, Page Up/Down, Space, Home, End) and the ruler on
  the right. The view snaps to the nearest stop and the URL hash (`/#earth`) is a shareable deep
  link. `prefers-reduced-motion` disables the animated tweens.
- **Photos vs. illustrations.** Where a real image exists it comes from Wikimedia Commons. Inside
  atoms, below the reach of any microscope, or where a diagram tells more than a photo, the
  picture is drawn procedurally in the browser and labelled as an illustration.

## Getting started

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # static site in build/
```

## Tests

```bash
npm test             # unit tests (Vitest): maths, formatting, data integrity
npm run test:e2e     # end-to-end (Playwright): deep links, keyboard, wheel, ruler, credits, 3D
npm run check        # svelte-check / TypeScript
```

The data test fails if a stop is out of order, an image has no credit, or a credited file is
missing from `static/img/`. The 3D tests run in a separate Playwright project with software WebGL
(SwiftShader); the others run on the 2D fallback.

## Content

All stops live in `src/lib/data/levels.json`, validated with zod at load time
(`src/lib/levels.ts`). A stop is either an image (`{ "type": "image", "commons": "<file name>" }`,
with optional `crop` and `blend`) or a generated illustration (`{ "type": "generated", "kind": … }`).

### Images and licensing

```bash
npm run images            # fetch missing images
npm run images -- --force # re-fetch everything
```

`scripts/fetch-images.mjs` queries the Wikimedia Commons API for each image stop, **refuses any
file whose license is not public domain, CC0, CC BY or CC BY-SA**, or that has no author, then
crops, resizes (longest side 1600 px) and converts it to WebP. Author, license and source URL are
written to `src/lib/data/credits.json`, which feeds both the on-screen credit line and the
[credits page](src/routes/credits/+page.svelte).

### 3D assets

```bash
npm run models
```

`scripts/fetch-models.mjs` downloads, trims and compresses every 3D asset:

| Stop | Asset | Source | License |
| --- | --- | --- | --- |
| Banana | `models/banana.glb` | [Poly Haven](https://polyhaven.com/a/bananas) scan, one fruit, WebP textures | CC0 |
| Saturn V | `models/saturn-v.glb` | [NASA 3D Resources](https://github.com/nasa/NASA-3D-Resources) | Public domain |
| Mount Everest | `textures/everest.webp` | [Mapzen Terrain Tiles](https://registry.opendata.aws/terrain-tiles/) (SRTM) heightmap | Public domain |
| Moon | `textures/moon.webp`, `moon-relief.webp` | [NASA SVS CGI Moon Kit](https://svs.gsfc.nasa.gov/4720) (LRO) | Public domain |
| Earth | `textures/earth.webp` | NASA Blue Marble via Wikimedia Commons | Public domain |
| Jupiter | `textures/jupiter.webp` | NASA/JPL Cassini map (PIA07782) via Wikimedia Commons | Public domain |
| Observable universe | `textures/cmb.webp` | [ESA/Planck](https://www.astropix.org/image/planck/planck13-002a) CMB map | Public domain |

Credits go to `src/lib/data/model-credits.json`, checked by the same data tests. Every other
model is built entirely in code.

## License

Code and generated illustrations: [MIT](LICENSE).

Images in `static/img/` are resized copies of works from Wikimedia Commons and remain under their
own licenses (public domain, CC0, CC BY or CC BY-SA); see `src/lib/data/credits.json` or the
in-app credits page for author and license of each file.
