import React, {useState, useMemo, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import {colors, spacing, borderRadius, typography} from '../styles/theme';
import Icon from 'react-native-vector-icons/Ionicons';
import {compareContent} from '../services/groq';
import LinearGradient from 'react-native-linear-gradient';
import {MaybeBlurView} from './MaybeBlurView';
import FastImage from 'react-native-fast-image';
import {getOptimizedImageUrl} from '../services/tmdb';
import {ContentItem} from './MovieList';
import {BlurPreference} from '../store/blurPreference';
import {BlurView} from '@react-native-community/blur';
import {useQuery} from '@tanstack/react-query';
import {getImageUrl} from '../services/tmdbWithCache';
import {GradientSpinner} from './GradientSpinner';

interface QuickDecisionProps {
  visible: boolean;
  onClose: () => void;
  items: ContentItem[];
  onSelectItem?: (item: ContentItem) => void;
}

export const QuickDecision: React.FC<QuickDecisionProps> = ({
  visible,
  onClose,
  items,
  onSelectItem,
}) => {
  const themeMode = BlurPreference.getMode();
  const isSolid = themeMode === 'normal';

  // Create a stable query key based on item IDs
  const queryKey = useMemo(() => {
    const itemIds = items
      .map(item => `${item.id}-${item.type}`)
      .sort()
      .join(',');
    return ['content-comparison', itemIds];
  }, [items]);

  // Use React Query for caching AI comparison
  const {
    data: analysis,
    isLoading: loading,
    isFetching,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      if (items.length < 2) {
        throw new Error('Please select at least 2 items to compare');
      }

      const itemsForComparison = items.map(item => ({
        title: (item as any).title || (item as any).name,
        name: (item as any).name,
        overview: item.overview,
        vote_average: item.vote_average,
        release_date: (item as any).release_date,
        first_air_date: (item as any).first_air_date,
        genre_ids: item.genre_ids,
        type: item.type,
      }));

      const result = await compareContent(itemsForComparison);
      if (!result) {
        throw new Error('Could not compare items. Please try again.');
      }
      return result;
    },
    enabled: items.length >= 2, // Always enabled if items exist
    staleTime: 1000 * 60 * 60 * 24 * 7, // Cache for 7 days (not stored in Realm)
    gcTime: 1000 * 60 * 60 * 24 * 7, // Keep in cache for 7 days
    refetchOnMount: false, // Don't refetch on mount if data is fresh
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
  });

  const error = queryError ? (queryError as Error).message : null;

  const handleClose = () => {
    onClose();
  };

  const getItemByTitle = (title: string) => {
    return items.find(
      item =>
        ((item as any).title || (item as any).name)
          .toLowerCase()
          .includes(title.toLowerCase()) ||
        title
          .toLowerCase()
          .includes(((item as any).title || (item as any).name).toLowerCase()),
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      backdropColor={colors.modal.blurDark}
      statusBarTranslucent
      onRequestClose={handleClose}>
      <View style={styles.container}>
        {!isSolid && <BlurView style={StyleSheet.absoluteFill} />}
        <MaybeBlurView header style={{marginTop: 20}}>
          <View style={styles.headerContent}>
            <Icon name="git-compare" size={20} color={colors.text.muted} />
            <Text style={styles.title}>Quick Decision</Text>
          </View>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Icon name="close" size={20} color={colors.text.primary} />
          </TouchableOpacity>
        </MaybeBlurView>

        <View style={styles.bodyWrapper}>
          <MaybeBlurView body style={{flex: 1}}>
            {loading && (
              <View style={styles.loadingContainer}>
                <GradientSpinner colors={[colors.primary, colors.secondary]} />
                <Text style={styles.loadingText}>Deciding...</Text>
              </View>
            )}

            {error && (
              <View style={styles.errorContainer}>
                <Icon
                  name="alert-circle"
                  size={20}
                  color={colors.status.error}
                />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => refetch()}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {analysis && !loading && (
              <ScrollView
                style={styles.resultsContainer}
                contentContainerStyle={{paddingBottom: spacing.xl}}
                showsVerticalScrollIndicator={false}>
                {/* Recommendation Banner */}
                <View style={styles.recommendationBanner}>
                  <Text style={styles.recommendationLabel}>Best Choice</Text>

                  {(() => {
                    const recommendedItem = getItemByTitle(
                      analysis.recommendation,
                    );
                    const posterPath = recommendedItem?.poster_path;

                    return posterPath ? (
                      <View
                        style={{flexDirection: 'column', alignItems: 'center'}}>
                        <View>
                          <FastImage
                            source={{
                              uri: getImageUrl(posterPath, 'w500'),
                              priority: FastImage.priority.high,
                              cache: FastImage.cacheControl.web,
                            }}
                            style={styles.recommendedPoster}
                            resizeMode={FastImage.resizeMode.cover}
                          />
                          <LinearGradient
                            colors={['transparent', 'rgba(0, 0, 0, 1)']}
                            style={{
                              position: 'absolute',
                              left: 0,
                              right: 0,
                              bottom: 0,
                              height: 150,
                              borderBottomLeftRadius: borderRadius.lg,
                              borderBottomRightRadius: borderRadius.lg,
                            }}
                          />
                        </View>
                        <Image
                          source={require('../assets/arc.png')}
                          style={{width: 300, height: 50, marginTop: -30}}
                          resizeMode={FastImage.resizeMode.contain}
                        />
                      </View>
                    ) : (
                      <Icon name="star" size={24} color={colors.text.primary} />
                    );
                  })()}
                  <View style={styles.recommendationTextContainer}>
                    <Text style={styles.recommendationTitle}>
                      {analysis.recommendation}
                    </Text>
                    <Text style={styles.recommendationReason}>
                      {analysis.reasoning}
                    </Text>
                  </View>
                </View>

                {/* Comparisons */}
                {analysis.comparisons.map((comparison, index) => {
                  const matchedItem = getItemByTitle(comparison.title);
                  const posterPath = matchedItem?.poster_path;

                  return (
                    <View key={index} style={styles.comparisonCard}>
                      <View style={styles.comparisonHeader}>
                        {posterPath && (
                          <FastImage
                            source={{
                              uri: getOptimizedImageUrl(posterPath, 'small'),
                            }}
                            style={styles.poster}
                            resizeMode={FastImage.resizeMode.cover}
                          />
                        )}
                        <View style={styles.comparisonTitleContainer}>
                          <Text style={styles.comparisonTitle}>
                            {comparison.title}
                          </Text>
                          {matchedItem && (
                            <View style={styles.ratingBadge}>
                              <Icon
                                name="star"
                                size={12}
                                color={colors.accent}
                              />
                              <Text style={styles.ratingText}>
                                {matchedItem.vote_average?.toFixed(1) || 'N/A'}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Best For */}
                      <View style={styles.bestForContainer}>
                        <Icon name="bulb" size={16} color={colors.accent} />
                        <Text style={styles.bestForText}>
                          {comparison.bestFor}
                        </Text>
                      </View>

                      {/* Pros */}
                      <View style={styles.prosConsSection}>
                        <Text style={styles.prosConsTitle}>Pros</Text>
                        {comparison.pros.map((pro, idx) => (
                          <View key={idx} style={styles.proConRow}>
                            <Icon
                              name="checkmark-circle"
                              size={14}
                              color="#10b981"
                            />
                            <Text style={styles.proConText}>{pro}</Text>
                          </View>
                        ))}
                      </View>

                      {/* Cons */}
                      {comparison.cons.length > 0 && (
                        <View style={styles.prosConsSection}>
                          <Text style={styles.prosConsTitle}>Cons</Text>
                          {comparison.cons.map((con, idx) => (
                            <View key={idx} style={styles.proConRow}>
                              <Icon
                                name="close-circle"
                                size={14}
                                color="#ef4444"
                              />
                              <Text style={styles.proConText}>{con}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </MaybeBlurView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    flex: 1,
    margin: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: 'transparent',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
  },
  closeButton: {
    padding: spacing.sm,
    backgroundColor: colors.modal.blur,
    borderRadius: borderRadius.round,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.modal.content,
  },
  bodyWrapper: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: borderRadius.xl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body1,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    ...typography.body1,
    color: colors.status.error,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.button.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    ...typography.body1,
    color: colors.text.primary,
    fontWeight: '600',
  },
  resultsContainer: {
    padding: spacing.lg,
  },
  recommendationBanner: {
    flexDirection: 'column',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  recommendedPoster: {
    width: 200,
    height: 320,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.modal.content,
  },
  recommendationTextContainer: {
    flex: 1,
  },
  recommendationLabel: {
    ...typography.body2,
    fontSize: 11,
    color: colors.text.secondary,
    opacity: 0.8,
    marginBottom: spacing.sm,
    textAlign: 'center',
    backgroundColor: colors.modal.blur,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.modal.content,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignSelf: 'center',
  },
  recommendationTitle: {
    ...typography.h2,
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
    marginTop: -spacing.sm,
  },
  recommendationReason: {
    ...typography.body2,
    color: colors.text.primary,
    fontSize: 12,
    opacity: 0.9,
    lineHeight: 20,
    textAlign: 'center',
  },
  comparisonCard: {
    backgroundColor: colors.modal.content,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.modal.border,
  },
  comparisonHeader: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  poster: {
    width: 60,
    height: 90,
    borderRadius: borderRadius.sm,
  },
  comparisonTitleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  comparisonTitle: {
    ...typography.h3,
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  bestForContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  bestForText: {
    ...typography.body2,
    color: colors.text.primary,
    flex: 1,
    fontStyle: 'italic',
  },
  prosConsSection: {
    marginBottom: spacing.md,
  },
  prosConsTitle: {
    ...typography.body1,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  proConRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  proConText: {
    ...typography.body2,
    color: colors.text.secondary,
    flex: 1,
    lineHeight: 18,
  },
  watchButton: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  watchButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  watchButtonText: {
    ...typography.body1,
    color: colors.text.primary,
    fontWeight: '600',
  },
});
