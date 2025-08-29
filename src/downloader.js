const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { app } = require('electron');
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);

class AssetDownloader {
    constructor() {
        this.baseDir = path.join(app.getPath('userData'), 'minecraft');
        // Portable Java installation in launcher's data directory
        this.javaDir = path.join(app.getPath('userData'), 'java');
        this.downloadQueue = [];
        this.isDownloading = false;
        this.progressCallback = null;
        this.totalDownloadSize = 0;
        this.downloadedSize = 0;
    }

    // Check if we have the right Java version for Minecraft version
    async checkJavaForVersion(minecraftVersion) {
        const requiredJava = this.getRequiredJavaVersion(minecraftVersion);
        const javaPath = path.join(this.javaDir, requiredJava, 'bin');
        const javaExe = process.platform === 'win32' ? 'javaw.exe' : 'java';
        const fullJavaPath = path.join(javaPath, javaExe);
        
        return fs.existsSync(fullJavaPath);
    }
    
    // Determine required Java version based on Minecraft version
    getRequiredJavaVersion(minecraftVersion) {
        // Parse version number
        const versionNum = parseFloat(minecraftVersion.replace(/[^\d.]/g, ''));
        
        if (versionNum >= 1.21) return 'java21';
        if (versionNum >= 1.17) return 'java17';
        return 'java8';
    }

    // Essential files that should be included in minimal installer
    getEssentialFiles() {
        return [
            'launcher_config.json',
            'log4j2_17-111.xml',
            'troubleshooting.txt'
        ];
    }

    // Java download URLs by platform and version
    getJavaDownloadUrls() {
        const platform = process.platform;
        const arch = process.arch === 'x64' ? 'x64' : 'x86';
        
        // Use portable Java distributions that don't require installation
        const urls = {
            win32: {
                java8: `https://github.com/adoptium/temurin8-binaries/releases/download/jdk8u392-b08/OpenJDK8U-jre_x64_windows_hotspot_8u392b08.zip`,
                java17: `https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.9%2B9/OpenJDK17U-jre_x64_windows_hotspot_17.0.9_9.zip`,
                java21: `https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.1%2B12/OpenJDK21U-jre_x64_windows_hotspot_21.0.1_12.zip`
            },
            linux: {
                java8: `https://github.com/adoptium/temurin8-binaries/releases/download/jdk8u392-b08/OpenJDK8U-jre_x64_linux_hotspot_8u392b08.tar.gz`,
                java17: `https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.9%2B9/OpenJDK17U-jre_x64_linux_hotspot_17.0.9_9.tar.gz`,
                java21: `https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.1%2B12/OpenJDK21U-jre_x64_linux_hotspot_21.0.1_12.tar.gz`
            },
            darwin: {
                java8: `https://github.com/adoptium/temurin8-binaries/releases/download/jdk8u392-b08/OpenJDK8U-jre_x64_mac_hotspot_8u392b08.tar.gz`,
                java17: `https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.9%2B9/OpenJDK17U-jre_x64_mac_hotspot_17.0.9_9.tar.gz`,
                java21: `https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.1%2B12/OpenJDK21U-jre_x64_mac_hotspot_21.0.1_12.tar.gz`
            }
        };
        
        return urls[platform] || urls.linux;
    }

    // Download and extract portable Java
    async downloadJavaVersion(javaVersion, progressCallback) {
        const urls = this.getJavaDownloadUrls();
        const downloadUrl = urls[javaVersion];
        
        if (!downloadUrl) {
            throw new Error(`Java ${javaVersion} not available for platform ${process.platform}`);
        }
        
        const javaInstallDir = path.join(this.javaDir, javaVersion);
        fs.mkdirSync(javaInstallDir, { recursive: true });
        
        const fileName = path.basename(downloadUrl);
        const downloadPath = path.join(javaInstallDir, fileName);
        
        // Download Java archive
        progressCallback?.({ 
            current: 0, 
            total: 100, 
            currentFile: `Downloading ${javaVersion}...`,
            speed: 'Initializing...' 
        });
        
        await this.downloadFile(downloadUrl, downloadPath, (progress) => {
            progressCallback?.({
                current: progress.current,
                total: progress.total,
                currentFile: `${javaVersion} (${Math.round(progress.current / 1024 / 1024)}MB)`,
                speed: progress.speed
            });
        });
        
        // Extract archive
        progressCallback?.({ 
            current: 90, 
            total: 100, 
            currentFile: `Extracting ${javaVersion}...`,
            speed: 'Extracting...' 
        });
        
        await this.extractArchive(downloadPath, javaInstallDir);
        
        // Clean up downloaded archive
        fs.unlinkSync(downloadPath);
        
        progressCallback?.({ 
            current: 100, 
            total: 100, 
            currentFile: `${javaVersion} installed`,
            speed: 'Complete' 
        });
        
        return this.getJavaExecutablePath(javaVersion);
    }
    
