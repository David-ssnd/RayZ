# RayZ ESP32 - AI Coding Agent Instructions

## Project Overview

RayZ is a **laser tag system** using ESP32 microcontrollers with **optical communication** (laser + photodiode) synchronized via **BLE**. This is an **ESP-IDF FreeRTOS** project (not Arduino) using **PlatformIO**.

**Architecture:**
- **Target Device** (ESP32): Receives laser messages via photodiode, validates them against BLE-synchronized expected messages
- **Weapon Device** (ESP32-C3): Sends laser messages and broadcasts them via BLE
- **Shared Component**: ESP-IDF component library with protocol definitions and BLE abstractions

## Critical Build System Knowledge

### Unified Build Structure

This is a **monorepo** with **two firmware environments** in one PlatformIO project:

```ini
[platformio]
default_envs = target

[env:target]
board = esp32dev
build_src_filter = +<target/> -<weapon/>
upload_port = COM3

[env:weapon]
board = esp32-c3-devkitm-1
build_src_filter = +<weapon/> -<target/>
upload_port = COM7
```

**Build commands:**
```powershell
pio run -e target          # Build target only
pio run -e weapon          # Build weapon only
pio run -e target -t upload
pio device monitor -e target
```

**Use VS Code tasks** (not manual commands) for development:
- "Upload and Monitor Both Devices" - uploads to both, monitors both in parallel
- "Monitor Target" / "Monitor Weapon" - serial monitors
- Check `.vscode/tasks.json` or use `run_task` tool

### ESP-IDF Component System

The `shared/` directory is an **ESP-IDF component** referenced via:
```ini
board_build.extra_component_dirs = shared
```

- Headers: `#include <shared/protocol_config.h>` (angle brackets, not quotes)
- Component registration: `shared/CMakeLists.txt` registers sources/includes
- Always rebuild both environments after changing shared code

### Version Generation

`extra_script.py` auto-generates `include/version.h` from build flags:
```ini
build_flags = -DRAYZ_VERSION=\"1.0.0\"
```
Never edit `version.h` manually - update `platformio.ini` instead.

## FreeRTOS Patterns (NOT Arduino!)

### Task Architecture

**Target** (`src/target/main.cpp`):
```cpp
extern "C" void app_main(void) {
    xTaskCreate(photodiode_task, "photodiode", 4096, NULL, 5, NULL);  // Highest priority - ADC sampling
    xTaskCreate(ble_task, "ble", 8192, NULL, 4, NULL);                // BLE message receipt
    xTaskCreate(processing_task, "processing", 4096, NULL, 3, NULL);  // Message validation
}
```

**Weapon** (`src/weapon/main.cpp`):
```cpp
xTaskCreate(control_task, "control", 4096, NULL, 5, NULL);  // Message generation
xTaskCreate(laser_task, "laser", 2048, NULL, 4, NULL);      // Laser transmission
xTaskCreate(ble_task, "ble", 8192, NULL, 3, NULL);          // BLE advertising
```

### Synchronization Primitives

**Always use these, never poll:**
- `QueueHandle_t` for inter-task communication (`xQueueSend`/`xQueueReceive`)
- `SemaphoreHandle_t` for protecting shared state (`xSemaphoreTake`/`xSemaphoreGive`)
- `EventGroupHandle_t` for BLE connection state

**Example** (from `src/target/main.cpp`):
```cpp
QueueHandle_t photodiodeMessageQueue;
SemaphoreHandle_t statsMutex;

// In task:
if (xSemaphoreTake(statsMutex, portMAX_DELAY) == pdTRUE) {
    all_expected_messages++;
    xSemaphoreGive(statsMutex);
}
```

### Required API Conversions

| Arduino (NEVER USE)        | ESP-IDF FreeRTOS (USE THIS)         |
|----------------------------|--------------------------------------|
| `millis()`                 | `pdTICKS_TO_MS(xTaskGetTickCount())`|
| `delay(ms)`                | `vTaskDelay(pdMS_TO_TICKS(ms))`     |
| `Serial.println()`         | `ESP_LOGI(TAG, ...)`                |
| `pinMode()`, `digitalWrite()` | `gpio_config()`, `gpio_set_level()` |
| `analogRead()`             | `adc_oneshot_read(handle, channel, &val)` |

## Hardware Abstraction Patterns

### GPIO Configuration (Both Devices)

**Standard pattern** in `app_main()`:
```cpp
gpio_config_t io_conf = {};
io_conf.intr_type = GPIO_INTR_DISABLE;
io_conf.mode = GPIO_MODE_OUTPUT;
io_conf.pin_bit_mask = (1ULL << LASER_PIN);
io_conf.pull_down_en = GPIO_PULLDOWN_DISABLE;
io_conf.pull_up_en = GPIO_PULLUP_DISABLE;
gpio_config(&io_conf);
gpio_set_level((gpio_num_t)LASER_PIN, 0);
```

### ADC (Target Only)

