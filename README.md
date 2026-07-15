# Disco Campaign Planner

An advertiser describes their business in a sentence. The system returns a **ranked list of
publishers** (with reasons, and reasons for every exclusion), **3–5 ad creative variants** each
tuned to a specific shopper persona, and a **draft campaign config** — budget split, bid
strategy, targeting — with every assumption surfaced.

**Live demo:** https://disco-ad-placement.vercel.app · Try the dropdown examples, especially #5 (vague), #7 (B2B
mismatch), and #15 (garbage) — messy input is handled, not ignored.

## Run it

```bash
npm install
cp .env.example .env.local   # add a free key from aistudio.google.com
npm run dev                  # http://localhost:3000
npm run sweep                # optional: run all 15 sample advertisers through the pipeline
```

## How it works

Two LLM calls (Gemini Flash via the AI SDK — provider swappable in one line, `lib/llm.ts`),
everything else is code:

1. **Analyze & match** (`prompts/analyze-and-match.ts`, temp 0.2): profile the business, rate
   input quality (`clear` / `vague` / `off_catalog`), rank or exclude *every* publisher with
   evidence, pick 3–5 personas. Code-level guardrails in `lib/pipeline.ts` re-verify the
   invariants the prompt asks for (full catalog coverage, no hallucinated ids, fit threshold).
2. **Creatives** (`prompts/creatives.ts`, temp 0.8): one variant per selected persona, forced
   to use each persona's messaging preferences and avoid their dislikes.

The **campaign config is deliberately not LLM output**: `lib/budget.ts` computes allocation,
budget, and bid strategy deterministically from call 1's fit scores and documented heuristics
(CPM by income tier, budget floor per publisher, bid range from AOV economics). LLMs are
unreliable at arithmetic; money math should be explainable line-by-line. Vague input produces a
plan plus visible assumptions and the clarifying questions we'd ask; off-catalog input (B2B
SaaS) honestly returns no plan instead of force-ranking 20 bad fits.

## With another week

- **Evals before features**: `npm run sweep` checks structural invariants; the next step is
  scoring match quality and creative-persona fit with an LLM judge, so prompt changes can be
  regression-tested instead of eyeballed.
- Streaming the plan section-by-section (publishers arrive ~10s before creatives).
- A feedback loop: advertiser accepts/rejects publishers → few-shot examples in the prompt.
- Real CPM/performance data to replace the heuristic constants in `lib/budget.ts`.

## What I cut, and why

- **RAG / vector search** — 20 publishers fit in one prompt; retrieval adds failure modes with
  zero benefit at this scale. At 10k publishers it becomes a pre-filter stage, not a rewrite.
- **Multi-turn clarification flow** — the analysis already generates the clarifying questions;
  wiring a chat loop is UI work that demonstrates nothing new about the core problem.
- **DB / auth / persistence** — a planner is stateless per request.
- **Image creative, auction simulation** — out of scope per the brief.

## Hard vs easy

Easy: the UI, the API plumbing, the happy-path prompt — any stack does this. Hard, and where
the interesting engineering lives: (1) **making the LLM's judgment trustworthy** — structured
output plus code that enforces invariants prompts can only request; (2) **messy input** — the
difference between a demo and a product is what happens on "idk just try it"; (3) **knowing
what not to ask the LLM** — the budget math is better, cheaper, and more defensible as twenty
lines of TypeScript. Matching itself is genuinely subtle (Pawline vs Ruffco for premium dog
food is a judgment about audience quality vs reach, not a keyword match) — which is why the
system shows its reasoning everywhere: unexplainable recommendations are unusable in ad tech.
