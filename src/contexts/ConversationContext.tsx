// src/contexts/ConversationContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { LocalConversationStorageInstance } from '../lib/ConversationStorage';
import { Conversation, ChatMessage, SpecialtyType, FilterType, SortType } from '../lib/types';
import { useAuth } from './AuthContext';
import { Share } from 'react-native';

// ========================================
// INTERFACES
// ========================================
interface ConversationContextType {
  // Estado de conversaciones
  conversations: Conversation[];
  activeConversation: Conversation | null;
  loading: boolean;
  
  // Métodos de conversaciones
  createConversation: (specialist?: SpecialtyType, title?: string) => Promise<Conversation>;
  loadConversations: () => Promise<void>;
  selectConversation: (conversation: Conversation) => Promise<void>;
  updateConversationTitle: (conversationId: string, title: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  clearActiveConversation: () => Promise<void>;
  toggleFavorite: (conversationId: string) => Promise<void>;
  toggleArchive: (conversationId: string) => Promise<void>;
  startNewConversation: () => Promise<Conversation>;

  // Métodos de mensajes
  addMessage: (conversationId: string, message: ChatMessage) => Promise<void>;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<ChatMessage>) => Promise<void>;
  deleteMessage: (conversationId: string, messageId: string) => Promise<void>;
  
  // Utilidades
  searchConversations: (query: string) => Promise<Conversation[]>;
  shareConversation: (conversationId: string) => Promise<void>;
  exportConversations: () => Promise<string>;
  importConversations: (data: string) => Promise<void>;
  
