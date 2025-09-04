import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Keyboard,
  Clipboard,
  Modal,
  Linking,
  useWindowDimensions,
} from 'react-native';
import {colors, spacing, borderRadius, typography} from '../styles/theme';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import {BlurView} from '@react-native-community/blur';
import {AISettingsManager} from '../store/aiSettings';
import {GradientSpinner} from '../components/GradientSpinner';
import {useQueryClient} from '@tanstack/react-query';
import {useResponsive} from '../hooks/useResponsive';

const DEFAULT_MODEL = 'gemini-1.5-flash-latest';

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

const OnboardingAISettings: React.FC<{
  onDone: () => void;
  onSkip: () => void;
}> = ({onDone, onSkip}) => {
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);
  const [apiKey, setApiKey] = useState('');
  const [availableModels, setAvailableModels] =
    useState<GeminiModel[]>(FALLBACK_MODELS);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(true);
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
  // Skip confirmation modal state
  const [skipConfirmVisible, setSkipConfirmVisible] = useState(false);
  const queryClient = useQueryClient();
  const {isTablet} = useResponsive();
  const width = useWindowDimensions().width;

  const showAlert = (title: string, message: string) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalVisible(true);
  };

  const handleSkipPress = () => {
    setSkipConfirmVisible(true);
  };

  const handleSkipAnyway = () => {
    setSkipConfirmVisible(false);
    onSkip();
  };

  const handleSetApiKey = () => {
    setSkipConfirmVisible(false);
    setShowApiKeyInput(true);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await AISettingsManager.getSettings();
      console.log('settings', settings);

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

  console.log('initialSettings', initialSettings);

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
    console.log('saveSettings');
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
      onDone();
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
      if (content) {
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

      {/* Skip confirmation modal */}
      <Modal
        visible={skipConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSkipConfirmVisible(false)}>
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
              <View style={styles.skipModalHeader}>
                {/* <Icon
                  name="warning-outline"
                  size={24}
                  color={colors.secondary}
                  style={styles.skipModalIcon}
                /> */}
                <Text style={styles.modalTitle}>AI Features Disabled</Text>
              </View>
              <Text style={styles.modalMessage}>
                No AI features can be used if API key is not set. You'll miss
                out on:
                {'\n'}• Cinema chat assistant
                {'\n'}• Movie/Show level chat assistant
                {'\n'}• AI-powered movie recommendations
                {'\n'}• My Next Watch - Personalized content discovery
                {'\n'}• Trivia & Facts
              </Text>
              <View style={styles.skipModalButtons}>
                <TouchableOpacity
                  style={styles.skipModalSecondaryButton}
                  activeOpacity={0.9}
                  onPress={handleSkipAnyway}>
                  <Text style={styles.skipModalSecondaryButtonText}>
                    Skip Anyway
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={{flex: 1}}
                  onPress={handleSetApiKey}>
                  <LinearGradient
                    colors={[colors.primary, colors.secondary]}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    style={{
                      paddingVertical: spacing.md,
                      paddingHorizontal: spacing.lg,
                      borderRadius: borderRadius.md,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Text style={styles.skipModalPrimaryButtonText}>
                      Set API Key
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Assistant Setup</Text>
        <View />
      </View>

      {/* API Key Section */}
      <View
        style={[
          styles.section,
          {
            width: isTablet ? '50%' : '100%',
            alignSelf: 'center',
            marginTop: spacing.xxl,
          },
        ]}>
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
                value={apiKey}
                onChangeText={setApiKey}
                placeholder="Enter your Gemini API key..."
                placeholderTextColor={colors.text.tertiary}
                multiline={false}
                autoCapitalize="none"
                autoCorrect={false}
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
              {/* <Text style={styles.inputHint}>
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
                </Text> */}
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
              {apiKey ? 'Edit API Key' : 'Add API Key'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Instructions to get Gemini API key */}
      <View
        style={{
          marginBottom: spacing.md,
          display: 'flex',
          flexDirection: 'column',
          // alignItems: 'center',
          justifyContent: 'center',
          width: isTablet ? '50%' : '100%',
          alignSelf: 'center',
        }}>
        <TouchableOpacity
          onPress={() =>
            Linking.openURL('https://aistudio.google.com/app/apikey')
          }
          style={{marginBottom: spacing.md}}
          activeOpacity={0.8}>
          <Text
            style={{
              color: colors.background.primary,
              fontWeight: 'bold',
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.md,
              borderRadius: borderRadius.md,
              borderWidth: 1,
              borderColor: colors.modal.blur,
              backgroundColor: colors.text.primary,
              textAlign: 'center',
            }}>
            Get your API key
          </Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.sectionDescription}>
            1. Go to Google AI Studio
          </Text>
        </View>
        <Text style={styles.sectionDescription}>
          2. Click on "Create API key"
        </Text>
        <Text style={styles.sectionDescription}>3. Copy the API key</Text>
        <Text style={styles.sectionDescription}>
          4. Paste the API key above
        </Text>
      </View>

      <View
        style={{
          position: 'absolute',
          bottom: 20,
          left: 0,
          right: 0,
          zIndex: 2,
          flex: 1,
          justifyContent: 'flex-end',
          alignItems: 'center',
        }}>
        {isValidating ? (
          <GradientSpinner
            size={30}
            thickness={2}
            colors={[
              colors.primary,
              colors.secondary,
              'transparent',
              colors.transparentDim,
            ]}
            style={{alignSelf: 'center', marginVertical: 30}}
          />
        ) : (
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.md,
              alignSelf: 'center',
            }}>
            <TouchableOpacity activeOpacity={0.9} onPress={handleSkipPress}>
              <Text style={{color: colors.text.muted}}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.9} onPress={saveSettings}>
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={{
                  borderRadius: borderRadius.md,
                  padding: spacing.md,
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: isTablet ? 200 : width * 0.5,
                }}>
                <Text style={{color: colors.text.primary, fontWeight: 'bold'}}>
                  Enter Theater
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    paddingHorizontal: spacing.lg,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  headerTitle: {
    ...typography.h2,
    fontWeight: 'bold',
    color: colors.text.primary,
    textAlign: 'center',
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
    marginVertical: spacing.lg,
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
    marginVertical: spacing.sm,
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
    marginTop: spacing.md,
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
  // Skip confirmation modal styles
  skipModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  skipModalIcon: {
    marginRight: spacing.sm,
  },
  skipModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  skipModalSecondaryButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipModalSecondaryButtonText: {
    ...typography.button,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  skipModalPrimaryButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipModalPrimaryButtonText: {
    ...typography.button,
    fontWeight: '600',
    color: colors.text.primary,
  },
});

export default OnboardingAISettings;
