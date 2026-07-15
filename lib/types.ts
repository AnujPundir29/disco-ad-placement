import { z } from "zod";

// ---- Catalog data (shapes of the provided JSON files) ----

export interface Publisher {
  id: string;
  name: string;
  category: string;
  subcategories: string[];
  monthly_impressions: number;
  avg_order_value_usd: number;
  audience: {
    age_skew: string;
    gender_split: { female: number; male: number; other: number };
    top_geos: string[];
    income_tier: string;
  };
  notes: string;
}

export interface Persona {
  id: string;
  name: string;
  age_range: string;
  gender_skew: string;
  description: string;
  category_affinities: string[];
  price_sensitivity: string;
  messaging_preferences: string[];
  disinterested_in: string[];
  typical_aov_usd: number;
}

// ---- LLM call 1: analyze the advertiser & match against the catalog ----

export const analysisSchema = z.object({
  businessProfile: z.object({
    productSummary: z.string().describe("One sentence: what they sell, to whom"),
    category: z.string().describe("Product category, e.g. pet_food, activewear"),
    priceTier: z.enum(["budget", "mid", "premium", "luxury"]),
    estimatedAovUsd: z.number().describe("Best-guess average order value in USD"),
    brandVoice: z.string().describe("Tone the brand seems to want, e.g. playful, clinical"),
  }),
  inputQuality: z.object({
    rating: z.enum(["clear", "vague", "off_catalog"]).describe(
      "clear: enough signal to plan confidently. vague: plannable only with stated assumptions. off_catalog: no shopper audience in this catalog fits (e.g. B2B)."
    ),
    assumptions: z.array(z.string()).describe("Assumptions made to fill gaps in the input; empty if none"),
    clarifyingQuestions: z.array(z.string()).describe("What you would ask the advertiser to improve the plan; empty if input is clear"),
  }),
  rankedPublishers: z
    .array(
      z.object({
        id: z.string(),
        fitScore: z.number().min(0).max(100),
        reasons: z.array(z.string()).min(1).describe("Specific evidence: audience overlap, AOV fit, notes alignment"),
      })
    )
    .describe("Publishers worth running on, best first. Empty if off_catalog."),
  excludedPublishers: z
    .array(
      z.object({
        id: z.string(),
        reason: z.string().describe("One concrete sentence on why this publisher is a poor fit"),
      })
    )
    .describe("Every catalog publisher not in rankedPublishers"),
  selectedPersonas: z
    .array(
      z.object({
        id: z.string(),
        whyRelevant: z.string(),
        keyMessage: z.string().describe("The single idea an ad should communicate to this persona"),
      })
    )
    .max(5)
    .describe("3-5 personas this advertiser should speak to. Empty if off_catalog."),
});

export type Analysis = z.infer<typeof analysisSchema>;

// ---- LLM call 2: creative variants, one per selected persona ----

export const creativesSchema = z.object({
  variants: z
    .array(
      z.object({
        personaId: z.string(),
        headline: z.string().max(80),
        body: z.string().max(300),
        rationale: z.string().describe("Why this copy fits this persona's messaging preferences"),
      })
    )
    .min(3)
    .max(5),
});

export type Creatives = z.infer<typeof creativesSchema>;

// ---- Campaign config: assembled deterministically in code, not by the LLM ----

export interface PublisherAllocation {
  publisherId: string;
  publisherName: string;
  sharePct: number;
  monthlyBudgetUsd: number;
  estCpmUsd: number;
  projectedMonthlyImpressions: number;
  rationale: string;
}

export interface CampaignConfig {
  objective: "conversions" | "traffic" | "awareness";
  bidStrategy: {
    type: "target_cpa" | "manual_cpc" | "cpm";
    suggestedRangeUsd: [number, number];
    rationale: string;
  };
  budget: {
    suggestedMonthlyUsd: number;
    suggestedDailyUsd: number;
    rationale: string;
  };
  publisherAllocations: PublisherAllocation[];
  targeting: {
    personaIds: string[];
    geos: string[];
    interests: string[];
  };
  flightDays: number;
  assumptions: string[];
}

// ---- Full API response ----

export interface CampaignPlan {
  analysis: Analysis;
  creatives: Creatives | null; // null when input is off_catalog
  config: CampaignConfig | null; // null when input is off_catalog
}
