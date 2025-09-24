module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // React Native Reanimated plugin debe ser el último
      'react-native-reanimated/plugin',
    ],
  };
};