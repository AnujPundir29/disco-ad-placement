import { google } from "@ai-sdk/google";

// Single provider seam: swap this line (or the env var) to change models.
// Needs GOOGLE_GENERATIVE_AI_API_KEY in the environment.
// Default is pinned to a model with a workable free-tier quota: the
// flash-latest alias resolves to a model capped at 20 requests/day for
// new free-tier keys, which a single demo session would exhaust.
export const model = google(process.env.GEMINI_MODEL ?? "gemini-3-flash-preview");
