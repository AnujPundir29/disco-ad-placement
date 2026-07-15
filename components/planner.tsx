"use client";

import { useEffect, useRef, useState } from "react";
import { exampleAdvertisers, exampleTags } from "../lib/examples";
import type { CampaignPlan } from "../lib/types";
import { PlanView } from "./plan-view";
import { ThemeToggle } from "./theme-toggle";

type Status = "idle" | "loading" | "error";

export function Planner() {
  const [input, setInput] = useState("");
  const [plan, setPlan] = useState<CampaignPlan | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  async function generate() {
    setStatus("loading");
    setError(null);
    setPlan(null);
    setPickerOpen(false);
    try {
      const res = await fetch("/api/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ advertiser: input }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      setPlan(data);
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <ThemeToggle />

      {status === "loading" ? (
        <LoadingState />
      ) : status === "error" ? (
        <ErrorState
          message={error}
          onRetry={generate}
          onLoadExample={() => setPickerOpen(true)}
        />
      ) : (
        <InputCard
          input={input}
          setInput={setInput}
          onGenerate={generate}
          pickerOpen={pickerOpen}
          setPickerOpen={setPickerOpen}
          hero={!plan}
        />
      )}

      {plan && status === "idle" && (
        <div className="mt-10">
          <PlanView plan={plan} />
        </div>
      )}
    </main>
  );
}

function InputCard({
  input,
  setInput,
  onGenerate,
  pickerOpen,
  setPickerOpen,
  hero,
}: {
  input: string;
  setInput: (v: string) => void;
  onGenerate: () => void;
  pickerOpen: boolean;
  setPickerOpen: (v: boolean) => void;
  hero: boolean;
}) {
  return (
    <div className={hero ? "flex flex-col items-center pt-8 sm:pt-14" : ""}>
      {hero && (
        <div className="mb-9 w-full max-w-[640px] text-center">
          <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-accent-ink">
            Disco Campaign Planner
          </p>
          <h1 className="text-4xl font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[38px]">
            Describe your business.
            <br />
            Get a media plan.
          </h1>
          <p className="mx-auto mt-3 max-w-lg font-serif text-base leading-relaxed text-ink-2">
            One sentence in. Ranked publishers, persona-tuned creatives, and a costed campaign
            config out — every recommendation shows its reasoning.
          </p>
        </div>
      )}

      <div className="w-full max-w-[640px] self-center rounded-2xl border border-border bg-surface p-2 shadow-[0_2px_12px_-6px_oklch(0.24_0.012_280/0.3)]">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={3}
          placeholder="e.g. We sell premium, vet-formulated grain-free dog food on subscription for senior dogs focused on joint health…"
          className="min-h-24 w-full resize-y bg-transparent p-4 font-serif text-[17px] leading-relaxed text-ink outline-none placeholder:text-ink-3"
        />
        <div className="flex items-center justify-between gap-3 px-2 pb-1.5">
          <ExamplePicker
            open={pickerOpen}
            setOpen={setPickerOpen}
            onPick={(v) => {
              setInput(v);
              setPickerOpen(false);
            }}
          />
          <button
            onClick={onGenerate}
            disabled={input.trim().length < 3}
            className="shrink-0 rounded-[10px] bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Generate plan →
          </button>
        </div>
      </div>

      <p className="mt-4 self-center text-center font-mono text-[11px] text-ink-3">
        Generation takes 30–70s · two LLM calls + deterministic budget math
      </p>
    </div>
  );
}

function ExamplePicker({
  open,
  setOpen,
  onPick,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  onPick: (v: string) => void;
}) {
  return (
    <div className="relative">
      {open && (
        <button
          aria-hidden
          tabIndex={-1}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-10 cursor-default"
        />
      )}
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-accent-weak px-3 py-2 font-mono text-xs text-accent-ink"
      >
        ◧ Load an example <span className="opacity-60">▾</span>
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-20 max-h-[280px] w-[min(420px,80vw)] overflow-y-auto rounded-xl border border-border-strong bg-surface p-1.5 shadow-[0_20px_50px_-20px_oklch(0.24_0.012_280/0.5)]">
          {exampleAdvertisers.map((ex, i) => (
            <button
              key={i}
              onClick={() => onPick(ex)}
              className="flex w-full gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-surface-2"
            >
              <span className="w-5 shrink-0 font-mono text-[11px] text-ink-3">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-[13px] leading-snug text-ink">
                {ex.length > 68 ? ex.slice(0, 68) + "…" : ex}
                {exampleTags[i] && (
                  <span className="ml-1 font-mono text-[10px] text-accent-ink">
                    · {exampleTags[i]}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// The wait is 30–70s and the API returns everything in one shot (no streaming),
// so the stage a viewer sees is a time-based estimate of where the pipeline is;
// the elapsed timer is real. Copy stays honest — no fabricated result counts.
// ponytail: time-driven stages; wire to a streamed response if the API ever emits milestones.
const STAGE_SWITCH_1 = 30; // ~match done
const STAGE_SWITCH_2 = 55; // ~creatives done

function LoadingState() {
  const [elapsed, setElapsed] = useState(0);
  const start = useRef(Date.now());

  useEffect(() => {
    const id = setInterval(() => setElapsed((Date.now() - start.current) / 1000), 500);
    return () => clearInterval(id);
  }, []);

  const activeStage = elapsed < STAGE_SWITCH_1 ? 0 : elapsed < STAGE_SWITCH_2 ? 1 : 2;
  const mm = Math.floor(elapsed / 60);
  const ss = Math.floor(elapsed % 60);

  return (
    <div className="mx-auto max-w-[620px] pt-10">
      <div className="mb-1.5 flex items-baseline justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">Building your plan</h2>
        <span className="font-mono text-sm text-ink-2">
          {mm}:{String(ss).padStart(2, "0")} <span className="text-ink-3">/ ~1:00</span>
        </span>
      </div>
      <p className="mb-8 font-serif text-[15px] text-ink-2">
        Profiling the business against all 20 publishers, then writing copy and costing the buy.
        Publishers usually land ~10s before creatives.
      </p>

      <div className="mb-8 flex flex-col gap-1">
        <StageRow
          state={activeStage > 0 ? "done" : "active"}
          title="Profile business & match 20 publishers"
          substat="two LLM calls · low temperature"
        />
        <StageRow
          state={activeStage > 1 ? "done" : activeStage === 1 ? "active" : "pending"}
          title="Write persona-tuned creatives"
          substat="one variant per selected persona"
          progress={activeStage === 1}
        />
        <StageRow
          state={activeStage === 2 ? "active" : "pending"}
          title="Compute budget, bids & allocation"
          substat="deterministic — no LLM"
        />
      </div>

      <div className="border-t border-dashed border-border pt-6">
        <p className="mb-3.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
          Plan preview
        </p>
        <div className="flex flex-col gap-2.5">
          <Shimmer className="h-3.5 w-[70%]" />
          <Shimmer className="h-[60px]" />
          <Shimmer className="h-[60px] opacity-60" />
        </div>
      </div>
    </div>
  );
}

function StageRow({
  state,
  title,
  substat,
  progress,
}: {
  state: "done" | "active" | "pending";
  title: string;
  substat: string;
  progress?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3.5 rounded-xl border p-4 ${
        state === "active"
          ? "border-accent bg-surface shadow-[0_0_0_3px_var(--accent-weak)]"
          : state === "done"
            ? "border-border bg-surface"
            : "border-border bg-surface-2 opacity-70"
      }`}
    >
      {state === "done" ? (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-[13px] text-white">
          ✓
        </span>
      ) : state === "active" ? (
        <span className="h-6 w-6 shrink-0 animate-spin rounded-full border-[2.5px] border-border border-t-accent" />
      ) : (
        <span className="h-6 w-6 shrink-0 rounded-full border-2 border-dashed border-border-strong" />
      )}
      <div className="flex-1">
        <div className={`text-[15px] font-medium ${state === "pending" ? "text-ink-2" : ""}`}>
          {title}
        </div>
        {progress ? (
          <div className="mt-2 h-[5px] overflow-hidden rounded-full bg-surface-2">
            <div className="h-full w-[55%] animate-[pulsebar_1.6s_ease-in-out_infinite] rounded-full bg-accent" />
          </div>
        ) : (
          <div className="font-mono text-[11px] text-ink-3">{substat}</div>
        )}
      </div>
      {state === "done" && <span className="font-mono text-[11px] text-ok">done</span>}
    </div>
  );
}

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={`rounded-lg ${className ?? ""}`}
      style={{
        backgroundImage:
          "linear-gradient(90deg, var(--surface-2), var(--bg), var(--surface-2))",
        backgroundSize: "1000px 100%",
        animation: "shimmer 1.8s infinite linear",
      }}
    />
  );
}

function ErrorState({
  message,
  onRetry,
  onLoadExample,
}: {
  message: string | null;
  onRetry: () => void;
  onLoadExample: () => void;
}) {
  return (
    <div className="mx-auto max-w-[520px] pt-16 text-center">
      <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-danger-weak px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-danger">
        Generation failed
      </span>
      <h2 className="mb-3 text-[28px] font-semibold tracking-tight">The plan didn&apos;t come back.</h2>
      <p className="mb-7 font-serif text-base leading-relaxed text-ink-2">
        The model call failed before returning a valid plan. Your description is safe in the box —
        nothing was lost. This usually clears on a retry.
      </p>
      <div className="mb-6 flex justify-center gap-2.5">
        <button
          onClick={onRetry}
          className="rounded-[10px] bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          ↻ Try again
        </button>
        <button
          onClick={onLoadExample}
          className="rounded-[10px] border border-border-strong bg-surface px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface-2"
        >
          Load an example instead
        </button>
      </div>
      {message && (
        <div className="rounded-[10px] border border-border bg-surface-2 p-3.5 text-left font-mono text-[11.5px] leading-relaxed text-ink-2">
          <span className="text-danger">error</span> {message}
        </div>
      )}
    </div>
  );
}