**Initialization** (`src/target/photodiode.cpp`):
```cpp
adc_oneshot_unit_init_cfg_t init_config = {
    .unit_id = ADC_UNIT_1,
    .ulp_mode = ADC_ULP_MODE_DISABLE,
};
adc_oneshot_new_unit(&init_config, &adc_handle);

adc_oneshot_chan_cfg_t config = {
    .atten = ADC_ATTEN_DB_11,
    .bitwidth = ADC_BITWIDTH_12,
};
adc_oneshot_config_channel(adc_handle, ADC_CHANNEL_6, &config);
```

**Reading:**
```cpp
int rawValue = 0;
adc_oneshot_read(adc_handle, ADC_CHANNEL_6, &rawValue);
float voltage = (rawValue * ADC_VREF) / ADC_RESOLUTION;
```

## Protocol & Communication

### Message Structure

16-bit messages: **8 bits data + 8 bits hash** (`shared/include/protocol_config.h`):
```cpp
#define MESSAGE_DATA_BITS 8
#define MESSAGE_HASH_BITS 8
#define BIT_DURATION_MS 3
#define SAMPLES_PER_BIT 3
```

**Creation** (weapon): `createMessage16bit(data)` in `shared/include/hash.h`  
**Validation** (target): `validateMessage16bit(message, &dataOut)` checks hash

### BLE Architecture

**Weapon = BLE Server** (`shared/include/ble_weapon.h`):
- Advertises as "RayZ_Weapon"
- Serves characteristic with 16-bit message
- `sendMessage(uint16_t)` updates characteristic value

**Target = BLE Client** (`shared/include/ble_target.h`):
- Scans for "RayZ_Weapon"
- Subscribes to notifications
- `getMessage()` retrieves expected message from queue

**UUIDs** in `shared/include/ble_config.h` - modify both if changing.

### Timing Constants

**All timing in `shared/include/protocol_config.h`:**
```cpp
#define BIT_DURATION_MS 3               // Laser bit transmission time
#define SAMPLE_INTERVAL_MS 1            // Photodiode ADC sampling rate
#define TRANSMISSION_PAUSE_MS 1000      // Delay between weapon messages
#define COMMUNICATION_TIMEOUT_MS 5000   // BLE timeout
```

Changing these requires coordinated updates to both devices.

## Device-Specific Configuration

**Pin definitions** in `src/{target|weapon}/config.h`:
```cpp
// Target
#define PHOTODIODE_PIN 34   // ADC input
#define VIBRATION_PIN 4     // Feedback output

// Weapon
#define LASER_PIN 5         // Laser diode output
```

**SDK config:**
- `sdkconfig.target` - ESP32-specific (dual-core, more RAM)
- `sdkconfig.weapon` - ESP32-C3-specific (single-core, RISC-V)
- Never merge these - they're hardware-specific

## Common Development Tasks

### Adding Shared Functionality

1. Add header to `shared/include/`
2. Add source to `shared/src/`
3. Update `shared/CMakeLists.txt`:
   ```cmake
   idf_component_register(
       SRCS "src/new_file.cpp"
       INCLUDE_DIRS "include"
       REQUIRES nvs_flash bt
   )
   ```
4. Include with angle brackets: `#include <shared/new_feature.h>`

### Debugging via Serial Monitor

```cpp
static const char* TAG = "YourModule";
ESP_LOGI(TAG, "Info message");
ESP_LOGW(TAG, "Warning: %d", value);
ESP_LOGE(TAG, "Error: %s", errorStr);
```

Monitor both devices with: **"Monitor Both Devices"** task

### Adding FreeRTOS Tasks

**Template:**
```cpp
void my_task(void* pvParameters) {
    ESP_LOGI(TAG, "Task started");
    while (1) {
        // Do work
        vTaskDelay(pdMS_TO_TICKS(100));
    }
}

// In app_main():
xTaskCreate(my_task, "my_task", 
            4096,   // Stack size (bytes)
            NULL,   // Parameters
            3,      // Priority (0-5, higher = more urgent)
            NULL);  // Task handle
```

**Stack sizing:** BLE tasks need 8KB, others typically 2-4KB.

### Modifying Protocol

1. Update constants in `shared/include/protocol_config.h`
2. Rebuild **both** environments
3. Upload **both** devices (protocol must match)
4. Use "Upload Both Devices" task

## Partition Table

`shared/partitions/huge_app.csv` increases app partition size for both devices:
```
# Name,   Type, SubType, Offset,  Size
nvs,      data, nvs,     0x9000,  0x6000
phy_init, data, phy,     0xf000,  0x1000
factory,  app,  factory, 0x10000, 3M
```

Referenced in `platformio.ini`: `board_build.partitions = shared/partitions/huge_app.csv`

## Migration Context

Project migrated from Arduino → ESP-IDF (Q4 2024). See `MIGRATION_README.md` and `MIGRATION_SUMMARY.md` for historical context.

**Key takeaway:** Never suggest Arduino APIs - this is pure ESP-IDF with FreeRTOS.
