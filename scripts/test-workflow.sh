#!/bin/bash
# Test GitHub Actions workflow locally

echo "🧪 Testing Build Configuration..."

# Navigate to project root from scripts directory
cd "$(dirname "$0")/.."

echo "📍 Working directory: $(pwd)"

# Check package.json
echo "📦 Checking package.json..."
if [ -f "package.json" ]; then
    echo "✅ package.json exists"
    VERSION=$(grep '"version"' package.json | cut -d'"' -f4)
    echo "📋 Current version: $VERSION"
else
    echo "❌ package.json not found"
    exit 1
fi

# Check build scripts
echo "🔨 Checking build scripts..."
npm list electron-builder || echo "⚠️ electron-builder not found in dependencies"

# Check GitHub Actions workflow
echo "🤖 Checking GitHub Actions workflow..."
if [ -f ".github/workflows/build-and-release.yml" ]; then
    echo "✅ GitHub Actions workflow exists"
    echo "📋 Workflow triggers on: push to main branch"
else
    echo "❌ GitHub Actions workflow not found"
fi

# Check directories that should exist
echo "📁 Checking directory structure..."
[ -d "src" ] && echo "✅ src/ directory exists" || echo "❌ src/ directory missing"
[ -d "build" ] && echo "✅ build/ directory exists" || echo "❌ build/ directory missing"
[ -f "build/icon.png" ] && echo "✅ Icon file exists" || echo "❌ Icon file missing"
[ -d "assets" ] && echo "✅ assets/ directory exists" || echo "❌ assets/ directory missing"
[ -d "java" ] && echo "✅ java/ directory exists" || echo "❌ java/ directory missing"
[ -d "minecraft" ] && echo "✅ minecraft/ directory exists" || echo "❌ minecraft/ directory missing"
[ -d "scripts" ] && echo "✅ scripts/ directory exists" || echo "❌ scripts/ directory missing"
[ -d "docs" ] && echo "✅ docs/ directory exists" || echo "❌ docs/ directory missing"

# Check Java runtime structure
echo "☕ Checking Java runtime structure..."
if [ -d "java/java8" ] || [ -d "java/java21" ]; then
    echo "✅ Generic Java runtimes found"
    [ -d "java/java8" ] && echo "  ✅ Java 8 runtime exists"
    [ -d "java/java21" ] && echo "  ✅ Java 21 runtime exists"
fi

# Check platform-specific Java
[ -d "java/windows-x64" ] && echo "  ✅ Windows Java runtimes exist"
[ -d "java/linux-x64" ] && echo "  ✅ Linux Java runtimes exist"
[ -d "java/mac-x64" ] && echo "  ✅ macOS Java runtimes exist"

# Check configuration files
echo "⚙️ Checking configuration files..."
[ -f "debug-config.json" ] && echo "✅ debug-config.json exists" || echo "❌ debug-config.json missing"
[ -f "installer-config.json" ] && echo "✅ installer-config.json exists" || echo "❌ installer-config.json missing"

echo ""
echo "🚀 Ready to push to GitHub!"
echo "💡 When you push to main branch, the workflow will:"
echo "   1. Build installers for Windows, macOS, and Linux"
echo "   2. Create a GitHub Release with tag v1.0.0"
echo "   3. Upload all installer files automatically"
echo ""
echo "🔗 After pushing, check: https://github.com/mehediparvez/minecraft_launcher/releases"
