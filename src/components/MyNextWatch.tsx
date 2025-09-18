import React, {useState, useEffect, useCallback, useTransition} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import {InteractionManager} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import LinearGradient from 'react-native-linear-gradient';
import {GradientSpinner} from './GradientSpinner';
import {getImageUrl} from '../services/tmdb';
import {getPersonalizedRecommendation} from '../services/gemini';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import FastImage from 'react-native-fast-image';

type RootStackParamList = {
  MovieDetails: {movie: any};
  TVShowDetails: {show: any};
  MySpaceScreen: undefined;
};

type ContentItem = {
  id: number;
  title: string;
  name?: string;
  overview: string;
  poster_path: string;
  backdrop_path?: string;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids: number[];
  media_type: 'movie' | 'tv';
};

type UserFeedback = {
  contentId: number;
  title: string;
  liked: boolean; // true for like, false for dislike
  timestamp: number;
};

const GENRES = [
  {id: 28, name: 'Action'},
  {id: 12, name: 'Adventure'},
  {id: 16, name: 'Animation'},
  {id: 35, name: 'Comedy'},
  {id: 80, name: 'Crime'},
  {id: 99, name: 'Documentary'},
  {id: 18, name: 'Drama'},
  {id: 10751, name: 'Family'},
  {id: 14, name: 'Fantasy'},
  {id: 36, name: 'History'},
  {id: 27, name: 'Horror'},
  {id: 10402, name: 'Music'},
  {id: 9648, name: 'Mystery'},
  {id: 10749, name: 'Romance'},
  {id: 878, name: 'Sci-Fi'},
  {id: 10770, name: 'TV Movie'},
  {id: 53, name: 'Thriller'},
  {id: 10752, name: 'War'},
  {id: 37, name: 'Western'},
];

const STORAGE_KEYS = {
  USER_PREFERENCES: '@theater_user_preferences',
  USER_FEEDBACK: '@theater_user_feedback',
  ONBOARDING_COMPLETE: '@theater_next_watch_onboarding',
};

type MyNextWatchProps = {
  onUpdateMood?: () => void;
  refreshSignal?: number; // increments when mood is updated to trigger refresh without remount
};

