import React, {useState, useEffect, useCallback, useMemo, useRef} from 'react';
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
  InteractionManager,
  Animated,
  Easing,
} from 'react-native';
import {FlashList} from '@shopify/flash-list';
import YoutubePlayer from 'react-native-youtube-iframe';
import {
  useMovieDetails,
  useSimilarMovies,
  useMovieRecommendations,
} from '../hooks/useMovies';
import {fetchContentFromAI, getImageUrl} from '../services/tmdb';
import {Movie, MovieDetails as MovieDetailsType} from '../types/movie';
import {Video, Genre, Cast} from '../types/movie';
import Icon from 'react-native-vector-icons/Ionicons';
import {HorizontalList} from '../components/HorizontalList';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
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
  useAddToWatchlist,
} from '../hooks/useWatchlists';
import {useFocusEffect, useIsFocused} from '@react-navigation/native';
import {useNavigationState} from '../hooks/useNavigationState';
import languageData from '../utils/language.json';
import {useDeepNavigationProtection} from '../hooks/useDeepNavigationProtection';
import {useQueryClient} from '@tanstack/react-query';
import Cinema from '../components/Cinema';
import {ServerModal} from '../components/ServerModal';
import {getSimilarByStory} from '../services/gemini';
import {GradientSpinner} from '../components/GradientSpinner';

type MovieDetailsScreenNavigationProp =
  NativeStackNavigationProp<MySpaceStackParamList>;
type MovieDetailsScreenRouteProp = RouteProp<
  MySpaceStackParamList,
  'MovieDetails'
>;

interface MovieDetailsScreenProps {
  navigation: MovieDetailsScreenNavigationProp;
  route: MovieDetailsScreenRouteProp;
}

const {width} = Dimensions.get('window');

// Simple function to get language name
const getLanguage = (code: string) => {
  const language = languageData.find(lang => lang.iso_639_1 === code);
  return language?.english_name || code.toUpperCase();
};

