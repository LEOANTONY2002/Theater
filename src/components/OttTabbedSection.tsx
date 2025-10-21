import React, {useState, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import {useRegion} from '../hooks/useApp';
import {useNavigationState} from '../hooks/useNavigationState';
import {
  useMoviesByOTTSimple,
  useMoviesByProvider,
} from '../hooks/usePersonalization';
import {HorizontalList} from './HorizontalList';
import {Movie} from '../types/movie';
import {ContentItem} from './MovieList';
import {colors, spacing, borderRadius, typography} from '../styles/theme';
import {SettingsManager} from '../store/settings';
import {useQueryClient} from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/Ionicons';
import {buildOTTFilters} from '../services/tmdbWithCache';

interface OttProvider {
  id: number;
  provider_name: string;
}

interface Props {
  providers: OttProvider[];
  isPersonalized?: boolean;
}

export const OttTabbedSection: React.FC<Props> = ({
  providers,
  isPersonalized = false,
}) => {
  const [activeProviderId, setActiveProviderId] = useState<number>(
    providers[0]?.id || 0,
  );
  const {data: region} = useRegion();
  const {navigateWithLimit} = useNavigationState();
  const queryClient = useQueryClient();

  // Get data for the active provider
  const hook = useMoviesByProvider(
    activeProviderId,
    'latest',
    region?.iso_3166_1,
  );

  const data = useMemo(() => {
    const pages = hook?.data?.pages || [];
    return (
      pages.flatMap((page: any) =>
        (page?.results || []).map((m: any) => ({...m, type: 'movie' as const})),
      ) || []
    );
  }, [hook?.data]);

  const activeProvider = providers.find(p => p.id === activeProviderId);

  const onSeeAllPress = useCallback(() => {
    const title = `Latest on ${activeProvider?.provider_name}`;
    
    // Use centralized filter builder - single source of truth
    const filter = buildOTTFilters(
      activeProviderId,
      'latest',
      'movie',
      region?.iso_3166_1,
    );
    
    navigateWithLimit('Category', {
      title,
      contentType: 'movie',
      filter,
    });
  }, [
    navigateWithLimit,
    activeProviderId,
    activeProvider?.provider_name,
    region?.iso_3166_1,
  ]);

  const onItemPress = useCallback(
    (item: ContentItem) => {
      if (item.type !== 'tv') {
        navigateWithLimit('MovieDetails', {movie: item as Movie});
      } else {
        navigateWithLimit('TVShowDetails', {tv: item as any});
      }
    },
    [navigateWithLimit],
  );

  const handleRemoveOTT = useCallback(
    async (provider: OttProvider) => {
      Alert.alert(
        'Remove OTT Provider',
        `Remove ${provider.provider_name} from My OTTs?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              try {
                const currentOTTs = await SettingsManager.getMyOTTs();
                const updatedOTTs = currentOTTs.filter(
                  ott => ott.id !== provider.id,
                );
                await SettingsManager.setMyOTTs(updatedOTTs);
                queryClient.invalidateQueries({queryKey: ['my_otts']});

                // Switch to first available provider if current one is removed
                if (
                  activeProviderId === provider.id &&
                  updatedOTTs.length > 0
                ) {
                  setActiveProviderId(updatedOTTs[0].id);
                }
              } catch (error) {
                console.error('Error removing OTT:', error);
                Alert.alert('Error', 'Failed to remove OTT provider');
              }
            },
          },
        ],
      );
    },
    [activeProviderId, queryClient],
  );

  const renderTabButton = (provider: OttProvider) => (
    <TouchableOpacity
      key={provider.id}
      style={[
        styles.tabButton,
        activeProviderId === provider.id && styles.activeTabButton,
      ]}
      onPress={() => setActiveProviderId(provider.id)}
      onLongPress={
        isPersonalized ? () => handleRemoveOTT(provider) : undefined
      }>
      <Text
        style={[
          styles.tabText,
          activeProviderId === provider.id && styles.activeTabText,
        ]}>
        {provider.provider_name}
      </Text>
    </TouchableOpacity>
  );

  if (!providers || providers.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Title */}
      <Text style={styles.sectionTitle}>
        {isPersonalized ? 'Latest releases on My OTTs' : 'Latest releases on'}
      </Text>

      {/* Horizontal Tabs */}
      <ScrollView
        style={styles.tabContainer}
        horizontal={true}
        showsHorizontalScrollIndicator={false}>
        {providers.map(renderTabButton)}
      </ScrollView>

      {/* Content List */}
      {hook?.isLoading ? (
        <HorizontalList
          title=""
          data={data}
          onItemPress={onItemPress}
          isLoading={hook?.isLoading}
          onEndReached={hook?.hasNextPage ? hook.fetchNextPage : undefined}
          onSeeAllPress={onSeeAllPress}
          isSeeAll
          hideTitle
          showSeeAllText
        />
      ) : data.length > 0 ? (
        <HorizontalList
          title=""
          data={data}
          onItemPress={onItemPress}
          isLoading={hook?.isLoading}
          onEndReached={hook?.hasNextPage ? hook.fetchNextPage : undefined}
          onSeeAllPress={onSeeAllPress}
          isSeeAll
          hideTitle
          showSeeAllText
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No content available for {activeProvider?.provider_name}
          </Text>
          {isPersonalized && activeProvider && (
            <TouchableOpacity
              style={styles.removeFromListButton}
              onPress={() => handleRemoveOTT(activeProvider)}>
              <Icon name="trash-outline" size={18} color={colors.text.muted} />
              <Text style={styles.removeFromListText}>Remove from My OTTs</Text>
            </TouchableOpacity>
          )}
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
    height: 250,
  },
  emptyText: {
    color: colors.text.secondary,
    ...typography.body2,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  removeFromListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.modal.content,
    backgroundColor: colors.modal.blur,
  },
  removeFromListText: {
    color: colors.text.secondary,
    ...typography.body2,
    fontWeight: '600',
  },
});
