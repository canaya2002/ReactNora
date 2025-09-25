// src/contexts/ConversationContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
// CORREGIDO: Import correcto
import { LocalConversationStorageInstance } from '../lib/ConversationStorage';
import { Conversation, ChatMessage, MessageType, SpecialtyType } from '../lib/types';
import { useAuth } from './AuthContext';

// ========================================
// INTERFACES
// ========================================
interface ConversationContextType {
  // Estado de conversaciones
  conversations: Conversation[];
  activeConversation: Conversation | null;
  loading: boolean;
  
  // Métodos de conversaciones
  createConversation: (title?: string, specialist?: SpecialtyType) => Promise<Conversation>;
  loadConversations: () => Promise<void>;
  setActiveConversationById: (conversationId: string) => Promise<void>;
  updateConversationTitle: (conversationId: string, title: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  clearActiveConversation: () => Promise<void>;
  
  // Métodos de mensajes
  addMessage: (conversationId: string, message: ChatMessage) => Promise<void>;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<ChatMessage>) => Promise<void>;
  deleteMessage: (conversationId: string, messageId: string) => Promise<void>;
  
  // Utilidades
  searchConversations: (query: string) => Promise<Conversation[]>;
  exportConversations: () => Promise<string>;
  importConversations: (data: string) => Promise<void>;
  getConversationStats: () => Promise<{
    totalConversations: number;
    totalMessages: number;
    totalTokens: number;
    averageMessagesPerConversation: number;
  }>;
  
  // Estado de carga para operaciones específicas
  isCreating: boolean;
  isDeleting: boolean;
  isUpdating: boolean;
}

interface ConversationProviderProps {
  children: ReactNode;
}

// ========================================
// CONTEXT
// ========================================
const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

export const useConversations = () => {
  const context = useContext(ConversationContext);
  if (context === undefined) {
    throw new Error('useConversations must be used within a ConversationProvider');
  }
  return context;
};

