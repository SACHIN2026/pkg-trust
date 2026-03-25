#!/usr/bin/env node
import { checkPackage } from "./checker";
import { readFileSync } from "fs";

async function main() {
  const args = process.argv.slice(2);
  let packages: string[] = [];

  if (args[0] === "--file" && args[1]) {
    // Scan from package.json
    const pkg = JSON.parse(readFileSync(args[1], "utf8"));
    packages = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
  } else if (args.length > 0) {
    packages = args;
  } else {
    // Default: scan current project's package.json
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    packages = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
  }

  console.log(`\n🔍 pkg-trust scanning ${packages.length} package(s)...\n`);

  let hasIssues = false;
  for (const name of packages) {
    const report = await checkPackage(name);
    const icon = report.verdict === "SAFE" ? "✅" : report.verdict === "SUSPICIOUS" ? "⚠️ " : "🚨";
    console.log(`${icon} ${report.name} — ${report.verdict} (score: ${report.score})`);
    if (report.flags.length) {
      report.flags.forEach(f => console.log(`   ${f}`));
      hasIssues = true;
    }
  }

  if (hasIssues) {
    console.log("\n❗ Issues found. Review flagged packages before installing.\n");
    process.exit(1);
  } else {
    console.log("\n✅ All packages look clean!\n");
  }
}

main().catch(console.error);