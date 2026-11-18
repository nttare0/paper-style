# CLAUDE.md

> **Read [`AGENTS.md`](AGENTS.md) first — it is the canonical rule set.**
> This file exists only so Claude Code auto-loads the same rules.

## Summary (same as AGENTS.md)

- **Allowlist only:** Astryx · Modern Web Guidance · shadcn/ui. Nothing else.
- **No invented tools:** no guessed components/props/CLIs/packages. Verify via CLI/docs first.
- **One component system per screen:** Astryx (default) or shadcn — never mixed.
- **Modern platform first:** search Modern Web Guidance before writing CSS/JS.
- **Stop instead of guessing:** if the allowlist can't do it, ask the user.
- **No signatures or trailers:** never append `Co-Authored-By:`, AI labels, or bot tags to code, comments, commit messages, or PR descriptions. Clean output only.
- **Site essentials:** every build ships favicon, privacy policy, terms & conditions, sitemap, and share preview (OG metadata) — see [rules/08-site-essentials.md](rules/08-site-essentials.md).
- **Real images only:** use real images from Unsplash and Pinterest — never AI-generated, never fabricated URLs — see [rules/09-real-images.md](rules/09-real-images.md).
- **Plugins before build:** verify Ponytail and Agent Skills are installed before any build session; if missing, give install commands and wait — see [rules/10-prebuild-plugins.md](rules/10-prebuild-plugins.md).
- **Security gate:** pass all 32 checks in [rules/11-security-checklist.md](rules/11-security-checklist.md) before shipping — headers, race conditions, `.git` exposure, RLS, server-side prices, SSRF, redirects, JWT strength, no user enumeration, XSS, SQL injection, CSRF, IDOR, CORS, sessions, supply chain, etc.
- **Launch gate:** pass all 20 website essentials in [rules/12-launch-checklist.md](rules/12-launch-checklist.md) before launch — custom 404, unique meta titles/descriptions, hero CTA, mobile breakpoints, sticky mobile CTA, loading/error states, thank-you page, cookie banner, analytics, real contact info, compressed images, plus the rule 08/09 items.

## Full Rules

See [`rules/`](rules/README.md):

| File | Covers |
|------|--------|
| [rules/00-core-allowlist.md](rules/00-core-allowlist.md) | Allowlist, installs, discovery commands |
| [rules/01-astryx.md](rules/01-astryx.md) | Astryx usage |
| [rules/02-modern-web-guidance.md](rules/02-modern-web-guidance.md) | Modern Web Guidance usage |
| [rules/03-shadcn.md](rules/03-shadcn.md) | shadcn/ui usage |
| [rules/04-decision-tree.md](rules/04-decision-tree.md) | Which tool wins |
| [rules/05-forbidden-patterns.md](rules/05-forbidden-patterns.md) | Banned patterns |
| [rules/06-workflow-checklist.md](rules/06-workflow-checklist.md) | Workflow checklist |
| [rules/07-how-to-add-a-rule.md](rules/07-how-to-add-a-rule.md) | How to add the next rule |
