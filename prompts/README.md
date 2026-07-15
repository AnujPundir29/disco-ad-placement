# Prompts

Every prompt the system sends to the LLM lives in this directory. There are exactly two:

| File | Call | Purpose |
|------|------|---------|
| `analyze-and-match.ts` | 1 | Read the advertiser's description, profile the business, judge input quality, rank/exclude every publisher in the catalog, pick 3–5 personas |
| `creatives.ts` | 2 | Write one ad variant per selected persona, tuned to that persona's messaging preferences |

They are TypeScript template functions rather than static text because the catalog data is
injected at call time and the compiler guarantees the injection points exist. The prose is
all here — nothing is assembled anywhere else.

The campaign config (budget split, bid strategy) is deliberately **not** a prompt: it is
deterministic code in `lib/budget.ts`, computed from call 1's output. LLMs are unreliable at
arithmetic and allocation math should be explainable line-by-line.
