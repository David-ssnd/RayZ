#pragma once
#include <lvgl.h>
#include <stdbool.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C"
{
#endif

    // ======================================================================
    // Widget groups for each screen — 128x32 monochrome OLED
    // ======================================================================

    // Shared status bar — reused by target and weapon dashboards
    typedef struct
    {
        lv_obj_t* conn;   // WiFi+WS icons     y=0 left   10pt
        lv_obj_t* ids;    // "P:X D:X"         y=0 center 10pt
        lv_obj_t* rssi;   // Signal strength   y=0 right  10pt
    } ui_status_bar_t;

    // Target game dashboard: status bar + hearts + deaths + name
    #define MAX_HEART_ICONS 5

    typedef struct
    {
        ui_status_bar_t bar;               // Shared status bar
        lv_obj_t* hearts[MAX_HEART_ICONS]; // Heart indicators  y=14 left  5x5px
        lv_obj_t* deaths;                  // "D:2"             y=11 right 10pt
        lv_obj_t* status;                  // Player name/Ready y=22 center 10pt
    } ui_target_game_t;

    // Weapon idle dashboard: status bar + big ammo + kills/shots
    typedef struct
    {
        ui_status_bar_t bar;       // Shared status bar
        lv_obj_t* ammo_value;      // Big ammo count  center 16pt
        lv_obj_t* kills;           // "K:X"           bottom-left  10pt
        lv_obj_t* shots;           // "S:X"           bottom-right 10pt
    } ui_weapon_idle_t;

    // Respawn countdown (target only)
    typedef struct
    {
        lv_obj_t* killer;      // "Killed by Alice"   top 10pt
        lv_obj_t* bar;         // progress           center 100x6
    } ui_respawn_t;

    // Connecting screen
    typedef struct
    {
        lv_obj_t* title;       // "Connecting..."    top 10pt
        lv_obj_t* ssid;        // SSID name          center 10pt
        lv_obj_t* detail;      // RSSI info          bottom 8pt
    } ui_connecting_t;

    // Boot splash
    typedef struct
    {
        lv_obj_t* title;       // "RayZ"             center 16pt
        lv_obj_t* subtitle;    // "Starting..."      bottom 10pt
    } ui_boot_t;

    // Error display
    typedef struct
    {
        lv_obj_t* title;       // "⚠ ERROR"         top 10pt
        lv_obj_t* code;        // "Code: 42"         center 10pt
        lv_obj_t* hint;        // "Fix & reboot"     bottom 8pt
    } ui_error_t;

    // Full-screen alert overlay (inverted: white bg, black text)
    typedef struct
    {
        lv_obj_t* bg;          // White background
        lv_obj_t* line1;       // Primary text       12pt black
        lv_obj_t* line2;       // Secondary text     10pt black
        bool visible;
    } ui_alert_t;

    // ======================================================================
    // Status Bar — shared component
    // ======================================================================

    void ui_status_bar_create(ui_status_bar_t* bar, lv_obj_t* scr);
    void ui_status_bar_show(ui_status_bar_t* bar);
    void ui_status_bar_hide(ui_status_bar_t* bar);
    void ui_status_bar_update(ui_status_bar_t* bar, bool wifi, bool ws,
                              int rssi, int player_id, int device_id);

    // ======================================================================
    // Creation — call once at init, widgets hidden by default
    // ======================================================================

    void ui_target_game_create(ui_target_game_t* w, lv_obj_t* scr);
    void ui_weapon_idle_create(ui_weapon_idle_t* w, lv_obj_t* scr);
    void ui_respawn_create(ui_respawn_t* w, lv_obj_t* scr);
    void ui_connecting_create(ui_connecting_t* w, lv_obj_t* scr);
    void ui_boot_create(ui_boot_t* w, lv_obj_t* scr);
    void ui_error_create(ui_error_t* w, lv_obj_t* scr);
    void ui_alert_create(ui_alert_t* w, lv_obj_t* scr);

    // ======================================================================
    // Show / Hide — toggle widget group visibility
    // ======================================================================

    void ui_target_game_show(ui_target_game_t* w);
    void ui_target_game_hide(ui_target_game_t* w);

    void ui_weapon_idle_show(ui_weapon_idle_t* w);
    void ui_weapon_idle_hide(ui_weapon_idle_t* w);

    void ui_respawn_show(ui_respawn_t* w);
    void ui_respawn_hide(ui_respawn_t* w);

    void ui_connecting_show(ui_connecting_t* w);
    void ui_connecting_hide(ui_connecting_t* w);

    void ui_boot_show(ui_boot_t* w);
    void ui_boot_hide(ui_boot_t* w);

    void ui_error_show(ui_error_t* w);
    void ui_error_hide(ui_error_t* w);

    void ui_alert_show(ui_alert_t* w, const char* l1, const char* l2);
    void ui_alert_hide(ui_alert_t* w);

    // ======================================================================
    // Update — call in render loop, only updates label text / bar value
    // ======================================================================

    void ui_target_game_update(ui_target_game_t* w,
                               int hearts, int max_hearts,
                               bool wifi, bool ws, int rssi,
                               int player_id, int device_id,
                               const char* device_name,
                               int deaths);

    void ui_weapon_idle_update(ui_weapon_idle_t* w,
                               int ammo,
                               bool wifi, bool ws, int rssi,
                               int player_id, int device_id,
                               int kills, int shots);

    void ui_respawn_update(ui_respawn_t* w,
                           uint32_t remaining_ms, uint32_t total_ms,
                           const char* killer_name);

    void ui_connecting_update(ui_connecting_t* w,
                              const char* ssid, int rssi, const char* status);

    void ui_error_update(ui_error_t* w, uint32_t code);

    // ======================================================================
    // Utility
    // ======================================================================

    void ui_format_time(uint32_t ms, char* buf, size_t len);

#ifdef __cplusplus
}
#endif
