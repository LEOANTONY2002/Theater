import React, {useCallback, useMemo} from 'react';
import {View} from 'react-native';
import {useRegion} from '../hooks/useApp';
import {useNavigationState} from '../hooks/useNavigationState';
import {useTVByOTTSimple, useTVByProvider} from '../hooks/usePersonalization';
import {HorizontalList} from './HorizontalList';
import {TVShow} from '../types/tvshow';
import {ContentItem} from './MovieList';
import {buildOTTFilters} from '../services/tmdbWithCache';

interface Props {
  providerId: number;
  providerName: string;
  kind?: 'popular' | 'latest';
  isPersonalized?: boolean;
}

export const OttRowTV: React.FC<Props> = ({
  providerId,
  providerName,
  kind = 'popular',
  isPersonalized = false,
}) => {
  const {data: region} = useRegion();
  const {navigateWithLimit} = useNavigationState();

  // Use the appropriate hook based on kind
  const hook = kind === 'latest'
    ? useTVByProvider(providerId, 'latest', region?.iso_3166_1)
    : useTVByOTTSimple(providerId);

  const data = useMemo(() => {
    const pages = hook?.data?.pages || [];
    return (
      pages.flatMap((page: any) =>
        (page?.results || []).map((s: any) => ({...s, type: 'tv' as const})),
      ) || []
    );
  }, [hook?.data]);

  const onSeeAllPress = useCallback(() => {
    const title =
      kind === 'latest'
        ? `Latest on ${providerName}`
        : `Popular on ${providerName}`;
    
    // Use centralized filter builder - single source of truth
    const filter = buildOTTFilters(
      providerId,
      kind,
      'tv',
      region?.iso_3166_1,
    );
    
    navigateWithLimit('Category', {
      title,
      contentType: 'tv',
      filter,
    });
  }, [navigateWithLimit, providerId, providerName, region?.iso_3166_1, kind]);

  const onItemPress = useCallback(
    (item: ContentItem) => {
      if (item.type === 'tv') {
        navigateWithLimit('TVShowDetails', {show: item as unknown as TVShow});
      } else {
        navigateWithLimit('MovieDetails', {movie: item as any});
      }
    },
    [navigateWithLimit]
  );

  if (!data?.length && hook?.isLoading) {
    return <View />;
  }

  if (!data?.length) {
    return <View />;
  }

  const title =
    kind === 'latest'
      ? `Latest on ${providerName}`
      : `Popular on ${providerName}`;

  return (
    <HorizontalList
      title={title}
      data={data}
      onItemPress={onItemPress}
      isLoading={hook?.isLoading}
      onEndReached={hook?.hasNextPage ? hook.fetchNextPage : undefined}
      onSeeAllPress={onSeeAllPress}
      isSeeAll
      prefix={isPersonalized ? 'My OTT:' : undefined}
    />
  );
};
