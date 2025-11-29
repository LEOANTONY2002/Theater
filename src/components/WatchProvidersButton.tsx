import React, {useEffect, useState, useMemo} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Modal,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import {getImageUrl} from '../services/tmdb';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {WatchProviders as WatchProvidersType} from '../hooks/useWatchProviders';
// @ts-ignore
import * as cheerio from 'cheerio-without-node-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {MaybeBlurView} from './MaybeBlurView';
import {BlurPreference} from '../store/blurPreference';
import {useResponsive} from '../hooks/useResponsive';
import {BlurView} from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';

interface WatchProvidersButtonProps {
  providers: WatchProvidersType | undefined;
  contentId: number;
  title: string;
  type: 'movie' | 'tv';
}

interface ScrapedProvider {
  name: string;
  icon: string;
  link: string;
}

const STREAMING_APPS: Record<string, {app?: string; web: string}> = {
  Netflix: {
    app: 'netflix://',
    web: 'https://www.netflix.com',
  },
  'Amazon Prime Video': {
    app: 'com.amazon.avod.thirdpartyclient://',
    web: 'https://www.primevideo.com',
  },
  'Disney Plus': {
    app: 'disneyplus://',
    web: 'https://www.disneyplus.com',
  },
  'Disney+ Hotstar': {
    app: 'hotstar://',
    web: 'https://www.hotstar.com',
  },
  Hulu: {
    app: 'hulu://',
    web: 'https://www.hulu.com',
  },
  'Apple TV+': {
    app: 'videos://',
    web: 'https://tv.apple.com',
  },
  'HBO Max': {
    app: 'hbomax://',
    web: 'https://play.max.com',
  },
  'Paramount+': {
    app: 'cbsaa://',
    web: 'https://www.paramountplus.com',
  },
  Peacock: {
    app: 'peacocktv://',
    web: 'https://www.peacocktv.com',
  },
  Zee5: {
    app: 'zee5://',
    web: 'https://www.zee5.com',
  },
  'Sun NXT': {
    app: 'sunnxt://',
    web: 'https://www.sunnxt.com',
  },
  YouTube: {
    app: 'youtube://',
    web: 'https://www.youtube.com',
  },
  'YouTube TV': {
    app: 'youtube://',
    web: 'https://tv.youtube.com',
  },
  Crunchyroll: {
    app: 'crunchyroll://',
    web: 'https://www.crunchyroll.com',
  },
  Funimation: {
    app: 'funimation://',
    web: 'https://www.funimation.com',
  },
};

