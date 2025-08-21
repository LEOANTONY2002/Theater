import React, {useCallback, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import {MovieCard} from './MovieCard';
import {ContentItem} from './MovieList';
import {colors, spacing, typography} from '../styles/theme';
import {GridSkeleton} from './LoadingSkeleton';
import {useResponsive} from '../hooks/useResponsive';
import {GradientSpinner} from './GradientSpinner';

type TrendingGridProps = {
  data: ContentItem[];
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onItemPress: (item: ContentItem) => void;
  isLoading?: boolean;
};

export const TrendingGrid: React.FC<TrendingGridProps> = ({
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  onItemPress,
  isLoading = false,
}) => {
  const {isTablet, orientation} = useResponsive();
  const {width} = useWindowDimensions();

  // Spacing definitions
  const horizontalPadding = (spacing?.sm ?? 8) * 2; // matches styles.gridContainer padding
  const cardMargin = 3; // MovieCard baseStyles.container margin
  const perCardGap = cardMargin * 2; // total horizontal margin per card

  // Choose a minimum desired card width; columns are derived from this
  const minCardWidth = isTablet ? 150 : 110;

  // Compute columns to best fill the width
  const columns = useMemo(() => {
    const available = Math.max(0, width - horizontalPadding);
    const perCardTotal = minCardWidth + perCardGap;
    const rawCols = Math.max(1, Math.floor(available / perCardTotal));
    // Prefer at least 3 on phones in portrait for aesthetics
    if (!isTablet && orientation === 'portrait') {
      return Math.max(3, rawCols);
    }
    return rawCols;
  }, [width, horizontalPadding, minCardWidth, perCardGap, isTablet, orientation]);

  // Now compute exact card width so that row width fits perfectly
  const cardWidth = useMemo(() => {
    const available = Math.max(0, width - horizontalPadding - columns * perCardGap);
    return columns > 0 ? available / columns : available;
  }, [width, horizontalPadding, columns, perCardGap]);

  const renderItem = useCallback(
    ({item}: {item: ContentItem}) => (
      <MovieCard item={item} onPress={onItemPress} cardWidth={cardWidth} />
    ),
    [onItemPress, cardWidth],
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <GridSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trending</Text>
      <FlatList
        key={`cols-${columns}`}
        data={data}
        renderItem={renderItem}
        keyExtractor={item => `${item.type}-${item.id}`}
        numColumns={columns}
        contentContainerStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
        onEndReached={
          hasNextPage
            ? () => {
                if (hasNextPage) fetchNextPage();
              }
            : undefined
        }
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? (
            <GradientSpinner
              size={30}
              thickness={3}
              style={{
                marginVertical: 50,
                marginBottom: 200,
                alignItems: 'center',
                alignSelf: 'center',
              }}
              colors={[
                colors.modal.activeBorder,
                colors.modal.activeBorder,
                colors.transparent,
                colors.transparentDim,
              ]}
            />
          ) : null
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={6}
        windowSize={5}
        initialNumToRender={6}
        getItemLayout={undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    paddingBottom: 100,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  gridContainer: {
    padding: spacing.sm,
  },
  itemContainer: {
    flex: 1,
    padding: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xxl,
  },
});
