#include "display_ui.h"
#include <stdio.h>
#include <string.h>

// Global styles instance
static ui_styles_t g_styles;
static bool g_styles_initialized = false;

// Screen management
static ui_screen_t g_screens[UI_SCREEN_COUNT];
static ui_screen_type_t g_current_screen = UI_SCREEN_BOOT;
static lv_disp_t* g_disp = NULL;

// ======================================================================
// Style System Implementation
// ======================================================================

void ui_styles_init(ui_styles_t* styles)
{
    if (g_styles_initialized)
        return;

    // Title style - Large, centered
    lv_style_init(&styles->title);
    lv_style_set_text_font(&styles->title, &lv_font_montserrat_16);
    lv_style_set_text_color(&styles->title, lv_color_white());
    lv_style_set_text_align(&styles->title, LV_TEXT_ALIGN_CENTER);

    // Body style - Normal text
    lv_style_init(&styles->body);
    lv_style_set_text_font(&styles->body, &lv_font_montserrat_10);
    lv_style_set_text_color(&styles->body, lv_color_white());
    lv_style_set_text_align(&styles->body, LV_TEXT_ALIGN_LEFT);

    // Small style - Secondary info
    lv_style_init(&styles->small);
    lv_style_set_text_font(&styles->small, &lv_font_montserrat_8);
    lv_style_set_text_color(&styles->small, lv_color_white());
    lv_style_set_text_align(&styles->small, LV_TEXT_ALIGN_LEFT);

    // Highlight style - Inverted
    lv_style_init(&styles->highlight);
    lv_style_set_text_font(&styles->highlight, &lv_font_montserrat_12);
    lv_style_set_text_color(&styles->highlight, lv_color_black());
    lv_style_set_bg_color(&styles->highlight, lv_color_white());
    lv_style_set_bg_opa(&styles->highlight, LV_OPA_COVER);
    lv_style_set_pad_all(&styles->highlight, 2);

    // Warning style - Blinking large text
    lv_style_init(&styles->warning);
    lv_style_set_text_font(&styles->warning, &lv_font_montserrat_12);
    lv_style_set_text_color(&styles->warning, lv_color_white());
    lv_style_set_text_align(&styles->warning, LV_TEXT_ALIGN_CENTER);

    // Container style
    lv_style_init(&styles->container);
    lv_style_set_bg_color(&styles->container, lv_color_black());
    lv_style_set_bg_opa(&styles->container, LV_OPA_COVER);
    lv_style_set_border_width(&styles->container, 0);
    lv_style_set_pad_all(&styles->container, 0);

    g_styles_initialized = true;
}

void ui_apply_style(lv_obj_t* obj, lv_style_t* style)
{
    if (obj && style)
    {
        lv_obj_add_style(obj, style, 0);
    }
}

// ======================================================================
// Status Bar Implementation
// ======================================================================

ui_status_bar_t* ui_status_bar_create(lv_obj_t* parent)
{
    if (!g_styles_initialized)
        ui_styles_init(&g_styles);

    ui_status_bar_t* bar = (ui_status_bar_t*)lv_mem_alloc(sizeof(ui_status_bar_t));
    if (!bar)
        return NULL;

    // Container - top 8px of screen
    bar->container = lv_obj_create(parent);
    lv_obj_set_size(bar->container, 128, 8);
    lv_obj_align(bar->container, LV_ALIGN_TOP_MID, 0, 0);
    lv_obj_set_style_bg_color(bar->container, lv_color_black(), 0);
    lv_obj_set_style_border_width(bar->container, 0, 0);
    lv_obj_set_style_pad_all(bar->container, 0, 0);

    // WiFi icon (left)
    bar->wifi_icon = lv_label_create(bar->container);
    lv_label_set_text(bar->wifi_icon, LV_SYMBOL_WIFI);
    lv_obj_add_style(bar->wifi_icon, &g_styles.small, 0);
    lv_obj_align(bar->wifi_icon, LV_ALIGN_LEFT_MID, 0, 0);

    // WS icon (left-center)
    bar->ws_icon = lv_label_create(bar->container);
    lv_label_set_text(bar->ws_icon, "WS");
    lv_obj_add_style(bar->ws_icon, &g_styles.small, 0);
    lv_obj_align(bar->ws_icon, LV_ALIGN_LEFT_MID, 20, 0);

    // Signal strength (right)
    bar->signal_label = lv_label_create(bar->container);
    lv_label_set_text(bar->signal_label, "--");
    lv_obj_add_style(bar->signal_label, &g_styles.small, 0);
    lv_obj_align(bar->signal_label, LV_ALIGN_RIGHT_MID, 0, 0);

    return bar;
}

