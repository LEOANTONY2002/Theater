import React, {useCallback, useState, useRef, useEffect, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import LinearGradient from 'react-native-linear-gradient';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {getImageUrl, getOptimizedImageUrl, getGenres} from '../services/tmdb';
import {useNavigation} from '@react-navigation/native';
import {ContentItem} from './MovieList';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useResponsive} from '../hooks/useResponsive';
import {useQuery} from '@tanstack/react-query';
import {GradientButton} from './GradientButton';
import {useUserContent} from '../hooks/useUserContent';
import {
  useIsItemInAnyWatchlist,
  useWatchlistContainingItem,
  useRemoveFromWatchlist,
} from '../hooks/useWatchlists';
import {WatchlistModal} from './WatchlistModal';

interface FiltersBannerProps {
  items: ContentItem[];
}

export const FiltersBanner: React.FC<FiltersBannerProps> = ({items}) => {
  const navigation = useNavigation();
  const {isTablet, orientation, width} = useResponsive();
  const [activeIndex, setActiveIndex] = useState(0);
  const [showWatchlistModal, setShowWatchlistModal] = useState(false);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<any>(null);

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
  const {addItem: addToWatchlist} = useUserContent('WATCHLIST');
  const removeFromWatchlistMutation = useRemoveFromWatchlist();

  // Current item based on active index
  const currentItem = items[activeIndex];
  const {data: isInAnyWatchlist = false} = useIsItemInAnyWatchlist(
    currentItem?.id,
  );
  const {data: watchlistContainingItem} = useWatchlistContainingItem(
    currentItem?.id,
  );

  // Recalculate dimensions when orientation or width changes
  const {CARD_WIDTH, CARD_SPACING, SIDE_CARD_WIDTH} = useMemo(() => {
    const cardWidth =
      isTablet && orientation === 'portrait'
        ? width * 0.85
        : isTablet && orientation === 'landscape'
        ? width * 0.65
        : width * 0.8;
    const cardSpacing = isTablet ? spacing.xs : spacing.xs;
    const sideCardWidth = (width - cardWidth) / 2;

    return {
      CARD_WIDTH: cardWidth,
      CARD_SPACING: cardSpacing,
      SIDE_CARD_WIDTH: sideCardWidth,
    };
  }, [isTablet, orientation, width]);

  // Debug: Log the first item to see what data we have
  useEffect(() => {
    if (items.length > 0) {
      console.log(
        'FiltersBanner first item:',
        JSON.stringify(items[0], null, 2),
      );
    }
  }, [items]);

  useEffect(() => {
    if (items.length === 0) return;

    const interval = setInterval(() => {
      setActiveIndex(prev => {
        const next = (prev + 1) % items.length;
        flatListRef.current?.scrollToOffset({
          offset: next * (CARD_WIDTH + CARD_SPACING),
          animated: true,
        });
        return next;
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [items.length, CARD_WIDTH, CARD_SPACING]);

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
      marginTop: 60,
    },
    cardContainer: {
      height: isTablet ? 400 : 280,
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
      width: '110%',
      height: '120%',
      position: 'absolute',
      top: '-10%',
      left: '-5%',
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
      height: '70%',
    },
    content: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
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
      fontSize: isTablet ? 24 : 16,
      color: colors.text.primary,
      marginBottom: spacing.xs,
      fontWeight: '700',
      textAlign: 'center',
    },
    overview: {
      ...typography.body2,
      color: colors.text.secondary,
      lineHeight: 18,
    },
    pagination: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.md,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.text.muted,
      opacity: 0.3,
    },
    activeDot: {
      width: 20,
      backgroundColor: colors.accent,
      opacity: 1,
    },
    genreContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xs,
    },
    genreWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    genreText: {
      ...typography.caption,
      color: colors.text.primary,
      fontSize: 11,
    },
    genreDot: {
      ...typography.caption,
      color: colors.text.primary,
      marginHorizontal: spacing.xs,
    },
    buttonContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    watchButton: {
      borderRadius: borderRadius.md,
      height: isTablet ? 60 : 45,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: isTablet ? spacing.xl : spacing.md,
    },
    watchlistButton: {
      width: isTablet ? 60 : 45,
      height: isTablet ? 60 : 45,
      borderRadius: borderRadius.md,
      backgroundColor: 'rgba(255,255,255,0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

  const renderItem = useCallback(
    ({item, index}: {item: ContentItem; index: number}) => {
      const inputRange = [
        (index - 1) * (CARD_WIDTH + CARD_SPACING),
        index * (CARD_WIDTH + CARD_SPACING),
        (index + 1) * (CARD_WIDTH + CARD_SPACING),
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

      const imagePath = backdropPath || posterPath;
      const imageUrl = imagePath ? getImageUrl(imagePath, 'original') : null;

      // Parallax effect based on horizontal scroll position
      const parallaxX = scrollX.interpolate({
        inputRange: [
          (index - 1) * (CARD_WIDTH + CARD_SPACING),
          index * (CARD_WIDTH + CARD_SPACING),
          (index + 1) * (CARD_WIDTH + CARD_SPACING),
        ],
        outputRange: [80, 0, -80],
        extrapolate: 'extend',
      });

      const parallaxScale = scrollX.interpolate({
        inputRange: [
          (index - 1) * (CARD_WIDTH + CARD_SPACING),
          index * (CARD_WIDTH + CARD_SPACING),
          (index + 1) * (CARD_WIDTH + CARD_SPACING),
        ],
        outputRange: [1.1, 1, 1.1],
        extrapolate: 'clamp',
      });

      return (
        <Animated.View
          style={[
            styles.cardContainer,
            {
              width: CARD_WIDTH,
              marginHorizontal: CARD_SPACING / 2,
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
                    transform: [
                      {translateX: parallaxX},
                      {scale: parallaxScale},
                    ],
                  },
                ]}>
                <FastImage
                  source={{
                    uri: imageUrl,
                    priority: FastImage.priority.high,
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

              <Text style={styles.title} numberOfLines={2}>
                {title}
              </Text>

              {/* Genres */}
              {getItemGenres(item).length > 0 && (
                <View style={styles.genreContainer}>
                  {getItemGenres(item).map((genre: string, idx: number) => (
                    <View key={idx} style={styles.genreWrapper}>
                      <Text style={styles.genreText}>{genre}</Text>
                      {idx < getItemGenres(item).length - 1 && (
                        <Text style={styles.genreDot}>•</Text>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* Action Buttons - only show for active card */}

              <View style={styles.buttonContainer}>
                <LinearGradient
                  colors={[colors.primary, colors.secondary]}
                  style={styles.watchButton}>
                  <Ionicons
                    name="play"
                    size={isTablet ? 24 : 20}
                    color={colors.text.primary}
                  />
                  <Text
                    style={{
                      color: colors.text.primary,
                      fontSize: isTablet ? 14 : 12,
                      fontWeight: 'bold',
                    }}>
                    Watch Now
                  </Text>
                </LinearGradient>
                <TouchableOpacity
                  style={styles.watchlistButton}
                  onPress={handleWatchlistPress}
                  disabled={removeFromWatchlistMutation.isPending}>
                  <Ionicons
                    name={isInAnyWatchlist ? 'checkmark-circle' : 'add-outline'}
                    size={isTablet ? 24 : 20}
                    color={colors.text.primary}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      );
    },
    [
      scrollX,
      CARD_WIDTH,
      CARD_SPACING,
      handlePress,
      isTablet,
      getItemGenres,
      activeIndex,
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
      const newIndex = Math.round(
        event.nativeEvent.contentOffset.x / (CARD_WIDTH + CARD_SPACING),
      );
      setActiveIndex(newIndex);
    },
    [CARD_WIDTH, CARD_SPACING],
  );

  if (!items || items.length === 0) {
    return null;
  }

  const itemType =
    (currentItem as any)?._filterType ||
    ((currentItem as any)?.first_air_date ? 'tv' : 'movie');

  return (
    <View style={styles.container}>
      <Animated.FlatList
        ref={flatListRef}
        data={items}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${(item as any).id}-${index}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        decelerationRate="fast"
        contentContainerStyle={{
          paddingHorizontal: SIDE_CARD_WIDTH - CARD_SPACING / 2,
        }}
        onScroll={onScroll}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
      />
      {items.length > 1 && (
        <View style={styles.pagination}>
          {items.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, index === activeIndex && styles.activeDot]}
            />
          ))}
        </View>
      )}

      <WatchlistModal
        visible={showWatchlistModal}
        onClose={() => setShowWatchlistModal(false)}
        item={currentItem}
        itemType={itemType}
      />
    </View>
  );
};
