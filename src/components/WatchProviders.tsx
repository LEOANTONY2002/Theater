import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import {getImageUrl} from '../services/tmdb';
import {colors, spacing, typography} from '../styles/theme';
import {WatchProviders as WatchProvidersType} from '../hooks/useWatchProviders';
// @ts-ignore
import * as cheerio from 'cheerio-without-node-native';

interface WatchProvidersProps {
  providers: WatchProvidersType;
  contentId: string;
  title: string;
  type: 'movie' | 'tv';
}

interface ProviderURLs {
  app?: string; // scheme
  web: string;
}

interface ScrapedProvider {
  icon: string;
  link: string;
}

const STREAMING_APPS: Record<string, ProviderURLs> = {
  Netflix: {
    app: 'netflix://',
    web: 'https://www.netflix.com/123',
  },
  JioHotstar: {
    app: 'jiohotstar://',
    web: 'https://www.jiohotstar.com',
  },
  'Amazon Prime Video': {
    app: 'aiv-global://',
    web: 'https://www.primevideo.com',
  },
  'HBO Max': {
    app: 'hbomax://',
    web: 'https://play.max.com',
  },
  Hulu: {
    app: 'hulu://',
    web: 'https://www.hulu.com',
  },
  'Apple TV+': {
    app: 'appletv://',
    web: 'https://tv.apple.com',
  },
  Peacock: {
    app: 'peacock://',
    web: 'https://www.peacocktv.com',
  },
  'Paramount+': {
    app: 'paramountplus://',
    web: 'https://www.paramountplus.com',
  },
  Zee5: {
    app: 'zee5://',
    web: 'https://www.zee5.com',
  },
  'Sun NXT': {
    app: 'sunnxt://',
    web: 'https://www.sunnxt.com',
  },
};

export const WatchProviders: React.FC<WatchProvidersProps> = ({
  providers,
  contentId,
  type,
}) => {
  const [scrapedProviders, setScrapedProviders] = useState<ScrapedProvider[]>(
    [],
  );

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
          const name = $(el).find('img').attr('alt') || '';

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

    if (providers && scrapedProviders.length === 0) {
      scrapeFallbackProviders();
    }
  }, [providers]);

  const handleProviderPress = async (
    providerName: string,
    fallbackUrl?: string,
  ) => {
    const provider = STREAMING_APPS[providerName];
    if (!provider && fallbackUrl) {
      await Linking.openURL(fallbackUrl);
      return;
    }

    if (!provider) {
      console.warn(`Provider ${providerName} not found`);
      return;
    }

    try {
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
      await Linking.openURL(provider.web);
    }
  };

  const renderProviderSection = (
    providers: WatchProvidersType['ads' | 'flatrate' | 'rent' | 'buy' | 'free'],
    title: string,
  ) => {
    if (!providers || providers.length === 0) return null;

    return (
      <View style={{marginVertical: spacing.lg, marginTop: 0}}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.providersList}>
          {providers.map(provider => (
            <TouchableOpacity
              key={provider.provider_id}
              style={styles.providerItem}
              onPress={() => handleProviderPress(provider.provider_name)}>
              <Image
                source={{
                  uri: getImageUrl(provider.logo_path, 'w500'),
                }}
                style={styles.providerLogo}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const streamingProviders = [
    ...(providers.ads || []),
    ...(providers.flatrate || []),
  ];

  return (
    <View>
      {scrapedProviders.length > 0 ? (
        <View style={{marginVertical: spacing.lg, marginTop: 0}}>
          <Text style={styles.sectionTitle}>Streaming Now</Text>
          <View style={styles.providersList}>
            {scrapedProviders.map((p, idx) => {
              console.log(p.icon);

              return (
                <TouchableOpacity
                  key={idx}
                  style={styles.providerItem}
                  onPress={() => handleProviderPress('Unknown', p?.link)}>
                  <Image
                    source={{
                      uri: getImageUrl(p.icon, 'w300'),
                    }}
                    style={styles.providerLogo}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : (
        streamingProviders.length > 0 &&
        renderProviderSection(streamingProviders, 'Streaming Now')
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: 16,
    marginLeft: 16,
  },
  providersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
  },
  providerItem: {
    alignItems: 'center',
  },
  providerLogo: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.divider,
  },
});
