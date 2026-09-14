# Human Atlas — roadmap to success

> **How to use this file.** Paste it whole into a new chat with Claude (or rely on
> `CLAUDE.md`, which Claude Code reads automatically in this repo), then say what you
> want built. Everything below is the context a fresh session needs: the vision, the
> decisions already made and why, the research they rest on, how the code is shaped,
> what is done, what is next, and ready-made prompts for each next step.

---

## 0. You are continuing work on Human Atlas

You are an engineer and product designer working with a non-technical owner on an
interactive, evidence-graded map of what is actually known about people. The repo is
`GoodLordFjord/Human-Atlas` on GitHub. The owner uses GitHub Desktop and Claude Code on
the web; assume `node` and nothing else. The site is one static HTML file on GitHub
Pages. Read `CLAUDE.md` for the non-negotiables and commands. Do not relitigate the
decisions in §3 — they were made deliberately, with reasons, and the tests pin them.

## 1. The vision, in the owner's terms

- Condense what books and studies actually say about humans; cross-reference; verify;
  strip the fluff; find the crossover points and the pathways that hold true over time.
- Layered, so depth is added over time without rewriting what exists — psychology now,
  then philosophy, contemplative traditions, consciousness and metaphysics.
- Fun. Genuinely playable, Duolingo-like: streaks, progress you can feel, a top-down
  winding path per subject, learning goals, energy rather than lives.
- A plain-English register that can be toggled, so the widest audience can understand,
  while the full rigour stays one tap away.
- Scalable and franchisable: a new subject is data, not a rewrite.
- Eventually monetisable — people should learn *and* have a reason to pay — without
  betraying the trust the whole thing is built on.

## 2. Where things stand

