import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Linking} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {ExternalIds} from '../types/movie';

interface SocialLinksProps {
  externalIds?: ExternalIds;
  title: string;
}

export const SocialLinks: React.FC<SocialLinksProps> = ({
  externalIds,
  title,
}) => {
  if (!externalIds) return null;

  const links = [
    {
      key: 'imdb_id',
      label: 'IMDb',
      icon: 'film',
      color: '#F5C518',
      url: externalIds.imdb_id
        ? `https://www.imdb.com/title/${externalIds.imdb_id}`
        : null,
    },
    {
      key: 'facebook_id',
      label: 'Facebook',
      icon: 'logo-facebook',
      color: '#1877F2',
      url: externalIds.facebook_id
        ? `https://www.facebook.com/${externalIds.facebook_id}`
        : null,
    },
    {
      key: 'instagram_id',
      label: 'Instagram',
      icon: 'logo-instagram',
      color: '#E4405F',
      url: externalIds.instagram_id
        ? `https://www.instagram.com/${externalIds.instagram_id}`
        : null,
    },
    {
      key: 'twitter_id',
      label: 'Twitter',
      icon: 'logo-twitter',
      color: '#1DA1F2',
      url: externalIds.twitter_id
        ? `https://twitter.com/${externalIds.twitter_id}`
        : null,
    },
  ].filter(link => link.url);

  if (links.length === 0) return null;

  const handlePress = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.warn('Failed to open URL:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Follow & Learn More</Text>
      <View style={styles.linksContainer}>
        {links.map(link => (
          <TouchableOpacity
            key={link.key}
            style={[styles.linkButton, {borderColor: link.color + '40'}]}
            onPress={() => handlePress(link.url!)}
            activeOpacity={0.7}>
            <Icon name={link.icon} size={24} color={link.color} />
            <Text style={styles.linkLabel}>{link.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  linksContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.round,
    backgroundColor: colors.modal.blur,
    borderWidth: 1,
  },
  linkLabel: {
    ...typography.body2,
    color: colors.text.primary,
    fontWeight: '600',
  },
});
