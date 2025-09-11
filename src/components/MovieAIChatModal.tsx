import React, {useState, useCallback, useRef, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  FlatList,
  Animated,
  Easing,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import {Modal} from 'react-native';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import Icon from 'react-native-vector-icons/Ionicons';
import {useResponsive} from '../hooks/useResponsive';
import {cinemaChat} from '../services/gemini';
import {GradientSpinner} from './GradientSpinner';
import LinearGradient from 'react-native-linear-gradient';
import {BlurView} from '@react-native-community/blur';
import useAndroidKeyboardInset from '../hooks/useAndroidKeyboardInset';
import Markdown from 'react-native-markdown-display';
import {AIReportFlag} from './AIReportFlag';

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
};

type MovieAIChatModalProps = {
  visible: boolean;
  onClose: () => void;
  movieTitle: string;
  movieYear: number;
  movieOverview: string;
  movieGenres: string[];
  contentType?: 'movie' | 'tv';
};

const DEFAULT_MOVIE_QUESTIONS = [
  'Who is the director?',
  'What are viewers saying about this movie?',
  'Can you explain the plot?',
  'Who are the main actors?',
  "What's the movie's rating?",
  'Is this movie worth watching?',
  'What genre is this movie?',
  'When was this movie released?',
];

const DEFAULT_TV_QUESTIONS = [
  'Who created this show?',
  'What are viewers saying about this series?',
  'Can you explain the plot?',
  'Who are the main actors?',
  "What's the show's rating?",
  'Is this series worth watching?',
  'What genre is this show?',
  'When did this series first air?',
];

