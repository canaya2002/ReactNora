// src/contexts/ConversationContext.tsx - CONTEXTO DE CONVERSACIONES (CORREGIDO)
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { LocalConversationStorage } from '../lib/ConversationStorage';
import { cloudFunctions } from '../lib/firebase';
import { Conversation, ChatMessage, SpecialtyType } from '../lib/types';
import { useOnlineStatus } from '../hooks';
import Toast from 'react-native-toast-message';
import { Share, Alert } from 'react-native';
import { v4 as uuidv4 } from 'uuid';

// ========================================
// INTERFACES
// ========================================
interface ConversationContextType {
  // Estado
  conversations: Conversation[];
  currentConversation: Conversation | null;
  isLoading: boolean;
  error: string | null;
  
  // Acciones de conversación
  startNewConversation: (specialist?: SpecialtyType) => Promise<Conversation>;
  loadConversation: (conversationId: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  archiveConversation: (conversationId: string) => Promise<void>;
  duplicateConversation: (conversationId: string) => Promise<void>;
  shareConversation: (conversationId: string) => Promise<void>;
  toggleFavoriteConversation: (conversationId: string) => Promise<void>;
  updateConversationTitle: (conversationId: string, title: string) => Promise<void>;
  addTagToConversation: (conversationId: string, tag: string) => Promise<void>;
  removeTagFromConversation: (conversationId: string, tag: string) => Promise<void>;
  
  // Acciones de mensajes
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => Promise<void>;
  updateMessage: (messageId: string, updates: Partial<ChatMessage>) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  regenerateMessage: (messageId: string) => Promise<void>;
  
  // Utilidades
  refreshConversations: () => Promise<void>;
  searchConversations: (query: string) => Conversation[];
  getConversationStats: () => {
    total: number;
    archived: number;
    favorites: number;
    totalMessages: number;
  };
  
  // Borradores
  saveDraft: (message: string) => Promise<void>;
  getDraft: () => Promise<string>;
  clearDraft: () => Promise<void>;
}

const ConversationContext = createContext<ConversationContextType>({} as ConversationContextType);

interface ConversationProviderProps {
  children: ReactNode;
}

// ========================================
// PROVIDER COMPONENT
// ========================================
export const ConversationProvider: React.FC<ConversationProviderProps> = ({ children }) => {
  const { user, userProfile } = useAuth();
  const { isOnline } = useOnlineStatus();
  
  // Estados
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Instancia de storage
  const storage = LocalConversationStorage;

  // ========================================
  // EFECTOS
  // ========================================
  useEffect(() => {
    if (user) {
      loadAllConversations();
    } else {
      // Usuario no autenticado - limpiar estado
      setConversations([]);
      setCurrentConversation(null);
      setError(null);
    }
  }, [user]);

  // ========================================
  // CARGA INICIAL
  // ========================================
  const loadAllConversations = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      const result = await storage.getAllConversations();
      
      if (result.success && result.data) {
        setConversations(result.data);
      } else {
        console.error('Error loading conversations:', result.error);
        setError(result.error || 'Error cargando conversaciones');
      }
    } catch (error: any) {
      console.error('Error in loadAllConversations:', error);
      setError('Error cargando conversaciones');
    } finally {
      setIsLoading(false);
    }
  };

  // ========================================
  // ACCIONES DE CONVERSACIÓN
  // ========================================
  const startNewConversation = useCallback(async (specialist?: SpecialtyType): Promise<Conversation> => {
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    try {
      setError(null);
      
      const newConversation: Conversation = {
        id: uuidv4(),
        userId: user.uid,
        title: 'Nueva conversación',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActivity: new Date(),
        messageCount: 0,
        isArchived: false,
        isFavorite: false,
        specialist,
        tags: []
      };

      // Guardar en storage local
      const result = await storage.saveConversation(newConversation);
      
      if (result.success && result.data) {
        setConversations(prev => [result.data!, ...prev]);
        setCurrentConversation(result.data!);
        
        // Sincronizar con backend si está online
        if (isOnline) {
          try {
            await cloudFunctions.createConversation(newConversation);
          } catch (syncError) {
            console.warn('Failed to sync new conversation to backend:', syncError);
          }
        }
        
        return result.data!;
      } else {
        throw new Error(result.error || 'Error creando conversación');
      }
    } catch (error: any) {
      console.error('Error creating new conversation:', error);
      setError(error.message);
      throw error;
    }
  }, [user, isOnline]);

  const loadConversation = useCallback(async (conversationId: string): Promise<void> => {
    try {
      setError(null);
      
      const result = await storage.getConversation(conversationId);
      
      if (result.success && result.data) {
        setCurrentConversation(result.data);
      } else {
        throw new Error(result.error || 'Conversación no encontrada');
      }
    } catch (error: any) {
      console.error('Error loading conversation:', error);
      setError(error.message);
      throw error;
    }
  }, []);

  const deleteConversation = useCallback(async (conversationId: string): Promise<void> => {
    try {
      setError(null);
      
      // Eliminar del storage local
      const result = await storage.deleteConversation(conversationId);
      
      if (result.success) {
        setConversations(prev => prev.filter(conv => conv.id !== conversationId));
        
        if (currentConversation?.id === conversationId) {
          setCurrentConversation(null);
        }
        
        // Sincronizar con backend si está online
        if (isOnline) {
          try {
            await cloudFunctions.deleteConversation(conversationId);
          } catch (syncError) {
            console.warn('Failed to sync deletion to backend:', syncError);
          }
        }
        
        Toast.show({
          type: 'success',
          text1: 'Conversación eliminada',
          position: 'bottom'
        });
      } else {
        throw new Error(result.error || 'Error eliminando conversación');
      }
    } catch (error: any) {
      console.error('Error deleting conversation:', error);
      setError(error.message);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message,
        position: 'bottom'
      });
      throw error;
    }
  }, [currentConversation, isOnline]);

  const archiveConversation = useCallback(async (conversationId: string): Promise<void> => {
    try {
      setError(null);
      
      const result = await storage.toggleArchive(conversationId);
      
      if (result.success && result.data) {
        setConversations(prev => 
          prev.map(conv => 
            conv.id === conversationId ? result.data! : conv
          )
        );
        
        if (currentConversation?.id === conversationId) {
          setCurrentConversation(result.data);
        }
        
        Toast.show({
          type: 'success',
          text1: result.data.isArchived ? 'Conversación archivada' : 'Conversación restaurada',
          position: 'bottom'
        });
      } else {
        throw new Error(result.error || 'Error archivando conversación');
      }
    } catch (error: any) {
      console.error('Error archiving conversation:', error);
      setError(error.message);
      throw error;
    }
  }, [currentConversation]);

  const duplicateConversation = useCallback(async (conversationId: string): Promise<void> => {
    try {
      setError(null);
      
      const originalResult = await storage.getConversation(conversationId);
      if (!originalResult.success || !originalResult.data) {
        throw new Error('Conversación no encontrada');
      }
      
      const original = originalResult.data;
      const duplicate: Conversation = {
        ...original,
        id: uuidv4(),
        title: `${original.title} (Copia)`,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastActivity: new Date(),
        isArchived: false,
        isFavorite: false
      };
      
      const saveResult = await storage.saveConversation(duplicate);
      if (saveResult.success && saveResult.data) {
        setConversations(prev => [saveResult.data!, ...prev]);
        
        Toast.show({
          type: 'success',
          text1: 'Conversación duplicada',
          position: 'bottom'
        });
      }
    } catch (error: any) {
      console.error('Error duplicating conversation:', error);
      setError(error.message);
      throw error;
    }
  }, []);

  const shareConversation = useCallback(async (conversationId: string): Promise<void> => {
    try {
      const result = await storage.getConversation(conversationId);
      if (!result.success || !result.data) {
        throw new Error('Conversación no encontrada');
      }
      
      const conversation = result.data;
      const messages = conversation.messages
        .map(msg => `${msg.type === 'user' ? 'Usuario' : 'Asistente'}: ${msg.message}`)
        .join('\n\n');
      
      const shareContent = `Conversación: ${conversation.title}\n\n${messages}`;
      
      await Share.share({
        message: shareContent,
        title: conversation.title
      });
    } catch (error: any) {
      console.error('Error sharing conversation:', error);
      if (error.message !== 'User did not share') {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'No se pudo compartir la conversación',
          position: 'bottom'
        });
      }
    }
  }, []);

  const toggleFavoriteConversation = useCallback(async (conversationId: string): Promise<void> => {
    try {
      setError(null);
      
      const result = await storage.toggleFavorite(conversationId);
      
      if (result.success && result.data) {
        setConversations(prev => 
          prev.map(conv => 
            conv.id === conversationId ? result.data! : conv
          )
        );
        
        if (currentConversation?.id === conversationId) {
          setCurrentConversation(result.data);
        }
        
        Toast.show({
          type: 'success',
          text1: result.data.isFavorite ? 'Agregada a favoritos' : 'Removida de favoritos',
          position: 'bottom'
        });
      } else {
        throw new Error(result.error || 'Error actualizando favorito');
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      setError(error.message);
    }
  }, [currentConversation]);

  const updateConversationTitle = useCallback(async (conversationId: string, title: string): Promise<void> => {
    try {
      setError(null);
      
      const conversationResult = await storage.getConversation(conversationId);
      if (!conversationResult.success || !conversationResult.data) {
        throw new Error('Conversación no encontrada');
      }
      
      const updatedConversation = {
        ...conversationResult.data,
        title,
        updatedAt: new Date()
      };
      
      const result = await storage.saveConversation(updatedConversation);
      
      if (result.success && result.data) {
        setConversations(prev => 
          prev.map(conv => 
            conv.id === conversationId ? result.data! : conv
          )
        );
        
        if (currentConversation?.id === conversationId) {
          setCurrentConversation(result.data);
        }
      } else {
        throw new Error(result.error || 'Error actualizando título');
      }
    } catch (error: any) {
      console.error('Error updating conversation title:', error);
      setError(error.message);
      throw error;
    }
  }, [currentConversation]);

  const addTagToConversation = useCallback(async (conversationId: string, tag: string): Promise<void> => {
    try {
      const conversationResult = await storage.getConversation(conversationId);
      if (!conversationResult.success || !conversationResult.data) {
        throw new Error('Conversación no encontrada');
      }
      
      const conversation = conversationResult.data;
      const currentTags = conversation.tags || [];
      
      if (!currentTags.includes(tag)) {
        const updatedConversation = {
          ...conversation,
          tags: [...currentTags, tag],
          updatedAt: new Date()
        };
        
        const result = await storage.saveConversation(updatedConversation);
        if (result.success && result.data) {
          setConversations(prev => 
            prev.map(conv => 
              conv.id === conversationId ? result.data! : conv
            )
          );
          
          if (currentConversation?.id === conversationId) {
            setCurrentConversation(result.data);
          }
        }
      }
    } catch (error: any) {
      console.error('Error adding tag:', error);
      setError(error.message);
    }
  }, [currentConversation]);

  const removeTagFromConversation = useCallback(async (conversationId: string, tag: string): Promise<void> => {
    try {
      const conversationResult = await storage.getConversation(conversationId);
      if (!conversationResult.success || !conversationResult.data) {
        throw new Error('Conversación no encontrada');
      }
      
      const conversation = conversationResult.data;
      const currentTags = conversation.tags || [];
      
      const updatedConversation = {
        ...conversation,
        tags: currentTags.filter(t => t !== tag),
        updatedAt: new Date()
      };
      
      const result = await storage.saveConversation(updatedConversation);
      if (result.success && result.data) {
        setConversations(prev => 
          prev.map(conv => 
            conv.id === conversationId ? result.data! : conv
          )
        );
        
        if (currentConversation?.id === conversationId) {
          setCurrentConversation(result.data);
        }
      }
    } catch (error: any) {
      console.error('Error removing tag:', error);
      setError(error.message);
    }
  }, [currentConversation]);

  // ========================================
  // ACCIONES DE MENSAJES
  // ========================================
  const addMessage = useCallback(async (message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<void> => {
    if (!currentConversation) {
      throw new Error('No hay conversación activa');
    }

    try {
      setError(null);
      
      const newMessage: ChatMessage = {
        ...message,
        id: uuidv4(),
        timestamp: new Date()
      };

      const result = await storage.addMessageToConversation(currentConversation.id, newMessage);
      
      if (result.success && result.data) {
        setCurrentConversation(result.data);
        setConversations(prev => 
          prev.map(conv => 
            conv.id === currentConversation.id ? result.data! : conv
          )
        );
        
        // Auto-generar título si es el primer mensaje del usuario
        if (result.data.messages.length === 1 && message.type === 'user') {
          const title = message.message.slice(0, 50) + (message.message.length > 50 ? '...' : '');
          await updateConversationTitle(currentConversation.id, title);
        }
      } else {
        throw new Error(result.error || 'Error agregando mensaje');
      }
    } catch (error: any) {
      console.error('Error adding message:', error);
      setError(error.message);
      throw error;
    }
  }, [currentConversation, updateConversationTitle]);

  const updateMessage = useCallback(async (messageId: string, updates: Partial<ChatMessage>): Promise<void> => {
    if (!currentConversation) {
      throw new Error('No hay conversación activa');
    }

    try {
      setError(null);
      
      const result = await storage.updateMessageInConversation(currentConversation.id, messageId, updates);
      
      if (result.success && result.data) {
        setCurrentConversation(result.data);
        setConversations(prev => 
          prev.map(conv => 
            conv.id === currentConversation.id ? result.data! : conv
          )
        );
      } else {
        throw new Error(result.error || 'Error actualizando mensaje');
      }
    } catch (error: any) {
      console.error('Error updating message:', error);
      setError(error.message);
      throw error;
    }
  }, [currentConversation]);

  const deleteMessage = useCallback(async (messageId: string): Promise<void> => {
    if (!currentConversation) {
      throw new Error('No hay conversación activa');
    }

    try {
      setError(null);
      
      const result = await storage.deleteMessageFromConversation(currentConversation.id, messageId);
      
      if (result.success && result.data) {
        setCurrentConversation(result.data);
        setConversations(prev => 
          prev.map(conv => 
            conv.id === currentConversation.id ? result.data! : conv
          )
        );
      } else {
        throw new Error(result.error || 'Error eliminando mensaje');
      }
    } catch (error: any) {
      console.error('Error deleting message:', error);
      setError(error.message);
      throw error;
    }
  }, [currentConversation]);

  const regenerateMessage = useCallback(async (messageId: string): Promise<void> => {
    if (!currentConversation) {
      throw new Error('No hay conversación activa');
    }

    try {
      setError(null);
      
      const message = currentConversation.messages.find(msg => msg.id === messageId);
      if (!message || message.type === 'user') {
        throw new Error('Solo se pueden regenerar mensajes del asistente');
      }

      // Marcar mensaje como regenerándose
      await updateMessage(messageId, { isTyping: true });
      
      // Aquí iría la lógica de regeneración con la AI
      // Por ahora solo simularemos la regeneración
      setTimeout(async () => {
        await updateMessage(messageId, {
          message: message.message + ' (Regenerado)',
          isTyping: false
        });
      }, 2000);
      
    } catch (error: any) {
      console.error('Error regenerating message:', error);
      setError(error.message);
      throw error;
    }
  }, [currentConversation, updateMessage]);

  // ========================================
  // UTILIDADES
  // ========================================
  const refreshConversations = useCallback(async (): Promise<void> => {
    await loadAllConversations();
  }, []);

  const searchConversations = useCallback((query: string): Conversation[] => {
    if (!query.trim()) return conversations;
    
    const searchTerm = query.toLowerCase();
    return conversations.filter(conversation => {
      return (
        conversation.title.toLowerCase().includes(searchTerm) ||
        conversation.messages.some(message => 
          message.message.toLowerCase().includes(searchTerm)
        ) ||
        conversation.tags?.some(tag => 
          tag.toLowerCase().includes(searchTerm)
        )
      );
    });
  }, [conversations]);

  const getConversationStats = useCallback(() => {
    const total = conversations.length;
    const archived = conversations.filter(conv => conv.isArchived).length;
    const favorites = conversations.filter(conv => conv.isFavorite).length;
    const totalMessages = conversations.reduce((sum, conv) => sum + conv.messageCount, 0);
    
    return { total, archived, favorites, totalMessages };
  }, [conversations]);

  // ========================================
  // BORRADORES
  // ========================================
  const saveDraft = useCallback(async (message: string): Promise<void> => {
    if (!currentConversation) return;
    
    try {
      await storage.saveDraft(currentConversation.id, message);
    } catch (error: any) {
      console.error('Error saving draft:', error);
    }
  }, [currentConversation]);

  const getDraft = useCallback(async (): Promise<string> => {
    if (!currentConversation) return '';
    
    try {
      const result = await storage.getDraft(currentConversation.id);
      return result.success ? (result.data || '') : '';
    } catch (error: any) {
      console.error('Error getting draft:', error);
      return '';
    }
  }, [currentConversation]);

  const clearDraft = useCallback(async (): Promise<void> => {
    if (!currentConversation) return;
    
    try {
      await storage.clearDraft(currentConversation.id);
    } catch (error: any) {
      console.error('Error clearing draft:', error);
    }
  }, [currentConversation]);

  // ========================================
  // VALOR DEL CONTEXTO
  // ========================================
  const value: ConversationContextType = {
    // Estado
    conversations,
    currentConversation,
    isLoading,
    error,
    
    // Acciones de conversación
    startNewConversation,
    loadConversation,
    deleteConversation,
    archiveConversation,
    duplicateConversation,
    shareConversation,
    toggleFavoriteConversation,
    updateConversationTitle,
    addTagToConversation,
    removeTagFromConversation,
    
    // Acciones de mensajes
    addMessage,
    updateMessage,
    deleteMessage,
    regenerateMessage,
    
    // Utilidades
    refreshConversations,
    searchConversations,
    getConversationStats,
    
    // Borradores
    saveDraft,
    getDraft,
    clearDraft
  };

  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  );
};

// ========================================
// HOOK PERSONALIZADO
// ========================================
export const useConversations = (): ConversationContextType => {
  const context = useContext(ConversationContext);
  
  if (!context) {
    throw new Error('useConversations debe ser usado dentro de ConversationProvider');
  }
  
  return context;
};