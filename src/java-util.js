const fs = require('fs');
const path = require('path');

class JavaUtil {
    /**
     * Get Java executable path for a specific version (java8 or java21)
     * @param {string} javaVersion - 'java8' or 'java21'
     * @returns {string} Path to Java executable
     */
    static getJavaExecutablePath(javaVersion) {
        // First check if bundled Java exists
        let bundledPath;
        if (process.resourcesPath && !process.resourcesPath.includes('node_modules')) {
            // Production - Java is bundled in resources
            bundledPath = path.join(process.resourcesPath, 'java', javaVersion);
            console.log(`[Java-Util] Production mode - Checking bundled path: ${bundledPath}`);
            console.log(`[Java-Util] Resources path: ${process.resourcesPath}`);
        } else {
            // Development - check relative path
            bundledPath = path.join(__dirname, '..', 'java', javaVersion);
            console.log(`[Java-Util] Development mode - Checking relative path: ${bundledPath}`);
        }
        
        const javaExe = process.platform === 'win32' ? 'javaw.exe' : 'java';
        const bundledJavaExecutable = path.join(bundledPath, 'bin', javaExe);
        
        console.log(`[Java-Util] Looking for Java executable: ${bundledJavaExecutable}`);
        console.log(`[Java-Util] Java executable exists: ${fs.existsSync(bundledJavaExecutable)}`);
        
        // Debug: List what's actually in the java directory
        try {
            const javaDir = path.join(process.resourcesPath || path.join(__dirname, '..'), 'java');
            if (fs.existsSync(javaDir)) {
                console.log(`[Java-Util] Contents of java directory (${javaDir}):`);
                const contents = fs.readdirSync(javaDir);
                contents.forEach(item => {
                    const itemPath = path.join(javaDir, item);
                    const isDir = fs.statSync(itemPath).isDirectory();
                    console.log(`[Java-Util]   ${isDir ? 'DIR' : 'FILE'}: ${item}`);
                });
            } else {
                console.log(`[Java-Util] Java directory does not exist: ${javaDir}`);
            }
        } catch (error) {
            console.log(`[Java-Util] Error listing java directory: ${error.message}`);
        }
        
        // If bundled Java exists, use that
        if (fs.existsSync(bundledJavaExecutable)) {
            console.log(`[Java-Util] Using bundled Java: ${bundledJavaExecutable}`);
            return bundledJavaExecutable;
        }
        
        // Fallback: throw error since we expect bundled Java
        console.log(`[Java-Util] Bundled Java ${javaVersion} not found at: ${bundledPath}`);
        throw new Error(`Bundled Java ${javaVersion} not found at: ${bundledPath}`);
    }

    /**
     * Check if a specific Java version is available
     * @param {string} javaVersion - 'java8' or 'java21'
     * @returns {boolean} True if Java is available
     */
    static isJavaAvailable(javaVersion) {
        try {
            const javaPath = JavaUtil.getJavaExecutablePath(javaVersion);
            return fs.existsSync(javaPath);
        } catch (error) {
            return false;
        }
    }

    /**
     * Get the appropriate Java version for a specific Minecraft version
     * @param {string} minecraftVersion - Minecraft version (e.g., '1.21.1')
     * @returns {string} Java version to use ('java8' or 'java21')
     */
    static getRequiredJavaVersion(minecraftVersion) {
        // Parse version string to compare
        const [major, minor, patch] = minecraftVersion.split('.').map(Number);
        
        // Minecraft 1.17+ requires Java 16+, we'll use Java 21
        // Minecraft 1.16.5 and below can use Java 8
        if (major > 1 || (major === 1 && minor >= 17)) {
            return 'java21';
        } else {
            return 'java8';
        }
    }

    /**
     * Get all available Java installations
     * @returns {Object} Object with available Java versions
     */
    static getAvailableJava() {
        return {
            java8: JavaUtil.isJavaAvailable('java8'),
            java21: JavaUtil.isJavaAvailable('java21')
        };
    }
}

module.exports = JavaUtil;
