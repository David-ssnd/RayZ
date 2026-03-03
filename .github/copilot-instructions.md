# Copilot Instructions for RayZ

## Project Overview

RayZ is a laser tag system with two main domains:

- **ESP32 firmware** (`esp32/`) — C/C++ firmware for target (wearable) and weapon (gun) devices, built with ESP-IDF via PlatformIO. Both devices share a common library via the `esp32/shared/` submodule.
- **Web application** (`web/`) — A Turborepo monorepo (pnpm) with a Next.js frontend, a WebSocket bridge server, Prisma database layer, and shared TypeScript types.

The root repo coordinates these via **git submodules** (`esp32/target`, `esp32/weapon`, `esp32/shared`, `web/`).

## Build & Run Commands

### Web (from `web/`)

```bash
pnpm install          # Install all workspace dependencies
pnpm dev              # Start all apps in dev mode (turbo)
pnpm build            # Build all packages
pnpm lint             # Lint all packages
pnpm format           # Format with Prettier
pnpm format:check     # Check formatting
```

**Single package commands:**
```bash
pnpm --filter frontend dev        # Run only the frontend
pnpm --filter @rayz/ws-bridge dev # Run only the WS bridge
pnpm --filter @rayz/database db:push    # Push Prisma schema to DB
pnpm --filter @rayz/database db:studio  # Open Prisma Studio
```

### Database mode switching (from `web/`)

```bash
pnpm --filter @rayz/database db:switch:local   # Switch to SQLite
pnpm --filter @rayz/database db:switch:cloud   # Switch to PostgreSQL
pnpm --filter @rayz/database db:init:local     # Init local SQLite with seed data
```

### ESP32 firmware (from `esp32/target/` or `esp32/weapon/`)

```bash
pio run                   # Build firmware
pio run -t upload         # Build and flash
pio device monitor        # Serial monitor
```

### Protocol validation (from repo root)

```bash
node scripts/validate-protocol.js   # Validate C++ and TS types match protocol_def.json
```

## Architecture

### Protocol: Single Source of Truth

`protocol_def.json` at the repo root defines all WebSocket OpCodes and message schemas. When modifying the protocol:
1. Update `protocol_def.json` first
2. Update TypeScript types in `web/packages/types/src/protocol.ts`
3. Update C++ headers in `esp32/shared/`
4. Run `node scripts/validate-protocol.js` to verify consistency

The firmware does NOT receive a "game mode" label — it receives explicit config values. Game modes are a UI-only concept (see `protocol_def.json` notes).

### Web Monorepo Structure

| Package | Path | Purpose |
|---------|------|---------|
| `frontend` | `web/apps/frontend/` | Next.js app (React 19, App Router, next-intl for i18n) |
| `@rayz/ws-bridge` | `web/apps/ws-bridge/` | Node WebSocket bridge for local mode (browser ↔ ESP32) |
| `@rayz/database` | `web/packages/database/` | Prisma schema + client (dual-mode: SQLite local / PostgreSQL cloud) |
| `@rayz/types` | `web/packages/types/` | Shared TypeScript protocol types |
| `@rayz/eslint-config` | `web/packages/eslint-config/` | Shared ESLint config |
| `@rayz/typescript-config` | `web/packages/typescript-config/` | Shared tsconfig bases |

### Dual Database Mode

The database package has two Prisma schemas: `schema.sqlite.prisma` and `schema.postgres.prisma`. The active schema is `schema.prisma` (copied by `scripts/switch-schema.js`). Auto-detection runs during build via `scripts/auto-detect-mode.js`.

### ESP32 Firmware

- **Framework:** ESP-IDF (not Arduino), built via PlatformIO
- **Target device:** ESP32 (`esp32dev`) — player wearable with LVGL display
- **Weapon device:** ESP32-C3 (`esp32-c3-devkitm-1`) — laser gun
- **Both also have ESP32-S3 variant environments** (`target-s3`, `weapon-s3`)
- **Shared library** (`esp32/shared/`) provides common protocol, tasks, and utilities
- Build flags define device type: `-DTARGET_DEVICE` or `-DWEAPON_DEVICE`
- Features enabled via build flags: `WS_ENABLE_MSGPACK`, `WS_ENABLE_ASYNC_SEND`, `WS_USE_NATIVE_PING`

## Key Conventions

### Web

- **No semicolons, single quotes** — Prettier config in `web/.prettierrc.json`
- **Import ordering** is enforced by `@ianvs/prettier-plugin-sort-imports` (React → Next → third-party → workspace → local)
- **Workspace packages** are referenced as `@rayz/database`, `@rayz/types`, etc. using `workspace:*`
- **Auth:** NextAuth v5 (beta) with Prisma adapter, supports Google/GitHub OAuth + credentials
- **UI components:** Radix UI primitives with shadcn/ui patterns (CVA + tailwind-merge)
- Prisma client is generated to `web/packages/database/src/generated/client/`

### ESP32

- **C++ formatting:** Allman brace style, 4-space indent, 120-char line limit (see `esp32/.clang-format`)
- **Include order:** FreeRTOS first, then ESP-IDF, then system, then project headers
- Shared code uses ESP-IDF component model (CMakeLists.txt + idf_component.yml)

### Submodule Workflow

After making changes in a submodule, you must update the parent repo's submodule pointer:
```bash
cd esp32/shared && git add . && git commit -m "change" && git push
cd ../.. && git add esp32/shared && git commit -m "Update shared submodule"
```

## CI

GitHub Actions (`.github/workflows/main.yml`) runs on push/PR to `main`:
- **Web:** pnpm install → lint → build
- **ESP32:** PlatformIO build for both target and weapon
