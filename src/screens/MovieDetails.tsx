import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import {
  useMovieDetails,
  useSimilarMovies,
  useMovieRecommendations,
} from '../hooks/useMovies';
import {useUserContent} from '../hooks/useUserContent';
import {getImageUrl} from '../services/tmdb';
import {Movie, Video, Genre, Cast} from '../types/movie';
import Icon from 'react-native-vector-icons/Ionicons';
import {HorizontalList} from '../components/HorizontalList';
import {useNavigation} from '@react-navigation/native';
import {ContentItem} from '../components/MovieList';
import {RootStackParamList} from '../types/navigation';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {colors, spacing, typography} from '../styles/theme';
import {
  BannerHomeSkeleton,
  DetailScreenSkeleton,
} from '../components/LoadingSkeleton';
import {useWatchProviders} from '../hooks/useWatchProviders';
import {WatchProviders} from '../components/WatchProviders';
import {LinearGradient} from 'react-native-linear-gradient';
import {GradientButton} from '../components/GradientButton';
import Ionicon from 'react-native-vector-icons/Ionicons';
import {PersonCard} from '../components/PersonCard';

type MovieDetailsScreenNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;

const {width} = Dimensions.get('window');

interface MovieDetailsScreenProps {
  route: {
    params: {
      movie: Movie;
    };
  };
}

