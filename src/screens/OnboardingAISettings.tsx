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
  ScrollView,
  FlatList,
  Image,
  Animated,
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
import {AI_CONFIG} from '../config/aiConfig';

const DEFAULT_MODEL = AI_CONFIG.DEFAULT_MODEL;

interface GroqModel {
  id: string;
  name: string;
  description: string;
  created?: number;
  displayName?: string;
}

const instructions = [
  {
    id: '1',
    image: require('../assets/AI1.png'),
    text: 'Go to Groq Console and Click "Create API key"',
    hasButton: true,
  },
  {
    id: '2',
    image: require('../assets/AI2.png'),
    text: 'Type a name for your API key',
  },
  {
    id: '3',
    image: require('../assets/AI3.png'),
    text: 'Click "Copy" and paste it above',
  },
];

const FALLBACK_MODELS: GroqModel[] = [
  {
    id: AI_CONFIG.DEFAULT_MODEL,
    name: 'Llama 4 Scout 17B',
    description: 'Latest data & fast - RECOMMENDED',
    created: AI_CONFIG.DEFAULT_MODEL_CREATED,
  },
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B',
    description: 'Newest & fastest',
    created: 1733443200, // Dec 6 2024
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B',
    description: 'Ultra-fast responses',
    created: 1721692800, // Jul 23 2024
  },
  {
    id: 'mixtral-8x7b-32768',
    name: 'Mixtral 8x7B',
    description: 'Large context window',
    created: 1702252800, // Dec 11 2023
  },
  {
    id: 'gemma2-9b-it',
    name: 'Gemma 2 9B',
    description: 'Efficient and capable',
    created: 1719446400, // Jun 27 2024
  },
];

// Function to fetch available Groq models from the API
const fetchGroqModels = async (apiKey: string): Promise<GroqModel[]> => {
  try {
    if (!apiKey || apiKey.trim() === '') {
      return FALLBACK_MODELS;
    }

    const response = await fetch('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      return FALLBACK_MODELS;
    }

    const data = await response.json();
    let apiModels: GroqModel[] = [];

    if (data.data && Array.isArray(data.data)) {
      apiModels = data.data
        .filter((model: any) => model.id && !model.id.includes('whisper'))
        .map((model: any) => ({
          id: model.id,
          name: model.id
            .split('-')
            .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' '),
          description: 'Groq AI model',
          created: model.created,
        }));
    }

    // Merge with fallback models
    const combinedModels = [...FALLBACK_MODELS];
    const existingIds = new Set(combinedModels.map(m => m.id));

    apiModels.forEach(model => {
      if (!existingIds.has(model.id)) {
        combinedModels.push(model);
      }
    });

    return combinedModels;
  } catch (error) {
    return FALLBACK_MODELS;
  }
};

