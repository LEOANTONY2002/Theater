import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  TextInput,
} from 'react-native';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import Icon from 'react-native-vector-icons/Ionicons';
import Slider from '@react-native-community/slider';
import {getGenres, getAvailableWatchProviders} from '../services/tmdb';
import {Chip} from './Chip';

export type FilterOptions = {
  contentType: 'all' | 'movie' | 'tv';
  genres: string[];
  yearRange: {
    min: number;
    max: number;
  };
  ratingRange: {
    min: number;
    max: number;
  };
  sortBy: 'popularity' | 'release_date' | 'vote_average' | 'title';
  sortOrder: 'asc' | 'desc';
  includeAdult: boolean;
  language: string;
  watchProviders: string[];
};

type Genre = {
  id: number;
  name: string;
};

type WatchProvider = {
  provider_id: number;
  provider_name: string;
  logo_path: string;
};

type Props = {
  isVisible: boolean;
  onClose: () => void;
  onApply: (filters: FilterOptions) => void;
  initialFilters: FilterOptions;
};

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1900;
const MIN_RATING = 0;
const MAX_RATING = 10;

export const SearchFilters: React.FC<Props> = ({
  isVisible,
  onClose,
  onApply,
  initialFilters,
}) => {
  const [filters, setFilters] = useState<FilterOptions>(initialFilters);
  const [movieGenres, setMovieGenres] = useState<Genre[]>([]);
  const [tvGenres, setTvGenres] = useState<Genre[]>([]);
  const [watchProviders, setWatchProviders] = useState<WatchProvider[]>([]);

  useEffect(() => {
    const loadGenres = async () => {
      try {
        const [movieGenresData, tvGenresData, watchProvidersData] = await Promise.all([
          getGenres('movie'),
          getGenres('tv'),
          getAvailableWatchProviders(),
        ]);
        setMovieGenres(movieGenresData);
        setTvGenres(tvGenresData);
        setWatchProviders(watchProvidersData);
      } catch (error) {
        console.error('Error loading genres:', error);
      }
    };
    loadGenres();
  }, []);

  const handleContentTypeChange = (type: 'all' | 'movie' | 'tv') => {
    setFilters(prev => ({...prev, contentType: type}));
  };

  const handleGenreToggle = (genreId: string) => {
    setFilters(prev => ({
      ...prev,
      genres: prev.genres.includes(genreId)
        ? prev.genres.filter(id => id !== genreId)
        : [...prev.genres, genreId],
    }));
  };

  const handleWatchProviderToggle = (providerId: string) => {
    setFilters(prev => ({
      ...prev,
      watchProviders: prev.watchProviders.includes(providerId)
        ? prev.watchProviders.filter(id => id !== providerId)
        : [...prev.watchProviders, providerId],
    }));
  };

  const handleSortByChange = (
    sortBy: 'popularity' | 'release_date' | 'vote_average' | 'title',
  ) => {
    setFilters(prev => ({...prev, sortBy}));
  };

  const handleSortOrderChange = () => {
    setFilters(prev => ({
      ...prev,
      sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleReset = () => {
    setFilters({
      contentType: 'all',
      genres: [],
      yearRange: {
        min: MIN_YEAR,
        max: CURRENT_YEAR,
      },
      ratingRange: {
        min: MIN_RATING,
        max: MAX_RATING,
      },
      sortBy: 'popularity',
      sortOrder: 'desc',
      includeAdult: false,
      language: 'en',
      watchProviders: [],
    });
  };

  const getActiveGenres = () => {
    if (filters.contentType === 'movie') return movieGenres;
    if (filters.contentType === 'tv') return tvGenres;
    return [...movieGenres, ...tvGenres];
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Filters</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent}>
            {/* Content Type */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Content Type</Text>
              <View style={styles.contentTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.contentTypeButton,
                    filters.contentType === 'all' && styles.activeButton,
                  ]}
                  onPress={() => handleContentTypeChange('all')}>
                  <Text
                    style={[
                      styles.contentTypeText,
                      filters.contentType === 'all' && styles.activeText,
                    ]}>
                    All
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.contentTypeButton,
                    filters.contentType === 'movie' && styles.activeButton,
                  ]}
                  onPress={() => handleContentTypeChange('movie')}>
                  <Text
                    style={[
                      styles.contentTypeText,
                      filters.contentType === 'movie' && styles.activeText,
                    ]}>
                    Movies
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.contentTypeButton,
                    filters.contentType === 'tv' && styles.activeButton,
                  ]}
                  onPress={() => handleContentTypeChange('tv')}>
                  <Text
                    style={[
                      styles.contentTypeText,
                      filters.contentType === 'tv' && styles.activeText,
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
                {getActiveGenres().map(genre => (
                  <Chip
                    key={genre.id}
                    label={genre.name}
                    selected={filters.genres.includes(String(genre.id))}
                    onPress={() => handleGenreToggle(String(genre.id))}
                  />
                ))}
              </View>
            </View>

            {/* Year Range */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Year Range</Text>
              <View style={styles.rangeContainer}>
                <View style={styles.rangeInputContainer}>
                  <TextInput
                    style={styles.rangeInput}
                    value={String(filters.yearRange.min)}
                    onChangeText={text =>
                      setFilters(prev => ({
                        ...prev,
                        yearRange: {...prev.yearRange, min: Number(text)},
                      }))
                    }
                    keyboardType="numeric"
                    maxLength={4}
                  />
                  <Text style={styles.rangeSeparator}>to</Text>
                  <TextInput
                    style={styles.rangeInput}
                    value={String(filters.yearRange.max)}
                    onChangeText={text =>
                      setFilters(prev => ({
                        ...prev,
                        yearRange: {...prev.yearRange, max: Number(text)},
                      }))
                    }
                    keyboardType="numeric"
                    maxLength={4}
                  />
                </View>
              </View>
            </View>

            {/* Rating Range */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Rating Range</Text>
              <View style={styles.rangeContainer}>
                <Slider
                  style={styles.slider}
                  minimumValue={MIN_RATING}
                  maximumValue={MAX_RATING}
                  value={filters.ratingRange.min}
                  onValueChange={value =>
                    setFilters(prev => ({
                      ...prev,
                      ratingRange: {...prev.ratingRange, min: value},
                    }))
                  }
                  minimumTrackTintColor={colors.primary}
                  maximumTrackTintColor={colors.text.secondary}
                />
                <Slider
                  style={styles.slider}
                  minimumValue={MIN_RATING}
                  maximumValue={MAX_RATING}
                  value={filters.ratingRange.max}
                  onValueChange={value =>
                    setFilters(prev => ({
                      ...prev,
                      ratingRange: {...prev.ratingRange, max: value},
                    }))
                  }
                  minimumTrackTintColor={colors.primary}
                  maximumTrackTintColor={colors.text.secondary}
                />
                <Text style={styles.rangeText}>
                  {filters.ratingRange.min.toFixed(1)} -{' '}
                  {filters.ratingRange.max.toFixed(1)}
                </Text>
              </View>
            </View>

            {/* Sort Options */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sort By</Text>
              <View style={styles.sortContainer}>
                <View style={styles.sortButtons}>
                  <TouchableOpacity
                    style={[
                      styles.sortButton,
                      filters.sortBy === 'popularity' && styles.activeButton,
                    ]}
                    onPress={() => handleSortByChange('popularity')}>
                    <Text
                      style={[
                        styles.sortButtonText,
                        filters.sortBy === 'popularity' && styles.activeText,
                      ]}>
                      Popularity
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.sortButton,
                      filters.sortBy === 'release_date' && styles.activeButton,
                    ]}
                    onPress={() => handleSortByChange('release_date')}>
                    <Text
                      style={[
                        styles.sortButtonText,
                        filters.sortBy === 'release_date' && styles.activeText,
                      ]}>
                      Release Date
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.sortButton,
                      filters.sortBy === 'vote_average' && styles.activeButton,
                    ]}
                    onPress={() => handleSortByChange('vote_average')}>
                    <Text
                      style={[
                        styles.sortButtonText,
                        filters.sortBy === 'vote_average' && styles.activeText,
                      ]}>
                      Rating
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.sortButton,
                      filters.sortBy === 'title' && styles.activeButton,
                    ]}
                    onPress={() => handleSortByChange('title')}>
                    <Text
                      style={[
                        styles.sortButtonText,
                        filters.sortBy === 'title' && styles.activeText,
                      ]}>
                      Title
                    </Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.sortOrderButton}
                  onPress={handleSortOrderChange}>
                  <Icon
                    name={
                      filters.sortOrder === 'asc'
                        ? 'arrow-up-outline'
                        : 'arrow-down-outline'
                    }
                    size={24}
                    color={colors.text.primary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Watch Providers */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Watch Providers</Text>
              <View style={styles.genresContainer}>
                {watchProviders.map((provider, index) => (
                  <Chip
                    key={`search-provider-${provider.provider_id}-${index}`}
                    label={provider.provider_name}
                    selected={filters.watchProviders.includes(String(provider.provider_id))}
                    onPress={() => {
                      console.log('SearchFilters chip pressed:', provider.provider_id, provider.provider_name);
                      handleWatchProviderToggle(String(provider.provider_id));
                    }}
                    imageUrl={provider.logo_path}
                    imageOnly={true}
                  />
                ))}
              </View>
            </View>

            {/* Adult Content */}
            <View style={styles.section}>
              <View style={styles.switchContainer}>
                <Text style={styles.sectionTitle}>Include Adult Content</Text>
                <Switch
                  value={filters.includeAdult}
                  onValueChange={value =>
                    setFilters(prev => ({...prev, includeAdult: value}))
                  }
                  trackColor={{
                    false: '#666',
                    true: colors.primary,
                  }}
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => {
                // Convert watchProviders array to with_watch_providers format (using | for OR operation)
                const convertedFilters = {
                  ...filters,
                  with_watch_providers: filters.watchProviders.length > 0 
                    ? filters.watchProviders.join('|') 
                    : undefined,
                  watch_region: filters.watchProviders.length > 0 ? 'US' : undefined,
                };
                onApply(convertedFilters);
              }}>
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
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
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.card.border,
  },
  title: {
    color: colors.text.primary,
    ...typography.h2,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    color: colors.text.primary,
    ...typography.h3,
    marginBottom: spacing.md,
  },
  contentTypeContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  contentTypeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.card.border,
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  contentTypeText: {
    color: colors.text.primary,
    ...typography.body2,
  },
  activeText: {
    color: '#fff',
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  rangeContainer: {
    alignItems: 'stretch',
  },
  rangeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  rangeInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: colors.card.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    color: colors.text.primary,
    textAlign: 'center',
  },
  rangeSeparator: {
    color: colors.text.secondary,
    ...typography.body2,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  rangeText: {
    color: colors.text.secondary,
    ...typography.body2,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  sortButtons: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sortButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.card.border,
  },
  sortButtonText: {
    color: colors.text.primary,
    ...typography.body2,
  },
  sortOrderButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.card.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.card.border,
  },
  resetButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.card.border,
    alignItems: 'center',
  },
  resetButtonText: {
    color: colors.text.primary,
    ...typography.body1,
  },
  applyButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    ...typography.body1,
  },
});
