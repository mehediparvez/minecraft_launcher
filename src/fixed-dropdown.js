function setupVersionDropdown() {
  console.log('🔍 Setting up version dropdown...');
  
  const launchArrow = document.getElementById('launch-arrow');
  const launchMenu = document.getElementById('launch-menu');
  const launchButton = document.getElementById('launch');
  const menuItems = document.querySelectorAll('.launch-menu-item');

  // Debug logging
  console.log('Dropdown elements check:', {
    launchArrow: !!launchArrow,
    launchMenu: !!launchMenu,
    launchButton: !!launchButton,
    menuItemsCount: menuItems.length
  });

  if (!launchArrow || !launchMenu || !launchButton) {
    console.error('❌ Missing essential dropdown elements:', {
      launchArrow: !!launchArrow,
      launchMenu: !!launchMenu,
      launchButton: !!launchButton
    });
    return;
  }
  
  console.log('✅ All dropdown elements found, adding event listeners...');

  launchArrow.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = launchMenu.classList.contains('show');
    
    console.log('Launch arrow clicked, menu currently visible:', isVisible);
    
    if (isVisible) {
      launchMenu.classList.remove('show');
      launchArrow.classList.remove('rotated');
      console.log('Menu hidden');
    } else {
      launchMenu.classList.add('show');
      launchArrow.classList.add('rotated');
      console.log('Menu shown');
    }
  });

  menuItems.forEach(item => {
    item.addEventListener('click', function() {
      const version = this.getAttribute('data-version');
      const versionType = this.getAttribute('data-type') || 'release';
      const customVersion = this.getAttribute('data-custom');
      const displayName = this.textContent.trim();
      
      console.log('Menu item clicked:', { version, versionType, customVersion, displayName });
      
      // Cambiar mods antes de actualizar la versión seleccionada
      const statusElement = document.getElementById("status");
      if (statusElement) {
        statusElement.textContent = 'Cambiando mods...';
      }
      
      const success = switchModsForVersion(version);
      
      selectedVersion = {
        number: version,
        display: displayName,
        type: versionType,
        custom: customVersion
      };
      
      launchButton.textContent = `LAUNCH ${displayName}`;
      
      launchMenu.classList.remove('show');
      launchArrow.classList.remove('rotated');
      
      // Actualizar lista de mods si estamos en la pestaña de mods
      const modsContent = document.getElementById('mods-content');
      if (modsContent && modsContent.classList.contains('active')) {
        refreshModList();
      }
      
      if (statusElement) {
        if (success) {
          statusElement.textContent = currentUserNick ? 
            `Listo para jugar - ${currentUserNick}` : 
            'Inicia sesión para jugar';
        } else {
          statusElement.textContent = 'Error al cambiar mods';
        }
      }
      
      console.log('Version changed to:', selectedVersion);
    });
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', function(e) {
    if (!launchArrow.contains(e.target) && !launchMenu.contains(e.target)) {
      launchMenu.classList.remove('show');
      launchArrow.classList.remove('rotated');
    }
  });
  
  console.log('✅ Version dropdown setup complete');
}
