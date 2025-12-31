import React, {useState, useMemo, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  useWindowDimensions,
  Image,
  Animated,
  ScrollView,
  Linking,
  ActivityIndicator,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {getImageUrl} from '../services/tmdb';
import {ImageData} from '../types/movie';
import {MaybeBlurView} from './MaybeBlurView';
import {BlurPreference} from '../store/blurPreference';
import {BlurView} from '@react-native-community/blur';
import {useResponsive} from '../hooks/useResponsive';

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

interface MediaGalleryProps {
  images?: {
    backdrops: ImageData[];
    posters: ImageData[];
    logos: ImageData[];
  };
}

type MediaType = 'backdrops' | 'posters' | 'logos';

export const MediaGallery: React.FC<MediaGalleryProps> = ({images}) => {
  const [selectedType, setSelectedType] = useState<MediaType>('backdrops');
  const [selectedImage, setSelectedImage] = useState<{
    url: string;
    aspectRatio: number;
  } | null>(null);
  const {width, height} = useWindowDimensions();
  const themeMode = BlurPreference.getMode();
  const isSolid = themeMode === 'normal';
  const {isTablet} = useResponsive();

  const [scaleAnim] = useState(new Animated.Value(0));
  const [imageLoading, setImageLoading] = useState(false);
  const [showImage, setShowImage] = useState(false);
  const [imageOpacity] = useState(new Animated.Value(0));
  const [showLoader, setShowLoader] = useState(false);

  const handleOpenImage = (item: ImageData) => {
    // Mobile: use w500 for instant loading (same as grid)
    // Tablet: use w1280 for higher quality when expanded
    const fullViewSize = isTablet ? 'w1280' : 'w500';
    setImageLoading(true);
    setShowImage(false);
    setSelectedImage({
      url: getImageUrl(item.file_path, fullViewSize),
      aspectRatio:
        item.aspect_ratio || (selectedType === 'posters' ? 2 / 3 : 16 / 9),
    });
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
    setTimeout(() => {
      setShowLoader(true);
      setShowImage(true);
      Animated.timing(imageOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 50);
  };

  const handleCloseImage = () => {
    setShowImage(false);
    setShowLoader(false);
    imageOpacity.setValue(0);
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setSelectedImage(null));
  };

  const imageData = useMemo(() => {
    if (!images) return [];
    return images[selectedType] || [];
  }, [images, selectedType]);

  const tabs: {key: MediaType; label: string; icon: string}[] = [
    {key: 'backdrops', label: 'Backdrops', icon: 'image'},
    {key: 'posters', label: 'Posters', icon: 'images'},
    {key: 'logos', label: 'Logos', icon: 'sparkles'},
  ];

  if (
    !images ||
    (images.backdrops.length === 0 &&
      images.posters.length === 0 &&
      images.logos.length === 0)
  ) {
    return null;
  }

  const renderImageItem = ({item}: {item: ImageData}) => {
    const isLogo = selectedType === 'logos';
    const imageUrl = getImageUrl(item.file_path, isTablet ? 'w780' : 'w500');
    const aspectRatio = item.aspect_ratio;

    return (
      <TouchableOpacity
        style={[styles.imageItem, isLogo && styles.logoItem]}
        onPress={() => handleOpenImage(item)}
        activeOpacity={0.8}>
        <FastImage
          source={{uri: imageUrl}}
          style={[
            styles.image,
            {
              aspectRatio:
                aspectRatio || (selectedType === 'posters' ? 2 / 3 : 16 / 9),
              width:
                selectedType === 'posters' && isTablet
                  ? 300
                  : selectedType === 'posters' && !isTablet
                  ? 200
                  : selectedType === 'backdrops' && isTablet
                  ? 500
                  : selectedType === 'backdrops' && !isTablet
                  ? 320
                  : selectedType === 'logos' && isTablet
                  ? 500
                  : selectedType === 'logos' && !isTablet
                  ? 200
                  : 200,
            },
            isLogo && styles.logoImage,
          ]}
          resizeMode={isLogo ? 'contain' : 'cover'}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Horizontal Category Tabs */}
      <ScrollView
        style={styles.tabContainer}
        horizontal={true}
        showsHorizontalScrollIndicator={false}>
        {tabs.map(tab => {
          const count = images[tab.key]?.length || 0;
          if (count === 0) return null;

          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabButton,
                selectedType === tab.key && styles.activeTabButton,
              ]}
              onPress={() => setSelectedType(tab.key)}>
              <Text
                style={[
                  styles.tabText,
                  selectedType === tab.key && styles.activeTabText,
                ]}>
                {tab.label} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Image Grid */}
      <FlatList
        key={selectedType}
        data={imageData}
        renderItem={renderImageItem}
        keyExtractor={(item, index) => `${selectedType}-${index}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.imageList}
      />

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
                style={styles.actionButton}
                onPress={() =>
                  selectedImage && Linking.openURL(selectedImage.url)
                }
                activeOpacity={0.8}>
                <Icon name="open-outline" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleCloseImage}
                activeOpacity={0.8}>
                <Icon name="close" size={26} color="#fff" />
              </TouchableOpacity>
            </View>

            {selectedImage && (
              <View
                style={{
                  width: width - spacing.xl * 2,
                  height: Math.min(
                    (width - spacing.xl * 2) / selectedImage.aspectRatio,
                    height * 0.8,
                  ),
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                {showLoader && (
                  <View
                    style={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                    <ActivityIndicator
                      size="large"
                      color={colors.modal.active}
                    />
                  </View>
                )}
                {showImage && (
                  <Animated.View
                    style={{
                      opacity: imageOpacity,
                      zIndex: 1,
                    }}>
                    <FastImage
                      source={{uri: selectedImage.url}}
                      style={{
                        width: width - spacing.xl * 2,
                        aspectRatio: selectedImage.aspectRatio,
                        maxHeight: height * 0.8,
                        borderRadius: borderRadius.lg,
                      }}
                      resizeMode="contain"
                      onLoadEnd={() => setShowLoader(false)}
                    />
                  </Animated.View>
                )}
              </View>
            )}
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  tabContainer: {
    flexDirection: 'row',
    padding: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  tabButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginHorizontal: spacing.xs,
    alignItems: 'center',
    backgroundColor: colors.modal.blur,
    borderWidth: 1,
    borderColor: colors.modal.content,
  },
  activeTabButton: {
    backgroundColor: colors.modal.border,
    borderWidth: 1,
    borderColor: colors.modal.active,
  },
  tabText: {
    color: colors.text.secondary,
    ...typography.body2,
    fontWeight: '500',
  },
  activeTabText: {
    color: colors.text.primary,
  },
  imageList: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  imageItem: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.background.tertiary,
  },
  logoItem: {
    backgroundColor: colors.modal.blur,
  },
  image: {
    borderRadius: borderRadius.md,
  },
  logoImage: {
    width: 200,
    height: 80,
    objectFit: 'contain',
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
  actionButton: {
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
