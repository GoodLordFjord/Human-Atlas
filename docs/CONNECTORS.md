# Connectors — what each one can actually do for this project

Tested 2026-09-16 by calling every connected connector against a real Human Atlas
task. Recorded here so the next session reads the answer instead of re-deriving it.
Re-test when a plan changes or a connector is reconnected.

| Connector | Status | What it can do here |
|---|---|---|
| **Google Drive** | Working | Read the owner's own source material. Already found `BoothBoss_MasterPlaybook.docx`, `Sales - Master Sales Playbook.docx`, and `human-atlas-v10.html`. The playbooks are the best available feedstock for the `practitioner` claim type (7/98 today). |
| **GitHub** | Working | Branches, commits, PRs, CI, file reads. This is the connector the project actually runs on. |
| **Figma** | Read-only | Seat is **View** on a starter team, and the account has no design files. Can read a file's structure and tokens *if one exists*; cannot create one. Useless until someone makes a file. |
| **Lune** | Wrong corpus | See below. |
| **Mobbin** | Blocked | Requires a paid Mobbin plan. Every search returns a paywall error. |
| **Canva** | Empty | Connected and callable, but the account has **no brand kits and no designs**. Nothing to pull colours, type or marks from. Could generate assets; has nothing to match them to. |
| **Expo** | Not applicable | Its knowledge base covers one topic, `expo-router` — a React Native file-based router. Human Atlas is one static HTML file with no build step. Searching Expo's docs for "static site" or "PWA" returns nothing. Expo becomes relevant only if the project is rewritten as a React Native app, which contradicts the one-shipped-file rule. |
| **Brisk Teaching** | Empty | Connected, but the account has no classes. Its output is classroom worksheets for a roster, not atlas content. |
| **Gmail** | Needs reconnect | Not usable this session. |

## Lune is a computer-science corpus, not a psychology one

This matters more than the rest, because the obvious hope was that Lune would fill
`provenance` (0/98) and re-check the 41 `inherited` nodes.

It cannot. Five real atlas claims were put through `verify_claims`:

| Claim | Verdict |
|---|---|
| Big Two (warmth judged before competence) | `supported` — **but from an NLP word-norms paper**, not social psychology |
| Power posing changes testosterone and cortisol | `insufficient_evidence` — retrieved pose-guided image synthesis papers |
| Candidate gene studies largely failed to replicate | `insufficient_evidence` — retrieved behavioural-cloning ML papers |
| Ego depletion failed to replicate | `insufficient_evidence` — retrieved LLM working-memory papers |
| Penalising wrong answers harms learning | `insufficient_evidence` — retrieved Q-learning papers |

A direct search for the Mehrabian 7/38/55 literature returned EMNLP, ACL and CVPR
papers with `low_confidence: true`.

The indexed venues are NeurIPS, ICML, ACL, EMNLP, CVPR, CCS. **Lune must not be used
to source citations for this atlas.** The one `supported` verdict is the dangerous
case: accepting it would have put an NLP paper behind a social-psychology claim, which
is precisely the fabricated-citation failure already in the audit log.

Lune stays useful for one thing: `search_research_guidance` on methodology, and
searching the learning-science and HCI literature that *is* published at ACL/CHI-adjacent
venues — interface and pedagogy questions, not psychology content.

## So what actually improves the UI

None of the design connectors can, in their current state. The UI work that remains
is the work already written down in `docs/ROADMAP.md` §6A, and it needs no connector:
energy, spaced review, plain register to 98/98, provenance.

If the owner wants the design connectors to earn their place, the unlock is cheap and
specific — a Canva brand kit (three colours, two typefaces) or one Figma file. Until
one exists there is nothing for them to read.