export const WatchProvidersButton: React.FC<WatchProvidersButtonProps> = ({
  providers,
  contentId,
  type,
}) => {
  const [scrapedProviders, setScrapedProviders] = useState<ScrapedProvider[]>(
    [],
  );
  const [modalVisible, setModalVisible] = useState(false);
  const {isTablet} = useResponsive();
  const themeMode = BlurPreference.getMode();
  const isSolid = themeMode === 'normal';
  const {width, height} = useWindowDimensions();

  // Derived TMDB providers
  const tmdbProviders = useMemo(() => {
    if (!providers) return [];
    const allProviders = [
      ...(providers.flatrate || []),
      ...(providers.ads || []),
      ...(providers.free || []),
    ];
    return allProviders
      .filter(
        (p, index, self) =>
          index === self.findIndex(x => x.provider_name === p.provider_name),
      )
      .map(p => ({
        name: p.provider_name,
        icon: p.logo_path,
        link: providers.link || '', // Fallback to generic link
      }));
  }, [providers]);

  useEffect(() => {
    const scrapeFallbackProviders = async () => {
      try {
        const url = `https://www.themoviedb.org/${type}/${contentId}/watch`;
        const res = await fetch(url);
        const html = await res.text();
        const $ = cheerio.load(html);

        const providers: {name: string; icon: string; link: string}[] = [];
        $('ul.providers li a').each((_: any, el: any) => {
          const link = $(el).attr('href') || '';
          const icon = $(el).find('img').attr('src') || '';
          const name = $(el).attr('title')?.split(' on ')[1] || '';

          const isExists = providers.find(p => p.icon === icon);
          if (isExists) return;

          if (link && icon) {
            providers.push({
              name,
              link,
              icon,
            });
          }
        });

        const uniqueProviders = providers.filter(
          (p, index, self) =>
            index ===
            self.findIndex(x => x.icon === p.icon && x.link === p.link),
        );

        setScrapedProviders(uniqueProviders);
      } catch (err) {
        console.error('Fallback scraping failed:', err);
      }
    };

    scrapeFallbackProviders();
  }, [contentId, type]);

  const displayProviders =
    scrapedProviders.length > 0 ? scrapedProviders : tmdbProviders;

  const handleProviderPress = async (
    providerName: string,
    fallbackUrl?: string,
  ) => {
    const provider = STREAMING_APPS[providerName];

    // If no provider config found, use fallback URL
    if (!provider && fallbackUrl) {
      try {
        await Linking.openURL(fallbackUrl);
      } catch (error) {
        console.error(`Error opening fallback URL:`, error);
      }
      return;
    }

    if (!provider) {
      if (fallbackUrl) {
        try {
          await Linking.openURL(fallbackUrl);
        } catch (error) {
          console.error(`Error opening fallback URL:`, error);
        }
      }
      return;
    }

    try {
      // Try app deep link first if available
      if (provider.app) {
        const canOpenDeepLink = await Linking.canOpenURL(provider.app);
        if (canOpenDeepLink) {
          await Linking.openURL(provider.app);
          return;
        }
      }

      await Linking.openURL(provider.web);
    } catch (error) {
      console.error(`Error opening ${providerName}:`, error);
      try {
        await Linking.openURL(provider.web);
      } catch (webError) {
        console.error(
          `Failed to open web fallback for ${providerName}:`,
          webError,
        );
      }
    }
  };

  if (displayProviders.length === 0) {
    return null;
  }

  const firstProvider = displayProviders[0];
  const isMultiple = displayProviders.length > 1;

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#170024ff',
      borderRadius: 30,
      borderWidth: 1,
      padding: isMultiple ? 4 : 0,
      paddingRight: isMultiple ? 10 : 0,
    },
    iconContainer: {
      position: 'relative',
      width: 45,
      height: 45,
      padding: 5,
      borderRadius: borderRadius.round,
      backgroundColor: colors.modal.blur,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: colors.modal.content,
    },
    providerIcon: {
      width: '100%',
      height: '100%',
      resizeMode: 'contain',
      borderRadius: borderRadius.round,
    },
    chevron: {
      marginLeft: 4,
    },
    modalContainer: {
      flex: 1,
      margin: isTablet ? spacing.xl : spacing.md,
      paddingTop: height / 2,
    },
    modalTitle: {
      color: colors.text.primary,
      ...typography.h3,
    },
    modalBodyWrapper: {
      flex: 1,
      borderRadius: borderRadius.xl,
      overflow: 'hidden',
      borderWidth: isSolid ? 0 : 1,
      borderColor: isSolid ? colors.modal.blur : colors.modal.content,
    },
    providersList: {
      gap: 12,
      padding: spacing.md,
    },
    providerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.modal.blur,
      borderRadius: borderRadius.round,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: colors.modal.border,
    },
    listProviderIcon: {
      width: 45,
      height: 45,
      margin: 10,
      borderRadius: borderRadius.round,
    },
    providerButtonText: {
      flex: 1,
      ...typography.body1,
      color: colors.text.primary,
      fontWeight: '500',
    },
  });

  return (
    <>
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        useAngle
        angle={120}
        style={{
          borderRadius: borderRadius.round,
          padding: 2,
        }}>
        <TouchableOpacity
          style={styles.container}
          onPress={() => {
            if (isMultiple) {
              setModalVisible(true);
            } else {
              handleProviderPress(firstProvider.name, firstProvider.link);
            }
          }}
          activeOpacity={0.8}>
          <View style={styles.iconContainer}>
            <Image
              source={{uri: getImageUrl(firstProvider.icon, 'w154')}}
              style={styles.providerIcon}
            />
          </View>

          {isMultiple && (
            <Icon
              name="chevron-down"
              size={20}
              color="#fff"
              style={styles.chevron}
            />
          )}
        </TouchableOpacity>
      </LinearGradient>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setModalVisible(false)}>
        {!isSolid && (
          <BlurView
            blurType="dark"
            blurAmount={10}
            overlayColor={colors.modal.blurDark}
            style={StyleSheet.absoluteFill}
          />
        )}

        <View style={styles.modalContainer}>
          <MaybeBlurView header>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
              }}>
              <Icon name="play-circle" size={24} color={colors.text.muted} />
              <Text style={styles.modalTitle}>Watch Now</Text>
            </View>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={{
                padding: spacing.sm,
                backgroundColor: colors.modal.blur,
                borderRadius: borderRadius.round,
                borderTopWidth: 1,
                borderLeftWidth: 1,
                borderRightWidth: 1,
                borderColor: colors.modal.content,
              }}>
              <Icon name="close" size={20} color={colors.text.primary} />
            </TouchableOpacity>
          </MaybeBlurView>

          <View style={styles.modalBodyWrapper}>
            <MaybeBlurView body radius={borderRadius.xl}>
              <ScrollView contentContainerStyle={styles.providersList}>
                {displayProviders.map((provider, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.providerButton}
                    onPress={() => {
                      handleProviderPress(provider.name, provider.link);
                      setModalVisible(false);
                    }}>
                    <Image
                      source={{uri: getImageUrl(provider.icon, 'w154')}}
                      style={styles.listProviderIcon}
                    />
                    <View style={{gap: 0}}>
                      <Text style={{color: colors.text.primary}}>
                        Watch Now
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={{
                          color: colors.text.muted,
                          marginRight: spacing.md,
                          width: isTablet ? '100%' : width / 1.5,
                        }}>
                        {provider.name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </MaybeBlurView>
          </View>
        </View>
      </Modal>
    </>
  );
};
