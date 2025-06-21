import React, {useMemo, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Image,
  ScrollView,
} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList, HomeStackParamList} from '../types/navigation';
import {ContentItem} from '../components/MovieList';
import {GradientBackground} from '../components/GradientBackground';
import {colors, spacing, typography} from '../styles/theme';
import {
  usePersonMovieCredits,
  usePersonTVCredits,
  usePersonDetails,
} from '../hooks/usePersonCredits';
import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';
import {MovieCard} from '../components/MovieCard';
import {getImageUrl} from '../services/tmdb';
import {LinearGradient} from 'react-native-linear-gradient';
import {useNavigationState} from '../hooks/useNavigationState';

type PersonCreditsScreenNavigationProp =
  NativeStackNavigationProp<HomeStackParamList>;
type PersonCreditsScreenRouteProp = RouteProp<
  HomeStackParamList,
  'PersonCredits'
>;

export const PersonCreditsScreen = () => {
  const navigation = useNavigation<PersonCreditsScreenNavigationProp>();
  const route = useRoute<PersonCreditsScreenRouteProp>();
  const {personId, personName} = route.params;
  const {navigateWithLimit} = useNavigationState();

  // Get person details
  const {data: personDetails, isLoading: isLoadingDetails} =
    usePersonDetails(personId);

  // Use both hooks to get all credits
  const movieCredits = usePersonMovieCredits(personId);
  const tvCredits = usePersonTVCredits(personId);

  const isLoading =
    isLoadingDetails ||
    movieCredits.isLoading ||
    tvCredits.isLoading ||
    movieCredits.isRefetching ||
    tvCredits.isRefetching ||
    movieCredits.isFetchingNextPage ||
    tvCredits.isFetchingNextPage;

  // Transform and combine data from both sources
  const transformedData = useMemo(() => {
    const movies =
      movieCredits.data?.pages.flatMap(page =>
        page.results.map((item: Movie) => ({
          ...item,
          type: 'movie' as const,
          release_date: item.release_date || '',
        })),
      ) || [];

    const tvShows =
      tvCredits.data?.pages.flatMap(page =>
        page.results.map((item: TVShow) => ({
          ...item,
          type: 'tv' as const,
          release_date: item.first_air_date || '',
        })),
      ) || [];

    // Combine and sort by release date
    return [...movies, ...tvShows].sort((a, b) => {
      if (!a.release_date) return 1;
      if (!b.release_date) return -1;
      return (
        new Date(b.release_date).getTime() - new Date(a.release_date).getTime()
      );
    });
  }, [movieCredits.data, tvCredits.data]);

  // Define internal item press handler
  const handleItemPress = useCallback(
    (item: ContentItem) => {
      if (item.type === 'movie') {
        navigateWithLimit('MovieDetails', {movie: item as Movie});
      } else {
        navigateWithLimit('TVShowDetails', {show: item as TVShow});
      }
    },
    [navigateWithLimit],
  );

  const renderItem = ({item}: {item: ContentItem}) => (
    <View style={styles.cardContainer}>
      <MovieCard item={item} onPress={handleItemPress} />
    </View>
  );

  const handleEndReached = () => {
    if (movieCredits.hasNextPage && !movieCredits.isFetchingNextPage) {
      movieCredits.fetchNextPage();
    }
    if (tvCredits.hasNextPage && !tvCredits.isFetchingNextPage) {
      tvCredits.fetchNextPage();
    }
  };

  const handleRefresh = () => {
    movieCredits.refetch();
    tvCredits.refetch();
  };

  return (
    <View style={styles.container}>
      <View style={styles.profileContainer}>
        <Image
          source={{
            uri: getImageUrl(personDetails?.profile_path || '', 'original'),
          }}
          style={styles.profileImage}
        />
        <LinearGradient
          colors={['transparent', colors.background.primary]}
          style={styles.profileGradient}
        />
        <LinearGradient
          colors={['transparent', colors.background.primary]}
          style={styles.profileGradient}
        />
        <LinearGradient
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}
          colors={[colors.background.primary, 'transparent']}
          style={styles.profileGradientHorizontal}
        />
        <LinearGradient
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}
          colors={[colors.background.primary, 'transparent']}
          style={styles.profileGradientHorizontal}
        />
      </View>

      <FlatList
        data={transformedData}
        renderItem={renderItem}
        keyExtractor={item => `${item.type}-${item.id}`}
        numColumns={3}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{personName}</Text>
              <Text style={styles.subtitle}>Movies & TV Shows</Text>
            </View>
          </View>
        }
        ListFooterComponent={
          <View style={styles.footerLoader}>
            {(movieCredits.isFetchingNextPage ||
              tvCredits.isFetchingNextPage) && (
              <View style={styles.loadingIndicatorContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading more...</Text>
              </View>
            )}
            <View style={styles.footerSpace} />
          </View>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No items found</Text>
            </View>
          ) : null
        }
      />

      {(movieCredits.isLoading || tvCredits.isLoading) && (
        <View style={styles.fullScreenLoader}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingTitle}>Loading</Text>
          <Text style={styles.loadingSubtitle}>Movies & TV Shows</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: 120,
    paddingBottom: spacing.xxl,
    zIndex: 1,
  },
  titleContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  title: {
    ...typography.h1,
    color: colors.text.primary,
  },
  subtitle: {
    ...typography.body1,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  listContent: {
    paddingBottom: 120,
  },
  cardContainer: {
    flex: 1 / 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  footerLoader: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  footerSpace: {
    height: 100,
  },
  loadingIndicatorContainer: {
    height: 50,
    alignItems: 'center',
    width: '100%',
  },
  loadingText: {
    marginTop: spacing.sm,
    color: colors.text.primary,
    ...typography.body2,
  },
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...typography.body1,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  fullScreenLoader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 10, 26, 0.85)',
  },
  loadingTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  loadingSubtitle: {
    ...typography.body2,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  profileContainer: {
    height: 400,
    width: '70%',
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 0,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  profileGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: '100%',
  },
  profileGradientHorizontal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
});
