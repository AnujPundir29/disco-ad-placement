import type { Persona, Publisher } from "../lib/types";

export function analyzeAndMatchPrompt(
  advertiserInput: string,
  publishers: Publisher[],
  personas: Persona[]
): string {
  return `You are the planning brain of a retail ad network. An advertiser has described
their business. Analyze it, then match it against our publisher catalog and shopper personas.

## Advertiser's description (verbatim, may be vague or even unusable)

"${advertiserInput}"

## Publisher catalog (${publishers.length} publishers)

${JSON.stringify(publishers, null, 2)}

## Shopper personas (${personas.length} personas)

${JSON.stringify(personas, null, 2)}

## Your job

1. **Profile the business**: what they sell, category, price tier, estimated AOV, brand voice.
   Infer conservatively from the text; note guesses as assumptions, not facts.

2. **Judge input quality**:
   - "clear": what the product is, who buys it, and how it's positioned are all identifiable
     from the text. Minor unknowns (exact AOV, geography, SKU details) do NOT make an input
     vague — estimate them and move on.
   - "vague": a load-bearing fact — what the product actually is, or who the customer is —
     must be assumed before you can plan. List every assumption you make, and write
     clarifying questions you would ask the advertiser (at most 4, most important first).
   - "off_catalog": no shopper audience in this catalog plausibly buys this product (e.g. B2B
     software, services with no consumer purchase). Do not force a plan: leave rankedPublishers
     and selectedPersonas empty, put ALL publishers in excludedPublishers, and use
     clarifyingQuestions to explain what kind of network would fit instead.

3. **Rank publishers**: every publisher in the catalog must appear in exactly one of
   rankedPublishers or excludedPublishers — no omissions, no duplicates.
   - rankedPublishers: only publishers genuinely worth spending on, best first, with a
     0–100 fitScore. Reasons must cite specific evidence: audience demographics overlap,
     AOV compatibility with the product's price point, category/subcategory match, or the
     publisher's qualitative notes. Never a generic "good fit".
   - excludedPublishers: one concrete sentence each. "Audience skews 18–34 but this is a
     product for retirees" is good; "not relevant" is not.
   - Be selective: most catalogs have a few strong fits, not fifteen. A fitScore under 55
     means the publisher belongs in excludedPublishers instead.
   - Fit means the publisher's audience plausibly SHOPS FOR this product category on that
     publisher. Demographic overlap alone is not fit: a women's apparel publisher is not a
     pet-food channel just because its readers might own dogs. Category and purchase-intent
     match outrank demographic resemblance.

4. **Select 3–5 personas** who would plausibly buy this product. For each, say why they are
   relevant and the single key message an ad should communicate to them. Respect their
   disinterested_in lists — a persona whose dislikes clash with the product is a bad pick.

Ground every judgment in the catalog data provided. Do not invent publishers or personas.`;
}
