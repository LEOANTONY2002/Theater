import React, {useState, useEffect, useCallback, memo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {FlashList} from '@shopify/flash-list';
import {ContentItem} from './MovieList';
import {ContentCard} from './ContentCard';
import {colors, spacing, typography} from '../styles/theme';
import {HeadingSkeleton, HorizontalListSkeleton} from './LoadingSkeleton';
import Ionicon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {useScrollOptimization} from '../hooks/useScrollOptimization';

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

export const HorizontalList: React.FC<HorizontalListProps> = memo(
  ({
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
    const {
      handleScroll,
      handleScrollBeginDrag,
      handleScrollEndDrag,
      handleMomentumScrollEnd,
    } = useScrollOptimization();

    // Simple debouncing
    useEffect(() => {
      if (data && data.length > 0) {
        const timer = setTimeout(
          () => {
            setDebouncedData(data);
          },
          title === 'V2' ? 0 : 50,
        );
        return () => clearTimeout(timer);
      } else {
        setDebouncedData([]);
      }
    }, [data, title]);

    const renderItem = useCallback(
      ({item, index}: {item: ContentItem; index: number}) => (
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
      ),
      [isTop10, title, onItemPress],
    );

    const keyExtractor = useCallback(
      (item: ContentItem) => item?.id?.toString(),
      [],
    );

    if (!debouncedData?.length) {
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

        <View style={styles.listWrapper}>
          <FlashList
            horizontal
            data={debouncedData}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.5}
            style={isTop10 ? {marginLeft: -spacing.md} : {}}
            ListFooterComponent={isLoading ? <HorizontalListSkeleton /> : null}
            estimatedItemSize={isTop10 ? 200 : 140}
            onScroll={handleScroll}
            onScrollBeginDrag={handleScrollBeginDrag}
            onScrollEndDrag={handleScrollEndDrag}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            // Minimal FlashList settings for horizontal scrolling
            removeClippedSubviews={true}
            scrollEventThrottle={0}
            decelerationRate="normal"
            extraData={null}
          />
        </View>
      </View>
    );
  },
);

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
  listWrapper: {
    flex: 1,
  },
});
