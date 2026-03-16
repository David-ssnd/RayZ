/**
 * Photodiode Threshold Calibration Tool — ESP32-S3 SuperMini
 *
 * Reads the photodiode ADC at 1 kHz (matching production firmware),
 * accumulates 32 bits per message, and prints one line per full message.
 *
 * Sampling runs from a periodic esp_timer callback (no busy-waiting,
 * no watchdog issues). Completed messages are queued to a print task.
 *
 * Message format: [8-bit player][8-bit device][8-bit p_hash][8-bit d_hash]
 */

#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include <freertos/queue.h>
#include <esp_adc/adc_oneshot.h>
#include <esp_timer.h>
#include <esp_log.h>
#include <stdio.h>
#include <string.h>

// ── Pin / ADC config (ESP32-S3 SuperMini) ───────────────────────────
#define PHOTODIODE_PIN          1
#define PHOTODIODE_ADC_CHANNEL  ADC_CHANNEL_0
#define ADC_VREF                3.3f
#define ADC_RESOLUTION          4095

// ── Timing (must match production firmware in protocol_config.h) ────
#define SAMPLE_INTERVAL_MS      1
#define SAMPLES_PER_BIT         3
#define MESSAGE_TOTAL_BITS      32

// ── Threshold tuning knobs (same defaults as production) ────────────
#define THRESHOLD_MIN_WEIGHT    0.95f
#define THRESHOLD_NEW_WEIGHT    0.05f
#define THRESHOLD_SMOOTH_OLD    0.5f
#define THRESHOLD_SMOOTH_NEW    0.5f

// ── Hash (same as production — for decode verification) ─────────────
#define HASH_XOR_SEED           0b10101010
#define HASH_OFFSET             1

static const char* TAG = "PDTest";

static adc_oneshot_unit_handle_t s_adc;

// Bit event passed from timer callback → print task
typedef struct
{
    uint32_t bits;       // accumulated bits so far
    int      bit_idx;    // 1..32 (32 = message complete)
    float    bit_v;      // averaged voltage for this bit
    float    v_min;      // message voltage min so far
    float    v_max;      // message voltage max so far
    float    v_sum;      // message voltage sum so far
    float    threshold;
    float    signal;
} pd_bit_event_t;

static QueueHandle_t s_bit_queue;

static void adc_init(void)
{
    adc_oneshot_unit_init_cfg_t init = {
        .unit_id  = ADC_UNIT_1,
        .clk_src  = ADC_RTC_CLK_SRC_DEFAULT,
        .ulp_mode = ADC_ULP_MODE_DISABLE,
    };
    ESP_ERROR_CHECK(adc_oneshot_new_unit(&init, &s_adc));

    adc_oneshot_chan_cfg_t chan = {
        .atten    = ADC_ATTEN_DB_12,
        .bitwidth = ADC_BITWIDTH_12,
    };
    ESP_ERROR_CHECK(adc_oneshot_config_channel(s_adc, PHOTODIODE_ADC_CHANNEL, &chan));
}

static uint8_t compute_hash(uint8_t value)
{
    return ((value ^ HASH_XOR_SEED) + HASH_OFFSET) & 0xFF;
}

// ── Timer callback — runs every 1 ms from esp_timer task ────────────
static float    s_running_min   = 3.3f;
static float    s_running_max   = 0.0f;
static float    s_dyn_threshold = 1.65f;
static float    s_sample_buf[SAMPLES_PER_BIT];
static int      s_sample_idx    = 0;
static uint32_t s_message       = 0;
static int      s_bit_idx       = 0;
static float    s_msg_v_min     = 3.3f;
static float    s_msg_v_max     = 0.0f;
static float    s_msg_v_sum     = 0.0f;

static void sample_timer_cb(void* arg)
{
    int raw = 0;
    adc_oneshot_read(s_adc, PHOTODIODE_ADC_CHANNEL, &raw);
    float v = (raw * ADC_VREF) / ADC_RESOLUTION;

    // Exponential running min/max
    s_running_min = s_running_min * THRESHOLD_MIN_WEIGHT + v * THRESHOLD_NEW_WEIGHT;
    s_running_max = s_running_max * THRESHOLD_MIN_WEIGHT + v * THRESHOLD_NEW_WEIGHT;
    if (v < s_running_min) s_running_min = v;
    if (v > s_running_max) s_running_max = v;

    s_sample_buf[s_sample_idx++] = v;

    if (s_sample_idx >= SAMPLES_PER_BIT)
    {
        float avg_v = 0.0f;
        for (int i = 0; i < SAMPLES_PER_BIT; i++)
            avg_v += s_sample_buf[i];
        avg_v /= SAMPLES_PER_BIT;

        float midpoint = (s_running_min + s_running_max) * 0.5f;
        s_dyn_threshold = s_dyn_threshold * THRESHOLD_SMOOTH_OLD
                        + midpoint        * THRESHOLD_SMOOTH_NEW;

        int bit = (avg_v > s_dyn_threshold) ? 1 : 0;
        s_message = (s_message << 1) | bit;

        if (avg_v < s_msg_v_min) s_msg_v_min = avg_v;
        if (avg_v > s_msg_v_max) s_msg_v_max = avg_v;
        s_msg_v_sum += avg_v;
        s_bit_idx++;
        s_sample_idx = 0;

        // Queue every bit so the print task can show progress
        pd_bit_event_t evt = {
            .bits      = s_message,
            .bit_idx   = s_bit_idx,
            .bit_v     = avg_v,
            .v_min     = s_msg_v_min,
            .v_max     = s_msg_v_max,
            .v_sum     = s_msg_v_sum,
            .threshold = s_dyn_threshold,
            .signal    = s_running_max - s_running_min,
        };
        xQueueSend(s_bit_queue, &evt, 0);

        if (s_bit_idx >= MESSAGE_TOTAL_BITS)
        {
            s_message   = 0;
            s_bit_idx   = 0;
            s_msg_v_min = 3.3f;
            s_msg_v_max = 0.0f;
            s_msg_v_sum = 0.0f;
        }
    }
}

