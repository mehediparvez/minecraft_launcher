#!/bin/bash

# Debug mode toggle script for Void Client
CONFIG_FILE="debug-config.json"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ Debug config file not found: $CONFIG_FILE"
    echo "Creating default config file..."
    cat > "$CONFIG_FILE" << EOF
{
  "enableDebugMode": false,
  "autoOpenDevTools": false,
  "showDebugInfo": false,
  "debugShortcuts": true,
  "contextMenu": true,
  "description": "Set enableDebugMode to true to enable debug features in production builds"
}
EOF
    echo "✅ Created $CONFIG_FILE"
fi

# Read current debug mode status
CURRENT_STATUS=$(grep -o '"enableDebugMode": *[^,}]*' "$CONFIG_FILE" | grep -o '[^:]*$' | tr -d ' "')

echo "🔧 Void Client Debug Mode Toggle"
echo "================================"
echo "Current status: $CURRENT_STATUS"
echo ""

if [ "$1" = "enable" ] || [ "$1" = "on" ] || [ "$1" = "true" ]; then
    echo "🟢 Enabling debug mode..."
    sed -i 's/"enableDebugMode": false/"enableDebugMode": true/g' "$CONFIG_FILE"
    sed -i 's/"autoOpenDevTools": false/"autoOpenDevTools": true/g' "$CONFIG_FILE"
    echo "✅ Debug mode enabled!"
    echo "📝 Developer tools will open automatically on next launch"
    echo "🔧 Available shortcuts:"
    echo "   - F12: Toggle Developer Tools"
    echo "   - Ctrl+Alt+I: Toggle Developer Tools"  
    echo "   - Ctrl+K: Clear Console"
    echo "   - Right-click: Context menu with debug options"
    echo "   - Click 5 times on invisible area (top-right): Enable debug overlay"
    
elif [ "$1" = "disable" ] || [ "$1" = "off" ] || [ "$1" = "false" ]; then
    echo "🔴 Disabling debug mode..."
    sed -i 's/"enableDebugMode": true/"enableDebugMode": false/g' "$CONFIG_FILE"
    sed -i 's/"autoOpenDevTools": true/"autoOpenDevTools": false/g' "$CONFIG_FILE"
    echo "✅ Debug mode disabled!"
    echo "📝 Developer tools will not open automatically"
    
elif [ "$1" = "toggle" ] || [ "$1" = "" ]; then
    if [ "$CURRENT_STATUS" = "true" ]; then
        echo "🔴 Disabling debug mode..."
        sed -i 's/"enableDebugMode": true/"enableDebugMode": false/g' "$CONFIG_FILE"
        sed -i 's/"autoOpenDevTools": true/"autoOpenDevTools": false/g' "$CONFIG_FILE"
        echo "✅ Debug mode disabled!"
    else
        echo "🟢 Enabling debug mode..."
        sed -i 's/"enableDebugMode": false/"enableDebugMode": true/g' "$CONFIG_FILE"
        sed -i 's/"autoOpenDevTools": false/"autoOpenDevTools": true/g' "$CONFIG_FILE"
        echo "✅ Debug mode enabled!"
        echo "🔧 Available debug features:"
        echo "   - F12: Toggle Developer Tools"
        echo "   - Ctrl+Alt+I: Toggle Developer Tools"  
        echo "   - Ctrl+K: Clear Console"
        echo "   - Right-click: Context menu with debug options"
        echo "   - Click 5 times on invisible area: Enable debug overlay"
    fi
    
else
    echo "❓ Usage: $0 [enable|disable|toggle]"
    echo ""
    echo "Options:"
    echo "  enable/on/true   - Enable debug mode"
    echo "  disable/off/false - Disable debug mode"  
    echo "  toggle           - Toggle current state (default)"
    echo ""
    echo "Current config:"
    cat "$CONFIG_FILE"
    exit 1
fi

echo ""
echo "📋 Current configuration:"
cat "$CONFIG_FILE"
echo ""
echo "🔄 Restart the application to apply changes"
