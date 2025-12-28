import React from 'react';
import {View, Text, StyleSheet, Image, useWindowDimensions} from 'react-native';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {useQuery} from '@tanstack/react-query';
import {discoverMovies} from '../services/tmdb';
import {Movie} from '../types/movie';
import {ContentItem} from './MovieList';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {HomeStackParamList} from '../types/navigation';
import {useResponsive} from '../hooks/useResponsive';
import LinearGradient from 'react-native-linear-gradient';
import Carousel from 'react-native-reanimated-carousel';
import {Pressable} from 'react-native';

interface CurrentMonthReleasesProps {
  onItemPress?: (item: ContentItem) => void;
}

export const CurrentMonthReleases: React.FC<CurrentMonthReleasesProps> = ({
  onItemPress,
}) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const {isTablet} = useResponsive();
  const {width: SCREEN_WIDTH} = useWindowDimensions();

  const getCurrentMonthRange = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    return {
      'primary_release_date.gte': firstDay.toISOString().split('T')[0],
      'primary_release_date.lte': lastDay.toISOString().split('T')[0],
    };
  };

  const {data: moviesData, isLoading} = useQuery({
    queryKey: ['currentMonthReleases'],
    queryFn: () =>
      discoverMovies({
        ...getCurrentMonthRange(),
        sort_by: 'primary_release_date.desc',
        'vote_count.gte': 10,
      }),
    staleTime: 1000 * 60 * 30,
  });

  const movies = moviesData?.results?.slice(0, 10) || [];

  const CARD_WIDTH = isTablet ? SCREEN_WIDTH * 0.95 : SCREEN_WIDTH;
  const CARD_HEIGHT = isTablet ? 380 : 280;

  const handlePress = (item: Movie) => {
    if (onItemPress) {
      onItemPress({...item, type: 'movie'});
    } else {
      navigation.push('MovieDetails', {movie: item as any});
    }
  };

  if (isLoading || movies.length === 0) {
    return null;
  }

  const currentMonth = new Date().toLocaleDateString('en-US', {month: 'long'});

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{currentMonth} Releases</Text>

      <View style={{height: CARD_HEIGHT, width: SCREEN_WIDTH}}>
        <Carousel
          loop={false}
          width={SCREEN_WIDTH}
          height={CARD_HEIGHT}
          data={movies}
          mode="parallax"
          modeConfig={{
            parallaxScrollingScale: 0.9,
            parallaxScrollingOffset: 50,
          }}
          scrollAnimationDuration={500}
          renderItem={({item}: {item: Movie}) => {
            const releaseDate = new Date(item.release_date);

            return (
              <Pressable
                onPress={() => handlePress(item)}
                style={styles.itemContainer}>
                <View
                  style={[
                    styles.card,
                    {width: CARD_WIDTH, height: CARD_HEIGHT},
                  ]}>
                  <Image
                    source={{
                      uri: `https://image.tmdb.org/t/p/w780${item.backdrop_path}`,
                    }}
                    style={styles.poster}
                    resizeMode="cover"
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
                    <View style={styles.dayContainer}>
                      <Text style={styles.dayText}>
                        {releaseDate.getDate()}
                      </Text>
                    </View>

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
          }}
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
  },
  itemContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
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
  dayContainer: {
    marginRight: 16,
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  dayText: {
    ...typography.h1,
    fontSize: 56,
    fontWeight: '900',
    color: '#FFFFFF',
    includeFontPadding: false,
    lineHeight: 56,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 4,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  movieTitle: {
    ...typography.h2,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
    lineHeight: 22,
  },
  overview: {
    ...typography.body2,
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 10,
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  ratingText: {
    ...typography.body2,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  releaseFullDate: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontWeight: '500',
  },
});
