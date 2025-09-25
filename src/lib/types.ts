// src/lib/types.ts
import { Timestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

// ========================================
// TIPOS Y CONSTANTES FUNDAMENTALES
// ========================================

// CORREGIDO: Se define un tipo explícito para los nombres de los iconos de Ionicons.
// Esta es la forma correcta y robusta de obtener los nombres de los iconos.
export type IoniconName = keyof (typeof Ionicons)['glyphMap'];

export type MessageType = 'user' | 'assistant';
export type SpecialtyType = 'general' | 'developer' | 'creative' | 'analyst' | 'researcher';
export type PlanType = 'free' | 'basic' | 'premium' | 'pro';
export type FilterType = 'all' | 'favorites' | 'archived';
export type SortType = 'recent' | 'oldest' | 'alphabetical';

export const SPECIALISTS: {
  id: SpecialtyType;
  name: string;
  description: string;
  icon: IoniconName; // Usando el tipo corregido
  color: string;
}[] = [
  { id: 'general', name: 'Asistente General', description: 'Ayuda con tareas cotidianas', icon: 'chatbubbles-outline', color: '#3b82f6' },
  { id: 'developer', name: 'Asistente de Código', description: 'Ayuda con programación', icon: 'code-slash-outline', color: '#10b981' },
  { id: 'creative', name: 'Asistente Creativo', description: 'Para escritura e ideas', icon: 'bulb-outline', color: '#f59e0b' },
  { id: 'analyst', name: 'Asistente de Análisis', description: 'Analiza datos y documentos', icon: 'analytics-outline', color: '#ef4444' },
  { id: 'researcher', name: 'Asistente de Búsqueda', description: 'Busca en la web por ti', icon: 'search-outline', color: '#6366f1' },
];

// ========================================
// INTERFACES DE DATOS PRINCIPALES
// ========================================

export interface User {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName?: string | null;
  photoURL?: string | null;
  phoneNumber?: string | null;
  createdAt: Date;
  lastLogin: Date;
}

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
  role: 'user' | 'assistant';
  content: string;
  message: string;
  timestamp: Date;
  attachments?: FileAttachment[];
  fileAttachments?: FileAttachment[];
  tokensUsed?: number;
  model?: string;
  specialist?: SpecialtyType;
  isTyping?: boolean;
  metadata?: {
    model?: string;
    tokensUsed?: number;
  };
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
  isFavorite?: boolean;
  isArchived?: boolean;
  messageCount?: number;
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
// INTERFACES DE PERFIL, PLANES Y SUSCRIPCIÓN
// ========================================

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

export interface UsageLimit {
  limit: number;
  used: number;
  remaining: number;
}

export interface UsageLimits {
  chat: { daily: UsageLimit; monthly: UsageLimit; };
  imageGeneration: { daily: UsageLimit; monthly: UsageLimit; };
  videoGeneration: { daily: UsageLimit; monthly: UsageLimit; };
  webSearch: { daily: UsageLimit; monthly: UsageLimit; };
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
// TIPOS DE ENTRADA/SALIDA PARA FUNCIONES CLOUD
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
// OTROS TIPOS DE UTILIDAD
// ========================================

export type ButtonVariant = 'filled' | 'outlined' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';