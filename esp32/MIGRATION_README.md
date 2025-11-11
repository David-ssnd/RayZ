# ESP32 RayZ - FreeRTOS Migration Complete

## Overview

This project has been successfully migrated from Arduino framework to ESP-IDF with FreeRTOS. The migration provides better performance, more control over hardware, and proper multitasking capabilities.

## Architecture Changes

### Framework Migration

- **Before**: Arduino framework with blocking `setup()` and `loop()`
- **After**: ESP-IDF with FreeRTOS multitasking

### Key Improvements

1. **True Multitasking**: Multiple FreeRTOS tasks running concurrently
2. **Better Resource Management**: Mutexes, queues, and event groups for synchronization
3. **Native BLE Stack**: NimBLE instead of Arduino BLE wrapper
4. **Direct Hardware Access**: ESP-IDF ADC and GPIO APIs
5. **Professional Logging**: ESP-IDF logging system instead of Serial.print

## Project Structure

```
esp32/
├── shared/                   # Shared ESP-IDF component
│   ├── CMakeLists.txt       # Component build configuration
│   ├── include/
│   │   ├── ble_target.h     # NimBLE client (Target)
│   │   ├── ble_weapon.h     # NimBLE server (Weapon)
│   │   ├── ble_config.h     # BLE UUIDs and names
│   │   ├── hash.h           # Message hashing
│   │   ├── protocol_config.h # Protocol definitions
│   │   └── utils.h          # Utility functions
│   └── src/
│       ├── ble_target.cpp   # NimBLE client implementation
│       ├── ble_weapon.cpp   # NimBLE server implementation
│       └── utils.cpp        # Utility implementations
│
├── target/                   # Target device (ESP32)
│   ├── CMakeLists.txt       # Main project file
│   ├── platformio.ini       # PlatformIO configuration
│   ├── sdkconfig.defaults   # ESP-IDF default configuration
│   ├── include/
│   │   ├── config.h         # Hardware pin definitions
│   │   └── photodiode.hpp   # Photodiode class
│   └── src/
│       ├── CMakeLists.txt   # Source component build config
│       ├── main.cpp         # Entry point with FreeRTOS tasks
│       └── photodiode.cpp   # Photodiode implementation
│
└── weapon/                   # Weapon device (ESP32-C3)
    ├── CMakeLists.txt       # Main project file
    ├── platformio.ini       # PlatformIO configuration
    ├── sdkconfig.defaults   # ESP-IDF default configuration
    ├── include/
    │   └── config.h         # Hardware pin definitions
    └── src/
        ├── CMakeLists.txt   # Source component build config
        └── main.cpp         # Entry point with FreeRTOS tasks
```

## Target Device Architecture

### FreeRTOS Tasks

1. **photodiode_task** (Priority: 5)

   - Continuously samples ADC at 1ms intervals
   - Converts samples to bits
   - Sends messages to processing queue
   - Stack: 4KB

2. **ble_task** (Priority: 4)

   - Manages BLE connection
   - Receives expected messages from Weapon
   - Updates statistics
   - Stack: 8KB

3. **processing_task** (Priority: 3)
   - Validates incoming photodiode messages
   - Matches against BLE expected messages
   - Logs results and statistics
   - Stack: 4KB

### Key Changes

- **ADC**: `analogRead()` → `adc_oneshot_read()`
- **Timing**: `millis()` → `pdTICKS_TO_MS(xTaskGetTickCount())`
- **Delays**: `delay()` → `vTaskDelay(pdMS_TO_TICKS())`
- **GPIO**: `pinMode()/digitalWrite()` → `gpio_config()/gpio_set_level()`
- **Logging**: `Serial.print()` → `ESP_LOGI()`
- **Synchronization**: Added mutexes and queues

## Weapon Device Architecture

### FreeRTOS Tasks

1. **control_task** (Priority: 5)

   - Generates sequential data messages
   - Sends to laser queue
   - Transmits via BLE if connected
   - Stack: 4KB

2. **laser_task** (Priority: 4)

   - Receives messages from queue
   - Controls laser transmission timing
   - Sends bits at 3ms per bit
   - Stack: 2KB

3. **ble_task** (Priority: 3)
   - Manages BLE advertising and connections
   - Handles connection state changes
   - Stack: 8KB

### Key Changes

- **GPIO**: Laser control via ESP-IDF GPIO API
- **Timing**: Precise bit timing with FreeRTOS
- **BLE**: NimBLE server with GATT services
- **Logging**: ESP-IDF logging system

## BLE Implementation

### NimBLE Stack

Both devices now use ESP-IDF's NimBLE stack:

**Target (Client)**:

- Scans for Weapon device
- Connects and discovers services
- Subscribes to message notifications
- Handles reconnection automatically

**Weapon (Server)**:

- Advertises as BLE peripheral
- Provides GATT service with message characteristic
- Notifies connected clients
- Auto-restarts advertising on disconnect

### UUIDs (from ble_config.h)

- Service UUID: `"12345678-1234-5678-1234-56789abcdef0"`
- Message Characteristic UUID: `"12345678-1234-5678-1234-56789abcdef1"`

## Photodiode ADC