void ui_status_bar_update(ui_status_bar_t* bar, bool wifi, bool ws, int rssi)
{
    if (!bar)
        return;

    // Update WiFi icon
    lv_label_set_text(bar->wifi_icon, wifi ? LV_SYMBOL_WIFI : LV_SYMBOL_WARNING);

    // Update WS icon
    lv_obj_set_style_text_color(bar->ws_icon, ws ? lv_color_white() : lv_color_make(100, 100, 100), 0);

    // Update signal strength
    if (wifi)
    {
        char buf[8];
        snprintf(buf, sizeof(buf), "%d", rssi);
        lv_label_set_text(bar->signal_label, buf);
    }
    else
    {
        lv_label_set_text(bar->signal_label, "--");
    }
}

void ui_status_bar_delete(ui_status_bar_t* bar)
{
    if (bar)
    {
        lv_obj_del(bar->container);
        lv_mem_free(bar);
    }
}

// ======================================================================
// Content Area Implementation
// ======================================================================

ui_content_area_t* ui_content_area_create(lv_obj_t* parent)
{
    if (!g_styles_initialized)
        ui_styles_init(&g_styles);

    ui_content_area_t* area = (ui_content_area_t*)lv_mem_alloc(sizeof(ui_content_area_t));
    if (!area)
        return NULL;

    // Container - main area (below status bar)
    area->container = lv_obj_create(parent);
    lv_obj_set_size(area->container, 128, 24);
    lv_obj_align(area->container, LV_ALIGN_TOP_MID, 0, 8);
    lv_obj_set_style_bg_color(area->container, lv_color_black(), 0);
    lv_obj_set_style_border_width(area->container, 0, 0);
    lv_obj_set_style_pad_all(area->container, 2, 0);
    lv_obj_set_flex_flow(area->container, LV_FLEX_FLOW_COLUMN);
    lv_obj_set_flex_align(area->container, LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_START);

    // Title (optional)
    area->title = lv_label_create(area->container);
    lv_obj_add_style(area->title, &g_styles.body, 0);
    lv_label_set_text(area->title, "");

    // Content
    area->content = lv_label_create(area->container);
    lv_obj_add_style(area->content, &g_styles.body, 0);
    lv_label_set_text(area->content, "");

    // Footer (optional)
    area->footer = lv_label_create(area->container);
    lv_obj_add_style(area->footer, &g_styles.small, 0);
    lv_label_set_text(area->footer, "");

    return area;
}

void ui_content_area_set_title(ui_content_area_t* area, const char* title, const lv_font_t* font)
{
    if (!area || !title)
        return;

    lv_label_set_text(area->title, title);
    if (font)
    {
        lv_obj_set_style_text_font(area->title, font, 0);
    }
}

void ui_content_area_set_content(ui_content_area_t* area, const char* content)
{
    if (!area || !content)
        return;

    lv_label_set_text(area->content, content);
}

void ui_content_area_delete(ui_content_area_t* area)
{
    if (area)
    {
        lv_obj_del(area->container);
        lv_mem_free(area);
    }
}

// ======================================================================
// Progress Indicator Implementation
// ======================================================================

