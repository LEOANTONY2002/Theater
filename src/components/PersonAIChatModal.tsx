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

// Types
type Message = {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
};

type PersonAIChatModalProps = {
  visible: boolean;
  onClose: () => void;
  personName: string;
  biography?: string;
  knownForDepartment?: string;
  birthDate?: string;
  birthPlace?: string;
  alsoKnownAs?: string[];
};

const DEFAULT_PERSON_QUESTIONS = [
  'What is their most acclaimed role?',
  'List some notable movies/TV shows featuring them.',
  'Have they won any major awards?',
  'What are some interesting facts about their career?',
  'What genres do they often work in?',
  'Who have they frequently collaborated with?',
  'What are their most popular works?',
  'What should I watch to get started with their filmography?',
];

export const PersonAIChatModal: React.FC<PersonAIChatModalProps> = ({
  visible,
  onClose,
  personName,
  biography,
  knownForDepartment,
  birthDate,
  birthPlace,
  alsoKnownAs,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const {isTablet} = useResponsive();
  const androidInset = useAndroidKeyboardInset(10);

  // Animations (mirroring MovieAIChatModal)
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

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
      fadeAnim.setValue(0);
      slideUpAnim.setValue(50);
      scaleAnim.setValue(0.95);
    }
  }, [visible]);

  useEffect(() => {
    if (isLoading) {
      const loop = Animated.loop(
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
      loop.start();
      return () => loop.stop();
    }
  }, [isLoading]);

  // Initial welcome/reset
  useEffect(() => {
    if (visible) {
      setMessages([
        {
          id: '1',
          text: `Hi! I'm your AI assistant for ${personName}. Ask me anything about their career, filmography, awards, and more. I will only answer questions related to this person.`,
          sender: 'ai',
          timestamp: new Date(),
        },
      ]);
      setInputText('');
    } else {
      setMessages([]);
    }
  }, [visible, personName]);

  const buildContext = () => {
    const parts: string[] = [];
    parts.push(`Context: You are chatting about the person ${personName}.`);
    if (knownForDepartment) parts.push(`Department: ${knownForDepartment}.`);
    if (birthDate) parts.push(`Born: ${birthDate}.`);
    if (birthPlace) parts.push(`Place of birth: ${birthPlace}.`);
    if (alsoKnownAs && alsoKnownAs.length > 0)
      parts.push(`Also known as: ${alsoKnownAs.join(', ')}.`);
    if (biography) parts.push(`Biography: ${biography}`);

    parts.push(
      'Answer ONLY questions related to this person. If asked unrelated or overly speculative questions, politely decline and steer back to this person. Avoid spoilers unless asked.',
    );
    return parts.join(' ');
  };

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

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      if (!overrideText) setInputText('');
      setIsLoading(true);

      try {
        const contextMessage = {
          role: 'user' as const,
          content: buildContext(),
        };

        const conversationMessages = updatedMessages.filter(m => m.id !== '1');
        const chatMessages = [
          contextMessage,
          ...conversationMessages.map(m => ({
            role:
              m.sender === 'ai' ? ('assistant' as const) : ('user' as const),
            content: m.text,
          })),
        ];

        const {aiResponse} = await cinemaChat(chatMessages);
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: aiResponse,
          sender: 'ai',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiMessage]);
      } catch (error) {
        console.error('Error getting AI response:', error);
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Sorry, I encountered an error. Please try again later.',
          sender: 'ai',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [
      inputText,
      isLoading,
      messages,
      personName,
      biography,
      knownForDepartment,
      birthDate,
      birthPlace,
      alsoKnownAs,
    ],
  );

  const renderMessage = useCallback(({item}: {item: Message}) => {
    const isUser = item.sender === 'user';
    return isUser ? (
      <View style={[styles.message, styles.user]}>
        <Text style={styles.userText}>{item.text}</Text>
      </View>
    ) : (
      <LinearGradient
        colors={['rgba(19, 1, 45, 0.51)', 'rgba(91, 2, 62, 0.51)']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={[styles.message, styles.assistant]}>
        <Markdown style={{body: styles.messageText}}>{item.text}</Markdown>
      </LinearGradient>
    );
  }, []);

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
            style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
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
                    style={{marginHorizontal: spacing.lg, marginBottom: 150}}>
                    <GradientSpinner
                      size={30}
                      style={{
                        alignItems: 'center',
                        alignSelf: 'center',
                        backgroundColor: 'transparent',
                      }}
                      color={colors.primary}
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
                        {opacity: pulseAnim},
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
              <View
                style={{
                  paddingVertical: spacing.sm,
                  borderTopWidth: 1,
                  borderTopColor: colors.background.secondary,
                  zIndex: 1,
                }}>
                <Text style={styles.suggestionsTitle}>Try asking:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.suggestionsScrollContent}>
                  {DEFAULT_PERSON_QUESTIONS.map((question, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.suggestionChip}
                      onPress={() => handleSend(question)}
                      activeOpacity={0.7}>
                      <Text style={styles.suggestionText}>{question}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View
                style={{
                  marginHorizontal: isTablet ? 100 : spacing.lg,
                  borderRadius: 50,
                  overflow: 'hidden',
                  zIndex: 3,
                  marginBottom: spacing.lg,
                }}>
                <TouchableWithoutFeedback
                  onPress={() => inputRef.current?.focus()}>
                  <View style={styles.inputRow}>
                    <TextInput
                      ref={inputRef}
                      style={styles.input}
                      value={inputText}
                      onChangeText={setInputText}
                      placeholder={`Ask about ${personName}...`}
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
                          {opacity: isLoading || !inputText.trim() ? 0.5 : 1},
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
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, marginHorizontal: 2, overflow: 'hidden'},
  chat: {paddingVertical: spacing.md, paddingTop: 70, gap: spacing.md},
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
  assistant: {alignSelf: 'flex-start', borderRadius: borderRadius.xl},
  userText: {
    color: colors.text.primary,
    ...typography.body2,
    fontWeight: '500',
  },
  messageText: {color: colors.text.primary, ...typography.body2},
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
  suggestionsTitle: {
    ...typography.body2,
    color: colors.text.muted,
    marginLeft: spacing.md,
    marginBottom: spacing.sm,
    fontWeight: '500',
  },
  suggestionsScrollContent: {paddingHorizontal: spacing.md},
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
