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
import {BlurPreference} from '../store/blurPreference';
import {AISettingsManager} from '../store/aiSettings';
import {GradientSpinner} from '../components/GradientSpinner';
import {useQueryClient} from '@tanstack/react-query';
import {useResponsive} from '../hooks/useResponsive';
import {checkInternet} from '../services/connectivity';
import {NoInternet} from './NoInternet';

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
      return FALLBACK_MODELS;
    }

    const data = await response.json();

    if (!data.models || !Array.isArray(data.models)) {
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

    return geminiModels.length > 0 ? geminiModels : FALLBACK_MODELS;
  } catch (error) {
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
  // Network connectivity state
  const [showNoInternet, setShowNoInternet] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const queryClient = useQueryClient();
  const {isTablet} = useResponsive();
  const width = useWindowDimensions().width;
  const themeMode = BlurPreference.getMode();
  const isSolid = themeMode === 'normal';

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

  const handleRetryConnection = async () => {
    setIsCheckingConnection(true);
    try {
      const isOnline = await checkInternet();
      if (isOnline) {
        setShowNoInternet(false);
      }
    } catch (error) {
    } finally {
      setIsCheckingConnection(false);
    }
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
      setAvailableModels(FALLBACK_MODELS);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const validateApiKey = async (key: string): Promise<boolean> => {
    try {
      // First check internet connectivity
      const isOnline = await checkInternet();
      if (!isOnline) {
        setShowNoInternet(true);
        return false;
      }

      // Make a test call to the Gemini API to validate the key
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
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

      if (response.status === 200) return true;
      if (response.status === 400) return false;
      if (response.status === 503) {
        // Make a test call to the Gemini API to validate the key
        const retryResponse = await fetch(
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

        if (retryResponse.status === 200) return true;
        if (retryResponse.status === 400) return false;
      }

      const errorData = await response.json();
      return false;
    } catch (error) {
      // Check if it's a network error
      const isOnline = await checkInternet();
      if (!isOnline) {
        setShowNoInternet(true);
      }
      return false;
    }
  };

  const saveSettings = async () => {
    const trimmedApiKey = apiKey.trim();
    if (trimmedApiKey && trimmedApiKey !== initialSettings?.apiKey) {
      setIsValidating(true);
      try {
        const isValid = await validateApiKey(trimmedApiKey);
        if (!isValid) {
          showAlert(
            'Server Not Reachable',
            'Please check your API key or try again.',
          );
          setIsValidating(false);
          return;
        }
      } catch (error) {
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
    } catch (error) {}
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
          <GradientSpinner color={colors.primary} size={24} />
        </View>
      </View>
    );
  }

  // Show NoInternet screen if no connectivity
  if (showNoInternet) {
    return (
      <NoInternet
        onRetry={handleRetryConnection}
        isRetrying={isCheckingConnection}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* App-wide message modal */}
      <Modal
        visible={modalVisible}
        backdropColor={isSolid ? 'rgba(0, 0, 0, 0.8)' : colors.modal.blurDark}
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setModalVisible(false)}>
        <BlurView
          blurType="dark"
          blurAmount={10}
          overlayColor="rgba(0, 0, 0, 0.5)"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <View
            style={{
              width: isTablet ? '40%' : '85%',
              borderRadius: borderRadius.xl,
              overflow: 'hidden',
            }}>
            <View
              style={{
                padding: spacing.xl,
                backgroundColor: colors.modal.blur,
                borderRadius: borderRadius.xl,
                borderTopWidth: 1,
                borderLeftWidth: 1,
                borderRightWidth: 1,
                borderColor: colors.modal.content,
              }}>
              <Text
                style={{
                  ...typography.h2,
                  color: colors.text.primary,
                  marginBottom: spacing.sm,
                  textAlign: 'center',
                }}>
                {modalTitle}
              </Text>
              <Text
                style={{
                  ...typography.body2,
                  color: colors.text.secondary,
                  textAlign: 'center',
                  marginBottom: spacing.xl,
                }}>
                {modalMessage}
              </Text>
              <TouchableOpacity
                style={{
                  padding: spacing.md,
                  borderRadius: borderRadius.round,
                  alignItems: 'center',
                  backgroundColor: colors.modal.content,
                  borderTopWidth: 1,
                  borderLeftWidth: 1,
                  borderRightWidth: 1,
                  borderColor: colors.modal.border,
                }}
                activeOpacity={0.8}
                onPress={() => setModalVisible(false)}>
                <Text
                  style={{
                    color: colors.text.primary,
                    ...typography.button,
                  }}>
                  OK
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Skip confirmation modal */}
      <Modal
        visible={skipConfirmVisible}
        backdropColor={isSolid ? 'rgba(0, 0, 0, 0.8)' : colors.modal.blurDark}
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setSkipConfirmVisible(false)}>
        {!isSolid && (
          <BlurView
            blurType="dark"
            blurAmount={10}
            overlayColor="rgba(0, 0, 0, 0.5)"
            style={{
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
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <View
            style={{
              width: isTablet ? '40%' : '85%',
              borderRadius: borderRadius.xl,
              overflow: 'hidden',
            }}>
            <View
              style={{
                padding: spacing.xl,
                backgroundColor: colors.modal.blur,
                borderRadius: borderRadius.xl,
                borderTopWidth: 1,
                borderLeftWidth: 1,
                borderRightWidth: 1,
                borderColor: colors.modal.content,
              }}>
              <Text
                style={{
                  ...typography.h2,
                  color: colors.text.primary,
                  marginBottom: spacing.sm,
                  textAlign: 'center',
                }}>
                AI Features Disabled
              </Text>
              <Text
                style={{
                  ...typography.body2,
                  color: colors.text.secondary,
                  textAlign: 'left',
                  marginBottom: spacing.xl,
                }}>
                No AI features can be used if API key is not set. You'll miss
                out on:
                {'\n'}
                {'\n'}• Cinema chat assistant
                {'\n'}• Movie/Series level chat assistant
                {'\n'}• Simiar Movie/Series recommendations
                {'\n'}• AI-powered movie recommendations
                {'\n'}• My Next Watch - Personalized content discovery
                {'\n'}• Trivia & Facts
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  gap: spacing.md,
                  width: '100%',
                }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    padding: spacing.md,
                    borderRadius: borderRadius.round,
                    alignItems: 'center',
                    backgroundColor: colors.modal.content,
                  }}
                  activeOpacity={0.9}
                  onPress={handleSkipAnyway}>
                  <Text
                    style={{
                      color: colors.text.primary,
                      ...typography.button,
                    }}>
                    Skip Anyway
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={handleSetApiKey}
                  style={{flex: 1}}>
                  <LinearGradient
                    colors={[colors.primary, colors.secondary]}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    style={{
                      padding: spacing.md,
                      borderRadius: borderRadius.round,
                      alignItems: 'center',
                    }}>
                    <Text
                      style={{
                        color: colors.text.primary,
                        ...typography.button,
                      }}>
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

      <View
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
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

          <TouchableOpacity
            onPress={() =>
              Linking.openURL('https://aistudio.google.com/app/apikey')
            }
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'flex-start',
              marginTop: spacing.sm,
            }}
            activeOpacity={1}>
            <Text
              style={{
                color: colors.background.primary,
                paddingHorizontal: spacing.md,
                paddingVertical: 12,
                fontWeight: 'bold',
                borderRadius: borderRadius.md,
                borderWidth: 1,
                borderColor: colors.modal.blur,
                backgroundColor: colors.text.primary,
                fontFamily: 'Inter_18pt-Regular',
                fontSize: 12,
              }}>
              Get your API key
            </Text>
          </TouchableOpacity>

          {/* Instructions to get Gemini API key */}
          <View
            style={{
              marginVertical: spacing.md,
            }}>
            <Text
              style={[
                styles.sectionDescription,
                {
                  marginBottom: spacing.sm,
                  fontWeight: 'bold',
                  fontSize: 16,
                  color: colors.text.primary,
                },
              ]}>
              How to get your API key:
            </Text>
            <Text style={styles.sectionDescription}>
              1. Go to Google AI Studio
            </Text>
            <Text style={styles.sectionDescription}>
              2. Click on "Create API key"
            </Text>
            <Text style={styles.sectionDescription}>
              3. Type a name for your API key
            </Text>
            <Text style={styles.sectionDescription}>
              4. Select a project if you have one or create a new one
            </Text>
            <Text style={styles.sectionDescription}>5. Copy the API key</Text>
            <Text style={styles.sectionDescription}>
              6. Paste the API key above
            </Text>
          </View>
        </View>
      </View>
      <View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          marginVertical: spacing.md,
          marginBottom: spacing.xxl,
          zIndex: 2,
        }}>
        <Text
          style={{
            color: colors.text.muted,
            textAlign: 'center',
            marginBottom: spacing.md,
            fontSize: 10,
            marginHorizontal: spacing.md,
            fontFamily: 'Inter_18pt-Regular',
          }}>
          By using your own key, you agree to Google's Generative AI terms of
          service.
        </Text>
        {isValidating ? (
          <GradientSpinner color={colors.primary} size={24} />
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
              <Text
                style={{
                  color: colors.text.muted,
                  fontFamily: 'Inter_18pt-Regular',
                }}>
                Skip
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.9}
              disabled={isValidating || apiKey === ''}
              onPress={saveSettings}>
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={{
                  borderRadius: borderRadius.md,
                  padding: spacing.md,
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 150,
                  opacity: isValidating || apiKey === '' ? 0.5 : 1,
                }}>
                <Text
                  style={{
                    color: colors.text.primary,
                    fontWeight: 'bold',
                    fontFamily: 'Inter_18pt-Regular',
                  }}>
                  Next
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
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    color: colors.text.muted,
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
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    ...typography.body1,
    backgroundColor: colors.modal.content,
    borderWidth: 1,
    borderColor: colors.modal.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text.primary,
    flex: 1,
  },
  clipboardButton: {
    position: 'absolute',
    right: 10,
    top: 22,
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
