import React, {useCallback, useMemo} from 'react';
import {View} from 'react-native';
import {useRegion} from '../hooks/useApp';
import {useNavigationState} from '../hooks/useNavigationState';
import {
  useMoviesByOTTSimple,
  useMoviesByProvider,
} from '../hooks/usePersonalization';
import {HorizontalList} from './HorizontalList';
import {Movie} from '../types/movie';
import {ContentItem} from './MovieList';

interface Props {
  providerId: number;
  providerName: string;
  kind?: 'popular' | 'latest';
  isPersonalized?: boolean;
}

export const OttRowMovies: React.FC<Props> = ({
  providerId,
  providerName,
  kind = 'popular',
  isPersonalized = false,
}) => {
  const {data: region} = useRegion();
  const {navigateWithLimit} = useNavigationState();

  // Use the appropriate hook based on kind
  const hook =
    kind === 'latest'
      ? useMoviesByProvider(providerId, 'latest', region?.iso_3166_1)
      : useMoviesByOTTSimple(providerId);

  const data = useMemo(() => {
    const pages = hook?.data?.pages || [];
    return (
      pages.flatMap((page: any) =>
        (page?.results || []).map((m: any) => ({...m, type: 'movie' as const})),
      ) || []
    );
  }, [hook?.data]);

  const onSeeAllPress = useCallback(() => {
    const title =
      kind === 'latest'
        ? `Latest on ${providerName}`
        : `Popular on ${providerName}`;
    navigateWithLimit('Category', {
      title,
      contentType: 'movie',
      filter: {
        with_watch_providers: String(providerId),
        watch_region: region?.iso_3166_1 || 'US',
        with_watch_monetization_types: 'flatrate|ads|free',
        sort_by: kind === 'latest' ? 'release_date.desc' : 'popularity.desc',
      },
    });
  }, [navigateWithLimit, providerId, providerName, region?.iso_3166_1, kind]);

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
