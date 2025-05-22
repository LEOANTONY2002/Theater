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
import {colors} from '../styles/theme';

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
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const {data: movieDetails, isLoading} = useMovieDetails(movie.id);

  const {
    isItemInContent: checkInWatchlist,
    addItem: addToWatchlist,
    removeItem: removeFromWatchlist,
  } = useUserContent('watchlist');

  const {addItem: addToHistory} = useUserContent('history');

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

  useEffect(() => {
    // Add to history when viewing details
    addToHistory(movie, 'movie');
  }, [addToHistory, movie]);

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
        <ActivityIndicator size="large" color="#fff" />
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
      {!isPlaying ? (
        <View style={styles.header}>
          <Image
            source={{uri: getImageUrl(movie.backdrop_path || '', 'original')}}
            style={styles.backdrop}
            resizeMode="cover"
          />
          {trailer && (
            <TouchableOpacity
              style={styles.playButton}
              onPress={() => setIsPlaying(true)}>
              <Text style={styles.playButtonText}>▶ Play Trailer</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.trailerContainer}>
          <YoutubePlayer
            height={width * 0.5625}
            play={isPlaying}
            videoId={trailer.key}
            webViewProps={{
              allowsInlineMediaPlayback: true,
              allowsPictureInPicture: true,
              allowsFullscreenVideo: true,
              allowsPictureInPictureMediaPlayback: true,
            }}
            key={trailer.key}
            onChangeState={(state: string) => {
              if (state === 'ended') setIsPlaying(false);
            }}
          />
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.title}>{movie.title}</Text>
        <View style={styles.info}>
          <Text style={styles.rating}>⭐ {movie.vote_average.toFixed(1)}</Text>
          <Text style={styles.year}>
            {new Date(movie.release_date).getFullYear()}
          </Text>
          {movieDetails?.runtime && (
            <Text style={styles.runtime}>
              {Math.floor(movieDetails.runtime / 60)}h{' '}
              {movieDetails.runtime % 60}m
            </Text>
          )}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleWatchlistPress}>
            <Icon
              name={isInWatchlist ? 'bookmark' : 'bookmark-outline'}
              size={24}
              color={isInWatchlist ? '#e50914' : '#fff'}
            />
            <Text style={styles.actionText}>
              {isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
            </Text>
          </TouchableOpacity>
        </View>

        {movieDetails?.genres && (
          <View style={styles.genres}>
            {movieDetails.genres.map((genre: Genre) => (
              <View key={genre.id} style={styles.genre}>
                <Text style={styles.genreText}>{genre.name}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.overview}>{movie.overview}</Text>

        {movieDetails?.credits && (
          <>
            <Text style={styles.sectionTitle}>Cast</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {movieDetails.credits.cast.slice(0, 10).map((person: Cast) => (
                <View key={person.id} style={styles.castItem}>
                  <Image
                    source={{
                      uri: person.profile_path
                        ? getImageUrl(person.profile_path)
                        : 'https://via.placeholder.com/100x150',
                    }}
                    style={styles.castImage}
                  />
                  <Text style={styles.castName} numberOfLines={2}>
                    {person.name}
                  </Text>
                  <Text style={styles.character} numberOfLines={1}>
                    {person.character}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </>
        )}

        {similarMoviesData.length > 0 && (
          <View style={styles.section}>
            <HorizontalList
              title="Similar Movies"
              data={similarMoviesData}
              onItemPress={handleSimilarMoviePress}
              onEndReached={hasNextSimilar ? fetchNextSimilar : undefined}
              isLoading={isFetchingSimilar}
            />
          </View>
        )}

        {recommendedMoviesData.length > 0 && (
          <View style={styles.section}>
            <HorizontalList
              title="Recommended Movies"
              data={recommendedMoviesData}
              onItemPress={handleRecommendedMoviePress}
              onEndReached={
                hasNextRecommended ? fetchNextRecommended : undefined
              }
              isLoading={isFetchingRecommended}
            />
          </View>
        )}
      </View>
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
  header: {
    position: 'relative',
  },
  backdrop: {
    width: '100%',
    height: width * 0.5625,
    backgroundColor: colors.background.secondary,
  },
  playButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: colors.button.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  playButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  trailerContainer: {
    backgroundColor: '#000',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  rating: {
    fontSize: 16,
    color: '#ffd700',
    marginRight: 16,
  },
  year: {
    fontSize: 16,
    color: '#888',
    marginRight: 16,
  },
  runtime: {
    fontSize: 16,
    color: '#888',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#2a2a2a',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  actionText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 14,
  },
  genres: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  genre: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  genreText: {
    color: '#fff',
    fontSize: 14,
  },
  overview: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
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
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  character: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
  },
  section: {
    marginTop: 24,
  },
});
