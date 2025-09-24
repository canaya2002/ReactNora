// src/lib/types.ts - TIPOS REACT NATIVE CORREGIDOS

// ========================================
// TIPOS BASE PARA REACT NATIVE
// ========================================
export interface ChatMessage {
  id: string;
  message: string;
  type: 'user' | 'assistant';
  timestamp: Date;
  isTyping?: boolean;
  fileAttachments?: FileAttachment[];
  metadata?: {
    model?: string;
    tokensUsed?: number;
    processingTime?: number;
    imageUrl?: string;
    videoUrl?: string;
    audioUrl?: string;
  };
}

export interface FileAttachment {
  id: string;
  name: string;
  type: 'image' | 'pdf' | 'audio' | 'video' | 'document';
  size: number;
  uri: string; // React Native usa uri en lugar de url
  mimeType?: string;
  uploadProgress?: number;
  base64?: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  isArchived?: boolean;
  isFavorite?: boolean;
  specialist?: SpecialtyType;
  tags?: string[];
  summary?: string;
  messageCount: number;
  lastActivity: Date;
}

// ========================================
// TIPOS DE USUARIO Y AUTENTICACIÓN
// ========================================
export interface User {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string;
  createdAt: Date;
  lastLoginAt: Date;
}

export type PlanType = 'free' | 'pro' | 'pro_max';

export const isValidPlan = (plan: string): plan is PlanType => {
  return ['free', 'pro', 'pro_max'].includes(plan);
};

export interface SubscriptionData {
  id: string;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'incomplete';
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  plan: 'pro' | 'pro_max';
  priceId: string;
}

// ========================================
// TIPOS DE FUNCIONALIDADES
// ========================================
export type SpecialtyType = 'general' | 'programming' | 'business' | 'science' | 'education' | 'health' | 'legal' | 'marketing' | 'design' | 'finance' | 'coding' | 'writing' | 'analysis' | 'creative';

// Mantener compatibilidad con código existente
export type SpecialistType = SpecialtyType;

export interface SpecialistModeLimits {
  daily: {
    limit: number;
    used: number;
    remaining: number;
  };
  monthly: {
    limit: number;
    used: number;
    remaining: number;
  };
}

export interface DeveloperModeLimits extends SpecialistModeLimits {}

export interface UsageLimits {
  chat: {
    daily: { limit: number; used: number; remaining: number; };
    monthly: { limit: number; used: number; remaining: number; };
  };
  imageGeneration: {
    daily: { limit: number; used: number; remaining: number; };
    monthly: { limit: number; used: number; remaining: number; };
  };
  videoGeneration: {
    daily: { limit: number; used: number; remaining: number; };
    monthly: { limit: number; used: number; remaining: number; };
  };
  webSearch: {
    daily: { limit: number; used: number; remaining: number; };
    monthly: { limit: number; used: number; remaining: number; };
  };
  chatMessages?: number; // Para compatibilidad
  imagesGenerated?: number; // Para compatibilidad - alias de imageGeneration
  developerMode?: DeveloperModeLimits;
  specialistMode?: {
    [key in SpecialtyType]?: SpecialistModeLimits;
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
    requestId: string;
    timestamp: Date;
    processingTime: number;
  };
}

// ========================================
// CONSTANTES DE ESTILOS DE IMAGEN
// ========================================
export const IMAGE_STYLES = [
  { id: 'photorealistic', name: 'Fotorrealista', premium: false },
  { id: 'digital_art', name: 'Arte Digital', premium: false },
  { id: 'oil_painting', name: 'Óleo', premium: true },
  { id: 'watercolor', name: 'Acuarela', premium: true },
  { id: 'anime', name: 'Anime', premium: false },
  { id: 'cartoon', name: 'Cartoon', premium: false },
  { id: 'sketch', name: 'Boceto', premium: false },
  { id: 'pixel_art', name: 'Pixel Art', premium: true }
] as const;

export const VIDEO_STYLES = [
  { id: 'cinematic', name: 'Cinematográfico', premium: true },
  { id: 'documentary', name: 'Documental', premium: false },
  { id: 'animated', name: 'Animado', premium: true },
  { id: 'time_lapse', name: 'Time Lapse', premium: true }
] as const;