### ESP-IDF ADC Configuration

- **Unit**: ADC1
- **Channel**: Channel 6 (GPIO34)
- **Attenuation**: 11dB (0-3.3V range)
- **Bit Width**: 12-bit (0-4095)
- **Sampling**: Thread-safe with mutex

### Thread Safety

- Buffer access protected by mutex
- Safe concurrent access from multiple tasks
- Atomic operations for flags

## Building and Flashing

### Prerequisites

```bash
# Install PlatformIO with ESP-IDF support
pip install platformio

# Or install ESP-IDF directly
# Follow: https://docs.espressif.com/projects/esp-idf/en/latest/esp32/get-started/
```

### Build Commands

**Target Device**:

```bash
cd target
pio run
```

**Weapon Device**:

```bash
cd weapon
pio run
```

### Upload Commands

**Target (COM3)**:

```bash
cd target
pio run -t upload
```

**Weapon (COM7)**:

```bash
cd weapon
pio run -t upload
```

### Monitor Output

**Target**:

```bash
cd target
pio device monitor
```

**Weapon**:

```bash
cd weapon
pio device monitor
```

## Configuration

### Target Device (platformio.ini)

- Board: ESP32 Dev Module
- Framework: espidf
- Upload Port: COM3
- Monitor Speed: 115200 baud

### Weapon Device (platformio.ini)

- Board: ESP32-C3-DevKitM-1
- Framework: espidf
- Upload Port: COM7
- Monitor Speed: 115200 baud

## Logging

### Log Levels

All modules use ESP-IDF logging with these tags:

- `Target`: Main target application
- `Weapon`: Main weapon application
- `Photodiode`: ADC sampling and processing
- `BLETarget`: BLE client operations
- `BLEWeapon`: BLE server operations

### Example Output

**Target**:

```
I (1234) Target: Target device starting...
I (1235) Photodiode: Photodiode initialized
I (1240) BLETarget: Initializing BLE Target...
I (1250) Target: Target device ready - waiting for signals...
I (2000) BLETarget: Found weapon device, connecting...
I (2100) BLETarget: Connected successfully
I (3000) Target: 📡BLE | 3000 ms | 1010 1010 0101 0101 | Expected Data: 170
I (3048) Target: Laser | 3048 ms | 1010 1010 0101 0101 | Data: 170 | ✓ BLE MATCH
```

**Weapon**:

```
I (1234) Weapon: Weapon device starting...
I (1240) BLEWeapon: Initializing BLE Weapon...
I (1250) BLEWeapon: BLE Weapon ready. Waiting for a target to connect...
I (2000) BLEWeapon: Connection established; status=0
I (2001) BLEWeapon: BLE Target connected!
I (3000) Weapon: 📡 BLE sent | ► Laser | 3000 ms | 1010 1010 0101 0101 | Data: 170
```

## Performance Improvements

1. **Photodiode Sampling**: Consistent 1ms sampling with FreeRTOS tick precision
2. **BLE Latency**: Reduced overhead with native NimBLE stack
3. **Task Scheduling**: Proper priorities ensure critical tasks run first
4. **Memory Management**: Better stack allocation per task
5. **Power Management**: FreeRTOS idle task enables power saving

## Troubleshooting

### Build Errors

- Ensure ESP-IDF components are installed via PlatformIO
- Check that `lib_extra_dirs = ..` points to shared component
- Verify CMakeLists.txt files are present

### BLE Connection Issues

- Check that both devices use matching UUIDs
- Verify NimBLE is enabled in sdkconfig.defaults
- Monitor logs for connection status

### ADC Issues

- Verify GPIO34 is connected to photodiode
- Check ADC channel configuration matches pin
- Ensure proper 11dB attenuation for 0-3.3V

## Migration Checklist

✅ Updated platformio.ini to ESP-IDF framework
✅ Created sdkconfig.defaults files
✅ Migrated main.cpp to FreeRTOS tasks
✅ Replaced Arduino ADC with ESP-IDF ADC
✅ Replaced Arduino BLE with NimBLE
✅ Updated Serial logging to ESP-IDF logging
✅ Updated GPIO operations to ESP-IDF
✅ Replaced timing functions with FreeRTOS
✅ Added synchronization primitives
✅ Created CMakeLists.txt component structure
✅ Removed all Arduino.h dependencies

## Next Steps

1. **Test Target Device**:

   - Verify photodiode ADC sampling
   - Test BLE connection to Weapon
   - Validate message detection accuracy

2. **Test Weapon Device**:

   - Verify laser transmission timing
   - Test BLE advertising and connection
   - Validate message synchronization

3. **Performance Tuning**:
   - Adjust task priorities if needed
   - Optimize stack sizes
   - Fine-tune BLE parameters

## Resources

- [ESP-IDF Documentation](https://docs.espressif.com/projects/esp-idf/en/latest/)
- [FreeRTOS Documentation](https://www.freertos.org/Documentation)
- [NimBLE Guide](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/bluetooth/nimble/index.html)
- [PlatformIO ESP-IDF](https://docs.platformio.org/en/latest/frameworks/espidf.html)

## License

This project maintains its original license after migration.
