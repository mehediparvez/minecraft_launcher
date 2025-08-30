# Void Client - Build and Release Documentation

## Project Overview
This is an Electron-based Minecraft launcher with Microsoft authentication, captcha security, and automatic Java runtime management.

## Repository Structure
```
minecraft_launcher/
├── dev-workspace/           # Main project directory
│   ├── src/                # Application source code
│   ├── build/              # Icons and build assets
│   ├── .github/workflows/  # GitHub Actions (automated builds)
│   ├── package.json        # Project configuration
│   └── README.md           # Project documentation
└── docs/                   # This documentation (outside project)
```

## Automated Build Process

### GitHub Actions Workflow
The project uses GitHub Actions to automatically build installers for all platforms when you push code to the main branch.

**Location**: `dev-workspace/.github/workflows/build-and-release.yml`

**Triggers**: Automatically runs on every push to `main` branch

**Builds**:
- **Windows**: `.exe` installer
- **macOS**: `.dmg` disk image  
- **Linux**: `.AppImage` and `.deb` packages

**Output**: All installers are automatically uploaded to GitHub Releases

## Manual Build Instructions

### Prerequisites
```bash
cd dev-workspace
npm install
```

### Build Commands
```bash
# Build for current platform only
npm run dist

# Build for specific platforms
npm run dist:win     # Windows
npm run dist:mac     # macOS
npm run dist:linux   # Linux

# Build for all platforms (requires Docker/Wine setup)
npm run build:all
```

### Build Output
All built files are saved to: `dev-workspace/dist/`

## Release Process

### Automatic Releases (Recommended)
1. Make your code changes in `dev-workspace/`
2. Commit and push to `main` branch:
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```
3. GitHub Actions automatically:
   - Builds installers for all platforms
   - Creates a new GitHub Release (v1.0.0)
   - Uploads all installer files

### Manual Release Steps
If you need to create a release manually:

1. **Build the installers**:
   ```bash
   cd dev-workspace
   npm run build:all
   ```

2. **Create GitHub Release**:
   - Go to: https://github.com/mehediparvez/minecraft_launcher/releases
   - Click "Create a new release"
   - Tag: `v1.0.0`
   - Title: `Void Client v1.0.0`
   - Upload files from `dev-workspace/dist/`

## Installer Details

### Windows (`Void-Client-1.0.0-x64-installer.exe`)
- NSIS installer with custom branding
- Installs to `Program Files`
- Creates desktop and start menu shortcuts
- Auto-updater support

### macOS (`Void-Client-1.0.0.dmg`)
- Disk image for easy installation
- Drag-and-drop to Applications folder
- Code signing (if certificates are configured)

### Linux
- **AppImage** (`Void-Client-1.0.0.AppImage`): Portable, run anywhere
- **Debian Package** (`void-client_1.0.0_amd64.deb`): For Ubuntu/Debian systems

## Project Configuration

### Key Files
- `package.json`: Build configuration and dependencies
- `installer-config.json`: Installer-specific settings
- `src/auth/config.js`: Microsoft authentication settings
- `.env.example`: Environment variables template

### Version Management
- Current version: **1.0.0** (fixed)
- All releases use the same version number
- No automatic version incrementing

## Development Notes

### Minimal Installer Approach
The project uses a "minimal installer" strategy:
- Small initial download (~20MB)
- Java runtime downloaded automatically if needed
- Minecraft assets downloaded on first run
- Results in 98% smaller installer vs bundling everything

### Microsoft Authentication
- Uses Azure OAuth2 with captcha verification
- Requires Azure app registration
- Fallback to offline mode if authentication fails

### Cross-Platform Considerations
- Java detection works on all platforms
- Portable Java downloads from Adoptium OpenJDK
- Platform-specific native libraries handled automatically

## Troubleshooting

### Build Issues
- **Missing dependencies**: Run `npm install`
- **Platform-specific builds**: May require Docker or platform-specific tools
- **Code signing**: Requires certificates (optional for development)

### Release Issues
- **GitHub Actions failing**: Check workflow logs in Actions tab
- **Missing files**: Ensure all required files are in `dev-workspace/`
- **Permission errors**: Check GitHub repository permissions

## Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/mehediparvez/minecraft_launcher.git
   cd minecraft_launcher/dev-workspace
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Test locally**:
   ```bash
   npm start
   ```

4. **Build installer**:
   ```bash
   npm run dist
   ```

5. **Push to trigger automatic build**:
   ```bash
   git push origin main
   ```

## Links
- **Repository**: https://github.com/mehediparvez/minecraft_launcher
- **Releases**: https://github.com/mehediparvez/minecraft_launcher/releases
- **Issues**: https://github.com/mehediparvez/minecraft_launcher/issues

---

*This documentation is maintained outside the main project directory to keep the codebase clean.*
