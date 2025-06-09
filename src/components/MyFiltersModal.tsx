import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Modal,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import {Picker} from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {BlurView} from '@react-native-community/blur';
import {colors, spacing, borderRadius, typography} from '../styles/theme';
import {FilterParams, SORT_OPTIONS, SavedFilter} from '../types/filters';
import {getLanguages, getGenres} from '../services/tmdb';
import {FiltersManager} from '../store/filters';
import {Chip} from './Chip';
import {queryClient} from '../services/queryClient';

interface Language {
  iso_639_1: string;
  english_name: string;
  name: string;
}

interface Genre {
  id: number;
  name: string;
}

interface MyFiltersModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (filter: SavedFilter) => void;
  editingFilter?: SavedFilter | null;
  onDelete: (id: string) => void;
}

export const MyFiltersModal: React.FC<MyFiltersModalProps> = ({
  visible,
  onClose,
  onSave,
  onDelete,
  editingFilter = null,
}) => {
  const [filterName, setFilterName] = useState('');
  const [contentType, setContentType] = useState<'all' | 'movie' | 'tv'>('all');
  const [filters, setFilters] = useState<FilterParams>({});
  const [showFromDate, setShowFromDate] = useState(false);
  const [showToDate, setShowToDate] = useState(false);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(false);
  const [movieGenres, setMovieGenres] = useState<Genre[]>([]);
  const [tvGenres, setTvGenres] = useState<Genre[]>([]);

  useEffect(() => {
    if (visible) {
      if (editingFilter) {
        setFilterName(editingFilter.name);
        setContentType(editingFilter.type);
        setFilters(editingFilter.params);
      } else {
        setFilterName('');
        setContentType('all');
        setFilters({});
      }
    }
  }, [visible, editingFilter]);

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        setIsLoadingLanguages(true);
        const languagesData = await getLanguages();
        // Sort languages by English name
        const sortedLanguages = languagesData.sort((a: Language, b: Language) =>
          a.english_name.localeCompare(b.english_name),
        );
        setLanguages(sortedLanguages);
      } catch (error) {
        console.error('Error loading languages:', error);
      } finally {
        setIsLoadingLanguages(false);
      }
    };

    if (visible && languages.length === 0) {
      fetchLanguages();
    }
  }, [visible, languages.length]);

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const [movieGenresData, tvGenresData] = await Promise.all([
          getGenres('movie'),
          getGenres('tv'),
        ]);
        setMovieGenres(movieGenresData);
        setTvGenres(tvGenresData);
      } catch (error) {
        console.error('Error loading genres:', error);
      }
    };

    if (visible) {
      fetchGenres();
    }
  }, [visible]);

  useEffect(() => {
    if (!editingFilter) {
      setFilters(prev => ({...prev, with_genres: undefined}));
    }
  }, [contentType, editingFilter]);

  const handleSortChange = (value: string) => {
    if (!value) {
      setFilters(prev => ({...prev, sort_by: undefined}));
      return;
    }
    setFilters(prev => ({...prev, sort_by: value}));
  };

  const handleLanguageChange = (value: string) => {
    setFilters(prev => ({...prev, with_original_language: value}));
  };

  const handleRatingChange = (value: number) => {
    setFilters(prev => ({...prev, 'vote_average.gte': value}));
  };

  const handleFromDateChange = (event: any, date?: Date) => {
    setShowFromDate(false);
    if (date) {
      const dateString = date.toISOString().split('T')[0];
      setFilters(prev => ({
        ...prev,
        [contentType === 'movie'
          ? 'primary_release_date.gte'
          : 'first_air_date.gte']: dateString,
      }));
    }
  };

  const handleToDateChange = (event: any, date?: Date) => {
    setShowToDate(false);
    if (date) {
      const dateString = date.toISOString().split('T')[0];
      setFilters(prev => ({
        ...prev,
        [contentType === 'movie'
          ? 'primary_release_date.lte'
          : 'first_air_date.lte']: dateString,
      }));
    }
  };

  const handleRuntimeChange = (value: number) => {
    setFilters(prev => ({...prev, with_runtime_gte: value}));
  };

  const handleReset = () => {
    setFilters({});
    setContentType('all');
  };

  const handleSave = async () => {
    try {
      if (!filterName.trim()) {
        Alert.alert('Error', 'Please enter a filter name');
        return;
      }

      const timestamp = Date.now();
      const newFilter: SavedFilter = {
        id: editingFilter?.id || timestamp.toString(),
        name: filterName,
        type: contentType,
        params: filters,
        createdAt: timestamp,
      };

      if (editingFilter) {
        await FiltersManager.updateFilter(editingFilter.id, newFilter);
      } else {
        await FiltersManager.saveFilter(filterName, filters, contentType);
      }

      onSave(newFilter);
      setFilterName('');
      setContentType('all');
      setFilters({});
      onClose();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to save filter',
      );
    }
  };

  const handleDelete = useCallback(
    async (filter: any) => {
      Alert.alert(
        'Delete Filter',
        `Are you sure you want to delete "${filter.name}"?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await FiltersManager.deleteFilter(filter.id);
                queryClient.invalidateQueries({queryKey: ['savedFilters']});
                onDelete(filter.id);
                onClose();
              } catch (error) {
                Alert.alert('Error', 'Failed to delete filter');
              }
            },
          },
        ],
      );
    },
    [queryClient],
  );

  const getDateFromFilter = (key: string) => {
    const dateStr = filters[key as keyof FilterParams];
    return dateStr ? new Date(dateStr as string) : new Date();
  };

  const handleGenreToggle = (genreId: number) => {
    setFilters(prev => {
      const currentGenres = prev.with_genres ? prev.with_genres.split(',') : [];
      const genreIdStr = genreId.toString();

      if (currentGenres.includes(genreIdStr)) {
        return {
          ...prev,
          with_genres: currentGenres.filter(id => id !== genreIdStr).join(','),
        };
      } else {
        return {
          ...prev,
          with_genres: [...currentGenres, genreIdStr].join(','),
        };
      }
    });
  };

  const getFilteredGenres = () => {
    if (contentType === 'movie') return movieGenres;
    if (contentType === 'tv') return tvGenres;

    // For "All", combine genres and remove duplicates by ID
    const uniqueGenres = new Map();
    [...movieGenres, ...tvGenres].forEach(genre => {
      if (!uniqueGenres.has(genre.id)) {
        uniqueGenres.set(genre.id, genre);
      }
    });
    return Array.from(uniqueGenres.values());
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      statusBarTranslucent={true}
      onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="dark"
          blurAmount={10}
          overlayColor="rgba(23, 20, 48, 0.87)"
          reducedTransparencyFallbackColor="rgba(0, 0, 0, 0.5)"
        />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingFilter ? 'Edit Filter' : 'New Filter'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent}>
            {/* Filter Name */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Filter Name</Text>
              <TextInput
                style={styles.input}
                value={filterName}
                onChangeText={setFilterName}
                placeholder="Enter filter name"
                placeholderTextColor={colors.text.secondary}
              />
            </View>

            {/* Content Type */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Content Type</Text>
              <View style={styles.contentTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.contentTypeButton,
                    contentType === 'all' && styles.activeButton,
                  ]}
                  onPress={() => setContentType('all')}>
                  <Ionicons
                    name="apps-outline"
                    size={20}
                    color={
                      contentType === 'all'
                        ? colors.primary
                        : colors.text.secondary
                    }
                  />
                  <Text
                    style={[
                      styles.contentTypeText,
                      contentType === 'all' && styles.activeText,
                    ]}>
                    All
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.contentTypeButton,
                    contentType === 'movie' && styles.activeButton,
                  ]}
                  onPress={() => setContentType('movie')}>
                  <Ionicons
                    name="film-outline"
                    size={20}
                    color={
                      contentType === 'movie'
                        ? colors.primary
                        : colors.text.secondary
                    }
                  />
                  <Text
                    style={[
                      styles.contentTypeText,
                      contentType === 'movie' && styles.activeText,
                    ]}>
                    Movies
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.contentTypeButton,
                    contentType === 'tv' && styles.activeButton,
                  ]}
                  onPress={() => setContentType('tv')}>
                  <Ionicons
                    name="tv-outline"
                    size={20}
                    color={
                      contentType === 'tv'
                        ? colors.primary
                        : colors.text.secondary
                    }
                  />
                  <Text
                    style={[
                      styles.contentTypeText,
                      contentType === 'tv' && styles.activeText,
                    ]}>
                    TV Shows
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Genres */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Genres</Text>
              <View style={styles.genresContainer}>
                {getFilteredGenres().map(genre => (
                  <Chip
                    key={genre.id}
                    label={genre.name}
                    selected={
                      filters.with_genres?.includes(genre.id.toString()) ||
                      false
                    }
                    onPress={() => handleGenreToggle(genre.id)}
                  />
                ))}
              </View>
            </View>

            {/* Sort By with Order Toggle */}
            <View style={styles.section}>
              {/* <View style={styles.sectionHeader}> */}
              <Text style={styles.sectionTitle}>Sort By</Text>
              {/* <TouchableOpacity
                  style={styles.sortOrderButton}
                  onPress={handleSortOrderToggle}>
                  <Ionicons
                    name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
                    size={20}
                    color={colors.text.primary}
                  />
                </TouchableOpacity> */}
              {/* </View> */}
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={filters.sort_by}
                  onValueChange={handleSortChange}
                  style={styles.picker}
                  dropdownIconColor={colors.text.primary}>
                  <Picker.Item label="Select..." value="" />
                  {SORT_OPTIONS.map(option => (
                    <Picker.Item
                      key={option.value}
                      label={option.label}
                      value={option.value}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Language */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Original Language</Text>
              <View style={styles.pickerContainer}>
                {isLoadingLanguages ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color={colors.primary} />
                  </View>
                ) : (
                  <Picker
                    selectedValue={filters.with_original_language}
                    onValueChange={handleLanguageChange}
                    style={styles.picker}
                    dropdownIconColor={colors.text.primary}>
                    <Picker.Item label="Any" value="" />
                    {languages.map(lang => (
                      <Picker.Item
                        key={lang.iso_639_1}
                        label={`${lang.english_name} (${lang.name})`}
                        value={lang.iso_639_1}
                      />
                    ))}
                  </Picker>
                )}
              </View>
            </View>

            {/* Rating */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Minimum Rating: {filters['vote_average.gte'] || 0}
              </Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={10}
                step={0.5}
                value={filters['vote_average.gte'] || 0}
                onValueChange={handleRatingChange}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.text.secondary}
              />
            </View>

            {/* Release Date */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {contentType === 'movie' ? 'Release Date' : 'Air Date'}
              </Text>
              <View style={styles.dateContainer}>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowFromDate(true)}>
                  <Text style={styles.dateButtonText}>
                    {filters[
                      contentType === 'movie'
                        ? 'primary_release_date.gte'
                        : 'first_air_date.gte'
                    ] || 'From Date'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowToDate(true)}>
                  <Text style={styles.dateButtonText}>
                    {filters[
                      contentType === 'movie'
                        ? 'primary_release_date.lte'
                        : 'first_air_date.lte'
                    ] || 'To Date'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Runtime */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Minimum Runtime: {filters.with_runtime_gte || 0} min
              </Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={360}
                step={15}
                value={filters.with_runtime_gte || 0}
                onValueChange={handleRuntimeChange}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.text.secondary}
              />
            </View>
          </ScrollView>

          {/* Date Pickers */}
          {showFromDate && (
            <DateTimePicker
              value={getDateFromFilter(
                contentType === 'movie'
                  ? 'primary_release_date.gte'
                  : 'first_air_date.gte',
              )}
              mode="date"
              onChange={handleFromDateChange}
            />
          )}
          {showToDate && (
            <DateTimePicker
              value={getDateFromFilter(
                contentType === 'movie'
                  ? 'primary_release_date.lte'
                  : 'first_air_date.lte',
              )}
              mode="date"
              onChange={handleToDateChange}
            />
          )}

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.footerButton, styles.resetButton]}
              onPress={handleReset}>
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerButton, styles.saveButton]}
              onPress={handleSave}>
              <Text style={styles.saveButtonText}>
                {editingFilter ? 'Update' : 'Save'}
              </Text>
            </TouchableOpacity>
            {editingFilter && (
              <TouchableOpacity
                style={[styles.footerButton, styles.resetButton]}
                onPress={() => handleDelete(editingFilter)}>
                <Text style={styles.resetButtonText}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    flex: 1,
    marginTop: 60,
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.secondary,
  },
  modalTitle: {
    color: colors.text.primary,
    ...typography.h2,
  },
  closeButton: {
    padding: spacing.sm,
  },
  scrollContent: {
    flex: 1,
    padding: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.text.primary,
    ...typography.h3,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text.primary,
    ...typography.body1,
  },
  contentTypeContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  contentTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeButton: {
    borderColor: colors.primary,
    backgroundColor: colors.background.tertiary,
  },
  contentTypeText: {
    color: colors.text.secondary,
    ...typography.button,
  },
  activeText: {
    color: colors.primary,
  },
  pickerContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  picker: {
    color: colors.text.primary,
    height: 50,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  dateButton: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  dateButtonText: {
    color: colors.text.primary,
    ...typography.body2,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.background.secondary,
  },
  footerButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  resetButton: {
    backgroundColor: colors.background.secondary,
  },
  resetButtonText: {
    color: colors.text.primary,
    ...typography.button,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    color: colors.text.primary,
    ...typography.button,
  },
  loadingContainer: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.secondary,
  },
  sortOrderButton: {
    padding: spacing.sm,
  },
});
