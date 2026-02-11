# Display UI Component Quick Reference

## Creating Components

### Status Bar
```cpp
// In your screen init
ui_status_bar_t* bar = ui_status_bar_create(parent_screen);

// In your update loop
bool wifi = wifi_is_connected();
bool ws = websocket_is_connected();
int rssi = wifi_get_rssi();
ui_status_bar_update(bar, wifi, ws, rssi);

// Cleanup (optional, usually on app exit)
ui_status_bar_delete(bar);
```

### Content Area
```cpp
// Create
ui_content_area_t* content = ui_content_area_create(parent_screen);

// Set large title
ui_content_area_set_title(content, "Player Stats", &lv_font_montserrat_16);

// Set body content (supports \n for multiple lines)
ui_content_area_set_content(content, "Score: 1250\nLevel: 5");

// Update footer (small text at bottom)
lv_label_set_text(content->footer, "ID: 42");

// Cleanup
ui_content_area_delete(content);
```

### Progress Indicator
```cpp
// Create bar style
ui_progress_t* prog = ui_progress_create(parent_screen, false);

// Create arc/circular style
ui_progress_t* prog = ui_progress_create(parent_screen, true);

// Update value (0-100) with label
ui_progress_set_value(prog, 75, "7.5s");

// Hide/show
lv_obj_add_flag(prog->container, LV_OBJ_FLAG_HIDDEN);
lv_obj_clear_flag(prog->container, LV_OBJ_FLAG_HIDDEN);

// Cleanup
ui_progress_delete(prog);
```

### Overlay System
```cpp
// Create overlay
ui_overlay_t* overlay = ui_overlay_create(parent_screen);

// Show with auto-dismiss (time in ms, 0 = manual dismiss)
ui_overlay_show(overlay, "Achievement Unlocked!", 2000);

// Show with LVGL symbols
ui_overlay_show(overlay, LV_SYMBOL_OK " Success!", 1500);
ui_overlay_show(overlay, LV_SYMBOL_WARNING " Low Health!", 3000);

// Manual hide
ui_overlay_hide(overlay);

// Check if visible
if (overlay->is_visible) {
    // Do something
}

// Cleanup
ui_overlay_delete(overlay);
```

## Using Styles

### Apply Pre-defined Styles
```cpp
// Initialize styles (call once at startup)
ui_styles_t styles;
ui_styles_init(&styles);

// Apply to any object
lv_obj_t* label = lv_label_create(parent);
ui_apply_style(label, &styles.title);    // Large, centered
ui_apply_style(label, &styles.body);     // Normal
ui_apply_style(label, &styles.small);    // Small
ui_apply_style(label, &styles.highlight);// Inverted
ui_apply_style(label, &styles.warning);  // Large, centered
```

### Font Hierarchy
```cpp
// Available fonts:
&lv_font_montserrat_8   // Secondary info, IDs
&lv_font_montserrat_10  // Body text (default)
&lv_font_montserrat_12  // Sub-headings
&lv_font_montserrat_16  // Titles
&lv_font_montserrat_24  // Large displays, boot screen

// Set font on label
lv_obj_set_style_text_font(label, &lv_font_montserrat_16, 0);
```

## LVGL Symbols

### Available Symbols
```cpp
LV_SYMBOL_WIFI          // WiFi icon
LV_SYMBOL_OK            // Checkmark ✓
LV_SYMBOL_CLOSE         // X
LV_SYMBOL_WARNING       // ⚠
LV_SYMBOL_HEART         // ♥
LV_SYMBOL_BATTERY_FULL  // Battery
LV_SYMBOL_BATTERY_EMPTY // Low battery
LV_SYMBOL_USB           // USB
LV_SYMBOL_BLUETOOTH     // Bluetooth
LV_SYMBOL_GPS           // GPS
LV_SYMBOL_REFRESH       // Refresh arrow
LV_SYMBOL_HOME          // Home
LV_SYMBOL_DOWNLOAD      // Download arrow
LV_SYMBOL_UPLOAD        // Upload arrow
LV_SYMBOL_SETTINGS      // Gear/settings
// ... and many more
```

