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
import Ionicon from 'react-native-vector-icons/Ionicons';
import {HorizontalList} from '../components/HorizontalList';
import {useNavigation} from '@react-navigation/native';
import {ContentItem} from '../components/MovieList';
import {RootStackParamList} from '../types/navigation';
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
  const [isPosterLoading, setIsPosterLoading] = useState(true);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const {data: showDetails, isLoading} = useTVShowDetails(show.id);

  const {
    isItemInContent: checkInWatchlist,
    addItem: addToWatchlist,
    removeItem: removeFromWatchlist,
  } = useUserContent('watchlist');

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
            source={{uri: getImageUrl(show.backdrop_path || '', 'original')}}
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
        <Text style={styles.title}>{show.name}</Text>
        <View style={styles.infoContainer}>
          <Text style={styles.info}>
            {new Date(show.first_air_date).getFullYear()}
          </Text>
          {showDetails?.number_of_seasons && (
            <>
              <Text style={styles.infoDot}>•</Text>
              <Text style={styles.info}>
                {showDetails.number_of_seasons} Seasons
              </Text>
            </>
          )}
          {showDetails?.number_of_episodes && (
            <>
              <Text style={styles.infoDot}>•</Text>
              <Text style={styles.info}>
                {showDetails.number_of_episodes} Episodes
              </Text>
            </>
          )}
          {showDetails?.original_language && (
            <>
              <Text style={styles.infoDot}>•</Text>
              <Text style={styles.info}>{showDetails.original_language}</Text>
            </>
          )}
          {showDetails?.vote_average && (
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
                  {showDetails.vote_average.toFixed(1)}
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
            {checkInWatchlist(show.id) ? (
              <Ionicon name="checkmark" size={24} color="#fff" />
            ) : (
              <Ionicon name="add" size={24} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.genreContainer}>
          {showDetails?.genres
            ?.slice(0, 3)
            .map((genre: Genre, index: number) => (
              <View key={genre.id} style={styles.genreWrapper}>
                <Text style={styles.genre}>{genre.name}</Text>
                {index < Math.min(showDetails.genres.length - 1, 2) && (
                  <Text style={styles.genreDivider}>|</Text>
                )}
              </View>
            ))}
        </View>
      </View>

      <Text style={styles.overview}>{show.overview}</Text>

      {showDetails?.credits && (
        <View style={{marginVertical: spacing.lg, marginTop: 0}}>
          <Text style={styles.sectionTitle}>Cast</Text>
          <ScrollView
            style={{paddingHorizontal: 16, marginBottom: 30}}
            horizontal
            showsHorizontalScrollIndicator={false}>
            {showDetails.credits.cast.slice(0, 10).map((person: Cast) => (
              <TouchableOpacity
                key={person.id}
                style={styles.castItem}
                onPress={() =>
                  navigation.navigate('PersonCredits', {
                    personId: person.id,
                    personName: person.name,
                    contentType: 'tv',
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
            <Ionicon
              name="chevron-down"
              size={20}
              color={colors.text.primary}
            />
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
                    <Text style={styles.episodeTitle} numberOfLines={2}>
                      {episode.name}
                    </Text>

                    <View style={styles.episodeInfo}>
                      {episode?.episode_number && (
                        <Text style={styles.info}>
                          S{episode.season_number} E{episode.episode_number}
                        </Text>
                      )}
                      <Text style={styles.infoDot}>•</Text>

                      <Text style={styles.info}>
                        {new Date(episode.air_date).toLocaleDateString(
                          'en-US',
                          {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          },
                        )}
                      </Text>

                      {episode?.runtime && (
                        <>
                          <Text style={styles.infoDot}>•</Text>
                          <Text style={styles.info}>{episode.runtime} min</Text>
                        </>
                      )}

                      {episode?.vote_average && (
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
                              {episode.vote_average.toFixed(1)}
                            </Text>
                          </View>
                        </>
                      )}
                    </View>
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
                    <Ionicon
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
                            uri: season?.poster_path
                              ? getImageUrl(season?.poster_path)
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
            isSeeAll={false}
          />
        </View>
      )}

      {recommendedShowsData.length > 0 && (
        <View style={styles.section}>
          <HorizontalList
            title="Recommended Shows"
            data={recommendedShowsData}
            onItemPress={handleRecommendedShowPress}
            onEndReached={hasNextRecommended ? fetchNextRecommended : undefined}
            isLoading={isFetchingRecommended}
            isSeeAll={false}
          />
        </View>
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
  seasonsSection: {
    marginVertical: spacing.md,
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
    marginHorizontal: 16,
  },
  seasonDropdownText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  episodesContainer: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  episodesScroll: {
    paddingHorizontal: 16,
  },
  episodeCard: {
    width: 280,
    marginRight: 12,
    // backgroundColor: colors.card.background,
    borderRadius: 8,
    overflow: 'hidden',
    // borderWidth: 1,
    // borderColor: colors.card.border,
  },
  episodeImage: {
    width: '100%',
    height: 157,
    backgroundColor: colors.background.secondary,
    borderRadius: 20,
  },
  episodeContent: {
    padding: 12,
    alignItems: 'center',
  },
  episodeInfo: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  episodeTitle: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    marginBottom: 4,
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
