import React, {useState, useMemo, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
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
        console.log('✅ Loaded insights from storage');
        setAnalysis(stored);

        // Load recommendations
        const storedRecs = await WatchlistInsightsManager.getRecommendations(
          watchlistHash,
        );
        if (storedRecs) {
          console.log('✅ Loaded recommendations from storage');
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
      console.log('📂 Expanding existing insights');
      setExpanded(true);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setExpanded(true);

      console.log('🤖 Analyzing watchlist with AI...');
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
      console.log('🔍 Fetching TMDB content for AI recommendations...');
      console.log('🎬 AI recommended:', aiRecommendations);

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

      console.log('✅ Fetched', contentItems.length, 'TMDB recommendations');
      console.log(
        '📝 Items:',
        contentItems.map((c: any) => c.title || c.name),
      );

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
    },
    card: {
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.modal.border,
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
      marginBottom: spacing.md,
    },
    title: {
      ...typography.h3,
      color: colors.text.primary,
    },
    description: {
      ...typography.body2,
      color: colors.text.secondary,
      fontSize: isTablet ? 14 : 12,
    },
    analyzeButton: {
      borderRadius: borderRadius.round,
      overflow: 'hidden',
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
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(147, 51, 234, 0.1)', 'rgba(168, 85, 247, 0.05)']}
        style={styles.card}>
        {!expanded && (
          <View>
            <View style={{marginBottom: spacing.md}}>
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
                <Icon
                  name="analytics"
                  size={isTablet ? 24 : 20}
                  color={colors.accent}
                  style={{
                    backgroundColor: colors.modal.blur,
                    padding: spacing.md,
                    borderRadius: borderRadius.md,
                  }}
                />
                <View style={{width: '90%', paddingRight: spacing.lg}}>
                  <Text style={styles.title}>Watchlist Insights</Text>
                  <Text style={styles.description}>
                    {analysis
                      ? 'See your watchlist analysis and personalized recommendations.'
                      : 'Discover patterns in your watchlist and personalized recommendations.'}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={styles.analyzeButton}
              onPress={handleAnalyze}
              disabled={loading || watchlistItems.length < 3}>
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={styles.analyzeButtonGradient}>
                <>
                  <Icon
                    name={analysis ? 'eye' : 'sparkles'}
                    size={16}
                    color={colors.text.primary}
                  />
                  <Text style={styles.analyzeButtonText}>
                    {analysis ? 'View Insights' : 'Analyze'}
                  </Text>
                </>
              </LinearGradient>
            </TouchableOpacity>
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
              <Icon name="analytics" size={24} color={colors.accent} />
              <Text style={styles.title}>Watchlist Insights</Text>
            </View>
            <InsightsSkeleton />
          </>
        )}

        {/* Analysis Results */}
        {expanded && analysis && !loading && (
          <>
            <View style={styles.headerLeft}>
              <Icon name="analytics" size={24} color={colors.accent} />
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

              {/* Decade Distribution */}
              {Object.keys(analysis.decadeDistribution).length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Content by Era</Text>
                  {Object.entries(analysis.decadeDistribution)
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
                  <Text style={styles.sectionTitle}>
                    Based on Your Taste ({recommendations.length})
                  </Text>
                  <HorizontalList
                    title=""
                    data={recommendations}
                    onItemPress={handleItemPress}
                    isLoading={false}
                    isSeeAll={false}
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
                    setExpanded(false);
                    await WatchlistInsightsManager.clearAll();
                    setTimeout(() => handleAnalyze(), 100);
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
