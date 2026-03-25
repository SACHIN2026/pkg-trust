# pkg-trust 🔍

> Detect AI-hallucinated, typosquatted, and suspicious npm packages before you install them.

## The Problem
AI coding assistants (Copilot, Cursor, Claude) sometimes hallucinate npm package names.
Attackers register these fake names with malicious code — this is called **slopsquatting**.

## Install
npm install -g pkg-trust

## Usage

# Check a single package
pkg-trust lodash

# Check multiple packages
pkg-trust lodash express axios

# Scan your whole project
pkg-trust

# Scan a specific package.json
pkg-trust --file ./package.json

## How it works
pkg-trust checks every package against:
- ✅ Auto-trusts packages with 100k+ weekly downloads AND 1+ year old
- ⚠️  Flags new, low-download, or no-repo packages
- 🚨 Detects typosquatting against 20 most popular npm packages

## CI/CD Integration
Add to your package.json:
"preinstall": "npx pkg-trust"