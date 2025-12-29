import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  FlatList,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {colors, spacing, borderRadius, typography} from '../styles/theme';
import {GradientSpinner} from './GradientSpinner';
import {useResponsive} from '../hooks/useResponsive';

const instructions = [
  {
    id: '1',
    image: require('../assets/DNS1.png'),
    text: 'Open Settings and go to Network & Internet',
  },
  {
    id: '2',
    image: require('../assets/DNS2.png'),
    text: 'Select Private DNS and choose hostname',
  },
  {
    id: '3',
    image: require('../assets/DNS3.png'),
    text: 'Enter dns.google and save the settings',
  },
];

interface DNSSetupGuideProps {
  visible: boolean;
  onTryAgain: () => void;
  isRetrying?: boolean;
}

export const DNSSetupGuide: React.FC<DNSSetupGuideProps> = ({
  visible,
  onTryAgain,
  isRetrying,
}) => {
  const {isTablet} = useResponsive();

  const handlePress = () => {
    onTryAgain();
  };

  if (!visible) {
    return null;
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    scrollContent: {
      alignItems: 'center',
      paddingTop: spacing.xxl,
    },
    titleContainer: {
      marginBottom: spacing.md,
    },
    title: {
      ...typography.h2,
      color: colors.text.primary,
      textAlign: 'center',
    },
    subtitle: {
      ...typography.body2,
      color: colors.text.secondary,
      textAlign: 'center',
      marginBottom: spacing.xl,
      paddingHorizontal: spacing.xl,
    },
    instructionsContainer: {
      marginTop: spacing.xl,
      marginBottom: spacing.lg,
      paddingHorizontal: spacing.md,
    },
    instructionCard: {
      width: isTablet ? 300 : 150,
      marginRight: spacing.md,
      alignItems: 'center',
    },
    instructionImage: {
      width: isTablet ? 300 : 150,
      height: isTablet ? 600 : 300,
      objectFit: 'contain',
      borderRadius: borderRadius.md,
      marginBottom: spacing.sm,
    },
    instructionText: {
      fontSize: isTablet ? 14 : 12,
      color: colors.text.secondary,
      textAlign: 'center',
      lineHeight: isTablet ? 20 : 18,
      fontFamily: 'Inter_18pt-Regular',
      paddingHorizontal: spacing.xs,
    },
    buttonWrap: {
      width: '100%',
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xl,
    },
    buttonContainer: {
      alignItems: 'center',
    },
    noteText: {
      fontSize: isTablet ? 13 : 11,
      color: colors.text.muted,
      textAlign: 'center',
      marginBottom: spacing.md,
      fontFamily: 'Inter_18pt-Regular',
      lineHeight: isTablet ? 18 : 16,
    },
    button: {
      width: 150,
      alignSelf: 'center',
      height: isTablet ? 60 : 52,
      paddingHorizontal: spacing.lg,
      borderRadius: borderRadius.round,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      ...typography.button,
      color: colors.text.primary,
      fontWeight: '600',
    },
  });

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>DNS Setup</Text>
        </View>

        <Text style={styles.subtitle}>
          Theater uses TMDB (The Movie Database) to fetch movie and TV show
          information. TMDB is not reachable from your network. You need to
          change your DNS settings to access it.
        </Text>

        <FlatList
          horizontal
          data={instructions}
          keyExtractor={item => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.instructionsContainer}
          renderItem={({item}) => (
            <View style={styles.instructionCard}>
              <Image
                source={item.image}
                style={styles.instructionImage}
                resizeMode="contain"
              />
              <Text style={styles.instructionText}>{item.text}</Text>
            </View>
          )}
        />
      </ScrollView>

      <View style={styles.buttonWrap}>
        <View style={styles.buttonContainer}>
          <Text style={styles.noteText}>DNS setup complete?</Text>
          <TouchableOpacity
            onPress={handlePress}
            disabled={!!isRetrying}
            activeOpacity={0.85}
            style={{width: '100%'}}>
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.button}>
              {isRetrying ? (
                <GradientSpinner color={colors.text.primary} size={24} />
              ) : (
                <Text style={styles.buttonText}>Try Now</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
