#include "display_ui.h"
#include <stdio.h>
#include <string.h>

// ======================================================================
// Helpers
// ======================================================================

static void hide(lv_obj_t* o)
{
    if (o) lv_obj_add_flag(o, LV_OBJ_FLAG_HIDDEN);
}

static void show(lv_obj_t* o)
{
    if (o) lv_obj_clear_flag(o, LV_OBJ_FLAG_HIDDEN);
}

static lv_obj_t* make_label(lv_obj_t* par, const lv_font_t* f,
                            lv_align_t align, lv_coord_t x, lv_coord_t y)
{
    lv_obj_t* l = lv_label_create(par);
    lv_obj_set_style_text_font(l, f, 0);
    lv_obj_set_style_text_color(l, lv_color_white(), 0);
    lv_obj_align(l, align, x, y);
    lv_label_set_text(l, "");
    lv_obj_add_flag(l, LV_OBJ_FLAG_HIDDEN);
    return l;
}

static lv_obj_t* make_bar(lv_obj_t* par, lv_coord_t w, lv_coord_t h,
                          lv_align_t align, lv_coord_t x, lv_coord_t y)
{
    lv_obj_t* b = lv_bar_create(par);
    lv_obj_set_size(b, w, h);
    lv_obj_align(b, align, x, y);
    lv_bar_set_range(b, 0, 100);
    lv_bar_set_value(b, 0, LV_ANIM_OFF);
    // Monochrome: white border, black bg, white fill
    lv_obj_set_style_border_color(b, lv_color_white(), 0);
    lv_obj_set_style_border_width(b, 1, 0);
    lv_obj_set_style_bg_color(b, lv_color_black(), LV_PART_MAIN);
    lv_obj_set_style_bg_opa(b, LV_OPA_COVER, LV_PART_MAIN);
    lv_obj_set_style_bg_color(b, lv_color_white(), LV_PART_INDICATOR);
    lv_obj_set_style_bg_opa(b, LV_OPA_COVER, LV_PART_INDICATOR);
    lv_obj_set_style_radius(b, 1, 0);
    lv_obj_set_style_radius(b, 0, LV_PART_INDICATOR);
    lv_obj_add_flag(b, LV_OBJ_FLAG_HIDDEN);
    return b;
}

// ======================================================================
// Target Game Dashboard
// Layout: 128x32 (3 rows of 10pt, ~10px each, 1px gap)
//   y=0  (10pt) : DeviceName
//   y=11 (10pt) : ■■■□□           WiFi
//   y=22 (10pt) : P:1 D:42         -65
// ======================================================================

void ui_target_game_create(ui_target_game_t* w, lv_obj_t* scr)
{
    w->name = make_label(scr, &lv_font_montserrat_10, LV_ALIGN_TOP_MID, 0, 0);
    w->conn = make_label(scr, &lv_font_montserrat_10, LV_ALIGN_TOP_RIGHT, -1, 11);

    // 5 heart indicator boxes (5x5 px, 2px gap) on row 2
    for (int i = 0; i < MAX_HEART_ICONS; i++)
    {
        lv_obj_t* h = lv_obj_create(scr);
        lv_obj_set_size(h, 5, 5);
        lv_obj_align(h, LV_ALIGN_TOP_LEFT, 1 + i * 7, 14);
        lv_obj_clear_flag(h, LV_OBJ_FLAG_SCROLLABLE);
        lv_obj_set_style_pad_all(h, 0, 0);
        lv_obj_set_style_radius(h, 0, 0);
        lv_obj_set_style_border_color(h, lv_color_white(), 0);
        lv_obj_set_style_border_width(h, 1, 0);
        lv_obj_set_style_bg_color(h, lv_color_white(), 0);
        lv_obj_set_style_bg_opa(h, LV_OPA_COVER, 0);
        lv_obj_add_flag(h, LV_OBJ_FLAG_HIDDEN);
        w->hearts[i] = h;
    }

    w->ids  = make_label(scr, &lv_font_montserrat_10, LV_ALIGN_TOP_LEFT,  1, 22);
    w->rssi = make_label(scr, &lv_font_montserrat_10, LV_ALIGN_TOP_RIGHT,-1, 22);
}

