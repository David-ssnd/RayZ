#pragma once

#include <stdbool.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C"
{
#endif

    typedef enum
    {
        DEVICE_ROLE_WEAPON = 0,
        DEVICE_ROLE_TARGET,
        DEVICE_ROLE_COUNT
    } DeviceRole;

    // WebSocket Protocol v2.3 OpCodes
    typedef enum
    {
        // Client -> ESP32
        OP_GET_STATUS = 1,
        OP_HEARTBEAT = 2,
        OP_CONFIG_UPDATE = 3,
        OP_GAME_COMMAND = 4,
        OP_HIT_FORWARD = 5,
        OP_KILL_CONFIRMED = 6,
        OP_REMOTE_SOUND = 7,

        // ESP32 -> Client
        OP_STATUS = 10,
        OP_HEARTBEAT_ACK = 11,
        OP_SHOT_FIRED = 12,
        OP_HIT_REPORT = 13,
        OP_RESPAWN = 14,
        OP_RELOAD_EVENT = 15,
        OP_GAME_OVER = 16,
        OP_GAME_STATE_UPDATE = 17,
        OP_ACK = 20
    } OpCode;

    typedef enum
    {
        CMD_STOP = 0,
        CMD_START = 1,
        CMD_RESET = 2,
        CMD_PAUSE = 3,
        CMD_UNPAUSE = 4,
        CMD_EXTEND_TIME = 5,
        CMD_UPDATE_TARGET = 6
    } GameCommandType;

    typedef struct
    {
        uint8_t device_id;  // unique per device
        uint8_t player_id;  // unique per player (may equal device_id)
        uint8_t team_id;    // 0 = no team
        uint32_t color_rgb; // 0xRRGGBB
        DeviceRole role;
        char device_name[32]; // Device display name (e.g., "Player 1 - Target")
    } DeviceConfig;

    typedef struct
    {
        // Win Conditions
        char win_type[24];       // "time", "score", "last_man_standing"
        uint16_t target_score;   // Used when win_type = "score"
        uint16_t time_limit_s;   // Used when win_type = "time"

        // Health (used only when win_type = "last_man_standing")
        uint8_t max_hearts;
        uint8_t spawn_hearts;
        uint32_t respawn_cooldown_ms;
        uint16_t invulnerability_ms;
        uint8_t damage_in;       // Damage multiplier received
        uint8_t damage_out;      // Damage multiplier dealt

        // Legacy scoring fields
        uint8_t kill_score;
        uint8_t hit_score;
        uint8_t assist_score;
        uint16_t score_to_win;   // Deprecated: use target_score

        // Game mechanics
        bool overtime_enabled;
        bool sudden_death;

        // Ammo
        uint16_t max_ammo;
        uint8_t mag_capacity;
        uint16_t reload_time_ms;
        uint16_t shot_rate_limit_ms;

        // Team rules
        bool team_play;
        bool friendly_fire_enabled;
        bool unlimited_ammo;
        bool unlimited_respawn;

        // Misc
        bool random_teams_on_start;
        bool hit_sound_enabled;
    } GameConfig;

    typedef struct
    {
        uint32_t shots_fired;
        uint32_t hits_landed;
        uint32_t kills;
        uint32_t deaths;
        uint32_t friendly_fire_count;
        uint32_t rx_count;
        uint32_t tx_count;
        uint32_t last_rx_ms;

        uint8_t hearts_remaining;
        bool respawning;
        uint32_t respawn_end_time_ms;

        uint32_t game_start_time_ms;
        uint32_t game_end_time_ms;      // Set when game should end (for "time" mode)
        uint32_t pause_time_ms;         // When game was paused (for adjusting end time)
        bool game_running;              // True when game is active
        bool game_paused;               // True when game is paused
        bool game_over;                 // True when win condition met
        uint32_t player_score;          // Current score (kills * kill_score + hits * hit_score)
        
        uint32_t last_heartbeat_ms;
        bool server_connected;
    } GameStateData;

#ifdef __cplusplus
}
#endif
