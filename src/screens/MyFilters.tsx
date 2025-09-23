import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
  Clipboard,
  Alert,
} from 'react-native';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {SavedFilter} from '../types/filters';
import {FiltersManager} from '../store/filters';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {MyFiltersModal} from '../components/MyFiltersModal';
import LinearGradient from 'react-native-linear-gradient';
import languageData from '../utils/language.json';
import {Genre} from '../types/movie';
import {
  getGenres,
  getOptimizedImageUrl,
  getAvailableWatchProviders,
} from '../services/tmdb';
import {HorizontalListSkeleton} from '../components/LoadingSkeleton';
import CreateButton from '../components/createButton';
import {HorizontalList} from '../components/HorizontalList';
import {useSavedFilterContent} from '../hooks/useApp';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {BlurView} from '@react-native-community/blur';
import ShareLib from 'react-native-share';
import {Animated, Easing} from 'react-native';
import {useResponsive} from '../hooks/useResponsive';
import {requestPosterCapture} from '../components/PosterCaptureHost';
import {generateFilterCode, parseFilterCode} from '../utils/shareCode';
import {modalStyles} from '../styles/styles';
import {ContentItem} from '../components/MovieList';
import {MaybeBlurView} from '../components/MaybeBlurView';

export const MyFiltersScreen = () => {
  const queryClient = useQueryClient();
  const [showImportModal, setShowImportModal] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingFilter, setEditingFilter] = useState<SavedFilter | null>(null);
  const navigation = useNavigation();
  const {isTablet, orientation} = useResponsive();

  // Animated values for scroll
  const scrollY = React.useRef(new Animated.Value(0)).current;
  const headerAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const id = scrollY.addListener(({value}) => {
      Animated.timing(headerAnim, {
        toValue: value,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false, // must be false for margin/background
      }).start();
    });
    return () => scrollY.removeListener(id);
  }, [scrollY, headerAnim]);

  // Interpolated styles for the animated header
  const animatedHeaderStyle = {
    // marginTop: headerAnim.interpolate({
    //   inputRange: [0, 40],
    //   outputRange: [spacing.md, spacing.xl],
    //   extrapolate: 'clamp',
    // }),
    marginHorizontal: headerAnim.interpolate({
      inputRange: [0, 40],
      outputRange: [spacing.md, spacing.lg],
      extrapolate: 'clamp',
    }),
    marginBottom: headerAnim.interpolate({
      inputRange: [0, 40],
      outputRange: [spacing.md, spacing.lg],
      extrapolate: 'clamp',
    }),
    borderRadius: headerAnim.interpolate({
      inputRange: [0, 40],
      outputRange: [16, 24],
      extrapolate: 'clamp',
    }),
  };
  const blurOpacity = headerAnim.interpolate({
    inputRange: [0, 40],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const {data: savedFilters = [], isLoading} = useQuery({
    queryKey: ['savedFilters'],
    queryFn: FiltersManager.getSavedFilters,
  });

  const handleSaveFilter = useCallback(
    (filter: SavedFilter) => {
      queryClient.invalidateQueries({queryKey: ['savedFilters']});
    },
    [queryClient],
  );

  const handleDelete = useCallback(
    (id: string) => {
      queryClient.invalidateQueries({queryKey: ['savedFilters']});
    },
    [queryClient],
  );

  const [allGenres, setAllGenres] = useState<Genre[]>([]);

  // Fetch provider catalog (movie) and build id -> logo map
  const {data: availableProviders = []} = useQuery({
    queryKey: ['available_watch_providers', 'movie'],
    queryFn: () => getAvailableWatchProviders(),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
  const providerLogoById = React.useMemo(() => {
    const map: Record<string, string> = {};
    try {
      availableProviders.forEach((p: any) => {
        if (p?.provider_id != null && p?.logo_path) {
          map[String(p.provider_id)] = p.logo_path;
        }
      });
    } catch {}
    return map;
  }, [availableProviders]);

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const [movieGenresData] = await Promise.all([getGenres('movie')]);
        const uniqueGenres = [...movieGenresData].filter(
          (genre, index, self) =>
            index === self.findIndex(t => t.id === genre.id),
        );
        setAllGenres(uniqueGenres);
      } catch (error) {
        console.error('Error loading genres:', error);
      }
    };

    fetchGenres();
  }, []);

  // Import Filter submit (same UX as Watchlists)
  const handleImportFilterSubmit = useCallback(async () => {
    if (!importCode.trim()) {
      Alert.alert('Import', 'Please paste a valid code.');
      return;
    }
    const parsed = parseFilterCode(importCode.trim());
    if (!parsed) {
      Alert.alert('Import', 'Invalid code.');
      return;
    }
    try {
      setIsImporting(true);
      await FiltersManager.saveFilter(
        parsed.name,
        parsed.params as any,
        parsed.type,
      );
      setShowImportModal(false);
      setImportCode('');
    } catch (e) {
      Alert.alert('Import Failed', 'Could not import this code.');
    } finally {
      setIsImporting(false);
    }
  }, [importCode]);

  const styles = StyleSheet.create({
    container: {
      height: '100%',
      backgroundColor: colors.background.primary,
      paddingTop: spacing.xxl,
      paddingBottom: 200,
      position: 'relative',
    },
    header: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.md,
      overflow: 'hidden',
      marginTop: 50,
    },
    title: {
      flex: 1, // <-- Add this
      textAlign: 'center',
      color: colors.text.primary,
      ...typography.h2,
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
    },
    importModalContent: {
      width: '90%',
      backgroundColor: colors.modal.active,
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      paddingBottom: spacing.md,
    },
    addRow: {flexDirection: 'row', alignItems: 'center'},
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
      height: 40,
      width: 40,
      zIndex: 1,
    },
    content: {
      paddingHorizontal: spacing.md,
      paddingTop: 100, // Make sure this is at least the header height
      paddingBottom: 150,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: isTablet && orientation === 'landscape' ? '20%' : '60%',
      paddingBottom: 200,
    },
    emptyStateTitle: {
      ...typography.h3,
      color: colors.text.primary,
      marginBottom: spacing.sm,
    },
    emptyStateText: {
      ...typography.body1,
      color: colors.text.secondary,
    },
    filterItem: {
      backgroundColor: colors.background.tertiary,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: colors.modal.border,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      position: 'relative',
      height: isTablet ? 500 : 380,
      marginBottom: 10,
      zIndex: 0,
    },
    filterHeader: {
      flexDirection: 'column',
      marginBottom: spacing.sm,
    },
    filterName: {
      color: colors.text.primary,
      ...typography.h3,
    },
    filterContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      top: 10,
    },
    card: {
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      // backgroundColor: colors.background.card,
      borderWidth: 1,
      borderColor: colors.modal.blur,
      borderRadius: borderRadius.md,
      width: 80,
      height: 80,
      padding: spacing.xs,
      zIndex: 1,
    },
    cardSmall: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: colors.background.card,
      borderRadius: borderRadius.sm,
      width: 80,
      height: 35,
      padding: spacing.xs,
    },
    cardText: {
      color: colors.text.secondary,
      ...typography.body1,
    },
    genreContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    genreText: {
      color: colors.text.muted,
      ...typography.body2,
    },
    listContainer: {
      position: 'relative',
      width: '120%',
      overflow: 'scroll',
      bottom: 10,
      left: -30,
      zIndex: 1,
    },
    providerIconRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
    },
    providerIcon: {
      width: 22,
      height: 22,
      borderRadius: 4,
      backgroundColor: 'transparent',
    },
    // Provider grid styles for logos layout inside the 80x80 card
    providerIconLarge: {
      width: 56,
      height: 56,
      borderRadius: 8,
    },
    providerGrid: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xs,
      gap: spacing.xs,
    },
    providerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
    },
    providerIconGrid: {
      width: 30,
      height: 30,
      borderRadius: 6,
    },
    providerCardDynamic: {
      // allow the provider card to extend horizontally when many logos
      width: undefined as unknown as number,
      minWidth: 80 as unknown as number,
      paddingHorizontal: spacing.xs,
    },
    providerGridDynamic: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
    },
  });

  const MyFilterItemWithResults = ({
    filter,
    allGenres,
    onEdit,
  }: {
    filter: SavedFilter;
    allGenres: Genre[];
    onEdit: (f: SavedFilter) => void;
  }) => {
    const type = filter?.type;
    const sortBy = filter?.params?.sort_by?.split('.')[0][0];
    const sortOrder = filter?.params?.sort_by?.split('.')[1];
    const rating = filter?.params?.['vote_average.gte'];
    const language = filter?.params?.with_original_language
      ? languageData.find(
          (l: any) => l.iso_639_1 === filter?.params?.with_original_language,
        )
      : null;
    const genres = filter?.params?.with_genres;
    const genreNames = genres
      ?.split(',')
      .map(id => allGenres.find(genre => genre.id === parseInt(id))?.name)
      .join(', ');
    const fromDate =
      filter?.params?.['primary_release_date.gte'] ||
      filter?.params?.['first_air_date.gte'];
    const toDate =
      filter?.params?.['primary_release_date.lte'] ||
      filter?.params?.['first_air_date.lte'];
    const fromYear = fromDate ? new Date(fromDate).getFullYear() : null;
    const toYear = toDate ? new Date(toDate).getFullYear() : null;

    // Fetch filter content for this filter
    const {
      data: filterContent,
      isLoading: isLoadingFilterContent,
      fetchNextPage: fetchNextFilterPage,
      hasNextPage: hasNextFilterPage,
      isFetchingNextPage: isFetchingNextFilterPage,
    } = useSavedFilterContent(filter);
    // Flatten all pages for infinite scrolling
    const flattenedData =
      filterContent?.pages?.flatMap(page => page?.results || []) || [];

    // Share Poster state (centralized capture host)
    const [showPosterModal, setShowPosterModal] = useState(false);
    const [isSharingPoster, setIsSharingPoster] = useState(false);
    const [posterLoading, setPosterLoading] = useState(false);
    const [posterUri, setPosterUri] = useState<string | null>(null);
    const importCodeForFilter = React.useMemo(
      () =>
        generateFilterCode({
          name: filter.name,
          type: filter.type,
          params: filter.params || {},
        }),
      [filter],
    );

    const contentItems: ContentItem[] = flattenedData.slice(0, 3).map(item => {
      if (item.type === 'movie') {
        return {
          id: item.id,
          title: item.title || '',
          originalTitle: item.originalTitle || '',
          overview: item.overview,
          poster_path: item.poster_path,
          backdrop_path: item.backdrop_path,
          vote_average: item.vote_average,
          release_date: item.release_date || '',
          genre_ids: item.genre_ids,
          popularity: item.popularity,
          original_language: item.original_language,
          type: 'movie' as const,
        };
      } else {
        return {
          id: item.id,
          name: item.name || '',
          overview: item.overview,
          poster_path: item.poster_path,
          backdrop_path: item.backdrop_path,
          vote_average: item.vote_average,
          first_air_date: item.first_air_date || '',
          genre_ids: item.genre_ids,
          origin_country: item.origin_country || [],
          popularity: item.popularity,
          original_language: item.original_language,
          type: 'tv' as const,
        };
      }
    });

    const handleOpenPoster = async () => {
      setShowPosterModal(true);
      setPosterLoading(true);
      setPosterUri(null);
      try {
        const uri = await requestPosterCapture(
          {
            watchlistName: filter.name,
            items: contentItems,
            importCode: importCodeForFilter,
            isFilter: true,
            showQR: true,
          },
          'tmpfile',
        );
        setPosterUri(uri);
      } catch (e) {
        console.warn('Create poster failed', e);
        setShowPosterModal(false);
      } finally {
        setPosterLoading(false);
      }
    };

    const handleSharePoster = useCallback(async () => {
      if (!posterUri) return;
      try {
        await ShareLib.open({url: posterUri, type: 'image/png'});
      } catch (e) {
        console.warn('Share sheet error', e);
      }
    }, [posterUri]);

    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const handleItemPress = (item: any) => {
      if (item.type === 'movie') {
        navigation.push('MovieDetails', {movie: item});
      } else if (item.type === 'tv') {
        navigation.push('TVShowDetails', {show: item});
      }
    };

    return (
      <View
        key={filter.id}
        style={{marginBottom: spacing.xl, position: 'relative'}}>
        <View style={styles.filterItem}>
          <LinearGradient
            colors={['transparent', colors.background.primary]}
            pointerEvents="none"
            style={{
              width: isTablet ? '300%' : '250%',
              height: isTablet ? '250%' : '250%',
              position: 'absolute',
              bottom: isTablet ? 20 : -20,
              left: isTablet ? -170 : -220,
              paddingHorizontal: 10,
              zIndex: 0,
              transform: [
                {
                  rotate:
                    isTablet && orientation == 'landscape'
                      ? '-5deg'
                      : isTablet && orientation == 'portrait'
                      ? '-5deg'
                      : '-35deg',
                },
              ],
            }}
            start={{x: 0, y: 0}}
            end={{x: 0, y: 1}}
          />
          <View style={styles.filterHeader}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
              <Text style={styles.filterName}>{filter.name}</Text>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                {contentItems?.length > 0 && (
                  <TouchableOpacity
                    style={{alignItems: 'center', padding: 5, marginRight: 6}}
                    activeOpacity={0.9}
                    onPress={handleOpenPoster}>
                    <Ionicons
                      name="share-social-outline"
                      size={16}
                      color={colors.text.muted}
                    />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={{alignItems: 'center', padding: 5}}
                  activeOpacity={0.9}
                  onPress={() => onEdit(filter)}>
                  <Ionicons
                    name="pencil-outline"
                    size={15}
                    color={colors.text.muted}
                  />
                </TouchableOpacity>
              </View>
            </View>
            {genreNames && (
              <View style={styles.genreContainer}>
                <Text style={styles.genreText} numberOfLines={1}>
                  {genreNames}
                </Text>
              </View>
            )}
          </View>

          {/* HorizontalList of filter search results */}
          <View style={styles.listContainer}>
            <View style={styles.filterContent}>
              {(() => {
                const blocks: React.ReactElement[] = [];

                blocks.push(<View style={{width: 15}} />);

                // Type block
                if (type) {
                  blocks.push(
                    <View style={styles.card}>
                      <Ionicons
                        name={
                          type === 'movie'
                            ? 'film-outline'
                            : type === 'tv'
                            ? 'tv-outline'
                            : 'apps-outline'
                        }
                        size={15}
                        color={colors.text.primary}
                      />
                      <Text style={styles.cardText} numberOfLines={1}>
                        {type?.charAt(0).toUpperCase() + type?.slice(1)}
                      </Text>
                    </View>,
                  );
                }

                if (sortBy) {
                  blocks.push(
                    <View style={styles.card}>
                      <Ionicons
                        name={sortOrder === 'desc' ? 'arrow-down' : 'arrow-up'}
                        size={15}
                        color={colors.text.primary}
                      />
                      <Text style={styles.cardText} numberOfLines={1}>
                        {sortBy.toString()}
                      </Text>
                    </View>,
                  );
                }
                if (rating) {
                  blocks.push(
                    <View style={styles.card}>
                      <Ionicons
                        name="star"
                        size={15}
                        color={colors.text.primary}
                      />
                      <Text style={styles.cardText} numberOfLines={1}>
                        {rating.toString()}
                      </Text>
                    </View>,
                  );
                }

                // Language
                if (language) {
                  blocks.push(
                    <View style={styles.card}>
                      <Ionicons
                        name="language"
                        size={15}
                        color={colors.text.primary}
                      />
                      <Text style={styles.cardText} numberOfLines={1}>
                        {language?.name || language?.english_name}
                      </Text>
                    </View>,
                  );
                }

                // Years
                if (fromYear) {
                  blocks.push(
                    <View style={styles.card}>
                      <Ionicons
                        name="calendar-outline"
                        size={15}
                        color={colors.text.primary}
                      />
                      <Text style={styles.cardText} numberOfLines={1}>
                        {fromYear}
                      </Text>
                    </View>,
                  );
                }
                if (toYear) {
                  blocks.push(
                    <View style={styles.card}>
                      <Text style={styles.cardText} numberOfLines={1}>
                        {toYear}
                      </Text>
                      <Ionicons
                        name="calendar-outline"
                        size={15}
                        color={colors.text.primary}
                      />
                    </View>,
                  );
                }

                // Watch providers
                const provider = (filter?.params as any)
                  ?.with_watch_providers as string | undefined;
                if (provider && provider.trim().length > 0) {
                  const ids = provider
                    .split(/[,|]/)
                    .map(p => p.trim())
                    .filter(Boolean)
                    .map(rawId => String(parseInt(rawId, 10)));
                  const logos = ids
                    .map((id, idx) => ({
                      id,
                      key: `${filter.id}-prov-${idx}`,
                      path: providerLogoById[id] || null,
                    }))
                    .filter(x => !!x.path);

                  const count = logos.length;
                  if (count === 0) {
                    // fallback to icon-only if no logos resolved
                    blocks.push(
                      <View style={styles.card}>
                        <Ionicons
                          name="play"
                          size={20}
                          color={colors.text.secondary}
                        />
                      </View>,
                    );
                  } else if (count === 1) {
                    blocks.push(
                      <View style={styles.card}>
                        <Image
                          key={logos[0].key}
                          source={{
                            uri: getOptimizedImageUrl(
                              logos[0].path as string,
                              'small',
                            ),
                          }}
                          style={styles.providerIconLarge}
                          resizeMode="contain"
                          accessibilityLabel={`Provider ${logos[0].id}`}
                        />
                      </View>,
                    );
                  } else if (count <= 4) {
                    blocks.push(
                      <View style={styles.card}>
                        <View style={styles.providerGrid}>
                          <View style={styles.providerRow}>
                            {logos.slice(0, Math.min(2, count)).map(l => (
                              <Image
                                key={l.key}
                                source={{
                                  uri: getOptimizedImageUrl(
                                    l.path as string,
                                    'small',
                                  ),
                                }}
                                style={styles.providerIconGrid}
                                resizeMode="contain"
                                accessibilityLabel={`Provider ${l.id}`}
                              />
                            ))}
                          </View>
                          <View style={styles.providerRow}>
                            {logos.slice(2, Math.min(4, count)).map(l => (
                              <Image
                                key={l.key}
                                source={{
                                  uri: getOptimizedImageUrl(
                                    l.path as string,
                                    'small',
                                  ),
                                }}
                                style={styles.providerIconGrid}
                                resizeMode="contain"
                                accessibilityLabel={`Provider ${l.id}`}
                              />
                            ))}
                          </View>
                        </View>
                      </View>,
                    );
                  } else {
                    // More than 4: extend horizontally with 2 rows, repeating pattern
                    const top = logos.filter((_, i) => i % 2 === 0);
                    const bottom = logos.filter((_, i) => i % 2 === 1);
                    blocks.push(
                      <View style={[styles.card, styles.providerCardDynamic]}>
                        <View style={styles.providerGridDynamic}>
                          <View style={styles.providerRow}>
                            {top.map(l => (
                              <Image
                                key={`top-${l.key}`}
                                source={{
                                  uri: getOptimizedImageUrl(
                                    l.path as string,
                                    'small',
                                  ),
                                }}
                                style={styles.providerIconGrid}
                                resizeMode="contain"
                                accessibilityLabel={`Provider ${l.id}`}
                              />
                            ))}
                          </View>
                          <View style={styles.providerRow}>
                            {bottom.map(l => (
                              <Image
                                key={`bot-${l.key}`}
                                source={{
                                  uri: getOptimizedImageUrl(
                                    l.path as string,
                                    'small',
                                  ),
                                }}
                                style={styles.providerIconGrid}
                                resizeMode="contain"
                                accessibilityLabel={`Provider ${l.id}`}
                              />
                            ))}
                          </View>
                        </View>
                      </View>,
                    );
                  }

                  blocks.push(<View style={{width: 25}} />);
                }

                // Render as horizontal FlatList
                return (
                  <FlatList
                    data={blocks}
                    keyExtractor={(_, idx) => `${filter.id}-chip-${idx}`}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{gap: spacing.sm}}
                    renderItem={({item}) => item}
                  />
                );
              })()}
            </View>
            {flattenedData?.length > 0 ? (
              <HorizontalList
                title={''}
                data={flattenedData}
                isLoading={isFetchingNextFilterPage}
                onItemPress={handleItemPress}
                onEndReached={
                  hasNextFilterPage ? fetchNextFilterPage : undefined
                }
                isSeeAll={false}
                isFilter={true}
                isHeadingSkeleton={false}
              />
            ) : (
              <View style={{marginTop: spacing.lg, marginLeft: spacing.sm}}>
                <HorizontalListSkeleton />
              </View>
            )}
            <LinearGradient
              colors={['transparent', colors.background.primary]}
              pointerEvents="none"
              style={{
                width: '100%',
                height: 200,
                position: 'absolute',
                bottom: 20,
                zIndex: 1,
                opacity: 0.9,
              }}
            />
          </View>
        </View>

        {/* Poster Preview Modal (matches Watchlists) */}
        <Modal
          visible={showPosterModal}
          statusBarTranslucent
          navigationBarTranslucent
          animationType="fade"
          transparent
          onRequestClose={() => setShowPosterModal(false)}>
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.8)',
              alignItems: 'center',
              justifyContent: 'center',
              padding: spacing.md,
            }}>
            <View
              style={{
                width: '92%',
                borderRadius: borderRadius.lg,
                overflow: 'hidden',
                alignItems: 'center',
                padding: spacing.md,
              }}>
              {posterLoading ? (
                <View style={{padding: spacing.xl, alignItems: 'center'}}>
                  <ActivityIndicator size="large" color={colors.text.primary} />
                  <Text
                    style={{
                      marginTop: spacing.sm,
                      color: colors.text.secondary,
                      fontFamily: 'Inter_18pt-Regular',
                    }}>
                    Creating poster...
                  </Text>
                </View>
              ) : posterUri ? (
                <>
                  <Image
                    source={{uri: posterUri}}
                    style={{
                      width: 270,
                      height: 480,
                      borderRadius: borderRadius.md,
                      backgroundColor: '#000',
                    }}
                    resizeMode="cover"
                  />
                  <View
                    style={{
                      marginTop: spacing.md,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.lg,
                    }}>
                    <TouchableOpacity
                      onPress={handleSharePoster}
                      style={{alignItems: 'center'}}>
                      <Ionicons
                        name="share-social-outline"
                        size={22}
                        color={colors.text.primary}
                      />
                      <Text
                        style={{
                          color: colors.text.secondary,
                          marginTop: 4,
                          fontFamily: 'Inter_18pt-Regular',
                        }}>
                        Share
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={async () => {
                        try {
                          await Clipboard.setString(importCodeForFilter);
                        } catch {}
                      }}
                      style={{alignItems: 'center'}}>
                      <Ionicons
                        name="copy-outline"
                        size={22}
                        color={colors.text.primary}
                      />
                      <Text
                        style={{
                          color: colors.text.secondary,
                          marginTop: 4,
                          fontFamily: 'Inter_18pt-Regular',
                        }}>
                        Copy code
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setShowPosterModal(false)}
                      style={{alignItems: 'center'}}>
                      <Ionicons
                        name="close-circle-outline"
                        size={22}
                        color={colors.text.primary}
                      />
                      <Text
                        style={{
                          color: colors.text.secondary,
                          marginTop: 4,
                          fontFamily: 'Inter_18pt-Regular',
                        }}>
                        Close
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <View style={{padding: spacing.lg}}>
                  <Text
                    style={{
                      color: colors.text.secondary,
                      fontFamily: 'Inter_18pt-Regular',
                    }}>
                    Failed to create poster.
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  return (
    <View style={{flex: 1}}>
      <Animated.View style={[styles.header, animatedHeaderStyle]}>
        <View
          style={[
            StyleSheet.absoluteFill,
            {backgroundColor: 'rgba(0, 0, 0, 0.7)'},
          ]}
          pointerEvents="none"
        />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 1,
          }}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.goBack()}>
            <Ionicons
              name="chevron-back-outline"
              size={24}
              color={colors.text.primary}
            />
          </TouchableOpacity>
          <Text style={styles.title}>My Filters</Text>
          <View style={styles.addRow}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.addButton}
              onPress={() => setShowImportModal(true)}>
              <Ionicons
                name="download-outline"
                size={22}
                color={colors.text.primary}
              />
            </TouchableOpacity>
            {savedFilters.length > 0 && (
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.addButton}
                onPress={() => setShowAddModal(true)}>
                <Ionicons name="add" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Animated.View>
      <Animated.ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{nativeEvent: {contentOffset: {y: scrollY}}}],
          {useNativeDriver: false},
        )}>
        {isLoading ? (
          <View>
            <HorizontalListSkeleton />
          </View>
        ) : savedFilters.length > 0 ? (
          <View style={styles.content}>
            {savedFilters.map(filter => (
              <MyFilterItemWithResults
                key={filter.id}
                filter={filter}
                allGenres={allGenres}
                onEdit={setEditingFilter}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyStateTitle}>No Filters Yet</Text>
            <Text style={styles.emptyStateText}>
              Create your first filter to apply on the search
            </Text>
            <CreateButton
              onPress={() => setShowAddModal(true)}
              title="Create Your First Filter"
              icon="add"
            />
          </View>
        )}
        <MyFiltersModal
          visible={showAddModal || !!editingFilter}
          onClose={() => {
            setShowAddModal(false);
            setEditingFilter(null);
          }}
          onSave={handleSaveFilter}
          editingFilter={editingFilter}
          onDelete={handleDelete}
        />
        {/* Import Filter Modal (UI mirrored from Watchlists) */}
        <Modal
          visible={showImportModal}
          animationType="slide"
          statusBarTranslucent={true}
          transparent={true}
          onRequestClose={() => setShowImportModal(false)}>
          <View style={styles.modalContainer}>
            <View style={styles.importModalContent}>
              <MaybeBlurView
                style={[
                  {
                    flex: 1,
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: 0,
                    right: 0,
                  },
                ]}
                blurType="dark"
                blurAmount={10}
                overlayColor={colors.modal.blurDark}
                dialog
                radius={20}
              />
              <View style={modalStyles.modalHeader}>
                <Text style={modalStyles.modalTitle}>Import Filter</Text>
                <TouchableOpacity onPress={() => setShowImportModal(false)}>
                  <Ionicons
                    name="close"
                    size={24}
                    color={colors.text.primary}
                  />
                </TouchableOpacity>
              </View>
              <View style={{padding: spacing.md}}>
                <Text style={modalStyles.sectionTitle}>Paste Code</Text>
                <TextInput
                  style={[
                    modalStyles.input,
                    {height: 100, marginTop: spacing.sm},
                  ]}
                  value={importCode}
                  onChangeText={setImportCode}
                  placeholder="THTRF:..."
                  placeholderTextColor={colors.text.muted}
                  multiline
                />
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: spacing.md,
                    gap: spacing.md,
                    width: isTablet ? '50%' : '100%',
                  }}>
                  <TouchableOpacity
                    style={[modalStyles.footerButton, modalStyles.resetButton]}
                    onPress={() => setShowImportModal(false)}>
                    <Text style={modalStyles.resetButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[modalStyles.footerButton, modalStyles.applyButton]}
                    onPress={handleImportFilterSubmit}
                    disabled={isImporting}>
                    {isImporting ? (
                      <ActivityIndicator color={colors.background.primary} />
                    ) : (
                      <Text style={modalStyles.applyButtonText}>Import</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      </Animated.ScrollView>
    </View>
  );
};
