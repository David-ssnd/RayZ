# Target Source Code Structure

This directory contains the restructured source code for the RayZ Target device.

## File Organization

### Main Files

- **`main.cpp`** - Main entry point with minimal code
  - Initializes all components
  - Contains the main loop logic
  - Clean and readable with clear separation of concerns

### Core Modules

- **`photodiode.hpp/cpp`** - Photodiode signal processing
  - Handles ADC readings
  - Manages voltage buffering
  - Converts analog signals to digital bits
  - Implements dynamic threshold calculation

- **`display.hpp/cpp`** - OLED display controller
  - Manages SSD1306 OLED display
  - Shows received ID information
  - Provides error and waiting state displays

- **`i2c_scanner.hpp/cpp`** - I2C bus scanner utility
  - Scans and reports I2C devices
  - Useful for debugging hardware connections
  - Separated from main logic for reusability

- **`utils.hpp/cpp`** - Common utility functions
  - Binary string conversion
  - System information printing
  - Shared helper functions

### Configuration

- **`config.h`** - Hardware configuration and constants
  - Pin definitions
  - ADC parameters
  - I2C settings
  - Display configuration

## Design Principles

1. **Separation of Concerns** - Each module has a single, well-defined responsibility
2. **Header Convention** - Uses `.hpp` for C++ headers, `.h` for C-style headers
3. **Minimal Main** - `main.cpp` is kept simple and readable
4. **No Redundancy** - Common functions extracted to utilities
5. **Clear Documentation** - All classes and functions are documented

## Module Dependencies

```
main.cpp
  ├── photodiode.hpp (depends on config.h, hash.h)
  ├── display.hpp (depends on config.h, utils.hpp)
  ├── i2c_scanner.hpp
  └── utils.hpp (depends on config.h)
```

## Building

```bash
cd c:\Users\dado7\Desktop\RayZ\esp32\target
pio run
```

## Uploading to Device

```bash
pio run --target upload
```

## Monitoring Serial Output

```bash
pio device monitor
```
