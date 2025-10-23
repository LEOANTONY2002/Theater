import React, {useEffect, useRef} from 'react';
import {View, StyleSheet, Animated, Dimensions, ScrollView} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {borderRadius, colors, spacing} from '../styles/theme';
import {useResponsive} from '../hooks/useResponsive';

const SCREEN_WIDTH = Dimensions.get('window').width;

const shimmerColors = [
  'rgba(10, 10, 18, 0.62)',
  'rgba(8, 8, 19, 0.45)',
  'rgb(0, 0, 1)',
];

const shimmerColors2 = ['rgba(49, 2, 106, 0.12)', 'rgba(69, 1, 61, 0.11)'];

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

const AnimatedShimmerAI = ({
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
        backgroundColor: shimmerColors2[0],
        borderRadius: radius,
        overflow: 'hidden',
      }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: width * 0.4,
          height: '100%',
          borderRadius: radius,
          backgroundColor: shimmerColors2[1],
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

export const BannerHomeSkeleton = () => {
  const {isTablet} = useResponsive();
  const width = Dimensions.get('window').width - spacing.lg * 2;
  const height = isTablet ? 650 : 580;
  const gradHeight = isTablet ? 360 : 300;
  return (
    <View style={styles.bannerContainer}>
      <AnimatedShimmer width={width} height={height} radius={32} />
      <LinearGradient
        colors={['transparent', colors.background.primary]}
        style={{
          position: 'absolute',
          bottom: 0,
          width: '100%',
          height: gradHeight,
          opacity: 0.8,
        }}
      />
    </View>
  );
};

export const HeadingSkeleton = () => {
  const {isTablet} = useResponsive();
  const width = Dimensions.get('window').width * (isTablet ? 0.6 : 0.5);
  const height = isTablet ? 38 : 30;
  return (
    <View style={styles.headingSkeletonContainer}>
      <AnimatedShimmer width={width} height={height} radius={8} />
      <LinearGradient
        colors={['transparent', colors.background.primary]}
        style={{
          position: 'absolute',
          bottom: 0,
          width: '100%',
          opacity: 0.5,
          height,
        }}
      />
    </View>
  );
};

export const IMDBSkeleton = () => {
  return (
    <View style={styles.headingSkeletonContainer}>
      <AnimatedShimmer width={50} height={30} radius={8} />
    </View>
  );
};

export const GenreListSkeleton = () => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.horizontalListContent}
    style={{marginBottom: spacing.xl, position: 'relative'}}>
    {[...Array(8)].map((_, i) => (
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

export const HorizontalListSkeleton = ({ai = false}: {ai?: boolean}) => {
  const {isTablet} = useResponsive();
  const itemWidth = isTablet ? 170 : 120;
  const itemHeight = isTablet ? 255 : 180;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.horizontalListContent}
      style={{marginBottom: spacing.md, position: 'relative'}}>
      {[...Array(5)].map((_, i) => (
        <View key={i} style={styles.horizontalCardContainer}>
          {ai ? (
            <AnimatedShimmerAI
              width={itemWidth}
              height={itemHeight}
              radius={16}
            />
          ) : (
            <AnimatedShimmer
              width={itemWidth}
              height={itemHeight}
              radius={16}
            />
          )}
        </View>
      ))}
      <LinearGradient
        colors={['transparent', colors.background.primary]}
        style={{
          position: 'absolute',
          bottom: 0,
          width: '100%',
          opacity: 0.7,
          height: isTablet ? 120 : 80,
        }}
      />
    </ScrollView>
  );
};

export const TriviaListSkeleton = () => {
  const {isTablet} = useResponsive();
  const itemWidth = isTablet ? 300 : 250;
  const itemHeight = isTablet ? 200 : 150;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.horizontalListContent}
      style={{
        marginBottom: spacing.md,
        position: 'absolute',
        paddingLeft: spacing.md,
        zIndex: 10,
      }}>
      {[...Array(5)].map((_, i) => (
        <View key={i} style={styles.horizontalCardContainer}>
          <AnimatedShimmer width={itemWidth} height={itemHeight} radius={16} />
        </View>
      ))}
      <LinearGradient
        colors={['transparent', colors.background.primary]}
        style={{
          position: 'absolute',
          bottom: 0,
          width: '100%',
          opacity: 0.7,
          height: isTablet ? 120 : 80,
        }}
      />
    </ScrollView>
  );
};

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

