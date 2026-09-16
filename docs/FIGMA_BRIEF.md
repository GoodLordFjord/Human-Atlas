# Human Atlas — Figma brief

A paste-ready prompt for any chat or agent that has the Figma MCP connected.
Everything below is taken from the real repository, not invented. Where Figma cannot
do something, it says so rather than pretending.

---

## Read this before you paste it

Two facts about the Figma account, checked on 2026-09-16:

1. **The seat is `View`, on a `starter` tier team** (`Raymond Lancaster's team`).
   A View seat cannot edit or create anything. Every write below will fail until the
   seat is changed to a full/editor seat in Figma's team settings.
2. **There are no files and no design system yet.** This brief creates the first one.

Also: **Figma is not a database.** It has no tables, no rows, no queries, and nothing
that can serve the atlas's 98 constructs at runtime. The nearest equivalent — and it is
a genuinely useful one — is **Variables**: named values grouped into collections, with
modes, that components bind to. That is the design-token store, and it is what the
"database" part of this job actually means. The atlas's own data stays in
`data/*.json` in the repository, where it already is.

---

## THE PROMPT — paste from here down

You are building the design system and screen library for **Human Atlas**, in Figma,
from an existing, working codebase. Read the constraints before designing anything.

### What the product is

An interactive, evidence-graded map of what is actually known about people. 98
psychological constructs across 16 layers. Every construct is graded twice — how strong
the evidence is, and whether the sources were checked directly — and disagreements
between researchers are mapped rather than smoothed over. It is also a learning game:
a guided path, lessons, a quiz, expeditions, a connection puzzle, streaks and XP.

The audience is everyone, not academics. Plain English leads; the full rigorous entry
is one tap away.

### Hard constraints you cannot design around

- **It ships as one static HTML file** with no framework, no bundler and no network
  calls. It must open by double-clicking. Do not propose anything requiring a server,
  an account, or a component library at runtime.
- **Mobile first, 390px.** It must work at 390px wide with no horizontal scroll, and
  survive down to 359px. Desktop layout begins at 900px.
- **44px minimum tap target**, everywhere, no exceptions.
- **`prefers-reduced-motion` is respected.** Every motion spec needs a still fallback.
- **In-system glyphs only — no emoji.** See the defect list; there is one violation
  shipping right now.
- **No dark patterns.** No variable-ratio rewards, no artificial scarcity on learning,
  no guilt mechanics, no gating of free exploration. Wrong answers are never punished.
  Do not design a "you lost your streak" shame state; design the freeze that saves it.
- **Honest coverage.** Where content is missing, the interface says so. Design the
  "not written yet" state as a first-class state, not an error.

### Deliverables, in this order. Do not skip ahead.

#### Pass 1 — Variables (the token layer)

Create a file and four variable collections. Build every collection with a **Light**
and a **Dark** mode from the start, even though only Light ships today, so dark mode is
later a switch and not a rewrite.

**Collection `colour/core`** — these are the live values, use them exactly:

| Token | Light value |
|---|---|
| `paper` | `#f5f6f3` |
| `card` | `#ffffff` |
| `ink` | `#16233f` |
| `ink-2` | `#2c3d63` |
| `tx` | `#1f2a3f` |
| `tx-2` | `#56637a` |
| `line` | `#d5dae3` |
| `line-2` | `#e8ecf1` |
| `focus` | `#0b6b74` |

**Collection `colour/evidence`** — the grading scale. These carry meaning; do not
prettify them, and check every one for contrast against `paper` and `card`:

| Token | Value | Means |
|---|---|---|
| `solid` | `#256b42` | Evidence holds up |
| `moderate` | `#96631d` | Mixed |
| `emerging` | `#2f5c96` | Early |
| `contested` | `#a8391f` | Actively disputed |
| `failed` | `#7d2413` | Failed to replicate |
| `literary` | `#5c6a7d` | Not an empirical claim |

**Collection `colour/layer`** — one per layer. The plain-English gloss is the primary
name shown to a visitor; the formal name sits beside it:

| Token | Value | Plain name | Formal name |
|---|---|---|---|
| `substrate` | `#16233f` | Built-in drives | Evolved substrate |
| `genetics` | `#1d6b5c` | What you inherit | Heredity & genomics |
| `neuro` | `#b5581f` | Wanting and reward | Reward & motivation neuroscience |
| `emotion` | `#7d2e68` | Feelings and moods | Emotion |
| `dark` | `#4a3b63` | Difficult traits | The dark layer |
| `dev` | `#2a7f6f` | Growing up | Development |
| `spine` | `#12808a` | How people judge each other | Spine — organising claims |
| `diffs` | `#6a4fb3` | Personality | Individual differences |
| `motive` | `#b07d2b` | What drives you | Motivation & needs |
| `cog` | `#3f6fb5` | Thinking and its traps | Cognition |
| `selfreg` | `#2e7d4f` | Self-control and change | Self & regulation |
| `percep` | `#c99a2e` | First impressions | Social perception |
| `infl` | `#b4452f` | Persuasion | Influence |
| `bond` | `#c25a7c` | Relationships | Bonding & relationships |
| `applied` | `#6b7a90` | Sales and self-help systems | Applied frameworks (derivative) |
| `meta` | `#8a6fb0` | How this atlas checks itself | Epistemics & method |

