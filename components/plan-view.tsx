"use client";

import { useState } from "react";
import { personaById, publisherById } from "../lib/data";
import type { CampaignPlan } from "../lib/types";

export function PlanView({ plan }: { plan: CampaignPlan }) {
  const { analysis, creatives, config } = plan;
  const q = analysis.inputQuality;

  return (
    <div className="mt-8 space-y-8">
      {/* Business read-back + input quality */}
      <Section title="What we understood">
        <p className="text-sm">{analysis.businessProfile.productSummary}</p>
        <p className="mt-1 text-xs opacity-60">
          {analysis.businessProfile.category} · {analysis.businessProfile.priceTier} tier · est. AOV $
          {analysis.businessProfile.estimatedAovUsd} · voice: {analysis.businessProfile.brandVoice}
        </p>
        {q.rating !== "clear" && (
          <div
            className={`mt-3 rounded-lg border p-3 text-sm ${
              q.rating === "vague"
                ? "border-amber-500/40 bg-amber-500/5"
                : "border-red-500/40 bg-red-500/5"
            }`}
          >
            <p className="font-medium">
              {q.rating === "vague"
                ? "This brief is vague — planning on stated assumptions"
                : "This business doesn't fit this catalog"}
            </p>
            {q.assumptions.length > 0 && (
              <ul className="mt-2 list-disc pl-5 opacity-80">
                {q.assumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            )}
            {q.clarifyingQuestions.length > 0 && (
              <>
                <p className="mt-2 font-medium">We&apos;d ask the advertiser:</p>
                <ul className="mt-1 list-disc pl-5 opacity-80">
                  {q.clarifyingQuestions.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </Section>

      {/* Publishers */}
      <Section title={`Recommended publishers (${analysis.rankedPublishers.length})`}>
        {analysis.rankedPublishers.length === 0 ? (
          <p className="text-sm opacity-70">
            None — no publisher in this catalog reaches an audience that buys this product.
          </p>
        ) : (
          <ul className="space-y-3">
            {analysis.rankedPublishers.map((r, idx) => {
              const pub = publisherById.get(r.id);
              return (
                <li key={r.id} className="rounded-lg border border-black/10 p-3 dark:border-white/15">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium">
                      {idx + 1}. {pub?.name ?? r.id}
                      <span className="ml-2 text-xs font-normal opacity-60">{pub?.category}</span>
                    </span>
                    <FitScore score={r.fitScore} />
                  </div>
                  <ul className="mt-2 list-disc pl-5 text-sm opacity-80">
                    {r.reasons.map((reason, i) => (
                      <li key={i}>{reason}</li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
        <Collapsible label={`Why the other ${analysis.excludedPublishers.length} were excluded`}>
          <ul className="space-y-1.5 text-sm opacity-80">
            {analysis.excludedPublishers.map((e) => (
              <li key={e.id}>
                <span className="font-medium">{publisherById.get(e.id)?.name ?? e.id}:</span> {e.reason}
              </li>
            ))}
          </ul>
        </Collapsible>
      </Section>

      {/* Creatives */}
      {creatives && (
        <Section title={`Ad creative (${creatives.variants.length} variants, one per persona)`}>
          <div className="grid gap-3 sm:grid-cols-2">
            {creatives.variants.map((v, i) => {
              const persona = personaById.get(v.personaId);
              const why = analysis.selectedPersonas.find((p) => p.id === v.personaId)?.whyRelevant;
              return (
                <div key={i} className="flex flex-col rounded-lg border border-black/10 p-3 dark:border-white/15">
                  <span className="w-fit rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-medium">
                    {persona?.name ?? v.personaId}
                  </span>
                  {why && <p className="mt-1.5 text-xs opacity-60">Why this persona: {why}</p>}
                  <p className="mt-2 font-medium">{v.headline}</p>
                  <p className="mt-1 text-sm opacity-80">{v.body}</p>
                  <p className="mt-2 border-t border-black/10 pt-2 text-xs italic opacity-60 dark:border-white/15">
                    {v.rationale}
                  </p>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Campaign config */}
      {config && (
        <Section title="Draft campaign config">
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <Stat label="Objective" value={config.objective} />
            <Stat
              label={`Bid: ${config.bidStrategy.type}`}
              value={`$${config.bidStrategy.suggestedRangeUsd[0]} – $${config.bidStrategy.suggestedRangeUsd[1]}`}
              hint={config.bidStrategy.rationale}
            />
            <Stat
              label="Suggested budget"
              value={`$${config.budget.suggestedMonthlyUsd.toLocaleString()}/mo`}
              hint={config.budget.rationale}
            />
          </div>

          <table className="mt-4 w-full text-left text-sm">
            <thead className="text-xs uppercase opacity-60">
              <tr>
                <th className="py-1.5 pr-2">Publisher</th>
                <th className="py-1.5 pr-2">Share</th>
                <th className="py-1.5 pr-2">$/month</th>
                <th className="py-1.5 pr-2">Est. CPM</th>
                <th className="py-1.5">Proj. impressions</th>
              </tr>
            </thead>
            <tbody>
              {config.publisherAllocations.map((a) => (
                <tr key={a.publisherId} className="border-t border-black/10 dark:border-white/15">
                  <td className="py-1.5 pr-2 font-medium">{a.publisherName}</td>
                  <td className="py-1.5 pr-2">{a.sharePct}%</td>
                  <td className="py-1.5 pr-2">${a.monthlyBudgetUsd.toLocaleString()}</td>
                  <td className="py-1.5 pr-2">${a.estCpmUsd}</td>
                  <td className="py-1.5">{a.projectedMonthlyImpressions.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-3 text-sm">
            <span className="opacity-60">Targeting:</span>{" "}
            {config.targeting.personaIds
              .map((id) => personaById.get(id)?.name ?? id)
              .join(", ")}{" "}
            · {config.targeting.geos.join(", ")}
          </p>
          <p className="mt-1 text-xs opacity-60">Interests: {config.targeting.interests.join(", ")}</p>

          {config.assumptions.length > 0 && (
            <Collapsible label={`Assumptions baked into these numbers (${config.assumptions.length})`}>
              <ul className="list-disc pl-5 text-sm opacity-80">
                {config.assumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </Collapsible>
          )}

          <Collapsible label="Raw config JSON">
            <div className="relative">
              <CopyButton text={JSON.stringify(config, null, 2)} />
              <pre className="overflow-x-auto rounded-lg bg-black/5 p-3 text-xs dark:bg-white/10">
                {JSON.stringify(config, null, 2)}
              </pre>
            </div>
          </Collapsible>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-base font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function FitScore({ score }: { score: number }) {
  return (
    <span className="flex shrink-0 items-center gap-2 text-xs opacity-80">
      <span className="h-1.5 w-20 overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
        <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${score}%` }} />
      </span>
      {score}/100
    </span>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-black/10 p-3 dark:border-white/15">
      <p className="text-xs uppercase opacity-60">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
      {hint && <p className="mt-1 text-xs opacity-60">{hint}</p>}
    </div>
  );
}

function Collapsible({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <details className="mt-3 rounded-lg border border-black/10 p-3 dark:border-white/15">
      <summary className="cursor-pointer text-sm font-medium opacity-80">{label}</summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="absolute right-2 top-2 rounded-md border border-black/10 bg-background px-2 py-1 text-xs dark:border-white/15"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
