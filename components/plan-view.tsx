"use client";

import { useState } from "react";
import { personaById, publisherById } from "../lib/data";
import type { Analysis, CampaignConfig, CampaignPlan, Creatives } from "../lib/types";

const RATING_LABEL: Record<Analysis["inputQuality"]["rating"], string> = {
  clear: "Clear input",
  vague: "Vague input",
  off_catalog: "Off-catalog input",
};

export function PlanView({ plan }: { plan: CampaignPlan }) {
  const { analysis, creatives, config } = plan;
  const { businessProfile: profile, inputQuality: q } = analysis;
  const isNoFit = q.rating === "off_catalog" || analysis.rankedPublishers.length === 0;

  return (
    <div>
      {/* Plan header — the 10-second orientation */}
      <div className="mb-5 flex items-center justify-between gap-4">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3">
          Disco · Campaign Plan
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-weak px-2.5 py-1.5 font-mono text-[11px] font-medium tracking-[0.06em] text-accent-ink">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          {RATING_LABEL[q.rating]}
        </span>
      </div>

      <p className="mb-5 max-w-[60ch] font-serif text-[26px] leading-[1.32] text-pretty">
        {profile.productSummary}
      </p>

      <div className="flex flex-wrap gap-2.5 border-b border-border pb-6">
        <ProfilePill label="Category" value={profile.category} mono />
        <ProfilePill label="Price tier" value={profile.priceTier} mono />
        <ProfilePill label="Est. AOV" value={`$${profile.estimatedAovUsd}`} mono />
        <ProfilePill label="Brand voice" value={profile.brandVoice} grow />
      </div>

      {q.rating === "vague" && <VagueBanner analysis={analysis} />}

      <PublishersSection analysis={analysis} isNoFit={isNoFit} />
      {creatives && <CreativesSection analysis={analysis} creatives={creatives} />}
      {config && <ConfigSection config={config} />}
    </div>
  );
}