export const GridSkeleton = () => {
  const {isTablet} = useResponsive();
  const columns = isTablet ? 5 : 3;
  const cardWidth = SCREEN_WIDTH / columns - 8;
  const cardHeight = cardWidth * 1.5;
  const count = isTablet ? 20 : 12;
  return (
    <View style={styles.grid}>
      {[...Array(count)].map((_, i) => (
        <AnimatedShimmer
          key={i}
          width={cardWidth}
          height={cardHeight}
          radius={8}
        />
      ))}
      <LinearGradient
        colors={['transparent', colors.background.primary]}
        style={{
          position: 'absolute',
          bottom: 0,
          width: '100%',
          height: isTablet ? 900 : 700,
        }}
      />
    </View>
  );
};

export const GridListSkeleton = () => {
  const {isTablet} = useResponsive();
  const columns = isTablet ? 5 : 3;
  const cardWidth = SCREEN_WIDTH / columns - 9;
  const cardHeight = cardWidth * 1.5;
  const count = isTablet ? 20 : 12;
  return (
    <View style={styles.grid}>
      {[...Array(count)].map((_, i) => (
        <AnimatedShimmer
          key={i}
          width={cardWidth}
          height={cardHeight}
          radius={8}
        />
      ))}
      <LinearGradient
        colors={['transparent', colors.background.primary]}
        style={{
          position: 'absolute',
          bottom: 0,
          width: '100%',
          height: isTablet ? 800 : 600,
          zIndex: 1,
        }}
      />
    </View>
  );
};

export const ContentCardSkeleton = ({v2 = false}: {v2?: boolean}) => {
  const {isTablet} = useResponsive();
  const width = v2 ? (isTablet ? 270 : 190) : isTablet ? 170 : 130;
  const height = v2 ? (isTablet ? 155 : 110) : isTablet ? 255 : 195;
  return (
    <AnimatedShimmer width={width} height={height} radius={borderRadius.sm} />
  );
};

export const MoivieCardSkeleton = () => {
  const {isTablet} = useResponsive();
  const columns = isTablet ? 5 : 3;
  const cardWidth = SCREEN_WIDTH / columns - 8;
  const cardHeight = cardWidth * 1.5;
  return (
    <AnimatedShimmer
      width={cardWidth}
      height={cardHeight}
      radius={borderRadius.sm}
    />
  );
};

export const DetailScreenSkeleton = () => {
  const {isTablet} = useResponsive();
  return (
    <View style={styles.detail}>
      <View>
        <AnimatedShimmer
          width={Dimensions.get('window').width - 32}
          height={isTablet ? 500 : 250}
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
      <View style={styles.centered}>
        <AnimatedShimmer width={SCREEN_WIDTH * 0.9} height={70} radius={10} />
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
};

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
    gap: 4,
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

export const PersonalizedBannerSkeleton = () => {
  const {isTablet, width: screenWidth} = useResponsive();
  const cardWidth = isTablet ? screenWidth * 0.85 : screenWidth * 0.8;
  const cardHeight = isTablet ? 400 : 280;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.horizontalListContent, {gap: spacing.xl}]}
      style={{
        marginBottom: spacing.md,
        marginLeft: spacing.xl,
        position: 'relative',
      }}>
      {[...Array(2)].map((_, i) => (
        <View key={i} style={styles.horizontalCardContainer}>
          <AnimatedShimmer width={cardWidth} height={cardHeight} radius={16} />
        </View>
      ))}
      <LinearGradient
        colors={['transparent', colors.background.primary]}
        style={{
          position: 'absolute',
          bottom: 0,
          width: '100%',
          opacity: 0.7,
          height: isTablet ? 120 : 80,
        }}
      />
    </ScrollView>
  );
};
