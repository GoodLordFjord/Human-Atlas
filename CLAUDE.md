# Human Atlas — working brief

Read this first. The full plan, the reasoning behind every decision, and the research it
rests on are in `docs/ROADMAP.md`; that file is written as a prompt and can be pasted
into any chat.

## What this is

An interactive, evidence-graded map of what is actually known about people. 98
constructs across 16 layers, each graded twice — how strong the evidence is, and whether
the sources were checked — with disputes mapped rather than smoothed over. Long-term:
the convergence structure between independent traditions (science, contemplative
practice, philosophy, practitioner knowledge), layered over time, delivered as something
genuinely playable.

Live at https://goodlordfjord.github.io/Human-Atlas/ (GitHub Pages serves `main`).

## Who you are working with

The owner is not a developer. They use GitHub Desktop and Claude Code on the web. Assume
`node` and nothing else. Explain in plain terms; ask before widening scope; show
screenshots for UI work. When they say "do it", build it; when a request bundles many
things, build the first and ask about the rest.

## Non-negotiables

- **One shipped file.** `index.html` is generated from `src/app.html` + `data/`. No
  framework, no bundler, no runtime `fetch` — the file must open by double-click.
- **Static, no backend, no accounts.** Nothing leaves the device. The hub says so and the
  static suite checks that no network call has crept in.
- **Edit `data/`, never `index.html`.** Run `node build.js`, commit both.
- **No fabricated content.** Every question, lesson and route is generated from node data.
  Never invent a citation, a finding, or a plain-English summary you have not derived from
  the node's own text. This project's audit log records its own fabricated citation; don't
  add another.
- **No dark patterns.** No variable-ratio rewards, artificial scarcity on learning, guilt
  mechanics, or gating of free exploration. Wrong answers are never punished. Streaks have
  freezes. Rate limits (energy) apply only to competitive modes. See ROADMAP §3 for why —
  the atlas's own `wanting_liking` node is the argument.
- **Plain English first, full entry one tap away.** Evidence and verification pills stay
  visible in both registers. Layer names too: `plain` gloss leads, formal name beside it.
- **One obvious first move.** Start leads with a single hero into the guided path; other
  routes are visibly secondary. Never add a second equally-weighted primary action.
- **Overview first, then zoom, then details.** No modal before the visitor has seen
  anything. The map opens fitted with only hubs named. Narrowing removes, never dims.
- **Honest coverage.** Where content is missing (plain register 16/98, provenance 0/98)
  the app says so; the validator reports it; nothing is hidden.
- **Reminders are labelled as what they are.** No fake push.
- **In-system glyphs, no emoji.** 44px tap targets. Works at 390px. Respect
  `prefers-reduced-motion`.

## Commands

```
node build.js                 # after any change to data/ or src/
node tests/validate-data.js   # schema + roadmap integrity
node tests/stress-test.js     # 161 static checks; fails if index.html is stale

npm install --no-save playwright d3     # once, for the browser suites
node tests/browser-test.js    # every Play mode, phone + desktop layout
node tests/streak-test.js     # every streak state
node tests/roadmap-test.js    # path, lesson, bonus, checkpoint
node tests/firstrun-test.js   # the first-time visitor's journey
```

All green before every push. Browser suites whenever UI changes.

## Where things are

| Path | What |
|---|---|
| `data/nodes.json` | The 98 constructs (schema v2: facets, strength/rubric, verification, provenance, plain) |
| `data/edges.json` | `relates` and `tension` edges, each written once |
| `data/layers.json` | 16 layers |
| `data/roadmaps/*.json` | One roadmap per file; validator enforces refs, DAG, checkpoint gating, steps ≤ supported |
| `schema/atlas.schema.json` | Node shape; `tests/validate-data.js` enforces it |
| `src/app.html` | Renderer: markup, CSS, logic. `MODES` registry for Play modes; `P` store in localStorage |
| `build.js` | Inlines data into the template; exports the projection the tests use |
| `data/layers.json` | Each layer carries `plain` (the gloss shown first) and `name` (the precise term) |

Play modes register themselves in `MODES` with the hub card they want; the hub knows
nothing about any mode by name. `P` (localStorage `ha_play_v1`) holds quiz, expeditions,
puzzle, `streak`, `xp`, `log`, `road`, and reserved `energy`.

## State

**On `main` (live):** map, browse, tensions, trace; Play with quiz, expeditions, puzzle;
the map-height and overflow fixes.

**On `claude/brave-bell-az1alo` (pushed, not merged):** data extracted from the renderer;
schema + validator; plain-English register + toggle; streak with freezes, XP, progress
spine, honest reminder; the roadmap (six units, 52 nodes, checkpoints, bonus branches).

**On `claude/ux-front-door` (pushed, not merged):** the front-door rework — single hero on
Start, Learn tab, overview-first map with unit narrowing, plain layer glosses, empty Trace,
drawer fix, one About door. See README "The front door".

**Next, in order:** merge the branch → energy system (spec in ROADMAP §6A) → spaced
review → plain register to 98/98 → provenance backfill → convergence nodes.

## Git

Work on `claude/<name>` branches. Commit messages explain *why*. Push with
`git push -u origin <branch>`. Do not open a PR unless asked. Never amend or force-push.
