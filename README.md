# Void Client

A modern Minecraft launcher with Microsoft authentication support and integrated captcha security, built with Electron.

This implementation adds Microsoft OAuth2 authentication with captcha verification to the Void Client Minecraft launcher, allowing users to sign in securely with their Microsoft accounts and play Minecraft online.

## 🆕 New Features - Captcha Integration

### Enhanced Security
- **Captcha Verification**: Added security challenge after Microsoft OAuth
- **User-Friendly Interface**: Styled captcha window matching client theme
- **Attempt Limiting**: Maximum 3 attempts with clear feedback
- **Graceful Fallback**: Maintains offline mode when captcha fails

### Updated Authentication Flow
1. User clicks "Sign in with Microsoft" button
2. OAuth2 popup window opens to Microsoft login page
3. User enters Microsoft credentials and authorizes the app
4. **🆕 Captcha verification challenge appears**
5. User completes 6-character alphanumeric captcha
6. App proceeds with Xbox Live authentication
7. Full Minecraft profile access granted

## Features

- **Microsoft account authentication** using OAuth2 with captcha protection
- **Secure token storage** using keytar
- **Xbox Live and Minecraft service authentication**
- **Automatic token refresh**
- **🆕 Captcha security verification** with visual feedback
- **Fallback to offline mode** when needed or captcha cancelled
- **Skin loading** for authenticated users
- **Cross-platform support** (Windows, macOS, Linux)

## Implementation Details

### Directory Structure

```
src/
├── auth/
│   ├── config.js            # Authentication configuration
│   ├── index.js             # Auth module exports
│   ├── launcherIntegration.js  # Integration with launcher
│   └── minecraftAuth.js     # Core auth implementation (updated)
├── index.js                 # Main process
├── renderer.js              # Renderer process
└── windows/
    ├── login.html           # Login UI (enhanced)
    ├── captcha.html         # 🆕 Captcha verification window
    └── index.html           # Main UI
```

### Enhanced Authentication Flow

1. User clicks "Sign in with Microsoft" button
2. OAuth2 popup window opens to Microsoft login page
3. User enters Microsoft credentials and authorizes the app
4. Authentication code is returned to the app
5. App exchanges code for access token
6. **🆕 Captcha verification window appears**
7. **🆕 User enters 6-character captcha code (3 attempts max)**
8. App authenticates with Xbox Live using the token
9. App obtains XSTS token from Xbox Live
10. App authenticates with Minecraft using the XSTS token
11. App retrieves Minecraft profile and stores credentials securely

### Captcha Features

- **Random Code Generation**: 6-character alphanumeric codes (A-Z, 0-9)
- **Visual Design**: Matches Void Client theme with animations
- **Attempt Management**: 3 attempts maximum before auth failure
- **Keyboard Support**: Enter key to verify, auto-uppercase input
- **Refresh Capability**: Generate new codes if needed
- **Error Handling**: Clear messages for incorrect codes
- **Clean Cancellation**: Returns to login screen gracefully

## Configuration

### Azure Application Registration

Before using the application, you need to register an Azure application:

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to Azure Active Directory → App registrations
3. Create a new registration
4. Set the Redirect URI to `http://localhost:3000/callback`
5. Add the XboxLive.signin API permission
6. Copy the Application (client) ID and update it in `src/auth/config.js`

Current configuration uses Client ID: `3364d4b1-0ce4-4dde-b63e-4b558d13438d`

For custom deployments, update `src/auth/config.js`:
```javascript
const msalConfig = {
    auth: {
        clientId: 'YOUR-CLIENT-ID',  // Replace with your Azure App ID
        authority: 'https://login.microsoftonline.com/consumers',
        redirectUri: 'http://localhost:3000/callback'
    }
    // ... rest of config
};
```

## Setup for Development

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd void-client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the application:
   ```bash
   npm start
   ```

4. **🆕 Test captcha functionality**:
   ```bash
   npm run test-captcha
   ```

## Available Scripts

- `npm start` - Start the application
- `npm run dev` - Start in development mode with enhanced logging
- `npm run test-captcha` - **🆕 Test captcha window standalone**
- `npm run pack` - Package the app (without building installer)
- `npm run dist` - Build distributable packages

## Building for Production

```bash
# Install dependencies
npm install

# Build for current platform
npm run dist

# Platform-specific builds
npm run dist:win    # Windows
npm run dist:mac    # macOS  
npm run dist:linux  # Linux
```

## Security Considerations

- **Enhanced Security**: Captcha prevents automated attacks
- **Secure Storage**: Tokens stored securely using keytar (Keychain/Credential Vault/libsecret)
- **Session Isolation**: Fresh captcha for each authentication session
- **No Plaintext Storage**: No sensitive data stored in plain text
- **Secure Windows**: Authentication popup uses contextIsolation
- **Attempt Limiting**: Captcha limited to 3 attempts per session

## Troubleshooting

### Authentication Issues

If you encounter authentication problems:

1. **Microsoft login fails**: Check internet connection, verify Azure app configuration
2. **Captcha not appearing**: Check console for errors, restart application
3. **Captcha codes rejected**: Try refresh button, check caps lock, verify input
4. **Xbox profile error**: Create Xbox profile at xbox.com
5. **Token issues**: Application will auto-refresh or prompt re-login

### Debug Mode

Enable enhanced logging:
```bash
npm run dev -- --debug
```

Access debug panel in running app: `Ctrl+Shift+D` (or `Cmd+Shift+D` on Mac)

### 🆕 Captcha Testing

Test captcha functionality separately:
```bash
npm run test-captcha
```

This opens only the captcha window for isolated testing.

### Common Solutions

- **Captcha window freezes**: Close and retry authentication
- **Multiple failed attempts**: Wait and try again with fresh session
- **Network timeouts**: Check firewall and antivirus settings
- **Java issues**: Use bundled Java or install system Java

## 📋 Captcha Implementation Summary

✅ **Completed Features**:
- Captcha verification window with Void Client styling
- Integration into Microsoft authentication flow
- 6-character alphanumeric code generation
- 3-attempt limit with error handling
- Keyboard shortcuts and user-friendly interface
- Graceful fallback to offline mode
- Standalone testing capability

✅ **Security Enhancements**:
- Prevents automated authentication attacks
- Session-based verification (fresh captcha each time)
- No persistent captcha storage
- Proper cleanup on window close/cancel

✅ **User Experience**:
- Matches existing UI theme and animations
- Clear error messages and progress indicators
- Maintains existing offline mode option
- Enhanced login flow with security verification

🔧 **Ready for Production**: No additional dependencies required, all existing functionality preserved.

## Files Modified/Added

### New Files:
- `src/windows/captcha.html` - Captcha verification interface
- `test-captcha.js` - Standalone captcha testing
- `CAPTCHA_INTEGRATION.md` - Detailed integration guide

### Modified Files:
- `src/auth/minecraftAuth.js` - Added captcha verification step
- `src/windows/login.html` - Enhanced error handling
- `src/renderer.js` - Improved auth flow messaging
- `package.json` - Added test-captcha script
- `README.md` - Updated with captcha documentation
