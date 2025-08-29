# Cross-Platform Testing Guide for Void Client

## 🎯 Testing Strategy Overview

Your Void Client with captcha functionality needs to be tested across Windows, macOS, and Linux to ensure production readiness. Here's a comprehensive testing approach.

## 🔧 **Method 1: Build & Distribute for Testing**

### 1. Build for All Platforms

```bash
# Build for all platforms from your Linux machine
npm run dist:win     # Windows (creates .exe installer)
npm run dist:mac     # macOS (creates .dmg file)  
npm run dist:linux   # Linux (creates .AppImage and .deb)
```

### 2. Distribute Test Builds

Share the built files with testers on each platform:

```
dist/
├── Void Client Setup 1.0.0.exe           # Windows installer
├── Void Client-1.0.0.dmg                 # macOS disk image
├── Void Client-1.0.0.AppImage             # Linux AppImage
└── void-client_1.0.0_amd64.deb           # Linux Debian package
```

## 🌐 **Method 2: Cloud Testing Services**

### GitHub Actions CI/CD (Recommended)

Create `.github/workflows/test.yml`:

```yaml
name: Cross-Platform Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: [18, 20]
    
    steps:
    - uses: actions/checkout@v4
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Test captcha functionality
      run: npm run test-captcha
    
    - name: Build for platform
      run: npm run dist
```

### Browser Stack / Sauce Labs

For more comprehensive testing with real devices and browsers.

## 🖥️ **Method 3: Virtual Machines**

### Set Up VMs for Testing

1. **Windows Testing VM**
   ```bash
   # Download Windows 10/11 VM from Microsoft
   # Or use VirtualBox/VMware with Windows ISO
   ```

2. **macOS Testing** (if you have Mac hardware)
   ```bash
   # Use macOS VM or physical Mac device
   # Install Node.js and test directly
   ```

3. **Linux Testing** (Multiple Distros)
   ```bash
   # Test on Ubuntu, Fedora, Arch, etc.
   # Ensure compatibility across distributions
   ```

## 📱 **Method 4: Cloud Development Environments**

### GitPod / CodeSpaces
```yaml
# .gitpod.yml
tasks:
  - name: Setup
    init: npm install
    command: npm start

ports:
  - port: 3000
    onOpen: open-preview
```

### Repl.it / CodeSandbox
Upload your project and test in browser-based environments.

## 🧪 **Testing Checklist for Each Platform**

### ✅ **Core Functionality Tests**

#### Authentication Flow
- [ ] **Microsoft login** - OAuth popup works
- [ ] **Captcha verification** - Window appears and functions
- [ ] **Offline mode** - Username input and validation
- [ ] **Token persistence** - Keytar works on each OS
- [ ] **Auto-refresh** - Silent token renewal

#### UI/UX Tests  
- [ ] **Window management** - Minimize, close buttons work
- [ ] **Responsive design** - UI scales properly
- [ ] **Animations** - Smooth transitions and effects
- [ ] **Drag & drop** - Mod installation works
- [ ] **File dialogs** - Native file pickers function

#### Game Launch Tests
- [ ] **Java detection** - Bundled Java works
- [ ] **Version switching** - 1.8.9 and 1.21.1 modes
- [ ] **Mod loading** - Version-specific mods load
- [ ] **Minecraft launch** - Game starts successfully
- [ ] **Error handling** - Graceful failure modes

### 🔒 **Security Tests**

#### Captcha Functionality
- [ ] **Code generation** - Random 6-character codes
- [ ] **Attempt limiting** - Max 3 attempts enforced
- [ ] **Error messages** - Clear feedback to users
- [ ] **Window cleanup** - Proper resource disposal
- [ ] **Cancellation** - Graceful auth cancellation

#### Credential Security
- [ ] **Keytar integration** - OS credential storage works
- [ ] **Token encryption** - No plaintext storage
- [ ] **Memory cleanup** - Sensitive data not leaked
- [ ] **Network security** - HTTPS enforced

### ⚡ **Performance Tests**

- [ ] **Startup time** - Fast application launch
- [ ] **Memory usage** - Reasonable RAM consumption
- [ ] **Network efficiency** - Minimal bandwidth usage
- [ ] **CPU usage** - Low system impact
- [ ] **Storage footprint** - Reasonable disk usage

## 🚀 **Automated Testing Setup**

### Create Test Scripts

