import React, {useState} from 'react';
import {
  View,
  Modal,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {Picker} from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';
import Icon from 'react-native-vector-icons/Ionicons';
import {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
} from '../styles/theme';
import {FilterParams, SORT_OPTIONS, LANGUAGE_OPTIONS} from '../types/filters';

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterParams, contentType: 'movie' | 'tv') => void;
  initialFilters: FilterParams;
  initialContentType: 'movie' | 'tv';
}

export const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  onApply,
  initialFilters,
  initialContentType,
}) => {
  const [filters, setFilters] = useState<FilterParams>(initialFilters);
  const [contentType, setContentType] = useState<'movie' | 'tv'>(
    initialContentType,
  );
  const [showFromDate, setShowFromDate] = useState(false);
  const [showToDate, setShowToDate] = useState(false);

  const handleSortChange = (value: string) => {
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

  const handleApply = () => {
    onApply(filters, contentType);
    onClose();
  };

  const handleReset = () => {
    setFilters({});
    setContentType('movie');
  };

  const getDateFromFilter = (key: string) => {
    const dateStr = filters[key as keyof FilterParams];
    return dateStr ? new Date(dateStr as string) : new Date();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Advanced Filters</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent}>
            {/* Content Type */}
            <View style={styles.filterSection}>
              <Text style={styles.sectionTitle}>Content Type</Text>
              <View style={styles.contentTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.contentTypeButton,
                    contentType === 'movie' && styles.activeButton,
                  ]}
                  onPress={() => setContentType('movie')}>
                  <Icon
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
                  <Icon
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

            {/* Sort By */}
            <View style={styles.filterSection}>
              <Text style={styles.sectionTitle}>Sort By</Text>
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
            <View style={styles.filterSection}>
              <Text style={styles.sectionTitle}>Original Language</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={filters.with_original_language}
                  onValueChange={handleLanguageChange}
                  style={styles.picker}
                  dropdownIconColor={colors.text.primary}>
                  <Picker.Item label="Any" value="" />
                  {LANGUAGE_OPTIONS.map(option => (
                    <Picker.Item
                      key={option.value}
                      label={option.label}
                      value={option.value}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Rating */}
            <View style={styles.filterSection}>
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
            <View style={styles.filterSection}>
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
            <View style={styles.filterSection}>
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

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.button, styles.resetButton]}
              onPress={handleReset}>
              <Text style={styles.buttonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.applyButton]}
              onPress={handleApply}>
              <Text style={[styles.buttonText, {color: '#fff'}]}>
                Apply Filters
              </Text>
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
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text.primary,
  },
  closeButton: {
    padding: spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  filterSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.body1,
    color: colors.text.primary,
    marginBottom: spacing.sm,
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
  contentTypeContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  contentTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.secondary,
    gap: spacing.xs,
  },
  activeButton: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  contentTypeText: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  activeText: {
    color: colors.primary,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
  },
  button: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButton: {
    backgroundColor: colors.background.secondary,
  },
  applyButton: {
    backgroundColor: colors.primary,
  },
  buttonText: {
    ...typography.body1,
    color: colors.text.primary,
    fontWeight: '600',
  },
});
