import React, {useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {searchByThematicGenre} from '../services/gemini';
import {searchMovies, searchTVShows} from '../services/tmdb';
import {MovieCard} from '../components/MovieCard';
import {useNavigationState} from '../hooks/useNavigationState';
import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';
import Icon from 'react-native-vector-icons/Ionicons';
import {useResponsive} from '../hooks/useResponsive';
import {RouteProp, useRoute, useNavigation} from '@react-navigation/native';
import {HomeStackParamList} from '../types/navigation';
import {useQuery} from '@tanstack/react-query';
import {GradientSpinner} from '../components/GradientSpinner';
import {ContentItem} from '../components/MovieList';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';

type ThematicGenreResultsRouteProp = RouteProp<
  HomeStackParamList,
  'ThematicGenreResults'
>;

type ThematicGenreResultsNavigationProp = NativeStackNavigationProp<
  HomeStackParamList,
  'ThematicGenreResults'
>;

export const ThematicGenreResultsScreen: React.FC = () => {
  const route = useRoute<ThematicGenreResultsRouteProp>();
  const {tag, description} = route.params;
  const navigation = useNavigation<ThematicGenreResultsNavigationProp>();
  const {navigateWithLimit} = useNavigationState();
  const {isTablet, orientation} = useResponsive();
  const {width} = useWindowDimensions();

  // Calculate grid layout
  const {horizontalPadding, perCardGap, minCardWidth} = useMemo(
    () => ({
      horizontalPadding: (spacing?.sm ?? 8) * 2,
      perCardGap: 6,
      minCardWidth: isTablet ? 150 : 110,
    }),
    [isTablet],
  );

  const {columns, cardWidth} = useMemo(() => {
    const available = Math.max(0, width - horizontalPadding);
    const perCardTotal = minCardWidth + perCardGap;
    const rawCols = Math.max(1, Math.floor(available / perCardTotal));
    const cols =
      !isTablet && orientation === 'portrait' ? Math.max(3, rawCols) : rawCols;

    const availableWidth = Math.max(
      0,
      width - horizontalPadding - cols * perCardGap,
    );
    const cWidth = cols > 0 ? availableWidth / cols : availableWidth;

    return {
      columns: cols,
      cardWidth: cWidth,
    };
  }, [
    width,
    horizontalPadding,
    minCardWidth,
    perCardGap,
    isTablet,
    orientation,
  ]);

  // Use React Query for caching
  const {
    data: results = [],
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: ['thematic_genre_results', tag],
    queryFn: async () => {
      console.log(`🎬 Fetching content for thematic tag: "${tag}"`);

      // Check Realm cache first
      const {ThematicTagsManager} = await import('../store/thematicTags');
      const cachedContent = await ThematicTagsManager.getContentForTag(tag.toLowerCase(), 'thematic');
      
      if (cachedContent && cachedContent.length > 0) {
        console.log(`✅ Loaded ${cachedContent.length} items from Realm for "${tag}"`);
        return cachedContent;
      }

      // Get AI recommendations for this thematic genre
      const aiResults = await searchByThematicGenre(tag);

      if (!aiResults || aiResults.length === 0) {
        throw new Error('No content found for this theme');
      }

      // Search TMDB for each recommendation
      const contentPromises = aiResults.map(async item => {
        try {
          if (item.type === 'movie') {
            const movieResults = await searchMovies(item.title, 1);
            const bestMatch =
              movieResults.results.find(
                (m: Movie) =>
                  m.release_date && m.release_date.startsWith(item.year),
              ) || movieResults.results[0];
            return bestMatch ? {...bestMatch, type: 'movie' as const} : null;
          } else {
            const tvResults = await searchTVShows(item.title, 1);
            const bestMatch =
              tvResults.results.find(
                (t: TVShow) =>
                  t.first_air_date && t.first_air_date.startsWith(item.year),
              ) || tvResults.results[0];
            return bestMatch ? {...bestMatch, type: 'tv' as const} : null;
          }
        } catch (err) {
          console.error(`Error searching for ${item.title}:`, err);
          return null;
        }
      });

      const foundContent = await Promise.all(contentPromises);
      const validContent = foundContent.filter(
        (item): item is Movie | TVShow => item !== null,
      );

      // Save to Realm for next time
      await ThematicTagsManager.saveContentForTag(tag.toLowerCase(), 'thematic', validContent);

      console.log(
        `✅ Found ${validContent.length} items for "${tag}" (saved to Realm)`,
      );
      return validContent;
    },
    staleTime: 0, // Don't cache - Realm is the source of truth
    gcTime: 1000 * 60 * 5, // Keep in memory for 5 minutes only
    retry: 1, // Retry once on failure
  });

  const error = queryError ? (queryError as Error).message : null;
  
  // Check if it's a quota error
  const isQuotaError = error && (
    error.includes('You exceeded your current quota') ||
    error.includes('RESOURCE_EXHAUSTED') ||
    error.includes('429')
  );

  const handleItemPress = (item: ContentItem) => {
    const params =
      item.type === 'movie' ? {movie: item as Movie} : {show: item as TVShow};
    navigateWithLimit(
      item.type === 'movie' ? 'MovieDetails' : 'TVShowDetails',
      params,
    );
  };

  const renderItem = ({item}: {item: Movie | TVShow}) => {
    const contentItem: ContentItem = {
      ...item,
      type: 'title' in item ? 'movie' : 'tv',
    } as ContentItem;

    return (
      <View style={styles.itemContainer}>
        <MovieCard
          item={contentItem}
          onPress={() => handleItemPress(contentItem)}
        />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.titleIconContainer}>
              <Icon name="arrow-back" size={20} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.title}>{tag}</Text>
          </View>
        </View>

        {/* Loading */}
        <View style={styles.loadingContainer}>
          <GradientSpinner colors={[colors.primary, colors.secondary]} />
          <Text style={styles.loadingText}>Finding content...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.titleIconContainer}>
              <Icon name="arrow-back" size={20} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.title}>{tag}</Text>
          </View>
        </View>

        {/* Error */}
        <View style={styles.emptyContainer}>
          <Icon name="alert-circle" size={48} color={isQuotaError ? colors.accent : colors.text.muted} />
          <Text style={styles.emptyText}>
            {isQuotaError ? 'API Quota Exceeded' : error}
          </Text>
          {isQuotaError && (
            <>
              <Text style={styles.quotaSubtext}>
                Please update your Gemini API key in settings or try again later
              </Text>
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={() => {
                  // Navigate to MySpace tab, then to AISettings
                  (navigation as any).navigate('MySpace', {
                    screen: 'AISettings',
                  });
                }}>
                <Icon name="settings-outline" size={20} color={colors.background.primary} />
                <Text style={styles.settingsButtonText}>AI Settings</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.titleIconContainer}>
            <Icon name="arrow-back" size={20} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>{tag}</Text>
        </View>
      </View>

      {/* Grid */}
      <FlatList
        data={results}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        numColumns={columns}
        key={`grid-${columns}`}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  itemContainer: {},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    overflow: 'hidden',
    position: 'absolute',
    top: 0,
    zIndex: 2,
    borderRadius: borderRadius.round,
    marginHorizontal: 24,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.round,
    backgroundColor: `${colors.background.tertiary}80`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    zIndex: 2,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
    flex: 1,
    textAlign: 'center',
    marginLeft: -50,
  },
  listContent: {
    paddingVertical: 120,
    alignItems: 'center',
  },
  columnWrapper: {
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: spacing.sm,
    color: colors.text.primary,
    ...typography.body2,
  },
  emptyContainer: {
    flex: 1,
    minHeight: 400,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    ...typography.h3,
    color: colors.text.primary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  quotaSubtext: {
    ...typography.body2,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  settingsButtonText: {
    ...typography.body2,
    fontWeight: '600',
    color: colors.background.primary,
  },
});
