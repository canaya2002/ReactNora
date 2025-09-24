const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for .cjs files
config.resolver.sourceExts.push('cjs');

// Enable hermès
config.transformer.hermesParser = true;

// Support for React Native Vector Icons
config.resolver.alias = {
  'react-native-vector-icons': '@expo/vector-icons',
};

module.exports = config;