import React, {useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
} from 'react-native';
import {colors, spacing, borderRadius, typography} from '../styles/theme';
import {useNavigationState} from '../hooks/useNavigationState';
import {OTTProvider} from '../hooks/usePersonalization';
import LinearGradient from 'react-native-linear-gradient';

interface Props {
  otts: OTTProvider[];
  title?: string;
}

export const OTTCardsRow: React.FC<Props> = ({otts, title = 'My OTTs'}) => {
  const {navigateWithLimit} = useNavigationState();
  const [failedLogos, setFailedLogos] = React.useState<Set<number>>(new Set());

  const handleOTTPress = useCallback(
    (ott: OTTProvider) => {
      navigateWithLimit('OTTDetails', {
        ottId: ott.id,
        ottName: ott.provider_name,
        ottLogo: ott.logo_path,
      });
    },
    [navigateWithLimit],
  );

  const handleImageError = useCallback((ottId: number) => {
    setFailedLogos(prev => new Set(prev).add(ottId));
  }, []);

  if (!otts || otts.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cardsContainer}>
        {otts.map((ott, index) => (
          <TouchableOpacity
            style={styles.card}
            key={`ott-${ott.id}-${index}`}
            onPress={() => handleOTTPress(ott)}
            activeOpacity={0.8}>
            <View style={styles.logoContainer}>
              {ott.logo_path && !failedLogos.has(ott.id) ? (
                <Image
                  source={{
                    uri: `https://image.tmdb.org/t/p/w154${ott.logo_path}`,
                  }}
                  style={styles.logo}
                  resizeMode="contain"
                  onError={() => handleImageError(ott.id)}
                />
              ) : (
                <View style={styles.placeholderLogo}>
                  <Text numberOfLines={1} style={styles.placeholderText}>
                    {ott.provider_name.charAt(0)}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.ottName} numberOfLines={1}>
              {ott.provider_name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: '600',
    fontFamily: 'Inter_18pt-SemiBold',
  },
  cardsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    paddingRight: spacing.xl,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    paddingRight: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.modal.blur,
    width: 200,
    backgroundColor: colors.modal.blur,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
  },
  placeholderLogo: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    backgroundColor: colors.modal.blur,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    ...typography.h2,
    color: colors.text.secondary,
    fontWeight: 'bold',
  },
  ottName: {
    ...typography.h3,
    color: colors.text.muted,
    textAlign: 'center',
    fontWeight: '700',
    maxWidth: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
