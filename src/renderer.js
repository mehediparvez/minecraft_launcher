const { Client } = require('minecraft-launcher-core');
const { v3: uuidv3 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { ipcRenderer } = require('electron');
const { setTimeout } = require('timers');

// Fix auth import with proper path resolution
let launcherIntegration;
try {
  const authModule = require('./auth');
  launcherIntegration = authModule.launcherIntegration;
  console.log('✅ Auth module loaded successfully');
} catch (e) {
  console.warn('Auth module not found, using fallback:', e.message);
  launcherIntegration = {
    isAuthenticated: () => false,
    getCurrentUser: () => null,
    init: async () => {},
    getMinecraftAuth: async () => null
  };
}

// Global path configuration - will be loaded from main process
let appPaths = {
  minecraft: './minecraft',
  mods: './minecraft/mods',
  versions: './minecraft/versions',
  launcherConfig: './minecraft/launcher_config.json'
};

// Function to get proper app paths
async function getAppPaths() {
  try {
    const paths = await ipcRenderer.invoke('get-app-paths');
    return {
      minecraft: paths.minecraftDir,
      mods: path.join(paths.minecraftDir, 'mods'),
      versions: path.join(paths.minecraftDir, 'versions'),
      launcherConfig: path.join(paths.minecraftDir, 'launcher_config.json'),
      ...paths
    };
  } catch (error) {
    console.warn('Failed to get app paths, using defaults:', error);
    return appPaths;
  }
}

// Load paths from main process
async function initializePaths() {
  try {
    appPaths = await getAppPaths();
    console.log('Paths loaded from main process:', appPaths);
  } catch (error) {
    console.warn('Failed to load paths from main process, using defaults:', error);
  }
}

  // Initialize paths when renderer loads
  initializePaths();
  
  // Add keyboard shortcuts for development tools
  document.addEventListener('keydown', (event) => {
    // F12 key
    if (event.key === 'F12') {
      event.preventDefault();
      console.log('🔧 F12 pressed - toggling developer tools');
      ipcRenderer.send('toggle-dev-tools');
    }
    
    // Ctrl+Shift+I (alternative dev tools shortcut)
    if (event.ctrlKey && event.shiftKey && event.key === 'I') {
      event.preventDefault();
      console.log('🔧 Ctrl+Shift+I pressed - toggling developer tools');
      ipcRenderer.send('toggle-dev-tools');
    }
    
    // Ctrl+K (clear console)
    if (event.ctrlKey && event.key === 'k') {
      event.preventDefault();
      console.clear();
    }
    
    // Ctrl+Shift+P (debug paths) - helpful for production debugging
    if (event.ctrlKey && event.shiftKey && event.key === 'P') {
      event.preventDefault();
      console.log('🔍 DEBUG PATHS INFO:');
      console.log('Process info:', {
        platform: process.platform,
        cwd: process.cwd(),
        resourcesPath: process.resourcesPath,
        dirname: __dirname,
        isPackaged: process.resourcesPath !== undefined
      });
      
      // Check what paths exist
      const pathsToCheck = [
        process.resourcesPath ? path.join(process.resourcesPath, 'java') : null,
        path.join(process.cwd(), 'java'),
        path.join(__dirname, '..', 'java')
      ].filter(Boolean);
      
      pathsToCheck.forEach(javaPath => {
        console.log(`Checking path: ${javaPath}`);
        if (fs.existsSync(javaPath)) {
          console.log(`  ✅ EXISTS - Contents:`, fs.readdirSync(javaPath));
          
          // Check java8 and java21 subdirectories
          ['java8', 'java21'].forEach(javaVersion => {
            const javaVersionPath = path.join(javaPath, javaVersion);
            if (fs.existsSync(javaVersionPath)) {
              console.log(`    ✅ ${javaVersion} EXISTS`);
              const binPath = path.join(javaVersionPath, 'bin');
              if (fs.existsSync(binPath)) {
                console.log(`      ✅ bin/ EXISTS - Contents:`, fs.readdirSync(binPath).slice(0, 5));
              } else {
                console.log(`      ❌ bin/ NOT FOUND`);
              }
            } else {
              console.log(`    ❌ ${javaVersion} NOT FOUND`);
            }
          });
        } else {
          console.log(`  ❌ NOT FOUND`);
        }
      });
    }
  });const Launcher = new Client();
const NAMESPACE = uuidv3.DNS;

let currentUserNick = '';

let selectedVersion = {
  number: "1.21.1",
  display: "1.21.1 Fabric",
  type: "release",
  custom: "1.21.1-fabric"
};

// Función para obtener la carpeta de mods específica de la versión
function getVersionModsFolder(version) {
  const versionParts = version.split('.');
  const majorVersion = parseInt(versionParts[0]);
  const minorVersion = parseInt(versionParts[1]);
  const patchVersion = versionParts.length > 2 ? parseInt(versionParts[2]) : 0;
  
  // Determinar si es versión legacy (1.8.x) o moderna (1.21.x)
  if (majorVersion === 1 && minorVersion === 8) {
    return '1.8.9';
  } else if (majorVersion === 1 && minorVersion >= 21) {
    return '1.21.1';
  }
  
  // Por defecto, usar 1.21.1 para versiones no reconocidas
  return '1.21.1';
}

// Función para cambiar mods según la versión
function switchModsForVersion(version) {
  const modsDir = appPaths.mods;
  const versionFolder = getVersionModsFolder(version);
  const versionModsPath = path.join(appPaths.mods, versionFolder);
  
  try {
    // Crear directorios si no existen
    if (!fs.existsSync(modsDir)) {
      fs.mkdirSync(modsDir, { recursive: true });
    }
    
    if (!fs.existsSync(versionModsPath)) {
      fs.mkdirSync(versionModsPath, { recursive: true });
    }
    
    // Guardar mods actuales en su carpeta correspondiente si existen
    const currentMods = fs.readdirSync(modsDir).filter(file => 
      file.endsWith('.jar') && !fs.statSync(path.join(modsDir, file)).isDirectory()
    );
    
    // Determinar la versión actual basada en los mods que están activos
    let currentVersionFolder = null;
    if (currentMods.length > 0) {
      // Intentar determinar de qué versión son los mods actuales
      // Por simplicidad, asumimos que si hay mods, pertenecen a la versión seleccionada anteriormente
      // En una implementación más robusta, podrías mantener un archivo de estado
      const configFile = path.join('./minecraft', 'launcher_config.json');
      try {
        if (fs.existsSync(configFile)) {
          const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
          if (config.lastUsedVersion) {
            currentVersionFolder = getVersionModsFolder(config.lastUsedVersion);
          }
        }
      } catch (error) {
        // Si no se puede determinar, usar la versión opuesta a la actual
        currentVersionFolder = versionFolder === '1.21.1' ? '1.8.9' : '1.21.1';
      }
      
      // Mover mods actuales a su carpeta de versión
      if (currentVersionFolder && currentVersionFolder !== versionFolder) {
        const currentVersionPath = path.join('./minecraft/mods', currentVersionFolder);
        if (!fs.existsSync(currentVersionPath)) {
          fs.mkdirSync(currentVersionPath, { recursive: true });
        }
        
        currentMods.forEach(mod => {
          const sourcePath = path.join(modsDir, mod);
          const destPath = path.join(currentVersionPath, mod);
          try {
            fs.renameSync(sourcePath, destPath);
          } catch (error) {
            // Si falla el rename, intentar copiar y eliminar
            try {
              fs.copyFileSync(sourcePath, destPath);
              fs.unlinkSync(sourcePath);
            } catch (copyError) {
              console.error(`Error moviendo mod ${mod}:`, copyError);
            }
          }
        });
      }
    }
    
    // Cargar mods de la nueva versión
    if (fs.existsSync(versionModsPath)) {
      const versionMods = fs.readdirSync(versionModsPath).filter(file => file.endsWith('.jar'));
      
      versionMods.forEach(mod => {
        const sourcePath = path.join(versionModsPath, mod);
        const destPath = path.join(modsDir, mod);
        try {
          fs.copyFileSync(sourcePath, destPath);
        } catch (error) {
          console.error(`Error copiando mod ${mod}:`, error);
        }
      });
    }
    
    // Actualizar configuración con la versión actual
    updateLastUsedVersion(version);
    
    return true;
  } catch (error) {
    console.error('Error switching mods:', error);
    return false;
  }
}

// Función para actualizar la última versión usada en la configuración
function updateLastUsedVersion(version) {
  const configFile = path.join('./minecraft', 'launcher_config.json');
  
  try {
    let config = {};
    if (fs.existsSync(configFile)) {
      const configData = fs.readFileSync(configFile, 'utf8');
      config = JSON.parse(configData);
    }
    
    config.lastUsedVersion = version;
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Error updating last used version:', error);
  }
}

async function loadUserSkin(username) {
  if (!username) {
    clearUserSkin();
    return;
  }
  
  const skinImage = document.getElementById('user-skin');
  const skinLoading = document.getElementById('skin-loading');
  const userAvatar = document.querySelector('.user-avatar');
  
  if (!skinImage || !skinLoading) {
    console.log('Skin elements not found in DOM');
    return;
  }
  
  try {
    console.log('Loading skin for user:', username);
    
    // Always show loading initially
    skinLoading.style.display = 'flex';
    skinImage.style.display = 'none';
    
    // For offline users, immediately use the default skin
    if (username.startsWith('offline:') || currentUserNick.startsWith('offline:')) {
      console.log('Using default skin for offline user');
      setTimeout(() => {
        const defaultSkinUrl = `https://crafatar.com/avatars/steve?size=64&overlay`;
        skinImage.src = defaultSkinUrl;
        skinImage.style.display = 'block';
        skinLoading.style.display = 'none';
        
        if (userAvatar) {
          userAvatar.classList.remove('no-user');
        }
      }, 500); // Small delay to show loading state
      return;
    }
    
    // For online users, try to fetch skin
    const skinUrl = `https://cravatar.eu/avatar/${username}/64`;
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    // Set timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.log('Skin loading timed out, using default skin');
      img.src = ''; // Cancel current load
      const defaultSkinUrl = `https://crafatar.com/avatars/steve?size=64&overlay`;
      skinImage.src = defaultSkinUrl;
      skinImage.style.display = 'block';
      skinLoading.style.display = 'none';
      
      if (userAvatar) {
        userAvatar.classList.remove('no-user');
      }
    }, 5000);
    
    img.onload = () => {
      clearTimeout(timeoutId);
      console.log('Skin loaded successfully');
      skinImage.src = skinUrl;
      skinImage.style.display = 'block';
      skinLoading.style.display = 'none';
      
      if (userAvatar) {
        userAvatar.classList.remove('no-user');
      }
    };
    
    img.onerror = () => {
      clearTimeout(timeoutId);
      console.log('Error loading skin, using default');
      const defaultSkinUrl = `https://crafatar.com/avatars/steve?size=64&overlay`;
      skinImage.src = defaultSkinUrl;
      skinImage.style.display = 'block';
      skinLoading.style.display = 'none';
      
      if (userAvatar) {
        userAvatar.classList.remove('no-user');
      }
    };
    
    img.src = skinUrl;
    
  } catch (error) {
    console.error('Error in loadUserSkin:', error);
    // Use default skin on any error
    const defaultSkinUrl = `https://crafatar.com/avatars/steve?size=64&overlay`;
    if (skinImage) {
      skinImage.src = defaultSkinUrl;
      skinImage.style.display = 'block';
    }
    if (skinLoading) {
      skinLoading.style.display = 'none';
    }
    if (userAvatar) {
      userAvatar.classList.remove('no-user');
    }
  }
}

