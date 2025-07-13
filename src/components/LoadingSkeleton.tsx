import React, {useEffect, useRef} from 'react';
import {View, StyleSheet, Animated, Dimensions, ScrollView} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {borderRadius, colors, spacing} from '../styles/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;

const shimmerColors = [
  'rgba(16, 16, 22, 0.62)',
  'rgba(13, 13, 20, 0.86)',
  'rgb(12, 12, 19)',
];

const AnimatedShimmer = ({
  width,
  height,
  radius = 8,
}: {
  width: number;
  height: number;
  radius?: number;
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
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
  <View style={styles.bannerContainer}>
    <AnimatedShimmer
      width={Dimensions.get('window').width}
      height={580}
      radius={0}
    />
    <LinearGradient
      colors={['transparent', colors.background.primary]}
      style={{
        position: 'absolute',
        bottom: 0,
        width: '100%',
        opacity: 0.7,
        height: 200,
      }}
    />
  </View>
);

export const BannerHomeSkeleton = () => (
  <View style={styles.bannerContainer}>
    <AnimatedShimmer
      width={Dimensions.get('window').width - spacing.lg * 2}
      height={580}
      radius={32}
    />
    <LinearGradient
      colors={['transparent', colors.background.primary]}
      style={{
        position: 'absolute',
        bottom: 0,
        width: '100%',
        height: 300,
        opacity: 0.8,
      }}
    />
  </View>
);

export const HeadingSkeleton = () => (
  <View style={styles.headingSkeletonContainer}>
    <AnimatedShimmer
      width={Dimensions.get('window').width * 0.5}
      height={30}
      radius={8}
    />
    <LinearGradient
      colors={['transparent', colors.background.primary]}
      style={{
        position: 'absolute',
        bottom: 0,
        width: '100%',
        opacity: 0.5,
        height: 30,
      }}
    />
  </View>
);

export const GenreListSkeleton = () => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.horizontalListContent}
    style={{marginBottom: spacing.xl, position: 'relative'}}>
    {[...Array(5)].map((_, i) => (
      <View key={i} style={styles.horizontalCardContainer}>
        <AnimatedShimmer width={120} height={100} radius={16} />
      </View>
    ))}
    <LinearGradient
      colors={['transparent', colors.background.primary]}
      style={{
        position: 'absolute',
        bottom: 0,
        width: '100%',
        opacity: 0.6,
        height: 90,
      }}
    />
  </ScrollView>
);

export const HorizontalListSkeleton = () => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.horizontalListContent}
    style={{marginBottom: spacing.md, position: 'relative'}}>
    {[...Array(5)].map((_, i) => (
      <View key={i} style={styles.horizontalCardContainer}>
        <AnimatedShimmer width={120} height={180} radius={16} />
      </View>
    ))}
    <LinearGradient
      colors={['transparent', colors.background.primary]}
      style={{
        position: 'absolute',
        bottom: 0,
        width: '100%',
        opacity: 0.7,
        height: 80,
      }}
    />
  </ScrollView>
);

export const RecentListSkeleton = () => (
  <View style={styles.row}>
    {[...Array(3)].map((_, i) => (
      <AnimatedShimmer key={i} width={150} height={100} radius={10} />
    ))}
    <LinearGradient
      colors={['transparent', colors.background.primary]}
      style={{
        position: 'absolute',
        bottom: 0,
        width: '100%',
        opacity: 0.5,
        height: 40,
      }}
    />
  </View>
);

export const GridSkeleton = () => (
  <View style={styles.grid}>
    {[...Array(10)].map((_, i) => (
      <AnimatedShimmer key={i} width={120} height={180} radius={8} />
    ))}
    <LinearGradient
      colors={['transparent', colors.background.primary]}
      style={{
        position: 'absolute',
        bottom: 0,
        width: '100%',
        height: 700,
      }}
    />
  </View>
);

