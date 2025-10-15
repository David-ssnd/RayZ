# RayZ

A laser tag system with ESP32-based embedded devices and web interface for game management.

## ✨ Features

- **Dual-Device System**: Separate target (wearable) and weapon (gun) devices
- **Wireless Communication**: ESP32-powered devices with real-time game data
- **Web Dashboard**: Modern web interface for game management and statistics
- **Modular Architecture**: Shared library ensures consistent protocol across devices
- **Independent Versioning**: Mix and match component versions as needed

## 🎯 Project Structure

This is a monorepo that coordinates multiple components via git submodules:

```
RayZ/
├── esp32/
│   ├── shared/           # 📚 Shared library (submodule)
│   ├── target/           # 🎯 Target device firmware (submodule)
│   └── weapon/           # 🔫 Weapon device firmware (submodule)
└── web/                  # 🌐 Web interface (submodule)
```

## 🚀 Quick Start

### Prerequisites

- **ESP32 Development**: [PlatformIO](https://platformio.org/) IDE or CLI
- **Web Development**: [Node.js](https://nodejs.org/) (v18+) and [pnpm](https://pnpm.io/)
- **Git**: For submodule management

### 1. Clone with Submodules

```bash
git clone --recursive https://github.com/David-ssnd/RayZ.git
cd RayZ
```

### 2. Build ESP32 Firmware

```bash
# Build target device
cd esp32/target
pio run

# Build weapon device
cd ../weapon
pio run
```

### 3. Run Web Interface

```bash
cd web
pnpm install
pnpm dev
```

## 📦 Components

### ESP32 Devices

- **Target** ([rayz-target](https://github.com/David-ssnd/rayz-target)) - The device worn by players
- **Weapon** ([rayz-weapon](https://github.com/David-ssnd/rayz-weapon)) - The laser tag gun
- **Shared Library** ([rayz-shared](https://github.com/David-ssnd/rayz-shared)) - Common communication protocols, data structures, and utilities

Both devices use:
- ESP32 microcontroller
- Arduino framework
- PlatformIO build system
- Shared protocol definitions from `esp32/shared/`

### Web Interface

- **Web** ([rayz-web](https://github.com/David-ssnd/rayz-web)) - Game management and statistics
- Built with modern web technologies
- Manages game sessions, player stats, and device configuration

## 📖 Documentation

- **[esp32/README.md](esp32/README.md)** - ESP32-specific documentation
- **[esp32/shared/README.md](esp32/shared/README.md)** - Shared library documentation
- **[web/README.md](web/README.md)** - Web interface documentation

## 🔄 Version Management

This project supports **independent versioning** of components through git submodules:
- Each component (target, weapon, shared, web) has its own version
- Components can be updated independently
- Use Target v1.0.0 with Weapon v1.2.0 ✅
- Use Target v1.1.0 with Weapon v1.1.0 ✅
- Mix and match as needed!

## 🛠️ Development

### Working with Submodules

```bash
# Update all submodules to latest
git submodule update --remote

# Check versions of all components
git submodule foreach 'git describe --tags --always'

# Update specific submodule
cd esp32/target
git pull origin main

# After making changes in a submodule
git add .
git commit -m "Your changes"
git push

# Update main repo to reference new submodule commit
cd ../..
git add esp32/target
git commit -m "Update target submodule"
git push
```

### Shared Library Development

The `esp32/shared/` directory is a git submodule pointing to the [rayz-shared](https://github.com/David-ssnd/rayz-shared) repository and contains:
- Common headers in `include/`
- Shared libraries in `lib/`
- Examples in `examples/`

To update the shared library:
```bash
cd esp32/shared
git checkout main
# Make changes
git add .
git commit -m "Your changes"
git push

# Update main repo to reference new commit
cd ../..
git add esp32/shared
git commit -m "Update shared library"
git push
```

## 🏷️ Current Versions

- **Main Repo**: v1.0.0
- **Target Device**: v1.0.0
- **Weapon Device**: v1.0.0
- **Shared Library**: v1.0.0

## 📝 License

[Add your license here]

## 🤝 Contributing

1. Fork the specific repo you want to contribute to
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 🔗 Links

- [Main Monorepo](https://github.com/David-ssnd/RayZ)
- [Target Device Repo](https://github.com/David-ssnd/rayz-target)
- [Weapon Device Repo](https://github.com/David-ssnd/rayz-weapon)
- [Shared Library Repo](https://github.com/David-ssnd/rayz-shared)
- [Web Interface Repo](https://github.com/David-ssnd/rayz-web)

