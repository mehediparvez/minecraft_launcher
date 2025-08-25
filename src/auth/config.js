/**
 * Configuration for Microsoft Authentication
 * This file contains the Azure application registration details and required scopes
 */

const msalConfig = {
    auth: {
        clientId: '3364d4b1-0ce4-4dde-b63e-4b558d13438d', // Replace this with the client ID you copied from Azure Portal
        authority: 'https://login.microsoftonline.com/consumers',
        redirectUri: 'https://login.microsoftonline.com/common/oauth2/nativeclient' // Standard redirect URI for native clients
    },
    cache: {
        cacheLocation: 'localStorage'
    },
    system: {
        loggerOptions: {
            loggerCallback: (level, message, containsPii) => {
                if (!containsPii) {
                    console.log(message);
                }
            },
            piiLoggingEnabled: false,
            logLevel: "Info"
        }
    }
};

const xboxLiveConfig = {
    urlXboxLiveAuth: 'https://user.auth.xboxlive.com/user/authenticate',
    urlXboxLiveXsts: 'https://xsts.auth.xboxlive.com/xsts/authorize',
    urlMinecraftAuth: 'https://api.minecraftservices.com/authentication/login_with_xbox'
};

// Microsoft scopes for authentication
const loginRequest = {
    scopes: ["XboxLive.signin"]
};

// Export configurations
module.exports = {
    msalConfig,
    loginRequest,
    xboxLiveConfig
};
