// src/lib/types.ts
import { Timestamp } from 'firebase/firestore';

// ========================================
// TIPOS BASE
// ========================================
export interface User {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string;
  createdAt: Date;
  lastLogin: Date; // Cambio: lastLoginAt -> lastLogin
}

export type MessageType = 'user' | 'assistant';
export type SpecialtyType = 'general' | 'developer' | 'creative' | 'analyst' | 'researcher';

export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  uri: string;
  data?: string;
}

export interface ChatMessage {
  id: string;
  type: MessageType;
  message: string;
  timestamp: Date;
  files?: FileAttachment[];
  tokensUsed?: number;
  model?: string;
  specialist?: SpecialtyType;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  tokensUsed: number;
  specialist?: SpecialtyType;
  userId?: string;
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  style: string;
  timestamp: Date;
  aspectRatio?: string;
}

export interface GeneratedVideo {
  id: string;
  videoId: string;
  url?: string;
  thumbnailUrl?: string;
  prompt: string;
  style: string;
  status: 'processing' | 'completed' | 'failed';
  estimatedTime?: number;
  timestamp: Date;
  duration?: number;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  timestamp?: Date;
}

// ========================================
// TIPOS DE SUSCRIPCIÓN
// ========================================
export type PlanType = 'free' | 'basic' | 'premium' | 'pro';

export interface SubscriptionData {
  id: string;
  customerId: string;
  status: 'active' | 'canceled' | 'incomplete' | 'past_due' | 'trialing';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  priceId: string;
  planType: PlanType;
  trialEnd?: Date;
}

// ========================================
// TIPOS DE LÍMITES DE USO - CORREGIDOS
// ========================================
export interface UsageLimit {
  limit: number;
  used: number;
  remaining: number;
}

export interface UsageLimits {
  // Chat limits
  chat: {
    daily: UsageLimit;
    monthly: UsageLimit;
  };
  
  // Image generation
  imageGeneration: {
    daily: UsageLimit;
    monthly: UsageLimit;
  };
  
  // Video generation
  videoGeneration: {
    daily: UsageLimit;
    monthly: UsageLimit;
  };
  
  // Web search
  webSearch: {
    daily: UsageLimit;
    monthly: UsageLimit;
  };
  
  maxTokensPerResponse: number;
}

export interface AvailableFeatures {
  chat: boolean;
  voice: boolean;
  multimedia: boolean;
  code: boolean;
  pdf: boolean;
  liveMode: boolean;
  imageGeneration: boolean;
  videoGeneration: boolean;
  developerMode: boolean;
  specialistMode: boolean;
  unlimitedSpecialist: boolean;
  priorityProcessing: boolean;
  webSearch: boolean;
  webSearchLimit: number;
}

export interface PlanInfo {
  plan: PlanType;
  planName: string;
  planDisplayName: string;
  subscription?: SubscriptionData;
  availableFeatures: AvailableFeatures;
  stripeCustomerId?: string;
  isTrial?: boolean;
  trialEndDate?: Date;
}

export interface UserProfile {
  user: User;
  usage: UsageLimits;
  limits: UsageLimits;
  planInfo: PlanInfo;
  // Propiedades adicionales para compatibilidad
  plan?: PlanType;
  displayName?: string;
  photoURL?: string;
  preferences?: {
    theme: 'dark' | 'light';
    language: 'es' | 'en';
    notifications: boolean | {
      email: boolean;
      push: boolean;
      marketing: boolean;
    };
    sound: boolean;
    haptics: boolean;
  };
}

// ========================================
// TIPOS DE ENTRADA PARA FUNCIONES CLOUD
// ========================================
export interface ChatWithAIInput {
  message: string;
  chatHistory?: ChatMessage[];
  fileContext?: string;
  searchContext?: string;
  specialist?: SpecialtyType;
  fileAttachments?: FileAttachment[];
  userId?: string;
}

export interface ChatWithAIOutput {
  response: string;
  tokensUsed: number;
  model: string;
  conversationId?: string;
  remainingDaily: number;
  remainingMonthly: number;
}

