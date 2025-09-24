// src/contexts/AuthContext.tsx - CONTEXTO DE AUTENTICACIÓN (CORREGIDO)
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile as firebaseUpdateProfile
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// Firebase y tipos
import { auth, cloudFunctions } from '../lib/firebase';
import { User, UserProfile, PlanType } from '../lib/types';

// ========================================
// INTERFACES
// ========================================
interface AuthContextType {
  // Estado de autenticación
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  
  // Métodos de autenticación
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  
  // Métodos de perfil
  updateProfile: (data: { displayName?: string; photoURL?: string }) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  
  // Utilidades
  checkAuthState: () => Promise<void>;
}

interface AuthProviderProps {
  children: ReactNode;
}

// ========================================
// CONTEXTO
// ========================================
const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// ========================================
// PROVIDER COMPONENT
// ========================================
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Estados
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Estado derivado
  const isAuthenticated = !!user;

  // ========================================
  // EFECTOS
  // ========================================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setUser(firebaseUser);
        
        if (firebaseUser) {
          // Usuario autenticado - cargar perfil
          await loadUserProfile(firebaseUser);
        } else {
          // Usuario no autenticado - limpiar estado
          setUserProfile(null);
          await clearLocalData();
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        Alert.alert('Error', 'Error al cargar el perfil de usuario');
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  // ========================================
  // MÉTODOS DE AUTENTICACIÓN
  // ========================================
  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Actualizar último login
      await cloudFunctions.updateLastLogin(firebaseUser.uid);
      
      // El perfil se cargará automáticamente en onAuthStateChanged
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw new Error(getAuthErrorMessage(error.code));
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, displayName?: string): Promise<void> => {
    try {
      setLoading(true);
      
      // Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Actualizar perfil con displayName si se proporciona
      if (displayName) {
        await firebaseUpdateProfile(firebaseUser, { displayName });
      }
      
      // Crear perfil de usuario en Firestore
      await createInitialUserProfile(firebaseUser, displayName);
      
      // El perfil se cargará automáticamente en onAuthStateChanged
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw new Error(getAuthErrorMessage(error.code));
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      setLoading(true);
      await firebaseSignOut(auth);
      // El estado se limpiará automáticamente en onAuthStateChanged
    } catch (error: any) {
      console.error('Sign out error:', error);
      throw new Error('Error al cerrar sesión');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      console.error('Reset password error:', error);
      throw new Error(getAuthErrorMessage(error.code));
    }
  };

  // ========================================
  // MÉTODOS DE PERFIL
  // ========================================
  const updateProfile = async (data: { displayName?: string; photoURL?: string }): Promise<void> => {
    if (!user || !userProfile) {
      throw new Error('Usuario no autenticado');
    }

    try {
      setLoading(true);
      
      // Actualizar perfil en Firebase Auth
      await firebaseUpdateProfile(user, data);
      
      // Actualizar perfil en Firestore
      const updatedProfile: Partial<UserProfile> = {
        ...userProfile,
        user: {
          ...userProfile.user,
          displayName: data.displayName || userProfile.user.displayName,
          photoURL: data.photoURL || userProfile.user.photoURL,
        }
      };
      
      await cloudFunctions.updateUserProfile(data, user);
      setUserProfile(updatedProfile as UserProfile);
      
      // Actualizar cache local
      await saveUserProfileToCache(updatedProfile as UserProfile);
      
    } catch (error: any) {
      console.error('Update profile error:', error);
      throw new Error('Error al actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const refreshUserProfile = async (): Promise<void> => {
    if (!user) return;
    
    try {
      await loadUserProfile(user);
    } catch (error) {
      console.error('Error refreshing user profile:', error);
      throw new Error('Error al actualizar el perfil');
    }
  };

  const checkAuthState = async (): Promise<void> => {
    // Este método ya está manejado por onAuthStateChanged
    // Se mantiene por compatibilidad
  };

  // ========================================
  // MÉTODOS AUXILIARES
  // ========================================
  const loadUserProfile = async (firebaseUser: FirebaseUser): Promise<void> => {
    try {
      // Intentar cargar desde cache local primero
      const cachedProfile = await loadUserProfileFromCache(firebaseUser.uid);
      if (cachedProfile) {
        setUserProfile(cachedProfile);
      }

      // Cargar perfil actualizado desde Firestore
      const profile = await cloudFunctions.getUserProfile(firebaseUser.uid);
      
      if (profile) {
        setUserProfile(profile);
        await saveUserProfileToCache(profile);
      } else {
        // Si no existe perfil, crear uno nuevo
        await createInitialUserProfile(firebaseUser);
      }
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
      const initialProfile: Partial<UserProfile> = {
        user: {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          emailVerified: firebaseUser.emailVerified,
          displayName: displayName || firebaseUser.displayName || undefined,
          photoURL: firebaseUser.photoURL || undefined,
          phoneNumber: firebaseUser.phoneNumber || undefined,
          createdAt: new Date(),
          lastLoginAt: new Date()
        },
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

      // Crear perfil en Firestore
      await cloudFunctions.createUserProfile(initialProfile as UserProfile);
      setUserProfile(initialProfile as UserProfile);
      
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
        lastLoginAt: new Date()
      },
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
        plan: 'free',
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
            return { __type: 'Date', __value: value.toISOString() };
          }
          return value;
        })
      );
    } catch (error) {
      console.error('Error saving user profile to cache:', error);
    }
  };

  const loadUserProfileFromCache = async (userId: string): Promise<UserProfile | null> => {
    try {
      const cached = await AsyncStorage.getItem(`@nora_user_profile_${userId}`);
      if (cached) {
        return JSON.parse(cached, (key, value) => {
          if (value && typeof value === 'object' && value.__type === 'Date') {
            return new Date(value.__value);
          }
          return value;
        });
      }
      return null;
    } catch (error) {
      console.error('Error loading user profile from cache:', error);
      return null;
    }
  };

  const clearLocalData = async (): Promise<void> => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const noraKeys = keys.filter(key => key.startsWith('@nora_'));
      await AsyncStorage.multiRemove(noraKeys);
    } catch (error) {
      console.error('Error clearing local data:', error);
    }
  };

  // ========================================
  // UTILIDADES
  // ========================================
  const getAuthErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'No existe una cuenta con este email';
      case 'auth/wrong-password':
        return 'Contraseña incorrecta';
      case 'auth/email-already-in-use':
        return 'Ya existe una cuenta con este email';
      case 'auth/weak-password':
        return 'La contraseña debe tener al menos 6 caracteres';
      case 'auth/invalid-email':
        return 'Email inválido';
      case 'auth/user-disabled':
        return 'Esta cuenta ha sido deshabilitada';
      case 'auth/too-many-requests':
        return 'Demasiados intentos. Intenta más tarde';
      case 'auth/network-request-failed':
        return 'Error de conexión. Verifica tu internet';
      default:
        return 'Error de autenticación';
    }
  };

  // ========================================
  // VALOR DEL CONTEXTO
  // ========================================
  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    refreshUserProfile,
    checkAuthState
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// ========================================
// HOOK PERSONALIZADO
// ========================================
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  
  return context;
};