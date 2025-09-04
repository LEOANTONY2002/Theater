import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {useResponsive} from '../hooks/useResponsive';
import LinearGradient from 'react-native-linear-gradient';
import {GradientButton} from './GradientButton';
import {GradientSpinner} from './GradientSpinner';
import {getImageUrl} from '../services/tmdb';
import {getPersonalizedRecommendation} from '../services/gemini';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

type RootStackParamList = {
  MovieDetails: {movie: any};
  TVShowDetails: {show: any};
  MySpaceScreen: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

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
  liked: boolean | null; // null for already watched
  alreadyWatched?: boolean;
  genres: string[];
  timestamp: number;
};

type MoodQuestion = {
  id: string;
  question: string;
  options: {
    text: string;
    genres: number[];
    emoji: string;
  }[];
};

type OnboardingStep = 'mood' | 'genres' | 'complete';

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

const MOOD_QUESTIONS: MoodQuestion[] = [
  {
    id: 'current_mood',
    question: 'How are you feeling right now?',
    options: [
      {
        text: 'Need some laughs',
        genres: [35, 10751], // Comedy, Family
        emoji: '😄',
      },
      {
        text: 'Want an adventure',
        genres: [12, 28, 878], // Adventure, Action, Sci-Fi
        emoji: '🚀',
      },
      {
        text: 'In the mood for romance',
        genres: [10749, 18], // Romance, Drama
        emoji: '💕',
      },
      {
        text: 'Want to be scared',
        genres: [27, 53], // Horror, Thriller
        emoji: '😱',
      },
      {
        text: 'Need something deep',
        genres: [18, 36, 99], // Drama, History, Documentary
        emoji: '🤔',
      },
      {
        text: 'Want to escape reality',
        genres: [14, 16, 878], // Fantasy, Animation, Sci-Fi
        emoji: '✨',
      },
    ],
  },
  {
    id: 'time_preference',
    question: 'How much time do you have?',
    options: [
      {
        text: 'Quick watch (90-120 min)',
        genres: [35, 27, 53], // Comedy, Horror, Thriller
        emoji: '⏰',
      },
      {
        text: 'Long epic (2+ hours)',
        genres: [12, 18, 36, 10752], // Adventure, Drama, History, War
        emoji: '🎬',
      },
      {
        text: 'Series to binge',
        genres: [18, 80, 9648], // Drama, Crime, Mystery
        emoji: '📺',
      },
    ],
  },
  {
    id: 'energy_level',
    question: "What's your energy level?",
    options: [
      {
        text: 'High energy, bring the action!',
        genres: [28, 12, 53], // Action, Adventure, Thriller
        emoji: '⚡',
      },
      {
        text: 'Moderate, something engaging',
        genres: [80, 9648, 18], // Crime, Mystery, Drama
        emoji: '🎯',
      },
      {
        text: 'Low energy, easy watching',
        genres: [35, 10749, 10751], // Comedy, Romance, Family
        emoji: '😌',
      },
    ],
  },
];

const STORAGE_KEYS = {
  USER_PREFERENCES: '@theater_user_preferences',
  USER_FEEDBACK: '@theater_user_feedback',
  ONBOARDING_COMPLETE: '@theater_next_watch_onboarding',
};

