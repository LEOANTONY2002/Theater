import React, {useEffect, useRef, useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {colors, typography, spacing} from '../styles/theme';

interface PerformanceMonitorProps {
  enabled?: boolean;
  screenName: string;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  enabled = __DEV__,
  screenName,
}) => {
  const [renderTime, setRenderTime] = useState(0);
  const [fps, setFps] = useState(60);
  const [memoryUsage, setMemoryUsage] = useState(0);
  const [frameCount, setFrameCount] = useState(0);
  const [lastTime, setLastTime] = useState(Date.now());
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(Date.now());
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    if (!enabled) return;

    // Measure render time
    const measureRender = (timestamp?: number) => {
      const startTime = performance.now();

      // Force a re-render to measure
      setRenderTime(prev => {
        const endTime = performance.now();
        return endTime - startTime;
      });
    };

    // Measure FPS
    const measureFPS = () => {
      const now = Date.now();
      frameCountRef.current++;

      if (now - lastTimeRef.current >= 1000) {
        const currentFps = Math.round(
          (frameCountRef.current * 1000) / (now - lastTimeRef.current),
        );
        setFps(currentFps);
        setFrameCount(frameCountRef.current);
        setLastTime(now);
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      animationFrameRef.current = requestAnimationFrame(measureFPS);
    };

    // Start measurements
    requestAnimationFrame(timestamp => measureRender());
    animationFrameRef.current = requestAnimationFrame(measureFPS);

    // Memory usage (if available)
    const updateMemory = () => {
      if ((performance as any).memory) {
        setMemoryUsage(
          Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024),
        );
      }
    };

    updateMemory();
    const memoryInterval = setInterval(updateMemory, 5000);

    return () => {
      clearInterval(memoryInterval);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled, screenName]);

  if (!enabled) return null;

  // Only show warning if FPS is very low
  if (fps > 30) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Performance Monitor</Text>
      <Text style={styles.text}>Screen: {screenName}</Text>
      <Text style={styles.text}>Render: {renderTime.toFixed(2)}ms</Text>
      <Text style={[styles.text, fps < 15 ? styles.critical : styles.warning]}>
        {screenName}: {fps} FPS ({frameCount} frames)
      </Text>
      {memoryUsage > 0 && (
        <Text style={styles.text}>Memory: {memoryUsage}MB</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: spacing.sm,
    borderRadius: spacing.sm,
    zIndex: 9999,
  },
  title: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  text: {
    ...typography.caption,
    color: colors.text.primary,
    fontSize: 10,
  },
  warning: {
    color: '#FFA500',
  },
  critical: {
    color: '#FF0000',
  },
});
