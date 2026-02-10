#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include <esp_log.h>
#include <esp_timer.h>
#include "game_protocol.h"
#include "game_state.h"
#include "tasks.h"
#include "ws_server.h"

static const char* TAG = "GameTask";

// Track hits locally for display
static uint32_t s_hit_count = 0;
static uint32_t s_last_hit_ms = 0;

int metric_hit_count(void)
{
    return (int)s_hit_count;
}

uint32_t metric_last_hit_ms_ago(void)
{
    if (s_last_hit_ms == 0)
        return UINT32_MAX;
    return (uint32_t)(esp_timer_get_time() / 1000) - s_last_hit_ms;
}

int metric_hearts_remaining(void)
{
    return (int)game_state_get()->hearts_remaining;
}

int metric_max_hearts(void)
{
    return (int)game_state_get_game_config()->max_hearts;
}

int metric_score(void)
{
    return (int)game_state_get()->kills;
}

int metric_deaths(void)
{
    return (int)game_state_get()->deaths;
}

uint32_t metric_respawn_time_left(void)
{
    if (!game_state_is_respawning())
        return 0;
    const GameStateData* state = game_state_get();
    uint32_t now = (uint32_t)(esp_timer_get_time() / 1000);
    if (now < state->respawn_end_time_ms)
        return state->respawn_end_time_ms - now;
    return 0;
}

bool metric_is_respawning(void)
{
    return game_state_is_respawning();
}

extern "C" void game_task_record_hit(void)
{
    s_hit_count++;
    s_last_hit_ms = (uint32_t)(esp_timer_get_time() / 1000);
}

extern "C" void game_task(void* pvParameters)
{
    ESP_LOGI(TAG, "Game task started");

    while (1)
    {
        // Check win conditions and update game state
        game_state_tick();
        
        const GameStateData* state = game_state_get();
        if (game_state_is_respawning())
        {
            if (game_state_check_respawn())
            {
                ESP_LOGI(TAG, "Respawn complete - ready to receive hits!");
            }
            else
            {
                vTaskDelay(pdMS_TO_TICKS(100));
                continue;
            }
        }

        static uint32_t last_log = 0;
        uint32_t now = xTaskGetTickCount() / configTICK_RATE_HZ;
        if (now - last_log >= 30)
        {
            ESP_LOGI(TAG, "Stats | Deaths: %lu | Hits Received: %u | Hearts: %u", (unsigned long)state->deaths,
                     s_hit_count, (unsigned)state->hearts_remaining);
            last_log = now;
        }

        vTaskDelay(pdMS_TO_TICKS(100));
    }
}
