import React, {useCallback, memo} from 'react';
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
  isFilter?: boolean;
  isHeadingSkeleton?: boolean;
}

// Ensure ContentCard is memoized
const MemoContentCard = memo(ContentCard);

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
    isFilter = false,
    isHeadingSkeleton = true,
  }) => {
    // Remove data limit for infinite scroll
    // const limitedData = data.slice(0, 12);
    const styles = StyleSheet.create({
      container: {
        marginBottom: spacing.md,
      },
      headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: isFilter ? 0 : spacing.md,
      },
      title: {
        ...typography.h3,
        color: colors.text.primary,
        marginBottom: isFilter ? 0 : spacing.sm,
        flex: 1,
      },
      seeAll: {
        ...typography.body2,
        color: colors.text.muted,
      },
      listContent: {
        paddingHorizontal: isFilter ? 0 : spacing.md,
        paddingLeft: isFilter ? 30 : spacing.md,
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
    const {
      handleScroll,
      handleScrollBeginDrag,
      handleScrollEndDrag,
      handleMomentumScrollEnd,
    } = useScrollOptimization();

    // Memoize renderItem
    const renderItem = useCallback(
      ({item, index}: {item: ContentItem; index: number}) => (
        <View
          style={
            isTop10
              ? {...styles.itemContainer, marginLeft: spacing.xxl}
              : {...styles.itemContainer}
          }>
          <MemoContentCard
            v2={title === 'V2'}
            item={item}
            onPress={onItemPress}
          />
          {isTop10 && (
            <View style={styles.top10}>
              <Text style={styles.top10Number}>{index + 1}</Text>
            </View>
          )}
        </View>
      ),
      [
        isTop10,
        title,
        onItemPress,
        styles.itemContainer,
        styles.top10,
        styles.top10Number,
      ],
    );

    const keyExtractor = useCallback(
      (item: ContentItem) => item?.id?.toString(),
      [],
    );

    if (!data?.length && isLoading) {
      return (
        <View
          style={
            !isHeadingSkeleton && {
              marginTop: spacing.md,
              marginLeft: spacing.md,
            }
          }>
          {isHeadingSkeleton && <HeadingSkeleton />}
          <HorizontalListSkeleton />
        </View>
      );
    }

    if (!data?.length) {
      return null;
    }

    return (
      <View style={styles.container}>
        {title !== 'V2' ? (
          <View style={styles.headerContainer}>
            {data?.length > 0 && isSeeAll ? (
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
            data={data}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.5}
            style={isTop10 ? {marginLeft: -spacing.md} : {}}
            ListFooterComponent={isLoading ? <HorizontalListSkeleton /> : null}
            estimatedItemSize={180}
            removeClippedSubviews={true}
            scrollEventThrottle={16}
            decelerationRate="normal"
            extraData={null}
          />
        </View>
      </View>
    );
  },
);
