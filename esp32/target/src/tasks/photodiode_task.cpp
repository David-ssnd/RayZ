#include <esp_log.h>
#include "config.h"
#include "task_shared.h"

static const char* TAG = "PhotodiodeTask";

extern "C" void photodiode_task(void* pvParameters)
{
    ESP_LOGI(TAG, "Photodiode task started");
    TickType_t lastWake = xTaskGetTickCount();
    const TickType_t samplePeriodTicks = pdMS_TO_TICKS(SAMPLE_INTERVAL_MS);

    while (1)
    {
        photodiode.update();

        if (photodiode.isSampleBufferFull())
        {
            uint32_t message_bits = photodiode.convertToBits();
            xQueueSend(photodiodeMessageQueue, &message_bits, 0);
        }

        vTaskDelayUntil(&lastWake, samplePeriodTicks);
    }
}
