# Display System — Complete Redesign

## Overview

Complete rewrite of the ESP32 display UI for the RayZ laser tag project. Replaced a broken dual-rendering system (legacy 3-row text + incomplete component library) with pixel-perfect, widget-based layouts optimised for the 128×32 monochrome OLED.

## Hardware

| Spec | Value |
|------|-------|
| Controller | SSD1306 |
| Resolution | 128 × 32 pixels |
| Colour depth | 1-bit monochrome (white on black) |
| Interface | I2C @ 0x3C, 400 kHz |
| Target pins | SDA 8/21, SCL 9/22 (S3/DevKit) |
| Weapon pins | SDA 8, SCL 9 |
| Toolkit | LVGL 8.3 with custom `set_px_cb` bit-packing + `rounder_cb` (8-px page alignment) |

## Architecture

```
display_manager.cpp        ← unified state machine (target + weapon)
  ├─ auto-detects device type (s_src.ammo != NULL → weapon)
  ├─ event queue (FreeRTOS, 8 deep)
  ├─ timed state expiry + polled transitions
  └─ calls display_ui widget functions
       ├─ ui_target_game_*   (target dashboard)
       ├─ ui_weapon_idle_*   (weapon dashboard)
       ├─ ui_respawn_*       (countdown + bar)
       ├─ ui_connecting_*    (WiFi screen)
       ├─ ui_boot_*          (splash)
       ├─ ui_error_*         (error code)
       └─ ui_alert_*         (full-screen inverted overlay)
```

All widgets are created **once** at init (hidden). Show/hide on state transitions — zero dynamic allocation after boot.

## State Machine

```
BOOT (800 ms)
  │
  ├─ WiFi already connected → IDLE
  └─ else → CONNECTING
              │
              ├─ WiFi/WS connected → IDLE
              └─ stays until connected

IDLE
  ├─ DM_EVT_HIT           → ALERT_HIT (800 ms, blinks)
  ├─ DM_EVT_KILLED         → ALERT_KILLED (2 s)
  ├─ DM_EVT_KILL           → ALERT_KILL (1.5 s)
  ├─ DM_EVT_RESPAWN_START  → RESPAWNING (target only)
  ├─ DM_EVT_WIFI_DISCONNECTED → ALERT_DISCONNECTED (until reconnect)
  ├─ DM_EVT_MSG            → ALERT_MSG (800 ms)
  └─ DM_EVT_ERROR_SET      → ERROR (persistent)

RESPAWNING → polled: is_respawning() false → ALERT_READY (500 ms) → IDLE

All timed alerts → return to IDLE (or ERROR if that was the return state)
```

## Screen Layouts

### Target — Game Idle
```
S:15 D:3           ✓WiFi    ← 8pt: score/deaths + connectivity icons
[████████████░░░]  3/5      ← center: 90×6 health bar + label
P:1 D:42           -65      ← 8pt: player/device IDs + RSSI
```

### Weapon — Idle
```
✓WiFi  P:1 D:42   -65      ← 8pt: connectivity + IDs + RSSI
          12                 ← 16pt: large ammo count (hero element)
         AMMO                ← 8pt: label
```

### Respawning (target only)
```
      RESPAWNING             ← 12pt centered
        7.5s                 ← 10pt countdown
[██████████████░░░░░]        ← 100×6 progress bar
```

### Alert (full-screen inverted)
White background, black text. Examples:

| Alert | Line 1 | Line 2 | Duration | Blinks? |
|-------|--------|--------|----------|---------|
| HIT | ⚡ HIT! | -1 | 800 ms | Yes |
| KILLED | ✕ ELIMINATED | by P:2 D:17 | 2 s | No |
| KILL | ✓ KILL! | P:2 D:17 | 1.5 s | No |
| READY | ✓ READY! | — | 500 ms | No |
| NO WiFi | ⚠ NO WiFi | Reconnecting... | Until reconnect | Yes |
| MSG | (custom) | — | 800 ms | No |

### Boot
```
         RayZ                ← 16pt centered
      Starting...            ← 10pt centered
```

### Connecting
```
   WiFi Connecting...        ← 10pt centered
      MyNetwork              ← 10pt SSID
     RSSI: -65               ← 8pt
```

### Error
```
      ⚠ ERROR                ← 10pt centered
     Code: 42                ← 10pt
    Fix & reboot             ← 8pt
```

## Fonts Enabled

| Size | Usage |
|------|-------|
| 8pt | IDs, RSSI, secondary labels |
| 10pt | Body text (default) |
| 12pt | Alert primary text, "RESPAWNING" |
| 16pt | Boot title, weapon ammo hero |

24pt was **removed** (too large for 32px screen).

## LVGL Configuration (lv_conf.h)

- **Memory**: 16 KB heap (down from 24 KB)
- **Widgets enabled**: label, bar, img (minimum set)
- **Widgets disabled**: arc, btn, canvas, led, line, meter, spinner, chart, animimg, list, span, imgbtn, tileview
- **No animations** used (meaningless on 1-bit display)
- **Monochrome styling**: white borders on bars, no grays, no opacity effects

## Build Results

| Target | Status | RAM | Flash |
|--------|--------|-----|-------|
| target | ✅ Builds | 18.0% | 68.2% |
| weapon | ⚠ Pre-existing `mdns_service_init` linker error (not display-related) | — | — |

## Files Changed

| File | Change |
|------|--------|
| `shared/include/display_ui.h` | **Rewritten** — 7 widget structs, create/show/hide/update API |
| `shared/src/display_ui.cpp` | **Rewritten** — pixel-perfect widget placement, monochrome-optimised |
| `shared/src/display_manager.cpp` | **Rewritten** — unified state machine for target + weapon |
| `shared/include/lv_conf.h` | **Modified** — disabled 12 unused widgets, removed 24pt font, 16 KB heap |
| `shared/CMakeLists.txt` | Added `display_ui.cpp` and `dns_server.cpp` |

## Testing Checklist

- [x] Target firmware compiles
- [x] Memory within budget (16 KB heap)
- [ ] Test on physical 128×32 OLED
- [ ] Verify all state transitions
- [ ] Check alert blink timing
- [ ] Test respawn progress bar
- [ ] Verify WiFi disconnect/reconnect flow
- [ ] Weapon firmware (blocked by pre-existing mdns issue)

## Known Limitations

1. Monochrome only — no grayscale, no fade effects
2. 128×32 limits information density — use abbreviations
3. No custom bitmap icons — LVGL symbols only
4. `respawn_total_ms` hardcoded to 10 000 ms
5. No touch/input — display is output-only
