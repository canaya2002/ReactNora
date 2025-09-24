// src/lib/notifications.ts - SISTEMA DE NOTIFICACIONES (CORREGIDO)
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ========================================
// INTERFACES
// ========================================
interface NotificationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: 'granted' | 'denied' | 'undetermined';
}

interface LocalNotificationInput {
  title: string;
  body: string;
  data?: any;
  trigger?: {
    seconds?: number;
    date?: Date;
    repeats?: boolean;
  };
  categoryId?: string;
  priority?: 'min' | 'low' | 'default' | 'high' | 'max';
  sound?: boolean;
  vibrate?: number[];
}

interface NotificationSettings {
  enabled: boolean;
  types: {
    chat: boolean;
    imageGeneration: boolean;
    videoGeneration: boolean;
    system: boolean;
    marketing: boolean;
  };
  quiet: {
    enabled: boolean;
    startTime: string; // HH:mm format
    endTime: string;   // HH:mm format
  };
  sound: boolean;
  vibration: boolean;
}

// ========================================
// CONSTANTES
// ========================================
const STORAGE_KEYS = {
  NOTIFICATION_SETTINGS: '@nora_notification_settings',
  NOTIFICATION_TOKEN: '@nora_notification_token',
  PENDING_NOTIFICATIONS: '@nora_pending_notifications',
  NOTIFICATION_HISTORY: '@nora_notification_history'
};

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  types: {
    chat: true,
    imageGeneration: true,
    videoGeneration: true,
    system: true,
    marketing: false
  },
  quiet: {
    enabled: false,
    startTime: '22:00',
    endTime: '08:00'
  },
  sound: true,
  vibration: true
};

// ========================================
// CLASE PRINCIPAL DE NOTIFICACIONES
// ========================================
export class NotificationManager {
  private static instance: NotificationManager;
  private settings: NotificationSettings = DEFAULT_SETTINGS;
  private isInitialized = false;

  // Singleton pattern
  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  // ========================================
  // INICIALIZACIÓN
  // ========================================
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Cargar configuración guardada
      await this.loadSettings();
      
      // Configurar manejador de notificaciones (mock)
      this.setupNotificationHandlers();
      
