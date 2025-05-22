import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {ContentItem} from './MovieList';
import {ContentCard} from './ContentCard';
import {colors, spacing, typography} from '../styles/theme';

interface HorizontalListProps {
  title: string;
  data: ContentItem[];
  onItemPress: (item: ContentItem) => void;
  onEndReached?: () => void;
  isLoading?: boolean;
  onRefresh?: () => void;
  onSeeAllPress?: () => void;
}

export const HorizontalList: React.FC<HorizontalListProps> = ({
  title,
  data,
  onItemPress,
  onEndReached,
  isLoading,
  onRefresh,
  onSeeAllPress,
}) => {
  const renderItem = ({item}: {item: ContentItem}) => (
    <ContentCard v2={title === 'V2'} item={item} onPress={onItemPress} />
  );

  if (!data.length && isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {title !== 'V2' ? (
        <View style={styles.headerContainer}>
          <Text style={styles.title}>{title}</Text>
          {data.length > 0 && (
            <TouchableOpacity onPress={onSeeAllPress}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}
      <FlatList
        horizontal
        data={data}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={isLoading || false}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          ) : undefined
        }
        ListFooterComponent={
          isLoading ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
  },
  seeAll: {
    ...typography.body2,
    color: colors.text.accent,
  },
  listContent: {
    paddingHorizontal: spacing.sm,
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLoader: {
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
});
