#!/bin/bash

# Clean the React Native cache
echo "Cleaning React Native cache..."
npx react-native-clean-project

# Reset Metro bundler cache
echo "Cleaning Metro cache..."
npx react-native start --reset-cache &
# Wait a bit for the packager to start up
sleep 5
# Kill the packager
kill $!

# Link the vector icons package
echo "Linking vector icons..."
npx react-native-asset

# Rebuild for Android (if you want to rebuild only Android)
echo "Rebuilding Android..."
npx react-native run-android --no-packager

# Rebuild for iOS (uncomment if you want to rebuild iOS)
# echo "Rebuilding iOS..."
# cd ios && pod install && cd ..
# npx react-native run-ios --no-packager

echo "Done! Vector icons should now be properly linked." 