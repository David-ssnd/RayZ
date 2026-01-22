#ifndef CONFIG_H
#define CONFIG_H

#include "protocol_config.h"

// Hardware pins
#define PHOTODIODE_PIN 34
#define VIBRATION_PIN 4

// Vibration
#define VIBRATION_DURATION_MS 50

// ADC
#define ADC_VREF 3.3f
#define ADC_RESOLUTION 4095
#define ADC_ATTENUATION ADC_11db

// Threshold
#define THRESHOLD_MARGIN 0.1f

// I2C pins for OLED display (ESP32-DevKit native I2C)
#define I2C_SDA_PIN 21
#define I2C_SCL_PIN 22
#define OLED_I2C_ADDR 0x3C
#define OLED_WIDTH 128
#define OLED_HEIGHT 32

// Reset button pin
// GPIO 0 is the built-in BOOT button on most ESP32 boards including ESP32-S3 SuperMini
// For regular ESP32: GPIO 0 (BOOT button)
// For ESP32-S3: GPIO 0 (BOOT button)
#if CONFIG_IDF_TARGET_ESP32S3
#define RESET_BUTTON_PIN 0  // BOOT button on ESP32-S3 SuperMini
#else
#define RESET_BUTTON_PIN 0  // BOOT button on ESP32
#endif

#endif // CONFIG_H
