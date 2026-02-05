#include "http_api.h"
#include "nvs_store.h"
#include "wifi_internal.h"
#include "ws_server.h"

#include <esp_err.h>
#include <esp_event.h>
#include <esp_log.h>
#include <esp_netif.h>
#include <esp_wifi.h>
#include <esp_mac.h>
#include <string.h>
#include <string>

// Coexistence API availability depends on chip and IDF version
#if CONFIG_IDF_TARGET_ESP32 || CONFIG_IDF_TARGET_ESP32C3 || CONFIG_IDF_TARGET_ESP32S2
#include <esp_coexist.h>
#define HAS_COEX_PREFERENCE 1
#elif CONFIG_IDF_TARGET_ESP32S3 || CONFIG_IDF_TARGET_ESP32C6
// ESP32-S3 and newer chips might use different coex API or it's not available
#define HAS_COEX_PREFERENCE 0
#endif

static const char* TAG = "WiFiCore";

// Retry tracking
static int s_retry_count = 0;
static const int MAX_RETRY_COUNT = 15;
static esp_netif_t* s_netif = NULL;

static const char* reason_to_str(int reason)
{
    switch (reason)
    {
        case WIFI_REASON_AUTH_EXPIRE:
            return "auth expire";
        case WIFI_REASON_AUTH_FAIL:
            return "auth fail";
        case WIFI_REASON_ASSOC_LEAVE:
            return "assoc leave";
        case WIFI_REASON_BEACON_TIMEOUT:
            return "beacon timeout";
        case WIFI_REASON_NO_AP_FOUND:
            return "no ap found";
        case WIFI_REASON_ASSOC_FAIL:
            return "assoc fail";
        case WIFI_REASON_4WAY_HANDSHAKE_TIMEOUT:
            return "4-way handshake timeout";
        case WIFI_REASON_HANDSHAKE_TIMEOUT:
            return "handshake timeout";
        case WIFI_REASON_MIC_FAILURE:
            return "MIC failure";
        case 205:
            return "connection failed";
        default:
            return "other";
    }
}

