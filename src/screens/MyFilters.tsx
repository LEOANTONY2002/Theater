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

export const MyFiltersScreen = () => {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingFilter, setEditingFilter] = useState<SavedFilter | null>(null);

  const {data: savedFilters = [], isLoading} = useQuery({
    queryKey: ['savedFilters'],
    queryFn: FiltersManager.getSavedFilters,
  });

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

  const renderFilterItem = useCallback(
    (filter: SavedFilter) => {
      const type = filter?.type;
      const sortBy = filter?.params?.sort_by?.split('.')[0][0];
      const sortOrder = filter?.params?.sort_by?.split('.')[1];
      const rating = filter?.params?.['vote_average.gte'];
      const language = filter?.params?.with_original_language
        ? getLanguage(filter?.params?.with_original_language)
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

      return (
        <TouchableOpacity
          key={filter.id}
          style={styles.filterItem}
          onPress={() => setEditingFilter(filter)}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterName}>{filter.name}</Text>
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
                    <Ionicons
                      name="star"
                      size={15}
                      color={colors.text.primary}
                    />
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
                    <Ionicons
                      name="star"
                      size={15}
                      color={colors.text.primary}
                    />
                    <Text style={styles.cardText} numberOfLines={1}>
                      {rating.toString()}
                    </Text>
                  </View>
                )}
              </>
            )}

            {language && (
              <View style={styles.card}>
                <Ionicons
                  name="language"
                  size={15}
                  color={colors.text.primary}
                />
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

          {/* <View style={styles.filterActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setEditingFilter(filter)}>
              <Ionicons
                name="create-outline"
                size={20}
                color={colors.text.primary}
              />
              <Text style={styles.actionText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDelete(filter)}>
              <Ionicons
                name="trash-outline"
                size={20}
                color={colors.status.error}
              />
              <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
            </TouchableOpacity>
          </View> */}
        </TouchableOpacity>
      );
    },
    [allGenres],
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Filters</Text>
        {savedFilters.length > 0 && (
          <TouchableOpacity onPress={() => setShowAddModal(true)}>
            <Ionicons name="add" size={20} color={colors.text.primary} />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View>
          <HorizontalListSkeleton />
        </View>
      ) : savedFilters.length > 0 ? (
        <View style={styles.content}>{savedFilters.map(renderFilterItem)}</View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No filters found</Text>
          <TouchableOpacity
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: spacing.md,
            }}
            onPress={() => setShowAddModal(true)}>
            <LinearGradient
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              colors={colors.gradient.tertiary}
              style={[
                styles.addButton,
                {height: 60, borderRadius: borderRadius.round},
              ]}>
              <Ionicons
                name="add"
                size={25}
                color={colors.background.secondary}
              />
              <Text
                style={{
                  ...typography.button,
                  paddingRight: spacing.sm,
                  color: colors.background.secondary,
                }}>
                Create Your First Filter
              </Text>
            </LinearGradient>
          </TouchableOpacity>
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
    paddingHorizontal: spacing.md,
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
  emptyText: {
    color: colors.text.muted,
    ...typography.body1,
  },
  filterItem: {
    backgroundColor: colors.background.tag,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
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
    borderRadius: borderRadius.md,
    width: 80,
    height: 80,
    padding: spacing.xs,
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
});
