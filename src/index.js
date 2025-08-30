const { app, BrowserWindow, ipcMain, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { minecraftAuth } = require('./auth');
const pathManager = require('./path-manager');

let loginWindow;
let mainWindow;

function loadUserConfig() {
    ipcMain.handle('debug:getEnv', () => {
    return {
      platform: process.platform,
      arch: process.arch,
      versions: process.versions,
      execPath: process.execPath,
      resourcesPath: process.resourcesPath,
      appPath: app.getAppPath(),
      userDataPath: pathManager.getUserDataDir(),
      minecraftPath: pathManager.get('minecraft'),
      paths: pathManager.getAll(),
      tempPath: app.getPath('temp'),
      isPackaged: app.isPackaged
    };
  });

  // Add alias for the handler name that the renderer is actually calling
  ipcMain.handle('debug:getEnvironmentInfo', () => {
    return {
      platform: process.platform,
      arch: process.arch,
      versions: process.versions,
      execPath: process.execPath,
      resourcesPath: process.resourcesPath,
      appPath: app.getAppPath(),
      userDataPath: pathManager.getUserDataDir(),
      minecraftPath: pathManager.get('minecraft'),
      paths: pathManager.getAll(),
      tempPath: app.getPath('temp'),
      isPackaged: app.isPackaged
    };
  });e = pathManager.get('launcherConfig');
  
  try {
    if (fs.existsSync(configFile)) {
      const configData = fs.readFileSync(configFile, 'utf8');
      const config = JSON.parse(configData);
      
      if (config.username && config.autoLogin) {
        return config.username;
      }
    }
  } catch (error) {
  }
  
  return null;
}

function createLoginWindow() {
  const iconPath = path.resolve(__dirname, '..', 'build', 'icon.png');
  const fallbackIconPath = path.resolve(__dirname, 'windows/aimg/icon-256.png');
  
  // Use build icon if available, otherwise fallback to local icon
  const finalIconPath = fs.existsSync(iconPath) ? iconPath : fallbackIconPath;
  console.log('Using icon path:', finalIconPath);
  
  loginWindow = new BrowserWindow({
    width: 500,
    height: 650,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
    },
    frame: false,
    resizable: false,
    center: true,
    icon: finalIconPath,
  });
  
  // Also set icon programmatically after creation
  try {
    const { nativeImage } = require('electron');
    const icon = nativeImage.createFromPath(finalIconPath);
    if (!icon.isEmpty()) {
      loginWindow.setIcon(icon);
      console.log('Icon set successfully for login window');
    } else {
      console.log('Failed to load icon from path:', finalIconPath);
    }
  } catch (error) {
    console.error('Error setting icon:', error);
  }
  
  loginWindow.loadFile(path.join(__dirname, 'windows/login.html'));
  
  loginWindow.on('closed', () => {
    loginWindow = null;
  });
}

function createMainWindow(userNick) {
  const iconPath = path.resolve(__dirname, '..', 'build', 'icon.png');
  const fallbackIconPath = path.resolve(__dirname, 'windows/aimg/icon-256.png');
  
  // Use build icon if available, otherwise fallback to local icon
  const finalIconPath = fs.existsSync(iconPath) ? iconPath : fallbackIconPath;
  console.log('Main window using icon path:', finalIconPath);
  
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 600,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
    },
    frame: false,
    resizable: false,
    icon: finalIconPath,
  });
  
  // Also set icon programmatically after creation
  try {
    const { nativeImage } = require('electron');
    const icon = nativeImage.createFromPath(finalIconPath);
    if (!icon.isEmpty()) {
      mainWindow.setIcon(icon);
      console.log('Icon set successfully for main window');
    } else {
      console.log('Failed to load icon from path:', finalIconPath);
    }
  } catch (error) {
    console.error('Error setting main window icon:', error);
  }
  
  mainWindow.loadFile(path.join(__dirname, 'windows/index.html'));
  
  // Enable developer tools in development
  if (process.env.NODE_ENV === 'development' || process.argv.includes('--debug')) {
    mainWindow.webContents.openDevTools();
  }
  
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('set-user', userNick);
  });
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  // Register debug shortcut (Ctrl+Shift+D)
  const { globalShortcut } = require('electron');
  globalShortcut.register('CommandOrControl+Shift+D', () => {
    createDebugWindow();
  });
  
  // Register dev tools shortcut (F12)
  globalShortcut.register('F12', () => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.toggleDevTools();
    }
  });
}

// Create the debug window
function createDebugWindow() {
  const iconPath = path.resolve(__dirname, 'windows/aimg/icon-256.png');
  console.log('Debug window using icon path:', iconPath);
  
  const debugWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
    },
    title: "Void Client - Debug Panel",
    icon: iconPath,
  });
  
  debugWindow.loadFile(path.join(__dirname, 'windows/debug.html'));
  
  debugWindow.on('closed', () => {
    // Remove from menu when closed
    updateMenu(false);
  });
  
  // Don't show in taskbar on Windows
  // debugWindow.setSkipTaskbar(true);
}

