import React, {useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {AIFilterCreator} from './AIFilterCreator';
import {SavedFilter} from '../types/filters';

interface QuickAddFiltersProps {
  onQuickAdd: (name: string, params: any, type: 'movie' | 'tv' | 'all') => void;
  onAISave: (filter: SavedFilter) => void;
}

export const QuickAddFilters: React.FC<QuickAddFiltersProps> = ({
  onQuickAdd,
  onAISave,
}) => {
  const [showAICreator, setShowAICreator] = useState(false);
  const quickAddItems = [
    {
      name: 'Sci‑Fi Series',
      params: {with_genres: '10765', sort_by: 'popularity.desc'},
      type: 'tv' as const,
      icon: 'planet-outline',
    },
    {
      name: 'K‑Drama',
      params: {
        with_original_language: 'ko',
        sort_by: 'popularity.desc',
        with_genres: '18,10751',
        without_genres: '10759',
        'vote_average.gte': 5,
      },
      type: 'tv' as const,
      icon: 'heart-outline',
    },
    {
      name: 'C‑Drama',
      params: {
        with_original_language: 'zh',
        sort_by: 'popularity.desc',
        with_genres: '18,10751',
        without_genres: '10759',
        'vote_average.gte': 5,
      },
      type: 'tv' as const,
      icon: 'sparkles-outline',
    },
    {
      name: 'Anime Series',
      params: {
        with_original_language: 'ja',
        with_genres: '16',
        sort_by: 'popularity.desc',
      },
      type: 'tv' as const,
      icon: 'aperture-outline',
    },
    {
      name: 'Mystery Thriller Movies',
      params: {with_genres: '9648,53', sort_by: 'popularity.desc'},
      type: 'movie' as const,
      icon: 'eye-outline',
    },
    {
      name: 'Action Movies',
      params: {with_genres: '28', sort_by: 'popularity.desc'},
      type: 'movie' as const,
      icon: 'flash-outline',
    },
    {
      name: 'Comedy Movies',
      params: {with_genres: '35', sort_by: 'popularity.desc'},
      type: 'movie' as const,
      icon: 'happy-outline',
    },
    {
      name: 'Horror Movies',
      params: {with_genres: '27', sort_by: 'popularity.desc'},
      type: 'movie' as const,
      icon: 'skull-outline',
    },
    {
      name: 'Romance Movies',
      params: {with_genres: '10749', sort_by: 'popularity.desc'},
      type: 'movie' as const,
      icon: 'heart-circle-outline',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Quick add</Text>
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.aiButton}
          onPress={() => setShowAICreator(true)}>
          <Ionicons name="sparkles" size={16} color={colors.accent} />
          <Text style={styles.aiButtonText}>AI Create</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.grid}>
        {quickAddItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            activeOpacity={0.9}
            style={styles.card}
            onPress={() => onQuickAdd(item.name, item.params, item.type)}>
            <Ionicons name={item.icon} size={16} color={colors.text.primary} />
            <Text style={styles.text}>{item.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <AIFilterCreator
        visible={showAICreator}
        onClose={() => setShowAICreator(false)}
        onSave={filter => {
          onAISave(filter);
          setShowAICreator(false);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  aiButtonText: {
    ...typography.body2,
    color: colors.accent,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.modal.blur,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.modal.border,
  },
  text: {
    ...typography.body2,
    color: colors.text.primary,
    fontWeight: '600',
    fontSize: 10,
  },
});
