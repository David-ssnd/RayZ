# Git Aliases for RayZ

This document lists custom git aliases configured for the RayZ project.

## Available Aliases

### `git versions`

Displays the version status of all RayZ components (main repo, target, weapon, shared, web).

**Usage:**
```bash
git versions
```

**Output:**
```
╔═══════════════════════════════════════════════════════════╗
║           RayZ Version Status                             ║
╚═══════════════════════════════════════════════════════════╝

📦 Main Repository:     v1.0.0
🎯 Target Device:       v1.0.0
🔫 Weapon Device:       v1.0.0
📚 Shared Library:      v1.0.0
🌐 Web Interface:       (current)

Submodule Status...
```

**Configured as:**
```bash
git config alias.versions '!pwsh -File check-versions.ps1'
```

## Setup

The alias is already configured in the local repository. To verify:

```bash
git config --get alias.versions
```

### For New Clones

The alias is stored in `.git/config` (local to repo), so new clones need to set it up:

```bash
cd RayZ
git config alias.versions '!pwsh -File check-versions.ps1'
```

### Alternative: Global Alias

To make it available in any git repo (not recommended unless you work on RayZ often):

```bash
# Don't do this - it won't work outside RayZ directory
# git config --global alias.versions '!pwsh -File check-versions.ps1'
```

## Adding New Aliases

To add more aliases for RayZ:

```bash
# Local to this repo
git config alias.name 'command'

# Example: Quick submodule update
git config alias.update-subs '!git submodule update --remote'
```

## Useful Aliases to Consider

```bash
# Update all submodules to latest
git config alias.update-subs 'submodule update --remote'

# Show submodule status
git config alias.sub-status 'submodule status'

# Initialize and update submodules
git config alias.sub-init 'submodule update --init --recursive'

# Quick status of all repos
git config alias.status-all '!git status && git submodule foreach git status'
```

## Usage Examples

### Check Versions Before Tagging
```bash
git versions
# Review all component versions
git tag v1.1.0
git push --tags
```

### After Updating Submodules
```bash
git submodule update --remote
git versions
# Verify new versions are pulled
```

### Before Deploying
```bash
git versions
# Verify you have the right combination
# Deploy with confidence
```

## Removing Aliases

To remove an alias:

```bash
git config --unset alias.versions
```

## Documentation

This alias is documented in:
- This file (`GIT_ALIASES.md`)
- `README.md` - Quick reference
- `SETUP.md` - Development workflow

## See Also

- [check-versions.ps1](check-versions.ps1) - The script called by the alias
- [check-versions.sh](check-versions.sh) - Bash alternative for Unix systems
- [Git Aliases Documentation](https://git-scm.com/book/en/v2/Git-Basics-Git-Aliases)
