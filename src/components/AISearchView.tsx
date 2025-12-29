import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
  Image,
} from 'react-native';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import Icon from 'react-native-vector-icons/Ionicons';
import {aiSearch} from '../services/groq';
import {ContentItem} from './MovieList';
import FastImage from 'react-native-fast-image';
import {getImageUrl} from '../services/tmdb';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {MicButton} from './MicButton';
import {MaybeBlurView} from './MaybeBlurView';
import {HorizontalList} from './HorizontalList';
import {useResponsive} from '../hooks/useResponsive';

const AI_SEARCH_HISTORY_KEY = '@theater_ai_search_history';
const MAX_HISTORY_ITEMS = 5;

interface AISearchHistoryItem {
  query: string;
  bestMatch?: {
    id: number;
    type: 'movie' | 'tv';
    title: string;
    poster_path?: string;
    backdrop_path?: string;
    vote_average?: number;
    overview?: string;
  };
  timestamp: number;
}

interface AISearchViewProps {
  onResultPress: (item: ContentItem) => void;
  onBack: () => void;
  onSaveToRecentSearches?: (item: ContentItem) => void;
}

export const AISearchView: React.FC<AISearchViewProps> = ({
  onResultPress,
  onBack,
  onSaveToRecentSearches,
}) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState<AISearchHistoryItem[]>([]);
  const [results, setResults] = useState<{
    bestMatch: any;
    moreResults: any[];
    source: 'ai' | 'tmdb_fallback';
  } | null>(null);
  const {isTablet} = useResponsive();
  const {width} = useWindowDimensions();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.xl,
      marginBottom: spacing.md,
      backgroundColor: 'transparent',
      position: 'absolute',
      top: 0,
      zIndex: 1,
      overflow: 'hidden',
      paddingVertical: spacing.sm,
      margin: 20,
      borderRadius: borderRadius.round,
      width: '90%',
      alignSelf: 'center',
    },
    blurView: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 0,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: borderRadius.round,
      flex: 1,
    },
    searchIcon: {
      marginLeft: spacing.sm,
    },
    searchInput: {
      flex: 1,
      height: 48,
      paddingHorizontal: spacing.sm,
      color: colors.text.primary,
      ...typography.body1,
    },
    iconContainer: {
      padding: spacing.sm,
      marginRight: spacing.sm,
      borderRadius: borderRadius.round,
      borderTopWidth: 1,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      borderColor: colors.modal.blur,
    },
    backButton: {
      position: 'absolute',
      top: spacing.xl,
      left: spacing.md,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.background.secondary + '80',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
    },
    content: {
      flex: 1,
      paddingTop: 120, // Account for fixed header
    },
    sectionTitle: {
      ...typography.h3,
      fontSize: 14,
      color: colors.text.primary,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
      marginTop: 120,
    },
    loadingText: {
      ...typography.body1,
      color: colors.text.secondary,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xl * 2,
      paddingHorizontal: spacing.xl,
      gap: spacing.md,
    },
    emptyTitle: {
      ...typography.h2,
      color: colors.text.primary,
      textAlign: 'center',
    },
    emptySubtitle: {
      ...typography.body2,
      marginTop: -10,
      color: colors.text.secondary,
      textAlign: 'center',
    },
    bestMatchSection: {
      alignItems: 'center',
      paddingTop: spacing.xl,
      paddingHorizontal: spacing.md,
    },
    matchPercentageBackground: {
      position: 'absolute',
      alignItems: 'center',
      opacity: 0.09,
    },
    matchPercentageLarge: {
      fontSize: 120,
      fontWeight: '900',
      color: colors.text.primary,
    },
    posterCard: {
      width: width * 0.5,
      height: width * 0.8,
      marginTop: spacing.xl * 2.6,
      flexDirection: 'column',
      alignItems: 'center',
    },
    posterImage: {
      width: '100%',
      height: '100%',
      borderRadius: borderRadius.xl,
    },
    movieInfo: {
      alignItems: 'center',
      marginTop: spacing.lg,
      gap: spacing.xs,
    },
    movieTitle: {
      ...typography.h2,
      color: colors.text.primary,
      textAlign: 'center',
      marginTop: spacing.md,
    },
    movieMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    metaText: {
      ...typography.body2,
      color: colors.text.secondary,
    },
    metaDot: {
      ...typography.body2,
      color: colors.text.muted,
    },
    whyMatchSection: {
      marginTop: 50,
      width: '100%',
    },
    whyMatchHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.sm,
    },
    whyMatchTitle: {
      ...typography.body1,
      fontWeight: '600',
      color: colors.text.primary,
    },
    whyMatchText: {
      ...typography.body2,
      color: colors.text.muted,
    },
    moreResultsSection: {
      marginTop: spacing.xl,
      paddingHorizontal: spacing.md,
    },
    moreResultsTitle: {
      ...typography.h3,
      color: colors.text.primary,
      marginBottom: spacing.md,
    },
    moreResultCard: {
      flexDirection: 'row',
      borderRadius: borderRadius.md,
      paddingBottom: spacing.sm,
      marginBottom: spacing.sm,
      gap: spacing.sm,
    },
    moreResultPoster: {
      borderRadius: borderRadius.sm,
    },
    moreResultInfo: {
      flex: 1,
      justifyContent: 'center',
      gap: spacing.xs,
    },
    moreResultTitle: {
      ...typography.body1,
      fontWeight: '600',
      color: colors.text.primary,
    },
    moreResultMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      flexWrap: 'wrap',
    },
    moreResultMetaText: {
      ...typography.caption,
      color: colors.text.secondary,
    },
    moreResultMetaDot: {
      ...typography.caption,
      color: colors.text.muted,
    },
    moreResultReason: {
      ...typography.caption,
      color: colors.text.muted,
      fontStyle: 'italic',
    },
  });

  // Render content based on state
  const renderContent = () => {
    // Loading state
    if (isSearching) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>AI is thinking...</Text>
        </View>
      );
    }

    // Results state
    if (results) {
      const {bestMatch, moreResults} = results;
      return (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Best Match Section */}
          <View style={styles.bestMatchSection}>
            {/* Large "99% match" text in background */}
            <View style={styles.matchPercentageBackground}>
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'flex-end',
                }}>
                <Text style={styles.matchPercentageLarge}>
                  {Math.round(bestMatch.confidence * 100)}
                </Text>
                <Text style={[styles.matchPercentageLarge, {fontSize: 85}]}>
                  %
                </Text>
              </View>
            </View>

            {/* Movie Poster Card */}
            <TouchableOpacity
              style={styles.posterCard}
              onPress={() =>
                onResultPress({
                  id: bestMatch.id,
                  type: bestMatch.type,
                  title: bestMatch.title,
                  name: bestMatch.title,
                  poster_path: bestMatch.poster_path,
                  backdrop_path: bestMatch.backdrop_path,
                  vote_average: bestMatch.vote_average,
                  overview: bestMatch.overview,
                  release_date: bestMatch.year
                    ? `${bestMatch.year}-01-01`
                    : undefined,
                  first_air_date: bestMatch.year
                    ? `${bestMatch.year}-01-01`
                    : undefined,
                  popularity: 0,
                  genre_ids: [],
                  original_language: 'en',
                  origin_country: [],
                } as ContentItem)
              }
              activeOpacity={0.9}>
              <Image
                source={require('../assets/match.png')}
                style={{
                  position: 'absolute',
                  top: isTablet ? -60 : -50,
                  height: 60,
                  width: width * 0.2,
                }}
                resizeMode="contain"
              />
              <FastImage
                source={{
                  uri: bestMatch.poster_path
                    ? getImageUrl(bestMatch.poster_path, 'w500')
                    : 'https://via.placeholder.com/300x450?text=No+Image',
                }}
                style={styles.posterImage}
                resizeMode="cover"
              />
              <Image
                source={require('../assets/arc.png')}
                style={{
                  position: 'absolute',
                  bottom: -30,
                  height: isTablet ? 70 : 60,
                  width: isTablet ? width * 0.8 : width * 0.7,
                }}
                resizeMode="contain"
              />
            </TouchableOpacity>

            {/* Movie Info */}
            <View style={styles.movieInfo}>
              <Text style={styles.movieTitle}>{bestMatch.title}</Text>
              <View style={styles.movieMeta}>
                {bestMatch.year && (
                  <Text style={styles.metaText}>{bestMatch.year}</Text>
                )}
                {bestMatch.year && <Text style={styles.metaDot}>•</Text>}
                <Text style={styles.metaText}>English</Text>
                {bestMatch.vote_average && (
                  <>
                    <Text style={styles.metaDot}>•</Text>
                    <Text style={styles.metaText}>
                      {bestMatch.vote_average.toFixed(1)}
                    </Text>
                  </>
                )}
              </View>
            </View>

            {/* Why This Match */}
            {bestMatch.explanation && (
              <View style={styles.whyMatchSection}>
                <View style={styles.whyMatchHeader}>
                  <Icon name="sparkles" size={16} color={colors.accent} />
                  <Text style={styles.whyMatchTitle}>Why This Match</Text>
                </View>
                <Text style={styles.whyMatchText}>{bestMatch.explanation}</Text>
              </View>
            )}
          </View>

          {/* More Results Section */}
          {moreResults && moreResults.length > 0 && (
            <View style={styles.moreResultsSection}>
              <Text style={styles.moreResultsTitle}>More Results</Text>
              {moreResults.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.moreResultCard}
                  onPress={() =>
                    onResultPress({
                      id: item.id,
                      type: item.type,
                      title: item.title,
                      name: item.title,
                      poster_path: item.poster_path,
                      backdrop_path: item.backdrop_path,
                      vote_average: item.vote_average,
                      overview: item.overview,
                      release_date: item.year
                        ? `${item.year}-01-01`
                        : undefined,
                      first_air_date: item.year
                        ? `${item.year}-01-01`
                        : undefined,
                      popularity: 0,
                      genre_ids: [],
                      original_language: 'en',
                      origin_country: [],
                    } as ContentItem)
                  }
                  activeOpacity={0.7}>
                  <FastImage
                    source={{
                      uri: item.backdrop_path
                        ? getImageUrl(item.backdrop_path, 'w300')
                        : 'https://via.placeholder.com/300x169?text=No+Image',
                    }}
                    style={[
                      styles.moreResultPoster,
                      {
                        width: isTablet ? 200 : 150,
                        height: isTablet ? 120 : 90,
                      },
                    ]}
                    resizeMode="cover"
                  />
                  <View style={styles.moreResultInfo}>
                    <Text style={styles.moreResultTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <View style={styles.moreResultMeta}>
                      {item.year && (
                        <Text style={styles.moreResultMetaText}>
                          {item.year}
                        </Text>
                      )}
                      {item.year && (
                        <Text style={styles.moreResultMetaDot}>•</Text>
                      )}
                      <Text style={styles.moreResultMetaText}>English</Text>
                      {item.vote_average && (
                        <>
                          <Text style={styles.moreResultMetaDot}>•</Text>
                          <Text style={styles.moreResultMetaText}>
                            {item.vote_average.toFixed(1)}
                          </Text>
                        </>
                      )}
                    </View>
                    {item.reason && (
                      <Text style={styles.moreResultReason} numberOfLines={2}>
                        {item.reason}
                      </Text>
                    )}
                    <LinearGradient
                      colors={['transparent', colors.modal.blur, 'transparent']}
                      start={{x: 0, y: 0}}
                      end={{x: 1, y: 0}}
                      style={{
                        height: 1,
                        width: width * 0.5,
                        marginTop: spacing.sm,
                        bottom: 0,
                        position: 'absolute',
                      }}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <View style={{height: 200}} />
        </ScrollView>
      );
    }

    // Empty state
    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* AI Search History */}
        {searchHistory.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Recent AI Searches</Text>
            <HorizontalList
              title="V2"
              data={searchHistory
                .filter(item => item.bestMatch)
                .map(
                  item =>
                    ({
                      id: item.bestMatch!.id,
                      type: item.bestMatch!.type,
                      title: item.bestMatch!.title,
                      name: item.bestMatch!.title,
                      poster_path: item.bestMatch!.poster_path,
                      backdrop_path: item.bestMatch!.backdrop_path,
                      vote_average: item.bestMatch!.vote_average,
                      overview: item.bestMatch!.overview,
                      release_date: '',
                      first_air_date: '',
                      popularity: 0,
                      genre_ids: [],
                      original_language: 'en',
                      origin_country: [],
                    } as ContentItem),
                )}
              onItemPress={item => {
                const historyItem = searchHistory.find(
                  h => h.bestMatch?.id === item.id,
                );
                if (historyItem) {
                  setQuery(historyItem.query);
                  handleSearch();
                }
              }}
              isLoading={false}
            />
          </View>
        )}

        <View style={styles.emptyState}>
          <Icon name="sparkles" size={24} color={colors.accent} />
          <Text style={styles.emptyTitle}>AI Search</Text>
          <Text style={styles.emptySubtitle}>
            Describe what you're looking for
          </Text>
          <Text style={[styles.emptySubtitle, {color: colors.text.muted}]}>
            Try asking for Movie/show name, or don't know the name? describe it
            to find. Ask for similar movie/show, or ask for recommendations.
          </Text>
        </View>
      </ScrollView>
    );
  };

  // Load search history
  useEffect(() => {
    loadSearchHistory();
  }, []);

  const loadSearchHistory = async () => {
    try {
      const history = await AsyncStorage.getItem(AI_SEARCH_HISTORY_KEY);
      if (history) {
        setSearchHistory(JSON.parse(history));
      }
    } catch (error) {
      console.error('Error loading AI search history:', error);
    }
  };

  const saveToHistory = async (searchQuery: string, bestMatchResult?: any) => {
    try {
      const trimmed = searchQuery.trim();
      if (!trimmed) return;

      const historyItem: AISearchHistoryItem = {
        query: trimmed,
        bestMatch: bestMatchResult
          ? {
              id: bestMatchResult.id,
              type: bestMatchResult.type,
              title: bestMatchResult.title,
              poster_path: bestMatchResult.poster_path,
              backdrop_path: bestMatchResult.backdrop_path,
              vote_average: bestMatchResult.vote_average,
              overview: bestMatchResult.overview,
            }
          : undefined,
        timestamp: Date.now(),
      };

      const updated = [
        historyItem,
        ...searchHistory.filter(item => item.query !== trimmed),
      ].slice(0, MAX_HISTORY_ITEMS);

      await AsyncStorage.setItem(
        AI_SEARCH_HISTORY_KEY,
        JSON.stringify(updated),
      );
      setSearchHistory(updated);

      // Also save best match to normal recent searches
      if (bestMatchResult && onSaveToRecentSearches) {
        const contentItem: ContentItem = {
          id: bestMatchResult.id,
          type: bestMatchResult.type,
          title: bestMatchResult.title,
          name: bestMatchResult.title,
          poster_path: bestMatchResult.poster_path,
          backdrop_path: bestMatchResult.backdrop_path,
          vote_average: bestMatchResult.vote_average,
          overview: bestMatchResult.overview,
          release_date: bestMatchResult.year
            ? `${bestMatchResult.year}-01-01`
            : '',
          first_air_date: bestMatchResult.year
            ? `${bestMatchResult.year}-01-01`
            : '',
          popularity: 0,
          genre_ids: [],
          original_language: 'en',
          origin_country: [],
        };
        onSaveToRecentSearches(contentItem);
      }
    } catch (error) {
      console.error('Error saving AI search history:', error);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setResults(null);

    try {
      const searchResults = await aiSearch({query: query.trim()});
      setResults(searchResults);
      await saveToHistory(query.trim(), searchResults?.bestMatch);
    } catch (error) {
      console.error('AI Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleVoiceResult = (text: string) => {
    setQuery(text);
    // Auto-search after voice input
    setTimeout(() => {
      if (text.trim()) {
        handleSearch();
      }
    }, 500);
  };

  const renderSearchBar = () => (
    <View style={styles.header}>
      {/* Back Button */}
      <TouchableOpacity
        style={[
          styles.iconContainer,
          {
            backgroundColor: colors.modal.blur,
            borderTopWidth: 1,
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderColor: colors.modal.content,
          },
        ]}
        onPress={onBack}>
        <Icon name="chevron-back" size={24} color={colors.text.primary} />
      </TouchableOpacity>
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          padding: spacing.xs,
        }}>
        <MaybeBlurView
          style={styles.blurView}
          blurType="dark"
          blurAmount={10}
          dialog
          pointerEvents="none"
        />
        <View style={styles.searchContainer}>
          <Icon
            name="search"
            size={20}
            color={colors.text.tertiary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Describe what you're looking for..."
            numberOfLines={1}
            placeholderTextColor={colors.text.tertiary}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />

          <View style={styles.iconContainer}>
            <MicButton
              onPartialText={text => {
                if (text) setQuery(text);
              }}
              onFinalText={text => {
                setQuery(text);
                if (text.trim()) {
                  handleSearch();
                }
              }}
              color={colors.text.primary}
            />
          </View>
          {query.length > 0 && (
            <TouchableOpacity
              style={styles.iconContainer}
              onPress={handleSearch}
              activeOpacity={0.7}>
              <Icon
                name="send"
                size={15}
                color={colors.text.primary}
                style={{padding: 3}}
              />
            </TouchableOpacity>
          )}
          {results && (
            <TouchableOpacity
              style={styles.iconContainer}
              onPress={() => {
                setQuery('');
                setResults(null);
              }}
              activeOpacity={0.7}>
              <Icon
                name="close"
                size={18}
                color={colors.text.secondary}
                style={{padding: 2}}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  // Single return with LinearGradient parent container
  return (
    <LinearGradient
      colors={['rgb(18, 0, 53)', 'rgb(38, 0, 36)']}
      style={styles.container}
      useAngle={true}
      angle={120}
      angleCenter={{x: 0.5, y: 0.5}}>
      {renderSearchBar()}
      {renderContent()}
    </LinearGradient>
  );
};
