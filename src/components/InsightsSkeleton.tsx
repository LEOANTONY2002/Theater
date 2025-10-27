import React from 'react';
import {View, StyleSheet, Animated} from 'react-native';
import {colors, spacing, borderRadius} from '../styles/theme';
import LinearGradient from 'react-native-linear-gradient';

export const InsightsSkeleton: React.FC = () => {
  const opacity = React.useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [opacity]);

  const SkeletonBox = ({
    width,
    height,
    style,
  }: {
    width: number | string;
    height: number;
    style?: any;
  }) => (
    <Animated.View style={[{opacity}, style]}>
      <View
        style={{
          width: typeof width === 'string' ? undefined : width,
          ...(typeof width === 'string' && {width: width as any}),
          height,
          backgroundColor: colors.modal.content,
          borderRadius: borderRadius.sm,
        }}
      />
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      {/* Key Patterns Section */}
      <View style={styles.section}>
        <SkeletonBox width={120} height={20} style={{marginBottom: spacing.sm}} />
        <SkeletonBox width="100%" height={16} style={{marginBottom: spacing.xs}} />
        <SkeletonBox width="95%" height={16} style={{marginBottom: spacing.xs}} />
        <SkeletonBox width="90%" height={16} />
      </View>

      {/* Top Genres Section */}
      <View style={styles.section}>
        <SkeletonBox width={100} height={20} style={{marginBottom: spacing.sm}} />
        <View style={{flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap'}}>
          <SkeletonBox width={80} height={32} />
          <SkeletonBox width={100} height={32} />
          <SkeletonBox width={90} height={32} />
        </View>
      </View>

      {/* Stats Section */}
      <View style={{flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg}}>
        <View style={{flex: 1}}>
          <SkeletonBox width="100%" height={100} />
        </View>
        <View style={{flex: 1}}>
          <SkeletonBox width="100%" height={100} />
        </View>
      </View>

      {/* Decade Distribution */}
      <View style={styles.section}>
        <SkeletonBox width={130} height={20} style={{marginBottom: spacing.sm}} />
        <SkeletonBox width="100%" height={12} style={{marginBottom: spacing.sm}} />
        <SkeletonBox width="100%" height={12} style={{marginBottom: spacing.sm}} />
        <SkeletonBox width="100%" height={12} />
      </View>

      {/* Recommendations */}
      <View style={styles.section}>
        <SkeletonBox width={150} height={20} style={{marginBottom: spacing.sm}} />
        <SkeletonBox width="100%" height={16} style={{marginBottom: spacing.xs}} />
        <SkeletonBox width="100%" height={16} style={{marginBottom: spacing.xs}} />
        <SkeletonBox width="80%" height={16} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.sm,
  },
  section: {
    marginBottom: spacing.lg,
  },
});
