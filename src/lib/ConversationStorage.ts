// src/lib/ConversationStorage.ts - ALMACENAMIENTO LOCAL DE CONVERSACIONES (CORREGIDO)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Conversation, ChatMessage } from './types';

// ========================================
// KEYS DE ALMACENAMIENTO
// ========================================
const STORAGE_KEYS = {
  CONVERSATIONS: '@nora_conversations',
  CURRENT_CONVERSATION: '@nora_current_conversation',
  USER_PREFERENCES: '@nora_user_preferences',
  DRAFT_MESSAGES: '@nora_draft_messages',
  OFFLINE_QUEUE: '@nora_offline_queue',
  CONVERSATION_PREFIX: '@nora_conversation_',
  USAGE_STATS: '@nora_usage_stats'
} as const;

// ========================================
// INTERFACES
// ========================================
interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface ConversationMetadata {
  id: string;
  title: string;
  lastMessage?: string;
  lastMessageTime: Date;
  messageCount: number;
  isArchived: boolean;
  isFavorite: boolean;
  tags: string[];
  specialist?: string;
}

interface OfflineAction {
  id: string;
  type: 'create' | 'update' | 'delete' | 'message';
  conversationId: string;
  data: any;
  timestamp: Date;
  retries: number;
}

// ========================================
// CLASE PRINCIPAL DE ALMACENAMIENTO
// ========================================
export class LocalConversationStorage {
  private static instance: LocalConversationStorage;
  private memoryCache: Map<string, any> = new Map();
  private maxCacheSize = 50;

  // Singleton pattern
  static getInstance(): LocalConversationStorage {
    if (!LocalConversationStorage.instance) {
      LocalConversationStorage.instance = new LocalConversationStorage();
    }
    return LocalConversationStorage.instance;
  }

  // ========================================
  // MÉTODOS BÁSICOS DE STORAGE
  // ========================================

  private async setItem<T>(key: string, value: T): Promise<StorageResult<T>> {
    try {
      const jsonValue = JSON.stringify(value, this.dateReplacer);
      await AsyncStorage.setItem(key, jsonValue);
      
      // Actualizar cache en memoria
      this.updateMemoryCache(key, value);
      
      return { success: true, data: value };
    } catch (error: any) {
      console.error(`Error storing item with key "${key}":`, error);
      return { success: false, error: error.message };
    }
  }

  private async getItem<T>(key: string, defaultValue?: T): Promise<StorageResult<T>> {
    try {
      // Verificar cache en memoria primero
      if (this.memoryCache.has(key)) {
        return { success: true, data: this.memoryCache.get(key) };
      }

      const jsonValue = await AsyncStorage.getItem(key);
      if (jsonValue !== null) {
        const parsedValue = JSON.parse(jsonValue, this.dateReviver);
        this.updateMemoryCache(key, parsedValue);
        return { success: true, data: parsedValue };
      } else if (defaultValue !== undefined) {
        return { success: true, data: defaultValue };
      } else {
        return { success: false, error: 'Item not found' };
      }
    } catch (error: any) {
      console.error(`Error getting item with key "${key}":`, error);
      if (defaultValue !== undefined) {
        return { success: true, data: defaultValue };
      }
      return { success: false, error: error.message };
    }
  }