function ProfilePill({
  label,
  value,
  mono,
  grow,
}: {
  label: string;
  value: string;
  mono?: boolean;
  grow?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-0.5 rounded-[10px] border border-border bg-surface px-3.5 py-2 ${
        grow ? "min-w-[200px] flex-1" : ""
      }`}
    >
      <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-3">{label}</span>
      <span className={`text-[13px] ${mono ? "font-mono font-medium" : "text-ink-2"}`}>{value}</span>
    </div>
  );
}

function VagueBanner({ analysis }: { analysis: Analysis }) {
  const { assumptions, clarifyingQuestions } = analysis.inputQuality;
  return (
    <div className="mt-6 rounded-2xl border border-warn bg-warn-weak p-5">
      <p className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-warn-ink">
        ⚠ Input was vague — we planned anyway
      </p>
      <p className="mb-4 max-w-[70ch] font-serif text-[15px] leading-relaxed text-ink-2">
        We filled the gaps with explicit assumptions and ranked publishers against them. Confirm or
        correct the assumptions below and we&apos;ll re-plan — nothing here is hidden.
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <BannerList label="Assumptions made" bullet="—" items={assumptions} />
        <BannerList label="Questions to sharpen it" bullet="?" items={clarifyingQuestions} />
      </div>
    </div>
  );
}

function BannerList({ label, bullet, items }: { label: string; bullet: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-warn-ink">
        {label}
      </div>
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 font-serif text-[14px] leading-snug">
            <span className="shrink-0 text-warn">{bullet}</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionHeader({
  n,
  title,
  aside,
}: {
  n: string;
  title: string;
  aside: string;
}) {
  return (
    <div className="mb-4 mt-10 flex items-baseline gap-3">
      <span className="font-mono text-xs font-semibold text-accent">{n}</span>
      <h2 className="text-2xl font-semibold tracking-[-0.01em]">{title}</h2>
      <span className="ml-auto font-mono text-xs text-ink-3">{aside}</span>
    </div>
  );
}

function PublishersSection({ analysis, isNoFit }: { analysis: Analysis; isNoFit: boolean }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [excludedOpen, setExcludedOpen] = useState(false);
  const { rankedPublishers, excludedPublishers, inputQuality } = analysis;

  return (
    <section>
      <SectionHeader
        n="01"
        title="Publisher recommendations"
        aside={`${rankedPublishers.length} ranked · ${excludedPublishers.length} excluded`}
      />

      {isNoFit ? (
        <div className="rounded-2xl border border-border bg-surface p-8">
          <div className="mb-3.5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-3">
            No recommendation returned
          </div>
          <p className="mb-3.5 max-w-[52ch] font-serif text-[23px] leading-[1.34]">
            Nothing in the 20-publisher catalog fits this campaign — so we&apos;re not going to
            force-rank twenty bad placements.
          </p>
          <p className="mb-6 max-w-[68ch] font-serif text-[15px] leading-relaxed text-ink-2">
            Every publisher in the catalog reaches consumers. An honest &ldquo;no fit&rdquo; is more
            useful than a confident wrong answer — every exclusion is documented below, and a few
            answers would let us reconsider.
          </p>
          {inputQuality.clarifyingQuestions.length > 0 && (
            <div className="rounded-xl border border-border bg-surface-2 p-5">
              <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.1em] text-accent-ink">
                What would change the answer
              </div>
              <div className="flex flex-col gap-2.5">
                {inputQuality.clarifyingQuestions.map((qq, i) => (
                  <div key={i} className="flex gap-2.5 font-serif text-[14.5px] leading-snug">
                    <span className="shrink-0 text-accent">?</span>
                    <span>{qq}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rankedPublishers.map((p, idx) => {
            const pub = publisherById.get(p.id);
            const rest = p.reasons.slice(1);
            const isOpen = expanded[p.id];
            return (
              <div
                key={p.id}
                className="grid grid-cols-[56px_1fr] gap-4 rounded-2xl border border-border bg-surface p-5 sm:grid-cols-[64px_1fr] sm:gap-5"
              >
                <div className="flex flex-col items-start gap-2.5">
                  <span className="font-mono text-xs text-ink-3">#{idx + 1}</span>
                  <span className="font-mono text-[30px] font-semibold leading-none">{p.fitScore}</span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-ink-3">
                    fit / 100
                  </span>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${p.fitScore}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-baseline gap-2.5">
                    <span className="text-lg font-semibold tracking-[-0.01em]">
                      {pub?.name ?? p.id}
                    </span>
                    <span className="font-mono text-[11px] text-ink-3">{p.id}</span>
                  </div>
                  <p className="max-w-[74ch] font-serif text-[15.5px] leading-relaxed">
                    {p.reasons[0]}
                  </p>
                  {isOpen && rest.length > 0 && (
                    <div className="mt-3 flex flex-col gap-2.5 border-t border-dashed border-border pt-3">
                      {rest.map((r, i) => (
                        <div
                          key={i}
                          className="flex gap-2.5 font-serif text-[14.5px] leading-snug text-ink-2"
                        >
                          <span className="shrink-0 text-accent">+</span>
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {rest.length > 0 && (
                    <button
                      onClick={() => setExpanded((s) => ({ ...s, [p.id]: !s[p.id] }))}
                      className="mt-3 font-mono text-[11px] font-medium tracking-[0.04em] text-accent-ink"
                    >
                      {isOpen
                        ? "– hide reasons"
                        : `+ ${rest.length} more reason${rest.length === 1 ? "" : "s"}`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Excluded panel — always available */}
      <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-surface-2">
        <button
          onClick={() => setExcludedOpen(!excludedOpen)}
          className="flex w-full items-center justify-between gap-3 p-4 px-[22px] text-left"
        >
          <span className="flex items-center gap-2.5">
            <span className="font-mono text-[13px] font-semibold text-ink-2">
              {excludedPublishers.length}
            </span>
            <span className="text-sm font-medium">
              excluded publishers — every one with a reason
            </span>
          </span>
          <span className="font-mono text-[11px] text-accent-ink">
            {excludedOpen ? "hide" : "show all"}
          </span>
        </button>
        {excludedOpen && (
          <div className="border-t border-border px-5 pb-2.5 pt-1.5">
            {excludedPublishers.map((e) => (
              <div
                key={e.id}
                className="grid grid-cols-[120px_1fr] gap-4 border-b border-border py-3 last:border-0 sm:grid-cols-[150px_1fr]"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{publisherById.get(e.id)?.name ?? e.id}</span>
                  <span className="font-mono text-[10.5px] text-ink-3">{e.id}</span>
                </div>
                <p className="font-serif text-[14px] leading-snug text-ink-2">{e.reason}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function CreativesSection({
  analysis,
  creatives,
}: {
  analysis: Analysis;
  creatives: Creatives;
}) {
  const [whyOpen, setWhyOpen] = useState<Record<number, boolean>>({});

  return (
    <section>
      <SectionHeader n="02" title="Creative variants" aside="one per persona" />
      <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
        {creatives.variants.map((c, i) => {
          const persona = personaById.get(c.personaId);
          const why = analysis.selectedPersonas.find((p) => p.id === c.personaId)?.whyRelevant;
          const open = whyOpen[i];
          return (
            <div
              key={i}
              className="flex flex-col rounded-2xl border border-border bg-surface p-5"
            >
              <div className="mb-3.5 flex items-center justify-between gap-2">
                <span className="inline-flex items-center rounded-full bg-accent-weak px-2.5 py-1 font-mono text-[11px] font-medium text-accent-ink">
                  {persona?.name ?? c.personaId}
                </span>
                {why && (
                  <button
                    onClick={() => setWhyOpen((s) => ({ ...s, [i]: !s[i] }))}
                    className="font-mono text-[10.5px] text-ink-3"
                  >
                    why this persona
                  </button>
                )}
              </div>
              {open && why && (
                <p className="mb-3.5 rounded-lg bg-surface-2 px-3 py-2.5 font-serif text-[13.5px] italic leading-snug text-ink-2">
                  {why}
                </p>
              )}
              <div className="mb-2.5 text-[19px] font-semibold leading-[1.25] tracking-[-0.01em] text-pretty">
                {c.headline}
              </div>
              <p className="mb-4 font-serif text-[15px] leading-relaxed text-pretty">{c.body}</p>
              <div className="mt-auto border-t border-dashed border-border pt-3.5">
                <div className="mb-1.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-3">
                  Why this copy
                </div>
                <p className="text-[13px] leading-relaxed text-ink-2">{c.rationale}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ConfigSection({ config }: { config: CampaignConfig }) {
  const [jsonOpen, setJsonOpen] = useState(false);

  return (
    <section>
      <SectionHeader n="03" title="Draft campaign config" aside="computed, not generated" />

      <div className="mb-3 grid gap-3 sm:grid-cols-3">
        <StatTile label="Objective">
          <span className="text-2xl font-semibold tracking-[-0.01em]">{config.objective}</span>
        </StatTile>
        <StatTile label={`Bid · ${config.bidStrategy.type}`} caption={config.bidStrategy.rationale}>
          <span className="font-mono text-2xl font-semibold tracking-[-0.02em]">
            ${config.bidStrategy.suggestedRangeUsd[0]}–${config.bidStrategy.suggestedRangeUsd[1]}
          </span>
        </StatTile>
        <StatTile
          label="Budget / month"
          caption={`$${config.budget.suggestedDailyUsd.toLocaleString()}/day · ${config.flightDays}-day flight`}
        >
          <span className="font-mono text-2xl font-semibold tracking-[-0.02em]">
            ${config.budget.suggestedMonthlyUsd.toLocaleString()}
          </span>
        </StatTile>
      </div>

      {/* Allocation table — scrolls horizontally on narrow screens */}
      <div className="mb-3 overflow-x-auto rounded-xl border border-border bg-surface">
        <div className="min-w-[560px]">
          <div className="grid grid-cols-[1.6fr_1.4fr_0.9fr_0.7fr_1fr] gap-3 border-b border-border bg-surface-2 px-5 py-2.5 font-mono text-[9.5px] uppercase tracking-[0.08em] text-ink-3">
            <span>Publisher</span>
            <span>Share of budget</span>
            <span className="text-right">Monthly</span>
            <span className="text-right">CPM</span>
            <span className="text-right">Impr / mo</span>
          </div>
          {config.publisherAllocations.map((a) => (
            <div
              key={a.publisherId}
              className="grid grid-cols-[1.6fr_1.4fr_0.9fr_0.7fr_1fr] items-center gap-3 border-b border-border px-5 py-3 last:border-0"
            >
              <div className="flex flex-col gap-px">
                <span className="text-sm font-medium">{a.publisherName}</span>
                <span className="font-mono text-[10px] text-ink-3">{a.rationale}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${a.sharePct}%` }}
                  />
                </div>
                <span className="w-9 text-right font-mono text-xs font-medium">{a.sharePct}%</span>
              </div>
              <span className="text-right font-mono text-[13px]">
                ${a.monthlyBudgetUsd.toLocaleString()}
              </span>
              <span className="text-right font-mono text-[13px] text-ink-2">${a.estCpmUsd}</span>
              <span className="text-right font-mono text-[13px] text-ink-2">
                {a.projectedMonthlyImpressions.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="mb-3 font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-3">
            Targeting
          </div>
          <div className="mb-1.5 text-[11px] text-ink-3">Personas</div>
          <div className="mb-3.5 flex flex-wrap gap-1.5">
            {config.targeting.personaIds.map((id) => (
              <span
                key={id}
                className="rounded-lg bg-accent-weak px-2.5 py-1 font-mono text-[11px] text-accent-ink"
              >
                {personaById.get(id)?.name ?? id}
              </span>
            ))}
          </div>
          <div className="mb-1.5 text-[11px] text-ink-3">Geos · Interests</div>
          <div className="flex flex-wrap gap-1.5">
            {[...config.targeting.geos, ...config.targeting.interests].map((t, i) => (
              <span
                key={i}
                className="rounded-lg border border-border bg-surface-2 px-2.5 py-1 font-mono text-[11px] text-ink-2"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="mb-3 font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-3">
            Assumptions behind the math
          </div>
          <div className="flex flex-col gap-2.5">
            {config.assumptions.map((a, i) => (
              <div key={i} className="flex gap-2.5 font-serif text-[13.5px] leading-snug text-ink-2">
                <span className="shrink-0 text-accent">—</span>
                <span>{a}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface-2">
        <button
          onClick={() => setJsonOpen(!jsonOpen)}
          className="flex w-full items-center justify-between p-4 px-5 font-mono text-xs"
        >
          <span>{"{ } raw config"}</span>
          <span className="text-accent-ink">{jsonOpen ? "hide" : "view"}</span>
        </button>
        {jsonOpen && (
          <pre className="overflow-x-auto px-5 pb-5 font-mono text-[11.5px] leading-relaxed text-ink-2">
            {JSON.stringify(config, null, 2)}
          </pre>
        )}
      </div>
    </section>
  );
}

function StatTile({
  label,
  caption,
  children,
}: {
  label: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 px-[18px]">
      <div className="mb-2 font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-3">
        {label}
      </div>
      {children}
      {caption && <div className="mt-1.5 text-[11.5px] leading-snug text-ink-3">{caption}</div>}
    </div>
  );
}
