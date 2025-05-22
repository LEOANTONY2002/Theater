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
  useTVShowDetails,
  useSimilarTVShows,
  useTVShowRecommendations,
} from '../hooks/useTVShows';
import {useUserContent} from '../hooks/useUserContent';
import {getImageUrl} from '../services/tmdb';
import {TVShow, TVShowDetails as TVShowDetailsType} from '../types/tvshow';
import {Video, Genre, Cast} from '../types/movie';
import Icon from 'react-native-vector-icons/Ionicons';
import {HorizontalList} from '../components/HorizontalList';
import {useNavigation} from '@react-navigation/native';
import {ContentItem} from '../components/MovieList';
import {RootStackParamList} from '../types/navigation';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {colors} from '../styles/theme';

type TVShowDetailsScreenNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;

const {width} = Dimensions.get('window');

interface TVShowDetailsScreenProps {
  route: {
    params: {
      show: TVShow;
    };
  };
}

export const TVShowDetailsScreen: React.FC<TVShowDetailsScreenProps> = ({
  route,
}) => {
  const navigation = useNavigation<TVShowDetailsScreenNavigationProp>();
  const {show} = route.params;
  const [isPlaying, setIsPlaying] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const {data: showDetails, isLoading} = useTVShowDetails(show.id);

  const {
    isItemInContent: checkInWatchlist,
    addItem: addToWatchlist,
    removeItem: removeFromWatchlist,
  } = useUserContent('watchlist');

  const {addItem: addToHistory} = useUserContent('history');

  const {
    data: similarShows,
    fetchNextPage: fetchNextSimilar,
    hasNextPage: hasNextSimilar,
    isFetchingNextPage: isFetchingSimilar,
  } = useSimilarTVShows(show.id);

  const {
    data: recommendedShows,
    fetchNextPage: fetchNextRecommended,
    hasNextPage: hasNextRecommended,
    isFetchingNextPage: isFetchingRecommended,
  } = useTVShowRecommendations(show.id);

  useEffect(() => {
    // Add to history when viewing details
    addToHistory(show, 'tv');
  }, [addToHistory, show]);

  useEffect(() => {
    // Update watchlist status
    setIsInWatchlist(checkInWatchlist(show.id));
  }, [checkInWatchlist, show.id]);

  const handleWatchlistPress = useCallback(async () => {
    if (isInWatchlist) {
      await removeFromWatchlist(show.id);
      setIsInWatchlist(false);
    } else {
      await addToWatchlist(show, 'tv');
      setIsInWatchlist(true);
    }
  }, [isInWatchlist, show, addToWatchlist, removeFromWatchlist]);

  const trailer = showDetails?.videos.results.find(
    (video: Video) => video.type === 'Trailer' && video.site === 'YouTube',
  );

  const handleSimilarShowPress = useCallback(
    (item: ContentItem) => {
      if (item.type === 'tv') {
        navigation.navigate('TVShowDetails', {show: item as TVShow});
      }
    },
    [navigation],
  );

  const handleRecommendedShowPress = useCallback(
    (item: ContentItem) => {
      if (item.type === 'tv') {
        navigation.navigate('TVShowDetails', {show: item as TVShow});
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

  const similarShowsData =
    similarShows?.pages.flatMap(page =>
      page.results.map((show: TVShow) => ({...show, type: 'tv' as const})),
    ) || [];

  const recommendedShowsData =
    recommendedShows?.pages.flatMap(page =>
      page.results.map((show: TVShow) => ({...show, type: 'tv' as const})),
    ) || [];

  return (
    <ScrollView style={styles.container}>
      {!isPlaying ? (
        <View style={styles.header}>
          <Image
            source={{uri: getImageUrl(show.backdrop_path || '', 'original')}}
            style={styles.backdrop}
            resizeMode="cover"
          />
          {trailer && (
            <TouchableOpacity style={styles.playButton}>
              <Text style={styles.playButtonText}>▶ Play Trailer</Text>
            </TouchableOpacity>
          )}
        </View>
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

      <View style={styles.content}>
        <Text style={styles.title}>{show.name}</Text>
        <View style={styles.info}>
          <Text style={styles.rating}>⭐ {show.vote_average.toFixed(1)}</Text>
          <Text style={styles.year}>
            {new Date(show.first_air_date).getFullYear()}
          </Text>
          {showDetails?.episode_run_time?.[0] && (
            <Text style={styles.runtime}>
              {showDetails.episode_run_time[0]}min per ep
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

        {showDetails?.genres && (
          <View style={styles.genres}>
            {showDetails.genres.map((genre: Genre) => (
              <View key={genre.id} style={styles.genre}>
                <Text style={styles.genreText}>{genre.name}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.overview}>{show.overview}</Text>

        {showDetails && (
          <View style={styles.showInfo}>
            <Text style={styles.sectionTitle}>Show Info</Text>
            <Text style={styles.infoText}>
              Seasons: {showDetails.number_of_seasons}
            </Text>
            <Text style={styles.infoText}>
              Episodes: {showDetails.number_of_episodes}
            </Text>
            <Text style={styles.infoText}>Status: {showDetails.status}</Text>
          </View>
        )}

        {showDetails?.credits && (
          <>
            <Text style={styles.sectionTitle}>Cast</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {showDetails.credits.cast.slice(0, 10).map((person: Cast) => (
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

        {showDetails?.seasons && (
          <>
            <Text style={styles.sectionTitle}>Seasons</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {showDetails.seasons.map(
                (season: TVShowDetailsType['seasons'][0]) => (
                  <View key={season.id} style={styles.seasonItem}>
                    <Image
                      source={{
                        uri: season.poster_path
                          ? getImageUrl(season.poster_path)
                          : 'https://via.placeholder.com/100x150',
                      }}
                      style={styles.seasonImage}
                    />
                    <Text style={styles.seasonName} numberOfLines={2}>
                      {season.name}
                    </Text>
                    <Text style={styles.episodeCount}>
                      {season.episode_count} episodes
                    </Text>
                  </View>
                ),
              )}
            </ScrollView>
          </>
        )}

        {similarShowsData.length > 0 && (
          <View style={styles.section}>
            <HorizontalList
              title="Similar Shows"
              data={similarShowsData}
              onItemPress={handleSimilarShowPress}
              onEndReached={hasNextSimilar ? fetchNextSimilar : undefined}
              isLoading={isFetchingSimilar}
            />
          </View>
        )}

        {recommendedShowsData.length > 0 && (
          <View style={styles.section}>
            <HorizontalList
              title="Recommended Shows"
              data={recommendedShowsData}
              onItemPress={handleRecommendedShowPress}
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
    backgroundColor: colors.background.primary,
  },
  playButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: colors.background.primary,
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
  showInfo: {
    marginBottom: 24,
  },
  infoText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 4,
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
  seasonItem: {
    marginRight: 16,
    width: 120,
  },
  seasonImage: {
    width: 120,
    height: 180,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#2a2a2a',
  },
  seasonName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  episodeCount: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
  },
  section: {
    marginTop: 24,
  },
});
