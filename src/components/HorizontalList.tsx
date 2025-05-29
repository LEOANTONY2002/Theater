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
import Ionicon from 'react-native-vector-icons/Ionicons';

interface HorizontalListProps {
  title: string;
  data: ContentItem[];
  onItemPress: (item: ContentItem) => void;
  onEndReached?: () => void;
  isLoading?: boolean;
  onSeeAllPress?: () => void;
  isSeeAll?: boolean;
}

export const HorizontalList: React.FC<HorizontalListProps> = ({
  title,
  data,
  onItemPress,
  onEndReached,
  isLoading,
  onSeeAllPress,
  isSeeAll = true,
}) => {
  const renderItem = ({item}: {item: ContentItem}) => (
    <View style={{marginVertical: spacing.sm, marginHorizontal: spacing.xs}}>
      <ContentCard v2={title === 'V2'} item={item} onPress={onItemPress} />
    </View>
  );

  if (!data.length) {
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
          {data.length > 0 && isSeeAll ? (
            <TouchableOpacity
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
              onPress={onSeeAllPress}>
              <Text style={styles.title}>{title}</Text>
              <Ionicon
                name="chevron-forward-outline"
                size={20}
                style={{marginTop: -spacing.xs}}
                color={colors.text.muted}
              />
            </TouchableOpacity>
          ) : (
            <Text style={styles.title}>{title}</Text>
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
    marginBottom: spacing.sm,
  },
  seeAll: {
    ...typography.body2,
    color: colors.text.muted,
  },
  listContent: {
    paddingHorizontal: spacing.md,
  },
  footerLoader: {
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
});
