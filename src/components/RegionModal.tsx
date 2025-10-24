import React from 'react';
import {
  View,
  Modal,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import {colors, spacing, borderRadius, typography} from '../styles/theme';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {BlurView} from '@react-native-community/blur';
import {GradientSpinner} from './GradientSpinner';
import {MaybeBlurView} from './MaybeBlurView';
import {useResponsive} from '../hooks/useResponsive';
import {BlurPreference} from '../store/blurPreference';

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
  const {isTablet} = useResponsive();
  const themeMode = BlurPreference.getMode();
  const isSolid = themeMode === 'normal';

  const styles = StyleSheet.create({
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.md,
      marginBottom: isTablet ? spacing.lg : spacing.md,
      borderRadius: borderRadius.round,
      borderWidth: 1,
      borderColor: isSolid ? colors.modal.blur : colors.modal.border,
      backgroundColor: isSolid ? 'black' : colors.modal.content,
      zIndex: 1,
      marginTop: 20,
    },
    modalTitle: {
      color: colors.text.primary,
      ...typography.h3,
    },
    closeButton: {
      padding: spacing.xs,
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
      backgroundColor: colors.modal.active,
    },
    regionName: {
      flex: 1,
      color: colors.text.secondary,
      ...typography.body1,
    },
    nativeName: {
      color: colors.text.secondary,
      marginLeft: spacing.sm,
      ...typography.body2,
    },
    selectedRegionText: {
      color: colors.text.primary,
    },
    checkmark: {
      marginLeft: spacing.sm,
    },
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      backdropColor={colors.modal.blurDark}
      statusBarTranslucent={true}
      onRequestClose={onClose}>
      {!isSolid && (
        <BlurView
          blurType="dark"
          blurAmount={10}
          overlayColor={colors.modal.blurDark}
          style={{
            flex: 1,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />
      )}

      <View
        style={{
          flex: 1,
          margin: isTablet ? spacing.xl : spacing.md,
          borderRadius: borderRadius.xl,
          backgroundColor: 'transparent',
        }}>
        <MaybeBlurView
          header
          style={[
            {
              marginTop: 20,
            },
          ]}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
            }}>
            <Ionicons name="location" size={20} color={colors.text.muted} />
            <Text style={styles.modalTitle}>Select Region</Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={{
              padding: spacing.sm,
              backgroundColor: colors.modal.blur,
              borderRadius: borderRadius.round,
              borderTopWidth: 1,
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderColor: colors.modal.content,
            }}>
            <Ionicons name="close" size={20} color={colors.text.primary} />
          </TouchableOpacity>
        </MaybeBlurView>
        <View
          style={{
            flex: 1,
            overflow: 'hidden',
            borderRadius: borderRadius.xl,
            borderWidth: isSolid ? 0 : 1,
            borderColor: isSolid ? colors.modal.blur : colors.modal.content,
          }}>
          <MaybeBlurView body>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <GradientSpinner
                  size={30}
                  style={{
                    marginVertical: 50,
                    alignItems: 'center',
                    alignSelf: 'center',
                  }}
                  color={colors.modal.activeBorder}
                />
              </View>
            ) : (
              <FlatList
                data={regions}
                keyExtractor={item => item.iso_3166_1}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{paddingBottom: spacing.xl}}
                renderItem={({item}) => (
                  <TouchableOpacity
                    style={[
                      styles.regionItem,
                      selectedRegion === item.iso_3166_1 &&
                        styles.selectedRegion,
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
                        color={colors.text.primary}
                        style={styles.checkmark}
                      />
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </MaybeBlurView>
        </View>
      </View>
    </Modal>
  );
};
