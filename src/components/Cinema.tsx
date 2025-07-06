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
      ? `https://111movies.com/movie/${id}`
      : `https://111movies.com/tv/${id}/${season}/${episode}`,
    type === 'movie'
      ? `https://player.videasy.net/movie/${id}`
      : `https://player.videasy.net/tv/${id}/${season}/${episode}`,
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
    if (webviewRef.current) {
      webviewRef.current.injectJavaScript(`
        (function() {
          try {
            const videos = document.querySelectorAll('video, iframe, embed, object');
            const newFit = 'cover';
            
            videos.forEach(video => {
              video.style.objectFit = newFit;
              video.style.position = 'fixed';
              video.style.top = '0';
              video.style.left = '0';
              video.style.width = '100vw';
              video.style.height = '100vh';
              video.style.margin = '0';
              video.style.padding = '0';
              video.style.border = 'none';
              video.style.background = '#000';
            });
            
            // Also apply to containers
            const containers = document.querySelectorAll('.video-container, .player-container, [class*="video"], [class*="player"]');
            containers.forEach(container => {
              container.style.position = 'fixed';
              container.style.top = '0';
              container.style.left = '0';
              container.style.width = '100vw';
              container.style.height = '100vh';
              container.style.margin = '0';
              container.style.padding = '0';
            });
          } catch(e) {
            console.log('Reapply CSS failed:', e);
          }
        })();
      `);
    }
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

  // Reapply CSS after server changes with delays
  useEffect(() => {
    if (!isLoading) {
      // Apply immediately
      if (webviewRef.current) {
        webviewRef.current.injectJavaScript(`
          (function() {
            try {
              const videos = document.querySelectorAll('video, iframe, embed, object');
              const newFit = 'cover';
              
              videos.forEach(video => {
                video.style.objectFit = newFit;
                video.style.position = 'fixed';
                video.style.top = '0';
                video.style.left = '0';
                video.style.width = '100vw';
                video.style.height = '100vh';
                video.style.margin = '0';
                video.style.padding = '0';
                video.style.border = 'none';
                video.style.background = '#000';
              });
              
              const containers = document.querySelectorAll('.video-container, .player-container, [class*="video"], [class*="player"]');
              containers.forEach(container => {
                container.style.position = 'fixed';
                container.style.top = '0';
                container.style.left = '0';
                container.style.width = '100vw';
                container.style.height = '100vh';
                container.style.margin = '0';
                container.style.padding = '0';
              });
            } catch(e) {
              console.log('Delayed CSS reapply failed:', e);
            }
          })();
        `);
      }

      // Apply again after delays to catch dynamic content
      const timer1 = setTimeout(() => {
        if (webviewRef.current) {
          webviewRef.current.injectJavaScript(`
            (function() {
              try {
                const videos = document.querySelectorAll('video, iframe, embed, object');
                const newFit = 'cover';
                
                videos.forEach(video => {
                  video.style.objectFit = newFit;
                  video.style.position = 'fixed';
                  video.style.top = '0';
                  video.style.left = '0';
                  video.style.width = '100vw';
                  video.style.height = '100vh';
                  video.style.margin = '0';
                  video.style.padding = '0';
                  video.style.border = 'none';
                  video.style.background = '#000';
                });
              } catch(e) {
                console.log('Delayed CSS reapply 2 failed:', e);
              }
            })();
          `);
        }
      }, 1000);

      const timer2 = setTimeout(() => {
        if (webviewRef.current) {
          webviewRef.current.injectJavaScript(`
            (function() {
              try {
                const videos = document.querySelectorAll('video, iframe, embed, object');
                const newFit = 'cover';
                
                videos.forEach(video => {
                  video.style.objectFit = newFit;
                  video.style.position = 'fixed';
                  video.style.top = '0';
                  video.style.left = '0';
                  video.style.width = '100vw';
                  video.style.height = '100vh';
                  video.style.margin = '0';
                  video.style.padding = '0';
                  video.style.border = 'none';
                  video.style.background = '#000';
                });
              } catch(e) {
                console.log('Delayed CSS reapply 3 failed:', e);
              }
            })();
          `);
        }
      }, 2000);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [isLoading]);

  const injectedJS = `
    (function() {
      // Add viewport meta tag for proper scaling and zoom
      let viewport = document.querySelector('meta[name="viewport"]');
      if (!viewport) {
        viewport = document.createElement('meta');
        viewport.name = 'viewport';
        document.head.appendChild(viewport);
      }
      viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=3.0, minimum-scale=1.0, user-scalable=yes';
      
      // Basic CSS for fullscreen video with proper fit
      const style = document.createElement('style');
      style.textContent = '
        body {
          margin: 0 !important;
          padding: 0 !important;
          background: #000 !important;
          overflow: hidden !important;
        }
        iframe, video, embed, object {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          margin: 0 !important;
          padding: 0 !important;
          border: none !important;
          object-fit: contain !important;
          background: #000 !important;
        }
        .video-container, .player-container, [class*="video"], [class*="player"] {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          margin: 0 !important;
          padding: 0 !important;
        }
      ';
      document.head.appendChild(style);

      // Disable new windows/popups
      window.open = function() { return null; };
      window.location.assign = function() { return null; };
      window.location.replace = function() { return null; };

      true;
    })();
  `;

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
        injectedJavaScript={injectedJS}
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
            <ActivityIndicator size="large" color="#ffffff" />
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
