import React from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import ShimmerPlaceholder from 'react-native-shimmer-placeholder';

const shimmerColors = [
  'rgb(5, 5, 35)',
  'rgba(17, 17, 46, 0.81)',
  'rgb(9, 9, 31)',
];

export const BannerSkeleton = () => (
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      padding: 20,
      paddingTop: 50,
    }}>
    <ShimmerPlaceholder
      LinearGradient={LinearGradient}
      shimmerColors={shimmerColors}
      style={{
        width: '100%',
        height: 400,
        borderRadius: 20,
      }}></ShimmerPlaceholder>
  </View>
);

export const HeadingSkeleton = () => (
  <ShimmerPlaceholder
    LinearGradient={LinearGradient}
    shimmerColors={shimmerColors}
    style={{
      width: '70%',
      height: 60,
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
          width: 100,
          height: 150,
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
    {[...Array(15)].map((_, idx) => (
      <ShimmerPlaceholder
        LinearGradient={LinearGradient}
        shimmerColors={shimmerColors}
        key={idx}
        style={{
          width: 80,
          height: 130,
          borderRadius: 8,
        }}></ShimmerPlaceholder>
    ))}
  </View>
);

export const MoivieCardSkeleton = () => (
  <View>
    <View>
      <ShimmerPlaceholder
        LinearGradient={LinearGradient}
        shimmerColors={shimmerColors}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 20,
        }}></ShimmerPlaceholder>
    </View>
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
