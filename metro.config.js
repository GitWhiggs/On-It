// Bundler settings.
// The only change from Expo's defaults: the WEB version swaps phone-only packages for small
// stand-ins (in web-stubs/) so the app can open in a browser for testing.
// Phone builds are not affected.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const WEB_STAND_INS = {
  '@stripe/stripe-react-native': path.join(__dirname, 'web-stubs', 'stripe.js'),
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && WEB_STAND_INS[moduleName]) {
    return { type: 'sourceFile', filePath: WEB_STAND_INS[moduleName] };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
