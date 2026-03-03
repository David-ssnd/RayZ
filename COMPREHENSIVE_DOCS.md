# RayZ Project Comprehensive Documentation

## 1. Project Overview

RayZ is an advanced, open-source laser tag system designed for flexibility and performance. It consists of wearable "Target" devices, "Weapon" devices (guns), and a central Web Interface for game management. The system supports both online (cloud) and offline (local) modes, making it suitable for both hobbyists and professional deployments.

### Key Features
*   **Dual-Device Architecture**: Separate firmware for Target (vest/headband) and Weapon units.
*   **Real-time Communication**: High-performance WebSocket protocol using MessagePack serialization.
*   **Hybrid Infrastructure**: Runs locally via Docker/SQLite or in the cloud via PostgreSQL.
*   **Modern Tech Stack**: ESP-IDF/FreeRTOS for firmware, Next.js for the web interface.

---

## 2. Technology Stack

### Firmware (ESP32)
*   **Framework**: ESP-IDF (Espressif IoT Development Framework) with FreeRTOS.
*   **Build System**: PlatformIO.
*   **Languages**: C++.
*   **Libraries**:
    *   `LVGL`: Light and Versatile Graphics Library (used for Weapon display).
    *   `ArduinoJson`: JSON parsing (legacy/fallback).
    *   `MessagePack`: Binary serialization for performance.
*   **Supported Hardware**:
    *   **Target**: ESP32-DevKitC, ESP32-S3 SuperMini.
    *   **Weapon**: ESP32-C3-DevKitM, ESP32-S3 SuperMini.

### Web Interface
*   **Runtime**: Node.js (v18+).
*   **Framework**: Next.js (React).
*   **Package Manager**: pnpm (managed via TurboRepo).
*   **Database**:
    *   **Local**: SQLite.
    *   **Cloud**: PostgreSQL (via Prisma ORM).
*   **Communication**: WebSocket (Native & MessagePack).

### DevOps & Infrastructure
*   **Containerization**: Docker & Docker Compose.
*   **Version Control**: Git (Monorepo structure).

---

## 3. Project Evolution (Git History Analysis)

The project has evolved significantly from its inception:

### Phase 1: Modular Beginning (Submodules)
*   Started as separate repositories linked via Git Submodules.
*   Initial firmware based on the Arduino framework.
*   Basic WebSocket communication using JSON.

### Phase 2: Consolidation (Monorepo)
*   Transitioned to a Monorepo structure for better code sharing and dependency management.
*   `esp32/shared` library created to unify protocol definitions across devices.
*   Web interface migrated to TurboRepo.

### Phase 3: Professionalization (ESP-IDF & Optimization)
*   **Firmware Rewrite**: Migrated from Arduino to ESP-IDF/FreeRTOS for better multitasking and control.
*   **Performance**: Introduced MessagePack and Async WebSockets, increasing client capacity from 4 to 8+ per node.
*   **Hardware Expansion**: Added support for ESP32-S3 and ESP32-C3.
*   **Local Mode**: Added Docker Compose and SQLite support for offline play.

---

## 4. Components & Physical Aspects

### Target Device (Wearable)
*   **Role**: Registers hits, tracks player health, provides haptic feedback.
*   **Hardware Principles**:
    *   **Microcontroller**: ESP32 or ESP32-S3.
    *   **Feedback**: Vibration motor (Haptic feedback for hits). *Note: OLED display was removed in earlier iterations in favor of simplicity/durability.*
    *   **Sensors**: IR Receivers (TSOP series or similar) to detect laser shots.

### Weapon Device (Gun)
*   **Role**: Emits IR signals, displays ammo/health, manages firing logic.
*   **Hardware Principles**:
    *   **Microcontroller**: ESP32-C3 or ESP32-S3.
    *   **Interface**: Display powered by LVGL (likely OLED or TFT) to show game state.
    *   **Input**: Trigger switch, reload button.
    *   **Output**: IR Emitter (IR LED + Lens) and potentially a muzzle flash LED.

### Communication Protocols
*   **WebSockets (WS)**: Used for communication between devices and the Game Server (Web Interface).
    *   Optimized with MessagePack for binary serialization.
    *   Supports Async sending for non-blocking operations.
*   **ESP-NOW**: Used for low-latency peer-to-peer communication between Target and Weapon devices (e.g., syncing ammo, health, game state locally without server round-trip).
*   **Infrared (IR)**: The core "laser tag" mechanism.
    *   **Weapon**: Emits modulated IR signals via `laser_task.cpp`.
    *   **Target**: Receives signals via photodiodes processed by `photodiode_task.cpp`.

### Physical Hardware Logic
*   **Weapon**:
    *   **Display**: Driven by `display_manager.cpp` (LVGL).
    *   **Laser Control**: Managed by `laser_task.cpp`.
    *   **Input**: Trigger and reload buttons processed in `control_task.cpp`.
*   **Target**:
    *   **Sensors**: Multiple photodiodes placed around the vest/headband for 360-degree coverage.
    *   **Signal Processing**: `photodiode.cpp` handles signal decoding using **ADC sampling** (Analog-to-Digital Converter) with **dynamic thresholding** to adapt to ambient light conditions, rather than simple digital interrupts.

### 3D Models
*   *Note: No 3D model files (`.stl`, `.step`, `.obj`) are currently present in this repository.*
*   Physical casings are likely custom-designed or sourced externally. Users typically 3D print housings for the PCB, battery, and lenses.
*   **Common DIY Build**:
    *   **Weapon**: 3D printed gun shell housing the ESP32, battery, trigger switch, and IR emitter lens.
    *   **Target**: Vest or headband with 3D printed sensor mounts.

---

## 5. Development Guide

### Setup
1.  **Clone**: `git clone --recursive https://github.com/David-ssnd/RayZ.git`
2.  **Web**: `cd web && pnpm install && pnpm dev`
3.  **Firmware**: Open `esp32` in VS Code with PlatformIO extension.

### Directory Structure
```
RayZ/
├── esp32/
│   ├── target/    # Firmware for the wearable vest/headband
│   ├── weapon/    # Firmware for the gun
│   └── shared/    # Common protocol code
├── web/           # Next.js Dashboard & WebSocket Server
├── scripts/       # Utilities for setup and validation
└── docker-compose.local.yml # For running local offline server
```
