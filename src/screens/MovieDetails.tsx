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
  Modal,
  Alert,
} from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import {
  useMovieDetails,
  useSimilarMovies,
  useMovieRecommendations,
} from '../hooks/useMovies';
import {getImageUrl, getLanguage} from '../services/tmdb';
import {Movie, MovieDetails as MovieDetailsType} from '../types/movie';
import {Video, Genre, Cast} from '../types/movie';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {HorizontalList} from '../components/HorizontalList';
import {useNavigation} from '@react-navigation/native';
import {ContentItem} from '../components/MovieList';
import {MySpaceStackParamList} from '../types/navigation';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {
  DetailScreenSkeleton,
  BannerHomeSkeleton,
} from '../components/LoadingSkeleton';
import {BlurView} from '@react-native-community/blur';
import {useWatchProviders} from '../hooks/useWatchProviders';
import {WatchProviders} from '../components/WatchProviders';
import {LinearGradient} from 'react-native-linear-gradient';
import {GradientButton} from '../components/GradientButton';
import {PersonCard} from '../components/PersonCard';
import {WatchlistModal} from '../components/WatchlistModal';
import {
  useIsItemInAnyWatchlist,
  useWatchlistContainingItem,
  useRemoveFromWatchlist,
} from '../hooks/useWatchlists';

type MovieDetailsScreenNavigationProp =
  NativeStackNavigationProp<MySpaceStackParamList>;

interface MovieDetailsScreenProps {
  route: {
    params: {
      movie: Movie;
    };
  };
}

const {width} = Dimensions.get('window');

export const MovieDetailsScreen: React.FC<MovieDetailsScreenProps> = ({
  route,
}) => {
  const navigation = useNavigation<MovieDetailsScreenNavigationProp>();
  const {movie} = route.params;
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPosterLoading, setIsPosterLoading] = useState(true);
  const [showWatchlistModal, setShowWatchlistModal] = useState(false);
  const {data: movieDetails, isLoading} = useMovieDetails(movie.id);

  const {data: isInAnyWatchlist = false} = useIsItemInAnyWatchlist(movie.id);
  const {data: watchlistContainingItem} = useWatchlistContainingItem(movie.id);
  const removeFromWatchlistMutation = useRemoveFromWatchlist();

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

  const handleWatchlistPress = useCallback(async () => {
    if (isInAnyWatchlist && watchlistContainingItem) {
      // If item is already in a watchlist, remove it
      try {
        await removeFromWatchlistMutation.mutateAsync({
          watchlistId: watchlistContainingItem,
          itemId: movie.id,
        });
      } catch (error) {
        Alert.alert('Error', 'Failed to remove from watchlist');
      }
    } else {
      // If item is not in any watchlist, show modal to add it
      setShowWatchlistModal(true);
    }
  }, [
    isInAnyWatchlist,
    watchlistContainingItem,
    removeFromWatchlistMutation,
    movie.id,
  ]);

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
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}>
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
                <Text style={styles.info}>
                  {getLanguage(movieDetails?.original_language)}
                </Text>
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
                  <Ionicons name="star" size={12} color="#ffffff70" />
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
              onPress={handleWatchlistPress}
              disabled={removeFromWatchlistMutation.isPending}>
              <Ionicons
                name={isInAnyWatchlist ? 'checkmark' : 'add'}
                size={24}
                color={isInAnyWatchlist ? colors.accent : '#fff'}
              />
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

        {movieDetails?.credits?.cast?.length > 0 && (
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

      <WatchlistModal
        visible={showWatchlistModal}
        onClose={() => setShowWatchlistModal(false)}
        item={movie}
        itemType="movie"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
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
  scrollView: {
    flex: 1,
  },
  posterContainer: {
    position: 'relative',
    width: '100%',
    height: Dimensions.get('window').height * 0.5625,
  },
  posterImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.background.secondary,
    borderRadius: 40,
  },
  posterGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 500,
  },
  posterGradientHorizontal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 500,
  },
  posterGradientVertical: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 500,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
  },
  posterContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  posterInfo: {
    flexDirection: 'column',
    gap: 8,
  },
  posterTitle: {
    fontSize: 24,
    fontWeight: '400',
    color: '#fff',
  },
  posterSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.68)',
  },
  posterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  overviewSection: {
    flexDirection: 'column',
    gap: 8,
  },
  overviewText: {
    color: colors.text.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  trailerSection: {
    flexDirection: 'column',
    gap: 16,
  },
  watchProvidersSection: {
    flexDirection: 'column',
    gap: 16,
  },
  similarSection: {
    flexDirection: 'column',
    gap: 16,
  },
  recommendedSection: {
    flexDirection: 'column',
    gap: 16,
  },
});