static void on_wifi_disconnect(void* arg, esp_event_base_t base, int32_t id, void* data)
{
    if (g_wifi_events)
    {
        xEventGroupClearBits(g_wifi_events, WIFI_EVENT_STA_CONNECTED_BIT);
    }

    if (data)
    {
        wifi_event_sta_disconnected_t* ev = (wifi_event_sta_disconnected_t*)data;
        ESP_LOGW(TAG, "WiFi disconnected: reason=%d (%s)", ev->reason, reason_to_str(ev->reason));
    }

    s_retry_count++;
    if (s_retry_count < MAX_RETRY_COUNT)
    {
        ESP_LOGW(TAG, "WiFi disconnected, retry %d/%d...", s_retry_count, MAX_RETRY_COUNT);

        // Try clearing BSSID lock early if we are having trouble
        if (s_retry_count == 3)
        {
            wifi_config_t conf = {};
            if (esp_wifi_get_config(WIFI_IF_STA, &conf) == ESP_OK)
            {
                if (conf.sta.bssid_set)
                {
                    ESP_LOGW(TAG, "Clearing BSSID lock early to allow roaming");
                    conf.sta.bssid_set = false;
                    memset(conf.sta.bssid, 0, 6);
                    esp_wifi_set_config(WIFI_IF_STA, &conf);
                }
            }
        }

        // Exponential backoff: 1s, 2s, 3s, 5s, 5s, ...
        int backoff_ms = 1000;
        if (s_retry_count == 1)
            backoff_ms = 1000;
        else if (s_retry_count == 2)
            backoff_ms = 2000;
        else if (s_retry_count == 3)
            backoff_ms = 3000;
        else
            backoff_ms = 5000;
        vTaskDelay(pdMS_TO_TICKS(backoff_ms));
        
        // On handshake timeout, try adjusting WiFi config
        if (data)
        {
            wifi_event_sta_disconnected_t* ev = (wifi_event_sta_disconnected_t*)data;
            if (ev->reason == WIFI_REASON_4WAY_HANDSHAKE_TIMEOUT || ev->reason == WIFI_REASON_HANDSHAKE_TIMEOUT)
            {
                ESP_LOGW(TAG, "Handshake timeout - adjusting auth mode");
                wifi_config_t conf = {};
                if (esp_wifi_get_config(WIFI_IF_STA, &conf) == ESP_OK)
                {
                    // Try more permissive auth mode
                    conf.sta.threshold.authmode = WIFI_AUTH_OPEN;
                    conf.sta.pmf_cfg.required = false;
                    esp_wifi_set_config(WIFI_IF_STA, &conf);
                }
            }
        }
        
        esp_wifi_set_ps(WIFI_PS_NONE); // Disable power saving before reconnect
        esp_err_t cret = esp_wifi_connect();
        if (cret != ESP_OK)
        {
            ESP_LOGE(TAG, "esp_wifi_connect failed: %s", esp_err_to_name(cret));
        }
    }
    else
    {
        ESP_LOGE(TAG, "WiFi connection failed after %d attempts. Check credentials.", MAX_RETRY_COUNT);

        // Try clearing BSSID lock if we were stuck on a specific AP
        wifi_config_t conf = {};
        if (esp_wifi_get_config(WIFI_IF_STA, &conf) == ESP_OK)
        {
            if (conf.sta.bssid_set)
            {
                ESP_LOGW(TAG, "Clearing BSSID lock to allow roaming for next attempt");
                conf.sta.bssid_set = false;
                memset(conf.sta.bssid, 0, 6);
                esp_wifi_set_config(WIFI_IF_STA, &conf);
            }
        }

        ESP_LOGW(TAG, "Restarting WiFi driver...");
        esp_wifi_stop();
        vTaskDelay(pdMS_TO_TICKS(500));
        esp_wifi_start();
        // Force scan of all channels by ensuring config is flexible?
        // esp_wifi_connect() uses current config.

        esp_wifi_set_ps(WIFI_PS_NONE);
        esp_wifi_connect();
        s_retry_count = 0;
    }
}

static void on_got_ip(void* arg, esp_event_base_t base, int32_t id, void* data)
{
    ip_event_got_ip_t* event = (ip_event_got_ip_t*)data;
    snprintf(g_wifi_ip, sizeof(g_wifi_ip), IPSTR, IP2STR(&event->ip_info.ip));
    ESP_LOGI(TAG, "Got IP: %s", g_wifi_ip);
    s_retry_count = 0; // Reset retry count on successful connection
    if (g_wifi_events)
    {
        xEventGroupSetBits(g_wifi_events, WIFI_EVENT_STA_CONNECTED_BIT);
    }
    esp_wifi_set_ps(WIFI_PS_NONE);
    wifi_start_http_server(false);
    http_api_start(g_httpd);
    ws_server_register(g_httpd);

    // Lock Wi-Fi channel to AP channel for ESP-NOW coexistence
    wifi_ap_record_t ap_info = {};
    if (esp_wifi_sta_get_ap_info(&ap_info) == ESP_OK)
    {
        g_wifi_channel = ap_info.primary;
        esp_err_t chret = esp_wifi_set_channel(g_wifi_channel, ap_info.second);
        if (chret == ESP_OK)
        {
            ESP_LOGI(TAG, "Locked channel to %u for ESP-NOW", g_wifi_channel);
        }
        else
        {
            ESP_LOGW(TAG, "Failed to lock channel: %s", esp_err_to_name(chret));
        }
    }
}

