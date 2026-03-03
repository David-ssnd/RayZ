#include "dns_server.h"
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
        case WIFI_REASON_ASSOC_EXPIRE:
            return "assoc expire";
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

// Scan for the target SSID and return the best AP info
static bool find_best_ap(const char* ssid, wifi_ap_record_t* out)
{
    wifi_scan_config_t scan_cfg = {};
    scan_cfg.ssid = (uint8_t*)ssid;
    scan_cfg.show_hidden = false;
    scan_cfg.scan_type = WIFI_SCAN_TYPE_ACTIVE;
    scan_cfg.scan_time.active.min = 100;
    scan_cfg.scan_time.active.max = 300;

    esp_err_t ret = esp_wifi_scan_start(&scan_cfg, true);
    if (ret != ESP_OK)
    {
        ESP_LOGW(TAG, "WiFi scan failed: %s", esp_err_to_name(ret));
        return false;
    }

    uint16_t ap_count = 0;
    esp_wifi_scan_get_ap_num(&ap_count);
    if (ap_count == 0)
    {
        esp_wifi_scan_get_ap_records(&ap_count, NULL); // clean up
        ESP_LOGW(TAG, "Scan found 0 APs matching '%s'", ssid);
        return false;
    }

    uint16_t fetch = ap_count > 8 ? 8 : ap_count;
    wifi_ap_record_t records[8] = {};
    esp_wifi_scan_get_ap_records(&fetch, records);

    // Pick the one with best RSSI
    int best_idx = 0;
    for (int i = 1; i < fetch; i++)
    {
        if (records[i].rssi > records[best_idx].rssi)
            best_idx = i;
    }

    *out = records[best_idx];
    ESP_LOGI(TAG, "Scan: best AP ch=%d rssi=%d auth=%d bssid=" MACSTR,
             out->primary, out->rssi, out->authmode,
             MAC2STR(out->bssid));
    return true;
}

