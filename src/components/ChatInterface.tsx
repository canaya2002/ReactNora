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
import { ChatMessage, FileAttachment, SpecialtyType } from '../lib/types';
import { helpers, cloudFunctions } from '../lib/firebase';

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
// DATOS DE ESPECIALISTAS
// ========================================
const specialists: SpecialistOption[] = [
  {
    id: 'general',
    name: 'General',
    description: 'Asistente general para cualquier tarea',
    icon: 'chatbubble',
    color: theme.colors.primary[500]
  },
  {
    id: 'programming',
    name: 'Programación',
    description: 'Experto en desarrollo de software',
    icon: 'code-slash',
    color: '#61DAFB'
  },
  {
    id: 'writing',
    name: 'Escritura',
    description: 'Asistente para redacción y creatividad',
    icon: 'create',
    color: '#FF6B6B'
  },
  {
    id: 'analysis',
    name: 'Análisis',
    description: 'Análisis de datos y documentos',
    icon: 'analytics',
    color: '#4ECDC4'
  },
  {
    id: 'business',
    name: 'Negocios',
    description: 'Estrategia y consultoría empresarial',
    icon: 'briefcase',
    color: '#A8E6CF'
  },
  {
    id: 'science',
    name: 'Ciencia',
    description: 'Investigación y conocimiento científico',
    icon: 'flask',
    color: '#FF8A80'
  }
];

const { width } = Dimensions.get('window');

