import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import {cinemaChat} from '../services/groq';
import {colors, spacing, borderRadius, typography} from '../styles/theme';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const OnlineAIScreen: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMessage: Message = {role: 'user', content: input};
    const newMessages: Message[] = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    try {
      const response = await cinemaChat(newMessages);
      const assistantMessage: Message = {role: 'assistant', content: response};
      setMessages([...newMessages, assistantMessage]);
    } catch (e) {
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, there was an error.',
      };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({item}: {item: Message}) => (
    <View
      style={[
        styles.message,
        item.role === 'user' ? styles.user : styles.assistant,
      ]}>
      <Text style={item.role === 'user' ? styles.userText : styles.messageText}>
        {item.content}
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}>
      <LinearGradient
        colors={['rgba(83, 16, 63, 0.46)', 'rgba(64, 16, 83, 0.33)']}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 50,
        }}
      />

      <LinearGradient
        colors={['rgba(3, 3, 3, 0.7)', 'rgba(0, 0, 0, 0)']}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 120,
          zIndex: 10,
        }}
      />

      <FlatList
        data={messages}
        renderItem={renderItem}
        keyExtractor={(_, idx) => idx.toString()}
        contentContainerStyle={styles.chat}
        ListEmptyComponent={
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
            }}>
            <View style={{height: 250}} />
            <Image
              source={require('../assets/theater.png')}
              style={{width: 100, height: 100}}
            />
            <Text style={{color: colors.modal.activeBorder, fontSize: 18}}>
              Start chatting with our AI assistant!
            </Text>
            <Text style={{color: colors.modal.active, fontSize: 14}}>
              Ask us anything about movies, TV shows, and more!
            </Text>
          </View>
        }
      />
      {loading && (
        <ActivityIndicator style={{margin: 8}} color={colors.accent} />
      )}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 30,
          marginHorizontal: spacing.lg,
          borderRadius: 50,
          overflow: 'hidden',
        }}>
        <LinearGradient
          colors={['rgb(83, 16, 63)', 'rgb(64, 16, 83)']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 50,
          }}
        />
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask about movies, TV, actors..."
            placeholderTextColor={colors.text.tertiary}
            editable={!loading}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={sendMessage}
            disabled={loading || !input.trim()}>
            <Icon name="send" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    marginBottom: 120,
  },
  chat: {
    padding: spacing.md,
    paddingBottom: 120,
    paddingTop: 40,
    gap: spacing.md,
  },
  message: {
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    maxWidth: '80%',
  },
  user: {
    alignSelf: 'flex-end',
    backgroundColor: colors.accent,
    color: colors.background.primary,
  },
  assistant: {
    alignSelf: 'flex-start',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
  },
  userText: {
    color: colors.background.primary,
    ...typography.body2,
  },
  messageText: {
    color: colors.text.primary,
    ...typography.body2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.modal.background,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  input: {
    flex: 1,
    height: 50,
    // backgroundColor: colors.background.secondary,
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
});
