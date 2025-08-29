import React, {useState, useCallback, useRef, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  SafeAreaView,
  Animated,
  Easing,
  Keyboard,
  ScrollView,
} from 'react-native';
import {Modal} from 'react-native';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import Icon from 'react-native-vector-icons/Ionicons';
import {useResponsive} from '../hooks/useResponsive';
import {cinemaChat} from '../services/gemini';
import {GradientSpinner} from './GradientSpinner';

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
  const {isTablet} = useResponsive();

  // Animation values for loading states
  const pulseAnim = useRef(new Animated.Value(1)).current;

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

  // Prepare messages in the format expected by the Gemini service
  const prepareChatMessages = () => {
    // Convert app messages to chat format
    return messages.map(msg => ({
      role: msg.sender === 'ai' ? ('assistant' as const) : ('user' as const),
      content: msg.text,
    }));
  };

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

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };

    // Add user message
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    setShowSuggestions(false); // Hide suggestions after first message

    try {
      // Prepare the chat context
      const chatContext = `You are a expert in movie "${movieTitle}". 
      ${movieOverview ? `Movie Overview: ${movieOverview}` : ''}
      ${movieGenres ? `Genres: ${movieGenres}` : ''}`;

      // Add system message with context
      const messagesWithContext = [
        {role: 'system' as const, content: chatContext},
        ...prepareChatMessages(),
      ];

      // Add movie context to the user's message
      const userMessageWithContext = {
        role: 'user' as const,
        content: `[About the movie: ${movieTitle}]
        ${movieYear ? `Year: ${movieYear}` : ''}
        ${movieOverview ? `Overview: ${movieOverview}` : ''}
        ${movieGenres ? `Genres: ${movieGenres}` : ''}
        
        ${inputText}`,
      };

      // Call the AI service with the context-enhanced message
      const {aiResponse} = await cinemaChat([
        ...prepareChatMessages().slice(0, -1), // All messages except the last one
        userMessageWithContext,
      ]);

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
  }, [inputText, isLoading, movieTitle, movieOverview, movieGenres]);

  const handleSuggestionPress = useCallback((question: string) => {
    setInputText(question);
  }, []);

  const renderMessage = useCallback(({item}: {item: Message}) => {
    const isUser = item.sender === 'user';
    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.aiMessageContainer,
        ]}>
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userMessageBubble : styles.aiMessageBubble,
          ]}>
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userMessageText : styles.aiMessageText,
            ]}>
            {item.text}
          </Text>
        </View>
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
          {(contentType === 'tv' ? DEFAULT_TV_QUESTIONS : DEFAULT_MOVIE_QUESTIONS).map((question: string, index: number) => (
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
      transparent={false}
      visible={visible}
      onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Chat about {movieTitle}</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.messagesContainer}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({animated: true})
            }
            onLayout={() => flatListRef.current?.scrollToEnd({animated: true})}
            keyboardDismissMode="interactive"
          />
          {renderSuggestions()}
          {isLoading && (
            <Animated.View style={styles.loadingContainer}>
              <GradientSpinner
                size={30}
                thickness={3}
                style={{
                  alignItems: 'center',
                  alignSelf: 'center',
                  backgroundColor: 'transparent',
                }}
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
                  styles.loadingText,
                  {
                    opacity: pulseAnim,
                  },
                ]}>
                Theater AI is thinking...
              </Animated.Text>
            </Animated.View>
          )}
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask about this movie..."
            placeholderTextColor={colors.text.muted}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            multiline
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}>
            <Icon
              name="send"
              size={20}
              color={inputText.trim() ? colors.primary : colors.text.muted}
            />
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'rgb(18, 0, 22)', // Match OnlineAI screen background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.secondary,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    textAlign: 'center',
    flex: 1,
    marginHorizontal: spacing.md,
  },
  closeButton: {
    padding: spacing.xs,
  },
  headerRight: {
    width: 24, // Same as close button for balance
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  messagesList: {
    paddingVertical: spacing.md,
  },
  messageContainer: {
    marginBottom: spacing.md,
    maxWidth: '80%',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  aiMessageContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  messageBubble: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  userMessageBubble: {
    backgroundColor: 'rgba(229, 202, 242, 0.66)', // Match OnlineAI user message style
    borderTopRightRadius: 0,
  },
  aiMessageBubble: {
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: 0,
  },
  messageText: {
    ...typography.body1,
    lineHeight: 20,
  },
  userMessageText: {
    color: colors.background.primary, // Match OnlineAI user text color
    fontWeight: '500',
  },
  aiMessageText: {
    color: colors.text.primary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.background.secondary,
    backgroundColor: colors.background.primary,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text.primary,
    maxHeight: 120,
    textAlignVertical: 'top',
    ...typography.body1,
  },
  sendButton: {
    marginLeft: spacing.sm,
    padding: spacing.sm,
  },
  loadingContainer: {
    padding: spacing.sm,
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  loadingText: {
    color: colors.text.secondary,
    textAlign: 'center',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  suggestionsContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.background.secondary,
  },
  suggestionsTitle: {
    ...typography.body2,
    color: colors.text.muted,
    marginBottom: spacing.sm,
    fontWeight: '500',
  },
  suggestionsScrollContent: {
    paddingRight: spacing.md,
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
