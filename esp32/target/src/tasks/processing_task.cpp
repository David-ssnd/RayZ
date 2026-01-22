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

extern "C" void processing_task(void* pvParameters)
{
    ESP_LOGI(TAG, "Processing task started");
    uint32_t message_bits;

    const DeviceConfig* config = game_state_get_config();

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
            continue;
        }

        if (game_state_is_respawning())
        {
            continue;
        }

        bool matchesExpected = false;
        uint16_t correctSnapshot = correct_messages;
        uint16_t allSnapshot = all_expected_messages;
        uint16_t notExpectedSnapshot = not_expected_messages;
        float accuracy = 0.0f;

        if (xSemaphoreTake(statsMutex, portMAX_DELAY) == pdTRUE)
        {
            if (hasExpectedMessage && (xTaskGetTickCount() - last_expected_update) < pdMS_TO_TICKS(5000))
            {
                matchesExpected = (message_bits == expectedMessage);
                if (matchesExpected)
                {
                    correct_messages++;
                }
                else
                {
                    not_expected_messages++;
                }
            }

            correctSnapshot = correct_messages;
            allSnapshot = all_expected_messages;
            notExpectedSnapshot = not_expected_messages;
            accuracy = (allSnapshot > 0) ? (correctSnapshot * 100.0f / allSnapshot) : 0.0f;

            xSemaphoreGive(statsMutex);
        }

        ESP_LOGI(TAG, "[Laser] %lu ms | %s | P:%u D:%u | Sig: %.3fV | Thr: %.4fV | %s",
                 pdTICKS_TO_MS(xTaskGetTickCount()), toBinaryString(message_bits, MESSAGE_TOTAL_BITS).c_str(),
                 rx_player, rx_device, photodiode.getSignalStrength(), photodiode.getDynamicThreshold(),
                 matchesExpected ? "MATCH" : "MISMATCH");

        ESP_LOGI(TAG, "Stats: %u/%u | Incorrect: %u | Not Expected: %u | Accuracy: %.2f%%", correctSnapshot,
                 allSnapshot, allSnapshot - correctSnapshot, notExpectedSnapshot, accuracy);

        if (isValid && matchesExpected)
        {
            gpio_set_level((gpio_num_t)VIBRATION_PIN, 1);
            vTaskDelay(pdMS_TO_TICKS(VIBRATION_DURATION_MS));
            gpio_set_level((gpio_num_t)VIBRATION_PIN, 0);

            game_state_record_death();
            game_task_record_hit();

            // Display hit notification
            dm_event_t hit_evt = {};
            hit_evt.type = DM_EVT_HIT;
            display_manager_post(&hit_evt);

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
                ESP_LOGI(TAG, "Hit reported to connected browsers");
            }
        }
    }
}
