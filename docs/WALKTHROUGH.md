# Disco Campaign Planner — Full Walkthrough

Single reference for the whole project: what the assignment asked, what Disco gave us,
what we built, and exactly how the code flows — so any part can be changed with confidence
during the live round.

> Visual companion: [`flow.excalidraw`](./flow.excalidraw) (open in excalidraw.com) or
> [`flow.png`](./flow.png). Read this doc alongside it.

---

## 1. The assignment (what Disco asked)

Build a working prototype where an advertiser describes their business in a sentence, and the
system produces three things:

1. **Ranked publishers** from the provided catalog, with reasoning — *and* why some were excluded.
2. **3–5 ad creative variants** (headline + body), each tuned to a plausible shopper persona,
   with the persona reasoning visible.
3. **A structured campaign config** — targeting, budget allocation, bid strategy — shape is our
   call, justified in the README.

**The rubric** (from `GLOSSARY.md`, the "hard parts"): match quality, persona-specific creative
that doesn't read generic, graceful handling of messy input, and *showing the work* — no
black-box output.

**Constraints:** aim for 6–8 hours; use AI tools but understand every line (they probe in the
follow-up); submit a working demo + GitHub repo + `prompts/` directory + one-page README.

**Follow-up:** 90-minute round — walk through the code, justify choices, make a live change,
discuss prototype → production.

---

## 2. What Disco gave us (the `data/` pack)

Three files, all under [`data/`](../data). They are the fixed universe the system reasons over.

| File | What's in it | Shape |
|------|--------------|-------|
| `publishers.json` | 20 publishers across pet / apparel / wellness / home / beauty / grocery / beverages | `id, name, category, subcategories[], monthly_impressions, avg_order_value_usd, audience { age_skew, gender_split, top_geos[], income_tier }, notes` |
| `shopper_personas.json` | 10 hand-written personas | `id, name, age_range, gender_skew, description, category_affinities[], price_sensitivity, messaging_preferences[], disinterested_in[], typical_aov_usd` |
| `example_advertisers.txt` | 15 sample advertiser one-liners, clear → vague → garbage | plain text, one per line |

The three fields that actually drive decisions: **`category`/`subcategories`** and **`notes`**
(match quality), **`avg_order_value_usd`** + **`income_tier`** (budget/bid math), and each
persona's **`messaging_preferences`/`disinterested_in`** (creative tuning).

The 15 example inputs include three deliberate traps we handle explicitly:
- **#5 "We help people feel better."** → *vague* (plan on stated assumptions).
- **#7 "B2B SaaS for dental practices…"** → *off-catalog* (no consumer audience fits; refuse honestly).
- **#15 "idk just try it"** → *garbage* (treated as vague, minimal-signal).

`GLOSSARY.md` and `README.md` in the same zip were the brief + ad-tech term definitions
(advertiser, publisher, CPM/CPC/CPA, AOV, creative, targeting, bid).

---

## 3. What we built (stack + shape)

- **Next.js (App Router) + TypeScript**, Tailwind v4. One page, one API route.
- **LLM via the Vercel AI SDK** behind a one-line provider seam (`lib/llm.ts`). Currently
  **OpenAI `gpt-5-mini`**; falls back to **Gemini `gemini-3-flash-preview`** when
  `OPENAI_API_KEY` is unset.
- **Zod** for both request validation and structured LLM output.
- Deployed on **Vercel**: https://disco-ad-placement.vercel.app · repo:
  https://github.com/AnujPundir29/disco-ad-placement

**The one design idea that explains everything:** *LLM for judgment, code for math and
guardrails.* The model does what it's good at — reading fuzzy text, matching, writing copy.
Code does what must be exact and explainable — the budget arithmetic and the invariants
(every publisher accounted for, no hallucinated ids). This is why there are exactly **two LLM
calls** and a **deterministic config builder**, not one big prompt that returns everything.

---

## 4. The flow, end to end

Follow the diagram top-to-bottom. In words:

1. **Input** — advertiser types a sentence in [`components/planner.tsx`](../components/planner.tsx);
   `fetch("/api/campaign")`.
2. **API route** — [`app/api/campaign/route.ts`](../app/api/campaign/route.ts) validates the body
   with Zod (`advertiser` string, 3–1000 chars), calls the pipeline, returns JSON or a 400/502.
3. **Pipeline** — [`lib/pipeline.ts`](../lib/pipeline.ts) orchestrates:
   - **LLM Call 1 — analyze & match** ([`prompts/analyze-and-match.ts`](../prompts/analyze-and-match.ts),
     temp 0.2). The whole catalog + personas are inlined in the prompt. Returns a Zod-validated
     `analysis`: business profile, input-quality rating, ranked + excluded publishers, selected personas.
   - **`reconcileAnalysis()`** — code guardrails re-enforce what the prompt only *asked* for:
     every catalog publisher appears exactly once (ranked XOR excluded), hallucinated/duplicate ids
     dropped, `fitScore < 55` demoted to excluded, persona ids must exist.
   - **Branch — plannable?** If `rating === "off_catalog"` or zero ranked publishers, return early:
     `creatives = null, config = null`. (This is the dental-SaaS "no fit" case.)
   - **LLM Call 2 — creatives** ([`prompts/creatives.ts`](../prompts/creatives.ts), temp 0.8).
     One variant per selected persona, forced to use each persona's `messaging_preferences` and
     avoid their `disinterested_in`.
   - **`buildCampaignConfig()`** ([`lib/budget.ts`](../lib/budget.ts)) — deterministic math, no LLM.
4. **Response** — a `CampaignPlan` = `{ analysis, creatives, config }` (the last two are `null`
   for off-catalog).