function clearUserSkin() {
  const skinImage = document.getElementById('user-skin');
  const skinLoading = document.getElementById('skin-loading');
  const userAvatar = document.querySelector('.user-avatar');
  
  if (skinImage) {
    skinImage.src = '';
    skinImage.style.display = 'none';
  }
  
  if (skinLoading) {
    skinLoading.style.display = 'flex';
  }
  
  if (userAvatar) {
    userAvatar.classList.add('no-user');
  }
}

function saveUserConfig(username) {
  const configDir = './minecraft';
  const configFile = path.join(configDir, 'launcher_config.json');
  
  try {
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    let config = {};
    if (fs.existsSync(configFile)) {
      try {
        const configData = fs.readFileSync(configFile, 'utf8');
        config = JSON.parse(configData);
      } catch (error) {
        config = {};
      }
    }
    
    config.username = username;
    config.lastLogin = new Date().toISOString();
    config.autoLogin = true;
    
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
    
    updateUserUI(username);
    
    return true;
  } catch (error) {
    return false;
  }
}

function loadUserConfig() {
  const configFile = path.join('./minecraft', 'launcher_config.json');
  
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

function clearUserConfig() {
  const configFile = path.join('./minecraft', 'launcher_config.json');
  
  try {
    if (fs.existsSync(configFile)) {
      const configData = fs.readFileSync(configFile, 'utf8');
      const config = JSON.parse(configData);
      
      delete config.username;
      delete config.lastLogin;
      delete config.autoLogin;
      
      fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
    }
    
    updateUserUI(null);
    
    return true;
  } catch (error) {
    return false;
  }
}

function updateUserUI(username) {
  const userDisplayElement = document.getElementById('user-display');
  const logoutBtn = document.getElementById('logout-btn');
  const statusElement = document.getElementById("status");
  
  if (username) {
    // Ensure username is stored in currentUserNick
    currentUserNick = username;
    
    if (userDisplayElement) {
      userDisplayElement.textContent = username;
    }
    
    if (logoutBtn) {
      logoutBtn.style.display = 'inline-block';
    }
    
    document.body.classList.add('user-logged-in');
    
    if (statusElement && !statusElement.textContent.includes('Error')) {
      statusElement.textContent = `Listo para jugar - ${username}`;
    }
    
    loadUserSkin(username);
    
    // Enable launch button if it exists
    const launchButton = document.getElementById('launch');
    if (launchButton) {
      launchButton.classList.remove('disabled');
      launchButton.disabled = false;
    }
    
  } else {
    // Clear current user
    currentUserNick = '';
    
    if (userDisplayElement) {
      userDisplayElement.textContent = 'Sin usuario';
    }
    
    if (logoutBtn) {
      logoutBtn.style.display = 'none';
    }
    
    document.body.classList.remove('user-logged-in');
    
    if (statusElement) {
      statusElement.textContent = 'Inicia sesión para jugar';
    }
    
    clearUserSkin();
    
    // Disable launch button if it exists
    const launchButton = document.getElementById('launch');
    if (launchButton) {
      launchButton.classList.add('disabled');
      launchButton.disabled = true;
    }
  }
  
  console.log('UI updated for user:', username || 'none', 'currentUserNick:', currentUserNick);
}

function checkSavedUser() {
  const savedUser = loadUserConfig();
  
  if (savedUser) {
    currentUserNick = savedUser;
    updateUserUI(savedUser);
    return true;
  }
  
  updateUserUI(null);
  return false;
}

function setupLogoutButton() {
  const logoutBtn = document.getElementById('logout-btn');
  
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      clearUserConfig();
      currentUserNick = '';
    });
  }
}

