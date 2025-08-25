# Void Client Troubleshooting Guide

This guide will help you resolve common issues with the Void Client launcher across different operating systems.

## Common Issues

### 1. Launch Button Not Working

If clicking the launch button doesn't do anything:

**Check if you're logged in:**
- Make sure you've entered a username for offline play or signed in with Microsoft
- The launch button is disabled until you're logged in

**Check for errors in the console:**
- Run the launcher from a terminal/command prompt to see any error messages
- On Windows: `void-client.exe --debug`
- On Mac/Linux: `./VoidClient --debug`

### 2. Java Issues

If Minecraft fails to start due to Java problems:

**Windows:**
- The launcher includes Java, but it might be blocked by antivirus
- Add the launcher to your antivirus exceptions
- Try installing Java JRE 17 or 21 manually

**macOS:**
- Allow the app in Security & Privacy settings
- If prompted about Java security, allow it
- Install Java 17 or 21 manually if needed

**Linux:**
- Install additional libraries: `sudo apt install libgbm1 libnss3 libgtk-3-0 libxss1`
- On some distributions you may need: `sudo apt install default-jre`

### 3. Microsoft Authentication Fails

If you can't log in with Microsoft:

- Make sure you have an active internet connection
- Check that you own Minecraft on the Microsoft account
- For new accounts, create an Xbox profile first at xbox.com
- The client ID might need to be approved by Microsoft (contact the developer)

### 4. Game Crashes on Launch

If Minecraft starts but crashes immediately:

- Check that your computer meets the minimum requirements
- Update your graphics drivers
- Allocate less memory in the launcher settings
- Try a different version of Minecraft

### 5. Operating System-Specific Issues

**Windows:**
- Run as administrator if having permission issues
- Disable Windows Defender real-time protection temporarily

**macOS:**
- If you get a "damaged app" message, open System Preferences > Security & Privacy and allow the app
- Try running: `xattr -cr /Applications/VoidClient.app`

**Linux:**
- Different distributions have different dependencies
- Ubuntu/Debian: `sudo apt install libgbm1 libnss3 libgtk-3-0 libxss1 default-jre`
- Fedora: `sudo dnf install mesa-libgbm nss gtk3 libXScrnSaver java-latest-openjdk`
- Arch: `sudo pacman -S libgbm nss gtk3 libxss jre-openjdk`

### 6. Files and Permissions

If the launcher can't create or access files:

- Make sure the launcher has write permissions to its directory
- On macOS and Linux, check file permissions: `chmod -R 755 /path/to/VoidClient`
- Don't install the launcher in protected directories (like Program Files) without admin rights

## Advanced Troubleshooting

A troubleshooting file is automatically created at `minecraft/troubleshooting.txt` with system information. Share this file when reporting issues.

## Contact Support

If you continue experiencing issues, please contact support with:
1. Your operating system and version
2. The troubleshooting.txt file
3. Screenshots of any error messages
4. Steps to reproduce the problem
