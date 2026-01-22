#include "../include/config.h"

// Override the weak function from gpio_init.cpp
int get_reset_button_pin(void)
{
    return RESET_BUTTON_PIN;
}
