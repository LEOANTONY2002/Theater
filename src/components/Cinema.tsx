import React, {useRef, useEffect, useState, useMemo, useCallback} from 'react';
import {
  Alert,
  StyleSheet,
  View,
  ActivityIndicator,
  Text,
  TouchableOpacity,
} from 'react-native';
import {WebView} from 'react-native-webview';
import {borderRadius, colors} from '../styles/theme';
import {GradientSpinner} from './GradientSpinner';
import {getServerUrl} from '../config/servers';

const Cinema = React.memo(
  ({
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
    const [webViewKey, setWebViewKey] = useState(0);

    // Memoize URL to prevent recalculation on every render
    const currentUrl = useMemo(() => {
      return (
        getServerUrl(currentServer, {
          id,
          type: type as 'movie' | 'tv',
          season,
          episode,
        }) || ''
      );
    }, [currentServer, id, type, season, episode]);

    const handleShouldStartLoadWithRequest = useCallback(
      (request: {url: string}) => {
        // Allow the initial URL to load
        if (!currentUrl) return true;

        // Extract domain from initial URL
        try {
          const initialDomain = new URL(currentUrl).hostname;
          const requestDomain = new URL(request.url).hostname;

          // Only allow navigation within the same domain
          // Block any external redirects (ads, popups, etc.)
          return requestDomain === initialDomain;
        } catch (e) {
          // If URL parsing fails, block it
          return false;
        }
      },
      [currentUrl],
    );

    const handleLoadStart = useCallback(() => {
      setIsLoading(true);
      setLoadingText('Loading content...');
    }, []);

    const handleLoadEnd = useCallback(() => {
      setIsLoading(false);
      // Reapply fit-to-screen CSS when loading ends
    }, []);

    const handleError = useCallback((syntheticEvent: any) => {
      setIsLoading(false);
      setLoadingText('Failed to load content');
    }, []);

    const handleHttpError = useCallback((syntheticEvent: any) => {
      setIsLoading(false);
      setLoadingText('Connection error');
    }, []);

    // Only remount WebView when server or content changes
    useEffect(() => {
      setIsLoading(true);
      setLoadingText('Loading content...');
      setWebViewKey(prev => prev + 1);
    }, [currentServer, id, type, season, episode]);

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

    const INJECTED_JAVASCRIPT = `
      (function() {
        window.open = function() { return null; };
        const style = document.createElement('style');
        style.innerHTML = '.ad, .ads, .popup, [id^=ad-], [class^=ad-], [class*="popup"], [class*="modal"] { display: none !important; }';
        document.head.appendChild(style);
      })();
      true;
    `;

    return (
      <View style={styles.container}>
        <WebView
          key={webViewKey}
          ref={webviewRef}
          source={{uri: currentUrl}}
          style={{flex: 1, backgroundColor: '#000000'}}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mediaPlaybackRequiresUserAction={false}
          allowsFullscreenVideo={true}
          allowsInlineMediaPlayback={true}
          setSupportMultipleWindows={false}
          javaScriptCanOpenWindowsAutomatically={false}
          onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
          onLoadEnd={handleLoadEnd}
          onError={handleError}
          scalesPageToFit={false}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled={false}
          overScrollMode="never"
          injectedJavaScript={INJECTED_JAVASCRIPT}
          userAgent="Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
          androidLayerType="hardware"
          incognito={true}
          thirdPartyCookiesEnabled={false}
          sharedCookiesEnabled={false}
          cacheEnabled={false}
        />

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <GradientSpinner
                size={30}
                style={{
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
  },
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
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
    fontFamily: 'Inter_18pt-Regular',
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
