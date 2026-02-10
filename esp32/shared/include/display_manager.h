#pragma once
#include <lvgl.h>
#include <stdbool.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C"
{
#endif

    typedef enum
    {
        DM_EVT_NONE = 0,
        DM_EVT_HIT,
        DM_EVT_MSG,
        DM_EVT_ERROR_SET,
        DM_EVT_ERROR_CLEAR,
        DM_EVT_KILLED,
        DM_EVT_KILL,
        DM_EVT_RESPAWN_START,
        DM_EVT_RESPAWN_COMPLETE,
        DM_EVT_WIFI_CONNECTED,
        DM_EVT_WIFI_DISCONNECTED,
        DM_EVT_HEALTH_UPDATE,
        DM_EVT_SCORE_UPDATE
    } dm_event_type_t;

    typedef struct
    {
        dm_event_type_t type;
        union
        {
            struct
            {
                uint32_t error_code;
            } err;
            struct
            {
                char text[24];
            } msg;
            struct
            {
                uint8_t player_id;
                uint8_t device_id;
            } killed;
            struct
            {
                uint8_t player_id;
                uint8_t device_id;
            } kill;
            struct
            {
                uint32_t remaining_ms;
            } respawn;
            struct
            {
                uint8_t hearts;
                uint8_t max_hearts;
            } health;
            struct
            {
                uint32_t score;
                uint32_t deaths;
            } score;
        };
    } dm_event_t;

    typedef struct
    {
        // "pull" callbacks so DM doesn't depend on your modules directly
        bool (*wifi_connected)(void);
        const char* (*wifi_ip)(void);
        const char* (*wifi_ssid)(void);
        const char* (*wifi_status)(void);
        int (*wifi_rssi)(void);

        uint32_t (*uptime_ms)(void);
        uint32_t (*free_heap)(void);

        bool (*ws_connected)(void);
        const char* (*device_name)(void);

        // optional game data
        int (*player_id)(void);
        int (*device_id)(void);
        int (*ammo)(void);
        uint32_t (*last_rx_ms_ago)(void);
        uint32_t (*rx_count)(void);
        uint32_t (*tx_count)(void);

        // target-specific
        int (*hit_count)(void);
        uint32_t (*last_hit_ms_ago)(void);

        // game state info
        int (*hearts_remaining)(void);
        int (*max_hearts)(void);
        int (*score)(void);
        int (*deaths)(void);
        uint32_t (*respawn_time_left)(void);
        bool (*is_respawning)(void);
    } dm_sources_t;

    bool display_manager_init(lv_disp_t* disp, const dm_sources_t* src);
    bool display_manager_post(const dm_event_t* evt);
    void display_manager_task(void* pv); // pin to a core like your other tasks

#ifdef __cplusplus
}
#endif
