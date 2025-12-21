import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Animated,
  ActivityIndicator,
  Modal,
  FlatList,
  TextInput,
  Clipboard,
  Alert,
  Easing,
  useWindowDimensions,
} from 'react-native';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {SavedFilter, SORT_OPTIONS} from '../types/filters';
import {FiltersManager} from '../store/filters';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {MyFiltersModal} from '../components/MyFiltersModal';
import LinearGradient from 'react-native-linear-gradient';
import languageData from '../utils/language.json';
import {Genre} from '../types/movie';
import {useGenres} from '../hooks/useGenres';
import {
  getOptimizedImageUrl,
  getAvailableWatchProviders,
  getPersonById,
} from '../services/tmdb';
import {HorizontalListSkeleton} from '../components/LoadingSkeleton';
import CreateButton from '../components/createButton';
import {HorizontalList} from '../components/HorizontalList';
import {useSavedFilterContent} from '../hooks/useApp';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {BlurView} from '@react-native-community/blur';
import ShareLib from 'react-native-share';

import {useResponsive} from '../hooks/useResponsive';
import {requestPosterCapture} from '../components/PosterCaptureHost';
import {generateFilterCode, parseFilterCode} from '../utils/shareCode';
import {ContentItem} from '../components/MovieList';
import {MaybeBlurView} from '../components/MaybeBlurView';
import {GradientButton} from '../components/GradientButton';
import {BlurPreference} from '../store/blurPreference';
import {QuickAddFilters} from '../components/QuickAddFilters';
import {AIFilterCreator} from '../components/AIFilterCreator';
import {ReorderFiltersModal} from '../components/ReorderFiltersDialog';

const {width, height} = useWindowDimensions();

