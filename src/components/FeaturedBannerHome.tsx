import React, {useCallback, useState} from 'react';
import {View, StyleSheet, Dimensions, TouchableOpacity} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {colors, spacing, borderRadius} from '../styles/theme';
import {BannerHomeSkeleton} from './LoadingSkeleton';
import {FeaturedBannerHomePoster} from './FeaturedBannerHomePoster';
import Carousel from 'react-native-reanimated-carousel';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

type FeaturedBannerHomeProps = {
  items: {item: any; type: 'movie' | 'tv'; title: string}[];
};

const CARD_WIDTH = 300;
const CARD_HEIGHT = 500;
const CARD_OVERLAP = CARD_WIDTH * 0.3;
const SCREEN_WIDTH = Dimensions.get('window').width;
const MAX_FILTERS = 3;

export const FeaturedBannerHome: React.FC<FeaturedBannerHomeProps> = ({
  items = [],
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const progressValue = useSharedValue(0);

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

  return items !== undefined && items.length > 0 ? (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={['rgba(21, 72, 93, 0.52)', 'transparent']}
        start={{x: 0, y: 0}}
        end={{x: 0, y: 0.7}}
        style={styles.gradient}
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
        width={SCREEN_WIDTH}
        height={CARD_HEIGHT}
        data={items.slice(0, MAX_FILTERS)}
        mode="horizontal-stack"
        modeConfig={{
          snapDirection: 'left',
          stackInterval: CARD_OVERLAP,
        }}
        style={{width: SCREEN_WIDTH, alignSelf: 'center'}}
        loop={false}
        pagingEnabled
        onSnapToItem={setCurrentIndex}
        onProgressChange={(_, absoluteProgress) => {
          progressValue.value = absoluteProgress;
        }}
        renderItem={({item, index, animationValue}) => {
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
              <Animated.View style={[styles.cardStack, animatedStyle]}>
                {item.item.poster_path ? (
                  <FeaturedBannerHomePoster item={item.item} type={item.type} />
                ) : (
                  <View
                    style={[
                      styles.card,
                      {backgroundColor: colors.background.secondary},
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
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: SCREEN_WIDTH,
    paddingTop: 100,
    paddingBottom: 50,
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
    top: 30,
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
    fontSize: 80,
    fontWeight: '900',
    textAlign: 'center',
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
