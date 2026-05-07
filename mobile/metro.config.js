const { getDefaultConfig } = require('expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

// Spread the entire resolver into a plain object to avoid getter/freeze issues
// in @expo/metro-config, then append 'db' so Metro registers cards.db as an asset.
const defaultAssetExts = Array.isArray(defaultConfig.resolver?.assetExts)
  ? defaultConfig.resolver.assetExts
  : [];

module.exports = {
  ...defaultConfig,
  resolver: {
    ...(defaultConfig.resolver || {}),
    assetExts: [...defaultAssetExts, 'db'],
  },
};
