import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {GradientButton} from './GradientButton';

type MoodQuestion = {
  id: string;
  question: string;
  options: {
    text: string;
    genres: number[];
    emoji: string;
  }[];
};

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

interface MoodQuestionnaireProps {
  onComplete: (moodAnswers: {[key: string]: string}) => void;
  onCancel: () => void;
  initialAnswers?: {[key: string]: string};
}

export const MoodQuestionnaire: React.FC<MoodQuestionnaireProps> = ({
  onComplete,
  onCancel,
  initialAnswers = {},
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [moodAnswers, setMoodAnswers] = useState<{[key: string]: string}>(
    initialAnswers,
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleMoodAnswer = async (optionText: string) => {
    const currentQuestion = MOOD_QUESTIONS[currentQuestionIndex];
    const updatedAnswers = {
      ...moodAnswers,
      [currentQuestion.id]: optionText,
    };
    setMoodAnswers(updatedAnswers);

    if (currentQuestionIndex < MOOD_QUESTIONS.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // All questions completed
      try {
        setIsLoading(true);

        // Save preferences with mood answers
        const preferences = {
          moodAnswers: updatedAnswers,
          timestamp: Date.now(),
        };

        await AsyncStorage.setItem(
          '@theater_user_preferences',
          JSON.stringify(preferences),
        );
        await AsyncStorage.setItem('@theater_next_watch_onboarding', 'true');

        onComplete(updatedAnswers);
      } catch (error) {
        console.error('Error saving mood preferences:', error);
        Alert.alert('Error', 'Failed to save preferences. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    } else {
      onCancel();
    }
  };

  const currentQuestion = MOOD_QUESTIONS[currentQuestionIndex];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Update My Mood</Text>
        <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

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
                  ((currentQuestionIndex + 1) / MOOD_QUESTIONS.length) * 100
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
            onPress={() => handleMoodAnswer(option.text)}
            activeOpacity={0.7}
            disabled={isLoading}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.secondary,
  },
  backButton: {
    padding: spacing.xs,
  },
  closeButton: {
    padding: spacing.xs,
  },
  title: {
    fontSize: typography.h3.fontSize,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  progressContainer: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  progressText: {
    fontSize: typography.caption.fontSize,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: colors.background.secondary,
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
    marginVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  optionsContainer: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  moodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
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
});
