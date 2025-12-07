import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors, spacing, typography} from '../styles/theme';

interface ShowStatusProps {
  status?: string;
}

export const ShowStatus: React.FC<ShowStatusProps> = ({status}) => {
  if (!status) return null;

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'returning series':
        return 'reload-circle-outline';
      case 'ended':
      case 'canceled':
        return 'close-circle-outline';
      case 'in production':
        return 'film-outline';
      default:
        return 'information-circle-outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'returning series':
        return colors.accent;
      case 'ended':
      case 'canceled':
        return colors.text.muted;
      case 'in production':
        return '#4CAF50';
      default:
        return colors.text.primary;
    }
  };

  return (
    <View style={styles.container}>
      <Icon
        name={getStatusIcon(status)}
        size={16}
        color={getStatusColor(status)}
      />
      <Text style={[styles.statusText, {color: getStatusColor(status)}]}>
        {status}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusText: {
    ...typography.body2,
    fontSize: 13,
    fontWeight: '500',
  },
});
