# Void Client - Icon Configuration Guide

## Overview

The Void Client application now includes comprehensive icon support for all platforms (Windows, macOS, and Linux). The icon system automatically configures desktop icons, taskbar icons, and window icons.

## Icon Files

### Source Icon
- **Location**: `src/windows/aimg/logo.png`
- **Usage**: Base icon file used in the application UI and for generating platform-specific icons
- **Requirements**: PNG format, preferably square (recommended: 512x512 or higher)

### Generated Platform Icons
All platform-specific icons are automatically generated in the `build/` directory:

- **`build/icon.png`** - Linux AppImage and .deb packages
- **`build/icon.ico`** - Windows executable and installer
- **`build/icon.icns`** - macOS application bundle

## Window Icons

Icons are automatically applied to all application windows:

- ✅ **Login Window** - Shows Void Client icon
- ✅ **Main Window** - Shows Void Client icon  
- ✅ **Debug Window** - Shows Void Client icon
- ✅ **Captcha Window** - Shows Void Client icon
- ✅ **Auth Window** - Shows Void Client icon

## Building with Icons

### Automatic Icon Generation

Use the enhanced build script that automatically generates all required icon formats:

```bash
# Build for all platforms with icon generation
npm run build-with-icon

# Build for specific platforms
npm run build-with-icon -- --win    # Windows only
npm run build-with-icon -- --mac    # macOS only  
npm run build-with-icon -- --linux  # Linux only
```

### Manual Icon Generation

If you need to manually generate icons:

```bash
# Prerequisites: Install ImageMagick
sudo apt install imagemagick  # Ubuntu/Debian
brew install imagemagick      # macOS

# Generate all icon formats
cd dev-workspace
mkdir -p build

# Copy base PNG
cp src/windows/aimg/logo.png build/icon.png

# Generate Windows ICO (multiple sizes embedded)
convert build/icon.png -resize 256x256 build/icon.ico

# Generate macOS ICNS
convert build/icon.png -resize 512x512 build/icon.icns
```

## Platform-Specific Behavior

### Windows
- **Desktop Shortcut**: Uses `build/icon.ico`
- **Taskbar**: Uses `build/icon.ico`
- **Window Title Bar**: Uses runtime PNG icon
- **Installer**: Uses `build/icon.ico`

### macOS
- **Application Bundle**: Uses `build/icon.icns`
- **Dock**: Uses `build/icon.icns`
- **Window Title Bar**: Uses runtime PNG icon
- **DMG Installer**: Uses `build/icon.icns`

### Linux
- **Desktop Entry**: Uses `build/icon.png`
- **Panel/Taskbar**: Uses `build/icon.png`
- **Window Title Bar**: Uses runtime PNG icon
- **AppImage**: Uses embedded `build/icon.png`

## Customizing the Icon

To change the application icon:

1. **Replace the source icon**:
   ```bash
   # Replace with your new logo (keep the filename)
   cp your-new-logo.png src/windows/aimg/logo.png
   ```

2. **Regenerate platform icons**:
   ```bash
   npm run build-with-icon
   ```

3. **Test the changes**:
   ```bash
   npm start  # Verify window icons
   ```

## Icon Requirements

### Recommended Specifications
- **Format**: PNG with transparency support
- **Size**: 512x512 pixels minimum (for best quality across all platforms)
- **Content**: Square design that looks good at small sizes (16x16)
- **Background**: Transparent or solid color

### Platform Limitations
- **Windows ICO**: Supports multiple sizes, transparency
- **macOS ICNS**: Supports multiple sizes, transparency, retina displays
- **Linux PNG**: Single size, transparency supported

## Troubleshooting

### Icons Not Appearing
1. **Check source file**: Verify `src/windows/aimg/logo.png` exists
2. **Regenerate icons**: Run `npm run build-with-icon`
3. **Clear cache**: Delete `build/` directory and regenerate
4. **Check console**: Look for icon loading errors in developer tools

### Build Errors
1. **ImageMagick missing**: Install ImageMagick for automatic icon generation
2. **File permissions**: Ensure build script has execute permissions
3. **Disk space**: Verify sufficient space for generated icon files

### Platform-Specific Issues

#### Windows
- NSIS installer may cache old icons - clear installer cache
- Some antivirus software may flag icon changes

#### macOS  
- Application bundle cache may need clearing
- Gatekeeper may require re-approval after icon changes

#### Linux
- Desktop environment cache may need refreshing
- Some distributions require manual desktop entry updates

## Development Notes

### Icon Loading Path
Icons are loaded using relative paths from the main process:
```javascript
icon: path.join(__dirname, 'windows/aimg/logo.png')
```

### Build Configuration
Icons are configured in `package.json` under the `build` section:
```json
{
  "build": {
    "win": { "icon": "build/icon.ico" },
    "mac": { "icon": "build/icon.icns" },  
    "linux": { "icon": "build/icon.png" }
  }
}
```

---

**Note**: The icon system is designed to work seamlessly across all supported platforms. The build scripts handle all necessary conversions automatically.
