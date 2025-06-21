import React, {useState, useEffect, useCallback, memo} from 'react';
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
    const [isDebouncing, setIsDebouncing] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);

    // Ultra-aggressive debouncing to prevent FPS drops
    useEffect(() => {
      if (data && data.length > 0) {
        setIsDebouncing(true);
        const timer = setTimeout(
          () => {
            setDebouncedData(data);
            setIsDebouncing(false);
            // Delay actual rendering to prevent blocking, but not for V2 (recent searches)
            if (title === 'V2') {
              setShouldRender(true);
            } else {
              setTimeout(() => setShouldRender(true), 100);
            }
          },
          title === 'V2' ? 50 : 200,
        ); // Shorter delay for V2 (recent searches)
        return () => clearTimeout(timer);
      } else {
        setDebouncedData([]);
        setIsDebouncing(false);
        setShouldRender(false);
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

    const getItemLayout = useCallback(
      (data: any, index: number) => ({
        length: isTop10 ? 200 : 140,
        offset: (isTop10 ? 200 : 140) * index,
        index,
      }),
      [isTop10],
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

        {shouldRender && (
          <FlatList
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
            // Ultra-aggressive performance optimizations
            removeClippedSubviews={true}
            maxToRenderPerBatch={2}
            windowSize={1}
            initialNumToRender={2}
            getItemLayout={getItemLayout}
            updateCellsBatchingPeriod={100}
            disableVirtualization={false}
            // Disable scroll events to prevent FPS drops
            scrollEventThrottle={0}
            decelerationRate="fast"
            // Memory optimizations
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
              autoscrollToTopThreshold: 10,
            }}
            // Disable extra features that cause FPS drops
            extraData={null}
            onScrollBeginDrag={() => {}}
            onScrollEndDrag={() => {}}
            onMomentumScrollEnd={() => {}}
          />
        )}
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
});
