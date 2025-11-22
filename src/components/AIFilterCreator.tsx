import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import {colors, spacing, borderRadius, typography} from '../styles/theme';
import Icon from 'react-native-vector-icons/Ionicons';
import {parseNaturalLanguageToFilters} from '../services/gemini';
import {useGenres} from '../hooks/useGenres';
import LinearGradient from 'react-native-linear-gradient';
import {MaybeBlurView} from './MaybeBlurView';
import {FilterParams, SavedFilter} from '../types/filters';
import {useQuery} from '@tanstack/react-query';
import {getAvailableWatchProviders} from '../services/tmdb';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {FiltersManager} from '../store/filters';
import languageData from '../utils/language.json';

const AI_SEARCH_HISTORY_KEY = '@ai_search_history';
const MAX_HISTORY_ITEMS = 5;

interface AIFilterCreatorProps {
  visible: boolean;
  onClose: () => void;
  onSave: (filter: SavedFilter) => void;
  editingFilter?: SavedFilter | null;
}

export const AIFilterCreator: React.FC<AIFilterCreatorProps> = ({
  visible,
  onClose,
  onSave,
  editingFilter,
}) => {
  const [query, setQuery] = useState('');
  const [filterName, setFilterName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  const {data: movieGenres = []} = useGenres('movie');
  const {data: tvGenres = []} = useGenres('tv');

  // Languages are static - import directly
  const languages = languageData;

  const {data: watchProviders = []} = useQuery({
    queryKey: ['available_watch_providers', 'movie'],
    queryFn: () => getAvailableWatchProviders(),
    staleTime: 1000 * 60 * 60,
  });

  // Load AI search history
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const stored = await AsyncStorage.getItem(AI_SEARCH_HISTORY_KEY);
        if (stored) {
          setSearchHistory(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Error loading AI search history:', error);
      }
    };
    if (visible) {
      loadHistory();
      if (editingFilter) {
        setFilterName(editingFilter.name);
      }
    }
  }, [visible, editingFilter]);

  // Save to history
  const saveToHistory = async (searchQuery: string) => {
    try {
      const trimmed = searchQuery.trim();
      if (!trimmed) return;

      const updated = [
        trimmed,
        ...searchHistory.filter(item => item !== trimmed),
      ].slice(0, MAX_HISTORY_ITEMS);

      await AsyncStorage.setItem(
        AI_SEARCH_HISTORY_KEY,
        JSON.stringify(updated),
      );
      setSearchHistory(updated);
    } catch (error) {
      console.error('Error saving AI search history:', error);
    }
  };

  const handleCreate = async () => {
    if (!query.trim()) {
      setError('Please enter a search query');
      return;
    }

    if (!filterName.trim()) {
      setError('Please enter a filter name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await parseNaturalLanguageToFilters(
        query,
        movieGenres,
        tvGenres,
        languages,
        watchProviders,
      );

      if (result) {
        await saveToHistory(query);

        if (editingFilter) {
          const updatedFilter: SavedFilter = {
            ...editingFilter,
            name: filterName.trim(),
            params: result.filters as FilterParams,
            type: result.contentType,
          };
          await FiltersManager.updateFilter(editingFilter.id, updatedFilter);
          onSave(updatedFilter);
        } else {
          const filterId = await FiltersManager.saveFilter(
            filterName.trim(),
            result.filters as FilterParams,
            result.contentType,
          );

          // Create filter object for callback with the actual ID from storage
          const newFilter: SavedFilter = {
            id: filterId, // Use the ID returned from FiltersManager
            name: filterName.trim(),
            params: result.filters as FilterParams,
            type: result.contentType,
            createdAt: Date.now(),
          };
          onSave(newFilter);
        }
        setQuery('');
        setFilterName('');
        onClose();
      } else {
        console.warn('[AIFilterCreator] AI returned null result');
        setError('Could not parse your query. Try being more specific.');
      }
    } catch (err) {
      console.error('[AIFilterCreator] ❌ Exception caught:', err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'AI service error. Please check your settings.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setQuery('');
    setFilterName('');
    setError(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      backdropColor={colors.modal.blurDark}
      statusBarTranslucent
      onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <MaybeBlurView
          isSingle
          style={{
            padding: spacing.md,
          }}>
          <View style={styles.header}>
            <Icon name="sparkles" size={24} color={colors.accent} />
            <Text style={styles.title}>AI Filter Creator</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Create a custom filter using natural language
          </Text>

          <View style={styles.examplesContainer}>
            <Text style={styles.examplesTitle}>
              {searchHistory.length > 0
                ? 'Recent Searches:'
                : 'Quick Searches:'}
            </Text>
            {searchHistory.length > 0 ? (
              <>
                {searchHistory.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.exampleChip}
                    onPress={() => setQuery(item)}>
                    <Icon
                      name="time-outline"
                      size={14}
                      color={colors.text.muted}
                    />
                    <Text style={styles.exampleChipText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.exampleChip}
                  onPress={() =>
                    setQuery('90s romantic comedies with happy endings')
                  }>
                  <Icon name="flash" size={14} color={colors.accent} />
                  <Text style={styles.exampleChipText}>
                    90s romantic comedies
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.exampleChip}
                  onPress={() =>
                    setQuery('highly rated sci-fi movies from 2020s')
                  }>
                  <Icon name="flash" size={14} color={colors.accent} />
                  <Text style={styles.exampleChipText}>
                    Highly rated sci-fi (2020s)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.exampleChip}
                  onPress={() =>
                    setQuery('thriller TV shows under 45 minutes')
                  }>
                  <Icon name="flash" size={14} color={colors.accent} />
                  <Text style={styles.exampleChipText}>
                    Short thriller shows
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Icon
              name="pricetag-outline"
              size={20}
              color={colors.text.tertiary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.nameInput}
              placeholder="Filter name (e.g., My 90s Romcoms)"
              placeholderTextColor={colors.text.tertiary}
              value={filterName}
              onChangeText={setFilterName}
              maxLength={50}
            />
          </View>

          <View style={styles.inputContainer}>
            <Icon
              name="search-outline"
              size={20}
              color={colors.text.tertiary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="e.g., dark comedy movies from 2010s"
              placeholderTextColor={colors.text.tertiary}
              value={query}
              onChangeText={setQuery}
              multiline
              maxLength={200}
            />
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Icon name="alert-circle" size={16} color={colors.status.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.parseButton}
            onPress={handleCreate}
            disabled={loading || !query.trim() || !filterName.trim()}>
            <LinearGradient
              colors={
                loading || !query.trim() || !filterName.trim()
                  ? ['#555', '#444']
                  : [colors.primary, colors.secondary]
              }
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={styles.parseButtonGradient}>
              {loading ? (
                <ActivityIndicator color={colors.text.primary} />
              ) : (
                <>
                  <Icon name="sparkles" size={20} color={colors.text.primary} />
                  <Text style={styles.parseButtonText}>
                    {editingFilter ? 'Update Filter' : 'Create Filter'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </MaybeBlurView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    flex: 1,
    ...typography.h2,
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  closeButton: {
    padding: spacing.xs,
  },
  subtitle: {
    ...typography.body2,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  examplesContainer: {
    backgroundColor: colors.modal.content,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.modal.border,
  },
  examplesTitle: {
    ...typography.caption,
    color: colors.text.muted,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  exampleText: {
    ...typography.body2,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  exampleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.modal.content,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.modal.border,
    gap: spacing.xs,
  },
  exampleChipText: {
    ...typography.body2,
    color: colors.text.primary,
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.modal.content,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.modal.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  inputIcon: {
    marginTop: 2,
    marginRight: spacing.sm,
  },
  nameInput: {
    flex: 1,
    color: colors.text.primary,
    ...typography.body1,
    height: 40,
  },
  input: {
    flex: 1,
    color: colors.text.primary,
    ...typography.body1,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.body2,
    color: colors.status.error,
    marginLeft: spacing.xs,
    flex: 1,
  },
  parseButton: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  parseButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  parseButtonText: {
    ...typography.body1,
    color: colors.text.primary,
    fontWeight: '600',
  },
});