function getJavaPath(minecraftVersion) {
  console.log('Getting Java path for platform:', process.platform);
  console.log('Process info:', {
    cwd: process.cwd(),
    resourcesPath: process.resourcesPath,
    dirname: __dirname,
    isPackaged: process.resourcesPath !== undefined
  });
  
  // Try multiple Java locations in order of preference
  const javaLocations = [
    // Current working directory (dev-workspace) - for development
    path.join(process.cwd(), 'java', 'java21', 'bin'),
    path.join(process.cwd(), 'java', 'java8', 'bin'),
    
    // Relative to the main script - for development
    path.join(__dirname, '..', 'java', 'java21', 'bin'),
    path.join(__dirname, '..', 'java', 'java8', 'bin'),
    
    // Packaged app locations - extraResources are in resources/ directly
    // After electron-builder extraResources mapping: java/platform-x64/ -> java/
    path.join(process.resourcesPath, 'java', 'java21', 'bin'),
    path.join(process.resourcesPath, 'java', 'java8', 'bin'),
    
    // Legacy paths (old locations) - fallback
    path.join(process.resourcesPath, 'app.asar.unpacked', 'java', 'java21', 'bin'),
    path.join(process.resourcesPath, 'app.asar.unpacked', 'java', 'java8', 'bin')
  ];
  
  const versionParts = minecraftVersion.split('.');
  const majorVersion = parseInt(versionParts[0]);
  const minorVersion = parseInt(versionParts[1]);
  
  const isLegacyVersion = majorVersion === 1 && minorVersion <= 8;
  
  let javaExecutable;
  const executableName = process.platform === 'win32' ? 'javaw.exe' : 'java';
  
  console.log(`Looking for Java for ${isLegacyVersion ? 'legacy' : 'modern'} Minecraft version ${minecraftVersion}`);
  console.log('Checking Java locations...');
  
  // Try to find Java in our bundled locations
  for (const javaLocation of javaLocations) {
    const potentialJavaPath = path.join(javaLocation, executableName);
    console.log('Checking Java path:', potentialJavaPath);
    
    if (fs.existsSync(potentialJavaPath)) {
      javaExecutable = potentialJavaPath;
      console.log('✅ Found bundled Java at:', javaExecutable);
      break;
    } else {
      console.log('❌ Java not found at:', potentialJavaPath);
      
      // Debug: Show what's actually in this directory
      const javaBaseDir = path.dirname(javaLocation);
      if (fs.existsSync(javaBaseDir)) {
        try {
          const contents = fs.readdirSync(javaBaseDir);
          console.log(`   Contents of ${javaBaseDir}:`, contents);
        } catch (e) {
          console.log(`   Could not read ${javaBaseDir}:`, e.message);
        }
      }
    }
  }
  
  // If no bundled Java found, try system Java
  if (!javaExecutable) {
    console.warn('No bundled Java found, trying system Java');
    
    const systemJavaPaths = [];
    
    if (process.platform === 'win32') {
      systemJavaPaths.push('C:\\Program Files\\Java\\jre1.8.0_*\\bin\\javaw.exe');
      systemJavaPaths.push('C:\\Program Files\\Java\\jdk*\\bin\\javaw.exe');
    } else if (process.platform === 'darwin') {
      systemJavaPaths.push('/usr/bin/java');
      systemJavaPaths.push('/Library/Java/JavaVirtualMachines/*/Contents/Home/bin/java');
    } else {
      // Linux - Choose Java version based on Minecraft version
      if (isLegacyVersion) {
        // Use Java 8 for legacy versions (1.8.9 and below)
        systemJavaPaths.push('/usr/lib/jvm/java-8-openjdk-amd64/bin/java');
        systemJavaPaths.push('/usr/lib/jvm/java-1.8.0-openjdk-amd64/bin/java');
        systemJavaPaths.push('/usr/bin/java'); // Fallback to system default
      } else {
        // Use Java 21 for modern versions (1.17+)
        systemJavaPaths.push('/usr/lib/jvm/java-21-openjdk-amd64/bin/java');
        systemJavaPaths.push('/usr/lib/jvm/java-1.21.0-openjdk-amd64/bin/java');
        systemJavaPaths.push('/usr/bin/java'); // Fallback to system default
      }
      systemJavaPaths.push('/usr/local/bin/java');
      systemJavaPaths.push('/opt/java/bin/java');
    }
    
    for (const systemPath of systemJavaPaths) {
      if (fs.existsSync(systemPath)) {
        javaExecutable = systemPath;
        console.log('✅ Found system Java at:', javaExecutable);
        break;
      }
    }
  }
  
  if (!javaExecutable) {
    throw new Error('Java not found. Please ensure Java is installed or bundled with the application.');
  }

  // Verify Java version compatibility
  try {
    const { execSync } = require('child_process');
    const versionOutput = execSync(`"${javaExecutable}" -version 2>&1`, { encoding: 'utf8' });
    const versionMatch = versionOutput.match(/openjdk version "([^"]+)"/);
    
    if (versionMatch) {
      const javaVersion = versionMatch[1];
      console.log(`🔍 Detected Java version: ${javaVersion}`);
      
      const isJava8 = javaVersion.startsWith('1.8');
      const isJava21 = javaVersion.startsWith('21.');
      
      if (isLegacyVersion && !isJava8) {
        console.warn(`⚠️ Using Java ${javaVersion} for legacy Minecraft ${minecraftVersion}. Java 8 is recommended.`);
      } else if (!isLegacyVersion && !isJava21 && !isJava8) {
        console.warn(`⚠️ Using Java ${javaVersion} for modern Minecraft ${minecraftVersion}. Java 21 is recommended.`);
      } else {
        console.log(`✅ Java version ${javaVersion} is compatible with Minecraft ${minecraftVersion}`);
      }
    }
  } catch (error) {
    console.warn('Could not verify Java version:', error.message);
  }

  console.log(`Selected Java executable: ${javaExecutable}`);
  return javaExecutable;
}

ipcRenderer.on('set-user', (event, userNick) => {
  currentUserNick = userNick;
  saveUserConfig(userNick);
  
  setTimeout(() => {
    loadUserSkin(userNick);
  }, 500);
});

function setupVersionDropdown() {
  console.log('🔍 Setting up version dropdown...');
  
  const launchArrow = document.getElementById('launch-arrow');
  const launchMenu = document.getElementById('launch-menu');
  const launchButton = document.getElementById('launch');
  const menuItems = document.querySelectorAll('.launch-menu-item');

  // Debug logging
  console.log('Dropdown elements check:', {
    launchArrow: !!launchArrow,
    launchMenu: !!launchMenu,
    launchButton: !!launchButton,
    menuItemsCount: menuItems.length
  });

  if (!launchArrow || !launchMenu || !launchButton) {
    console.error('❌ Missing essential dropdown elements:', {
      launchArrow: !!launchArrow,
      launchMenu: !!launchMenu,
      launchButton: !!launchButton
    });
    return;
  }
  
  console.log('✅ All dropdown elements found, adding event listeners...');

  launchArrow.addEventListener('click', (e) => {
    e.stopPropagation();
    console.log('🖱️ Launch arrow clicked!');
    
    const isVisible = launchMenu.classList.contains('show');
    console.log('Menu currently visible:', isVisible);
    console.log('Menu classes before:', launchMenu.className);
    
    if (isVisible) {
      launchMenu.classList.remove('show');
      launchArrow.classList.remove('rotated');
      console.log('Menu hidden');
    } else {
      launchMenu.classList.add('show');
      launchArrow.classList.add('rotated');
      console.log('Menu shown');
    }
    
    console.log('Menu classes after:', launchMenu.className);
    console.log('Menu computed style visibility:', window.getComputedStyle(launchMenu).visibility);
    console.log('Menu computed style opacity:', window.getComputedStyle(launchMenu).opacity);
  });

  menuItems.forEach(item => {
    item.addEventListener('click', function() {
      const version = this.getAttribute('data-version');
      const versionType = this.getAttribute('data-type') || 'release';
      const customVersion = this.getAttribute('data-custom');
      const displayName = this.textContent.trim();
      
      // Cambiar mods antes de actualizar la versión seleccionada
      const statusElement = document.getElementById("status");
      if (statusElement) {
        statusElement.textContent = 'Cambiando mods...';
      }
      
      const success = switchModsForVersion(version);
      
      selectedVersion = {
        number: version,
        display: displayName,
        type: versionType,
        custom: customVersion
      };
      
      launchButton.textContent = `LAUNCH ${displayName}`;
      
      launchMenu.classList.remove('show');
      launchArrow.classList.remove('rotated');
      
      // Actualizar lista de mods si estamos en la pestaña de mods
      const modsContent = document.getElementById('mods-content');
      if (modsContent && modsContent.classList.contains('active')) {
        refreshModList();
      }
      
      if (statusElement) {
        if (success) {
          statusElement.textContent = currentUserNick ? 
            `Listo para jugar - ${currentUserNick}` : 
            'Inicia sesión para jugar';
        } else {
          statusElement.textContent = 'Error al cambiar mods';
        }
      }
    });
  });

  document.addEventListener('click', function(e) {
    if (!launchArrow.contains(e.target) && !launchMenu.contains(e.target)) {
      launchMenu.classList.remove('show');
      launchArrow.classList.remove('rotated');
    }
  });
}

function renderModName(fileName) {
  const maxchar = 20;
  const displayName = fileName.length > maxchar ? fileName.slice(0, maxchar - 3) + '...' : fileName;

  const span = document.createElement('span');
  span.textContent = displayName;
  span.title = fileName;
  return span;
}

