#include "display_manager.h"
#include "display_ui.h"
#include <freertos/FreeRTOS.h>
#include <freertos/queue.h>
#include <freertos/task.h>
#include <lvgl.h>
#include <stdio.h>
#include <string.h>

// ======================================================================
// State machine
// ======================================================================

typedef enum
{
    DM_ST_BOOT = 0,
    DM_ST_CONNECTING,
    DM_ST_WEAPON_IDLE,
    DM_ST_ALERT_HIT,
    DM_ST_ALERT_MSG,
    DM_ST_ALERT_DISCONNECTED,
    DM_ST_ERROR
} dm_state_t;

// ======================================================================
// Static state
// ======================================================================

static QueueHandle_t s_q;
static dm_sources_t  s_src;
static dm_state_t    s_state;
static dm_state_t    s_return_state;
static uint32_t      s_state_until_ms = 0;
static uint32_t      s_last_slow_ms   = 0;
static uint32_t      s_last_fast_ms   = 0;
static uint32_t      s_error_code     = 0;

// Widget groups
static ui_weapon_idle_t s_weapon;
static ui_connecting_t  s_connect;
static ui_boot_t        s_boot;
static ui_error_t       s_error;
static ui_alert_t       s_alert;

// ======================================================================
// Helpers
// ======================================================================

static uint32_t now_ms(void)
{
    return s_src.uptime_ms ? s_src.uptime_ms()
                           : (uint32_t)(xTaskGetTickCount() * portTICK_PERIOD_MS);
}

static void enter_state(dm_state_t st, uint32_t dur_ms)
{
    s_state = st;
    s_state_until_ms = dur_ms ? now_ms() + dur_ms : 0;
}

static void hide_all(void)
{
    ui_weapon_idle_hide(&s_weapon);
    ui_connecting_hide(&s_connect);
    ui_boot_hide(&s_boot);
    ui_error_hide(&s_error);
    ui_alert_hide(&s_alert);
}

static void switch_to_boot(void)      { hide_all(); ui_boot_show(&s_boot); }
static void switch_to_connecting(void) { hide_all(); ui_connecting_show(&s_connect); }
static void switch_to_weapon(void)    { hide_all(); ui_weapon_idle_show(&s_weapon); }
static void switch_to_error(void)
{
    hide_all();
    ui_error_update(&s_error, s_error_code);
    ui_error_show(&s_error);
}

// ======================================================================
// Init
// ======================================================================

static void ui_init(lv_disp_t* disp)
{
    lv_obj_t* scr = lv_disp_get_scr_act(disp);
    lv_obj_set_style_bg_color(scr, lv_color_black(), 0);

    ui_weapon_idle_create(&s_weapon, scr);
    ui_connecting_create(&s_connect, scr);
    ui_boot_create(&s_boot, scr);
    ui_error_create(&s_error, scr);
    ui_alert_create(&s_alert, scr);
}

bool display_manager_init(lv_disp_t* disp, const dm_sources_t* src)
{
    if (!disp || !src) return false;
    s_src = *src;
    s_q = xQueueCreate(8, sizeof(dm_event_t));
    if (!s_q) return false;

    ui_init(disp);
    switch_to_boot();
    enter_state(DM_ST_BOOT, 800);
    return true;
}

bool display_manager_post(const dm_event_t* evt)
{
    if (!s_q || !evt) return false;
    return xQueueSend(s_q, evt, 0) == pdTRUE;
}

// ======================================================================
// Event handler
// ======================================================================

static void handle_event(const dm_event_t* e)
{
    switch (e->type)
    {
    case DM_EVT_ERROR_SET:
        s_error_code = e->err.error_code;
        enter_state(DM_ST_ERROR, 0);
        switch_to_error();
        break;

    case DM_EVT_ERROR_CLEAR:
        s_error_code = 0;
        enter_state(DM_ST_WEAPON_IDLE, 0);
        switch_to_weapon();
        break;

    case DM_EVT_HIT:
        s_return_state = s_state;
        enter_state(DM_ST_ALERT_HIT, 600);
        ui_alert_show(&s_alert, LV_SYMBOL_CHARGE " HIT!", NULL);
        break;

    case DM_EVT_MSG:
        s_return_state = s_state;
        enter_state(DM_ST_ALERT_MSG, 800);
        ui_alert_show(&s_alert, e->msg.text, NULL);
        break;

    case DM_EVT_WIFI_CONNECTED:
        if (s_state == DM_ST_CONNECTING)
        {
            enter_state(DM_ST_WEAPON_IDLE, 0);
            switch_to_weapon();
        }
        break;

    case DM_EVT_WIFI_DISCONNECTED:
        s_return_state = s_state;
        enter_state(DM_ST_ALERT_DISCONNECTED, 0);
        ui_alert_show(&s_alert, LV_SYMBOL_WARNING " NO WiFi", "Reconnecting...");
        break;

    default:
        break;
    }
}

