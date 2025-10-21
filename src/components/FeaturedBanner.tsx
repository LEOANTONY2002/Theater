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
  Image,
  TouchableOpacity,
  useWindowDimensions,
  FlatList,
  Animated,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, typography, spacing, borderRadius} from '../styles/theme';
import {useUserContent} from '../hooks/useUserContent';
import {GradientButton} from './GradientButton';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';
// Note: We avoid Animated APIs per user request.
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
  autoplayEnabled?: boolean;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const FeaturedBanner = memo(
  ({
    item,
    type,
    slides: incomingSlides,
    autoPlayIntervalMs = 5000,
    autoplayEnabled = true,
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
    // Title/date available via slide items; no separate constants needed
    const {
      isItemInContent: checkInWatchlist,
      addItem: addToWatchlist,
      removeItem: removeFromWatchlist,
    } = useUserContent('WATCHLIST');
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
    const listRef = useRef<any>(null);
    const autoplayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const userInteractingRef = useRef(false);
    const loadedImagesRef = useRef<Set<string>>(new Set());
    const failedImagesRef = useRef<Set<string>>(new Set());
    const scrollX = useRef(new Animated.Value(0)).current;

    // Prefetch adjacent images to avoid decode during scroll (match render size: original)
    useEffect(() => {
      if (!slides || slides.length <= 1) return;
      const size = 'original';
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
        } catch (error) {}
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
    };
    const scheduleAutoplay = useCallback(
      (fromIndex?: number) => {
        if (userInteractingRef.current) return;
        clearAutoplay();
        if (slides.length <= 1) return;
        const baseIndex =
          typeof fromIndex === 'number' ? fromIndex : activeIndex;
        const runTransition = () => {
          const next = (baseIndex + 1) % slides.length;
          const targetOffset = next * width;

          // Animate scrollX value smoothly for visible transitions
          Animated.timing(scrollX, {
            toValue: targetOffset,
            duration: 500,
            useNativeDriver: true,
          }).start(() => {
            setActiveIndex(next);
            // Sync FlatList position after animation
            listRef.current?.scrollToOffset({
              offset: targetOffset,
              animated: false,
            });
          });

          scheduleAutoplay(next);
        };
        autoplayRef.current = setTimeout(() => {
          const next = (baseIndex + 1) % slides.length;
          const nextPath = (slides[next] as any)?.backdrop_path as
            | string
            | undefined;
          if (nextPath && !loadedImagesRef.current.has(nextPath)) {
            // Not loaded yet; prefetch and retry shortly
            Image.prefetch(`https://image.tmdb.org/t/p/original${nextPath}`);
            // Retry after a short delay to check if it got cached
            autoplayRef.current = setTimeout(runTransition, 250);
          } else {
            runTransition();
          }
        }, Math.max(2500, autoPlayIntervalMs));
      },
      [slides.length, activeIndex, autoPlayIntervalMs, width, scrollX],
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

    // Pause/resume autoplay when parent toggles visibility
    useEffect(() => {
      if (autoplayEnabled) {
        resumeAutoplay(activeIndex);
      } else {
        clearAutoplay();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoplayEnabled, activeIndex]);

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
      dotActiveWrap: {
        width: 12,
        height: 12,
        borderRadius: 6,
        overflow: 'hidden',
      },
      dotActive: {
        width: 12,
        height: 12,
        borderRadius: 6,
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
        fontSize: isTablet ? 28 : 20,
        color: colors.text.primary,
      },
      infoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
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
        // Animation input range for this slide - smooth transitions with gesture tracking
        const inputRange = [
          (index - 1) * width,
          (index - 0.7) * width, // Earlier fade start for smoother transition
          (index - 0.3) * width, // Gradual fade in
          index * width, // Fully active
          (index + 0.3) * width, // Gradual fade out
          (index + 0.7) * width, // Earlier fade end
          (index + 1) * width,
        ];

        // Background image fade animation - complete fade out/in for clean transitions
        const imageOpacity = scrollX.interpolate({
          inputRange,
          outputRange: [0, 0, 0.3, 1, 0.3, 0, 0],
          extrapolate: 'clamp',
        });

        // Content fade animation - synchronized with background for cohesive feel
        const contentOpacity = scrollX.interpolate({
          inputRange,
          outputRange: [0, 0, 0.4, 1, 0.4, 0, 0],
          extrapolate: 'clamp',
        });

        // Content translateX animation - subtle movement that feels connected to swipe
        const contentTranslateX = scrollX.interpolate({
          inputRange,
          outputRange: [
            width * 0.15, // Incoming from right
            width * 0.1,
            width * 0.02,
            0, // Centered when active
            -width * 0.02,
            -width * 0.1,
            -width * 0.15, // Exiting to left
          ],
          extrapolate: 'clamp',
        });

        // Local handlers bound to slide to avoid depending on `current`
        const onPress = () => {
          if (type === 'movie') {
            navigateWithLimit('MovieDetails', {movie: slide as Movie});
          } else {
            navigateWithLimit('TVShowDetails', {show: slide as TVShow});
          }
        };
        const onWatchlistPress = async () => {
          // Ensure actions target this slide by making it current, then reuse shared handler
          setActiveIndex(index);
          try {
            // Defer to next tick so hooks rebind to the new current item
            setTimeout(() => {
              handleWatchlistPress();
            }, 0);
          } catch (e) {
            // Silent fail, keep UX smooth
          }
        };
        return (
          <View style={[styles.background, {width}]}>
            {/* Background image fades independently so overlay UI is unaffected */}
            {(() => {
              const bp = (slide as any)?.backdrop_path as string | undefined;
              const showFallback = !bp || failedImagesRef.current.has(bp);
              if (showFallback) return null;
              return (
                <Animated.View
                  style={[
                    StyleSheet.absoluteFillObject,
                    {opacity: imageOpacity},
                  ]}>
                  <FastImage
                    key={`${(slide as any)?.id}-${
                      (slide as any)?.backdrop_path
                    }`}
                    onLoad={() => {
                      const bp2 = (slide as any)?.backdrop_path as
                        | string
                        | undefined;
                      if (bp2) loadedImagesRef.current.add(bp2);
                    }}
                    onLoadEnd={() => setLoading(false)}
                    onError={() => {
                      const bp3 = (slide as any)?.backdrop_path as
                        | string
                        | undefined;
                      if (bp3) failedImagesRef.current.add(bp3);
                    }}
                    source={{
                      uri: `https://image.tmdb.org/t/p/original${bp}`,
                      priority: FastImage.priority.high,
                      cache: FastImage.cacheControl.immutable,
                    }}
                    style={[StyleSheet.absoluteFillObject]}
                    resizeMode={FastImage.resizeMode.cover}
                  />
                </Animated.View>
              );
            })()}
            {/* Local fallback when backdrop missing or failed */}
            {(() => {
              const bp = (slide as any)?.backdrop_path as string | undefined;
              if (!bp || failedImagesRef.current.has(bp)) {
                return (
                  <Image
                    source={require('../assets/theater.webp')}
                    style={[StyleSheet.absoluteFillObject]}
                    resizeMode="cover"
                  />
                );
              }
              return null;
            })()}
            <LinearGradient
              colors={[
                'transparent',
                'rgba(10,10,10,0.62)',
                colors.background.primary,
              ]}
              style={styles.gradient}
            />
            <Animated.View
              style={[
                styles.content,
                {
                  opacity: contentOpacity,
                  transform: [{translateX: contentTranslateX}],
                },
              ]}>
              <View
                style={{
                  flexDirection: 'column',
                  gap: spacing.sm,
                  alignItems: 'center',
                }}>
                <Text style={[styles.title, {textAlign: 'center'}]}>
                  {type === 'movie'
                    ? (slide as Movie).title
                    : (slide as TVShow).name}
                </Text>
                <View>
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
                </View>
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
                      (
                        index === activeIndex
                          ? isInAnyWatchlist
                          : checkInWatchlist((slide as any).id)
                      )
                        ? 'checkmark'
                        : 'add'
                    }
                    size={24}
                    color={
                      (
                        index === activeIndex
                          ? isInAnyWatchlist
                          : checkInWatchlist((slide as any).id)
                      )
                        ? colors.accent
                        : '#fff'
                    }
                  />
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        );
      },
      [
        width,
        isTablet,
        type,
        navigateWithLimit,
        removeFromWatchlistMutation,
        scrollX,
      ],
    );

    return (
      <View style={[styles.container, {height: bannerHeight, width: '100%'}]}>
        {slides.length > 1 ? (
          <Animated.FlatList
            ref={listRef}
            data={slides}
            keyExtractor={s => `${s.id}`}
            renderItem={renderItem}
            horizontal
            pagingEnabled
            scrollEnabled={true}
            showsHorizontalScrollIndicator={false}
            decelerationRate={0.98}
            onScroll={Animated.event(
              [{nativeEvent: {contentOffset: {x: scrollX}}}],
              {useNativeDriver: true},
            )}
            onScrollBeginDrag={pauseAutoplay}
            onMomentumScrollEnd={e => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / width);
              setActiveIndex(idx);
              resumeAutoplay(idx);
            }}
            onTouchStart={pauseAutoplay}
            onTouchMove={pauseAutoplay}
            onTouchEnd={() => resumeAutoplay()}
            onTouchCancel={() => resumeAutoplay()}
            scrollEventThrottle={8}
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
              const isActive = i === activeIndex;
              return isActive ? (
                <View key={`dot-${i}`} style={styles.dotActiveWrap}>
                  <LinearGradient
                    colors={[colors.primary, colors.secondary]}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    style={styles.dotActive}
                  />
                </View>
              ) : (
                <View key={`dot-${i}`} style={styles.dot} />
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
