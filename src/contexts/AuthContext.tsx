// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  deleteUser
} from 'firebase/auth';

import { auth, cloudFunctions } from '../lib/firebase';
// CORREGIDO: Import correcto
import { LocalConversationStorageInstance } from '../lib/ConversationStorage';
import { UserProfile, PlanType } from '../lib/types';

// ========================================
// INTERFACES
// ========================================
interface AuthContextType {
  // Usuario y estado
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  
  // Métodos de autenticación
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  
  // Métodos de perfil
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  
  // Estado de carga
  isSigningUp: boolean;
  isSigningIn: boolean;
  isSigningOut: boolean;
  isDeletingAccount: boolean;
}

interface AuthProviderProps {
  children: ReactNode;
}

// ========================================
// CONTEXT
// ========================================
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// ========================================
// PROVIDER
// ========================================
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Estado
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // ========================================
  // EFECTOS
  // ========================================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser ? 'User logged in' : 'User logged out');
      
      try {
        if (firebaseUser) {
          setUser(firebaseUser);
          
          // Actualizar último login
          // CORREGIDO: Método existe en CloudFunctions
          await cloudFunctions.updateLastLogin(firebaseUser.uid);
          
          // Cargar perfil del usuario
          await loadUserProfile(firebaseUser);
        } else {
          setUser(null);
          setUserProfile(null);
          // Limpiar cache local
          await clearUserCache();
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  // ========================================
  // MÉTODOS DE AUTENTICACIÓN
  // ========================================
  const signUp = async (email: string, password: string, displayName?: string): Promise<void> => {
    setIsSigningUp(true);
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Actualizar perfil con displayName si se proporciona
      if (displayName) {
        await updateProfile(firebaseUser, { displayName });
      }

      // Crear perfil inicial de usuario
      await createInitialUserProfile(firebaseUser, displayName);

    } catch (error: any) {
      console.error('Sign up error:', error);
      throw new Error(error.message || 'Error al crear la cuenta');
    } finally {
      setIsSigningUp(false);
    }
  };

  const signIn = async (email: string, password: string): Promise<void> => {
    setIsSigningIn(true);
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw new Error(error.message || 'Error al iniciar sesión');
    } finally {
      setIsSigningIn(false);
    }
  };

  const signOut = async (): Promise<void> => {
    setIsSigningOut(true);
    
    try {
      await firebaseSignOut(auth);
      await clearUserCache();
    } catch (error: any) {
      console.error('Sign out error:', error);
      throw new Error(error.message || 'Error al cerrar sesión');
    } finally {
      setIsSigningOut(false);
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      console.error('Reset password error:', error);
      throw new Error(error.message || 'Error al enviar email de recuperación');
    }
  };

  const deleteAccount = async (): Promise<void> => {
    if (!user) throw new Error('No hay usuario autenticado');
    
    setIsDeletingAccount(true);
    
    try {
      // Eliminar datos del usuario de Firestore (si es necesario)
      // await cloudFunctions.deleteUserData(user.uid);
      
      // Eliminar cuenta de Firebase Auth
      await deleteUser(user);
      
      // Limpiar cache local
      await clearUserCache();
      
    } catch (error: any) {
      console.error('Delete account error:', error);
      throw new Error(error.message || 'Error al eliminar la cuenta');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  // ========================================
  // MÉTODOS DE PERFIL
  // ========================================
  const updateUserProfile = async (data: Partial<UserProfile>): Promise<void> => {
    if (!user) throw new Error('No hay usuario autenticado');
    
    try {
      // CORREGIDO: Método existe en CloudFunctions
      await cloudFunctions.updateUserProfile(data, user);
      
      // Recargar perfil
      await refreshUserProfile();
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  };

  const refreshUserProfile = async (): Promise<void> => {
    if (!user) return;
    
    try {
      await loadUserProfile(user);
    } catch (error) {
      console.error('Error refreshing user profile:', error);
    }
  };

  // ========================================
  // MÉTODOS PRIVADOS
  // ========================================
  const loadUserProfile = async (firebaseUser: FirebaseUser): Promise<void> => {
    try {
      // Intentar cargar desde cache primero
      const cachedProfile = await getUserProfileFromCache(firebaseUser.uid);
      if (cachedProfile) {
        setUserProfile(cachedProfile);
      }

      // Cargar desde servidor
      // CORREGIDO: No pasar parámetros al método
      const profile = await cloudFunctions.getUserProfile();
      setUserProfile(profile);
      
      // Guardar en cache
      await saveUserProfileToCache(profile);
      
    } catch (error) {
      console.error('Error loading user profile:', error);
      // Si hay error, crear perfil básico
      await createBasicUserProfile(firebaseUser);
    }
  };

  const createInitialUserProfile = async (
    firebaseUser: FirebaseUser,
    displayName?: string
  ): Promise<void> => {
    try {
      const initialProfile: UserProfile = {
        user: {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          emailVerified: firebaseUser.emailVerified,
          displayName: displayName || firebaseUser.displayName || undefined,
          photoURL: firebaseUser.photoURL || undefined,
          phoneNumber: firebaseUser.phoneNumber || undefined,
          createdAt: new Date(),
          // CORREGIDO: lastLoginAt -> lastLogin
          lastLogin: new Date()
        },
        // CORREGIDO: Estructura de objetos para usage y limits
        usage: {
          chat: {
            daily: { limit: 50, used: 0, remaining: 50 },
            monthly: { limit: 1000, used: 0, remaining: 1000 }
          },
          imageGeneration: {
            daily: { limit: 10, used: 0, remaining: 10 },
            monthly: { limit: 100, used: 0, remaining: 100 }
          },
          videoGeneration: {
            daily: { limit: 2, used: 0, remaining: 2 },
            monthly: { limit: 10, used: 0, remaining: 10 }
          },
          webSearch: {
            daily: { limit: 20, used: 0, remaining: 20 },
            monthly: { limit: 200, used: 0, remaining: 200 }
          },
          maxTokensPerResponse: 2000
        },
        limits: {
          chat: {
            daily: { limit: 50, used: 0, remaining: 50 },
            monthly: { limit: 1000, used: 0, remaining: 1000 }
          },
          imageGeneration: {
            daily: { limit: 10, used: 0, remaining: 10 },
            monthly: { limit: 100, used: 0, remaining: 100 }
          },
          videoGeneration: {
            daily: { limit: 2, used: 0, remaining: 2 },
            monthly: { limit: 10, used: 0, remaining: 10 }
          },
          webSearch: {
            daily: { limit: 20, used: 0, remaining: 20 },
            monthly: { limit: 200, used: 0, remaining: 200 }
          },
          maxTokensPerResponse: 2000
        },
        planInfo: {
          plan: 'free' as PlanType,
          planName: 'free',
          planDisplayName: 'Plan Gratuito',
          availableFeatures: {
            chat: true,
            voice: false,
            multimedia: true,
            code: true,
            pdf: false,
            liveMode: false,
            imageGeneration: true,
            videoGeneration: false,
            developerMode: false,
            specialistMode: true,
            unlimitedSpecialist: false,
            priorityProcessing: false,
            webSearch: true,
            webSearchLimit: 20
          }
        },
        preferences: {
          theme: 'dark' as const,
          language: 'es' as const,
          notifications: {
            email: true,
            push: true,
            marketing: false
          },
          sound: true,
          haptics: true
        }
      };

      // CORREGIDO: Método existe en CloudFunctions
      await cloudFunctions.createUserProfile(initialProfile);
      setUserProfile(initialProfile);

    } catch (error) {
      console.error('Error creating initial user profile:', error);
      await createBasicUserProfile(firebaseUser);
    }
  };

  const createBasicUserProfile = (firebaseUser: FirebaseUser): void => {
    const basicProfile: UserProfile = {
      user: {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        emailVerified: firebaseUser.emailVerified,
        displayName: firebaseUser.displayName || undefined,
        photoURL: firebaseUser.photoURL || undefined,
        createdAt: new Date(),
        // CORREGIDO: lastLoginAt -> lastLogin
        lastLogin: new Date()
      },
      // CORREGIDO: Estructura de objetos para usage y limits
      usage: {
        chat: {
          daily: { limit: 10, used: 0, remaining: 10 },
          monthly: { limit: 100, used: 0, remaining: 100 }
        },
        imageGeneration: {
          daily: { limit: 3, used: 0, remaining: 3 },
          monthly: { limit: 10, used: 0, remaining: 10 }
        },
        videoGeneration: {
          daily: { limit: 0, used: 0, remaining: 0 },
          monthly: { limit: 0, used: 0, remaining: 0 }
        },
        webSearch: {
          daily: { limit: 5, used: 0, remaining: 5 },
          monthly: { limit: 20, used: 0, remaining: 20 }
        },
        maxTokensPerResponse: 1000
      },
      limits: {
        chat: {
          daily: { limit: 10, used: 0, remaining: 10 },
          monthly: { limit: 100, used: 0, remaining: 100 }
        },
        imageGeneration: {
          daily: { limit: 3, used: 0, remaining: 3 },
          monthly: { limit: 10, used: 0, remaining: 10 }
        },
        videoGeneration: {
          daily: { limit: 0, used: 0, remaining: 0 },
          monthly: { limit: 0, used: 0, remaining: 0 }
        },
        webSearch: {
          daily: { limit: 5, used: 0, remaining: 5 },
          monthly: { limit: 20, used: 0, remaining: 20 }
        },
        maxTokensPerResponse: 1000
      },
      planInfo: {
        plan: 'free' as PlanType,
        planName: 'free',
        planDisplayName: 'Plan Básico',
        availableFeatures: {
          chat: true,
          voice: false,
          multimedia: false,
          code: false,
          pdf: false,
          liveMode: false,
          imageGeneration: true,
          videoGeneration: false,
          developerMode: false,
          specialistMode: false,
          unlimitedSpecialist: false,
          priorityProcessing: false,
          webSearch: true,
          webSearchLimit: 5
        }
      }
    };

    setUserProfile(basicProfile);
  };

  // ========================================
  // MÉTODOS DE CACHE LOCAL
  // ========================================
  const saveUserProfileToCache = async (profile: UserProfile): Promise<void> => {
    try {
      await AsyncStorage.setItem(
        `@nora_user_profile_${profile.user.uid}`,
        JSON.stringify(profile, (key, value) => {
          if (value instanceof Date) {
            return value.toISOString();
          }
          return value;
        })
      );
    } catch (error) {
      console.error('Error saving user profile to cache:', error);
    }
  };

  const getUserProfileFromCache = async (userId: string): Promise<UserProfile | null> => {
    try {
      const cached = await AsyncStorage.getItem(`@nora_user_profile_${userId}`);
      if (!cached) return null;

      const profile = JSON.parse(cached, (key, value) => {
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
          return new Date(value);
        }
        return value;
      });

      return profile;
    } catch (error) {
      console.error('Error loading user profile from cache:', error);
      return null;
    }
  };

  const clearUserCache = async (): Promise<void> => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const userKeys = keys.filter(key => key.startsWith('@nora_user_'));
      await AsyncStorage.multiRemove(userKeys);
      
      // También limpiar conversaciones
      await LocalConversationStorageInstance.clearAllConversations();
    } catch (error) {
      console.error('Error clearing user cache:', error);
    }
  };

  // ========================================
  // VALOR DEL CONTEXTO
  // ========================================
  const contextValue: AuthContextType = {
    // Usuario y estado
    user,
    userProfile,
    loading,
    
    // Métodos de autenticación
    signUp,
    signIn,
    signOut,
    resetPassword,
    deleteAccount,
    
    // Métodos de perfil
    updateUserProfile,
    refreshUserProfile,
    
    // Estado de carga
    isSigningUp,
    isSigningIn,
    isSigningOut,
    isDeletingAccount
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// ========================================
// HOOKS ADICIONALES
// ========================================
export const useUser = () => {
  const { user, userProfile } = useAuth();
  return { user, userProfile };
};

export const useAuthState = () => {
  const { 
    loading, 
    isSigningUp, 
    isSigningIn, 
    isSigningOut, 
    isDeletingAccount 
  } = useAuth();
  
  return { 
    loading, 
    isSigningUp, 
    isSigningIn, 
    isSigningOut, 
    isDeletingAccount 
  };
};

export const useUserProfile = () => {
  const { userProfile, updateUserProfile, refreshUserProfile } = useAuth();
  
  return { 
    userProfile, 
    updateUserProfile, 
    refreshUserProfile 
  };
};

export default AuthProvider;