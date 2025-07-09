import React, {useState, useEffect} from 'react';
import {
  View,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';
import {MovieCard} from './MovieCard';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors, spacing} from '../styles/theme';

export type ContentItem = (Movie & {type: 'movie'}) | (TVShow & {type: 'tv'});

type MovieListProps = {
  data: ContentItem[];
  isLoading?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onLoadMore?: (() => void) | undefined;
  onMoviePress: (item: ContentItem) => void;
  onRemove?: (id: number) => void;
  emptyText?: string;
  emptySubtext?: string;
};

export const MovieList: React.FC<MovieListProps> = ({
  data,
  isLoading,
  isRefreshing = false,
  onRefresh,
  onLoadMore,
  onMoviePress,
  onRemove,
  emptyText,
  emptySubtext,
}) => {
  const [debouncedData, setDebouncedData] = useState<ContentItem[]>([]);

  // Debounce data changes to prevent rapid re-renders
  useEffect(() => {
    if (data && data.length > 0) {
      const timer = setTimeout(() => {
        setDebouncedData(data);
      }, 100); // 100ms debounce
      return () => clearTimeout(timer);
    } else {
      setDebouncedData([]);
    }
  }, [data]);

  const renderFooter = () => {
    if (!isLoading) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="large" color="rgba(0, 0, 0, 0.5)" />
      </View>
    );
  };

  const renderItem = ({item}: {item: ContentItem}) => (
    <View style={styles.itemContainer}>
      <MovieCard item={item} onPress={onMoviePress} />
      {onRemove && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => onRemove(item.id)}>
          <Icon
            name="close-circle"
            size={24}
            color={colors.background.primary}
          />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <FlatList
      data={debouncedData}
      renderItem={renderItem}
      keyExtractor={item => `${item.type}-${item.id}`}
      numColumns={3}
      contentContainerStyle={styles.container}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#fff"
          />
        ) : undefined
      }
      removeClippedSubviews={true}
      maxToRenderPerBatch={6}
      windowSize={5}
      initialNumToRender={6}
      getItemLayout={undefined}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    // padding: spacing.md,
    paddingTop: 120,
  },
  itemContainer: {
    flex: 1,
    position: 'relative',
  },
  footer: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: colors.background.primary,
    opacity: 0.8,
    borderRadius: 12,
  },
});
