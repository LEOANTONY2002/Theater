import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
  FlatList,
  StyleSheet,
  Animated,
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
import OnboardingAISettings from './OnboardingAISettings';

interface Region {
  iso_3166_1: string;
  english_name: string;
  native_name: string;
}

const {width} = Dimensions.get('window');

type OnboardingStep = 'welcome' | 'region' | 'ai';

interface OnboardingProps {
  onDone: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({onDone}) => {
  const {isTablet, orientation} = useResponsive();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [showRegionSelect, setShowRegionSelect] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [regions, setRegions] = useState<Region[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

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
    if (currentStep === 'welcome') {
      setIsDetecting(true);
      try {
        const regionCode = await detectRegion();
        console.log('regionCode', regionCode);

        if (regionCode) {
          const region = regions.find(r => r.iso_3166_1 === regionCode);
          if (region) {
            await SettingsManager.setRegion(region);
            setCurrentStep('ai');
            animateTransition();
            return;
          }
        }
        // If auto-detect fails, show region selection
        setShowRegionSelect(true);
        setCurrentStep('region');
      } catch (err) {
        console.error('Error detecting region:', err);
        setError(
          'Failed to detect your location. Please select your region manually.',
        );
        setShowRegionSelect(true);
        setCurrentStep('region');
      } finally {
        setIsDetecting(false);
      }
    } else if (currentStep === 'region' && selectedRegion) {
      await handleContinue();
    }
  };

  const handleRegionSelect = (region: Region) => {
    setSelectedRegion(region);
  };

  const animateTransition = () => {
    // Reset animations
    fadeAnim.setValue(0);
    slideAnim.setValue(50);

    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    animateTransition();
  }, [currentStep]);

  const handleContinue = async () => {
    if (!selectedRegion) return;

    try {
      await SettingsManager.setRegion(selectedRegion);
      setCurrentStep('ai');
      animateTransition();
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

  const styles = StyleSheet.create({
    onboardingContainer: {
      flex: 1,
      backgroundColor: '#000013',
      position: 'relative',
    },
    backgroundImageContainer: {
      position: 'absolute',
      left: 0,
      right: 0,
      zIndex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    laImage: {
      height: isTablet ? 300 : 200,
      objectFit: 'contain',
    },
    backgroundImage: {
      width: '100%',
      height: '100%',
      opacity: 0.5,
      resizeMode: 'cover',
    },
    bottomControls: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: 1,
    },
    logoContainer: {
      width: '100%',
      alignItems: 'center',
    },
    logoImage: {
      width: '80%',
      height: isTablet ? 150 : 100,
      resizeMode: 'contain',
    },
    nextButton: {
      borderRadius: borderRadius.round,
      marginBottom: 50,
      width: 60,
      height: 60,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    nextIcon: {
      width: 50,
      height: 50,
    },
    stepContainer: {
      flex: 1,
      justifyContent: 'center',
      padding: spacing.lg,
      backgroundColor: colors.background.primary,
    },
    welcomeContent: {
      alignItems: 'center',
      padding: spacing.xl,
    },
    welcomeTitle: {
      fontSize: 32,
      fontWeight: 'bold',
      color: colors.text.primary,
      marginBottom: spacing.md,
      textAlign: 'center',
    },
    welcomeSubtitle: {
      fontSize: 16,
      color: colors.text.secondary,
      textAlign: 'center',
      lineHeight: 24,
    },
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

  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <Animated.View
            style={[
              styles.stepContainer,
              {
                opacity: fadeAnim,
                transform: [{translateY: slideAnim}],
              },
            ]}>
            <View style={styles.welcomeContent}>
              <Text style={styles.welcomeTitle}>Welcome to Theater</Text>
              <Text style={styles.welcomeSubtitle}>
                Your personal cinema guide with AI-powered recommendations
              </Text>
            </View>
          </Animated.View>
        );

      case 'region':
        return (
          <Animated.View
            style={[
              styles.stepContainer,
              {
                opacity: fadeAnim,
                transform: [{translateY: slideAnim}],
              },
            ]}>
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
                    <Text style={styles.loadingText}>
                      Detecting your region...
                    </Text>
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

                <View style={styles.bottomContainer}>
                  <GradientButton
                    title="Continue"
                    onPress={handleContinue}
                    disabled={!selectedRegion}
                    isIcon={false}
                    style={{
                      borderRadius: borderRadius.round,
                      width: '60%',
                      alignSelf: 'center',
                      marginTop: 20,
                    }}
                  />
                </View>
              </View>
            </View>
          </Animated.View>
        );

      case 'ai':
        return (
          <OnboardingAISettings
            onDone={() => {
              OnboardingManager.setIsOnboarded(true);
              onDone();
            }}
            onSkip={() => {
              OnboardingManager.setIsOnboarded(true);
              onDone();
            }}
          />
        );

      default:
        return null;
    }
  };

  if (currentStep === 'region' && showRegionSelect) {
    return renderStep();
  }
  return (
    <View style={styles.onboardingContainer}>
      {currentStep !== 'ai' && (
        <>
          <View
            style={[
              styles.backgroundImageContainer,
              {
                top: isTablet ? spacing.xxl : 0,
                bottom: orientation === 'portrait' ? 0 : 200,
                marginBottom: 150,
              },
            ]}>
            <Image
              style={styles.laImage}
              source={require('../assets/LA.webp')}
            />
          </View>
          <Image
            source={require('../assets/Onboard.webp')}
            style={styles.backgroundImage}
          />
        </>
      )}

      {renderStep()}

      {currentStep !== 'ai' && (
        <View style={styles.bottomControls}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/symbol.webp')}
              style={styles.logoImage}
            />
            <TouchableOpacity
              onPress={handleNextPress}
              activeOpacity={0.9}
              disabled={isDetecting}
              style={[
                styles.nextButton,
                isDetecting && {backgroundColor: 'rgba(0,0,0,0.3)'},
              ]}>
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
                  style={styles.nextIcon}
                  source={require('../assets/next.webp')}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      <LinearGradient
        colors={['transparent', '#000013', '#000013']}
        style={{
          position: 'absolute',
          bottom: 0,
          width: '100%',
          height: isTablet ? 400 : 200,
          pointerEvents: 'none',
        }}
      />
    </View>
  );
};

export default Onboarding;
