// Script to fix vector icon assets
const {execSync} = require('child_process');

try {
  // Link the assets
  execSync('npx react-native-asset', {stdio: 'inherit'});
} catch (error) {
  console.error('Error linking assets:', error);
}
