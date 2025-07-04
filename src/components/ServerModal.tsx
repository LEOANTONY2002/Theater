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

interface ServerModalProps {
  visible: boolean;
  onClose: () => void;
  currentServer: number | null;
  setCurrentServer: (server: number) => void;
}

const SERVERS = [1, 2];

export const ServerModal: React.FC<ServerModalProps> = ({
  visible,
  onClose,
  currentServer,
  setCurrentServer,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent={true}
      transparent={true}
      onRequestClose={onClose}>
      <View style={[modalStyles.modalContainer, {justifyContent: 'flex-end'}]}>
        <View
          style={[
            modalStyles.modalContent,
            styles.halfScreenContent,
            {overflow: 'hidden'},
          ]}>
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="dark"
            blurAmount={20}
            overlayColor={`rgba(16, 14, 35, 0.3)`}
            reducedTransparencyFallbackColor={colors.modal.blur}
          />
          <View style={modalStyles.modalHeader}>
            <Text style={modalStyles.modalTitle}>Select Server</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
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
    backgroundColor: colors.modal.background,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.modal.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  selectedServer: {
    backgroundColor: colors.modal.active,
    borderColor: colors.modal.border,
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
