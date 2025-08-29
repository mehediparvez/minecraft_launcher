# Void Client - Captcha Integration Guide

## Overview

Void Client now includes an integrated captcha verification system as part of the Microsoft authentication flow. This security feature ensures that only legitimate users can authenticate and access online features.

## How It Works

### Authentication Flow
1. **Microsoft OAuth** - User clicks "Sign in with Microsoft" in the login window
2. **Microsoft Authentication** - Standard OAuth2 flow with Microsoft/Azure
3. **🆕 Captcha Verification** - After successful OAuth, a captcha challenge appears
4. **Xbox Live Authentication** - Proceeds only after captcha verification
5. **Minecraft Profile Access** - User gains access to their Minecraft profile

### Captcha Features
- **6-character alphanumeric codes** (A-Z, 0-9)
- **3 attempts maximum** before authentication fails
- **Auto-refresh capability** to generate new codes
- **Styled to match client theme** with Void Client branding
- **Keyboard shortcuts** (Enter to verify, auto-uppercase input)
- **Graceful failure handling** with clear error messages

## User Experience

### Login Window Updates
- Microsoft login button now shows progress states:
  - "Connecting..." during OAuth
  - "Success!" when complete
  - Specific error messages for captcha failures

### Captcha Window
- **Modal dialog** that appears after successful Microsoft OAuth
- **Always on top** to ensure user attention
- **Frameless design** matching the client's aesthetic
- **Cancel option** to abort authentication
- **Visual feedback** for correct/incorrect attempts

## Technical Implementation

### New Files Added
```
src/windows/captcha.html - Captcha verification UI
```

### Modified Files
```
src/auth/minecraftAuth.js - Added captcha verification step
src/windows/login.html - Enhanced error handling for captcha
src/renderer.js - Better auth flow messaging
```

### Security Features
- Captcha codes are **randomly generated** each time
- **Session-based verification** - each auth session requires new captcha
- **Attempt limiting** prevents brute force
- **Automatic cleanup** when windows are closed

## Error Handling

### Common Scenarios
1. **Captcha Cancelled** - Returns to login screen
2. **Too Many Attempts** - Authentication fails, returns to login
3. **Window Closed** - Treated as cancellation
4. **Network Issues** - Falls back to offline mode

### Error Messages
- "Security verification failed. Please try again."
- "Captcha verification was cancelled or failed."
- Specific Xbox profile creation guidance when needed

## Development Notes

### Dependencies
No new dependencies were added. The captcha system uses:
- Pure JavaScript for code generation
- Electron's IPC for window communication
- CSS animations for enhanced UX

### Testing
- Test both successful and failed captcha attempts
- Verify proper cleanup when windows are closed
- Ensure offline mode still works when captcha is cancelled

### Future Enhancements
- Could integrate with external captcha services (reCAPTCHA, hCaptcha)
- Audio captcha for accessibility
- Difficulty scaling based on failed attempts
- Persistent user trust levels

## Configuration

No additional configuration is required. The captcha system is:
- **Automatically enabled** for Microsoft authentication
- **Bypassed for offline mode** (no captcha required)
- **Self-contained** with no external dependencies

## Troubleshooting

### Common Issues
1. **Captcha window not appearing**
   - Check console for JavaScript errors
   - Verify captcha.html file exists
   - Ensure IPC handlers are registered

2. **Codes not generating**
   - Usually resolved by refreshing the captcha
   - Check browser console for errors

3. **Authentication hanging**
   - Kill and restart the application
   - Check network connectivity
   - Try offline mode as fallback

### Debug Mode
Run with `--debug` flag to enable enhanced logging:
```bash
npm run dev -- --debug
```

## Security Considerations

- Captcha codes are **not stored persistently**
- Each authentication session requires **fresh verification**
- Failed attempts are **not logged permanently**
- System is **resistant to automated attacks**

---

**Note**: This captcha implementation provides a good balance between security and user experience. For production environments requiring higher security, consider integrating enterprise-grade captcha solutions.