      this.isInitialized = true;
      console.log('NotificationManager initialized');
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  }

  // ========================================
  // CONFIGURACIÓN DE HANDLERS
  // ========================================
  private setupNotificationHandlers(): void {
    // Mock implementation - En un proyecto real se usaría expo-notifications
    // Notifications.setNotificationHandler({
    //   handleNotification: async (notification) => {
    //     return {
    //       shouldShowAlert: true,
    //       shouldPlaySound: this.settings.sound,
    //       shouldSetBadge: true,
    //     };
    //   },
    // });
  }

  // ========================================
  // GESTIÓN DE PERMISOS
  // ========================================
  async requestPermissions(): Promise<NotificationPermissionStatus> {
    try {
      // Mock implementation - En un proyecto real se usaría expo-notifications
      // const { status: existingStatus } = await Notifications.getPermissionsAsync();
      // let finalStatus = existingStatus;
      
      // if (existingStatus !== 'granted') {
      //   const { status } = await Notifications.requestPermissionsAsync();
      //   finalStatus = status;
      // }

      // Mock response
      const mockStatus: NotificationPermissionStatus = {
        granted: true,
        canAskAgain: true,
        status: 'granted'
      };

      if (mockStatus.granted) {
        await this.registerForPushNotifications();
      }

      return mockStatus;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return {
        granted: false,
        canAskAgain: false,
        status: 'denied'
      };
    }
  }

  async getPermissions(): Promise<NotificationPermissionStatus> {
    try {
      // Mock implementation
      return {
        granted: true,
        canAskAgain: true,
        status: 'granted'
      };
    } catch (error) {
      console.error('Error getting notification permissions:', error);
      return {
        granted: false,
        canAskAgain: false,
        status: 'denied'
      };
    }
  }

  // ========================================
  // REGISTRO PARA PUSH NOTIFICATIONS
  // ========================================
  private async registerForPushNotifications(): Promise<string | null> {
    try {
      // Mock implementation - En un proyecto real se usaría expo-notifications
      // if (Device.isDevice) {
      //   const token = (await Notifications.getExpoPushTokenAsync()).data;
      //   await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_TOKEN, token);
      //   return token;
      // }

      const mockToken = 'mock_expo_push_token_' + Date.now();
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_TOKEN, mockToken);
      return mockToken;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  async getPushToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_TOKEN);
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  // ========================================
  // NOTIFICACIONES LOCALES
  // ========================================
  async scheduleNotification(notification: LocalNotificationInput): Promise<string | null> {
    try {
      if (!this.settings.enabled) {
        console.log('Notifications are disabled');
        return null;
      }

      // Verificar si estamos en horario silencioso
      if (this.isQuietTime()) {
        console.log('Notification blocked: quiet time');
        return null;
      }

      // Mock implementation - En un proyecto real se usaría expo-notifications
      const notificationId = 'mock_notification_' + Date.now();
      
      // Guardar notificación pendiente
      await this.savePendingNotification(notificationId, notification);
      
      console.log('Notification scheduled:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  async cancelNotification(notificationId: string): Promise<boolean> {
    try {
      // Mock implementation
      await this.removePendingNotification(notificationId);
      console.log('Notification cancelled:', notificationId);
      return true;
    } catch (error) {
      console.error('Error cancelling notification:', error);
      return false;
    }
  }

  async cancelAllNotifications(): Promise<boolean> {
    try {
      // Mock implementation
      await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_NOTIFICATIONS);
      console.log('All notifications cancelled');
      return true;
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
      return false;
    }
  }

  // ========================================
  // NOTIFICACIONES INMEDIATAS
  // ========================================
  async showNotification(notification: LocalNotificationInput): Promise<void> {
    try {
      if (!this.settings.enabled) {
        return;
      }

      if (this.isQuietTime()) {
        return;
      }

      // En React Native, usar Alert como fallback
      if (Platform.OS === 'web') {
        // Para web, usar notificaciones del navegador
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(notification.title, {
            body: notification.body,
            icon: '/icon.png'
          });
        } else {
          Alert.alert(notification.title, notification.body);
        }
      } else {
        // Para móviles, usar Alert como fallback simple
        Alert.alert(notification.title, notification.body);
      }

      // Guardar en historial
      await this.saveToHistory(notification);
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  // ========================================
  // CONFIGURACIÓN
  // ========================================
  async updateSettings(newSettings: Partial<NotificationSettings>): Promise<void> {
    try {
      this.settings = { ...this.settings, ...newSettings };
      await this.saveSettings();
    } catch (error) {
      console.error('Error updating notification settings:', error);
    }
  }

  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  private async loadSettings(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS);
      if (stored) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
      this.settings = DEFAULT_SETTINGS;
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.NOTIFICATION_SETTINGS,
        JSON.stringify(this.settings)
      );
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  }

  // ========================================
  // HORARIO SILENCIOSO
  // ========================================
  private isQuietTime(): boolean {
    if (!this.settings.quiet.enabled) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const startTime = this.parseTime(this.settings.quiet.startTime);
    const endTime = this.parseTime(this.settings.quiet.endTime);

    if (startTime <= endTime) {
      // Mismo día (ej: 08:00 - 22:00)
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Cruza medianoche (ej: 22:00 - 08:00)
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  private parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // ========================================
  // GESTIÓN DE HISTORIAL
  // ========================================
  private async saveToHistory(notification: LocalNotificationInput): Promise<void> {
    try {
      const history = await this.getNotificationHistory();
      const historyItem = {
        id: Date.now().toString(),
        title: notification.title,
        body: notification.body,
        timestamp: new Date(),
        data: notification.data
      };

      history.unshift(historyItem);
      
      // Mantener solo los últimos 100 elementos
      const trimmedHistory = history.slice(0, 100);
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.NOTIFICATION_HISTORY,
        JSON.stringify(trimmedHistory)
      );
    } catch (error) {
      console.error('Error saving notification to history:', error);
    }
  }

  async getNotificationHistory(): Promise<any[]> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_HISTORY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting notification history:', error);
      return [];
    }
  }

  async clearNotificationHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.NOTIFICATION_HISTORY);
    } catch (error) {
      console.error('Error clearing notification history:', error);
    }
  }

  // ========================================
  // NOTIFICACIONES PENDIENTES
  // ========================================
  private async savePendingNotification(
    id: string, 
    notification: LocalNotificationInput
  ): Promise<void> {
    try {
      const pending = await this.getPendingNotifications();
      pending[id] = {
        ...notification,
        scheduledAt: new Date()
      };
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.PENDING_NOTIFICATIONS,
        JSON.stringify(pending)
      );
    } catch (error) {
      console.error('Error saving pending notification:', error);
    }
  }

  private async removePendingNotification(id: string): Promise<void> {
    try {
      const pending = await this.getPendingNotifications();
      delete pending[id];
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.PENDING_NOTIFICATIONS,
        JSON.stringify(pending)
      );
    } catch (error) {
      console.error('Error removing pending notification:', error);
    }
  }

  private async getPendingNotifications(): Promise<{ [key: string]: any }> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_NOTIFICATIONS);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error getting pending notifications:', error);
      return {};
    }
  }

  // ========================================
  // NOTIFICACIONES PREDEFINIDAS
  // ========================================
  async notifyImageGenerated(imageUrl: string, prompt: string): Promise<void> {
    await this.showNotification({
      title: '¡Imagen generada!',
      body: `Tu imagen "${prompt.slice(0, 30)}..." está lista`,
      data: { type: 'image_generated', imageUrl, prompt }
    });
  }

  async notifyVideoGenerated(videoUrl: string, prompt: string): Promise<void> {
    await this.showNotification({
      title: '¡Video generado!',
      body: `Tu video "${prompt.slice(0, 30)}..." está listo`,
      data: { type: 'video_generated', videoUrl, prompt }
    });
  }

  async notifyNewMessage(conversationTitle: string, message: string): Promise<void> {
    await this.showNotification({
      title: conversationTitle,
      body: message.slice(0, 100) + (message.length > 100 ? '...' : ''),
      data: { type: 'new_message', conversationTitle }
    });
  }

  async notifySystemUpdate(title: string, message: string): Promise<void> {
    await this.showNotification({
      title,
      body: message,
      data: { type: 'system_update' }
    });
  }

  // ========================================
  // UTILIDADES
  // ========================================
  async testNotification(): Promise<void> {
    await this.showNotification({
      title: 'Notificación de prueba',
      body: 'Las notificaciones están funcionando correctamente',
      data: { type: 'test' }
    });
  }

  // Verificar si las notificaciones están habilitadas para un tipo específico
  isNotificationTypeEnabled(type: keyof NotificationSettings['types']): boolean {
    return this.settings.enabled && this.settings.types[type];
  }
}

// ========================================
// EXPORTAR INSTANCIA SINGLETON
// ========================================
export const notificationManager = NotificationManager.getInstance();

// ========================================
// FUNCIONES DE CONVENIENCIA
// ========================================
export const initializeNotifications = async (): Promise<void> => {
  await notificationManager.initialize();
};

export const requestNotificationPermissions = async (): Promise<NotificationPermissionStatus> => {
  return await notificationManager.requestPermissions();
};

export const showNotification = async (notification: LocalNotificationInput): Promise<void> => {
  await notificationManager.showNotification(notification);
};

export const scheduleNotification = async (notification: LocalNotificationInput): Promise<string | null> => {
  return await notificationManager.scheduleNotification(notification);
};

export const updateNotificationSettings = async (settings: Partial<NotificationSettings>): Promise<void> => {
  await notificationManager.updateSettings(settings);
};

export const getNotificationSettings = (): NotificationSettings => {
  return notificationManager.getSettings();
};

// Exportar tipos
export type {
  NotificationPermissionStatus,
  LocalNotificationInput,
  NotificationSettings
};