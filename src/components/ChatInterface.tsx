// src/components/ChatInterface.tsx - INTERFAZ DE CHAT (CORREGIDA)
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Dimensions,
  Clipboard,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { Layout, FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import Toast from 'react-native-toast-message';

// Hooks y contextos
import { useAuth } from '../contexts/AuthContext';
import { useConversations } from '../contexts/ConversationContext';
import { useKeyboard, usePermissions, useSpeechRecognition, useTextToSpeech } from '../hooks';

// Componentes base
import { IconButton, Loading, CustomModal } from './base';
import FileUploader from './FileUploader';

// Estilos y tipos
import { theme } from '../styles/theme';
import { ChatMessage, FileAttachment, SpecialtyType, SPECIALISTS } from '../lib/types';
import { cloudFunctions } from '../lib/firebase';

// ========================================
// COMPONENTE MENSAJE
// ========================================
const MessageItem = React.memo(({ message, onCopy, onSpeak }: { message: ChatMessage; onCopy: (text: string) => void; onSpeak: (text: string) => void; }) => {
    const isUser = message.role === 'user';

    const handleCopy = () => onCopy(message.content);
    const handleSpeak = () => onSpeak(message.content);

    return (
        <Animated.View
            layout={Layout.springify()}
            entering={FadeIn.duration(300)}
            style={[styles.messageContainer, isUser ? styles.userMessageContainer : styles.assistantMessageContainer]}
        >
            <View style={[styles.messageBubble, isUser ? styles.userMessageBubble : styles.assistantMessageBubble]}>
                {message.isTyping ? (
                    <Loading size="small" />
                ) : (
                    <Markdown style={isUser ? markdownStylesUser : markdownStylesAssistant}>{message.content}</Markdown>
                )}
            </View>
            {!message.isTyping && (
                 <View style={[styles.messageActions, isUser ? styles.userMessageActions : {}]}>
                    <TouchableOpacity onPress={handleCopy} style={styles.actionButton}>
                        <Ionicons name="copy-outline" size={16} color={theme.colors.text.tertiary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSpeak} style={styles.actionButton}>
                        <Ionicons name="volume-medium-outline" size={16} color={theme.colors.text.tertiary} />
                    </TouchableOpacity>
                </View>
            )}
        </Animated.View>
    );
});


// ========================================
// COMPONENTE PRINCIPAL
// ========================================
export default function ChatInterface({ conversationId }: { conversationId?: string }) {
  const { user } = useAuth();
  const { activeConversation, addMessage, createConversation, selectConversation } = useConversations();
  
  const [inputText, setInputText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([]);
  const [showFileUploader, setShowFileUploader] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const { keyboardHeight, isKeyboardVisible } = useKeyboard();
  const { speak, isSpeaking, stop } = useTextToSpeech();
  
  // Efecto para cargar la conversación correcta
  useEffect(() => {
    if (conversationId && conversationId !== activeConversation?.id) {
        // En un escenario real, aquí se buscaría la conversación por ID
        // Por ahora, asumimos que el contexto ya la tiene o la cambiará
    }
  }, [conversationId, activeConversation?.id, selectConversation]);
  
  const handleSendMessage = useCallback(async () => {
    if ((!inputText.trim() && attachedFiles.length === 0) || isSending) return;
    if (!user) {
      Alert.alert("Error", "Debes iniciar sesión para chatear.");
      return;
    }

    setIsSending(true);
    const messageText = inputText.trim();
    const files = [...attachedFiles];
    setInputText('');
    setAttachedFiles([]);
    
    let currentConversation = activeConversation;
    if (!currentConversation) {
        currentConversation = await createConversation();
    }
    
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      type: 'user',
      content: messageText,
      message: messageText,
      timestamp: new Date(),
      attachments: files,
    };
    await addMessage(currentConversation.id, userMessage);
    
    const typingIndicator: ChatMessage = {
      id: `typing_${Date.now()}`,
      role: 'assistant',
      type: 'assistant',
      content: '',
      message: '',
      timestamp: new Date(),
      isTyping: true,
    };
    await addMessage(currentConversation.id, typingIndicator);

    try {
      const response = await cloudFunctions.chatWithAI({
        message: messageText,
        fileAttachments: files,
        chatHistory: currentConversation.messages.slice(-10),
      });

      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}_ai`,
        role: 'assistant',
        type: 'assistant',
        content: response.response,
        message: response.response,
        timestamp: new Date(),
        metadata: {
          model: response.model,
          tokensUsed: response.tokensUsed,
        },
      };
      await addMessage(currentConversation.id, assistantMessage);

    } catch (error: any) {
      const errorMessage: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        type: 'assistant',
        content: `Error: ${error.message || 'No se pudo obtener una respuesta.'}`,
        message: `Error: ${error.message || 'No se pudo obtener una respuesta.'}`,
        timestamp: new Date(),
      };
      await addMessage(currentConversation.id, errorMessage);
    } finally {
        // Lógica para eliminar el indicador de "escribiendo..."
        setIsSending(false);
    }
  }, [inputText, attachedFiles, isSending, user, activeConversation, addMessage, createConversation]);

  const handleCopyMessage = (text: string) => {
    Clipboard.setString(text);
    Toast.show({ type: 'success', text1: 'Copiado al portapapeles' });
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <KeyboardAvoidingView 
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={theme.layout.headerHeight}
      >
        <FlatList
          ref={flatListRef}
          data={activeConversation?.messages || []}
          renderItem={({ item }) => <MessageItem message={item} onCopy={handleCopyMessage} onSpeak={speak} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {attachedFiles.length > 0 && (
             <View style={styles.attachmentsPreview}>
                {attachedFiles.map(file => (
                    <View key={file.id} style={styles.attachmentChip}>
                        <Ionicons name="document-attach" size={16} color={theme.colors.text.secondary} />
                        <Text style={styles.attachmentText} numberOfLines={1}>{file.name}</Text>
                        <TouchableOpacity onPress={() => setAttachedFiles(files => files.filter(f => f.id !== file.id))}>
                            <Ionicons name="close-circle" size={18} color={theme.colors.text.tertiary} />
                        </TouchableOpacity>
                    </View>
                ))}
            </View>
        )}

        <View style={styles.inputContainer}>
          <IconButton icon={<Ionicons name="add" size={24} color={theme.colors.text.secondary} />} variant="ghost" size="sm" onPress={() => setShowFileUploader(true)} />
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Escribe un mensaje..."
            placeholderTextColor={theme.colors.text.tertiary}
            multiline
            editable={!isSending}
          />
          <IconButton 
            icon={<Ionicons name="arrow-up-circle" size={32} color={theme.colors.primary[500]} />} 
            variant="ghost" 
            size="sm" 
            onPress={handleSendMessage} 
            disabled={(!inputText.trim() && attachedFiles.length === 0) || isSending}
          />
        </View>

        <CustomModal visible={showFileUploader} onClose={() => setShowFileUploader(false)} size="lg">
            <FileUploader onFilesSelected={(files) => {
                setAttachedFiles(prev => [...prev, ...files]);
                setShowFileUploader(false);
            }} />
        </CustomModal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ========================================
// ESTILOS
// ========================================
const markdownStyles = {
    body: { fontSize: 16, lineHeight: 24 },
    heading1: { fontSize: 24, fontWeight: 'bold', color: theme.colors.text.primary, marginBottom: 8 },
    link: { color: theme.colors.primary[400], textDecorationLine: 'underline' },
    code_inline: { backgroundColor: theme.colors.background.tertiary, padding: 2, borderRadius: 4, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
    code_block: { backgroundColor: theme.colors.background.primary, padding: 12, borderRadius: 8, marginVertical: 8, borderColor: theme.colors.border.primary, borderWidth: 1 },
};

const markdownStylesAssistant = StyleSheet.create({
    ...markdownStyles,
    body: { ...markdownStyles.body, color: theme.colors.text.primary },
});

const markdownStylesUser = StyleSheet.create({
    ...markdownStyles,
    body: { ...markdownStyles.body, color: 'white' },
    link: { ...markdownStyles.link, color: theme.colors.secondary[200] },
});

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background.primary },
    flex: { flex: 1 },
    listContainer: {
        padding: theme.spacing[4],
        paddingBottom: theme.spacing[2],
    },
    messageContainer: {
        marginBottom: theme.spacing[4],
        maxWidth: '85%',
    },
    userMessageContainer: { alignSelf: 'flex-end', alignItems: 'flex-end' },
    assistantMessageContainer: { alignSelf: 'flex-start', alignItems: 'flex-start' },
    messageBubble: {
        padding: theme.spacing[3],
        borderRadius: theme.borderRadius.lg,
    },
    userMessageBubble: {
        backgroundColor: theme.colors.primary[600],
        borderTopRightRadius: theme.borderRadius.sm,
    },
    assistantMessageBubble: {
        backgroundColor: theme.colors.background.secondary,
        borderTopLeftRadius: theme.borderRadius.sm,
    },
    messageActions: {
        flexDirection: 'row',
        gap: theme.spacing[3],
        marginTop: theme.spacing[2],
    },
    userMessageActions: {
        justifyContent: 'flex-end',
    },
    actionButton: {
        opacity: 0.7,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing[2],
        borderTopWidth: 1,
        borderTopColor: theme.colors.border.primary,
        backgroundColor: theme.colors.background.secondary,
    },
    textInput: {
        flex: 1,
        backgroundColor: theme.colors.background.tertiary,
        borderRadius: theme.borderRadius.full,
        paddingHorizontal: theme.spacing[4],
        paddingVertical: theme.spacing[2],
        fontSize: 16,
        color: theme.colors.text.primary,
        maxHeight: 120,
    },
    attachmentsPreview: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: theme.spacing[4],
        paddingBottom: theme.spacing[2],
        backgroundColor: theme.colors.background.secondary,
    },
    attachmentChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background.tertiary,
        borderRadius: theme.borderRadius.full,
        paddingVertical: theme.spacing[1],
        paddingHorizontal: theme.spacing[3],
        marginRight: theme.spacing[2],
        marginBottom: theme.spacing[2],
    },
    attachmentText: {
        color: theme.colors.text.secondary,
        marginLeft: theme.spacing[2],
        marginRight: theme.spacing[1],
        maxWidth: 100,
    },
});