export const MovieDetailsScreen: React.FC<MovieDetailsScreenProps> = ({
  route,
}) => {
  const navigation = useNavigation<MovieDetailsScreenNavigationProp>();
  const {movie} = route.params;
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPosterLoading, setIsPosterLoading] = useState(true);
  const [showWatchlistModal, setShowWatchlistModal] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const {navigateWithLimit} = useNavigationState();
  const {isDeepNavigation} = useDeepNavigationProtection();
  const queryClient = useQueryClient();
  const cinema = true;
  const isFocused = useIsFocused();
  const [currentServer, setCurrentServer] = useState<number | null>(1);
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [aiSimilarMovies, setAiSimilarMovies] = useState<any[]>([]);
  const [isLoadingAiSimilar, setIsLoadingAiSimilar] = useState(false);

  // Animation values for loading states and components
  const loadingPulseAnim = useRef(new Animated.Value(1)).current;
  const posterFadeAnim = useRef(new Animated.Value(0)).current;
  const contentFadeAnim = useRef(new Animated.Value(0)).current;
  const castFadeAnim = useRef(new Animated.Value(0)).current;
  const similarFadeAnim = useRef(new Animated.Value(0)).current;

  // Animate loading spinner with pulse effect
  useEffect(() => {
    if (isInitialLoading) {
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
  }, [isInitialLoading]);

  // Animate poster fade-in when image loads
  useEffect(() => {
    if (isImageLoaded) {
      Animated.timing(posterFadeAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [isImageLoaded]);

  // Animate content sections when data is available
  useEffect(() => {
    if (!isInitialLoading) {
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
  }, [isInitialLoading]);

  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      // Clean up queries when screen unmounts
      queryClient.removeQueries({
        queryKey: ['movie', movie.id],
      });
    };
  }, [movie.id]);

  // Memory cleanup when screen loses focus
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        // Clean up when screen loses focus to free memory
        queryClient.removeQueries({
          queryKey: ['movie', movie.id],
        });
        // Clear any cached data for this movie
        queryClient.invalidateQueries({
          queryKey: ['similarMovies', movie.id],
        });
        queryClient.invalidateQueries({
          queryKey: ['recommendations', movie.id],
        });
      };
    }, [movie.id, queryClient]),
  );

  const {data: movieDetails, isLoading: isLoadingDetails} = useMovieDetails(
    movie.id,
  );

  // Set loading to false when data is available
  useEffect(() => {
    if (movieDetails && !isLoadingDetails) {
      const timer = setTimeout(() => {
        setIsInitialLoading(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [movieDetails, isLoadingDetails]);
  const {data: similarMovies, isLoading: isLoadingSimilar} = useSimilarMovies(
    movie.id,
  );
  const {data: recommendations, isLoading: isLoadingRecommendations} =
    useMovieRecommendations(movie.id);
  const {data: isInWatchlist} = useIsItemInAnyWatchlist(movie.id);
  const addToWatchlistMutation = useAddToWatchlist();

  const {data: watchlistContainingItem} = useWatchlistContainingItem(movie.id);
  const removeFromWatchlistMutation = useRemoveFromWatchlist();

  const {data: watchProviders} = useWatchProviders(movie.id, 'movie');

  useEffect(() => {
    async function fetchAiSimilar() {
      if (movieDetails?.overview && movieDetails?.title) {
        setIsLoadingAiSimilar(true);
        try {
          const aiResponse = await getSimilarByStory({
            title: movieDetails.title,
            overview: movieDetails.overview,
            genres:
              movieDetails?.genres?.map((g: Genre) => g?.name).join(', ') || '',
            type: 'movie',
          });
          if (Array.isArray(aiResponse) && aiResponse.length > 0) {
            const tmdbMovies = await fetchContentFromAI(aiResponse, 'movie');
            const mapped = tmdbMovies
              .filter((m: any) => m && m.poster_path)
              .map((m: any) => ({
                id: m.id,
                poster_path: m.poster_path,
                type: 'movie',
              }));
            setAiSimilarMovies(mapped);
          } else {
            setAiSimilarMovies([]);
          }
        } catch {
          setAiSimilarMovies([]);
        } finally {
          setIsLoadingAiSimilar(false);
        }
      }
    }
    fetchAiSimilar();
  }, [movieDetails?.overview, movieDetails?.title]);

  const handleWatchlistPress = useCallback(async () => {
    if (isInWatchlist && watchlistContainingItem) {
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
    isInWatchlist,
    watchlistContainingItem,
    removeFromWatchlistMutation,
    movie.id,
  ]);

  const trailer = movieDetails?.videos.results.find(
    (video: Video) => video.type === 'Trailer' && video.site === 'YouTube',
  );

  const handleItemPress = useCallback(
    (item: ContentItem) => {
      if (item.type === 'movie') {
        navigateWithLimit('MovieDetails', {movie: item as Movie});
      } else {
        navigateWithLimit('TVShowDetails', {show: item as any});
      }
    },
    [navigateWithLimit],
  );

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const similarMoviesData = useMemo(() => {
    return (
      similarMovies?.pages?.flatMap(page =>
        page.results.map((movie: Movie) => ({
          ...movie,
          type: 'movie' as const,
        })),
      ) || []
    );
  }, [similarMovies]);

  // const recommendationsData = useMemo(() => {
  //   return (
  //     recommendations?.pages?.flatMap(page =>
  //       page.results.map((movie: Movie) => ({
  //         ...movie,
  //         type: 'movie' as const,
  //       })),
  //     ) || []
  //   );
  // }, [recommendations]);

  const handlePersonPress = useCallback(
    (personId: number, personName: string) => {
      navigateWithLimit('PersonCredits', {
        personId,
        personName,
        contentType: 'movie',
      });
    },
    [navigateWithLimit],
  );

  // Show loading state immediately to prevent FPS drop
  if (isInitialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <DetailScreenSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlashList
        data={[
          {type: 'header', id: 'header'},
          {type: 'content', id: 'content'},
          {type: 'cast', id: 'cast'},
          {type: 'providers', id: 'providers'},
          {type: 'similar', id: 'similar'},
          {type: 'recommendations', id: 'recommendations'},
        ]}
        renderItem={({item}: {item: any}) => {
          switch (item.type) {
            case 'header':
              return (
                <View>
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
                            uri: getImageUrl(
                              movie.backdrop_path || '',
                              'original',
                            ),
                          }}
                          style={styles.backdrop}
                          onLoadEnd={() => {
                            setIsPosterLoading(false);
                            setIsImageLoaded(true);
                          }}
                          resizeMode="cover"
                        />
                      </Animated.View>
                    ) : (
                      <View style={styles.trailerContainer}>
                        {cinema && isFocused ? (
                          <Cinema
                            id={movie.id.toString()}
                            type="movie"
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
                </View>
              );
            case 'content':
              return (
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
                          <Icon name="star" size={12} color="#ffffff70" />
                          <Text style={styles.info}>
                            {movieDetails.vote_average.toFixed(1)}
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
                          style={{...styles.watchButton}}
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
                      <Icon
                        name={isInWatchlist ? 'checkmark' : 'add'}
                        size={24}
                        color={isInWatchlist ? colors.accent : '#fff'}
                      />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.genreContainer}>
                    {movieDetails?.genres
                      ?.slice(0, 3)
                      .map((genre: Genre, index: number) => (
                        <View key={genre.id} style={styles.genreWrapper}>
                          <Text style={styles.genre}>{genre.name}</Text>
                          {index <
                            Math.min(movieDetails.genres.length - 1, 2) && (
                            <Text style={styles.genreDivider}>|</Text>
                          )}
                        </View>
                      ))}
                  </View>
                  <Text style={styles.overview}>{movie.overview}</Text>
                </Animated.View>
              );
            case 'cast':
              return movieDetails?.credits?.cast?.length > 0 ? (
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
                  <FlashList
                    data={movieDetails.credits.cast.slice(0, 10)}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{paddingHorizontal: 16}}
                    renderItem={({item: person}: {item: Cast}) => (
                      <TouchableOpacity
                        style={styles.castItem}
                        onPress={() =>
                          handlePersonPress(person.id, person.name)
                        }>
                        <PersonCard
                          item={getImageUrl(person.profile_path || '', 'w154')}
                          onPress={() =>
                            handlePersonPress(person.id, person.name)
                          }
                        />
                        <Text style={styles.castName} numberOfLines={1}>
                          {person.name}
                        </Text>
                        <Text style={styles.character} numberOfLines={1}>
                          {person.character}
                        </Text>
                      </TouchableOpacity>
                    )}
                    keyExtractor={(person: Cast) => person.id.toString()}
                    estimatedItemSize={100}
                  />
                </Animated.View>
              ) : null;
            case 'providers':
              return watchProviders ? (
                <WatchProviders providers={watchProviders} />
              ) : null;
            case 'similar':
              return (
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
                  {isLoadingAiSimilar ? (
                    <View
                      style={{
                        marginVertical: 50,
                        alignItems: 'center',
                        alignSelf: 'center',
                      }}>
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
                          colors.transparent,
                          colors.transparentDim,
                        ]}
                      />
                      <Text
                        style={{
                          fontStyle: 'italic',
                          color: colors.text.primary,
                          marginTop: spacing.md,
                        }}>
                        Theater AI is curating similar movies...
                      </Text>
                    </View>
                  ) : (
                    <>
                      {Array.isArray(aiSimilarMovies) &&
                        aiSimilarMovies.length > 0 && (
                          <HorizontalList
                            title="Similar movies by Theater AI"
                            data={aiSimilarMovies}
                            onItemPress={handleItemPress}
                            isSeeAll={false}
                          />
                        )}
                    </>
                  )}
                  {similarMoviesData.length > 0 ? (
                    <View>
                      <HorizontalList
                        title="Similar movies"
                        data={similarMoviesData}
                        onItemPress={handleItemPress}
                        isSeeAll={false}
                      />
                    </View>
                  ) : null}
                </Animated.View>
              );
            // case 'recommendations':
            //   return recommendationsData.length > 0 ? (
            //     <View style={{marginBottom: 100}}>
            //       <HorizontalList
            //         title="Recommended Movies"
            //         data={recommendationsData}
            //         onItemPress={handleItemPress}
            //         isSeeAll={false}
            //       />
            //     </View>
            //   ) : null;
            default:
              return null;
          }
        }}
        keyExtractor={(item: any) => item.id}
        showsVerticalScrollIndicator={false}
        estimatedItemSize={400}
        contentContainerStyle={{paddingBottom: 120}}
        // ListHeaderComponent={
        //   <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
        //     <Icon name="chevron-back" size={24} color="#fff" />
        //   </TouchableOpacity>
        // }
      />
      <WatchlistModal
        visible={showWatchlistModal}
        onClose={() => setShowWatchlistModal(false)}
        item={movie}
        itemType="movie"
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
    borderRadius: 40,
    alignSelf: 'center',
    borderCurve: 'continuous',
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
    // backgroundColor: '#000',
    zIndex: 100,
    flex: 1,
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
    borderWidth: 1,
    borderColor: colors.modal.border,
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
    top: 30,
    left: 30,
    zIndex: 10,
    backgroundColor: colors.modal.blur,
    padding: 8,
    borderRadius: borderRadius.round,
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
    fontFamily: 'Inter',
  },
  posterSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.68)',
    fontFamily: 'Inter',
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
