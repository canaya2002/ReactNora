// src/lib/ConversationStorage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Conversation, ChatMessage } from './types';

export class LocalConversationStorage {
  private static instance: LocalConversationStorage;
  private storageKey = '@nora_conversations';
  private activeConversationKey = '@nora_active_conversation';

  constructor() {
    // Constructor privado para singleton
  }

  public static getInstance(): LocalConversationStorage {
    if (!LocalConversationStorage.instance) {
      LocalConversationStorage.instance = new LocalConversationStorage();
    }
    return LocalConversationStorage.instance;
  }

  // ========================================
  // MÉTODOS DE CONVERSACIONES
  // ========================================
  async getAllConversations(): Promise<Conversation[]> {
    try {
      const stored = await AsyncStorage.getItem(this.storageKey);
      if (!stored) return [];
      
      const conversations = JSON.parse(stored);
      return conversations.map((conv: any) => ({
        ...conv,
        createdAt: new Date(conv.createdAt),
        updatedAt: new Date(conv.updatedAt),
        messages: conv.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      }));
    } catch (error) {
      console.error('Error loading conversations:', error);
      return [];
    }
  }

  async saveConversation(conversation: Conversation): Promise<void> {
    try {
      const conversations = await this.getAllConversations();
      const existingIndex = conversations.findIndex(c => c.id === conversation.id);
      
      if (existingIndex >= 0) {
        conversations[existingIndex] = conversation;
      } else {
        conversations.unshift(conversation);
      }

      await AsyncStorage.setItem(this.storageKey, JSON.stringify(conversations));
    } catch (error) {
      console.error('Error saving conversation:', error);
      throw error;
    }
  }