// ========================================
// PROVIDER
// ========================================
export const ConversationProvider: React.FC<ConversationProviderProps> = ({ children }) => {
  // Estados
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Hooks
  const { user } = useAuth();

  // ========================================
  // EFECTOS
  // ========================================
  useEffect(() => {
    if (user) {
      loadConversations();
      loadActiveConversation();
    } else {
      // Si no hay usuario, limpiar estado
      setConversations([]);
      setActiveConversation(null);
      setLoading(false);
    }
  }, [user]);

  // ========================================
  // FUNCIONES DE CARGA
  // ========================================
  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      const loadedConversations = await LocalConversationStorageInstance.getAllConversations();
      
      // Ordenar por fecha de actualización (más recientes primero)
      const sortedConversations = loadedConversations.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      
      setConversations(sortedConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadActiveConversation = useCallback(async () => {
    try {
      const activeConv = await LocalConversationStorageInstance.getActiveConversation();
      setActiveConversation(activeConv);
    } catch (error) {
      console.error('Error loading active conversation:', error);
    }
  }, []);

  // ========================================
  // MÉTODOS DE CONVERSACIONES
  // ========================================
  const createConversation = useCallback(async (
    title?: string, 
    specialist?: SpecialtyType
  ): Promise<Conversation> => {
    setIsCreating(true);
    
    try {
      const newConversation = await LocalConversationStorageInstance.createNewConversation(
        title, 
        specialist
      );
      
      // Actualizar estado local
      setConversations(prev => [newConversation, ...prev]);
      setActiveConversation(newConversation);
      
      return newConversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    } finally {
      setIsCreating(false);
    }
  }, []);

  const setActiveConversationById = useCallback(async (conversationId: string): Promise<void> => {
    try {
      await LocalConversationStorageInstance.setActiveConversation(conversationId);
      const conversation = await LocalConversationStorageInstance.getConversation(conversationId);
      setActiveConversation(conversation);
    } catch (error) {
      console.error('Error setting active conversation:', error);
      throw error;
    }
  }, []);

  const updateConversationTitle = useCallback(async (
    conversationId: string, 
    title: string
  ): Promise<void> => {
    setIsUpdating(true);
    
    try {
      await LocalConversationStorageInstance.updateConversation(conversationId, { title });
      
      // Actualizar estado local
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, title, updatedAt: new Date() }
            : conv
        )
      );
      
      // Actualizar conversación activa si es la misma
      if (activeConversation?.id === conversationId) {
        setActiveConversation(prev => 
          prev ? { ...prev, title, updatedAt: new Date() } : prev
        );
      }
    } catch (error) {
      console.error('Error updating conversation title:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [activeConversation]);

  const deleteConversation = useCallback(async (conversationId: string): Promise<void> => {
    setIsDeleting(true);
    
    try {
      await LocalConversationStorageInstance.deleteConversation(conversationId);
      
      // Actualizar estado local
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      
      // Si era la conversación activa, limpiar
      if (activeConversation?.id === conversationId) {
        setActiveConversation(null);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    } finally {
      setIsDeleting(false);
    }
  }, [activeConversation]);

  const clearActiveConversation = useCallback(async (): Promise<void> => {
    try {
      await LocalConversationStorageInstance.clearActiveConversation();
      setActiveConversation(null);
    } catch (error) {
      console.error('Error clearing active conversation:', error);
      throw error;
    }
  }, []);

  // ========================================
  // MÉTODOS DE MENSAJES
  // ========================================
  const addMessage = useCallback(async (
    conversationId: string, 
    message: ChatMessage
  ): Promise<void> => {
    try {
      await LocalConversationStorageInstance.addMessageToConversation(conversationId, message);
      
      // Actualizar estado local
      setConversations(prev => 
        prev.map(conv => {
          if (conv.id === conversationId) {
            const updatedConv = {
              ...conv,
              messages: [...conv.messages, message],
              updatedAt: new Date(),
              tokensUsed: conv.tokensUsed + (message.tokensUsed || 0)
            };
            return updatedConv;
          }
          return conv;
        })
      );
      
      // Actualizar conversación activa si es la misma
      if (activeConversation?.id === conversationId) {
        setActiveConversation(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: [...prev.messages, message],
            updatedAt: new Date(),
            tokensUsed: prev.tokensUsed + (message.tokensUsed || 0)
          };
        });
      }
    } catch (error) {
      console.error('Error adding message:', error);
      throw error;
    }
  }, [activeConversation]);

  const updateMessage = useCallback(async (
    conversationId: string, 
    messageId: string, 
    updates: Partial<ChatMessage>
  ): Promise<void> => {
    try {
      await LocalConversationStorageInstance.updateMessage(conversationId, messageId, updates);
      
      // Actualizar estado local
      setConversations(prev => 
        prev.map(conv => {
          if (conv.id === conversationId) {
            return {
              ...conv,
              messages: conv.messages.map(msg => 
                msg.id === messageId ? { ...msg, ...updates } : msg
              ),
              updatedAt: new Date()
            };
          }
          return conv;
        })
      );
      
      // Actualizar conversación activa si es la misma
      if (activeConversation?.id === conversationId) {
        setActiveConversation(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: prev.messages.map(msg => 
              msg.id === messageId ? { ...msg, ...updates } : msg
            ),
            updatedAt: new Date()
          };
        });
      }
    } catch (error) {
      console.error('Error updating message:', error);
      throw error;
    }
  }, [activeConversation]);

  const deleteMessage = useCallback(async (
    conversationId: string, 
    messageId: string
  ): Promise<void> => {
    try {
      await LocalConversationStorageInstance.deleteMessage(conversationId, messageId);
      
      // Actualizar estado local
      setConversations(prev => 
        prev.map(conv => {
          if (conv.id === conversationId) {
            return {
              ...conv,
              messages: conv.messages.filter(msg => msg.id !== messageId),
              updatedAt: new Date()
            };
          }
          return conv;
        })
      );
      
      // Actualizar conversación activa si es la misma
      if (activeConversation?.id === conversationId) {
        setActiveConversation(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: prev.messages.filter(msg => msg.id !== messageId),
            updatedAt: new Date()
          };
        });
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }, [activeConversation]);

  // ========================================
  // UTILIDADES
  // ========================================
  const searchConversations = useCallback(async (query: string): Promise<Conversation[]> => {
    try {
      return await LocalConversationStorageInstance.searchConversations(query);
    } catch (error) {
      console.error('Error searching conversations:', error);
      return [];
    }
  }, []);

  const exportConversations = useCallback(async (): Promise<string> => {
    try {
      return await LocalConversationStorageInstance.exportConversations();
    } catch (error) {
      console.error('Error exporting conversations:', error);
      throw error;
    }
  }, []);

  const importConversations = useCallback(async (data: string): Promise<void> => {
    try {
      await LocalConversationStorageInstance.importConversations(data);
      // Recargar conversaciones después de importar
      await loadConversations();
    } catch (error) {
      console.error('Error importing conversations:', error);
      throw error;
    }
  }, [loadConversations]);

  const getConversationStats = useCallback(async () => {
    try {
      return await LocalConversationStorageInstance.getConversationStats();
    } catch (error) {
      console.error('Error getting conversation stats:', error);
      return {
        totalConversations: 0,
        totalMessages: 0,
        totalTokens: 0,
        averageMessagesPerConversation: 0
      };
    }
  }, []);

  // ========================================
  // FUNCIONES AUXILIARES
  // ========================================
  const generateConversationTitle = useCallback((messages: ChatMessage[]): string => {
    if (messages.length === 0) return 'Nueva conversación';
    
    const firstUserMessage = messages.find(msg => msg.type === 'user');
    if (!firstUserMessage) return 'Nueva conversación';
    
    // Tomar las primeras palabras del primer mensaje del usuario
    const words = firstUserMessage.message.split(' ').slice(0, 6);
    let title = words.join(' ');
    
    if (firstUserMessage.message.length > title.length) {
      title += '...';
    }
    
    return title || 'Nueva conversación';
  }, []);

  const getConversationSummary = useCallback((conversation: Conversation): string => {
    if (conversation.messages.length === 0) {
      return 'Sin mensajes';
    }
    
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    const preview = lastMessage.message.substring(0, 100);
    
    return preview + (lastMessage.message.length > 100 ? '...' : '');
  }, []);

  // ========================================
  // MÉTODOS AVANZADOS
  // ========================================
  const getConversationsBySpecialist = useCallback((specialist: SpecialtyType): Conversation[] => {
    return conversations.filter(conv => conv.specialist === specialist);
  }, [conversations]);

  const getRecentConversations = useCallback((limit: number = 5): Conversation[] => {
    return conversations.slice(0, limit);
  }, [conversations]);

  const getConversationsWithFiles = useCallback(): Conversation[] => {
    return conversations.filter(conv => 
      conv.messages.some(msg => msg.files && msg.files.length > 0)
    );
  }, [conversations]);

  const clearAllConversations = useCallback(async (): Promise<void> => {
    try {
      setIsDeleting(true);
      await LocalConversationStorageInstance.clearAllConversations();
      setConversations([]);
      setActiveConversation(null);
    } catch (error) {
      console.error('Error clearing all conversations:', error);
      throw error;
    } finally {
      setIsDeleting(false);
    }
  }, []);

  // ========================================
  // UTILIDADES PARA COMPARTIR
  // ========================================
  const exportConversationAsText = useCallback((conversation: Conversation): string => {
    const header = `Conversación: ${conversation.title}\nFecha: ${conversation.createdAt.toLocaleDateString()}\nMensajes: ${conversation.messages.length}\n\n`;
    
    const messages = conversation.messages
      // CORREGIDO: Tipo explícito para el parámetro msg
      .map((msg: ChatMessage) => `${msg.type === 'user' ? 'Usuario' : 'Asistente'}: ${msg.message}`)
      .join('\n\n');
    
    return header + messages;
  }, []);

  const shareConversation = useCallback(async (conversationId: string): Promise<string> => {
    const conversation = conversations.find(conv => conv.id === conversationId);
    if (!conversation) {
      throw new Error('Conversación no encontrada');
    }
    
    return exportConversationAsText(conversation);
  }, [conversations, exportConversationAsText]);

  // ========================================
  // VALOR DEL CONTEXTO
  // ========================================
  const contextValue: ConversationContextType = {
    // Estado
    conversations,
    activeConversation,
    loading,
    
    // Métodos de conversaciones
    createConversation,
    loadConversations,
    setActiveConversationById,
    updateConversationTitle,
    deleteConversation,
    clearActiveConversation,
    
    // Métodos de mensajes
    addMessage,
    updateMessage,
    deleteMessage,
    
    // Utilidades
    searchConversations,
    exportConversations,
    importConversations,
    getConversationStats,
    
    // Estados de carga
    isCreating,
    isDeleting,
    isUpdating,
  };

  return (
    <ConversationContext.Provider value={contextValue}>
      {children}
    </ConversationContext.Provider>
  );
};

