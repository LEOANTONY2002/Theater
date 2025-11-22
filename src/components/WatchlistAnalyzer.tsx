import React, {useState, useMemo, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import {colors, spacing, borderRadius, typography} from '../styles/theme';
import Icon from 'react-native-vector-icons/Ionicons';
import {analyzeWatchlistPatterns} from '../services/gemini';
import LinearGradient from 'react-native-linear-gradient';
import {useResponsive} from '../hooks/useResponsive';
import {searchMovies, searchTVShows} from '../services/tmdb';
import {WatchlistInsightsManager} from '../store/watchlistInsights';
import {InsightsSkeleton} from './InsightsSkeleton';
import {HorizontalList} from './HorizontalList';
import type {Movie} from '../types/movie';
import {useNavigationState} from '../hooks/useNavigationState';
import FastImage from 'react-native-fast-image';

interface WatchlistAnalyzerProps {
  watchlistItems: Array<{
    id: number;
    title?: string;
    name?: string;
    type: 'movie' | 'tv';
    genre_ids?: number[];
    vote_average?: number;
    release_date?: string;
    first_air_date?: string;
    poster_path?: string;
  }>;
}

export const WatchlistAnalyzer: React.FC<WatchlistAnalyzerProps> = ({
  watchlistItems,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const {navigateWithLimit} = useNavigationState();
  const {isTablet} = useResponsive();

  // Create watchlist hash
  const watchlistHash = useMemo(() => {
    return WatchlistInsightsManager.createHash(watchlistItems);
  }, [watchlistItems]);

  // Load from storage on mount or when watchlist changes
  useEffect(() => {
    loadFromStorage();
  }, [watchlistHash]);

  const loadFromStorage = async () => {
    try {
      const stored = await WatchlistInsightsManager.getInsights(watchlistHash);
      if (stored) {
        setAnalysis(stored);

        // Load recommendations
        const storedRecs = await WatchlistInsightsManager.getRecommendations(
          watchlistHash,
        );
        if (storedRecs) {
          setRecommendations(storedRecs.items);
        }
      }
    } catch (err) {
      console.error('Error loading from storage:', err);
    }
  };

  const handleAnalyze = async () => {
    if (watchlistItems.length < 3) {
      setError('Add at least 3 items to your watchlist to analyze patterns');
      return;
    }

    // If we already have analysis, just expand it
    if (analysis) {
      setExpanded(true);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setExpanded(true);

      const result = await analyzeWatchlistPatterns(watchlistItems);

      if (!result) {
        throw new Error('Could not analyze patterns. Please try again.');
      }

      // Save insights to storage
      await WatchlistInsightsManager.saveInsights(watchlistHash, result);
      setAnalysis(result);

      // Fetch TMDB content from AI recommendations in background
      if (result.recommendedTitles && result.recommendedTitles.length > 0) {
        fetchRecommendations(result.recommendedTitles);
      }
    } catch (err) {
      console.error('Error analyzing watchlist:', err);
      setError('Failed to analyze watchlist. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async (
    aiRecommendations: Array<{title: string; type: 'movie' | 'tv'}>,
  ) => {
    try {
      setLoadingRecommendations(true);

      const contentItems: any[] = [];

      for (const rec of aiRecommendations) {
        try {
          if (rec.type === 'movie') {
            const results = await searchMovies(rec.title, 1);
            if (results?.results?.[0]) {
              contentItems.push({
                ...results.results[0],
                type: 'movie' as const,
              });
            }
          } else {
            const results = await searchTVShows(rec.title, 1);
            if (results?.results?.[0]) {
              contentItems.push({...results.results[0], type: 'tv' as const});
            }
          }
        } catch (e) {
          console.warn('Failed to search for:', rec.title, e);
        }
      }

      // Save to storage
      await WatchlistInsightsManager.saveRecommendations(
        watchlistHash,
        contentItems,
      );

      setRecommendations([...contentItems]);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleItemPress = useCallback(
    (item: any) => {
      if (item.type === 'movie') {
        navigateWithLimit('MovieDetails', {movie: item as Movie});
      } else {
        navigateWithLimit('TVShowDetails', {show: item as any});
      }
    },
    [navigateWithLimit],
  );

  if (watchlistItems.length === 0) {
    return null;
  }

  const styles = StyleSheet.create({
    container: {
      marginBottom: spacing.lg,
      marginHorizontal: spacing.md,
    },
    card: {
      borderRadius: borderRadius.xl,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.modal.content,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    title: {
      ...typography.h3,
      color: colors.text.primary,
      fontSize: isTablet ? 20 : 14,
    },
    description: {
      ...typography.body2,
      color: colors.text.tertiary,
      fontSize: isTablet ? 14 : 10,
    },
    analyzeButton: {
      borderRadius: borderRadius.round,
      overflow: 'hidden',
      backgroundColor: colors.modal.blur,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: colors.modal.content,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: 14,
      paddingHorizontal: spacing.md,
      marginTop: spacing.sm,
      width: isTablet ? 160 : 120,
    },
    analyzeButtonGradient: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingVertical: 14,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    analyzeButtonText: {
      ...typography.body2,
      color: colors.text.primary,
      fontWeight: '600',
      fontSize: isTablet ? 14 : 10,
    },
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderRadius: borderRadius.sm,
      padding: spacing.sm,
      marginTop: spacing.sm,
    },
    errorText: {
      ...typography.body2,
      color: colors.status.error,
      marginLeft: spacing.xs,
      flex: 1,
    },
    resultsContainer: {
      flex: 1,
    },
    section: {
      marginBottom: spacing.lg,
    },
    sectionTitle: {
      ...typography.h3,
      fontSize: 16,
      color: colors.text.primary,
      marginBottom: spacing.sm,
    },
    insightRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: spacing.sm,
      gap: spacing.sm,
    },
    insightText: {
      ...typography.body2,
      color: colors.text.secondary,
      flex: 1,
      lineHeight: 20,
    },
    genreContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    genreChip: {
      backgroundColor: colors.modal.content,
      borderRadius: borderRadius.sm,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: colors.modal.border,
    },
    genreText: {
      ...typography.body2,
      color: colors.text.primary,
    },
    statsRow: {
      flexDirection: 'row',
      gap: spacing.md,
      marginBottom: spacing.lg,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.modal.content,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.modal.border,
    },
    statValue: {
      ...typography.h2,
      color: colors.text.primary,
      marginTop: spacing.xs,
    },
    statLabel: {
      ...typography.caption,
      color: colors.text.muted,
      marginTop: spacing.xs,
    },
    decadeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.sm,
      gap: spacing.sm,
    },
    decadeText: {
      ...typography.body2,
      color: colors.text.secondary,
      width: 60,
    },
    decadeBar: {
      flex: 1,
      height: 8,
      backgroundColor: colors.modal.content,
      borderRadius: 4,
      overflow: 'hidden',
    },
    decadeBarFill: {
      height: '100%',
      backgroundColor: colors.accent,
    },
    decadeCount: {
      ...typography.body2,
      color: colors.text.muted,
      width: 30,
      textAlign: 'right',
    },
    recommendationText: {
      ...typography.body2,
      color: colors.text.secondary,
      lineHeight: 20,
    },
    loadingRecs: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      padding: spacing.md,
    },
    loadingRecsText: {
      ...typography.body2,
      color: colors.text.secondary,
    },
    bottomActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.modal.border,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      padding: spacing.sm,
    },
    collapseButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      marginTop: spacing.md,
      padding: spacing.sm,
    },
    collapseButtonText: {
      ...typography.body2,
      color: colors.text.secondary,
    },
    // Content Type Split styles
    splitContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.modal.blur,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      gap: spacing.md,
    },
    splitItem: {
      flex: 1,
      alignItems: 'center',
      gap: spacing.xs,
    },
    splitDivider: {
      width: 1,
      height: 40,
      backgroundColor: colors.modal.border,
    },
    splitLabel: {
      ...typography.body2,
      color: colors.text.secondary,
    },
    splitValue: {
      ...typography.h3,
      color: colors.accent,
    },
    // Mood Profile styles
    moodContainer: {
      backgroundColor: colors.modal.blur,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      gap: spacing.sm,
    },
    moodRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    moodLabel: {
      ...typography.body2,
      color: colors.text.secondary,
      minWidth: 80,
    },
    moodValue: {
      ...typography.body1,
      color: colors.text.primary,
      fontWeight: '600',
    },
    traitsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginTop: spacing.xs,
    },
    traitChip: {
      backgroundColor: colors.modal.border,
      borderRadius: borderRadius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    traitText: {
      ...typography.caption,
      color: colors.accent,
    },
    // Hidden Gems styles
    gemCard: {
      borderRadius: borderRadius.md,
      marginBottom: spacing.md,
      overflow: 'hidden',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    gemGradient: {
      flexDirection: 'row',
      borderRadius: borderRadius.md,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.modal.border,
    },
    gemPoster: {
      width: 80,
      height: 120,
      backgroundColor: colors.modal.blur,
    },
    gemContent: {
      flex: 1,
      padding: spacing.md,
      justifyContent: 'space-between',
    },
    gemHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.xs,
    },
    gemTitle: {
      ...typography.body1,
      color: colors.text.primary,
      fontWeight: '600',
      flex: 1,
    },
    gemType: {
      fontSize: 14,
    },
    gemReason: {
      ...typography.body2,
      color: colors.text.secondary,
      lineHeight: 18,
      marginBottom: spacing.xs,
    },
    gemFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.xs,
    },
    gemRating: {
      ...typography.caption,
      color: colors.accent,
      fontWeight: '600',
    },
    // Content Freshness styles
    freshnessCard: {
      backgroundColor: colors.modal.blur,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      gap: spacing.sm,
    },
    freshnessHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    freshnessPreference: {
      ...typography.h3,
      color: colors.accent,
      flex: 1,
    },
    freshnessPercentage: {
      ...typography.body2,
      color: colors.text.secondary,
    },
    freshnessNote: {
      ...typography.body2,
      color: colors.text.secondary,
      fontStyle: 'italic',
    },
    // Completion Insight styles
    completionCard: {
      backgroundColor: colors.modal.blur,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      gap: spacing.md,
    },
    completionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    completionLabel: {
      ...typography.body2,
      color: colors.text.secondary,
      flex: 1,
    },
    completionValue: {
      ...typography.body1,
      color: colors.accent,
      fontWeight: '600',
    },
    suggestionBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      backgroundColor: colors.modal.border,
      borderRadius: borderRadius.sm,
      padding: spacing.sm,
      marginTop: spacing.xs,
    },
    suggestionText: {
      ...typography.body2,
      color: colors.text.primary,
      flex: 1,
    },
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgb(10, 0, 18)', 'rgb(16, 0, 28)']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.card}>
        {!expanded && (
          <View
            style={[
              styles.headerLeft,
              {
                marginBottom: spacing.xs,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
              },
            ]}>
            <Image
              source={require('../assets/insights.png')}
              style={{
                marginTop: -60,
                marginLeft: isTablet ? 0 : -10,
                width: isTablet ? 100 : 90,
                height: isTablet ? 170 : 150,
                objectFit: 'fill',
              }}
            />
            <View style={{width: '90%', paddingRight: spacing.lg}}>
              <Text style={styles.title}>Watchlist Insights</Text>
              <Text style={styles.description}>
                {analysis
                  ? 'See your watchlist analysis and personalized recommendations.'
                  : 'Discover patterns in your watchlist and personalized recommendations.'}
              </Text>
              <TouchableOpacity
                style={styles.analyzeButton}
                onPress={handleAnalyze}
                disabled={loading || watchlistItems.length < 3}>
                {/* <LinearGradient
                  colors={[colors.primary, colors.secondary]}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={styles.analyzeButtonGradient}> */}
                <>
                  <Icon
                    name={'sparkles'}
                    size={isTablet ? 16 : 12}
                    color={colors.text.primary}
                  />
                  <Text style={styles.analyzeButtonText}>
                    {analysis ? 'View Insights' : 'Analyze'}
                  </Text>
                </>
                {/* </LinearGradient> */}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle" size={16} color={colors.status.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Skeleton Loader */}
        {loading && (
          <>
            <View style={styles.headerLeft}>
              <Icon
                name="analytics"
                size={24}
                color={colors.accent}
                style={{
                  backgroundColor: colors.modal.blur,
                  padding: spacing.md,
                  borderRadius: borderRadius.md,
                }}
              />
              <Text style={styles.title}>Watchlist Insights</Text>
            </View>
            <InsightsSkeleton />
          </>
        )}

        {/* Analysis Results */}
        {expanded && analysis && !loading && (
          <>
            <View style={styles.headerLeft}>
              <Icon
                name="analytics"
                size={24}
                color={colors.accent}
                style={{
                  backgroundColor: colors.modal.blur,
                  padding: spacing.md,
                  borderRadius: borderRadius.md,
                }}
              />
              <Text style={styles.title}>Watchlist Insights</Text>
            </View>
            <ScrollView
              style={styles.resultsContainer}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={false}>
              {/* Insights */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Key Patterns</Text>
                {analysis.insights.map((insight: string, index: number) => (
                  <View key={index} style={styles.insightRow}>
                    <Icon
                      name="checkmark-circle"
                      size={16}
                      color={colors.accent}
                    />
                    <Text style={styles.insightText}>{insight}</Text>
                  </View>
                ))}
              </View>

              {/* Top Genres */}
              {analysis.topGenres.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Top Genres</Text>
                  <View style={styles.genreContainer}>
                    {analysis.topGenres.map((genre: string, index: number) => (
                      <View key={index} style={styles.genreChip}>
                        <Text style={styles.genreText}>{genre}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Stats */}
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Icon name="star" size={20} color={colors.accent} />
                  <Text style={styles.statValue}>
                    {analysis.averageRating.toFixed(1)}
                  </Text>
                  <Text style={styles.statLabel}>Avg Rating</Text>
                </View>
                <View style={styles.statCard}>
                  <Icon name="film" size={20} color={colors.accent} />
                  <Text style={styles.statValue}>{watchlistItems.length}</Text>
                  <Text style={styles.statLabel}>Total Items</Text>
                </View>
              </View>

              {/* Content Type Split */}
              {analysis.contentTypeSplit && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Content Mix</Text>
                  <View style={styles.splitContainer}>
                    <View style={styles.splitItem}>
                      <Icon
                        name="film-outline"
                        size={18}
                        color={colors.accent}
                      />
                      <Text style={styles.splitLabel}>Movies</Text>
                      <Text style={styles.splitValue}>
                        {analysis.contentTypeSplit.movies}%
                      </Text>
                    </View>
                    <View style={styles.splitDivider} />
                    <View style={styles.splitItem}>
                      <Icon name="tv-outline" size={18} color={colors.accent} />
                      <Text style={styles.splitLabel}>TV Shows</Text>
                      <Text style={styles.splitValue}>
                        {analysis.contentTypeSplit.tvShows}%
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Mood Profile */}
              {analysis.moodProfile && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Mood Profile</Text>
                  <View style={styles.moodContainer}>
                    <View style={styles.moodRow}>
                      <Text style={styles.moodLabel}>Dominant:</Text>
                      <Text style={styles.moodValue}>
                        {analysis.moodProfile.dominant}
                      </Text>
                    </View>
                    {analysis.moodProfile.secondary && (
                      <View style={styles.moodRow}>
                        <Text style={styles.moodLabel}>Secondary:</Text>
                        <Text style={styles.moodValue}>
                          {analysis.moodProfile.secondary}
                        </Text>
                      </View>
                    )}
                    {analysis.moodProfile.traits &&
                      analysis.moodProfile.traits.length > 0 && (
                        <View style={styles.traitsContainer}>
                          {analysis.moodProfile.traits.map(
                            (trait: string, index: number) => (
                              <View key={index} style={styles.traitChip}>
                                <Text style={styles.traitText}>{trait}</Text>
                              </View>
                            ),
                          )}
                        </View>
                      )}
                  </View>
                </View>
              )}

              {/* Hidden Gems */}
              {analysis.hiddenGems && analysis.hiddenGems.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    💎 Hidden Gems in Your List
                  </Text>
                  {analysis.hiddenGems
                    .map((gem: any, index: number) => {
                      // Find the actual item from watchlist to get poster
                      // Try multiple matching strategies
                      const gemItem = watchlistItems.find(item => {
                        const itemTitle = (item.title || item.name || '')
                          .toLowerCase()
                          .trim();
                        const gemTitle = (gem.title || '').toLowerCase().trim();

                        // Exact match
                        if (itemTitle === gemTitle) return true;

                        // Partial match (gem title contains item title or vice versa)
                        if (
                          itemTitle.includes(gemTitle) ||
                          gemTitle.includes(itemTitle)
                        ) {
                          return true;
                        }

                        return false;
                      });

                      // Skip if item not found
                      if (!gemItem) {
                        console.warn(
                          `[HiddenGems] Could not find item for: "${gem.title}"`,
                          '\nAvailable titles:',
                          watchlistItems
                            .slice(0, 5)
                            .map(i => i.title || i.name),
                        );
                        return null;
                      }

                      // Additional safety check
                      if (!gemItem.id) {
                        console.error(
                          `[HiddenGems] Item found but has no ID:`,
                          gemItem,
                        );
                        return null;
                      }

                      return (
                        <TouchableOpacity
                          key={index}
                          style={styles.gemCard}
                          onPress={() => {
                            try {
                              if (!gemItem.id) {
                                console.error(
                                  '[HiddenGems] Cannot navigate - no ID',
                                );
                                return;
                              }

                              // Navigation expects full object, not just ID
                              if (gem.type === 'movie') {
                                navigateWithLimit('MovieDetails', {
                                  movie: {id: gemItem.id} as any,
                                });
                              } else {
                                navigateWithLimit('TVShowDetails', {
                                  show: {id: gemItem.id} as any,
                                });
                              }
                            } catch (error) {
                              console.error(
                                '[HiddenGems] Navigation error:',
                                error,
                              );
                            }
                          }}
                          activeOpacity={0.7}>
                          <LinearGradient
                            colors={[
                              'rgba(147, 51, 234, 0.15)',
                              'rgba(168, 85, 247, 0.05)',
                            ]}
                            start={{x: 0, y: 0}}
                            end={{x: 1, y: 1}}
                            style={styles.gemGradient}>
                            {gemItem.poster_path && (
                              <FastImage
                                source={{
                                  uri: `https://image.tmdb.org/t/p/w185${gemItem.poster_path}`,
                                  priority: FastImage.priority.normal,
                                }}
                                style={styles.gemPoster}
                                resizeMode="cover"
                              />
                            )}
                            <View style={styles.gemContent}>
                              <View style={styles.gemHeader}>
                                <Icon
                                  name="diamond"
                                  size={16}
                                  color={colors.accent}
                                />
                                <Text style={styles.gemTitle}>{gem.title}</Text>
                                <Text style={styles.gemType}>
                                  {gem.type === 'movie' ? '🎬' : '📺'}
                                </Text>
                              </View>
                              <Text style={styles.gemReason}>{gem.reason}</Text>
                              <View style={styles.gemFooter}>
                                <Icon
                                  name="star"
                                  size={12}
                                  color={colors.accent}
                                />
                                <Text style={styles.gemRating}>
                                  {gemItem.vote_average?.toFixed(1) || 'N/A'}
                                </Text>
                                <Icon
                                  name="arrow-forward"
                                  size={14}
                                  color={colors.text.secondary}
                                  style={{marginLeft: 'auto'}}
                                />
                              </View>
                            </View>
                          </LinearGradient>
                        </TouchableOpacity>
                      );
                    })
                    .filter(Boolean)}
                </View>
              )}

              {/* Content Freshness */}
              {analysis.contentFreshness && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Era Preference</Text>
                  <View style={styles.freshnessCard}>
                    <View style={styles.freshnessHeader}>
                      <Icon
                        name="time-outline"
                        size={20}
                        color={colors.accent}
                      />
                      <Text style={styles.freshnessPreference}>
                        {analysis.contentFreshness.preference}
                      </Text>
                      <Text style={styles.freshnessPercentage}>
                        {analysis.contentFreshness.recentPercentage}% Recent
                      </Text>
                    </View>
                    {analysis.contentFreshness.note && (
                      <Text style={styles.freshnessNote}>
                        {analysis.contentFreshness.note}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {/* Completion Insight */}
              {analysis.completionInsight && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Watchlist Stats</Text>
                  <View style={styles.completionCard}>
                    <View style={styles.completionRow}>
                      <Icon name="time" size={18} color={colors.accent} />
                      <Text style={styles.completionLabel}>Watch Time:</Text>
                      <Text style={styles.completionValue}>
                        {analysis.completionInsight.estimatedWatchTime}
                      </Text>
                    </View>
                    <View style={styles.completionRow}>
                      <Icon name="flash" size={18} color={colors.accent} />
                      <Text style={styles.completionLabel}>Binge Score:</Text>
                      <Text style={styles.completionValue}>
                        {analysis.completionInsight.bingeability.toFixed(1)}/10
                      </Text>
                    </View>
                    {analysis.completionInsight.suggestion && (
                      <View style={styles.suggestionBox}>
                        <Icon
                          name="bulb-outline"
                          size={16}
                          color={colors.accent}
                        />
                        <Text style={styles.suggestionText}>
                          {analysis.completionInsight.suggestion}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Decade Distribution */}
              {Object.keys(analysis.decadeDistribution).length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Content by Era</Text>
                  {Object.entries(analysis.decadeDistribution)
                    .filter(([_, count]) => (count as number) > 0)
                    .sort(([a], [b]) => b.localeCompare(a))
                    .map(([decade, count]) => (
                      <View key={decade} style={styles.decadeRow}>
                        <Text style={styles.decadeText}>{decade}</Text>
                        <View style={styles.decadeBar}>
                          <View
                            style={[
                              styles.decadeBarFill,
                              {
                                width: `${Math.min(
                                  100,
                                  ((count as number) / watchlistItems.length) *
                                    100,
                                )}%`,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.decadeCount}>
                          {count as number}
                        </Text>
                      </View>
                    ))}
                </View>
              )}

              {/* AI Recommendations Text */}
              {analysis.recommendations && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>AI Recommendations</Text>
                  <Text style={styles.recommendationText}>
                    {analysis.recommendations}
                  </Text>
                </View>
              )}

              {/* TMDB Recommendations List */}
              {recommendations.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Based on Your Taste</Text>
                  <HorizontalList
                    title=""
                    data={recommendations}
                    onItemPress={handleItemPress}
                    isLoading={false}
                    isSeeAll={false}
                    showSeeAllText={false}
                    hideTitle={true}
                  />
                </View>
              )}

              {loadingRecommendations && recommendations.length === 0 && (
                <View style={styles.loadingRecs}>
                  <ActivityIndicator color={colors.accent} size="small" />
                  <Text style={styles.loadingRecsText}>
                    Finding perfect matches from AI recommendations...
                  </Text>
                </View>
              )}

              <View style={styles.bottomActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={async () => {
                    // Force re-analyze
                    setAnalysis(null);
                    setRecommendations([]);
                    setExpanded(true);
                    setLoading(true);
                    setError(null);
                    await WatchlistInsightsManager.clearAll();

                    try {
                      const result = await analyzeWatchlistPatterns(
                        watchlistItems,
                      );

                      if (!result) {
                        throw new Error(
                          'Could not analyze patterns. Please try again.',
                        );
                      }

                      await WatchlistInsightsManager.saveInsights(
                        watchlistHash,
                        result,
                      );
                      setAnalysis(result);

                      if (
                        result.recommendedTitles &&
                        result.recommendedTitles.length > 0
                      ) {
                        fetchRecommendations(result.recommendedTitles);
                      }
                    } catch (err) {
                      console.error('Error re-analyzing watchlist:', err);
                      setError(
                        'Failed to re-analyze watchlist. Please try again.',
                      );
                    } finally {
                      setLoading(false);
                    }
                  }}>
                  <Icon name="refresh" size={16} color={colors.accent} />
                  <Text
                    style={[styles.collapseButtonText, {color: colors.accent}]}>
                    Re-analyze
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => setExpanded(false)}>
                  <Text style={styles.collapseButtonText}>Collapse</Text>
                  <Icon
                    name="chevron-up"
                    size={16}
                    color={colors.text.secondary}
                  />
                </TouchableOpacity>
              </View>
            </ScrollView>
          </>
        )}
      </LinearGradient>
    </View>
  );
};
