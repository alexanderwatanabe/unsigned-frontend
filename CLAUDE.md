# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm install          # install dependencies
npm run dev          # start dev server (vite)
npm run build        # production build
npm run preview      # preview production build
npm run check        # type-check with svelte-check
npm run check:watch  # type-check in watch mode
```

No test runner is configured. No linter/formatter scripts are in package.json.

## Architecture

This is an **NFT gallery and composition builder** for the Unsigned Algorithms (unsigs) collection on Cardano. Built with **SvelteKit 2 + Svelte 5 + TypeScript**, deployed to **Vercel**.

### Tech Stack
- **Framework:** SvelteKit 2 with Svelte 5 (runes), TypeScript, Vite
- **Styling:** TailwindCSS 3 with typography plugin
- **Blockchain:** Mesh SDK (`@meshsdk/core`, `@meshsdk/svelte`) for Cardano wallet integration
- **Database:** Neon serverless PostgreSQL (`@neondatabase/serverless`) for composition storage
- **Images:** Hosted on S3 (`s3.ap-northeast-1.amazonaws.com/unsigs.com/images/`) at 128px, 256px, 1024px tiers
- **Deployment:** Vercel adapter, Vercel Analytics

### Path Aliases
- `$lib` → `./src/lib`
- `$assets` → `./src/assets`

### Routes (SvelteKit file-based routing)
- `/` — Home page with hero
- `/gallery` — NFT gallery with filtering, pagination, keyboard navigation
- `/my-unsigs` — Wallet-connected view of owned NFTs
- `/compose` — Grid composition builder (drag-drop unsigs into m×n grid)
- `/arrangements` — Saved compositions gallery
- `/nft/[id]` — Individual NFT detail page
- `/about` — About page
- `/api/db/compositions` — CRUD for compositions (Neon PostgreSQL)
- `/api/db/migrate`, `/api/db/tables` — Database admin endpoints
- `/api/items`, `/api/metadata` — Data endpoints

### State Management
Svelte 5 runes exclusively (`$state`, `$derived`, `$effect`). No external state library. No Svelte 4 stores.

### Key Data Files
- `src/assets/unsigs.json` — Complete NFT metadata (31,119 items)
- `src/assets/monochromes.json` — Monochrome subcollection indices
- `src/assets/noliners.json` — No-liner subcollection indices
- `src/lib/types.ts` — Core TypeScript types (UnsigData, UnsigMetadata, OwnedUnsig, WalletAsset)

### Node Polyfills
`vite-plugin-node-polyfills` provides `global`, `process`, and `Buffer` — required by Mesh SDK for browser use.

## Code Conventions

- **Svelte 5 only:** Use runes (`$state`, `$derived`, `$effect`), never Svelte 4 stores
- **Event handlers:** Use `onclick`, `oninput` (Svelte 5 style), never `on:click`, `on:input`
- **All UI text in lowercase** (except acronyms)
- **Functional style preferred:** `.map()`, `.filter()`, `.reduce()` over imperative loops
- **NFT indices:** Zero-padded 5-digit format (#00123)
- **Font:** JetBrains Mono throughout
- **Image resolution selection:** 1024px for single view, 256px for 4-16 grid, 128px for larger grids
