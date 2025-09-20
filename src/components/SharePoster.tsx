import React from 'react';
import {View, Text, Image, ImageBackground, StyleSheet} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import {colors, spacing, typography, borderRadius} from '../styles/theme';

// Minimal ISO-639-1 to English language name map (fallback to code)
const ISO_LANG_MAP: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  ta: 'Tamil',
  te: 'Telugu',
  ml: 'Malayalam',
  kn: 'Kannada',
  mr: 'Marathi',
  bn: 'Bengali',
  ur: 'Urdu',
  gu: 'Gujarati',
  pa: 'Punjabi',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ru: 'Russian',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  ar: 'Arabic',
  tr: 'Turkish',
  th: 'Thai',
  id: 'Indonesian',
  vi: 'Vietnamese',
};

const langLabel = (code?: string) => {
  if (!code) return undefined;
  const k = code.toLowerCase();
  return ISO_LANG_MAP[k] || code.toUpperCase();
};

export type SharePosterItem = {
  id: number;
  type: 'movie' | 'tv';
  title?: string;
  name?: string;
  backdrop_path?: string;
  poster_path?: string;
  release_date?: string;
  first_air_date?: string;
};

interface SharePosterProps {
  watchlistName: string;
  items: SharePosterItem[];
  importCode?: string;
  isFilter?: boolean;
  showQR?: boolean;
  details?: {
    runtime?: number; // minutes
    year?: number;
    rating?: number; // 0-10
    genres?: string[];
  };
  streamingIcon?: string | null;
  languages?: string[];
  seasons?: number;
  episodes?: number;
}

