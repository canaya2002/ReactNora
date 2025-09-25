// src/components/ChatInterface.tsx - INTERFAZ DE CHAT (CORREGIDA)
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
  StatusBar,
  BackHandler,
  Vibration,
  Linking,
  Alert,
  Clipboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  FadeIn,
  FadeOut,
  Layout
} from 'react-native-reanimated';
import {
  Ionicons,
  MaterialIcons,
  FontAwesome5
} from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { Video } from 'expo-av';
import Toast from 'react-native-toast-message';

// Hooks y contextos
import { useAuth } from '../contexts/AuthContext';
import { useConversations } from '../contexts/ConversationContext';
import { useSpeechRecognition, useTextToSpeech, useChat, useKeyboard, usePermissions } from '../hooks';

// Componentes base
import { Button, Card, IconButton, Loading, CustomModal } from './base';
import FileUploader from './FileUploader';

// Estilos y tipos
import { theme } from '../styles/theme';
import { ChatMessage, FileAttachment, SpecialtyType, SPECIALISTS } from '../lib/types';
import { helpers, cloudFunctions } from '../lib/firebase';

const { width } = Dimensions.get('window');

// ========================================
// INTERFACES Y TIPOS
// ========================================
interface ChatInterfaceProps {
  conversationId?: string;
}

interface MessageItemProps {
  message: ChatMessage;
  index: number;
  onCopy: (text: string) => void;
  onSpeak: (text: string) => void;
  onRegenerate?: () => void;
  onDelete?: () => void;
}

interface SpecialistOption {
  id: SpecialtyType;
  name: string;
  description: string;
  icon: string;
  color: string;
}