void wifi_start_ap()
{
    ESP_LOGI(TAG, "Starting AP provisioning mode");
    g_wifi_boot_mode = WIFI_BOOT_PROVISIONING;
    s_retry_count = 0;

    // Clean up any existing netif
    if (s_netif)
    {
        esp_netif_destroy(s_netif);
        s_netif = NULL;
    }

    s_netif = esp_netif_create_default_wifi_ap();
    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    esp_err_t ret = esp_wifi_init(&cfg);
    if (ret != ESP_OK)
    {
        ESP_LOGE(TAG, "esp_wifi_init failed: %s", esp_err_to_name(ret));
        return;
    }

    ret = esp_wifi_set_mode(WIFI_MODE_AP);
    if (ret != ESP_OK)
    {
        ESP_LOGE(TAG, "esp_wifi_set_mode(AP) failed: %s", esp_err_to_name(ret));
        return;
    }

    wifi_country_t country = {};
    memcpy(country.cc, WIFI_COUNTRY_CODE, sizeof(country.cc));
    country.schan = 1;
    country.nchan = 13;
    country.policy = WIFI_COUNTRY_POLICY_MANUAL;

    esp_wifi_set_country(&country);
    esp_wifi_set_max_tx_power(78); // ~19.5 dBm
    esp_wifi_set_ps(WIFI_PS_NONE);
    esp_wifi_set_protocol(WIFI_IF_AP, WIFI_PROTOCOL_11B | WIFI_PROTOCOL_11G | WIFI_PROTOCOL_11N);

    // Scanning requires station mode and started driver. Since we are in AP setup, just default to 1.
    uint8_t ch = 1;

    wifi_config_t ap_config = {};
    uint8_t mac[6];
    esp_read_mac(mac, ESP_MAC_WIFI_STA);
    char ssid_buf[32];
    snprintf(ssid_buf, sizeof(ssid_buf), "RayZ-%02X%02X%02X", mac[3], mac[4], mac[5]);
    strcpy((char*)ap_config.ap.ssid, ssid_buf);
    ap_config.ap.ssid_len = strlen(ssid_buf);
    ap_config.ap.channel = ch;
    ap_config.ap.authmode = WIFI_AUTH_OPEN;
    ap_config.ap.max_connection = 4;
    ret = esp_wifi_set_config(WIFI_IF_AP, &ap_config);
    if (ret != ESP_OK)
    {
        ESP_LOGE(TAG, "esp_wifi_set_config(AP) failed: %s", esp_err_to_name(ret));
        return;
    }

    ret = esp_wifi_start();
    if (ret != ESP_OK)
    {
        ESP_LOGE(TAG, "esp_wifi_start(AP) failed: %s", esp_err_to_name(ret));
        return;
    }

    ESP_LOGI(TAG, "AP mode started, SSID=%s", ssid_buf);
    g_wifi_channel = ap_config.ap.channel;
    esp_wifi_set_ps(WIFI_PS_NONE);

    wifi_start_http_server(true);
}

