/**
 * Launcher Integration Module
 * Provides methods to integrate Microsoft authentication with the Minecraft launcher
 */

const minecraftAuth = require('./minecraftAuth');
const { ipcRenderer } = require('electron');

class LauncherIntegration {
    constructor() {
        this.currentUser = null;
    }

    /**
     * Get Minecraft auth for launcher
     * Returns the format needed for Minecraft-Launcher-Core
     */
    async getMinecraftAuth() {
        if (!minecraftAuth.isAuthenticated()) {
            throw new Error('Not authenticated with Microsoft. Please log in first.');
        }

        try {
            const profile = await ipcRenderer.invoke('minecraft:getProfile');
            
            if (!profile.success) {
                throw new Error(profile.error || 'Failed to get Minecraft profile');
            }

            this.currentUser = profile.profile;

            return {
                access_token: minecraftAuth.getMinecraftToken(),
                client_token: null, // Not used with Microsoft auth
                uuid: profile.profile.id,
                name: profile.profile.name,
                user_properties: {},
                meta: {
                    type: 'msa', // Microsoft Account
                    demo: false
                }
            };
        } catch (error) {
            console.error('Error getting Minecraft auth:', error);
            throw error;
        }
    }

    /**
     * Get offline auth for launcher (fallback)
     */
    getOfflineAuth(username) {
        // Generate a deterministic UUID based on the username
        const generateUUID = (username) => {
            let uuid = '';
            for (let i = 0; i < 32; i++) {
                if (i === 8 || i === 12 || i === 16 || i === 20) {
                    uuid += '-';
                }
                const char = Math.floor(username.charCodeAt(i % username.length) % 16).toString(16);
                uuid += char;
            }
            return uuid;
        };

        const uuid = generateUUID(username);

        return {
            access_token: 'offline',
            client_token: null,
            uuid: uuid,
            name: username,
            user_properties: {},
            meta: {
                type: 'offline',
                demo: false
            }
        };
    }

    /**
     * Check if the user is authenticated
     */
    isAuthenticated() {
        return minecraftAuth.isAuthenticated();
    }

    /**
     * Get the current user profile
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Initialize the authentication module
     */
    async init() {
        try {
            const profile = await ipcRenderer.invoke('minecraft:loadSavedCredentials');
            if (profile && profile.success) {
                this.currentUser = profile.profile;
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to initialize auth:', error);
            return false;
        }
    }
}

module.exports = new LauncherIntegration();
