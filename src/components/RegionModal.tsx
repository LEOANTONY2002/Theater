import React from 'react';
import {
  View,
  Modal,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import {colors, spacing, borderRadius, typography} from '../styles/theme';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {BlurView} from '@react-native-community/blur';

interface RegionModalProps {
  visible: boolean;
  onClose: () => void;
  regions: Array<{
    iso_3166_1: string;
    english_name: string;
    native_name?: string;
  }>;
  selectedRegion?: string;
  onSelectRegion: (region: {iso_3166_1: string; english_name: string}) => void;
  isLoading?: boolean;
}

export const RegionModal: React.FC<RegionModalProps> = ({
  visible,
  onClose,
  regions,
  selectedRegion,
  onSelectRegion,
  isLoading = false,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      statusBarTranslucent={true}
      onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="dark"
          blurAmount={10}
          overlayColor="rgba(23, 20, 48, 0.87)"
          reducedTransparencyFallbackColor="rgba(0, 0, 0, 0.5)"
        />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Region</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={regions}
              keyExtractor={item => item.iso_3166_1}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={[
                    styles.regionItem,
                    selectedRegion === item.iso_3166_1 && styles.selectedRegion,
                  ]}
                  onPress={() => onSelectRegion(item)}>
                  <Text
                    style={[
                      styles.regionName,
                      selectedRegion === item.iso_3166_1 &&
                        styles.selectedRegionText,
                    ]}>
                    {item.english_name}
                  </Text>
                  {item.native_name &&
                    item.native_name !== item.english_name && (
                      <Text
                        style={[
                          styles.nativeName,
                          selectedRegion === item.iso_3166_1 &&
                            styles.selectedRegionText,
                        ]}>
                        {item.native_name}
                      </Text>
                    )}
                  {selectedRegion === item.iso_3166_1 && (
                    <Ionicons
                      name="checkmark"
                      size={24}
                      color={colors.primary}
                      style={styles.checkmark}
                    />
                  )}
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    flex: 1,
    marginTop: 60,
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.secondary,
  },
  modalTitle: {
    color: colors.text.primary,
    ...typography.h2,
  },
  closeButton: {
    padding: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  regionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.secondary,
  },
  selectedRegion: {
    backgroundColor: colors.background.tertiary,
  },
  regionName: {
    flex: 1,
    color: colors.text.primary,
    ...typography.body1,
  },
  nativeName: {
    color: colors.text.secondary,
    marginLeft: spacing.sm,
    ...typography.body2,
  },
  selectedRegionText: {
    color: colors.primary,
  },
  checkmark: {
    marginLeft: spacing.sm,
  },
});
