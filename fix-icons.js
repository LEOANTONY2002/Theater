// Script to fix vector icon assets
const {execSync} = require('child_process');

console.log('Linking vector icon assets...');
try {
  // Link the assets
  execSync('npx react-native-asset', {stdio: 'inherit'});
  console.log('Assets linked successfully!');

  console.log('\nYou need to rebuild your app for the changes to take effect:');
  console.log('- For Android: npx react-native run-android');
  console.log(
    '- For iOS: cd ios && pod install && cd .. && npx react-native run-ios',
  );
} catch (error) {
  console.error('Error linking assets:', error);
}
