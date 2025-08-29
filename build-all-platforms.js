/**
 * Build Script for All Platforms
 * Automates the cross-platform build process
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Cross-Platform Build Process...\n');

// Check if all dependencies are installed
console.log('📦 Checking dependencies...');
try {
    execSync('npm list --depth=0', { stdio: 'inherit' });
    console.log('✅ Dependencies verified\n');
} catch (error) {
    console.log('❌ Missing dependencies. Installing...');
    execSync('npm install', { stdio: 'inherit' });
}

// Clean previous builds
console.log('🧹 Cleaning previous builds...');
try {
    if (fs.existsSync('./dist')) {
        fs.rmSync('./dist', { recursive: true, force: true });
    }
    console.log('✅ Build directory cleaned\n');
} catch (error) {
    console.log('⚠️ Could not clean dist directory:', error.message);
}

// Build for each platform
const platforms = [
    { name: 'Linux', script: 'dist:linux', icon: '🐧' },
    { name: 'Windows', script: 'dist:win', icon: '🪟' },
    { name: 'macOS', script: 'dist:mac', icon: '🍎' }
];

const buildResults = [];

for (const platform of platforms) {
    console.log(`${platform.icon} Building for ${platform.name}...`);
    
    try {
        const startTime = Date.now();
        execSync(`npm run ${platform.script}`, { stdio: 'inherit' });
        const buildTime = ((Date.now() - startTime) / 1000).toFixed(1);
        
        console.log(`✅ ${platform.name} build completed in ${buildTime}s\n`);
        buildResults.push({
            platform: platform.name,
            status: 'SUCCESS',
            time: buildTime
        });
    } catch (error) {
        console.log(`❌ ${platform.name} build failed:`, error.message);
        buildResults.push({
            platform: platform.name,
            status: 'FAILED',
            error: error.message
        });
    }
}

// Generate build report
console.log('📊 Build Report:');
console.log('================');
buildResults.forEach(result => {
    const status = result.status === 'SUCCESS' ? '✅' : '❌';
    const time = result.time ? ` (${result.time}s)` : '';
    console.log(`${status} ${result.platform}${time}`);
    if (result.error) {
        console.log(`   Error: ${result.error}`);
    }
});

// List created files
console.log('\n📁 Generated Files:');
console.log('==================');
try {
    const distFiles = fs.readdirSync('./dist');
    distFiles.forEach(file => {
        const stats = fs.statSync(path.join('./dist', file));
        const size = (stats.size / (1024 * 1024)).toFixed(1);
        console.log(`📦 ${file} (${size} MB)`);
    });
} catch (error) {
    console.log('❌ Could not list dist files:', error.message);
}

console.log('\n🎉 Build process completed!');
console.log('💡 Test the builds on respective platforms before distribution.');

// Create test instructions
const testInstructions = `
# Testing Instructions

## Windows (.exe)
1. Download: Void Client Setup 1.0.0.exe
2. Install and run
3. Test Microsoft auth + captcha
4. Try offline mode
5. Launch Minecraft

## macOS (.dmg)  
1. Download: Void Client-1.0.0.dmg
2. Mount and install to Applications
3. Test Microsoft auth + captcha
4. Try offline mode  
5. Launch Minecraft

## Linux (.AppImage / .deb)
1. Download appropriate package
2. Make executable: chmod +x Void-Client-1.0.0.AppImage
3. Run: ./Void-Client-1.0.0.AppImage
4. Test Microsoft auth + captcha
5. Try offline mode
6. Launch Minecraft

## Test Focus Areas:
- ✅ Captcha window appears and functions
- ✅ Microsoft authentication works
- ✅ Offline mode works as fallback
- ✅ UI is responsive and styled correctly
- ✅ Java detection works
- ✅ Minecraft launches successfully
`;

fs.writeFileSync('./TESTING_INSTRUCTIONS.md', testInstructions);
console.log('📝 Created TESTING_INSTRUCTIONS.md for testers');
