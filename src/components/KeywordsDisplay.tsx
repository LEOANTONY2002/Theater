import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {Keyword} from '../types/movie';

interface KeywordsDisplayProps {
  keywords?: {
    keywords?: Keyword[];
    results?: Keyword[];
  };
}

export const KeywordsDisplay: React.FC<KeywordsDisplayProps> = ({keywords}) => {
  const keywordsList = keywords?.keywords || keywords?.results || [];

  if (!keywordsList || keywordsList.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Keywords</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.keywordsList}>
        {keywordsList.map(keyword => (
          <View key={keyword.id} style={styles.keywordChip}>
            <Text style={styles.keywordText}>{keyword.name}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.lg,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.md,
    marginLeft: spacing.md,
  },
  keywordsList: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  keywordChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.round,
    backgroundColor: colors.modal.blur,
    borderWidth: 1,
    borderColor: colors.modal.border,
    marginRight: spacing.sm,
  },
  keywordText: {
    ...typography.body2,
    color: colors.text.primary,
  },
});