const OnboardingAISettings: React.FC<{
  onDone: () => void;
  onSkip: () => void;
  onBack: () => void;
}> = ({onDone, onSkip, onBack}) => {
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);
  const [apiKey, setApiKey] = useState('');
  const [availableModels, setAvailableModels] =
    useState<GroqModel[]>(FALLBACK_MODELS);
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

  // Image expansion state
  const [expandedImage, setExpandedImage] = useState<any>(null);
  const [expandedScale] = useState(new Animated.Value(0));

  const queryClient = useQueryClient();
  const {isTablet} = useResponsive();
  const width = useWindowDimensions().width;
  const themeMode = BlurPreference.getMode();
  const isSolid = themeMode === 'normal';

  const dynamicStyles = StyleSheet.create({
    instructionCard: {
      width: isTablet ? 300 : 150,
      marginRight: spacing.md,
      alignItems: 'center',
    },
    instructionImage: {
      width: isTablet ? 300 : 150,
      height: isTablet ? 600 : 300,
      objectFit: 'contain',
      borderRadius: borderRadius.md,
      marginBottom: spacing.sm,
    },
    instructionText: {
      fontSize: isTablet ? 14 : 12,
      color: colors.text.secondary,
      textAlign: 'center',
      lineHeight: isTablet ? 20 : 18,
      fontFamily: 'Inter_18pt-Regular',
      paddingHorizontal: spacing.xs,
    },
  });

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
      console.log('[OnboardingAI] Loading settings...');
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
      console.error('[OnboardingAI] Error loading settings:', error);
      setInitialSettings({
        apiKey: '',
        model: DEFAULT_MODEL,
      });
    }
  };

  const loadAvailableModels = async (currentApiKey: string) => {
    setIsLoadingModels(true);
    try {
      const models = await fetchGroqModels(currentApiKey);
      setAvailableModels(models);
    } catch (error) {
      setAvailableModels(FALLBACK_MODELS);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const validateApiKey = async (key: string): Promise<boolean> => {
    try {
      console.log('[OnboardingAI] Validating API key...');
      // First check internet connectivity
      const isOnline = await checkInternet();
      if (!isOnline) {
        console.warn('[OnboardingAI] No internet during validation');
        setShowNoInternet(true);
        return false;
      }

      // Make a test call to the Groq API to validate the key
      const payload = {
        model: AI_CONFIG.DEFAULT_MODEL,
        messages: [
          {
            role: 'user',
            content: 'Test connection',
          },
        ],
        max_tokens: 5,
      };

      console.log(
        '[OnboardingAI] Sending validation request to Groq...',
        payload,
      );

      const response = await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify(payload),
        },
      );

      console.log('[OnboardingAI] Groq validation status:', response.status);

      if (response.status >= 200 && response.status < 300) return true;
      if (response.status === 401 || response.status === 403) return false;

      try {
        const errorData = await response.json();
        console.error(
          '[OnboardingAI] Groq validation error payload:',
          errorData,
        );
      } catch (e) {
        console.error('[OnboardingAI] Could not parse error response');
      }

      return false;
    } catch (error) {
      console.error('[OnboardingAI] Network error during validation:', error);
      // Check if it's a network error
      const isOnline = await checkInternet();
      if (!isOnline) {
        setShowNoInternet(true);
      }
      return false;
    }
  };

  const saveSettings = async () => {
    console.log('[OnboardingAI] saveSettings triggered');
    const trimmedApiKey = apiKey.trim();

    // Validate if key changed or first time
    if (trimmedApiKey && trimmedApiKey !== initialSettings?.apiKey) {
      setIsValidating(true);
      try {
        const isValid = await validateApiKey(trimmedApiKey);
        if (!isValid) {
          showAlert(
            'Authentication Failed',
            'Your API key is invalid or not reachable. Please check it and try again.',
          );
          setIsValidating(false);
          return;
        }
      } catch (error) {
        showAlert(
          'Connection Error',
          'Failed to validate API key. Please check your connection and try again.',
        );
        setIsValidating(false);
        return;
      }
    }

    try {
      console.log('[OnboardingAI] Saving settings to store...', {
        model: selectedModel,
      });

      const selectedModelObj = availableModels.find(
        m => m.id === selectedModel,
      );

      await AISettingsManager.saveSettings({
        model: selectedModel,
        modelCreated: selectedModelObj?.created || null,
        apiKey: trimmedApiKey,
        aiEnabled: true,
      });

      queryClient.invalidateQueries({queryKey: ['aiSettings']});

      // Update initial settings to reflect the saved state
      setInitialSettings({
        apiKey: trimmedApiKey,
        model: selectedModel,
      });

      setShowApiKeyInput(false);
      Keyboard.dismiss();
      console.log('[OnboardingAI] Success! Moving to next step.');
      showAlert(
        'Welcome to Theater!',
        'Your AI setup is complete. Enjoy the show!',
      );
      onDone();
    } catch (error) {
      console.error('[OnboardingAI] Save error:', error);
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

  const handleExpandImage = (image: any) => {
    setExpandedImage(image);
    Animated.spring(expandedScale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  };

  const handleCloseExpanded = () => {
    Animated.timing(expandedScale, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setExpandedImage(null));
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
      <LinearGradient
        colors={['#020F2D', '#110010']}
        useAngle={true}
        angle={100}
        style={styles.backgroundGradient}
      />
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
                {'\n'}• AI Search
                {'\n'}• Movie/Series level chat assistant
                {'\n'}• Personalized recommendations
                {'\n'}• Trivia & Facts
                {'\n'}• Watchlist Analysis
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
                      Use AI
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView
        style={{flex: 1}}
        contentContainerStyle={{flexGrow: 1}}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onBack}
            style={styles.backButton}
            activeOpacity={0.7}>
            <Icon name="chevron-back" size={20} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI Assistant Setup</Text>
          <View style={{width: 36}} />
        </View>

        <View
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
          {/* API Key Section */}
          <View
            style={[
              styles.section,
              {
                width: '100%',
                alignSelf: 'center',
                marginTop: spacing.md,
              },
            ]}>
            <Text style={styles.sectionTitle}>Groq API Key</Text>

            {/* Search-style input container */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                value={apiKey}
                onChangeText={setApiKey}
                placeholder="Enter your Groq API key..."
                placeholderTextColor={colors.text.tertiary}
                multiline={false}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={true}
              />
              <TouchableOpacity
                style={styles.pasteButton}
                onPress={handlePasteFromClipboard}
                activeOpacity={0.7}>
                <Icon
                  name={isApiKeyCopied ? 'checkmark' : 'clipboard-outline'}
                  size={20}
                  color={isApiKeyCopied ? colors.primary : colors.text.tertiary}
                />
              </TouchableOpacity>
            </View>

            {/* Horizontal scrollable instruction cards */}
            <Text
              style={[
                styles.sectionDescription,
                {
                  paddingHorizontal: spacing.lg,
                  marginTop: spacing.md,
                  fontWeight: '700',
                  fontSize: 14,
                  color: colors.text.primary,
                },
              ]}>
              How to get your API key:
            </Text>

            <FlatList
              horizontal
              data={instructions}
              keyExtractor={item => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.instructionsContainer}
              renderItem={({item}) => (
                <View style={dynamicStyles.instructionCard}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => handleExpandImage(item.image)}>
                    <Image
                      source={item.image}
                      style={dynamicStyles.instructionImage}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                  <Text style={dynamicStyles.instructionText}>{item.text}</Text>
                  {item.hasButton && (
                    <TouchableOpacity
                      onPress={() =>
                        Linking.openURL('https://console.groq.com/keys')
                      }
                      activeOpacity={0.9}
                      style={{
                        marginTop: spacing.sm,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderBottomWidth: 0,
                        borderColor: colors.modal.content,
                        backgroundColor: colors.modal.blur,
                        paddingVertical: spacing.md,
                        paddingHorizontal: spacing.lg,
                        borderRadius: borderRadius.round,
                      }}>
                      <Text
                        style={{
                          color: colors.text.primary,
                          fontWeight: '600',
                          fontFamily: 'Inter_18pt-Regular',
                          fontSize: 12,
                          marginRight: spacing.xs,
                        }}>
                        Click here
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            />
          </View>
        </View>
      </ScrollView>
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
          By using your own key, you agree to Groq's Generative AI terms of
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
                  borderRadius: borderRadius.round,
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
                  Enter Theater
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Full Width Image Expansion Modal */}
      <Modal
        visible={!!expandedImage}
        transparent={true}
        animationType="none"
        onRequestClose={handleCloseExpanded}>
        <TouchableOpacity
          style={styles.expandedOverlay}
          activeOpacity={1}
          onPress={handleCloseExpanded}>
          <Animated.View
            style={[
              styles.expandedBlurContainer,
              {
                opacity: expandedScale,
                backgroundColor: isSolid ? 'black' : 'rgba(0,0,0,0.4)',
              },
            ]}>
            {!isSolid && (
              <BlurView
                style={StyleSheet.absoluteFill}
                blurType="dark"
                blurAmount={15}
              />
            )}
          </Animated.View>

          <Animated.View
            style={[
              styles.expandedContent,
              {
                opacity: expandedScale,
                transform: [
                  {
                    scale: expandedScale.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              },
            ]}>
            <Image
              source={expandedImage}
              style={{
                width: width - spacing.xl * 2,
                height: (width - spacing.xl * 2) * 2,
                maxHeight: '85%',
                borderRadius: borderRadius.lg,
              }}
              resizeMode="contain"
            />
            <TouchableOpacity
              style={styles.closeExpandedButton}
              onPress={handleCloseExpanded}>
              <Icon name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    width: '100%',
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    padding: spacing.sm,
    backgroundColor: colors.modal.blur,
    borderRadius: borderRadius.round,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.modal.content,
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
    ...typography.body2,
    color: colors.text.primary,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.modal.blur,
    borderRadius: borderRadius.round,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.modal.content,
    marginHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    height: 60,
    paddingHorizontal: spacing.xs,
    color: colors.text.primary,
    ...typography.body1,
  },
  pasteButton: {
    marginLeft: spacing.xs,
    borderRadius: borderRadius.round,
    backgroundColor: colors.modal.blur,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.modal.content,
    padding: spacing.sm,
  },
  instructionsContainer: {
    paddingHorizontal: spacing.lg,
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
  // Image expansion styles
  expandedOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedBlurContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  expandedContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeExpandedButton: {
    position: 'absolute',
    top: -40,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.modal.blur,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.modal.content,
  },
});

export default OnboardingAISettings;
