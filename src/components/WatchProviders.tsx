import React from 'react';
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

interface WatchProvidersProps {
  providers: WatchProvidersType;
}

const STREAMING_APPS = {
  Netflix: {
    app: 'netflix://',
    web: 'https://www.netflix.com',
  },
  'Disney+': {
    app: 'disneyplus://',
    web: 'https://www.disneyplus.com',
  },
  'Amazon Prime Video': {
    app: 'primevideo://',
    web: 'https://www.primevideo.com',
  },
  'HBO Max': {
    app: 'hbomax://',
    web: 'https://www.max.com',
  },
  Hulu: {
    app: 'hulu://',
    web: 'https://www.hulu.com',
  },
  'Apple TV+': {
    app: 'tv.apple.com',
    web: 'https://tv.apple.com',
  },
  Peacock: {
    app: 'peacocktv://',
    web: 'https://www.peacocktv.com',
  },
  'Paramount+': {
    app: 'paramountplus://',
    web: 'https://www.paramountplus.com',
  },
  Showtime: {
    app: 'showtime://',
    web: 'https://www.showtime.com',
  },
  Starz: {
    app: 'starz://',
    web: 'https://www.starz.com',
  },
};

export const WatchProviders: React.FC<WatchProvidersProps> = ({providers}) => {
  const handleProviderPress = async (providerName: string) => {
    const provider =
      STREAMING_APPS[providerName as keyof typeof STREAMING_APPS];
    if (provider) {
      try {
        const canOpen = await Linking.canOpenURL(provider.app);
        if (canOpen) {
          await Linking.openURL(provider.app);
        } else {
          // If app is not installed, open the streaming service's website
          await Linking.openURL(provider.web);
        }
      } catch (error) {
        console.error('Error opening streaming app:', error);
      }
    }
  };

  const renderProviderSection = (
    providers: WatchProvidersType['flatrate' | 'rent' | 'buy' | 'free'],
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
              {/* <Text style={styles.providerName}>{provider.provider_name}</Text> */}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View>
      {/* <Text style={styles.title}>Where to Watch</Text> */}
      {renderProviderSection(providers.flatrate, 'Streaming On')}
      {/* {renderProviderSection(providers.rent, 'Rent')}
      {renderProviderSection(providers.buy, 'Buy')}
      {renderProviderSection(providers.free, 'Free')} */}
    </View>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
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
    objectFit: 'cover',
  },
});