    // Extract downloaded archive (zip/tar.gz)
    async extractArchive(archivePath, extractDir) {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        try {
            if (archivePath.endsWith('.zip')) {
                // Windows ZIP extraction
                if (process.platform === 'win32') {
                    await execAsync(`powershell Expand-Archive -Path "${archivePath}" -DestinationPath "${extractDir}" -Force`);
                } else {
                    await execAsync(`unzip -q "${archivePath}" -d "${extractDir}"`);
                }
            } else if (archivePath.endsWith('.tar.gz')) {
                // Linux/macOS tar.gz extraction
                await execAsync(`tar -xzf "${archivePath}" -C "${extractDir}" --strip-components=1`);
            }
        } catch (error) {
            throw new Error(`Failed to extract ${archivePath}: ${error.message}`);
        }
    }
    
    // Get the executable path for a Java version
    getJavaExecutablePath(javaVersion) {
        const javaInstallDir = path.join(this.javaDir, javaVersion);
        const binDir = path.join(javaInstallDir, 'bin');
        const javaExe = process.platform === 'win32' ? 'javaw.exe' : 'java';
        
        return path.join(binDir, javaExe);
    }
    
    // Check system Java and portable Java installations
    async detectAvailableJava() {
        const javaVersions = [];
        
        // Check system Java
        try {
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);
            
            const { stdout } = await execAsync('java -version 2>&1');
            const systemJava = {
                type: 'system',
                version: stdout.trim(),
                path: 'java'
            };
            javaVersions.push(systemJava);
        } catch (e) {
            // System Java not available
        }
        
        // Check portable Java installations
        if (fs.existsSync(this.javaDir)) {
            const installedVersions = fs.readdirSync(this.javaDir);
            for (const version of installedVersions) {
                const javaExe = this.getJavaExecutablePath(version);
                if (fs.existsSync(javaExe)) {
                    javaVersions.push({
                        type: 'portable',
                        version: version,
                        path: javaExe
                    });
                }
            }
        }
        
