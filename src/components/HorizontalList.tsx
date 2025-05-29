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
import {HeadingSkeleton, HorizontalListSkeleton} from './LoadingSkeleton';

interface HorizontalListProps {
  title: string;
  data: ContentItem[];
  onItemPress: (item: ContentItem) => void;
  onEndReached?: () => void;
  isLoading?: boolean;
  onRefresh?: () => void;
  onSeeAllPress?: () => void;
  isSeeAll?: boolean;
}

export const HorizontalList: React.FC<HorizontalListProps> = ({
  title,
  data,
  onItemPress,
  onEndReached,
  isLoading,
  onRefresh,
  onSeeAllPress,
  isSeeAll = true,
}) => {
  const renderItem = ({item}: {item: ContentItem}) => (
    <ContentCard v2={title === 'V2'} item={item} onPress={onItemPress} />
  );

  if (!data.length || isLoading) {
    return (
      <View>
        <HeadingSkeleton />
        <HorizontalListSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {title !== 'V2' ? (
        <View style={styles.headerContainer}>
          <Text style={styles.title}>{title}</Text>
          {data.length > 0 && isSeeAll && (
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
        ListFooterComponent={isLoading ? <HorizontalListSkeleton /> : null}
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
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
  },
  seeAll: {
    ...typography.body2,
    color: colors.text.muted,
  },
  listContent: {
    paddingHorizontal: spacing.sm,
  },
  footerLoader: {
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
});