export const GridListSkeleton = () => (
  <View style={styles.grid}>
    {[...Array(12)].map((_, i) => (
      <AnimatedShimmer
        key={i}
        width={SCREEN_WIDTH / 3 - 15}
        height={SCREEN_WIDTH / 2 - 10}
        radius={8}
      />
    ))}
    <LinearGradient
      colors={['transparent', colors.background.primary]}
      style={{
        position: 'absolute',
        bottom: 0,
        width: '100%',
        height: 600,
        zIndex: 1,
      }}
    />
  </View>
);

export const ContentCardSkeleton = ({v2 = false}: {v2?: boolean}) => (
  <AnimatedShimmer
    width={v2 ? 180 : 120}
    height={v2 ? 100 : 180}
    radius={borderRadius.sm}
  />
);

export const MoivieCardSkeleton = () => (
  <AnimatedShimmer
    width={SCREEN_WIDTH / 3 - 15}
    height={SCREEN_WIDTH / 2 - 10}
    radius={borderRadius.sm}
  />
);

export const DetailScreenSkeleton = () => (
  <View style={styles.detail}>
    <View>
      <AnimatedShimmer
        width={Dimensions.get('window').width - 32}
        height={250}
        radius={30}
      />
      <LinearGradient
        colors={['transparent', colors.background.primary]}
        style={{
          position: 'absolute',
          bottom: 0,
          width: '100%',
          height: 100,
          opacity: 0.4,
          zIndex: 1,
        }}
      />
    </View>
    <View style={{height: 16}} />
    <AnimatedShimmer width={300} height={60} radius={10} />
    <View style={{height: 16}} />
    <AnimatedShimmer width={300} height={30} radius={5} />
    <View style={{height: 16}} />
    <View width={'100%'} style={styles.centered}>
      <AnimatedShimmer width={'90%'} height={70} radius={10} />
      <View style={{height: 0}} />
      <AnimatedShimmer width={300} height={30} radius={5} />
      <LinearGradient
        colors={['transparent', colors.background.primary]}
        style={{
          position: 'absolute',
          bottom: 0,
          width: '100%',
          height: 40,
          opacity: 0.4,
          zIndex: 1,
        }}
      />
    </View>

    <View style={{height: 26}} />
    <HeadingSkeleton />
    <HorizontalListSkeleton />
  </View>
);

export const LanguageSkeleton = () => (
  <View style={styles.row}>
    {[...Array(5)].map((_, i) => (
      <AnimatedShimmer key={i} width={100} height={100} radius={10} />
    ))}
    <LinearGradient
      colors={['transparent', colors.background.primary]}
      style={{
        position: 'absolute',
        bottom: 0,
        width: '150%',
        opacity: 0.6,
        height: 70,
      }}
    />
  </View>
);

export const HomeScreenSkeleton = () => (
  <View style={{flex: 1, backgroundColor: 'rgb(0,0,16)'}}>
    <View style={{marginTop: 24, marginBottom: 24}}>
      <BannerHomeSkeleton />
    </View>
    {[...Array(5)].map((_, i) => (
      <View key={i} style={{marginBottom: 32}}>
        <View style={{alignItems: 'center', marginBottom: 12}}>
          <HeadingSkeleton />
        </View>
        <HorizontalListSkeleton />
      </View>
    ))}
    <View style={{marginTop: 32, alignItems: 'center'}}>
      <HeadingSkeleton />
      <RecentListSkeleton />
    </View>
  </View>
);

const styles = StyleSheet.create({
  bannerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 24,
    position: 'relative',
  },
  headingSkeletonContainer: {
    marginLeft: spacing.md,
    alignSelf: 'flex-start',
    marginBottom: 12,
    position: 'relative',
  },
  horizontalListContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    gap: 0,
    position: 'relative',
  },
  horizontalCardContainer: {
    marginRight: spacing.sm,
  },
  row: {
    flex: 1,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    overflow: 'scroll',
    position: 'relative',
    paddingLeft: spacing.md,
  },
  grid: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
    margin: 'auto',
    position: 'relative',
  },
  detail: {
    width: '100%',
    alignItems: 'center',
    flexDirection: 'column',
    justifyContent: 'center',
    paddingTop: spacing.md,
  },
  centered: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
  },
});
