#!/bin/bash

# Development script to run Electron with better icon support
# This script helps show the custom icon even in development mode

cd "$(dirname "$0")"

# Set application name for better desktop integration
export ELECTRON_DISABLE_SANDBOX=1
export ELECTRON_ENABLE_LOGGING=1

# Copy icon to a system-recognizable location temporarily
mkdir -p ~/.local/share/icons/hicolor/256x256/apps/
cp build/icon.png ~/.local/share/icons/hicolor/256x256/apps/void-client.png

# Update icon cache
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
    gtk-update-icon-cache ~/.local/share/icons/hicolor/ 2>/dev/null || true
fi

# Run the application
echo "🚀 Starting Void Client in development mode..."
echo "📋 Note: Icons may still appear generic in development mode"
echo "🏗️  For proper icons, use: npm run build-with-icon"
echo ""

npm start
