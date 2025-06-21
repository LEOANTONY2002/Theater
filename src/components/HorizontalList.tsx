import React, {useState, useEffect} from 'react';
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
import LinearGradient from 'react-native-linear-gradient';

interface HorizontalListProps {
  title: string;
  data: ContentItem[];
  onItemPress: (item: ContentItem) => void;
  onEndReached?: () => void;
  isLoading?: boolean;
  onSeeAllPress?: () => void;
  isSeeAll?: boolean;
  isTop10?: boolean;
}

export const HorizontalList: React.FC<HorizontalListProps> = ({
  title,
  data,
  onItemPress,
  onEndReached,
  isLoading,
  onSeeAllPress,
  isSeeAll = true,
  isTop10 = false,
}) => {
  const [debouncedData, setDebouncedData] = useState<ContentItem[]>([]);
  const [isDebouncing, setIsDebouncing] = useState(false);

  // Debounce data changes to prevent rapid re-renders
  useEffect(() => {
    if (data && data.length > 0) {
      setIsDebouncing(true);
      const timer = setTimeout(() => {
        setDebouncedData(data);
        setIsDebouncing(false);
      }, 100); // 100ms debounce
      return () => clearTimeout(timer);
    } else {
      setDebouncedData([]);
      setIsDebouncing(false);
    }
  }, [data]);

  const renderItem = ({item, index}: {item: ContentItem; index: number}) => (
    <View
      style={
        isTop10
          ? {...styles.itemContainer, marginLeft: spacing.xxl}
          : {...styles.itemContainer}
      }>
      <ContentCard v2={title === 'V2'} item={item} onPress={onItemPress} />
      {isTop10 && (
        <View style={styles.top10}>
          <Text style={styles.top10Number}>{index + 1}</Text>
        </View>
      )}
    </View>
  );

  if (!debouncedData?.length && !isDebouncing) {
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
          {debouncedData?.length > 0 && isSeeAll ? (
            <TouchableOpacity
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
              onPress={onSeeAllPress}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              <Ionicon
                name="chevron-forward-outline"
                size={20}
                style={{marginTop: -spacing.xs}}
                color={colors.text.muted}
              />
            </TouchableOpacity>
          ) : (
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          )}
        </View>
      ) : null}
      <FlatList
        horizontal
        data={debouncedData}
        renderItem={renderItem}
        keyExtractor={item => item?.id?.toString()}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        style={isTop10 ? {marginLeft: -spacing.md} : {}}
        ListFooterComponent={isLoading ? <HorizontalListSkeleton /> : null}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={3}
        initialNumToRender={5}
        getItemLayout={undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
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
    flex: 1,
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
  itemContainer: {
    marginVertical: spacing.sm,
    marginHorizontal: spacing.xs,
    position: 'relative',
    height: '100%',
  },
  top10: {
    position: 'absolute',
    top: 0,
    bottom: -100,
    left: -spacing.xl,
    width: spacing.xl * 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  top10Number: {
    fontSize: 100,
    opacity: 0.8,
    fontWeight: 'bold',
    color: 'white',
    width: 100,
    letterSpacing: -10,
    textAlign: 'center',
  },
});