const MyNextWatchComponent: React.FC<MyNextWatchProps> = ({
  onUpdateMood,
  refreshSignal,
}) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [currentRecommendation, setCurrentRecommendation] =
    useState<ContentItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userFeedback, setUserFeedback] = useState<UserFeedback[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  // Onboarding UI is handled in Home via MoodQuestionnaire modal.
  // Keep mood answers for recommendation logic only.
  const [moodAnswers, setMoodAnswers] = useState<{[key: string]: string}>({});
  const [isPending, startTransition] = useTransition();

  // Initialize component
  useEffect(() => {
    initializeComponent();
  }, []);

  // Prevent unnecessary API calls during hot reloads
  const [hasInitialRecommendation, setHasInitialRecommendation] =
    useState(false);

  const initializeComponent = async () => {
    try {
      const [onboardingStatus, savedFeedback, savedPreferences] =
        await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE),
          AsyncStorage.getItem(STORAGE_KEYS.USER_FEEDBACK),
          AsyncStorage.getItem(STORAGE_KEYS.USER_PREFERENCES),
        ]);

      setIsOnboardingComplete(onboardingStatus === 'true');

      if (savedFeedback) {
        const feedback = JSON.parse(savedFeedback);
        setUserFeedback(feedback);
      }

      // Load saved mood answers if available
      if (savedPreferences) {
        const preferences = JSON.parse(savedPreferences);
        if (preferences.moodAnswers) {
          setMoodAnswers(preferences.moodAnswers);
        }
      }

      setIsInitialized(true);

      // If onboarding is complete and we don't have a recommendation yet, get first recommendation
      if (
        onboardingStatus === 'true' &&
        !hasInitialRecommendation &&
        !currentRecommendation
      ) {
        setHasInitialRecommendation(true);
        // Run after initial interactions to keep Home scroll smooth
        InteractionManager.runAfterInteractions(() => {
          getNextRecommendation(savedFeedback ? JSON.parse(savedFeedback) : []);
        });
      }
    } catch (error) {
      console.error('Error initializing MyNextWatch:', error);
      setIsInitialized(true);
    }
  };

  const getNextRecommendation = useCallback(
    async (feedbackHistory: UserFeedback[] = userFeedback) => {
      // Do all work after interactions to avoid mid-scroll re-render
      InteractionManager.runAfterInteractions(async () => {
        setIsLoading(true);
        try {
          const preferences = await AsyncStorage.getItem(
            STORAGE_KEYS.USER_PREFERENCES,
          );
          if (!preferences) return;

          const userPrefs = JSON.parse(preferences);
          // Use mood answers if available, otherwise fall back to genres
          let recommendation;
          if (Object.keys(moodAnswers).length > 0) {
            recommendation = await getPersonalizedRecommendation(
              moodAnswers,
              feedbackHistory,
            );
          } else if (
            userPrefs.moodAnswers &&
            Object.keys(userPrefs.moodAnswers).length > 0
          ) {
            recommendation = await getPersonalizedRecommendation(
              userPrefs.moodAnswers,
              feedbackHistory,
            );
          } else if (userPrefs.genres && userPrefs.genres.length > 0) {
            const selectedGenreNames = GENRES.filter(genre =>
              userPrefs.genres.includes(genre.id),
            ).map(genre => genre.name);

            // Convert genre names to mood format for consistency
            const genreMoodAnswers = {
              favorite_genres: selectedGenreNames.join(', '),
            };

            recommendation = await getPersonalizedRecommendation(
              genreMoodAnswers,
              feedbackHistory,
            );
          } else {
            Alert.alert(
              'No Preferences',
              'Please complete the onboarding first.',
            );
            return;
          }

          if (recommendation) {
            // Preload poster to avoid decode jank on commit
            try {
              if (recommendation.poster_path) {
                await Image.prefetch(
                  getImageUrl(recommendation.poster_path, 'w500'),
                );
              }
            } catch (e) {
              // ignore prefetch errors
            }

            // Mark as low-priority to keep scroll/gestures responsive
            startTransition(() => {
              setCurrentRecommendation(recommendation);
            });
          } else {
            startTransition(() => setCurrentRecommendation(null));
          }
        } catch (error) {
          console.error('Error getting recommendation:', error);
        } finally {
          // Mark loading toggle as non-urgent to avoid layout thrash
          startTransition(() => {
            setIsLoading(false);
          });
        }
      });
    },
    [userFeedback, moodAnswers, startTransition],
  );

  // Refresh recommendation when parent signals mood change, without remounting
  useEffect(() => {
    if (!isInitialized || !isOnboardingComplete) return;
    // Reload latest preferences (mood answers) and refresh recommendation
    (async () => {
      try {
        const prefs = await AsyncStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
        if (prefs) {
          const parsed = JSON.parse(prefs);
          if (parsed?.moodAnswers) {
            // Update local state so UI uses the freshest mood answers
            setMoodAnswers(parsed.moodAnswers);
          }
        }
      } catch (e) {
        // non-fatal
      } finally {
        // Use stored feedback to steer the next pick
        getNextRecommendation(userFeedback);
      }
    })();
  }, [refreshSignal]);

  const handleFeedback = useCallback(
    async (liked: boolean) => {
      if (!currentRecommendation) return;

      try {
        const feedback: UserFeedback = {
          contentId: currentRecommendation.id,
          title:
            currentRecommendation.title || currentRecommendation.name || '',
          liked,
          timestamp: Date.now(),
        };

        // Deduplicate by contentId: latest feedback wins
        const filtered = userFeedback.filter(
          f => f.contentId !== feedback.contentId,
        );
        const updatedFeedback = [...filtered, feedback];
        setUserFeedback(updatedFeedback);

        // Save to storage
        await AsyncStorage.setItem(
          STORAGE_KEYS.USER_FEEDBACK,
          JSON.stringify(updatedFeedback),
        );

        // Get next recommendation
        await getNextRecommendation(updatedFeedback);
      } catch (error) {
        console.error('Error saving feedback:', error);
        Alert.alert('Error', 'Failed to save feedback. Please try again.');
      }
    },
    [currentRecommendation, userFeedback, getNextRecommendation],
  );

  const handleContentPress = useCallback(() => {
    if (!currentRecommendation) return;

    if (currentRecommendation.media_type === 'movie') {
      navigation.navigate('MovieDetails', {movie: currentRecommendation});
    } else {
      navigation.navigate('TVShowDetails', {show: currentRecommendation});
    }
  }, [currentRecommendation, navigation]);

  const resetPreferences = async () => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.USER_PREFERENCES,
        STORAGE_KEYS.USER_FEEDBACK,
        STORAGE_KEYS.ONBOARDING_COMPLETE,
      ]);

      setIsOnboardingComplete(false);
      setSelectedGenres([]);
      setCurrentRecommendation(null);
      setUserFeedback([]);
    } catch (error) {
      console.error('Error resetting preferences:', error);
    }
  };

  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <GradientSpinner size={30} color={colors.primary} />
      </View>
    );
  }

  if (!isOnboardingComplete) {
    // Inline onboarding removed. Home's moodSetup section handles onboarding via modal.
    return null;
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          'transparent',
          colors.background.primary,
          colors.background.primary,
        ]}
        pointerEvents="none"
        style={styles.backgroundGradient}
        start={{x: 0, y: 0}}
        end={{x: 0, y: 1}}
      />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}>
        <View style={styles.header}>
          <Image
            source={require('../assets/theaterai.webp')}
            width={25}
            height={15}
            style={{width: 25, height: 15, resizeMode: 'contain'}}
          />
          <Text style={styles.headerTitle}>My Next Watch</Text>
        </View>
        <View style={styles.headerButtons}>
          {onUpdateMood ? (
            <TouchableOpacity
              onPress={onUpdateMood}
              style={styles.updateMoodButton}
              activeOpacity={0.8}>
              <Ionicons name="happy" size={16} color={colors.accent} />
              <Text style={styles.updateMoodText}>Update Mood</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}
          <TouchableOpacity
            onPress={() => getNextRecommendation()}
            onLongPress={resetPreferences}
            delayLongPress={500}
            style={styles.resetButton}>
            <Ionicons name="refresh" size={16} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingRecommendation}>
          {/* <ActivityIndicator size="small" color={colors.accent} /> */}
          <GradientSpinner color={colors.text.primary} size={30} />
          <Text style={styles.loadingText}>Finding your next watch...</Text>
        </View>
      ) : currentRecommendation ? (
        <View style={styles.recommendationContainer}>
          <TouchableOpacity onPress={handleContentPress} activeOpacity={0.8}>
            <View style={styles.contentCard}>
              <FastImage
                source={{
                  uri: getImageUrl(currentRecommendation.poster_path, 'w500'),
                }}
                style={styles.poster}
                resizeMode={FastImage.resizeMode.cover}
              />
              <View style={styles.contentInfo}>
                <Text style={styles.contentTitle} numberOfLines={2}>
                  {currentRecommendation.title || currentRecommendation.name}
                </Text>
                <View style={styles.contentMeta}>
                  <View style={styles.ratingContainer}>
                    <Ionicons name="star" size={14} color={colors.accent} />
                    <Text style={styles.rating}>
                      {currentRecommendation.vote_average.toFixed(1)}
                    </Text>
                  </View>
                  <Text style={styles.mediaType}>
                    {currentRecommendation.media_type === 'movie'
                      ? 'Movie'
                      : 'TV Show'}
                  </Text>
                </View>
                <Text style={styles.overview} numberOfLines={3}>
                  {currentRecommendation.overview}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.feedbackContainer}>
            <Text style={styles.feedbackTitle}>
              Is this something you'd watch?
            </Text>
            <View style={styles.feedbackButtons}>
              <TouchableOpacity
                style={[styles.feedbackButton, styles.notOkButton]}
                onPress={() => handleFeedback(false)}
                activeOpacity={0.8}>
                <Ionicons name="close" size={15} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.feedbackButton, styles.okButton]}
                onPress={() => handleFeedback(true)}
                activeOpacity={0.8}>
                <Ionicons name="checkmark" size={15} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Image
            source={require('../assets/search.png')}
            style={{width: 150, height: 150, objectFit: 'contain'}}
          />
          <Text style={styles.emptyText}>No recommendations available</Text>
          <TouchableOpacity
            onPress={() => getNextRecommendation()}
            style={styles.retryButton}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.modal.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    position: 'relative',
    height: 320,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: 80,
    overflow: 'visible',
  },
  backgroundGradient: {
    width: '270%',
    height: '200%',
    position: 'absolute',
    bottom: -75,
    left: -50,
    zIndex: 0,
    transform: [{rotate: '-30deg'}],
    pointerEvents: 'none',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: 10,
  },
  headerTitle: {
    color: colors.text.primary,
    ...typography.h3,
  },
  content: {},
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: typography.h3.fontSize,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginLeft: spacing.xs,
  },
  titleSmall: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginLeft: spacing.xs,
  },
  subtitle: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  genresContainer: {
    maxHeight: 200,
    marginBottom: spacing.lg,
  },
  genresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  genreChip: {
    backgroundColor: colors.background.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.text.tertiary,
  },
  genreChipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  genreText: {
    fontSize: typography.caption.fontSize,
    color: colors.text.primary,
    fontWeight: '500',
  },
  genreTextSelected: {
    color: '#fff',
  },
  buttonContainer: {
    marginTop: spacing.md,
  },
  getStartedButton: {
    width: '100%',
  },
  resetButton: {},
  loadingRecommendation: {
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  recommendationContainer: {
    gap: spacing.lg,
  },
  contentCard: {
    flexDirection: 'row',
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  poster: {
    width: 80,
    height: 120,
    borderRadius: borderRadius.sm,
  },
  contentInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  contentTitle: {
    fontSize: typography.body1.fontSize,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  contentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rating: {
    fontSize: typography.caption.fontSize,
    color: colors.text.primary,
    fontWeight: '500',
    fontFamily: 'Inter_18pt-Regular',
  },
  mediaType: {
    fontSize: typography.caption.fontSize,
    color: colors.text.secondary,
    fontWeight: '500',
    fontFamily: 'Inter_18pt-Regular',
  },
  overview: {
    fontSize: typography.caption.fontSize,
    color: colors.text.secondary,
    lineHeight: typography.caption.fontSize * 1.4,
    fontFamily: 'Inter_18pt-Regular',
  },
  feedbackContainer: {
    alignItems: 'center',
    gap: spacing.md,
  },
  feedbackTitle: {
    fontSize: 12,
    color: colors.text.primary,
    fontFamily: 'Inter_18pt-Regular',
  },
  feedbackButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.round,
    gap: spacing.xs,
    zIndex: 2,
  },
  okButton: {
    backgroundColor: colors.modal.blur,
    borderWidth: 1,
    borderColor: colors.modal.blur,
  },
  notOkButton: {
    backgroundColor: colors.modal.blurDark,
    borderWidth: 1,
    borderColor: colors.modal.blur,
  },
  alreadyWatchedButton: {
    backgroundColor: '#6B7280', // Gray color for "already watched"
  },
  feedbackButtonText: {
    fontSize: 12,
    color: colors.text.primary,
    fontWeight: '600',
    fontFamily: 'Inter_18pt-Regular',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: typography.body1.fontSize,
    color: colors.text.secondary,
    fontFamily: 'Inter_18pt-Regular',
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
  },
  retryText: {
    fontSize: typography.body2.fontSize,
    color: '#000',
    fontWeight: '600',
    fontFamily: 'Inter_18pt-Regular',
  },
  // New mood onboarding styles
  questionContainer: {
    flex: 1,
    gap: spacing.lg,
  },
  progressContainer: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressText: {
    fontSize: typography.caption.fontSize,
    color: colors.text.secondary,
    fontWeight: '500',
    fontFamily: 'Inter_18pt-Regular',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: colors.background.primary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  questionTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: 'bold',
    color: colors.text.primary,
    textAlign: 'center',
    marginVertical: spacing.md,
    fontFamily: 'Inter_18pt-Regular',
  },
  optionsContainer: {
    flex: 1,
    marginVertical: spacing.md,
  },
  moodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.md,
  },
  moodEmoji: {
    fontSize: 24,
  },
  moodText: {
    flex: 1,
    fontSize: typography.body1.fontSize,
    color: colors.text.primary,
    fontWeight: '500',
    fontFamily: 'Inter_18pt-Regular',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  backText: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    fontWeight: '500',
    fontFamily: 'Inter_18pt-Regular',
  },
  backHeaderButton: {
    padding: spacing.sm,
  },
  placeholder: {
    width: 32,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  updateMoodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  updateMoodText: {
    fontSize: typography.caption.fontSize,
    color: colors.accent,
    fontWeight: '500',
    fontFamily: 'Inter_18pt-Regular',
  },
});

// Prevent unnecessary re-renders when parent changes
export const MyNextWatch = React.memo(MyNextWatchComponent);
export default React.memo(MyNextWatchComponent);
