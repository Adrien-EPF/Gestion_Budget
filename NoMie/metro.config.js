const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite on web bundles its SQLite engine (wa-sqlite) as a .wasm asset.
config.resolver.assetExts.push('wasm');

module.exports = config;
