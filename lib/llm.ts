import { google } from "@ai-sdk/google";

// Single provider seam: swap this line (or the env var) to change models.
// Needs GOOGLE_GENERATIVE_AI_API_KEY in the environment.
export const model = google(process.env.GEMINI_MODEL ?? "gemini-2.5-flash");
