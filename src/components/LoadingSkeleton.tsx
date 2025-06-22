import React, {useEffect, useRef} from 'react';
import {View, StyleSheet, Animated, Dimensions} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {borderRadius} from '../styles/theme';

const shimmerColors = [
  'rgb(21, 21, 32)',
  'rgba(20, 20, 28, 0.81)',
  'rgb(21, 21, 32)',
];

const AnimatedShimmer = ({width, height, radius = 8}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ).start();
  }, [shimmerAnim]);

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width * 2],
  });

  return (
    <View
      style={{
        width,
        height,
        backgroundColor: shimmerColors[0],
        borderRadius: radius,
        overflow: 'hidden',
      }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: width * 0.4,
          height: '100%',
          borderRadius: radius,
          backgroundColor: shimmerColors[1],
          transform: [{translateX: shimmerTranslate}],
        }}
      />
    </View>
  );
};

export const BannerSkeleton = () => (
  <AnimatedShimmer
    width={Dimensions.get('window').width}
    height={200}
    radius={0}
  />
);

export const BannerHomeSkeleton = () => (
  <AnimatedShimmer
    width={Dimensions.get('window').width}
    height={200}
    radius={20}
  />
);

export const HeadingSkeleton = () => (
  <AnimatedShimmer
    width={Dimensions.get('window').width * 0.7}
    height={40}
    radius={10}
  />
);

export const HorizontalListSkeleton = () => (
  <View style={styles.row}>
    {[...Array(5)].map((_, i) => (
      <AnimatedShimmer key={i} width={120} height={180} radius={20} />
    ))}
  </View>
);

export const RecentListSkeleton = () => (
  <View style={styles.row}>
    {[...Array(3)].map((_, i) => (
      <AnimatedShimmer key={i} width={150} height={100} radius={10} />
    ))}
  </View>
);

export const GridSkeleton = () => (
  <View style={styles.grid}>
    {[...Array(16)].map((_, i) => (
      <AnimatedShimmer key={i} width={120} height={180} radius={8} />
    ))}
  </View>
);

export const MoivieCardSkeleton = ({v2 = false}: {v2?: boolean}) => (
  <AnimatedShimmer
    width={v2 ? 180 : 120}
    height={v2 ? 100 : 180}
    radius={borderRadius.sm}
  />
);

export const PersonCardSkeleton = () => (
  <AnimatedShimmer width={100} height={150} radius={borderRadius.sm} />
);

export const DetailScreenSkeleton = () => (
  <View style={styles.detail}>
    <AnimatedShimmer
      width={Dimensions.get('window').width}
      height={300}
      radius={0}
    />
    <View style={styles.centered}>
      <AnimatedShimmer width={300} height={60} radius={10} />
      <AnimatedShimmer width={300} height={30} radius={5} />
    </View>
    <AnimatedShimmer width={'90%'} height={30} radius={5} />
    <AnimatedShimmer width={'90%'} height={30} radius={5} />
    <AnimatedShimmer width={'90%'} height={30} radius={5} />
    <HeadingSkeleton />
    <HorizontalListSkeleton />
    <HeadingSkeleton />
    <HorizontalListSkeleton />
  </View>
);

export const LanguageSkeleton = () => (
  <View style={styles.row}>
    {[...Array(10)].map((_, i) => (
      <AnimatedShimmer key={i} width={100} height={100} radius={10} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    flexWrap: 'wrap',
  },
  grid: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
    margin: 'auto',
  },
  detail: {
    flex: 1,
    width: '100%',
    alignItems: 'flex-start',
  },
  centered: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 20,
  },
});
