import { z } from "zod";
import { generateCampaignPlan } from "../../../lib/pipeline";

// Two sequential LLM calls; worst case observed ~57s on gemini-3-flash-preview.
// 120s needs Vercel fluid compute (default on new projects); if the deploy ever
// rejects this, drop back to 60.
export const maxDuration = 120;

const bodySchema = z.object({
  advertiser: z.string().trim().min(3, "Describe the business in a sentence or two").max(1000),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const plan = await generateCampaignPlan(parsed.data.advertiser);
    return Response.json(plan);
  } catch (err) {
    console.error("campaign generation failed", err);
    return Response.json(
      { error: "Campaign generation failed. Check the server logs / API key and try again." },
      { status: 502 }
    );
  }
}