  async deleteConversation(conversationId: string): Promise<void> {
    try {
      const conversations = await this.getAllConversations();
      const filtered = conversations.filter(c => c.id !== conversationId);
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(filtered));

      // Si era la conversación activa, limpiar
      const activeId = await this.getActiveConversationId();
      if (activeId === conversationId) {
        await this.clearActiveConversation();
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }

  async getConversation(conversationId: string): Promise<Conversation | null> {
    try {
      const conversations = await this.getAllConversations();
      return conversations.find(c => c.id === conversationId) || null;
    } catch (error) {
      console.error('Error getting conversation:', error);
      return null;
    }
  }

  async updateConversation(conversationId: string, updates: Partial<Conversation>): Promise<void> {
    try {
      const conversations = await this.getAllConversations();
      const index = conversations.findIndex(c => c.id === conversationId);
      
      if (index >= 0) {
        conversations[index] = {
          ...conversations[index],
          ...updates,
          updatedAt: new Date()
        };
        await AsyncStorage.setItem(this.storageKey, JSON.stringify(conversations));
      }
    } catch (error) {
      console.error('Error updating conversation:', error);
      throw error;
    }
  }

  // ========================================
  // MÉTODOS DE MENSAJES
  // ========================================
  async addMessageToConversation(conversationId: string, message: ChatMessage): Promise<void> {
    try {
      const conversation = await this.getConversation(conversationId);
      if (conversation) {
        conversation.messages.push(message);
        conversation.updatedAt = new Date();
        conversation.tokensUsed += message.tokensUsed || 0;
        await this.saveConversation(conversation);
      }
    } catch (error) {
      console.error('Error adding message to conversation:', error);
      throw error;
    }
  }

  async updateMessage(conversationId: string, messageId: string, updates: Partial<ChatMessage>): Promise<void> {
    try {
      const conversation = await this.getConversation(conversationId);
      if (conversation) {
        const messageIndex = conversation.messages.findIndex(m => m.id === messageId);
        if (messageIndex >= 0) {
          conversation.messages[messageIndex] = {
            ...conversation.messages[messageIndex],
            ...updates
          };
          conversation.updatedAt = new Date();
          await this.saveConversation(conversation);
        }
      }
    } catch (error) {
      console.error('Error updating message:', error);
      throw error;
    }
  }

  async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    try {
      const conversation = await this.getConversation(conversationId);
      if (conversation) {
        conversation.messages = conversation.messages.filter(m => m.id !== messageId);
        conversation.updatedAt = new Date();
        await this.saveConversation(conversation);
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  // ========================================
  // CONVERSACIÓN ACTIVA
  // ========================================
  async setActiveConversation(conversationId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(this.activeConversationKey, conversationId);
    } catch (error) {
      console.error('Error setting active conversation:', error);
      throw error;
    }
  }

  async getActiveConversationId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.activeConversationKey);
    } catch (error) {
      console.error('Error getting active conversation:', error);
      return null;
    }
  }

  async getActiveConversation(): Promise<Conversation | null> {
    try {
      const conversationId = await this.getActiveConversationId();
      if (!conversationId) return null;
      return await this.getConversation(conversationId);
    } catch (error) {
      console.error('Error getting active conversation:', error);
      return null;
    }
  }

  async clearActiveConversation(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.activeConversationKey);
    } catch (error) {
      console.error('Error clearing active conversation:', error);
      throw error;
    }
  }

  // ========================================
  // UTILIDADES
  // ========================================
  async createNewConversation(title?: string, specialist?: string): Promise<Conversation> {
    const conversation: Conversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: title || 'Nueva conversación',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: false,
      tokensUsed: 0,
      specialist: specialist as any
    };

    await this.saveConversation(conversation);
    await this.setActiveConversation(conversation.id);
    
    return conversation;
  }

  async searchConversations(query: string): Promise<Conversation[]> {
    try {
      const conversations = await this.getAllConversations();
      const lowercaseQuery = query.toLowerCase();
      
      return conversations.filter(conv => 
        conv.title.toLowerCase().includes(lowercaseQuery) ||
        conv.messages.some(msg => 
          msg.message.toLowerCase().includes(lowercaseQuery)
        )
      );
    } catch (error) {
      console.error('Error searching conversations:', error);
      return [];
    }
  }

  async getConversationStats(): Promise<{
    totalConversations: number;
    totalMessages: number;
    totalTokens: number;
    averageMessagesPerConversation: number;
  }> {
    try {
      const conversations = await this.getAllConversations();
      const totalConversations = conversations.length;
      const totalMessages = conversations.reduce((acc, conv) => acc + conv.messages.length, 0);
      const totalTokens = conversations.reduce((acc, conv) => acc + conv.tokensUsed, 0);
      const averageMessagesPerConversation = totalConversations > 0 ? totalMessages / totalConversations : 0;

      return {
        totalConversations,
        totalMessages,
        totalTokens,
        averageMessagesPerConversation
      };
    } catch (error) {
      console.error('Error getting conversation stats:', error);
      return {
        totalConversations: 0,
        totalMessages: 0,
        totalTokens: 0,
        averageMessagesPerConversation: 0
      };
    }
  }

  async clearAllConversations(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.storageKey);
      await this.clearActiveConversation();
    } catch (error) {
      console.error('Error clearing all conversations:', error);
      throw error;
    }
  }

  async exportConversations(): Promise<string> {
    try {
      const conversations = await this.getAllConversations();
      return JSON.stringify(conversations, null, 2);
    } catch (error) {
      console.error('Error exporting conversations:', error);
      throw error;
    }
  }

  async importConversations(data: string): Promise<void> {
    try {
      const importedConversations = JSON.parse(data) as Conversation[];
      const existingConversations = await this.getAllConversations();
      
      // Merge conversations, avoiding duplicates
      const mergedConversations = [...existingConversations];
      
      for (const importedConv of importedConversations) {
        const exists = existingConversations.some(existing => existing.id === importedConv.id);
        if (!exists) {
          mergedConversations.push({
            ...importedConv,
            createdAt: new Date(importedConv.createdAt),
            updatedAt: new Date(importedConv.updatedAt),
            messages: importedConv.messages.map(msg => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }))
          });
        }
      }
      
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(mergedConversations));
    } catch (error) {
      console.error('Error importing conversations:', error);
      throw error;
    }
  }
}

// CORREGIDO: Export correcto de la instancia singleton
export const LocalConversationStorageInstance = LocalConversationStorage.getInstance();

// Export por defecto
export default LocalConversationStorageInstance;