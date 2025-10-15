# Architecture Decision: Separate Repos + Shared Library

## Final Structure

```
RayZ/ (main repo - monorepo coordinator)
├── esp32/
│   ├── shared/              # Shared code IN MAIN REPO
│   │   ├── include/         # Common headers
│   │   ├── lib/             # Common libraries  
│   │   ├── examples/        # Usage examples
│   │   └── library.json     # Version info
│   ├── target/              # Git submodule → rayz-target repo
│   │   └── platformio.ini   # References ../shared
│   └── weapon/              # Git submodule → rayz-weapon repo
│       └── platformio.ini   # References ../shared
└── web/                     # Git submodule → rayz-web repo
```

## Why This Approach?

### ✅ Advantages

1. **Independent Versioning**
   - Target and Weapon can have different versions
   - Use Target v1.0.0 with Weapon v1.2.0
   - Each device has its own release cycle

2. **Separate Development**
   - Different repos = different GitHub issues/PRs
   - Separate CI/CD pipelines
   - Clear ownership per device type

3. **Code Reuse**
   - Shared library in main repo (no submodule needed)
   - Both devices reference it via `lib_extra_dirs`
   - Single source of truth for protocols

4. **Flexible Deployment**
   - Deploy target updates without touching weapon
   - Mix and match versions in the field
   - Easy rollback per device

5. **Git Submodules Benefits**
   - Main repo tracks which versions work together
   - Tag combinations: `config-t1.0.0-w1.2.0`
   - Clone all at once with `--recursive`

### ⚠️ Considerations

1. **Submodule Complexity**
   - Need to understand git submodules
   - Must update submodule references
   - Can forget to push submodule changes

2. **Shared Library Updates**
   - Changes require updating both repos
   - Breaking changes need coordination
   - Version bumps affect both devices

## Comparison with Alternatives

### ❌ Unified PlatformIO Project (Previous Attempt)
- **Problem**: Can't version target/weapon independently
- **Problem**: Single repo makes separate deployment hard
- **Problem**: Can't use different versions together

### ❌ Duplicate Shared Code
- **Problem**: Code duplication
- **Problem**: Bugs fixed twice
- **Problem**: Protocol drift

### ❌ Shared Library as Submodule
- **Problem**: Extra repo to manage
- **Problem**: More complex references
- **Benefit**: Could version shared separately (if needed later)

### ✅ Current: Separate Repos + Shared in Main (Best)
- Independent versioning ✓
- Code reuse ✓
- Simple shared updates ✓
- Clear structure ✓

## Migration Path (If Shared Library Grows)

If `esp32/shared` becomes complex, you can later convert it to a submodule:

1. Create `rayz-shared` repo
2. Move `esp32/shared` → new repo
3. Add as submodule: `git submodule add <url> esp32/shared`
4. Update target/weapon to reference submodule
5. Now all three components are versioned independently

## Recommendation

**Start with current structure.** Only convert shared to a submodule if:
- Shared library becomes very large (>100 files)
- Need separate versioning of shared code
- Multiple teams working on shared components
- Want to use shared library in other projects

For now, keeping shared in main repo is simpler and sufficient.
