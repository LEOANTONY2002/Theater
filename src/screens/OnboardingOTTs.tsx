import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  useWindowDimensions,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import {colors, spacing, borderRadius, typography} from '../styles/theme';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import {SettingsManager} from '../store/settings';
import {useQueryClient, useQuery} from '@tanstack/react-query';
import {useResponsive} from '../hooks/useResponsive';
import {modalStyles} from '../styles/styles';

const OnboardingOTTs: React.FC<{
  onDone: () => void;
  onSkip: () => void;
  onBack: () => void;
}> = ({onDone, onSkip, onBack}) => {
  const [localOTTs, setLocalOTTs] = useState<any[]>([]);
  const queryClient = useQueryClient();
  const {isTablet} = useResponsive();
  const width = useWindowDimensions().width;

  const {data: currentRegion} = useQuery<any>({
    queryKey: ['region'],
    queryFn: SettingsManager.getRegion,
    staleTime: 1000 * 60 * 30,
  });

  const {data: availableProviders = [], isLoading: isLoadingProviders} =
    useQuery({
      queryKey: [
        'available_watch_providers',
        'movie',
        currentRegion?.iso_3166_1 || 'US',
      ],
      queryFn: async () => {
        const region = currentRegion?.iso_3166_1 || 'US';
        const m = await import('../services/tmdbWithCache');
        let result = await m.getAvailableWatchProviders(region);

        // Fallback to US if current region has no providers
        if (!result || result.length === 0) {
          result = await m.getAvailableWatchProviders('US');
        }

        return result;
      },
      staleTime: 1000 * 60 * 60,
    });

  useEffect(() => {
    loadOTTs();
  }, []);

  const loadOTTs = async () => {
    try {
      const otts = await SettingsManager.getMyOTTs();
      if (otts) {
        setLocalOTTs(otts);
      }
    } catch (error) {}
  };

  const toggleProvider = (provider: any) => {
    setLocalOTTs(prev => {
      let next = Array.isArray(prev) ? [...prev] : [];
      if (prev?.some((s: any) => s.id === provider.provider_id)) {
        next = next.filter((x: any) => x.id !== provider.provider_id);
      } else {
        next.push({
          id: provider.provider_id,
          provider_name: provider.provider_name,
          logo_path: provider.logo_path,
        });
      }
      // Remove duplicates by ID
      return next.filter(
        (item, index, self) => index === self.findIndex(t => t.id === item.id),
      );
    });
  };

  const handleSave = async () => {
    try {
      await SettingsManager.setMyOTTs(localOTTs);
      await Promise.all([
        queryClient.invalidateQueries({queryKey: ['my_otts']}),
        queryClient.invalidateQueries({queryKey: ['my_otts_movies']}),
        queryClient.invalidateQueries({queryKey: ['my_otts_tv']}),
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
        <Text style={styles.headerTitle}>My OTTs</Text>
        <View style={{width: 36}} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionDescription}>
          Select your streaming platforms to get personalized content
        </Text>

        <View style={styles.ottsContainer}>
          <LinearGradient
            pointerEvents="none"
            colors={[colors.background.primary, 'transparent']}
            style={styles.gradientTop}
          />
          {isLoadingProviders ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.text.primary} />
              <Text style={styles.loadingText}>Loading platforms...</Text>
            </View>
          ) : availableProviders?.length ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.scrollContent}
              contentContainerStyle={{
                paddingTop: 20,
                paddingBottom: 60,
                paddingHorizontal: spacing.sm,
              }}>
              <View style={modalStyles.allProvidersGrid}>
                {availableProviders.map((p: any, index: number) => (
                  <TouchableOpacity
                    activeOpacity={1}
                    key={`onboarding-provider-${p.provider_id}-${index}`}
                    onPress={() => toggleProvider(p)}
                    style={[
                      styles.providerCard,
                      {
                        opacity: localOTTs?.some(
                          (s: any) => s.id === p.provider_id,
                        )
                          ? 1
                          : 0.7,
                        backgroundColor: localOTTs?.some(
                          (s: any) => s.id === p.provider_id,
                        )
                          ? colors.modal.active
                          : colors.modal.blur,
                        borderWidth: localOTTs?.some(
                          (s: any) => s.id === p.provider_id,
                        )
                          ? 2
                          : 0,
                        borderColor: localOTTs?.some(
                          (s: any) => s.id === p.provider_id,
                        )
                          ? colors.modal.activeBorder
                          : 'transparent',
                      },
                    ]}>
                    <Image
                      source={{
                        uri: p.logo_path
                          ? `https://image.tmdb.org/t/p/w154${p.logo_path}`
                          : undefined,
                      }}
                      style={styles.providerLogo}
                      resizeMode="contain"
                    />
                    {localOTTs?.some((s: any) => s.id === p.provider_id) && (
                      <View style={styles.checkmark}>
                        <Icon name="checkmark" size={14} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No streaming platforms available
              </Text>
            </View>
          )}
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
        <TouchableOpacity activeOpacity={0.9} onPress={handleSave}>
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={[
              styles.continueButton,
              {
                width: 150,
              },
            ]}>
            <Text style={styles.continueButtonText}>Enter Theater</Text>
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
  ottsContainer: {
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
  scrollContent: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body1,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...typography.body1,
    color: colors.text.secondary,
  },
  providerCard: {
    borderRadius: 16,
    margin: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerLogo: {
    width: 70,
    height: 70,
    borderRadius: 16,
  },
  checkmark: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    padding: 2,
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

export default OnboardingOTTs;
