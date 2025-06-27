import React, {useRef, useEffect} from 'react';
import {Alert, StyleSheet, View} from 'react-native';
import {WebView} from 'react-native-webview';

const Cinema = ({
  id,
  type,
  season,
  episode,
}: {
  id: string;
  type: string;
  season?: number;
  episode?: number;
}) => {
  const webviewRef = useRef<any>(null);

  const initialUrl =
    type === 'movie'
      ? `https://vidsrc.xyz/embed/movie?tmdb=${id}`
      : `https://vidsrc.xyz/embed/tv?tmdb=${id}&season=${season}&episode=${episode}`;

  const handleShouldStartLoadWithRequest = (request: {url: string}) => {
    return false;
  };

  const injectedJS = `
    (function() {
      // Disable new windows/popups
      window.open = function() { return null; };
      window.__originalAssign = window.location.assign;
      window.location.assign = function() { return null; };
      window.location.replace = function() { return null; };
      Object.defineProperty(window, 'location', {
        writable: false,
        configurable: false
      });

      // Only prevent default on anchor clicks
      document.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', function(e) {
          e.preventDefault();
        });
        a.removeAttribute('target');
        a.href = 'javascript:void(0)';
      });

      // Block context menu (optional, can keep)
      document.addEventListener('contextmenu', e => e.preventDefault());

      // Block form submissions
      document.querySelectorAll('form').forEach(f => {
        f.addEventListener('submit', function(e) {
          e.preventDefault();
        });
      });

      // Do NOT add a global click event prevention!
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
        // domStorageEnabled={true}
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo={true}
        setSupportMultipleWindows={false}
        javaScriptCanOpenWindowsAutomatically={false}
        injectedJavaScript={injectedJS}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        // renderToHardwareTextureAndroid={true}
        // androidLayerType="hardware"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});

export default Cinema;
