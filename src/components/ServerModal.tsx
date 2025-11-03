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
import {CINEMA_SERVERS} from '../config/servers';

interface ServerModalProps {
  visible: boolean;
  onClose: () => void;
  currentServer: number | null;
  setCurrentServer: (server: number) => void;
}

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
      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: isSolid ? 'rgba(0, 0, 0, 0.5)' : 'transparent',
        }}
        activeOpacity={1}
        onPress={onClose}>
        <View style={{flex: 1, justifyContent: 'flex-end'}}>
          <View
            style={{
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
                <Ionicons name="server" size={20} color={colors.text.muted} />
                <Text
                  style={{
                    color: colors.text.primary,
                    ...typography.h3,
                  }}>
                  Select Server
                </Text>
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
                minHeight: 200,
                maxHeight: 250,
                overflow: 'hidden',
                borderRadius: borderRadius.xl,
                borderWidth: isSolid ? 0 : 1,
                borderColor: isSolid ? colors.modal.blur : colors.modal.content,
              }}>
              <MaybeBlurView body>
                <View style={styles.modalBody}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{
                      gap: spacing.md,
                      paddingHorizontal: isTablet ? spacing.lg : spacing.md,
                    }}
                    style={{paddingTop: spacing.sm, paddingBottom: spacing.lg}}>
                    {CINEMA_SERVERS.map(server => (
                      <TouchableOpacity
                        key={server.id}
                        style={[
                          styles.serverItem,
                          currentServer === server.id && styles.selectedServer,
                        ]}
                        onPress={() => {
                          setCurrentServer(server.id);
                          onClose();
                        }}>
                        <View style={styles.serverIconWrapper}>
                          <Ionicons
                            name="server-outline"
                            size={36}
                            color={
                              currentServer === server.id
                                ? colors.text.primary
                                : colors.text.secondary
                            }
                          />
                        </View>
                        <Text
                          style={[
                            styles.serverName,
                            currentServer === server.id &&
                              styles.selectedServerText,
                          ]}>
                          {server.title}
                        </Text>
                        {currentServer === server.id && (
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
        </View>
      </TouchableOpacity>
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