export const MovieDetailsScreen: React.FC<MovieDetailsScreenProps> = ({
  route,
}) => {
  const navigation = useNavigation<MovieDetailsScreenNavigationProp>();
  const {movie} = route.params;
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPosterLoading, setIsPosterLoading] = useState(true);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const {data: movieDetails, isLoading} = useMovieDetails(movie.id);

  const {
    isItemInContent: checkInWatchlist,
    addItem: addToWatchlist,
    removeItem: removeFromWatchlist,
  } = useUserContent('watchlist');

  const {
    data: similarMovies,
    fetchNextPage: fetchNextSimilar,
    hasNextPage: hasNextSimilar,
    isFetchingNextPage: isFetchingSimilar,
  } = useSimilarMovies(movie.id);

  const {
    data: recommendedMovies,
    fetchNextPage: fetchNextRecommended,
    hasNextPage: hasNextRecommended,
    isFetchingNextPage: isFetchingRecommended,
  } = useMovieRecommendations(movie.id);

  const {data: watchProviders} = useWatchProviders(movie.id, 'movie');

  useEffect(() => {
    // Update watchlist status
    setIsInWatchlist(checkInWatchlist(movie.id));
  }, [checkInWatchlist, movie.id]);

  const handleWatchlistPress = useCallback(async () => {
    if (isInWatchlist) {
      await removeFromWatchlist(movie.id);
      setIsInWatchlist(false);
    } else {
      await addToWatchlist(movie, 'movie');
      setIsInWatchlist(true);
    }
  }, [isInWatchlist, movie, addToWatchlist, removeFromWatchlist]);

  const trailer = movieDetails?.videos.results.find(
    (video: Video) => video.type === 'Trailer' && video.site === 'YouTube',
  );

  const handleSimilarMoviePress = useCallback(
    (item: ContentItem) => {
      if (item.type === 'movie') {
        navigation.navigate('MovieDetails', {movie: item as Movie});
      }
    },
    [navigation],
  );

  const handleRecommendedMoviePress = useCallback(
    (item: ContentItem) => {
      if (item.type === 'movie') {
        navigation.navigate('MovieDetails', {movie: item as Movie});
      }
    },
    [navigation],
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <DetailScreenSkeleton />
      </View>
    );
  }

  const similarMoviesData =
    similarMovies?.pages.flatMap(page =>
      page.results.map((movie: Movie) => ({...movie, type: 'movie' as const})),
    ) || [];

  const recommendedMoviesData =
    recommendedMovies?.pages.flatMap(page =>
      page.results.map((movie: Movie) => ({...movie, type: 'movie' as const})),
    ) || [];

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={['rgba(21, 72, 93, 0.52)', 'transparent']}
        style={styles.gradientShade}
        start={{x: 0, y: 0}}
        end={{x: 0.5, y: 0.5}}
      />

      <View style={styles.main}>
        {isPosterLoading && <BannerHomeSkeleton />}

        {!isPlaying ? (
          <Image
            source={{uri: getImageUrl(movie.backdrop_path || '', 'original')}}
            style={styles.backdrop}
            onLoadEnd={() => setIsPosterLoading(false)}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.trailerContainer}>
            <YoutubePlayer
              height={width * 0.5625}
              play={isPlaying}
              videoId={trailer?.key}
              webViewProps={{
                allowsInlineMediaPlayback: true,
                allowsPictureInPicture: true,
                allowsFullscreenVideo: true,
                allowsPictureInPictureMediaPlayback: true,
              }}
              key={trailer?.key}
              onChangeState={(state: string) => {
                if (state === 'ended') setIsPlaying(false);
              }}
            />
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{movie.title}</Text>
        <View style={styles.infoContainer}>
          <Text style={styles.info}>
            {new Date(movie.release_date).getFullYear()}
          </Text>
          {movieDetails?.runtime && (
            <>
              <Text style={styles.infoDot}>•</Text>
              <Text style={styles.info}>
                {Math.floor(movieDetails.runtime / 60)}h{' '}
                {movieDetails.runtime % 60}m
              </Text>
            </>
          )}
          {movieDetails?.original_language && (
            <>
              <Text style={styles.infoDot}>•</Text>
              <Text style={styles.info}>{movieDetails.original_language}</Text>
            </>
          )}
          {movieDetails?.vote_average && (
            <>
              <Text style={styles.infoDot}>•</Text>
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.xs,
                }}>
                <Ionicon name="star" size={12} color="#ffffff70" />
                <Text style={styles.info}>
                  {movieDetails.vote_average.toFixed(1)}
                </Text>
              </View>
            </>
          )}
        </View>
        <View style={styles.buttonRow}>
          <GradientButton
            title="Watch Now"
            onPress={() => {
              setIsPlaying(true);
            }}
            style={styles.watchButton}
            textStyle={styles.watchButtonText}
          />
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleWatchlistPress}>
            {checkInWatchlist(movie.id) ? (
              <Ionicon name="checkmark" size={24} color="#fff" />
            ) : (
              <Ionicon name="add" size={24} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.genreContainer}>
          {movieDetails?.genres
            ?.slice(0, 3)
            .map((genre: Genre, index: number) => (
              <View key={genre.id} style={styles.genreWrapper}>
                <Text style={styles.genre}>{genre.name}</Text>
                {index < Math.min(movieDetails.genres.length - 1, 2) && (
                  <Text style={styles.genreDivider}>|</Text>
                )}
              </View>
            ))}
        </View>
      </View>

      <Text style={styles.overview}>{movie.overview}</Text>

      {movieDetails?.credits && (
        <View style={{marginVertical: spacing.lg, marginTop: 0}}>
          <Text style={styles.sectionTitle}>Cast</Text>
          <ScrollView
            style={{paddingHorizontal: 16}}
            horizontal
            showsHorizontalScrollIndicator={false}>
            {movieDetails.credits.cast.slice(0, 10).map((person: Cast) => (
              <TouchableOpacity
                key={person.id}
                style={styles.castItem}
                onPress={() =>
                  navigation.navigate('PersonCredits', {
                    personId: person.id,
                    personName: person.name,
                    contentType: 'movie',
                  })
                }>
                <PersonCard
                  item={getImageUrl(person.profile_path || '', 'original')}
                  onPress={() => {}}
                />
                <Text style={styles.castName} numberOfLines={2}>
                  {person.name}
                </Text>
                <Text style={styles.character} numberOfLines={1}>
                  {person.character}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {watchProviders?.results?.US && (
        <WatchProviders providers={watchProviders.results.US} />
      )}

      {similarMoviesData.length > 0 && (
        <HorizontalList
          title="Similar Movies"
          data={similarMoviesData}
          onItemPress={handleSimilarMoviePress}
          onEndReached={hasNextSimilar ? fetchNextSimilar : undefined}
          isLoading={isFetchingSimilar}
          isSeeAll={false}
        />
      )}

      {recommendedMoviesData.length > 0 && (
        <HorizontalList
          title="Recommended Movies"
          data={recommendedMoviesData}
          onItemPress={handleRecommendedMoviePress}
          onEndReached={hasNextRecommended ? fetchNextRecommended : undefined}
          isLoading={isFetchingRecommended}
          isSeeAll={false}
        />
      )}
      <View style={{height: 100}} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  gradientShade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 500,
  },
  main: {
    position: 'relative',
    width: width - 32,
    height: width * 0.5625,
    borderRadius: 40,
    overflow: 'hidden',
    margin: 16,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: {width: 5, height: 20},
    shadowOpacity: 0.25,
    shadowRadius: 10,
    backgroundColor: colors.background.tertiary,
  },
  backdrop: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.background.secondary,
    borderRadius: 40,
  },
  content: {
    padding: 16,
    flexDirection: 'column',
    gap: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trailerContainer: {
    backgroundColor: '#000',
  },
  title: {
    fontSize: 24,
    fontWeight: '400',
    color: '#fff',
    textAlign: 'center',
    width: '100%',
  },
  infoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  infoWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: {
    ...typography.body2,
    color: 'rgba(255, 255, 255, 0.68)',
  },
  infoDot: {
    ...typography.h3,
    color: 'rgba(163, 163, 163, 0.68)',
    marginHorizontal: spacing.xs,
  },
  buttonRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: width - 100,
    marginTop: -spacing.sm,
  },
  watchButton: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 36,
    paddingVertical: 14,
  },
  watchButtonText: {
    fontWeight: '700',
    fontSize: 16,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  genreContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  genreWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  genre: {
    ...typography.body2,
    color: colors.text.primary,
    marginRight: spacing.xs,
  },
  genreDivider: {
    ...typography.body2,
    color: colors.text.primary,
    marginHorizontal: spacing.xs,
  },
  overview: {
    color: colors.text.muted,
    fontSize: 14,
    lineHeight: 20,
    marginHorizontal: 16,
    marginBottom: 30,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: 16,
    marginLeft: 16,
  },
  castItem: {
    marginRight: 16,
    width: 100,
  },
  castImage: {
    width: 100,
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#2a2a2a',
  },
  castName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  character: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
  },
});
