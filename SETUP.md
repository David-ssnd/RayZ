# Quick Setup Guide

## For New Developers

### 1. Clone the Project

```bash
git clone --recursive https://github.com/David-ssnd/RayZ.git
cd RayZ
```

### 2. Update Target/Weapon platformio.ini

Add these lines to both `esp32/target/platformio.ini` and `esp32/weapon/platformio.ini`:

```ini
[platformio]
lib_extra_dirs = ../shared/lib

[env:esp32dev]
# ... existing config ...
build_flags = 
    -I../shared/include
    -DTARGET_DEVICE  # or -DWEAPON_DEVICE
```

See `esp32/shared/examples/platformio.ini.target` for full example.

### 3. Use Shared Headers

In your `main.cpp`:

```cpp
#include <Arduino.h>
#include "rayz_common.h"  // From shared library

void setup() {
    Serial.begin(115200);
    Serial.printf("Protocol: %s\n", RAYZ_PROTOCOL_VERSION);
}
```

### 4. Build

```bash
cd esp32/target
pio run

# Or
cd esp32/weapon  
pio run
```

## Updating Shared Library

### Add New Header

```bash
# Edit shared/include/new_feature.h
cd esp32/shared/include
# Create your header file

# Update version in library.json
cd ..
# Edit library.json: "version": "1.1.0"

# Commit to main repo
cd ../..
git add esp32/shared
git commit -m "Add new shared feature v1.1.0"
git push
```

### Use in Target/Weapon

```bash
cd esp32/target
# Add #include "new_feature.h" in your code
git commit -m "Use shared library v1.1.0"
git tag v1.1.0
git push origin main --tags

# Back to main repo
cd ../..
git add esp32/target
git commit -m "Target updated to v1.1.0"
```

## Version Management

### Tag a Release

```bash
# In target or weapon repo
cd esp32/target
git tag v1.0.0
git push origin v1.0.0

# Update main repo
cd ../..
git add esp32/target
git commit -m "Release: Target v1.0.0"
```

### Use Specific Version Combination

```bash
cd esp32/target
git checkout v1.0.0

cd ../weapon
git checkout v1.2.0

cd ../..
git add esp32/target esp32/weapon
git commit -m "Config: Target v1.0.0 + Weapon v1.2.0"
git tag config-t1.0.0-w1.2.0
git push --tags
```

### Check Current Versions

```bash
# Quick check
git submodule status

# Detailed
cd esp32/target && git describe --tags
cd ../weapon && git describe --tags
cd ../shared && cat library.json | grep version
```

## Common Tasks

### Pull Latest Changes

```bash
# Update main repo
git pull

# Update submodules
git submodule update --remote

# Or update specific submodule
cd esp32/target
git pull origin main
```

### Make Changes to Target

```bash
cd esp32/target
# Make changes
git add .
git commit -m "Your changes"
git push

# Update main repo reference
cd ../..
git add esp32/target
git commit -m "Update target submodule"
git push
```

### Create New Shared Library Component

```bash
# 1. Add to shared/lib/MyLibrary/
cd esp32/shared
mkdir -p lib/MyLibrary
# Create MyLibrary.h and MyLibrary.cpp

# 2. Commit
cd ../..
git add esp32/shared
git commit -m "Add MyLibrary to shared"

# 3. Use in target/weapon
cd esp32/target
# PlatformIO will automatically find it via lib_extra_dirs
# Just #include "MyLibrary.h"
```

## Troubleshooting

### "Submodule not initialized"
```bash
git submodule update --init --recursive
```

### "Can't find shared headers"
Check `platformio.ini` has:
```ini
build_flags = -I../shared/include
```

### "Submodule points to wrong version"
```bash
cd esp32/target
git checkout main  # or specific tag
cd ../..
git add esp32/target
git commit -m "Fix target version"
```

## See Also

- `VERSIONING.md` - Detailed version management
- `ARCHITECTURE.md` - Why we use this structure
- `esp32/README.md` - ESP32 specific info
- `esp32/shared/README.md` - Shared library details
