import React, {useState, useMemo, useCallback} from 'react';
import {View, Image, Dimensions, TouchableOpacity} from 'react-native';
import Carousel from 'react-native-reanimated-carousel';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import {colors} from '../styles/theme';
import LinearGradient from 'react-native-linear-gradient';
import {useSavedFilterContent} from '../hooks/useApp';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {MoviesStackParamList, TVShowsStackParamList} from '../types/navigation';
import {SavedFilter} from '../types/filters';
import {FilterCardStyles} from '../styles/styles';

type NavigationProp = NativeStackNavigationProp<
  MoviesStackParamList | TVShowsStackParamList
>;

const CARD_WIDTH = 170;
const CARD_HEIGHT = 280;
const CARD_OVERLAP = CARD_WIDTH * 0.3;
const SCREEN_WIDTH = Dimensions.get('window').width;
const DOT_SIZE = 10;
const DOT_SPACING = 12;
const MAX_FILTERS = 10; // Maximum number of filters we'll support

export const HomeFilterCard = ({
  savedFilters = [],
}: {
  savedFilters: SavedFilter[];
}) => {
  const navigation = useNavigation<NavigationProp>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const progressValue = useSharedValue(0);

  // Always call the hook, even if savedFilters is empty
  const {data: filterContent, isLoading} = useSavedFilterContent(
    savedFilters || [],
  );

  // Get the first page of results for each filter
  const firstPageContent = useMemo(() => {
    if (!filterContent?.pages?.[0]) return [];
    return filterContent.pages[0];
  }, [filterContent]);

  // Build the posters array from the resolved content
  const posters = useMemo(() => {
    return (firstPageContent || []).map(
      (item: any) =>
        item?.results?.[0]?.poster_path &&
        `https://image.tmdb.org/t/p/w500${item.results[0].poster_path}`,
    );
  }, [firstPageContent]);

  const handlePosterPress = useCallback(
    (filter: SavedFilter) => {
      if (filter.type === 'movie') {
        (
          navigation as NativeStackNavigationProp<MoviesStackParamList>
        ).navigate('Category', {
          title: filter.name,
          contentType: 'movie',
          filter: filter.params,
        });
      } else if (filter.type === 'tv') {
        (
          navigation as NativeStackNavigationProp<TVShowsStackParamList>
        ).navigate('Category', {
          title: filter.name,
          contentType: 'tv',
          filter: filter.params,
        });
      } else {
        // For 'all' type, default to movie
        (
          navigation as NativeStackNavigationProp<MoviesStackParamList>
        ).navigate('Category', {
          title: filter.name,
          contentType: 'movie',
          filter: filter.params,
        });
      }
    },
    [navigation],
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
        {firstPageContent?.map((filter: any, idx: number) => {
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
        data={firstPageContent?.slice(0, MAX_FILTERS) || []} // Limit carousel items to MAX_FILTERS
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
            <TouchableOpacity
              onPress={() => handlePosterPress(savedFilters[index])}
              activeOpacity={0.7}>
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
            </TouchableOpacity>
          );
        }}
      />
      {/* Animated Pagination Dots */}
      <View style={styles.pagination}>
        {firstPageContent?.slice(0, MAX_FILTERS).map((_, idx) => (
          <View key={idx} style={styles.dot} />
        ))}
        <Animated.View style={[styles.activeDot, animatedDotStyle]} />
      </View>
    </View>
  ) : null;
};

const styles = FilterCardStyles(
  SCREEN_WIDTH,
  CARD_HEIGHT,
  CARD_WIDTH,
  DOT_SIZE,
  DOT_SPACING,
);