ui_progress_t* ui_progress_create(lv_obj_t* parent, bool use_arc)
{
    ui_progress_t* prog = (ui_progress_t*)lv_mem_alloc(sizeof(ui_progress_t));
    if (!prog)
        return NULL;

    prog->container = lv_obj_create(parent);
    lv_obj_set_size(prog->container, 128, 16);
    lv_obj_align(prog->container, LV_ALIGN_BOTTOM_MID, 0, 0);
    lv_obj_set_style_bg_color(prog->container, lv_color_black(), 0);
    lv_obj_set_style_border_width(prog->container, 0, 0);
    lv_obj_set_style_pad_all(prog->container, 2, 0);

    if (use_arc)
    {
        // Arc progress (circular)
        prog->progress_bar = lv_arc_create(prog->container);
        lv_obj_set_size(prog->progress_bar, 14, 14);
        lv_obj_align(prog->progress_bar, LV_ALIGN_LEFT_MID, 0, 0);
        lv_arc_set_range(prog->progress_bar, 0, 100);
        lv_arc_set_value(prog->progress_bar, 0);
        lv_obj_set_style_arc_width(prog->progress_bar, 2, LV_PART_MAIN);
        lv_obj_set_style_arc_width(prog->progress_bar, 2, LV_PART_INDICATOR);
    }
    else
    {
        // Bar progress (horizontal)
        prog->progress_bar = lv_bar_create(prog->container);
        lv_obj_set_size(prog->progress_bar, 60, 8);
        lv_obj_align(prog->progress_bar, LV_ALIGN_LEFT_MID, 0, 0);
        lv_bar_set_range(prog->progress_bar, 0, 100);
        lv_bar_set_value(prog->progress_bar, 0, LV_ANIM_OFF);
        lv_obj_set_style_bg_color(prog->progress_bar, lv_color_make(50, 50, 50), LV_PART_MAIN);
        lv_obj_set_style_bg_color(prog->progress_bar, lv_color_white(), LV_PART_INDICATOR);
    }

    // Label
    prog->label = lv_label_create(prog->container);
    lv_obj_add_style(prog->label, &g_styles.small, 0);
    lv_obj_align(prog->label, LV_ALIGN_RIGHT_MID, 0, 0);
    lv_label_set_text(prog->label, "");

    return prog;
}

void ui_progress_set_value(ui_progress_t* prog, int32_t value, const char* label)
{
    if (!prog)
        return;

    if (lv_obj_check_type(prog->progress_bar, &lv_arc_class))
    {
        lv_arc_set_value(prog->progress_bar, value);
    }
    else if (lv_obj_check_type(prog->progress_bar, &lv_bar_class))
    {
        lv_bar_set_value(prog->progress_bar, value, LV_ANIM_ON);
    }

    if (label)
    {
        lv_label_set_text(prog->label, label);
    }
}

void ui_progress_delete(ui_progress_t* prog)
{
    if (prog)
    {
        lv_obj_del(prog->container);
        lv_mem_free(prog);
    }
}

// ======================================================================
// Overlay Implementation
// ======================================================================

static void overlay_hide_timer_cb(lv_timer_t* timer)
{
    ui_overlay_t* overlay = (ui_overlay_t*)timer->user_data;
    ui_overlay_hide(overlay);
    lv_timer_del(timer);
}

ui_overlay_t* ui_overlay_create(lv_obj_t* parent)
{
    if (!g_styles_initialized)
        ui_styles_init(&g_styles);

    ui_overlay_t* overlay = (ui_overlay_t*)lv_mem_alloc(sizeof(ui_overlay_t));
    if (!overlay)
        return NULL;

    // Full-screen container
    overlay->container = lv_obj_create(parent);
    lv_obj_set_size(overlay->container, 128, 32);
    lv_obj_align(overlay->container, LV_ALIGN_CENTER, 0, 0);
    lv_obj_set_style_bg_opa(overlay->container, LV_OPA_TRANSP, 0);
    lv_obj_set_style_border_width(overlay->container, 0, 0);
    lv_obj_add_flag(overlay->container, LV_OBJ_FLAG_HIDDEN);

    // Semi-transparent background
    overlay->bg = lv_obj_create(overlay->container);
    lv_obj_set_size(overlay->bg, 128, 32);
    lv_obj_align(overlay->bg, LV_ALIGN_CENTER, 0, 0);
    lv_obj_set_style_bg_color(overlay->bg, lv_color_black(), 0);
    lv_obj_set_style_bg_opa(overlay->bg, LV_OPA_70, 0);
    lv_obj_set_style_border_width(overlay->bg, 0, 0);

    // Content label
    overlay->content = lv_label_create(overlay->container);
    lv_obj_add_style(overlay->content, &g_styles.title, 0);
    lv_obj_align(overlay->content, LV_ALIGN_CENTER, 0, 0);
    lv_label_set_text(overlay->content, "");

    overlay->is_visible = false;

    return overlay;
}

