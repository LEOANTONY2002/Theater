import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Clipboard,
  Linking,
} from 'react-native';
import {colors, spacing, borderRadius} from '../styles/theme';
import Icon from 'react-native-vector-icons/Ionicons';
import {FlashList} from '@shopify/flash-list';

interface GeminiModel {
  id: string;
  name: string;
  description: string;
  displayName?: string;
  supportedGenerationMethods?: string[];
}

interface AISettingsFormProps {
  apiKey: string;
  selectedModel: string;
  onApiKeyChange: (key: string) => void;
  onModelSelect: (model: string) => void;
  showModelInfo: boolean;
  onToggleModelInfo: () => void;
  isOnboarding?: boolean;
  availableModels?: GeminiModel[];
  isLoadingModels?: boolean;
  onRefreshModels?: () => void;
}

export const AISettingsForm: React.FC<AISettingsFormProps> = ({
  apiKey,
  selectedModel,
  onApiKeyChange,
  onModelSelect,
  showModelInfo,
  onToggleModelInfo,
  isOnboarding = false,
  availableModels = [],
  isLoadingModels = false,
  onRefreshModels,
}) => {
  const [isApiKeyVisible, setIsApiKeyVisible] = useState(false);
  const [isApiKeyCopied, setIsApiKeyCopied] = useState(false);

  const handleCopyApiKey = async () => {
    if (!apiKey) return;
    await Clipboard.setString(apiKey);
    setIsApiKeyCopied(true);
    setTimeout(() => setIsApiKeyCopied(false), 2000);
  };

  const renderModelItem = ({item}: {item: GeminiModel}) => (
    <TouchableOpacity
      style={[
        styles.modelItem,
        selectedModel === item.id && styles.selectedModelItem,
      ]}
      onPress={() => onModelSelect(item.id)}>
      <View style={styles.modelRadio}>
        {selectedModel === item.id && (
          <View style={styles.modelRadioSelected} />
        )}
      </View>
      <View style={styles.modelInfo}>
        <Text style={styles.modelName}>{item.name}</Text>
        <Text style={styles.modelDescription}>{item.description}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>API Key</Text>
        <View style={styles.apiKeyContainer}>
          <View style={styles.apiKeyInputContainer}>
            <TextInput
              style={styles.apiKeyInput}
              value={apiKey}
              onChangeText={onApiKeyChange}
              placeholder="Enter your Gemini API key"
              placeholderTextColor={colors.text.secondary}
              secureTextEntry={!isApiKeyVisible}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isOnboarding}
            />
            <TouchableOpacity
              style={styles.visibilityButton}
              onPress={() => setIsApiKeyVisible(!isApiKeyVisible)}>
              <Icon
                name={isApiKeyVisible ? 'eye-off' : 'eye'}
                size={20}
                color={colors.text.secondary}
              />
            </TouchableOpacity>
          </View>
          {apiKey && (
            <TouchableOpacity
              style={styles.copyButton}
              onPress={handleCopyApiKey}
              disabled={isApiKeyCopied}>
              <Icon
                name={isApiKeyCopied ? 'checkmark' : 'copy'}
                size={20}
                color={isApiKeyCopied ? colors.primary : colors.text.secondary}
              />
            </TouchableOpacity>
          )}
        </View>
        {!isOnboarding && (
          <Text style={styles.helpText}>
            Get your API key from{' '}
            <Text
              style={styles.link}
              onPress={() =>
                Linking.openURL('https://aistudio.google.com/app/apikey')
              }>
              Google AI Studio
            </Text>
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>AI Model</Text>
          <TouchableOpacity onPress={onToggleModelInfo}>
            <Icon
              name={
                showModelInfo
                  ? 'information-circle'
                  : 'information-circle-outline'
              }
              size={24}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>

        {showModelInfo && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Choose the AI model that best fits your needs. More powerful
              models may be slower but provide better results.
            </Text>
          </View>
        )}

        {isLoadingModels ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Loading available models...</Text>
          </View>
        ) : (
          <FlashList
            data={availableModels}
            renderItem={renderModelItem}
            keyExtractor={item => item.id}
            estimatedItemSize={80}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No models available</Text>
            }
          />
        )}

        {!isOnboarding && onRefreshModels && (
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={onRefreshModels}
            disabled={isLoadingModels}>
            <Icon
              name="refresh"
              size={20}
              color={colors.primary}
              style={isLoadingModels ? styles.refreshing : undefined}
            />
            <Text style={styles.refreshText}>
              {isLoadingModels ? 'Refreshing...' : 'Refresh Models'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  apiKeyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  apiKeyInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 50,
  },
  apiKeyInput: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 16,
    paddingRight: spacing.sm,
  },
  visibilityButton: {
    padding: spacing.sm,
  },
  copyButton: {
    marginLeft: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    width: 50,
  },
  helpText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  link: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  infoBox: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoText: {
    color: colors.text.primary,
    fontSize: 14,
    lineHeight: 20,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: spacing.sm,
    color: colors.text.secondary,
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.text.secondary,
    padding: spacing.lg,
  },
  modelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  selectedModelItem: {
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: 'rgba(138, 99, 255, 0.1)',
  },
  modelRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primary,
    marginRight: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modelRadioSelected: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  modelInfo: {
    flex: 1,
  },
  modelName: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  modelDescription: {
    color: colors.text.secondary,
    fontSize: 14,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  refreshText: {
    color: colors.primary,
    marginLeft: spacing.sm,
    fontWeight: '500',
    fontSize: 14,
  },
  refreshing: {
    transform: [{rotate: '360deg'}],
  },
});
