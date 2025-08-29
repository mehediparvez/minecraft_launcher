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
    }

    async checkSetupRequired() {
        const status = await this.downloader.checkInstallationComplete();
        this.isSetupComplete = status.isComplete;
        return !status.isComplete;
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
            minimizable: false,
            maximizable: false,
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

        // Prevent closing during setup
        this.setupWindow.on('close', (event) => {
            if (!this.isSetupComplete) {
                event.preventDefault();
                // Could show a warning dialog here
            }
        });

        this.setupIpcHandlers();
    }

    setupIpcHandlers() {
        // Handle setup start
        ipcMain.handle('setup:start', async () => {
            try {
                const estimates = this.downloader.getDownloadSizeEstimates();
                return { success: true, estimates };
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
                return { success: false, error: error.message };
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

        // Handle setup status check
        ipcMain.handle('setup:status', async () => {
            const status = await this.downloader.checkInstallationComplete();
            return status;
        });
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
        ipcMain.removeAllListeners('setup:status');
    }
}

module.exports = SetupManager;
