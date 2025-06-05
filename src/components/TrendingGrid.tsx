import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import {MovieCard} from './MovieCard';
import {ContentItem} from './MovieList';
import {colors, spacing, typography} from '../styles/theme';
import {GridSkeleton} from './LoadingSkeleton';

type TrendingGridProps = {
  data: ContentItem[];
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onItemPress: (item: ContentItem) => void;
  isLoading?: boolean;
};

export const TrendingGrid: React.FC<TrendingGridProps> = ({
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  onItemPress,
  isLoading = false,
}) => {
  const renderItem = ({item}: {item: ContentItem}) => (
    <MovieCard item={item} onPress={onItemPress} />
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <GridSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trending</Text>
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={item => `${item.type}-${item.id}`}
        numColumns={3}
        contentContainerStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
        onEndReached={
          hasNextPage
            ? () => {
                if (hasNextPage) fetchNextPage();
              }
            : undefined
        }
        onEndReachedThreshold={0.5}
        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator /> : null}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    paddingBottom: 100,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  gridContainer: {
    padding: spacing.sm,
  },
  itemContainer: {
    flex: 1,
    padding: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xxl,
  },
});
