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
} from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import {
  useTVShowDetails,
  useSimilarTVShows,
  useTVShowRecommendations,
  useSeasonDetails,
} from '../hooks/useTVShows';
import {useUserContent} from '../hooks/useUserContent';
import {getImageUrl} from '../services/tmdb';
import {
  TVShow,
  TVShowDetails as TVShowDetailsType,
  Episode,
} from '../types/tvshow';
import {Video, Genre, Cast} from '../types/movie';
import Icon from 'react-native-vector-icons/Ionicons';
import {HorizontalList} from '../components/HorizontalList';
import {useNavigation} from '@react-navigation/native';
import {ContentItem} from '../components/MovieList';
import {RootStackParamList} from '../types/navigation';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {DetailScreenSkeleton} from '../components/LoadingSkeleton';
import {BlurView} from '@react-native-community/blur';
import {useWatchProviders} from '../hooks/useWatchProviders';
import {WatchProviders} from '../components/WatchProviders';

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

  const [showSeasonModal, setShowSeasonModal] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(showDetails?.seasons[0]);

  const {data: episodes} = useSeasonDetails(
    show.id,
    selectedSeason?.season_number,
  );

  const {data: watchProviders} = useWatchProviders(show.id, 'tv');
  console.log('TV Show Watch Providers:', watchProviders);

  useEffect(() => {
    // Add to history when viewing details
    addToHistory(show, 'tv');
  }, [addToHistory, show]);

  useEffect(() => {
    // Update watchlist status
    setIsInWatchlist(checkInWatchlist(show.id));
  }, [checkInWatchlist, show.id]);

  useEffect(() => {
    if (
      showDetails?.seasons &&
      showDetails.seasons.length > 0 &&
      !selectedSeason
    ) {
      // Find the first non-empty season (skip specials if empty)
      const firstValidSeason = showDetails.seasons.find(
        (season: TVShowDetailsType['seasons'][0]) =>
          season.season_number > 0 ||
          (season.season_number === 0 && season.episode_count > 0),
      );
      if (firstValidSeason) {
        setSelectedSeason(firstValidSeason);
      }
    }
  }, [showDetails, selectedSeason]);

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
        <DetailScreenSkeleton />
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

  const getSeasonTitle = (season: TVShowDetailsType['seasons'][0]) => {
    if (season.season_number === 0) {
      return 'Specials';
    }
    return `Season ${season.season_number}`;
  };

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
            <TouchableOpacity
              style={styles.playButton}
              onPress={() => setIsPlaying(true)}>
              <Text style={styles.playButtonText}>▶ Play Trailer</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.trailerContainer}>
          {trailer ? (
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
                console.log('Player State:', state);
                if (state === 'ended') setIsPlaying(false);
              }}
            />
          ) : (
            <View
              style={[
                styles.trailerContainer,
                {
                  height: width * 0.5625,
                  justifyContent: 'center',
                  alignItems: 'center',
                },
              ]}>
              <Text style={{color: '#fff'}}>No trailer available</Text>
            </View>
          )}
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
          <View style={styles.seasonsSection}>
            <Text style={styles.sectionTitle}>Seasons</Text>
            <TouchableOpacity
              style={styles.seasonDropdown}
              onPress={() => setShowSeasonModal(true)}>
              <Text style={styles.seasonDropdownText}>
                {selectedSeason
                  ? getSeasonTitle(selectedSeason)
                  : 'Select Season'}
              </Text>
              <Icon name="chevron-down" size={20} color={colors.text.primary} />
            </TouchableOpacity>

            {selectedSeason && episodes && episodes.episodes.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.episodesContainer}>
                {episodes.episodes.map((episode: Episode) => (
                  <TouchableOpacity
                    key={episode.id}
                    style={styles.episodeCard}
                    onPress={() => {
                      // Handle episode selection
                    }}>
                    <Image
                      source={{
                        uri: episode.still_path
                          ? getImageUrl(episode.still_path)
                          : 'https://via.placeholder.com/200x112',
                      }}
                      style={styles.episodeImage}
                    />
                    <View style={styles.episodeContent}>
                      <View style={styles.episodeNumber}>
                        <Text style={styles.episodeNumberText}>
                          {episode.episode_number}
                        </Text>
                      </View>
                      <Text style={styles.episodeTitle} numberOfLines={2}>
                        {episode.name}
                      </Text>
                      <Text style={styles.episodeRuntime}>
                        {episode.runtime} min
                      </Text>
                      {episode.air_date && (
                        <Text style={styles.episodeAirDate}>
                          {new Date(episode.air_date).toLocaleDateString()}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.noEpisodesContainer}>
                <Text style={styles.noEpisodesText}>
                  {selectedSeason?.season_number === 0
                    ? 'No special episodes available'
                    : 'No episodes available for this season'}
                </Text>
              </View>
            )}

            <Modal
              visible={showSeasonModal}
              transparent
              animationType="slide"
              statusBarTranslucent={true}
              onRequestClose={() => setShowSeasonModal(false)}>
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowSeasonModal(false)}>
                <View style={styles.modalContent}>
                  <BlurView
                    style={styles.blurView}
                    blurType="dark"
                    blurAmount={10}
                    overlayColor="rgba(23, 20, 48, 0.87)"
                    reducedTransparencyFallbackColor="rgba(0, 0, 0, 0.5)"
                  />
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Select Season</Text>
                    <TouchableOpacity onPress={() => setShowSeasonModal(false)}>
                      <Icon
                        name="close"
                        size={24}
                        color={colors.text.primary}
                      />
                    </TouchableOpacity>
                  </View>
                  <ScrollView style={styles.seasonsList}>
                    {showDetails.seasons.map(
                      (season: TVShowDetailsType['seasons'][0]) => (
                        <TouchableOpacity
                          key={season.id}
                          style={styles.seasonItem}
                          onPress={() => {
                            setSelectedSeason(season);
                            setShowSeasonModal(false);
                          }}>
                          <Image
                            source={{
                              uri: season.poster_path
                                ? getImageUrl(season.poster_path)
                                : 'https://via.placeholder.com/100x150',
                            }}
                            style={styles.seasonItemPoster}
                          />
                          <View style={styles.seasonItemInfo}>
                            <Text style={styles.seasonItemName}>
                              {getSeasonTitle(season)}
                            </Text>
                            <Text style={styles.seasonItemEpisodes}>
                              {season.episode_count} Episodes
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ),
                    )}
                  </ScrollView>
                </View>
              </TouchableOpacity>
            </Modal>
          </View>
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

        {watchProviders?.results?.US && (
          <WatchProviders providers={watchProviders.results.US} />
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
  seasonsSection: {
    marginTop: 24,
    marginBottom: 24,
  },
  seasonDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card.background,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.card.border,
    marginTop: 8,
  },
  seasonDropdownText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  episodesContainer: {
    marginTop: 16,
  },
  episodesScroll: {
    paddingHorizontal: 16,
  },
  episodeCard: {
    width: 280,
    marginRight: 12,
    backgroundColor: colors.card.background,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.card.border,
  },
  episodeImage: {
    width: '100%',
    height: 157,
    backgroundColor: colors.background.secondary,
  },
  episodeContent: {
    padding: 12,
  },
  episodeNumber: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  episodeNumberText: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  episodeTitle: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  episodeRuntime: {
    color: colors.text.secondary,
    fontSize: 14,
    marginBottom: 2,
  },
  episodeAirDate: {
    color: colors.text.secondary,
    fontSize: 14,
  },
  blurView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'rgba(10, 10, 32, 0.8)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0)',
  },
  modalTitle: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '600',
  },
  seasonsList: {
    padding: 16,
  },
  seasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  seasonItemPoster: {
    width: 60,
    height: 90,
    borderRadius: 4,
    marginRight: 12,
  },
  seasonItemInfo: {
    flex: 1,
  },
  seasonItemName: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  seasonItemEpisodes: {
    color: colors.text.secondary,
    fontSize: 14,
  },
  section: {
    marginTop: 24,
  },
  noEpisodesContainer: {
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noEpisodesText: {
    color: colors.text.secondary,
    ...typography.body1,
    textAlign: 'center',
  },
  selectedSeasonItem: {
    backgroundColor: colors.primary,
  },
  seasonItemText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '500',
  },
});