function refreshModList() {
  const modsDir = './minecraft/mods';
  const modList = document.getElementById('mod-list');
  
  if (!modList) {
    return;
  }
  
  modList.innerHTML = '';

  // Mostrar información de la versión actual
  const versionInfo = document.createElement('div');
  versionInfo.className = 'version-info';
  versionInfo.style.cssText = `
    margin-bottom: 10px;
    padding: 8px;
    background: linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(30, 41, 59, 0.8));
    backdrop-filter: blur(20px);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: 12px;
    font-size: 14px;
    color: #ffffff;
    text-align: center;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  `;
  versionInfo.textContent = `Mods installed for: ${selectedVersion.display}`;
  modList.appendChild(versionInfo);


  if (fs.existsSync(modsDir)) {
    try {
      const files = fs.readdirSync(modsDir);
      const jarFiles = files.filter(file => file.endsWith('.jar') && !fs.statSync(path.join(modsDir, file)).isDirectory());

      if (jarFiles.length === 0) {
        const emptyMessage = document.createElement('li');
        emptyMessage.className = 'empty-message';
        emptyMessage.textContent = 'No mods installed for this version';
        modList.appendChild(emptyMessage);
      } else {
        jarFiles.forEach(file => {
          const li = document.createElement('li');
          li.className = 'mod-item';

          const nameSpan = renderModName(file);
          nameSpan.className = 'mod-name';
          
          const deleteButton = document.createElement('button');
          deleteButton.className = 'delete-mod';
          deleteButton.textContent = 'Delete';

          deleteButton.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const filePath = path.join(modsDir, file);
            
            try {
              fs.unlinkSync(filePath);
              // También eliminar de la carpeta de versión específica
              const versionFolder = getVersionModsFolder(selectedVersion.number);
              const versionFilePath = path.join('./minecraft/mods', versionFolder, file);
              if (fs.existsSync(versionFilePath)) {
                fs.unlinkSync(versionFilePath);
              }
              refreshModList();
            } catch (err) {
              console.error('Error deleting mod:', err);
            }
          };

          li.appendChild(nameSpan);
          li.appendChild(deleteButton);
          modList.appendChild(li);
        });
      }
      
    } catch (err) {
      console.error('Error reading mods directory:', err);
    }
  } else {
    try {
      fs.mkdirSync(modsDir, { recursive: true });
      const emptyMessage = document.createElement('li');
      emptyMessage.className = 'empty-message';
      emptyMessage.textContent = 'No mods installed';
      modList.appendChild(emptyMessage);
    } catch (err) {
      console.error('Error creating mods directory:', err);
    }
  }
}

// FUNCIÓN MEJORADA: Ahora copia archivos al inicio y muestra progreso
function copyInitialFiles() {
  const filesDir = path.join(process.resourcesPath, 'app.asar.unpacked', 'files');
  const minecraftDir = './minecraft';
  const flagFile = path.join(minecraftDir, '.initial_files_copied');
  
  // Si ya se copiaron los archivos, no hacer nada
  if (fs.existsSync(flagFile)) {
    return Promise.resolve();
  }
  
  return new Promise((resolve, reject) => {
    const statusElement = document.getElementById("status");
    
    try {
      if (!fs.existsSync(minecraftDir)) {
        fs.mkdirSync(minecraftDir, { recursive: true });
      }
      
      if (!fs.existsSync(filesDir)) {
        resolve();
        return;
      }
      
      // Mostrar estado de copia
      if (statusElement) {
        statusElement.textContent = "Preparando archivos iniciales...";
      }
      
      function copyRecursive(src, dest) {
        const stat = fs.statSync(src);
        
        if (stat.isDirectory()) {
          if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
          }
          
          const files = fs.readdirSync(src);
          files.forEach(file => {
            const srcPath = path.join(src, file);
            const destPath = path.join(dest, file);
            copyRecursive(srcPath, destPath);
          });
        } else {
          fs.copyFileSync(src, dest);
        }
      }
      
      const files = fs.readdirSync(filesDir);
      let copiedFiles = 0;
      const totalFiles = files.length;
      
      files.forEach(file => {
        const srcPath = path.join(filesDir, file);
        const destPath = path.join(minecraftDir, file);
        
        if (statusElement) {
          statusElement.textContent = `Copiando ${file}... (${copiedFiles + 1}/${totalFiles})`;
        }
        
        copyRecursive(srcPath, destPath);
        copiedFiles++;
      });
      
      // Crear el archivo de flag para indicar que la copia se completó
      fs.writeFileSync(flagFile, new Date().toISOString());
      
      if (statusElement) {
        statusElement.textContent = "Archivos iniciales preparados";
      }
      
      resolve();
      
    } catch (error) {
      if (statusElement) {
        statusElement.textContent = `Error copiando archivos: ${error.message}`;
      }
      reject(error);
    }
  });
}

function setupTabs() {
  const homeTab = document.getElementById('home-tab');
  const modsTab = document.getElementById('mods-tab');
  
  console.log('Setting up tabs - Home tab:', homeTab ? 'found' : 'not found', 
              'Mods tab:', modsTab ? 'found' : 'not found');
  
  // Make sure minecraft mods directory exists
  try {
    const modsDir = './minecraft/mods';
    if (!fs.existsSync(modsDir)) {
      fs.mkdirSync(modsDir, { recursive: true });
      console.log('Created mods directory');
    }
  } catch (error) {
    console.error('Error creating mods directory:', error);
  }
  
  if (homeTab) {
    homeTab.addEventListener('click', () => {
      console.log('Home tab clicked');
      const homeContent = document.getElementById('home-content');
      const modsContent = document.getElementById('mods-content');
      
      if (homeContent) homeContent.classList.add('active');
      if (modsContent) modsContent.classList.remove('active');
      
      homeTab.classList.add('active');
      if (modsTab) modsTab.classList.remove('active');
      
      document.body.style.backgroundColor = '#ffffff';
    });
  }
  
  if (modsTab) {
    modsTab.addEventListener('click', () => {
      console.log('Mods tab clicked');
      const homeContent = document.getElementById('home-content');
      const modsContent = document.getElementById('mods-content');
      
      if (!modsContent) {
        console.error('Mods content element not found!');
        return;
      }
      
      if (modsContent) modsContent.classList.add('active');
      if (homeContent) homeContent.classList.remove('active');
      
      modsTab.classList.add('active');
      if (homeTab) homeTab.classList.remove('active');
      
      document.body.style.backgroundColor = '#e0e0e0';
      
      // Make sure mods directory exists before refreshing
      try {
        const modsDir = './minecraft/mods';
        if (!fs.existsSync(modsDir)) {
          fs.mkdirSync(modsDir, { recursive: true });
        }
      } catch (error) {
        console.error('Error checking/creating mods directory:', error);
      }
      
      setTimeout(() => {
        console.log('Refreshing mod list');
        refreshModList();
      }, 100);
    });
  } else {
    console.warn('Mods tab element not found in DOM');
  }
}

function setupDragAndDrop() {
  const dropZones = document.querySelectorAll('.drop-zone');
  
  dropZones.forEach(zone => {
    zone.ondragover = null;
    zone.ondragleave = null;
    zone.ondrop = null;
    
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('highlight');
    });

    zone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      zone.classList.remove('highlight');
    }); 

    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('highlight');
      
      const files = Array.from(e.dataTransfer.files);
      const jarFiles = files.filter(file => file.name.endsWith('.jar'));
      
      if (jarFiles.length === 0) {
        return;
      }

      const modsDir = './minecraft/mods';
      const versionFolder = getVersionModsFolder(selectedVersion.number);
      const versionModsPath = path.join('./minecraft/mods', versionFolder);

      // Crear directorios si no existen
      if (!fs.existsSync(modsDir)) {
        try {
          fs.mkdirSync(modsDir, { recursive: true });
        } catch (err) {
          return;
        }
      }

      if (!fs.existsSync(versionModsPath)) {
        try {
          fs.mkdirSync(versionModsPath, { recursive: true });
        } catch (err) {
          return;
        }
      }

      let processed = 0;
      let installed = 0;
      
      jarFiles.forEach(file => {
        const mainDestinationPath = path.join(modsDir, file.name);
        const versionDestinationPath = path.join(versionModsPath, file.name);
        
        try {
          // Copiar a la carpeta principal de mods (activos)
          fs.copyFileSync(file.path, mainDestinationPath);
          // Copiar también a la carpeta específica de la versión (respaldo)
          fs.copyFileSync(file.path, versionDestinationPath);
          installed++;
        } catch (err) {
          console.error(`Error installing mod ${file.name}:`, err);
        }
        
        processed++;
        if (processed === jarFiles.length) {
          setTimeout(() => {
            refreshModList();
          }, 200);
        }
      });
    });
  });
}

