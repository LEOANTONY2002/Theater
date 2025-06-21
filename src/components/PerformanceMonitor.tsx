import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {colors, typography} from '../styles/theme';

interface PerformanceMonitorProps {
  enabled?: boolean;
  screenName: string;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  enabled = __DEV__,
  screenName,
}) => {
  const [renderTime, setRenderTime] = useState(0);
  const [fps, setFps] = useState(0);
  const [memoryUsage, setMemoryUsage] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    const startTime = performance.now();

    // Measure render time
    const measureRender = () => {
      const endTime = performance.now();
      setRenderTime(endTime - startTime);
    };

    // Measure FPS
    let frameCount = 0;
    let lastTime = performance.now();

    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();

      if (currentTime - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (currentTime - lastTime)));
        frameCount = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(measureFPS);
    };

    // Start measurements
    requestAnimationFrame(measureRender);
    requestAnimationFrame(measureFPS);

    // Memory usage (if available)
    if ((global as any).performance?.memory) {
      const updateMemory = () => {
        const memory = (global as any).performance.memory;
        setMemoryUsage(Math.round(memory.usedJSHeapSize / 1024 / 1024)); // MB
        setTimeout(updateMemory, 1000);
      };
      updateMemory();
    }
  }, [enabled, screenName]);

  if (!enabled) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Performance Monitor</Text>
      <Text style={styles.text}>Screen: {screenName}</Text>
      <Text style={styles.text}>Render: {renderTime.toFixed(2)}ms</Text>
      <Text style={styles.text}>FPS: {fps}</Text>
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
    padding: 8,
    borderRadius: 4,
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
});
