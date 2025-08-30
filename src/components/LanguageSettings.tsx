import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  FlatList,
  ListRenderItem,
} from 'react-native';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {getLanguages} from '../services/tmdb';
import {SettingsManager, Language} from '../store/settings';
import Icon from 'react-native-vector-icons/Ionicons';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {GradientSpinner} from './GradientSpinner';

// Define suggested language codes
const SUGGESTED_LANGUAGE_CODES = [
  'en', // English
  'es', // Spanish
  'fr', // French
  'ja', // Japanese
  'ko', // Korean
  'ta', // Tamil
  'hi', // Hindi
  'zh', // Chinese
  'de', // German
  'it', // Italian
];

const fetchLanguages = async () => {
  // Try to get cached languages first
  const cachedLanguages = await SettingsManager.getCachedLanguages();
  if (cachedLanguages) {
    return cachedLanguages;
  }

  // If no cache, fetch from API and cache
  const languages = await getLanguages();
  await SettingsManager.setCachedLanguages(languages);
  return languages;
};

interface LanguageSettingsProps {
  singleSelect?: boolean;
  disablePersistence?: boolean;
  initialSelectedIso?: string[]; // array of iso codes to preselect
  onChangeSelected?: (langs: Language[]) => void;
}

export const LanguageSettings: React.FC<LanguageSettingsProps> = ({
  singleSelect = false,
  disablePersistence = false,
  initialSelectedIso = [],
  onChangeSelected,
}) => {
  const queryClient = useQueryClient();
  const [selectedLanguages, setSelectedLanguages] = useState<Language[]>([]);

  // Query for all languages
  const {data: languages = [], isLoading: isLoadingLanguages} = useQuery({
    queryKey: ['languages'],
    queryFn: fetchLanguages,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24, // 24h
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Query for selected languages with enabled setting
  const {data: savedLanguages = [], isLoading: isLoadingSaved} = useQuery<
    Language[]
  >({
    queryKey: ['selectedLanguages'],
    queryFn: SettingsManager.getContentLanguages,
    initialData: [],
    enabled: !disablePersistence, // disable when using local-only mode
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60 * 24, // 24h
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Update selected languages when saved languages change
  useEffect(() => {
    if (!disablePersistence) {
      if (savedLanguages.length > 0) {
        setSelectedLanguages(savedLanguages);
      }
    }
  }, [disablePersistence, savedLanguages, isLoadingSaved]);

  // Initialize local selection from props when persistence is disabled and languages are loaded
  useEffect(() => {
    if (disablePersistence && languages.length > 0) {
      if (initialSelectedIso && initialSelectedIso.length > 0) {
        const preselected = languages.filter(l =>
          initialSelectedIso.includes(l.iso_639_1),
        );
        setSelectedLanguages(preselected);
      } else {
        setSelectedLanguages([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disablePersistence, languages]);

  const toggleLanguage = async (language: Language) => {
    const isSelected = selectedLanguages.some(
      (lang: Language) => lang.iso_639_1 === language.iso_639_1,
    );

    let newSelectedLanguages: Language[];
    if (singleSelect) {
      // In single select mode, either clear selection or replace with the new one
      newSelectedLanguages = isSelected ? [] : [language];
    } else {
      if (isSelected) {
        // Allow removing any language, including the last one
        newSelectedLanguages = selectedLanguages.filter(
          (lang: Language) => lang.iso_639_1 !== language.iso_639_1,
        );
      } else {
        newSelectedLanguages = [...selectedLanguages, language];
      }
    }

    setSelectedLanguages(newSelectedLanguages);
    if (disablePersistence) {
      onChangeSelected && onChangeSelected(newSelectedLanguages);
    } else {
      await SettingsManager.setContentLanguages(newSelectedLanguages);
      // Update cache immediately so subscribers react without waiting
      queryClient.setQueryData<Language[]>(
        ['selectedLanguages'],
        newSelectedLanguages,
      );
      // Also invalidate to ensure any background refetch aligns with storage
      queryClient.invalidateQueries({queryKey: ['selectedLanguages']});
    }
  };

  const isLoading =
    isLoadingLanguages || (!disablePersistence && isLoadingSaved);

  // Sort and partition languages (memoized)
  const sortedLanguages = useMemo(() => {
    if (!languages || languages.length === 0) return [] as Language[];
    const copy = [...languages];
    copy.sort((a: Language, b: Language) =>
      a.english_name.localeCompare(b.english_name),
    );
    return copy;
  }, [languages]);

  const suggestedLanguages = useMemo(
    () =>
      sortedLanguages.filter(lang =>
        SUGGESTED_LANGUAGE_CODES.includes(lang.iso_639_1),
      ),
    [sortedLanguages],
  );

  const otherLanguages = useMemo(
    () =>
      sortedLanguages.filter(
        lang => !SUGGESTED_LANGUAGE_CODES.includes(lang.iso_639_1),
      ),
    [sortedLanguages],
  );

  const renderLanguageItem: ListRenderItem<Language> = ({item}) => {
    const isSelected = selectedLanguages.some(
      (lang: Language) => lang.iso_639_1 === item.iso_639_1,
    );
    return (
      <TouchableOpacity
        style={[styles.languageItem, isSelected && styles.selectedItem]}
        activeOpacity={0.8}
        onPress={() => toggleLanguage(item)}>
        <View style={styles.languageInfo}>
          <Text style={styles.languageName}>{item.english_name}</Text>
          {item.name ? (
            <Text style={styles.nativeName}>({item.name})</Text>
          ) : null}
        </View>
        {isSelected && (
          <Icon name="checkmark" size={24} color={colors.text.primary} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {isLoading ? (
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
              colors.transparent,
              colors.transparentDim,
            ]}
          />
        </View>
      ) : (
        <>
          <Text style={styles.sectionTitle}>
            Choose your preferred content languages
          </Text>
          {/* Suggested languages (small set) */}
          <View style={styles.suggestedSection}>
            {suggestedLanguages.map(language => (
              <View key={language.iso_639_1}>
                {renderLanguageItem({
                  item: language,
                  index: 0,
                  separators: {
                    highlight() {},
                    unhighlight() {},
                    updateProps() {},
                  },
                } as any)}
              </View>
            ))}
          </View>

          {/* All other languages */}
          <View style={styles.moreLanguagesSection}>
            <Text style={styles.description}>More Languages</Text>
            {otherLanguages.map(language => (
              <View key={language.iso_639_1}>
                {renderLanguageItem({
                  item: language,
                  index: 0,
                  separators: {
                    highlight() {},
                    unhighlight() {},
                    updateProps() {},
                  },
                } as any)}
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  description: {
    ...typography.body1,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  languageList: {
    flex: 1,
  },
  section: {
    flex: 1,
    marginBottom: spacing.md,
  },
  suggestedSection: {
    marginBottom: spacing.lg,
  },
  moreLanguagesSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.modal.content,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
  },
  selectedItem: {
    borderColor: colors.modal.active,
    backgroundColor: colors.modal.active,
    borderWidth: 1,
  },
  languageInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  languageName: {
    ...typography.body1,
    color: colors.text.primary,
  },
  nativeName: {
    ...typography.body2,
    color: colors.text.secondary,
  },
});
