import React, {useState, memo, useEffect} from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {colors, spacing, borderRadius} from '../styles/theme';
import {useResponsive} from '../hooks/useResponsive';
import {FeaturedBannerHomePoster} from './FeaturedBannerHomePoster';
import Carousel from 'react-native-reanimated-carousel';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import FastImage from 'react-native-fast-image';

type FeaturedBannerHomeProps = {
  items: {item: any; type: 'movie' | 'tv'; title: string}[];
};

const CARD_WIDTH = 300; // phone baseline
const CARD_HEIGHT = 500; // phone baseline
const CARD_OVERLAP = CARD_WIDTH * 0.3; // phone baseline
const MAX_FILTERS = 5;

export const FeaturedBannerHome: React.FC<FeaturedBannerHomeProps> = memo(
  ({items = []}) => {
    const {isTablet} = useResponsive();
    const {width: windowWidth} = useWindowDimensions();
    const progressValue = useSharedValue(0);

    // Dynamic dimensions for tablet vs phone
    const cardWidth = isTablet ? 380 : CARD_WIDTH;
    const cardHeight = isTablet ? 650 : CARD_HEIGHT;
    const cardOverlap = isTablet ? cardWidth * 0.42 : CARD_OVERLAP;

    const animatedTitleStyles = Array.from({length: MAX_FILTERS}, (_, idx) =>
      useAnimatedStyle(() => {
        const diff = progressValue.value - idx;
        const opacity = interpolate(
          Math.abs(diff * 5),
          [0, 0.7, 1.2],
          [1, 0.2, 0],
          'clamp',
        );
        const translateY = interpolate(diff, [-1, 0, 1], [40, 0, -40], 'clamp');
        return {
          opacity,
          transform: [{translateY}],
        };
      }),
    );

    // Preload all poster images on mount
    useEffect(() => {
      if (!items || items.length === 0) return;
      const size = isTablet ? 'original' : 'w500';
      items.slice(0, MAX_FILTERS).forEach((dataItem: any) => {
        const posterPath =
          dataItem.item?.poster_path || dataItem.item?.backdrop_path;
        if (posterPath) {
          const uri = `https://image.tmdb.org/t/p/${size}${posterPath}`;
          FastImage.preload([
            {
              uri,
              priority: FastImage.priority.high,
              cache: FastImage.cacheControl.immutable,
            },
          ]);
        }
      });
    }, [items, isTablet]);

    const styles = StyleSheet.create({
      wrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        width: windowWidth,
        paddingTop: isTablet ? 140 : 100,
        paddingBottom: isTablet ? 100 : 50,
      },
      gradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: CARD_HEIGHT + 100,
        zIndex: 0,
      },
      titleContainer: {
        position: 'absolute',
        top: 20,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 0,
        pointerEvents: 'none',
        opacity: 0.1,
        alignItems: 'center',
      },
      filterName: {
        position: 'absolute',
        color: colors.text.primary,
        paddingHorizontal: spacing.lg,
        fontSize: isTablet ? 120 : 80,
        textAlign: 'center',
        fontFamily: 'Inter_28pt-ExtraBold',
      },
      cardStack: {
        width: 'auto',
        height: CARD_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
      },
      card: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        borderRadius: borderRadius.lg || 18,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.18,
        shadowRadius: 8,
        elevation: 40,
      },
    });

    return items !== undefined && items.length > 0 ? (
      <View style={styles.wrapper}>
        <LinearGradient
          colors={['rgba(21, 72, 93, 0.52)', 'transparent']}
          start={{x: 0, y: 0}}
          end={{x: 0, y: 0.7}}
          style={[styles.gradient, {height: cardHeight + 100}]}
        />
        <View style={styles.titleContainer} pointerEvents="none">
          {items?.slice(0, MAX_FILTERS).map((item, idx) => (
            <Animated.Text
              key={idx}
              style={[styles.filterName, animatedTitleStyles[idx]]}
              numberOfLines={1}>
              {item?.title}
            </Animated.Text>
          ))}
        </View>
        <Carousel
          width={windowWidth}
          height={cardHeight}
          data={items.slice(0, MAX_FILTERS)}
          mode="horizontal-stack"
          modeConfig={{
            snapDirection: 'left',
            stackInterval: cardOverlap,
            showLength: 2,
          }}
          style={{width: windowWidth, alignSelf: 'center'}}
          loop={false}
          pagingEnabled
          onProgressChange={(_, absoluteProgress) => {
            progressValue.value = absoluteProgress;
          }}
          renderItem={({item, animationValue}) => {
            const animatedStyle = useAnimatedStyle(() => {
              const scale = interpolate(
                animationValue.value,
                [-1, 0, 1],
                [0, 1, 0.9],
              );
              const rotate = interpolate(
                animationValue.value,
                [-1, 0, 1],
                [-15, 0, 15],
              );
              const opacity = interpolate(
                animationValue.value,
                [-1, 0, 0],
                [0.5, 1, 0.8],
              );
              return {
                transform: [{scale}, {rotate: `${rotate}deg`}],
                opacity,
              };
            });

            return (
              <TouchableOpacity activeOpacity={1}>
                <Animated.View
                  style={[
                    styles.cardStack,
                    {height: cardHeight},
                    animatedStyle,
                  ]}>
                  {item.item.poster_path ? (
                    <FeaturedBannerHomePoster
                      item={item.item}
                      type={item.type}
                    />
                  ) : (
                    <View
                      style={[
                        styles.card,
                        {
                          backgroundColor: colors.background.tertiarySolid,
                          width: cardWidth,
                          height: cardHeight,
                        },
                      ]}
                    />
                  )}
                </Animated.View>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    ) : null;
  },
);
