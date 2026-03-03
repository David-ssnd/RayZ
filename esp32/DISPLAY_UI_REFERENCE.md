# Display UI API Reference

Quick reference for the widget-based display system on the 128×32 SSD1306 OLED.

## Widget Groups

Each screen state has a dedicated widget group (struct). All widgets are created once at init, then shown/hidden per state.

### `ui_target_game_t` — Target Dashboard

```c
ui_target_game_t w;
ui_target_game_create(&w, scr);   // Create (hidden)
ui_target_game_show(&w);          // Show all widgets
ui_target_game_hide(&w);          // Hide all widgets
ui_target_game_update(&w,
    hearts, max_hearts,           // Health 3/5
    score, deaths,                // S:15 D:3
    wifi, ws, rssi,               // Connectivity
    player_id, device_id);        // P:1 D:42
```

### `ui_weapon_idle_t` — Weapon Dashboard

```c
ui_weapon_idle_t w;
ui_weapon_idle_create(&w, scr);
ui_weapon_idle_show(&w);
ui_weapon_idle_hide(&w);
ui_weapon_idle_update(&w,
    ammo,                         // Big number centre
    wifi, ws, rssi,
    player_id, device_id);
```

### `ui_respawn_t` — Respawn Countdown

```c
ui_respawn_t w;
ui_respawn_create(&w, scr);
ui_respawn_show(&w);
ui_respawn_hide(&w);
ui_respawn_update(&w,
    remaining_ms,                 // e.g. 7500
    total_ms);                    // e.g. 10000
```

### `ui_connecting_t` — WiFi Connecting

```c
ui_connecting_t w;
ui_connecting_create(&w, scr);
ui_connecting_show(&w);
ui_connecting_hide(&w);
ui_connecting_update(&w,
    ssid,                         // "MyNetwork"
    rssi,                         // -65
    status);                      // "Connecting..." or NULL
```

### `ui_boot_t` — Boot Splash

```c
ui_boot_t w;
ui_boot_create(&w, scr);         // Sets "RayZ" + "Starting..."
ui_boot_show(&w);
ui_boot_hide(&w);
```

### `ui_error_t` — Error Screen

```c
ui_error_t w;
ui_error_create(&w, scr);
ui_error_show(&w);
ui_error_hide(&w);
ui_error_update(&w, error_code); // e.g. 42
```

### `ui_alert_t` — Full-Screen Inverted Overlay

```c
ui_alert_t w;
ui_alert_create(&w, scr);
ui_alert_show(&w,
    "⚡ HIT!",                   // Line 1 (12pt black on white)
    "-1");                        // Line 2 (10pt) or NULL
ui_alert_hide(&w);
// Check visibility: w.visible
```

## Utility

```c
char buf[16];
ui_format_time(7500, buf, sizeof(buf));   // → "7.5s"
ui_format_time(500, buf, sizeof(buf));    // → "500ms"
ui_format_time(75000, buf, sizeof(buf));  // → "1m15s"
```

## LVGL Symbols Used

```c
LV_SYMBOL_WIFI       // WiFi connected
LV_SYMBOL_WARNING    // ⚠ WiFi disconnected / error
LV_SYMBOL_OK         // ✓ WS connected / ready / kill
LV_SYMBOL_CLOSE      // ✕ WS disconnected / eliminated
LV_SYMBOL_CHARGE     // ⚡ Hit
```

## Fonts Available

```c
&lv_font_montserrat_8    // IDs, RSSI, labels
&lv_font_montserrat_10   // Body text (default)
&lv_font_montserrat_12   // Alert primary, respawn title
&lv_font_montserrat_16   // Boot title, weapon ammo hero
```

## Display Manager Events

Post events to the display manager:

```c
dm_event_t evt = {};
evt.type = DM_EVT_HIT;
display_manager_post(&evt);

evt.type = DM_EVT_KILLED;
evt.killed.player_id = 2;
evt.killed.device_id = 17;
display_manager_post(&evt);

evt.type = DM_EVT_MSG;
strncpy(evt.msg.text, "Custom!", sizeof(evt.msg.text));
display_manager_post(&evt);
```

Available event types: `DM_EVT_HIT`, `DM_EVT_KILLED`, `DM_EVT_KILL`, `DM_EVT_RESPAWN_START`, `DM_EVT_RESPAWN_COMPLETE`, `DM_EVT_WIFI_CONNECTED`, `DM_EVT_WIFI_DISCONNECTED`, `DM_EVT_MSG`, `DM_EVT_ERROR_SET`, `DM_EVT_ERROR_CLEAR`.

## Data Sources

The display manager pulls data via callbacks registered at init:

```c
dm_sources_t src = {};
src.hearts_remaining = my_hearts_fn;  // Target
src.max_hearts       = my_max_fn;
src.score            = my_score_fn;
src.deaths           = my_deaths_fn;
src.ammo             = my_ammo_fn;    // Weapon (also used for device detection)
src.wifi_connected   = my_wifi_fn;
src.ws_connected     = my_ws_fn;
src.wifi_rssi        = my_rssi_fn;
src.player_id        = my_pid_fn;
src.device_id        = my_did_fn;
src.is_respawning    = my_respawn_fn;
src.respawn_time_left = my_respawn_time_fn;
src.wifi_ssid        = my_ssid_fn;
src.wifi_status      = my_status_fn;
src.uptime_ms        = my_uptime_fn;
display_manager_init(disp, &src);
```

Device type is auto-detected: `src.ammo != NULL` → weapon, else → target.

## Tips

- All widgets use direct `lv_obj_align()` positioning — no flex layouts
- Bars use white border + white indicator on black background (monochrome)
- Alert overlay is always the last child of the screen (topmost z-order)
- Render rates: 100 ms for data polling, 20 ms LVGL tick
- State transitions hide all widgets first, then show the active group
