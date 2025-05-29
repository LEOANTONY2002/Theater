import React, {useState, useEffect, useMemo, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Image,
  TouchableOpacity,
} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
  RootStackParamList,
  MovieCategoryType,
  TVShowCategoryType,
} from '../types/navigation';
import {ContentItem} from '../components/MovieList';
import {ContentCard} from '../components/ContentCard';
import {GradientBackground} from '../components/GradientBackground';
import {
  colors,
  spacing,
  typography,
  shadows,
  borderRadius,
} from '../styles/theme';
import {useMoviesList} from '../hooks/useMovies';
import {useTVShowsList} from '../hooks/useTVShows';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';
import {MovieCard} from '../components/MovieCard';

type CategoryScreenNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;

type CategoryScreenRouteProp = RouteProp<RootStackParamList, 'Category'>;

export const CategoryScreen = () => {
  const navigation = useNavigation<CategoryScreenNavigationProp>();
  const route = useRoute<CategoryScreenRouteProp>();
  const {title, categoryType, contentType} = route.params;

  // Define internal item press handler
  const handleItemPress = useCallback(
    (item: ContentItem) => {
      if (contentType === 'movie') {
        navigation.navigate('MovieDetails', {movie: item as Movie});
      } else if (contentType === 'tv') {
        navigation.navigate('TVShowDetails', {show: item as TVShow});
      }
    },
    [navigation, contentType],
  );

  // Use the hooks based on content type
  const movieCategoryType =
    contentType === 'movie' ? (categoryType as MovieCategoryType) : 'popular';
  const tvCategoryType =
    contentType === 'tv' ? (categoryType as TVShowCategoryType) : 'popular';

  const moviesList = useMoviesList(movieCategoryType);
  const tvShowsList = useTVShowsList(tvCategoryType);

  // Select the correct data source based on content type
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isLoading: isInitialLoading,
    isRefetching,
  } = contentType === 'movie' ? moviesList : tvShowsList;

  const isLoading = isInitialLoading || isRefetching || isFetchingNextPage;

  // Transform data based on content type
  const transformedData = useMemo(() => {
    return (data?.pages.flatMap(page =>
      page.results.map(item => ({
        ...item,
        type: contentType,
      })),
    ) || []) as ContentItem[];
  }, [data, contentType]);

  const renderItem = ({item, index}: {item: ContentItem; index: number}) => (
    <View style={styles.cardContainer}>
      <MovieCard item={item} onPress={handleItemPress} />
    </View>
  );

  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return (
    <GradientBackground variant="cinematic">
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{title}</Text>
          </View>
        </View>

        <View style={styles.contentContainer}>
          <FlatList
            data={transformedData}
            renderItem={renderItem}
            keyExtractor={item => item.id.toString()}
            numColumns={3}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching || false}
                onRefresh={refetch}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            ListFooterComponent={
              <View style={styles.footerLoader}>
                {isFetchingNextPage && (
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
                  <Icon
                    name="alert-circle"
                    size={48}
                    color={colors.text.muted}
                  />
                  <Text style={styles.emptyText}>No items found</Text>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => refetch()}>
                    <Text style={styles.retryText}>Try Again</Text>
                  </TouchableOpacity>
                </View>
              ) : null
            }
          />
        </View>

        {isInitialLoading && (
          <View style={styles.fullScreenLoader}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingTitle}>Loading</Text>
            <Text style={styles.loadingSubtitle}>{title}</Text>
          </View>
        )}
      </View>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleIconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.round,
    backgroundColor: colors.background.tertiary + '80',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
  },
  contentContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 120,
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
  retryButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary + '22',
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.primary + '44',
  },
  retryText: {
    color: colors.primary,
    ...typography.button,
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
});
