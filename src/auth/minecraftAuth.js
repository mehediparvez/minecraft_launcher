/**
 * Microsoft Authentication Module for Void Client
 * Handles the OAuth2 flow and token acquisition for Minecraft authentication
 */

const { PublicClientApplication } = require('@azure/msal-node');
const fetch = require('node-fetch');
const keytar = require('keytar');
const { msalConfig, loginRequest, xboxLiveConfig } = require('./config');
const { ipcMain, BrowserWindow } = require('electron');
const path = require('path');

// Service name for keytar credential storage
const SERVICE_NAME = 'VoidClientMinecraft';
const ACCOUNT_NAME = 'MinecraftAccount';

class MinecraftAuthProvider {
    constructor() {
        this.msalClient = new PublicClientApplication(msalConfig);
        this.account = null;
        this.minecraftTokenData = null;
        this.debugMode = false;
    }

    /**
     * Initialize authentication and register IPC handlers
     */
    init() {
        this.registerIpcHandlers();
        
        // Check for debug flag in environment or command line args
        const isDebug = process.env.DEBUG_MODE === 'true' || 
                       process.argv.includes('--debug');
        
        if (isDebug) {
            console.log('🔍 DEBUG MODE ENABLED');
            this.debugMode = true;
        }
        
        return this.loadSavedCredentials();
    }

