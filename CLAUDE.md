> [!note] Cerebro (Obsidian)
> Antes de trabajar, lee la nota viva de este proyecto: `/Users/santirev/Proyect/obsidian/Proyectos/Golds.md`
> (stack, arquitectura, comandos, endpoints, deploy). Índice del workspace: `/Users/santirev/Proyect/obsidian/🧠 Cerebro.md`.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (port 3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint check
```

## Architecture

**Golden Group** is a Next.js 15 (App Router) + TypeScript PWA that displays real-time gold prices and COP/USD exchange rates for Colombia.

### Project Layout

- `/src/app/` — Client-side React components (App Router)
  - `page.tsx` — Auth guard; renders `Login` or `Formulario`
  - `Formulario.tsx` — Main UI: data fetching, polling, price calculations, screenshot/share
  - `Login.tsx` — Login form
  - `api.ts` — Typed API client (adds Bearer token headers)
  - `functions.ts` — Shared utility functions
- `/pages/api/` — Next.js API routes (backend)
  - `login.ts` — Generates/validates HMAC-SHA256 JWT-like tokens
  - `middleware.ts` — `withAuth()` HOF that protects API routes
  - `getUsd.ts` — Playwright scraping of Banco de Bogotá USD rate
  - `getGoldApi.ts` — Fetches from `data-asg.goldprice.org` REST API
  - `getNetData.ts` — Playwright scraping of NetDania gold prices

### Data Flow

1. `Formulario.tsx` calls `api.netData()` (gold price) and `api.bancodebogota()` (USD rate) on load and on an adaptive polling interval.
2. API routes scrape/fetch external sources, cache results in-memory for 60 seconds, and return JSON with `Cache-Control` headers.
3. Gold purity price formula: `(gold_price_usd * usd_cop_rate) / 31.1034768 * 1000 * purity_percentage`
4. Results are displayed in an 18-row purity table (89.5% → 98.3%); last row is editable.

### Authentication

- Hardcoded credentials checked in `/pages/api/login.ts`
- Token: `base64(username:expiry:HMAC-SHA256-signature)`, 24-hour TTL
- Secret from `AUTH_SECRET` env var (falls back to a default)
- Client stores token in `localStorage`; all API calls send `Authorization: Bearer <token>`

### Polling Strategy (`Formulario.tsx`)

- Starts at 15s interval, doubles on no data change (up to 60s), resets to 15s on change
- Pauses when browser tab is hidden (Page Visibility API), resumes on focus
- Uses `AbortController` to cancel in-flight requests before starting new ones

### Deployment

- Docker multi-stage build (Node 20 slim); Playwright deps installed inside image
- Deployed to VPS `31.97.146.100` via `registry.revpos.app/goldsilver`; run `../deploy-goldsilver.sh` from workspace root

### Environment Variables

| Variable | Required | Default |
|---|---|---|
| `AUTH_SECRET` | No | `infoGold-secret-key-2024` |
| `NEXT_PUBLIC_SITE_URL` | No | `http://localhost:3000` |
