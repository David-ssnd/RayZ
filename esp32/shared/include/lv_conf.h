#ifndef LV_CONF_H
#define LV_CONF_H

#include <stdint.h>

// Color depth: 1 (monochrome for SSD1306)
#define LV_COLOR_DEPTH 1

// Display resolution
#define LV_HOR_RES_MAX 128
#define LV_VER_RES_MAX 32

// Memory management - increase for widgets and animations
#define LV_MEM_CUSTOM 0
#define LV_MEM_SIZE (24U * 1024U)
#define LV_MEM_ADR 0
#define LV_MEM_BUF_MAX_NUM 16

// Display refresh - optimize for animations
#define LV_DISP_DEF_REFR_PERIOD 20

// Input device
#define LV_INDEV_DEF_READ_PERIOD 30

// Feature usage
#define LV_USE_PERF_MONITOR 0
#define LV_USE_MEM_MONITOR 0
#define LV_USE_REFR_DEBUG 0
#define LV_USE_ANIMATION 1
#define LV_USE_SHADOW 0
#define LV_USE_BLEND_MODES 0
#define LV_USE_OPA_SCALE 1
#define LV_USE_IMG_TRANSFORM 0
#define LV_USE_GROUP 1
#define LV_USE_GPU 0
#define LV_USE_FILESYSTEM 0
#define LV_USE_USER_DATA 1

// Widget usage
#define LV_USE_ARC 1
#define LV_USE_BAR 1
#define LV_USE_BTN 1
#define LV_USE_BTNMATRIX 0
#define LV_USE_CANVAS 1
#define LV_USE_CHECKBOX 0
#define LV_USE_DROPDOWN 0
#define LV_USE_IMG 1
#define LV_USE_LABEL 1
#define LV_USE_LINE 1
#define LV_USE_ROLLER 0
#define LV_USE_SLIDER 0
#define LV_USE_SWITCH 0
#define LV_USE_TEXTAREA 0
#define LV_USE_TABLE 0
#define LV_USE_LED 1
#define LV_USE_METER 1
#define LV_USE_SPINNER 1
#define LV_USE_CHART 1
#define LV_USE_ANIMIMG 1

// Font usage - enable built-in fonts for visual hierarchy
#define LV_FONT_MONTSERRAT_8 1
#define LV_FONT_MONTSERRAT_10 1
#define LV_FONT_MONTSERRAT_12 1
#define LV_FONT_MONTSERRAT_14 0
#define LV_FONT_MONTSERRAT_16 1
#define LV_FONT_MONTSERRAT_20 0
#define LV_FONT_MONTSERRAT_24 1
#define LV_FONT_MONTSERRAT_28 0
#define LV_FONT_MONTSERRAT_32 0
#define LV_FONT_MONTSERRAT_36 0
#define LV_FONT_MONTSERRAT_40 0
#define LV_FONT_MONTSERRAT_48 0

// Symbol font for icons
#define LV_FONT_MONTSERRAT_12_SUBPX 0
#define LV_FONT_MONTSERRAT_28_COMPRESSED 0
#define LV_FONT_DEJAVU_16_PERSIAN_HEBREW 0
#define LV_FONT_SIMSUN_16_CJK 0
#define LV_FONT_UNSCII_8 0
#define LV_FONT_UNSCII_16 0

#define LV_FONT_DEFAULT &lv_font_montserrat_10

// Themes
#define LV_USE_THEME_DEFAULT 1
#define LV_USE_THEME_MONO 1

// Logging
#define LV_USE_LOG 1
#define LV_LOG_LEVEL LV_LOG_LEVEL_WARN
#define LV_LOG_PRINTF 1

// Asserts
#define LV_USE_ASSERT_NULL 1
#define LV_USE_ASSERT_MALLOC 1

#endif
