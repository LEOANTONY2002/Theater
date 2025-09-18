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
import Fontisto from 'react-native-vector-icons/Fontisto';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, spacing, typography, borderRadius} from '../styles/theme';

type MoodQuestion = {
  id: string;
  question: string;
  options: {
    text: string;
    emoji: string;
    icon: string;
    iconType: string;
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
        icon: 'happy-outline',
        iconType: 'Ionicons',
      },
      {
        text: 'Want an adventure',
        emoji: '🚀',
        icon: 'rocket-outline',
        iconType: 'Ionicons',
      },
      {
        text: 'In the mood for romance',
        emoji: '💕',
        icon: 'heart-outline',
        iconType: 'Ionicons',
      },
      {
        text: 'Want to be scared',
        emoji: '😱',
        icon: 'ghost-outline',
        iconType: 'MaterialCommunityIcons',
      },
      {
        text: 'Need something deep',
        emoji: '🤔',
        icon: 'brain',
        iconType: 'MaterialCommunityIcons',
      },
      {
        text: 'Want to escape reality',
        emoji: '✨',
        icon: 'star-outline',
        iconType: 'Ionicons',
      },
      {
        text: 'Feeling nostalgic',
        emoji: '🌅',
        icon: 'account-child-outline',
        iconType: 'MaterialCommunityIcons',
      },
      {
        text: 'Need motivation',
        emoji: '💪',
        icon: 'arm-flex-outline',
        iconType: 'MaterialCommunityIcons',
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
        icon: 'movie-open-outline',
        iconType: 'MaterialCommunityIcons',
      },
      {
        text: 'Series',
        emoji: '📺',
        icon: 'tv-outline',
        iconType: 'Ionicons',
      },
      {
        text: 'Any',
        emoji: '🎲',
        icon: 'gamepad-outline',
        iconType: 'MaterialCommunityIcons',
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
        icon: 'book-open-outline',
        iconType: 'MaterialCommunityIcons',
      },
      {
        text: 'Mind-bending plots',
        emoji: '🧠',
        icon: 'brain',
        iconType: 'MaterialCommunityIcons',
      },
      {
        text: 'Feel-good stories',
        emoji: '🌈',
        icon: 'rainbow',
        iconType: 'Fontisto',
      },
      {
        text: 'Dark and gritty',
        emoji: '🌑',
        icon: 'moon-outline',
        iconType: 'Ionicons',
      },
      {
        text: 'Epic adventures',
        emoji: '⚔️',
        icon: 'sword',
        iconType: 'MaterialCommunityIcons',
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
        icon: 'surprised',
        iconType: 'Fontisto',
      },
      {
        text: 'Something familiar and comforting',
        emoji: '🏠',
        icon: 'home-outline',
        iconType: 'Ionicons',
      },
      {
        text: 'Hidden gems and indie films',
        emoji: '💎',
        icon: 'diamond-outline',
        iconType: 'Ionicons',
      },
      {
        text: 'Popular and trending',
        emoji: '🔥',
        icon: 'fire',
        iconType: 'MaterialCommunityIcons',
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
          (
            option: {
              text: string;
              emoji: string;
              icon: string;
              iconType: string;
            },
            index: number,
          ) => (
            <TouchableOpacity
              key={index}
              style={styles.moodOption}
              onPress={() => handleMoodAnswer(option.text)}
              activeOpacity={0.7}
              disabled={isLoading}>
              {option.iconType === 'Ionicons' ? (
                <Ionicons
                  name={option.icon}
                  size={20}
                  color={colors.text.tertiary}
                />
              ) : option.iconType === 'Fontisto' ? (
                <Fontisto
                  name={option.icon}
                  size={20}
                  color={colors.text.tertiary}
                />
              ) : option.iconType === 'MaterialCommunityIcons' ? (
                <MaterialCommunityIcons
                  name={option.icon}
                  size={20}
                  color={colors.text.tertiary}
                />
              ) : (
                <Ionicons
                  name={option.icon}
                  size={20}
                  color={colors.text.tertiary}
                />
              )}
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
    fontFamily: 'Inter_18pt-Regular',
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
    fontFamily: 'Inter_18pt-Regular',
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
    fontFamily: 'Inter_18pt-Regular',
  },
});
