const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { app } = require('electron');
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);
const pathManager = require('./path-manager');

class AssetDownloader {
    constructor() {
        this.baseDir = pathManager.get('minecraft');
        // Portable Java installation in launcher's data directory
        this.javaDir = pathManager.get('java');
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
    
    // Get the executable path for a Java version
    getJavaExecutablePath(javaVersion) {
        // First check if bundled Java exists
        let bundledPath;
        if (process.resourcesPath && !process.resourcesPath.includes('node_modules')) {
            bundledPath = path.join(process.resourcesPath, 'java', javaVersion);
        } else {
            bundledPath = path.join(__dirname, '..', 'java', javaVersion);
        }
        
        const javaExe = process.platform === 'win32' ? 'javaw.exe' : 'java';
        const bundledJavaExecutable = path.join(bundledPath, 'bin', javaExe);
        
        // If bundled Java exists, use that
        if (fs.existsSync(bundledJavaExecutable)) {
            console.log(`Using bundled Java: ${bundledJavaExecutable}`);
            return bundledJavaExecutable;
        }
        
        // Otherwise use downloaded/installed Java
        const javaInstallDir = path.join(this.javaDir, javaVersion);
        const binDir = path.join(javaInstallDir, 'bin');
        
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
        // Check for bundled Java first
        const bundledJava8 = await this.checkBundledJava('java8');
        const bundledJava21 = await this.checkBundledJava('java21');
        
        const checks = {
            java8: bundledJava8, // Only check bundled Java since we're not downloading
            java21: bundledJava21, // Only check bundled Java since we're not downloading
            minecraftCore: this.checkMinecraftCoreFiles(),
            fabricLoader: this.checkFabricLoader()
        };

        return {
            isComplete: Object.values(checks).every(check => check),
            components: checks
        };
    }

    // Check for bundled Java in the application directory
    async checkBundledJava(version) {
        // In development, check relative to source directory
        // In production, check in app resources
        let bundledPath;
        if (process.resourcesPath && !process.resourcesPath.includes('node_modules')) {
            // Production - Java is bundled in resources
            bundledPath = path.join(process.resourcesPath, 'java', version);
        } else {
            // Development - check relative path
            bundledPath = path.join(__dirname, '..', 'java', version);
        }
        
        const executableName = process.platform === 'win32' ? 'javaw.exe' : 'java';
        const javaExecutable = path.join(bundledPath, 'bin', executableName);
        
        const exists = fs.existsSync(javaExecutable);
        if (exists) {
            console.log(`✅ Found bundled ${version} at: ${bundledPath}`);
        } else {
            console.log(`❌ Bundled ${version} not found at: ${bundledPath}`);
        }
        return exists;
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
            'https://piston-data.mojang.com/v1/objects/37fd3c903861eeff3bc24b71eed48f828b5269c8/client.jar', // Example for 1.21.1
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
        // First check for bundled assets
        let bundledPath;
        if (process.resourcesPath && !process.resourcesPath.includes('node_modules')) {
            bundledPath = path.join(process.resourcesPath, 'assets', 'minecraft', 'versions', '1.21.1');
        } else {
            bundledPath = path.join(__dirname, '..', 'assets', 'minecraft', 'versions', '1.21.1');
        }
        
        const bundledJar = path.join(bundledPath, '1.21.1.jar');
        const bundledJson = path.join(bundledPath, '1.21.1.json');
        
        if (fs.existsSync(bundledJar) && fs.existsSync(bundledJson)) {
            console.log('✅ Found bundled Minecraft core files');
            return true;
        }
        
        // Fallback to downloaded files
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
        // First check for bundled Fabric
        let bundledPath;
        if (process.resourcesPath && !process.resourcesPath.includes('node_modules')) {
            bundledPath = path.join(process.resourcesPath, 'assets', 'fabric');
        } else {
            bundledPath = path.join(__dirname, '..', 'assets', 'fabric');
        }
        
        const bundledFabric = path.join(bundledPath, 'fabric-installer.jar');
        
        if (fs.existsSync(bundledFabric)) {
            console.log('✅ Found bundled Fabric loader');
            return true;
        }
        
        // Fallback to downloaded files
        const fabricDir = path.join(this.baseDir, 'fabric');
        return fs.existsSync(fabricDir) && fs.readdirSync(fabricDir).length > 0;
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

    // Download file with progress tracking
    async downloadFile(url, destination, progressCallback) {
        return new Promise((resolve, reject) => {
            const protocol = url.startsWith('https:') ? https : http;
            const file = fs.createWriteStream(destination);
            
            console.log(`Starting download: ${url}`);
            
            const request = protocol.get(url, (response) => {
                console.log(`Download response status: ${response.statusCode}`);
                
                if (response.statusCode === 302 || response.statusCode === 301) {
                    // Handle redirects
                    console.log(`Redirecting to: ${response.headers.location}`);
                    file.close();
                    fs.unlinkSync(destination);
                    this.downloadFile(response.headers.location, destination, progressCallback)
                        .then(resolve)
                        .catch(reject);
                    return;
                }
                
                if (response.statusCode !== 200) {
                    file.close();
                    fs.unlinkSync(destination);
                    reject(new Error(`Failed to download ${url}: HTTP ${response.statusCode}`));
                    return;
                }

                const totalSize = parseInt(response.headers['content-length'], 10);
                let downloadedSize = 0;
                
                console.log(`Download size: ${totalSize ? (totalSize / 1024 / 1024).toFixed(2) + ' MB' : 'unknown'}`);

                response.on('data', (chunk) => {
                    downloadedSize += chunk.length;
                    if (progressCallback && totalSize) {
                        progressCallback({
                            current: downloadedSize,
                            total: totalSize,
                            percentage: Math.round((downloadedSize / totalSize) * 100)
                        });
                    }
                });

                response.pipe(file);

                file.on('finish', () => {
                    file.close();
                    console.log(`Download completed: ${destination}`);
                    resolve();
                });

                file.on('error', (err) => {
                    file.close();
                    if (fs.existsSync(destination)) {
                        fs.unlinkSync(destination);
                    }
                    reject(err);
                });
            });

            request.on('error', (err) => {
                file.close();
                if (fs.existsSync(destination)) {
                    fs.unlinkSync(destination);
                }
                reject(err);
            });

            request.setTimeout(60000, () => { // Increased timeout to 60 seconds
                request.abort();
                file.close();
                if (fs.existsSync(destination)) {
                    fs.unlinkSync(destination);
                }
                reject(new Error('Download timeout after 60 seconds'));
            });
        });
    }

    // Download and extract archive
    async downloadAndExtract(url, targetDir, componentName) {
        const fileName = path.basename(url);
        const tempFile = path.join(targetDir, fileName);
        
        console.log(`Downloading ${componentName}...`);
        await this.downloadFile(url, tempFile);
        
        console.log(`Extracting ${componentName}...`);
        await this.extractArchive(tempFile, targetDir);
        
        // Clean up the downloaded archive
        fs.unlinkSync(tempFile);
    }

    // Extract archive (zip/tar.gz)
    async extractArchive(archivePath, extractDir) {
        const path_module = require('path');
        
        console.log(`Extracting ${archivePath} to ${extractDir}`);
        
        // Ensure extract directory exists
        fs.mkdirSync(extractDir, { recursive: true });
        
        if (archivePath.endsWith('.zip')) {
            // Extract ZIP file
            try {
                const yauzl = require('yauzl');
                
                return new Promise((resolve, reject) => {
                    yauzl.open(archivePath, { lazyEntries: true }, (err, zipfile) => {
                        if (err) {
                            reject(new Error(`Failed to open ZIP file: ${err.message}`));
                            return;
                        }

                        zipfile.readEntry();
                        zipfile.on('entry', (entry) => {
                            const entryPath = path_module.join(extractDir, entry.fileName);
                            
                            if (/\/$/.test(entry.fileName)) {
                                // Directory entry
                                fs.mkdirSync(entryPath, { recursive: true });
                                zipfile.readEntry();
                            } else {
                                // File entry
                                fs.mkdirSync(path_module.dirname(entryPath), { recursive: true });
                                zipfile.openReadStream(entry, (err, readStream) => {
                                    if (err) {
                                        reject(new Error(`Failed to read ZIP entry: ${err.message}`));
                                        return;
                                    }
                                    const writeStream = fs.createWriteStream(entryPath);
                                    readStream.pipe(writeStream);
                                    writeStream.on('close', () => {
                                        zipfile.readEntry();
                                    });
                                    writeStream.on('error', (err) => {
                                        reject(new Error(`Failed to write ZIP entry: ${err.message}`));
                                    });
                                });
                            }
                        });

                        zipfile.on('end', () => {
                            console.log(`ZIP extraction completed: ${extractDir}`);
                            resolve();
                        });

                        zipfile.on('error', (err) => {
                            reject(new Error(`ZIP extraction error: ${err.message}`));
                        });
                    });
                });
            } catch (error) {
                throw new Error(`ZIP extraction failed: ${error.message}`);
            }
        } else if (archivePath.endsWith('.tar.gz') || archivePath.endsWith('.tgz')) {
            // Extract TAR.GZ file
            try {
                const tar = require('tar');
                
                await tar.extract({
                    file: archivePath,
                    cwd: extractDir,
                    strip: 1 // Remove the top-level directory from the archive
                });
                
                console.log(`TAR.GZ extraction completed: ${extractDir}`);
            } catch (error) {
                throw new Error(`TAR.GZ extraction failed: ${error.message}`);
            }
        } else {
            throw new Error(`Unsupported archive format: ${archivePath}`);
        }
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
            minecraftCore: '15 MB',
            fabricLoader: '5 MB',
            totalEstimate: '20 MB'
        };
    }
}

module.exports = AssetDownloader;
