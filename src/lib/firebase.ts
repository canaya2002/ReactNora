// src/lib/firebase.ts - CONFIGURACIÓN FIREBASE CORREGIDA
import { initializeApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  Auth,
  initializeAuth,
  getReactNativePersistence
} from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getFunctions, Functions, httpsCallable } from 'firebase/functions';
import { getStorage, Storage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Tipos
import { 
  ChatMessage, 
  Conversation, 
  UserProfile, 
  GenerateImageInput, 
  GenerateImageOutput,
  GenerateVideoInput,
  GenerateVideoOutput,
  ChatWithAIInput,
  ChatWithAIOutput
} from './types';

// ========================================
// CONFIGURACIÓN FIREBASE
// ========================================
const firebaseConfig = {
  apiKey: "AIzaSyCxGv7lE1gQGj_-EIJC6JU-vPGqJGv5k9g",
  authDomain: "ia-assistance-1fbcc.firebaseapp.com",
  projectId: "ia-assistance-1fbcc",
  storageBucket: "ia-assistance-1fbcc.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456789012345",
  measurementId: "G-ABCDEFG123"
};

// ========================================
// INICIALIZACIÓN
// ========================================
let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;
let functions: Functions;
let storage: Storage;

try {
  // Inicializar Firebase App
  app = initializeApp(firebaseConfig);
  
  // Inicializar Auth con persistencia para React Native
  if (Platform.OS === 'web') {
    auth = getAuth(app);
  } else {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  }
  
  // Inicializar otros servicios
  firestore = getFirestore(app);
  functions = getFunctions(app);
  storage = getStorage(app);
  
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase:', error);
  throw error;
}

// ========================================
// CLOUD FUNCTIONS WRAPPER
// ========================================
class CloudFunctions {
  
  // ========================================
  // FUNCIONES DE CHAT
  // ========================================
  async chatWithAI(input: ChatWithAIInput): Promise<ChatWithAIOutput> {
    try {
      const chatFunction = httpsCallable<ChatWithAIInput, ChatWithAIOutput>(functions, 'chatWithAI');
      const result = await chatFunction(input);
      return result.data;
    } catch (error: any) {
      console.error('Error in chatWithAI:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  // ========================================
  // FUNCIONES DE GENERACIÓN DE IMÁGENES
  // ========================================
  async generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
    try {
      const generateFunction = httpsCallable<GenerateImageInput, GenerateImageOutput>(functions, 'generateImage');
      const result = await generateFunction(input);
      return result.data;
    } catch (error: any) {
      console.error('Error in generateImage:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  // ========================================
  // FUNCIONES DE GENERACIÓN DE VIDEOS
  // ========================================
  async generateVideo(input: GenerateVideoInput): Promise<GenerateVideoOutput> {
    try {
      const generateFunction = httpsCallable<GenerateVideoInput, GenerateVideoOutput>(functions, 'generateVideo');
      const result = await generateFunction(input);
      return result.data;
    } catch (error: any) {
      console.error('Error in generateVideo:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  async getVideoStatus(videoId: string): Promise<GenerateVideoOutput> {
    try {
      const statusFunction = httpsCallable<{ videoId: string }, GenerateVideoOutput>(functions, 'getVideoStatus');
      const result = await statusFunction({ videoId });
      return result.data;
    } catch (error: any) {
      console.error('Error getting video status:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  // ========================================
  // FUNCIONES DE USUARIO
  // ========================================
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const getProfileFunction = httpsCallable<{ userId: string }, { profile: UserProfile | null }>(functions, 'getUserProfile');
      const result = await getProfileFunction({ userId });
      return result.data.profile;
    } catch (error: any) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  async createUserProfile(profile: UserProfile): Promise<void> {
    try {
      const createFunction = httpsCallable<{ profile: UserProfile }, { success: boolean }>(functions, 'createUserProfile');
      await createFunction({ profile });
    } catch (error: any) {
      console.error('Error creating user profile:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  async updateUserProfile(updates: Partial<UserProfile>, user: any): Promise<void> {
    try {
      const updateFunction = httpsCallable<{ updates: any; userId: string }, { success: boolean }>(functions, 'updateUserProfile');
      await updateFunction({ 
        updates: {
          displayName: updates.user?.displayName,
          photoURL: updates.user?.photoURL
        }, 
        userId: user.uid 
      });
    } catch (error: any) {
      console.error('Error updating user profile:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  async updateLastLogin(userId: string): Promise<void> {
    try {
      const updateFunction = httpsCallable<{ userId: string }, { success: boolean }>(functions, 'updateLastLogin');
      await updateFunction({ userId });
    } catch (error: any) {
      console.warn('Error updating last login:', error);
      // No lanzar error para no bloquear el login
    }
  }

  // ========================================
  // FUNCIONES DE CONVERSACIONES
  // ========================================
  async createConversation(conversation: Conversation): Promise<void> {
    try {
      const createFunction = httpsCallable<{ conversation: Conversation }, { success: boolean }>(functions, 'createConversation');
      await createFunction({ conversation });
    } catch (error: any) {
      console.error('Error creating conversation:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  async updateConversation(conversationId: string, updates: Partial<Conversation>): Promise<void> {
    try {
      const updateFunction = httpsCallable<{ conversationId: string; updates: Partial<Conversation> }, { success: boolean }>(functions, 'updateConversation');
      await updateFunction({ conversationId, updates });
    } catch (error: any) {
      console.error('Error updating conversation:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  async deleteConversation(conversationId: string): Promise<void> {
    try {
      const deleteFunction = httpsCallable<{ conversationId: string }, { success: boolean }>(functions, 'deleteConversation');
      await deleteFunction({ conversationId });
    } catch (error: any) {
      console.error('Error deleting conversation:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  async getUserConversations(userId: string): Promise<Conversation[]> {
    try {
      const getFunction = httpsCallable<{ userId: string }, { conversations: Conversation[] }>(functions, 'getUserConversations');
      const result = await getFunction({ userId });
      return result.data.conversations;
    } catch (error: any) {
      console.error('Error getting user conversations:', error);
      return [];
    }
  }

  // ========================================
  // FUNCIONES DE MENSAJES
  // ========================================
  async addMessage(conversationId: string, message: ChatMessage): Promise<void> {
    try {
      const addFunction = httpsCallable<{ conversationId: string; message: ChatMessage }, { success: boolean }>(functions, 'addMessage');
      await addFunction({ conversationId, message });
    } catch (error: any) {
      console.error('Error adding message:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  // ========================================
  // FUNCIONES DE SUSCRIPCIONES
  // ========================================
  async createSubscription(priceId: string, userId: string): Promise<{ clientSecret: string }> {
    try {
      const createFunction = httpsCallable<{ priceId: string; userId: string }, { clientSecret: string }>(functions, 'createSubscription');
      const result = await createFunction({ priceId, userId });
      return result.data;
    } catch (error: any) {
      console.error('Error creating subscription:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      const cancelFunction = httpsCallable<{ subscriptionId: string }, { success: boolean }>(functions, 'cancelSubscription');
      await cancelFunction({ subscriptionId });
    } catch (error: any) {
      console.error('Error canceling subscription:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  async getSubscriptionStatus(userId: string): Promise<any> {
    try {
      const statusFunction = httpsCallable<{ userId: string }, any>(functions, 'getSubscriptionStatus');
      const result = await statusFunction({ userId });
      return result.data;
    } catch (error: any) {
      console.error('Error getting subscription status:', error);
      return null;
    }
  }

  // ========================================
  // FUNCIONES DE ANÁLISIS DE ARCHIVOS
  // ========================================
  async analyzeFile(fileData: string, fileType: string, fileName: string): Promise<{ analysis: string }> {
    try {
      const analyzeFunction = httpsCallable<{ fileData: string; fileType: string; fileName: string }, { analysis: string }>(functions, 'analyzeFile');
      const result = await analyzeFunction({ fileData, fileType, fileName });
      return result.data;
    } catch (error: any) {
      console.error('Error analyzing file:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  // ========================================
  // FUNCIONES DE BÚSQUEDA WEB
  // ========================================
  async webSearch(query: string, userId: string): Promise<{ results: any[]; remainingSearches: number }> {
    try {
      const searchFunction = httpsCallable<{ query: string; userId: string }, { results: any[]; remainingSearches: number }>(functions, 'webSearch');
      const result = await searchFunction({ query, userId });
      return result.data;
    } catch (error: any) {
      console.error('Error in web search:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  // ========================================
  // UTILIDADES
  // ========================================
  private getErrorMessage(error: any): string {
    if (error?.code) {
      switch (error.code) {
        case 'functions/permission-denied':
          return 'No tienes permisos para realizar esta acción';
        case 'functions/not-found':
          return 'Función no encontrada';
        case 'functions/unavailable':
          return 'Servicio no disponible temporalmente';
        case 'functions/unauthenticated':
          return 'Debes iniciar sesión';
        case 'functions/resource-exhausted':
          return 'Has excedido el límite de uso';
        case 'functions/deadline-exceeded':
          return 'Tiempo de espera agotado';
        default:
          return error.message || 'Error desconocido';
      }
    }
    
    return error?.message || 'Error en el servidor';
  }

  // Test de conectividad
  async testConnection(): Promise<boolean> {
    try {
      const testFunction = httpsCallable<{}, { success: boolean }>(functions, 'testConnection');
      const result = await testFunction({});
      return result.data.success;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}

// ========================================
// HELPERS ADICIONALES
// ========================================
class Helpers {
  
  // Formatear errores de Firebase
  formatFirebaseError(error: any): string {
    if (!error?.code) return error?.message || 'Error desconocido';
    
    const errorMessages: { [key: string]: string } = {
      'auth/user-not-found': 'Usuario no encontrado',
      'auth/wrong-password': 'Contraseña incorrecta',
      'auth/email-already-in-use': 'El email ya está registrado',
      'auth/weak-password': 'La contraseña es muy débil',
      'auth/invalid-email': 'Email inválido',
      'auth/user-disabled': 'Cuenta deshabilitada',
      'auth/too-many-requests': 'Demasiados intentos, intenta más tarde',
      'auth/network-request-failed': 'Error de conexión'
    };
    
    return errorMessages[error.code] || error.message || 'Error de autenticación';
  }
  
  // Validar conectividad
  async checkConnectivity(): Promise<boolean> {
    try {
      return await cloudFunctions.testConnection();
    } catch {
      return false;
    }
  }
  
  // Generar ID único
  generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
  
  // Formatear fecha
  formatDate(date: Date): string {
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // Truncar texto
  truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '...';
  }
  
  // Validar email
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  // Validar contraseña
  isValidPassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 6) {
      errors.push('Debe tener al menos 6 caracteres');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Debe contener al menos una mayúscula');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Debe contener al menos una minúscula');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Debe contener al menos un número');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// ========================================
// INSTANCIAS Y EXPORTACIONES
// ========================================
const cloudFunctions = new CloudFunctions();
const helpers = new Helpers();

// Exportar servicios
export {
  app,
  auth,
  firestore,
  functions,
  storage,
  cloudFunctions,
  helpers
};

// Exportar por defecto la configuración
export default {
  app,
  auth,
  firestore,
  functions,
  storage,
  cloudFunctions,
  helpers
};