// src/lib/firebase.ts
import { initializeApp, FirebaseApp } from 'firebase/app';
// CORRECCIÓN: La importación correcta para la persistencia en React Native es desde 'firebase/auth/react-native'
import { getAuth, initializeAuth, Auth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getFunctions, httpsCallable, Functions } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Tipos
import type {
  UserProfile,
  ChatWithAIInput,
  ChatWithAIOutput,
  GenerateImageInput,
  GenerateImageOutput,
  GenerateVideoInput,
  GenerateVideoOutput,
} from './types';

// Configuración de Firebase
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Inicializar Firebase
export const app: FirebaseApp = initializeApp(firebaseConfig);

// Inicializar Auth con persistencia correcta.
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export { auth };
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
// Especifica la región de tus funciones para evitar latencia y errores.
export const functions: Functions = getFunctions(app, 'us-central1');

// ========================================
// CLOUD FUNCTIONS WRAPPER
// ========================================
class CloudFunctions {
  private functionsInstance: Functions;

  constructor() {
    this.functionsInstance = functions;
  }

  private async call<RequestData, ResponseData>(functionName: string, data?: RequestData): Promise<ResponseData> {
    const func = httpsCallable<RequestData, ResponseData>(this.functionsInstance, functionName);
    const result = await func(data);
    return result.data;
  }
  
  // --- Profile Functions ---
  async getUserProfile(): Promise<UserProfile> {
    const result = await this.call<void, { userProfile: UserProfile }>('getUserProfile');
    return result.userProfile;
  }

  async createUserProfile(userProfile: UserProfile): Promise<void> {
    await this.call('createUserProfile', { userProfile });
  }

  async updateUserProfile(data: Partial<UserProfile>, user: any): Promise<void> {
      await this.call('updateUserProfile', { data, userId: user.uid });
  }
  
  async updateLastLogin(userId: string): Promise<void> {
    await this.call('updateLastLogin', { userId });
  }

  // --- AI & Generation Functions ---
  async chatWithAI(input: ChatWithAIInput): Promise<ChatWithAIOutput> {
    return this.call('chatWithAI', input);
  }

  async generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
    return this.call('generateImage', input);
  }
  
  async generateVideo(input: GenerateVideoInput): Promise<GenerateVideoOutput> {
    return this.call('generateVideo', input);
  }

  async getVideoStatus(videoId: string): Promise<any> {
      return this.call('checkVideoStatus', { videoId });
  }
  
  // --- Other Utility Functions ---
  async searchWeb(query: string): Promise<any> {
    return this.call('searchWeb', { query });
  }

  async processFile(fileData: string, fileType: string): Promise<any> {
      return this.call('processFile', { fileData, fileType });
  }
}

// Instancia singleton de CloudFunctions
export const cloudFunctions = new CloudFunctions();

// ========================================
// FUNCIONES DE UTILIDAD DE AUTENTICACIÓN
// ========================================
export const getAuthToken = async (): Promise<string | null> => {
  try {
    const user = auth.currentUser;
    return user ? await user.getIdToken() : null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

export const isAuthenticated = (): boolean => {
  return !!auth.currentUser;
};

export const getCurrentUser = () => {
  return auth.currentUser;
};

export const signOutUser = async (): Promise<void> => {
  try {
    await auth.signOut();
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

export default {
  app,
  auth,
  db,
  storage,
  functions,
  cloudFunctions,
  getAuthToken,
  isAuthenticated,
  getCurrentUser,
  signOutUser
};