export const MovieAIChatModal: React.FC<MovieAIChatModalProps> = ({
  visible,
  onClose,
  movieTitle,
  movieYear,
  movieOverview,
  movieGenres,
  contentType = 'movie',
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const {isTablet} = useResponsive();
  const androidInset = useAndroidKeyboardInset(10);

  // Animation values (matching OnlineAI screen)
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Initialize entrance animations (matching OnlineAI screen)
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(slideUpAnim, {
          toValue: 0,
          duration: 800,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animations when modal closes
      fadeAnim.setValue(0);
      slideUpAnim.setValue(50);
      scaleAnim.setValue(0.95);
    }
  }, [visible]);

  // Pulse animation for loading states (matching OnlineAI screen)
  useEffect(() => {
    if (isLoading) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    }
  }, [isLoading]);

  // Add initial welcome message
  useEffect(() => {
    if (visible) {
      setMessages([
        {
          id: '1',
          text: `Hi! I'm your AI assistant for "${movieTitle}". Ask me anything about this movie, its plot, cast, or get recommendations for similar movies!`,
          sender: 'ai',
          timestamp: new Date(),
        },
      ]);
      setInputText('');
      setShowSuggestions(true);
    } else {
      // Reset messages when modal is closed
      setMessages([]);
      setShowSuggestions(true);
    }
  }, [visible, movieTitle]);

  const handleSend = useCallback(
    async (overrideText?: string) => {
      const textToSend = (overrideText ?? inputText).trim();
      if (!textToSend || isLoading) return;

      const userMessage: Message = {
        id: Date.now().toString(),
        text: textToSend,
        sender: 'user',
        timestamp: new Date(),
      };

      // Add user message
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      // Clear input only when sending manual input; for suggestions we're not editing the box
      if (!overrideText) setInputText('');
      setIsLoading(true);
      setShowSuggestions(false); // Hide suggestions after first message

      try {
        // Add context as a user message (do not send genres)
        const contextMessage = {
          role: 'user' as const,
          content: `Context: You are chatting about "${movieTitle}"${
            movieYear ? ` (${movieYear})` : ''
          }. ${
            movieOverview ? `Overview: ${movieOverview}` : ''
          } Only answer questions related to this specific ${
            contentType === 'tv' ? 'TV show' : 'movie'
          } and politely decline unrelated topics.`,
        };

        // Prepare chat messages from the updated messages array
        const conversationMessages = updatedMessages.filter(
          msg => msg.id !== '1',
        );
        const chatMessages = [
          contextMessage,
          ...conversationMessages.map(msg => ({
            role:
              msg.sender === 'ai' ? ('assistant' as const) : ('user' as const),
            content: msg.text,
          })),
        ];
        console.log('Sending chat messages:', chatMessages);

        // Call the AI service with the conversation messages
        const {aiResponse} = await cinemaChat(chatMessages);

        // Add AI response
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: aiResponse,
          sender: 'ai',
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, aiMessage]);
      } catch (error) {
        console.error('Error getting AI response:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));

        // Recreate conversationMessages for error logging
        const errorConversationMessages = updatedMessages.filter(
          msg => msg.id !== '1',
        );
        console.error(
          'Chat messages being sent:',
          JSON.stringify(errorConversationMessages, null, 2),
        );

        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Sorry, I encountered an error. Please try again later.',
          sender: 'ai',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [
      inputText,
      isLoading,
      movieTitle,
      movieOverview,
      movieGenres,
      contentType,
      messages,
    ],
  );

  const handleSuggestionPress = useCallback(
    (question: string) => {
      // Send the suggestion immediately
      handleSend(question);
    },
    [handleSend],
  );

  const renderMessage = useCallback(({item}: {item: Message}) => {
    const isUser = item.sender === 'user';

    return isUser ? (
      <View style={[styles.message, styles.user]}>
        <Text style={styles.userText}>{item.text}</Text>
      </View>
    ) : (
      <View>
        <LinearGradient
          colors={['rgba(19, 1, 45, 0.51)', 'rgba(91, 2, 62, 0.51)']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={[styles.message, styles.assistant]}>
          <Markdown style={{body: styles.messageText}}>{item.text}</Markdown>
        </LinearGradient>
        <AIReportFlag
          aiText={item.text}
          userText={undefined}
          context="MovieAIChatModal"
          timestamp={Date.now()}
        />
      </View>
    );
  }, []);

  const renderSuggestions = () => {
    // if (!showSuggestions || messages.length > 1) return null;

    return (
      <View style={styles.suggestionsContainer}>
        <Text style={styles.suggestionsTitle}>Try asking:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suggestionsScrollContent}>
          {(contentType === 'tv'
            ? DEFAULT_TV_QUESTIONS
            : DEFAULT_MOVIE_QUESTIONS
          ).map((question: string, index: number) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionChip}
              onPress={() => handleSuggestionPress(question)}
              activeOpacity={0.7}>
              <Text style={styles.suggestionText}>{question}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <Modal
      animationType="slide"
      navigationBarTranslucent={true}
      transparent={true}
      visible={visible}
      onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          borderTopLeftRadius: 50,
          borderTopRightRadius: 50,
          overflow: 'hidden',
        }}>
        <Animated.View
          style={[
            {flex: 1, position: 'relative'},
            {
              opacity: fadeAnim,
              transform: [{translateY: slideUpAnim}, {scale: scaleAnim}],
            },
          ]}>
          <BlurView
            blurType="dark"
            blurAmount={5}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            overlayColor={colors.modal.blur}
          />
          <TouchableOpacity
            activeOpacity={0.9}
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: borderRadius.round,
              height: 50,
              width: 50,
              borderColor: colors.modal.border,
              borderWidth: 1,
              backgroundColor: colors.modal.blur,
              zIndex: 2,
            }}
            onPress={onClose}>
            <Icon name="close" size={24} color="white" />
          </TouchableOpacity>
          <LinearGradient
            colors={[
              'rgba(209, 8, 112, 0.84)',
              'rgba(209, 8, 125, 0.53)',
              'rgba(75, 8, 209, 0.47)',
              'rgb(133, 7, 183)',
            ]}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: 0.5,
            }}
          />
          <View style={styles.container}>
            <LinearGradient
              colors={['rgba(57, 0, 40, 0.7)', 'rgba(98, 0, 55, 0)']}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 120,
                zIndex: 10,
                marginHorizontal: 2,
              }}
            />
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={item => item.id}
              contentContainerStyle={[styles.chat]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              onContentSizeChange={() =>
                flatListRef.current?.scrollToEnd({animated: true})
              }
              onLayout={() =>
                flatListRef.current?.scrollToEnd({animated: true})
              }
              ListFooterComponent={
                isLoading ? (
                  <Animated.View
                    style={{
                      marginHorizontal: spacing.lg,
                      marginBottom: 150,
                    }}>
                    <GradientSpinner
                      size={30}
                      style={{
                        alignItems: 'center',
                        alignSelf: 'center',
                        backgroundColor: 'transparent',
                      }}
                      color={colors.primary}
                      colors={[
                        colors.primary,
                        colors.secondary,
                        'rgba(239, 0, 184, 0.06)',
                        'rgba(67, 2, 75, 0.06)',
                        'rgba(211, 0, 239, 0.06)',
                        'rgba(39, 1, 44, 0.06)',
                        'rgba(211, 0, 239, 0.06)',
                        'rgba(183, 0, 239, 0.34)',
                        'rgba(213, 146, 249, 0.06)',
                        'rgba(128, 0, 239, 0.06)',
                        'rgba(0, 96, 239, 0.06)',
                        'rgba(72, 0, 239, 0.06)',
                        'rgba(44, 0, 239, 0.06)',
                        'rgba(18, 0, 239, 0.06)',
                        'rgba(0, 0, 239, 0.06)',
                        'rgba(0, 123, 211, 0.06)',
                        'rgba(0, 117, 184, 0.06)',
                        'rgba(0, 0, 156, 0.06)',
                        'rgba(0, 92, 128, 0.06)',
                        'rgba(0, 0, 100, 0.06)',
                        'rgba(0, 0, 72, 0.06)',
                        'rgba(35, 0, 44, 0.06)',
                        'rgba(18, 0, 15, 0.06)',
                        'rgba(0, 0, 0, 0.06)',
                      ]}
                    />
                    <Animated.Text
                      style={[
                        {
                          color: colors.text.secondary,
                          textAlign: 'center',
                          fontSize: 12,
                          marginTop: 4,
                          fontStyle: 'italic',
                        },
                        {
                          opacity: pulseAnim,
                        },
                      ]}>
                      Theater AI is thinking...
                    </Animated.Text>
                  </Animated.View>
                ) : null
              }
            />
            <LinearGradient
              colors={['transparent', 'rgb(31, 2, 53)']}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: 150,
                zIndex: 1,
              }}
            />
            <View style={{zIndex: 1, backgroundColor: colors.modal.blur}}>
              {renderSuggestions()}
              <View
                style={{
                  marginHorizontal: isTablet ? 100 : spacing.lg,
                  borderRadius: 50,
                  overflow: 'hidden',
                  zIndex: 3,
                }}>
                <TouchableWithoutFeedback
                  onPress={() => inputRef.current?.focus()}>
                  <View style={styles.inputRow}>
                    <TextInput
                      ref={inputRef}
                      style={styles.input}
                      value={inputText}
                      onChangeText={setInputText}
                      placeholder={`Ask about ${
                        contentType === 'tv' ? 'this show' : 'this movie'
                      }...`}
                      placeholderTextColor={colors.text.tertiary}
                      editable={true}
                      onFocus={() =>
                        setTimeout(
                          () =>
                            flatListRef.current?.scrollToEnd({animated: true}),
                          50,
                        )
                      }
                      onSubmitEditing={() => handleSend()}
                      returnKeyType="send"
                    />
                    <Animated.View>
                      <TouchableOpacity
                        style={[
                          styles.sendButton,
                          {
                            opacity: isLoading || !inputText.trim() ? 0.5 : 1,
                          },
                        ]}
                        onPress={() => handleSend()}
                        disabled={isLoading || !inputText.trim()}>
                        <Icon
                          name={'send'}
                          size={24}
                          color={
                            isLoading || !inputText.trim()
                              ? colors.modal.active
                              : colors.text.primary
                          }
                        />
                      </TouchableOpacity>
                    </Animated.View>
                  </View>
                </TouchableWithoutFeedback>
              </View>
              <View
                style={{
                  marginVertical: spacing.md,
                  marginHorizontal: spacing.sm,
                }}>
                <Text
                  style={{
                    textAlign: 'center',
                    ...typography.caption,
                    fontSize: 10,
                    color: colors.text.tertiary,
                  }}>
                  Responses are AI generated and for entertainment purposes
                  only.
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginHorizontal: 2,
    overflow: 'hidden',
  },
  chat: {
    paddingVertical: spacing.md,
    paddingTop: 70,
    gap: spacing.md,
  },
  message: {
    marginBottom: spacing.sm,
    marginHorizontal: spacing.md,
    padding: spacing.md,
    maxWidth: '80%',
  },
  user: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(229, 210, 255, 0.27)',
    color: colors.background.primary,
    borderRadius: borderRadius.xl,
  },
  assistant: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.xl,
  },
  userText: {
    color: colors.text.primary,
    ...typography.body2,
    fontWeight: '500',
  },
  messageText: {
    color: colors.text.primary,
    ...typography.body2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: colors.modal.border,
    backgroundColor: colors.modal.blur,
    zIndex: 3,
  },
  input: {
    flex: 1,
    height: 50,
    color: colors.text.primary,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginRight: spacing.sm,
    ...typography.body2,
  },
  sendButton: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.md,
  },
  suggestionsContainer: {
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.background.secondary,
    zIndex: 1,
  },
  suggestionsTitle: {
    ...typography.body2,
    color: colors.text.muted,
    marginLeft: spacing.md,
    marginBottom: spacing.sm,
    fontWeight: '500',
  },
  suggestionsScrollContent: {
    paddingHorizontal: spacing.md,
  },
  suggestionChip: {
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.modal.border,
  },
  suggestionText: {
    ...typography.body2,
    color: colors.text.primary,
    fontWeight: '500',
  },
});