export const MyFiltersScreen = () => {
  const queryClient = useQueryClient();
  const [showImportModal, setShowImportModal] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [showAICreator, setShowAICreator] = useState(false);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [editingFilter, setEditingFilter] = useState<SavedFilter | null>(null);
  const [editingFilterSection, setEditingFilterSection] = useState<
    string | undefined
  >(undefined);
  const [deletingFilter, setDeletingFilter] = useState<SavedFilter | null>(
    null,
  );
  const navigation = useNavigation();
  const {isTablet, orientation} = useResponsive();
  const todayStr = React.useMemo(
    () => new Date().toISOString().split('T')[0],
    [],
  );
  const themeMode = BlurPreference.getMode();
  const isSolid = themeMode === 'normal';

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

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingFilter) return;
    try {
      await FiltersManager.deleteFilter(deletingFilter.id);
      queryClient.invalidateQueries({queryKey: ['savedFilters']});
      setDeletingFilter(null);
    } catch (error) {
      console.error('Error deleting filter:', error);
    }
  }, [deletingFilter, queryClient]);

  const handleReorder = useCallback(
    async (reorderedFilters: SavedFilter[]) => {
      try {
        await FiltersManager.reorderFilters(reorderedFilters.map(f => f.id));
        queryClient.invalidateQueries({queryKey: ['savedFilters']});
      } catch (error) {
        console.error('Error reordering filters:', error);
        Alert.alert('Error', 'Failed to reorder filters');
      }
    },
    [queryClient],
  );

  // Quick add filters: create a filter in one tap
  const handleQuickAdd = useCallback(
    async (
      name: string,
      params: Record<string, any>,
      type: 'movie' | 'tv' | 'all' = 'tv',
    ) => {
      try {
        await FiltersManager.saveFilter(name, params as any, type);
        queryClient.invalidateQueries({queryKey: ['savedFilters']});
      } catch (e) {}
    },
    [queryClient],
  );

  // Use cached genres hooks
  const {data: movieGenres = []} = useGenres('movie');
  const {data: tvGenres = []} = useGenres('tv');

  // Combine and deduplicate genres
  const allGenres = React.useMemo(() => {
    const combined = [...movieGenres, ...tvGenres];
    return combined.filter(
      (genre, index, self) => index === self.findIndex(t => t.id === genre.id),
    );
  }, [movieGenres, tvGenres]);

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
      marginTop: 60,
    },
    title: {
      textAlign: 'left',
      color: colors.text.primary,
      ...typography.h2,
      paddingHorizontal: spacing.md,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.modal.blur,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: colors.modal.header,
      opacity: 0.8,
      gap: 8,
    },
    actionButtonText: {
      color: colors.text.primary,
      ...typography.button,
      fontSize: 14,
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    importModalContent: {
      width: '90%',
      backgroundColor: colors.modal.active,
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      paddingBottom: spacing.md,
    },
    addRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
      height: 40,
      width: 40,
      zIndex: 1,
    },
    content: {
      paddingHorizontal: spacing.md,
      paddingTop: 160, // Increased for taller header
      paddingBottom: 150,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: '25%',
      paddingBottom: 200,
    },
    emptyStateTitle: {
      ...typography.h3,
      color: colors.text.primary,
      marginBottom: spacing.sm,
      marginTop: -100,
    },
    modalTitle: {
      ...typography.h3,
      color: colors.text.primary,
    },
    emptyStateText: {
      ...typography.body1,
      color: colors.text.secondary,
      textAlign: 'center',
      maxWidth: isTablet ? '70%' : '90%',
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
      flex: 1,
    },
    card: {
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      backgroundColor: colors.modal.blur,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: colors.modal.header,
      opacity: 0.8,
      width: 72,
      height: 72,
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
      height: 35,
      paddingHorizontal: spacing.lg,
    },
    cardText: {
      color: '#9CA3AF',
      ...typography.caption,
      fontSize: 11,
      textAlign: 'center',
      fontWeight: '500',
    },
    genreContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.xs,
      paddingHorizontal: 2,
      width: '100%',
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
      width: 'auto',
      minWidth: 80,
      paddingHorizontal: spacing.xs,
    },
    providerGridDynamic: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
    },

    iconBox: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 2,
    },
  });

  const MyFilterItemWithResults = ({
    filter,
    allGenres,
    onEdit,
  }: {
    filter: SavedFilter;
    allGenres: Genre[];
    onEdit: (f: SavedFilter, section?: string) => void;
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
      ?.split('|')
      .map(id => {
        const genreId = parseInt(id.trim());
        return allGenres.find(genre => genre.id === genreId)?.name;
      })
      .filter(Boolean) // Remove undefined values
      .join(', ');
    const fromDate =
      filter?.params?.['primary_release_date.gte'] ||
      filter?.params?.['first_air_date.gte'];
    const toDate =
      filter?.params?.['primary_release_date.lte'] ||
      filter?.params?.['first_air_date.lte'];
    const fromYear = fromDate ? new Date(fromDate).getFullYear() : null;
    const toYear = toDate ? new Date(toDate).getFullYear() : null;

    // Additional params extraction
    const runtimeGte = filter?.params?.with_runtime_gte;
    const runtimeLte = filter?.params?.with_runtime_lte;
    const certification = filter?.params?.certification;
    const voteCountGte = filter?.params?.['vote_count.gte'];
    const voteCountLte = filter?.params?.['vote_count.lte'];
    const castIds = filter?.params?.with_cast
      ? filter.params.with_cast.split(',').filter(Boolean)
      : [];
    const castCount = castIds.length;
    const firstCastId = castIds[0] ? parseInt(castIds[0], 10) : null;

    const crewIds = filter?.params?.with_crew
      ? filter.params.with_crew.split(',').filter(Boolean)
      : [];
    const crewCount = crewIds.length;
    const firstCrewId = crewIds[0] ? parseInt(crewIds[0], 10) : null;

    // Fetch First Cast Name
    const {data: firstCastPerson} = useQuery({
      queryKey: ['person', firstCastId],
      queryFn: () => getPersonById(firstCastId!),
      enabled: !!firstCastId,
      staleTime: 1000 * 60 * 60 * 24, // 24 hours
    });

    // Fetch First Crew Name
    const {data: firstCrewPerson} = useQuery({
      queryKey: ['person', firstCrewId],
      queryFn: () => getPersonById(firstCrewId!),
      enabled: !!firstCrewId,
      staleTime: 1000 * 60 * 60 * 24, // 24 hours
    });
    const keywordCount = filter?.params?.with_keywords
      ? filter.params.with_keywords.split(',').filter(Boolean).length
      : 0;
    const companyCount = filter?.params?.with_companies
      ? filter.params.with_companies.split(',').filter(Boolean).length
      : 0;
    const networkCount = filter?.params?.with_networks
      ? filter.params.with_networks.split(',').filter(Boolean).length
      : 0;
    const releaseTypeCount = filter?.params?.with_release_type
      ? filter.params.with_release_type.split('|').filter(Boolean).length
      : 0;

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
          vote_count: item.vote_count || 0,
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
        setShowPosterModal(false);
      } finally {
        setPosterLoading(false);
      }
    };

    const handleSharePoster = useCallback(async () => {
      if (!posterUri) return;
      try {
        await ShareLib.open({url: posterUri, type: 'image/png'});
      } catch (e) {}
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
              <Text style={styles.filterName} numberOfLines={1}>
                {filter.name}
              </Text>
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
                <TouchableOpacity
                  style={{alignItems: 'center', padding: 5, marginLeft: 6}}
                  activeOpacity={0.9}
                  onPress={() => setDeletingFilter(filter)}>
                  <Ionicons
                    name="trash-outline"
                    size={15}
                    color={colors.text.muted}
                  />
                </TouchableOpacity>
              </View>
            </View>
            {genreNames && (
              <View style={[styles.genreContainer, {minHeight: 20}]}>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.genreText,
                    {flex: 1, flexWrap: 'wrap', lineHeight: 18},
                  ]}>
                  {genreNames}
                </Text>
              </View>
            )}
          </View>

          {/* HorizontalList of filter search results */}
          <View style={styles.listContainer}>
            <ScrollView
              style={{
                paddingHorizontal: spacing.md,
                marginTop: 10,
              }}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{gap: spacing.sm, paddingLeft: 15}}>
              {/* Type */}
              {type && (
                <TouchableOpacity
                  onPress={() => onEdit(filter, 'type')}
                  style={styles.card}>
                  <View style={styles.iconBox}>
                    <Ionicons
                      name={
                        type === 'movie'
                          ? 'film-outline'
                          : type === 'tv'
                          ? 'tv-outline'
                          : 'apps-outline'
                      }
                      size={20}
                      color={colors.text.primary}
                    />
                  </View>
                  <Text style={styles.cardText} numberOfLines={1}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Sort */}
              {sortBy && (
                <TouchableOpacity
                  onPress={() => onEdit(filter, 'sort')}
                  style={styles.card}>
                  <View style={styles.iconBox}>
                    <Ionicons
                      name="swap-vertical-outline"
                      size={20}
                      color={colors.text.primary}
                    />
                  </View>
                  <Text style={styles.cardText} numberOfLines={1}>
                    {SORT_OPTIONS.find(
                      opt => opt.value === filter?.params?.sort_by,
                    )?.label || 'Sort'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Rating */}
              {rating && (
                <TouchableOpacity
                  onPress={() => onEdit(filter, 'rating')}
                  style={styles.card}>
                  <View style={styles.iconBox}>
                    <Ionicons
                      name="star"
                      size={20}
                      color={colors.text.primary}
                    />
                  </View>
                  <Text style={styles.cardText} numberOfLines={1}>
                    {rating}+
                  </Text>
                </TouchableOpacity>
              )}

              {/* Language */}
              {language && (
                <TouchableOpacity
                  onPress={() => onEdit(filter, 'language')}
                  style={styles.card}>
                  <View style={styles.iconBox}>
                    <Ionicons
                      name="language"
                      size={20}
                      color={colors.text.primary}
                    />
                  </View>
                  <Text style={styles.cardText} numberOfLines={1}>
                    {language.name || language.english_name}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Year */}
              {(fromYear || toYear) && (
                <TouchableOpacity
                  onPress={() => onEdit(filter, 'year')}
                  style={styles.card}>
                  <View style={styles.iconBox}>
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color={colors.text.primary}
                    />
                  </View>
                  <Text style={styles.cardText} numberOfLines={1}>
                    {fromYear && toYear
                      ? `${fromYear}-${toYear}`
                      : fromYear
                      ? `${fromYear}+`
                      : `<${toYear}`}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Runtime */}
              {(runtimeGte || runtimeLte) && (
                <TouchableOpacity
                  onPress={() => onEdit(filter, 'runtime')}
                  style={styles.card}>
                  <View style={styles.iconBox}>
                    <Ionicons
                      name="time-outline"
                      size={20}
                      color={colors.text.primary}
                    />
                  </View>
                  <Text style={styles.cardText} numberOfLines={1}>
                    {runtimeGte && runtimeLte
                      ? `${runtimeGte}-${runtimeLte}m`
                      : runtimeGte
                      ? `>${runtimeGte}m`
                      : `<${runtimeLte}m`}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Certification */}
              {certification && (
                <TouchableOpacity
                  onPress={() => onEdit(filter, 'certification')}
                  style={styles.card}>
                  <View style={styles.iconBox}>
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={20}
                      color={colors.text.primary}
                    />
                  </View>
                  <Text style={styles.cardText} numberOfLines={1}>
                    {certification}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Vote Count */}
              {(voteCountGte || voteCountLte) && (
                <TouchableOpacity
                  onPress={() => onEdit(filter, 'rating')}
                  style={styles.card}>
                  <View style={styles.iconBox}>
                    <Ionicons
                      name="stats-chart-outline"
                      size={20}
                      color={colors.text.primary}
                    />
                  </View>
                  <Text style={styles.cardText} numberOfLines={1}>
                    {voteCountGte ? `>${voteCountGte}` : `<${voteCountLte}`}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Cast */}
              {castCount > 0 && (
                <TouchableOpacity
                  onPress={() => onEdit(filter, 'cast')}
                  style={styles.card}>
                  <View style={styles.iconBox}>
                    <Ionicons
                      name="people-outline"
                      size={20}
                      color={colors.text.primary}
                    />
                  </View>
                  <Text style={styles.cardText} numberOfLines={1}>
                    {firstCastPerson?.name || 'Cast'}
                    {castCount > 1 ? ` +${castCount - 1}` : ''}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Crew */}
              {crewCount > 0 && (
                <TouchableOpacity
                  onPress={() => onEdit(filter, 'crew')}
                  style={styles.card}>
                  <View style={styles.iconBox}>
                    <Ionicons
                      name="videocam-outline"
                      size={20}
                      color={colors.text.primary}
                    />
                  </View>
                  <Text style={styles.cardText} numberOfLines={1}>
                    {firstCrewPerson?.name || 'Crew'}
                    {crewCount > 1 ? ` +${crewCount - 1}` : ''}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Keywords */}
              {keywordCount > 0 && (
                <TouchableOpacity
                  onPress={() => onEdit(filter, 'keywords')}
                  style={styles.card}>
                  <View style={styles.iconBox}>
                    <Ionicons
                      name="key-outline"
                      size={20}
                      color={colors.text.primary}
                    />
                  </View>
                  <Text style={styles.cardText} numberOfLines={1}>
                    {keywordCount} Keys
                  </Text>
                </TouchableOpacity>
              )}

              {/* Companies */}
              {companyCount > 0 && (
                <TouchableOpacity
                  onPress={() => onEdit(filter, 'companies')}
                  style={styles.card}>
                  <View style={styles.iconBox}>
                    <Ionicons
                      name="business-outline"
                      size={14}
                      color={colors.text.primary}
                    />
                  </View>
                  <Text style={styles.cardText} numberOfLines={1}>
                    {companyCount} Corps
                  </Text>
                </TouchableOpacity>
              )}

              {/* Networks */}
              {networkCount > 0 && (
                <TouchableOpacity
                  onPress={() => onEdit(filter, 'networks')}
                  style={styles.card}>
                  <View style={styles.iconBox}>
                    <Ionicons
                      name="desktop-outline"
                      size={14}
                      color={colors.text.primary}
                    />
                  </View>
                  <Text style={styles.cardText} numberOfLines={1}>
                    {networkCount} nets
                  </Text>
                </TouchableOpacity>
              )}

              {/* Release Type */}
              {releaseTypeCount > 0 && (
                <TouchableOpacity
                  onPress={() => onEdit(filter, 'release_type')}
                  style={styles.card}>
                  <View style={styles.iconBox}>
                    <Ionicons
                      name="calendar-number-outline"
                      size={14}
                      color={colors.text.primary}
                    />
                  </View>
                  <Text style={styles.cardText} numberOfLines={1}>
                    {releaseTypeCount} Types
                  </Text>
                </TouchableOpacity>
              )}

              {/* Watch Providers */}
              {(() => {
                const provider = (filter?.params as any)
                  ?.with_watch_providers as string | undefined;
                if (!provider || provider.trim().length === 0) return null;

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

                if (logos.length === 0) return null;

                return (
                  <TouchableOpacity
                    onPress={() => onEdit(filter, 'providers')}
                    style={styles.card}>
                    <View
                      style={[
                        styles.iconBox,
                        {
                          width: 'auto',
                          paddingHorizontal: 4,
                          gap: 4,
                          flexDirection: 'row',
                        },
                      ]}>
                      {logos.slice(0, 3).map(l => (
                        <Image
                          key={l.key}
                          source={{
                            uri: getOptimizedImageUrl(
                              l.path as string,
                              'small',
                            ),
                          }}
                          style={{width: 14, height: 14, borderRadius: 4}}
                          resizeMode="contain"
                        />
                      ))}
                      {logos.length > 3 && (
                        <Text
                          style={{
                            // ...typography.caption, // Assuming typography is defined elsewhere
                            fontSize: 10,
                            color: colors.text.secondary,
                          }}>
                          +{logos.length - 3}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.cardText} numberOfLines={1}>
                      Providers
                    </Text>
                  </TouchableOpacity>
                );
              })()}
              <View style={{width: 32}} />
            </ScrollView>
            {flattenedData?.length > 0 ? (
              <HorizontalList
                title={''}
                data={flattenedData}
                isLoading={isFetchingNextFilterPage}
                onItemPress={handleItemPress}
                isSeeAll={false}
                onEndReached={
                  hasNextFilterPage ? fetchNextFilterPage : undefined
                }
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
      <LinearGradient
        colors={[
          colors.background.primary,
          colors.background.primary,
          'transparent',
        ]}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: 250,
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />
      <View style={styles.header}>
        <Text style={styles.title}>My Filters</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{gap: 8, paddingHorizontal: spacing.md}}
          style={{marginTop: 12}}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowAddModal(true)}>
            <Ionicons name="add" size={18} color={colors.text.primary} />
            <Text style={styles.actionButtonText}>New</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowQuickAddModal(true)}>
            <Ionicons name="flash" size={14} color={colors.text.primary} />
            <Text style={styles.actionButtonText}>Quick Add</Text>
          </TouchableOpacity>

          {savedFilters.length > 1 && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowReorderModal(true)}>
              <Ionicons
                name="swap-vertical"
                size={16}
                color={colors.text.primary}
              />
              <Text style={styles.actionButtonText}>Reorder</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowImportModal(true)}>
            <Ionicons
              name="download-outline"
              size={16}
              color={colors.text.primary}
            />
            <Text style={styles.actionButtonText}>Import</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

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
          <>
            <View style={styles.content}>
              {savedFilters.map(filter => (
                <MyFilterItemWithResults
                  key={filter.id}
                  filter={filter}
                  allGenres={allGenres}
                  onEdit={(f, section) => {
                    setEditingFilter(f);
                    setEditingFilterSection(section);
                    setShowAddModal(true);
                  }}
                />
              ))}
            </View>
            <View style={{height: 200}} />
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Image
              source={require('../assets/MyFiltersPoster.png')}
              style={{width: width * 0.6, height: height * 0.5}}
              resizeMode="contain"
            />
            <Text style={styles.emptyStateTitle}>No Filters Yet</Text>
            <Text style={styles.emptyStateText}>
              Save your favorite search filters here.
            </Text>
            <GradientButton
              onPress={() => setShowAddModal(true)}
              title="Create Your First Filter"
              isIcon={false}
              style={{
                borderRadius: borderRadius.round,
                marginVertical: spacing.lg,
              }}
            />
            <QuickAddFilters
              onQuickAdd={handleQuickAdd}
              onAISave={handleSaveFilter}
              onOpenAICreator={() => setShowAICreator(true)}
            />
          </View>
        )}
      </Animated.ScrollView>

      <ReorderFiltersModal
        visible={showReorderModal}
        onClose={() => setShowReorderModal(false)}
        filters={savedFilters}
        onReorder={handleReorder}
      />

      <MyFiltersModal
        visible={showAddModal || !!editingFilter}
        onClose={() => {
          setShowAddModal(false);
          setEditingFilter(null);
          setEditingFilterSection(undefined);
        }}
        onSave={handleSaveFilter}
        editingFilter={editingFilter}
        initialScrollSection={editingFilterSection}
        onDelete={id => {
          setShowAddModal(false);
          setEditingFilter(null);
          setDeletingFilter(savedFilters.find(f => f.id === id) || null);
        }}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        visible={!!deletingFilter}
        backdropColor={isSolid ? 'rgba(0, 0, 0, 0.8)' : colors.modal.blurDark}
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setDeletingFilter(null)}>
        {!isSolid && (
          <BlurView
            blurType="dark"
            blurAmount={10}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
        )}
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <View
            style={{
              width: isTablet ? '40%' : '85%',
              borderRadius: borderRadius.xl,
              overflow: 'hidden',
            }}>
            {isSolid ? (
              <LinearGradient
                colors={['rgba(111, 111, 111, 0.42)', 'rgba(20, 20, 20, 0.7)']}
                start={{x: 1, y: 0}}
                end={{x: 1, y: 1}}
                style={{
                  borderRadius: borderRadius.xl,
                }}>
                <View
                  style={{
                    padding: spacing.xl,
                    backgroundColor: 'black',
                    borderWidth: 1.5,
                    borderColor: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: borderRadius.xl,
                  }}>
                  <Text
                    style={{
                      ...typography.h2,
                      color: colors.text.primary,
                      marginBottom: spacing.sm,
                      textAlign: 'center',
                    }}>
                    Delete Filter?
                  </Text>
                  <Text
                    style={{
                      ...typography.body2,
                      color: colors.text.secondary,
                      textAlign: 'center',
                      marginBottom: spacing.xl,
                    }}>
                    Are you sure you want to delete "{deletingFilter?.name}"?
                    This action cannot be undone.
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      gap: spacing.md,
                      width: '100%',
                    }}>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        padding: spacing.md,
                        borderRadius: borderRadius.round,
                        alignItems: 'center',
                        backgroundColor: colors.modal.content,
                      }}
                      onPress={() => setDeletingFilter(null)}>
                      <Text
                        style={{
                          color: colors.text.primary,
                          ...typography.button,
                        }}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        padding: spacing.md,
                        borderRadius: borderRadius.round,
                        alignItems: 'center',
                        backgroundColor: '#ef4444',
                      }}
                      onPress={handleConfirmDelete}>
                      <Text
                        style={{
                          color: colors.text.primary,
                          ...typography.button,
                        }}>
                        Delete
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <LinearGradient
                  colors={['transparent', 'rgba(0, 0, 0, 0.5)']}
                  style={{
                    position: 'absolute',
                    right: 0,
                    height: isTablet ? '150%' : '100%',
                    width: '180%',
                    transform: [{rotate: isTablet ? '-10deg' : '-20deg'}],
                    left: isTablet ? '-30%' : '-50%',
                    bottom: isTablet ? '-20%' : '-30%',
                    pointerEvents: 'none',
                  }}
                />
              </LinearGradient>
            ) : (
              <View
                style={{
                  padding: spacing.xl,
                  backgroundColor: colors.modal.blur,
                  borderRadius: borderRadius.xl,
                  borderTopWidth: 1,
                  borderLeftWidth: 1,
                  borderRightWidth: 1,
                  borderColor: colors.modal.content,
                }}>
                <Text
                  style={{
                    ...typography.h2,
                    color: colors.text.primary,
                    marginBottom: spacing.sm,
                    textAlign: 'center',
                  }}>
                  Delete Filter?
                </Text>
                <Text
                  style={{
                    ...typography.body2,
                    color: colors.text.secondary,
                    textAlign: 'center',
                    marginBottom: spacing.xl,
                  }}>
                  Are you sure you want to delete "{deletingFilter?.name}"? This
                  action cannot be undone.
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    gap: spacing.md,
                    width: '100%',
                  }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      padding: spacing.md,
                      borderRadius: borderRadius.round,
                      alignItems: 'center',
                      backgroundColor: colors.modal.content,
                    }}
                    onPress={() => setDeletingFilter(null)}>
                    <Text
                      style={{
                        color: colors.text.primary,
                        ...typography.button,
                      }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      padding: spacing.md,
                      borderRadius: borderRadius.round,
                      alignItems: 'center',
                      backgroundColor: '#ef4444',
                    }}
                    onPress={handleConfirmDelete}>
                    <Text
                      style={{
                        color: colors.text.primary,
                        ...typography.button,
                      }}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Import Filter Modal */}
      <Modal
        visible={showImportModal}
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        backdropColor={isSolid ? 'rgba(0, 0, 0, 0.8)' : colors.modal.blurDark}
        onRequestClose={() => setShowImportModal(false)}>
        {!isSolid && (
          <BlurView
            blurType="dark"
            blurAmount={10}
            overlayColor="rgba(0, 0, 0, 0.5)"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
        )}
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <View
            style={{
              width: isTablet ? '40%' : '85%',
              borderRadius: borderRadius.xl,
              overflow: 'hidden',
            }}>
            {isSolid ? (
              <LinearGradient
                colors={['rgba(111, 111, 111, 0.42)', 'rgba(20, 20, 20, 0.7)']}
                start={{x: 1, y: 0}}
                end={{x: 1, y: 1}}
                style={{
                  borderRadius: borderRadius.xl,
                }}>
                <View
                  style={{
                    padding: spacing.xl,
                    backgroundColor: 'black',
                    borderWidth: 1.5,
                    borderColor: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: borderRadius.xl,
                  }}>
                  <Text
                    style={{
                      ...typography.h2,
                      color: colors.text.primary,
                      marginBottom: spacing.sm,
                      textAlign: 'center',
                    }}>
                    Import Filter
                  </Text>
                  <Text
                    style={{
                      ...typography.body2,
                      color: colors.text.secondary,
                      marginBottom: spacing.md,
                    }}>
                    Paste Code
                  </Text>
                  <TextInput
                    style={{
                      ...typography.body1,
                      backgroundColor: colors.modal.content,
                      borderWidth: 1,
                      borderColor: colors.modal.border,
                      borderRadius: borderRadius.md,
                      padding: spacing.md,
                      color: colors.text.primary,
                      height: 100,
                      textAlignVertical: 'top',
                      marginBottom: spacing.xl,
                    }}
                    value={importCode}
                    onChangeText={setImportCode}
                    placeholder="THTRF:..."
                    placeholderTextColor={colors.text.muted}
                    multiline
                  />
                  <View
                    style={{
                      flexDirection: 'row',
                      gap: spacing.md,
                      width: '100%',
                    }}>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        paddingVertical: spacing.md,
                        borderRadius: borderRadius.round,
                        alignItems: 'center',
                        backgroundColor: colors.modal.content,
                      }}
                      onPress={() => setShowImportModal(false)}>
                      <Text
                        style={{
                          color: colors.text.primary,
                          ...typography.button,
                        }}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{flex: 1, width: '100%'}}
                      onPress={handleImportFilterSubmit}
                      disabled={isImporting}
                      activeOpacity={0.8}>
                      <LinearGradient
                        colors={[colors.primary, colors.secondary]}
                        start={{x: 0, y: 0}}
                        end={{x: 1, y: 0}}
                        style={{
                          flex: 1,
                          padding: spacing.md,
                          borderRadius: borderRadius.round,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                        {isImporting ? (
                          <ActivityIndicator
                            size="small"
                            color={colors.text.primary}
                          />
                        ) : (
                          <Text
                            style={{
                              color: colors.text.primary,
                              ...typography.button,
                            }}>
                            Import
                          </Text>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
                <LinearGradient
                  colors={['transparent', 'rgba(0, 0, 0, 0.5)']}
                  style={{
                    position: 'absolute',
                    right: 0,
                    height: isTablet ? '150%' : '100%',
                    width: '180%',
                    transform: [{rotate: isTablet ? '-10deg' : '-20deg'}],
                    left: isTablet ? '-30%' : '-50%',
                    bottom: isTablet ? '-20%' : '-30%',
                    pointerEvents: 'none',
                  }}
                />
              </LinearGradient>
            ) : (
              <View
                style={{
                  padding: spacing.xl,
                  backgroundColor: colors.modal.blur,
                  borderRadius: borderRadius.xl,
                  borderTopWidth: 1,
                  borderLeftWidth: 1,
                  borderRightWidth: 1,
                  borderColor: colors.modal.content,
                }}>
                <Text
                  style={{
                    ...typography.h2,
                    color: colors.text.primary,
                    marginBottom: spacing.sm,
                    textAlign: 'center',
                  }}>
                  Import Filter
                </Text>
                <Text
                  style={{
                    ...typography.body2,
                    color: colors.text.secondary,
                    marginBottom: spacing.md,
                  }}>
                  Paste Code
                </Text>
                <TextInput
                  style={{
                    ...typography.body1,
                    backgroundColor: colors.modal.content,
                    borderWidth: 1,
                    borderColor: colors.modal.border,
                    borderRadius: borderRadius.md,
                    padding: spacing.md,
                    color: colors.text.primary,
                    height: 100,
                    textAlignVertical: 'top',
                    marginBottom: spacing.xl,
                  }}
                  value={importCode}
                  onChangeText={setImportCode}
                  placeholder="THTRF:..."
                  placeholderTextColor={colors.text.muted}
                  multiline
                />
                <View
                  style={{
                    flexDirection: 'row',
                    gap: spacing.md,
                    width: '100%',
                  }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      paddingVertical: spacing.md,
                      borderRadius: borderRadius.round,
                      alignItems: 'center',
                      backgroundColor: colors.modal.content,
                    }}
                    onPress={() => setShowImportModal(false)}>
                    <Text
                      style={{
                        color: colors.text.primary,
                        ...typography.button,
                      }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{flex: 1}}
                    onPress={handleImportFilterSubmit}
                    disabled={isImporting}
                    activeOpacity={0.8}>
                    <LinearGradient
                      colors={[colors.primary, colors.secondary]}
                      start={{x: 0, y: 0}}
                      end={{x: 1, y: 0}}
                      style={{
                        padding: spacing.md,
                        borderRadius: borderRadius.round,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      {isImporting ? (
                        <ActivityIndicator
                          size="small"
                          color={colors.text.primary}
                        />
                      ) : (
                        <Text
                          style={{
                            color: colors.text.primary,
                            ...typography.button,
                          }}>
                          Import
                        </Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
      <AIFilterCreator
        visible={showAICreator}
        onClose={() => setShowAICreator(false)}
        onSave={filter => {
          handleSaveFilter(filter);
          setShowAICreator(false);
        }}
      />

      {/* Quick Add Modal */}
      <Modal
        visible={showQuickAddModal}
        animationType="slide"
        backdropColor={colors.modal.blurDark}
        statusBarTranslucent={true}
        onRequestClose={() => setShowQuickAddModal(false)}>
        {!isSolid && (
          <BlurView
            blurType="dark"
            blurAmount={10}
            overlayColor={colors.modal.blurDark}
            style={{
              flex: 1,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
        )}
        <View
          style={{
            flex: 1,
            margin: isTablet ? spacing.xl : spacing.md,
            borderRadius: borderRadius.xl,
            backgroundColor: 'transparent',
          }}>
          <MaybeBlurView
            header
            style={[
              {
                marginTop: 20,
              },
            ]}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
              }}>
              <Ionicons name="flash" size={20} color={colors.text.muted} />
              <Text style={styles.modalTitle}>Quick Add</Text>
            </View>
            <View style={{flexDirection: 'row', gap: spacing.sm}}>
              <TouchableOpacity
                onPress={() => setShowAICreator(true)}
                style={{
                  padding: spacing.sm,
                  backgroundColor: colors.modal.blur,
                  borderRadius: borderRadius.round,
                  borderTopWidth: 1,
                  borderLeftWidth: 1,
                  borderRightWidth: 1,
                  borderColor: colors.modal.content,
                }}>
                <Ionicons name="sparkles" size={20} color={colors.accent} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowQuickAddModal(false)}
                style={{
                  padding: spacing.sm,
                  backgroundColor: colors.modal.blur,
                  borderRadius: borderRadius.round,
                  borderTopWidth: 1,
                  borderLeftWidth: 1,
                  borderRightWidth: 1,
                  borderColor: colors.modal.content,
                }}>
                <Ionicons name="close" size={20} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
          </MaybeBlurView>
          <MaybeBlurView body style={{flex: 1}}>
            <View style={{padding: spacing.md}}>
              <QuickAddFilters
                onQuickAdd={(name, params, type) => {
                  handleQuickAdd(name, params, type);
                  setShowQuickAddModal(false);
                }}
                onAISave={handleSaveFilter}
                hideHeader
                variant="large"
              />
            </View>
          </MaybeBlurView>
        </View>
      </Modal>
    </View>
  );
};
