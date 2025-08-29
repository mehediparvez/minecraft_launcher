#!/bin/bash

# Ultra-Minimal Void Client Build Script
# Creates the smallest possible installer by excluding ALL heavy assets

echo "🚀 Building Ultra-Minimal Void Client"
echo "======================================"

# Clean everything
echo "🧹 Deep cleaning..."
rm -rf dist/ node_modules/.cache/ temp-backup/ || true

# Backup ALL heavy assets
echo "💾 Backing up ALL assets..."
mkdir -p temp-assets-backup
mv java temp-assets-backup/ 2>/dev/null || true
mv files temp-assets-backup/ 2>/dev/null || true
mv minecraft temp-assets-backup/ 2>/dev/null || true

# Also backup any existing dist folder contents
mv ../minecraft temp-assets-backup/ 2>/dev/null || true
mv ../locales temp-assets-backup/ 2>/dev/null || true
mv ../resources temp-assets-backup/ 2>/dev/null || true

# Create absolute minimal structure
echo "📦 Creating minimal launcher..."
mkdir -p assets/icons

# Copy only essential icon
cp build/icon.png assets/icons/ 2>/dev/null || echo "No icon found"

# Create minimal package.json for build
echo "⚙️  Optimizing package.json..."
cp package.json package.json.backup

# Modify package.json to exclude everything heavy
cat > temp-package.json << 'EOF'
{
  "name": "void-client",
  "version": "1.0.0",
  "description": "Minecraft launcher with Microsoft authentication",
  "main": "./src/index.js",
  "homepage": "https://github.com/mehediparvez/minecraft_launcher",
  "author": {
    "name": "Void Client Team",
    "email": "contact@voidclient.dev"
  },
  "license": "ISC",
  "scripts": {
    "start": "electron .",
    "dist:linux": "electron-builder --linux"
  },
  "build": {
    "appId": "com.voidclient.app",
    "productName": "Void Client",
    "directories": {
      "output": "dist"
    },
    "files": [
      "src/**/*",
      "build/icon.png",
      "package.json",
      "!**/*.map",
      "!**/node_modules/**",
      "!**/.git/**",
      "!**/temp-*/**"
    ],
    "extraResources": [],
    "asar": true,
    "compression": "maximum",
    "linux": {
      "target": [
        {
          "target": "AppImage",
          "arch": ["x64"]
        }
      ],
      "category": "Game",
      "icon": "build/icon.png"
    }
  },
  "dependencies": {
    "@azure/msal-node": "^3.7.2",
    "node-fetch": "^2.6.7",
    "uuid": "^11.1.0"
  },
  "devDependencies": {
    "electron": "^29.4.6",
    "electron-builder": "^24.13.3"
  }
}
EOF

mv temp-package.json package.json

# Install minimal dependencies
echo "📥 Installing minimal dependencies..."
npm install --production

# Build only Linux AppImage (smallest format)
echo "🔨 Building minimal Linux AppImage..."
npm run dist:linux

# Restore original files
echo "🔄 Restoring original package.json..."
mv package.json.backup package.json

echo "🔄 Restoring backed up assets..."
mv temp-assets-backup/* . 2>/dev/null || true
rmdir temp-assets-backup 2>/dev/null || true

# Show results
echo ""
echo "📊 Minimal Build Results:"
echo "========================="
ls -lh dist/ | grep AppImage
echo ""

# Calculate size
SIZE=$(ls -la dist/*.AppImage 2>/dev/null | awk '{print $5}')
if [ ! -z "$SIZE" ]; then
    SIZE_MB=$((SIZE / 1024 / 1024))
    echo "🎯 Installer size: ${SIZE_MB}MB"
    
    if [ $SIZE_MB -lt 100 ]; then
        echo "✅ SUCCESS: Under 100MB target achieved!"
    else
        echo "⚠️  Still over 100MB. Consider removing more dependencies."
    fi
else
    echo "❌ Build may have failed"
fi

echo ""
echo "💡 This minimal installer will:"
echo "   • Download Java runtime on first start (~50MB)"
echo "   • Download Minecraft assets as needed (~200-500MB)"
echo "   • Provide fastest initial download for users"
echo "   • Cache everything locally after first run"
