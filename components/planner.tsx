"use client";

import { useState } from "react";
import { exampleAdvertisers } from "../lib/examples";
import type { CampaignPlan } from "../lib/types";
import { PlanView } from "./plan-view";

export function Planner() {
  const [input, setInput] = useState("");
  const [plan, setPlan] = useState<CampaignPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    setPlan(null);
    try {
      const res = await fetch("/api/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ advertiser: input }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      setPlan(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Campaign Planner</h1>
        <p className="mt-1 text-sm opacity-70">
          Describe a business in a sentence or two. Get recommended publishers, persona-tuned ad
          creative, and a draft campaign config — with the reasoning shown.
        </p>
      </header>

      <div className="rounded-xl border border-black/10 p-4 dark:border-white/15">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={3}
          placeholder='e.g. "We sell premium dog food for senior dogs, targeting owners who care about joint health."'
          className="w-full resize-y rounded-lg border border-black/10 bg-transparent p-3 text-sm outline-none focus:border-black/30 dark:border-white/15 dark:focus:border-white/40"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            onClick={generate}
            disabled={loading || input.trim().length < 3}
            className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-85 disabled:opacity-40"
          >
            {loading ? "Planning…" : "Generate campaign plan"}
          </button>
          <label className="flex items-center gap-2 text-sm opacity-70">
            or try an example:
            <select
              value=""
              onChange={(e) => setInput(e.target.value)}
              className="max-w-56 rounded-lg border border-black/10 bg-transparent px-2 py-1.5 dark:border-white/15 dark:bg-background"
            >
              <option value="" disabled>
                pick one
              </option>
              {exampleAdvertisers.map((ex, i) => (
                <option key={i} value={ex}>
                  {i + 1}. {ex.length > 60 ? ex.slice(0, 60) + "…" : ex}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {loading && (
        <p className="mt-6 animate-pulse text-sm opacity-70">
          Scoring 20 publishers, picking personas, writing copy… usually 15–30 seconds.
        </p>
      )}
      {error && (
        <p className="mt-6 rounded-lg border border-red-500/40 bg-red-500/5 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {plan && <PlanView plan={plan} />}
    </div>
  );
}