    /**
     * Register IPC handlers for renderer process communication
     */
    registerIpcHandlers() {
        ipcMain.handle('minecraft:login', async () => {
            try {
                const result = await this.login();
                return { success: true, profile: result };
            } catch (error) {
                console.error('Authentication error:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('minecraft:logout', async () => {
            try {
                await this.logout();
                return { success: true };
            } catch (error) {
                console.error('Logout error:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('minecraft:getProfile', async () => {
            try {
                if (!this.minecraftTokenData) {
                    throw new Error('Not authenticated');
                }
                const profile = await this.getMinecraftProfile();
                return { success: true, profile };
            } catch (error) {
                console.error('Get profile error:', error);
                return { success: false, error: error.message };
            }
        });
        
        // Debug-specific handlers
        ipcMain.handle('minecraft:debug:getStatus', async () => {
            return {
                isAuthenticated: this.isAuthenticated(),
                debugMode: this.debugMode,
                authProvider: 'Microsoft',
                account: this.account ? {
                    username: this.account.username,
                    environment: this.account.environment,
                    homeAccountId: this.account.homeAccountId,
                } : null,
                hasToken: !!this.minecraftTokenData,
                tokenExpiry: this.minecraftTokenData ? new Date(Date.now() + this.minecraftTokenData.expires_in * 1000).toISOString() : null
            };
        });
        
        ipcMain.handle('minecraft:debug:testAuth', async () => {
            try {
                if (this.debugMode) {
                    // In debug mode, allow viewing the token (limited info)
                    const tokenInfo = this.minecraftTokenData ? {
                        token_type: this.minecraftTokenData.token_type,
                        expires_in: this.minecraftTokenData.expires_in,
                        issued_at: this.minecraftTokenData.issued_at
                    } : null;
                    
                    return {
                        success: true,
                        authenticated: this.isAuthenticated(),
                        tokenInfo
                    };
                } else {
                    return {
                        success: true,
                        authenticated: this.isAuthenticated()
                    };
                }
            } catch (error) {
                return { success: false, error: error.message };
            }
        });
    }

    /**
     * Create captcha verification window
     */
    createCaptchaWindow() {
        return new Promise((resolve, reject) => {
            console.log("Creating captcha verification window...");
            
            const path = require('path');
            const iconPath = path.resolve(__dirname, '..', 'windows', 'aimg', 'icon-256.png');
            console.log('Captcha window using icon path:', iconPath);
            
            const captchaWindow = new BrowserWindow({
                width: 500,
                height: 650,
                show: true,
                center: true,
                resizable: false,
                webPreferences: {
                    nodeIntegration: true,
                    contextIsolation: false,
                    enableRemoteModule: false
                },
                autoHideMenuBar: true,
                title: "Security Verification - Void Client",
                frame: false,
                alwaysOnTop: true,
                icon: iconPath
            });
            captchaWindow.loadFile(path.join(__dirname, '..', 'windows', 'captcha.html'));

            // Handle captcha verification result
            const { ipcMain } = require('electron');
            
            const captchaHandler = (event, isVerified) => {
                captchaWindow.removeAllListeners('closed');
                captchaWindow.destroy();
                ipcMain.removeListener('captcha:verified', captchaHandler);
                
                if (isVerified) {
                    console.log("Captcha verification successful");
                    resolve(true);
                } else {
                    console.log("Captcha verification failed");
                    reject(new Error('Captcha verification failed'));
                }
            };

            ipcMain.on('captcha:verified', captchaHandler);

            captchaWindow.on('closed', () => {
                console.log("Captcha window was closed by user");
                ipcMain.removeListener('captcha:verified', captchaHandler);
                reject(new Error('Captcha verification cancelled'));
            });

            captchaWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
                console.log("Captcha window failed to load:", errorCode, errorDescription);
                ipcMain.removeListener('captcha:verified', captchaHandler);
                reject(new Error(`Captcha window failed to load: ${errorDescription}`));
            });
        });
    }

    /**
     * Create authentication window for Microsoft login
     */
    createAuthWindow() {
        return new Promise(async (resolve, reject) => {
            const authCodeUrlParameters = {
                ...loginRequest,
                redirectUri: msalConfig.auth.redirectUri,
                prompt: 'select_account'
            };

            console.log("Starting Microsoft authentication...");
            
            try {
                const authCodeUrl = await this.msalClient.getAuthCodeUrl(authCodeUrlParameters);
                
                const iconPath = path.resolve(__dirname, '..', 'windows', 'aimg', 'icon-256.png');
                console.log('Auth window using icon path:', iconPath);
                
                const authWindow = new BrowserWindow({
                    width: 1024,
                    height: 768,
                    show: true,
                    center: true,
                    webPreferences: {
                        nodeIntegration: false,
                        contextIsolation: true,
                        enableRemoteModule: false
                    },
                    autoHideMenuBar: true,
                    title: "Microsoft Authentication - Void Client",
                    icon: iconPath
                });
                
                console.log("Auth window created, loading URL:", authCodeUrl);

                // Monitor all URL changes
                authWindow.webContents.on('did-navigate', (event, url) => {
                    console.log("Navigation detected to:", url);
                    checkForAuthCode(url);
                });

                authWindow.webContents.on('will-redirect', (event, url) => {
                    console.log("Redirect detected to:", url);
                    checkForAuthCode(url);
                });

                authWindow.webContents.on('will-navigate', (event, url) => {
                    console.log("Will navigate to:", url);
                    checkForAuthCode(url);
                });

                // Helper function to check for auth code
                const checkForAuthCode = (url) => {
                    try {
                        if (url && url.startsWith(msalConfig.auth.redirectUri)) {
                            const parsedUrl = new URL(url);
                            const code = parsedUrl.searchParams.get('code');
                            if (code) {
                                console.log("Auth code received, closing window");
                                authWindow.removeAllListeners('closed');
                                authWindow.destroy();
                                resolve(code);
                            } else if (parsedUrl.searchParams.get('error')) {
                                const error = parsedUrl.searchParams.get('error');
                                const errorDesc = parsedUrl.searchParams.get('error_description');
                                console.log("Auth error:", error, errorDesc);
                                authWindow.removeAllListeners('closed');
                                authWindow.destroy();
                                reject(new Error(`Authentication failed: ${error} - ${errorDesc}`));
                            }
                        }
                    } catch (err) {
                        console.error("Error parsing URL:", err);
                    }
                };

                authWindow.on('closed', () => {
                    console.log("Auth window was closed by user");
                    reject(new Error('Authentication window was closed'));
                });
                
                // Handle load errors
                authWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
                    console.log("Page failed to load:", errorCode, errorDescription);
                    if (errorCode !== -3) { // Ignore ERR_ABORTED errors which happen during redirects
                        reject(new Error(`Page failed to load: ${errorDescription}`));
                        authWindow.destroy();
                    }
                });

                await authWindow.loadURL(authCodeUrl);
            } catch (err) {
                console.error("Error during authentication:", err);
                reject(err);
            }
        });
    }

    /**
     * Handle fallback to offline mode
     */
    getOfflineProfile(username) {
        if (!username) {
            throw new Error('Username is required for offline mode');
        }
        
        // Generate a UUID for the player based on username (same as in renderer.js)
        const { v3: uuidv3 } = require('uuid');
        const NAMESPACE = uuidv3.DNS;
        const generatedUUID = uuidv3(`OfflinePlayer:${username}`, NAMESPACE);
        
        // Return a mock profile similar to Minecraft's format
        return {
            id: generatedUUID,
            name: username,
            skins: [],
            capes: [],
            profileType: "LEGACY",
            _isOffline: true // Special flag to indicate offline mode
        };
    }
    
