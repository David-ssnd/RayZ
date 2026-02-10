#pragma once

#ifdef __cplusplus
extern "C"
{
#endif

    void photodiode_task(void* pvParameters);
    void processing_task(void* pvParameters);
    void espnow_task(void* pvParameters);
    void ws_task(void* pvParameters);
    void game_task(void* pvParameters);

    // Helper function for processing_task to record hits
    void game_task_record_hit(void);

    // Metric functions for display
    int metric_hit_count(void);
    uint32_t metric_last_hit_ms_ago(void);
    int metric_hearts_remaining(void);
    int metric_max_hearts(void);
    int metric_score(void);
    int metric_deaths(void);
    uint32_t metric_respawn_time_left(void);
    bool metric_is_respawning(void);

#ifdef __cplusplus
}
#endif
