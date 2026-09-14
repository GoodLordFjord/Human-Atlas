# Human Atlas

An interactive map of what is actually known about people — psychology, and how strong
the evidence is for each piece. 98 constructs across 16 layers, each graded twice: how
good the evidence is, and whether the sources were checked directly.

Built as a single self-contained HTML file. No build step, no install, no server.
Open it in any browser on any device.

## What's in here

| Path | What it is |
|---|---|
| `index.html` | The whole app — markup, styles, data and logic in one file |
| `tests/stress-test.js` | Static checks: data integrity, navigation, accessibility, touch targets, payload size |
| `tests/browser-test.js` | Drives the real page in a headless browser and clicks through every mode |

## Six views

**Start** · task-based ways in. **Map** · the force-directed network.
**Browse** · every construct by layer. **Tensions** · the recorded disputes.
**Trace** · the shortest route between any two ideas. **Play** · three ways to
work the material rather than read past it:

- **Quiz** — ten questions generated from the map itself: spot the failed
  replication, grade the evidence, name a real tension partner, find the
  unconnected node, match a definition. Every answer is explained from the
  node's own text and links through to the full bubble.
- **Expeditions** — six authored routes, each a short walkthrough with an
  argument to make, covering 39 constructs across 12 layers.
- **Connection puzzle** — hop from one construct to another through what links
  to what. Par is the true shortest path; 3,505 pairs sit at a playable 3–5
  hops. The daily challenge is seeded from the date.

Play progress lives in `localStorage` on that device only. Nothing is uploaded,
and there is no account.

## Viewing it

**On the web:** once this is merged into `main` and GitHub Pages is enabled
(Settings → Pages → Deploy from a branch → `main` → `/ (root)`), the live site is at
https://goodlordfjord.github.io/Human-Atlas/ — that link works on any phone, tablet
or computer, and is shareable with anyone.

**On your computer:** pull the repo in GitHub Desktop, then double-click `index.html`.
That's it — it opens in your default browser and works fully offline apart from the
fonts and the D3 library.

## Running the checks

Requires [Node.js](https://nodejs.org).

```
node tests/stress-test.js
```

Static analysis — data integrity, reachability, accessibility, touch targets.
Exits non-zero if anything fails. Baseline: 84 passed, 0 failed, 3 warnings.

```
npm install --no-save playwright d3
node tests/browser-test.js
```

Loads the page in a real headless browser and clicks through all three Play
modes, then checks the layout at phone and desktop widths. It needs no network:
d3 is served from `node_modules` in place of the CDN request and the webfonts
are stubbed. This is the test that catches what static analysis cannot — it is
how the collapsed map pane was found.

## How the data works

Every bubble on the map is one object in the `N` array inside `index.html`. Each carries:

- `id`, `label`, `layer` — identity and which of the 16 layers it belongs to
- `ev` — evidence grade: `solid`, `moderate`, `contested`, `failed`, `literary`, `emerging`
- `ver` — `audited` (sources checked directly) or `inherited` (carried over, not re-checked)
- `def`, `mech`, `mag`, `bound`, `rep` — what it is, how it works, effect size, limits, replication record
- `intra`, `inter`, `app` — what it means for you, for others, and in applied use
- `links` — connections to other nodes, each with a short reason
- `contra` — tensions: other nodes this one conflicts with, and why
- `src` — citations
- `open` — what remains unresolved

Adding a construct means adding one object to that array. The map, the filters, the
search, the browse list and the tension view all pick it up automatically.