export const MyNextWatch: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [currentRecommendation, setCurrentRecommendation] =
    useState<ContentItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userFeedback, setUserFeedback] = useState<UserFeedback[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>('mood');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [moodAnswers, setMoodAnswers] = useState<{[key: string]: string}>({});
  const {isTablet} = useResponsive();

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
        await getNextRecommendation(
          savedFeedback ? JSON.parse(savedFeedback) : [],
        );
      }
    } catch (error) {
      console.error('Error initializing MyNextWatch:', error);
      setIsInitialized(true);
    }
  };

  const handleGenreToggle = (genreId: number) => {
    setSelectedGenres(prev =>
      prev.includes(genreId)
        ? prev.filter(id => id !== genreId)
        : [...prev, genreId],
    );
  };

  const handleMoodAnswer = async (
    optionText: string,
    selectedGenres: number[],
  ) => {
    const currentQuestion = MOOD_QUESTIONS[currentQuestionIndex];
    const updatedAnswers = {
      ...moodAnswers,
      [currentQuestion.id]: optionText,
    };
    setMoodAnswers(updatedAnswers);

    if (currentQuestionIndex < MOOD_QUESTIONS.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // All mood questions completed - save preferences and get recommendations
      try {
        setIsLoading(true);

        // Save preferences with mood answers (no genres needed)
        const preferences = {
          moodAnswers: updatedAnswers,
          timestamp: Date.now(),
        };

        await AsyncStorage.setItem(
          STORAGE_KEYS.USER_PREFERENCES,
          JSON.stringify(preferences),
        );
        await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');

        setIsOnboardingComplete(true);

        // Get first recommendation using mood answers
        await getNextRecommendation([]);
      } catch (error) {
        console.error('Error completing onboarding:', error);
        Alert.alert('Error', 'Failed to save preferences. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleBackToMood = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    } else {
      setOnboardingStep('mood');
      setCurrentQuestionIndex(0);
    }
  };

  const handleGetStarted = async () => {
    if (selectedGenres.length === 0) {
      Alert.alert(
        'Select Genres',
        'Please select at least one genre to get started.',
      );
      return;
    }

    try {
      setIsLoading(true);

      // Save preferences including mood answers
      const preferences = {
        genres: selectedGenres,
        moodAnswers: moodAnswers,
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(
        STORAGE_KEYS.USER_PREFERENCES,
        JSON.stringify(preferences),
      );
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');

      setIsOnboardingComplete(true);

      // Get first recommendation
      await getNextRecommendation([]);
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getNextRecommendation = async (
    feedbackHistory: UserFeedback[] = userFeedback,
  ) => {
    try {
      setIsLoading(true);

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
        Alert.alert('No Preferences', 'Please complete the onboarding first.');
        return;
      }

      if (recommendation) {
        setCurrentRecommendation(recommendation);
      } else {
        // Alert.alert(
        //   'No Recommendations',
        //   'Unable to get recommendations at the moment. Please try again later.',
        // );
      }
    } catch (error) {
      console.error('Error getting recommendation:', error);
      // Alert.alert('Error', 'Failed to get recommendation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = async (liked: boolean) => {
    if (!currentRecommendation) return;

    try {
      const genreNames = GENRES.filter(genre =>
        currentRecommendation.genre_ids.includes(genre.id),
      ).map(genre => genre.name);

      const feedback: UserFeedback = {
        contentId: currentRecommendation.id,
        title: currentRecommendation.title || currentRecommendation.name || '',
        liked,
        genres: genreNames,
        timestamp: Date.now(),
      };

      const updatedFeedback = [...userFeedback, feedback];
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
  };

  const handleAlreadyWatched = async () => {
    if (!currentRecommendation) return;

    try {
      const genreNames = GENRES.filter(genre =>
        currentRecommendation.genre_ids.includes(genre.id),
      ).map(genre => genre.name);

      const feedback: UserFeedback = {
        contentId: currentRecommendation.id,
        title: currentRecommendation.title || currentRecommendation.name || '',
        liked: null,
        alreadyWatched: true,
        genres: genreNames,
        timestamp: Date.now(),
      };

      const updatedFeedback = [...userFeedback, feedback];
      setUserFeedback(updatedFeedback);

      // Save to storage
      await AsyncStorage.setItem(
        STORAGE_KEYS.USER_FEEDBACK,
        JSON.stringify(updatedFeedback),
      );

      // Get next recommendation
      await getNextRecommendation(updatedFeedback);
    } catch (error) {
      console.error('Error saving already watched feedback:', error);
      Alert.alert('Error', 'Failed to save feedback. Please try again.');
    }
  };

  const handleContentPress = () => {
    if (!currentRecommendation) return;

    if (currentRecommendation.media_type === 'movie') {
      navigation.navigate('MovieDetails', {movie: currentRecommendation});
    } else {
      navigation.navigate('TVShowDetails', {show: currentRecommendation});
    }
  };

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
        <GradientSpinner size={30} />
      </View>
    );
  }

  if (!isOnboardingComplete) {
    if (onboardingStep === 'mood') {
      const currentQuestion = MOOD_QUESTIONS[currentQuestionIndex];

      return (
        <View style={styles.container}>
          <View style={styles.header}>
            <Image
              source={require('../assets/theaterai.png')}
              width={25}
              height={15}
            />
            <Text style={styles.title}>Find My Next Watch</Text>
          </View>

          <View style={styles.questionContainer}>
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                {currentQuestionIndex + 1} of {MOOD_QUESTIONS.length}
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${
                        ((currentQuestionIndex + 1) / MOOD_QUESTIONS.length) *
                        100
                      }%`,
                    },
                  ]}
                />
              </View>
            </View>

            <Text style={styles.questionTitle}>{currentQuestion.question}</Text>

            <ScrollView
              style={styles.optionsContainer}
              showsVerticalScrollIndicator={false}>
              {currentQuestion.options.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.moodOption}
                  onPress={() => handleMoodAnswer(option.text, option.genres)}
                  activeOpacity={0.7}>
                  <Text style={styles.moodEmoji}>{option.emoji}</Text>
                  <Text style={styles.moodText}>{option.text}</Text>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={colors.text.tertiary}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>

            {currentQuestionIndex > 0 && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleBackToMood}
                activeOpacity={0.7}>
                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={colors.text.secondary}
                />
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    }

    // This should never be reached since we skip genre step
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
            source={require('../assets/theaterai.png')}
            width={25}
            height={15}
            style={{width: 25, height: 15, resizeMode: 'contain'}}
          />
          <Text style={styles.headerTitle}>My Next Watch</Text>
        </View>
        <TouchableOpacity onPress={resetPreferences} style={styles.resetButton}>
          <Ionicons name="refresh" size={16} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingRecommendation}>
          <GradientSpinner
            size={40}
            thickness={3}
            colors={[
              colors.primary,
              colors.secondary,
              colors.transparentDim,
              colors.transparent,
            ]}
          />
          <Text style={styles.loadingText}>Finding your next watch...</Text>
        </View>
      ) : currentRecommendation ? (
        <View style={styles.recommendationContainer}>
          <TouchableOpacity onPress={handleContentPress} activeOpacity={0.8}>
            <View style={styles.contentCard}>
              <Image
                source={{
                  uri: getImageUrl(currentRecommendation.poster_path, 'w500'),
                }}
                style={styles.poster}
                resizeMode="cover"
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
                activeOpacity={0.7}>
                <Ionicons name="close" size={20} color="#fff" />
                <Text style={styles.feedbackButtonText}>Not for me</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.feedbackButton, styles.okButton]}
                onPress={() => handleFeedback(true)}
                activeOpacity={0.7}>
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.feedbackButtonText}>Looks good!</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}
              onPress={() => handleAlreadyWatched()}
              activeOpacity={0.7}>
              <Ionicons name="eye" size={20} color="#fff" />
              <Text
                style={[
                  styles.feedbackButtonText,
                  {textDecorationLine: 'underline'},
                ]}>
                Already Watched
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons
            name="film-outline"
            size={48}
            color={colors.text.secondary}
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
  },
  mediaType: {
    fontSize: typography.caption.fontSize,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  overview: {
    fontSize: typography.caption.fontSize,
    color: colors.text.secondary,
    lineHeight: typography.caption.fontSize * 1.4,
  },
  feedbackContainer: {
    alignItems: 'center',
    gap: spacing.md,
  },
  feedbackTitle: {
    fontSize: 12,
    color: colors.text.primary,
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
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    zIndex: 2,
  },
  okButton: {
    backgroundColor: colors.modal.active,
  },
  notOkButton: {
    backgroundColor: colors.modal.blur,
  },
  alreadyWatchedButton: {
    backgroundColor: '#6B7280', // Gray color for "already watched"
  },
  feedbackButtonText: {
    fontSize: 12,
    color: colors.text.primary,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: typography.body1.fontSize,
    color: colors.text.secondary,
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
  },
  retryText: {
    fontSize: typography.body2.fontSize,
    color: '#fff',
    fontWeight: '600',
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
  },
});