void ui_target_game_show(ui_target_game_t* w)
{
    show(w->name); show(w->conn); show(w->rssi);
    // hearts visibility managed by update()
    show(w->ids);
}

void ui_target_game_hide(ui_target_game_t* w)
{
    hide(w->name); hide(w->conn); hide(w->rssi);
    for (int i = 0; i < MAX_HEART_ICONS; i++) hide(w->hearts[i]);
    hide(w->ids);
}

void ui_target_game_update(ui_target_game_t* w,
                           int hearts, int max_hearts,
                           bool wifi, bool ws, int rssi,
                           int player_id, int device_id,
                           const char* device_name)
{
    char buf[32];

    // Row 1: Device name
    lv_label_set_text(w->name, device_name ? device_name : "?");

    // Row 2: Hearts + WiFi/WS icons
    snprintf(buf, sizeof(buf), "%s%s",
             wifi ? LV_SYMBOL_WIFI : LV_SYMBOL_WARNING,
             ws   ? LV_SYMBOL_OK   : LV_SYMBOL_CLOSE);
    lv_label_set_text(w->conn, buf);

    int mh = max_hearts > MAX_HEART_ICONS ? MAX_HEART_ICONS : max_hearts;
    for (int i = 0; i < MAX_HEART_ICONS; i++)
    {
        if (i < mh)
        {
            lv_obj_clear_flag(w->hearts[i], LV_OBJ_FLAG_HIDDEN);
            if (i < hearts)
                lv_obj_set_style_bg_opa(w->hearts[i], LV_OPA_COVER, 0);
            else
                lv_obj_set_style_bg_opa(w->hearts[i], LV_OPA_TRANSP, 0);
        }
        else
            lv_obj_add_flag(w->hearts[i], LV_OBJ_FLAG_HIDDEN);
    }

    // Row 3: P:D IDs + RSSI
    snprintf(buf, sizeof(buf), "P:%d D:%d", player_id, device_id);
    lv_label_set_text(w->ids, buf);

    snprintf(buf, sizeof(buf), "%d", rssi);
    lv_label_set_text(w->rssi, buf);
}

// ======================================================================
// Weapon Idle Dashboard
// Layout: 128x32
//   y=0  (8pt)  : WiFi WS  P:1 D:42  -65
//   y=8  (16pt) :         12           (big ammo count)
//   y=25 (8pt)  :        AMMO
// ======================================================================

void ui_weapon_idle_create(ui_weapon_idle_t* w, lv_obj_t* scr)
{
    w->conn       = make_label(scr, &lv_font_montserrat_10, LV_ALIGN_TOP_LEFT,   1, 0);
    w->ids        = make_label(scr, &lv_font_montserrat_10, LV_ALIGN_TOP_MID,    0, 0);
    w->rssi       = make_label(scr, &lv_font_montserrat_10, LV_ALIGN_TOP_RIGHT, -1, 0);
    w->ammo_value = make_label(scr, &lv_font_montserrat_16, LV_ALIGN_CENTER,     0, -2);
    w->ammo_label = make_label(scr, &lv_font_montserrat_10, LV_ALIGN_BOTTOM_MID, 0, -1);
}

void ui_weapon_idle_show(ui_weapon_idle_t* w)
{
    show(w->conn); show(w->ids); show(w->rssi);
    show(w->ammo_value); show(w->ammo_label);
}

void ui_weapon_idle_hide(ui_weapon_idle_t* w)
{
    hide(w->conn); hide(w->ids); hide(w->rssi);
    hide(w->ammo_value); hide(w->ammo_label);
}

void ui_weapon_idle_update(ui_weapon_idle_t* w,
                           int ammo,
                           bool wifi, bool ws, int rssi,
                           int player_id, int device_id)
{
    char buf[32];

    snprintf(buf, sizeof(buf), "%s%s",
             wifi ? LV_SYMBOL_WIFI : LV_SYMBOL_WARNING,
             ws   ? LV_SYMBOL_OK   : LV_SYMBOL_CLOSE);
    lv_label_set_text(w->conn, buf);

    snprintf(buf, sizeof(buf), "P:%d D:%d", player_id, device_id);
    lv_label_set_text(w->ids, buf);

    snprintf(buf, sizeof(buf), "%d", rssi);
    lv_label_set_text(w->rssi, buf);

    snprintf(buf, sizeof(buf), "%d", ammo);
    lv_label_set_text(w->ammo_value, buf);

    lv_label_set_text(w->ammo_label, "AMMO");
}

