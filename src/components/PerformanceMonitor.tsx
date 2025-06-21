import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {colors, typography} from '../styles/theme';

interface PerformanceMonitorProps {
  enabled?: boolean;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  enabled = __DEV__,
}) => {
  const [fps, setFps] = useState(60);
  const [memory, setMemory] = useState({used: 0, total: 0});
  const [cacheSize, setCacheSize] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    let frameCount = 0;
    let lastTime = Date.now();

    const updateMetrics = () => {
      frameCount++;
      const currentTime = Date.now();

      if (currentTime - lastTime >= 1000) {
        const currentFps = Math.round(
          (frameCount * 1000) / (currentTime - lastTime),
        );
        setFps(currentFps);

        // Memory monitoring
        if (global.performance && (global.performance as any).memory) {
          const mem = (global.performance as any).memory;
          setMemory({
            used: Math.round(mem.usedJSHeapSize / 1024 / 1024),
            total: Math.round(mem.totalJSHeapSize / 1024 / 1024),
          });
        }

        frameCount = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(updateMetrics);
    };

    const interval = setInterval(() => {
      // Cache size monitoring
      if ((global as any).queryClient) {
        const size = (global as any).queryClient
          .getQueryCache()
          .getAll().length;
        setCacheSize(size);
      }
    }, 2000);

    requestAnimationFrame(updateMetrics);

    return () => {
      clearInterval(interval);
    };
  }, [enabled]);

  if (!enabled) return null;

  const isLowFps = fps < 30;
  const isHighMemory = memory.used > 100;
  const isLargeCache = cacheSize > 50;

  return (
    <View
      style={[
        styles.container,
        (isLowFps || isHighMemory || isLargeCache) && styles.warning,
      ]}>
      <Text style={[styles.text, isLowFps && styles.error]}>FPS: {fps}</Text>
      <Text style={[styles.text, isHighMemory && styles.error]}>
        Memory: {memory.used}MB/{memory.total}MB
      </Text>
      <Text style={[styles.text, isLargeCache && styles.error]}>
        Cache: {cacheSize} queries
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 8,
    borderRadius: 4,
    zIndex: 9999,
  },
  warning: {
    backgroundColor: 'rgba(255,165,0,0.8)',
  },
  text: {
    color: colors.text.primary,
    fontSize: 10,
    fontFamily: 'monospace',
  },
  error: {
    color: '#ff4444',
    fontWeight: 'bold',
  },
});