**Collection `size`** — spacing on a 4px grid seeded from the live `--sp:16px`, radius
from `--r:12px`, and `tap:44px` as a hard floor.

**Type.** The live fonts are `Bricolage Grotesque` (display), `Inter` (body) and
`JetBrains Mono` (data/labels). **There is no type scale — the CSS uses 23 different
font sizes between 10px and 23px, in half-pixel steps.** Replace this with a scale of
at most seven steps, named by role (`display`, `title`, `body`, `body-sm`, `label`,
`caption`, `mono`), and map every one of the 23 existing sizes onto it. Deliver that
mapping as a table; it is the single highest-value thing in this pass.

#### Pass 2 — Components

Build these as components with variants, bound to the Pass 1 variables. No raw hex
anywhere. The names in backticks are the live CSS classes — keep them, so the design
and the code stay addressable by the same word.

- **Evidence pill** — six variants, one per `colour/evidence` token.
- **Verification pill** — two variants: `audited` / `inherited`. This is independent of
  evidence strength and must never look like a third grade of it. 57 nodes are audited,
  41 inherited.
- **Construct card** — plain register and full register, plus a **no plain version
  written** state. Plain coverage is 16 of 98, so that state is the common one.
- **Chip** (`chip`) — filter and layer selection, selected and unselected.
- **Button** (`go`, `plbtn`) — primary, secondary, ghost, disabled. Only one primary
  may appear on a screen.
- **Nav bar** (`nav`) — six tabs: Start, Learn, Map, Browse, Tensions, Trace. Include
  the safe-area inset at the bottom.
- **Progress spine** (`spine`) — streak count, four tier colours (Ember 1+, Bronze 7+,
  Silver 30+, Gold 100+), last seven days, XP, freezes held.
- **Roadmap node** (`road`) — four computed states: `locked`, `unlocked`, `active`
  (pulses), `completed`, plus a `bonus` variant that never pulses, and a `checkpoint`
  variant.
- **Lesson question** (`plopt`) — unanswered, chosen-correct, chosen-incorrect,
  revealed. The incorrect state must read as neutral information, never as a penalty.
- **Empty and honest states** — "not written yet", "no plain version", "nothing to
  search here yet".

#### Pass 3 — Screens

At 390px first, then 900px+. Six views: **Start, Learn, Map, Browse, Tensions, Trace**,
plus the four Learn modes: Roadmap, Quiz, Expeditions, Connection puzzle.

The sequencing rules these screens exist to protect:

- **One obvious first move.** Start leads with a single hero into the guided path. Every
  other route is visibly secondary. Never draw a second equally weighted primary action.
- **Overview first, then zoom, then details on demand.** The map opens fitted with only
  hub nodes named. No modal before the visitor has seen anything. Narrowing the map
  *removes* nodes rather than dimming them.
- **Plain English first, full entry one tap away**, in every register and for layer
  names too.
- **Two taps from a cold load to a construct explained in plain English.** This is a
  measured number and a test guards it. Do not design a flow that adds a third.

#### Pass 4 — Handoff

Annotate each component with the CSS class it corresponds to and the token names it
binds. Do not attempt Code Connect: it needs an Organization or Enterprise plan and
this is a Starter team. Hand back the type-scale mapping table from Pass 1 as the first
change to make in code.

### Defects in the shipping design — fix these, don't reproduce them

1. **`⚡` is used as the Tensions tab icon, as a construct icon, and on a Start card.**
   U+26A1 renders as a full-colour emoji on iOS and Android. This breaks the
   in-system-glyph rule in the most visible place in the app. Replace it with a
   monochrome glyph that survives on every platform. The rest of the set is fine:
   `↻ ⇄ ⋔ ◆ ◐ ◭ ✕ ❖ ✓`.
2. **No type scale** — 23 sizes, including half-pixel steps. See Pass 1.
3. **No dark mode**, and no token structure that would let one be added cheaply.
4. **Evidence and layer colours have never been contrast-checked** against `paper` or
   `card`. Several of the layer colours are mid-tone and may fail AA as text.

### How this returns to code

The repository is `GoodLordFjord/Human-Atlas`. It builds with `node build.js`, which
folds `data/*.json` into `src/app.html` to produce `index.html`. Design changes land as
edits to the CSS custom properties at the top of `src/app.html` — currently
`--paper --card --ink --ink-2 --tx --tx-2 --line --line-2 --focus --solid --moderate
--emerging --contested --failed --literary --r --sp --tap --safe-b`. Your variable
names should map one-to-one onto those, so a token change is a one-line edit rather
than a redesign.

Nothing you produce should require the app to fetch anything at runtime.
