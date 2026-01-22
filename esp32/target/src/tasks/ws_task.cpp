#include <esp_log.h>
#include "game_state.h"
#include "task_shared.h"
#include "wifi_manager.h"
#include "ws_server.h"

static const char* TAG = "WsTask";

extern "C" void ws_task(void* pvParameters)
{
    ESP_LOGI(TAG, "WebSocket task started");

    while (!wifi_manager_is_connected())
    {
        vTaskDelay(pdMS_TO_TICKS(500));
    }

    ESP_LOGI(TAG, "WiFi connected, WebSocket server already running");

    while (1)
    {
        // Only send status periodically if connected (heartbeat mechanism)
        // Frontend can also request status explicitly via OP_GET_STATUS
        if (ws_server_is_connected() && game_state_heartbeat_due())
        {
            ws_server_send_status();
        }

        if (game_state_check_respawn())
        {
            ws_server_broadcast_respawn();
        }

        vTaskDelay(pdMS_TO_TICKS(5000)); // Check every 5 seconds instead of 1
    }
}
