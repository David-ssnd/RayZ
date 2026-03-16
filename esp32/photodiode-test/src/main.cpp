/**
 * Photodiode Threshold Calibration Tool — ESP32-S3 SuperMini
 *
 * Reads the photodiode ADC at 1 kHz (matching production firmware),
 * accumulates 32 bits per message, and prints one line per full message.
 *
 * Message format: [8-bit player][8-bit device][8-bit p_hash][8-bit d_hash]
 */

#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include <esp_adc/adc_oneshot.h>
#include <esp_timer.h>
#include <esp_task_wdt.h>
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

// Running state
static float s_running_min   = 3.3f;
static float s_running_max   = 0.0f;
static float s_dyn_threshold = 1.65f;

static uint32_t s_msg_count  = 0;

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

static float adc_read_voltage(int* raw_out)
{
    int raw = 0;
    ESP_ERROR_CHECK(adc_oneshot_read(s_adc, PHOTODIODE_ADC_CHANNEL, &raw));
    if (raw_out) *raw_out = raw;
    return (raw * ADC_VREF) / ADC_RESOLUTION;
}

static uint8_t compute_hash(uint8_t value)
{
    return ((value ^ HASH_XOR_SEED) + HASH_OFFSET) & 0xFF;
}

static void print_binary(uint32_t val, int bits, char* buf)
{
    for (int i = bits - 1; i >= 0; i--)
        *buf++ = (val >> i) & 1 ? '1' : '0';
    *buf = '\0';
}

// ── Main sampling task ──────────────────────────────────────────────
static void photodiode_test_task(void* pv)
{
    // Subscribe this task to the watchdog so we can feed it
    esp_task_wdt_add(NULL);

    float sample_buf[SAMPLES_PER_BIT];
    int   sample_idx = 0;

    // Per-message accumulators
    uint32_t message    = 0;
    int      bit_idx    = 0;
    float    msg_v_min  = 3.3f;
    float    msg_v_max  = 0.0f;
    float    msg_v_sum  = 0.0f;

    int64_t next_us = esp_timer_get_time() + (SAMPLE_INTERVAL_MS * 1000);

    while (true)
    {
        // Sleep 1 tick between spins to feed IDLE watchdog
        int64_t now = esp_timer_get_time();
        if (next_us - now > 1000)
            vTaskDelay(1);
        while (esp_timer_get_time() < next_us)
            ;  // final µs-precise spin
        next_us += SAMPLE_INTERVAL_MS * 1000;

        int raw;
        float v = adc_read_voltage(&raw);

        // Update exponential running min/max
        s_running_min = s_running_min * THRESHOLD_MIN_WEIGHT + v * THRESHOLD_NEW_WEIGHT;
        s_running_max = s_running_max * THRESHOLD_MIN_WEIGHT + v * THRESHOLD_NEW_WEIGHT;
        if (v < s_running_min) s_running_min = v;
        if (v > s_running_max) s_running_max = v;

        sample_buf[sample_idx++] = v;

        if (sample_idx >= SAMPLES_PER_BIT)
        {
            // Average the samples for this bit period
            float avg_v = 0.0f;
            for (int i = 0; i < SAMPLES_PER_BIT; i++)
                avg_v += sample_buf[i];
            avg_v /= SAMPLES_PER_BIT;

            // Update dynamic threshold
            float midpoint = (s_running_min + s_running_max) * 0.5f;
            s_dyn_threshold = s_dyn_threshold * THRESHOLD_SMOOTH_OLD
                            + midpoint        * THRESHOLD_SMOOTH_NEW;

            int bit = (avg_v > s_dyn_threshold) ? 1 : 0;

            // Shift bit into message (MSB first)
            message = (message << 1) | bit;

            // Track voltage stats for this message
            if (avg_v < msg_v_min) msg_v_min = avg_v;
            if (avg_v > msg_v_max) msg_v_max = avg_v;
            msg_v_sum += avg_v;

            bit_idx++;
            sample_idx = 0;

            // Full 32-bit message received
            if (bit_idx >= MESSAGE_TOTAL_BITS)
            {
                s_msg_count++;
                float msg_v_avg = msg_v_sum / MESSAGE_TOTAL_BITS;
                float sig = s_running_max - s_running_min;

                // Decode fields
                uint8_t player_id = (message >> 24) & 0xFF;
                uint8_t device_id = (message >> 16) & 0xFF;
                uint8_t p_hash    = (message >>  8) & 0xFF;
                uint8_t d_hash    = (message >>  0) & 0xFF;

                // Verify hashes
                uint8_t p_hash_exp = compute_hash(player_id);
                uint8_t d_hash_exp = compute_hash(device_id);
                bool valid = (p_hash == p_hash_exp) && (d_hash == d_hash_exp);

                // Binary string
                char bin[33];
                print_binary(message, 32, bin);

                printf("#%04lu | 0x%08lX | %s | P:%3d D:%3d | hash:%s "
                       "| V avg:%.3f [%.3f-%.3f] thr:%.3f sig:%.3f\n",
                       (unsigned long)s_msg_count,
                       (unsigned long)message, bin,
                       player_id, device_id,
                       valid ? "OK " : "BAD",
                       msg_v_avg, msg_v_min, msg_v_max,
                       s_dyn_threshold, sig);

                esp_task_wdt_reset();

                // Reset for next message
                message   = 0;
                bit_idx   = 0;
                msg_v_min = 3.3f;
                msg_v_max = 0.0f;
                msg_v_sum = 0.0f;
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
    printf("║  Output  : one line per 32-bit message                                             ║\n");
    printf("╚══════════════════════════════════════════════════════════════════════════════════════╝\n\n");

    adc_init();
    ESP_LOGI(TAG, "ADC initialized, sampling...");

    xTaskCreatePinnedToCore(photodiode_test_task, "pd_test", 4096, NULL, 5, NULL, 1);
}