```javascript
// test/auth.test.js
const { Application } = require('spectron');
const electronPath = require('electron');
const path = require('path');

describe('Authentication Tests', () => {
  let app;
  
  beforeEach(async () => {
    app = new Application({
      path: electronPath,
      args: [path.join(__dirname, '..')]
    });
    await app.start();
  });
  
  afterEach(async () => {
    if (app && app.isRunning()) {
      await app.stop();
    }
  });
  
  it('should open login window', async () => {
    const windowCount = await app.client.getWindowCount();
    expect(windowCount).toBe(1);
  });
  
  it('should show captcha after auth', async () => {
    // Test captcha functionality
    await app.client.click('#msftLoginBtn');
    // Wait for captcha window
    await app.client.waitForExist('#captchaDisplay', 10000);
    const captchaVisible = await app.client.isVisible('#captchaDisplay');
    expect(captchaVisible).toBe(true);
  });
});
```

### Add to package.json
```json
{
  "scripts": {
    "test": "jest",
    "test:e2e": "jest test/e2e/",
    "test:auth": "jest test/auth.test.js",
    "test:captcha": "electron test-captcha.js",
    "test:all": "npm run test && npm run test:e2e && npm run test:captcha"
  }
}
```

## 🌍 **Platform-Specific Considerations**

### Windows Testing
```powershell
# Install on Windows
.\VoidClientSetup.exe

# Test Windows-specific features
- Native notifications
- Windows Store compatibility
- Antivirus interaction
- UAC prompts
- File associations
```

### macOS Testing  
```bash
# Install on macOS
open "Void Client.dmg"
sudo spctl --assess --verbose "Void Client.app"

# Test macOS-specific features
- Gatekeeper compatibility
- Code signing verification
- Keychain integration
- App Store guidelines
- macOS permissions
```

### Linux Testing
```bash
# Test multiple package formats
sudo dpkg -i void-client_1.0.0_amd64.deb    # Debian/Ubuntu
./Void-Client-1.0.0.AppImage                # Universal Linux
sudo snap install void-client.snap          # Snap package
flatpak install void-client.flatpak         # Flatpak

# Test Linux-specific features
- Desktop integration
- libsecret keyring
- Different window managers
- Various distributions
```

## 📊 **Testing Matrix**

| Platform | Node.js | Electron | Auth | Captcha | Launch | Status |
|----------|---------|----------|------|---------|---------|---------|
| Windows 10 | 18.x | 29.x | ✅ | ✅ | ✅ | ✅ |
| Windows 11 | 20.x | 29.x | ✅ | ✅ | ✅ | ✅ |
| macOS 12+ | 18.x | 29.x | ✅ | ✅ | ✅ | ✅ |
| Ubuntu 22.04 | 18.x | 29.x | ✅ | ✅ | ✅ | ✅ |
| Fedora 38 | 20.x | 29.x | ✅ | ✅ | ✅ | ✅ |

## 🔧 **Quick Test Commands**

### Local Testing
```bash
# Test all major functions
npm run dev -- --debug          # Development mode
npm run test-captcha            # Captcha standalone test
npm run dist                   # Build for current platform
npm run dist:all              # Build for all platforms
```

### Debugging
```bash
# Enable detailed logging
DEBUG=* npm start              # Full debug output
npm run dev -- --inspect      # Chrome DevTools debugging
```

## 📝 **Test Report Template**

```markdown
## Test Report - Void Client v1.0.0

### Platform: [Windows/macOS/Linux]
### Date: [Date]
### Tester: [Name]

#### ✅ Passed Tests
- Authentication flow
- Captcha verification  
- Offline mode
- Game launch

#### ❌ Failed Tests
- [List any failures]

#### 🐛 Issues Found
- [Describe any bugs]

#### 💡 Recommendations
- [Suggest improvements]
```

## 🚀 **Production Deployment Checklist**

### Before Release
- [ ] All platforms tested successfully
- [ ] Captcha works on all OS
- [ ] Code signing certificates obtained
- [ ] App store submissions prepared
- [ ] Documentation updated
- [ ] Support channels ready

### Distribution Channels
- [ ] Direct download from website
- [ ] Microsoft Store (Windows)
- [ ] Mac App Store (macOS)
- [ ] Snap Store (Linux)
- [ ] Flathub (Linux)
- [ ] AUR (Arch Linux)

## 📞 **Getting Help**

### Community Testing
- Discord server for beta testers
- GitHub issues for bug reports
- Reddit communities for feedback
- Gaming forums for user testing

### Professional Services
- Electron testing services
- Cross-platform QA companies
- Minecraft community testing groups

---

## 🎯 **Next Steps**

1. **Start with local builds** using `npm run dist:*`
2. **Set up GitHub Actions** for automated testing
3. **Recruit beta testers** from each platform
4. **Create feedback collection system**
5. **Plan phased rollout** (beta → stable)

This comprehensive testing approach ensures your Void Client with captcha functionality works flawlessly across all target platforms! 🚀
