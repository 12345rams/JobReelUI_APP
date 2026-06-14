// Polyfill os.availableParallelism for older Node.js versions (e.g. < 18.14.0)
const os = require('os');
if (typeof os.availableParallelism !== 'function') {
  os.availableParallelism = () => {
    return os.cpus().length || 1;
  };
}

const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
