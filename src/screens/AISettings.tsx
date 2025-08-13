import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Keyboard,
  Alert,
  ActivityIndicator,
  Clipboard,
  Modal,
  Linking,
} from 'react-native';
import {Link, useNavigation} from '@react-navigation/native';
import {colors, spacing, borderRadius, typography} from '../styles/theme';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import {BlurView} from '@react-native-community/blur';
import {AISettingsManager} from '../store/aiSettings';
import {GradientSpinner} from '../components/GradientSpinner';
import {FlashList} from '@shopify/flash-list';
import {useQueryClient} from '@tanstack/react-query';
import Ionicons from 'react-native-vector-icons/Ionicons';

const DEFAULT_MODEL = 'gemini-1.5-flash-latest';
const DEFAULT_API_KEY = 'AIzaSyA_up-9FqMhzaUxhSj3wEry5qOELtTva_8';

interface GeminiModel {
  id: string;
  name: string;
  description: string;
  displayName?: string;
  supportedGenerationMethods?: string[];
}

// Fallback models in case API fetch fails
const FALLBACK_MODELS: GeminiModel[] = [
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Latest and fastest model with improved performance',
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    description: 'Fast and efficient for most tasks',
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    description: 'More capable model for complex reasoning',
  },
  {
    id: 'gemini-1.0-pro',
    name: 'Gemini 1.0 Pro',
    description: 'Stable and reliable model',
  },
];

// Function to fetch available Gemini models from the API
const fetchGeminiModels = async (apiKey: string): Promise<GeminiModel[]> => {
  try {
    if (!apiKey || apiKey.trim() === '') {
      console.log('No API key provided, using fallback models');
      return FALLBACK_MODELS;
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      console.error('Failed to fetch models:', response.statusText);
      return FALLBACK_MODELS;
    }

    const data = await response.json();

    if (!data.models || !Array.isArray(data.models)) {
      console.error('Invalid response format from models API');
      return FALLBACK_MODELS;
    }

    // Filter and format models for text generation
    const geminiModels = data.models
      .filter(
        (model: any) =>
          model.name &&
          model.name.includes('gemini') &&
          model.supportedGenerationMethods &&
          model.supportedGenerationMethods.includes('generateContent'),
      )
      .map((model: any) => ({
        id: model.name.replace('models/', ''),
        name: model.displayName || model.name.replace('models/', ''),
        description: model.description || 'Gemini AI model for text generation',
        displayName: model.displayName,
        supportedGenerationMethods: model.supportedGenerationMethods,
      }))
      .sort((a: GeminiModel, b: GeminiModel) => {
        // Sort by version (newer first)
        if (a.id.includes('2.5')) return -1;
        if (b.id.includes('2.5')) return 1;
        if (a.id.includes('1.5')) return -1;
        if (b.id.includes('1.5')) return 1;
        return 0;
      });

    console.log('Fetched Gemini models:', geminiModels);
    return geminiModels.length > 0 ? geminiModels : FALLBACK_MODELS;
  } catch (error) {
    console.error('Error fetching Gemini models:', error);
    return FALLBACK_MODELS;
  }
};

const AISettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);
  const [apiKey, setApiKey] = useState('');
  const [availableModels, setAvailableModels] =
    useState<GeminiModel[]>(FALLBACK_MODELS);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [isApiKeyCopied, setIsApiKeyCopied] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [initialSettings, setInitialSettings] = useState<{
    apiKey: string;
    model: string;
  } | null>(null);
  // In-screen modal state for replacing Alert.alert
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const queryClient = useQueryClient();

  const showAlert = (title: string, message: string) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalVisible(true);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await AISettingsManager.getSettings();
      if (settings) {
        setApiKey(settings.apiKey || '');
        setSelectedModel(settings.model || DEFAULT_MODEL);
        setInitialSettings({
          apiKey: settings.apiKey || '',
          model: settings.model || DEFAULT_MODEL,
        });

        // Load available models if we have an API key
        if (settings.apiKey) {
          loadAvailableModels(settings.apiKey);
        }
      } else {
        setInitialSettings({
          apiKey: '',
          model: DEFAULT_MODEL,
        });
      }
    } catch (error) {
      console.error('Error loading AI settings:', error);
      setInitialSettings({
        apiKey: '',
        model: DEFAULT_MODEL,
      });
    }
  };

  const loadAvailableModels = async (currentApiKey: string) => {
    setIsLoadingModels(true);
    try {
      const models = await fetchGeminiModels(currentApiKey);
      setAvailableModels(models);
    } catch (error) {
      console.error('Error loading available models:', error);
      setAvailableModels(FALLBACK_MODELS);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const hasChanges = () => {
    if (!initialSettings) return false;
    return (
      apiKey !== initialSettings.apiKey ||
      selectedModel !== initialSettings.model
    );
  };

  const validateApiKey = async (key: string): Promise<boolean> => {
    try {
      // Make a test call to the Gemini API to validate the key
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': key,
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: 'Test connection',
                  },
                ],
              },
            ],
          }),
        },
      );

      console.log('response', response);

      // If we get a 200, the key is valid
      // If we get a 400 with specific error, the key is invalid
      // Any other error is treated as a network/connection issue
      if (response.status === 200) return true;
      if (response.status === 400) return false;

      const errorData = await response.json();
      console.error('API key validation error:', errorData);
      return false;
    } catch (error) {
      console.error('API key validation error:', error);
      return false;
    }
  };

  const saveSettings = async () => {
    if (!hasChanges()) return;

    const trimmedApiKey = apiKey.trim();
    console.log('trimmedApiKey', trimmedApiKey);
    console.log('initialSettings', initialSettings);
    if (trimmedApiKey && trimmedApiKey !== initialSettings?.apiKey) {
      setIsValidating(true);
      try {
        const isValid = await validateApiKey(trimmedApiKey);
        if (!isValid) {
          showAlert(
            'Invalid API Key',
            'The provided API key is invalid. Please check and try again.',
          );
          setIsValidating(false);
          return;
        }
      } catch (error) {
        console.error('Error validating API key:', error);
        showAlert(
          'Error',
          'Failed to validate API key. Please check your connection and try again.',
        );
        setIsValidating(false);
        return;
      }
    }

    try {
      await AISettingsManager.saveSettings({
        model: selectedModel,
        apiKey: trimmedApiKey,
      });

      queryClient.invalidateQueries({queryKey: ['aiSettings']});

      // Update initial settings to reflect the saved state
      setInitialSettings({
        apiKey: trimmedApiKey,
        model: selectedModel,
      });

      setShowApiKeyInput(false);
      Keyboard.dismiss();
      showAlert('Success', 'AI settings saved successfully!');
    } catch (error) {
      console.error('Error saving AI settings:', error);
      showAlert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const content = await Clipboard.getString();
      if (content && content !== DEFAULT_API_KEY) {
        setApiKey(content);
        setIsApiKeyCopied(true);
        setTimeout(() => setIsApiKeyCopied(false), 2000);
      }
    } catch (error) {
      console.error('Error pasting from clipboard:', error);
    }
  };

  const toggleApiKeyInput = () => {
    setShowApiKeyInput(!showApiKeyInput);
    if (showApiKeyInput) {
      Keyboard.dismiss();
    }
  };

  if (!initialSettings) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <GradientSpinner
            colors={[colors.primary, colors.secondary]}
            size={24}
            thickness={2}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* App-wide message modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.14)',
          }}>
          <View style={styles.modalOverlay}>
            <BlurView
              blurAmount={10}
              blurRadius={5}
              blurType="light"
              overlayColor={colors.modal.blur}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: 50,
              }}
            />
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{modalTitle}</Text>
              <Text style={styles.modalMessage}>{modalMessage}</Text>
              <TouchableOpacity
                style={styles.modalButtonGradient}
                activeOpacity={0.8}
                onPress={() => setModalVisible(false)}>
                <Text style={styles.modalButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.goBack()}>
            <Ionicons
              name="chevron-back-outline"
              size={24}
              color={colors.text.primary}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI Settings</Text>
          <View />
        </View>
        {/* API Key Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>API Key</Text>
          <Text style={styles.sectionDescription}>
            {apiKey
              ? 'Your API key is saved securely'
              : 'Add your Google Gemini API key to enable AI features'}
          </Text>

          {showApiKeyInput ? (
            <View>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, {paddingRight: 40}]}
                  value={apiKey === DEFAULT_API_KEY ? '' : apiKey}
                  onChangeText={setApiKey}
                  placeholder="Enter your Gemini API key..."
                  placeholderTextColor={colors.text.tertiary}
                  secureTextEntry={apiKey === DEFAULT_API_KEY}
                  multiline={false}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus={true}
                />
                <TouchableOpacity
                  style={styles.clipboardButton}
                  onPress={handlePasteFromClipboard}
                  activeOpacity={0.7}>
                  <Icon
                    name={isApiKeyCopied ? 'checkmark' : 'clipboard-outline'}
                    size={20}
                    color={
                      isApiKeyCopied ? colors.primary : colors.text.secondary
                    }
                  />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() =>
                  Linking.openURL('https://aistudio.google.com/app/apikey')
                }
                activeOpacity={0.8}>
                <Text style={styles.inputHint}>
                  Get your API key from Google AI Studio
                </Text>
                <Text
                  style={{
                    color: colors.text.tertiary,
                    fontStyle: 'italic',
                    textDecorationLine: 'underline',
                    textDecorationColor: colors.text.primary,
                    textDecorationStyle: 'solid',
                  }}>
                  https://aistudio.google.com/app/apikey
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.apiKeyButton}
              onPress={toggleApiKeyInput}
              activeOpacity={0.8}>
              <Icon
                name={apiKey ? 'key-outline' : 'add-circle-outline'}
                size={20}
                color={colors.text.primary}
                style={styles.apiKeyButtonIcon}
              />
              <Text style={styles.apiKeyButtonText}>
                {apiKey !== DEFAULT_API_KEY ? 'Edit API Key' : 'Add API Key'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {/* Model Selection Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Text style={[styles.sectionTitle, {marginBottom: -spacing.sm}]}>
                Gemini Model
              </Text>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={() => loadAvailableModels(apiKey)}
                disabled={isLoadingModels}>
                <Icon
                  name="refresh"
                  size={16}
                  color={
                    isLoadingModels
                      ? colors.text.tertiary
                      : colors.text.secondary
                  }
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.sectionDescription}>
              Choose the AI model for chat and recommendations
              {isLoadingModels && ' (Loading latest models...)'}
            </Text>
          </View>

          {isLoadingModels ? (
            <View style={styles.modelsLoadingContainer}>
              <GradientSpinner
                size={24}
                thickness={2}
                colors={[colors.primary, colors.secondary]}
              />
              <Text style={styles.modelsLoadingText}>
                Fetching available models...
              </Text>
            </View>
          ) : (
            <View style={{height: 400, position: 'relative'}}>
              <LinearGradient
                pointerEvents="none"
                colors={[colors.background.primary, 'transparent']}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 80,
                  zIndex: 1,
                }}
              />
              <FlashList
                keyExtractor={item => item.id}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
                contentContainerStyle={{
                  paddingVertical: spacing.md,
                }}
                data={availableModels}
                renderItem={({item}) => (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    key={item.id}
                    style={[
                      styles.modelOption,
                      selectedModel === item.id && styles.selectedModelOption,
                    ]}
                    onPress={() => {
                      setSelectedModel(item.id);
                    }}>
                    <View style={styles.modelInfo}>
                      <Text style={styles.modelName}>{item.name}</Text>
                      <Text style={styles.modelDescription}>
                        {item.description}
                      </Text>
                    </View>
                    <View style={styles.radioButton}>
                      {selectedModel === item.id && (
                        <View style={styles.radioButtonSelected} />
                      )}
                    </View>
                  </TouchableOpacity>
                )}
                extraData={selectedModel}
              />
              <LinearGradient
                pointerEvents="none"
                colors={['transparent', colors.background.primary]}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 80,
                  zIndex: 1,
                }}
              />
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[
              styles.saveButton,
              !hasChanges() || isValidating ? {opacity: 0.3} : null,
            ]}
            onPress={saveSettings}
            disabled={!hasChanges() || isValidating}
            activeOpacity={0.8}>
            <LinearGradient
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              colors={[colors.primary, colors.secondary]}
              style={styles.saveButtonGradient}>
              {isValidating ? (
                <GradientSpinner
                  colors={[colors.text.primary, colors.modal.blur]}
                  size={24}
                  thickness={2}
                />
              ) : (
                <Text style={styles.saveButtonText}>Save Settings</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
          <View style={{height: 100}} />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingVertical: spacing.lg,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text.primary,
    marginLeft: -spacing.md,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body1,
    color: colors.text.secondary,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
    flex: 1,
  },
  refreshButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.modal.content,
    marginLeft: spacing.sm,
  },
  sectionDescription: {
    ...typography.body2,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  modelsLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    backgroundColor: colors.modal.content,
    borderRadius: borderRadius.md,
  },
  modelsLoadingText: {
    ...typography.body2,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
  },
  modelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.modal.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.modal.border,
    marginBottom: spacing.sm,
  },
  selectedModelOption: {
    borderColor: colors.modal.activeBorder,
    backgroundColor: colors.modal.content,
  },
  modelInfo: {
    flex: 1,
  },
  modelName: {
    ...typography.body1,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  modelDescription: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.modal.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.modal.activeBorder,
  },
  inputContainer: {
    marginBottom: spacing.sm,
    position: 'relative',
  },
  input: {
    ...typography.body1,
    backgroundColor: colors.modal.content,
    borderWidth: 1,
    borderColor: colors.modal.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text.primary,
    paddingRight: 40, // Space for clipboard button
  },
  clipboardButton: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: [{translateY: -10}],
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  apiKeyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.modal.content,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.modal.border,
  },
  apiKeyButtonIcon: {
    marginRight: spacing.sm,
  },
  apiKeyButtonText: {
    ...typography.button,
    color: colors.text.primary,
  },
  inputHint: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  actionButtons: {
    marginBottom: spacing.xxl,
  },
  saveButton: {
    borderRadius: borderRadius.round,
    overflow: 'hidden',
    marginBottom: spacing.md,
    position: 'relative',
    height: 60,
    backgroundColor: colors.primary,
  },
  saveButtonGradient: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    ...typography.button,
    color: colors.text.primary,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginHorizontal: spacing.md,
  },
  modalCard: {
    width: '100%',
    borderRadius: borderRadius.lg,
    backgroundColor: colors.modal.content,
    borderWidth: 1,
    borderColor: colors.modal.border,
    padding: spacing.lg,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  modalMessage: {
    ...typography.body1,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  modalButton: {
    borderRadius: borderRadius.round,
    overflow: 'hidden',
    alignSelf: 'flex-end',
  },
  modalButtonGradient: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.round,
    backgroundColor: colors.text.primary,
    width: 80,
    alignSelf: 'flex-end',
  },
  modalButtonText: {
    ...typography.button,
    fontWeight: '600',
  },
  resetButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  resetButtonText: {
    ...typography.body1,
    color: colors.text.tertiary,
    textDecorationLine: 'underline',
  },
});

export default AISettingsScreen;