  // Filtrado y búsqueda
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterStatus: FilterType;
  setFilterStatus: (status: FilterType) => void;
  filteredConversations: Conversation[];

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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterType>('all');

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
      setConversations([]);
      setActiveConversation(null);
      setLoading(false);
    }
  }, [user]);

  // ========================================
  // FUNCIONES DE CARGA
  // ========================================
  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const loadedConversations = await LocalConversationStorageInstance.getAllConversations();
      const sorted = loadedConversations.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setConversations(sorted);
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
  // CONVERSACIONES FILTRADAS
  // ========================================
  const filteredConversations = React.useMemo(() => {
    return conversations
      .filter(c => {
        if (filterStatus === 'favorites') return c.isFavorite;
        if (filterStatus === 'archived') return c.isArchived;
        return !c.isArchived;
      })
      .filter(c => {
        if (!searchTerm) return true;
        const lowerCaseQuery = searchTerm.toLowerCase();
        return (
          c.title.toLowerCase().includes(lowerCaseQuery) ||
          c.messages.some(m => m.message.toLowerCase().includes(lowerCaseQuery))
        );
      });
  }, [conversations, searchTerm, filterStatus]);

  // ========================================
  // MÉTODOS DE CONVERSACIONES
  // ========================================
    const createConversation = useCallback(async (specialist: SpecialtyType = 'general', title?: string): Promise<Conversation> => {
        setIsCreating(true);
        try {
            const newConversation = await LocalConversationStorageInstance.createNewConversation(title, specialist);
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

    const startNewConversation = useCallback(async (): Promise<Conversation> => {
        return await createConversation();
    }, [createConversation]);

    const selectConversation = useCallback(async (conversation: Conversation): Promise<void> => {
        try {
            await LocalConversationStorageInstance.setActiveConversation(conversation.id);
            setActiveConversation(conversation);
        } catch (error) {
            console.error('Error selecting conversation:', error);
        }
    }, []);

    const updateConversationTitle = useCallback(async (conversationId: string, title: string): Promise<void> => {
        setIsUpdating(true);
        try {
            await LocalConversationStorageInstance.updateConversation(conversationId, { title });
            const updater = (conv: Conversation) => conv.id === conversationId ? { ...conv, title, updatedAt: new Date() } : conv;
            setConversations(prev => prev.map(updater));
            if (activeConversation?.id === conversationId) {
                setActiveConversation(prev => prev ? updater(prev) : null);
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
            setConversations(prev => prev.filter(conv => conv.id !== conversationId));
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
        }
    }, []);
    
    const toggleFavorite = useCallback(async (conversationId: string): Promise<void> => {
        const conversation = conversations.find(c => c.id === conversationId);
        if (!conversation) return;
        const isFavorite = !conversation.isFavorite;
        await LocalConversationStorageInstance.updateConversation(conversationId, { isFavorite });
        setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, isFavorite } : c));
    }, [conversations]);

    const toggleArchive = useCallback(async (conversationId: string): Promise<void> => {
        const conversation = conversations.find(c => c.id === conversationId);
        if (!conversation) return;
        const isArchived = !conversation.isArchived;
        await LocalConversationStorageInstance.updateConversation(conversationId, { isArchived });
        setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, isArchived } : c));
    }, [conversations]);

  // ========================================
  // MÉTODOS DE MENSAJES
  // ========================================
    const addMessage = useCallback(async (conversationId: string, message: ChatMessage): Promise<void> => {
        try {
            await LocalConversationStorageInstance.addMessageToConversation(conversationId, message);
            const updater = (conv: Conversation) => {
                if (conv.id === conversationId) {
                    return {
                        ...conv,
                        messages: [...conv.messages, message],
                        updatedAt: new Date(),
                        tokensUsed: conv.tokensUsed + (message.tokensUsed || 0),
                    };
                }
                return conv;
            };
            setConversations(prev => prev.map(updater));
            if (activeConversation?.id === conversationId) {
                setActiveConversation(prev => prev ? updater(prev) : null);
            }
        } catch (error) {
            console.error('Error adding message:', error);
            throw error;
        }
    }, [activeConversation]);

    const updateMessage = useCallback(async (conversationId: string, messageId: string, updates: Partial<ChatMessage>): Promise<void> => {
        try {
            await LocalConversationStorageInstance.updateMessage(conversationId, messageId, updates);
            const updater = (conv: Conversation) => {
                if (conv.id === conversationId) {
                    return {
                        ...conv,
                        messages: conv.messages.map(msg => msg.id === messageId ? { ...msg, ...updates } : msg),
                        updatedAt: new Date(),
                    };
                }
                return conv;
            };
            setConversations(prev => prev.map(updater));
            if (activeConversation?.id === conversationId) {
                setActiveConversation(prev => prev ? updater(prev) : null);
            }
        } catch (error) {
            console.error('Error updating message:', error);
            throw error;
        }
    }, [activeConversation]);

    const deleteMessage = useCallback(async (conversationId: string, messageId: string): Promise<void> => {
        try {
            await LocalConversationStorageInstance.deleteMessage(conversationId, messageId);
            const updater = (conv: Conversation) => {
                if (conv.id === conversationId) {
                    return {
                        ...conv,
                        messages: conv.messages.filter(msg => msg.id !== messageId),
                        updatedAt: new Date(),
                    };
                }
                return conv;
            };
            setConversations(prev => prev.map(updater));
            if (activeConversation?.id === conversationId) {
                setActiveConversation(prev => prev ? updater(prev) : null);
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
        return await LocalConversationStorageInstance.searchConversations(query);
    }, []);

    const shareConversation = useCallback(async (conversationId: string): Promise<void> => {
        const conversation = conversations.find(c => c.id === conversationId);
        if (!conversation) throw new Error("Conversación no encontrada");
    
        const content = `Conversación: ${conversation.title}\n\n${conversation.messages
            .map(msg => `${msg.role === 'user' ? 'Tú' : 'NORA AI'}: ${msg.message}`)
            .join('\n\n')}`;
        
        await Share.share({ message: content, title: conversation.title });
    }, [conversations]);

    const exportConversations = useCallback(async (): Promise<string> => {
        return await LocalConversationStorageInstance.exportConversations();
    }, []);

    const importConversations = useCallback(async (data: string): Promise<void> => {
        await LocalConversationStorageInstance.importConversations(data);
        await loadConversations();
    }, [loadConversations]);

  // ========================================
  // VALOR DEL CONTEXTO
  // ========================================
  const contextValue: ConversationContextType = {
    conversations,
    activeConversation,
    loading,
    createConversation,
    loadConversations,
    selectConversation,
    updateConversationTitle,
    deleteConversation,
    clearActiveConversation,
    toggleFavorite,
    toggleArchive,
    startNewConversation,
    addMessage,
    updateMessage,
    deleteMessage,
    searchConversations,
    shareConversation,
    exportConversations,
    importConversations,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    filteredConversations,
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