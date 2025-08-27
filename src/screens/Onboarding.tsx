import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
  FlatList,
  StyleSheet,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {colors, spacing, borderRadius} from '../styles/theme';
import {GradientSpinner} from '../components/GradientSpinner';
import {useResponsive} from '../hooks/useResponsive';
import {detectRegion} from '../services/regionDetection';
import {SettingsManager} from '../store/settings';
import {OnboardingManager} from '../store/onboarding';
import Icon from 'react-native-vector-icons/Ionicons';
import {GradientButton} from '../components/GradientButton';

interface Region {
  iso_3166_1: string;
  english_name: string;
  native_name: string;
}

const {width} = Dimensions.get('window');

interface OnboardingProps {
  onDone: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({onDone}) => {
  const {isTablet, orientation} = useResponsive();
  const [showRegionSelect, setShowRegionSelect] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [regions, setRegions] = useState<Region[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);

  // Load regions on mount
  useEffect(() => {
    const loadRegions = async () => {
      try {
        const regionData = require('../utils/region.json');
        setRegions(regionData);
      } catch (err) {
        console.error('Failed to load regions:', err);
        setError('Failed to load regions. Please try again.');
      }
    };
    loadRegions();
  }, []);

  const handleNextPress = async () => {
    setIsDetecting(true);
    try {
      const regionCode = await detectRegion();
      console.log('regionCode', regionCode);

      if (regionCode) {
        const region = regions.find(r => r.iso_3166_1 === regionCode);
        if (region) {
          await SettingsManager.setRegion(region);
          await OnboardingManager.setIsOnboarded(true);
          onDone();
          return;
        }
      }
      // If auto-detect fails, show region selection
      setShowRegionSelect(true);
    } catch (err) {
      console.error('Error detecting region:', err);
      setError(
        'Failed to detect your location. Please select your region manually.',
      );
      setShowRegionSelect(true);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleRegionSelect = (region: Region) => {
    setSelectedRegion(region);
  };

  const handleContinue = async () => {
    if (!selectedRegion) return;

    try {
      await SettingsManager.setRegion(selectedRegion);
      await OnboardingManager.setIsOnboarded(true);
      onDone();
    } catch (err) {
      console.error('Failed to save region:', err);
      setError('Failed to save region. Please try again.');
    }
  };

  const renderRegionItem = ({item}: {item: Region}) => {
    const isSelected = selectedRegion?.iso_3166_1 === item.iso_3166_1;

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        key={item.iso_3166_1}
        style={[
          styles.regionOption,
          isSelected && styles.regionOptionSelected,
          isDetecting && {opacity: 0.7},
        ]}
        onPress={() => handleRegionSelect(item)}
        disabled={isDetecting}>
        <View style={styles.regionInfo}>
          <Text
            style={[
              styles.regionName,
              isSelected && styles.regionNameSelected,
            ]}>
            {item.english_name}
          </Text>
          {item.native_name !== item.english_name && (
            <Text
              style={[
                styles.regionNativeName,
                isSelected && styles.regionNativeNameSelected,
              ]}>
              {item.native_name}
            </Text>
          )}
        </View>
        <View>
          {isSelected && (
            <Icon name="checkmark" size={24} color={colors.text.primary} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (showRegionSelect) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.subtitle}>
            Select Your Region for personalized content
          </Text>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.regionListContainer}>
            <LinearGradient
              pointerEvents="none"
              colors={[colors.background.primary, 'transparent']}
              style={styles.gradientTop}
            />

            {isDetecting ? (
              <View style={styles.loadingContainer}>
                <GradientSpinner
                  size={40}
                  thickness={3}
                  colors={[colors.primary, colors.secondary]}
                />
                <Text style={styles.loadingText}>Detecting your region...</Text>
              </View>
            ) : (
              <FlatList
                data={regions}
                renderItem={renderRegionItem}
                keyExtractor={item => item.iso_3166_1}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.regionListContent}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>
                    No regions available. Please check your connection.
                  </Text>
                }
              />
            )}

            <LinearGradient
              pointerEvents="none"
              colors={['transparent', colors.background.primary]}
              style={styles.gradientBottom}
            />

            <LinearGradient
              colors={['transparent', colors.background.primary]}
              style={styles.bottomContainer}>
              <GradientButton
                title="Continue"
                onPress={handleContinue}
                disabled={!selectedRegion}
                isIcon={false}
                style={{
                  borderRadius: borderRadius.round,
                  width: '60%',
                  alignSelf: 'center',
                  marginTop: 60,
                }}
              />
            </LinearGradient>
          </View>
        </View>
      </View>
    );
  }
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#000013',
        position: 'relative',
      }}>
      <View
        style={[
          {
            position: 'absolute',
            top: isTablet ? spacing.xxl : 0,
            left: 0,
            right: 0,
            bottom: orientation === 'portrait' ? 0 : 200,
            marginBottom: 150,
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}>
        <Image
          style={{height: isTablet ? 400 : 200, objectFit: 'contain'}}
          source={require('../assets/LA.png')}
        />
      </View>
      <Image
        source={require('../assets/Onboard.png')}
        style={{
          width: '100%',
          height: '100%',
          opacity: 0.5,
          resizeMode: 'cover',
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          alignItems: 'center',
          zIndex: 1,
        }}>
        <View
          style={{
            width: '100%',
            alignItems: 'center',
          }}>
          <Image
            source={require('../assets/symbol.png')}
            style={{
              width: isTablet ? '50%' : '80%',
              height: isTablet ? 250 : 100,
              resizeMode: 'contain',
            }}
          />
          <TouchableOpacity
            onPress={handleNextPress}
            activeOpacity={0.9}
            disabled={isDetecting}
            style={{
              borderRadius: borderRadius.round,
              marginBottom: isTablet ? 100 : 50,
              width: 60,
              height: 60,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isDetecting ? 'rgba(0,0,0,0.3)' : 'transparent',
            }}>
            {isDetecting ? (
              <GradientSpinner
                size={isTablet ? 40 : 30}
                thickness={2}
                colors={[
                  colors.primary,
                  colors.secondary,
                  'transparent',
                  'transparent',
                ]}
              />
            ) : (
              <Image
                style={{width: isTablet ? 70 : 30, height: isTablet ? 70 : 30}}
                source={require('../assets/next.png')}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <LinearGradient
        colors={['transparent', '#000013', '#000013']}
        style={{
          position: 'absolute',
          bottom: 0,
          width: '100%',
          height: isTablet ? 400 : 200,
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    paddingTop: 50,
  },
  title: {
    color: colors.text.primary,
    fontSize: 24,
    fontFamily: 'Poppins-SemiBold',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.text.primary,
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    margin: 2,
    paddingVertical: spacing.md,
  },
  regionNativeName: {
    color: colors.text.secondary,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonOuter: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    color: colors.text.secondary,
    fontFamily: 'Poppins-Regular',
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  emptyText: {
    color: colors.text.secondary,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  regionOption: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  regionInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  regionName: {
    color: colors.text.primary,
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    marginBottom: 2,
  },
  errorText: {
    color: colors.primary,
    fontFamily: 'Poppins-Medium',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  regionListContainer: {
    flex: 1,
    marginTop: spacing.md,
    position: 'relative',
  },
  regionListContent: {
    paddingTop: 20,
    paddingBottom: 60,
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
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    paddingVertical: 32,
  },
  continueButton: {
    backgroundColor: colors.text.primary,
    borderRadius: 30,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: colors.text.secondary + '40',
  },
  continueButtonText: {
    color: colors.background.primary,
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
  },
  regionOptionSelected: {
    backgroundColor: colors.modal.blur,
    borderWidth: 1,
    borderColor: colors.modal.border,
  },
  regionNameSelected: {
    color: colors.text.primary,
    fontFamily: 'Poppins-SemiBold',
  },
  regionNativeNameSelected: {
    color: colors.primary + 'CC',
  },
  radioButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '20',
  },
});

export default Onboarding;
