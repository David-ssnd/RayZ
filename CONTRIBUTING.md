# Contributing to RayZ

## Project Structure

This is a monorepo containing both the ESP32 firmware and the Web application.

- `esp32/`: PlatformIO project for ESP32 firmware.
  - `target/`: Code specific to the Target device.
  - `weapon/`: Code specific to the Weapon device.
  - `shared/`: Shared libraries and configuration.
- `web/`: TurboRepo monorepo for the Web application.
  - `apps/frontend`: Next.js frontend.
  - `apps/backend`: Next.js backend.
  - `packages/`: Shared TypeScript packages.

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

## CI/CD

GitHub Actions are configured in `.github/workflows/main.yml` to automatically build and lint both the web and firmware projects on push/PR to `main`.
