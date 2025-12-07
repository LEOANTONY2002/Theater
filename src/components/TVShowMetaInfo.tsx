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
            <Text style={styles.label}>Created By</Text>
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

        {/* Networks */}
        {networks && networks.length > 0 && (
          <View style={styles.compactSection}>
            <Text style={styles.label}>Networks</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.networksList}>
              {networks.map(network => (
                <View key={network.id} style={styles.networkItem}>
                  {network.logo_path ? (
                    <FastImage
                      source={{uri: getImageUrl(network.logo_path, 'w185')}}
                      style={styles.networkLogo}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.networkPlaceholder}>
                      <Text style={styles.networkName} numberOfLines={1}>
                        {network.name}
                      </Text>
                    </View>
                  )}
                </View>
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
    paddingHorizontal: spacing.md,
  },
  compactRow: {
    gap: spacing.lg,
  },
  compactSection: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.body2,
    color: colors.text.muted,
    marginBottom: spacing.sm,
    fontWeight: '600',
    fontSize: 12,
  },
  creatorsList: {
    gap: spacing.md,
  },
  creatorItem: {
    width: 100,
    alignItems: 'center',
  },
  creatorImage: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.modal.blur,
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  creatorName: {
    ...typography.caption,
    color: colors.text.primary,
    textAlign: 'center',
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
