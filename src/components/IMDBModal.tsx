import React, {useState} from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Linking,
} from 'react-native';
import {WebView} from 'react-native-webview';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors, spacing, borderRadius, typography} from '../styles/theme';
import FastImage from 'react-native-fast-image';
import {useResponsive} from '../hooks/useResponsive';
import {MaybeBlurView} from './MaybeBlurView';
import {GradientSpinner} from './GradientSpinner';
import {BlurView} from '@react-native-community/blur';
import {BlurPreference} from '../store/blurPreference';

interface IMDBModalProps {
  visible: boolean;
  onClose: () => void;
  imdbId?: string;
  title?: string;
  searchQuery?: string; // For TV shows without direct IMDB ID
  type?: 'imdb' | 'rotten_tomatoes'; // Type of rating service
}

export const IMDBModal: React.FC<IMDBModalProps> = ({
  visible,
  onClose,
  imdbId,
  title,
  searchQuery,
  type = 'imdb',
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const {isTablet} = useResponsive();
  const themeMode = BlurPreference.getMode();
  const isSolid = themeMode === 'normal';

  if (!imdbId && !searchQuery) return null;

  // Construct URL based on type
  const serviceUrl = (() => {
    if (type === 'rotten_tomatoes') {
      // Rotten Tomatoes search URL
      return `https://www.rottentomatoes.com/search?search=${encodeURIComponent(
        searchQuery || title || '',
      )}`;
    } else {
      // IMDB URL - use direct ID if available, otherwise search
      return imdbId
        ? `https://www.imdb.com/title/${imdbId}/`
        : `https://www.imdb.com/find?q=${encodeURIComponent(
            searchQuery || '',
          )}&s=tt&ttype=tv`;
    }
  })();

  // Get logo and service name based on type
  const logoSource =
    type === 'rotten_tomatoes'
      ? require('../assets/tomato.png')
      : require('../assets/imdb.webp');
  const serviceName = type === 'rotten_tomatoes' ? 'Rotten Tomatoes' : 'IMDB';

  // Open URL in external browser
  const openInBrowser = async () => {
    try {
      const supported = await Linking.canOpenURL(serviceUrl);
      if (supported) {
        await Linking.openURL(serviceUrl);
      }
    } catch (error) {
      console.error('Error opening URL:', error);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      margin: isTablet ? spacing.xxl : spacing.md,
    },
    header: {
      padding: spacing.md,
      position: 'relative',
      marginVertical: spacing.md,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: colors.modal.content,
      backgroundColor: isSolid ? 'black' : 'transparent',
    },
    blurView: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 0,
      borderRadius: borderRadius.xl,
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 1,
    },
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    icon: {
      marginRight: spacing.sm,
    },
    headerTitle: {
      ...typography.h3,
      color: colors.text.primary,
      flex: 1,
      marginHorizontal: spacing.sm,
    },
    closeButton: {
      padding: isTablet ? 12 : 8,
      backgroundColor: colors.modal.blur,
      borderRadius: borderRadius.round,
      zIndex: 1,
    },
    externalButton: {
      padding: isTablet ? 12 : 8,
      backgroundColor: colors.modal.blur,
      borderRadius: borderRadius.round,
      zIndex: 1,
    },
    webviewContainer: {
      flex: 1,
      position: 'relative',
      borderRadius: borderRadius.xl,
      overflow: 'hidden',
      zIndex: 1,
      backgroundColor: colors.background.primary,
      borderWidth: 1,
      borderColor: colors.modal.content,
    },
    webview: {
      flex: 1,
      borderRadius: borderRadius.xl,
    },
    loadingContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background.primary,
      flex: 1,
      width: '100%',
      height: '100%',
      zIndex: 10,
    },
    loadingText: {
      ...typography.body1,
      color: colors.text.secondary,
      marginTop: spacing.md,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          {!isSolid && (
            <BlurView
              blurType="dark"
              blurAmount={10}
              overlayColor={'rgba(0, 0, 0, 0.5)'}
              style={styles.blurView}
            />
          )}
          <View style={styles.headerContent}>
            <View style={styles.titleContainer}>
              <FastImage
                source={logoSource}
                resizeMode="contain"
                style={{width: 40, height: 40, zIndex: 100}}
              />
              <Text style={styles.headerTitle} numberOfLines={1}>
                {title || serviceName}
              </Text>
            </View>
            <View style={{flexDirection: 'row', gap: spacing.sm}}>
              <TouchableOpacity
                onPress={openInBrowser}
                style={styles.externalButton}>
                <Icon
                  name="open-outline"
                  size={isTablet ? 24 : 20}
                  color={colors.text.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Icon
                  name="close"
                  size={isTablet ? 24 : 20}
                  color={colors.text.primary}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.webviewContainer}>
          {isLoading && (
            <View style={styles.loadingContainer}>
              <GradientSpinner size={40} />
            </View>
          )}
          <WebView
            source={{uri: serviceUrl}}
            style={styles.webview}
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
            onError={() => setIsLoading(false)}
            startInLoadingState
            javaScriptEnabled
            domStorageEnabled
            allowsBackForwardNavigationGestures
            forceDarkOn
          />
        </View>
      </View>
    </Modal>
  );
};