void ui_overlay_show(ui_overlay_t* overlay, const char* text, uint32_t duration_ms)
{
    if (!overlay)
        return;

    lv_label_set_text(overlay->content, text);
    lv_obj_clear_flag(overlay->container, LV_OBJ_FLAG_HIDDEN);
    overlay->is_visible = true;

    // Fade in animation
    lv_obj_fade_in(overlay->container, 200, 0);

    // Auto-hide timer
    if (duration_ms > 0)
    {
        lv_timer_t* timer = lv_timer_create(overlay_hide_timer_cb, duration_ms, overlay);
        lv_timer_set_repeat_count(timer, 1);
    }
}

void ui_overlay_hide(ui_overlay_t* overlay)
{
    if (!overlay || !overlay->is_visible)
        return;

    // Fade out animation
    lv_obj_fade_out(overlay->container, 200, 0);

    // Hide after animation
    lv_obj_add_flag(overlay->container, LV_OBJ_FLAG_HIDDEN);
    overlay->is_visible = false;
}

void ui_overlay_delete(ui_overlay_t* overlay)
{
    if (overlay)
    {
        lv_obj_del(overlay->container);
        lv_mem_free(overlay);
    }
}

// ======================================================================
// Utility Functions
// ======================================================================

lv_obj_t* ui_create_wifi_icon(lv_obj_t* parent, bool connected)
{
    lv_obj_t* icon = lv_label_create(parent);
    lv_label_set_text(icon, connected ? LV_SYMBOL_WIFI : LV_SYMBOL_WARNING);
    lv_obj_add_style(icon, &g_styles.small, 0);
    return icon;
}

lv_obj_t* ui_create_ws_icon(lv_obj_t* parent, bool connected)
{
    lv_obj_t* icon = lv_label_create(parent);
    lv_label_set_text(icon, connected ? LV_SYMBOL_OK : LV_SYMBOL_CLOSE);
    lv_obj_add_style(icon, &g_styles.small, 0);
    return icon;
}

lv_obj_t* ui_create_heart_icon(lv_obj_t* parent)
{
    lv_obj_t* icon = lv_label_create(parent);
    lv_label_set_text(icon, LV_SYMBOL_HEART);
    lv_obj_add_style(icon, &g_styles.body, 0);
    return icon;
}

void ui_format_time(uint32_t ms, char* buf, size_t len)
{
    if (!buf || len == 0)
        return;

    if (ms < 1000)
    {
        snprintf(buf, len, "%lums", (unsigned long)ms);
    }
    else if (ms < 60000)
    {
        snprintf(buf, len, "%.1fs", ms / 1000.0f);
    }
    else
    {
        uint32_t mins = ms / 60000;
        uint32_t secs = (ms % 60000) / 1000;
        snprintf(buf, len, "%lum%lus", (unsigned long)mins, (unsigned long)secs);
    }
}

static void anim_value_cb(void* var, int32_t v)
{
    lv_label_set_text_fmt((lv_obj_t*)var, "%ld", (long)v);
}

void ui_animate_value(lv_obj_t* label, int32_t from, int32_t to, uint32_t duration)
{
    if (!label)
        return;

    lv_anim_t a;
    lv_anim_init(&a);
    lv_anim_set_var(&a, label);
    lv_anim_set_values(&a, from, to);
    lv_anim_set_time(&a, duration);
    lv_anim_set_exec_cb(&a, anim_value_cb);
    lv_anim_start(&a);
}

// ======================================================================
// Screen Management (Placeholder - will be expanded)
// ======================================================================

void ui_screens_init(lv_disp_t* disp)
{
    g_disp = disp;
    ui_styles_init(&g_styles);

    // Initialize screens array
    memset(g_screens, 0, sizeof(g_screens));

    // Will be implemented in next phase with screen-specific functions
}

void ui_screen_switch(ui_screen_type_t screen, lv_scr_load_anim_t anim, uint32_t time)
{
    if (screen >= UI_SCREEN_COUNT)
        return;

    g_current_screen = screen;
    // Will be fully implemented with actual screen objects
}

ui_screen_t* ui_screen_get_current(void)
{
    return &g_screens[g_current_screen];
}

lv_obj_t* ui_screen_get(ui_screen_type_t type)
{
    if (type >= UI_SCREEN_COUNT)
        return NULL;
    return g_screens[type].screen;
}
