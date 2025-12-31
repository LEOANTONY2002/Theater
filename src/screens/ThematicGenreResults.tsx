import React, {useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Image,
} from 'react-native';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {searchByThematicGenre} from '../services/groq';
import {searchMovies, searchTVShows, getLanguage} from '../services/tmdb';
import {useNavigationState} from '../hooks/useNavigationState';
import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';
import Icon from 'react-native-vector-icons/Ionicons';
import {useResponsive} from '../hooks/useResponsive';
import {RouteProp, useRoute, useNavigation} from '@react-navigation/native';
import {HomeStackParamList} from '../types/navigation';
import {useQuery} from '@tanstack/react-query';
import {GradientSpinner} from '../components/GradientSpinner';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Carousel from 'react-native-reanimated-carousel';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import FastImage from 'react-native-fast-image';
import LinearGradient from 'react-native-linear-gradient';
import {GestureHandlerRootView, ScrollView} from 'react-native-gesture-handler';

type ThematicGenreResultsRouteProp = RouteProp<
  HomeStackParamList,
  'ThematicGenreResults'
>;

type ThematicGenreResultsNavigationProp = NativeStackNavigationProp<
  HomeStackParamList,
  'ThematicGenreResults'
>;

type ResultItem = {
  content: Movie | TVShow;
  type: 'movie' | 'tv';
  confidence: number;
  matchReason: string;
  imdbRating?: number;
};