export interface GenerateImageInput {
  prompt: string;
  style?: string;
  aspectRatio?: string;
  enhance?: boolean;
  userId?: string;
}

export interface GenerateImageOutput {
  imageUrl: string;
  prompt: string;
  revisedPrompt?: string;
  style: string;
  aspectRatio: string;
  tokensUsed?: number;
  remainingDaily: number;
  remainingMonthly: number;
}

export interface GenerateVideoInput {
  prompt: string;
  style?: string;
  aspectRatio?: string;
  duration?: number;
}

export interface GenerateVideoOutput {
  videoId: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  status: 'processing' | 'completed' | 'failed';
  prompt: string;
  style: string;
  aspectRatio: string;
  estimatedTime?: number;
  remainingDaily: number;
  remainingMonthly: number;
}

// ========================================
// TIPOS PARA REACT NATIVE ESPECÍFICOS
// ========================================
export interface NavigationProps {
  navigation: any;
  route: any;
}

export interface PermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: 'granted' | 'denied' | 'undetermined';
}

export interface DeviceCapabilities {
  hasCamera: boolean;
  hasMicrophone: boolean;
  canRecordAudio: boolean;
  canAccessMediaLibrary: boolean;
  canVibrate: boolean;
  supportsHaptics: boolean;
}

export interface AppState {
  isActive: boolean;
  isBackground: boolean;
  isInactive: boolean;
}

// ========================================
// TIPOS DE RESPUESTA API
// ========================================
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: Date;
    version: string;
    requestId: string;
  };
}

// ========================================
// TIPOS DE CONFIGURACIÓN
// ========================================
export interface AppConfig {
  apiUrl: string;
  environment: 'development' | 'staging' | 'production';
  features: {
    [key: string]: boolean;
  };
  limits: {
    maxFileSize: number;
    maxFilesPerUpload: number;
    supportedFileTypes: string[];
  };
}

// ========================================
// TIPOS DE NOTIFICACIÓN
// ========================================
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

// ========================================
// TIPOS DE ANÁLISIS
// ========================================
export interface AnalyticsEvent {
  name: string;
  properties?: {
    [key: string]: any;
  };
  timestamp: Date;
  userId?: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: 'en' | 'es';
  notifications: {
    email: boolean;
    push: boolean;
    marketing: boolean;
  };
  privacy: {
    analytics: boolean;
    crashReporting: boolean;
  };
  appearance: {
    fontSize: 'small' | 'medium' | 'large';
    colorBlind: boolean;
    highContrast: boolean;
  };
}

// ========================================
// TIPOS DE ERROR
// ========================================
export interface AppError {
  code: string;
  message: string;
  stack?: string;
  timestamp: Date;
  userId?: string;
  context?: {
    [key: string]: any;
  };
}

export type ErrorCode = 
  | 'NETWORK_ERROR'
  | 'AUTH_ERROR'
  | 'PERMISSION_DENIED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'STORAGE_ERROR'
  | 'UNKNOWN_ERROR';

// ========================================
// TIPOS DE COMPONENTES UI
// ========================================
export interface ThemeColors {
  primary: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
  secondary: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
  gray: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
  success: string;
  warning: string;
  error: string;
  info: string;
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
    glass: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  border: {
    primary: string;
    secondary: string;
  };
  opacity: {
    light: number;
    medium: number;
    heavy: number;
  };
}

export interface ComponentVariant {
  filled?: boolean;
  outlined?: boolean;
  ghost?: boolean;
}

export type ButtonVariant = 'filled' | 'outlined' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type InputVariant = 'default' | 'filled' | 'outlined';
export type InputSize = 'sm' | 'md' | 'lg';

// ========================================
// TIPOS ESPECÍFICOS DE FIREBASE
// ========================================
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export interface FirestoreDocument {
  id: string;
  data: {
    [key: string]: any;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ========================================
// EXPORTS ADICIONALES
// ========================================
export default {
  User,
  ChatMessage,
  Conversation,
  UserProfile,
  GeneratedImage,
  GeneratedVideo,
  PlanType,
  SpecialtyType,
  MessageType
};