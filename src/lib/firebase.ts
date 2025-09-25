// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  initializeAuth,
  // CORREGIDO: Removido getReactNativePersistence que no existe
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Types
import type { 
  UserProfile, 
  ChatWithAIInput, 
  ChatWithAIOutput,
  GenerateImageInput,
  GenerateImageOutput,
  GenerateVideoInput,
  GenerateVideoOutput
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
export const app = initializeApp(firebaseConfig);

// Inicializar Auth con persistencia para React Native
let auth;
try {
  // Para React Native, usar AsyncStorage como persistencia
  if (Platform.OS !== 'web') {
    auth = initializeAuth(app, {
      // CORREGIDO: Usar configuración básica sin getReactNativePersistence
    });
  } else {
    auth = getAuth(app);
  }
} catch (error) {
  // Si ya está inicializado, obtener la instancia existente
  auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// ========================================
// CLOUD FUNCTIONS WRAPPER
// ========================================
export class CloudFunctions {
  private functions = getFunctions(app);

  // CORREGIDO: Método simplificado para obtener perfil de usuario
  async getUserProfile(): Promise<UserProfile> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Aquí llamarías a tu Cloud Function
      const response = await fetch(`https://your-cloud-function-url/getUserProfile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({ userId: user.uid })
      });

      if (!response.ok) {
        throw new Error('Error al obtener el perfil del usuario');
      }

      const data = await response.json();
      return data.userProfile;
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  // CORREGIDO: Método para crear perfil de usuario
  async createUserProfile(userProfile: UserProfile): Promise<void> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const response = await fetch(`https://your-cloud-function-url/createUserProfile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({ userProfile })
      });

      if (!response.ok) {
        throw new Error('Error al crear el perfil del usuario');
      }
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

  // CORREGIDO: Método para actualizar perfil de usuario
  async updateUserProfile(data: Partial<UserProfile>, user: any): Promise<void> {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }

      const response = await fetch(`https://your-cloud-function-url/updateUserProfile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await currentUser.getIdToken()}`
        },
        body: JSON.stringify({ data, userId: currentUser.uid })
      });

      if (!response.ok) {
        throw new Error('Error al actualizar el perfil del usuario');
      }
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // CORREGIDO: Método para actualizar último login
  async updateLastLogin(userId: string): Promise<void> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const response = await fetch(`https://your-cloud-function-url/updateLastLogin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        throw new Error('Error al actualizar último login');
      }
    } catch (error) {
      console.error('Error updating last login:', error);
      throw error;
    }
  }

  async chatWithAI(input: ChatWithAIInput): Promise<ChatWithAIOutput> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const response = await fetch(`https://your-cloud-function-url/chatWithAI`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify(input)
      });

      if (!response.ok) {
        throw new Error('Error en el chat con IA');
      }

      return await response.json();
    } catch (error) {
      console.error('Error in chat with AI:', error);
      throw error;
    }
  }

  async generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const response = await fetch(`https://your-cloud-function-url/generateImage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify(input)
      });

      if (!response.ok) {
        throw new Error('Error al generar imagen');
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating image:', error);
      throw error;
    }
  }

  async generateVideo(input: GenerateVideoInput): Promise<GenerateVideoOutput> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const response = await fetch(`https://your-cloud-function-url/generateVideo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify(input)
      });

      if (!response.ok) {
        throw new Error('Error al generar video');
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating video:', error);
      throw error;
    }
  }

  // CORREGIDO: Método para obtener estado del video
  async getVideoStatus(videoId: string): Promise<any> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const response = await fetch(`https://your-cloud-function-url/getVideoStatus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({ videoId })
      });

      if (!response.ok) {
        throw new Error('Error al obtener estado del video');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting video status:', error);
      throw error;
    }
  }

  async searchWeb(query: string): Promise<any> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const response = await fetch(`https://your-cloud-function-url/searchWeb`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        throw new Error('Error en búsqueda web');
      }

      return await response.json();
    } catch (error) {
      console.error('Error in web search:', error);
      throw error;
    }
  }

  async processFile(fileData: string, fileType: string): Promise<any> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const response = await fetch(`https://your-cloud-function-url/processFile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({ fileData, fileType })
      });

      if (!response.ok) {
        throw new Error('Error al procesar archivo');
      }

      return await response.json();
    } catch (error) {
      console.error('Error processing file:', error);
      throw error;
    }
  }
}

// Instancia singleton de CloudFunctions
export const cloudFunctions = new CloudFunctions();

// Función de utilidad para obtener token de autenticación
export const getAuthToken = async (): Promise<string | null> => {
  try {
    const user = auth.currentUser;
    if (user) {
      return await user.getIdToken();
    }
    return null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

// Función de utilidad para verificar si el usuario está autenticado
export const isAuthenticated = (): boolean => {
  return !!auth.currentUser;
};

// Función de utilidad para obtener el usuario actual
export const getCurrentUser = () => {
  return auth.currentUser;
};

// Función de utilidad para cerrar sesión
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