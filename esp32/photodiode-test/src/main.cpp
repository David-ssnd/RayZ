/**
 * Photodiode Threshold Calibration Tool — ESP32-S3 SuperMini
 *
 * Reads the photodiode ADC at 1 kHz (matching production firmware)
 * and prints every averaged bit-period reading to serial monitor.
 *
 * Output columns (tab-separated for easy plotting):
 *   raw  voltage  runMin  runMax  threshold  bit  signalStrength
 *
 * Tip: Use the Arduino IDE Serial Plotter or PlatformIO serial plotter
 *      with the "PLOT:" prefixed lines for real-time graphing.
 */

#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include <esp_adc/adc_oneshot.h>
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
#define BIT_DURATION_MS         (SAMPLE_INTERVAL_MS * SAMPLES_PER_BIT)

// ── Threshold tuning knobs (same defaults as production) ────────────
#define THRESHOLD_MIN_WEIGHT    0.95f
#define THRESHOLD_NEW_WEIGHT    0.05f
#define THRESHOLD_SMOOTH_OLD    0.5f
#define THRESHOLD_SMOOTH_NEW    0.5f

// ── How often to print a summary line (every N bit periods) ─────────
#define PRINT_EVERY_N_BITS      10

static const char* TAG = "PDTest";

static adc_oneshot_unit_handle_t s_adc;

// Running state
static float s_running_min   = 3.3f;
static float s_running_max   = 0.0f;
static float s_dyn_threshold = 1.65f;   // midpoint start

// Stats over the print window
static float s_window_min    = 3.3f;
static float s_window_max    = 0.0f;
static int   s_window_bits   = 0;
static int   s_high_count    = 0;

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

// ── Main sampling task ──────────────────────────────────────────────
// FreeRTOS default tick is 10 ms, but we need 1 ms sampling.
// Use esp_timer (µs resolution) instead of vTaskDelayUntil.
#include <esp_timer.h>

static void photodiode_test_task(void* pv)
{
    float sample_buf[SAMPLES_PER_BIT];
    int   sample_idx = 0;
    int   raw_buf[SAMPLES_PER_BIT];

    int64_t next_us = esp_timer_get_time() + (SAMPLE_INTERVAL_MS * 1000);

    while (true)
    {
        // Busy-wait until next sample time (µs precision)
        while (esp_timer_get_time() < next_us)
        {
            // yield briefly so watchdog is happy
            portYIELD();
        }
        next_us += SAMPLE_INTERVAL_MS * 1000;

        int raw;
        float v = adc_read_voltage(&raw);

        // Update exponential running min/max
        s_running_min = s_running_min * THRESHOLD_MIN_WEIGHT + v * THRESHOLD_NEW_WEIGHT;
        s_running_max = s_running_max * THRESHOLD_MIN_WEIGHT + v * THRESHOLD_NEW_WEIGHT;
        if (v < s_running_min) s_running_min = v;
        if (v > s_running_max) s_running_max = v;

        sample_buf[sample_idx] = v;
        raw_buf[sample_idx]    = raw;
        sample_idx++;

        if (sample_idx >= SAMPLES_PER_BIT)
        {
            // Average samples for this bit period
            float avg_v   = 0.0f;
            int   avg_raw = 0;
            for (int i = 0; i < SAMPLES_PER_BIT; i++)
            {
                avg_v   += sample_buf[i];
                avg_raw += raw_buf[i];
            }
            avg_v   /= SAMPLES_PER_BIT;
            avg_raw /= SAMPLES_PER_BIT;

            // Update dynamic threshold (same algorithm as production)
            float midpoint = (s_running_min + s_running_max) * 0.5f;
            s_dyn_threshold = s_dyn_threshold * THRESHOLD_SMOOTH_OLD
                            + midpoint        * THRESHOLD_SMOOTH_NEW;

            int bit = (avg_v > s_dyn_threshold) ? 1 : 0;
            float signal_strength = s_running_max - s_running_min;

            // Per-bit line (tab-separated for serial plotter)
            printf("raw:%d\tV:%.3f\tmin:%.3f\tmax:%.3f\tthr:%.3f\tbit:%d\tsig:%.3f\n",
                   avg_raw, avg_v,
                   s_running_min, s_running_max,
                   s_dyn_threshold, bit, signal_strength);

            // Window stats
            if (avg_v < s_window_min) s_window_min = avg_v;
            if (avg_v > s_window_max) s_window_max = avg_v;
            s_high_count += bit;
            s_window_bits++;

            if (s_window_bits >= PRINT_EVERY_N_BITS)
            {
                printf("── WINDOW ── range:[%.3f - %.3f]  delta:%.3f  high:%d/%d  thr:%.3f ──\n",
                       s_window_min, s_window_max,
                       s_window_max - s_window_min,
                       s_high_count, s_window_bits,
                       s_dyn_threshold);
                s_window_min  = 3.3f;
                s_window_max  = 0.0f;
                s_window_bits = 0;
                s_high_count  = 0;
            }

            sample_idx = 0;
        }
    }
}

extern "C" void app_main(void)
{
    vTaskDelay(pdMS_TO_TICKS(1000));

    printf("\n");
    printf("╔══════════════════════════════════════════════════╗\n");
    printf("║   RayZ Photodiode Calibration — S3 SuperMini    ║\n");
    printf("╠══════════════════════════════════════════════════╣\n");
    printf("║  ADC Pin   : GPIO %d (ADC1 CH0)                 ║\n", PHOTODIODE_PIN);
    printf("║  Bit width : 12-bit (0-4095)                    ║\n");
    printf("║  Atten     : DB_12 (0-3.3V)                     ║\n");
    printf("║  Sample    : %d ms (%d samples/bit, %d ms/bit)    ║\n",
           SAMPLE_INTERVAL_MS, SAMPLES_PER_BIT, BIT_DURATION_MS);
    printf("║  Threshold : dynamic (exponential smoothing)    ║\n");
    printf("╠══════════════════════════════════════════════════╣\n");
    printf("║  Columns: raw  V  min  max  threshold  bit  sig ║\n");
    printf("║  WINDOW summary every %d bit periods             ║\n", PRINT_EVERY_N_BITS);
    printf("╚══════════════════════════════════════════════════╝\n\n");

    adc_init();
    ESP_LOGI(TAG, "ADC initialized, starting sampling...");

    xTaskCreatePinnedToCore(photodiode_test_task, "pd_test", 4096, NULL, 5, NULL, 1);
}