function setupWindowControls() {
  const minimizeBtn = document.getElementById('minimize-btn');
  const closeBtn = document.getElementById('close-btn');
  
  if (minimizeBtn) {
    minimizeBtn.addEventListener('click', () => {
      ipcRenderer.send('minimize-window');
    });
  }
  
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      ipcRenderer.send('close-window');
    });
  }
  
  // Setup debug enabler - click 5 times quickly to enable debug mode
  setupDebugEnabler();
}

function setupDebugEnabler() {
  const debugEnabler = document.getElementById('debug-enabler');
  if (!debugEnabler) return;
  
  let clickCount = 0;
  let clickTimeout;
  
  debugEnabler.addEventListener('click', () => {
    clickCount++;
    
    // Clear previous timeout
    if (clickTimeout) {
      clearTimeout(clickTimeout);
    }
    
    // Show visual feedback
    debugEnabler.style.opacity = '0.3';
    setTimeout(() => {
      debugEnabler.style.opacity = '0';
    }, 100);
    
    if (clickCount >= 5) {
      console.log('🔧 Debug mode enabled!');
      
      // Enable developer tools
      ipcRenderer.send('enable-debug-mode');
      
      // Show notification
      const statusElement = document.getElementById("status");
      if (statusElement) {
        const originalText = statusElement.textContent;
        statusElement.textContent = '🔧 Debug mode enabled! Press F12 for Developer Tools';
        statusElement.style.color = '#4CAF50';
        
        setTimeout(() => {
          statusElement.textContent = originalText;
          statusElement.style.color = '';
        }, 3000);
      }
      
      // Add debug info overlay
      addDebugOverlay();
      
      clickCount = 0;
    } else {
      // Reset click count after 2 seconds
      clickTimeout = setTimeout(() => {
        clickCount = 0;
      }, 2000);
    }
  });
}