// Relax STA auth config for troublesome connections
static void wifi_relax_auth_config()
{
    wifi_config_t conf = {};
    if (esp_wifi_get_config(WIFI_IF_STA, &conf) == ESP_OK)
    {
        ESP_LOGW(TAG, "Relaxing auth: threshold->OPEN, PMF->off");
        conf.sta.threshold.authmode = WIFI_AUTH_OPEN;
        conf.sta.pmf_cfg.capable = true;
        conf.sta.pmf_cfg.required = false;
        conf.sta.bssid_set = false;
        memset(conf.sta.bssid, 0, 6);
        esp_wifi_set_config(WIFI_IF_STA, &conf);
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

        // On handshake timeout or persistent auth/connection failures, relax auth config
        if (data)
        {
            wifi_event_sta_disconnected_t* ev = (wifi_event_sta_disconnected_t*)data;
            bool is_handshake = (ev->reason == WIFI_REASON_4WAY_HANDSHAKE_TIMEOUT ||
                                 ev->reason == WIFI_REASON_HANDSHAKE_TIMEOUT);
            bool is_auth_or_conn = (ev->reason == WIFI_REASON_AUTH_EXPIRE ||
                                    ev->reason == WIFI_REASON_AUTH_FAIL ||
                                    ev->reason == WIFI_REASON_ASSOC_EXPIRE ||
                                    ev->reason == WIFI_REASON_ASSOC_FAIL ||
                                    ev->reason == 205);

            if (is_handshake || (is_auth_or_conn && s_retry_count >= 4))
            {
                wifi_relax_auth_config();
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

        // Wait before retrying (STA is already disconnected, no need to call esp_wifi_disconnect)
        vTaskDelay(pdMS_TO_TICKS(backoff_ms));
        
        esp_wifi_set_ps(WIFI_PS_NONE);
        esp_err_t cret = esp_wifi_connect();
        if (cret != ESP_OK)
        {
            ESP_LOGE(TAG, "esp_wifi_connect failed: %s, retrying...", esp_err_to_name(cret));
            vTaskDelay(pdMS_TO_TICKS(2000));
            cret = esp_wifi_connect();
            if (cret != ESP_OK)
            {
                ESP_LOGE(TAG, "esp_wifi_connect retry also failed: %s", esp_err_to_name(cret));
            }
        }
    }
    else
    {
        ESP_LOGE(TAG, "WiFi connection failed after %d attempts, restarting...", MAX_RETRY_COUNT);

        ESP_LOGW(TAG, "Restarting WiFi driver with relaxed config...");
        esp_wifi_disconnect();
        esp_wifi_stop();
        vTaskDelay(pdMS_TO_TICKS(2000));
        esp_wifi_start();
        vTaskDelay(pdMS_TO_TICKS(1000));

        // After full failure cycle, relax auth and clear any BSSID lock
        wifi_relax_auth_config();

        esp_wifi_set_ps(WIFI_PS_NONE);
        esp_err_t rret = esp_wifi_connect();
        if (rret != ESP_OK)
        {
            ESP_LOGE(TAG, "esp_wifi_connect after restart failed: %s, retrying...", esp_err_to_name(rret));
            vTaskDelay(pdMS_TO_TICKS(2000));
            esp_wifi_connect();
        }
        s_retry_count = 0;
    }
}

static void on_got_ip(void* arg, esp_event_base_t base, int32_t id, void* data)
{
    // Restore WiFi driver logging now that we're connected
    esp_log_level_set("wifi", ESP_LOG_INFO);

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

static void on_ap_event(void* arg, esp_event_base_t base, int32_t id, void* data)
{
    if (id == WIFI_EVENT_AP_STACONNECTED)
    {
        wifi_event_ap_staconnected_t* ev = (wifi_event_ap_staconnected_t*)data;
        ESP_LOGI(TAG, "Station " MACSTR " joined, AID=%d", MAC2STR(ev->mac), ev->aid);
    }
    else if (id == WIFI_EVENT_AP_STADISCONNECTED)
    {
        wifi_event_ap_stadisconnected_t* ev = (wifi_event_ap_stadisconnected_t*)data;
        ESP_LOGI(TAG, "Station " MACSTR " left, AID=%d", MAC2STR(ev->mac), ev->aid);
    }
    else if (id == WIFI_EVENT_AP_START)
    {
        ESP_LOGI(TAG, "AP started - beaconing active");
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

    // Create AP netif
    s_netif = esp_netif_create_default_wifi_ap();
    if (!s_netif)
    {
        ESP_LOGE(TAG, "Failed to create AP netif");
        return;
    }

    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&cfg));

    // Suppress noisy WiFi warnings in AP mode
    esp_log_level_set("wifi", ESP_LOG_ERROR);

    // Register WiFi event handler before start
    ESP_ERROR_CHECK(esp_event_handler_instance_register(
        WIFI_EVENT, ESP_EVENT_ANY_ID, on_ap_event, NULL, NULL));

    // Build SSID from MAC
    uint8_t mac[6];
    esp_read_mac(mac, ESP_MAC_WIFI_SOFTAP);
    ESP_LOGI(TAG, "SoftAP MAC: %02X:%02X:%02X:%02X:%02X:%02X",
             mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
    char ssid_buf[32];
    snprintf(ssid_buf, sizeof(ssid_buf), "RayZ-%02X%02X%02X", mac[3], mac[4], mac[5]);

    wifi_config_t ap_config = {};
    memcpy(ap_config.ap.ssid, ssid_buf, strlen(ssid_buf));
    ap_config.ap.ssid_len       = strlen(ssid_buf);
    ap_config.ap.channel        = 1;
    ap_config.ap.authmode       = WIFI_AUTH_OPEN;
    ap_config.ap.max_connection = 4;
    ap_config.ap.pmf_cfg.required = false;
    ap_config.ap.beacon_interval = 100;

    // Force 11b/g protocol before start for maximum compatibility
    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_AP));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_AP, &ap_config));
    ESP_ERROR_CHECK(esp_wifi_set_protocol(WIFI_IF_AP, WIFI_PROTOCOL_11B | WIFI_PROTOCOL_11G));
    ESP_ERROR_CHECK(esp_wifi_set_bandwidth(WIFI_IF_AP, WIFI_BW_HT20));
    ESP_ERROR_CHECK(esp_wifi_start());

    // Let the WiFi driver fully initialize beaconing
    vTaskDelay(pdMS_TO_TICKS(500));

    esp_wifi_set_max_tx_power(80); // 20 dBm
    esp_wifi_set_ps(WIFI_PS_NONE);

    // Restore logging
    esp_log_level_set("wifi", ESP_LOG_INFO);

    ESP_LOGI(TAG, "AP started: SSID='%s' ch=%d (open)", ssid_buf, ap_config.ap.channel);
    g_wifi_channel = ap_config.ap.channel;

    // Verification dump
    wifi_config_t verify = {};
    esp_wifi_get_config(WIFI_IF_AP, &verify);
    int8_t txpwr = 0;
    esp_wifi_get_max_tx_power(&txpwr);
    wifi_mode_t wmode;
    esp_wifi_get_mode(&wmode);
    uint8_t proto = 0;
    esp_wifi_get_protocol(WIFI_IF_AP, &proto);
    ESP_LOGI(TAG, "Verify: mode=%d ssid='%s' ch=%d auth=%d hidden=%d txpwr=%d proto=0x%x",
             (int)wmode, (char*)verify.ap.ssid, verify.ap.channel,
             verify.ap.authmode, verify.ap.ssid_hidden, txpwr, proto);

    dns_server_start();
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

    // Suppress noisy internal WiFi driver warnings (restored in on_got_ip)
    esp_log_level_set("wifi", ESP_LOG_ERROR);

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
    sta_config.sta.threshold.authmode = WIFI_AUTH_WPA_WPA2_PSK;
    sta_config.sta.pmf_cfg.capable = true;
    sta_config.sta.pmf_cfg.required = false;
    sta_config.sta.sae_pwe_h2e = WPA3_SAE_PWE_BOTH;
    sta_config.sta.listen_interval = 10;
    sta_config.sta.scan_method = WIFI_ALL_CHANNEL_SCAN;
    sta_config.sta.sort_method = WIFI_CONNECT_AP_BY_SIGNAL;

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

    // Allow WiFi driver to fully initialize before scanning/connecting
    vTaskDelay(pdMS_TO_TICKS(1000));

    // Scan for the target AP to detect its settings and adapt config
    wifi_ap_record_t best = {};
    if (find_best_ap(ssid, &best))
    {
        sta_config.sta.channel = best.primary;
        // Adapt auth threshold to match what the AP actually uses
        if (best.authmode != WIFI_AUTH_OPEN)
        {
            sta_config.sta.threshold.authmode = best.authmode;
        }
        else
        {
            sta_config.sta.threshold.authmode = WIFI_AUTH_OPEN;
        }
        ESP_LOGI(TAG, "Adapted config: ch=%d auth=%d", best.primary, best.authmode);
        esp_wifi_set_config(WIFI_IF_STA, &sta_config);
    }
    else
    {
        ESP_LOGW(TAG, "AP '%s' not seen in scan; connecting blind", ssid);
    }
    
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
