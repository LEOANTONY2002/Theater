import React, {useState, useRef} from 'react';
import {View, Text, TouchableOpacity, PanResponder} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {colors, spacing, borderRadius, typography} from '../styles/theme';

interface GradientProgressBarProps {
  value: number;
  minValue: number;
  maxValue: number;
  step?: number;
  onValueChange: (value: number) => void;
  label?: string;
  showValue?: boolean;
  height?: number;
  width?: number | string;
}

export const GradientProgressBar: React.FC<GradientProgressBarProps> = ({
  value,
  minValue,
  maxValue,
  step = 0.5,
  onValueChange,
  label,
  showValue = true,
  height = 10,
  width = '100%',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<View>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const percentage = ((value - minValue) / (maxValue - minValue)) * 100;
  const clampedPercentage = Math.max(0, Math.min(100, percentage));

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      setIsDragging(true);
    },
    onPanResponderMove: (evt, gestureState) => {
      if (containerWidth > 0) {
        const touchX = gestureState.moveX;
        const containerX = evt.target.measure((x, y, width, height, pageX) => {
          const relativeX = touchX - pageX;
          const newPercentage = Math.max(
            0,
            Math.min(100, (relativeX / width) * 100),
          );
          const newValue =
            minValue + (newPercentage / 100) * (maxValue - minValue);
          const steppedValue = Math.round(newValue / step) * step;
          const clampedValue = Math.max(
            minValue,
            Math.min(maxValue, steppedValue),
          );
          onValueChange(clampedValue);
        });
      }
    },
    onPanResponderRelease: () => {
      setIsDragging(false);
    },
  });

  const handleContainerLayout = (event: any) => {
    const {width} = event.nativeEvent.layout;
    setContainerWidth(width);
  };

  const handlePress = (event: any) => {
    if (containerWidth > 0) {
      const {locationX} = event.nativeEvent;
      const newPercentage = Math.max(
        0,
        Math.min(100, (locationX / containerWidth) * 100),
      );
      const newValue = minValue + (newPercentage / 100) * (maxValue - minValue);
      const steppedValue = Math.round(newValue / step) * step;
      const clampedValue = Math.max(minValue, Math.min(maxValue, steppedValue));
      onValueChange(clampedValue);
    }
  };

  return (
    <View style={{width: width as any, marginVertical: spacing.sm}}>
      {showValue && (
        <View style={styles.valueContainer}>
          <Text style={styles.sectionTitle}>{label}</Text>
          <Text style={styles.currentValue}>{value.toFixed(1)}</Text>
        </View>
      )}

      <TouchableOpacity
        ref={containerRef}
        style={[styles.container, {height}]}
        onLayout={handleContainerLayout}
        onPress={handlePress}
        activeOpacity={1}
        {...panResponder.panHandlers}>
        {/* Background track */}
        <View style={[styles.track, {height}]}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={[styles.trackGradient, {height}]}
          />
        </View>

        {/* Progress track */}
        <View
          style={[
            styles.progressTrack,
            {width: `${clampedPercentage}%` as any, height},
          ]}>
          <LinearGradient
            colors={[colors.modal.blur, colors.text.primary]}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={[styles.progressGradient, {height}]}
          />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = {
  container: {
    position: 'relative' as const,
    justifyContent: 'center' as const,
    borderRadius: 10,
  },
  track: {
    position: 'absolute' as const,
    width: '100%' as any,
    borderRadius: 10,
    overflow: 'hidden' as const,
  },
  trackGradient: {
    width: '100%' as any,
    borderRadius: 10,
  },
  progressTrack: {
    position: 'absolute' as const,
    borderRadius: 10,
    overflow: 'hidden' as const,
  },
  progressGradient: {
    width: '100%' as any,
    borderRadius: 10,
  },
  thumb: {
    position: 'absolute' as const,
    width: 16,
    height: 10,
    borderRadius: 8,
    shadowColor: colors.modal.activeBorder,
    shadowOffset: {width: 2, height: 2},
    shadowRadius: 10,
    elevation: 10,
  },
  thumbGradient: {},
  label: {
    color: colors.text.secondary,
    fontSize: 14,
    marginBottom: spacing.xs,
    fontWeight: '500' as const,
  },
  valueContainer: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  valueText: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '500' as const,
  },
  currentValue: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600' as const,
  },
};
