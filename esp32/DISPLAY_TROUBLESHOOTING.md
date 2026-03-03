# Display System - Troubleshooting & Known Issues

## Compilation Issues

### Issue: LVGL Extra Widgets Require Dependencies
**Error:**
```
error: #error "lv_kb: lv_btnm is required. Enable it in lv_conf.h (LV_USE_BTNMATRIX  1)"
error: #error "lv_mbox: lv_btnm is required. Enable it in lv_conf.h (LV_USE_BTNMATRIX  1)"
error: #error "lv_spinbox: lv_ta is required. Enable it in lv_conf.h (LV_USE_TEXTAREA  1)"
```

**Cause:** LVGL's keyboard, msgbox, and spinbox widgets require btnmatrix and textarea to be enabled.

**Solution:** Explicitly disable these extra widgets in `lv_conf.h`:
```c
#define LV_USE_KEYBOARD 0
#define LV_USE_MSGBOX 0
#define LV_USE_SPINBOX 0
```

**Status:** ✅ Fixed in current implementation

---

## Runtime Issues (Hardware-specific)

### Display Not Initializing
**Symptoms:** Display stays black, no output

**Possible Causes:**
1. SSD1306 not connected properly
2. Wrong I2C address (default: 0x3C)
3. Wrong I2C pins in config.h

**Debug Steps:**
```bash
# Check I2C devices
i2cdetect -y 0  # Linux
# Should show device at 0x3C

# ESP32 logs
pio run -t monitor
# Look for "SSD1306 init failed" message
```

**Solutions:**
- Verify wiring: SDA→GPIO21, SCL→GPIO22 (or per config.h)
- Check I2C address: some displays use 0x3D
- Test with I2C scanner sketch first

---

### Text Overlapping or Garbled
**Symptoms:** Text appears on top of other text, unreadable

**Possible Causes:**
1. Components not properly hidden/shown
2. State transitions not clearing previous content
3. Memory corruption

**Debug Steps:**
```cpp
// Add debug prints in render functions
ESP_LOGI(TAG, "Rendering state: %d", s_state);

// Check component visibility
if (s_overlay_ui && s_overlay_ui->is_visible) {
    ESP_LOGI(TAG, "Overlay is visible!");
}
```

**Solutions:**
- Ensure proper hide/show of components
- Clear screen between major state changes
- Check memory monitor: `lv_mem_monitor()`

---

### Memory Issues
**Symptoms:** Crash, heap corruption, random behavior

**Check Memory Usage:**
```cpp
lv_mem_monitor_t mon;
lv_mem_monitor(&mon);
ESP_LOGI(TAG, "LVGL Memory: %d/%d bytes (%d%% used)", 
         mon.used_cnt, mon.total_size, 
         (mon.used_cnt * 100) / mon.total_size);
```

**If memory is full:**
1. Reduce LV_MEM_SIZE in lv_conf.h (currently 24KB)
2. Disable unused widgets
3. Use fewer fonts
4. Reduce draw buffer size

---

### Animations Stuttering
**Symptoms:** Choppy animations, low FPS

**Possible Causes:**
1. Other tasks using too much CPU
2. Refresh period too high
3. Complex drawings

**Solutions:**
```c
// Reduce refresh period (lv_conf.h)
#define LV_DISP_DEF_REFR_PERIOD 20  // 50 FPS

// Check CPU usage
vTaskGetRunTimeStats(buffer);

// Simplify UI
// - Use fewer animations
// - Smaller fonts
// - Fewer widgets on screen
```

---

### Display Flickers
**Symptoms:** Screen flashes, content briefly appears/disappears

**Causes:**
1. Multiple rapid updates
2. Hide/show in render loop
3. SSD1306 refresh issue

**Solutions:**
```cpp
// Batch updates
lv_obj_invalidate(parent);  // Mark for redraw
// ... make all changes ...
lv_refr_now(NULL);  // Refresh once

// Don't hide/show in fast loop
if (s_state == DM_ST_GAME_IDLE) {
    if (fast) {
        render_game_idle_new();  // Update only
    }
}
```

---

## Performance Optimization

### Reduce Memory Usage
```c
// lv_conf.h
#define LV_MEM_SIZE (20U * 1024U)  // Reduce from 24KB

// Disable unused fonts
#define LV_FONT_MONTSERRAT_24 0

// Disable unused widgets
#define LV_USE_CHART 0
#define LV_USE_METER 0
```

### Improve Refresh Rate
```cpp
// Only update changed elements
static int last_score = -1;
if (score != last_score) {
    lv_label_set_text_fmt(score_label, "Score: %d", score);
    last_score = score;
}

// Use static buffers
static char buf[32];
snprintf(buf, sizeof(buf), "P:%d", player_id);
lv_label_set_text_static(label, buf);  // No copy
```

### Optimize State Changes
```cpp
// Clear screen on major changes
lv_obj_clean(lv_scr_act());

// Preload common elements
// Create once at init, show/hide as needed
```

---

## Hardware Testing Checklist

Before reporting issues, verify:

- [ ] I2C connection working (I2C scanner sees device)
- [ ] Correct I2C address (0x3C or 0x3D)
- [ ] Correct GPIO pins (SDA, SCL)
- [ ] Display power (3.3V, not 5V for some OLEDs)
- [ ] Latest firmware uploaded
- [ ] Serial monitor shows no errors
- [ ] LVGL memory not exhausted

