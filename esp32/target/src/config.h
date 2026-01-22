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

#endif
