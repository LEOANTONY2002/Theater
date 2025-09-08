import React, {useRef, useEffect, useState} from 'react';
import {
  Alert,
  StyleSheet,
  View,
  ActivityIndicator,
  Text,
  TouchableOpacity,
} from 'react-native';
import {WebView} from 'react-native-webview';
import {colors} from '../styles/theme';
import {GradientSpinner} from './GradientSpinner';

const Cinema = ({
  id,
  type,
  season,
  episode,
  currentServer = 1,
}: {
  id: string;
  type: string;
  season?: number;
  episode?: number;
  currentServer?: number;
}) => {
  const webviewRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('Loading...');

  const servers = [
    type === 'movie'
      ? `https://vidfast.pro/movie/${id}`
      : `https://vidfast.pro/tv/${id}/${season}/${episode}`,
    type === 'movie'
      ? `https://vidsrc.xyz/embed/movie?tmdb=${id}`
      : `https://vidsrc.xyz/embed/tv?tmdb=${id}?season=${season}&episode=${episode}`,
    type === 'movie'
      ? `https://player.videasy.net/movie/${id}`
      : `https://player.videasy.net/tv/${id}/${season}/${episode}`,
    type === 'movie'
      ? `https://vidfast.pro/movie/${id}`
      : `https://vidfast.pro/tv/${id}/${season}/${episode}`,
    type === 'movie'
      ? `https://111movies.com/movie/${id}`
      : `https://111movies.com/tv/${id}/${season}/${episode}`,
  ];

  const initialUrl = servers[currentServer - 1];

  const handleShouldStartLoadWithRequest = (request: {url: string}) => {
    return false;
  };

  const handleLoadStart = () => {
    setIsLoading(true);
    setLoadingText('Loading content...');
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
    // Reapply fit-to-screen CSS when loading ends
  };

  const handleError = (syntheticEvent: any) => {
    setIsLoading(false);
    setLoadingText('Failed to load content');
  };

  const handleHttpError = (syntheticEvent: any) => {
    setIsLoading(false);
    setLoadingText('Connection error');
  };

  // Reset loading state when server changes
  useEffect(() => {
    setIsLoading(true);
    setLoadingText('Switching server...');
  }, [currentServer]);

  useEffect(() => {
    return () => {
      // Cleanup: clear the ref to help GC and stop loading if possible
      if (webviewRef.current) {
        try {
          webviewRef.current.stopLoading?.();
        } catch (e) {}
        webviewRef.current = null;
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        source={{uri: initialUrl}}
        style={{flex: 1}}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo={true}
        setSupportMultipleWindows={false}
        javaScriptCanOpenWindowsAutomatically={false}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        onHttpError={handleHttpError}
        scalesPageToFit={true}
        bounces={true}
        scrollEnabled={true}
        // renderToHardwareTextureAndroid={true}
        // androidLayerType="hardware"
      />

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <GradientSpinner
              size={30}
              style={{
                marginVertical: 50,
                alignItems: 'center',
                alignSelf: 'center',
              }}
              color={colors.modal.activeBorder}
            />
            <Text style={styles.loadingText}>{loadingText}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: 'rgb(0, 0, 0)',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    width: '100%',
    height: '100%',
  },
  loadingText: {
    color: colors.text.tertiary,
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
  },
  fitToScreenButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 12,
    borderRadius: 25,
    zIndex: 1000,
  },
  fitToScreenButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default Cinema;
