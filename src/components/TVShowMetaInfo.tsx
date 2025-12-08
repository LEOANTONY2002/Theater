import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {getImageUrl} from '../services/tmdb';

interface Creator {
  id: number;
  name: string;
  profile_path: string | null;
}

interface Network {
  id: number;
  name: string;
  logo_path: string | null;
}

interface TVShowMetaInfoProps {
  creators?: Creator[];
  networks?: Network[];
  onCreatorPress?: (creatorId: number, creatorName: string) => void;
}

export const TVShowMetaInfo: React.FC<TVShowMetaInfoProps> = ({
  creators,
  networks,
  onCreatorPress,
}) => {
  const hasAnyData =
    (creators && creators.length > 0) || (networks && networks.length > 0);

  if (!hasAnyData) return null;

  return (
    <View style={styles.container}>
      {/* Creators & Networks in compact layout */}
      <View style={styles.compactRow}>
        {/* Creators */}
        {creators && creators.length > 0 && (
          <View style={styles.compactSection}>
            <Text
              style={{
                ...typography.body2,
                color: colors.text.primary,
                marginLeft: spacing.md,
                marginBottom: spacing.xs,
              }}>
              Created By
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.creatorsList}>
              {creators.map(creator => (
                <TouchableOpacity
                  key={creator.id}
                  style={styles.creatorItem}
                  onPress={() => onCreatorPress?.(creator.id, creator.name)}
                  activeOpacity={0.7}
                  disabled={!onCreatorPress}>
                  {creator.profile_path ? (
                    <FastImage
                      source={{
                        uri: getImageUrl(creator.profile_path, 'w185'),
                      }}
                      style={styles.creatorImage}
                    />
                  ) : (
                    <View
                      style={[styles.creatorImage, styles.imagePlaceholder]}>
                      <Icon name="person" size={24} color={colors.text.muted} />
                    </View>
                  )}
                  <Text style={styles.creatorName} numberOfLines={2}>
                    {creator.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
  },
  compactRow: {
    gap: spacing.lg,
  },
  compactSection: {
    marginBottom: spacing.md,
  },
  creatorsList: {
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  creatorItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.modal.blur,
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.modal.content,
  },
  creatorImage: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.md,
    backgroundColor: colors.modal.blur,
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  creatorName: {
    ...typography.caption,
    color: colors.text.secondary,
    fontSize: 12,
    maxWidth: 80,
  },
  networksList: {
    gap: spacing.md,
  },
  networkItem: {
    width: 120,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.modal.blur,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
  },
  networkLogo: {
    width: '100%',
    height: '100%',
  },
  networkPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  networkName: {
    ...typography.body2,
    color: colors.text.primary,
    textAlign: 'center',
  },
});
