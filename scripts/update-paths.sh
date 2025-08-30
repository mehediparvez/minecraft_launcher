#!/bin/bash

# Script to update path references in renderer.js

echo "Updating path references in renderer.js..."

# Create a backup
cp /home/mhpcoder/projects/clients/Issac/src/renderer.js /home/mhpcoder/projects/clients/Issac/src/renderer.js.backup

# Use sed to replace path references
sed -i "s|'\\./minecraft/mods'|appPaths.mods|g" /home/mhpcoder/projects/clients/Issac/src/renderer.js
sed -i "s|\"\\./minecraft/mods\"|appPaths.mods|g" /home/mhpcoder/projects/clients/Issac/src/renderer.js
sed -i "s|'\\./minecraft/launcher_config\\.json'|appPaths.launcherConfig|g" /home/mhpcoder/projects/clients/Issac/src/renderer.js
sed -i "s|\"\\./minecraft/launcher_config\\.json\"|appPaths.launcherConfig|g" /home/mhpcoder/projects/clients/Issac/src/renderer.js
sed -i "s|'\\./minecraft'|appPaths.minecraft|g" /home/mhpcoder/projects/clients/Issac/src/renderer.js
sed -i "s|\"\\./minecraft\"|appPaths.minecraft|g" /home/mhpcoder/projects/clients/Issac/src/renderer.js

# Update path.join calls that still use ./minecraft
sed -i "s|path\\.join('\\./minecraft/mods'|path.join(appPaths.mods|g" /home/mhpcoder/projects/clients/Issac/src/renderer.js
sed -i "s|path\\.join(\"\\./minecraft/mods\"|path.join(appPaths.mods|g" /home/mhpcoder/projects/clients/Issac/src/renderer.js

echo "Path references updated!"
echo "Backup saved as renderer.js.backup"
