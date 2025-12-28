import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import Ionicon from 'react-native-vector-icons/Ionicons';
import {GradientSpinner} from './GradientSpinner';

interface Tag {
  tag: string;
  description: string;
  confidence: number;
}

interface ContentTagsDisplayProps {
  thematicTags?: Tag[];
  emotionalTags?: Tag[];
  isLoading?: boolean;
  onTagPress?: (
    tag: string,
    description: string,
    category: 'thematic' | 'emotional',
  ) => void;
}

export const ContentTagsDisplay: React.FC<ContentTagsDisplayProps> = ({
  thematicTags = [],
  emotionalTags = [],
  isLoading = false,
  onTagPress,
}) => {
  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          {
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}>
        <GradientSpinner colors={[colors.primary, colors.secondary]} />
        <View style={styles.loadingContainer}>
          <Ionicon name="sparkles" size={20} color={colors.text.muted} />
          <Text style={styles.loadingText}>Analyzing themes...</Text>
        </View>
      </View>
    );
  }

  if (thematicTags.length === 0 && emotionalTags.length === 0) {
    return null;
  }

  const renderTag = (
    tag: Tag,
    category: 'thematic' | 'emotional',
    index: number,
  ) => {
    // Determine colors logic kept for reference but not used in styles directly here
    // const gradientColors = ...

    return (
      <TouchableOpacity
        key={`${category}-${index}`}
        style={styles.tagWrapper}
        onPress={() => onTagPress?.(tag.tag, tag.description, category)}
        activeOpacity={0.7}>
        <View style={styles.tagContent}>
          <View style={styles.tagTextContainer}>
            <Text style={styles.tagText} numberOfLines={1}>
              {tag.tag ?? ''}
            </Text>
            <Text style={styles.tagDescription}>{tag.description ?? ''}</Text>
          </View>
          <Text style={styles.confidenceText}>
            {`${Math.round((tag.confidence ?? 0) * 100)}%`}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Thematic Tags Section */}
      {thematicTags.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Thematic Genres</Text>
            <Text style={styles.sectionSubtitle}>
              Story themes &amp; patterns
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagsContainer}>
            {thematicTags
              .filter(tag => tag && tag.tag)
              .map((tag, index) => renderTag(tag, 'thematic', index))}
          </ScrollView>
        </View>
      )}

      {/* Emotional Tags Section */}
      {emotionalTags.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Emotional Tones</Text>
            <Text style={styles.sectionSubtitle}>Moods &amp; atmosphere</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagsContainer}>
            {emotionalTags
              .filter(tag => tag && tag.tag)
              .map((tag, index) => renderTag(tag, 'emotional', index))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
    minHeight: 400,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.body2,
    color: colors.text.muted,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'column',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    fontSize: 16,
    color: colors.text.primary,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.text.muted,
  },
  tagsContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  tagWrapper: {
    marginRight: spacing.md,
    maxWidth: 300,
  },
  tagContent: {
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.modal.blur,
    borderRadius: borderRadius.lg,
  },
  tagTextContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  tagText: {
    ...typography.body2,
    color: colors.text.primary,
    fontWeight: '800',
    marginBottom: 2,
  },
  tagDescription: {
    ...typography.caption,
    color: colors.text.secondary,
    fontSize: 11,
    lineHeight: 14,
  },
  confidenceBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  confidenceText: {
    ...typography.caption,
    color: 'rgb(145, 145, 145)',
    fontSize: 30,
    fontWeight: '700',
    textAlign: 'right',
    position: 'absolute',
    right: -15,
    bottom: -15,
    opacity: 0.5,
  },
});