        return javaVersions;
    }

    // Check if essential components are downloaded
    async checkInstallationComplete() {
        const checks = {
            java8: await this.checkJavaInstalled(path.join(this.javaDir, 'java8'), '8'),
            java21: await this.checkJavaInstalled(path.join(this.javaDir, 'java21'), '21'),
            minecraftCore: this.checkMinecraftCoreFiles(),
            fabricLoader: this.checkFabricLoader()
        };

        return {
            isComplete: Object.values(checks).every(check => check),
            components: checks
        };
    }

    // Download all missing components
    async downloadMissingComponents(onProgress = null) {
        this.progressCallback = onProgress;
        const status = await this.checkInstallationComplete();
        
        if (status.isComplete) {
            console.log('All components already installed');
            return;
        }

        console.log('Starting download of missing components...');
        
        const downloads = [];
        
        // Queue Java downloads
        if (!status.components.java8) {
            downloads.push(() => this.downloadJavaRuntime('8'));
        }
        if (!status.components.java21) {
            downloads.push(() => this.downloadJavaRuntime('21'));
        }

        // Queue Minecraft core files
        if (!status.components.minecraftCore) {
            downloads.push(() => this.downloadMinecraftCoreFiles());
        }

        // Queue Fabric loader
        if (!status.components.fabricLoader) {
            downloads.push(() => this.downloadFabricLoader());
        }

        // Execute downloads with progress tracking
        for (let i = 0; i < downloads.length; i++) {
            this.updateProgress(i, downloads.length, `Downloading component ${i + 1} of ${downloads.length}`);
            await downloads[i]();
        }

        this.updateProgress(downloads.length, downloads.length, 'All downloads completed');
        console.log('All missing components downloaded successfully');
    }

    // Download Java runtime based on platform
    async downloadJavaRuntime(version = '21', platform = process.platform) {
        const javaUrls = {
            'win32': {
                '8': 'https://github.com/adoptium/temurin8-binaries/releases/download/jdk8u392-b08/OpenJDK8U-jre_x64_windows_hotspot_8u392b08.zip',
                '21': 'https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.1%2B12/OpenJDK21U-jre_x64_windows_hotspot_21.0.1_12.zip'
            },
            'linux': {
                '8': 'https://github.com/adoptium/temurin8-binaries/releases/download/jdk8u392-b08/OpenJDK8U-jre_x64_linux_hotspot_8u392b08.tar.gz',
                '21': 'https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.1%2B12/OpenJDK21U-jre_x64_linux_hotspot_21.0.1_12.tar.gz'
            },
            'darwin': {
                '8': 'https://github.com/adoptium/temurin8-binaries/releases/download/jdk8u392-b08/OpenJDK8U-jre_x64_mac_hotspot_8u392b08.tar.gz',
                '21': 'https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.1%2B12/OpenJDK21U-jre_x64_mac_hotspot_21.0.1_12.tar.gz'
            }
        };

        const url = javaUrls[platform]?.[version];
        if (!url) {
            throw new Error(`Java ${version} not available for platform ${platform}`);
        }

        const targetDir = path.join(this.javaDir, `java${version}`);
        
        if (await this.checkJavaInstalled(targetDir, version)) {
            console.log(`Java ${version} already installed`);
            return targetDir;
        }

        console.log(`Downloading Java ${version} for ${platform}...`);
        await this.downloadAndExtract(url, targetDir, `Java ${version}`);
        return targetDir;
    }

    async checkJavaInstalled(javaPath, version) {
        try {
            const executableName = process.platform === 'win32' ? 'java.exe' : 'java';
            let javaBin;
            
            // Check different possible Java installation structures
            const possiblePaths = [
                path.join(javaPath, 'bin', executableName),
                path.join(javaPath, 'jre', 'bin', executableName),
                path.join(javaPath, `jdk-${version}`, 'bin', executableName)
            ];

            for (const possiblePath of possiblePaths) {
                if (fs.existsSync(possiblePath)) {
                    return true;
                }
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    async downloadAndExtract(url, targetDir, componentName) {
        return new Promise((resolve, reject) => {
            // Ensure target directory exists
            fs.mkdirSync(targetDir, { recursive: true });
            
            const fileName = path.basename(url);
            const tempFile = path.join(targetDir, fileName);
            
            this.updateProgress(0, 100, `Downloading ${componentName}...`);
            
            const protocol = url.startsWith('https:') ? https : http;
            
            protocol.get(url, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`Failed to download ${componentName}: ${response.statusCode}`));
                    return;
                }
                
                const totalSize = parseInt(response.headers['content-length'], 10);
                let downloadedSize = 0;
                
                const writeStream = fs.createWriteStream(tempFile);
                
                response.on('data', (chunk) => {
                    downloadedSize += chunk.length;
                    const progress = Math.round((downloadedSize / totalSize) * 100);
                    this.updateProgress(progress, 100, `Downloading ${componentName}... ${progress}%`);
                });
                
                response.pipe(writeStream);
                
                writeStream.on('finish', async () => {
                    try {
                        this.updateProgress(100, 100, `Extracting ${componentName}...`);
                        await this.extractArchive(tempFile, targetDir);
                        
                        // Clean up downloaded archive
                        fs.unlinkSync(tempFile);
                        
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                });
                
                writeStream.on('error', reject);
            }).on('error', reject);
        });
    }

    async extractArchive(archivePath, targetDir) {
        const { spawn } = require('child_process');
        
        return new Promise((resolve, reject) => {
            let extractCmd, extractArgs;
            
            if (archivePath.endsWith('.zip')) {
                // Use built-in Node.js for ZIP extraction or external unzip
                if (process.platform === 'win32') {
                    // Use PowerShell on Windows
                    extractCmd = 'powershell';
                    extractArgs = ['-Command', `Expand-Archive -Path "${archivePath}" -DestinationPath "${targetDir}" -Force`];
                } else {
                    extractCmd = 'unzip';
                    extractArgs = ['-o', archivePath, '-d', targetDir];
                }
            } else if (archivePath.endsWith('.tar.gz')) {
                extractCmd = 'tar';
                extractArgs = ['-xzf', archivePath, '-C', targetDir];
            } else {
                reject(new Error(`Unsupported archive format: ${archivePath}`));
                return;
            }
            
            const process = spawn(extractCmd, extractArgs);
            
            process.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Extraction failed with code ${code}`));
                }
            });
            
            process.on('error', reject);
        });
    }

    // Download essential Minecraft files
    async downloadMinecraftCoreFiles() {
        console.log('Downloading Minecraft core files...');
        
        const coreFiles = [
            'https://launcher.mojang.com/v1/objects/37fd3c903861eeff3bc24b71eed48f828b5269c8/client.jar', // Example for 1.21.1
            'https://piston-meta.mojang.com/v1/packages/177e49d3233cb6eac42f0495c0a48e719870c2ae/1.21.1.json'
        ];

        const versionsDir = path.join(this.baseDir, 'versions', '1.21.1');
        fs.mkdirSync(versionsDir, { recursive: true });

        // This would contain actual Minecraft version manifest parsing and downloading
        this.updateProgress(50, 100, 'Downloading Minecraft core files...');
        
        // Placeholder for actual implementation
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    checkMinecraftCoreFiles() {
        const versionsDir = path.join(this.baseDir, 'versions');
        return fs.existsSync(versionsDir) && fs.readdirSync(versionsDir).length > 0;
    }

    async downloadFabricLoader() {
        console.log('Downloading Fabric loader...');
        
        const fabricUrl = 'https://maven.fabricmc.net/net/fabricmc/fabric-installer/0.11.2/fabric-installer-0.11.2.jar';
        const fabricDir = path.join(this.baseDir, 'fabric');
        
        fs.mkdirSync(fabricDir, { recursive: true });
        
        this.updateProgress(75, 100, 'Downloading Fabric loader...');
        
        // Placeholder for actual Fabric installation
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    checkFabricLoader() {
        const fabricDir = path.join(this.baseDir, 'fabric');
        return fs.existsSync(fabricDir);
    }

    // Download essential Minecraft files only when needed
    async downloadMinecraftAssets(version) {
        const assetsDir = path.join(this.baseDir, 'assets');
        const versionsDir = path.join(this.baseDir, 'versions', version);
        
        // Only download what's absolutely necessary
        const essentialFiles = [
            `versions/${version}/${version}.json`,
            `versions/${version}/${version}.jar`
        ];

        for (const file of essentialFiles) {
            const filePath = path.join(this.baseDir, file);
            if (!fs.existsSync(filePath)) {
                await this.downloadMinecraftFile(file, filePath);
            }
        }
    }

    async downloadMinecraftFile(relativePath, targetPath) {
        // Implementation for downloading specific Minecraft files
        console.log(`Downloading ${relativePath} to ${targetPath}`);
    }

    // Progress tracking for downloads
    onProgress(callback) {
        this.progressCallback = callback;
    }

    updateProgress(current, total, filename) {
        if (this.progressCallback) {
            this.progressCallback({
                current,
                total,
                percentage: Math.round((current / total) * 100),
                filename
            });
        }
    }

    // Get download size estimates for user information
    getDownloadSizeEstimates() {
        return {
            java8: '45 MB',
            java21: '55 MB',
            minecraftCore: '15 MB',
            fabricLoader: '5 MB',
            totalEstimate: '120 MB'
        };
    }
}

module.exports = AssetDownloader;
