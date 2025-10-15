# RayZ Version Management Guide

This document explains how to manage versions across Target, Weapon, and Shared libraries.

## Version Strategy

### Semantic Versioning
All components use semantic versioning: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes (incompatible API changes)
- **MINOR**: New features (backward-compatible)
- **PATCH**: Bug fixes (backward-compatible)

### Components

1. **Shared Library** (`esp32/shared/`)
   - Lives in main RayZ repo
   - Contains common code, protocols, headers
   - Version in `library.json`

2. **Target Firmware** (`esp32/target/` - submodule)
   - Separate git repository: `rayz-target`
   - References specific shared library version
   - Has its own version tags

3. **Weapon Firmware** (`esp32/weapon/` - submodule)
   - Separate git repository: `rayz-weapon`
   - References specific shared library version
   - Has its own version tags

## Compatibility Matrix

| Target | Weapon | Shared | Notes |
|--------|--------|--------|-------|
| 1.0.0  | 1.0.0  | 1.0.0  | Initial release |
| 1.0.0  | 1.2.0  | 1.0.0  | Weapon improvements, backward compatible |
| 1.1.0  | 1.1.0  | 1.1.0  | New protocol features |
| 2.0.0  | 2.0.0  | 2.0.0  | Breaking changes |

## Workflow Examples

### Scenario 1: Bug Fix in Target (No Protocol Change)

```bash
# 1. Fix bug in target
cd esp32/target
git checkout main
# ... make changes ...
git commit -m "Fix sensor reading bug"
git tag v1.0.1
git push origin main --tags

# 2. Update main repo to use new target version
cd ../..
git add esp32/target
git commit -m "Update target to v1.0.1"
```

### Scenario 2: New Feature in Shared Library

```bash
# 1. Update shared library
cd esp32/shared
# ... add new header/library ...
git add .
git commit -m "Add new communication feature"
# Update version in library.json to 1.1.0

# 2. Update target to use new shared feature
cd ../target
# Update platformio.ini if needed
# Add code using new feature
git commit -m "Use new shared library v1.1.0"
git tag v1.1.0
git push origin main --tags

# 3. Update weapon similarly
cd ../weapon
# ... update weapon ...
git tag v1.1.0
git push origin main --tags

# 4. Update main repo
cd ../..
git add esp32/shared esp32/target esp32/weapon
git commit -m "Update all components to v1.1.0"
git tag v1.1.0
git push origin main --tags
```

### Scenario 3: Use Different Versions Together

```bash
# Use target v1.0.0 with weapon v1.2.0
cd esp32/target
git checkout v1.0.0
cd ../weapon
git checkout v1.2.0
cd ../..

# Commit this specific combination
git add esp32/target esp32/weapon
git commit -m "Config: Target v1.0.0 + Weapon v1.2.0"
git tag config-t1.0.0-w1.2.0
git push origin main --tags
```

### Scenario 4: Testing New Feature Before Release

```bash
# Create feature branch in target
cd esp32/target
git checkout -b feature-new-sensor
# ... develop ...
git commit -m "Add new sensor support"
git push origin feature-new-sensor

# In main repo, temporarily point to this branch
cd ../..
# Update .gitmodules or manually checkout branch
git add esp32/target
git commit -m "Testing: target feature-new-sensor branch"

# After testing, merge and tag in target repo
cd esp32/target
git checkout main
git merge feature-new-sensor
git tag v1.2.0
git push origin main --tags
```

## Checking Current Versions

```bash
# Check all component versions
cd esp32

# Target version
cd target && git describe --tags && cd ..

# Weapon version  
cd weapon && git describe --tags && cd ..

# Shared version (from library.json)
cat shared/library.json | grep version

# Or use this helper script:
cd ../.. && git submodule status
```

## Best Practices

1. **Always tag releases** in all repos (target, weapon, main)
2. **Document compatibility** in release notes
3. **Test combinations** before tagging main repo
4. **Use config tags** (like `config-t1.0.0-w1.2.0`) for known-good combinations
5. **Keep shared library stable** - breaking changes require major version bump
6. **Update README** when adding new shared features

## Helper Script

Create `check-versions.sh`:

```bash
#!/bin/bash
echo "=== RayZ Version Status ==="
echo "Target:  $(cd esp32/target && git describe --tags)"
echo "Weapon:  $(cd esp32/weapon && git describe --tags)"
echo "Shared:  $(cat esp32/shared/library.json | grep version | cut -d'"' -f4)"
echo "Main:    $(git describe --tags)"
```

## CI/CD Integration

Consider setting up GitHub Actions to:
- Auto-build each version combination
- Run compatibility tests
- Generate compatibility matrix
- Create release notes with version info
