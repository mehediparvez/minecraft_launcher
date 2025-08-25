# Void Client

A modern Minecraft launcher with Microsoft authentication support, built with Electron.

This implementation adds Microsoft OAuth2 authentication to the Void Client Minecraft launcher, allowing users to sign in with their Microsoft accounts and play Minecraft online.

## Features

- Microsoft account authentication using OAuth2
- Secure token storage using keytar
- Xbox Live and Minecraft service authentication
- Automatic token refresh
- Fallback to offline mode when needed
- Skin loading for authenticated users

## Implementation Details

### Directory Structure

```
src/
├── auth/
│   ├── config.js            # Authentication configuration
│   ├── index.js             # Auth module exports
│   ├── launcherIntegration.js  # Integration with launcher
│   └── minecraftAuth.js     # Core auth implementation
├── index.js                 # Main process
├── renderer.js              # Renderer process
└── windows/
    ├── login.html           # Login UI
    └── index.html           # Main UI
```

### Authentication Flow

1. User clicks "Sign in with Microsoft" button
2. OAuth2 popup window opens to Microsoft login page
3. User enters Microsoft credentials and authorizes the app
4. Authentication code is returned to the app
5. App exchanges code for access token
6. App authenticates with Xbox Live using the token
7. App obtains XSTS token from Xbox Live
8. App authenticates with Minecraft using the XSTS token
9. App retrieves Minecraft profile and stores credentials securely

### Configuration

Before using the application, you need to register an Azure application and get Microsoft approval for Minecraft authentication:

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to Azure Active Directory → App registrations
3. Create a new registration
4. Set the Redirect URI to `https://login.microsoftonline.com/common/oauth2/nativeclient`
5. Add the XboxLive.signin API permission
6. Apply for Microsoft approval using the form at https://aka.ms/AppRegInfo
7. Once approved, copy the Application (client) ID and update it in `src/auth/config.js`

For detailed instructions, see the `MINECRAFT_AUTH_GUIDE.md` file.

## Setup for Development

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/void-client.git
   cd void-client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure authentication:
   ```bash
   cp src/auth/config.js.template src/auth/config.js
   ```
   Edit `src/auth/config.js` and add your Microsoft Application Client ID.

4. Run the application:
   ```bash
   npm start
   ```

## Building for Production

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Package the application
npm run package
```

## Security Considerations

- Tokens are stored securely using keytar (backed by Keychain on macOS, Credential Vault on Windows, libsecret on Linux)
- No sensitive data is stored in plain text
- Authentication popup uses a separate window with contextIsolation enabled

## Troubleshooting

If you encounter authentication issues:

1. Check that your Azure App Registration is properly configured
2. Verify that the correct client ID is set in config.js
3. Ensure the user has a valid Minecraft license
4. Check network connectivity to Microsoft and Minecraft services
