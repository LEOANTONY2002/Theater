import React from 'react';
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
  onRemoveFromWatchlist?: (id: number) => void;
};

export const MovieList: React.FC<MovieListProps> = ({
  data,
  isLoading,
  isRefreshing = false,
  onRefresh,
  onLoadMore,
  onMoviePress,
  onRemoveFromWatchlist,
}) => {
  const renderFooter = () => {
    if (!isLoading) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  };

  const renderItem = ({item}: {item: ContentItem}) => (
    <View style={styles.itemContainer}>
      <MovieCard item={item} onPress={onMoviePress} />
      {onRemoveFromWatchlist && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => onRemoveFromWatchlist(item.id)}>
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
      data={data}
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
    />
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.sm,
  },
  footer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'white',
    opacity: 0.9,
    borderRadius: 12,
  },
});