// ========================================
// COMPONENTE PRINCIPAL
// ========================================
export default function ChatInterface({ conversationId }: ChatInterfaceProps) {
  const { user, userProfile } = useAuth();
  const {
    activeConversation,
    addMessage,
    createConversation,
    loadConversation,
    updateMessage,
    deleteMessage,
    saveDraft,
    getDraft,
    clearDraft
  } = useConversations();

  // Estados
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([]);
  const [showFileUploader, setShowFileUploader] = useState(false);
  const [showSpecialistModal, setShowSpecialistModal] = useState(false);
  const [selectedSpecialist, setSelectedSpecialist] = useState<SpecialtyType>('general');

  // Refs
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  // Hooks
  const { keyboardHeight } = useKeyboard();
  const { speak, isSpeaking, stop } = useTextToSpeech();
  const { transcript, isListening, startListening, stopListening } = useSpeechRecognition();

  // ========================================
  // EFECTOS
  // ========================================
  useEffect(() => {
    if (conversationId && conversationId !== activeConversation?.id) {
      loadConversation(conversationId);
    }
  }, [conversationId, activeConversation?.id, loadConversation]);

  useEffect(() => {
    if (transcript) {
      setInputText(prev => prev + (prev ? ' ' : '') + transcript);
    }
  }, [transcript]);

  useEffect(() => {
    // Cargar borrador cuando cambie la conversación
    const loadDraft = async () => {
      if (activeConversation) {
        const draft = await getDraft();
        if (draft && !inputText) {
          setInputText(draft);
        }
      }
    };
    loadDraft();
  }, [activeConversation, getDraft]);

  useEffect(() => {
    // Guardar borrador automáticamente
    const saveDraftTimer = setTimeout(() => {
      if (inputText.trim() && activeConversation) {
        saveDraft(inputText);
      }
    }, 1000);

    return () => clearTimeout(saveDraftTimer);
  }, [inputText, activeConversation, saveDraft]);

  // ========================================
  // FUNCIONES AUXILIARES
  // ========================================
  const scrollToBottom = useCallback(() => {
    if (flatListRef.current && activeConversation?.messages.length) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [activeConversation?.messages.length]);

  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim() && attachedFiles.length === 0) return;
    if (!user) return;

    const messageText = inputText.trim();
    const files = [...attachedFiles];

    // Limpiar input inmediatamente
    setInputText('');
    setAttachedFiles([]);
    
    // Limpiar borrador
    if (activeConversation) {
      clearDraft();
    }

    try {
      let conversation = activeConversation;

      // Si no hay conversación activa, crear una nueva
      if (!conversation) {
        conversation = await createConversation(selectedSpecialist);
      }

      // Crear mensaje del usuario
      const userMessage: Omit<ChatMessage, 'id' | 'timestamp'> = {
        message: messageText,
        content: messageText,
        type: 'user',
        role: 'user',
        attachments: files,
        fileAttachments: files
      };

      // Añadir mensaje del usuario
      await addMessage(userMessage);

      setIsTyping(true);
      scrollToBottom();

      // Mensaje temporal del asistente
      const assistantMessage: Omit<ChatMessage, 'id' | 'timestamp'> = {
        message: '',
        content: '',
        type: 'assistant',
        role: 'assistant',
        isTyping: true
      };

      await addMessage(assistantMessage);

      // Enviar a la IA
      const chatHistory = conversation.messages.slice(-10); // Últimos 10 mensajes
      
      const response = await cloudFunctions.chatWithAI({
        message: messageText,
        chatHistory,
        specialist: selectedSpecialist,
        fileAttachments: files,
        userId: user.uid
      });

      // Actualizar mensaje del asistente con la respuesta
      const finalAssistantMessage: Omit<ChatMessage, 'id' | 'timestamp'> = {
        message: response.response,
        content: response.response,
        type: 'assistant',
        role: 'assistant',
        isTyping: false,
        metadata: {
          model: response.model,
          tokensUsed: response.tokensUsed
        }
      };

      await addMessage(finalAssistantMessage);

    } catch (error: any) {
      console.error('Error sending message:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Error enviando mensaje'
      });
    } finally {
      setIsTyping(false);
      scrollToBottom();
    }
  }, [
    inputText,
    attachedFiles,
    user,
    activeConversation,
    selectedSpecialist,
    createConversation,
    addMessage,
    clearDraft,
    scrollToBottom
  ]);

  const handleCopyMessage = useCallback(async (text: string) => {
    try {
      await Clipboard.setString(text);
      Toast.show({
        type: 'success',
        text1: 'Copiado',
        text2: 'Mensaje copiado al portapapeles'
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  }, []);

  const handleSpeakMessage = useCallback((text: string) => {
    if (isSpeaking) {
      stop();
    } else {
      speak(text);
    }
  }, [speak, stop, isSpeaking]);

  const handleFileSelection = useCallback((files: FileAttachment[]) => {
    setAttachedFiles(prev => [...prev, ...files]);
    setShowFileUploader(false);
  }, []);

  const removeAttachedFile = useCallback((fileId: string) => {
    setAttachedFiles(prev => prev.filter(file => file.id !== fileId));
  }, []);

  // ========================================
  // COMPONENTE MENSAJE
  // ========================================
  const MessageItem = React.memo(({ message, index, onCopy, onSpeak }: MessageItemProps) => {
    const isUser = message.role === 'user';
    const messageOpacity = useSharedValue(0);

    useEffect(() => {
      messageOpacity.value = withTiming(1, { duration: 300 });
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
      opacity: messageOpacity.value,
      transform: [{ translateY: withTiming(0, { duration: 300 }) }]
    }));

    // CORREGIDO: Estilos corregidos para evitar conflictos de tipos
    const cardStyles = [
      styles.messageCard,
      isUser ? styles.userMessage : styles.assistantMessage
    ];

    return (
      <Animated.View style={[animatedStyle]} layout={Layout.springify()}>
        <Card style={cardStyles as any}>
          {/* Archivos adjuntos */}
          {message.attachments && message.attachments.length > 0 && (
            <View style={styles.attachmentsContainer}>
              {message.attachments.map((file: FileAttachment, index: number) => (
                <View key={index} style={styles.attachmentItem}>
                  <Ionicons 
                    name="document-outline" 
                    size={16} 
                    color={theme.colors.gray[600]} 
                  />
                  <Text style={styles.attachmentText}>{file.name}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Contenido del mensaje */}
          {message.isTyping ? (
            <View style={styles.typingIndicator}>
              <Text style={styles.typingText}>Escribiendo...</Text>
            </View>
          ) : message.content ? (
            <Markdown style={markdownStyles as any}>
              {message.content}
            </Markdown>
          ) : (
            <Text style={styles.messageText}>{message.message}</Text>
          )}

          {/* Acciones del mensaje */}
          {!message.isTyping && (
            <View style={styles.messageActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onCopy(message.content || message.message)}
              >
                <Ionicons name="copy-outline" size={16} color={theme.colors.gray[600]} />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onSpeak(message.content || message.message)}
              >
                <Ionicons 
                  name={isSpeaking ? "stop" : "volume-high-outline"} 
                  size={16} 
                  color={theme.colors.gray[600]} 
                />
              </TouchableOpacity>
              
              {!isUser && (
                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons name="refresh-outline" size={16} color={theme.colors.gray[600]} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </Card>
      </Animated.View>
    );
  });

  // ========================================
  // RENDERIZADO
  // ========================================
  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Debes iniciar sesión para usar el chat</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => setShowSpecialistModal(true)}>
            <View style={styles.specialistInfo}>
              <View style={[
                styles.specialistDot, 
                { backgroundColor: SPECIALISTS.find(s => s.id === selectedSpecialist)?.color || theme.colors.primary[500] }
              ]} />
              <Text style={styles.specialistName}>
                {SPECIALISTS.find(s => s.id === selectedSpecialist)?.name || 'General'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
        
        <View style={styles.headerRight}>
          <IconButton
            icon="attach"
            onPress={() => setShowFileUploader(true)}
            size="sm"
          />
        </View>
      </View>

      {/* Lista de mensajes */}
      <FlatList
        ref={flatListRef}
        data={activeConversation?.messages || []}
        keyExtractor={(item, index) => item.id || `message-${index}`}
        renderItem={({ item, index }) => (
          <MessageItem
            message={item}
            index={index}
            onCopy={handleCopyMessage}
            onSpeak={handleSpeakMessage}
          />
        )}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToBottom}
      />

      {/* Archivos adjuntos */}
      {attachedFiles.length > 0 && (
        <View style={styles.attachedFiles}>
          <FlatList
            data={attachedFiles}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.attachedFile}>
                <Text style={styles.attachedFileName} numberOfLines={1}>
                  {item.name}
                </Text>
                <TouchableOpacity
                  onPress={() => removeAttachedFile(item.id)}
                  style={styles.removeFileButton}
                >
                  <Ionicons name="close" size={16} color={theme.colors.gray[600]} />
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      )}

      {/* Input de mensaje */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Escribe tu mensaje..."
              placeholderTextColor={theme.colors.gray[400]}
              multiline
              maxLength={4000}
              editable={!isTyping}
            />
            
            <View style={styles.inputActions}>
              <TouchableOpacity
                onPress={isListening ? stopListening : startListening}
                style={[styles.inputButton, isListening && styles.listeningButton]}
              >
                <Ionicons 
                  name={isListening ? "stop" : "mic"} 
                  size={20} 
                  color={isListening ? theme.colors.red[500] : theme.colors.gray[600]} 
                />
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleSendMessage}
                style={[styles.sendButton, (!inputText.trim() && attachedFiles.length === 0) && styles.disabledButton]}
                disabled={!inputText.trim() && attachedFiles.length === 0}
              >
                <Ionicons name="send" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Modal de especialistas */}
      <CustomModal
        visible={showSpecialistModal}
        onClose={() => setShowSpecialistModal(false)}
        title="Seleccionar Especialista"
      >
        <FlatList
          data={SPECIALISTS}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.specialistOption,
                selectedSpecialist === item.id && styles.selectedSpecialist
              ]}
              onPress={() => {
                setSelectedSpecialist(item.id);
                setShowSpecialistModal(false);
              }}
            >
              <View style={[styles.specialistDot, { backgroundColor: item.color }]} />
              <View style={styles.specialistContent}>
                <Text style={styles.specialistOptionName}>{item.name}</Text>
                <Text style={styles.specialistDescription}>{item.description}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </CustomModal>

      {/* Modal de subida de archivos */}
      <CustomModal
        visible={showFileUploader}
        onClose={() => setShowFileUploader(false)}
        title="Adjuntar Archivos"
      >
        <FileUploader
          onFilesSelected={handleFileSelection}
          maxFiles={5}
          initialFiles={attachedFiles}
        />
      </CustomModal>

      {/* Indicador de escritura */}
      {isTyping && (
        <View style={styles.typingContainer}>
          <Loading size="small" />
          <Text style={styles.typingMessage}>El asistente está escribiendo...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// ========================================
// ESTILOS
// ========================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.gray[50]
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
    backgroundColor: 'white'
  },
  headerLeft: {
    flex: 1
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8
  },
  specialistInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  specialistDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  specialistName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.gray[900]
  },
  messagesList: {
    flex: 1
  },
  messagesContainer: {
    padding: 16,
    gap: 12
  },
  messageCard: {
    marginHorizontal: 0,
    marginVertical: 4,
    maxWidth: width * 0.8
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.primary[500]
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'white'
  },
  attachmentsContainer: {
    marginBottom: 8,
    gap: 4
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 4,
    backgroundColor: theme.colors.gray[100],
    borderRadius: 4
  },
  attachmentText: {
    fontSize: 12,
    color: theme.colors.gray[600]
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.gray[900]
  },
  typingIndicator: {
    paddingVertical: 8
  },
  typingText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: theme.colors.gray[500]
  },
  messageActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[100]
  },
  actionButton: {
    padding: 4,
    borderRadius: 4
  },
  attachedFiles: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
    backgroundColor: 'white'
  },
  attachedFile: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: theme.colors.blue[50],
    borderRadius: 8,
    maxWidth: 150
  },
  attachedFileName: {
    fontSize: 12,
    color: theme.colors.blue[700],
    flex: 1
  },
  removeFileButton: {
    marginLeft: 4,
    padding: 2
  },
  inputContainer: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8
  },
  textInput: {
    flex: 1,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.gray[50],
    borderRadius: 24,
    fontSize: 16,
    color: theme.colors.gray[900]
  },
  inputActions: {
    flexDirection: 'row',
    gap: 8
  },
  inputButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: theme.colors.gray[100]
  },
  listeningButton: {
    backgroundColor: theme.colors.red[100]
  },
  sendButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: theme.colors.primary[500]
  },
  disabledButton: {
    backgroundColor: theme.colors.gray[300]
  },
  specialistOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginVertical: 4,
    backgroundColor: theme.colors.gray[50]
  },
  selectedSpecialist: {
    backgroundColor: theme.colors.primary[50],
    borderWidth: 2,
    borderColor: theme.colors.primary[200]
  },
  specialistContent: {
    marginLeft: 12,
    flex: 1
  },
  specialistOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.gray[900],
    marginBottom: 2
  },
  specialistDescription: {
    fontSize: 14,
    color: theme.colors.gray[600]
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: theme.colors.blue[50],
    gap: 8
  },
  typingMessage: {
    fontSize: 14,
    color: theme.colors.blue[600]
  },
  errorText: {
    textAlign: 'center',
    fontSize: 16,
    color: theme.colors.gray[500],
    marginTop: 50
  }
});

// CORREGIDO: Estilos de Markdown corregidos
const markdownStyles = {
  body: {
    fontSize: 16,
    color: theme.colors.gray[900],
    lineHeight: 24
  },
  heading1: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: theme.colors.gray[900],
    marginBottom: 8
  },
  heading2: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: theme.colors.gray[900],
    marginBottom: 6
  },
  code_inline: {
    backgroundColor: theme.colors.gray[100],
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
  },
  code_block: {
    backgroundColor: theme.colors.gray[900],
    padding: 12,
    borderRadius: 8,
    marginVertical: 8
  },
  link: {
    color: theme.colors.primary[500],
    textDecorationLine: 'underline' as const
  },
  list_item: {
    marginVertical: 2
  }
};