// ========================================
// COMPONENTE PRINCIPAL
// ========================================
export default function ChatInterface({ conversationId }: ChatInterfaceProps) {
  const { user, userProfile } = useAuth();
  const { 
    currentConversation, 
    loadConversation, 
    startNewConversation, 
    addMessage, 
    saveDraft, 
    getDraft, 
    clearDraft 
  } = useConversations();
  
  const { sendMessage, isTyping } = useChat();
  const { keyboardHeight, isKeyboardVisible } = useKeyboard();
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript
  } = useSpeechRecognition();
  const { isSpeaking, speak, stop } = useTextToSpeech();

  // Estados locales
  const [inputText, setInputText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<FileAttachment[]>([]);
  const [showSpecialistSelector, setShowSpecialistSelector] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showFileUploader, setShowFileUploader] = useState(false);

  // Referencias
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  // Valores animados
  const inputOpacity = useSharedValue(1);

  // ========================================
  // EFECTOS
  // ========================================
  useEffect(() => {
    if (conversationId && conversationId !== currentConversation?.id) {
      loadConversation(conversationId);
    }
  }, [conversationId, currentConversation?.id, loadConversation]);

  useEffect(() => {
    // Cargar borrador al cargar conversación
    if (currentConversation) {
      loadDraft();
    }
  }, [currentConversation]);

  useEffect(() => {
    // Agregar transcript del reconocimiento de voz
    if (transcript) {
      setInputText(prev => prev + transcript);
      resetTranscript();
    }
  }, [transcript, resetTranscript]);

  useEffect(() => {
    // Manejar botón de atrás en Android
    const backAction = () => {
      if (showSpecialistSelector || showFileUploader) {
        setShowSpecialistSelector(false);
        setShowFileUploader(false);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [showSpecialistSelector, showFileUploader]);

  useEffect(() => {
    // Scroll automático cuando hay nuevos mensajes
    if (currentConversation?.messages && isAtBottom) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [currentConversation?.messages?.length, isAtBottom]);

  useEffect(() => {
    // Control de scroll to bottom
    const messagesLength = currentConversation?.messages?.length || 0;
    setShowScrollToBottom(!isAtBottom && messagesLength > 0);
  }, [isAtBottom, currentConversation?.messages?.length]);

  // ========================================
  // HANDLERS
  // ========================================
  const loadDraft = useCallback(async () => {
    try {
      const draft = await getDraft();
      if (draft && draft !== inputText) {
        setInputText(draft);
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  }, [getDraft, inputText]);

  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim() && selectedFiles.length === 0) return;
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para enviar mensajes');
      return;
    }

    try {
      // Crear nuevo mensaje
      const messageText = inputText.trim();
      const messageAttachments = selectedFiles.length > 0 ? selectedFiles : undefined;

      // Limpiar input
      setInputText('');
      setSelectedFiles([]);
      clearDraft();

      // Si no hay conversación activa, crear una nueva
      let conversation = currentConversation;
      if (!conversation) {
        conversation = await startNewConversation();
      }

      // Agregar mensaje del usuario
      await addMessage({
        message: messageText || 'Archivos adjuntos',
        type: 'user',
        fileAttachments: messageAttachments
      });

      // Enviar mensaje a la AI
      try {
        const response = await cloudFunctions.chatWithAI({
          message: messageText,
          chatHistory: conversation.messages.slice(-10), // Últimos 10 mensajes para contexto
          specialist: conversation.specialist,
          fileAttachments: messageAttachments,
          userId: user.uid
        });

        // Agregar respuesta de la AI
        await addMessage({
          message: response.response,
          type: 'assistant',
          metadata: {
            model: response.model,
            tokensUsed: response.tokensUsed
          }
        });

        // Vibración de confirmación
        if (Platform.OS !== 'web') {
          Vibration.vibrate(50);
        }

      } catch (aiError: any) {
        console.error('AI Error:', aiError);
        
        // Agregar mensaje de error
        await addMessage({
          message: 'Lo siento, hubo un error procesando tu mensaje. Por favor intenta de nuevo.',
          type: 'assistant'
        });

        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'No se pudo procesar el mensaje',
          position: 'bottom'
        });
      }

    } catch (error: any) {
      console.error('Send message error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Error enviando mensaje',
        position: 'bottom'
      });
    }
  }, [inputText, selectedFiles, user, currentConversation, startNewConversation, addMessage, clearDraft]);

  const handleInputChange = useCallback((text: string) => {
    setInputText(text);
    
    // Guardar borrador automáticamente
    if (currentConversation) {
      saveDraft(text);
    }
  }, [currentConversation, saveDraft]);

  const handleScroll = useCallback((event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    const isBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
    setIsAtBottom(isBottom);
  }, []);

  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, []);

  const handleCopyMessage = useCallback((text: string) => {
    Clipboard.setString(text);
    Toast.show({
      type: 'success',
      text1: 'Copiado',
      text2: 'Mensaje copiado al portapapeles',
      position: 'bottom'
    });
  }, []);

  const handleSpeakMessage = useCallback((text: string) => {
    if (isSpeaking) {
      stop();
    } else {
      speak(text);
    }
  }, [isSpeaking, speak, stop]);

  const handleVoiceInput = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const handleStartNewConversation = useCallback(async (specialist?: SpecialtyType) => {
    try {
      await startNewConversation(specialist);
      setShowSpecialistSelector(false);
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo crear la conversación');
    }
  }, [startNewConversation]);

  // ========================================
  // COMPONENTES DE RENDERIZADO
  // ========================================
  const MessageItem = ({ message, index, onCopy, onSpeak, onRegenerate, onDelete }: MessageItemProps) => {
    const isUser = message.type === 'user';
    const isLast = index === (currentConversation?.messages?.length || 0) - 1;

    const messageStyles: any[] = [
      styles.messageContainer,
      isUser ? styles.userMessage : styles.assistantMessage,
      { alignSelf: isUser ? 'flex-end' : 'flex-start' },
      { flexDirection: isUser ? 'row-reverse' : 'row' }
    ].filter(Boolean);

    return (
      <Animated.View
        entering={FadeIn}
        layout={Layout.springify()}
        style={messageStyles}
      >
        <Card style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.assistantBubble
        ]}>
          {/* Archivos adjuntos */}
          {message.fileAttachments && message.fileAttachments.length > 0 && (
            <View style={styles.attachmentsContainer}>
              {message.fileAttachments.map((file, index) => (
                <View key={index} style={styles.attachmentItem}>
                  <Ionicons
                    name="document"
                    size={16}
                    color={theme.colors.text.secondary}
                  />
                  <Text style={styles.attachmentName} numberOfLines={1}>
                    {file.name}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Contenido del mensaje */}
          {isUser ? (
            <Text style={styles.messageText}>{message.message}</Text>
          ) : (
            <Markdown style={markdownStyles}>
              {message.message}
            </Markdown>
          )}

          {/* Indicador de escritura */}
          {message.isTyping && (
            <View style={styles.typingIndicator}>
              <Text style={styles.typingText}>Escribiendo...</Text>
            </View>
          )}

          {/* Timestamp y acciones */}
          <View style={styles.messageFooter}>
            <Text style={styles.timestamp}>
              {new Date(message.timestamp).toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>

            {!isUser && !message.isTyping && (
              <View style={styles.messageActions}>
                <IconButton
                  icon={<Ionicons name="copy" size={16} color={theme.colors.text.secondary} />}
                  onPress={() => onCopy(message.message)}
                  variant="ghost"
                  size="sm"
                />
                <IconButton
                  icon={
                    <Ionicons 
                      name={isSpeaking ? "volume-high" : "volume-medium"} 
                      size={16} 
                      color={theme.colors.text.secondary} 
                    />
                  }
                  onPress={() => onSpeak(message.message)}
                  variant="ghost"
                  size="sm"
                />
                {isLast && onRegenerate && (
                  <IconButton
                    icon={<Ionicons name="refresh" size={16} color={theme.colors.text.secondary} />}
                    onPress={onRegenerate}
                    variant="ghost"
                    size="sm"
                  />
                )}
              </View>
            )}
          </View>
        </Card>
      </Animated.View>
    );
  };

  const SpecialistSelector = () => (
    <CustomModal
      visible={showSpecialistSelector}
      onClose={() => setShowSpecialistSelector(false)}
      title="Elegir especialista"
      size="lg"
    >
      <View style={styles.specialistGrid}>
        {specialists.map((specialist) => (
          <TouchableOpacity
            key={specialist.id}
            style={[
              styles.specialistOption,
              currentConversation?.specialist === specialist.id && styles.specialistOptionActive
            ]}
            onPress={() => handleStartNewConversation(specialist.id)}
          >
            <View style={[styles.specialistIcon, { backgroundColor: `${specialist.color}20` }]}>
              <Ionicons 
                name={specialist.icon as any} 
                size={24} 
                color={specialist.color} 
              />
            </View>
            <Text style={styles.specialistName}>{specialist.name}</Text>
            <Text style={styles.specialistDescription}>{specialist.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </CustomModal>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubbles-outline" size={64} color={theme.colors.text.tertiary} />
      <Text style={styles.emptyStateTitle}>¡Hola! Soy NORA</Text>
      <Text style={styles.emptyStateText}>
        ¿En qué puedo ayudarte hoy? Puedes elegir un especialista o simplemente escribir tu pregunta.
      </Text>
      <Button
        title="Elegir especialista"
        onPress={() => setShowSpecialistSelector(true)}
        icon={<Ionicons name="people" size={20} color="#ffffff" />}
        style={styles.emptyStateButton}
      />
    </View>
  );

  // ========================================
  // RENDER PRINCIPAL
  // ========================================
  const hasMessages = currentConversation?.messages && currentConversation.messages.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" backgroundColor={theme.colors.background.primary} />
      
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Lista de mensajes */}
        <View style={styles.messagesContainer}>
          {!hasMessages ? (
            <EmptyState />
          ) : (
            <FlatList
              ref={flatListRef}
              data={currentConversation?.messages || []}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <MessageItem
                  message={item}
                  index={index}
                  onCopy={handleCopyMessage}
                  onSpeak={handleSpeakMessage}
                  onRegenerate={() => {/* Implementar regeneración */}}
                  onDelete={() => {/* Implementar eliminación */}}
                />
              )}
              onScroll={handleScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.messagesList}
              maintainVisibleContentPosition={{
                minIndexForVisible: 0,
                autoscrollToTopThreshold: 100
              }}
            />
          )}

          {/* Indicador de escritura */}
          {isTyping && (
            <View style={styles.typingContainer}>
              <Loading size="small" color={theme.colors.primary[500]} />
              <Text style={styles.typingLabel}>NORA está escribiendo...</Text>
            </View>
          )}
        </View>

        {/* Botón de scroll to bottom */}
        {showScrollToBottom && (
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            style={styles.scrollToBottomContainer}
          >
            <TouchableOpacity
              style={styles.scrollToBottomButton}
              onPress={scrollToBottom}
            >
              <Ionicons name="chevron-down" size={24} color={theme.colors.primary[500]} />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Área de input */}
        <Animated.View style={[styles.inputContainer, { opacity: inputOpacity.value }]}>
          <BlurView intensity={20} tint="light" style={styles.inputBlur}>
            {/* Archivos seleccionados */}
            {selectedFiles.length > 0 && (
              <View style={styles.selectedFilesPreview}>
                {selectedFiles.map((file, index) => (
                  <View key={file.id} style={styles.selectedFileItem}>
                    <Ionicons name="document" size={16} color={theme.colors.text.secondary} />
                    <Text style={styles.selectedFileName} numberOfLines={1}>
                      {file.name}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setSelectedFiles(prev => prev.filter(f => f.id !== file.id))}
                    >
                      <Ionicons name="close" size={16} color={theme.colors.text.secondary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.inputRow}>
              {/* Botones de acción */}
              <View style={styles.inputActions}>
                <IconButton
                  icon={<Ionicons name="attach" size={20} color={theme.colors.text.secondary} />}
                  onPress={() => setShowFileUploader(true)}
                  variant="ghost"
                  size="sm"
                />
                
                <IconButton
                  icon={
                    <Ionicons 
                      name={isListening ? "mic" : "mic-outline"} 
                      size={20} 
                      color={isListening ? theme.colors.error[500] : theme.colors.text.secondary} 
                    />
                  }
                  onPress={handleVoiceInput}
                  variant="ghost"
                  size="sm"
                />
              </View>

              {/* Input de texto */}
              <TextInput
                ref={inputRef}
                style={styles.textInput}
                value={inputText}
                onChangeText={handleInputChange}
                placeholder="Escribe un mensaje..."
                placeholderTextColor={theme.colors.text.tertiary}
                multiline
                maxLength={4000}
                textAlignVertical="center"
              />

              {/* Botón de enviar */}
              <IconButton
                icon={<Ionicons name="send" size={20} color="#ffffff" />}
                onPress={handleSendMessage}
                disabled={!inputText.trim() && selectedFiles.length === 0}
                variant="filled"
                color={theme.colors.primary[500]}
                size="md"
              />
            </View>
          </BlurView>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* Modales */}
      <SpecialistSelector />
      
      <CustomModal
        visible={showFileUploader}
        onClose={() => setShowFileUploader(false)}
        title="Adjuntar archivos"
        size="lg"
      >
        <FileUploader
          onFilesSelected={(files) => {
            setSelectedFiles(files);
            setShowFileUploader(false);
          }}
          maxFiles={3}
          initialFiles={selectedFiles}
        />
      </CustomModal>
    </SafeAreaView>
  );
}

// ========================================
// ESTILOS
// ========================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  keyboardAvoid: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  messageContainer: {
    marginVertical: theme.spacing.xs,
    maxWidth: '85%',
    padding: theme.spacing.sm,
  },
  userMessage: {
    backgroundColor: theme.colors.primary[500],
    alignSelf: 'flex-end',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
  },
  messageBubble: {
    flex: 1,
    marginHorizontal: theme.spacing.xs,
  },
  userBubble: {
    backgroundColor: theme.colors.primary[500],
  },
  assistantBubble: {
    backgroundColor: theme.colors.surface.secondary,
  },
  messageText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.primary,
    lineHeight: 20,
  },
  attachmentsContainer: {
    marginBottom: theme.spacing.sm,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface.tertiary,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
    gap: theme.spacing.xs,
  },
  attachmentName: {
    flex: 1,
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  timestamp: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.tertiary,
  },
  messageActions: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  typingIndicator: {
    marginTop: theme.spacing.sm,
  },
  typingText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  typingLabel: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
  },
  scrollToBottomContainer: {
    position: 'absolute',
    right: theme.spacing.lg,
    bottom: 100,
  },
  scrollToBottomButton: {
    backgroundColor: theme.colors.surface.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.md,
  },
  inputContainer: {
    backgroundColor: 'transparent',
  },
  inputBlur: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  selectedFilesPreview: {
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  selectedFileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface.secondary,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  selectedFileName: {
    flex: 1,
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.primary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
  },
  inputActions: {
    flexDirection: 'row',
  },
  textInput: {
    flex: 1,
    backgroundColor: theme.colors.surface.secondary,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.primary,
    maxHeight: 100,
    textAlignVertical: 'top',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  emptyStateTitle: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight as any,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  emptyStateText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: theme.spacing.xl,
  },
  emptyStateButton: {
    marginTop: theme.spacing.md,
  },
  specialistGrid: {
    gap: theme.spacing.md,
  },
  specialistOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface.secondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  specialistOptionActive: {
    borderColor: theme.colors.primary[500],
    backgroundColor: `${theme.colors.primary[500]}10`,
  },
  specialistIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  specialistName: {
    fontSize: theme.typography.h4.fontSize,
    fontWeight: theme.typography.h4.fontWeight as any,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
    flex: 1,
  },
  specialistDescription: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
    flex: 2,
  },
});

// Estilos para Markdown
const markdownStyles = {
  body: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.primary,
    lineHeight: 20,
  },
  heading1: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  heading2: {
    fontSize: theme.typography.h4.fontSize,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  code_inline: {
    backgroundColor: theme.colors.surface.tertiary,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    fontSize: theme.typography.caption.fontSize,
    fontFamily: 'monospace',
  },
  code_block: {
    backgroundColor: theme.colors.surface.tertiary,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginVertical: theme.spacing.sm,
    fontSize: theme.typography.caption.fontSize,
    fontFamily: 'monospace',
  },
  link: {
    color: theme.colors.primary[500],
    textDecorationLine: 'underline',
  },
  list_item: {
    marginVertical: theme.spacing.xs,
  },
};