void wifi_start_sta(const char* ssid, const char* pass)
{
    g_wifi_boot_mode = WIFI_BOOT_STA;
    s_retry_count = 0;
    ESP_LOGI(TAG, "Starting STA mode SSID=%s, PASSCODE=%s", ssid, pass);

    // Clean up any existing netif
    if (s_netif)
    {
        esp_netif_destroy(s_netif);
        s_netif = NULL;
    }

    s_netif = esp_netif_create_default_wifi_sta();
    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    esp_err_t ret = esp_wifi_init(&cfg);
    if (ret != ESP_OK)
    {
        ESP_LOGE(TAG, "esp_wifi_init failed: %s", esp_err_to_name(ret));
        return;
    }

    // Register event handlers for connection management
    esp_err_t hret =
        esp_event_handler_instance_register(WIFI_EVENT, WIFI_EVENT_STA_DISCONNECTED, on_wifi_disconnect, NULL, NULL);
    if (hret != ESP_OK)
    {
        ESP_LOGE(TAG, "Failed to register WIFI_EVENT handler: %s", esp_err_to_name(hret));
    }
    hret = esp_event_handler_instance_register(IP_EVENT, IP_EVENT_STA_GOT_IP, on_got_ip, NULL, NULL);
    if (hret != ESP_OK)
    {
        ESP_LOGE(TAG, "Failed to register IP_EVENT handler: %s", esp_err_to_name(hret));
    }

    ret = esp_wifi_set_mode(WIFI_MODE_STA);
    if (ret != ESP_OK)
    {
        ESP_LOGE(TAG, "esp_wifi_set_mode(STA) failed: %s", esp_err_to_name(ret));
        return;
    }

#if HAS_COEX_PREFERENCE
    esp_coex_preference_set(ESP_COEX_PREFER_WIFI);
#endif

    wifi_config_t sta_config = {};
    strncpy((char*)sta_config.sta.ssid, ssid, sizeof(sta_config.sta.ssid));
    strncpy((char*)sta_config.sta.password, pass, sizeof(sta_config.sta.password));
    sta_config.sta.bssid_set = false;
    memset(sta_config.sta.bssid, 0, 6);
    sta_config.sta.threshold.authmode = WIFI_AUTH_WPA_PSK; // Allow WPA/WPA2/WPA3
    sta_config.sta.pmf_cfg.capable = true;
    sta_config.sta.pmf_cfg.required = false;
    sta_config.sta.sae_pwe_h2e = WPA3_SAE_PWE_BOTH;
    sta_config.sta.listen_interval = 10; // Increased from 3 to avoid beacon timeouts
    sta_config.sta.scan_method = WIFI_ALL_CHANNEL_SCAN;
    sta_config.sta.sort_method = WIFI_CONNECT_AP_BY_SIGNAL; // Connect to strongest AP

    /*
    wifi_ap_record_t best = {};
    if (find_best_ap(ssid, &best))
    {
        sta_config.sta.channel = best.primary;
        memcpy(sta_config.sta.bssid, best.bssid, sizeof(best.bssid));
        sta_config.sta.bssid_set = true;
        ESP_LOGI(TAG, "Best AP found ch=%d rssi=%d bssid=%02X:%02X:%02X:%02X:%02X:%02X", best.primary, best.rssi,
                 best.bssid[0], best.bssid[1], best.bssid[2], best.bssid[3], best.bssid[4], best.bssid[5]);
    }
    else
    {
        ESP_LOGW(TAG, "AP '%s' not seen in scan; connecting blind", ssid);
    }
    */
    
    ret = esp_wifi_set_config(WIFI_IF_STA, &sta_config);
    if (ret != ESP_OK)
    {
        ESP_LOGE(TAG, "esp_wifi_set_config(STA) failed: %s", esp_err_to_name(ret));
        return;
    }

    ret = esp_wifi_start();
    if (ret != ESP_OK)
    {
        ESP_LOGE(TAG, "esp_wifi_start(STA) failed: %s", esp_err_to_name(ret));
        return;
    }

    // Allow WiFi driver to fully initialize before connecting
    vTaskDelay(pdMS_TO_TICKS(500));
    
    // Non-blocking connect - will retry asynchronously via event handler
    esp_wifi_set_ps(WIFI_PS_NONE); // Disable power saving before connect
    ret = esp_wifi_connect();
    if (ret != ESP_OK)
    {
        ESP_LOGE(TAG, "esp_wifi_connect failed: %s", esp_err_to_name(ret));
    }
    ESP_LOGI(TAG, "WiFi connect initiated (non-blocking)");
}

void wifi_evaluate_boot_mode()
{
    char ssid[WIFI_MAX_SSID_LEN] = {0};
    char pass[WIFI_MAX_PASS_LEN] = {0};
    bool have = nvs_store_read_str(NVS_NS_WIFI, NVS_KEY_SSID, ssid, sizeof(ssid));

    if (have && strlen(ssid) > 0)
    {
        ESP_LOGI(TAG, "Found saved WiFi credentials, connecting to: %s", ssid);
        nvs_store_read_str(NVS_NS_WIFI, NVS_KEY_PASS, pass, sizeof(pass));
        wifi_start_sta(ssid, pass);
        if (g_wifi_events)
        {
            xEventGroupSetBits(g_wifi_events, WIFI_EVENT_PROVISIONED_BIT);
        }
    }
    else
    {
        ESP_LOGI(TAG, "No saved WiFi credentials found, starting AP mode");
        wifi_start_ap();
    }
}
