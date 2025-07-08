import React, {useState, useEffect} from 'react';
import {
  View,
  Modal,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Switch,
  FlatList,
  Alert,
  Modal as RNModal,
} from 'react-native';
import {Picker} from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {BlurView} from '@react-native-community/blur';
import {colors, spacing, borderRadius, typography} from '../styles/theme';
import {FilterParams, SORT_OPTIONS} from '../types/filters';
import {getLanguages, getGenres, searchFilterContent} from '../services/tmdb';
import {Chip} from './Chip';
import {FiltersManager} from '../store/filters';
import type {SavedFilter} from '../types/filters';
import {modalStyles} from '../styles/styles';

interface Language {
  iso_639_1: string;
  english_name: string;
  name: string;
}

interface Genre {
  id: number;
  name: string;
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterParams, contentType: 'all' | 'movie' | 'tv') => void;
  initialFilters: FilterParams;
  initialContentType: 'all' | 'movie' | 'tv';
  onReset?: () => void;
  savedFilters: SavedFilter[];
}

export const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  onApply,
  initialFilters,
  initialContentType,
  onReset,
}) => {
  const [filters, setFilters] = useState<FilterParams>(initialFilters);
  const [contentType, setContentType] = useState<'all' | 'movie' | 'tv'>(
    initialContentType,
  );
  const [showFromDate, setShowFromDate] = useState(false);
  const [showToDate, setShowToDate] = useState(false);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(false);
  const [movieGenres, setMovieGenres] = useState<Genre[]>([]);
  const [tvGenres, setTvGenres] = useState<Genre[]>([]);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isApplyingSavedFilter, setIsApplyingSavedFilter] = useState(false);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newFilterName, setNewFilterName] = useState('');
  const [saving, setSaving] = useState(false);
  const [checkingResults, setCheckingResults] = useState(false);
  const [showNoResultsModal, setShowNoResultsModal] = useState(false);

  useEffect(() => {
    const fetchFilters = async () => {
      const filters = await FiltersManager.getSavedFilters();
      console.log('Fetched saved filters:', filters);
      setSavedFilters(filters);
    };
    fetchFilters();
  });

  // Only set filters and contentType from props when modal is opened
  useEffect(() => {
    if (visible) {
      setFilters(initialFilters);
      setContentType(initialContentType);
      // Do NOT reset or reload any other state here
    }
    // Only run when modal is opened
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

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
    // Only clear genres when content type changes naturally, not when applying saved filter
    if (!isApplyingSavedFilter) {
      setFilters(prev => ({...prev, with_genres: undefined}));
    }
    setIsApplyingSavedFilter(false);
  }, [contentType]);

  const handleSortChange = (value: string) => {
    if (!value) {
      setFilters(prev => ({...prev, sort_by: undefined}));
      return;
    }
    // Don't append sortOrder here since the value already includes it
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
    onReset?.();
  };

  const handleApply = () => {
    onApply(filters, contentType);
    onClose();
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

  const handleSortOrderToggle = () => {
    setSortOrder(prev => {
      const newOrder = prev === 'asc' ? 'desc' : 'asc';
      if (filters.sort_by) {
        const [field] = filters.sort_by.split('.');
        // Find the matching sort option with the new order
        const newSortBy = SORT_OPTIONS.find(
          option => option.value === `${field}.${newOrder}`,
        )?.value;
        if (newSortBy) {
          setFilters(prevFilters => ({
            ...prevFilters,
            sort_by: newSortBy,
          }));
        }
      }
      return newOrder;
    });
  };

  const getFilteredGenres = () => {
    if (contentType === 'movie') return movieGenres;
    if (contentType === 'tv') return tvGenres;

    // For "All", combine genres and remove duplicates by name
    const uniqueGenres = new Map();
    [...movieGenres, ...tvGenres].forEach(genre => {
      if (!uniqueGenres.has(genre.name)) {
        uniqueGenres.set(genre.name, genre);
      }
    });
    return Array.from(uniqueGenres.values());
  };

  const handleSavedFilterSelect = (savedFilter: SavedFilter) => {
    setIsApplyingSavedFilter(true);
    setContentType(savedFilter.type);
    setFilters(savedFilter.params);

    // Update sort order when applying saved filter
    if (savedFilter.params.sort_by) {
      const [, order] = savedFilter.params.sort_by.split('.');
      setSortOrder(order as 'asc' | 'desc');
    } else {
      setSortOrder('desc');
    }
  };

  // In the component body, add a helper to check if the current filter matches any saved filter
  const isCurrentFilterSaved = savedFilters.some(
    (filter: SavedFilter) =>
      JSON.stringify(filters) === JSON.stringify(filter.params) &&
      contentType === filter.type,
  );

  // Handler to save the current filter
  const handleSaveCurrentFilter = async () => {
    setCheckingResults(true);
    try {
      const res = await searchFilterContent(
        {
          type: contentType,
          params: filters,
          id: 'preview',
          name: 'preview',
          createdAt: Date.now(),
        },
        1,
      );
      if (res?.results?.length > 0) {
        setShowSaveModal(true);
        setNewFilterName('');
      } else {
        setShowNoResultsModal(true);
      }
    } catch (e) {
      setShowNoResultsModal(true);
    } finally {
      setCheckingResults(false);
    }
  };

  const handleConfirmSaveFilter = async () => {
    if (!newFilterName.trim()) return;
    setSaving(true);
    try {
      await FiltersManager.saveFilter(
        newFilterName.trim(),
        filters,
        contentType,
      );
      const newFilters = await FiltersManager.getSavedFilters();
      setSavedFilters(newFilters);
      setShowSaveModal(false);
    } catch (e) {
      console.error('Failed to save filter:', e);
      setShowSaveModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelSaveFilter = () => {
    setShowSaveModal(false);
    setNewFilterName('');
  };

  // If you do not have filteredContent, default hasResults to true
  const hasResults = true; // TODO: Replace with real result check if available

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
            blurAmount={20}
            overlayColor={colors.modal.blur}
            reducedTransparencyFallbackColor={'rgb(255, 255, 255)'}
          />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent}>
            {/* Saved Filters Section */}
            {savedFilters.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>My Filters</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{...styles.scrollContent, padding: 0}}>
                  {savedFilters.map((filter: SavedFilter) => (
                    <TouchableOpacity
                      key={filter.id}
                      style={[
                        styles.tag,
                        JSON.stringify(filters) ===
                          JSON.stringify(filter.params) &&
                          contentType === filter.type &&
                          styles.activeTag,
                      ]}
                      onPress={() => handleSavedFilterSelect(filter)}>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.tagText,
                          JSON.stringify(filters) ===
                            JSON.stringify(filter.params) &&
                            contentType === filter.type &&
                            styles.activeTagText,
                        ]}>
                        {filter.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

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
              <Text style={styles.sectionTitle}>Sort By</Text>
              {/* <TouchableOpacity onPress={handleSortOrderToggle}>
                  <Ionicons
                    name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
                    size={20}
                    color={colors.text.primary}
                  />
                </TouchableOpacity> */}
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
                    <ActivityIndicator color={colors.accent} />
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
                thumbTintColor={colors.accent}
                minimumTrackTintColor={colors.accent}
                maximumTrackTintColor={colors.background.primary}
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

          <View style={[styles.footer, {alignItems: 'center'}]}>
            <TouchableOpacity
              style={[styles.footerButton, styles.resetButton]}
              onPress={handleReset}>
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerButton, styles.applyButton]}
              onPress={handleApply}>
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
            {!isCurrentFilterSaved &&
              (checkingResults ? (
                <View
                  style={[
                    {
                      width: 40,
                      marginRight: 8,
                      justifyContent: 'center',
                      alignItems: 'center',
                    },
                  ]}>
                  <ActivityIndicator size={28} color={colors.accent} />
                </View>
              ) : (
                <TouchableOpacity
                  style={{
                    marginRight: 8,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: colors.modal.active,
                    borderRadius: borderRadius.round,
                    width: 40,
                    height: 40,
                  }}
                  onPress={handleSaveCurrentFilter}>
                  <Ionicons
                    name="add-outline"
                    size={28}
                    color={colors.accent}
                  />
                </TouchableOpacity>
              ))}
          </View>

          {/* Save Filter Modal */}
          <RNModal
            visible={showSaveModal}
            transparent
            animationType="fade"
            onRequestClose={handleCancelSaveFilter}>
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: colors.modal.blur,
              }}>
              <View
                style={{
                  backgroundColor: colors.modal.active,
                  borderRadius: 16,
                  padding: 24,
                  width: 300,
                  alignItems: 'center',
                }}>
                <Text
                  style={{
                    color: 'rgba(50, 50, 50, 0.8)',
                    fontSize: 18,
                    fontWeight: 800,
                    marginBottom: 16,
                  }}>
                  Save Filter
                </Text>
                <TextInput
                  style={{
                    backgroundColor: colors.modal.active,
                    color: '#fff',
                    borderRadius: 8,
                    padding: 10,
                    width: '100%',
                    height: 50,
                    marginBottom: 16,
                  }}
                  placeholder="Filter name"
                  placeholderTextColor="rgba(110, 110, 110, 0.27)"
                  value={newFilterName}
                  onChangeText={setNewFilterName}
                  editable={!saving}
                  autoFocus
                />
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    width: '100%',
                  }}>
                  <TouchableOpacity
                    style={{
                      flex: 1 / 2,
                      marginRight: 8,
                      padding: 10,
                      borderRadius: 8,
                      backgroundColor: '#444',
                      alignItems: 'center',
                    }}
                    onPress={handleCancelSaveFilter}
                    disabled={saving}>
                    <Text style={{color: '#fff', fontWeight: 600}}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      flex: 1 / 2,
                      marginLeft: 8,
                      padding: 10,
                      borderRadius: 8,
                      backgroundColor: colors.text.primary,
                      alignItems: 'center',
                      opacity: !newFilterName.trim() || saving ? 0.5 : 1,
                    }}
                    onPress={handleConfirmSaveFilter}
                    disabled={!newFilterName.trim() || saving}>
                    <Text style={{color: '#444', fontWeight: 600}}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </RNModal>

          {/* No Results Modal */}
          <RNModal
            visible={showNoResultsModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowNoResultsModal(false)}>
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: colors.modal.blur,
              }}>
              <View
                style={{
                  backgroundColor: colors.modal.active,
                  borderRadius: 16,
                  padding: 24,
                  width: 300,
                  alignItems: 'center',
                }}>
                <Text
                  style={{
                    color: '#444',
                    fontSize: 18,
                    marginBottom: 6,
                    fontWeight: 800,
                  }}>
                  No Results
                </Text>
                <Text
                  style={{color: '#fff', marginBottom: 16, fontWeight: 400}}>
                  This filter has no content
                </Text>
                <TouchableOpacity
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    backgroundColor: colors.accent,
                    alignItems: 'center',
                    width: 100,
                  }}
                  onPress={() => setShowNoResultsModal(false)}>
                  <Text style={{color: '#444', fontWeight: 'bold'}}>OK</Text>
                </TouchableOpacity>
              </View>
            </View>
          </RNModal>
        </View>
      </View>
    </Modal>
  );
};

const styles = modalStyles;
