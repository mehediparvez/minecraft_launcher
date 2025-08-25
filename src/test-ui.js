// Simple test to check if the DOM elements exist and can be clicked
function testLaunchElements() {
    console.log('=== Testing Launch Elements ===');
    
    // Test launch button
    const launchBtn = document.getElementById('launch');
    console.log('Launch button:', launchBtn ? '✓ Found' : '✗ Not found');
    if (launchBtn) {
        console.log('  Text:', launchBtn.textContent);
        console.log('  Classes:', launchBtn.className);
        console.log('  Display:', window.getComputedStyle(launchBtn).display);
        console.log('  Visibility:', window.getComputedStyle(launchBtn).visibility);
        console.log('  Pointer events:', window.getComputedStyle(launchBtn).pointerEvents);
    }
    
    // Test dropdown arrow
    const dropdownArrow = document.getElementById('launch-arrow');
    console.log('Dropdown arrow:', dropdownArrow ? '✓ Found' : '✗ Not found');
    if (dropdownArrow) {
        console.log('  Text:', dropdownArrow.textContent);
        console.log('  Classes:', dropdownArrow.className);
    }
    
    // Test dropdown menu
    const dropdownMenu = document.getElementById('launch-menu');
    console.log('Dropdown menu:', dropdownMenu ? '✓ Found' : '✗ Not found');
    if (dropdownMenu) {
        console.log('  Classes:', dropdownMenu.className);
        console.log('  Children count:', dropdownMenu.children.length);
    }
    
    // Test menu items
    const menuItems = document.querySelectorAll('.launch-menu-item');
    console.log('Menu items:', menuItems.length, 'found');
    menuItems.forEach((item, index) => {
        console.log(`  Item ${index}:`, item.textContent, 'data-version:', item.getAttribute('data-version'));
    });
    
    console.log('=== Test Complete ===');
}

// Add simple click handlers for testing
function addSimpleClickHandlers() {
    console.log('Adding simple click handlers...');
    
    const launchBtn = document.getElementById('launch');
    if (launchBtn) {
        launchBtn.addEventListener('click', () => {
            console.log('🚀 LAUNCH BUTTON CLICKED! (Simple handler)');
            alert('Launch button clicked!');
        });
        console.log('✅ Launch button click handler added');
    }
    
    const dropdownArrow = document.getElementById('launch-arrow');
    if (dropdownArrow) {
        dropdownArrow.addEventListener('click', () => {
            console.log('📋 DROPDOWN ARROW CLICKED! (Simple handler)');
            alert('Dropdown arrow clicked!');
        });
        console.log('✅ Dropdown arrow click handler added');
    }
}

// Run tests when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            testLaunchElements();
            addSimpleClickHandlers();
        }, 1000);
    });
} else {
    setTimeout(() => {
        testLaunchElements();
        addSimpleClickHandlers();
    }, 1000);
}
