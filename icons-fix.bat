@echo off
echo Cleaning React Native cache...
call npx react-native-clean-project

echo Cleaning Metro cache...
start /b npx react-native start --reset-cache
timeout /t 5
taskkill /f /im node.exe

echo Linking vector icons...
call npx react-native-asset

echo Rebuilding Android...
call npx react-native run-android --no-packager

REM echo Rebuilding iOS...
REM cd ios && pod install && cd ..
REM call npx react-native run-ios --no-packager

echo Done! Vector icons should now be properly linked. 