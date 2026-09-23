# Sanghyeon Aim Lab 3D

A browser-based first-person aim training range expanded from the original Sanghyeon 2D drills.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/sanghyeon-aim-lab-3d run dev` — run the 3D aim lab web app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/sanghyeon-aim-lab-3d run typecheck` — typecheck the 3D web app
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/sanghyeon-aim-lab-3d/src/App.tsx` — home console, first-person range, local telemetry, and results flow
- `artifacts/sanghyeon-aim-lab-3d/src/index.css` — tactical range visual system and responsive layout
- `artifacts/sanghyeon-aim-lab-3d/package.json` — Three.js-powered browser range dependencies
- `artifacts/api-server` and `lib/*` — shared workspace services and libraries; the current 3D app is client-only

## Architecture decisions

- The first 3D milestone is client-only: settings and run history are stored in browser localStorage so a player can start training without account setup or network latency.
- Three.js renders the range and raycast hit detection; React owns the console screens, settings, telemetry, and run lifecycle.
- Flick and Tracking are the first 3D protocols because they preserve the original app's core speed and control training loop.

## Product

Players can select Flick or Tracking drills, choose a duration and target profile, enter a first-person range, move with WASD, look with the mouse, shoot targets, pause, tune sensitivity/crosshair scale, and review locally saved score and accuracy results.

## User preferences

- The goal is to expand the original Sanghyeon 2D aim trainer into a polished 3D browser training lab while preserving measurable practice feedback.

## Gotchas

- The managed web workflow supplies `PORT` and `BASE_PATH`; use the artifact workflow rather than starting Vite with a root command.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
