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
