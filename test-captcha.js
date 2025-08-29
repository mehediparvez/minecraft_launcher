/**
 * Test Script for Captcha Functionality
 * Run this to verify the captcha integration works correctly
 */

const { BrowserWindow, app, ipcMain } = require('electron');
const path = require('path');

async function testCaptchaWindow() {
    console.log('🧪 Testing Captcha Window Creation...');
    
    try {
        // Create a test captcha window similar to the auth flow
        const captchaWindow = new BrowserWindow({
            width: 500,
            height: 650,
            show: true,
            center: true,
            resizable: false,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                enableRemoteModule: false
            },
            autoHideMenuBar: true,
            title: "Test - Security Verification",
            frame: false,
            alwaysOnTop: true
        });

        // Load the captcha HTML file
        const captchaPath = path.join(__dirname, 'src', 'windows', 'captcha.html');
        console.log('📁 Loading captcha from:', captchaPath);
        
        await captchaWindow.loadFile(captchaPath);
        console.log('✅ Captcha window loaded successfully');
        
        // Set up test IPC handler
        const testHandler = (event, isVerified) => {
            console.log('🔐 Captcha verification result:', isVerified ? 'SUCCESS' : 'FAILED');
            captchaWindow.destroy();
            ipcMain.removeListener('captcha:verified', testHandler);
            
            if (isVerified) {
                console.log('✅ Test passed: Captcha verification works correctly');
            } else {
                console.log('❌ Test result: Captcha was cancelled or failed');
            }
            
            // Exit after test
            setTimeout(() => {
                app.quit();
            }, 1000);
        };

        ipcMain.on('captcha:verified', testHandler);
        
        captchaWindow.on('closed', () => {
            console.log('🪟 Captcha window closed');
            ipcMain.removeListener('captcha:verified', testHandler);
            app.quit();
        });
        
        // Add some debug logging
        captchaWindow.webContents.on('did-finish-load', () => {
            console.log('📄 Captcha page finished loading');
        });
        
        captchaWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
            console.error('❌ Failed to load captcha:', errorCode, errorDescription);
            app.quit();
        });
        
        console.log('⏳ Captcha window opened. Complete the captcha to test functionality...');
        
    } catch (error) {
        console.error('❌ Error testing captcha window:', error);
        app.quit();
    }
}

// Initialize test when app is ready
app.whenReady().then(() => {
    console.log('🚀 Starting Captcha Functionality Test');
    testCaptchaWindow();
});

app.on('window-all-closed', () => {
    app.quit();
});

// Prevent multiple instances
app.on('second-instance', () => {
    app.quit();
});

console.log('🔧 Captcha Test Script Loaded');
console.log('📝 This script will open a captcha window for testing');
console.log('💡 Complete the captcha or cancel to see the results');
