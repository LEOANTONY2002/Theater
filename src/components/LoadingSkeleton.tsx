import React from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import ShimmerPlaceholder from 'react-native-shimmer-placeholder';
import {borderRadius} from '../styles/theme';

const shimmerColors = [
  'rgb(21, 21, 32)',
  'rgba(20, 20, 28, 0.81)',
  'rgb(21, 21, 32)',
];

export const BannerSkeleton = () => (
  <ShimmerPlaceholder
    LinearGradient={LinearGradient}
    shimmerColors={shimmerColors}
    style={{
      width: '100%',
      height: '100%',
    }}></ShimmerPlaceholder>
);

export const BannerHomeSkeleton = () => (
  <ShimmerPlaceholder
    LinearGradient={LinearGradient}
    shimmerColors={shimmerColors}
    style={{
      width: '100%',
      height: '100%',
      borderRadius: 20,
    }}></ShimmerPlaceholder>
);

export const HeadingSkeleton = () => (
  <ShimmerPlaceholder
    LinearGradient={LinearGradient}
    shimmerColors={shimmerColors}
    style={{
      width: '70%',
      height: 40,
      borderRadius: 10,
      margin: 20,
    }}></ShimmerPlaceholder>
);

export const HorizontalListSkeleton = () => (
  <View style={styles.container}>
    {[...Array(5)].map((_, index) => (
      <ShimmerPlaceholder
        key={index}
        LinearGradient={LinearGradient}
        shimmerColors={shimmerColors}
        style={{
          width: 120,
          height: 180,
          borderRadius: 20,
        }}
      />
    ))}
  </View>
);

export const RecentListSkeleton = () => (
  <View style={styles.container}>
    {[...Array(3)].map((_, index) => (
      <ShimmerPlaceholder
        key={index}
        LinearGradient={LinearGradient}
        shimmerColors={shimmerColors}
        style={{
          width: 150,
          height: 100,
          borderRadius: 10,
        }}
      />
    ))}
  </View>
);

export const GridSkeleton = () => (
  <View
    style={{
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      flexWrap: 'wrap',
      gap: 10,
      margin: 'auto',
    }}>
    {[...Array(16)].map((_, idx) => (
      <ShimmerPlaceholder
        LinearGradient={LinearGradient}
        shimmerColors={shimmerColors}
        key={idx}
        style={{
          width: 120,
          height: 180,
          borderRadius: 8,
        }}></ShimmerPlaceholder>
    ))}
  </View>
);

export const MoivieCardSkeleton = ({v2 = false}: {v2?: boolean}) => (
  <View>
    <ShimmerPlaceholder
      LinearGradient={LinearGradient}
      shimmerColors={shimmerColors}
      style={{
        width: v2 ? 180 : 120,
        height: v2 ? 100 : 180,
        borderRadius: borderRadius.sm,
      }}></ShimmerPlaceholder>
  </View>
);

export const PersonCardSkeleton = () => (
  <View>
    <ShimmerPlaceholder
      LinearGradient={LinearGradient}
      shimmerColors={shimmerColors}
      style={{
        width: 100,
        height: 150,
        borderRadius: borderRadius.sm,
      }}></ShimmerPlaceholder>
  </View>
);

export const DetailScreenSkeleton = () => (
  <View
    style={{
      flex: 1,
      width: '100%',
      alignItems: 'flex-start',
    }}>
    <ShimmerPlaceholder
      LinearGradient={LinearGradient}
      shimmerColors={shimmerColors}
      style={{
        width: '100%',
        height: 300,
      }}></ShimmerPlaceholder>
    <View
      style={{
        width: '100%',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
      <ShimmerPlaceholder
        LinearGradient={LinearGradient}
        shimmerColors={shimmerColors}
        style={{
          width: 300,
          height: 60,
          marginVertical: 20,
          borderRadius: 10,
        }}></ShimmerPlaceholder>
      <ShimmerPlaceholder
        LinearGradient={LinearGradient}
        shimmerColors={shimmerColors}
        style={{
          width: 300,
          height: 30,
          borderRadius: 5,
        }}></ShimmerPlaceholder>
    </View>
    <ShimmerPlaceholder
      LinearGradient={LinearGradient}
      shimmerColors={shimmerColors}
      style={{
        width: '90%',
        height: 30,
        borderRadius: 5,
        marginTop: 20,
        marginHorizontal: 'auto',
      }}></ShimmerPlaceholder>
    <ShimmerPlaceholder
      LinearGradient={LinearGradient}
      shimmerColors={shimmerColors}
      style={{
        width: '90%',
        height: 30,
        borderRadius: 5,
        marginTop: 5,
        marginHorizontal: 'auto',
      }}></ShimmerPlaceholder>
    <ShimmerPlaceholder
      LinearGradient={LinearGradient}
      shimmerColors={shimmerColors}
      style={{
        width: '90%',
        height: 30,
        borderRadius: 5,
        marginTop: 5,
        marginHorizontal: 'auto',
      }}></ShimmerPlaceholder>
    <HeadingSkeleton />
    <HorizontalListSkeleton />
    <HeadingSkeleton />
    <HorizontalListSkeleton />
  </View>
);

export const LanguageSkeleton = () => (
  <View style={styles.container}>
    {[...Array(10)].map((_, index) => (
      <ShimmerPlaceholder
        key={index}
        LinearGradient={LinearGradient}
        shimmerColors={shimmerColors}
        style={{
          width: 100,
          height: 100,
          borderRadius: 10,
        }}
      />
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
  },
});
