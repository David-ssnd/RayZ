#ifndef HASH_H
#define HASH_H

#include <stdint.h>
#include "protocol_config.h"

// 8-bit hash per field — gives 1/65,536 false positive rate (two independent hashes)
inline uint8_t calculateHash8bit(uint8_t data)
{
    uint8_t hash = (((data & 0xFF) ^ HASH_XOR_SEED) + HASH_OFFSET) & 0xFF;
    return hash;
}

// 32-bit message: [8-bit player_id][8-bit device_id][8-bit player_hash][8-bit device_hash]
inline uint32_t createLaserMessage(uint8_t player_id, uint8_t device_id)
{
    player_id = player_id & MAX_PLAYER_ID; // clamp to 5-bit range (0-31)
    device_id = device_id & MAX_DEVICE_ID; // clamp to 6-bit range (0-63)

    uint8_t p_hash = calculateHash8bit(player_id);
    uint8_t d_hash = calculateHash8bit(device_id);

    uint32_t msg = ((uint32_t)player_id << 24) |
                   ((uint32_t)device_id << 16) |
                   ((uint32_t)p_hash << 8) |
                   d_hash;
    return msg;
}

inline bool validateLaserMessage(uint32_t message, uint8_t* out_player = nullptr, uint8_t* out_device = nullptr)
{
    uint8_t player_id = (message >> 24) & 0xFF;
    uint8_t device_id = (message >> 16) & 0xFF;
    uint8_t p_hash    = (message >> 8) & 0xFF;
    uint8_t d_hash    = message & 0xFF;

    bool ok = (p_hash == calculateHash8bit(player_id)) &&
              (d_hash == calculateHash8bit(device_id));

    // Also reject if IDs exceed valid range (noise)
    if (ok && (player_id > MAX_PLAYER_ID || device_id > MAX_DEVICE_ID))
    {
        ok = false;
    }

    if (ok)
    {
        if (out_player) *out_player = player_id;
        if (out_device) *out_device = device_id;
    }
    return ok;
}

#endif // HASH_H
