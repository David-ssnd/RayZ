#!/bin/bash
# RayZ Version Status Check
# Run this to see all component versions

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║           RayZ Version Status                             ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

echo "📦 Main Repository:"
echo "   Version: $(git describe --tags 2>/dev/null || echo 'No tags yet')"
echo "   Branch:  $(git branch --show-current)"
echo ""

echo "🎯 Target Device (esp32/target):"
if [ -d "esp32/target/.git" ]; then
    cd esp32/target
    echo "   Version: $(git describe --tags 2>/dev/null || echo 'No tags yet')"
    echo "   Branch:  $(git branch --show-current)"
    echo "   Commit:  $(git rev-parse --short HEAD)"
    cd ../..
else
    echo "   ⚠️  Submodule not initialized"
fi
echo ""

echo "🔫 Weapon Device (esp32/weapon):"
if [ -d "esp32/weapon/.git" ]; then
    cd esp32/weapon
    echo "   Version: $(git describe --tags 2>/dev/null || echo 'No tags yet')"
    echo "   Branch:  $(git branch --show-current)"
    echo "   Commit:  $(git rev-parse --short HEAD)"
    cd ../..
else
    echo "   ⚠️  Submodule not initialized"
fi
echo ""

echo "📚 Shared Library (esp32/shared):"
if [ -f "esp32/shared/library.json" ]; then
    VERSION=$(grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' esp32/shared/library.json | cut -d'"' -f4)
    echo "   Version: $VERSION"
else
    echo "   ⚠️  library.json not found"
fi
echo ""

echo "🌐 Web Interface (web):"
if [ -d "web/.git" ]; then
    cd web
    echo "   Version: $(git describe --tags 2>/dev/null || echo 'No tags yet')"
    echo "   Branch:  $(git branch --show-current)"
    echo "   Commit:  $(git rev-parse --short HEAD)"
    cd ..
else
    echo "   ⚠️  Submodule not initialized"
fi
echo ""

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║           Submodule Status                                ║"
echo "╚═══════════════════════════════════════════════════════════╝"
git submodule status
