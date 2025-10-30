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
import {searchByEmotionalTone} from '../services/gemini';
import {searchMovies, searchTVShows} from '../services/tmdb';
import {MovieCard} from '../components/MovieCard';
import {useNavigationState} from '../hooks/useNavigationState';
import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';
import Icon from 'react-native-vector-icons/Ionicons';
import {useResponsive} from '../hooks/useResponsive';
import {RouteProp, useRoute, useNavigation} from '@react-navigation/native';
import {MoviesStackParamList, TVShowsStackParamList} from '../types/navigation';
import {useQuery} from '@tanstack/react-query';
import {GradientSpinner} from '../components/GradientSpinner';
import {ContentItem} from '../components/MovieList';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';

type EmotionalToneResultsRouteProp = RouteProp<
  MoviesStackParamList,
  'EmotionalToneResults'
> | RouteProp<TVShowsStackParamList, 'EmotionalToneResults'>;

type EmotionalToneResultsNavigationProp = NativeStackNavigationProp<
  MoviesStackParamList,
  'EmotionalToneResults'
> | NativeStackNavigationProp<TVShowsStackParamList, 'EmotionalToneResults'>;

export const EmotionalToneResultsScreen: React.FC = () => {
  const route = useRoute<EmotionalToneResultsRouteProp>();
  const {tag, contentType} = route.params;
  const navigation = useNavigation<EmotionalToneResultsNavigationProp>();
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
    queryKey: ['emotional_tone_results', tag, contentType],
    queryFn: async () => {
      console.log(`🎭 Fetching ${contentType} for emotional tone: "${tag}"`);

      // Get AI recommendations for this emotional tone (filtered by type)
      const aiResults = await searchByEmotionalTone(tag, contentType);

      if (!aiResults || aiResults.length === 0) {
        throw new Error('No content found for this emotional tone');
      }

      // Search TMDB for each recommendation
      const contentPromises = aiResults.map(async item => {
        try {
          if (item.type === 'movie') {
            const movieResults = await searchMovies(item.title, 1);
            // Find best match by year if available
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

      console.log(
        `✅ Found ${validContent.length} ${contentType} for "${tag}" (cached for 6 months)`,
      );
      return validContent;
    },
    staleTime: 1000 * 60 * 60 * 24 * 180, // Cache for 6 months
    gcTime: 1000 * 60 * 60 * 24 * 180, // Keep in cache for 6 months
    retry: 1, // Retry once on failure
  });

  const error = queryError ? (queryError as Error).message : null;

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
          <Icon name="alert-circle" size={48} color={colors.text.muted} />
          <Text style={styles.emptyText}>{error}</Text>
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
    ...typography.body1,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
