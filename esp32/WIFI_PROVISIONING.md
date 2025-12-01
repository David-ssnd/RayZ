# Wi-Fi Provisioning & LAN Control API

## Overview

Both **target** and **weapon** firmware now include Wi-Fi provisioning and LAN control capabilities via the `shared` component.

## Boot Flow

### First Boot (No Credentials)

1. ESP32 starts in **AP mode**
   - SSID: `RayZ-Setup`
   - Password: None (open network)
   - IP: `192.168.4.1`

2. Connect to `RayZ-Setup` with phone/laptop

3. Open browser: `http://192.168.4.1`

4. Fill provisioning form:
   - **SSID**: Your Wi-Fi network
   - **Password**: Wi-Fi password
   - **Device Name**: e.g., `rayz-target-01`
   - **Role**: `weapon` or `target`

5. Submit → device stores credentials to **NVS** and restarts in **STA mode**

### Normal Boot (Credentials Stored)

1. ESP32 connects to configured Wi-Fi automatically
2. Obtains IP via DHCP (e.g., `192.168.1.57`)
3. IP address logged to serial monitor:
   ```
   [WiFiMgr] Got IP: 192.168.1.57
   ```
4. HTTP server starts on port `80`

## HTTP Endpoints

### `GET /`
- **Provisioning mode**: Configuration form
- **STA mode**: Status page

### `POST /config`
- **Provisioning mode only**
- Form data: `ssid=...&pass=...&name=...&role=...`
- Stores to NVS and triggers STA connect

### `GET /api/status`
Returns JSON:
```json
{
  "wifi": true,
  "ip": "192.168.1.57"
}
```

### `GET /ws`
- WebSocket endpoint (currently stub)
- Future: real-time event streaming (hit, ammo, battery)

## Code Integration

### Initialization

Both `target/src/main.cpp` and `weapon/src/main.cpp` call:

```cpp
#include "wifi_manager.h"

extern "C" void app_main(void) {
    wifi_manager_init("rayz-device", "target"); // or "weapon"
    // ... rest of setup
}
```

### Event Group

Wait for Wi-Fi connection before starting network-dependent tasks:

```cpp
EventGroupHandle_t eg = wifi_manager_event_group();
xEventGroupWaitBits(eg, WIFI_EVENT_STA_CONNECTED_BIT, pdFALSE, pdTRUE, portMAX_DELAY);
// Now connected, safe to use HTTP/WebSocket
```

### Get IP Address

```cpp
const char* ip = wifi_manager_get_ip();
ESP_LOGI(TAG, "Device IP: %s", ip);
```

### Factory Reset

```cpp
wifi_manager_factory_reset(); // Erases NVS, restarts in AP mode
```

## Web Dashboard Integration

1. **Provision device** via `RayZ-Setup` AP
2. Note the assigned IP from serial monitor
3. In your web dashboard (PC/tablet):
   - Add device with IP `192.168.1.57`
   - Poll `GET /api/status` for health checks
   - Future: Open WebSocket to `/ws` for events

## NVS Keys

Namespace: `wifi`

| Key    | Value                |
|--------|----------------------|
| `ssid` | Wi-Fi SSID           |
| `pass` | Wi-Fi password       |
| `name` | Device name          |
| `role` | `weapon` or `target` |

## Build & Upload

```powershell
# Target
cd target
pio run -t upload
pio device monitor

# Weapon
cd weapon
pio run -t upload
pio device monitor
```

## Troubleshooting

### Device stuck in AP mode
- Serial log will show: `[WiFiMgr] Starting AP provisioning mode`
- Connect to `RayZ-Setup` and re-enter credentials

### Cannot connect to configured Wi-Fi
- Check SSID/password correctness
- Use `wifi_manager_factory_reset()` to erase and retry

### WebSocket not working
- Current implementation is a stub
- Full WebSocket requires ESP-IDF 5.x `httpd_ws_send_frame` APIs (future enhancement)

## Future Enhancements

- [ ] Full WebSocket bidirectional messaging
- [ ] Captive portal (auto-redirect in AP mode)
- [ ] GPIO long-press factory reset
- [ ] mDNS / DNS-SD for auto-discovery
- [ ] HTTPS (certificates in NVS)
- [ ] OTA firmware updates via HTTP
