// Test script to verify offline mode implementation
const { v3: uuidv3 } = require('uuid');
const fs = require('fs');
const path = require('path');

const NAMESPACE = uuidv3.DNS;

function testOfflineMode() {
    console.log('Testing offline mode implementation...');
    
    // Test UUID generation for offline mode
    const testUsername = 'TestPlayer';
    const generatedUUID = uuidv3(`OfflinePlayer:${testUsername}`, NAMESPACE);
    
    console.log(`Generated UUID for ${testUsername}: ${generatedUUID}`);
    
    // Test auth info creation (similar to what happens in renderer.js)
    const authInfo = {
        access_token: '',
        client_token: '',
        uuid: generatedUUID,
        name: testUsername,
        user_properties: '{}',
        meta: {
            type: 'mojang',
            demo: false,
            xuid: '',
            clientId: ''
        }
    };
    
    console.log('Generated auth info:');
    console.log(JSON.stringify(authInfo, null, 2));
    
    // Test directory structure
    console.log('\nChecking directory structure...');
    const requiredDirs = [
        './minecraft',
        './minecraft/mods',
        './minecraft/versions',
        './minecraft/versions/1.21.1-fabric',
        './minecraft/versions/1.8.9-fabric'
    ];
    
    for (const dir of requiredDirs) {
        const exists = fs.existsSync(dir);
        console.log(`${dir}: ${exists ? '✓' : '✗'}`);
        
        if (!exists) {
            try {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`  Created: ${dir}`);
            } catch (error) {
                console.log(`  Failed to create: ${dir} - ${error.message}`);
            }
        }
    }
    
    // Test version JSON files
    console.log('\nChecking version JSON files...');
    const versions = [
        { id: '1.21.1-fabric', inherits: '1.21.1' },
        { id: '1.8.9-fabric', inherits: '1.8.9' }
    ];
    
    for (const version of versions) {
        const versionPath = `./minecraft/versions/${version.id}/${version.id}.json`;
        const exists = fs.existsSync(versionPath);
        console.log(`${versionPath}: ${exists ? '✓' : '✗'}`);
        
        if (!exists) {
            try {
                const versionData = {
                    id: version.id,
                    inheritsFrom: version.inherits,
                    type: 'release',
                    time: new Date().toISOString(),
                    releaseTime: new Date().toISOString(),
                    mainClass: "net.fabricmc.loader.impl.launch.knot.KnotClient",
                    libraries: [],
                    arguments: {
                        game: [],
                        jvm: []
                    }
                };
                
                fs.writeFileSync(versionPath, JSON.stringify(versionData, null, 2));
                console.log(`  Created: ${versionPath}`);
            } catch (error) {
                console.log(`  Failed to create: ${versionPath} - ${error.message}`);
            }
        }
    }
    
    console.log('\nOffline mode test completed!');
}

if (require.main === module) {
    testOfflineMode();
}

module.exports = { testOfflineMode };
