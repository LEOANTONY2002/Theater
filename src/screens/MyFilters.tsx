import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {SavedFilter} from '../types/filters';
import {FiltersManager} from '../store/filters';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {MyFiltersModal} from '../components/MyFiltersModal';
import LinearGradient from 'react-native-linear-gradient';
import languageData from '../utils/language.json';
import {Genre} from '../types/movie';
import {getGenres} from '../services/tmdb';
import {HorizontalListSkeleton} from '../components/LoadingSkeleton';
import CreateButton from '../components/createButton';
import {HorizontalList} from '../components/HorizontalList';
import {useSavedFilterContent} from '../hooks/useApp';
import {useNavigationState} from '../hooks/useNavigationState';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

// Child component to render a filter and its results
const MyFilterItemWithResults = ({
  filter,
  allGenres,
  onEdit,
}: {
  filter: SavedFilter;
  allGenres: Genre[];
  onEdit: (f: SavedFilter) => void;
}) => {
  const type = filter?.type;
  const sortBy = filter?.params?.sort_by?.split('.')[0][0];
  const sortOrder = filter?.params?.sort_by?.split('.')[1];
  const rating = filter?.params?.['vote_average.gte'];
  const language = filter?.params?.with_original_language
    ? languageData.find(
        (l: any) => l.iso_639_1 === filter?.params?.with_original_language,
      )
    : null;
  const genres = filter?.params?.with_genres;
  const genreNames = genres
    ?.split(',')
    .map(id => allGenres.find(genre => genre.id === parseInt(id))?.name)
    .join(', ');
  const fromDate =
    filter?.params?.['primary_release_date.gte'] ||
    filter?.params?.['first_air_date.gte'];
  const toDate =
    filter?.params?.['primary_release_date.lte'] ||
    filter?.params?.['first_air_date.lte'];
  const fromYear = fromDate ? new Date(fromDate).getFullYear() : null;
  const toYear = toDate ? new Date(toDate).getFullYear() : null;

  // Fetch filter content for this filter
  const {
    data: filterContent,
    isLoading: isLoadingFilterContent,
    fetchNextPage: fetchNextFilterPage,
    hasNextPage: hasNextFilterPage,
    isFetchingNextPage: isFetchingNextFilterPage,
  } = useSavedFilterContent(filter);
  // Flatten all pages for infinite scrolling
  const flattenedData =
    filterContent?.pages?.flatMap(page => page?.results || []) || [];

  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const handleItemPress = (item: any) => {
    if (item.type === 'movie') {
      navigation.push('MovieDetails', {movie: item});
    } else if (item.type === 'tv') {
      navigation.push('TVShowDetails', {show: item});
    }
  };

  return (
    <View
      key={filter.id}
      style={{marginBottom: spacing.xl, position: 'relative'}}>
      <View style={styles.filterItem}>
        <LinearGradient
          colors={['transparent', colors.background.primary]}
          style={{
            width: '180%',
            height: '100%',
            position: 'absolute',
            bottom: -5,
            left: -20,
            paddingHorizontal: 10,
            zIndex: 0,
            transform: [{rotate: '-10deg'}],
          }}
          start={{x: 0, y: 0}}
          end={{x: 0, y: 1}}
        />
        <View style={styles.filterHeader}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
            <Text style={styles.filterName}>{filter.name}</Text>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => onEdit(filter)}>
              <Ionicons
                name="pencil-outline"
                size={15}
                color={colors.text.primary}
              />
            </TouchableOpacity>
          </View>
          {genreNames && (
            <View style={styles.genreContainer}>
              <Text style={styles.genreText} numberOfLines={1}>
                {genreNames}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.filterContent}>
          {type && (
            <View style={styles.card}>
              <Ionicons
                name={
                  type === 'movie'
                    ? 'film-outline'
                    : type === 'tv'
                    ? 'tv-outline'
                    : 'apps-outline'
                }
                size={15}
                color={colors.text.primary}
              />
              <Text style={styles.cardText} numberOfLines={1}>
                {type?.charAt(0).toUpperCase() + type?.slice(1)}
              </Text>
            </View>
          )}
          {sortBy && rating && language && (fromYear || toYear) ? (
            <View
              style={{
                flexDirection: 'column',
                gap: spacing.sm,
                alignItems: 'flex-start',
              }}>
              {sortBy && (
                <View style={styles.cardSmall}>
                  <Ionicons
                    name={sortOrder === 'desc' ? 'arrow-down' : 'arrow-up'}
                    size={15}
                    color={colors.text.primary}
                  />
                  <Text style={styles.cardText} numberOfLines={1}>
                    {sortBy.toString()}
                  </Text>
                </View>
              )}
              {rating && (
                <View style={styles.cardSmall}>
                  <Ionicons name="star" size={15} color={colors.text.primary} />
                  <Text style={styles.cardText} numberOfLines={1}>
                    {rating.toString()}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <>
              {sortBy && (
                <View style={styles.card}>
                  <Ionicons
                    name={sortOrder === 'desc' ? 'arrow-down' : 'arrow-up'}
                    size={15}
                    color={colors.text.primary}
                  />
                  <Text style={styles.cardText} numberOfLines={1}>
                    {sortBy.toString()}
                  </Text>
                </View>
              )}
              {rating && (
                <View style={styles.card}>
                  <Ionicons name="star" size={15} color={colors.text.primary} />
                  <Text style={styles.cardText} numberOfLines={1}>
                    {rating.toString()}
                  </Text>
                </View>
              )}
            </>
          )}
          {language && (
            <View style={styles.card}>
              <Ionicons name="language" size={15} color={colors.text.primary} />
              <Text style={styles.cardText} numberOfLines={1}>
                {language?.name || language?.english_name}
              </Text>
            </View>
          )}
          {fromYear && toYear ? (
            <View style={{flexDirection: 'column', gap: spacing.sm}}>
              <View style={styles.cardSmall}>
                <Ionicons
                  name="calendar-outline"
                  size={15}
                  color={colors.text.primary}
                />
                <Text style={styles.cardText} numberOfLines={1}>
                  {fromYear}
                </Text>
              </View>
              <View style={styles.cardSmall}>
                <Text style={styles.cardText} numberOfLines={1}>
                  {toYear}
                </Text>
                <Ionicons
                  name="calendar-outline"
                  size={15}
                  color={colors.text.primary}
                />
              </View>
            </View>
          ) : fromYear && !toYear ? (
            <View style={styles.card}>
              <Ionicons
                name="calendar-outline"
                size={15}
                color={colors.text.primary}
              />
              <Text style={styles.cardText} numberOfLines={1}>
                {fromYear}
              </Text>
            </View>
          ) : toYear && !fromYear ? (
            <View style={styles.card}>
              <Text style={styles.cardText} numberOfLines={1}>
                {toYear}
              </Text>
              <Ionicons
                name="calendar-outline"
                size={15}
                color={colors.text.primary}
              />
            </View>
          ) : null}
        </View>
        {/* HorizontalList of filter search results */}
        <View style={styles.listContainer}>
          <LinearGradient
            colors={['transparent', colors.background.primary]}
            style={{
              width: '100%',
              height: 100,
              position: 'absolute',
              bottom: 0,
              paddingHorizontal: 10,
              zIndex: 1,
            }}
          />
          <HorizontalList
            title={''}
            data={flattenedData}
            isLoading={isFetchingNextFilterPage}
            onItemPress={handleItemPress}
            onEndReached={hasNextFilterPage ? fetchNextFilterPage : undefined}
            isSeeAll={false}
            isFilter={true}
          />
        </View>
      </View>
    </View>
  );
};

export const MyFiltersScreen = () => {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingFilter, setEditingFilter] = useState<SavedFilter | null>(null);

  const {data: savedFilters = [], isLoading} = useQuery({
    queryKey: ['savedFilters'],
    queryFn: FiltersManager.getSavedFilters,
  });

  console.log('savedFilters', savedFilters, 'isLoading', isLoading);

  const handleSaveFilter = useCallback(
    (filter: SavedFilter) => {
      queryClient.invalidateQueries({queryKey: ['savedFilters']});
    },
    [queryClient],
  );

  const handleDelete = useCallback(
    (id: string) => {
      queryClient.invalidateQueries({queryKey: ['savedFilters']});
    },
    [queryClient],
  );

  const getLanguage = (language: string) => {
    return languageData.find((l: any) => l.iso_639_1 === language);
  };

  const [allGenres, setAllGenres] = useState<Genre[]>([]);

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const [movieGenresData, tvGenresData] = await Promise.all([
          getGenres('movie'),
          getGenres('tv'),
        ]);
        const uniqueGenres = [...movieGenresData, ...tvGenresData].filter(
          (genre, index, self) =>
            index === self.findIndex(t => t.id === genre.id),
        );
        setAllGenres(uniqueGenres);
      } catch (error) {
        console.error('Error loading genres:', error);
      }
    };

    fetchGenres();
  }, []);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Filters</Text>
        {savedFilters.length > 0 && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}>
            <Ionicons name="add" size={20} color={colors.text.primary} />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View>
          <HorizontalListSkeleton />
        </View>
      ) : savedFilters.length > 0 ? (
        <View style={styles.content}>
          {savedFilters.map(filter => (
            <MyFilterItemWithResults
              key={filter.id}
              filter={filter}
              allGenres={allGenres}
              onEdit={setEditingFilter}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyStateTitle}>No Filters Yet</Text>
          <Text style={styles.emptyStateText}>
            Create your first filter to apply on the search
          </Text>
          <CreateButton
            onPress={() => setShowAddModal(true)}
            title="Create Your First Filter"
            icon="add"
          />
        </View>
      )}

      <MyFiltersModal
        visible={showAddModal || !!editingFilter}
        onClose={() => {
          setShowAddModal(false);
          setEditingFilter(null);
        }}
        onSave={handleSaveFilter}
        editingFilter={editingFilter}
        onDelete={handleDelete}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    height: '100%',
    backgroundColor: colors.background.primary,
    paddingTop: spacing.xxl,
    paddingBottom: 200,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  title: {
    color: colors.text.primary,
    ...typography.h2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    height: 40,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 150,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: '60%',
    paddingBottom: 200,
  },
  emptyStateTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    ...typography.body1,
    color: colors.text.secondary,
  },
  filterItem: {
    backgroundColor: colors.background.tertiary,
    borderWidth: 1,
    borderColor: colors.modal.blur,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    position: 'relative',
    height: 300,
    marginBottom: 50,
    zIndex: 0,
  },
  filterHeader: {
    flexDirection: 'column',
    marginBottom: spacing.sm,
  },
  filterName: {
    color: colors.text.primary,
    ...typography.h3,
  },
  filterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  card: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.modal.content,
    borderRadius: borderRadius.md,
    width: 80,
    height: 80,
    padding: spacing.xs,
    zIndex: 1,
  },
  cardSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.sm,
    width: 80,
    height: 35,
    padding: spacing.xs,
  },
  cardText: {
    color: colors.text.secondary,
    ...typography.body1,
  },
  genreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  genreText: {
    color: colors.text.muted,
    ...typography.body2,
  },
  listContainer: {
    // position: 'absolute',
    width: '120%',
    overflow: 'scroll',
    bottom: 10,
    left: -30,
  },
});
