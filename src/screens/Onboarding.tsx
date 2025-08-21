import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
  Animated,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {colors, spacing, borderRadius, typography} from '../styles/theme';
import {OnboardingManager} from '../store/onboarding';

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
  const indexRef = useRef(index);
  const listRef = useRef<FlatList<any>>(null);
  // Optional opacity for small fade between pages
  const contentOpacity = useRef(new Animated.Value(1)).current;

  const animateIn = () => {
    contentOpacity.setValue(0);
    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    // animate when index changes (first mount and subsequent changes)
    animateIn();
    indexRef.current = index;
  }, [index]);

  const goTo = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= steps.length) return;
    // scroll the pager and sync index
    listRef.current?.scrollToIndex({index: nextIndex, animated: true});
    setIndex(nextIndex);
  };

  const next = async () => {
    if (index < steps.length - 1) {
      goTo(index + 1);
    } else {
      // Final step: mark onboarded and exit
      await OnboardingManager.setIsOnboarded(true);
      onDone();
    }
  };

  const prev = () => {
    if (index > 0) {
      goTo(index - 1);
    }
  };

  // Update index on user scroll end
  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const newIndex = Math.round(x / width);
    if (newIndex !== indexRef.current) {
      setIndex(newIndex);
    }
  };

  //

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#000013',
      }}>
      <View style={{flex: 1}}>
        <FlatList
          ref={listRef}
          data={steps}
          keyExtractor={it => it.key}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumEnd}
          getItemLayout={(_, i) => ({
            length: width,
            offset: width * i,
            index: i,
          })}
          renderItem={({item}) => (
            <View style={{width, flex: 1}}>
              {item.layout === 'image-first' ? (
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
                      <Animated.Text
                        style={{
                          ...typography.h2,
                          color: colors.text.primary,
                          fontWeight: '900',
                          textAlign: 'center',
                          zIndex: 1,
                        }}>
                        {item.title}
                      </Animated.Text>
                      <Animated.Text
                        style={{
                          ...typography.h3,
                          color: colors.text.secondary,
                          textAlign: 'center',
                          marginTop: spacing.sm,
                          zIndex: 1,
                        }}>
                        {item.subtitle}
                      </Animated.Text>
                    </LinearGradient>
                  </View>
                  <Animated.Image
                    source={item.image}
                    style={{
                      width: '100%',
                      height: '100%',
                      resizeMode: 'cover',
                      marginBottom: spacing.lg,
                    }}
                  />
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
                      <Animated.Text
                        style={{
                          color: 'rgba(119, 97, 140, 1)',
                          fontSize: 50,
                          fontWeight: '900',
                          textAlign: 'center',
                          marginBottom: spacing.sm,
                          letterSpacing: -2,
                        }}>
                        {item.title}
                      </Animated.Text>
                    </View>

                    <Animated.Text
                      style={{
                        ...typography.body2,
                        color: colors.text.secondary,
                        textAlign: 'center',
                        marginBottom: spacing.lg,
                      }}>
                      {item.subtitle}
                    </Animated.Text>
                  </View>
                  <View style={{width: '100%', height: '100%', marginTop: 120}}>
                    <Animated.Image
                      style={{width: '100%', height: '100%'}}
                      source={item.image}
                      resizeMode="cover"
                    />
                  </View>
                </View>
              )}
            </View>
          )}
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
  );
};

export default Onboarding;
