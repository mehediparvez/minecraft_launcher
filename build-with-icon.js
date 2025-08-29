#!/usr/bin/env node

/**
 * Build script for Void Client with icon generation
 * This script ensures icons are properly generated before building
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🎨 Void Client - Build with Icon Generation');
console.log('============================================');

// Check if build directory exists
const buildDir = path.join(__dirname, 'build');
if (!fs.existsSync(buildDir)) {
    console.log('📁 Creating build directory...');
    fs.mkdirSync(buildDir, { recursive: true });
}

// Check if logo.png exists
const logoPath = path.join(__dirname, 'src', 'windows', 'aimg', 'logo.png');
if (!fs.existsSync(logoPath)) {
    console.error('❌ Error: logo.png not found at src/windows/aimg/logo.png');
    process.exit(1);
}

console.log('✅ Logo file found');

// Copy PNG icon
const iconPngPath = path.join(buildDir, 'icon.png');
if (!fs.existsSync(iconPngPath)) {
    console.log('📋 Copying PNG icon...');
    fs.copyFileSync(logoPath, iconPngPath);
}

// Check if ImageMagick is available
try {
    execSync('which convert', { stdio: 'ignore' });
    console.log('✅ ImageMagick found');
    
    // Generate ICO file for Windows
    const iconIcoPath = path.join(buildDir, 'icon.ico');
    if (!fs.existsSync(iconIcoPath)) {
        console.log('🪟 Generating Windows ICO icon...');
        execSync(`convert "${iconPngPath}" -resize 256x256 "${iconIcoPath}"`);
    }
    
    // Generate ICNS file for macOS
    const iconIcnsPath = path.join(buildDir, 'icon.icns');
    if (!fs.existsSync(iconIcnsPath)) {
        console.log('🍎 Generating macOS ICNS icon...');
        execSync(`convert "${iconPngPath}" -resize 512x512 "${iconIcnsPath}"`);
    }
    
    console.log('✅ All icon formats generated successfully');
    
} catch (error) {
    console.warn('⚠️  ImageMagick not found. Please install it for icon generation:');
    console.warn('   sudo apt install imagemagick  # Ubuntu/Debian');
    console.warn('   brew install imagemagick      # macOS');
    console.warn('   Manual icons may be needed for Windows (.ico) and macOS (.icns)');
}

// Verify all icon files exist
const requiredIcons = ['icon.png', 'icon.ico', 'icon.icns'];
const missingIcons = requiredIcons.filter(icon => !fs.existsSync(path.join(buildDir, icon)));

if (missingIcons.length > 0) {
    console.warn(`⚠️  Missing icon files: ${missingIcons.join(', ')}`);
    console.warn('   The build will continue but some platforms may not have proper icons');
}

console.log('\n🚀 Starting Electron Builder...');
console.log('================================');

// Get build target from command line arguments
const args = process.argv.slice(2);
let buildCommand = 'npm run dist';

if (args.includes('--win') || args.includes('-w')) {
    buildCommand = 'npm run dist:win';
    console.log('🪟 Building for Windows...');
} else if (args.includes('--mac') || args.includes('-m')) {
    buildCommand = 'npm run dist:mac';
    console.log('🍎 Building for macOS...');
} else if (args.includes('--linux') || args.includes('-l')) {
    buildCommand = 'npm run dist:linux';
    console.log('🐧 Building for Linux...');
} else {
    console.log('🌍 Building for all platforms...');
}

try {
    execSync(buildCommand, { stdio: 'inherit', cwd: __dirname });
    console.log('\n✅ Build completed successfully!');
    console.log('\n📦 Output files can be found in the "dist" directory');
} catch (error) {
    console.error('\n❌ Build failed:', error.message);
    process.exit(1);
}
