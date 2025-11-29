import React, {useState, useMemo, useCallback, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {LinearGradient} from 'react-native-linear-gradient';
import {BlurView} from '@react-native-community/blur';
import {MaybeBlurView} from './MaybeBlurView';
import {useResponsive} from '../hooks/useResponsive';
import {BlurPreference} from '../store/blurPreference';
import {ReviewsSkeleton} from '../components/LoadingSkeleton';

interface Review {
  id: string;
  author: string;
  content: string;
  created_at: string;
  author_details?: {
    rating?: number;
  };
}

interface ReviewsSectionProps {
  reviews: Review[];
  totalReviews: number;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  voteAverage?: number;
}

type SortOption = 'recent' | 'oldest' | 'highest' | 'lowest';
type FilterRating = 'all' | 10 | 9 | 8 | 7 | 6 | 5 | 4 | 3 | 2 | 1;

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({
  reviews,
  totalReviews,
  onLoadMore,
  hasMore,
  isLoading,
  voteAverage = 0,
}) => {
  const {width} = useWindowDimensions();
  const {isTablet} = useResponsive();
  const themeMode = BlurPreference.getMode();
  const isSolid = themeMode === 'normal';

  const [showModal, setShowModal] = useState(false);
  const [scrollToReviewId, setScrollToReviewId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [filterRating, setFilterRating] = useState<FilterRating>('all');
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(
    new Set(),
  );
  const flatListRef = useRef<FlatList>(null);

  // Calculate rating distribution
  const ratingDistribution = useMemo(() => {
    const dist: {[key: number]: number} = {
      10: 0,
      9: 0,
      8: 0,
      7: 0,
      6: 0,
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };

    reviews.forEach(review => {
      const rating = review.author_details?.rating;
      if (rating) {
        dist[rating] = (dist[rating] || 0) + 1;
      }
    });

    return dist;
  }, [reviews]);

  const maxRatingCount = Math.max(...Object.values(ratingDistribution));

  // Filter and sort reviews
  const processedReviews = useMemo(() => {
    let filtered = [...reviews];

    // Filter by rating
    if (filterRating !== 'all') {
      filtered = filtered.filter(
        r => r.author_details?.rating === filterRating,
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        case 'oldest':
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        case 'highest':
          return (
            (b.author_details?.rating || 0) - (a.author_details?.rating || 0)
          );
        case 'lowest':
          return (
            (a.author_details?.rating || 0) - (b.author_details?.rating || 0)
          );
        default:
          return 0;
      }
    });

    return filtered;
  }, [reviews, sortBy, filterRating]);

  // Scroll to specific review when modal opens with scrollToReviewId
  useEffect(() => {
    if (showModal && scrollToReviewId && flatListRef.current) {
      // Find the index of the review in processedReviews
      const reviewIndex = processedReviews.findIndex(
        r => r.id === scrollToReviewId,
      );

      if (reviewIndex !== -1) {
        // Small delay to ensure modal is fully rendered
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: reviewIndex,
            animated: true,
            viewPosition: 0.1, // Position near top
          });
        }, 300);
      }
    }
  }, [showModal, scrollToReviewId, processedReviews]);

  const toggleExpanded = useCallback((reviewId: string) => {
    setExpandedReviews(prev => {
      const next = new Set(prev);
      if (next.has(reviewId)) {
        next.delete(reviewId);
      } else {
        next.add(reviewId);
      }
      return next;
    });
  }, []);

  const openModalWithReview = useCallback((reviewId: string) => {
    // Expand the review and open modal
    setExpandedReviews(prev => {
      const next = new Set(prev);
      next.add(reviewId);
      return next;
    });
    setScrollToReviewId(reviewId);
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    // Clear all expanded reviews when closing modal
    setExpandedReviews(new Set());
    setScrollToReviewId(null);
  }, []);

  const renderReviewCard = useCallback(
    (review: Review, compact: boolean = false) => {
      const isExpanded = expandedReviews.has(review.id);
      const shouldTruncate = !isExpanded && review.content.length > 300;

      return (
        <TouchableOpacity
          key={review.id}
          style={[
            styles.reviewCard,
            compact && {marginRight: spacing.md, width: width * 0.75},
          ]}
          activeOpacity={0.7}
          onPress={() => {
            if (compact) {
              // In horizontal list, "Read more" opens modal and scrolls to this review
              openModalWithReview(review.id);
            } else {
              // In modal, toggle expanded state
              toggleExpanded(review.id);
            }
          }}>
          <View style={styles.reviewHeader}>
            <View style={styles.reviewAuthorInfo}>
              <Text style={styles.reviewAuthor} numberOfLines={1}>
                {review.author || 'Anonymous'}
              </Text>
              <Text style={styles.reviewDate}>
                {new Date(review.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </View>
            {review.author_details?.rating && (
              <View style={styles.reviewRating}>
                <Icon name="star" size={14} color={colors.modal.activeBorder} />
                <Text style={styles.reviewRatingText}>
                  {review.author_details.rating}
                </Text>
              </View>
            )}
          </View>
          <Text
            style={styles.reviewContent}
            numberOfLines={shouldTruncate ? 5 : undefined}>
            {review.content}
          </Text>
          {shouldTruncate && compact && (
            <Text style={styles.reviewReadMore}>Read more</Text>
          )}
          {shouldTruncate && !compact && (
            <Text style={styles.reviewReadMore}>Tap to expand</Text>
          )}
        </TouchableOpacity>
      );
    },
    [expandedReviews, toggleExpanded, width, openModalWithReview],
  );

  const getGradientColors = (rating: number): string[] => {
    if (rating <= 3) return ['transparent', '#FF6B6B']; // Transparent to Red (poor)
    if (rating <= 6) return ['transparent', '#FFD93D']; // Transparent to Yellow (average)
    return ['transparent', '#51CF66']; // Transparent to Green (good)
  };

  const renderRatingBar = useCallback(
    (rating: number) => {
      const count = ratingDistribution[rating] || 0;
      const totalReviewsWithRating = Object.values(ratingDistribution).reduce(
        (a, b) => a + b,
        0,
      );
      const percentage =
        maxRatingCount > 0 ? (count / maxRatingCount) * 100 : 0;
      const percentageOfTotal =
        totalReviewsWithRating > 0 ? (count / totalReviewsWithRating) * 100 : 0;
      const gradientColors = getGradientColors(rating);

      return (
        <TouchableOpacity
          key={rating}
          style={styles.ratingRow}
          onPress={() => setFilterRating(rating as FilterRating)}
          activeOpacity={0.7}>
          <Text style={styles.ratingLabel}>{rating}</Text>
          <View style={styles.barContainer}>
            <LinearGradient
              colors={gradientColors}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={[styles.ratingBarFill, {width: `${percentage}%`}]}
            />
          </View>
          <Text style={styles.percentageLabel}>
            {percentageOfTotal > 0 ? `${percentageOfTotal.toFixed(1)}%` : ''}
          </Text>
        </TouchableOpacity>
      );
    },
    [ratingDistribution, maxRatingCount],
  );

  if (reviews.length === 0) {
    if (isLoading) {
      return <ReviewsSkeleton />;
    }
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setShowModal(true)}
        activeOpacity={0.7}>
        <Text style={styles.title}>User Reviews</Text>
        <View style={styles.headerRight}>
          <Text style={styles.totalCount}>{totalReviews}</Text>
          <Icon name="chevron-forward" size={20} color={colors.text.muted} />
        </View>
      </TouchableOpacity>

      {/* Review Distribution Chart */}
      <View style={styles.newChartContainer}>
        <View style={styles.chartContent}>
          {/* Labels Column */}
          <View style={styles.labelsColumn}>
            {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(r => (
              <Text key={r} style={styles.chartLabel}>
                {r}
              </Text>
            ))}
          </View>

          {/* Vertical Gradient Line */}
          <LinearGradient
            colors={['#51CF66', '#FFD93D', '#FF6B6B']}
            style={styles.verticalLine}
          />

          {/* Bars Column */}
          <View style={styles.barsList}>
            {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(renderRatingBar)}
          </View>
        </View>
      </View>

      {/* Horizontal Review List */}
      <FlatList
        data={processedReviews.slice(0, 5)}
        renderItem={({item}) => renderReviewCard(item, true)}
        keyExtractor={item => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
      />

      {/* See All Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        backdropColor={colors.modal.blurDark}
        statusBarTranslucent={true}
        onRequestClose={closeModal}>
        {!isSolid && (
          <BlurView
            blurType="dark"
            blurAmount={10}
            overlayColor={colors.modal.blurDark}
            style={{
              flex: 1,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
        )}

        <View
          style={{
            flex: 1,
            margin: isTablet ? spacing.xl : spacing.md,
            borderRadius: borderRadius.xl,
            backgroundColor: 'transparent',
          }}>
          {/* Modal Header */}
          <MaybeBlurView
            header
            style={[
              {
                marginTop: 20,
              },
            ]}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
              }}>
              <Icon
                name="chatbox-ellipses"
                size={20}
                color={colors.text.muted}
              />
              <Text style={styles.modalTitle}>
                User Reviews ({totalReviews})
              </Text>
            </View>
            <TouchableOpacity
              onPress={closeModal}
              style={{
                padding: spacing.sm,
                backgroundColor: colors.modal.blur,
                borderRadius: borderRadius.round,
                borderTopWidth: 1,
                borderLeftWidth: 1,
                borderRightWidth: 1,
                borderColor: colors.modal.content,
              }}>
              <Icon name="close" size={20} color={colors.text.primary} />
            </TouchableOpacity>
          </MaybeBlurView>

          {/* Modal Body */}
          <View
            style={{
              flex: 1,
              overflow: 'hidden',
              borderRadius: borderRadius.xl,
              borderWidth: isSolid ? 0 : 1,
              borderColor: isSolid ? colors.modal.blur : colors.modal.content,
            }}>
            <MaybeBlurView body>
              {/* Filters */}
              <View style={styles.filtersContainer}>
                {/* Sort Options */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.filterRow}>
                  <Text style={styles.filterLabel}>Sort:</Text>
                  {[
                    {label: 'Most Recent', value: 'recent' as SortOption},
                    {label: 'Oldest', value: 'oldest' as SortOption},
                    {label: 'Highest Rated', value: 'highest' as SortOption},
                    {label: 'Lowest Rated', value: 'lowest' as SortOption},
                  ].map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.filterChip,
                        sortBy === option.value && styles.filterChipActive,
                      ]}
                      onPress={() => setSortBy(option.value)}>
                      <Text
                        style={[
                          styles.filterChipText,
                          sortBy === option.value &&
                            styles.filterChipTextActive,
                        ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Rating Filter */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.filterRow}>
                  <Text style={styles.filterLabel}>Rating:</Text>
                  {[
                    {label: 'All', value: 'all' as FilterRating},
                    ...[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(r => ({
                      label: `${r}★`,
                      value: r as FilterRating,
                    })),
                  ].map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.filterChip,
                        filterRating === option.value &&
                          styles.filterChipActive,
                      ]}
                      onPress={() => setFilterRating(option.value)}>
                      <Text
                        style={[
                          styles.filterChipText,
                          filterRating === option.value &&
                            styles.filterChipTextActive,
                        ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Clear Filters */}
                {(sortBy !== 'recent' || filterRating !== 'all') && (
                  <TouchableOpacity
                    style={styles.clearFilters}
                    onPress={() => {
                      setSortBy('recent');
                      setFilterRating('all');
                    }}>
                    <Icon
                      name="close-circle"
                      size={16}
                      color={colors.text.muted}
                    />
                    <Text style={styles.clearFiltersText}>Clear filters</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Reviews List */}
              <FlatList
                ref={flatListRef}
                data={processedReviews}
                renderItem={({item}) => renderReviewCard(item, false)}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.modalList}
                showsVerticalScrollIndicator={false}
                onScrollToIndexFailed={info => {
                  // Handle scroll failure by waiting and trying again
                  const wait = new Promise(resolve => setTimeout(resolve, 500));
                  wait.then(() => {
                    flatListRef.current?.scrollToIndex({
                      index: info.index,
                      animated: true,
                      viewPosition: 0.1,
                      viewOffset: 0,
                    });
                  });
                }}
                onEndReached={() => {
                  if (hasMore && !isLoading && onLoadMore) {
                    onLoadMore();
                  }
                }}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                  isLoading ? (
                    <View style={styles.loadingFooter}>
                      <Text style={styles.loadingText}>Loading more...</Text>
                    </View>
                  ) : null
                }
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Icon
                      name="chatbubble-outline"
                      size={48}
                      color={colors.text.muted}
                    />
                    <Text style={styles.emptyText}>
                      No reviews found with selected filters
                    </Text>
                  </View>
                }
              />
            </MaybeBlurView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  totalCount: {
    ...typography.body2,
    color: colors.text.muted,
  },
  newChartContainer: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    height: 150,
  },
  starColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starWrapper: {
    width: 120,
    height: 120,
    position: 'relative',
  },
  starBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  starForegroundWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 120,
    overflow: 'hidden',
  },
  starForeground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
  averageRatingText: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: '700',
    marginTop: -10,
  },
  barsColumn: {
    flex: 2,
    justifyContent: 'center',
  },
  chartContent: {
    flexDirection: 'row',
    height: '100%',
    alignItems: 'center',
  },
  labelsColumn: {
    justifyContent: 'space-between',
    height: '100%',
    paddingRight: spacing.xs,
  },
  chartLabel: {
    ...typography.caption,
    fontSize: 10,
    color: colors.text.muted,
    lineHeight: 12,
  },
  verticalLine: {
    width: 2,
    height: '100%',
    borderRadius: 1,
  },
  barsList: {
    flex: 1,
    justifyContent: 'space-between',
    height: '100%',
    paddingLeft: spacing.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 12, // Match label height roughly
  },
  ratingLabel: {
    display: 'none', // Hidden in new design, used labelsColumn instead
  },
  barContainer: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  percentageLabel: {
    ...typography.caption,
    fontSize: 10,
    color: colors.text.muted,
    marginLeft: spacing.xs,
    minWidth: 35,
    textAlign: 'right',
  },
  horizontalList: {
    paddingHorizontal: spacing.md,
  },
  reviewCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.background.tertiary,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  reviewAuthorInfo: {
    flex: 1,
  },
  reviewAuthor: {
    ...typography.body1,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  reviewDate: {
    ...typography.caption,
    color: colors.text.muted,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background.tertiary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  reviewRatingText: {
    ...typography.caption,
    color: colors.text.primary,
    fontWeight: '600',
  },
  reviewContent: {
    ...typography.body2,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  reviewReadMore: {
    ...typography.body2,
    color: colors.modal.activeBorder,
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: '600',
  },
  filtersContainer: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.tertiary,
  },
  filterRow: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  filterLabel: {
    ...typography.body2,
    color: colors.text.muted,
    marginRight: spacing.sm,
    alignSelf: 'center',
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    backgroundColor: colors.background.secondary,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.background.tertiary,
  },
  filterChipActive: {
    backgroundColor: colors.modal.activeBorder,
    borderColor: colors.modal.activeBorder,
  },
  filterChipText: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  filterChipTextActive: {
    color: colors.background.primary,
    fontWeight: '600',
  },
  clearFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignSelf: 'flex-start',
    marginLeft: spacing.md,
  },
  clearFiltersText: {
    ...typography.body2,
    color: colors.text.muted,
  },
  modalList: {
    padding: spacing.md,
  },
  loadingFooter: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body2,
    color: colors.text.muted,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyText: {
    ...typography.body1,
    color: colors.text.muted,
    textAlign: 'center',
  },
});
