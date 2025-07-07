import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {getLanguages} from '../services/tmdb';
import {SettingsManager, Language} from '../store/settings';
import Icon from 'react-native-vector-icons/Ionicons';
import {useQuery, useQueryClient} from '@tanstack/react-query';

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

export const LanguageSettings = () => {
  const queryClient = useQueryClient();
  const [selectedLanguages, setSelectedLanguages] = useState<Language[]>([]);

  // Query for all languages
  const {data: languages = [], isLoading: isLoadingLanguages} = useQuery({
    queryKey: ['languages'],
    queryFn: fetchLanguages,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  // Query for selected languages with enabled setting
  const {data: savedLanguages = [], isLoading: isLoadingSaved} = useQuery<
    Language[]
  >({
    queryKey: ['selectedLanguages'],
    queryFn: SettingsManager.getContentLanguages,
    initialData: [],
    enabled: true, // Always enable this query
    staleTime: 0, // Consider data always stale to ensure fresh data
  });

  // Update selected languages when saved languages change
  useEffect(() => {
    if (savedLanguages.length > 0) {
      setSelectedLanguages(savedLanguages);
    }
  }, [savedLanguages, isLoadingSaved, languages]);

  const toggleLanguage = async (language: Language) => {
    const isSelected = selectedLanguages.some(
      (lang: Language) => lang.iso_639_1 === language.iso_639_1,
    );

    let newSelectedLanguages: Language[];
    if (isSelected) {
      // Allow removing any language, including the last one
      newSelectedLanguages = selectedLanguages.filter(
        (lang: Language) => lang.iso_639_1 !== language.iso_639_1,
      );
    } else {
      newSelectedLanguages = [...selectedLanguages, language];
    }

    setSelectedLanguages(newSelectedLanguages);
    await SettingsManager.setContentLanguages(newSelectedLanguages);
    queryClient.invalidateQueries({queryKey: ['selectedLanguages']});
  };

  if (isLoadingLanguages || isLoadingSaved) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.text.muted} />
      </View>
    );
  }

  // Sort languages by English name
  const sortedLanguages = [...languages].sort((a: Language, b: Language) =>
    a.english_name.localeCompare(b.english_name),
  );

  const suggestedLanguages = sortedLanguages.filter(lang =>
    SUGGESTED_LANGUAGE_CODES.includes(lang.iso_639_1),
  );
  const otherLanguages = sortedLanguages.filter(
    lang => !SUGGESTED_LANGUAGE_CODES.includes(lang.iso_639_1),
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>
        Choose your preferred content languages
      </Text>
      <View style={styles.section}>
        {suggestedLanguages.map(language => {
          const isSelected = selectedLanguages.some(
            (lang: Language) => lang.iso_639_1 === language.iso_639_1,
          );

          return (
            <TouchableOpacity
              key={language.iso_639_1}
              style={[styles.languageItem, isSelected && styles.selectedItem]}
              activeOpacity={0.8}
              onPress={() => toggleLanguage(language)}>
              <View style={styles.languageInfo}>
                <Text style={styles.languageName}>{language.english_name}</Text>
                <Text style={styles.nativeName}>({language.name})</Text>
              </View>
              {isSelected && (
                <Icon name="checkmark" size={24} color={colors.text.primary} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.description}>More Languages</Text>
        {otherLanguages.map(language => {
          const isSelected = selectedLanguages.some(
            (lang: Language) => lang.iso_639_1 === language.iso_639_1,
          );

          return (
            <TouchableOpacity
              key={language.iso_639_1}
              style={[styles.languageItem, isSelected && styles.selectedItem]}
              onPress={() => toggleLanguage(language)}>
              <View style={styles.languageInfo}>
                <Text style={styles.languageName}>{language.english_name}</Text>
                {language.name && (
                  <Text style={styles.nativeName}>({language.name})</Text>
                )}
              </View>
              {isSelected && (
                <Icon name="checkmark" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    // paddingTop: 100,
    height: 900,
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
    marginBottom: spacing.md,
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
