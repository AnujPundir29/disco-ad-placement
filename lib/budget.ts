import { personaById, publisherById } from "./data";
import type { Analysis, CampaignConfig, PublisherAllocation } from "./types";

// All money math is deterministic code, not LLM output: it must be explainable
// line-by-line and never hallucinate. Constants below are documented heuristics,
// not real market data — a production system would replace them with observed CPMs.

// Baseline display CPM (USD) by publisher audience income tier.
const CPM_BY_INCOME_TIER: Record<string, number> = {
  mid: 12,
  "mid-high": 18,
  high: 25,
};

// Spend enough per publisher to see ~75k impressions/month at these CPMs —
// below that, performance data is too thin to compare publishers.
const MIN_MONTHLY_PER_PUBLISHER_USD = 1500;

// Price-tier multiplier: pricier products need more impressions per conversion,
// so the test budget scales up with tier.
const TIER_MULTIPLIER: Record<Analysis["businessProfile"]["priceTier"], number> = {
  budget: 0.75,
  mid: 1,
  premium: 1.25,
  luxury: 1.5,
};

const MAX_PUBLISHERS = 5;
const FLIGHT_DAYS = 30;

export function buildCampaignConfig(analysis: Analysis): CampaignConfig {
  const picks = analysis.rankedPublishers
    .filter((r) => publisherById.has(r.id))
    .slice(0, MAX_PUBLISHERS);

  const monthlyBudget = Math.round(
    MIN_MONTHLY_PER_PUBLISHER_USD *
      picks.length *
      TIER_MULTIPLIER[analysis.businessProfile.priceTier]
  );

  // Allocate proportionally to fit score: budget follows conviction.
  const totalScore = picks.reduce((sum, r) => sum + r.fitScore, 0);
  const allocations: PublisherAllocation[] = picks.map((r) => {
    const pub = publisherById.get(r.id)!;
    const sharePct = Math.round((r.fitScore / totalScore) * 100);
    const monthlyBudgetUsd = Math.round((monthlyBudget * sharePct) / 100);
    const estCpmUsd = CPM_BY_INCOME_TIER[pub.audience.income_tier] ?? 15;
    return {
      publisherId: pub.id,
      publisherName: pub.name,
      sharePct,
      monthlyBudgetUsd,
      estCpmUsd,
      projectedMonthlyImpressions: Math.round((monthlyBudgetUsd / estCpmUsd) * 1000),
      rationale: `${r.fitScore}/100 fit score → ${sharePct}% of budget`,
    };
  });

  const { objective, bidStrategy } = pickBidStrategy(analysis.businessProfile.estimatedAovUsd, allocations);

  const geos = [...new Set(picks.flatMap((r) => publisherById.get(r.id)!.audience.top_geos))];
  const selectedPersonas = analysis.selectedPersonas.filter((p) => personaById.has(p.id));
  const interests = [
    ...new Set(selectedPersonas.flatMap((p) => personaById.get(p.id)!.category_affinities)),
  ].slice(0, 8);

  return {
    objective,
    bidStrategy,
    budget: {
      suggestedMonthlyUsd: monthlyBudget,
      suggestedDailyUsd: Math.round(monthlyBudget / FLIGHT_DAYS),
      rationale: `$${MIN_MONTHLY_PER_PUBLISHER_USD}/publisher/month floor for statistically useful volume × ${picks.length} publishers × ${TIER_MULTIPLIER[analysis.businessProfile.priceTier]} ${analysis.businessProfile.priceTier}-tier multiplier`,
    },
    publisherAllocations: allocations,
    targeting: {
      personaIds: selectedPersonas.map((p) => p.id),
      geos: geos.includes("nationwide") ? ["nationwide"] : geos,
      interests,
    },
    flightDays: FLIGHT_DAYS,
    assumptions: [
      ...analysis.inputQuality.assumptions,
      "CPMs are heuristic estimates by audience income tier, not quoted rates",
      `Estimated AOV of $${analysis.businessProfile.estimatedAovUsd} inferred from the advertiser's description`,
    ],
  };
}

// Bid strategy by product economics: how much a click/impression can be worth
// depends almost entirely on order value.
function pickBidStrategy(
  aovUsd: number,
  allocations: PublisherAllocation[]
): Pick<CampaignConfig, "objective" | "bidStrategy"> {
  if (aovUsd >= 100) {
    return {
      objective: "conversions",
      bidStrategy: {
        type: "target_cpa",
        suggestedRangeUsd: [round2(aovUsd * 0.2), round2(aovUsd * 0.35)],
        rationale: `Considered purchase at ~$${aovUsd} AOV: bid to a target CPA of 20-35% of order value so first-order economics stay profitable`,
      },
    };
  }
  if (aovUsd >= 40) {
    return {
      objective: "conversions",
      bidStrategy: {
        type: "manual_cpc",
        suggestedRangeUsd: [round2(aovUsd * 0.01), round2(aovUsd * 0.02)],
        rationale: `Mid-AOV product: pay per click at 1-2% of order value, a sustainable CPC if roughly 1 in 30 clicks converts`,
      },
    };
  }
  const avgCpm =
    allocations.reduce((sum, a) => sum + a.estCpmUsd, 0) / Math.max(allocations.length, 1);
  return {
    objective: "awareness",
    bidStrategy: {
      type: "cpm",
      suggestedRangeUsd: [round2(avgCpm * 0.8), round2(avgCpm * 1.1)],
      rationale: `Impulse-priced product under $40: buy impressions around the estimated $${round2(avgCpm)} blended CPM and let placement volume drive discovery`,
    },
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
