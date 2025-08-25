# Minecraft Authentication Guide for Void Client

## Current Status

We've implemented Microsoft authentication in Void Client, but we need to go through Microsoft's official approval process to enable online authentication:

```
Minecraft authentication failed: {"path":"/authentication/login_with_xbox","errorMessage":"Invalid app registration, see https://aka.ms/AppRegInfo for more information"}
```

## The Issue

Minecraft's authentication service only allows specifically authorized applications to authenticate users. Your Azure app registration needs to be approved by Microsoft/Mojang before it can be used for Minecraft authentication.

## Solution

### Apply for Official Authorization

The proper and only recommended way to enable Minecraft authentication:

### Option 2: Apply for Authorization (Recommended)

1. Go to https://aka.ms/AppRegInfo 
2. Follow Microsoft's process for getting your application authorized for Minecraft authentication
3. This is the official and proper way to integrate Minecraft authentication

## For Development/Testing Purposes

If you're just testing the application or developing it for personal use, you can use the offline mode:

1. Click "Play Offline" in the launcher
2. Enter a username
3. The game will start in offline mode

## Next Steps

1. For now, test the application using offline mode
2. If you need online authentication for a production application:
   - Go through Microsoft's app authorization process
   - Update the application with your authorized client ID

## Code Structure

The authentication code is now ready and structured properly:
- `src/auth/config.js`: Configuration settings
- `src/auth/minecraftAuth.js`: Main authentication logic
- `src/auth/launcherIntegration.js`: Integration with the game launcher

Once you have an authorized client ID, you'll only need to update the `config.js` file with your new ID to make everything work correctly.