export const ThematicGenreResultsScreen: React.FC = () => {
  const route = useRoute<ThematicGenreResultsRouteProp>();
  const {tag, description} = route.params;
  const navigation = useNavigation<ThematicGenreResultsNavigationProp>();
  const {navigateWithLimit} = useNavigationState();
  const {isTablet} = useResponsive();
  const {width: windowWidth} = useWindowDimensions();
  const progressValue = useSharedValue(0);

  // Card dimensions (matching FeaturedBannerHome)
  const CARD_WIDTH = 300;
  const CARD_HEIGHT = 500;
  const cardWidth = isTablet ? 380 : CARD_WIDTH;
  const cardHeight = isTablet ? 650 : CARD_HEIGHT;
  const cardOverlap = isTablet ? cardWidth * 0.42 : CARD_WIDTH * 0.3;
  const MAX_RESULTS = 15;

  // Use React Query for caching
  const {
    data: results = [],
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ['thematic_genre_results', tag],
    queryFn: async (): Promise<ResultItem[]> => {
      // Get AI recommendations for this thematic genre (now with confidence & reasons)
      const aiResults = await searchByThematicGenre(tag);

      if (!aiResults || aiResults.length === 0) {
        throw new Error('No content found for this theme');
      }

      // Search TMDB for each recommendation
      const contentPromises = aiResults.map(async item => {
        try {
          if (item.type === 'movie') {
            const movieResults = await searchMovies(item.title, 1);
            const bestMatch =
              movieResults.results.find(
                (m: Movie) =>
                  m.release_date && m.release_date.startsWith(item.year),
              ) || movieResults.results[0];
            return bestMatch
              ? {
                  content: bestMatch,
                  type: 'movie' as const,
                  confidence: item.confidence || 0.8,
                  matchReason: item.matchReason || 'Matches the thematic genre',
                  imdbRating: item.imdbRating,
                }
              : null;
          } else {
            const tvResults = await searchTVShows(item.title, 1);
            const bestMatch =
              tvResults.results.find(
                (t: TVShow) =>
                  t.first_air_date && t.first_air_date.startsWith(item.year),
              ) || tvResults.results[0];
            return bestMatch
              ? {
                  content: bestMatch,
                  type: 'tv' as const,
                  confidence: item.confidence || 0.8,
                  matchReason: item.matchReason || 'Matches the thematic genre',
                  imdbRating: item.imdbRating,
                }
              : null;
          }
        } catch (err) {
          return null;
        }
      });

      const foundContent = await Promise.all(contentPromises);
      const validContent = foundContent.filter(
        item => item !== null,
      ) as ResultItem[];

      return validContent;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    retry: 1,
  });

  const error = queryError ? (queryError as Error).message : null;

  // Check if it's a quota error
  const isQuotaError =
    error &&
    (error.includes('You exceeded your current quota') ||
      error.includes('RESOURCE_EXHAUSTED') ||
      error.includes('429'));

  const handleItemPress = (item: ResultItem) => {
    const params =
      item.type === 'movie'
        ? {movie: item.content as Movie}
        : {show: item.content as TVShow};
    navigateWithLimit(
      item.type === 'movie' ? 'MovieDetails' : 'TVShowDetails',
      params,
    );
  };

  // Animated styles for background confidence scores (like filter titles in home)
  const animatedScoreStyles = Array.from({length: MAX_RESULTS}, (_, idx) =>
    useAnimatedStyle(() => {
      const diff = progressValue.value - idx;
      const opacity = interpolate(
        Math.abs(diff * 5),
        [0, 0.7, 1.2],
        [1, 0.2, 0],
        'clamp',
      );
      const translateY = interpolate(diff, [-1, 0, 1], [40, 0, -40], 'clamp');
      return {
        opacity,
        transform: [{translateY}],
      };
    }),
  );

  // Animated styles for bottom info section
  const animatedInfoStyles = Array.from({length: MAX_RESULTS}, (_, idx) =>
    useAnimatedStyle(() => {
      const diff = progressValue.value - idx;
      const opacity = interpolate(
        Math.abs(diff),
        [0, 0.5, 1],
        [1, 0, 0],
        'clamp',
      );
      return {opacity};
    }),
  );

  // Preload poster images
  useEffect(() => {
    if (!results || results.length === 0) return;
    const size = isTablet ? 'original' : 'w500';
    results.slice(0, MAX_RESULTS).forEach(item => {
      const posterPath = item.content.poster_path || item.content.backdrop_path;
      if (posterPath) {
        const uri = `https://image.tmdb.org/t/p/${size}${posterPath}`;
        FastImage.preload([
          {
            uri,
            priority: FastImage.priority.high,
            cache: FastImage.cacheControl.immutable,
          },
        ]);
      }
    });
  }, [results, isTablet]);

  if (loading) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.titleIconContainer}>
              <Icon name="chevron-back" size={20} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.title}>{tag}</Text>
          </View>
        </View>

        {/* Loading */}
        <View style={styles.loadingContainer}>
          <GradientSpinner colors={[colors.primary, colors.secondary]} />
          <Text style={styles.loadingText}>Finding content...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.titleIconContainer}>
              <Icon name="chevron-back" size={20} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.title}>{tag}</Text>
          </View>
        </View>

        {/* Error */}
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {isQuotaError ? 'Cannot reach Gemini AI' : error}
          </Text>
          {isQuotaError && (
            <>
              <Text style={styles.quotaSubtext}>Please try again later</Text>
            </>
          )}
        </View>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <View style={{flex: 1, backgroundColor: colors.background.primary}}>
        <LinearGradient
          colors={[colors.background.primary, 'transparent']}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: 150,
            zIndex: 1,
            pointerEvents: 'none',
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: 50,
            left: 0,
            right: 0,
            zIndex: 2,
            paddingHorizontal: spacing.lg,
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
            }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}>
              <Icon name="chevron-back" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{tag}</Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.container}
          contentContainerStyle={{paddingTop: 80}}>
          <LinearGradient
            colors={['rgba(19, 0, 47, 0.36)', 'transparent']}
            style={{
              height: windowWidth * 0.5,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
            }}
          />

          {/* Carousel */}
          <View style={styles.carouselWrapper}>
            {/* Background Confidence Scores */}
            <View style={styles.scoreContainer} pointerEvents="none">
              {results.slice(0, MAX_RESULTS).map((item, idx) => (
                <Animated.View
                  key={idx}
                  style={[styles.scoreWrapper, animatedScoreStyles[idx]]}>
                  <Text
                    style={[
                      styles.confidenceScore,
                      {
                        fontSize: isTablet ? 120 : 80,
                        opacity: 0.1,
                      },
                    ]}>
                    {Math.round(item.confidence * 100)}%
                  </Text>
                  <Image
                    source={require('../assets/match.png')}
                    style={{
                      position: 'absolute',
                      zIndex: 1,
                      width: 100,
                      height: 80,
                      objectFit: 'contain',
                      opacity: 1,
                    }}
                  />
                </Animated.View>
              ))}
            </View>

            <Carousel
              width={windowWidth}
              height={isTablet ? windowWidth * 0.8 + 70 : windowWidth}
              data={results.slice(0, MAX_RESULTS)}
              mode="horizontal-stack"
              modeConfig={{
                snapDirection: 'left',
                stackInterval: cardOverlap,
                showLength: 2,
              }}
              style={{width: windowWidth, alignSelf: 'center'}}
              loop={false}
              pagingEnabled
              onProgressChange={(_, absoluteProgress) => {
                progressValue.value = absoluteProgress;
              }}
              renderItem={({item, animationValue}) => {
                const animatedStyle = useAnimatedStyle(() => {
                  const scale = interpolate(
                    animationValue.value,
                    [-1, 0, 1],
                    [0, 1, 0.9],
                  );

                  const opacity = interpolate(
                    animationValue.value,
                    [-1, 0, 0],
                    [0.5, 1, 0.8],
                  );
                  return {
                    transform: [{scale}],
                    opacity,
                  };
                });

                const posterPath =
                  item.content.poster_path || item.content.backdrop_path;
                const posterUri = posterPath
                  ? `https://image.tmdb.org/t/p/${
                      isTablet ? 'original' : 'w500'
                    }${posterPath}`
                  : null;

                return (
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => handleItemPress(item)}>
                    <Animated.View
                      style={[
                        styles.cardStack,
                        {
                          height: isTablet
                            ? windowWidth * 0.8 + 70
                            : windowWidth,
                        },
                        animatedStyle,
                      ]}>
                      {posterUri ? (
                        <FastImage
                          source={{
                            uri: posterUri,
                            priority: FastImage.priority.high,
                            cache: FastImage.cacheControl.immutable,
                          }}
                          style={[
                            styles.card,
                            {
                              width: isTablet
                                ? windowWidth * 0.5
                                : windowWidth * 0.6,
                              height: isTablet
                                ? windowWidth * 0.8
                                : windowWidth,
                            },
                          ]}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={[
                            styles.card,
                            {
                              backgroundColor: colors.background.secondary,
                              width: cardWidth,
                              height: cardHeight,
                            },
                          ]}
                        />
                      )}
                    </Animated.View>
                  </TouchableOpacity>
                );
              }}
            />
            {/* Info Section */}
            <View style={styles.infoSection}>
              {results.slice(0, MAX_RESULTS).map((item, idx) => {
                const title =
                  item.type === 'movie'
                    ? (item.content as Movie).title
                    : (item.content as TVShow).name;
                const year =
                  item.type === 'movie'
                    ? (item.content as Movie).release_date?.split('-')[0]
                    : (item.content as TVShow).first_air_date?.split('-')[0];
                const languageCode =
                  item.type === 'movie'
                    ? (item.content as Movie).original_language
                    : (item.content as TVShow).original_language;
                // Use IMDb rating from AI if available, otherwise TMDB rating
                const rating = item.imdbRating || item.content.vote_average;
                const languageName =
                  getLanguage(languageCode) || languageCode?.toUpperCase();

                return (
                  <Animated.View
                    key={idx}
                    style={[styles.infoContent, animatedInfoStyles[idx]]}>
                    <Text style={styles.movieTitle} numberOfLines={2}>
                      {title}
                    </Text>
                    <View style={styles.metaRow}>
                      <Text style={styles.movieMeta}>{year}</Text>
                      <Text style={styles.metaDot}>•</Text>
                      <Text style={styles.movieMeta}>{languageName}</Text>
                      {rating && (
                        <>
                          <Text style={styles.metaDot}>•</Text>
                          <View style={styles.ratingContainer}>
                            <Icon
                              name="star"
                              size={12}
                              color={colors.text.secondary}
                            />
                            <Text style={styles.movieMeta}>
                              {rating.toFixed(1)}
                            </Text>
                          </View>
                        </>
                      )}
                    </View>

                    {/* Why This Match */}
                    <View style={styles.matchReasonContainer}>
                      <View style={styles.matchReasonHeader}>
                        <Icon
                          name="sparkles"
                          size={16}
                          color={colors.accent}
                          style={{marginRight: 6}}
                        />
                        <Text style={styles.matchReasonTitle}>
                          Why This Match
                        </Text>
                      </View>
                      <Text style={styles.matchReasonText} numberOfLines={4}>
                        {item.matchReason}
                      </Text>
                    </View>
                  </Animated.View>
                );
              })}
            </View>
          </View>
          <View style={{height: 200}} />
        </ScrollView>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.round,
    backgroundColor: colors.modal.blurDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.modal.blur,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text.primary,
    flex: 1,
    textAlign: 'center',
    marginRight: 44,
  },
  carouselWrapper: {
    flex: 1,
    justifyContent: 'center',
    position: 'relative',
    marginTop: 80,
  },
  scoreContainer: {
    zIndex: 0,
    pointerEvents: 'none',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreWrapper: {
    position: 'absolute',
    top: -80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confidenceScore: {
    color: colors.text.primary,
    paddingHorizontal: spacing.lg,
    fontSize: 80,
    textAlign: 'center',
    fontFamily: 'Inter_28pt-ExtraBold',
  },
  cardStack: {
    width: 'auto',
    height: 500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: borderRadius.lg || 18,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 40,
    borderWidth: 1,
    borderColor: colors.modal.blurDark,
  },
  infoSection: {
    paddingBottom: spacing.xl,
    minHeight: 200,
    marginTop: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    position: 'absolute',
    width: '100%',
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  movieTitle: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 4,
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  movieMeta: {
    ...typography.body2,
    color: colors.text.secondary,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3,
  },
  metaDot: {
    ...typography.body2,
    color: colors.text.secondary,
    marginHorizontal: spacing.xs,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  matchReasonContainer: {
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  matchReasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  matchReasonTitle: {
    ...typography.body1,
    fontWeight: '600',
    color: colors.text.primary,
  },
  matchReasonText: {
    ...typography.body2,
    color: colors.text.secondary,
    lineHeight: 16,
    fontSize: 11,
  },
  // Loading & Error states
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.round,
    backgroundColor: `${colors.background.tertiary}80`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    zIndex: 2,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
    flex: 1,
    textAlign: 'center',
    marginLeft: -50,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: spacing.sm,
    color: colors.text.primary,
    ...typography.body2,
  },
  emptyContainer: {
    flex: 1,
    minHeight: 400,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    ...typography.h3,
    color: colors.text.primary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  quotaSubtext: {
    ...typography.body2,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  settingsButtonText: {
    ...typography.body2,
    fontWeight: '600',
    color: colors.background.primary,
  },
});
