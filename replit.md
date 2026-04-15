# Smart Private Cloud Storage Agent

## Overview

A self-hosted private cloud storage system powered by AI. Users run this on their home PC or NAS to get their own private cloud storage with AI-assisted file organization.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui
- **Theme**: Dark navy + cyan accent (Smart Cloud dark theme)

## Artifacts

- `artifacts/api-server` — Express 5 API server (port assigned by platform)
- `artifacts/smart-cloud` — React + Vite frontend (path: `/`)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Features

- **Dashboard** — Storage overview, disk utilization, recent files
- **Storage** — Real hardware disk detection (Linux/macOS/Windows); physical vs virtual volumes; deduplication; managed storage pools with add/remove; usage visualization with colored rings and allocation map
- **File Manager** — Browse files by category; AI-powered storage suggestions with approve/reject
- **AI Agent** — Real OpenAI GPT-5.2 chat via Replit AI Integrations (no user API key needed); storage assistant with Thai/English support; model selector (GPT-5.2, GPT-5 Mini, o4-mini, Llama, LLaVA, Whisper)
- **OAuth Connections** — Connect/disconnect Google, Discord, Telegram, LINE, Facebook, Instagram, GitHub with real DB state toggle
- **Settings** — Select AI model, local LLM endpoint, default disk, auto-organize, language preference

## Database Schema

- `users` — User accounts
- `oauth_connections` — OAuth provider connections
- `disks` — Storage disk inventory
- `files` — File records with AI suggestions
- `ai_messages` — Chat history with AI agent
- `settings` — User preferences

## API Endpoints

All under `/api`:
- `GET/POST /storage/disks`, `GET/PATCH/DELETE /storage/disks/:diskId`
- `GET /storage/summary`
- `GET /files`, `GET /files/recent`, `GET /files/categories`
- `GET/PATCH/DELETE /files/:fileId`
- `GET/POST /ai/messages`, `POST /ai/chat`, `POST /ai/suggest-storage`
- `GET/PATCH /settings`, `GET /settings/models`
- `GET /auth/user`, `GET /auth/connections`, `POST /auth/connections/:provider/toggle`
- `GET /storage/hardware` — Real-time hardware disk detection (OS-aware, supports Linux/macOS/Windows)
