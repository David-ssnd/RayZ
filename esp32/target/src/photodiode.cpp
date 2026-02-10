#include "photodiode.hpp"
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include <esp_log.h>


static const char* TAG = "Photodiode";

Photodiode::Photodiode()
{
    sampleIndex = 0;
    bitHead = 0;
    bitCount = 0;
    bufferFull = false;
    sampleBufferFull = false;
    runningMin = 3.3f;
    runningMax = 0.0f;
    dynamicThreshold = 1.65f;
    lastSampleTime = 0;
    bitStartTime = 0;
    adc_handle = nullptr;
    bufferMutex = nullptr;
}

void Photodiode::begin()
{
    // Create mutex for buffer protection
    bufferMutex = xSemaphoreCreateMutex();
    if (bufferMutex == NULL)
    {
        ESP_LOGE(TAG, "Failed to create mutex");
        return;
    }

    // Configure ADC
    adc_oneshot_unit_init_cfg_t init_config = {
        .unit_id = ADC_UNIT_1,
        .clk_src = ADC_RTC_CLK_SRC_DEFAULT,
        .ulp_mode = ADC_ULP_MODE_DISABLE,
    };
    ESP_ERROR_CHECK(adc_oneshot_new_unit(&init_config, &adc_handle));

    adc_oneshot_chan_cfg_t config = {
        .atten = ADC_ATTEN_DB_12,
        .bitwidth = ADC_BITWIDTH_12,
    };
    ESP_ERROR_CHECK(adc_oneshot_config_channel(adc_handle, PHOTODIODE_ADC_CHANNEL, &config));

    for (int i = 0; i < SAMPLES_PER_BIT; i++)
    {
        sampleBuffer[i] = 0.0f;
    }
    for (int i = 0; i < PHOTODIODE_BUFFER_SIZE; i++)
    {
        bitBuffer[i] = 0.0f;
    }
    bitHead = 0;
    bitCount = 0;

    lastSampleTime = pdTICKS_TO_MS(xTaskGetTickCount());
    bitStartTime = pdTICKS_TO_MS(xTaskGetTickCount());

    ESP_LOGI(TAG, "Photodiode initialized");
}

void Photodiode::update()
{
    uint32_t currentTime = pdTICKS_TO_MS(xTaskGetTickCount());

    if (currentTime - lastSampleTime < SAMPLE_INTERVAL_MS)
    {
        return;
    }
    lastSampleTime = currentTime;

    int rawValue = 0;
    ESP_ERROR_CHECK(adc_oneshot_read(adc_handle, PHOTODIODE_ADC_CHANNEL, &rawValue));
    float voltage = (rawValue * ADC_VREF) / ADC_RESOLUTION;
    
    // Debug: Log voltage periodically (every ~1 second)
    static uint32_t lastLogTime = 0;
    if (currentTime - lastLogTime > 1000)
    {
        ESP_LOGI(TAG, "[ADC] Raw: %d, Voltage: %.3fV, Min: %.3fV, Max: %.3fV, Threshold: %.3fV", 
                rawValue, voltage, runningMin, runningMax, dynamicThreshold);
        lastLogTime = currentTime;
    }

    // Decay toward recent samples to avoid stale thresholds
    runningMin = runningMin * THRESHOLD_MIN_WEIGHT + voltage * THRESHOLD_NEW_WEIGHT;
    runningMax = runningMax * THRESHOLD_MIN_WEIGHT + voltage * THRESHOLD_NEW_WEIGHT;

    sampleBuffer[sampleIndex] = voltage;
    sampleIndex++;

    if (sampleIndex >= SAMPLES_PER_BIT)
    {
        sampleBufferFull = true;

        // Average samples
        float avgVoltage = 0.0f;
        for (int i = 0; i < SAMPLES_PER_BIT; i++)
        {
            avgVoltage += sampleBuffer[i];
        }
        avgVoltage /= SAMPLES_PER_BIT;

        // Update threshold
        float midpoint = (runningMin + runningMax) * 0.5f;
        dynamicThreshold = dynamicThreshold * THRESHOLD_SMOOTH_OLD + midpoint * THRESHOLD_SMOOTH_NEW;

        // Lock buffer for thread safety
        if (xSemaphoreTake(bufferMutex, portMAX_DELAY) == pdTRUE)
        {
            bitBuffer[bitHead] = avgVoltage;
            bitHead = (bitHead + 1) % PHOTODIODE_BUFFER_SIZE;
            if (!bufferFull)
            {
                bitCount++;
                if (bitCount >= PHOTODIODE_BUFFER_SIZE)
                {
                    bufferFull = true;
                    bitCount = PHOTODIODE_BUFFER_SIZE;
                    ESP_LOGI(TAG, "Bit buffer full - ready to decode messages");
                }
            }
            xSemaphoreGive(bufferMutex);
        }

        sampleIndex = 0;
        bitStartTime = currentTime;
    }
}

uint16_t Photodiode::convertToBits()
{
    if (!bufferFull)
    {
        return 0;
    }

    sampleBufferFull = false;

    uint16_t result = 0;
    float threshold = dynamicThreshold;

    // Lock buffer for thread safety
    if (xSemaphoreTake(bufferMutex, portMAX_DELAY) == pdTRUE)
    {
        int start = bufferFull ? bitHead : 0;
        int count = bufferFull ? PHOTODIODE_BUFFER_SIZE : bitCount;
        for (int i = 0; i < count; i++)
        {
            result <<= 1;
            int idx = (start + i) % PHOTODIODE_BUFFER_SIZE;
            if (bitBuffer[idx] > threshold)
            {
                result |= 1;
            }
        }
        xSemaphoreGive(bufferMutex);
    }

    return result;
}

float Photodiode::getDynamicThreshold()
{
    return dynamicThreshold;
}

bool Photodiode::isBufferFull()
{
    return bufferFull;
}

bool Photodiode::isSampleBufferFull()
{
    return sampleBufferFull;
}

float Photodiode::getSignalStrength()
{
    return runningMax - runningMin;
}
