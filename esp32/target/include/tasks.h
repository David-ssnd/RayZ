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

#ifdef __cplusplus
}
#endif
