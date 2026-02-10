#ifndef HASH_H
#define HASH_H

#include <stdint.h>
#include "protocol_config.h"

inline uint8_t calculateHash8bit(uint8_t data)
{
    uint8_t hash = (((data & 0xFF) ^ HASH_XOR_SEED) + HASH_OFFSET) & 0xFF;
    return hash;
}

inline uint8_t calculateHash5bit(uint8_t player_id, uint8_t device_id)
{
    uint16_t combined = ((uint16_t)player_id << 6) | device_id;
    uint8_t hash = (((combined & 0x7FF) ^ HASH_XOR_SEED) + HASH_OFFSET) & 0x1F; // 5-bit hash
    return hash;
}

inline uint16_t createLaserMessage(uint8_t player_id, uint8_t device_id)
{
    // Limit to bit ranges
    player_id = player_id & 0x1F; // 5 bits max
    device_id = device_id & 0x3F; // 6 bits max
    
    uint8_t hash = calculateHash5bit(player_id, device_id);
    
    // Format: [5-bit player][6-bit device][5-bit hash]
    uint16_t msg = ((uint16_t)player_id << 11) | ((uint16_t)device_id << 5) | hash;
    return msg;
}

inline bool validateLaserMessage(uint32_t message, uint8_t* out_player = nullptr, uint8_t* out_device = nullptr)
{
    // Extract from 16-bit message (may be passed as uint32_t)
    uint16_t msg = message & 0xFFFF;
    
    uint8_t player_id = (msg >> 11) & 0x1F;  // Top 5 bits
    uint8_t device_id = (msg >> 5) & 0x3F;   // Middle 6 bits
    uint8_t hash = msg & 0x1F;                // Bottom 5 bits
    
    uint8_t expected_hash = calculateHash5bit(player_id, device_id);
    bool ok = (hash == expected_hash);
    
    if (ok)
    {
        if (out_player)
            *out_player = player_id;
        if (out_device)
            *out_device = device_id;
    }
    return ok;
}

#endif // HASH_H