// ======================================================================
// Render helpers
// ======================================================================

static void render_weapon(void)
{
    const int  ammo = s_src.ammo           ? s_src.ammo()           : 0;
    const bool wifi = s_src.wifi_connected ? s_src.wifi_connected() : false;
    const bool ws   = s_src.ws_connected   ? s_src.ws_connected()   : false;
    const int  rssi = s_src.wifi_rssi      ? s_src.wifi_rssi()      : 0;
    const int  pid  = s_src.player_id      ? s_src.player_id()      : 0;
    const int  did  = s_src.device_id      ? s_src.device_id()      : 0;

    ui_weapon_idle_update(&s_weapon, ammo, wifi, ws, rssi, pid, did);
}

static void render_connecting(void)
{
    const char* ssid   = s_src.wifi_ssid  ? s_src.wifi_ssid()   : "?";
    const int   rssi   = s_src.wifi_rssi  ? s_src.wifi_rssi()   : 0;
    const char* status = s_src.wifi_status ? s_src.wifi_status() : "Connecting...";
    ui_connecting_update(&s_connect, ssid, rssi, status);
}

// ======================================================================
// Main display task
// ======================================================================

void display_manager_task(void* pv)
{
    (void)pv;
    for (;;)
    {
        dm_event_t e;
        while (xQueueReceive(s_q, &e, 0) == pdTRUE)
            handle_event(&e);

        const uint32_t t = now_ms();

        // Timed state expiry
        if (s_state_until_ms && t >= s_state_until_ms)
        {
            s_state_until_ms = 0;

            if (s_state == DM_ST_BOOT)
            {
                const bool wifi = s_src.wifi_connected ? s_src.wifi_connected() : false;
                if (wifi)
                {
                    enter_state(DM_ST_WEAPON_IDLE, 0);
                    switch_to_weapon();
                }
                else
                {
                    enter_state(DM_ST_CONNECTING, 0);
                    switch_to_connecting();
                }
            }
            else if (s_state == DM_ST_ALERT_HIT || s_state == DM_ST_ALERT_MSG)
            {
                ui_alert_hide(&s_alert);
                dm_state_t next = (s_return_state == DM_ST_ERROR) ? DM_ST_ERROR : DM_ST_WEAPON_IDLE;
                enter_state(next, 0);
                if (next == DM_ST_ERROR) switch_to_error(); else switch_to_weapon();
            }
        }

        // Auto-transitions
        if (s_state == DM_ST_CONNECTING)
        {
            const bool wifi = s_src.wifi_connected ? s_src.wifi_connected() : false;
            const bool ws   = s_src.ws_connected   ? s_src.ws_connected()   : false;
            if (wifi || ws)
            {
                enter_state(DM_ST_WEAPON_IDLE, 0);
                switch_to_weapon();
            }
        }

        if (s_state == DM_ST_ALERT_DISCONNECTED)
        {
            const bool wifi = s_src.wifi_connected ? s_src.wifi_connected() : false;
            if (wifi)
            {
                ui_alert_hide(&s_alert);
                enter_state(DM_ST_WEAPON_IDLE, 0);
                switch_to_weapon();
            }
        }

        // Periodic rendering
        const bool slow = (t - s_last_slow_ms) >= 1000;
        const bool fast = (t - s_last_fast_ms) >= 100;

        switch (s_state)
        {
        case DM_ST_WEAPON_IDLE:
            if (fast) { render_weapon(); s_last_fast_ms = t; }
            break;

        case DM_ST_CONNECTING:
            if (fast) { render_connecting(); s_last_fast_ms = t; }
            break;

        case DM_ST_ALERT_HIT:
        case DM_ST_ALERT_DISCONNECTED:
            if (fast)
            {
                static bool blink = false;
                blink = !blink;
                if (blink)
                    ui_alert_show(&s_alert,
                        s_state == DM_ST_ALERT_HIT
                            ? LV_SYMBOL_CHARGE " HIT!"
                            : LV_SYMBOL_WARNING " NO WiFi",
                        s_state == DM_ST_ALERT_HIT ? NULL : "Reconnecting...");
                else
                    ui_alert_hide(&s_alert);
                s_last_fast_ms = t;
            }
            break;

        case DM_ST_ERROR:
            if (slow) { switch_to_error(); s_last_slow_ms = t; }
            break;

        default:
            break;
        }

        if (slow) s_last_slow_ms = t;

        lv_timer_handler();
        vTaskDelay(pdMS_TO_TICKS(20));
    }
}
