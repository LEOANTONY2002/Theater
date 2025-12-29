import React from 'react';
import {View, Text, StyleSheet, useWindowDimensions} from 'react-native';
import {colors, spacing, typography} from '../styles/theme';
import {useTodayReleasedMovies} from '../hooks/useMovies';
import {Movie} from '../types/movie';
import {ContentItem} from './MovieList';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {HomeStackParamList} from '../types/navigation';
import {useResponsive} from '../hooks/useResponsive';
import LinearGradient from 'react-native-linear-gradient';
import Carousel from 'react-native-reanimated-carousel';
import {Pressable} from 'react-native';
import FastImage from 'react-native-fast-image';

interface TodayMovieReleasesProps {
  onItemPress?: (item: ContentItem) => void;
}

interface ReleaseItemProps {
  item: Movie;
  onPress: (item: Movie) => void;
  width: number;
  height: number;
}

const ReleaseItem = React.memo(
  ({item, onPress, width, height}: ReleaseItemProps) => {
    const dateInfo = React.useMemo(() => {
      if (!item.release_date) return null;
      const date = new Date(item.release_date);
      const day = date.getDate();
      const month = date
        .toLocaleDateString('en-US', {month: 'short'})
        .toUpperCase();
      return {day, month};
    }, [item.release_date]);

    return (
      <Pressable onPress={() => onPress(item)} style={styles.itemContainer}>
        <View style={[styles.card, {width, height}]}>
          <FastImage
            source={{
              uri: `https://image.tmdb.org/t/p/w780${
                item.backdrop_path || item.poster_path
              }`,
              priority: FastImage.priority.normal,
            }}
            style={styles.poster}
            resizeMode={FastImage.resizeMode.cover}
          />

          <LinearGradient
            colors={[
              'transparent',
              'rgba(0,0,0,0.1)',
              'rgba(0,0,0,0.8)',
              'rgba(0,0,0,0.95)',
            ]}
            locations={[0, 0.4, 0.8, 1]}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.contentOverlay}>
            <View style={styles.infoContainer}>
              <Text style={styles.movieTitle} numberOfLines={1}>
                {item.title}
              </Text>

              <Text style={styles.overview} numberOfLines={2}>
                {item.overview}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  },
  (prev, next) =>
    prev.item.id === next.item.id &&
    prev.width === next.width &&
    prev.height === next.height,
);

export const TodayMovieReleases: React.FC<TodayMovieReleasesProps> = ({
  onItemPress,
}) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const {isTablet} = useResponsive();
  const {width: SCREEN_WIDTH} = useWindowDimensions();

  const {data, isLoading} = useTodayReleasedMovies();

  const movies = React.useMemo(
    () =>
      data?.pages?.[0]?.results?.filter((m: Movie) => m.title && m.overview) ||
      [],
    [data],
  );

  const CARD_DIMENSIONS = React.useMemo(
    () => ({
      width: isTablet ? SCREEN_WIDTH * 0.95 : SCREEN_WIDTH,
      height: isTablet ? 380 : 250,
    }),
    [isTablet, SCREEN_WIDTH],
  );

  const handlePress = React.useCallback(
    (item: Movie) => {
      if (onItemPress) {
        onItemPress({...item, type: 'movie'});
      } else {
        navigation.push('MovieDetails', {movie: item as any});
      }
    },
    [onItemPress, navigation],
  );

  if (isLoading || movies.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Today's Release</Text>
      <View style={styles.dateLargeContainer}>
        <Text style={styles.dayLargeText}>{new Date().getDate()}</Text>
      </View>
      <LinearGradient
        colors={[
          'transparent',
          'rgba(0,0,0,0.1)',
          'rgba(0,0,0,0.8)',
          'rgba(0,0,0,0.95)',
        ]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={{
          position: 'absolute',
          top: -25,
          right: 10,
          width: 100,
          height: 70,
          zIndex: 1,
        }}
      />

      <View style={{height: CARD_DIMENSIONS.height, width: SCREEN_WIDTH}}>
        <Carousel
          width={SCREEN_WIDTH}
          height={CARD_DIMENSIONS.height}
          data={movies}
          mode="parallax"
          modeConfig={{
            parallaxScrollingScale: 0.8,
            parallaxScrollingOffset: isTablet ? 100 : 120,
          }}
          windowSize={3}
          scrollAnimationDuration={500}
          renderItem={({item}: {item: Movie}) => (
            <ReleaseItem
              item={item}
              onPress={handlePress}
              width={CARD_DIMENSIONS.width}
              height={CARD_DIMENSIONS.height}
            />
          )}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  itemContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.modal.blur,
    backgroundColor: '#1a1a1a',
    elevation: 50,
    shadowColor: '#000',
    shadowOffset: {
      width: 20,
      height: 20,
    },
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  contentOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dateLargeContainer: {
    marginRight: 16,
    justifyContent: 'flex-end',
    marginBottom: 4,
    alignItems: 'center',
    position: 'absolute',
    top: -25,
    right: 0,
  },
  dayLargeText: {
    ...typography.h1,
    fontSize: 70,
    fontWeight: '900',
    fontFamily: 'Inter_18pt-Black',
    color: colors.text.primary,
    includeFontPadding: false,
  },
  monthLargeText: {
    ...typography.h1,
    fontSize: 48,
    fontWeight: '900',
    color: colors.text.primary,
    includeFontPadding: false,
    marginTop: -10,
  },
  movieTitle: {
    ...typography.h2,
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
    lineHeight: 26,
  },
  releaseNameText: {
    ...typography.body2,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '700',
    marginBottom: 6,
  },
  overview: {
    ...typography.body2,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 10,
    lineHeight: 18,
  },
});
