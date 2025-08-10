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
  FlatList,
} from 'react-native';
import {Picker} from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import {GradientProgressBar} from './GradientProgressBar';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {BlurView} from '@react-native-community/blur';
import {colors, spacing, borderRadius, typography} from '../styles/theme';
import {FilterParams, SORT_OPTIONS, SavedFilter} from '../types/filters';
import {getLanguages, getGenres, searchFilterContent} from '../services/tmdb';
import {FiltersManager} from '../store/filters';
import {Chip} from './Chip';
import {queryClient} from '../services/queryClient';
import {modalStyles} from '../styles/styles';
import {GradientSpinner} from './GradientSpinner';

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
  const [isValidatingFilter, setIsValidatingFilter] = useState(false);
  const [filterValidationResult, setFilterValidationResult] = useState<{
    hasData: boolean;
    resultCount: number;
  } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [filterNameError, setFilterNameError] = useState<string | null>(null);
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteFilter, setPendingDeleteFilter] =
    useState<SavedFilter | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
        setHasAttemptedSave(false);
        setFilterNameError(null);
        setValidationError(null);
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

  // Auto-dismiss toast after 5 seconds
  useEffect(() => {
    if (validationError) {
      const timer = setTimeout(() => {
        setValidationError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [validationError]);
  useEffect(() => {
    if (deleteError) {
      const timer = setTimeout(() => {
        setDeleteError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [deleteError]);

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

  const validateFilter = async () => {
    if (!filterName.trim()) {
      return false;
    }

    // Don't validate if no filters are set
    if (Object.keys(filters).length === 0) {
      return true;
    }

    setIsValidatingFilter(true);
    setFilterValidationResult(null);
    setValidationError(null);

    try {
      const testFilter: SavedFilter = {
        id: 'test',
        name: filterName,
        type: contentType,
        params: filters,
        createdAt: Date.now(),
      };

      const result = await searchFilterContent(testFilter, 1);

      if (result && result.results && result.results.length > 0) {
        setFilterValidationResult({
          hasData: true,
          resultCount: result.results.length,
        });
        return true;
      } else {
        setFilterValidationResult({
          hasData: false,
          resultCount: 0,
        });
        setValidationError(
          'No content found from this filter combination. Please adjust your filter criteria.',
        );
        return false;
      }
    } catch (error) {
      console.error('Filter validation error:', error);
      setValidationError(
        'Failed to validate filter. Please check your internet connection and try again.',
      );
      return false;
    } finally {
      setIsValidatingFilter(false);
    }
  };

  const handleReset = () => {
    setFilters({});
    setContentType('all');
    setFilterValidationResult(null);
    setValidationError(null);
    setFilterNameError(null);
    setHasAttemptedSave(false);
  };

  const handleSave = async () => {
    try {
      setHasAttemptedSave(true);

      // Check filter name first
      if (!filterName.trim()) {
        setFilterNameError('Please enter a filter name');
        return;
      }
      setFilterNameError(null);

      // Validate the filter before saving
      const isValid = await validateFilter();
      if (!isValid) {
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
      setFilterValidationResult(null);
      setValidationError(null);
      onClose();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to save filter',
      );
    }
  };

  // Replace handleDelete to show custom modal
  const handleDelete = useCallback((filter: any) => {
    setPendingDeleteFilter(filter);
    setShowDeleteConfirm(true);
  }, []);

  // Confirm delete action
  const confirmDelete = async () => {
    if (!pendingDeleteFilter) return;
    try {
      await FiltersManager.deleteFilter(pendingDeleteFilter.id);
      queryClient.invalidateQueries({queryKey: ['savedFilters']});
      onDelete(pendingDeleteFilter.id);
      setShowDeleteConfirm(false);
      setPendingDeleteFilter(null);
      onClose();
    } catch (error) {
      setDeleteError('Failed to delete filter');
      setShowDeleteConfirm(false);
      setPendingDeleteFilter(null);
    }
  };

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
        <View style={styles.modalContent}>
          <BlurView
            style={styles.blurView}
            blurType="dark"
            blurAmount={30}
            overlayColor={colors.modal.blur}
            reducedTransparencyFallbackColor={colors.modal.blur}
          />
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
                style={[
                  styles.input,
                  filterNameError && hasAttemptedSave && styles.inputError,
                ]}
                value={filterName}
                onChangeText={text => {
                  setFilterName(text);
                  if (filterNameError) setFilterNameError(null);
                }}
                placeholder="Enter filter name"
                placeholderTextColor={colors.text.muted}
                cursorColor={colors.accent}
              />
              {filterNameError && hasAttemptedSave && (
                <View style={styles.inputErrorContainer}>
                  <Ionicons
                    name="alert-circle"
                    size={16}
                    color={colors.status.error}
                  />
                  <Text style={styles.inputErrorMessage}>
                    {filterNameError}
                  </Text>
                </View>
              )}
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
                        ? colors.accent
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
                        ? colors.accent
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
                        ? colors.accent
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
              <FlatList
                data={getFilteredGenres()}
                scrollEnabled={false}
                renderItem={({item: genre}) => (
                  <Chip
                    key={genre.id}
                    label={genre.name}
                    selected={
                      filters.with_genres?.includes(genre.id.toString()) ||
                      false
                    }
                    onPress={() => handleGenreToggle(genre.id)}
                  />
                )}
                keyExtractor={genre => genre.id.toString()}
                numColumns={3}
                contentContainerStyle={styles.genresContainer}
              />
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
                  <Picker.Item label="Select" value="" />
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
                    <GradientSpinner
                      size={30}
                      thickness={3}
                      style={{
                        marginVertical: 50,
                        alignItems: 'center',
                        alignSelf: 'center',
                      }}
                      colors={[
                        colors.modal.activeBorder,
                        colors.modal.activeBorder,
                        'transparent',
                        'transparent',
                      ]}
                    />
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
                        label={`${lang.english_name} ${
                          lang.name && `(${lang.name})`
                        }`}
                        value={lang.iso_639_1}
                      />
                    ))}
                  </Picker>
                )}
              </View>
            </View>

            {/* Rating */}
            <View style={styles.section}>
              <GradientProgressBar
                value={filters['vote_average.gte'] || 0}
                minValue={0}
                maxValue={10}
                step={0.5}
                onValueChange={handleRatingChange}
                label="Minimum Rating"
                showValue={true}
                height={16}
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
            <View style={{height: 150}} />
          </ScrollView>

          {/* Toast Notification for validation error */}
          {validationError && (
            <View style={styles.toastContainer}>
              <View style={styles.toastContent}>
                <Ionicons
                  name="alert-circle"
                  size={20}
                  color={colors.text.primary}
                />
                <Text style={styles.toastMessage}>{validationError}</Text>
                <TouchableOpacity
                  onPress={() => setValidationError(null)}
                  style={styles.toastCloseButton}>
                  <Ionicons
                    name="close"
                    size={16}
                    color={colors.text.primary}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}
          {/* Toast Notification for delete error */}
          {deleteError && (
            <View style={styles.toastContainer}>
              <View style={styles.toastContent}>
                <Ionicons
                  name="alert-circle"
                  size={20}
                  color={colors.text.primary}
                />
                <Text style={styles.toastMessage}>{deleteError}</Text>
                <TouchableOpacity
                  onPress={() => setDeleteError(null)}
                  style={styles.toastCloseButton}>
                  <Ionicons
                    name="close"
                    size={16}
                    color={colors.text.primary}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}
          {/* Delete Confirmation Modal Overlay */}
          {showDeleteConfirm && pendingDeleteFilter && (
            <View style={styles.confirmOverlay}>
              <View style={styles.confirmModal}>
                <Text style={styles.confirmTitle}>Delete Filter</Text>
                <Text style={styles.confirmMessage}>
                  Are you sure you want to delete "{pendingDeleteFilter.name}"?
                </Text>
                <View style={styles.confirmActions}>
                  <TouchableOpacity
                    style={[styles.confirmButton, styles.cancelButton]}
                    onPress={() => {
                      setShowDeleteConfirm(false);
                      setPendingDeleteFilter(null);
                    }}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.confirmButton, styles.deleteButton]}
                    onPress={confirmDelete}>
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

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
              onPress={handleSave}
              disabled={isValidatingFilter}>
              {isValidatingFilter ? (
                <View style={styles.saveButtonLoading}>
                  <GradientSpinner
                    size={28}
                    thickness={3}
                    style={{
                      marginVertical: 50,
                      alignItems: 'center',
                      alignSelf: 'center',
                    }}
                    colors={[
                      colors.modal.activeBorder,
                      colors.modal.activeBorder,
                      'transparent',
                      'transparent',
                    ]}
                  />
                </View>
              ) : (
                <Text style={styles.saveButtonText}>
                  {editingFilter ? 'Update' : 'Save'}
                </Text>
              )}
            </TouchableOpacity>
            {editingFilter && (
              <TouchableOpacity
                style={[
                  styles.footerButton,
                  styles.resetButton,
                  {backgroundColor: colors.button.delete},
                ]}
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

const styles = {
  ...modalStyles,
  confirmOverlay: {
    position: 'absolute' as import('react-native').ViewStyle['position'],
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent:
      'center' as import('react-native').ViewStyle['justifyContent'],
    alignItems: 'center' as import('react-native').ViewStyle['alignItems'],
    zIndex: 100,
  },
  confirmModal: {
    width: 320 as import('react-native').ViewStyle['width'],
    backgroundColor: colors.modal.active,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center' as import('react-native').ViewStyle['alignItems'],
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  confirmTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  confirmMessage: {
    ...typography.body1,
    color: colors.text.secondary,
    textAlign: 'center' as import('react-native').TextStyle['textAlign'],
    marginBottom: spacing.lg,
  },
  confirmActions: {
    flexDirection: 'row' as import('react-native').ViewStyle['flexDirection'],
    justifyContent:
      'space-between' as import('react-native').ViewStyle['justifyContent'],
    width: '100%' as never,
    // gap: spacing.md, // Remove gap if unsupported
  },
  confirmButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center' as import('react-native').ViewStyle['alignItems'],
  },
  cancelButton: {
    backgroundColor: colors.text.primary,
    marginRight: spacing.sm,
  },
  deleteButton: {
    backgroundColor: colors.modal.active,
    marginLeft: spacing.sm,
  },
  cancelButtonText: {
    color: colors.background.primary,
    ...typography.button,
  },
  deleteButtonText: {
    color: colors.text.primary,
    ...typography.button,
  },
};
