# ESP32 Display System — Summary

## What Changed

Complete rewrite of the display UI for the 128×32 SSD1306 OLED. Removed a broken legacy system and replaced it with a clean widget-based architecture.

| Metric | Before | After |
|--------|--------|-------|
| **Rendering** | Dual system (legacy + broken "new") | Single clean widget system |
| **Device support** | Same layout for both | Separate target / weapon layouts |
| **Fonts** | 1 size (10pt) + unused 24pt | 4 sizes (8, 10, 12, 16pt) |
| **Widgets** | label + broken components | label + bar + alert overlay |
| **Memory** | 24 KB budget, ~18 KB used | 16 KB budget, fits easily |
| **State machine** | Partial, with fallback paths | Clean 11-state machine |
| **Legacy code** | All still present | Fully removed |

## Key Design Decisions

1. **Separate layouts** — Target shows health bar as hero element; weapon shows big ammo count
2. **Icons over text** — WiFi/WS shown as `LV_SYMBOL_WIFI`/`LV_SYMBOL_OK` symbols
3. **Inverted alerts** — Full-screen white-on-black overlay for HIT/KILL/ELIMINATED
4. **No paging** — Everything fits on one screen per state
5. **No animations** — Meaningless on 1-bit monochrome; blink effect for HIT/disconnect only
6. **Unified shared code** — Single `display_manager.cpp` handles both devices via auto-detection

## Files

- `shared/include/display_ui.h` — Widget struct definitions + API
- `shared/src/display_ui.cpp` — Pixel-perfect widget implementation
- `shared/src/display_manager.cpp` — State machine (target + weapon)
- `shared/include/lv_conf.h` — Slimmed-down LVGL config

See [DISPLAY_IMPROVEMENTS.md](DISPLAY_IMPROVEMENTS.md) for full technical details and [DISPLAY_UI_REFERENCE.md](DISPLAY_UI_REFERENCE.md) for API reference.
