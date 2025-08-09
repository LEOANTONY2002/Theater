import React from 'react';
import {View, StyleSheet, Text, ActivityIndicator} from 'react-native';
import {colors, typography, spacing} from '../styles/theme';
import { GradientSpinner } from './GradientSpinner';

interface LoadingScreenProps {
  message: string;
}

export const LoadingScreen = ({message}: LoadingScreenProps) => {
  return (
    <View style={styles.container}>
      <GradientSpinner
        size={30}
        thickness={3}
        style={{
          marginVertical: 50,
          alignItems: 'center',
          alignSelf: 'center',
        }}
        colors={[
          colors.modal.activeBorder,
          colors.modal.activeBorder,
          'transparent',
          'transparent',
        ]}
      />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    ...typography.body1,
    color: colors.text.primary,
    marginTop: spacing.md,
  },
});
