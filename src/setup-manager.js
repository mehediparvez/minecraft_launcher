const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Use mock downloader in testing environment
const AssetDownloader = process.env.NODE_ENV === 'testing' 
    ? require('./mock-downloader')
    : require('./downloader');

class SetupManager {
    constructor() {
        this.setupWindow = null;
        this.downloader = new AssetDownloader();
        this.isSetupComplete = false;
        this.testMode = process.env.NODE_ENV === 'testing';
        
        // Always register IPC handlers
        this.setupIpcHandlers();
    }

    async checkSetupRequired() {
        // Check if setup is required by examining what's already available
        const status = await this.downloader.checkInstallationComplete();
        
        // If all components are bundled, no setup needed
        if (status.components.java8 && status.components.java21 && 
            status.components.minecraftCore && status.components.fabricLoader) {
            console.log('✅ All components bundled - skipping setup entirely');
            this.isSetupComplete = true;
            return false;
        }
        
        this.isSetupComplete = status.isComplete;
        return !status.isComplete;
    }

    async checkBundledJava() {
        const pathManager = require('./path-manager');
        const bundledJava8 = path.join(__dirname, '..', 'java', 'java8');
        const bundledJava21 = path.join(__dirname, '..', 'java', 'java21');
        
        const fs = require('fs');
        return fs.existsSync(bundledJava8) || fs.existsSync(bundledJava21);
    }

    async showSetupWindow() {
        if (this.setupWindow) {
            this.setupWindow.focus();
            return;
        }

        this.setupWindow = new BrowserWindow({
            width: 600,
            height: 450,
            resizable: false,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            },
            icon: path.join(__dirname, '../build/icon.png'),
            title: 'Void Client - Initial Setup'
        });

        // Load setup HTML
        await this.setupWindow.loadFile(path.join(__dirname, 'windows/setup.html'));

        // Remove menu bar
        this.setupWindow.setMenuBarVisibility(false);

        // Handle window close
        this.setupWindow.on('closed', () => {
            this.setupWindow = null;
        });

        // Allow closing during setup with confirmation
        this.setupWindow.on('close', (event) => {
            if (!this.isSetupComplete) {
                event.preventDefault();
                
                // Show confirmation dialog
                const { dialog } = require('electron');
                const choice = dialog.showMessageBoxSync(this.setupWindow, {
                    type: 'question',
                    buttons: ['Quit Application', 'Continue Setup', 'Cancel'],
                    defaultId: 1,
                    title: 'Setup Incomplete',
                    message: 'Setup is not complete',
                    detail: 'Void Client requires these components to function properly. You can:\n\n• Quit now and run setup later\n• Continue with the setup process\n• Cancel and keep the setup window open'
                });

                if (choice === 0) {
                    // User chose to quit
                    this.isSetupComplete = true; // Prevent infinite loop
                    require('electron').app.quit();
                } else if (choice === 1) {
                    // User chose to continue setup - do nothing (keep window open)
                    return;
                } else {
                    // User chose cancel - do nothing (keep window open)
                    return;
                }
            }
        });

        // IPC handlers are already set up in constructor
    }

    setupIpcHandlers() {
        // Handle setup start
        ipcMain.handle('setup:start', async () => {
            try {
                // Check what's actually needed
                const status = await this.downloader.checkInstallationComplete();
                const estimates = this.downloader.getDownloadSizeEstimates();
                
                // Get more detailed information
                const detailedInfo = {
                    java8Needed: !status.components.java8,
                    java21Needed: !status.components.java21,
                    minecraftCoreNeeded: !status.components.minecraftCore,
                    fabricLoaderNeeded: !status.components.fabricLoader,
                    javaRequirement: this.getJavaRequirementText(status.components),
                    minecraftAssets: estimates.minecraftCore || '15 MB',
                    totalEstimate: this.calculateTotalSize(status.components, estimates)
                };
                
                return { 
                    success: true, 
                    estimates: {
                        ...estimates,
                        ...detailedInfo
                    },
                    status 
                };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });

        // Handle download start
        ipcMain.handle('setup:download', async () => {
            try {
                await this.downloader.downloadMissingComponents((progress) => {
                    // Send progress to renderer
                    if (this.setupWindow) {
                        this.setupWindow.webContents.send('setup:progress', progress);
                    }
                });

                this.isSetupComplete = true;
                return { success: true };
            } catch (error) {
                console.error('Setup download failed:', error);
                
                // Provide more specific error messages
                let userMessage = error.message;
                if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
                    userMessage = 'Unable to connect to download servers. Please check your internet connection and try again.';
                } else if (error.message.includes('timeout')) {
                    userMessage = 'Download timed out. Please check your internet connection and try again.';
                } else if (error.message.includes('Java') && error.message.includes('not available')) {
                    userMessage = 'Java download not available for your platform. Please install Java manually.';
                } else if (error.message.includes('302') || error.message.includes('redirect')) {
                    userMessage = 'Download server returned a redirect. The download link may be outdated.';
                }
                
                return { success: false, error: userMessage };
            }
        });

        // Handle setup completion
        ipcMain.handle('setup:complete', async () => {
            this.isSetupComplete = true;
            if (this.setupWindow) {
                this.setupWindow.close();
            }
            return { success: true };
        });

        // Handle setup skip
        ipcMain.handle('setup:skip', async () => {
            console.log('User chose to skip setup');
            this.isSetupComplete = true;
            if (this.setupWindow) {
                this.setupWindow.close();
            }
            return { success: true };
        });

        // Handle setup status check
        ipcMain.handle('setup:status', async () => {
            const status = await this.downloader.checkInstallationComplete();
            return status;
        });
    }

    getJavaRequirementText(components) {
        const needed = [];
        if (!components.java8) needed.push('Java 8 (45 MB)');
        if (!components.java21) needed.push('Java 21 (55 MB)');
        
        if (needed.length === 0) {
            return 'Already installed';
        } else if (needed.length === 1) {
            return needed[0];
        } else {
            return needed.join(' + ');
        }
    }

    calculateTotalSize(components, estimates) {
        let total = 0;
        
        // Add sizes based on what's actually needed
        if (!components.java8) total += 45; // MB
        if (!components.java21) total += 55; // MB
        if (!components.minecraftCore) total += 15; // MB
        if (!components.fabricLoader) total += 5; // MB
        
        return total > 0 ? `${total} MB` : 'Already installed';
    }

    async waitForSetupCompletion() {
        return new Promise((resolve) => {
            const checkSetup = () => {
                if (this.isSetupComplete || !this.setupWindow) {
                    resolve();
                } else {
                    setTimeout(checkSetup, 500);
                }
            };
            checkSetup();
        });
    }

    cleanup() {
        if (this.setupWindow) {
            this.setupWindow.close();
        }
        
        // Remove IPC handlers
        ipcMain.removeAllListeners('setup:start');
        ipcMain.removeAllListeners('setup:download');
        ipcMain.removeAllListeners('setup:complete');
        ipcMain.removeAllListeners('setup:skip');
        ipcMain.removeAllListeners('setup:status');
    }
}

module.exports = SetupManager;
