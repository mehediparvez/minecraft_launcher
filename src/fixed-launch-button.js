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
  
  console.log('🎯 Adding click event listener...');
  runFileButton.addEventListener('click', async (event) => {
    console.log('🚀 LAUNCH BUTTON CLICKED!');
    console.log('Event details:', event);
    
    const nickInput = currentUserNick;
    
    console.log('Current user:', nickInput);
    console.log('Selected version:', selectedVersion ? JSON.stringify(selectedVersion) : 'None');
      
    // Show a clear visual indication that the button was clicked
    runFileButton.style.backgroundColor = "#4CAF50";
    setTimeout(() => {
      runFileButton.style.backgroundColor = "";
    }, 300);

    if (!nickInput) {
      const statusElement = document.getElementById("status");
      if (statusElement) {
        statusElement.textContent = "Nickname requerido - Inicia sesión primero";
      }
      
      runFileButton.style.border = "2px solid red";
      runFileButton.style.backgroundColor = "#a14b4b94";

      setTimeout(() => {
        runFileButton.style.border = "";
        runFileButton.style.backgroundColor = "";
      }, 250);

      return;
    }

    runFileButton.classList.add("activo");
    runFileButton.disabled = true;

    try {
      const statusElement = document.getElementById("status");
      if (statusElement) {
        statusElement.textContent = "Iniciando juego...";
      }
      
      // Switch mods for the selected version
      switchModsForVersion(selectedVersion.number);

      // Check if we have Microsoft auth
      let authInfo;
      try {
        if (launcherIntegration.isAuthenticated()) {
          if (statusElement) {
            statusElement.textContent = "Usando autenticación de Microsoft...";
          }
          authInfo = await launcherIntegration.getMinecraftAuth();
        } else {
          // Fallback to offline mode
          if (statusElement) {
            statusElement.textContent = "Usando modo sin conexión...";
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
        }
      } catch (error) {
        console.error('Authentication error:', error);
        // Fallback to offline mode if Microsoft auth fails
        if (statusElement) {
          statusElement.textContent = "Error de autenticación, usando modo sin conexión...";
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
      }
      
      let versionConfig;
      
      if (selectedVersion.custom) {
        versionConfig = {
          number: selectedVersion.number,
          type: selectedVersion.type,
          custom: selectedVersion.custom
        };
      } else {
        versionConfig = {
          number: selectedVersion.number,
          type: selectedVersion.type
        };
      }
      
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
        root: "./minecraft",
        version: versionConfig,
        memory: {
          max: maxRam,
          min: minRam
        },
        javaPath: javaPath,
        overrides: {
          detached: true,
          stdio: 'ignore',
          ...platformOptions
        }
      };
      
      console.log('Launching with options:', JSON.stringify({
        version: opt.version,
        memory: opt.memory,
        javaPath: opt.javaPath,
        platform: process.platform
      }));
      
      const minecraftProcess = Launcher.launch(opt);

      Launcher.on('debug', (e) => {
        console.log('Launcher debug:', e);
      });
      
      Launcher.on('data', (e) => {
        console.log('Launcher data:', e);
        const statusElement = document.getElementById("status");
        if (statusElement) {
          const javaVersion = javaPath.includes('java8') ? 'Java 8' : 'Java 21';
          statusElement.textContent = `Juego iniciado - ${selectedVersion.display} (${javaVersion})`;
        }
        
        const fondoElement = document.getElementById("fondo");
        const downloadElement = document.getElementById("download-screen");
        
        if (fondoElement) fondoElement.style.display = "none";
        if (downloadElement) downloadElement.style.display = "none";
      });

      Launcher.on('download', (e) => {
        console.log('Launcher download:', e);
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
        console.log('Launcher download-status:', e);
        const statusElement = document.getElementById("status");
        if (statusElement && e.type) {
          statusElement.textContent = `Descargando ${e.type} - ${selectedVersion.display}`;
        }
      });

      Launcher.on('progress', (e) => {
        console.log('Launcher progress:', e);
      });

      Launcher.on("close", (code) => {
        console.log('Launcher closed with code:', code);
        runFileButton.classList.remove("activo");
        runFileButton.disabled = false;
        
        const statusElement = document.getElementById("status");
        if (statusElement) {
          statusElement.textContent = `Listo para jugar - ${currentUserNick}`;
        }
      });

      Launcher.on('error', (error) => {
        console.error('Launcher error:', error);
        runFileButton.classList.remove("activo");
        runFileButton.disabled = false;
        
        const statusElement = document.getElementById("status");
        if (statusElement) {
          statusElement.textContent = `Error: ${error.message || 'Error desconocido'}`;
        }
      });

    } catch (error) {
      console.error('Launch error:', error);
      runFileButton.classList.remove("activo");
      runFileButton.disabled = false;
      
      const statusElement = document.getElementById("status");
      if (statusElement) {
        statusElement.textContent = `Error al iniciar: ${error.message}`;
      }
    }
  });
  
  console.log('✅ Launch button setup complete');
}
