#include <esp_log.h>
#include <esp_timer.h>
#include <driver/gpio.h>
#include "config.h"
#include "display_manager.h"
#include "espnow_comm.h"
#include "game_state.h"
#include "hash.h"
#include "task_shared.h"
#include "tasks.h"
#include "utils.h"
#include "ws_server.h"

static const char* TAG = "ProcessingTask";

// Confirmation: require the same valid message to appear multiple times
// to filter out random noise (especially WiFi-induced ADC interference)
#define HIT_CONFIRM_COUNT 2
#define HIT_CONFIRM_WINDOW_MS 500

extern "C" void processing_task(void* pvParameters)
{
    ESP_LOGI(TAG, "Processing task started");
    uint32_t message_bits;

    const DeviceConfig* config = game_state_get_config();

    uint32_t last_valid_msg = 0;
    uint32_t last_valid_time = 0;
    uint8_t  confirm_count = 0;

    while (1)
    {
        if (xQueueReceive(photodiodeMessageQueue, &message_bits, portMAX_DELAY) != pdTRUE)
        {
            continue;
        }

        uint8_t rx_player = 0;
        uint8_t rx_device = 0;
        bool isValid = validateLaserMessage(message_bits, &rx_player, &rx_device);
        
        if (!isValid)
        {
            continue; // Skip invalid messages silently
        }

        if (game_state_is_respawning())
        {
            // Reset confirmation state during respawn
            confirm_count = 0;
            last_valid_msg = 0;
            continue;
        }

        // Confirmation logic: same message must appear HIT_CONFIRM_COUNT times
        uint32_t now_ms = (uint32_t)(esp_timer_get_time() / 1000);
        if (message_bits == last_valid_msg && (now_ms - last_valid_time) < HIT_CONFIRM_WINDOW_MS)
        {
            confirm_count++;
        }
        else
        {
            // New message or window expired — restart confirmation
            last_valid_msg = message_bits;
            last_valid_time = now_ms;
            confirm_count = 1;
        }

        if (confirm_count < HIT_CONFIRM_COUNT)
        {
            continue; // Not yet confirmed
        }

        // Reset so the same laser burst doesn't trigger multiple hits
        confirm_count = 0;
        last_valid_msg = 0;

        // Self-hit check: ignore hits from own player_id
        if (rx_player == config->player_id)
        {
            ESP_LOGD(TAG, "Ignoring self-hit from P:%u", rx_player);
            continue;
        }

        // Roster filter: when connected to server with an active roster,
        // only accept hits from known players. When offline, accept all.
        if (ws_server_is_connected() && game_state_get_player_count() > 0)
        {
            if (game_state_get_player_name(rx_player) == NULL)
            {
                ESP_LOGW(TAG, "Ignoring hit from unknown player P:%u D:%u (not in roster)",
                         rx_player, rx_device);
                continue;
            }
        }

        ESP_LOGI(TAG, "HIT CONFIRMED: Player %u | Device %u", rx_player, rx_device);

        gpio_set_level((gpio_num_t)VIBRATION_PIN, 1);
        vTaskDelay(pdMS_TO_TICKS(VIBRATION_DURATION_MS));
        gpio_set_level((gpio_num_t)VIBRATION_PIN, 0);

        // Record hit (decrements health and starts respawn if needed)
        game_state_record_death();
        game_task_record_hit();

        // Check if player is now respawning (dead)
        const GameStateData* state = game_state_get();
        bool is_dead = game_state_is_respawning();

        // Display notification
        if (is_dead)
        {
            // Player died - show killer info
            dm_event_t killed_evt = {};
            killed_evt.type = DM_EVT_KILLED;
            killed_evt.killed.player_id = rx_player;
            killed_evt.killed.device_id = rx_device;
            display_manager_post(&killed_evt);

            // Start respawn countdown display
            dm_event_t respawn_evt = {};
            respawn_evt.type = DM_EVT_RESPAWN_START;
            respawn_evt.respawn.remaining_ms = game_state_get_game_config()->respawn_cooldown_ms;
            display_manager_post(&respawn_evt);
        }
        else
        {
            // Just hit notification
            dm_event_t hit_evt = {};
            hit_evt.type = DM_EVT_HIT;
            display_manager_post(&hit_evt);
        }

        PlayerMessage hit_msg = {};
        hit_msg.type = ESPNOW_MSG_HIT_EVENT;
        hit_msg.version = 1;
        hit_msg.player_id = rx_player;
        hit_msg.device_id = rx_device;
        hit_msg.team_id = config->team_id;
        hit_msg.color_rgb = config->color_rgb;
        hit_msg.data = message_bits;
        hit_msg.timestamp_ms = (uint32_t)(esp_timer_get_time() / 1000);
        espnow_comm_broadcast(&hit_msg);

        if (ws_server_is_connected())
        {
            ws_server_broadcast_hit("unknown");
        }
    }
}