5. **UI** — [`components/plan-view.tsx`](../components/plan-view.tsx) renders three sections
   (publishers → creatives → config), with every "why" one interaction away.

---

## 5. The budget math (deterministic, `lib/budget.ts`)

All of this is plain TypeScript with documented constants — no LLM, so it's explainable
line-by-line and never hallucinates.

- **CPM by audience income tier:** `mid $12 · mid-high $18 · high $25` (heuristic, would be
  real observed rates in production).
- **Monthly budget** = `$1,500` per-publisher floor × number of publishers × **tier multiplier**
  (`budget 0.75 · mid 1 · premium 1.25 · luxury 1.5`). The floor is "enough impressions to compare
  publishers"; the multiplier is "pricier products need more impressions per conversion".
- **Share of budget** per publisher = its `fitScore` ÷ sum of fit scores — *budget follows conviction.*
- **Bid strategy by AOV economics:**
  - `AOV ≥ $100` → `target_cpa` at 20–35% of AOV (considered purchase).
  - `AOV ≥ $40` → `manual_cpc` at 1–2% of AOV.
  - `AOV < $40` → `cpm` around the blended estimate (impulse / awareness).
- **Targeting** = selected persona ids + the union of chosen publishers' geos + persona category
  affinities (deduped, capped at 8).

Every number carries a `rationale` string, and the config's `assumptions[]` surface exactly what
was estimated (AOV, heuristic CPMs) so nothing is hidden.

---

## 6. File map (where everything lives)

```
app/
  layout.tsx            fonts (Space Grotesk / Newsreader / JetBrains Mono) + theme script
  page.tsx              renders <Planner/>
  globals.css           OKLCH design tokens (light/dark) + @theme mapping
  api/campaign/route.ts POST endpoint: Zod-validate → pipeline → JSON
lib/
  types.ts              Zod schemas + TS types — SINGLE SOURCE OF SHAPE
  data.ts               loads the JSON packs; publisherById / personaById maps
  llm.ts                provider seam (OpenAI/Gemini) + temperature() helper
  pipeline.ts           orchestration + reconcileAnalysis() guardrails
  budget.ts             deterministic config/budget/bid math
  examples.ts           the 15 sample inputs + tags for the picker
prompts/
  analyze-and-match.ts  Call 1 prompt (profile, rate input, rank/exclude, pick personas)
  creatives.ts          Call 2 prompt (one variant per persona)
  README.md             explains the two prompts
components/
  planner.tsx           form + staged loading + error + orchestration
  plan-view.tsx         results: plan header + 3 sections + vague banner + no-fit
  theme-toggle.tsx      light/dark toggle
scripts/
  sweep.ts              runs all 15 examples through the pipeline, checks invariants
  sweep-output/*.json   committed fixtures (one per example)
docs/
  WALKTHROUGH.md        this file
  flow.excalidraw       the flow diagram (source)
  flow.png              rendered diagram
```

---

## 7. Making changes live (follow-up cheat-sheet)

The design keeps the likely live-change requests small and localized:

| If they ask… | Change this | Notes |
|--------------|-------------|-------|
| "Make the creative punchier / add a tone" | `prompts/creatives.ts` | Pure prose, one file, no code knowledge needed. |
| "Change how matching decides fit" | `prompts/analyze-and-match.ts` | The ranking rubric is prose here; the `< 55` floor is in `reconcileAnalysis()`. |
| "Add a field to the campaign config" | `lib/types.ts` (schema) → `lib/budget.ts` (compute) → one row in `plan-view.tsx` | Schema is the single source of shape; TS will flag every place to update. |
| "Change the budget / bid formula" | `lib/budget.ts` | Constants at the top, each with a rationale comment. |
| "Swap the LLM / model" | `lib/llm.ts` (one line) or the `OPENAI_MODEL` / `GEMINI_MODEL` env var | Provider seam; nothing else changes. |
| "Tighten the vague vs off-catalog behavior" | `prompts/analyze-and-match.ts` (the rating rubric) + the `plannable` branch in `lib/pipeline.ts` | |
| "Restyle a section" | `components/plan-view.tsx` + tokens in `app/globals.css` | After editing `@theme`, **restart `npm run dev`** — Turbopack serves stale CSS on token changes. |

**Rehearse the two most likely ones once:** a prompt tweak (edit → `npm run sweep -- 1` to see the
effect) and adding a config field (schema → math → UI, all typed).

---

## 8. Run & verify

```bash
npm install
cp .env.example .env.local        # add OPENAI_API_KEY (or GOOGLE_GENERATIVE_AI_API_KEY)
npm run dev                       # http://localhost:3000
npm run sweep                     # run all 15 sample advertisers, check invariants
npm run sweep -- 5 7 15           # just the tricky ones (vague / off-catalog / garbage)
```

`sweep.ts` is the seed of an eval harness: it asserts catalog coverage (ranked + excluded = 20),
3–5 creative variants, and allocation shares summing to ~100%. It writes each plan to
`scripts/sweep-output/NN.json` so prompt changes can be diffed instead of eyeballed.

---

## 9. What's deliberately NOT here (and why)

- **No RAG / vector search** — 20 publishers fit in one prompt; retrieval would add failure modes
  for zero benefit at this scale. At 10k publishers it becomes a pre-filter stage.
- **No DB / auth / persistence** — the planner is stateless per request.
- **No streaming** — the staged loading UI is time-based; wiring real per-stage milestones needs a
  streamed response (a clear next step).
- **No image creative, no real auction modeling** — out of scope per the brief.

The interesting engineering isn't the CRUD — it's (1) making the LLM's judgment trustworthy with
schema + code guardrails, (2) handling messy input honestly, and (3) knowing what *not* to ask the
LLM (the budget math).