function addDebugOverlay() {
  // Don't add if already exists
  if (document.getElementById('debug-overlay')) return;
  
  const overlay = document.createElement('div');
  overlay.id = 'debug-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 10px;
    left: 10px;
    background: rgba(0, 0, 0, 0.8);
    color: #00ff00;
    padding: 10px;
    border-radius: 5px;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    z-index: 10000;
    pointer-events: none;
    max-width: 300px;
  `;
  
  // Add debug information
  const debugInfo = [
    `🔧 DEBUG MODE ACTIVE`,
    `Platform: ${process.platform}`,
    `Node: ${process.versions.node}`,
    `Electron: ${process.versions.electron}`,
    `Chrome: ${process.versions.chrome}`,
    `Packaged: ${process.resourcesPath ? 'Yes' : 'No'}`,
    ``,
    `Shortcuts:`,
    `F12 - Toggle DevTools`,
    `Ctrl+Alt+I - Toggle DevTools`,
    `Ctrl+K - Clear Console`,
    `Right-click - Context Menu`
  ];
  
  overlay.innerHTML = debugInfo.join('<br>');
  document.body.appendChild(overlay);
  
  // Auto-hide after 10 seconds
  setTimeout(() => {
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  }, 10000);
}

function setupLaunchButton() {
  console.log('🔍 Setting up launch button...');
  
  const runFileButton = document.getElementById('launch');
  
  if (!runFileButton) {
    console.error('❌ Launch button not found! Element with id "launch" does not exist.');
    return;
  }
  
  console.log('✅ Launch button found:', runFileButton);
  console.log('Button text:', runFileButton.textContent);
  console.log('Button classes:', runFileButton.className);
  
  // Make sure the button is clearly visible and clickable
  runFileButton.style.opacity = '1';
  runFileButton.style.pointerEvents = 'auto';
  runFileButton.style.cursor = 'pointer';
  
  // Check if we already have text on the button
  if (!runFileButton.textContent || runFileButton.textContent.trim() === '') {
    runFileButton.textContent = 'LAUNCH 1.21.1';
    console.log('✅ Set default launch button text');
  }
  
  // Remove any existing event listeners first
  const newButton = runFileButton.cloneNode(true);
  runFileButton.parentNode.replaceChild(newButton, runFileButton);
  
  console.log('🎯 Adding click event listener...');
  
  // Add a test click handler first to see if clicks are detected
  newButton.addEventListener('mousedown', () => {
    console.log('🖱️ MOUSE DOWN detected on launch button');
  });
  
  newButton.addEventListener('mouseup', () => {
    console.log('🖱️ MOUSE UP detected on launch button');
  });
  
  newButton.addEventListener('click', async (event) => {
    console.log('🚀 LAUNCH BUTTON CLICKED!');
    console.log('Event details:', event);
    console.log('Button element:', event.target);
    console.log('Current user nick:', currentUserNick);
    console.log('Selected version:', selectedVersion);
    
    const nickInput = currentUserNick;
    
    console.log('Current user:', nickInput);
    console.log('Selected version:', selectedVersion ? JSON.stringify(selectedVersion) : 'None');
      
    // Show a clear visual indication that the button was clicked
    newButton.style.backgroundColor = "#4CAF50";
    setTimeout(() => {
      newButton.style.backgroundColor = "";
    }, 300);

    if (!nickInput) {
      const statusElement = document.getElementById("status");
      
      // Offer quick offline login
      const offlineUsername = prompt("Enter username for offline play:", "Player");
      
      if (offlineUsername && offlineUsername.trim()) {
        // Set up offline user
        currentUserNick = offlineUsername.trim();
        console.log('Set up offline user:', currentUserNick);
        
        // Update UI
        if (statusElement) {
          statusElement.textContent = `Ready to play - ${currentUserNick} (Offline Mode)`;
        }
        
        // Update user display
        updateUserDisplay(currentUserNick);
        
        // Continue with launch - fall through to game launch code
        console.log('Proceeding with offline launch...');
      } else {
        // User cancelled or entered empty name
        if (statusElement) {
          statusElement.textContent = "Nickname requerido - Inicia sesión primero";
        }
        
        newButton.style.border = "2px solid red";
        newButton.style.backgroundColor = "#a14b4b94";

        setTimeout(() => {
          newButton.style.border = "";
          newButton.style.backgroundColor = "";
        }, 250);

        return;
      }
    }

    newButton.classList.add("activo");
    newButton.disabled = true;

      try {
        const statusElement = document.getElementById("status");
        if (statusElement) {
          statusElement.textContent = "Iniciando juego...";
        }
        
        // Ya no necesitamos copiar archivos aquí, se hizo al inicio
        // Asegurar que los mods correctos estén cargados para esta versión
        switchModsForVersion(selectedVersion.number);

        // Check if we have Microsoft auth
        let authInfo;
        try {
          if (launcherIntegration.isAuthenticated()) {
            if (statusElement) {
              statusElement.textContent = "Using Microsoft authentication...";
            }
            authInfo = await launcherIntegration.getMinecraftAuth();
            console.log('Successfully retrieved Microsoft auth for launch');
          } else {
            // Fallback to offline mode
            if (statusElement) {
              statusElement.textContent = "Using offline mode...";
            }
            const generatedUUID = uuidv3(`OfflinePlayer:${nickInput}`, NAMESPACE);
            authInfo = {
              access_token: '',
              client_token: '',
              uuid: generatedUUID,
              name: nickInput,
              user_properties: '{}',
              meta: {
                type: 'mojang',
                demo: false,
                xuid: '',
                clientId: ''
              }
            };
            console.log('Using offline auth for launch');
          }
        } catch (error) {
          console.error('Authentication error during launch:', error);
          // Fallback to offline mode if Microsoft auth fails
          if (statusElement) {
            statusElement.textContent = "Microsoft auth failed, using offline mode...";
          }
          const generatedUUID = uuidv3(`OfflinePlayer:${nickInput}`, NAMESPACE);
          authInfo = {
            access_token: '',
            client_token: '',
            uuid: generatedUUID,
            name: nickInput,
            user_properties: '{}',
            meta: {
              type: 'mojang',
              demo: false,
              xuid: '',
              clientId: ''
            }
          };
          console.log('Fallback to offline auth due to error');
        }
        
        let versionConfig;
        
        // Always use vanilla version for minecraft-launcher-core compatibility
        // Fabric will be handled by the launcher after vanilla downloads
        versionConfig = {
          number: selectedVersion.number,
          type: selectedVersion.type || "release"
        };
        
        let javaPath;
        try {
          javaPath = getJavaPath(selectedVersion.number);
          
          if (statusElement) {
            const javaVersion = javaPath.includes('java8') ? 'Java 8' : 'Java 21';
            statusElement.textContent = `Iniciando con ${javaVersion}...`;
          }
        } catch (error) {
          throw new Error(`No se pudo determinar la versión de Java adecuada: ${error.message}`);
        }
        
        // Adjust memory based on system RAM
        let maxRam = "4G";
        let minRam = "2G";
        
        try {
          // Try to get system memory and adjust RAM allocation
          const os = require('os');
          const totalMemMB = Math.floor(os.totalmem() / (1024 * 1024));
          console.log('System total RAM (MB):', totalMemMB);
          
          if (totalMemMB >= 16000) { // 16GB or more
            maxRam = "6G";
            minRam = "4G";
          } else if (totalMemMB >= 8000) { // 8GB or more
            maxRam = "4G";
            minRam = "2G";
          } else if (totalMemMB >= 4000) { // 4GB or more
            maxRam = "2G";
            minRam = "1G";
          } else { // Less than 4GB
            maxRam = "1G";
            minRam = "512M";
          }
        } catch (error) {
          console.error('Error determining system memory:', error);
          // Fallback to conservative values
          maxRam = "2G";
          minRam = "1G";
        }
        
        // Get proper application paths
        const appPaths = await ipcRenderer.invoke('get-app-paths');
        console.log('Application paths:', appPaths);
        
        const minecraftDir = appPaths.minecraftDir;
        console.log('Using minecraft directory:', minecraftDir);
        
        // Platform-specific launch options
        const platformOptions = {};
        
        if (process.platform === 'win32') {
          platformOptions.windowsHide = true;
        } else if (process.platform === 'darwin') {
          // macOS specific options
          platformOptions.env = { ...process.env };
        } else {
          // Linux specific options
          platformOptions.env = { ...process.env };
        }
        
        const opt = {
          authorization: authInfo,
          root: minecraftDir,
          version: versionConfig,
          memory: {
            max: maxRam,
            min: minRam
          },
          javaPath: javaPath,
          timeout: 60000, // Increase timeout to 60 seconds
          downloadTimeout: 45000, // 45 second download timeout
          retries: 3, // Allow 3 retry attempts
          parallel: 2, // Limit parallel downloads to help with stuck connections
          skipValidation: true, // Skip file validation for faster launch
          forge: false, // Explicitly disable forge
          overrides: {
            detached: true,
            stdio: 'ignore',
            ...platformOptions
          }
        };
        
        // Use bundled assets if available
        if (appPaths.bundledAssets && fs.existsSync(appPaths.bundledAssets)) {
          console.log('✅ Using bundled assets from:', appPaths.bundledAssets);
          
          // Check for bundled version manifest
          const bundledVersionManifest = path.join(appPaths.bundledAssets, 'minecraft', 'versions', selectedVersion.number, `${selectedVersion.number}.json`);
          if (fs.existsSync(bundledVersionManifest)) {
            console.log('✅ Found bundled version manifest:', bundledVersionManifest);
            // minecraft-launcher-core will use this automatically if it exists in the minecraft directory
          }
          
          // Copy bundled assets to minecraft directory if they don't exist
          const targetVersionDir = path.join(minecraftDir, 'versions', selectedVersion.number);
          const targetVersionFile = path.join(targetVersionDir, `${selectedVersion.number}.json`);
          
          if (!fs.existsSync(targetVersionFile)) {
            try {
              fs.mkdirSync(targetVersionDir, { recursive: true });
              fs.copyFileSync(bundledVersionManifest, targetVersionFile);
              console.log('✅ Copied bundled version manifest to minecraft directory');
            } catch (error) {
              console.warn('⚠️ Could not copy bundled version manifest:', error.message);
            }
          }
        } else {
          console.log('⚠️ No bundled assets found, will download from internet');
        }
        
        console.log('Launching with options:', JSON.stringify({
          version: opt.version,
          memory: opt.memory,
          javaPath: opt.javaPath,
          root: opt.root,
          platform: process.platform,
          bundledAssets: !!appPaths.bundledAssets
        }));
        
        // Check minecraft directory
        console.log('📁 Checking minecraft directory...');
        try {
          if (fs.existsSync(minecraftDir)) {
            console.log('✅ Minecraft directory exists');
            const stats = fs.lstatSync(minecraftDir);
            console.log('Directory stats:', {
              isDirectory: stats.isDirectory(),
              isWritable: true // We'll assume writable for now
            });
          } else {
            console.log('⚠️ Minecraft directory does not exist, will be created');
          }
        } catch (error) {
          console.error('❌ Error checking minecraft directory:', error);
        }
        
        // Test network connectivity before launch
        console.log('🌐 Testing network connectivity...');
        try {
          fetch('https://launcher.mojang.com/mc/game/version_manifest.json', { 
            method: 'HEAD', 
            timeout: 5000 
          })
          .then(() => console.log('✅ Network connectivity OK'))
          .catch(err => console.warn('⚠️ Network connectivity issue:', err.message));
        } catch (e) {
          console.warn('⚠️ Network test failed:', e.message);
        }

        const minecraftProcess = Launcher.launch(opt);
        
        console.log('🎯 Launcher.launch() called, process object:', minecraftProcess);
        
        // Add immediate debugging
        setTimeout(() => {
          console.log('⏰ 5 seconds after launch - checking status...');
          console.log('Download screen visible?', document.getElementById("download-screen")?.style.display);
          console.log('Launcher process still active?', !!minecraftProcess);
        }, 5000);
        
        setTimeout(() => {
          console.log('⏰ 15 seconds after launch - extended check...');
          const downloadScreen = document.getElementById("download-screen");
          const statusElement = document.getElementById("status");
          console.log('Download screen display:', downloadScreen?.style.display);
          console.log('Status text:', statusElement?.textContent);
        }, 15000);        Launcher.on('debug', (e) => {
          console.log('🐛 Launcher debug:', e);
        });
        
        Launcher.on('data', (e) => {
          console.log('📊 Launcher data:', e);
          lastDownloadActivity = Date.now(); // Update activity for any launcher output
          
          // Check if game has actually started
          if (e.includes('joined the game') || 
              e.includes('Starting integrated minecraft server') || 
              e.includes('Time elapsed:') ||
              e.includes('Preparing spawn area: 100%') ||
              e.includes('OpenAL initialized') ||
              e.includes('Sound engine started') ||
              e.includes('Created: 1024x512x4 minecraft:textures/atlas/blocks.png-atlas')) {
            console.log('🎮 Game started successfully! Clearing download timeout...');
            if (downloadTimeout) {
              clearInterval(downloadTimeout);
              downloadTimeout = null;
            }
            
            // Hide download screen since game is running
            const fondoElement = document.getElementById("fondo");
            const downloadElement = document.getElementById("download-screen");
            if (fondoElement) fondoElement.style.display = "none";
            if (downloadElement) downloadElement.style.display = "none";
            
            // Update status
            const statusElement = document.getElementById("status");
            if (statusElement && e.includes('joined the game')) {
              statusElement.textContent = `🎮 Game launched successfully! Playing as ${currentUserNick}`;
            }
          }
        });

        Launcher.on('download', (e) => {
          console.log('📥 Download event:', e);
          const fondoElement = document.getElementById("fondo");
          const downloadElement = document.getElementById("download-screen");
          const descargaElement = document.getElementById("descarga");
          const statusElement = document.getElementById("status");
          
          if (fondoElement) fondoElement.style.display = "block";
          if (downloadElement) downloadElement.style.display = "block";
          if (descargaElement) descargaElement.textContent = e;
          if (statusElement) statusElement.textContent = `Descargando ${selectedVersion.display}...`;
        });

        Launcher.on('download-status', (e) => {
          console.log('📊 Download status:', e);
          const statusElement = document.getElementById("status");
          if (statusElement && e.type) {
            statusElement.textContent = `Descargando ${e.type} - ${selectedVersion.display}`;
          }
        });

        Launcher.on('progress', (e) => {
          console.log('⏳ Download progress:', e);
          const statusElement = document.getElementById("status");
          if (statusElement && e.task && e.total) {
            const percentage = Math.round((e.task / e.total) * 100);
            statusElement.textContent = `Descargando ${selectedVersion.display} - ${percentage}%`;
          }
        });

        // Add timeout detection - increased timeout for slower connections
        let downloadTimeout;
        let lastDownloadActivity = Date.now();
        
        const checkDownloadProgress = () => {
          const timeSinceLastActivity = Date.now() - lastDownloadActivity;
          
          // Check if game has actually started (look for game launch indicators)
          const gameStarted = Launcher && Launcher.pid && document.getElementById("fondo").style.display === "none";
          
          if (gameStarted) {
            console.log('🎮 Game successfully launched - clearing download timeout');
            if (downloadTimeout) {
              clearInterval(downloadTimeout);
            }
            return;
          }
          
          // Increased timeout to 60 seconds for slower connections, but don't auto-retry
          if (timeSinceLastActivity > 60000) { // 1 minute timeout
            console.warn('⚠️ Download seems slow, no activity for 1 minute');
            const statusElement = document.getElementById("status");
            if (statusElement) {
              statusElement.textContent = `Download seems slow... please wait or press F12 to check console`;
            }
            
            // Only warn once per launch, don't keep showing dialogs
            if (downloadTimeout) {
              clearInterval(downloadTimeout);
              downloadTimeout = null;
            }
            
            // Log some helpful info but don't interrupt the download
            console.log('� Download status check:');
            console.log('- Time since last activity:', Math.round(timeSinceLastActivity / 1000), 'seconds');
            console.log('- Game started check:', document.getElementById("fondo")?.style.display === "none");
            console.log('- This is normal for first-time downloads or slow connections');
            console.log('- Press F12 to open developer tools and monitor progress');
          }
        };
        
        // Reset timeout on any download activity
        Launcher.on('download', () => { lastDownloadActivity = Date.now(); });
        Launcher.on('download-status', () => { lastDownloadActivity = Date.now(); });
        Launcher.on('progress', () => { lastDownloadActivity = Date.now(); });
        
        // Check for stuck downloads every 30 seconds (instead of 10)
        downloadTimeout = setInterval(checkDownloadProgress, 30000);

        Launcher.on("close", (code) => {
          console.log('🎮 Minecraft process closed with code:', code);
          newButton.classList.remove("activo");
          newButton.disabled = false;
          
          // Clear download timeout
          if (downloadTimeout) {
            clearInterval(downloadTimeout);
          }
          
          const statusElement = document.getElementById("status");
          if (statusElement) {
            statusElement.textContent = `Listo para jugar - ${currentUserNick}`;
          }
          
          // Hide download screen
          const fondoElement = document.getElementById("fondo");
          const downloadElement = document.getElementById("download-screen");
          if (fondoElement) fondoElement.style.display = "none";
          if (downloadElement) downloadElement.style.display = "none";
        });

        Launcher.on('error', (error) => {
          console.error('❌ Launcher error:', error);
          newButton.classList.remove("activo");
          newButton.disabled = false;
          
          // Clear download timeout
          if (downloadTimeout) {
            clearInterval(downloadTimeout);
          }
          
          const statusElement = document.getElementById("status");
          if (statusElement) {
            statusElement.textContent = `Error: ${error.message || 'Error desconocido'}`;
          }
          
          // Hide download screen on error
          const fondoElement = document.getElementById("fondo");
          const downloadElement = document.getElementById("download-screen");
          if (fondoElement) fondoElement.style.display = "none";
          if (downloadElement) downloadElement.style.display = "none";
        });

      } catch (error) {
        newButton.classList.remove("activo");
        newButton.disabled = false;
        
        const statusElement = document.getElementById("status");
        if (statusElement) {
          statusElement.textContent = `Error al iniciar: ${error.message}`;
        }
      }
    });
}

function initializeDefaultVersion() {
  selectedVersion = {
    number: "1.21.1",
    display: "1.21.1",
    type: "release",
    custom: "1.21.1-fabric"
  };
  
  const launchButton = document.getElementById('launch');
  if (launchButton) {
    launchButton.textContent = `LAUNCH ${selectedVersion.display}`;
  }
  
  // Cargar mods para la versión por defecto
  switchModsForVersion(selectedVersion.number);
  
  // Check if we have the required directory structure for offline mode
  checkRequiredDirectories().catch(error => {
    console.error('Error checking required directories:', error);
  });
}

async function checkRequiredDirectories() {
  console.log('Checking required directories for offline play');
  
  // Get proper app paths
  const appPaths = await ipcRenderer.invoke('get-app-paths');
  
  const requiredDirs = [
    appPaths.minecraftDir,
    path.join(appPaths.minecraftDir, 'mods'),
    path.join(appPaths.minecraftDir, 'versions'),
    path.join(appPaths.minecraftDir, 'versions', selectedVersion.custom)
  ];
  
  let allDirsExist = true;
  
  for (const dir of requiredDirs) {
    if (!fs.existsSync(dir)) {
      console.warn(`Required directory missing: ${dir}`);
      allDirsExist = false;
      
      try {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
      } catch (error) {
        console.error(`Failed to create directory ${dir}:`, error);
      }
    }
  }
  
  // Check if we have a version JSON file
  const versionJsonPath = path.join(appPaths.minecraftDir, 'versions', selectedVersion.custom, `${selectedVersion.custom}.json`);
  
  if (!fs.existsSync(versionJsonPath)) {
    console.warn(`Version JSON file missing: ${versionJsonPath}`);
    
    try {
      // Create a basic version JSON file
      const versionData = {
        id: selectedVersion.custom,
        inheritsFrom: selectedVersion.number,
        type: selectedVersion.type,
        time: new Date().toISOString(),
        releaseTime: new Date().toISOString(),
        mainClass: "net.fabricmc.loader.impl.launch.knot.KnotClient"
      };
      
      fs.writeFileSync(versionJsonPath, JSON.stringify(versionData, null, 2));
      console.log(`Created version JSON file: ${versionJsonPath}`);
    } catch (error) {
      console.error(`Failed to create version JSON file:`, error);
    }
  }
  
  // Create launcher_config.json if missing
  const configPath = './minecraft/launcher_config.json';
  if (!fs.existsSync(configPath)) {
    console.warn(`Config file missing: ${configPath}`);
    
    try {
      const defaultConfig = {
        username: 'Player',
        lastLogin: new Date().toISOString(),
        autoLogin: false,
        lastUsedVersion: selectedVersion.number,
        settings: {
          closeOnLaunch: false,
          keepLauncherOpen: true,
          javaArgs: "-Xmx4G -Xms2G"
        }
      };
      
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
      console.log(`Created config file: ${configPath}`);
    } catch (error) {
      console.error(`Failed to create config file:`, error);
    }
  }
  
  const statusElement = document.getElementById("status");
  if (statusElement) {
    if (allDirsExist) {
      statusElement.textContent = currentUserNick ? 
        `Listo para jugar - ${currentUserNick}` : 
        'Inicia sesión para jugar';
    } else {
      statusElement.textContent = 'Preparando para jugar offline...';
    }
  }
}

// FUNCIÓN PRINCIPAL DE INICIALIZACIÓN - Ahora maneja la copia de archivos al inicio
async function initializeApp() {
  console.log('🚀 Initializing app on platform:', process.platform);
  console.log('🔧 Press F12 to open Developer Tools for debugging');
  console.log('🔧 Right-click anywhere for context menu with debug options');
  
  // Initialize paths first
  await initializePaths();
  
  // Create the minecraft directory if it doesn't exist
  try {
    const paths = await getAppPaths();
    if (!fs.existsSync(paths.minecraft)) {
      fs.mkdirSync(paths.minecraft, { recursive: true });
      console.log('✅ Created minecraft directory at:', paths.minecraft);
    }
  } catch (error) {
    console.error('❌ Error creating minecraft directory:', error);
  }
  
  // Set up F12 keyboard shortcut for dev tools (fallback if global shortcut fails)
  document.addEventListener('keydown', (event) => {
    if (event.key === 'F12') {
      event.preventDefault();
      console.log('🔧 F12 pressed - toggling developer tools');
      ipcRenderer.send('toggle-dev-tools');
    }
    // Also handle Ctrl+Shift+I
    if (event.ctrlKey && event.shiftKey && event.key === 'I') {
      event.preventDefault();
      console.log('🔧 Ctrl+Shift+I pressed - toggling developer tools');
      ipcRenderer.send('toggle-dev-tools');
    }
  });
  
  // Inicializar la versión por defecto primero para que todo sea consistente
  console.log('📝 Initializing default version...');
  initializeDefaultVersion();
  
  // Configurar los controles básicos
  console.log('🔧 Setting up controls...');
  setupWindowControls();
  setupTabs();
  setupDragAndDrop();
  
  console.log('🎮 Setting up launch controls...');
  setupLaunchButton();
  setupVersionDropdown();
  
  // Check dependencies
  console.log('☕ Checking Java installation...');
  checkJavaInstallation();
  
  // Add a small debug indicator in the corner
  const debugIndicator = document.createElement('div');
  debugIndicator.id = 'debug-indicator';
  debugIndicator.innerHTML = '🔧';
  debugIndicator.title = 'Press F12 for Developer Tools\nRight-click for debug menu';
  debugIndicator.style.cssText = `
    position: fixed;
    bottom: 10px;
    right: 10px;
    font-size: 16px;
    opacity: 0.3;
    cursor: pointer;
    z-index: 1000;
    transition: opacity 0.3s;
  `;
  
  debugIndicator.addEventListener('mouseenter', () => {
    debugIndicator.style.opacity = '1';
  });
  
  debugIndicator.addEventListener('mouseleave', () => {
    debugIndicator.style.opacity = '0.3';
  });
  
  debugIndicator.addEventListener('click', () => {
    ipcRenderer.send('toggle-dev-tools');
  });
  
  document.body.appendChild(debugIndicator);
  
  // Initialize Microsoft auth
  try {
    await launcherIntegration.init();
    
    // If we have a Microsoft account logged in, prioritize it
    if (launcherIntegration.isAuthenticated()) {
      const user = launcherIntegration.getCurrentUser();
      if (user && user.name) {
        currentUserNick = user.name;
        saveUserConfig(user.name);
      }
    }
  } catch (error) {
    console.error('Microsoft auth initialization error:', error);
  }
  
  // Verificar usuario guardado
  const hasUser = checkSavedUser();
  setupLogoutButton();
  setupUserAvatarDropdown();
  
  // Copiar archivos iniciales ANTES de que el usuario interactúe
  try {
    await copyInitialFiles();
    
    // Una vez copiados los archivos, actualizar el estado
    const statusElement = document.getElementById("status");
    if (hasUser && currentUserNick) {
      if (statusElement) {
        statusElement.textContent = `Listo para jugar - ${currentUserNick}`;
      }
      // Cargar skin del usuario después de un breve delay
      setTimeout(() => {
        loadUserSkin(currentUserNick);
      }, 500);
    } else {
      if (statusElement) {
        statusElement.textContent = 'Inicia sesión para jugar';
      }
    }
    
  } catch (error) {
    console.error('Error during app initialization:', error);
    const statusElement = document.getElementById("status");
    if (statusElement) {
      statusElement.textContent = `Error de inicialización: ${error.message}`;
    }
  }
}

// Cambiar el event listener para usar la nueva función de inicialización
// Function to check Java installation
function checkJavaInstallation() {
  try {
    // Try to detect bundled Java first
    const baseJavaPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'java');
    const javaFolder = 'java21';
    const javaFolderPath = path.join(baseJavaPath, javaFolder);
    const javaBinPath = path.join(javaFolderPath, 'bin');
    
    let javaExecutable;
    
    if (process.platform === 'win32') {
      javaExecutable = path.join(javaBinPath, 'javaw.exe');
    } else {
      javaExecutable = path.join(javaBinPath, 'java');
    }
    
    const hasJava = fs.existsSync(javaExecutable);
    console.log('Bundled Java found:', hasJava ? 'Yes' : 'No', 'at path:', javaExecutable);
    
    // If bundled Java is not found, try to detect system Java
    if (!hasJava) {
      try {
        const { execSync } = require('child_process');
        let javaVersion;
        
        if (process.platform === 'win32') {
          // On Windows, try with where command
          javaVersion = execSync('where java').toString().trim();
        } else {
          // On Unix-like systems, use which
          javaVersion = execSync('which java').toString().trim();
        }
        
        console.log('System Java found at:', javaVersion);
        
        // Try to get Java version
        try {
          const versionInfo = execSync(`"${javaVersion}" -version 2>&1`).toString();
          console.log('Java version info:', versionInfo);
        } catch (e) {
          console.error('Error getting Java version:', e.message);
        }
      } catch (e) {
        console.error('System Java not found:', e.message);
        const statusElement = document.getElementById("status");
        if (statusElement) {
          statusElement.textContent = 'Warning: Java not found! Minecraft might not launch properly.';
        }
      }
    }
  } catch (error) {
    console.error('Error checking Java installation:', error);
  }
}

// Add a file to help with troubleshooting
async function createTroubleshootingFile() {
  try {
    // Get proper app paths
    const appPaths = await ipcRenderer.invoke('get-app-paths');
    const troubleshootingPath = path.join(appPaths.minecraftDir, 'troubleshooting.txt');
    const os = require('os');
    
    // Ensure minecraft directory exists
    if (!fs.existsSync(appPaths.minecraftDir)) {
      fs.mkdirSync(appPaths.minecraftDir, { recursive: true });
    }
    
    let content = 'Void Client Troubleshooting Information\n';
    content += '===================================\n\n';
    content += `Date: ${new Date().toISOString()}\n`;
    content += `Platform: ${process.platform}\n`;
    content += `Architecture: ${process.arch}\n`;
    content += `Node.js Version: ${process.version}\n`;
    content += `Electron Version: ${process.versions.electron}\n`;
    content += `Chrome Version: ${process.versions.chrome}\n`;
    content += `Total Memory: ${Math.round(os.totalmem() / (1024 * 1024 * 1024))} GB\n`;
    content += `Free Memory: ${Math.round(os.freemem() / (1024 * 1024 * 1024))} GB\n`;
    content += `CPUs: ${os.cpus().length} (${os.cpus()[0].model})\n`;
    content += `Minecraft Directory: ${appPaths.minecraftDir}\n`;
    content += `Resources Path: ${process.resourcesPath}\n`;
    content += `User Data Path: ${appPaths.userDataDir}\n`;
    content += '\nIf you are having issues launching Minecraft, please check:\n';
    content += '1. Do you have Java installed?\n';
    content += '2. Do you have enough free disk space?\n';
    content += '3. Is your antivirus blocking the launcher?\n';
    content += '4. Are your graphics drivers updated?\n\n';
    content += 'You can share this file when reporting issues.\n';
    
    fs.writeFileSync(troubleshootingPath, content);
    console.log('Created troubleshooting file at:', troubleshootingPath);
  } catch (error) {
    console.error('Error creating troubleshooting file:', error);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // First create troubleshooting file
  await createTroubleshootingFile();
  
  // Then initialize the app
  initializeApp();
});

// User Avatar Dropdown functionality
function setupUserAvatarDropdown() {
  const userAvatar = document.querySelector('.user-avatar');
  const userDropdown = document.getElementById('user-dropdown');
  const logoutOption = document.getElementById('logout-option');
  
  if (!userAvatar || !userDropdown || !logoutOption) {
    console.log('User avatar dropdown elements not found');
    return;
  }
  
  // Toggle dropdown on avatar click
  userAvatar.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = userDropdown.style.display === 'block';
    userDropdown.style.display = isVisible ? 'none' : 'block';
  });
  
  // Handle logout
  logoutOption.addEventListener('click', () => {
    userDropdown.style.display = 'none';
    ipcRenderer.send('logout-user');
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!userAvatar.contains(e.target)) {
      userDropdown.style.display = 'none';
    }
  });
}

// Reset UI to login state after logout
function resetToLoginUI() {
  // Hide main content and show login
  const loginContainer = document.querySelector('.login-container');
  const mainContainer = document.querySelector('.container .main-content');
  
  if (loginContainer && mainContainer) {
    loginContainer.style.display = 'flex';
    mainContainer.style.display = 'none';
    
    // Clear any stored user data
    sessionStorage.clear();
    
    // Reset form if needed
    const usernameInput = document.getElementById('usernameInput');
    if (usernameInput) {
      usernameInput.value = '';
    }
    
    console.log('User logged out successfully');
  }
}