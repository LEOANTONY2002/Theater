import React, {useCallback, useMemo} from 'react';
import {View} from 'react-native';
import {useRegion} from '../hooks/useApp';
import {useNavigationState} from '../hooks/useNavigationState';
import {useTVByOTTSimple} from '../hooks/usePersonalization';
import {HorizontalList} from './HorizontalList';
import {TVShow} from '../types/tvshow';
import {ContentItem} from './MovieList';

interface Props {
  providerId: number;
  providerName: string;
}

export const OttRowTV: React.FC<Props> = ({providerId, providerName}) => {
  const {data: region} = useRegion();
  const {navigateWithLimit} = useNavigationState();
  const hook = useTVByOTTSimple(providerId);

  const data = useMemo(() => {
    const pages = hook?.data?.pages || [];
    return (
      pages.flatMap((page: any) =>
        (page?.results || []).map((s: any) => ({...s, type: 'tv' as const}))
      ) || []
    );
  }, [hook?.data]);

  const onSeeAllPress = useCallback(() => {
    navigateWithLimit('Category', {
      title: `Popular on ${providerName}`,
      contentType: 'tv',
      filter: {
        with_watch_providers: String(providerId),
        watch_region: region?.iso_3166_1 || 'US',
        with_watch_monetization_types: 'flatrate|ads|free',
      },
    });
  }, [navigateWithLimit, providerId, providerName, region?.iso_3166_1]);

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

  return (
    <HorizontalList
      title={`Popular on ${providerName}`}
      data={data}
      onItemPress={onItemPress}
      isLoading={hook?.isLoading}
      onEndReached={hook?.hasNextPage ? hook.fetchNextPage : undefined}
      onSeeAllPress={onSeeAllPress}
      isSeeAll
    />
  );
};
