#pragma once

#include <freertos/FreeRTOS.h>
#include <freertos/semphr.h>
#include <esp_adc/adc_oneshot.h>
#include "config.h"
#include "hash.h"


class Photodiode
{
  private:
    float sampleBuffer[SAMPLES_PER_BIT];
    int sampleIndex;

    float bitBuffer[PHOTODIODE_BUFFER_SIZE];
    int bitHead;
    int bitCount;
    bool bufferFull;
    bool sampleBufferFull;

    float runningMin;
    float runningMax;
    float dynamicThreshold;

    uint32_t lastSampleTime;
    uint32_t bitStartTime;

    adc_oneshot_unit_handle_t adc_handle;
    SemaphoreHandle_t bufferMutex;

  public:
    Photodiode();
    void begin();
    void update();
    uint16_t convertToBits();
    float getDynamicThreshold();
    bool isBufferFull();
    bool isSampleBufferFull();
    float getSignalStrength();
};
