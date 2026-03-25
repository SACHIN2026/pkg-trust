#!/usr/bin/env node
"use strict";

// src/checker.ts
var TRUST_DOWNLOADS = 1e5;
var TRUST_AGE_DAYS = 365;
async function checkPackage(name) {
  const flags = [];
  let score = 0;
  const res = await fetch(`https://registry.npmjs.org/${name}`);
  if (!res.ok) {
    return {
      name,
      score: 100,
      flags: ["Package does not exist on npm"],
      verdict: "DANGER"
    };
  }
  const data = await res.json();
  const created = new Date(data.time?.created);
  const ageInDays = (Date.now() - created.getTime()) / 864e5;
  const weeklyDownloads = await getDownloads(name);
  const hasRepo = !!data?.repository?.url;
  const publishedVersions = Object.keys(data.versions || {}).length;
  if (weeklyDownloads >= TRUST_DOWNLOADS && ageInDays >= TRUST_AGE_DAYS) {
    return { name, score: 0, flags: [], verdict: "SAFE" };
  }
  if (ageInDays < 7) {
    score += 50;
    flags.push("\u26A0\uFE0F  Created less than 7 days ago");
  } else if (ageInDays < 30) {
    score += 25;
    flags.push("\u26A0\uFE0F  Created less than 30 days ago");
  } else if (ageInDays < 90) {
    score += 10;
    flags.push("\u26A0\uFE0F  Created less than 90 days ago");
  }
  if (weeklyDownloads < 10) {
    score += 30;
    flags.push(`\u26A0\uFE0F  Only ${weeklyDownloads} weekly downloads`);
  } else if (weeklyDownloads < 500) {
    score += 15;
    flags.push(`\u26A0\uFE0F  Low downloads: ${weeklyDownloads}/week`);
  } else if (weeklyDownloads < 5e3) {
    score += 5;
    flags.push(`\u26A0\uFE0F  Moderate downloads: ${weeklyDownloads}/week`);
  }
  if (!hasRepo) {
    score += 20;
    flags.push("\u26A0\uFE0F  No repository linked");
  }
  if (publishedVersions === 1) {
    score += 10;
    flags.push("\u26A0\uFE0F  Only 1 version ever published");
  }
  const typosquatFlag = checkTyposquat(name);
  if (typosquatFlag) {
    const penalty = weeklyDownloads > 1e4 ? 15 : 40;
    score += penalty;
    flags.push(`\u26A0\uFE0F  Name is close to popular package "${typosquatFlag}"`);
  }
  const verdict = score >= 60 ? "DANGER" : score >= 25 ? "SUSPICIOUS" : "SAFE";
  return { name, score, flags, verdict };
}
async function getDownloads(name) {
  try {
    const res = await fetch(`https://api.npmjs.org/downloads/point/last-week/${name}`);
    const data = await res.json();
    return data.downloads ?? 0;
  } catch {
    return 0;
  }
}
function checkTyposquat(name) {
  const popular = [
    "react",
    "lodash",
    "express",
    "axios",
    "webpack",
    "typescript",
    "prettier",
    "eslint",
    "chalk",
    "debug",
    "moment",
    "zod",
    "vite",
    "next",
    "tailwindcss",
    "prisma",
    "fastify",
    "commander",
    "dotenv",
    "uuid"
  ];
  const levenshtein = require("fast-levenshtein");
  for (const pkg of popular) {
    if (name !== pkg && levenshtein.get(name, pkg) <= 2) return pkg;
  }
  return null;
}

// src/cli.ts
var import_fs = require("fs");
async function main() {
  const args = process.argv.slice(2);
  let packages = [];
  if (args[0] === "--file" && args[1]) {
    const pkg = JSON.parse((0, import_fs.readFileSync)(args[1], "utf8"));
    packages = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
  } else if (args.length > 0) {
    packages = args;
  } else {
    const pkg = JSON.parse((0, import_fs.readFileSync)("package.json", "utf8"));
    packages = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
  }
  console.log(`
\u{1F50D} pkg-trust scanning ${packages.length} package(s)...
`);
  let hasIssues = false;
  for (const name of packages) {
    const report = await checkPackage(name);
    const icon = report.verdict === "SAFE" ? "\u2705" : report.verdict === "SUSPICIOUS" ? "\u26A0\uFE0F " : "\u{1F6A8}";
    console.log(`${icon} ${report.name} \u2014 ${report.verdict} (score: ${report.score})`);
    if (report.flags.length) {
      report.flags.forEach((f) => console.log(`   ${f}`));
      hasIssues = true;
    }
  }
  if (hasIssues) {
    console.log("\n\u2757 Issues found. Review flagged packages before installing.\n");
    process.exit(1);
  } else {
    console.log("\n\u2705 All packages look clean!\n");
  }
}
main().catch(console.error);