// Create application menu with debug option
function updateMenu(hasDebugWindow = false) {
  const debugMenu = {
    label: 'Debug',
    submenu: [
      {
        label: 'Open Debug Panel',
        click: () => createDebugWindow(),
        enabled: !hasDebugWindow
      },
      { type: 'separator' },
      {
        label: 'Reload Application',
        click: () => {
          app.relaunch();
          app.exit();
        }
      },
      {
        label: 'Toggle Developer Tools',
        accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
        click: (item, focusedWindow) => {
          if (focusedWindow) {
            focusedWindow.webContents.toggleDevTools();
          }
        }
      }
    ]
  };
  
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Command+Q' : 'Ctrl+Q',
          click: () => app.quit()
        }
      ]
    },
    debugMenu
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(async () => {
  // Set app properties for better icon recognition
  app.setName('Void Client');
  if (process.platform === 'linux') {
    app.setDesktopName('void-client.desktop');
  }
  
  // Initialize path manager and ensure directories exist
  await pathManager.initialize();
  console.log('Path manager initialized:', pathManager.getPathInfo());
  
  // Initialize Microsoft Auth
  await minecraftAuth.init();
  
  // Create menu
  updateMenu(false);
  
  // Always start with login window for user choice
  createLoginWindow();
  
  // Comment out auto-login behavior
  /*
  const savedUser = loadUserConfig();
  
  // Try to load Microsoft auth profile first
  const profile = await minecraftAuth.loadSavedCredentials();
  
  if (profile) {
    // User already authenticated with Microsoft
    createMainWindow(profile.name);
  } else if (savedUser) {
    // Fallback to saved offline user
    createMainWindow(savedUser);
  } else {
    createLoginWindow();
  }
  */
  
  ipcMain.on('open-second-window', (event, userNick) => {
    console.log('open-second-window event received with username:', userNick);
    console.log('Username type:', typeof userNick);
    console.log('Username value:', JSON.stringify(userNick));
    
    // Fallback to a default name if username is undefined/null/empty
    const finalUsername = userNick || 'Player';
    console.log('Using final username:', finalUsername);
    
    if (loginWindow) {
      loginWindow.close();
      loginWindow = null;
    }
    createMainWindow(finalUsername);
  });
  ipcMain.on('show-login-window', () => {
    if (mainWindow) {
      mainWindow.close();
      mainWindow = null;
    }
    createLoginWindow();
  });
  
  ipcMain.on('logout-user', () => {
    if (mainWindow) {
      mainWindow.close();
      mainWindow = null;
    }
    
    createLoginWindow();
  });
  
  ipcMain.on('minimize-window', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.minimize();
    } else if (loginWindow && !loginWindow.isDestroyed()) {
      loginWindow.minimize();
    }
  });
  
  ipcMain.on('close-window', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close();
    } else if (loginWindow && !loginWindow.isDestroyed()) {
      loginWindow.close();
    }
  });
  
  ipcMain.on('restart-app', () => {
    app.relaunch();
    app.exit();
  });
  
  // Debug IPC handlers
  ipcMain.on('debug:open', () => {
    createDebugWindow();
  });
  
  ipcMain.handle('debug:getEnvironmentInfo', () => {
    return {
      platform: process.platform,
      arch: process.arch,
      versions: process.versions,
      execPath: process.execPath,
      resourcesPath: process.resourcesPath,
      appPath: app.getAppPath(),
      userDataPath: pathManager.getUserDataDir(),
      minecraftPath: pathManager.get('minecraft'),
      paths: pathManager.getAll(),
      tempPath: app.getPath('temp'),
      isPackaged: app.isPackaged
    };
  });

  // Handle user logout
  ipcMain.on('logout-user', () => {
    // Clear any authentication state
    // This will reset the UI to login screen
    if (mainWindow) {
      mainWindow.webContents.executeJavaScript(`
        // Reset UI to login state
        if (typeof resetToLoginUI === 'function') {
          resetToLoginUI();
        } else {
          location.reload();
        }
      `);
    }
  });

  // Get application paths
  ipcMain.handle('get-app-paths', () => {
    return {
      minecraftDir: pathManager.get('minecraft'),
      userDataDir: pathManager.getUserDataDir(),
      javaDir: pathManager.get('java'),
      resourcesPath: process.resourcesPath,
      bundledAssets: process.resourcesPath ? path.join(process.resourcesPath, 'assets') : null
    };
  });
  
  ipcMain.handle('debug:testLogin', async (event, username) => {
    try {
      if (username) {
        // Test offline login
        return { 
          success: true, 
          profile: minecraftAuth.getOfflineProfile(username),
          mode: 'offline'
        };
      } else {
        // Test Microsoft login
        const profile = await minecraftAuth.login();
        return { 
          success: true, 
          profile,
          mode: 'microsoft'
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        mode: username ? 'offline' : 'microsoft'
      };
    }
  });
  
  ipcMain.handle('debug:checkJava', async () => {
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    try {
      // Check system Java
      let systemJava = null;
      try {
        let javaPath = '';
        if (process.platform === 'win32') {
          const { stdout } = await execAsync('where java');
          javaPath = stdout.trim().split('\n')[0];
        } else {
          const { stdout } = await execAsync('which java');
          javaPath = stdout.trim();
        }
        
        if (javaPath) {
          const { stdout } = await execAsync(`"${javaPath}" -version 2>&1`);
          systemJava = {
            path: javaPath,
            version: stdout.trim()
          };
        }
      } catch (e) {
        console.log('System Java not found:', e.message);
      }
      
      // Check bundled Java - look in multiple locations
      const javaPathsToCheck = [
        // Current working directory (dev-workspace)
        path.join(process.cwd(), 'java', 'java21', 'bin'),
        path.join(process.cwd(), 'java', 'java8', 'bin'),
        
        // Relative to the main script
        path.join(__dirname, 'java', 'java21', 'bin'),
        path.join(__dirname, 'java', 'java8', 'bin'),
        
        // In the dev workspace from src directory
        path.join(__dirname, '..', 'java', 'java21', 'bin'),
        path.join(__dirname, '..', 'java', 'java8', 'bin'),
        
        // Packaged app locations - extraResources are in resources/ directly
        path.join(process.resourcesPath, 'java', 'java21', 'bin'),
        path.join(process.resourcesPath, 'java', 'java8', 'bin'),
        
        // Legacy paths (old locations)
        path.join(process.resourcesPath, 'app.asar.unpacked', 'java', 'java21', 'bin'),
        path.join(process.resourcesPath, 'app.asar.unpacked', 'java', 'java8', 'bin')
      ];
      
      const bundledJavas = [];
      
      console.log('Debug: Checking Java paths...');
      console.log('Current working directory:', process.cwd());
      console.log('Script directory (__dirname):', __dirname);
      console.log('Resources path:', process.resourcesPath);
      
      // Debug: Show what's actually in the resources directory
      if (process.resourcesPath && fs.existsSync(process.resourcesPath)) {
        console.log('Contents of resources directory:');
        try {
          const resourcesContents = fs.readdirSync(process.resourcesPath);
          resourcesContents.forEach(item => {
            const itemPath = path.join(process.resourcesPath, item);
            const isDir = fs.statSync(itemPath).isDirectory();
            console.log(`  ${isDir ? 'DIR' : 'FILE'}: ${item}`);
            
            // If it's the java directory, show its contents too
            if (item === 'java' && isDir) {
              try {
                const javaContents = fs.readdirSync(itemPath);
                javaContents.forEach(javaItem => {
                  const javaItemPath = path.join(itemPath, javaItem);
                  const javaIsDir = fs.statSync(javaItemPath).isDirectory();
                  console.log(`    ${javaIsDir ? 'DIR' : 'FILE'}: ${javaItem}`);
                });
              } catch (e) {
                console.log(`    Error reading java directory: ${e.message}`);
              }
            }
          });
        } catch (e) {
          console.log('Error reading resources directory:', e.message);
        }
      }
      
      for (const javaBasePath of javaPathsToCheck) {
        const javaExeName = process.platform === 'win32' ? 'javaw.exe' : 'java';
        const javaPath = path.join(javaBasePath, javaExeName);
        
        console.log(`Checking: ${javaPath}`);
        
        if (fs.existsSync(javaPath)) {
          console.log(`✅ Found Java at: ${javaPath}`);
          try {
            const { stdout } = await execAsync(`"${javaPath}" -version 2>&1`);
            bundledJavas.push({
              path: javaPath,
              version: stdout.trim()
            });
          } catch (e) {
            bundledJavas.push({
              path: javaPath,
              error: e.message
            });
          }
        } else {
          console.log(`❌ Java not found at: ${javaPath}`);
        }
      }
      
      return {
        success: true,
        systemJava,
        bundledJavas,
        recommended: bundledJavas[0] || systemJava
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  });
  
  ipcMain.handle('debug:checkOwnership', async () => {
    try {
      if (!minecraftAuth.isAuthenticated()) {
        return { 
          success: false, 
          error: 'Not authenticated with Microsoft. Please login first.'
        };
      }
      
      const ownsGame = await minecraftAuth.checkGameOwnership();
      return {
        success: true,
        ownsGame
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Clean up when quitting
app.on('will-quit', () => {
  // Unregister all shortcuts
  const { globalShortcut } = require('electron');
  globalShortcut.unregisterAll();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    const savedUser = loadUserConfig();
    if (savedUser) {
      createMainWindow(savedUser);
    } else {
      createLoginWindow();
    }
  }
});