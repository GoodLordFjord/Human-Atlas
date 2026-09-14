# Human Atlas

An interactive map of what is actually known about people — psychology, and how strong
the evidence is for each piece. 98 constructs across 16 layers, each graded twice: how
good the evidence is, and whether the sources were checked directly.

Live at **https://goodlordfjord.github.io/Human-Atlas/**

## How the project is laid out

Content lives in `data/`. The app is built from it into a single self-contained
`index.html`, so the site stays one file you can open by double-clicking — browsers
block `fetch()` on `file://` URLs, so a page that loaded its own JSON at runtime would
only work over a server.

| Path | What it is |
|---|---|
| `data/nodes.json` | The constructs. **This is what you edit.** |
| `data/edges.json` | Relationships between them |
| `data/layers.json` | The 16 layers and their colours |
| `schema/atlas.schema.json` | The shape every node must have |
| `src/app.html` | The renderer — markup, styles, logic, no content |
| `index.html` | **Generated.** Don't edit by hand; run the build |
| `build.js` | Folds `data/` into `src/app.html` → `index.html` |
| `tests/validate-data.js` | Checks `data/` against the schema |
| `tests/stress-test.js` | Static checks on the built page |
| `tests/browser-test.js` | Drives the real page in a headless browser |

## The two commands

```
node build.js              # after editing anything in data/
node tests/validate-data.js
node tests/stress-test.js
```

`stress-test.js` rebuilds and compares, so it fails if `index.html` is out of date with
`data/` — you cannot ship stale content by forgetting to build.

The browser suite needs two dev dependencies the app itself does not use:

```
npm install --no-save playwright d3
node tests/browser-test.js
```

It runs with no network: d3 is served from `node_modules` in place of the CDN request
and the webfonts are stubbed. This is the test that catches what static analysis cannot.

## The schema

Every node carries a small shared core; anything specific to its kind lives under `body`,
so a new kind of node never forces a migration of the existing ones.

- **`facets`** — independent axes, not one hierarchy. `layer`, `claim_type`, `tradition`.
  A node is reachable by any of them and none nests inside another.
- **`claim_type`** — `empirical`, `formal`, `phenomenological`, `contemplative`,
  `philosophical`, `practitioner`. What *sort* of claim this is, separate from how well
  it holds up. Grading a contemplative report on sample size is a category error, and
  this field is what prevents it.
- **`strength`** — names its own `rubric` plus a plain `label`. A renderer shows the
  label always and rubric-specific detail only when it recognises the rubric, so a
  claim type added in two years' time cannot break or mislead an older view.
- **`verification`** — `audited` or `inherited`. Independent of strength: a
  well-evidenced claim can still have unchecked sources.
- **`provenance`** — who arrived at this, when, and what they could have read. Currently
  empty; it is what will make convergence between traditions assessable rather than
  asserted.
- **`plain`** — the layman register, written by hand.

Full field-by-field documentation is in `schema/atlas.schema.json`, and the validator
enforces it.

## The reading register

Every construct can carry a plain-English version — `what` it is, `why` it matters,
and `the catch`. The detail panel opens on it by default, with a **Full entry** switch
for the complete text. Plain language measurably helps expert readers too, so this is a
second register rather than a simplified mode.

Coverage is currently **16 of 98** and reported by both the validator and the stress
test. Where a plain version has not been written, the app says so and shows the full
entry, rather than quietly leaving a gap — the same honesty the evidence grades apply
to the psychology.

## Streaks, XP and the progress spine

Every completed round, route or puzzle awards XP (quiz: score × 10; expedition: 60;
puzzle: 40, +20 at or under par) and counts toward a daily streak. The spine at the top
of every Play screen shows the streak, its tier colour, the last seven days, XP, and any
freezes held.

- **Streak** keys on the local calendar day, not UTC, and extends at most once a day.
- **Freezes** — one is earned every seven consecutive days, capped at two. A single
  missed day is covered by a held freeze; a second missed day resets the streak.
  Forgiveness is what makes streaks work; punishment is what makes people quit.
- **Tiers** — Ember (1+), Bronze (7+), Silver (30+), Gold (100+).
- **Reminder** — optional, fires at 8pm *only while the tab is open or the site is
  installed to the home screen*, and the UI says so. Real push notifications need a
  server to send them; this is a static site, so it doesn't pretend otherwise.
- **Energy** — state is reserved (`P.energy`) so a rate-limited competitive mode can be
  added without a migration. Nothing reads it yet.

Nothing leaves the device. The privacy line on the hub stays true and the static suite
checks that no network call has crept into the page.

```
node tests/streak-test.js
```

Seeds the browser into each streak state — fresh, active yesterday, missed a day with
and without a freeze, already counted today, at the freeze cap — completes a real quiz
round in each, and checks what was persisted. Needs the same two dev dependencies as
the browser suite.

## Adding a construct

1. Add an object to `data/nodes.json` following the schema.
2. Add its relationships to `data/edges.json` (`relates` or `tension`).
3. `node tests/validate-data.js` — fix anything it reports.
4. `node build.js`
5. Commit both `data/` and the regenerated `index.html`.
