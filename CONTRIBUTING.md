# Contributing to RayZ

## Project Structure

This is a monorepo containing both the ESP32 firmware and the Web application.

- `esp32/`: PlatformIO project for ESP32 firmware.
  - `target/`: Code specific to the Target device (submodule).
  - `weapon/`: Code specific to the Weapon device (submodule).
  - `shared/`: Shared libraries, utilities, and protocol definitions (submodule).
- `web/`: TurboRepo monorepo for the Web application.
  - `apps/frontend`: Next.js frontend application.
  - `apps/backend`: Next.js backend API (if present).
  - `packages/types`: Shared TypeScript types, including protocol definitions.
  - `packages/database`: Prisma database schemas and migrations.
  - `packages/eslint-config`: Shared ESLint configuration.
  - `packages/typescript-config`: Shared TypeScript configuration.
- `protocol_def.json`: **Single source of truth** for WebSocket protocol definitions (OpCodes, message schemas).
- `scripts/`: Utility scripts for validation and code generation.

## Prerequisites

- **VS Code**: Recommended editor.
- **Node.js**: v20+
- **pnpm**: v9+ (`npm install -g pnpm`)
- **Python**: v3.9+ (for PlatformIO)
- **PlatformIO**: VS Code extension or CLI.

## Getting Started

1.  **Install Dependencies**:

    ```bash
    # Web
    cd web
    pnpm install

    # ESP32 (if using CLI)
    pip install platformio
    ```

2.  **VS Code Workspace**:
    Open `RayZ.code-workspace` in VS Code. This is the root workspace.
    - Use the **Tasks** menu to run predefined tasks like "Web: Dev" or "ESP32: Build All".

## Development

### Web

Run `pnpm dev` in the `web` directory, or use the "Web: Dev" task.

### ESP32

Use the PlatformIO extension sidebar or the "ESP32: Build ..." tasks.

- **Target**: `pio run -e target`
- **Weapon**: `pio run -e weapon`

### Protocol Definition

All WebSocket protocol definitions are centralized in `protocol_def.json`. This is the single source of truth for:

- OpCode enumerations
- Message schemas (client→device and device→client)
- Field types and constraints

**Important**: When modifying protocol messages:

1. Update `protocol_def.json` first.
2. Regenerate TypeScript types (future: automated via CI).
3. Run validation: `node scripts/validate-protocol.js`

## Code Reuse & Shared Modules

- **Shared C++**: Code in `esp32/shared/` is used by both Target and Weapon builds.
- **Shared Tasks**: `esp32/shared/src/task_shared.cpp` contains FreeRTOS task utilities shared across devices.
- **Protocol Types**: TypeScript types in `web/packages/types/src/protocol.ts` are imported and re-exported by the frontend.

## Submodule Workflow

The project uses Git submodules for `target`, `weapon`, and `shared`. When making changes:

```bash
# Update a submodule
cd esp32/shared
# Make changes...
git add .
git commit -m "Update shared module"
git push origin main

# Return to root and update submodule pointer
cd ../..
git add esp32/shared
git commit -m "Update shared submodule reference"
git push origin main
```

## CI/CD

GitHub Actions are configured in `.github/workflows/main.yml` to automatically build and lint both the web and firmware projects on push/PR to `main`.
