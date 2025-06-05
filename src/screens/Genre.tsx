import React, {useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import {useRoute, RouteProp, useNavigation} from '@react-navigation/native';
import {RootStackParamList} from '../types/navigation';
import {useInfiniteQuery} from '@tanstack/react-query';
import {getContentByGenre} from '../services/tmdb';
import {borderRadius, colors, spacing, typography} from '../styles/theme';
import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {MovieCard} from '../components/MovieCard';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {ContentItem} from '../components/MovieList';
import {GridSkeleton} from '../components/LoadingSkeleton';

export const Genre = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Genre'>>();
  const {genreId, genreName, contentType} = route.params;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    refetch,
    isError,
    isFetching,
  } = useInfiniteQuery({
    queryKey: ['genre', genreId, contentType],
    queryFn: async ({pageParam = 1}) => {
      const result = await getContentByGenre(genreId, contentType, pageParam);
      return result;
    },
    getNextPageParam: lastPage =>
      lastPage?.page < lastPage?.total_pages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    enabled: !!genreId && !!contentType,
  });

  useEffect(() => {
    if (isError) {
      console.error('Query error:', error);
    }
  }, [isError, error]);

  const allItems =
    data?.pages.flatMap(page =>
      page.results.map((item: Movie | TVShow) => ({
        ...item,
        type: contentType === 'movie' ? ('movie' as const) : ('tv' as const),
      })),
    ) || [];

  useEffect(() => {
    if (genreId && contentType) {
      refetch();
    }
  }, [genreId, contentType, refetch]);

  const handleItemPress = (item: ContentItem) => {
    if (item.type === 'movie') {
      navigation.navigate('MovieDetails', {movie: item as Movie});
    } else {
      navigation.navigate('TVShowDetails', {show: item as TVShow});
    }
  };

  const renderItem = ({item}: {item: ContentItem}) => (
    <MovieCard
      item={item}
      onPress={() => handleItemPress(item)}
      size="normal"
    />
  );

  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  // Show loading state only during initial load
  // if (isLoading) {
  //   return (
  //     <View style={styles.fullScreenLoader}>
  //       <GridSkeleton />
  //     </View>
  //   );
  // }

  return (
    <View style={styles.container}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{genreName}</Text>
          </View>
        </View>

        <View style={styles.contentContainer}>
          {isLoading ? (
            <GridSkeleton />
          ) : (
            <FlatList
              data={allItems}
              renderItem={renderItem}
              keyExtractor={item => item.id.toString()}
              numColumns={3}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.listContent,
                allItems.length === 0 && styles.emptyListContent,
              ]}
              onEndReached={handleEndReached}
              onEndReachedThreshold={0.5}
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
                !isLoading && !isFetching ? (
                  <View style={styles.emptyContainer}>
                    <Icon
                      name="alert-circle-outline"
                      size={48}
                      color={colors.text.muted}
                    />
                    <Text style={styles.emptyText}>
                      No {contentType === 'movie' ? 'movies' : 'TV shows'} found
                      in this genre
                    </Text>
                    <TouchableOpacity
                      style={styles.retryButton}
                      onPress={() => refetch()}>
                      <Text style={styles.retryText}>Try Again</Text>
                    </TouchableOpacity>
                  </View>
                ) : null
              }
            />
          )}
        </View>
      </View>
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
    alignSelf: 'center',
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
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 0, // Override the padding when empty
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
    backgroundColor: colors.background.primary,
    paddingVertical: spacing.xxl,
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
