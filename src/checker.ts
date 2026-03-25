interface PackageReport {
    name: string;
    score: number;
    flags: string[];
    verdict: "SAFE" | "SUSPICIOUS" | "DANGER";
  }
  
  // Auto-trust thresholds — no hardcoded whitelist needed
  const TRUST_DOWNLOADS = 100_000;   // 100k+ weekly downloads = trusted
  const TRUST_AGE_DAYS  = 365;       // 1+ year old = established
  
  export async function checkPackage(name: string): Promise<PackageReport> {
    const flags: string[] = [];
    let score = 0;
  
    // 1. Does package exist?
    const res = await fetch(`https://registry.npmjs.org/${name}`);
    if (!res.ok) {
      return {
        name, score: 100,
        flags: ["Package does not exist on npm"],
        verdict: "DANGER"
      };
    }
  
    const data = await res.json();
    const created = new Date(data.time?.created);
    const ageInDays = (Date.now() - created.getTime()) / 86400000;
    const weeklyDownloads = await getDownloads(name);
    const hasRepo = !!data?.repository?.url;
    const publishedVersions = Object.keys(data.versions || {}).length;
  
    // 2. AUTO-TRUST CHECK — high downloads + old = skip all other checks
    if (weeklyDownloads >= TRUST_DOWNLOADS && ageInDays >= TRUST_AGE_DAYS) {
      return { name, score: 0, flags: [], verdict: "SAFE" };
    }
  
    // 3. Age scoring
    if (ageInDays < 7)       { score += 50; flags.push("⚠️  Created less than 7 days ago"); }
    else if (ageInDays < 30) { score += 25; flags.push("⚠️  Created less than 30 days ago"); }
    else if (ageInDays < 90) { score += 10; flags.push("⚠️  Created less than 90 days ago"); }
  
    // 4. Download scoring
    if (weeklyDownloads < 10)     { score += 30; flags.push(`⚠️  Only ${weeklyDownloads} weekly downloads`); }
    else if (weeklyDownloads < 500)  { score += 15; flags.push(`⚠️  Low downloads: ${weeklyDownloads}/week`); }
    else if (weeklyDownloads < 5000) { score += 5;  flags.push(`⚠️  Moderate downloads: ${weeklyDownloads}/week`); }
  
    // 5. No GitHub repo
    if (!hasRepo) { score += 20; flags.push("⚠️  No repository linked"); }
  
    // 6. Single version ever published
    if (publishedVersions === 1) { score += 10; flags.push("⚠️  Only 1 version ever published"); }
  
    // 7. Typosquat check — only runs if package is NOT already trusted
    const typosquatFlag = checkTyposquat(name);
    if (typosquatFlag) {
      // Extra leniency: if downloads are decent, lower the typosquat penalty
      const penalty = weeklyDownloads > 10_000 ? 15 : 40;
      score += penalty;
      flags.push(`⚠️  Name is close to popular package "${typosquatFlag}"`);
    }
  
    const verdict = score >= 60 ? "DANGER" : score >= 25 ? "SUSPICIOUS" : "SAFE";
    return { name, score, flags, verdict };
  }
  
  async function getDownloads(name: string): Promise<number> {
    try {
      const res = await fetch(`https://api.npmjs.org/downloads/point/last-week/${name}`);
      const data = await res.json();
      return data.downloads ?? 0;
    } catch { return 0; }
  }
  
  function checkTyposquat(name: string): string | null {
    const popular = [
      "react", "lodash", "express", "axios", "webpack", "typescript",
      "prettier", "eslint", "chalk", "debug", "moment", "zod", "vite", "next",
      "tailwindcss", "prisma", "fastify", "commander", "dotenv", "uuid"
    ];
    const levenshtein = require("fast-levenshtein");
    for (const pkg of popular) {
      if (name !== pkg && levenshtein.get(name, pkg) <= 2) return pkg;
    }
    return null;
  }