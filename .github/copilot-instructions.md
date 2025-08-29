# Void Client - AI Coding Agent Instructions

## Project Overview
This is an Electron-based Minecraft launcher with Microsoft OAuth2 authentication, captcha security, and runtime asset downloading. The architecture follows a minimal installer pattern where heavy assets (Java runtime, Minecraft libraries) are downloaded on first run rather than bundled.

## Architecture Patterns

### Two-Stage Initialization
The app has a unique dual-phase startup:
1. **Setup Phase**: `SetupManager` checks for missing assets and downloads them via `downloader.js`
2. **Authentication Phase**: Users choose between Microsoft OAuth2 or offline mode via `minecraftAuth.js`

### Key Service Boundaries
- **Main Process** (`src/index.js`): Window management, IPC coordination, global shortcuts
- **Auth Module** (`src/auth/`): Complete OAuth2 flow with Xbox Live → XSTS → Minecraft services chain
- **Setup System** (`src/setup-manager.js` + `src/downloader.js`): Asset download orchestration
- **UI Layer** (`src/windows/`): Frameless windows with custom controls

### Data Flow Pattern
```
User Login → Captcha Verification → Xbox Live Auth → XSTS Token → Minecraft Services → Profile + Token Storage (keytar)
```

## Critical Developer Workflows

### Building Installers
- **Minimal Build**: `./build-minimal.sh` - Creates ~20MB installer (excludes `java/`, `minecraft/assets`, etc.)
- **Full Build**: `npm run dist` - Bundles everything (~1GB installer)
- **Platform Specific**: `npm run dist:linux|win|mac`

The minimal build temporarily moves large directories to `.installer-backup/`, builds, then restores them.

### Testing Components
- **Captcha Only**: `npm run test-captcha` - Standalone captcha window testing
- **Debug Mode**: `npm run dev -- --debug` - Enables enhanced logging + debug panel (`Ctrl+Shift+D`)
- **Auth Testing**: Debug panel includes Microsoft auth flow testing and Java detection

### Essential Build Configuration
The `package.json` build.files array excludes heavy assets in production:
```json
"!java${/*}",
"!minecraft/assets${/*}",
"!minecraft/libraries${/*}"
```

## Project-Specific Conventions

### Authentication States
- **Microsoft Auth**: Full online capability with skin loading
- **Offline Mode**: Generated UUID based on username using `uuidv3`
- **Limited Access**: Microsoft auth without game ownership (demo mode)

### Window Management Pattern
All windows use `frame: false` with custom title bars. Icon loading follows a fallback pattern:
```javascript
const iconPath = path.resolve(__dirname, '..', 'build', 'icon.png');
const fallbackIconPath = path.resolve(__dirname, 'windows/aimg/icon-256.png');
```

### IPC Communication
Heavy use of `ipcMain.handle()` for async operations. Critical handlers:
- `minecraft:login` - Triggers full OAuth2 + captcha flow
- `setup:download` - Asset downloading with progress callbacks
- `debug:*` - Debug panel communication

### Error Handling Philosophy
The codebase prioritizes graceful degradation:
- Failed Microsoft auth → falls back to offline mode
- Missing Java → attempts bundled then system Java detection
- Failed captcha → auth cancellation with clear messaging

## Integration Points

### External Dependencies
- **Microsoft Graph/Xbox Live**: OAuth2 flow requires specific scopes and endpoint sequencing
- **Minecraft Services**: Game ownership verification and profile fetching
- **System Integration**: Java detection across platforms, credential storage via keytar

### Cross-Component Communication
- `SetupManager` → `AssetDownloader`: Progress callbacks for UI updates
- `MinecraftAuth` → Browser Windows: Popup-based OAuth2 with URL monitoring
- Main Process → Renderer: User profile data and authentication state sync

## File Patterns to Know

### Configuration Files
- `installer-config.json`: Build settings and size optimization rules
- `src/auth/config.js`: Microsoft app registration and OAuth2 endpoints
- `minecraft/launcher_config.json`: User preferences and launch settings

### Critical Asset Locations
- `java/java21/` and `java/java8/`: Bundled JVM runtimes (excluded in minimal builds)
- `minecraft/versions/`, `minecraft/libraries/`: Game assets (downloaded at runtime)
- `resources/app.asar.unpacked/`: Packaged app assets that need filesystem access

### Window HTML Files
Each window in `src/windows/` has specific purposes:
- `login.html`: Dual auth options (Microsoft/Offline)
- `captcha.html`: Security verification with 6-digit alphanumeric codes
- `setup.html`: First-run asset downloading with progress tracking
- `debug.html`: Development diagnostics and testing tools

When modifying auth flows, always test both the minimal installer path (runtime downloads) and the captcha verification step, as these are the most complex integration points.
