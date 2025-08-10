import React, {useState} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {colors, spacing, borderRadius, typography} from '../styles/theme';
import {OnboardingManager} from '../store/onboarding';
import Icon from 'react-native-vector-icons/FontAwesome6';

const {width} = Dimensions.get('window');

interface OnboardingProps {
  onDone: () => void;
}

const steps = [
  {
    key: 'step1',
    title: 'Discover Cinema Like Never Before',
    subtitle: 'Your personalized cinema companion.',
    image: require('../assets/Onboard1.png'),
    layout: 'image-first' as const,
  },
  {
    key: 'step2',
    title: 'Theater AI',
    subtitle: 'Chat about movies and shows. Get smart, relevant suggestions.',
    image: require('../assets/Onboard3.png'),
    layout: 'text-first' as const,
  },
  {
    key: 'step3',
    title: 'My Filters',
    subtitle: 'Save favorites, explore genres, and never miss what matters.',
    image: require('../assets/Onboard2.png'),
    layout: 'text-first' as const,
  },
];

const Button: React.FC<{title: string; onPress: () => void}> = ({
  title,
  onPress,
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.9}
    style={{borderRadius: 28, overflow: 'hidden', marginTop: spacing.lg}}>
    <LinearGradient
      colors={[colors.primary, colors.secondary]}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
      style={{
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 28,
        minWidth: width * 0.6,
        alignItems: 'center',
      }}>
      <Text style={{...typography.button, color: colors.text.primary}}>
        Next
      </Text>
    </LinearGradient>
  </TouchableOpacity>
);

const Onboarding: React.FC<OnboardingProps> = ({onDone}) => {
  const [index, setIndex] = useState(0);

  const next = async () => {
    if (index < steps.length - 1) {
      setIndex(prev => prev + 1);
    } else {
      // Final step: mark onboarded and exit
      await OnboardingManager.setIsOnboarded(true);
      onDone();
    }
  };

  const step = steps[index];
  const isLast = index === steps.length - 1;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#000013',
      }}>
      <View
        style={{
          flex: 1,
          position: 'relative',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {step.layout === 'image-first' ? (
          <>
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 1,
              }}>
              <LinearGradient
                colors={['#000013', 'transparent']}
                style={{
                  paddingVertical: 60,
                  paddingHorizontal: 24,
                  alignItems: 'center',
                }}>
                <Text
                  style={{
                    ...typography.h2,
                    color: colors.text.primary,
                    fontWeight: '800',
                    textAlign: 'center',
                    zIndex: 1,
                  }}>
                  {step.title}
                </Text>
                <Text
                  style={{
                    ...typography.h3,
                    color: colors.text.secondary,
                    textAlign: 'center',
                    marginTop: spacing.sm,
                    zIndex: 1,
                  }}>
                  {step.subtitle}
                </Text>
              </LinearGradient>
            </View>
            <Image
              source={step.image}
              style={{
                width: '100%',
                height: '100%',
                resizeMode: 'contain',
                marginBottom: spacing.lg,
              }}
            />
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                width: '100%',
                alignItems: 'center',
                marginBottom: 50,
              }}>
              <TouchableOpacity
                onPress={next}
                activeOpacity={0.9}
                style={{
                  borderRadius: borderRadius.round,
                  marginBottom: 30,
                  width: 60,
                  height: 60,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Image source={require('../assets/next.png')} />
              </TouchableOpacity>

              {/* Simple indicators */}
              <View style={{flexDirection: 'row', marginTop: spacing.md}}>
                {steps.map((_, i) => (
                  <View
                    key={i}
                    style={{
                      width: i === index ? 18 : 8,
                      height: 8,
                      borderRadius: borderRadius.round,
                      marginHorizontal: 4,
                      backgroundColor:
                        i === index ? colors.primary : colors.text.accent,
                    }}
                  />
                ))}
              </View>
            </View>
          </>
        ) : (
          <View
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: spacing.md,
            }}>
            <View
              style={{
                marginTop: 120,
                marginHorizontal: 24,
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 1,
              }}>
              <View style={{position: 'relative'}}>
                <LinearGradient
                  style={{
                    position: 'absolute',
                    bottom: 10,
                    left: 0,
                    right: 0,
                    height: 40,
                    zIndex: 1,
                  }}
                  colors={['transparent', '#000013']}
                />
                <Text
                  style={{
                    color: 'rgba(119, 97, 140, 1)',
                    fontSize: 50,
                    opacity: 0.5,
                    fontWeight: '900',
                    textAlign: 'center',
                    marginBottom: spacing.sm,
                    letterSpacing: -2,
                  }}>
                  {step.title}
                </Text>
              </View>

              <Text
                style={{
                  ...typography.body2,
                  color: colors.text.secondary,
                  textAlign: 'center',
                  marginBottom: spacing.lg,
                }}>
                {step.subtitle}
              </Text>
            </View>
            <View style={{width: '100%', height: '100%', marginTop: 120}}>
              <Image
                style={{width: '100%', height: '100%'}}
                source={step.image}
                resizeMode="contain"
              />
            </View>
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                alignItems: 'center',
                marginBottom: 50,
                zIndex: 1,
              }}>
              <View
                style={{
                  width: '100%',
                  alignItems: 'center',
                }}>
                <TouchableOpacity
                  onPress={next}
                  activeOpacity={0.9}
                  style={{
                    borderRadius: borderRadius.round,
                    marginBottom: 30,
                    width: 60,
                    height: 60,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Image source={require('../assets/next.png')} />
                </TouchableOpacity>
              </View>

              {/* Simple indicators */}
              <View style={{flexDirection: 'row', marginTop: spacing.md}}>
                {steps.map((_, i) => (
                  <View
                    key={i}
                    style={{
                      width: i === index ? 18 : 8,
                      height: 8,
                      borderRadius: borderRadius.round,
                      marginHorizontal: 4,
                      backgroundColor:
                        i === index ? colors.primary : colors.text.accent,
                    }}
                  />
                ))}
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

export default Onboarding;