**Live on `main`** (https://goodlordfjord.github.io/Human-Atlas/): the network map,
browse, tensions, trace; Play with quiz, expeditions and the connection puzzle; the fix
for the map collapsing to 150px and the phone overflow.

**On branch `claude/brave-bell-az1alo`, pushed, not yet merged** (five commits):

1. Content moved out of the renderer into `data/*.json`; `build.js` folds it back into
   one file. Faceted v2 node schema.
2. `schema/atlas.schema.json` + `tests/validate-data.js` that enforces it.
3. Plain-English register (`what` / `why` / `catch`) with a toggle; 16 of 98 written.
4. Daily streak with freezes, XP, a progress spine on every Play screen, an honestly
   labelled reminder. `P.energy` reserved.
5. The roadmap: six units from the six expeditions, 52 nodes, checkpoints gating each
   unit, bonus branches launching puzzles; headless engine unit-tested; lesson flow
   generates questions pinned to each construct.

**To make all of that live:** on github.com open the repo → the yellow "Compare & pull
request" banner → Create pull request → Merge. Pages redeploys `main` in about a minute.
(Claude can open the PR when asked.)

Test baseline: 132 static checks, validator clean, three browser suites green.

## 3. Decisions already made, and why

| Decision | Why |
|---|---|
| **Stay static: no backend, no accounts, nothing leaves the device** | Free forever, private, zero ops for a non-technical owner. The hub promises it and the static suite enforces it. Relatedness (social) is the one thing this rules out; revisit only with real users (§6D). |
| **Vanilla JS on the d3 already loaded; no React/TypeScript/Tailwind** | A framework would fork a single-file site with no bundler and break double-click-to-open, GitHub Pages simplicity, and the owner's ability to run it. Every skill-tree library found was a wrapper over layouts d3 already ships. |
| **One shipped file, built from `src/` + `data/`** | Browsers block `fetch()` on `file://`, so runtime-loaded JSON would only work over a server. Editing and shipping have different shapes; the build reconciles them. |
| **Facets, not one hierarchy** | `layer`, `claim_type`, `tradition` are independent axes. Faceted classification beats a single tree for findability; a taxonomy forced into one hierarchy collapses as it grows. |
| **`claim_type` separate from `strength`** | One field was doing two jobs ("what kind of claim" and "how well it holds"). Separating them lets Marcus Aurelius in without grading him on replication, and stops a 1,900-year-old observation sharing a tier with a 2016 sales paperback. |
| **Edges are records** | A relationship stored on both endpoints could disagree with itself. Records with a `rel` type let transmission and derivation be added without touching nodes — convergence work is edge work. |
| **Plain English *first*, full entry one tap away** | Plain language measurably helps expert readers too, so it is a second register, not a dumbed-down mode. Evidence pills stay visible in both. |
| **Honest coverage, always** | Missing plain versions and missing provenance are shown and reported, never hidden — the same standard the atlas applies to the psychology. |
| **No gambling / fast-food / dark-pattern mechanics** | The atlas's own `wanting_liking` node explains why: those mechanics maximise *wanting* on a large dopamine system and do nothing for *liking*. The overjustification effect crowds out the intrinsic motivation this audience arrives with. And the product's only asset is epistemic trust; manipulation contradicts it and backfires. Gambling optimises time-on-device; learning needs retention and return. |
| **Streaks with freezes** | Retention data on streaks points at forgiveness, not punishment, as the part that works. One freeze per seven days, cap two, local calendar day. |
| **Energy, not lives — and only on competitive modes** | Duolingo itself moved from hearts to energy. Penalising mistakes reduces learning; elaborated feedback reduces demotivation. So: free practice, expeditions, the map and the roadmap are never gated; energy applies to the checkpoint and daily challenge, and finishing an expedition refunds it — you earn your way back by learning. |
| **Wrong answers cost nothing on the roadmap; questions redraw** | Same research. The explanation is the point. |
| **Roadmap over web for "feeling of progress"** | The web has no "next"; a path does. The map stays as one view. |
| **Roadmap `steps` derived from what a construct supports** | Hard-coding three broke on the first construct (it supports two). The validator now refuses a roadmap that asks for more than the generators can supply. |
| **Reminder labelled honestly** | Real push needs a server to sign each message. A static site can only remind while open or installed to the home screen; the UI says exactly that. |

## 4. Research the design rests on

- Duolingo's streak lifted retention from 12% to 55%; their own Streak Wager trial moved
  D7 retention +14%; freezes are what make it work.
  https://www.strivecloud.io/blog/gamification-examples-boost-user-retention-duolingo
- Spaced practice and practice testing are the two most effective study techniques across
  242 studies / 169,179 participants; spacing g≈0.28; one 2025 maths meta-analysis put the
  testing effect at g≈0.18 with the CI crossing zero — real, not magic.
  https://link.springer.com/article/10.1007/s10648-025-10035-1
- Faceted classification beats a single hierarchy for findability.
  https://journalofia.org/volume2/issue2/02-conradi/
- Plain language helps experts too. https://www.nngroup.com/articles/plain-language-experts/
- Dark patterns backfire on trust; overjustification collapses motivation once rewards
  lose meaning. https://www.growthengineering.co.uk/dark-side-of-gamification/
- Self-Determination Theory: autonomy, competence, relatedness. Competence and autonomy
  are covered; relatedness is currently zero and is the backend question.
  https://www.sciencedirect.com/science/article/pii/S074756321630855X
- Duolingo replaced hearts with energy.
  https://trophy.so/blog/why-duolingo-switched-to-energy-and-how-to-build-an-energy-feature-for-your-app
- Penalising mistakes reduces learning; elaborated feedback reduces demotivation.
  https://www.sciencedirect.com/science/article/pii/S0361476X25000608
- Web push needs a backend; a static site can only do local reminders.
  https://www.magicbell.com/blog/using-push-notifications-in-pwas

## 5. How the code is shaped

**Node (schema v2)** — `id`, `label`, `kind` (construct | convergence | question |
position | practice), `facets{layer, claim_type, tradition}`, `strength{rubric, label,
replication, magnitude, boundaries}`, `verification` (audited | inherited),
`provenance{origin, could_have_read}`, `plain{what, why, catch}` or null, `body{def, mech,
intra, inter, app}`, `sources[]`, `open`. Six claim types: empirical, formal,
phenomenological, contemplative, philosophical, practitioner. `strength.rubric` must equal
`claim_type`.

**Edges** — `{from, to, rel, note}`; `rel` ∈ relates, tension, transmitted_to,
converges_with.

**Roadmap** (`data/roadmaps/<id>.json`) — `{id, title, subtitle, units:[{id, title, blurb,
nodes:[…]}]}`. Node types: `standard {ref, steps, prerequisites}`, `checkpoint {steps,
pass, pool, prerequisites}`, `bonus {puzzle{from,to}, prerequisites}`. Ids are
unit-scoped (`n_<unit>_<ref>`). Each unit after the first must require the previous
unit's checkpoint. `steps ≤ supportedQuestions(ref)`.

**Renderer (`src/app.html`)** — `MODES[key] = {ic, name, blurb, best(), paint(el)}`; the
hub renders whatever is registered, in registration order (roadmap first). `P` in
localStorage `ha_play_v1`: `quizBest, quizRounds, exped, puz, streak{count,best,last,
freezes,frozen}, xp, log{day:xp}, road{<rmId>:{<nodeId>:{done,at}}}, energy{cur,max,last}
(reserved), remind`. `award(xp)` is the single path that adds XP and touches the streak.
`QGEN[i](pin?)` — five generators; with no pin they draw at random (quiz), with a pinned
construct they build that question about it or return null. `questionsFor(ref,k)`.
`roadState(rm, prog)` is headless, between `/* ---- road engine ---- */` markers; the
static suite lifts it out and unit-tests it.

**Pipeline** — `build.js` reads `data/`, projects v2 nodes back to the field names the
renderer still speaks (carrying the new fields alongside), inlines nodes, layers and
roadmaps into `src/app.html`, writes `index.html`, and exports the projection so tests
and page share one definition. `tests/stress-test.js` rebuilds and compares, so a stale
`index.html` fails.

## 6. The roadmap to success

### A — Now (this branch, then the next two builds)

1. **Merge the branch** so the plain register, streaks and roadmap go live.
2. **Energy system** (the paid lever; state already reserved). Proposed spec, for the
   owner to confirm: 5 energy max; only the **checkpoint** and the **daily puzzle** spend
   it; a wrong answer there costs 1; regenerates 1 per hour; finishing any expedition
   refunds 1; at 0 the competitive modes show a countdown and point to the free modes.
   Everything else stays ungated. Paid refills come later, never for free-mode content.
3. **Spaced review.** The mechanic with the best evidence. Resurface constructs answered
   wrong (and roadmap nodes completed) at widening intervals (1, 3, 7, 14, 30 days) as a
   "Review" card on the hub; a review round is generated from due constructs. Persist
   `P.review{<ref>:{due, interval, lapses}}`.
4. **Plain register to 98/98.** Content work, hand-written from each node's own
   `def`/`mech` — never a summary of a summary. Format: `what` (one sentence, no jargon
   unless it is the node's own name), `why` (why it matters), `catch` (what people get
   wrong). The static suite checks `what` is shorter than `def` and flags imported jargon.
5. **Provenance backfill.** `origin{who, when, tradition, work}` wherever sources already
   say it. Slow, mostly reading. Start early — everything in B waits on it.

### B — The differentiator

6. **Convergence nodes** (`kind: convergence`). A claim plus the independent routes that
   reached it, each route carrying `{node, tradition, earliest, independence{rating,
   status, basis, inherited_from}}` and a `verdict`. The first three can be hand-built
   from what is already in the graph — start with *naming an emotion reduces its grip*
   (affect_labeling, change_talk, Theravāda noting, voss — the last is likely transmission,
   not independence). UI: a convergence view showing routes as spokes, with independence
   status visible; the map draws `converges_with` edges distinctly.
7. **Questions and positions** for consciousness and metaphysics. `question` states a
   problem; `position` answers it with `commits_you_to`, `strongest_objection` (required,
   stated at full strength), `defeated_if`. Map positions, never verdicts.
8. **Rubrics for the other four claim types** with real content, once B6 exists: formal,
   phenomenological, contemplative, philosophical.

### C — Scale

9. **A second subject.** A second roadmap file, its own layers and tradition facet, no
   renderer change. Philosophy is the natural first.
10. **The map becomes one view among several.** Node-link layouts lose above ~20 nodes
    (the stress test already warns); at hundreds the hairball wins. Add a convergence-first
    view and a per-layer / matrix view before the count balloons.
11. **PWA install.** `manifest.json` + a service worker for home-screen install and
    offline. This is also the only way the reminder can fire when the tab is closed
    without a server (Android Chrome; iOS only when installed).

### D — Only with real users

12. **Relatedness.** SDT's third need is at zero. Options, in order of commitment:
    prototype a shared leaderboard as a Claude Artifact to feel it; then Supabase (anon
    key is designed to be public, RLS is the boundary) for daily-challenge stats and
    cross-device sync — and rewrite the privacy line honestly when that happens.

### E — Monetisation, without betraying §3

What must stay free: reading every construct, the map, expeditions, the roadmap's
lessons. What can be paid: energy refills for competitive modes, a supporter tier
(cosmetic: streak colours, badges), additional subjects when they exist. Never sell
answers, never gate explanations, never introduce variable rewards. The trust is the
product.

## 7. Working agreements

**For the owner:** say what you want in plain words; pick from the options Claude gives;
look at the screenshots; pull the branch in GitHub Desktop and double-click
`index.html` to see it locally; merge via the PR banner when you are happy.

**For Claude:** read `CLAUDE.md`; run validator + static suite before every push and the
browser suites for UI changes; commit small with messages that say *why*; take one
screenshot for UI work and send it; ask before widening scope; when a request bundles
several things, build the first and ask about the rest; never fabricate content or
citations; never add a dependency, a framework, or a network call; never amend or
force-push; don't open a PR unless asked.

## 8. Open questions for the owner

- Confirm the energy spec in §6A.2, or change the numbers.
- Which subject second: philosophy, or something else?
- Is the 300KB payload warning (now 397KB) a limit to defend, or advisory?
- Naming: is "Human Atlas" the product name, or the first subject inside a larger thing?

## 9. Prompts you can paste

**Build the energy system**
> Read CLAUDE.md and docs/ROADMAP.md. Build the energy system per §6A.2: 5 max, spent
> only by the checkpoint and daily puzzle, 1 per wrong answer there, +1 per hour, +1 per
> completed expedition, countdown at zero with a pointer to free modes. Reserve nothing
> new; use `P.energy`. Add it to the spine. Static checks that free modes never read
> energy, and a browser test that seeds each state. Screenshot, then commit and push on a
> new `claude/` branch.

**Add spaced review**
> Read CLAUDE.md and docs/ROADMAP.md. Build spaced review per §6A.3 with a Review card on
> the hub showing what is due, intervals 1/3/7/14/30 days, lapses resetting the interval,
> persisted in `P.review`. Reuse `questionsFor`. Tests for due-date maths and the round.

**Write plain-English entries**
> Read CLAUDE.md. Write `plain` entries for these constructs from their own `def` and
> `mech` only: <ids>. Format what/why/catch per §6A.4. Run `node build.js` and both static
> suites; the jargon and length checks must pass. Show me the entries before committing.

**Add a roadmap for a new subject**
> Read CLAUDE.md and docs/ROADMAP.md §5. Create `data/roadmaps/<subject>.json` with units,
> checkpoints and bonus puzzles from these constructs: <list>. Unit-scoped node ids, steps
> derived from supported question types. Validator must pass; add a hub picker if there is
> more than one roadmap.

**Add the first convergence node**
> Read docs/ROADMAP.md §6B.6. Add `kind: convergence` to the schema and validator, then
> hand-build `conv_naming_reduces_grip` with routes affect_labeling, change_talk, a new
> `noting_practice` construct (contemplative rubric, sourced), and voss marked
> `independence: low, inherited_from: change_talk, status: unverified`. Render it in the
> detail sheet and as distinct edges on the map.

**Open the PR**
> Open a pull request from `claude/brave-bell-az1alo` to `main` summarising the five
> commits, then tell me the link.