  private async removeItem(key: string): Promise<StorageResult<void>> {
    try {
      await AsyncStorage.removeItem(key);
      this.memoryCache.delete(key);
      return { success: true };
    } catch (error: any) {
      console.error(`Error removing item with key "${key}":`, error);
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // UTILIDADES DE SERIALIZACIÓN
  // ========================================

  private dateReplacer = (key: string, value: any): any => {
    if (value instanceof Date) {
      return { __type: 'Date', __value: value.toISOString() };
    }
    return value;
  };

  private dateReviver = (key: string, value: any): any => {
    if (value && typeof value === 'object' && value.__type === 'Date') {
      return new Date(value.__value);
    }
    return value;
  };

  // ========================================
  // GESTIÓN DE CACHE EN MEMORIA
  // ========================================

  private updateMemoryCache<T>(key: string, value: T): void {
    // Implementar LRU (Least Recently Used)
    if (this.memoryCache.size >= this.maxCacheSize) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }
    
    // Eliminar si existe y volver a agregar (para actualizar orden)
    if (this.memoryCache.has(key)) {
      this.memoryCache.delete(key);
    }
    
    this.memoryCache.set(key, value);
  }

  private clearMemoryCache(): void {
    this.memoryCache.clear();
  }

  // ========================================
  // MÉTODOS DE CONVERSACIONES
  // ========================================

  async saveConversation(conversation: Conversation): Promise<StorageResult<Conversation>> {
    try {
      const key = `${STORAGE_KEYS.CONVERSATION_PREFIX}${conversation.id}`;
      const result = await this.setItem(key, conversation);
      
      if (result.success) {
        // Actualizar índice de conversaciones
        await this.updateConversationsIndex(conversation);
      }
      
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getConversation(conversationId: string): Promise<StorageResult<Conversation>> {
    const key = `${STORAGE_KEYS.CONVERSATION_PREFIX}${conversationId}`;
    return this.getItem<Conversation>(key);
  }

  async deleteConversation(conversationId: string): Promise<StorageResult<void>> {
    try {
      const key = `${STORAGE_KEYS.CONVERSATION_PREFIX}${conversationId}`;
      await this.removeItem(key);
      
      // Actualizar índice de conversaciones
      await this.removeFromConversationsIndex(conversationId);
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getAllConversations(): Promise<StorageResult<Conversation[]>> {
    try {
      const indexResult = await this.getConversationsIndex();
      if (!indexResult.success || !indexResult.data) {
        return { success: true, data: [] };
      }

      const conversations: Conversation[] = [];
      
      for (const metadata of indexResult.data) {
        const conversationResult = await this.getConversation(metadata.id);
        if (conversationResult.success && conversationResult.data) {
          conversations.push(conversationResult.data);
        }
      }

      // Ordenar por fecha de última actividad
      conversations.sort((a, b) => 
        new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
      );

      return { success: true, data: conversations };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // GESTIÓN DE ÍNDICE DE CONVERSACIONES
  // ========================================

  private async getConversationsIndex(): Promise<StorageResult<ConversationMetadata[]>> {
    return this.getItem<ConversationMetadata[]>(STORAGE_KEYS.CONVERSATIONS, []);
  }

  private async updateConversationsIndex(conversation: Conversation): Promise<void> {
    const indexResult = await this.getConversationsIndex();
    const index = indexResult.data || [];
    
    // Crear metadata de la conversación
    const metadata: ConversationMetadata = {
      id: conversation.id,
      title: conversation.title,
      lastMessage: conversation.messages[conversation.messages.length - 1]?.message,
      lastMessageTime: conversation.lastActivity,
      messageCount: conversation.messageCount,
      isArchived: conversation.isArchived || false,
      isFavorite: conversation.isFavorite || false,
      tags: conversation.tags || [],
      specialist: conversation.specialist
    };

    // Buscar si ya existe
    const existingIndex = index.findIndex(item => item.id === conversation.id);
    
    if (existingIndex >= 0) {
      index[existingIndex] = metadata;
    } else {
      index.push(metadata);
    }

    await this.setItem(STORAGE_KEYS.CONVERSATIONS, index);
  }

  private async removeFromConversationsIndex(conversationId: string): Promise<void> {
    const indexResult = await this.getConversationsIndex();
    const index = indexResult.data || [];
    
    const filteredIndex = index.filter(item => item.id !== conversationId);
    await this.setItem(STORAGE_KEYS.CONVERSATIONS, filteredIndex);
  }

  // ========================================
  // MÉTODOS DE MENSAJES
  // ========================================

  async addMessageToConversation(
    conversationId: string, 
    message: ChatMessage
  ): Promise<StorageResult<Conversation>> {
    try {
      const conversationResult = await this.getConversation(conversationId);
      if (!conversationResult.success || !conversationResult.data) {
        return { success: false, error: 'Conversation not found' };
      }

      const conversation = conversationResult.data;
      conversation.messages.push(message);
      conversation.messageCount = conversation.messages.length;
      conversation.lastActivity = new Date();
      conversation.updatedAt = new Date();

      return this.saveConversation(conversation);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async updateMessageInConversation(
    conversationId: string,
    messageId: string,
    updates: Partial<ChatMessage>
  ): Promise<StorageResult<Conversation>> {
    try {
      const conversationResult = await this.getConversation(conversationId);
      if (!conversationResult.success || !conversationResult.data) {
        return { success: false, error: 'Conversation not found' };
      }

      const conversation = conversationResult.data;
      const messageIndex = conversation.messages.findIndex(msg => msg.id === messageId);
      
      if (messageIndex === -1) {
        return { success: false, error: 'Message not found' };
      }

      // Actualizar mensaje
      conversation.messages[messageIndex] = {
        ...conversation.messages[messageIndex],
        ...updates
      };

      conversation.updatedAt = new Date();
      conversation.lastActivity = new Date();

      return this.saveConversation(conversation);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async deleteMessageFromConversation(
    conversationId: string,
    messageId: string
  ): Promise<StorageResult<Conversation>> {
    try {
      const conversationResult = await this.getConversation(conversationId);
      if (!conversationResult.success || !conversationResult.data) {
        return { success: false, error: 'Conversation not found' };
      }

      const conversation = conversationResult.data;
      conversation.messages = conversation.messages.filter(msg => msg.id !== messageId);
      conversation.messageCount = conversation.messages.length;
      conversation.updatedAt = new Date();

      return this.saveConversation(conversation);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // MÉTODOS DE FAVORITOS Y ARCHIVADO
  // ========================================

  async toggleFavorite(conversationId: string): Promise<StorageResult<Conversation>> {
    try {
      const conversationResult = await this.getConversation(conversationId);
      if (!conversationResult.success || !conversationResult.data) {
        return { success: false, error: 'Conversation not found' };
      }

      const conversation = conversationResult.data;
      conversation.isFavorite = !conversation.isFavorite;
      conversation.updatedAt = new Date();

      return this.saveConversation(conversation);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async toggleArchive(conversationId: string): Promise<StorageResult<Conversation>> {
    try {
      const conversationResult = await this.getConversation(conversationId);
      if (!conversationResult.success || !conversationResult.data) {
        return { success: false, error: 'Conversation not found' };
      }

      const conversation = conversationResult.data;
      conversation.isArchived = !conversation.isArchived;
      conversation.updatedAt = new Date();

      return this.saveConversation(conversation);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // MÉTODOS DE BÚSQUEDA Y FILTRADO
  // ========================================

  async searchConversations(query: string): Promise<StorageResult<Conversation[]>> {
    try {
      const allConversationsResult = await this.getAllConversations();
      if (!allConversationsResult.success || !allConversationsResult.data) {
        return { success: true, data: [] };
      }

      const searchTerm = query.toLowerCase();
      const filtered = allConversationsResult.data.filter(conversation => {
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

      return { success: true, data: filtered };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // MÉTODOS DE BORRADORES
  // ========================================

  async saveDraft(conversationId: string, message: string): Promise<StorageResult<void>> {
    const key = `${STORAGE_KEYS.DRAFT_MESSAGES}_${conversationId}`;
    const result = await this.setItem(key, { message, timestamp: new Date() });
    return { success: result.success, error: result.error };
  }

  async getDraft(conversationId: string): Promise<StorageResult<string>> {
    const key = `${STORAGE_KEYS.DRAFT_MESSAGES}_${conversationId}`;
    const result = await this.getItem<{ message: string; timestamp: Date }>(key);
    return { 
      success: result.success, 
      data: result.data?.message || '',
      error: result.error 
    };
  }

  async clearDraft(conversationId: string): Promise<StorageResult<void>> {
    const key = `${STORAGE_KEYS.DRAFT_MESSAGES}_${conversationId}`;
    return this.removeItem(key);
  }

  // ========================================
  // MÉTODOS DE ESTADÍSTICAS
  // ========================================

  async getStorageStats(): Promise<StorageResult<{
    totalConversations: number;
    totalMessages: number;
    storageSize: string;
    cacheSize: number;
  }>> {
    try {
      const allConversationsResult = await this.getAllConversations();
      const conversations = allConversationsResult.data || [];
      
      const totalConversations = conversations.length;
      const totalMessages = conversations.reduce((sum, conv) => sum + conv.messageCount, 0);
      
      // Calcular tamaño aproximado del storage
      const keys = await AsyncStorage.getAllKeys();
      const noraKeys = keys.filter(key => key.startsWith('@nora_'));
      
      let totalSize = 0;
      for (const key of noraKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }
      
      const storageSize = this.formatBytes(totalSize);
      const cacheSize = this.memoryCache.size;

      return {
        success: true,
        data: { totalConversations, totalMessages, storageSize, cacheSize }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // MÉTODOS DE LIMPIEZA
  // ========================================

  async clearAllData(): Promise<StorageResult<void>> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const noraKeys = keys.filter(key => key.startsWith('@nora_'));
      
      await AsyncStorage.multiRemove(noraKeys);
      this.clearMemoryCache();
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // UTILIDADES
  // ========================================

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Exportar instancia singleton
export default LocalConversationStorage.getInstance();