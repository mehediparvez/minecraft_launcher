/**
 * Auth Module Index
 * Exports all authentication-related modules
 */

const minecraftAuth = require('./minecraftAuth');
const launcherIntegration = require('./launcherIntegration');
const config = require('./config');

module.exports = {
    minecraftAuth,
    launcherIntegration,
    config
};
