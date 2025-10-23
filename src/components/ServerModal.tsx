import React from 'react';
import {
  View,
  Modal,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, spacing, borderRadius, typography} from '../styles/theme';
import {modalStyles} from '../styles/styles';
import {MaybeBlurView} from './MaybeBlurView';
import {useResponsive} from '../hooks/useResponsive';
import {BlurPreference} from '../store/blurPreference';

interface ServerModalProps {
  visible: boolean;
  onClose: () => void;
  currentServer: number | null;
  setCurrentServer: (server: number) => void;
}

const SERVERS = [1, 2, 3, 4];

export const ServerModal: React.FC<ServerModalProps> = ({
  visible,
  onClose,
  currentServer,
  setCurrentServer,
}) => {
  const {isTablet} = useResponsive();
  const themeMode = BlurPreference.getMode();
  const isSolid = themeMode === 'normal';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent={true}
      backdropColor={colors.modal.blurDark}
      onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          margin: isTablet ? spacing.xl : spacing.md,
          borderRadius: borderRadius.xl,
          backgroundColor: 'transparent',
        }}>
        <View
          style={{
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
          }}>
          <Text
            style={{
              color: colors.text.primary,
              ...typography.h3,
            }}>
            Select Server
          </Text>
          <TouchableOpacity
            style={{padding: spacing.xs}}
            onPress={onClose}>
            <Ionicons name="close" size={20} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        <View
          style={{
            flex: 1,
            overflow: 'hidden',
            borderRadius: borderRadius.xl,
            borderWidth: isSolid ? 0 : 1,
            borderColor: isSolid ? colors.modal.blur : colors.modal.content,
          }}>
          <MaybeBlurView
            modal
            style={{
              flex: 1,
              borderRadius: borderRadius.xl,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: isSolid ? colors.modal.blur : colors.modal.content,
              backgroundColor: isSolid ? 'black' : colors.modal.blur,
              opacity: 1,
            }}>
            <View style={styles.modalBody}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                gap: spacing.md,
                paddingHorizontal: spacing.md,
              }}
              style={{paddingTop: spacing.md, paddingBottom: spacing.lg}}>
              {SERVERS.map(server => (
                <TouchableOpacity
                  key={server}
                  style={[
                    styles.serverItem,
                    currentServer === server && styles.selectedServer,
                  ]}
                  onPress={() => {
                    setCurrentServer(server);
                    onClose();
                  }}>
                  <View style={styles.serverIconWrapper}>
                    <Ionicons
                      name="server-outline"
                      size={36}
                      color={
                        currentServer === server
                          ? colors.text.primary
                          : colors.text.secondary
                      }
                    />
                  </View>
                  <Text
                    style={[
                      styles.serverName,
                      currentServer === server && styles.selectedServerText,
                    ]}>
                    {`Server ${server}`}
                  </Text>
                  {currentServer === server && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={colors.text.primary}
                      style={styles.checkmark}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            </View>
          </MaybeBlurView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBody: {
    // height: 350,
    paddingVertical: spacing.md,
  },
  serverItem: {
    width: 150,
    height: 150,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.modal.content,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.modal.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  selectedServer: {
    backgroundColor: colors.modal.active,
    borderColor: colors.modal.activeBorder,
    borderWidth: 1,
  },
  serverIconWrapper: {
    marginBottom: spacing.md,
  },
  serverName: {
    color: colors.text.secondary,
    ...typography.h3,
    fontWeight: '700',
    textAlign: 'center',
  },
  selectedServerText: {
    color: colors.text.primary,
  },
  checkmark: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },
  // Add this for half-screen modal
  halfScreenContent: {
    minHeight: 250,
    maxHeight: 300,
    alignSelf: 'stretch',
  },
});

export default ServerModal;
