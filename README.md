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
| `tests/stress-test.js` | Automated checks: data integrity, navigation, accessibility, touch targets, payload size |

## Viewing it

**On the web:** once GitHub Pages is enabled (Settings → Pages → Deploy from a branch →
`main` → `/ (root)`), the live site is at
https://goodlordfjord.github.io/human-atlas/

**On your computer:** pull the repo in GitHub Desktop, then double-click `index.html`.
That's it — it opens in your default browser and works fully offline apart from the
fonts and the D3 library.

## Running the checks

Requires [Node.js](https://nodejs.org).

```
node tests/stress-test.js
```

It exits non-zero if anything fails. Current baseline: 58 passed, 0 failed, 2 warnings.

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
