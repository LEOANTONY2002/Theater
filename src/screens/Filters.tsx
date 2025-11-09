import React, {useCallback, useMemo, useState, useEffect} from 'react';
import {View, Text, StyleSheet, FlatList, TouchableOpacity} from 'react-native';
import {colors, spacing, typography} from '../styles/theme';
import {useQuery} from '@tanstack/react-query';
import {FiltersManager} from '../store/filters';
import {SavedFilter} from '../types/filters';
import {HorizontalList} from '../components/HorizontalList';
import {useNavigation} from '@react-navigation/native';
import {GradientButton} from '../components/GradientButton';
import {borderRadius} from '../styles/theme';
import {useQueryClient} from '@tanstack/react-query';
import {QuickAddFilters} from '../components/QuickAddFilters';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useSavedFilterContent} from '../hooks/useApp';
import {FiltersBanner} from '../components/FiltersBanner';
import {ContentItem} from '../components/MovieList';
import {
  BannerSkeleton,
  HeadingSkeleton,
  HorizontalListSkeleton,
} from '../components/LoadingSkeleton';
import FastImage from 'react-native-fast-image';
import {useResponsive} from '../hooks/useResponsive';

export const FiltersScreen = React.memo(() => {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [bannerContent, setBannerContent] = useState<ContentItem[]>([]);
  const {isTablet, orientation} = useResponsive();

  // Get real saved filters data
  const {data: savedFilters = [], isLoading} = useQuery({
    queryKey: ['savedFilters'],
    queryFn: FiltersManager.getSavedFilters,
  });

  // Define normalizeWithGenres first
  const normalizeWithGenres = useCallback((params: any) => {
    if (
      params?.with_genres &&
      typeof params.with_genres === 'string' &&
      params.with_genres.includes(',')
    ) {
      return {
        ...params,
        with_genres: params.with_genres.split(',').filter(Boolean).join('|'),
      };
    }
    return params;
  }, []);

  // Select up to 5 random filters for banner
  const bannerFilters = useMemo(() => {
    if (!savedFilters || savedFilters.length === 0) return [];
    const count = Math.min(5, savedFilters.length);
    const shuffled = [...savedFilters].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }, [savedFilters]);

  // Fetch content from up to 5 filters for banner (call hooks unconditionally)
  const filter1 = useSavedFilterContent(
    bannerFilters[0]
      ? {
          ...bannerFilters[0],
          params: normalizeWithGenres(bannerFilters[0].params),
        }
      : (null as any),
  );
  const filter2 = useSavedFilterContent(
    bannerFilters[1]
      ? {
          ...bannerFilters[1],
          params: normalizeWithGenres(bannerFilters[1].params),
        }
      : (null as any),
  );
  const filter3 = useSavedFilterContent(
    bannerFilters[2]
      ? {
          ...bannerFilters[2],
          params: normalizeWithGenres(bannerFilters[2].params),
        }
      : (null as any),
  );
  const filter4 = useSavedFilterContent(
    bannerFilters[3]
      ? {
          ...bannerFilters[3],
          params: normalizeWithGenres(bannerFilters[3].params),
        }
      : (null as any),
  );
  const filter5 = useSavedFilterContent(
    bannerFilters[4]
      ? {
          ...bannerFilters[4],
          params: normalizeWithGenres(bannerFilters[4].params),
        }
      : (null as any),
  );

  // Combine random content from each filter for banner
  useEffect(() => {
    const queries = [filter1, filter2, filter3, filter4, filter5];
    const allContent: ContentItem[] = [];
    const filterCount = bannerFilters.length;

    if (filterCount === 0) return;

    // Calculate how many items to take from each filter
    const itemsPerFilter = Math.ceil(5 / filterCount);

    queries.slice(0, filterCount).forEach((query, index) => {
      if (query.data?.pages?.[0]?.results) {
        const results = query.data.pages[0].results;
        const filterType = bannerFilters[index]?.type;
        if (results.length > 0) {
          // Pick random items from this filter's results
          const count = Math.min(itemsPerFilter, results.length);
          const shuffled = [...results].sort(() => Math.random() - 0.5);
          // Add metadata to track the filter type
          const itemsWithType = shuffled.slice(0, count).map(item => {
            // Determine actual type for each item
            let actualType: 'movie' | 'tv' = 'movie';
            if (filterType === 'tv') {
              actualType = 'tv';
            } else if (filterType === 'movie') {
              actualType = 'movie';
            } else {
              // filterType is 'all', detect from item properties
              actualType = (item as any).first_air_date ? 'tv' : 'movie';
            }

            return {
              ...item,
              _filterType: actualType,
            };
          });
          allContent.push(...itemsWithType);
        }
      }
    });

    // Limit to 5 items total and shuffle the final mix
    if (allContent.length > 0) {
      const finalContent = allContent
        .slice(0, 5)
        .sort(() => Math.random() - 0.5);
      setBannerContent(finalContent);
    }
  }, [
    filter1.data,
    filter2.data,
    filter3.data,
    filter4.data,
    filter5.data,
    bannerFilters.length,
    bannerFilters,
  ]);

  const handleQuickAdd = useCallback(
    async (name: string, params: any, type: 'movie' | 'tv' | 'all') => {
      try {
        await FiltersManager.saveFilter(name, params, type);
        queryClient.invalidateQueries({queryKey: ['savedFilters']});
      } catch (error) {
        console.error('Error saving filter:', error);
      }
    },
    [queryClient],
  );

  const handleAISave = useCallback(
    async (filter: SavedFilter) => {
      try {
        console.log('[Filters] AI filter saved:', filter);
        queryClient.invalidateQueries({queryKey: ['savedFilters']});
      } catch (error) {
        console.error('Error refreshing filters after AI save:', error);
      }
    },
    [queryClient],
  );

  const handleFilterPress = useCallback(
    (filter: SavedFilter) => {
      // Build a normalized SavedFilter so Category uses useSavedFilterContent
      const normalizedSaved: SavedFilter = {
        ...filter,
        params: normalizeWithGenres(filter.params),
      } as SavedFilter;

      // Navigate to Category screen
      if (filter.type === 'tv') {
        (navigation as any).navigate('Category', {
          title: filter.name,
          contentType: 'tv',
          filter: normalizedSaved,
        });
      } else {
        // 'movie' or 'all' -> use 'movie' as concrete contentType
        (navigation as any).navigate('Category', {
          title: filter.name,
          contentType: 'movie',
          filter: normalizedSaved,
        });
      }
    },
    [navigation, normalizeWithGenres],
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    contentContainer: {
      paddingBottom: spacing.xxl * 2,
    },
    bannerContainer: {
      marginBottom: spacing.lg,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xxl * 2,
      paddingTop: spacing.xl * 2,
    },
    loadingText: {
      color: colors.text.secondary,
      ...typography.body1,
    },
    emptyContainer: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: orientation === 'landscape' ? '20%' : '50%',
    },
    emptyTitle: {
      ...typography.h2,
      color: colors.text.primary,
      marginBottom: spacing.sm,
    },
    emptyText: {
      ...typography.body1,
      color: colors.text.secondary,
      textAlign: 'center',
    },
    footerContainer: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.xxl,
      alignItems: 'center',
    },
    footerContent: {
      alignItems: 'center',
      maxWidth: 400,
    },
    footerIcon: {
      marginBottom: spacing.md,
      opacity: 0.6,
    },
    footerTitle: {
      ...typography.h2,
      color: colors.text.primary,
      marginBottom: spacing.sm,
      textAlign: 'center',
    },
    footerText: {
      ...typography.body1,
      color: colors.text.secondary,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
  });

  const renderBanner = useCallback(() => {
    if (isLoading || savedFilters.length === 0 || bannerContent.length === 0) {
      return null;
    }

    return <FiltersBanner items={bannerContent} />;
  }, [isLoading, savedFilters.length, bannerContent]);

  // Component to render each filter row with its own query
  const FilterRow = React.memo(({item}: {item: SavedFilter}) => {
    const normalizedFilter = useMemo(
      () => ({
        ...item,
        params: normalizeWithGenres(item.params),
      }),
      [item],
    );

    const query = useSavedFilterContent(normalizedFilter);
    const data = query?.data?.pages?.[0]?.results || [];

    return (
      <HorizontalList
        title={item.name}
        data={data}
        onItemPress={(content: ContentItem) => {
          if ((content as any).first_air_date) {
            (navigation as any).navigate('TVShowDetails', {show: content});
          } else {
            (navigation as any).navigate('MovieDetails', {movie: content});
          }
        }}
        onSeeAllPress={() => handleFilterPress(item)}
        isLoading={query?.isLoading}
      />
    );
  });

  const renderFilterRow = useCallback(
    ({item}: {item: SavedFilter}) => {
      return <FilterRow item={item} />;
    },
    [handleFilterPress, navigation],
  );

  const renderEmpty = useCallback(() => {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>My Filters</Text>
        <Text style={styles.emptyText}>
          Customize this screen with your own filters.
        </Text>
        <GradientButton
          onPress={() =>
            navigation.navigate('Main', {
              screen: 'MySpace',
              params: {screen: 'MyFiltersScreen'},
            })
          }
          title="Create Your First Filter"
          isIcon={false}
          style={{borderRadius: borderRadius.round, marginTop: spacing.lg}}
        />
        <View style={{height: spacing.xxl}} />
        <QuickAddFilters onQuickAdd={handleQuickAdd} onAISave={handleAISave} />
      </View>
    );
  }, [navigation, handleQuickAdd, handleAISave]);

  const renderFooter = useCallback(() => {
    if (savedFilters.length === 0) return null;
    return (
      <View style={styles.footerContainer}>
        <View
          style={{
            padding: spacing.lg,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: spacing.xl,
            marginBottom: spacing.xxl,
          }}>
          <Text
            style={{
              fontSize: 14,
              color: colors.text.muted,
              textAlign: 'center',
              marginBottom: spacing.xl,
              lineHeight: 20,
              fontFamily: 'Inter_18pt-Regular',
            }}>
            Create more personalized filters!
          </Text>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('Main', {
                screen: 'MySpace',
                params: {screen: 'MyFiltersScreen'},
              })
            }
            style={{
              paddingHorizontal: spacing.md,
              borderRadius: borderRadius.round,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
            }}>
            <FastImage
              source={require('../assets/next.webp')}
              style={{
                width: isTablet ? 40 : 30,
                height: isTablet ? 40 : 30,
              }}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [savedFilters.length, navigation]);

  const keyExtractor = useCallback((item: SavedFilter) => item.id, []);
  if (isLoading) {
    return (
      <View>
        <BannerSkeleton />
        <HeadingSkeleton />
        <HorizontalListSkeleton />
        <HeadingSkeleton />
        <HorizontalListSkeleton />
        <HeadingSkeleton />
        <HorizontalListSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={savedFilters}
        renderItem={renderFilterRow}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderBanner}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      />
    </View>
  );
});
