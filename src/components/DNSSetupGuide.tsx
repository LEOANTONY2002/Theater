import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  FlatList,
  Modal,
  useWindowDimensions,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {colors, spacing, borderRadius, typography} from '../styles/theme';
import {GradientSpinner} from './GradientSpinner';
import {useResponsive} from '../hooks/useResponsive';
import {BlurView} from '@react-native-community/blur';
import {BlurPreference} from '../store/blurPreference';
import Icon from 'react-native-vector-icons/Ionicons';
import {openNetworkSettings} from '../utils/settings';

const shimmerColors = [
  'rgba(10, 10, 18, 0.62)',
  'rgba(8, 8, 19, 0.45)',
  'rgb(0, 0, 1)',
];

const AnimatedShimmer = ({
  width,
  height,
  radius = 8,
}: {
  width: number;
  height: number;
  radius?: number;
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
    ).start();
  }, [shimmerAnim]);

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width * 2],
  });

  return (
    <View
      style={{
        width,
        height,
        backgroundColor: shimmerColors[0],
        borderRadius: radius,
        overflow: 'hidden',
      }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: width * 0.4,
          height: '100%',
          borderRadius: radius,
          backgroundColor: shimmerColors[1],
          transform: [{translateX: shimmerTranslate}],
        }}
      />
    </View>
  );
};

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
  const {width, height} = useWindowDimensions();
  const themeMode = BlurPreference.getMode();
  const isSolid = themeMode === 'normal';

  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [scaleAnim] = useState(new Animated.Value(0));
  const [imageLoading, setImageLoading] = useState(false);

  const handleOpenImage = (image: any) => {
    setImageLoading(true);
    setSelectedImage(image);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  };

  const handleCloseImage = () => {
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setSelectedImage(null));
  };

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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
      gap: spacing.md,
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
      height: isTablet ? 60 : 50,
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
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalBlur: {
      ...StyleSheet.absoluteFillObject,
    },
    modalButtons: {
      flexDirection: 'row',
      zIndex: 10,
      gap: spacing.sm,
      margin: spacing.md,
      alignSelf: 'flex-end',
    },
    closeButton: {
      width: 50,
      height: 50,
      borderRadius: 25,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: colors.modal.header,
      backgroundColor: colors.modal.blur,
      justifyContent: 'center',
      alignItems: 'center',
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
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => handleOpenImage(item.image)}>
                <Image
                  source={item.image}
                  style={styles.instructionImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>
              <Text style={styles.instructionText}>{item.text}</Text>
            </View>
          )}
        />
      </ScrollView>

      <View style={styles.buttonWrap}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: colors.modal.blur,
                borderWidth: 1,
                borderBottomWidth: 0,
                borderColor: colors.modal.content,
              },
            ]}
            onPress={openNetworkSettings}
            activeOpacity={0.8}>
            <Text style={[styles.buttonText, {color: colors.text.primary}]}>
              Open Settings
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handlePress}
            disabled={!!isRetrying}
            activeOpacity={0.85}>
            {isRetrying ? (
              <View
                style={{
                  width: 120,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <GradientSpinner color={colors.text.primary} size={24} />
              </View>
            ) : (
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={[styles.button, {width: 120}]}>
                <Text style={styles.buttonText}>Try Now</Text>
              </LinearGradient>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Full Screen Image Modal */}
      <Modal
        visible={selectedImage !== null}
        transparent={true}
        animationType="none"
        statusBarTranslucent
        onRequestClose={handleCloseImage}>
        <TouchableOpacity
          style={styles.modalContainer}
          activeOpacity={1}
          onPress={handleCloseImage}>
          <Animated.View
            style={[
              styles.modalBlur,
              {
                opacity: scaleAnim,
              },
            ]}>
            {!isSolid && (
              <BlurView
                blurType="dark"
                blurAmount={15}
                style={StyleSheet.absoluteFill}
              />
            )}
            <View
              style={[
                StyleSheet.absoluteFill,
                {backgroundColor: isSolid ? 'black' : 'rgba(0,0,0,0.4)'},
              ]}
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.modalContent,
              {
                opacity: scaleAnim,
                transform: [
                  {
                    scale: scaleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.9, 1],
                    }),
                  },
                ],
              },
            ]}>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleCloseImage}
                activeOpacity={0.8}>
                <Icon name="close" size={26} color="#fff" />
              </TouchableOpacity>
            </View>

            {selectedImage && (
              <>
                {imageLoading && (
                  <View
                    style={{
                      position: 'absolute',
                      width: width - spacing.xl * 2,
                      height: height * 0.8,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                    <AnimatedShimmer
                      width={width - spacing.xl * 2}
                      height={height * 0.8}
                      radius={borderRadius.lg}
                    />
                  </View>
                )}
                <Image
                  source={selectedImage}
                  style={{
                    width: width - spacing.xl * 2,
                    height: height * 0.8,
                    borderRadius: borderRadius.lg,
                  }}
                  resizeMode="contain"
                  onLoadStart={() => setImageLoading(true)}
                  onLoadEnd={() => setImageLoading(false)}
                  onError={() => setImageLoading(false)}
                />
              </>
            )}
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};
