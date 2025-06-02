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
        style={isTop10 ? {marginLeft: -spacing.md} : {}}
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
    // textShadowColor: 'rgba(0, 0, 0, 0.75)',
    // textShadowOffset: {width: 2, height: 2},
    // textShadowRadius: 5,
    fontWeight: 'bold',
    // color: 'transparent',
    color: 'white',
    width: 100,
    letterSpacing: -10,
    textAlign: 'center',
  },
});
