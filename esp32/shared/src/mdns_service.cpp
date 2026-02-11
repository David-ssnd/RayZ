/**
 * mDNS Service Implementation
 */

#include "mdns_service.h"

#include <esp_log.h>
#include <mdns.h>
#include <string.h>

static const char* TAG = "mDNS";

static char s_instance_name[32] = {0};
static char s_role[16] = {0};
static uint8_t s_device_id = 0;
static uint8_t s_player_id = 0;

bool mdns_service_init(const char* role, uint8_t device_id, uint8_t player_id, uint16_t port)
{
    if (!role) {
        ESP_LOGE(TAG, "Role is NULL");
        return false;
    }

    // Store parameters
    strncpy(s_role, role, sizeof(s_role) - 1);
    s_device_id = device_id;
    s_player_id = player_id;

    // Create instance name: rayz-target-234
    snprintf(s_instance_name, sizeof(s_instance_name), "rayz-%s-%u", role, device_id);

    // Initialize mDNS
    esp_err_t err = mdns_init();
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "mDNS init failed: %s", esp_err_to_name(err));
        return false;
    }

    // Set hostname (used for rayz-target-234.local)
    err = mdns_hostname_set(s_instance_name);
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "Failed to set hostname: %s", esp_err_to_name(err));
        mdns_free();
        return false;
    }

    // Set instance name
    err = mdns_instance_name_set(s_instance_name);
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "Failed to set instance name: %s", esp_err_to_name(err));
        mdns_free();
        return false;
    }

    // Add _rayz._tcp service
    err = mdns_service_add(NULL, "_rayz", "_tcp", port, NULL, 0);
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "Failed to add service: %s", esp_err_to_name(err));
        mdns_free();
        return false;
    }

    // Add TXT records
    mdns_txt_item_t txt_data[] = {
        {"role", s_role},
        {"device", NULL},  // Will be set below
        {"player", NULL},  // Will be set below
        {"version", "1.0.0"}
    };

    // Convert IDs to strings
    char device_id_str[8];
    char player_id_str[8];
    snprintf(device_id_str, sizeof(device_id_str), "%u", device_id);
    snprintf(player_id_str, sizeof(player_id_str), "%u", player_id);
    
    txt_data[1].value = device_id_str;
    txt_data[2].value = player_id_str;

    err = mdns_service_txt_set("_rayz", "_tcp", txt_data, 4);
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "Failed to set TXT records: %s", esp_err_to_name(err));
        // Continue anyway - service is advertised even without TXT
    }

    ESP_LOGI(TAG, "mDNS service started: %s.local (port %u)", s_instance_name, port);
    ESP_LOGI(TAG, "  Role: %s, Device: %u, Player: %u", s_role, device_id, player_id);

    return true;
}

bool mdns_service_update_player(uint8_t player_id)
{
    s_player_id = player_id;

    char device_id_str[8];
    char player_id_str[8];
    snprintf(device_id_str, sizeof(device_id_str), "%u", s_device_id);
    snprintf(player_id_str, sizeof(player_id_str), "%u", player_id);

    mdns_txt_item_t txt_data[] = {
        {"role", s_role},
        {"device", device_id_str},
        {"player", player_id_str},
        {"version", "1.0.0"}
    };

    esp_err_t err = mdns_service_txt_set("_rayz", "_tcp", txt_data, 4);
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "Failed to update TXT records: %s", esp_err_to_name(err));
        return false;
    }

    ESP_LOGI(TAG, "Updated player ID to %u", player_id);
    return true;
}

void mdns_service_deinit(void)
{
    mdns_service_remove("_rayz", "_tcp");
    mdns_free();
    ESP_LOGI(TAG, "mDNS service stopped");
}
