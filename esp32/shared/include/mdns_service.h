/**
 * mDNS Service for RayZ Device Discovery
 * 
 * Advertises the device on the local network so that the WS Bridge
 * can automatically discover it without manual IP entry.
 * 
 * Service details:
 * - Service type: _rayz._tcp
 * - Instance name: rayz-[role]-[device_id] (e.g., "rayz-target-234")
 * - TXT records:
 *   - role=[weapon|target]
 *   - player=[player_id]
 *   - device=[device_id]
 *   - version=[firmware_version]
 */

#pragma once

#ifdef __cplusplus
extern "C" {
#endif

#include <stdbool.h>
#include <stdint.h>

/**
 * Initialize mDNS service and advertise this device
 * 
 * @param role Device role ("weapon" or "target")
 * @param device_id Unique device identifier (0-63)
 * @param player_id Player identifier (0-31)
 * @param port WebSocket server port (typically 80)
 * @return true if mDNS started successfully, false otherwise
 */
bool mdns_service_init(const char* role, uint8_t device_id, uint8_t player_id, uint16_t port);

/**
 * Update mDNS TXT records (e.g., when player ID changes)
 * 
 * @param player_id New player identifier
 * @return true if update succeeded
 */
bool mdns_service_update_player(uint8_t player_id);

/**
 * Stop mDNS service and remove advertisement
 */
void mdns_service_deinit(void);

#ifdef __cplusplus
}
#endif
