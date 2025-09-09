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

type MoodQuestion = {
  id: string;
  question: string;
  options: {
    text: string;
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
        emoji: '😄',
      },
      {
        text: 'Want an adventure',
        emoji: '🚀',
      },
      {
        text: 'In the mood for romance',
        emoji: '💕',
      },
      {
        text: 'Want to be scared',
        emoji: '😱',
      },
      {
        text: 'Need something deep',
        emoji: '🤔',
      },
      {
        text: 'Want to escape reality',
        emoji: '✨',
      },
      {
        text: 'Feeling nostalgic',
        emoji: '🌅',
      },
      {
        text: 'Need motivation',
        emoji: '💪',
      },
    ],
  },
  {
    id: 'content_type',
    question: 'What do you want to watch?',
    options: [
      {
        text: 'Movie',
        emoji: '🎬',
      },
      {
        text: 'Series',
        emoji: '📺',
      },
      {
        text: 'Any',
        emoji: '🎲',
      },
    ],
  },
  {
    id: 'energy_level',
    question: "What's your energy level?",
    options: [
      {
        text: 'High energy, bring the action!',
        emoji: '⚡',
      },
      {
        text: 'Moderate, something engaging',
        emoji: '🎯',
      },
      {
        text: 'Low energy, easy watching',
        emoji: '😌',
      },
      {
        text: 'Tired, need background noise',
        emoji: '😴',
      },
    ],
  },
  {
    id: 'content_preference',
    question: 'What type of story appeals to you today?',
    options: [
      {
        text: 'Real-life stories',
        emoji: '📖',
      },
      {
        text: 'Mind-bending plots',
        emoji: '🧠',
      },
      {
        text: 'Feel-good stories',
        emoji: '🌈',
      },
      {
        text: 'Dark and gritty',
        emoji: '🌑',
      },
      {
        text: 'Epic adventures',
        emoji: '⚔️',
      },
    ],
  },
  {
    id: 'discovery_mood',
    question: 'Are you in the mood to discover something new?',
    options: [
      {
        text: 'Yes, surprise me!',
        emoji: '🎲',
      },
      {
        text: 'Something familiar and comforting',
        emoji: '🏠',
      },
      {
        text: 'Hidden gems and indie films',
        emoji: '💎',
      },
      {
        text: 'Popular and trending',
        emoji: '🔥',
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

  // Dynamically filter options based on prior answers to avoid contradictory tones
  const getEffectiveOptions = (
    question: MoodQuestion,
    answers: {[key: string]: string},
  ) => {
    if (question.id !== 'content_preference') return question.options;

    const mood = (answers['current_mood'] || '').toLowerCase();
    const base = question.options;

    if (mood.includes('laugh')) {
      return base.filter(opt =>
        ['Feel-good stories', 'Real-life stories', 'Epic adventures'].includes(
          opt.text,
        ),
      );
    }

    if (mood.includes('scared')) {
      return base.filter(opt =>
        ['Dark and gritty', 'Mind-bending plots', 'Epic adventures'].includes(
          opt.text,
        ),
      );
    }

    if (
      mood.includes('deep') ||
      mood.includes('motivation') ||
      mood.includes('real')
    ) {
      return base.filter(opt =>
        ['Real-life stories', 'Mind-bending plots', 'Dark and gritty'].includes(
          opt.text,
        ),
      );
    }

    if (mood.includes('escape')) {
      return base.filter(opt =>
        ['Epic adventures', 'Mind-bending plots', 'Feel-good stories'].includes(
          opt.text,
        ),
      );
    }

    return base;
  };

  const currentQuestion = MOOD_QUESTIONS[currentQuestionIndex];
  const displayedOptions = getEffectiveOptions(currentQuestion, moodAnswers);

  const handleMoodAnswer = async (optionText: string) => {
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
        {displayedOptions.map(
          (option: {text: string; emoji: string}, index: number) => (
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
          ),
        )}
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
