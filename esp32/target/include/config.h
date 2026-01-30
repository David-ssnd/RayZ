#ifndef CONFIG_H
#define CONFIG_H

#include "protocol_config.h"

// Vibration
#define VIBRATION_DURATION_MS 50

// ADC
#define ADC_VREF 3.3f
#define ADC_RESOLUTION 4095
// Note: Attenuation is hardcoded in photodiode.cpp to DB_12

// Threshold
#define THRESHOLD_MARGIN 0.1f

// I2C pins for OLED display
#if CONFIG_IDF_TARGET_ESP32S3
// ESP32-S3 SuperMini
#define I2C_SDA_PIN 8
#define I2C_SCL_PIN 9
#define PHOTODIODE_PIN 1
#define PHOTODIODE_ADC_CHANNEL ADC_CHANNEL_0
#define VIBRATION_PIN 4
#define RESET_BUTTON_PIN 0
#else
// ESP32-DevKit native I2C
#define I2C_SDA_PIN 21
#define I2C_SCL_PIN 22
#define PHOTODIODE_PIN 34
#define PHOTODIODE_ADC_CHANNEL ADC_CHANNEL_6
#define VIBRATION_PIN 4
#define RESET_BUTTON_PIN 0
#endif
#define OLED_I2C_ADDR 0x3C
#define OLED_WIDTH 128
#define OLED_HEIGHT 32

#endif // CONFIG_H
