// Test launch button state
console.log('=== Testing Launch Button Prerequisites ===');

// Simulate the state variables
let currentUserNick = ''; // This would be set when user logs in
let selectedVersion = {
  number: "1.21.1",
  display: "1.21.1 Fabric", 
  type: "release",
  custom: "1.21.1-fabric"
};

console.log('1. Checking currentUserNick:', currentUserNick || 'EMPTY - This is the problem!');
console.log('2. Checking selectedVersion:', JSON.stringify(selectedVersion));

// Simulate what happens in the click handler
if (!currentUserNick) {
  console.log('❌ LAUNCH BLOCKED: Nickname required - user must login first');
  console.log('   The button will show "Nickname requerido - Inicia sesión primero"');
  console.log('   And will flash red border');
} else {
  console.log('✅ Nickname OK, would proceed to launch game');
}

console.log('\n=== Solutions ===');
console.log('1. Login with Microsoft account (online mode)');
console.log('2. Or use offline mode - need to set currentUserNick manually');
console.log('3. Check if there\'s an offline login option in the UI');

console.log('\n=== Testing Offline User Setup ===');
// Simulate offline login
currentUserNick = 'TestPlayer';
console.log('Setting offline user:', currentUserNick);

if (!currentUserNick) {
  console.log('❌ LAUNCH BLOCKED: Still no nickname');
} else {
  console.log('✅ Nickname OK! Launch would proceed with:');
  console.log('   - User:', currentUserNick);
  console.log('   - Version:', selectedVersion.display);
  console.log('   - Java: System Java (/usr/bin/java)');
  console.log('   - Mode: Offline (since no Microsoft auth)');
}
