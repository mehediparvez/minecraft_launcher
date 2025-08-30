# Java Download Fix - Void Client

## Issues Fixed

### 1. Missing downloadFile Method
**Problem**: The `downloader.js` file was calling `this.downloadFile()` but the method was not implemented, causing "failed to download Java 8:302" errors.

**Solution**: Implemented a robust `downloadFile` method with:
- Proper HTTP/HTTPS request handling
- Redirect support (handles GitHub's 302 redirects)
- Progress tracking
- Error handling with detailed messages
- Timeout handling (60 seconds)

### 2. Missing Archive Extraction Methods
**Problem**: The downloader was calling `extractArchive` and `downloadAndExtract` methods that were not implemented.

**Solution**: Implemented complete archive extraction support:
- ZIP file extraction using `yauzl` library
- TAR.GZ file extraction using `tar` library
- Proper error handling and logging
- Directory structure preservation

### 3. Outdated Java Download URLs
**Problem**: The Java download URLs were pointing to older versions that may have been moved or are no longer available.

**Solution**: Updated to latest stable Java versions:
- Java 8: Updated to 8u402-b06
- Java 21: Updated to 21.0.2+13
- All URLs tested and verified working

### 4. Setup Process Timing
**Problem**: Java was being downloaded after installation instead of during the initial setup.

**Solution**: 
- Setup manager is now properly integrated into the app initialization
- Downloads happen during the first-run setup process
- Setup window shows progress and prevents app usage until complete

### 5. Error Messages
**Problem**: Generic error messages didn't help users understand what was wrong.

**Solution**: Added specific error handling for:
- Network connection issues
- Download timeouts
- Redirect problems
- Platform compatibility issues

## New Dependencies Added

```json
{
  "yauzl": "^2.10.0",
  "tar": "^6.1.11"
}
```

## Files Modified

1. **src/downloader.js**
   - Added `downloadFile` method
   - Added `downloadAndExtract` method
   - Added `extractArchive` method
   - Updated Java download URLs
   - Improved error handling and logging

2. **src/setup-manager.js**
   - Enhanced error handling with specific user-friendly messages
   - Better progress reporting

3. **src/windows/setup.html**
   - Improved UI for showing download information
   - Better error display

4. **src/mock-downloader.js** (new file)
   - Mock implementation for testing purposes

## Testing

The setup process now includes:
- Automatic download during first run
- Progress indication
- Proper error handling
- Support for both Windows, macOS, and Linux

Run `npm run test-setup` to test the setup process in development mode.

## Architecture

The setup process flow:
1. App starts → SetupManager checks if setup required
2. If required → Show setup window
3. User clicks "Start Download" → Download all required components
4. Progress is tracked and displayed
5. On completion → Setup window closes, main app starts
6. On error → User-friendly error message with retry option

This ensures Java and other required components are available before the launcher attempts to run Minecraft.