// ======================================================================
// Respawn Countdown
// Layout: 128x32
//   y=4  (10pt) : Killed by Alice
//   y=20 (6px)  : [progress bar]
// ======================================================================

void ui_respawn_create(ui_respawn_t* w, lv_obj_t* scr)
{
    w->killer    = make_label(scr, &lv_font_montserrat_10, LV_ALIGN_TOP_MID,    0, 4);
    w->bar       = make_bar(scr, 100, 6, LV_ALIGN_CENTER, 0, 6);
}

void ui_respawn_show(ui_respawn_t* w)
{
    show(w->killer); show(w->bar);
}

void ui_respawn_hide(ui_respawn_t* w)
{
    hide(w->killer); hide(w->bar);
}

void ui_respawn_update(ui_respawn_t* w,
                       uint32_t remaining_ms, uint32_t total_ms,
                       const char* killer_name)
{
    if (killer_name && strlen(killer_name) > 0)
    {
        char buf[32];
        snprintf(buf, sizeof(buf), "Killed by %s", killer_name);
        lv_label_set_text(w->killer, buf);
    }
    else
        lv_label_set_text(w->killer, "RESPAWNING");

    int32_t pct = 0;
    if (total_ms > 0 && remaining_ms <= total_ms)
        pct = (int32_t)((total_ms - remaining_ms) * 100 / total_ms);
    if (pct > 100) pct = 100;
    lv_bar_set_value(w->bar, pct, LV_ANIM_OFF);
}

// ======================================================================
// Connecting Screen
// Layout: 128x32
//   y=2  (10pt) : Connecting...
//   y=13 (10pt) : MyNetwork
//   y=24 (8pt)  : RSSI: -65
// ======================================================================

void ui_connecting_create(ui_connecting_t* w, lv_obj_t* scr)
{
    w->title  = make_label(scr, &lv_font_montserrat_10, LV_ALIGN_TOP_MID,    0, 2);
    w->ssid   = make_label(scr, &lv_font_montserrat_10, LV_ALIGN_CENTER,     0, 0);
    w->detail = make_label(scr, &lv_font_montserrat_10, LV_ALIGN_BOTTOM_MID, 0, -1);
    lv_label_set_text(w->title, LV_SYMBOL_WIFI " Connecting...");
}

void ui_connecting_show(ui_connecting_t* w)
{
    show(w->title); show(w->ssid); show(w->detail);
}

void ui_connecting_hide(ui_connecting_t* w)
{
    hide(w->title); hide(w->ssid); hide(w->detail);
}

void ui_connecting_update(ui_connecting_t* w,
                          const char* ssid, int rssi, const char* status)
{
    if (status && strlen(status) > 0)
        lv_label_set_text(w->title, status);
    else
        lv_label_set_text(w->title, LV_SYMBOL_WIFI " Connecting...");

    lv_label_set_text(w->ssid, ssid ? ssid : "?");

    char buf[24];
    snprintf(buf, sizeof(buf), "RSSI: %d", rssi);
    lv_label_set_text(w->detail, buf);
}

// ======================================================================
// Boot Splash
// Layout: 128x32
//   y=4  (16pt) : RayZ
//   y=22 (10pt) : Starting...
// ======================================================================

void ui_boot_create(ui_boot_t* w, lv_obj_t* scr)
{
    w->title    = make_label(scr, &lv_font_montserrat_16, LV_ALIGN_CENTER,     0, -5);
    w->subtitle = make_label(scr, &lv_font_montserrat_10, LV_ALIGN_BOTTOM_MID, 0, -1);
    lv_label_set_text(w->title, "RayZ");
    lv_label_set_text(w->subtitle, "Starting...");
}

void ui_boot_show(ui_boot_t* w)
{
    show(w->title); show(w->subtitle);
}

void ui_boot_hide(ui_boot_t* w)
{
    hide(w->title); hide(w->subtitle);
}

// ======================================================================
// Error Display
// Layout: 128x32
//   y=0  (10pt) : ⚠ ERROR
//   y=11 (10pt) : Code: 42
//   y=23 (8pt)  : Fix & reboot
// ======================================================================

