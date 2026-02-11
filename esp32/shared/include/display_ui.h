#pragma once
#include <lvgl.h>
#include <stdbool.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C"
{
#endif

    // ======================================================================
    // UI Component System - Reusable display components
    // ======================================================================

    // Status bar icons and indicators
    typedef struct
    {
        lv_obj_t* container;
        lv_obj_t* wifi_icon;
        lv_obj_t* ws_icon;
        lv_obj_t* signal_label;
    } ui_status_bar_t;

    // Main content area with flexible layout
    typedef struct
    {
        lv_obj_t* container;
        lv_obj_t* title;
        lv_obj_t* content;
        lv_obj_t* footer;
    } ui_content_area_t;

    // Progress indicator (bar or arc)
    typedef struct
    {
        lv_obj_t* container;
        lv_obj_t* progress_bar;
        lv_obj_t* label;
    } ui_progress_t;

    // Overlay system for popups and notifications
    typedef struct
    {
        lv_obj_t* container;
        lv_obj_t* bg;
        lv_obj_t* content;
        bool is_visible;
    } ui_overlay_t;

    // ======================================================================
    // UI Styles - Pre-defined styles for consistency
    // ======================================================================

    typedef struct
    {
        lv_style_t title;       // Large, bold text for titles
        lv_style_t body;        // Normal text for content
        lv_style_t small;       // Small text for secondary info
        lv_style_t highlight;   // Highlighted/inverted style
        lv_style_t warning;     // Warning/error style
        lv_style_t container;   // Container styling
    } ui_styles_t;

    // ======================================================================
    // Screen Management
    // ======================================================================

    typedef enum
    {
        UI_SCREEN_BOOT,
        UI_SCREEN_CONNECTING,
        UI_SCREEN_GAME_IDLE,
        UI_SCREEN_RESPAWNING,
        UI_SCREEN_DEBUG,
        UI_SCREEN_ERROR,
        UI_SCREEN_COUNT
    } ui_screen_type_t;

    typedef struct
    {
        lv_obj_t* screen;
        ui_screen_type_t type;
        bool is_active;
        void (*init_fn)(lv_obj_t* scr);
        void (*update_fn)(lv_obj_t* scr);
        void (*cleanup_fn)(lv_obj_t* scr);
    } ui_screen_t;

    // ======================================================================
    // Component Creation Functions
    // ======================================================================

    /**
     * Create status bar at top of screen
     * Shows WiFi, WebSocket status, signal strength
     */
    ui_status_bar_t* ui_status_bar_create(lv_obj_t* parent);
    void ui_status_bar_update(ui_status_bar_t* bar, bool wifi, bool ws, int rssi);
    void ui_status_bar_delete(ui_status_bar_t* bar);

    /**
     * Create content area with title/content/footer
     */
    ui_content_area_t* ui_content_area_create(lv_obj_t* parent);
    void ui_content_area_set_title(ui_content_area_t* area, const char* title, const lv_font_t* font);
    void ui_content_area_set_content(ui_content_area_t* area, const char* content);
    void ui_content_area_delete(ui_content_area_t* area);

    /**
     * Create progress indicator (bar or arc)
     */
    ui_progress_t* ui_progress_create(lv_obj_t* parent, bool use_arc);
    void ui_progress_set_value(ui_progress_t* prog, int32_t value, const char* label);
    void ui_progress_delete(ui_progress_t* prog);

    /**
     * Create overlay for popups/notifications
     */
    ui_overlay_t* ui_overlay_create(lv_obj_t* parent);
    void ui_overlay_show(ui_overlay_t* overlay, const char* text, uint32_t duration_ms);
    void ui_overlay_hide(ui_overlay_t* overlay);
    void ui_overlay_delete(ui_overlay_t* overlay);

    // ======================================================================
    // Style System
    // ======================================================================

    /**
     * Initialize global UI styles
     */
    void ui_styles_init(ui_styles_t* styles);

    /**
     * Apply style to object
     */
    void ui_apply_style(lv_obj_t* obj, lv_style_t* style);

    // ======================================================================
    // Screen Management Functions
    // ======================================================================

    /**
     * Initialize screen system
     */
    void ui_screens_init(lv_disp_t* disp);

    /**
     * Switch to a different screen with optional animation
     */
    void ui_screen_switch(ui_screen_type_t screen, lv_scr_load_anim_t anim, uint32_t time);

    /**
     * Get current active screen
     */
    ui_screen_t* ui_screen_get_current(void);

    /**
     * Get screen by type
     */
    lv_obj_t* ui_screen_get(ui_screen_type_t type);

    // ======================================================================
    // Utility Functions
    // ======================================================================

    /**
     * Create WiFi icon (symbol or custom)
     */
    lv_obj_t* ui_create_wifi_icon(lv_obj_t* parent, bool connected);

    /**
     * Create WebSocket icon
     */
    lv_obj_t* ui_create_ws_icon(lv_obj_t* parent, bool connected);

    /**
     * Create heart icon for health
     */
    lv_obj_t* ui_create_heart_icon(lv_obj_t* parent);

    /**
     * Format time (ms) to readable string
     */
    void ui_format_time(uint32_t ms, char* buf, size_t len);

    /**
     * Animate value change (smooth counting)
     */
    void ui_animate_value(lv_obj_t* label, int32_t from, int32_t to, uint32_t duration);

#ifdef __cplusplus
}
#endif