// ── Print task — shows message building up bit by bit ────────────────
static void print_task(void* pv)
{
    uint32_t msg_count = 0;
    pd_bit_event_t evt;

    while (true)
    {
        if (xQueueReceive(s_bit_queue, &evt, portMAX_DELAY) == pdTRUE)
        {
            bool complete = (evt.bit_idx >= MESSAGE_TOTAL_BITS);
            if (complete) msg_count++;

            // Build binary string: decoded bits + dots for remaining
            char bin[33];
            for (int i = 0; i < MESSAGE_TOTAL_BITS; i++)
            {
                if (i < evt.bit_idx)
                    bin[i] = (evt.bits >> (evt.bit_idx - 1 - i)) & 1 ? '1' : '0';
                else
                    bin[i] = '.';
            }
            bin[32] = '\0';

            float v_avg = evt.v_sum / evt.bit_idx;

            if (complete)
            {
                // Decode & verify on the final line
                uint8_t player_id = (evt.bits >> 24) & 0xFF;
                uint8_t device_id = (evt.bits >> 16) & 0xFF;
                uint8_t p_hash    = (evt.bits >>  8) & 0xFF;
                uint8_t d_hash    = (evt.bits >>  0) & 0xFF;

                bool valid = (p_hash == compute_hash(player_id))
                          && (d_hash == compute_hash(device_id));

                printf("\r#%04lu | 0x%08lX | %s | P:%3d D:%3d | hash:%s "
                       "| V avg:%.3f [%.3f-%.3f] thr:%.3f sig:%.3f\n",
                       (unsigned long)msg_count,
                       (unsigned long)evt.bits, bin,
                       player_id, device_id,
                       valid ? "OK " : "BAD",
                       v_avg, evt.v_min, evt.v_max,
                       evt.threshold, evt.signal);
            }
            else
            {
                // Overwrite line in-place with partial progress
                printf("\r[%2d/32] %s | V:%.3f thr:%.3f sig:%.3f",
                       evt.bit_idx, bin,
                       evt.bit_v, evt.threshold, evt.signal);
                fflush(stdout);
            }
        }
    }
}

extern "C" void app_main(void)
{
    vTaskDelay(pdMS_TO_TICKS(1000));

    printf("\n");
    printf("╔══════════════════════════════════════════════════════════════════════════════════════╗\n");
    printf("║                   RayZ Photodiode Calibration — S3 SuperMini                       ║\n");
    printf("╠══════════════════════════════════════════════════════════════════════════════════════╣\n");
    printf("║  ADC     : GPIO %d, 12-bit, DB_12 (0-3.3V)                                        ║\n", PHOTODIODE_PIN);
    printf("║  Timing  : %d ms sample, %d samples/bit, %d bits/msg = %d ms per message              ║\n",
           SAMPLE_INTERVAL_MS, SAMPLES_PER_BIT, MESSAGE_TOTAL_BITS,
           SAMPLE_INTERVAL_MS * SAMPLES_PER_BIT * MESSAGE_TOTAL_BITS);
    printf("║  Format  : [8-bit player][8-bit device][8-bit p_hash][8-bit d_hash]                ║\n");
    printf("║  Output  : live bit-by-bit progress, full decode on completion                     ║\n");
    printf("╚══════════════════════════════════════════════════════════════════════════════════════╝\n\n");

    adc_init();

    s_bit_queue = xQueueCreate(48, sizeof(pd_bit_event_t));
    xTaskCreate(print_task, "pd_print", 4096, NULL, 3, NULL);

    // Periodic high-res timer — fires every 1 ms for ADC sampling
    esp_timer_create_args_t timer_args = {
        .callback        = sample_timer_cb,
        .arg             = NULL,
        .dispatch_method = ESP_TIMER_TASK,
        .name            = "pd_sample",
    };
    esp_timer_handle_t timer;
    ESP_ERROR_CHECK(esp_timer_create(&timer_args, &timer));
    ESP_ERROR_CHECK(esp_timer_start_periodic(timer, SAMPLE_INTERVAL_MS * 1000));

    ESP_LOGI(TAG, "ADC initialized, sampling at 1 kHz...");
}
