#!/bin/bash

# Void Client Optimized Build Script
# This script creates a minimal installer that downloads assets on first run

echo "🚀 Building Void Client - Optimized Version"
echo "============================================="

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/
rm -rf node_modules/.cache/

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Remove development files from build
echo "🗑️  Removing unnecessary files..."
mkdir -p temp-backup
mv java temp-backup/ 2>/dev/null || true
mv files temp-backup/ 2>/dev/null || true
mv minecraft temp-backup/ 2>/dev/null || true

# Create minimal asset structure
echo "📁 Creating minimal asset structure..."
mkdir -p assets/manifests
echo '{"version": "1.0.0", "download_required": true}' > assets/manifests/assets.json

# Build for all platforms with optimized settings
echo "🔨 Building optimized installers..."

# Linux build
echo "Building for Linux..."
npm run dist:linux

# Windows build  
echo "Building for Windows..."
npm run dist:win

# Mac build
echo "Building for macOS..."
npm run dist:mac

# Restore backed up files
echo "🔄 Restoring development files..."
mv temp-backup/* . 2>/dev/null || true
rmdir temp-backup 2>/dev/null || true

# Show build sizes
echo "📊 Build Results:"
echo "=================="
ls -lh dist/ | grep -E '\.(exe|AppImage|dmg|deb|zip)$'

echo ""
echo "✅ Optimized build complete!"
echo ""
echo "📏 Installer sizes should now be under 100MB"
echo "🌐 Java and Minecraft assets will be downloaded on first run"
echo "⚡ This provides faster downloads for users"
