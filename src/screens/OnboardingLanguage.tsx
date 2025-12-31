import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import {colors, spacing, borderRadius, typography} from '../styles/theme';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import {SettingsManager, Language} from '../store/settings';
import {useQueryClient} from '@tanstack/react-query';
import {useResponsive} from '../hooks/useResponsive';
import {LanguageSettings} from '../components/LanguageSettings';

const OnboardingLanguage: React.FC<{
  onDone: () => void;
  onSkip: () => void;
  onBack: () => void;
}> = ({onDone, onSkip, onBack}) => {
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(
    null,
  );
  const queryClient = useQueryClient();
  const {isTablet} = useResponsive();
  const width = useWindowDimensions().width;

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const lang = await SettingsManager.getMyLanguage();
      if (lang) {
        setSelectedLanguage(lang);
      }
    } catch (error) {}
  };

  const handleLanguageChange = (langs: Language[]) => {
    if (langs && langs.length > 0) {
      setSelectedLanguage(langs[0]);
    } else {
      setSelectedLanguage(null);
    }
  };

  const handleSave = async () => {
    try {
      if (selectedLanguage) {
        await SettingsManager.setMyLanguage(selectedLanguage);
        await SettingsManager.setContentLanguages([selectedLanguage]);
      }
      await Promise.all([
        queryClient.invalidateQueries({queryKey: ['my_language']}),
        queryClient.invalidateQueries({queryKey: ['selectedLanguages']}),
      ]);
      onDone();
    } catch (error) {}
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
          activeOpacity={0.7}>
          <Icon name="chevron-back" size={20} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Language</Text>
        <View style={{width: 36}} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionDescription}>
          Select your preferred language for personalized content
        </Text>

        <View style={styles.languageContainer}>
          <LinearGradient
            pointerEvents="none"
            colors={[colors.background.primary, 'transparent']}
            style={styles.gradientTop}
          />
          <LanguageSettings
            isTitle={false}
            singleSelect
            disablePersistence
            initialSelectedIso={
              selectedLanguage?.iso_639_1 ? [selectedLanguage.iso_639_1] : []
            }
            onChangeSelected={handleLanguageChange}
          />
          <LinearGradient
            pointerEvents="none"
            colors={['transparent', colors.background.primary]}
            style={styles.gradientBottom}
          />
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity activeOpacity={0.9} onPress={onSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.9}
          disabled={!selectedLanguage}
          onPress={handleSave}>
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={[
              styles.continueButton,
              {
                width: 150,
                opacity: !selectedLanguage ? 0.5 : 1,
              },
            ]}>
            <Text style={styles.continueButtonText}>Continue</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    paddingHorizontal: spacing.lg,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    width: '100%',
  },
  backButton: {
    padding: spacing.sm,
    backgroundColor: colors.modal.blur,
    borderRadius: borderRadius.round,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.modal.content,
  },
  headerTitle: {
    ...typography.h2,
    fontWeight: 'bold',
    color: colors.text.primary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    width: '100%',
    paddingTop: spacing.xl,
  },
  sectionDescription: {
    ...typography.body1,
    color: colors.text.muted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  languageContainer: {
    flex: 1,
    marginTop: spacing.md,
    position: 'relative',
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 40,
    zIndex: 1,
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    zIndex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.xxl,
    paddingVertical: spacing.md,
  },
  skipText: {
    color: colors.text.muted,
    fontFamily: 'Inter_18pt-Regular',
  },
  continueButton: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    color: colors.text.primary,
    fontWeight: 'bold',
    fontFamily: 'Inter_18pt-Regular',
  },
});

export default OnboardingLanguage;
