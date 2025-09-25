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
import { LocalConversationStorageInstance } from '../lib/ConversationStorage';
import { UserProfile, PlanType } from '../lib/types';

// ========================================
// INTERFACES
// ========================================
interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isInitialized: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
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
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setUser(firebaseUser);
          await cloudFunctions.updateLastLogin(firebaseUser.uid);
          await loadUserProfile(firebaseUser);
        } else {
          setUser(null);
          setUserProfile(null);
          await clearUserCache();
        }
      } catch (error) {
        console.error('Error in onAuthStateChanged:', error);
        setUser(null);
        setUserProfile(null);
      } finally {
        setLoading(false);
        setIsInitialized(true);
      }
    });
    return unsubscribe;
  }, []);

  const loadUserProfile = async (firebaseUser: FirebaseUser, options: { ignoreCache?: boolean } = {}) => {
    try {
      if (!options.ignoreCache) {
        const cachedProfile = await getUserProfileFromCache(firebaseUser.uid);
        if (cachedProfile) {
          setUserProfile(cachedProfile);
        }
      }
      const profile = await cloudFunctions.getUserProfile();
      setUserProfile(profile);
      await saveUserProfileToCache(profile);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    setIsSigningUp(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) {
        await updateProfile(userCredential.user, { displayName });
      }
      // Assuming a backend trigger creates the profile, we manually fetch it here.
      await loadUserProfile(userCredential.user, { ignoreCache: true });
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw new Error(error.message || 'Error al crear la cuenta');
    } finally {
      setIsSigningUp(false);
    }
  };

  const signIn = async (email: string, password: string) => {
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

  const signOut = async () => {
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

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const deleteAccount = async () => {
    if (!user) throw new Error('No user is authenticated.');
    setIsDeletingAccount(true);
    try {
      await deleteUser(user);
      await clearUserCache();
    } catch (error: any) {
      console.error('Delete account error:', error);
      throw new Error(error.message || 'Error al eliminar la cuenta');
    } finally {
      setIsDeletingAccount(false);
    }
  };
  
  const updateUserProfile = async (data: Partial<UserProfile>) => {
      if (!user) throw new Error('No user is authenticated.');
      await cloudFunctions.updateUserProfile(data, user);
      await refreshUserProfile();
  };

  const refreshUserProfile = async () => {
    if (!user) return;
    await loadUserProfile(user, { ignoreCache: true });
  };

  const saveUserProfileToCache = async (profile: UserProfile) => {
    try {
      await AsyncStorage.setItem(`@nora_user_profile_${profile.user.uid}`, JSON.stringify(profile));
    } catch (e) {
      console.error("Failed to save user profile to cache.", e);
    }
  };
  
  const getUserProfileFromCache = async (userId: string): Promise<UserProfile | null> => {
    try {
      const jsonValue = await AsyncStorage.getItem(`@nora_user_profile_${userId}`);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (e) {
      console.error("Failed to load user profile from cache.", e);
      return null;
    }
  };

  const clearUserCache = async () => {
    try {
        const keys = await AsyncStorage.getAllKeys();
        const userKeys = keys.filter(key => key.startsWith('@nora_user_') || key.startsWith('@nora_conversations'));
        if (userKeys.length > 0) {
          await AsyncStorage.multiRemove(userKeys);
        }
        await LocalConversationStorageInstance.clearAllConversations();
      } catch (e) {
        console.error("Failed to clear user cache.", e);
      }
  };

  const value = {
    user,
    userProfile,
    loading,
    isInitialized,
    signUp,
    signIn,
    signOut,
    resetPassword,
    deleteAccount,
    updateUserProfile,
    refreshUserProfile,
    isSigningUp,
    isSigningIn,
    isSigningOut,
    isDeletingAccount,
  };

  // CORREGIDO: Se ha cerrado correctamente la etiqueta del Provider.
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;