#include <esp_log.h>
#include "espnow_comm.h"
#include "game_state.h"
#include "task_shared.h"
#include "wifi_manager.h"
#include "ws_server.h"

static const char* TAG = "EspNowTask";
static uint8_t s_self_device_id = 0;

static void load_peers_from_nvs(void)
{
    char peers[256] = {0};
    if (wifi_manager_load_peer_list(peers, sizeof(peers)))
    {
        espnow_comm_load_peers_from_csv(peers);
        ESP_LOGI(TAG, "Applied peer list: %s", peers);
    }
}

extern "C" void espnow_task(void* pvParameters)
{
    const DeviceConfig* config = game_state_get_config();
    s_self_device_id = config->device_id;

    while (!wifi_manager_is_connected())
    {
        vTaskDelay(pdMS_TO_TICKS(200));
    }

    EspnowCommConfig cfg = {
        .channel = wifi_manager_get_channel(),
        .prefer_wifi = true,
        .set_pmk = true,
    };

    if (espnow_comm_init(&cfg) != ESP_OK)
    {
        ESP_LOGE(TAG, "Failed to init ESP-NOW");
        vTaskDelete(NULL);
        return;
    }

    load_peers_from_nvs();
    ESP_LOGI(TAG, "ESP-NOW ready on channel %u", wifi_manager_get_channel());

    EspnowMessageEnvelope env;
    while (1)
    {
        if (espnow_comm_receive(&env, pdMS_TO_TICKS(500)))
        {
            if (env.msg.type == ESPNOW_MSG_HIT_EVENT && env.msg.device_id == s_self_device_id)
            {
                game_state_record_hit();
                game_state_record_kill();
                ws_server_broadcast_game_state();
                ESP_LOGI(TAG, "Hit confirmed by peer (%02X:%02X:%02X:%02X:%02X:%02X) data=%u", env.src_mac[0],
                         env.src_mac[1], env.src_mac[2], env.src_mac[3], env.src_mac[4], env.src_mac[5], env.msg.data);
            }
        }
    }
}
