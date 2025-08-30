#!/bin/bash

# Minimal build script for Void Client
# This creates an installer without bundling large Java runtimes and Minecraft assets

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

echo "🚀 Building Void Client (Minimal Installer)"
echo "Project Directory: $PROJECT_DIR"
echo "==============================================="

# Create backup directory for excluded assets
BACKUP_DIR=".installer-backup"
mkdir -p "$BACKUP_DIR"

echo "📦 Temporarily moving large assets..."

# Move large directories to backup
if [ -d "java" ]; then
    echo "  Moving java/ directory..."
    mv java "$BACKUP_DIR/"
fi

if [ -d "minecraft/assets" ]; then
    echo "  Moving minecraft/assets/ directory..."
    mv minecraft/assets "$BACKUP_DIR/"
fi

if [ -d "minecraft/libraries" ]; then
    echo "  Moving minecraft/libraries/ directory..."
    mv minecraft/libraries "$BACKUP_DIR/"
fi

if [ -d "minecraft/versions" ]; then
    echo "  Moving minecraft/versions/ directory..."
    mv minecraft/versions "$BACKUP_DIR/"
fi

echo "🔨 Building installer..."

# Run the build
npm run dist

BUILD_EXIT_CODE=$?

echo "♻️  Restoring assets..."

# Restore the moved directories
if [ -d "$BACKUP_DIR/java" ]; then
    echo "  Restoring java/ directory..."
    mv "$BACKUP_DIR/java" ./
fi

if [ -d "$BACKUP_DIR/assets" ]; then
    echo "  Restoring minecraft/assets/ directory..."
    mkdir -p minecraft
    mv "$BACKUP_DIR/assets" minecraft/
fi

if [ -d "$BACKUP_DIR/libraries" ]; then
    echo "  Restoring minecraft/libraries/ directory..."
    mkdir -p minecraft
    mv "$BACKUP_DIR/libraries" minecraft/
fi

if [ -d "$BACKUP_DIR/versions" ]; then
    echo "  Restoring minecraft/versions/ directory..."
    mkdir -p minecraft
    mv "$BACKUP_DIR/versions" minecraft/
fi

# Clean up backup directory
rmdir "$BACKUP_DIR" 2>/dev/null || true

if [ $BUILD_EXIT_CODE -eq 0 ]; then
    echo "✅ Minimal build completed successfully!"
    echo "📁 Build output: dist/"
    echo ""
    echo "ℹ️  This installer will download Java runtimes and assets on first run."
else
    echo "❌ Build failed with exit code $BUILD_EXIT_CODE"
    exit $BUILD_EXIT_CODE
fi
