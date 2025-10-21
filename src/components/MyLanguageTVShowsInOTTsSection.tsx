import React, {useState, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {useNavigationState} from '../hooks/useNavigationState';
import {
  useTVByLanguageAndOTTs,
  useMyLanguage,
  useMyOTTs,
} from '../hooks/usePersonalization';
import {useRegion} from '../hooks/useApp';
import {HorizontalList} from './HorizontalList';
import {TVShow} from '../types/tvshow';
import {ContentItem} from './MovieList';
import {colors, spacing, borderRadius, typography} from '../styles/theme';

interface OttProvider {
  id: number;
  provider_name: string;
}

export const MyLanguageTVShowsInOTTsSection: React.FC = () => {
  const {navigateWithLimit} = useNavigationState();
  const {data: myLanguage} = useMyLanguage();
  const {data: myOTTs = []} = useMyOTTs();
  const {data: region} = useRegion();

  // Fallback OTTs (same as other OTT sections in the app)
  const defaultOTTs = useMemo(
    () =>
      region?.iso_3166_1 === 'IN'
        ? [
            {id: 8, provider_name: 'Netflix'},
            {id: 2336, provider_name: 'JioHotstar'},
            {id: 119, provider_name: 'Amazon Prime Video'},
          ]
        : [
            {id: 8, provider_name: 'Netflix'},
            {id: 10, provider_name: 'Amazon Video'},
            {id: 337, provider_name: 'Disney+'},
          ],
    [region?.iso_3166_1],
  );

  const providers = myOTTs && myOTTs.length ? myOTTs : defaultOTTs;
  const [activeProviderId, setActiveProviderId] = useState<number>(
    providers[0]?.id || 0,
  );

  // Get data for the active provider (single OTT at a time)
  const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} =
    useTVByLanguageAndOTTs(
      myLanguage?.iso_639_1,
      [activeProviderId], // Single provider
      region?.iso_3166_1,
    );

  const shows = useMemo(() => {
    const pages = data?.pages || [];
    return pages.flatMap((page: any) =>
      (page?.results || []).map((s: any) => ({...s, type: 'tv' as const})),
    );
  }, [data]);

  const activeProvider = providers.find(p => p.id === activeProviderId);

  const onSeeAllPress = useCallback(() => {
    navigateWithLimit('Category', {
      title: `${myLanguage?.english_name} Shows on ${activeProvider?.provider_name}`,
      contentType: 'tv',
      filter: {
        with_original_language: myLanguage?.iso_639_1,
        with_watch_providers: String(activeProviderId),
        watch_region: region?.iso_3166_1,
        sort_by: 'first_air_date.desc',
      },
    });
  }, [navigateWithLimit, myLanguage, activeProvider, activeProviderId, region]);

  const onItemPress = useCallback(
    (item: ContentItem) => {
      if (item.type === 'tv') {
        navigateWithLimit('TVShowDetails', {show: item as TVShow});
      }
    },
    [navigateWithLimit],
  );

  const renderTabButton = (provider: OttProvider) => (
    <TouchableOpacity
      key={provider.id}
      style={[
        styles.tabButton,
        activeProviderId === provider.id && styles.activeTabButton,
      ]}
      onPress={() => setActiveProviderId(provider.id)}>
      <Text
        style={[
          styles.tabText,
          activeProviderId === provider.id && styles.activeTabText,
        ]}>
        {provider.provider_name}
      </Text>
    </TouchableOpacity>
  );

  // Don't render if no language selected
  if (!myLanguage || !providers || providers.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Title */}
      <Text style={styles.sectionTitle}>
        Latest {myLanguage.name || myLanguage.english_name} Shows on
      </Text>

      {/* Horizontal OTT Tabs */}
      <ScrollView
        style={styles.tabContainer}
        horizontal={true}
        showsHorizontalScrollIndicator={false}>
        {providers.map(renderTabButton)}
      </ScrollView>

      {/* Content List */}
      {shows.length > 0 || isLoading ? (
        <HorizontalList
          key={`my-lang-shows-${myLanguage.iso_639_1}-${activeProviderId}`}
          title=""
          data={shows}
          onItemPress={onItemPress}
          isLoading={isLoading}
          onEndReached={hasNextPage ? fetchNextPage : undefined}
          onSeeAllPress={onSeeAllPress}
          isSeeAll
          hideTitle
          showSeeAllText
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No {myLanguage.english_name} shows available on{' '}
            {activeProvider?.provider_name}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.text.primary,
    ...typography.h3,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  tabContainer: {
    flexDirection: 'row',
    padding: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  tabButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginHorizontal: spacing.xs,
    alignItems: 'center',
    backgroundColor: colors.modal.blur,
    borderWidth: 1,
    borderColor: colors.modal.content,
  },
  activeTabButton: {
    backgroundColor: colors.modal.border,
    borderWidth: 1,
    borderColor: colors.modal.active,
  },
  tabText: {
    color: colors.text.secondary,
    ...typography.body2,
    fontWeight: '500',
  },
  activeTabText: {
    color: colors.text.primary,
  },
  emptyContainer: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  emptyText: {
    color: colors.text.secondary,
    ...typography.body2,
    textAlign: 'center',
  },
});
