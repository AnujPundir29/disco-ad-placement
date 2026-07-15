/**
 * Runs the full pipeline against every sample advertiser in data/example_advertisers.txt
 * and checks the invariants the app depends on. This is the seed of an eval harness:
 * run it after any prompt change.
 *
 *   npm run sweep            # all 15 examples (sequential: free-tier rate limits)
 *   npm run sweep -- 5 7 15  # just examples 5, 7 and 15 (1-based)
 *
 * Writes each plan to scripts/sweep-output/NN.json and prints a summary table.
 * Exits non-zero if any invariant fails.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Load .env.local before the pipeline (and its provider) is imported.
try {
  for (const line of readFileSync(join(process.cwd(), ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
} catch {
  /* no .env.local — rely on the ambient environment */
}

async function main() {
  const { generateCampaignPlan } = await import("../lib/pipeline");
  const { exampleAdvertisers } = await import("../lib/examples");
  const { publishers } = await import("../lib/data");

  const requested = process.argv.slice(2).map(Number);
  const indices =
    requested.length > 0
      ? requested.map((n) => n - 1)
      : exampleAdvertisers.map((_, i) => i);

  const outDir = join(process.cwd(), "scripts", "sweep-output");
  mkdirSync(outDir, { recursive: true });

  let failures = 0;
  for (const i of indices) {
    const input = exampleAdvertisers[i];
    const label = `#${String(i + 1).padStart(2, "0")}`;
    process.stdout.write(`${label} "${input.slice(0, 50)}"… `);
    try {
      const plan = await generateCampaignPlan(input);
      const problems: string[] = [];

      const covered = plan.analysis.rankedPublishers.length + plan.analysis.excludedPublishers.length;
      if (covered !== publishers.length)
        problems.push(`catalog coverage ${covered}/${publishers.length}`);
      if (plan.creatives && (plan.creatives.variants.length < 3 || plan.creatives.variants.length > 5))
        problems.push(`${plan.creatives.variants.length} variants (want 3-5)`);
      if (plan.config) {
        const shareSum = plan.config.publisherAllocations.reduce((s, a) => s + a.sharePct, 0);
        if (Math.abs(shareSum - 100) > 2) problems.push(`allocation shares sum to ${shareSum}%`);
      }

      writeFileSync(join(outDir, `${String(i + 1).padStart(2, "0")}.json`), JSON.stringify(plan, null, 2));
      const summary = `${plan.analysis.inputQuality.rating} | ${plan.analysis.rankedPublishers.length} pubs | ${plan.creatives?.variants.length ?? 0} creatives`;
      if (problems.length > 0) {
        failures++;
        console.log(`FAIL (${summary}) → ${problems.join("; ")}`);
      } else {
        console.log(`ok   (${summary})`);
      }
    } catch (err) {
      failures++;
      console.log(`ERROR → ${err instanceof Error ? err.message : err}`);
    }
  }

  if (failures > 0) {
    console.error(`\n${failures} example(s) failed`);
    process.exit(1);
  }
  console.log("\nAll examples passed invariant checks. Read the JSON outputs for quality.");
}

main();
