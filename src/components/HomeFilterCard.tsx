import React, {useState, useMemo} from 'react';
import {StyleSheet, Text, View, Image, Dimensions} from 'react-native';
import Carousel from 'react-native-reanimated-carousel';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import {colors, spacing, borderRadius, typography} from '../styles/theme';
import {useDiscoverMovies} from '../hooks/useMovies';
import {useDiscoverTVShows} from '../hooks/useTVShows';
import LinearGradient from 'react-native-linear-gradient';
import {useQuery} from '@tanstack/react-query';
import {FiltersManager} from '../store/filters';
import {useSavedFilterContent} from '../hooks/useApp';

const CARD_WIDTH = 170;
const CARD_HEIGHT = 280;
const CARD_OVERLAP = CARD_WIDTH * 0.3;
const SCREEN_WIDTH = Dimensions.get('window').width;
const CAROUSEL_WIDTH = SCREEN_WIDTH;
const DOT_SIZE = 10;
const DOT_SPACING = 12;
const MAX_FILTERS = 10; // Maximum number of filters we'll support

export const HomeFilterCard = ({savedFilters = []}: {savedFilters: any[]}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const progressValue = useSharedValue(0);

  // Always call the hook, even if savedFilters is empty
  const {data: content, isLoading} = useSavedFilterContent(savedFilters || []);

  // Build the posters array from the resolved content
  const posters = (content || []).map(
    (item: any) =>
      item?.results?.[0]?.poster_path &&
      `https://image.tmdb.org/t/p/w500${item.results[0].poster_path}`,
  );

  // Only render UI if there are filters
  if (!Array.isArray(savedFilters) || savedFilters.length === 0) {
    return null;
  }

  // Animated style for the active dot
  const animatedDotStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: interpolate(
            progressValue.value,
            [0, savedFilters?.length - 1],
            [0, (savedFilters?.length - 1) * (DOT_SIZE + DOT_SPACING)],
          ),
        },
      ],
    };
  });

  // Create a fixed number of animated styles
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

  return savedFilters !== undefined && savedFilters.length > 0 ? (
    <View style={styles.wrapper}>
      <LinearGradient colors={colors.gradient.filter} style={styles.gradient} />
      {/* Animated Titles */}
      <View style={styles.titleContainer} pointerEvents="none">
        {content?.map((filter, idx) => {
          // Only render if we have an animated style for this index
          if (filter?.results !== null) {
            if (idx >= MAX_FILTERS) return null;
            return (
              <Animated.Text
                key={filter.id || idx}
                style={[styles.filterName, animatedTitleStyles[idx]]}
                numberOfLines={1}>
                {filter?.name}
              </Animated.Text>
            );
          }
        })}
      </View>
      <Carousel
        width={SCREEN_WIDTH}
        height={CARD_HEIGHT}
        data={content?.slice(0, MAX_FILTERS) || []} // Limit carousel items to MAX_FILTERS
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
          // Animate scale, rotation, and opacity
          const animatedStyle = useAnimatedStyle(() => {
            const scale = interpolate(
              animationValue.value,
              [-1, 0, 1],
              [0.9, 1, 0.9],
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

          // Only show the first poster for this filter
          const poster = posters[index];
          return (
            <Animated.View style={[styles.cardStack, animatedStyle]}>
              {poster ? (
                <Image
                  source={{uri: poster}}
                  style={[styles.card, {zIndex: 2}]}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[
                    styles.card,
                    {zIndex: 2, backgroundColor: colors.background.secondary},
                  ]}
                />
              )}
            </Animated.View>
          );
        }}
      />
      {/* Animated Pagination Dots */}
      <View style={styles.pagination}>
        {content?.slice(0, MAX_FILTERS).map((_, idx) => (
          <View key={idx} style={styles.dot} />
        ))}
        <Animated.View style={[styles.activeDot, animatedDotStyle]} />
      </View>
    </View>
  ) : null;
};

const styles = StyleSheet.create({
  wrapper: {
    // flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: SCREEN_WIDTH,
    marginTop: 50,
    paddingBottom: spacing.xxl,
    marginBottom: spacing.xxl,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
    height: 300,
    marginHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    borderRadius: 50,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.11)',
    // display: 'none',
  },
  titleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
    pointerEvents: 'none',
    opacity: 0.2,
  },
  filterName: {
    color: colors.text.primary,
    paddingHorizontal: spacing.lg,
    fontSize: 70,
    fontWeight: '900',
    textAlign: 'center',
    position: 'absolute',
    top: -60,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardStack: {
    width: SCREEN_WIDTH,
    height: CARD_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: spacing.md,
    // marginLeft: -30,
    padding: 20,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: borderRadius.lg || 18,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 40,
    backgroundColor: colors.background.primary,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
    height: DOT_SIZE + 2,
    position: 'relative',
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: colors.text.secondary,
    marginHorizontal: DOT_SPACING / 2,
    opacity: 0.3,
  },
  activeDot: {
    position: 'absolute',
    width: DOT_SIZE + 4,
    height: DOT_SIZE + 4,
    borderRadius: (DOT_SIZE + 4) / 2,
    backgroundColor: colors.accent,
    top: -2,
    left: 4,
    zIndex: 2,
  },
});
