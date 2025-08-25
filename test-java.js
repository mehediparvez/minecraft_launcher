// Test Java detection
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function testJavaDetection() {
    console.log('Testing Java detection...\n');
    
    // Test system Java
    console.log('1. Testing system Java detection:');
    try {
        const { stdout } = await execAsync('which java');
        const javaPath = stdout.trim();
        console.log(`✅ Found system Java at: ${javaPath}`);
        
        const { stdout: versionOutput } = await execAsync(`"${javaPath}" -version 2>&1`);
        console.log(`Version: ${versionOutput.split('\n')[0]}`);
    } catch (e) {
        console.log(`❌ System Java not found: ${e.message}`);
    }
    
    console.log('\n2. Testing bundled Java detection:');
    const javaLocations = [
        path.join(process.cwd(), 'java', 'java21', 'bin', 'java'),
        path.join(process.cwd(), 'java', 'java8', 'bin', 'java'),
    ];
    
    for (const javaPath of javaLocations) {
        if (fs.existsSync(javaPath)) {
            console.log(`✅ Found bundled Java at: ${javaPath}`);
            try {
                const { stdout } = await execAsync(`"${javaPath}" -version 2>&1`);
                console.log(`Version: ${stdout.split('\n')[0]}`);
            } catch (e) {
                console.log(`❌ Java executable error: ${e.message}`);
            }
        } else {
            console.log(`❌ No bundled Java at: ${javaPath}`);
        }
    }
    
    console.log('\n3. Minecraft launcher compatibility test:');
    // Simulate what the launcher does
    try {
        const { stdout } = await execAsync('java -version 2>&1');
        console.log('✅ Java is available for Minecraft launcher');
        console.log(`System Java output: ${stdout.split('\n')[0]}`);
    } catch (e) {
        console.log(`❌ Java not available for launcher: ${e.message}`);
    }
}

testJavaDetection().catch(console.error);
