import React, {useState, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  useWindowDimensions,
  Image,
  ScrollView,
  Linking,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {getImageUrl} from '../services/tmdb';
import {ImageData} from '../types/movie';
import {MaybeBlurView} from './MaybeBlurView';
import {BlurPreference} from '../store/blurPreference';
import {BlurView} from '@react-native-community/blur';

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
    const imageUrl = getImageUrl(item.file_path, 'w300');
    const aspectRatio = item.aspect_ratio;

    return (
      <TouchableOpacity
        style={[styles.imageItem, isLogo && styles.logoItem]}
        onPress={() =>
          setSelectedImage({
            url: getImageUrl(item.file_path, 'original'),
            aspectRatio:
              item.aspect_ratio ||
              (selectedType === 'posters' ? 2 / 3 : 16 / 9),
          })
        }
        activeOpacity={0.8}>
        <FastImage
          source={{uri: imageUrl}}
          style={[
            styles.image,
            {
              aspectRatio:
                aspectRatio || (selectedType === 'posters' ? 2 / 3 : 16 / 9),
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
        removeClippedSubviews
      />

      {/* Full Screen Image Modal */}
      <Modal
        visible={selectedImage !== null}
        backdropColor={colors.modal.blurDark}
        statusBarTranslucent
        onRequestClose={() => setSelectedImage(null)}
        animationType="fade">
        <View style={styles.modalContainer}>
          {!isSolid && (
            <BlurView
              blurType="dark"
              blurAmount={10}
              overlayColor={colors.modal.blurDark}
              style={{
                flex: 1,
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            />
          )}
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() =>
                selectedImage && Linking.openURL(selectedImage.url)
              }
              activeOpacity={0.8}>
              <Icon name="open-outline" size={28} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedImage(null)}
              activeOpacity={0.8}>
              <Icon name="close" size={30} color="#fff" />
            </TouchableOpacity>
          </View>
          <MaybeBlurView
            body
            style={{
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            {selectedImage && (
              <FastImage
                source={{uri: selectedImage.url}}
                style={{
                  width: width - 64,
                  aspectRatio: selectedImage.aspectRatio,
                  maxHeight: height * 0.8,
                  margin: spacing.md,
                  borderRadius: borderRadius.lg,
                }}
                resizeMode="contain"
              />
            )}
          </MaybeBlurView>
        </View>
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
    backgroundColor: colors.background.secondary,
  },
  logoItem: {
    backgroundColor: colors.modal.blur,
  },
  image: {
    width: 200,
    borderRadius: borderRadius.md,
  },
  logoImage: {
    width: 200,
    height: 80,
    objectFit: 'contain',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
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
