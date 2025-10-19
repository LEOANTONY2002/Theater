import React, {useCallback, memo, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Platform,
} from 'react-native';
import {ContentItem} from './MovieList';
import {ContentCard} from './ContentCard';
import {colors, spacing, typography} from '../styles/theme';
import {HeadingSkeleton, HorizontalListSkeleton} from './LoadingSkeleton';
import Ionicon from 'react-native-vector-icons/Ionicons';
import {useScrollOptimization} from '../hooks/useScrollOptimization';
import {useResponsive} from '../hooks/useResponsive';

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
  ai?: boolean;
  prefix?: string;
}

// Ensure ContentCard is memoized
const MemoContentCard = memo(ContentCard);

export const HorizontalList: React.FC<HorizontalListProps> = memo(
  ({
    title,
    prefix,
    data,
    onItemPress,
    onEndReached,
    isLoading,
    onSeeAllPress,
    isSeeAll = true,
    isTop10 = false,
    isFilter = false,
    isHeadingSkeleton = true,
    ai = false,
  }) => {
    const {isTablet} = useResponsive();
    // Memoize styles to avoid recreation on each render
    const styles = useMemo(
      () =>
        StyleSheet.create({
          container: {
            marginBottom: spacing.md,
            zIndex: 1,
          },
          headerContainer: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: isFilter ? 0 : spacing.md,
          },
          headerTitle: {
            flexDirection: 'row',
            alignItems: 'center',
            flexWrap: 'wrap',
            marginBottom: isFilter ? 0 : spacing.sm,
          },
          prefix: {
            ...typography.body1,
            color: colors.text.muted,
            marginRight: spacing.sm,
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
            fontFamily: 'Inter_28pt-ExtraBold',
          },
          listWrapper: {
            flex: 1,
          },
        }),
      [isFilter],
    );

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

    // Compute fixed item widths for getItemLayout (must match ContentCard styles)
    const itemCardWidth = useMemo(() => {
      const isV2 = title === 'V2';
      if (isV2) {
        return isTablet ? 270 : 190;
      }
      return isTablet ? 170 : 130;
    }, [title, isTablet]);
    const itemTotalWidth = itemCardWidth + spacing.xs * 2; // include horizontal margins
    const paddingLeft = isFilter ? 30 : spacing.md;
    const getItemLayout = useCallback(
      (_: any, index: number) => ({
        length: itemTotalWidth,
        offset: paddingLeft + index * itemTotalWidth,
        index,
      }),
      [itemTotalWidth, paddingLeft],
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
          <HorizontalListSkeleton ai={ai} />
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
            <View style={styles.headerTitle}>
              {prefix && (
                <Text style={styles.prefix} numberOfLines={1}>
                  {prefix}
                </Text>
              )}
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
            </View>
            {data?.length > 0 && isSeeAll ? (
              <TouchableOpacity onPress={onSeeAllPress}>
                <Ionicon
                  name="chevron-forward-outline"
                  size={20}
                  style={{marginTop: -spacing.xs}}
                  color={colors.text.muted}
                />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        <View style={styles.listWrapper}>
          <FlatList
            horizontal
            data={data}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.5}
            style={isTop10 ? {marginLeft: -spacing.md} : {}}
            initialNumToRender={6}
            windowSize={5}
            maxToRenderPerBatch={6}
            updateCellsBatchingPeriod={50}
            removeClippedSubviews={false}
            getItemLayout={getItemLayout}
            decelerationRate={Platform.OS === 'ios' ? 'fast' : 0.98}
            ListFooterComponent={
              isLoading ? (
                <HorizontalListSkeleton ai={ai} />
              ) : (
                <View style={{width: 50}} />
              )
            }
          />
        </View>
      </View>
    );
  },
);