### Usage
```cpp
// In text
lv_label_set_text(label, LV_SYMBOL_WIFI " Connected");
lv_label_set_text(label, "Health: " LV_SYMBOL_HEART " x3");

// Combining multiple symbols
char txt[64];
snprintf(txt, sizeof(txt), "%s %s P:%d", 
         LV_SYMBOL_WIFI, LV_SYMBOL_OK, player_id);
lv_label_set_text(label, txt);
```

## Utility Functions

### Create Icons
```cpp
// WiFi icon
lv_obj_t* wifi = ui_create_wifi_icon(parent, true);  // Connected
lv_obj_t* wifi = ui_create_wifi_icon(parent, false); // Disconnected

// WebSocket icon
lv_obj_t* ws = ui_create_ws_icon(parent, true);

// Heart icon
lv_obj_t* heart = ui_create_heart_icon(parent);
```

### Format Time
```cpp
char buf[32];
ui_format_time(5000, buf, sizeof(buf));   // "5.0s"
ui_format_time(500, buf, sizeof(buf));    // "500ms"
ui_format_time(75000, buf, sizeof(buf));  // "1m15s"
```

### Animate Value
```cpp
lv_obj_t* counter = lv_label_create(parent);
lv_label_set_text(counter, "0");

// Smoothly count from 0 to 100 over 1 second
ui_animate_value(counter, 0, 100, 1000);
```

## Layout Tips

### Alignment
```cpp
// Align to edges
lv_obj_align(obj, LV_ALIGN_TOP_LEFT, x_offset, y_offset);
lv_obj_align(obj, LV_ALIGN_TOP_MID, x_offset, y_offset);
lv_obj_align(obj, LV_ALIGN_TOP_RIGHT, x_offset, y_offset);
lv_obj_align(obj, LV_ALIGN_CENTER, x_offset, y_offset);
lv_obj_align(obj, LV_ALIGN_BOTTOM_LEFT, x_offset, y_offset);
lv_obj_align(obj, LV_ALIGN_BOTTOM_MID, x_offset, y_offset);
lv_obj_align(obj, LV_ALIGN_BOTTOM_RIGHT, x_offset, y_offset);

// Align relative to another object
lv_obj_align_to(child, parent, LV_ALIGN_OUT_BOTTOM_MID, 0, 5);
```

### Flex Layout
```cpp
// Make container use flex
lv_obj_set_flex_flow(container, LV_FLEX_FLOW_COLUMN);  // Vertical
lv_obj_set_flex_flow(container, LV_FLEX_FLOW_ROW);     // Horizontal

// Alignment within flex
lv_obj_set_flex_align(container, 
    LV_FLEX_ALIGN_START,   // Main axis (top/left)
    LV_FLEX_ALIGN_CENTER,  // Cross axis (centered)
    LV_FLEX_ALIGN_CENTER); // Tracks
```

### Sizing
```cpp
// Fixed size
lv_obj_set_size(obj, width, height);
lv_obj_set_width(obj, width);
lv_obj_set_height(obj, height);

// Content size (auto-fit to children)
lv_obj_set_size(obj, LV_SIZE_CONTENT, LV_SIZE_CONTENT);

// Full parent size
lv_obj_set_size(obj, lv_pct(100), lv_pct(100));
```

## Screen Management (Placeholder)

```cpp
// Initialize screen system
ui_screens_init(display);

// Switch screens (when fully implemented)
ui_screen_switch(UI_SCREEN_BOOT, LV_SCR_LOAD_ANIM_FADE_IN, 300);
ui_screen_switch(UI_SCREEN_GAME_IDLE, LV_SCR_LOAD_ANIM_NONE, 0);

// Get screen object
lv_obj_t* screen = ui_screen_get(UI_SCREEN_DEBUG);
```

## Common Patterns

### Status Display
```cpp
// Create status bar
ui_status_bar_t* bar = ui_status_bar_create(screen);

// Update every second
if (elapsed_time % 1000 == 0) {
    ui_status_bar_update(bar, wifi, ws, rssi);
}
```

### Countdown Timer
```cpp
// Create progress with arc
ui_progress_t* timer = ui_progress_create(screen, true);

// Update every 100ms
uint32_t remaining_ms = get_time_remaining();
int progress = (total_time - remaining_ms) * 100 / total_time;
char label[16];
snprintf(label, sizeof(label), "%.1fs", remaining_ms / 1000.0f);
ui_progress_set_value(timer, progress, label);
```

