"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/checker.ts
var checker_exports = {};
__export(checker_exports, {
  checkPackage: () => checkPackage
});
module.exports = __toCommonJS(checker_exports);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  checkPackage
});
