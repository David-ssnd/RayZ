# RayZ ESP32 Structure

This directory contains the ESP32 firmware projects as git submodules.

## Structure

```
esp32/
├── shared/           # Shared libraries and headers (in main repo)
├── target/           # Target device firmware (submodule: rayz-target)
└── weapon/           # Weapon device firmware (submodule: rayz-weapon)
```

## Version Management

Each submodule (target/weapon) is a separate git repository and can be versioned independently:

```bash
# Update target to specific version
cd target
git checkout v1.0.0
cd ..

# Update weapon to specific version  
cd weapon
git checkout v1.2.0
cd ..

# Commit the version combination in main repo
git add target weapon
git commit -m "Use target v1.0.0 with weapon v1.2.0"
```

## Shared Library

The `shared/` directory lives in the main RayZ repository and contains:
- Common headers (`include/`)
- Shared libraries (`lib/`)
- Protocol definitions
- Common utilities

Both target and weapon reference this by adding to their `platformio.ini`:

```ini
lib_extra_dirs = ../shared/lib
build_flags = -I../shared/include
```

## Working with Submodules

```bash
# Clone with all submodules
git clone --recursive https://github.com/David-ssnd/RayZ.git

# Update all submodules to latest
git submodule update --remote

# Initialize submodules after clone
git submodule update --init --recursive
```

## Development Workflow

1. **Make changes to shared code**: Edit `shared/` directly, commit to main repo
2. **Make changes to target/weapon**: 
   - `cd target` or `cd weapon`
   - Make changes, commit, push to that repo
   - `cd ..` back to main repo
   - `git add target` to update submodule reference
   - Commit to main repo

3. **Tag versions**:
   ```bash
   cd target
   git tag v1.1.0
   git push origin v1.1.0
   ```

## Building

```bash
# Build target
cd target
pio run

# Build weapon  
cd weapon
pio run
```

## Wi-Fi Provisioning Flow (New)

On first boot (or after factory reset) the firmware starts an open AP named `RayZ-Setup` on channel 1 with IP `192.168.4.1` and serves a minimal configuration page at `http://192.168.4.1/`.

Form fields stored to NVS:
- SSID / Password
- Device Name
- Role (`weapon` / `target`)

After submission the device switches to STA mode, connects to the configured network and exposes:
- Root page (status)
- `GET /api/status` (JSON: wifi, ip)
- `WS /ws` WebSocket endpoint for future event streaming

Factory reset API (erases NVS and restarts): internal call `wifi_manager_factory_reset()` (future: map to GPIO long press or REST endpoint).

When provisioned the device skips AP and directly connects in STA mode.