**Get Diagnostic Info:**
```cpp
// Add to main.cpp after display init
lv_mem_monitor_t mon;
lv_mem_monitor(&mon);
ESP_LOGI("Display", "LVGL v%d.%d.%d", 
         LVGL_VERSION_MAJOR, LVGL_VERSION_MINOR, LVGL_VERSION_PATCH);
ESP_LOGI("Display", "Memory: %d/%d bytes", mon.used_cnt, mon.total_size);
ESP_LOGI("Display", "Display: %dx%d, %d colors", 
         LV_HOR_RES_MAX, LV_VER_RES_MAX, (1 << LV_COLOR_DEPTH));
```

---

## Configuration Reference

### Minimal Working Config
If you have issues, try this minimal lv_conf.h:
```c
#define LV_COLOR_DEPTH 1
#define LV_HOR_RES_MAX 128
#define LV_VER_RES_MAX 32
#define LV_MEM_SIZE (16U * 1024U)
#define LV_DISP_DEF_REFR_PERIOD 30

// Only essential widgets
#define LV_USE_LABEL 1
#define LV_USE_BAR 1
#define LV_USE_ARC 0
#define LV_USE_CANVAS 0
#define LV_USE_SPINNER 0
// ... all others 0

// Only default font
#define LV_FONT_MONTSERRAT_10 1
// ... all others 0
```

### Full Featured Config (Current)
```c
#define LV_COLOR_DEPTH 1
#define LV_HOR_RES_MAX 128
#define LV_VER_RES_MAX 32
#define LV_MEM_SIZE (24U * 1024U)
#define LV_DISP_DEF_REFR_PERIOD 20

// 5 fonts
#define LV_FONT_MONTSERRAT_8 1
#define LV_FONT_MONTSERRAT_10 1
#define LV_FONT_MONTSERRAT_12 1
#define LV_FONT_MONTSERRAT_16 1
#define LV_FONT_MONTSERRAT_24 1

// 10 widgets
#define LV_USE_ARC 1
#define LV_USE_BAR 1
#define LV_USE_CANVAS 1
#define LV_USE_LED 1
#define LV_USE_METER 1
#define LV_USE_SPINNER 1
#define LV_USE_CHART 1
#define LV_USE_ANIMIMG 1
#define LV_USE_LINE 1
// Plus btn, img, label
```

---

## Common Mistakes

### ❌ Creating Components in Render Loop
```cpp
// BAD - creates new component every 100ms
void render() {
    ui_status_bar_t* bar = ui_status_bar_create(screen);  // MEMORY LEAK!
    ui_status_bar_update(bar, wifi, ws, rssi);
}
```

### ✅ Create Once, Update Many
```cpp
// GOOD - create at init
static ui_status_bar_t* bar = NULL;
if (!bar) {
    bar = ui_status_bar_create(screen);
}
ui_status_bar_update(bar, wifi, ws, rssi);
```

---

### ❌ Not Checking NULL Pointers
```cpp
// BAD - will crash if component creation fails
ui_status_bar_update(bar, wifi, ws, rssi);
```

### ✅ Always Check
```cpp
// GOOD
if (bar) {
    ui_status_bar_update(bar, wifi, ws, rssi);
}
```

---

### ❌ Forgetting to Hide Overlays
```cpp
// BAD - overlay stays visible forever
ui_overlay_show(overlay, "Message", 0);  // 0 = no auto-hide
```

### ✅ Use Auto-Dismiss or Manual Hide
```cpp
// GOOD
ui_overlay_show(overlay, "Message", 2000);  // Auto-hide after 2s

// Or manually
ui_overlay_hide(overlay);
```

---

## Getting Help

1. **Check Documentation:**
   - `DISPLAY_IMPROVEMENTS.md` - Technical details
   - `DISPLAY_UI_REFERENCE.md` - API reference
   - `DISPLAY_SUMMARY.md` - Overview

2. **Enable Debug Logging:**
   ```c
   // lv_conf.h
   #define LV_USE_LOG 1
   #define LV_LOG_LEVEL LV_LOG_LEVEL_TRACE
   ```

3. **Collect Info:**
   - ESP32 model and flash size
   - Display model and I2C address
   - Serial output with errors
   - Memory monitor output
   - Current state when issue occurs

4. **Test Simplified Version:**
   - Disable new UI components
   - Use legacy render functions
   - Minimal lv_conf.h
   - If it works → configuration issue
   - If it fails → hardware/wiring issue

---

## Version Info

- **LVGL Version:** 8.4.0
- **ESP-IDF:** 5.5.0
- **Display System Version:** 1.0 (Feb 2026)
- **Last Updated:** 2026-02-11

---

## Quick Fixes

**Display blank?**
→ Check `init_display()` return value, verify I2C

**Text overlapping?**
→ Add `lv_obj_add_flag(s_row1-3, LV_OBJ_FLAG_HIDDEN)`

**Out of memory?**
→ Reduce `LV_MEM_SIZE` or disable widgets

**Slow animations?**
→ Set `LV_DISP_DEF_REFR_PERIOD` to 20

**Compile errors?**
→ Ensure keyboard/msgbox/spinbox disabled

**Crash on startup?**
→ Check all pointers before use: `if (ptr) { ... }`
