import React, {useCallback} from 'react';
import {View} from 'react-native';
import {HorizontalList} from './HorizontalList';
import {ContentItem} from './MovieList';
import {Movie} from '../types/movie';
import {SavedFilter} from '../types/filters';
import {useSavedFilterContent} from '../hooks/useApp';
import {TVShow} from '../types/tvshow';
import {useNavigationState} from '../hooks/useNavigationState';

export const HomeFilterRow = ({
  savedFilter,
  onSeeAllPress,
}: {
  savedFilter: SavedFilter;
  onSeeAllPress?: () => void;
}) => {
  const {navigateWithLimit} = useNavigationState();

  const handleItemPress = useCallback(
    (item: ContentItem) => {
      if (item.type === 'movie') {
        navigateWithLimit('MovieDetails', {movie: item as Movie});
      } else if (item.type === 'tv') {
        navigateWithLimit('TVShowDetails', {show: item as unknown as TVShow});
      }
    },
    [navigateWithLimit],
  );

  const handleSeeAllPress = useCallback(() => {
    navigateWithLimit('Category', {
      title: savedFilter.name,
      contentType: savedFilter.type,
      filter: savedFilter,
    });
  }, [navigateWithLimit, savedFilter]);

  const {
    data: filterContent,
    isLoading: isLoadingFilterContent,
    fetchNextPage: fetchNextFilterPage,
    hasNextPage: hasNextFilterPage,
    isFetchingNextPage: isFetchingNextFilterPage,
  } = useSavedFilterContent(savedFilter);

  // Flatten all pages for infinite scrolling
  const flattenedData =
    filterContent?.pages?.flatMap(page => page?.results || []) || [];

  return (
    <View>
      {flattenedData.length > 0 && (
        <HorizontalList
          title={savedFilter.name}
          data={flattenedData}
          isLoading={isFetchingNextFilterPage}
          onItemPress={handleItemPress}
          onEndReached={hasNextFilterPage ? fetchNextFilterPage : undefined}
          onSeeAllPress={onSeeAllPress ?? handleSeeAllPress}
        />
      )}
    </View>
  );
};
