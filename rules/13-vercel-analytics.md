# 13 — Vercel Web Analytics (`@vercel/analytics`)

> Source: https://github.com/vercel/analytics · Docs: https://vercel.com/docs/analytics
> Consent-gated pageview and event analytics for Vercel deployments. It does NOT own UI components (Astryx/shadcn do).

## What It Is
- Privacy-focused web analytics SDK (`@vercel/analytics`) supporting React (`@vercel/analytics/react`).
- Loads same-origin `/_vercel/insights/script.js` in production when Web Analytics is enabled in Vercel.
- Requires consent gating where applicable per [12-launch-checklist.md](12-launch-checklist.md) #17–18 and zero PII in `beforeSend` / events.

## Mandatory Workflow

### 1. Install (once)
```bash
npm install @vercel/analytics
```

### 2. Discover before you write (every task)
```bash
npm view @vercel/analytics version
cat node_modules/@vercel/analytics/dist/react/index.d.ts
```

### 3. Build with what the docs and types return
- Import `<Analytics />` from `@vercel/analytics/react` (for Vite/React SPAs).
- Pass `mode={import.meta.env.PROD ? "production" : "development"}` and filter sensitive routes/params with `beforeSend` when needed.
- Mount `<Analytics />` **only after** explicit user consent per [12-launch-checklist.md](12-launch-checklist.md) #17.
- Keep `/create/` untouched unless explicitly requested by the user.

## When This Tool Wins
- Platform-native analytics for projects hosted on Vercel (see [04-decision-tree.md](04-decision-tree.md)).

## Forbidden
- ❌ Mounting `<Analytics />` or loading `/_vercel/insights/script.js` before user consent.
- ❌ Guessing prop names without inspecting `node_modules/@vercel/analytics/dist/react/index.d.ts`.
- ❌ Sending PII in page URLs or custom events.

## Cite Your Work
- State the verified package version and type source in your response, e.g.:
  `cat node_modules/@vercel/analytics/dist/react/index.d.ts` -> `<Analytics mode={...} beforeSend={...} />` from `@vercel/analytics/react` (`2.0.1`).
