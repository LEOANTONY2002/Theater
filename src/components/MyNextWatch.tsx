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
import {GradientButton} from './GradientButton';
import {GradientSpinner} from './GradientSpinner';
import {getImageUrl} from '../services/tmdb';
import {getPersonalizedRecommendation} from '../services/gemini';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

type RootStackParamList = {
  MovieDetails: {movie: any};
  TVShowDetails: {show: any};
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
  liked: boolean;
  genres: string[];
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

export const MyNextWatch: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [currentRecommendation, setCurrentRecommendation] = useState<ContentItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userFeedback, setUserFeedback] = useState<UserFeedback[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize component
  useEffect(() => {
    initializeComponent();
  }, []);

  const initializeComponent = async () => {
    try {
      const [onboardingStatus, savedFeedback] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE),
        AsyncStorage.getItem(STORAGE_KEYS.USER_FEEDBACK),
      ]);

      setIsOnboardingComplete(onboardingStatus === 'true');
      
      if (savedFeedback) {
        const feedback = JSON.parse(savedFeedback);
        setUserFeedback(feedback);
      }

      setIsInitialized(true);

      // If onboarding is complete, get first recommendation
      if (onboardingStatus === 'true') {
        await getNextRecommendation(savedFeedback ? JSON.parse(savedFeedback) : []);
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
        : [...prev, genreId]
    );
  };

  const handleGetStarted = async () => {
    if (selectedGenres.length === 0) {
      Alert.alert('Select Genres', 'Please select at least one genre to get started.');
      return;
    }

    try {
      setIsLoading(true);
      
      // Save preferences
      const preferences = {
        genres: selectedGenres,
        timestamp: Date.now(),
      };
      
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(preferences));
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

  const getNextRecommendation = async (feedbackHistory: UserFeedback[] = userFeedback) => {
    try {
      setIsLoading(true);
      
      const preferences = await AsyncStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
      if (!preferences) return;

      const userPrefs = JSON.parse(preferences);
      const selectedGenreNames = GENRES
        .filter(genre => userPrefs.genres.includes(genre.id))
        .map(genre => genre.name);

      const recommendation = await getPersonalizedRecommendation(
        selectedGenreNames,
        feedbackHistory
      );

      if (recommendation) {
        setCurrentRecommendation(recommendation);
      } else {
        Alert.alert('No Recommendations', 'Unable to get recommendations at the moment. Please try again later.');
      }
    } catch (error) {
      console.error('Error getting recommendation:', error);
      Alert.alert('Error', 'Failed to get recommendation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = async (liked: boolean) => {
    if (!currentRecommendation) return;

    try {
      const genreNames = GENRES
        .filter(genre => currentRecommendation.genre_ids.includes(genre.id))
        .map(genre => genre.name);

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
      await AsyncStorage.setItem(STORAGE_KEYS.USER_FEEDBACK, JSON.stringify(updatedFeedback));

      // Get next recommendation
      await getNextRecommendation(updatedFeedback);
    } catch (error) {
      console.error('Error saving feedback:', error);
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
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="sparkles" size={24} color={colors.accent} />
          <Text style={styles.title}>Find My Next Watch</Text>
        </View>
        
        <Text style={styles.subtitle}>
          Select your favorite genres to get personalized recommendations
        </Text>

        <ScrollView style={styles.genresContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.genresGrid}>
            {GENRES.map(genre => (
              <TouchableOpacity
                key={genre.id}
                style={[
                  styles.genreChip,
                  selectedGenres.includes(genre.id) && styles.genreChipSelected,
                ]}
                onPress={() => handleGenreToggle(genre.id)}
                activeOpacity={0.7}>
                <Text
                  style={[
                    styles.genreText,
                    selectedGenres.includes(genre.id) && styles.genreTextSelected,
                  ]}>
                  {genre.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.buttonContainer}>
          <GradientButton
            title={isLoading ? 'Setting up...' : 'Get Started'}
            onPress={handleGetStarted}
            disabled={isLoading || selectedGenres.length === 0}
            style={styles.getStartedButton}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="sparkles" size={20} color={colors.accent} />
          <Text style={styles.titleSmall}>My Next Watch</Text>
        </View>
        <TouchableOpacity onPress={resetPreferences} style={styles.resetButton}>
          <Ionicons name="refresh" size={16} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingRecommendation}>
          <GradientSpinner size={40} />
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
                    {currentRecommendation.media_type === 'movie' ? 'Movie' : 'TV Show'}
                  </Text>
                </View>
                <Text style={styles.overview} numberOfLines={3}>
                  {currentRecommendation.overview}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.feedbackContainer}>
            <Text style={styles.feedbackTitle}>Is this something you'd watch?</Text>
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
          </View>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="film-outline" size={48} color={colors.text.secondary} />
          <Text style={styles.emptyText}>No recommendations available</Text>
          <TouchableOpacity onPress={() => getNextRecommendation()} style={styles.retryButton}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    margin: spacing.md,
  },
  loadingContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    margin: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  resetButton: {
    padding: spacing.xs,
  },
  loadingRecommendation: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
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
    fontSize: typography.body1.fontSize,
    color: colors.text.primary,
    fontWeight: '500',
  },
  feedbackButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  okButton: {
    backgroundColor: '#4CAF50',
  },
  notOkButton: {
    backgroundColor: '#F44336',
  },
  feedbackButtonText: {
    fontSize: typography.body2.fontSize,
    color: '#fff',
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
});
