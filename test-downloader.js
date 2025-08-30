// Mock Electron app for testing
const mockApp = {
    getPath: (name) => {
        const os = require('os');
        const path = require('path');
        
        switch (name) {
            case 'userData':
                return path.join(os.tmpdir(), 'test-void-client');
            default:
                return os.tmpdir();
        }
    }
};

// Mock the electron module
require.cache[require.resolve('electron')] = {
    exports: {
        app: mockApp
    }
};

const AssetDownloader = require('./src/downloader');
const path = require('path');
const fs = require('fs');

async function testDownloader() {
    console.log('Testing AssetDownloader...\n');
    
    const downloader = new AssetDownloader();
    
    try {
        // Test 1: Check installation status
        console.log('1. Checking installation status...');
        const status = await downloader.checkInstallationComplete();
        console.log('Installation complete:', status.isComplete);
        console.log('Components:', status.components);
        console.log('');
        
        // Test 2: Get download estimates
        console.log('2. Getting download estimates...');
        const estimates = downloader.getDownloadSizeEstimates();
        console.log('Estimates:', estimates);
        console.log('');
        
        // Test 3: Test Java URL generation
        console.log('3. Testing Java URL generation...');
        const urls = downloader.getJavaDownloadUrls();
        console.log('Java URLs for current platform:');
        for (const [version, url] of Object.entries(urls)) {
            console.log(`  Java ${version}: ${url}`);
        }
        console.log('');
        
        // Test 4: Check if Java detection works
        console.log('4. Testing Java detection...');
        const javaVersions = await downloader.detectAvailableJava();
        console.log('Available Java versions:', javaVersions);
        console.log('');
        
        console.log('✅ All tests completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    }
}

// Run the test
testDownloader();
