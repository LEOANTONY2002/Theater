import React, {useCallback} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {HorizontalList} from './HorizontalList';
import {colors, spacing, typography} from '../styles/theme';
import {ContentItem} from './MovieList';
import {Movie} from '../types/movie';
import {useNavigation} from '@react-navigation/native';
import {SavedFilter} from '../types/filters';
import {useSavedFilterContent} from '../hooks/useApp';
import {TVShow} from '../types/tvshow';
import {useNavigationState} from '../hooks/useNavigationState';

export const HomeFilterRow = ({savedFilter}: {savedFilter: SavedFilter}) => {
  const navigation = useNavigation();
  const {navigateWithLimit} = useNavigationState();

  const handleItemPress = useCallback(
    (item: ContentItem) => {
      if (item.type === 'movie') {
        navigateWithLimit('MovieDetails', {movie: item as Movie});
      } else if (item.type === 'tv') {
        console.log('item', item);
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

  console.log('filterContent', savedFilter);

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

const styles = StyleSheet.create({
  heading: {
    ...typography.h3,
    color: colors.text.secondary,
    marginVertical: spacing.md,
    textAlign: 'center',
  },
});