// ========================================
// HOOKS ADICIONALES
// ========================================
export const useActiveConversation = () => {
  const { activeConversation, setActiveConversationById, clearActiveConversation } = useConversations();
  return { activeConversation, setActiveConversationById, clearActiveConversation };
};

export const useConversationMessages = (conversationId?: string) => {
  const { addMessage, updateMessage, deleteMessage, activeConversation } = useConversations();
  
  const messages = conversationId 
    ? activeConversation?.id === conversationId ? activeConversation.messages : []
    : activeConversation?.messages || [];
  
  return {
    messages,
    addMessage: (message: ChatMessage) => addMessage(conversationId || activeConversation?.id || '', message),
    updateMessage: (messageId: string, updates: Partial<ChatMessage>) => 
      updateMessage(conversationId || activeConversation?.id || '', messageId, updates),
    deleteMessage: (messageId: string) => 
      deleteMessage(conversationId || activeConversation?.id || '', messageId),
  };
};

export const useConversationStats = () => {
  const { conversations, getConversationStats } = useConversations();
  
  const [stats, setStats] = React.useState({
    totalConversations: 0,
    totalMessages: 0,
    totalTokens: 0,
    averageMessagesPerConversation: 0
  });
  
  React.useEffect(() => {
    getConversationStats().then(setStats);
  }, [conversations, getConversationStats]);
  
  return stats;
};

export default ConversationProvider;