### Notification Toast
```cpp
// One-liner notification
ui_overlay_show(overlay, "Item Collected!", 1500);

// With icon
ui_overlay_show(overlay, LV_SYMBOL_OK " Win!", 2000);

// Error message
ui_overlay_show(overlay, LV_SYMBOL_WARNING " Error!", 3000);
```

### Stats Display
```cpp
ui_content_area_t* stats = ui_content_area_create(screen);

// Title with icon
char title[32];
snprintf(title, sizeof(title), "%s Health", LV_SYMBOL_HEART);
ui_content_area_set_title(stats, title, &lv_font_montserrat_12);

// Multi-line content
char content[128];
snprintf(content, sizeof(content), 
         "Score: %d\nKills: %d\nDeaths: %d", 
         score, kills, deaths);
ui_content_area_set_content(stats, content);

// Small footer
lv_label_set_text(stats->footer, "Press B to continue");
```

## Memory Management

### Best Practices
```cpp
// ✓ Create components once at init
ui_status_bar_t* bar = ui_status_bar_create(screen);

// ✓ Update frequently (no allocation)
ui_status_bar_update(bar, wifi, ws, rssi);

// ✗ Don't create/delete every frame
// This causes memory fragmentation!
for (int i = 0; i < 100; i++) {
    ui_progress_t* p = ui_progress_create(screen, false);
    ui_progress_delete(p);  // BAD!
}

// ✓ Cleanup on state change or app exit
ui_status_bar_delete(bar);
```

### Check Memory Usage
```cpp
// Enable memory monitor in lv_conf.h
#define LV_USE_MEM_MONITOR 1

// In code
lv_mem_monitor_t mon;
lv_mem_monitor(&mon);
printf("Used: %d / %d bytes\n", mon.used_cnt, mon.total_size);
```

## Debugging

### Visual Debug
```cpp
// Enable in lv_conf.h
#define LV_USE_REFR_DEBUG 1  // Shows refresh areas
#define LV_USE_PERF_MONITOR 1 // Shows FPS

// In code
lv_obj_t* screen = lv_scr_act();
lv_obj_add_flag(screen, LV_OBJ_FLAG_SEND_DRAW_TASK_EVENTS);
```

### Print Object Tree
```cpp
void print_obj_tree(lv_obj_t* obj, int indent) {
    for (int i = 0; i < indent; i++) printf("  ");
    printf("- %s\n", lv_obj_get_class(obj)->name);
    
    uint32_t i;
    for(i = 0; i < lv_obj_get_child_cnt(obj); i++) {
        print_obj_tree(lv_obj_get_child(obj, i), indent + 1);
    }
}

// Usage
print_obj_tree(lv_scr_act(), 0);
```

## Performance Tips

1. **Update only what changed** - Don't set text if it's the same
2. **Use appropriate refresh rates** - 100ms for slow data, 20ms for animations
3. **Hide unused objects** - Use `LV_OBJ_FLAG_HIDDEN` instead of deleting
4. **Batch updates** - Update multiple labels, then call `lv_refr_now()`
5. **Avoid printf in hot paths** - Pre-format strings when possible

## Common Issues

### Text Not Showing
```cpp
// Check: Is font enabled in lv_conf.h?
#define LV_FONT_MONTSERRAT_16 1

// Check: Is object visible?
lv_obj_clear_flag(label, LV_OBJ_FLAG_HIDDEN);

// Check: Is text set?
const char* txt = lv_label_get_text(label);
printf("Text: %s\n", txt);
```

### Text Overlapping
```cpp
// Use containers with flex layout
lv_obj_set_flex_flow(container, LV_FLEX_FLOW_COLUMN);

// Or use proper spacing
lv_obj_set_style_pad_all(container, 5, 0);

// Or align relative to other objects
lv_obj_align_to(obj2, obj1, LV_ALIGN_OUT_BOTTOM_MID, 0, 5);
```

### Memory Leak
```cpp
// Always pair create with delete
ui_status_bar_t* bar = ui_status_bar_create(screen);
// ... use bar ...
ui_status_bar_delete(bar);

// Check for orphaned LVGL objects
lv_mem_monitor_t mon;
lv_mem_monitor(&mon);
```
