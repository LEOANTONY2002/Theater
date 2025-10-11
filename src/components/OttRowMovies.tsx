import React, {useCallback, useMemo} from 'react';
import {View} from 'react-native';
import {useRegion} from '../hooks/useApp';
import {useNavigationState} from '../hooks/useNavigationState';
import {useMoviesByOTTSimple} from '../hooks/usePersonalization';
import {HorizontalList} from './HorizontalList';
import {Movie} from '../types/movie';
import {ContentItem} from './MovieList';

interface Props {
  providerId: number;
  providerName: string;
}

export const OttRowMovies: React.FC<Props> = ({providerId, providerName}) => {
  const {data: region} = useRegion();
  const {navigateWithLimit} = useNavigationState();
  const hook = useMoviesByOTTSimple(providerId);

  const data = useMemo(() => {
    const pages = hook?.data?.pages || [];
    return (
      pages.flatMap((page: any) =>
        (page?.results || []).map((m: any) => ({...m, type: 'movie' as const}))
      ) || []
    );
  }, [hook?.data]);

  const onSeeAllPress = useCallback(() => {
    navigateWithLimit('Category', {
      title: `Popular on ${providerName}`,
      contentType: 'movie',
      filter: {
        with_watch_providers: String(providerId),
        watch_region: region?.iso_3166_1 || 'US',
        with_watch_monetization_types: 'flatrate|ads|free',
      },
    });
  }, [navigateWithLimit, providerId, providerName, region?.iso_3166_1]);

  const onItemPress = useCallback(
    (item: ContentItem) => {
      if (item.type !== 'tv') {
        navigateWithLimit('MovieDetails', {movie: item as Movie});
      } else {
        navigateWithLimit('TVShowDetails', {tv: item as any});
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