    /**
     * Initiate login process
     */
    async login(offlineUsername = null) {
        // If offline username is provided, skip online authentication
        if (offlineUsername) {
            console.log(`Using offline mode with username: ${offlineUsername}`);
            return this.getOfflineProfile(offlineUsername);
        }
        
        try {
            console.log("Starting login flow...");
            
            // Get auth code through popup window
            const authCode = await this.createAuthWindow();
            console.log("Auth code obtained successfully");
            
            // Exchange auth code for token
            console.log("Exchanging auth code for token...");
            const tokenResponse = await this.msalClient.acquireTokenByCode({
                code: authCode,
                scopes: loginRequest.scopes,
                redirectUri: msalConfig.auth.redirectUri
            });
            
            if (!tokenResponse) {
                console.error("No token response received");
                throw new Error('No token response received');
            }
            console.log("Token obtained successfully");

            this.account = tokenResponse.account;
            
            // CAPTCHA VERIFICATION STEP
            console.log("Starting captcha verification...");
            try {
                await this.createCaptchaWindow();
                console.log("Captcha verification completed successfully");
            } catch (captchaError) {
                console.error("Captcha verification failed:", captchaError);
                throw new Error('Security verification failed. Please try again.');
            }
            
            // Xbox Live authentication
            console.log("Authenticating with Xbox Live...");
            const xboxLiveToken = await this.authenticateWithXboxLive(tokenResponse.accessToken);
            console.log("Xbox Live authentication successful");
            
            // XSTS authentication
            console.log("Getting XSTS token...");
            const xstsToken = await this.getXSTSToken(xboxLiveToken);
            console.log("XSTS token obtained successfully");
            
            // Minecraft authentication
            console.log("Authenticating with Minecraft...");
            const minecraftToken = await this.authenticateWithMinecraft(xstsToken);
            console.log("Minecraft authentication successful");
            
            // Check game ownership first
            console.log("Checking Minecraft game ownership...");
            const ownsGame = await this.checkGameOwnership(minecraftToken.access_token);
            if (!ownsGame) {
                console.log("Game ownership check failed - account doesn't own Minecraft Java Edition");
                console.log("Note: For online multiplayer servers, you need to own Minecraft Java Edition");
                console.log("Continuing with limited authentication for offline/demo purposes...");
                
                // Return limited profile for testing
                const limitedProfile = {
                    id: "demo-user-uuid",
                    name: "DemoUser",
                    access_token: minecraftToken.access_token,
                    _limitedAccess: true,
                    _message: "Limited access - purchase Minecraft Java Edition for full functionality"
                };
                
                await this.saveCredentials({
                    ...minecraftToken,
                    profile: limitedProfile
                });
                
                return {
                    success: true,
                    profile: limitedProfile,
                    authenticated: true,
                    limitedAccess: true
                };
            }
            console.log("Minecraft ownership verified");
            
            // Get Minecraft profile
            console.log("Retrieving Minecraft profile...");
            const profile = await this.getMinecraftProfile(minecraftToken.access_token);
            console.log("Minecraft profile retrieved successfully:", profile.name);
            
            // Save credentials
            console.log("Saving credentials...");
            await this.saveCredentials(minecraftToken);
            console.log("Credentials saved successfully");
            
            // Return complete authentication data for online play
            return {
                success: true,
                profile: {
                    id: profile.id,
                    name: profile.name,
                    skins: profile.skins || [],
                    capes: profile.capes || []
                },
                access_token: minecraftToken.access_token,
                authenticated: true,
                canPlayOnline: true
            };
        } catch (error) {
            console.error('Authentication error:', error);
            throw error;
        }
    }

    /**
     * Authenticate with Xbox Live using Microsoft access token
     */
    async authenticateWithXboxLive(accessToken) {
        console.log("Authenticating with Xbox Live...");
        
        const response = await fetch(xboxLiveConfig.urlXboxLiveAuth, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                Properties: {
                    AuthMethod: 'RPS',
                    SiteName: 'user.auth.xboxlive.com',
                    RpsTicket: `d=${accessToken}`
                },
                RelyingParty: 'http://auth.xboxlive.com',
                TokenType: 'JWT'
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(`Xbox Live authentication failed: ${JSON.stringify(data)}`);
        }

        return data.Token;
    }

