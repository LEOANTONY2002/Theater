import React from 'react';
import { View, Text, Image, ImageBackground, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors, spacing, typography, borderRadius } from '../styles/theme';

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
}

// 1080 x 1920 recommended canvas
export const SharePoster: React.FC<SharePosterProps> = ({ watchlistName, items, importCode }) => {
  const top = items[0];
  const backdrop = top?.backdrop_path
    ? `https://image.tmdb.org/t/p/w780${top.backdrop_path}`
    : undefined;

  const posters = items.slice(0, 9);

  return (
    <View style={styles.canvas}>
      <ImageBackground
        source={backdrop ? { uri: backdrop } : undefined}
        resizeMode="cover"
        style={StyleSheet.absoluteFillObject as any}
      >
        <LinearGradient
          colors={["rgba(0,0,0,0.1)", "rgba(0,0,0,0.85)"]}
          style={StyleSheet.absoluteFillObject as any}
        />
      </ImageBackground>

      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={2}>
          {watchlistName}
        </Text>
        <Text style={styles.subtitle}>
          {items.length} {items.length === 1 ? 'item' : 'items'} · Theater
        </Text>
      </View>

      <View style={styles.grid}>
        {posters.map((it) => (
          <View key={`${it.type}-${it.id}`} style={styles.gridItem}>
            {it.poster_path ? (
              <Image
                source={{ uri: `https://image.tmdb.org/t/p/w500${it.poster_path}` }}
                style={styles.poster}
                resizeMode="cover"
              />)
              : (
              <View style={[styles.poster, styles.posterPlaceholder]} />
            )}
          </View>
        ))}
      </View>

      {importCode ? (
        <View style={styles.footer}>
          <Text style={styles.footerLabel}>Import this watchlist in Theater</Text>
          <Text style={styles.code} numberOfLines={2}>{importCode}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  canvas: {
    width: 1080,
    height: 1920,
    backgroundColor: '#000',
    borderRadius: 24,
    overflow: 'hidden',
  },
  header: {
    paddingTop: 72,
    paddingHorizontal: 64,
  },
  title: {
    color: colors.text.primary,
    ...typography.h1,
  },
  subtitle: {
    marginTop: 12,
    color: colors.text.secondary,
    ...typography.body1,
  },
  grid: {
    marginTop: 48,
    paddingHorizontal: 48,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: borderRadius.md,
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
});

export default SharePoster;
