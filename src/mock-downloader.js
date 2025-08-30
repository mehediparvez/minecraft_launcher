const fs = require('fs');
const path = require('path');

class MockAssetDownloader {
    constructor() {
        this.baseDir = path.join(require('os').tmpdir(), 'minecraft-test');
        this.javaDir = path.join(require('os').tmpdir(), 'java-test');
        this.progressCallback = null;
    }

    async checkInstallationComplete() {
        // In test mode, assume everything is already installed
        return {
            isComplete: true,
            components: {
                java8: true,
                java21: true,
                minecraftCore: true,
                fabricLoader: true
            }
        };
    }

    async downloadMissingComponents(onProgress = null) {
        this.progressCallback = onProgress;
        
        // Simulate quick download for testing
        for (let i = 0; i <= 100; i += 25) {
            this.updateProgress(i, 100, `Mock download ${i}%`);
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log('Mock download completed');
    }

    async downloadJavaRuntime(version) {
        console.log(`Mock downloading Java ${version}`);
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    async checkJavaInstalled(javaPath, version) {
        return true; // Always return true in test mode
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

    getDownloadSizeEstimates() {
        return {
            java8: 'Mock 45 MB',
            java21: 'Mock 55 MB',
            minecraftCore: 'Mock 15 MB',
            fabricLoader: 'Mock 5 MB',
            totalEstimate: 'Mock 120 MB'
        };
    }
}

module.exports = MockAssetDownloader;