    /**
     * Get XSTS token using Xbox Live token
     */
    async getXSTSToken(xboxLiveToken) {
        const response = await fetch(xboxLiveConfig.urlXboxLiveXsts, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                Properties: {
                    SandboxId: 'RETAIL',
                    UserTokens: [xboxLiveToken]
                },
                RelyingParty: 'rp://api.minecraftservices.com/',
                TokenType: 'JWT'
            })
        });

        const data = await response.json();
        if (!response.ok) {
            // Check for specific Xbox error codes
            if (data.XErr === 2148916233) {
                throw new Error('Your Microsoft account does not have an Xbox profile. Please create one at https://www.xbox.com/en-US/live/');
            } else if (data.XErr === 2148916238) {
                throw new Error('Xbox account belongs to a child and requires parental consent');
            } else {
                throw new Error(`XSTS authentication failed: ${JSON.stringify(data)}`);
            }
        }

        // Return both the token and user hash
        return {
            token: data.Token,
            userHash: data.DisplayClaims.xui[0].uhs
        };
    }

    /**
     * Authenticate with Minecraft using XSTS token
     */
    async authenticateWithMinecraft({ token, userHash }) {
        let data;
        try {
            console.log("Authenticating with Minecraft services...");
            const response = await fetch(xboxLiveConfig.urlMinecraftAuth, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    identityToken: `XBL3.0 x=${userHash};${token}`
                })
            });

            data = await response.json();
            if (!response.ok) {
                console.error("Minecraft authentication error:", data);
                
                // Special handling for app registration errors
                if (data.errorMessage && data.errorMessage.includes("Invalid app registration")) {
                    console.error("This is an app registration issue. For Minecraft authentication, you need to use the official Minecraft client ID.");
                    throw new Error("Minecraft authentication failed: App registration issue. See https://aka.ms/AppRegInfo for more information");
                }
                
                throw new Error(`Minecraft authentication failed: ${JSON.stringify(data)}`);
            }
        } catch (error) {
            console.error("Error during Minecraft authentication:", error);
            throw error;
        }

        // Save the token data for future use
        this.minecraftTokenData = data;
        return data;
    }

    /**
     * Get Minecraft profile information
     */
    async getMinecraftProfile(accessToken = null) {
        const token = accessToken || (this.minecraftTokenData ? this.minecraftTokenData.access_token : null);
        
        if (!token) {
            throw new Error('No access token available');
        }

        const response = await fetch('https://api.minecraftservices.com/minecraft/profile', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(`Failed to get Minecraft profile: ${JSON.stringify(data)}`);
        }

        return data;
    }

    /**
     * Check if user owns Minecraft
     */
    async checkGameOwnership(accessToken = null) {
        const token = accessToken || (this.minecraftTokenData ? this.minecraftTokenData.access_token : null);
        
        if (!token) {
            throw new Error('No access token available');
        }

        const response = await fetch('https://api.minecraftservices.com/entitlements/mcstore', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(`Failed to check game ownership: ${JSON.stringify(data)}`);
        }

        return data.items && data.items.length > 0;
    }

    /**
     * Save credentials securely
     */
    async saveCredentials(tokenData) {
        if (!tokenData) return;
        
        try {
            await keytar.setPassword(
                SERVICE_NAME, 
                ACCOUNT_NAME, 
                JSON.stringify(tokenData)
            );
            this.minecraftTokenData = tokenData;
        } catch (error) {
            console.error('Failed to save credentials:', error);
            throw error;
        }
    }

    /**
     * Load saved credentials
     */
    async loadSavedCredentials() {
        try {
            const tokenData = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);
            if (tokenData) {
                this.minecraftTokenData = JSON.parse(tokenData);
                
                // Check if token is still valid
                try {
                    const profile = await this.getMinecraftProfile();
                    return profile;
                } catch (error) {
                    console.log('Saved token is invalid, clearing credentials');
                    await this.logout();
                    return null;
                }
            }
            return null;
        } catch (error) {
            console.error('Failed to load credentials:', error);
            return null;
        }
    }

    /**
     * Logout and clear credentials
     */
    async logout() {
        try {
            await keytar.deletePassword(SERVICE_NAME, ACCOUNT_NAME);
            this.account = null;
            this.minecraftTokenData = null;
        } catch (error) {
            console.error('Failed to clear credentials:', error);
            throw error;
        }
    }

    /**
     * Get current authentication status
     */
    isAuthenticated() {
        return !!this.minecraftTokenData;
    }

    /**
     * Get current Minecraft token for launching the game
     */
    getMinecraftToken() {
        if (!this.minecraftTokenData) {
            return null;
        }
        return this.minecraftTokenData.access_token;
    }
}

module.exports = new MinecraftAuthProvider();
