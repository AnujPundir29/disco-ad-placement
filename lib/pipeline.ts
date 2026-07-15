import { generateObject } from "ai";
import { analyzeAndMatchPrompt } from "../prompts/analyze-and-match";
import { creativesPrompt } from "../prompts/creatives";
import { buildCampaignConfig } from "./budget";
import { personaById, personas, publishers } from "./data";
import { model, temperature } from "./llm";
import { analysisSchema, creativesSchema, type Analysis, type CampaignPlan } from "./types";

// Two LLM calls, everything else is code:
//   1. analyze + match  (low temperature: judgment should be reproducible)
//   2. creatives        (higher temperature: copy should have some spark)
// Config is assembled deterministically from call 1's output in budget.ts.
export async function generateCampaignPlan(advertiserInput: string): Promise<CampaignPlan> {
  const { object: rawAnalysis } = await generateObject({
    model,
    schema: analysisSchema,
    prompt: analyzeAndMatchPrompt(advertiserInput, publishers, personas),
    temperature: temperature(0.2),
  });

  const analysis = reconcileAnalysis(rawAnalysis);

  const plannable =
    analysis.inputQuality.rating !== "off_catalog" &&
    analysis.rankedPublishers.length > 0 &&
    analysis.selectedPersonas.length > 0;

  if (!plannable) {
    return { analysis, creatives: null, config: null };
  }

  const selectedPersonas = analysis.selectedPersonas.map((p) => personaById.get(p.id)!);
  const { object: creatives } = await generateObject({
    model,
    schema: creativesSchema,
    prompt: creativesPrompt(advertiserInput, analysis, selectedPersonas),
    temperature: temperature(0.8),
  });

  // Drop any variant aimed at a persona the analysis didn't select.
  const validPersonaIds = new Set(analysis.selectedPersonas.map((p) => p.id));
  creatives.variants = creatives.variants.filter((v) => validPersonaIds.has(v.personaId));

  return { analysis, creatives, config: buildCampaignConfig(analysis) };
}

// Code-level guardrails on the LLM's matching output. The prompt asks for all of
// this, but we don't trust prompts for invariants the app depends on:
//   - every catalog publisher appears exactly once (ranked XOR excluded)
//   - hallucinated ids are dropped
//   - ranked entries below the fit threshold move to excluded
//   - persona ids must exist in the catalog
function reconcileAnalysis(analysis: Analysis): Analysis {
  const FIT_THRESHOLD = 55;
  const seen = new Set<string>();

  const ranked = analysis.rankedPublishers
    .filter((r) => publishers.some((p) => p.id === r.id) && !seen.has(r.id) && seen.add(r.id))
    .sort((a, b) => b.fitScore - a.fitScore);

  const excluded = analysis.excludedPublishers.filter(
    (e) => publishers.some((p) => p.id === e.id) && !seen.has(e.id) && seen.add(e.id)
  );

  for (const r of ranked.filter((r) => r.fitScore < FIT_THRESHOLD)) {
    excluded.push({ id: r.id, reason: `Fit score ${r.fitScore} is below the ${FIT_THRESHOLD} spend threshold: ${r.reasons[0]}` });
  }

  for (const p of publishers.filter((p) => !seen.has(p.id))) {
    excluded.push({ id: p.id, reason: "Not surfaced as a fit for this advertiser" });
  }

  return {
    ...analysis,
    rankedPublishers: ranked.filter((r) => r.fitScore >= FIT_THRESHOLD),
    excludedPublishers: excluded,
    selectedPersonas: analysis.selectedPersonas.filter((p) => personaById.has(p.id)),
  };
}
