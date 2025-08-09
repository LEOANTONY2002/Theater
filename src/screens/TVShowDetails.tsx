import React, {useState, useEffect, useCallback, useRef} from 'react';
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
  Animated,
  Easing,
} from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import {
  useTVShowDetails,
  useSimilarTVShows,
  useTVShowRecommendations,
  useSeasonDetails,
} from '../hooks/useTVShows';
import {fetchContentFromAI, getImageUrl, getLanguage} from '../services/tmdb';
import {
  TVShow,
  TVShowDetails as TVShowDetailsType,
  Episode,
} from '../types/tvshow';
import {Video, Genre, Cast, Movie} from '../types/movie';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {HorizontalList} from '../components/HorizontalList';
import {useIsFocused, useNavigation} from '@react-navigation/native';
import {useNavigationState} from '../hooks/useNavigationState';
import {ContentItem} from '../components/MovieList';
import {MySpaceStackParamList} from '../types/navigation';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {
  DetailScreenSkeleton,
  BannerHomeSkeleton,
  BannerSkeleton,
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
import {FlashList} from '@shopify/flash-list';
import Cinema from '../components/Cinema';
import ServerModal from '../components/ServerModal';
import {getSimilarByStory} from '../services/gemini';
import {GradientSpinner} from '../components/GradientSpinner';

type TVShowDetailsScreenNavigationProp =
  NativeStackNavigationProp<MySpaceStackParamList>;

interface TVShowDetailsScreenProps {
  route: {
    params: {
      show: TVShow;
    };
  };
}

const {width} = Dimensions.get('window');

export const TVShowDetailsScreen: React.FC<TVShowDetailsScreenProps> = ({
  route,
}) => {
  const navigation = useNavigation<TVShowDetailsScreenNavigationProp>();
  const {navigateWithLimit} = useNavigationState();
  const {show} = route.params;
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPosterLoading, setIsPosterLoading] = useState(true);
  const [showWatchlistModal, setShowWatchlistModal] = useState(false);
  const {data: showDetails, isLoading} = useTVShowDetails(show.id);
  const {data: isInAnyWatchlist = false} = useIsItemInAnyWatchlist(show.id);
  const {data: watchlistContainingItem} = useWatchlistContainingItem(show.id);
  const removeFromWatchlistMutation = useRemoveFromWatchlist();
  const cinema = true;
  const isFocused = useIsFocused();
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [currentServer, setCurrentServer] = useState<number | null>(1);
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [aiSimilarShows, setAiSimilarShows] = useState<any[]>([]);
  const [isLoadingAiSimilar, setIsLoadingAiSimilar] = useState(false);

  console.log('AI Sim', aiSimilarShows);

  // Animation values for loading states and components (same as MovieDetails)
  const loadingPulseAnim = useRef(new Animated.Value(1)).current;
  const posterFadeAnim = useRef(new Animated.Value(0)).current;
  const contentFadeAnim = useRef(new Animated.Value(0)).current;
  const castFadeAnim = useRef(new Animated.Value(0)).current;
  const similarFadeAnim = useRef(new Animated.Value(0)).current;

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

  // Animate loading spinner with pulse effect (same as MovieDetails)
  useEffect(() => {
    if (isLoading) {
      const pulseAnimation = Animated.sequence([
        Animated.timing(loadingPulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(loadingPulseAnim, {
          toValue: 1.1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]);
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    }
  }, [isLoading]);

  // Animate poster fade-in when image loads
  useEffect(() => {
    if (!isPosterLoading) {
      Animated.timing(posterFadeAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [isPosterLoading]);

  // Animate content sections when data is available
  useEffect(() => {
    if (!isLoading && showDetails) {
      Animated.timing(contentFadeAnim, {
        toValue: 1,
        duration: 500,
        delay: 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();

      Animated.timing(castFadeAnim, {
        toValue: 1,
        duration: 500,
        delay: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();

      Animated.timing(similarFadeAnim, {
        toValue: 1,
        duration: 500,
        delay: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [isLoading, showDetails]);

  const handleWatchlistPress = useCallback(async () => {
    if (isInAnyWatchlist && watchlistContainingItem) {
      // If item is already in a watchlist, remove it
      try {
        await removeFromWatchlistMutation.mutateAsync({
          watchlistId: watchlistContainingItem,
          itemId: show.id,
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
    show.id,
  ]);

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

  useEffect(() => {
    async function fetchAiSimilar() {
      if (showDetails?.overview && showDetails?.name) {
        setIsLoadingAiSimilar(true);
        try {
          let aiResponse = await getSimilarByStory({
            title: showDetails.name,
            overview: showDetails.overview,
            genres:
              showDetails?.genres?.map((g: Genre) => g?.name).join(', ') || '',
            type: 'tv',
          });
          if (Array.isArray(aiResponse) && aiResponse.length > 0) {
            const shows = await fetchContentFromAI(aiResponse, 'tv');
            setAiSimilarShows(shows);
          } else {
            setAiSimilarShows([]);
          }
        } catch {
          setAiSimilarShows([]);
        } finally {
          setIsLoadingAiSimilar(false);
        }
      }
    }
    fetchAiSimilar();
  }, [showDetails?.overview, showDetails?.name]);

  const trailer = showDetails?.videos.results.find(
    (video: Video) => video.type === 'Trailer' && video.site === 'YouTube',
  );

  const handleItemPress = useCallback(
    (item: ContentItem) => {
      if (item.type === 'movie') {
        navigateWithLimit('MovieDetails', {movie: item as Movie});
      } else {
        navigateWithLimit('TVShowDetails', {show: item as TVShow});
      }
    },
    [navigateWithLimit],
  );

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handlePersonPress = useCallback(
    (personId: number, personName: string) => {
      navigateWithLimit('PersonCredits', {
        personId,
        personName,
        contentType: 'tv',
      });
    },
    [navigateWithLimit],
  );

  const renderEpisodeItem = useCallback(
    ({item: episode}: {item: Episode}) => (
      <TouchableOpacity
        key={episode.id}
        style={styles.episodeCard}
        activeOpacity={0.9}
        onPress={() => setEpisode(episode.episode_number)}>
        <Image
          source={{
            uri: episode.still_path
              ? getImageUrl(episode.still_path, 'w300')
              : 'https://via.placeholder.com/200x112',
          }}
          style={styles.episodeImage}
        />
        <View style={styles.episodeContent}>
          <Text style={styles.episodeTitle} numberOfLines={1}>
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
              {new Date(episode.air_date).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
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
                  <Ionicons name="star" size={12} color="#ffffff70" />
                  <Text style={styles.info}>
                    {episode.vote_average.toFixed(1)}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>
    ),
    [],
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Animated.View style={{transform: [{scale: loadingPulseAnim}]}}>
          <DetailScreenSkeleton />
        </Animated.View>
      </View>
    );
  }

  const similarShowsData =
    similarShows?.pages.flatMap(page =>
      page.results.map((show: TVShow) => ({...show, type: 'tv' as const})),
    ) || [];

  // const recommendedShowsData =
  //   recommendedShows?.pages.flatMap(page =>
  //     page.results.map((show: TVShow) => ({...show, type: 'tv' as const})),
  //   ) || [];

  const getSeasonTitle = (season: TVShowDetailsType['seasons'][0]) => {
    if (season.season_number === 0) {
      return 'Specials';
    }
    return `Season ${season.season_number}`;
  };

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
          {isPosterLoading && !isPlaying && <BannerSkeleton />}

          {!isPlaying ? (
            <Animated.View style={{opacity: posterFadeAnim}}>
              <Image
                source={{
                  uri: getImageUrl(showDetails.backdrop_path || '', 'original'),
                }}
                style={styles.backdrop}
                onLoadEnd={() => setIsPosterLoading(false)}
                resizeMode="cover"
              />
            </Animated.View>
          ) : (
            <View style={styles.trailerContainer}>
              {cinema && isFocused ? (
                <Cinema
                  id={show.id.toString()}
                  type="tv"
                  season={season}
                  episode={episode}
                  currentServer={currentServer || 1}
                />
              ) : (
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
              )}
            </View>
          )}
        </View>

        <Animated.View
          style={[
            styles.content,
            {
              opacity: contentFadeAnim,
              transform: [
                {
                  translateY: contentFadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [15, 0],
                  }),
                },
              ],
            },
          ]}>
          <Text style={styles.title}>{show.name}</Text>
          <View style={styles.infoContainer}>
            <Text style={styles.info}>
              {new Date(showDetails?.first_air_date).getFullYear()}
            </Text>
            {showDetails?.number_of_seasons && (
              <>
                <Text style={styles.infoDot}>•</Text>
                <Text style={styles.info}>
                  {showDetails.number_of_seasons} Season
                  {showDetails.number_of_seasons !== 1 ? 's' : ''}
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
                <Text style={styles.info}>
                  {getLanguage(showDetails?.original_language)}
                </Text>
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
                  <Ionicons name="star" size={12} color="#ffffff70" />
                  <Text style={styles.info}>
                    {showDetails.vote_average.toFixed(1)}
                  </Text>
                </View>
              </>
            )}
          </View>
          <View style={styles.buttonRow}>
            {cinema && isFocused ? (
              isPlaying ? (
                <GradientButton
                  title="Switch Server"
                  onPress={() => {
                    setIsServerModalOpen(true);
                  }}
                  style={styles.watchButton}
                  textStyle={styles.watchButtonText}
                  v2
                />
              ) : (
                <GradientButton
                  title="Watch Now"
                  onPress={() => {
                    setIsPlaying(true);
                  }}
                  style={styles.watchButton}
                  textStyle={styles.watchButtonText}
                />
              )
            ) : (
              <GradientButton
                title="Watch Now"
                onPress={() => {
                  setIsPlaying(true);
                }}
                style={{
                  ...styles.watchButton,
                  opacity: isPlaying ? 0.3 : 1,
                }}
                textStyle={styles.watchButtonText}
              />
            )}
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
            {showDetails?.genres
              ?.slice(0, 3)
              .map((genre: Genre, index: number) => (
                <View key={genre?.id} style={styles.genreWrapper}>
                  <Text style={styles.genre}>{genre?.name}</Text>
                  {index < Math.min(showDetails.genres.length - 1, 2) && (
                    <Text style={styles.genreDivider}>|</Text>
                  )}
                </View>
              ))}
          </View>
          <Text style={styles.overview}>{showDetails.overview}</Text>
        </Animated.View>

        {showDetails?.credits?.cast?.length > 0 && (
          <Animated.View
            style={{
              marginVertical: spacing.lg,
              marginTop: 0,
              opacity: castFadeAnim,
              transform: [
                {
                  translateY: castFadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            }}>
            <Text style={styles.sectionTitle}>Cast</Text>
            <ScrollView
              style={{paddingHorizontal: 16}}
              horizontal
              showsHorizontalScrollIndicator={false}>
              {showDetails.credits.cast.slice(0, 10).map((person: Cast) => (
                <TouchableOpacity
                  key={person?.id}
                  style={styles.castItem}
                  onPress={() => handlePersonPress(person?.id, person?.name)}>
                  <PersonCard
                    item={getImageUrl(person.profile_path || '', 'w154')}
                    onPress={() => handlePersonPress(person.id, person.name)}
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
          </Animated.View>
        )}

        {watchProviders && <WatchProviders providers={watchProviders} />}

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
              <Ionicons
                name="chevron-down"
                size={20}
                color={colors.text.primary}
              />
            </TouchableOpacity>

            {selectedSeason && episodes && episodes.episodes.length > 0 ? (
              <FlashList
                data={episodes.episodes}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.episodesContainer}
                estimatedItemSize={280}
                keyExtractor={(episode: Episode) => episode.id.toString()}
                removeClippedSubviews={true}
                renderItem={renderEpisodeItem}
              />
            ) : (
              <View style={styles.noEpisodesContainer}>
                {/* <Text style={styles.noEpisodesText}>
                  {selectedSeason?.season_number === 0
                    ? 'No special episodes available'
                    : 'No episodes available for this season'}
                </Text> */}
                <View style={styles.noEpisodesContainer}>
                  <GradientSpinner
                    size={30}
                    thickness={3}
                    style={{
                      marginVertical: 50,
                      alignItems: 'center',
                      alignSelf: 'center',
                    }}
                    colors={[
                      colors.modal.activeBorder,
                      colors.modal.activeBorder,
                      'transparent',
                      'transparent',
                    ]}
                  />
                  <Text style={styles.noEpisodesText}>
                    Fetching episodes...
                  </Text>
                </View>
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
                activeOpacity={0.9}
                onPress={() => setShowSeasonModal(false)}>
                <View style={styles.modalContent}>
                  <BlurView
                    style={styles.blurView}
                    blurType="dark"
                    blurAmount={10}
                    overlayColor={colors.modal.blur}
                    reducedTransparencyFallbackColor={colors.modal.blur}
                  />
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Select Season</Text>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => setShowSeasonModal(false)}>
                      <Ionicons
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
                          activeOpacity={0.9}
                          style={[
                            styles.seasonItem,
                            selectedSeason?.id === season.id && {
                              backgroundColor: colors.modal.active,
                              borderWidth: 1,
                              borderColor: colors.text.tertiary,
                            },
                          ]}
                          onPress={() => {
                            setSelectedSeason(season);
                            setSeason(season.season_number);
                            setShowSeasonModal(false);
                          }}>
                          <Image
                            source={{
                              uri: season?.poster_path
                                ? getImageUrl(season?.poster_path, 'w185')
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

        {showDetails && (
          <>
            {isLoadingAiSimilar ? (
              <View style={[styles.noEpisodesContainer, {marginVertical: 50}]}>
                <GradientSpinner
                  size={30}
                  thickness={3}
                  style={{
                    alignItems: 'center',
                    alignSelf: 'center',
                  }}
                  colors={[
                    colors.primary,
                    colors.secondary,
                    'transparent',
                    'transparent',
                  ]}
                />
                <Text
                  style={[
                    styles.noEpisodesText,
                    {fontStyle: 'italic', color: colors.text.primary},
                  ]}>
                  Theater AI is fetching similar shows...
                </Text>
              </View>
            ) : (
              <>
                {Array.isArray(aiSimilarShows) && aiSimilarShows.length > 0 && (
                  <HorizontalList
                    title="Similar shows by Theater AI"
                    data={aiSimilarShows}
                    onItemPress={handleItemPress}
                    isSeeAll={false}
                  />
                )}
              </>
            )}
          </>
        )}

        {similarShowsData.length > 0 && (
          <Animated.View
            style={{
              opacity: similarFadeAnim,
              transform: [
                {
                  translateY: similarFadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                },
              ],
            }}>
            <HorizontalList
              title="Similar shows"
              data={similarShowsData}
              onItemPress={handleItemPress}
              onEndReached={hasNextSimilar ? fetchNextSimilar : undefined}
              isLoading={isFetchingSimilar}
              isSeeAll={false}
            />
          </Animated.View>
        )}

        {/* {recommendedShowsData.length > 0 && (
          <HorizontalList
            title="Recommended TV Shows"
            data={recommendedShowsData}
            onItemPress={handleItemPress}
            onEndReached={hasNextRecommended ? fetchNextRecommended : undefined}
            isLoading={isFetchingRecommended}
            isSeeAll={false}
          />
        )} */}

        <View style={{height: 100}} />
      </ScrollView>

      <WatchlistModal
        visible={showWatchlistModal}
        onClose={() => setShowWatchlistModal(false)}
        item={show}
        itemType="tv"
      />

      <ServerModal
        visible={isServerModalOpen}
        onClose={() => setIsServerModalOpen(false)}
        currentServer={currentServer}
        setCurrentServer={setCurrentServer}
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
  trailerContainer: {
    // backgroundColor: '#000',
    zIndex: 100,
    flex: 1,
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
    height: 250,
    alignSelf: 'center',
    borderRadius: 40,
    borderCurve: 'circular',
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
  title: {
    fontSize: 24,
    fontWeight: '400',
    color: '#fff',
    textAlign: 'center',
    width: '100%',
    fontFamily: 'Inter',
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
    fontFamily: 'Inter',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.modal.header,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.modal.border,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
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
    fontFamily: 'Inter',
  },
  character: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'Inter',
  },
  scrollView: {
    flex: 1,
  },
  seasonsSection: {
    marginVertical: spacing.md,
    marginBottom: spacing.xl,
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
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  episodesScroll: {
    paddingHorizontal: 16,
  },
  episodeCard: {
    width: 280,
    marginRight: 12,
    borderRadius: 8,
    overflow: 'hidden',
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
    fontFamily: 'Inter',
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.secondary,
  },
  modalTitle: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  seasonsList: {
    padding: 16,
  },
  seasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: colors.modal.blur,
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
  noEpisodesContainer: {
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noEpisodesText: {
    color: colors.text.tertiary,
    ...typography.body1,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