void ui_error_create(ui_error_t* w, lv_obj_t* scr)
{
    w->title = make_label(scr, &lv_font_montserrat_10, LV_ALIGN_TOP_MID,    0, 0);
    w->code  = make_label(scr, &lv_font_montserrat_10, LV_ALIGN_CENTER,     0, 0);
    w->hint  = make_label(scr, &lv_font_montserrat_10, LV_ALIGN_BOTTOM_MID, 0, -1);
    lv_label_set_text(w->title, LV_SYMBOL_WARNING " ERROR");
    lv_label_set_text(w->hint, "Fix & reboot");
}

void ui_error_show(ui_error_t* w)
{
    show(w->title); show(w->code); show(w->hint);
}

void ui_error_hide(ui_error_t* w)
{
    hide(w->title); hide(w->code); hide(w->hint);
}

void ui_error_update(ui_error_t* w, uint32_t code)
{
    char buf[24];
    snprintf(buf, sizeof(buf), "Code: %lu", (unsigned long)code);
    lv_label_set_text(w->code, buf);
}

// ======================================================================
// Alert Overlay — full-screen inverted (white bg, black text)
// ======================================================================

void ui_alert_create(ui_alert_t* w, lv_obj_t* scr)
{
    // White background covering full screen
    w->bg = lv_obj_create(scr);
    lv_obj_set_size(w->bg, 128, 32);
    lv_obj_align(w->bg, LV_ALIGN_CENTER, 0, 0);
    lv_obj_set_style_bg_color(w->bg, lv_color_white(), 0);
    lv_obj_set_style_bg_opa(w->bg, LV_OPA_COVER, 0);
    lv_obj_set_style_border_width(w->bg, 0, 0);
    lv_obj_set_style_pad_all(w->bg, 0, 0);
    lv_obj_add_flag(w->bg, LV_OBJ_FLAG_HIDDEN);

    // Primary text — 12pt black, centered upper
    w->line1 = lv_label_create(w->bg);
    lv_obj_set_style_text_font(w->line1, &lv_font_montserrat_12, 0);
    lv_obj_set_style_text_color(w->line1, lv_color_black(), 0);
    lv_obj_set_style_text_align(w->line1, LV_TEXT_ALIGN_CENTER, 0);
    lv_obj_align(w->line1, LV_ALIGN_CENTER, 0, -5);
    lv_label_set_text(w->line1, "");

    // Secondary text — 10pt black, centered lower
    w->line2 = lv_label_create(w->bg);
    lv_obj_set_style_text_font(w->line2, &lv_font_montserrat_10, 0);
    lv_obj_set_style_text_color(w->line2, lv_color_black(), 0);
    lv_obj_set_style_text_align(w->line2, LV_TEXT_ALIGN_CENTER, 0);
    lv_obj_align(w->line2, LV_ALIGN_CENTER, 0, 8);
    lv_label_set_text(w->line2, "");

    w->visible = false;
}

void ui_alert_show(ui_alert_t* w, const char* l1, const char* l2)
{
    if (!w) return;
    lv_label_set_text(w->line1, l1 ? l1 : "");
    lv_label_set_text(w->line2, l2 ? l2 : "");
    lv_obj_clear_flag(w->bg, LV_OBJ_FLAG_HIDDEN);
    lv_obj_move_foreground(w->bg);
    w->visible = true;
}

void ui_alert_hide(ui_alert_t* w)
{
    if (!w) return;
    lv_obj_add_flag(w->bg, LV_OBJ_FLAG_HIDDEN);
    w->visible = false;
}

// ======================================================================
// Utility
// ======================================================================

void ui_format_time(uint32_t ms, char* buf, size_t len)
{
    if (!buf || len == 0) return;
    if (ms < 1000)
        snprintf(buf, len, "%lums", (unsigned long)ms);
    else if (ms < 60000)
        snprintf(buf, len, "%.1fs", ms / 1000.0f);
    else
    {
        uint32_t m = ms / 60000;
        uint32_t s = (ms % 60000) / 1000;
        snprintf(buf, len, "%lum%lus", (unsigned long)m, (unsigned long)s);
    }
}