// 1080 x 1920 recommended canvas
export const SharePoster: React.FC<SharePosterProps> = ({
  watchlistName,
  items,
  importCode = '',
  isFilter = false,
  showQR = true,
  details,
  streamingIcon,
  languages,
  seasons,
  episodes,
}) => {
  const posters = items.slice(0, 9);
  const posterImages = posters.filter(
    p => !!(p?.poster_path || p?.backdrop_path),
  );
  console.log('importCode', importCode);

  return (
    <View style={styles.canvas}>
      <LinearGradient
        colors={['rgba(21, 71, 93, 0.36)', 'transparent']}
        start={{x: 0, y: 0}}
        end={{x: 0, y: 0.7}}
        style={{
          height: 1920,
          width: 1080,
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: -10,
        }}
      />
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {details ? 'Watching' : isFilter ? 'Filter' : 'Watchlist'}
        </Text>
      </View>

      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
        }}>
        {posterImages.length > 0 ? (
          <Image
            source={{
              uri: `https://image.tmdb.org/t/p/w500${
                posterImages[0]?.poster_path || posterImages[0]?.backdrop_path
              }`,
            }}
            style={{
              width: 600,
              height: 1080,
              borderRadius: 70,
              zIndex: 1,
            }}
            resizeMode="cover"
          />
        ) : (
          <Image
            source={require('../assets/theater.webp')}
            style={{
              width: 600,
              height: 1080,
              borderRadius: 70,
              zIndex: 1,
              opacity: 0.2,
            }}
            resizeMode="contain"
          />
        )}
        {posterImages?.length > 1 && (
          <Image
            source={{
              uri: `https://image.tmdb.org/t/p/w500${
                posterImages[1]?.poster_path || posterImages[1]?.backdrop_path
              }`,
            }}
            style={{
              width: 500,
              height: 900,
              position: 'absolute',
              zIndex: 0,
              left: 220,
              marginBottom: -20,
              transform: [{rotate: '15deg'}],
              borderRadius: 70,
              opacity: 0.3,
            }}
            resizeMode="cover"
          />
        )}
        {posterImages?.length > 2 && (
          <Image
            source={{
              uri: `https://image.tmdb.org/t/p/w500${
                posterImages[2]?.poster_path || posterImages[2]?.backdrop_path
              }`,
            }}
            style={{
              width: 500,
              height: 900,
              position: 'absolute',
              zIndex: 0,
              right: 220,
              marginBottom: -20,
              transform: [{rotate: '-15deg'}],
              borderRadius: 70,
              opacity: 0.3,
            }}
            resizeMode="cover"
          />
        )}
        <LinearGradient
          colors={[colors.background.secondary, colors.background.primary]}
          style={{
            position: 'absolute',
            borderRadius: 70,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 2,
          }}
        />
      </View>
      <Image
        source={require('../assets/arc.png')}
        style={{
          width: 1000,
          height: 100,
          zIndex: 2,
          marginTop: -100,
        }}
        resizeMode="contain"
      />

      {!details && (
        <Text
          numberOfLines={2}
          style={{
            color: colors.text.primary,
            ...typography.h1,
            fontSize: 60,
            marginTop: 60,
            opacity: 0.5,
            fontWeight: 'bold',
            marginVertical: 16,
          }}>
          {watchlistName}
        </Text>
      )}

      {details && (
        <View
          style={{
            alignItems: 'center',
            marginTop: 78,
            paddingHorizontal: 48,
          }}>
          <Text
            style={{
              color: colors.text.secondary,
              ...typography.body1,
              fontSize: 35,
            }}>
            {[
              details.year !== undefined ? String(details.year) : undefined,
              langLabel(languages?.[0]),
              seasons
                ? `${seasons} season${seasons > 1 ? 's' : ''}`
                : undefined,
              episodes
                ? `${episodes} episode${episodes > 1 ? 's' : ''}`
                : undefined,
              details.runtime !== undefined
                ? `${Math.floor((details.runtime || 0) / 60)}h ${
                    (details.runtime || 0) % 60
                  }m`
                : undefined,
            ]
              .filter(Boolean)
              .join('  •  ')}
          </Text>
          {details.genres?.length && (
            <Text
              numberOfLines={2}
              style={{
                color: colors.text.muted,
                ...typography.body1,
                fontSize: 32,
                marginTop: 10,
                opacity: 0.7,
                textAlign: 'center',
              }}>
              {details.genres.slice(0, 5).join(' | ')}
            </Text>
          )}

          {/* Seasons/Episodes combined above in metadata line */}

          {/* Streaming icon below genres if provided */}
          {!!streamingIcon && (
            <View style={{marginTop: 50, alignItems: 'center', opacity: 0.7}}>
              <Image
                source={{uri: streamingIcon}}
                style={{width: 72, height: 72, borderRadius: 16}}
                resizeMode="contain"
              />
            </View>
          )}
        </View>
      )}

      {showQR && !!importCode ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            position: 'absolute',
            bottom: 50,
            left: 50,
          }}>
          <QRCode
            value={`https://lacurations.vercel.app/theater?redirect=${
              isFilter ? 'filtercode' : 'watchlistcode'
            }&code=${encodeURIComponent(importCode || '')}`}
            size={150}
            enableLinearGradient={true}
            backgroundColor="rgb(252, 251, 255)"
            linearGradient={['rgb(110, 54, 250)', 'rgb(255, 52, 157))']}
          />
          <View style={{marginLeft: 20}}>
            <Text
              style={{
                color: colors.text.secondary,
                ...typography.body1,
                fontSize: 25,
              }}>
              Get
            </Text>
            <Text
              style={{
                color: colors.text.secondary,
                ...typography.body1,
                fontSize: 25,
              }}>
              My {isFilter ? 'Filter' : 'Watchlist'}
            </Text>
          </View>
        </View>
      ) : (
        <Image
          source={require('../assets/theater.webp')}
          style={{
            width: 120,
            height: 80,
            zIndex: 2,
            position: 'absolute',
            bottom: 50,
            left: 50,
            opacity: 0.3,
          }}
          resizeMode="contain"
        />
      )}

      <Image
        source={require('../assets/symbol.webp')}
        style={{
          width: 200,
          height: 80,
          zIndex: 2,
          position: 'absolute',
          bottom: 50,
          right: 50,
          opacity: 0.3,
        }}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  canvas: {
    width: 1080,
    height: 1920,
    backgroundColor: colors.background.primary,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 220,
  },
  header: {
    paddingHorizontal: 64,
  },
  title: {
    color: colors.modal.content,
    opacity: 0.5,
    ...typography.h1,
    fontSize: 200,
    fontFamily: 'Inter_28pt-ExtraBold',
    marginBottom: -90,
  },
  subtitle: {
    marginTop: 12,
    color: colors.text.secondary,
    ...typography.body1,
  },

  gridItem: {
    width: (1080 - 48 * 2 - 24 * 2) / 3, // 3 per row with 24 spacing
    height: ((1080 - 48 * 2 - 24 * 2) / 3) * 1.5,
    marginBottom: 24,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.modal.content,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  posterPlaceholder: {
    backgroundColor: colors.background.tertiary,
  },
  footer: {
    position: 'absolute',
    bottom: 64,
    left: 48,
    right: 48,
    padding: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: borderRadius.md,
  },
  qrContainer: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrBackground: {
    borderRadius: 8,
  },
  footerLabel: {
    color: colors.text.secondary,
    ...typography.body2,
    marginBottom: 6,
  },
  code: {
    color: colors.text.primary,
    ...typography.body1,
  },
  hint: {
    marginTop: 6,
    color: colors.text.secondary,
    ...typography.caption,
  },
});

export default SharePoster;
