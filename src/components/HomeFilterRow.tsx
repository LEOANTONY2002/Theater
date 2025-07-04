import React, {useCallback} from 'react';
import {View} from 'react-native';
import {HorizontalList} from './HorizontalList';
import {ContentItem} from './MovieList';
import {Movie} from '../types/movie';
import {SavedFilter} from '../types/filters';
import {useSavedFilterContent} from '../hooks/useApp';
import {TVShow} from '../types/tvshow';
import {useNavigationState} from '../hooks/useNavigationState';

export const HomeFilterRow = ({savedFilter}: {savedFilter: SavedFilter}) => {
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

  const {data: filterContent, isLoading: isLoadingFilterContent} =
    useSavedFilterContent(savedFilter);

  return (
    <View>
      {filterContent?.pages?.[0]?.results?.length > 0 && (
        <HorizontalList
          title={savedFilter.name}
          data={filterContent?.pages?.[0]?.results}
          isLoading={isLoadingFilterContent}
          onItemPress={handleItemPress}
          onEndReached={() => {}}
          onSeeAllPress={handleSeeAllPress}
        />
      )}
    </View>
  );
};
