#
# RayZ Local Mode Installation Script for Windows
# PowerShell 5.1+ required
#
# Usage:
#   irm https://raw.githubusercontent.com/your-org/rayz/main/scripts/install-local.ps1 | iex
#   OR
#   .\scripts\install-local.ps1
#

param(
    [string]$InstallDir = "$env:USERPROFILE\rayz-local"
)

$ErrorActionPreference = "Stop"

# Configuration
$RepoUrl = "https://github.com/David-ssnd/RayZ.git"
$NodeMinVersion = 18

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Write-Header {
    Write-Host ""
    Write-ColorOutput "=========================================" "Cyan"
    Write-ColorOutput "  RayZ Local Mode Installer" "Cyan"
    Write-ColorOutput "=========================================" "Cyan"
    Write-Host ""
}

function Test-Command {
    param([string]$Command)
    
    $exists = $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
    if ($exists) {
        Write-ColorOutput "✓ $Command is installed" "Green"
    } else {
        Write-ColorOutput "✗ $Command is not installed" "Red"
    }
    return $exists
}

function Test-NodeVersion {
    try {
        $version = (node -v).Trim('v').Split('.')[0]
        $versionNumber = [int]$version
        
        if ($versionNumber -lt $NodeMinVersion) {
            Write-ColorOutput "✗ Node.js version must be >= $NodeMinVersion (found: $version)" "Red"
            return $false
        } else {
            Write-ColorOutput "✓ Node.js version OK (v$version)" "Green"
            return $true
        }
    } catch {
        Write-ColorOutput "✗ Failed to check Node.js version" "Red"
        return $false
    }
}

function Install-Pnpm {
    if (Test-Command "pnpm") {
        Write-ColorOutput "✓ pnpm already installed" "Green"
    } else {
        Write-ColorOutput "Installing pnpm..." "Yellow"
        npm install -g pnpm
        Write-ColorOutput "✓ pnpm installed" "Green"
    }
}

# Main installation process
try {
    Write-Header
    
    Write-ColorOutput "Step 1/6: Checking dependencies..." "Yellow"
    
    # Check for required tools
    $hasAllDeps = $true
    $hasAllDeps = (Test-Command "git") -and $hasAllDeps
    $hasAllDeps = (Test-Command "node") -and $hasAllDeps
    $hasAllDeps = (Test-Command "npm") -and $hasAllDeps
    
    if (-not $hasAllDeps) {
        Write-Host ""
        Write-ColorOutput "Missing required dependencies. Please install them and try again." "Red"
        Write-ColorOutput "`nInstallation instructions:" "Yellow"
        Write-ColorOutput "  Node.js: https://nodejs.org/" "Yellow"
        Write-ColorOutput "  Git: https://git-scm.com/" "Yellow"
        exit 1
    }
    
    if (-not (Test-NodeVersion)) {
        Write-Host ""
        Write-ColorOutput "Node.js version too old. Please update and try again." "Red"
        exit 1
    }
    
    Write-Host ""
    Write-ColorOutput "Step 2/6: Installing pnpm..." "Yellow"
    Install-Pnpm
    
    Write-Host ""
    Write-ColorOutput "Step 3/6: Cloning repository..." "Yellow"
    if (Test-Path $InstallDir) {
        Write-ColorOutput "  Directory already exists. Pulling latest changes..." "Yellow"
        Set-Location $InstallDir
        git pull
    } else {
        git clone $RepoUrl $InstallDir
        Set-Location $InstallDir
    }
    Write-ColorOutput "✓ Repository ready" "Green"
    
    Write-Host ""
    Write-ColorOutput "Step 4/6: Installing dependencies..." "Yellow"
    Set-Location "$InstallDir\web"
    pnpm install
    Write-ColorOutput "✓ Dependencies installed" "Green"
    
    Write-Host ""
    Write-ColorOutput "Step 5/6: Configuring local mode..." "Yellow"
    
    # Create .env.local if it doesn't exist
    Set-Location "$InstallDir\web\packages\database"
    if (-not (Test-Path ".env.local")) {
        Copy-Item ".env.local.example" ".env.local"
        
        # Generate random auth secret
        $AuthSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
        $AuthSecretBase64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($AuthSecret))
        
        $content = Get-Content ".env.local"
        $content = $content -replace '<generate_with: openssl rand -base64 32>', $AuthSecretBase64
        Set-Content ".env.local" $content
        
        Write-ColorOutput "✓ Configuration file created" "Green"
    } else {
        Write-ColorOutput "  Configuration file already exists (skipping)" "Yellow"
    }
    
    Write-Host ""
    Write-ColorOutput "Step 6/6: Initializing database..." "Yellow"
    pnpm db:init:local
    Write-ColorOutput "✓ Database initialized" "Green"
    
    Write-Host ""
    Write-ColorOutput "=========================================" "Green"
    Write-ColorOutput "  Installation Complete!" "Green"
    Write-ColorOutput "=========================================" "Green"
    Write-Host ""
    Write-ColorOutput "Default login credentials:" "Cyan"
    Write-ColorOutput "  Email:    admin@localhost" "Cyan"
    Write-ColorOutput "  Password: admin" "Cyan"
    Write-Host ""
    Write-ColorOutput "⚠️  Change the default password after first login!" "Yellow"
    Write-Host ""
    Write-ColorOutput "To start RayZ:" "Cyan"
    Write-ColorOutput "  cd $InstallDir\web" "Cyan"
    Write-ColorOutput "  pnpm dev" "Cyan"
    Write-Host ""
    Write-ColorOutput "Then open: http://localhost:3000" "Cyan"
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-ColorOutput "❌ Installation failed: $_" "Red"
    Write-ColorOutput "Please check the error message above and try again." "Yellow"
    exit 1
}
