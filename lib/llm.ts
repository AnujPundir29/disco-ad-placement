import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";

// Provider seam — the only place the app knows which LLM it talks to.
// Gemini by default; setting OPENAI_API_KEY switches the whole pipeline to
// OpenAI (useful when Gemini free-tier daily quotas run dry). Model ids are
// overridable per provider without touching code.
export const model = process.env.OPENAI_API_KEY
  ? openai(process.env.OPENAI_MODEL ?? "gpt-5-mini")
  : google(process.env.GEMINI_MODEL ?? "gemini-3-flash-preview");

// gpt-5-mini is a reasoning model and rejects temperature; Gemini honors it.
// Callers pass their preferred temperature through this so the warning spam
// (and a silently ignored knob) doesn't leak into the OpenAI path.
export function temperature(t: number): number | undefined {
  return process.env.OPENAI_API_KEY ? undefined : t;
}
