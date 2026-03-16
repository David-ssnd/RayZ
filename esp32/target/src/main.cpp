#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include <esp_log.h>
#include <driver/gpio.h>

#include "config.h"
#include "debug_print.h"
#include "display_init.h"
#include "display_manager.h"
#include "game_protocol.h"
#include "game_state.h"
#include "gpio_init.h"
#include "mdns_service.h"
#include "runtime_metrics.h"
#include "task_shared.h"
#include "tasks.h"
#include "wifi_manager.h"
#include "ws_server.h"

static const char* TAG = "Target";

static bool is_ws_connected(void)
{
    return ws_server_client_count() > 0;
}

// Wait for WiFi then start mDNS — avoids race with async wifi_manager_init
static void mdns_start_task(void* pv)
{
    const char* role = (const char*)pv;
    while (!wifi_manager_is_connected())
    {
        vTaskDelay(pdMS_TO_TICKS(500));
    }
    vTaskDelay(pdMS_TO_TICKS(1000));

    const DeviceConfig* config = game_state_get_config();
    if (mdns_service_init(role, config->device_id, config->player_id, 80))
    {
        ESP_LOGI("mDNS", "Service started for auto-discovery (%s)", role);
    }
    else
    {
        ESP_LOGW("mDNS", "Service failed to start (continuing without discovery)");
    }
    vTaskDelete(NULL);
}

// Runtime reset button monitor — posts display events with progress
static void reset_button_task(void* pv)
{
    (void)pv;
    const gpio_num_t pin = (gpio_num_t)RESET_BUTTON_PIN;
    const uint32_t hold_ms = 3000;
    const uint32_t poll_ms = 50;

    for (;;)
    {
        vTaskDelay(pdMS_TO_TICKS(poll_ms));

        if (gpio_get_level(pin) != 0)
            continue;

        // Button pressed — track hold duration
        uint32_t held = 0;
        while (gpio_get_level(pin) == 0 && held < hold_ms)
        {
            held += poll_ms;
            uint8_t pct = (uint8_t)((held * 100) / hold_ms);

            dm_event_t evt = {};
            evt.type = DM_EVT_FACTORY_RESET;
            evt.reset.progress_pct = pct;
            display_manager_post(&evt);

            vTaskDelay(pdMS_TO_TICKS(poll_ms));
        }

        if (held >= hold_ms)
        {
            ESP_LOGW(TAG, "Reset button held for 3s, performing factory reset");
            wifi_manager_factory_reset();
            // Does not return — esp_restart() called
        }
        else
        {
            // Released early — cancel progress bar
            dm_event_t evt = {};
            evt.type = DM_EVT_FACTORY_RESET;
            evt.reset.progress_pct = 0;
            display_manager_post(&evt);
        }
    }
}

extern "C" void app_main(void)
{
    vTaskDelay(pdMS_TO_TICKS(500));

    ESP_LOGI(TAG, "=== RayZ Target Starting ===");

    // Check reset button FIRST, before any NVS operations
    init_reset_button_and_check_factory_reset();

    if (!game_state_init(DEVICE_ROLE_TARGET))
    {
        ESP_LOGE(TAG, "Failed to initialize game state");
        return;
    }
    ESP_LOGI(TAG, "Game state initialized - Device ID: %u", game_state_get_config()->device_id);

    wifi_manager_init("rayz-target", "target");

    gpio_config_t io_conf = {};
    io_conf.intr_type = GPIO_INTR_DISABLE;
    io_conf.mode = GPIO_MODE_OUTPUT;
    io_conf.pin_bit_mask = (1ULL << VIBRATION_PIN);
    io_conf.pull_down_en = GPIO_PULLDOWN_DISABLE;
    io_conf.pull_up_en = GPIO_PULLUP_DISABLE;
    gpio_config(&io_conf);
    gpio_set_level((gpio_num_t)VIBRATION_PIN, 0);

    photodiode.begin();

    if (!init_task_shared())
    {
        ESP_LOGE(TAG, "Failed to create queues or mutex");
        return;
    }

    lv_disp_t* disp = init_display();
    if (!disp)
    {
        ESP_LOGW(TAG, "Display init failed, continuing headless");
    }
    else
    {
        dm_sources_t dm_sources = {
            .wifi_connected = wifi_manager_is_connected,
            .wifi_ip = wifi_manager_get_ip,
            .wifi_ssid = wifi_manager_get_ssid,
            .wifi_status = wifi_manager_get_status_string,
            .wifi_rssi = wifi_manager_get_rssi,
            .uptime_ms = system_uptime_ms,
            .free_heap = system_free_heap,
            .ws_connected = is_ws_connected,
            .device_name = wifi_manager_get_device_name,
            .player_id = metric_player_id,
            .device_id = metric_device_id,
            .ammo = nullptr,
            .last_rx_ms_ago = metric_last_rx_ms_ago,
            .rx_count = metric_rx_count,
            .tx_count = metric_tx_count,
            .hit_count = metric_hit_count,
            .last_hit_ms_ago = metric_last_hit_ms_ago,
            .hearts_remaining = metric_hearts_remaining,
            .max_hearts = metric_max_hearts,
            .score = metric_score,
            .deaths = metric_deaths,
            .respawn_time_left = metric_respawn_time_left,
            .is_respawning = metric_is_respawning,
        };

        if (!display_manager_init(disp, &dm_sources))
        {
            ESP_LOGW(TAG, "Display manager init failed");
        }
        else
        {
            xTaskCreate(display_manager_task, "display_manager", 8192, NULL, 3, NULL);
        }
    }

    debug_print_nvs_contents();

    // mDNS service for auto-discovery (started after WiFi connects)
    xTaskCreate(mdns_start_task, "mdns_init", 4096, (void*)"target", 1, NULL);

    ESP_LOGI(TAG, "Target device ready");

    // Runtime reset button monitor (display progress + factory reset on 3s hold)
    xTaskCreate(reset_button_task, "reset_btn", 4096, NULL, 2, NULL);

    // Only start game tasks if we're in STA mode (connected to WiFi)
    if (wifi_manager_get_boot_mode() != 0)
    {
        xTaskCreate(photodiode_task, "photodiode", 4096, NULL, 5, NULL);
        xTaskCreate(processing_task, "processing", 4096, NULL, 3, NULL);
        xTaskCreate(espnow_task, "espnow", 4096, NULL, 3, NULL);
        xTaskCreate(ws_task, "websocket", 8192, NULL, 2, NULL);
        xTaskCreate(game_task, "game", 4096, NULL, 2, NULL);
        ESP_LOGI(TAG, "All tasks created");
    }
    else
    {
        ESP_LOGI(TAG, "AP provisioning mode — game tasks skipped");
    }
}
