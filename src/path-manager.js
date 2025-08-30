const { app } = require('electron');
const path = require('path');
const fs = require('fs');

class PathManager {
    constructor() {
        // Get user data directory (outside of app directory)
        this.userDataDir = app.getPath('userData');
        
        // Define all paths relative to user data directory
        this.paths = {
            // Main Minecraft directory in user data
            minecraft: path.join(this.userDataDir, 'minecraft'),
            
            // Java installations
            java: path.join(this.userDataDir, 'java'),
            
            // Minecraft subdirectories
            mods: path.join(this.userDataDir, 'minecraft', 'mods'),
            versions: path.join(this.userDataDir, 'minecraft', 'versions'),
            assets: path.join(this.userDataDir, 'minecraft', 'assets'),
            saves: path.join(this.userDataDir, 'minecraft', 'saves'),
            resourcepacks: path.join(this.userDataDir, 'minecraft', 'resourcepacks'),
            logs: path.join(this.userDataDir, 'minecraft', 'logs'),
            downloads: path.join(this.userDataDir, 'minecraft', 'downloads'),
            
            // Config files
            launcherConfig: path.join(this.userDataDir, 'minecraft', 'launcher_config.json'),
            
            // Source/bundled files (read-only)
            bundledMinecraft: path.join(__dirname, '..', 'minecraft'),
            bundledLauncherConfig: path.join(__dirname, '..', 'minecraft', 'launcher_config.json'),
            bundledLog4j: path.join(__dirname, '..', 'minecraft', 'log4j2_17-111.xml'),
            bundledTroubleshooting: path.join(__dirname, '..', 'minecraft', 'troubleshooting.txt')
        };
    }

    // Get a specific path
    get(pathName) {
        return this.paths[pathName] || null;
    }

    // Get all paths
    getAll() {
        return { ...this.paths };
    }

    // Ensure directories exist
    async ensureDirectories() {
        const dirsToCreate = [
            this.paths.minecraft,
            this.paths.java,
            this.paths.mods,
            this.paths.versions,
            this.paths.assets,
            this.paths.saves,
            this.paths.resourcepacks,
            this.paths.logs,
            this.paths.downloads
        ];

        for (const dir of dirsToCreate) {
            try {
                await fs.promises.mkdir(dir, { recursive: true });
            } catch (error) {
                console.error(`Failed to create directory ${dir}:`, error);
            }
        }
    }

    // Copy essential files from bundled to user data directory
    async copyEssentialFiles() {
        const filesToCopy = [
            {
                src: this.paths.bundledLauncherConfig,
                dest: this.paths.launcherConfig
            },
            {
                src: this.paths.bundledLog4j,
                dest: path.join(this.paths.minecraft, 'log4j2_17-111.xml')
            },
            {
                src: this.paths.bundledTroubleshooting,
                dest: path.join(this.paths.minecraft, 'troubleshooting.txt')
            }
        ];

        for (const file of filesToCopy) {
            try {
                // Only copy if source exists and destination doesn't exist
                if (fs.existsSync(file.src) && !fs.existsSync(file.dest)) {
                    await fs.promises.copyFile(file.src, file.dest);
                    console.log(`Copied ${path.basename(file.src)} to user data directory`);
                }
            } catch (error) {
                console.error(`Failed to copy ${file.src}:`, error);
            }
        }
    }

    // Initialize paths and copy essential files
    async initialize() {
        await this.ensureDirectories();
        await this.copyEssentialFiles();
    }

    // Get version-specific mods directory
    getVersionModsPath(version) {
        return path.join(this.paths.mods, version);
    }

    // Get user data directory
    getUserDataDir() {
        return this.userDataDir;
    }

    // Check if we're in development mode
    isDevelopment() {
        return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'testing';
    }

    // Get log with info about paths
    getPathInfo() {
        return {
            userDataDir: this.userDataDir,
            minecraftDir: this.paths.minecraft,
            javaDir: this.paths.java,
            isDevelopment: this.isDevelopment()
        };
    }
}

// Create singleton instance
const pathManager = new PathManager();

module.exports = pathManager;
