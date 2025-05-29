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

export const LanguageSettings = () => {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<Language[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [languagesData, savedLanguages] = await Promise.all([
          getLanguages(),
          SettingsManager.getContentLanguages(),
        ]);

        // Sort languages by English name
        const sortedLanguages = languagesData.sort((a: Language, b: Language) =>
          a.english_name.localeCompare(b.english_name),
        );
        setLanguages(sortedLanguages);
        setSelectedLanguages(savedLanguages);
      } catch (error) {
        console.error('Error loading languages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const toggleLanguage = async (language: Language) => {
    const isSelected = selectedLanguages.some(
      (lang: Language) => lang.iso_639_1 === language.iso_639_1,
    );

    let newSelectedLanguages: Language[];
    if (isSelected) {
      newSelectedLanguages = selectedLanguages.filter(
        (lang: Language) => lang.iso_639_1 !== language.iso_639_1,
      );
    } else {
      newSelectedLanguages = [...selectedLanguages, language];
    }

    setSelectedLanguages(newSelectedLanguages);
    await SettingsManager.setContentLanguages(newSelectedLanguages);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.description}>
        Select the languages you want to see content in. Content in other
        languages will be filtered out.
      </Text>
      <ScrollView style={styles.languageList}>
        {languages.map(language => {
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
                <Text style={styles.nativeName}>({language.name})</Text>
              </View>
              {isSelected && (
                <Icon name="checkmark" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
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
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
  },
  selectedItem: {
    borderColor: colors.primary,
    borderWidth: 1,
  },
  languageInfo: {
    flex: 1,
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
