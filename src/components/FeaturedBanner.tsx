import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Image,
  TouchableOpacity,
  Button,
  Alert,
  useWindowDimensions,
  Animated,
  Easing,
  FlatList,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, typography, spacing, borderRadius} from '../styles/theme';
import {useUserContent} from '../hooks/useUserContent';
import {BannerSkeleton} from './LoadingSkeleton';
import {GradientButton} from './GradientButton';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';
// Animated version of ImageBackground for parallax transform
const AnimatedImageBackground = Animated.createAnimatedComponent(
  ImageBackground as any,
);
import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';
import {WatchlistModal} from './WatchlistModal';
import {
  useIsItemInAnyWatchlist,
  useRemoveFromWatchlist,
  useWatchlistContainingItem,
} from '../hooks/useWatchlists';
import {useNavigationState} from '../hooks/useNavigationState';
import {useResponsive} from '../hooks/useResponsive';

const DEFAULT_BANNER_HEIGHT = 680;

// Genre mappings
const movieGenres: {[key: number]: string} = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
};

const tvGenres: {[key: number]: string} = {
  10759: 'Action & Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  10762: 'Kids',
  9648: 'Mystery',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
  37: 'Western',
};

type FeaturedBannerProps = {
  item: Movie | TVShow;
  type: 'movie' | 'tv';
  // Slides provided by screen for carousel mode
  slides?: Array<Movie | TVShow>;
  autoPlayIntervalMs?: number;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const FeaturedBanner = memo(
  ({
    item,
    type,
    slides: incomingSlides,
    autoPlayIntervalMs = 5000,
  }: FeaturedBannerProps) => {
    const [loading, setLoading] = useState(true);
    const [showWatchlistModal, setShowWatchlistModal] = useState(false);
    const {width, height} = useWindowDimensions();
    const orientation = width >= height ? 'landscape' : 'portrait';
    const bannerHeight =
      orientation === 'portrait'
        ? Math.min(DEFAULT_BANNER_HEIGHT, height * 0.6)
        : Math.min(DEFAULT_BANNER_HEIGHT, height * 0.95);
    const slides = useMemo(() => {
      if (Array.isArray(incomingSlides) && incomingSlides.length > 0) {
        // ensure unique by id and drop nulls (return boolean explicitly)
        const seen = new Set<number>();
        const uniq = incomingSlides.filter((s: any) => {
          if (!s) return false;
          if (seen.has(s.id)) return false;
          seen.add(s.id);
          return true;
        });
        return uniq;
      }
      return [item];
    }, [incomingSlides, item]);
    const title =
      type === 'movie' ? (item as Movie).title : (item as TVShow).name;
    const releaseDate =
      type === 'movie'
        ? (item as Movie).release_date
        : (item as TVShow).first_air_date;
    const {
      isItemInContent: checkInWatchlist,
      addItem: addToWatchlist,
      removeItem: removeFromWatchlist,
    } = useUserContent('WATCHLIST');
    const navigation = useNavigation();
    const {navigateWithLimit} = useNavigationState();
    const [activeIndex, setActiveIndex] = useState(0);
    const current = slides[Math.min(activeIndex, slides.length - 1)] || item;
    const {data: isInAnyWatchlist = false} = useIsItemInAnyWatchlist(
      current.id,
    );
    const {data: watchlistContainingItem} = useWatchlistContainingItem(
      current.id,
    );
    const removeFromWatchlistMutation = useRemoveFromWatchlist();
    const {isTablet} = useResponsive();
    const listRef = useRef<FlatList<Movie | TVShow>>(null);
    const scrollX = useRef(new Animated.Value(0)).current;
    const autoplayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const autoFade = useRef(new Animated.Value(1)).current;
    const autoFadeOpacity = useMemo(
      () => autoFade.interpolate({inputRange: [0, 1], outputRange: [0.4, 1]}),
      [autoFade],
    );
    const autoFadeInOpacity = useMemo(
      () => autoFade.interpolate({inputRange: [0, 1], outputRange: [1, 0.4]}),
      [autoFade],
    );
    const autoTransitioningRef = useRef(false);
    const [autoTransitioning, setAutoTransitioning] = useState(false);
    const [pendingIndex, setPendingIndex] = useState<number | null>(null);
    const userInteractingRef = useRef(false);

    // Prefetch adjacent images to avoid decode during scroll
    useEffect(() => {
      if (!slides || slides.length <= 1) return;
      const size = isTablet ? 'w780' : 'w500';
      const indices = [
        (activeIndex + 1) % slides.length,
        (activeIndex + 2) % slides.length,
      ];
      indices.forEach(i => {
        const s: any = slides[i];
        if (s?.backdrop_path) {
          Image.prefetch(
            `https://image.tmdb.org/t/p/${size}${s.backdrop_path}`,
          );
        }
      });
    }, [activeIndex, slides, isTablet]);

    const addWatchlist = () => {
      if (checkInWatchlist(current.id)) {
        removeFromWatchlist(current.id);
      } else {
        addToWatchlist(current, type);
      }
    };

    const handlePress = useCallback(() => {
      if (type === 'movie') {
        navigateWithLimit('MovieDetails', {movie: current as Movie});
      } else {
        navigateWithLimit('TVShowDetails', {show: current as TVShow});
      }
    }, [navigateWithLimit, current, type]);

    const handleWatchlistPress = useCallback(async () => {
      if (isInAnyWatchlist && watchlistContainingItem) {
        // If item is already in a watchlist, remove it
        try {
          await removeFromWatchlistMutation.mutateAsync({
            watchlistId: watchlistContainingItem,
            itemId: current.id,
          });
        } catch (error) {
          Alert.alert('Error', 'Failed to remove from watchlist');
        }
      } else {
        // If item is not in any watchlist, show modal to add it
        setShowWatchlistModal(true);
      }
    }, [
      isInAnyWatchlist,
      watchlistContainingItem,
      removeFromWatchlistMutation,
      current.id,
    ]);

    // Autoplay logic with reset on manual swipe
    const clearAutoplay = () => {
      if (autoplayRef.current) {
        clearTimeout(autoplayRef.current);
        autoplayRef.current = null;
      }
      // Stop any ongoing fade and ensure fully visible when user interacts
      autoFade.stopAnimation(() => {
        autoFade.setValue(1);
      });
    };
    const scheduleAutoplay = useCallback(
      (fromIndex?: number) => {
        if (userInteractingRef.current) return;
        clearAutoplay();
        if (slides.length <= 1) return;
        if (autoTransitioningRef.current) return;
        const baseIndex =
          typeof fromIndex === 'number' ? fromIndex : activeIndex;
        autoplayRef.current = setTimeout(() => {
          const next = (baseIndex + 1) % slides.length;
          // Crossfade current and next without moving the list yet
          autoTransitioningRef.current = true;
          setAutoTransitioning(true);
          setPendingIndex(next);
          Animated.timing(autoFade, {
            toValue: 0,
            duration: 220,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }).start(() => {
            // Switch logical active index, then fade UI back in
            setActiveIndex(next);
            Animated.timing(autoFade, {
              toValue: 1,
              duration: 240,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }).start(() => {
              // After the fade completes, jump the list to the new index invisibly
              listRef.current?.scrollToIndex({index: next, animated: false});
              setPendingIndex(null);
              // Chain next schedule to keep autoplay running
              scheduleAutoplay(next);
              autoTransitioningRef.current = false;
              setAutoTransitioning(false);
            });
          });
        }, Math.max(2500, autoPlayIntervalMs));
      },
      [slides.length, activeIndex, autoPlayIntervalMs],
    );
    const pauseAutoplay = useCallback(() => {
      userInteractingRef.current = true;
      clearAutoplay();
    }, []);
    const resumeAutoplay = useCallback(
      (from?: number) => {
        userInteractingRef.current = false;
        scheduleAutoplay(typeof from === 'number' ? from : activeIndex);
      },
      [activeIndex, scheduleAutoplay],
    );
    useEffect(() => {
      scheduleAutoplay(activeIndex);
      return () => clearAutoplay();
    }, [scheduleAutoplay, width, height]);

    const styles = StyleSheet.create({
      skeletonContainer: {
        width: '100%',
        position: 'absolute',
        top: -40,
        left: 0,
        zIndex: 0,
      },
      container: {
        width: '100%',
        height: DEFAULT_BANNER_HEIGHT,
        position: 'relative',
      },
      background: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      },
      gradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 400,
        justifyContent: 'flex-end',
        padding: spacing.lg,
      },
      content: {
        gap: spacing.sm,
        padding: spacing.lg,
        marginBottom: 20,
      },
      dots: {
        position: 'absolute',
        bottom: 16,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      },
      dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.35)',
      },
      dotActive: {
        backgroundColor: colors.accent,
      },
      typeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.round,
      },
      type: {
        ...typography.caption,
        color: colors.primary,
        fontWeight: '600',
      },
      title: {
        ...typography.h1,
        color: colors.text.primary,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: {width: 0, height: 1},
        textShadowRadius: 4,
      },
      infoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
      },
      ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
      },
      rating: {
        ...typography.body2,
        color: colors.text.primary,
        fontWeight: '600',
      },
      date: {
        ...typography.body2,
        color: colors.text.secondary,
      },
      button: {
        marginTop: spacing.md,
        backgroundColor: colors.primary,
        borderRadius: borderRadius.round,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.xxl,
        alignSelf: 'flex-start',
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
      },
      buttonText: {
        ...typography.body2,
        color: colors.text.primary,
        fontWeight: '600',
      },
      buttonContainer: {
        flexDirection: 'row',
        gap: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
        marginHorizontal: spacing.xxl,
        width: isTablet ? 300 : '80%',
        alignSelf: 'center',
      },
      buttonWL: {
        marginTop: spacing.md,
        backgroundColor: colors.modal.header,
        borderRadius: borderRadius.round,
        width: 50,
        height: 50,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      },
      buttonTextWL: {
        ...typography.body2,
        color: colors.text.secondary,
        fontWeight: '600',
      },
      genreContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
      },
      genreWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      genre: {
        ...typography.caption,
        color: colors.text.secondary,
      },
      genreDot: {
        ...typography.caption,
        color: colors.text.secondary,
        marginHorizontal: spacing.sm,
      },
    });

    const renderItem = useCallback(
      ({item: slide, index}: {item: Movie | TVShow; index: number}) => {
        const inputRange = [
          (index - 1) * width,
          index * width,
          (index + 1) * width,
        ];
        const titleOpacity = scrollX.interpolate({
          inputRange,
          outputRange: [0, 1, 0],
          extrapolate: 'clamp',
        });
        // Cancel list's horizontal movement so visuals look stationary while swiping
        // FlatList positions items at x = index*width - scrollX
        // Apply inverse transform: scrollX - index*width => net 0
        const cancelTranslateX = Animated.subtract(
          scrollX,
          Animated.multiply(index, width),
        );
        const isActive = index === activeIndex;
        const isPending = pendingIndex !== null && index === pendingIndex;
        // During autoplay crossfade, ignore scroll-driven titleOpacity to avoid flicker
        const baseOpacity =
          autoTransitioning && (isActive || isPending)
            ? 1
            : (titleOpacity as any);
        const imageOpacity = isActive
          ? Animated.multiply(baseOpacity as any, autoFadeOpacity)
          : isPending
          ? Animated.multiply(baseOpacity as any, autoFadeInOpacity)
          : titleOpacity;
        // Local handlers bound to slide to avoid depending on `current`
        const onPress = () => {
          if (type === 'movie') {
            navigateWithLimit('MovieDetails', {movie: slide as Movie});
          } else {
            navigateWithLimit('TVShowDetails', {show: slide as TVShow});
          }
        };
        const onWatchlistPress = async () => {
          try {
            if (checkInWatchlist((slide as any).id)) {
              await removeFromWatchlistMutation.mutateAsync({
                watchlistId: watchlistContainingItem || '',
                itemId: (slide as any).id,
              });
            } else {
              addToWatchlist(slide as any, type);
            }
          } catch (e) {
            // Silent fail, UX stays smooth
          }
        };
        return (
          <Animated.View
            style={[
              styles.background,
              {width},
              {transform: [{translateX: cancelTranslateX}]},
            ]}>
            {/* Background image fades independently so overlay UI is unaffected */}
            <Animated.Image
              onLoadEnd={() => setLoading(false)}
              source={{
                uri: `https://image.tmdb.org/t/p/${isTablet ? 'w780' : 'w500'}${
                  (slide as any)?.backdrop_path
                }`,
              }}
              style={[StyleSheet.absoluteFillObject, {opacity: imageOpacity}]}
              resizeMode="cover"
            />
            <LinearGradient
              colors={[
                'transparent',
                'rgba(10,10,10,0.62)',
                colors.background.primary,
              ]}
              style={styles.gradient}
            />
            <View style={styles.content}>
              <View
                style={{
                  flexDirection: 'column',
                  gap: spacing.sm,
                  alignItems: 'center',
                }}>
                <Animated.Text style={[styles.title, {opacity: imageOpacity}]}>
                  {type === 'movie'
                    ? (slide as Movie).title
                    : (slide as TVShow).name}
                </Animated.Text>
                <Animated.View style={{opacity: imageOpacity}}>
                  <View style={styles.genreContainer}>
                    {slide.genre_ids
                      ?.slice(0, 3)
                      .map((genreId: number, idx: number) => (
                        <View
                          key={`${genreId}-${idx}`}
                          style={styles.genreWrapper}>
                          <Text style={styles.genre}>
                            {type === 'movie'
                              ? movieGenres[genreId]
                              : tvGenres[genreId]}
                          </Text>
                          {idx < Math.min(slide.genre_ids.length - 1, 2) && (
                            <Text style={styles.genreDot}>•</Text>
                          )}
                        </View>
                      ))}
                  </View>
                </Animated.View>
              </View>
              <View style={styles.buttonContainer}>
                <GradientButton
                  title="Watch Now"
                  onPress={onPress}
                  style={styles.button}
                />
                <TouchableOpacity
                  style={styles.buttonWL}
                  onPress={onWatchlistPress}
                  disabled={removeFromWatchlistMutation.isPending}>
                  <Ionicons
                    name={
                      checkInWatchlist((slide as any).id) ? 'checkmark' : 'add'
                    }
                    size={24}
                    color={
                      checkInWatchlist((slide as any).id)
                        ? colors.accent
                        : '#fff'
                    }
                  />
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        );
      },
      [
        width,
        scrollX,
        isTablet,
        type,
        navigateWithLimit,
        removeFromWatchlistMutation,
      ],
    );

    return (
      <View style={[styles.container, {height: bannerHeight, width: '100%'}]}>
        {slides.length > 1 ? (
          <Animated.FlatList
            ref={listRef}
            data={slides}
            keyExtractor={(s, i) => `${s.id}-${i}`}
            renderItem={renderItem}
            horizontal
            pagingEnabled
            scrollEnabled={!autoTransitioning}
            showsHorizontalScrollIndicator={false}
            onScrollBeginDrag={pauseAutoplay}
            onScroll={Animated.event(
              [{nativeEvent: {contentOffset: {x: scrollX}}}],
              {useNativeDriver: true},
            )}
            onMomentumScrollEnd={e => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / width);
              setActiveIndex(idx);
              resumeAutoplay(idx);
            }}
            onTouchStart={pauseAutoplay}
            onTouchMove={pauseAutoplay}
            onTouchEnd={() => resumeAutoplay()}
            onTouchCancel={() => resumeAutoplay()}
            scrollEventThrottle={16}
            windowSize={3}
            initialNumToRender={1}
            maxToRenderPerBatch={2}
            updateCellsBatchingPeriod={16}
            getItemLayout={(data, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            initialScrollIndex={0}
            removeClippedSubviews
          />
        ) : (
          // Single item fallback
          renderItem({item, index: 0} as any)
        )}

        {slides.length > 1 && (
          <View style={styles.dots}>
            {slides.map((_, i) => {
              const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
              const scale = scrollX.interpolate({
                inputRange,
                outputRange: [1, 1.4, 1],
                extrapolate: 'clamp',
              });
              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.5, 1, 0.5],
                extrapolate: 'clamp',
              });
              const isActive = i === activeIndex;
              return isActive ? (
                <Animated.View
                  key={`dot-${i}`}
                  style={{transform: [{scale}], opacity}}>
                  <LinearGradient
                    colors={[colors.primary, colors.secondary]}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    style={styles.dot}
                  />
                </Animated.View>
              ) : (
                <Animated.View
                  key={`dot-${i}`}
                  style={[styles.dot, {transform: [{scale}]}, {opacity}]}
                />
              );
            })}
          </View>
        )}

        <WatchlistModal
          visible={showWatchlistModal}
          onClose={() => setShowWatchlistModal(false)}
          item={current}
          itemType={type}
        />
      </View>
    );
  },
);
