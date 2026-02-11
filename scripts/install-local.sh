#!/bin/bash
#
# RayZ Local Mode Installation Script
# For Linux and macOS
#
# This script installs and sets up RayZ in local mode with SQLite database.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/your-org/rayz/main/scripts/install-local.sh | bash
#   OR
#   ./scripts/install-local.sh
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://github.com/David-ssnd/RayZ.git"
INSTALL_DIR="$HOME/rayz-local"
NODE_MIN_VERSION="18"

# Print colored message
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_header() {
    echo ""
    print_message "$BLUE" "========================================="
    print_message "$BLUE" "  RayZ Local Mode Installer"
    print_message "$BLUE" "========================================="
    echo ""
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        print_message "$RED" "✗ $1 is not installed"
        return 1
    else
        print_message "$GREEN" "✓ $1 is installed"
        return 0
    fi
}

check_node_version() {
    local version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$version" -lt "$NODE_MIN_VERSION" ]; then
        print_message "$RED" "✗ Node.js version must be >= $NODE_MIN_VERSION (found: $version)"
        return 1
    else
        print_message "$GREEN" "✓ Node.js version OK (v$version)"
        return 0
    fi
}

# Main installation process
main() {
    print_header
    
    print_message "$YELLOW" "Step 1/6: Checking dependencies..."
    
    # Check for required tools
    local has_all_deps=true
    check_command "git" || has_all_deps=false
    check_command "node" || has_all_deps=false
    check_command "npm" || has_all_deps=false
    
    if [ "$has_all_deps" = false ]; then
        print_message "$RED" "\nMissing required dependencies. Please install them and try again."
        print_message "$YELLOW" "\nInstallation instructions:"
        print_message "$YELLOW" "  Node.js: https://nodejs.org/"
        print_message "$YELLOW" "  Git: https://git-scm.com/"
        exit 1
    fi
    
    check_node_version || {
        print_message "$RED" "\nNode.js version too old. Please update and try again."
        exit 1
    }
    
    echo ""
    print_message "$YELLOW" "Step 2/6: Installing pnpm..."
    if ! command -v pnpm &> /dev/null; then
        npm install -g pnpm
        print_message "$GREEN" "✓ pnpm installed"
    else
        print_message "$GREEN" "✓ pnpm already installed"
    fi
    
    echo ""
    print_message "$YELLOW" "Step 3/6: Cloning repository..."
    if [ -d "$INSTALL_DIR" ]; then
        print_message "$YELLOW" "  Directory already exists. Pulling latest changes..."
        cd "$INSTALL_DIR"
        git pull
    else
        git clone "$REPO_URL" "$INSTALL_DIR"
        cd "$INSTALL_DIR"
    fi
    print_message "$GREEN" "✓ Repository ready"
    
    echo ""
    print_message "$YELLOW" "Step 4/6: Installing dependencies..."
    cd "$INSTALL_DIR/web"
    pnpm install
    print_message "$GREEN" "✓ Dependencies installed"
    
    echo ""
    print_message "$YELLOW" "Step 5/6: Configuring local mode..."
    
    # Create .env.local if it doesn't exist
    cd "$INSTALL_DIR/web/packages/database"
    if [ ! -f ".env.local" ]; then
        cp .env.local.example .env.local
        
        # Generate random auth secret
        AUTH_SECRET=$(openssl rand -base64 32)
        sed -i.bak "s/<generate_with: openssl rand -base64 32>/$AUTH_SECRET/" .env.local
        rm -f .env.local.bak
        
        print_message "$GREEN" "✓ Configuration file created"
    else
        print_message "$YELLOW" "  Configuration file already exists (skipping)"
    fi
    
    echo ""
    print_message "$YELLOW" "Step 6/6: Initializing database..."
    pnpm db:init:local
    print_message "$GREEN" "✓ Database initialized"
    
    echo ""
    print_message "$GREEN" "========================================="
    print_message "$GREEN" "  Installation Complete!"
    print_message "$GREEN" "========================================="
    echo ""
    print_message "$BLUE" "Default login credentials:"
    print_message "$BLUE" "  Email:    admin@localhost"
    print_message "$BLUE" "  Password: admin"
    echo ""
    print_message "$YELLOW" "⚠️  Change the default password after first login!"
    echo ""
    print_message "$BLUE" "To start RayZ:"
    print_message "$BLUE" "  cd $INSTALL_DIR/web"
    print_message "$BLUE" "  pnpm dev"
    echo ""
    print_message "$BLUE" "Then open: http://localhost:3000"
    echo ""
}

# Run main installation
main
