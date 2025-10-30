import React, {useCallback, useState, useRef, useEffect, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import LinearGradient from 'react-native-linear-gradient';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {getImageUrl} from '../services/tmdb';
import {useNavigation} from '@react-navigation/native';
import {ContentItem} from './MovieList';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useResponsive} from '../hooks/useResponsive';
import {useQuery} from '@tanstack/react-query';
import {getGenres} from '../services/tmdb';
import {
  useIsItemInAnyWatchlist,
  useWatchlistContainingItem,
  useRemoveFromWatchlist,
} from '../hooks/useWatchlists';
import {WatchlistModal} from './WatchlistModal';
import Icon from 'react-native-vector-icons/Ionicons';

interface PersonalizedBannerProps {
  items: ContentItem[];
}

export const PersonalizedBanner: React.FC<PersonalizedBannerProps> = ({
  items,
}) => {
  const navigation = useNavigation();
  const {isTablet, orientation, width} = useResponsive();
  const [showWatchlistModal, setShowWatchlistModal] = useState(false);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<any>(null);
  const [currentItemId, setCurrentItemId] = useState(items[0]?.id);

  // Fetch genres for both movie and TV
  const {data: movieGenres = []} = useQuery({
    queryKey: ['genres', 'movie'],
    queryFn: () => getGenres('movie'),
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });

  const {data: tvGenres = []} = useQuery({
    queryKey: ['genres', 'tv'],
    queryFn: () => getGenres('tv'),
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });

  // Watchlist hooks
  const removeFromWatchlistMutation = useRemoveFromWatchlist();

  // Current item based on current scroll position
  const currentItem = items.find(item => item.id === currentItemId) || items[0];
  const {data: isInAnyWatchlist = false} = useIsItemInAnyWatchlist(
    currentItem?.id,
  );
  const {data: watchlistContainingItem} = useWatchlistContainingItem(
    currentItem?.id,
  );

  // Recalculate dimensions when orientation or width changes
  const CARD_WIDTH = useMemo(() => {
    return isTablet && orientation === 'portrait'
      ? width * 0.75
      : isTablet && orientation === 'landscape'
      ? width * 0.65
      : width * 0.8;
  }, [isTablet, orientation, width]);

  // Preload all banner images on mount to avoid blank screens
  useEffect(() => {
    if (!items || items.length === 0) return;
    // Preload first 5 images immediately
    items.slice(0, 5).forEach((item: any) => {
      const backdropPath = item.backdrop_path;
      const posterPath = item.poster_path;
      const imagePath = backdropPath || posterPath;
      if (imagePath) {
        const uri = getImageUrl(imagePath, 'original');
        FastImage.preload([
          {
            uri,
            priority: FastImage.priority.high,
            cache: FastImage.cacheControl.immutable,
          },
        ]);
      }
    });
    // Preload remaining images with slight delay
    if (items.length > 5) {
      setTimeout(() => {
        items.slice(5).forEach((item: any) => {
          const backdropPath = item.backdrop_path;
          const posterPath = item.poster_path;
          const imagePath = backdropPath || posterPath;
          if (imagePath) {
            const uri = getImageUrl(imagePath, 'original');
            FastImage.preload([
              {
                uri,
                priority: FastImage.priority.normal,
                cache: FastImage.cacheControl.immutable,
              },
            ]);
          }
        });
      }, 500);
    }
  }, [items]);

  const handlePress = useCallback(
    (item: ContentItem) => {
      const itemType =
        (item as any)._filterType ||
        ((item as any).first_air_date ? 'tv' : 'movie');

      if (itemType === 'tv') {
        (navigation as any).navigate('TVShowDetails', {show: item});
      } else {
        (navigation as any).navigate('MovieDetails', {movie: item});
      }
    },
    [navigation],
  );

  const handleWatchlistPress = useCallback(async () => {
    if (!currentItem) return;

    if (isInAnyWatchlist && watchlistContainingItem) {
      // If item is already in a watchlist, remove it
      try {
        await removeFromWatchlistMutation.mutateAsync({
          watchlistId: watchlistContainingItem,
          itemId: currentItem.id,
        });
      } catch (error) {
        console.error('Error removing from watchlist:', error);
      }
    } else {
      // If item is not in any watchlist, show modal to add it
      setShowWatchlistModal(true);
    }
  }, [
    currentItem,
    isInAnyWatchlist,
    watchlistContainingItem,
    removeFromWatchlistMutation,
  ]);

  // Get genres for current item
  const getItemGenres = useCallback(
    (item: any) => {
      const itemType =
        item._filterType || (item.first_air_date ? 'tv' : 'movie');
      const genreList = itemType === 'tv' ? tvGenres : movieGenres;
      const genreIds = item.genre_ids || [];
      return genreIds
        .map((id: number) => genreList.find((g: any) => g.id === id)?.name)
        .filter(Boolean)
        .slice(0, 3);
    },
    [movieGenres, tvGenres],
  );

  const styles = StyleSheet.create({
    container: {
      marginBottom: spacing.lg,
      marginTop: spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.md,
      gap: spacing.sm,
    },
    headerTitle: {
      ...typography.h3,
      color: colors.text.primary,
    },
    cardContainer: {
      height: isTablet ? 300 : 200,
    },
    card: {
      flex: 1,
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      backgroundColor: colors.background.secondary,
    },
    backdrop: {
      width: '100%',
      height: '100%',
      position: 'absolute',
    },
    backdropContainer: {
      width: '180%',
      height: '180%',
      position: 'absolute',
      top: '-40%',
      left: '-40%',
    },
    placeholderImage: {
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background.secondary,
    },
    gradient: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: '0%',
    },
    content: {
      position: 'absolute',
      bottom: isTablet ? spacing.lg : spacing.md,
      left: isTablet ? spacing.lg : spacing.md,
      right: isTablet ? spacing.lg : spacing.md,
      paddingVertical: isTablet ? spacing.lg : spacing.md,
      paddingLeft: isTablet ? spacing.lg : spacing.md,
      paddingRight: spacing.lg,
      alignItems: 'flex-start',
      justifyContent: 'center',
      backgroundColor: colors.modal.blurDark,
      borderRadius: isTablet ? borderRadius.xl : borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.modal.border,
    },
    infoContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    ratingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(0,0,0,0.6)',
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: borderRadius.sm,
    },
    ratingText: {
      ...typography.caption,
      color: colors.text.primary,
      fontWeight: '600',
    },
    yearBadge: {
      backgroundColor: 'rgba(0,0,0,0.6)',
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: borderRadius.sm,
    },
    yearText: {
      ...typography.caption,
      color: colors.text.secondary,
    },
    title: {
      ...typography.h3,
      fontSize: isTablet ? 20 : 14,
      color: colors.text.primary,
      fontWeight: '700',
      textAlign: 'left',
    },
    genreText: {
      ...typography.caption,
      color: colors.text.primary,
      fontWeight: '600',
      fontSize: isTablet ? 12 : 11,
      marginBottom: spacing.xs,
    },
    buttonContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    watchButton: {
      borderRadius: borderRadius.round,
      height: isTablet ? 55 : 40,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: isTablet ? spacing.xl : spacing.md,
    },
    watchlistButton: {
      width: isTablet ? 55 : 40,
      height: isTablet ? 55 : 40,
      borderRadius: borderRadius.round,
      backgroundColor: 'rgba(255,255,255,0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

  const renderItem = useCallback(
    ({item, index}: {item: ContentItem; index: number}) => {
      const cardSpacing = spacing.xs * 2;
      const itemWidth = CARD_WIDTH + cardSpacing;
      const inputRange = [
        (index - 1) * itemWidth,
        index * itemWidth,
        (index + 1) * itemWidth,
      ];

      const scale = scrollX.interpolate({
        inputRange,
        outputRange: [0.9, 1, 0.9],
        extrapolate: 'clamp',
      });

      const opacity = scrollX.interpolate({
        inputRange,
        outputRange: [0.6, 1, 0.6],
        extrapolate: 'clamp',
      });

      const title = (item as any).title || (item as any).name || 'Unknown';
      const posterPath = (item as any).poster_path;
      const backdropPath = (item as any).backdrop_path;
      const rating = (item as any).vote_average;
      const year =
        (item as any).release_date?.split('-')[0] ||
        (item as any).first_air_date?.split('-')[0];
      const overview = (item as any)?.overview;

      const imagePath = backdropPath || posterPath;
      const imageUrl = imagePath ? getImageUrl(imagePath, 'original') : null;

      // Enhanced parallax: background image translates horizontally on swipe
      const backdropParallaxX = scrollX.interpolate({
        inputRange: [
          (index - 1) * itemWidth,
          index * itemWidth,
          (index + 1) * itemWidth,
        ],
        outputRange: [100, 0, -100], // Increased from 50 to 100 for more visible effect
        extrapolate: 'clamp',
      });

      return (
        <Animated.View
          style={[
            styles.cardContainer,
            {
              width: CARD_WIDTH,
              marginHorizontal: spacing.xs,
              transform: [{scale}],
              opacity,
            },
          ]}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => handlePress(item)}
            style={styles.card}>
            {imageUrl ? (
              <Animated.View
                style={[
                  styles.backdropContainer,
                  {
                    transform: [{translateX: backdropParallaxX}],
                  },
                ]}>
                <FastImage
                  source={{
                    uri: imageUrl,
                    priority: FastImage.priority.high,
                    cache: FastImage.cacheControl.immutable,
                  }}
                  style={{width: '100%', height: '100%'}}
                  resizeMode={FastImage.resizeMode.cover}
                />
              </Animated.View>
            ) : (
              <View style={[styles.backdrop, styles.placeholderImage]}>
                <Ionicons
                  name="film-outline"
                  size={48}
                  color={colors.text.muted}
                />
              </View>
            )}
            <LinearGradient
              colors={[
                'transparent',
                'rgba(0,0,0,0.3)',
                'rgba(0,0,0,0.6)',
                colors.background.primary,
              ]}
              style={styles.gradient}
            />
            <View style={styles.content}>
              <View style={styles.infoContainer}>
                {rating > 0 && isTablet && (
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={14} color={colors.accent} />
                    <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
                  </View>
                )}
                {year && isTablet && (
                  <View style={styles.yearBadge}>
                    <Text style={styles.yearText}>{year}</Text>
                  </View>
                )}
              </View>

              <Text style={styles.title} numberOfLines={isTablet ? 2 : 1}>
                {title}
              </Text>

              {/* Genres */}
              {getItemGenres(item).length > 0 && (
                <Text
                  style={styles.genreText}
                  numberOfLines={1}
                  ellipsizeMode="tail">
                  {getItemGenres(item).join(' • ')}
                </Text>
              )}

              {/* Overview */}
              {overview && (
                <Text
                  numberOfLines={isTablet ? 3 : 2}
                  ellipsizeMode="tail"
                  style={{
                    color: colors.text.secondary,
                    fontSize: isTablet ? 12 : 10,
                    fontWeight: '400',
                  }}>
                  {overview}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        </Animated.View>
      );
    },
    [
      scrollX,
      CARD_WIDTH,
      handlePress,
      isTablet,
      getItemGenres,
      handleWatchlistPress,
      isInAnyWatchlist,
      removeFromWatchlistMutation.isPending,
    ],
  );

  const onScroll = Animated.event(
    [{nativeEvent: {contentOffset: {x: scrollX}}}],
    {useNativeDriver: true},
  );

  const onMomentumScrollEnd = useCallback(
    (event: any) => {
      const scrollOffset = event.nativeEvent.contentOffset.x + spacing.lg;
      const newIndex = Math.round(scrollOffset / (CARD_WIDTH + spacing.xs * 2));
      if (items[newIndex]) {
        setCurrentItemId(items[newIndex].id);
      }
    },
    [CARD_WIDTH, items],
  );

  if (!items || items.length === 0) {
    return null;
  }

  const itemType =
    (currentItem as any)?._filterType ||
    ((currentItem as any)?.first_air_date ? 'tv' : 'movie');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="sparkles" size={20} color={colors.text.primary} />
        <Text style={styles.headerTitle}>Just For You</Text>
      </View>
      <Animated.FlatList
        ref={flatListRef}
        data={items}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${(item as any).id}-${index}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate={0.998}
        contentContainerStyle={{
          paddingLeft: spacing.lg,
          paddingRight: spacing.lg,
        }}
        onScroll={onScroll}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
      />

      <WatchlistModal
        visible={showWatchlistModal}
        onClose={() => setShowWatchlistModal(false)}
        item={currentItem}
        itemType={itemType}
      />
    </View>
  );
};
