// src/hooks/index.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Keyboard,
  KeyboardEvent,
  AppState,
  AppStateStatus,
  Platform,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import * as MediaLibrary from 'expo-media-library';
import * as Camera from 'expo-camera';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Tipos
interface UseAsyncOperationResult<T = any> {
  execute: (asyncFn: () => Promise<T>) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  data: T | null;
  reset: () => void;
}

interface UseKeyboardResult {
  keyboardHeight: number;
  isKeyboardVisible: boolean;
}

interface UseOnlineStatusResult {
  isOnline: boolean;
  isConnected: boolean;
  connectionType: string | null;
}

interface UsePermissionsResult {
  hasMediaLibraryPermission: boolean | null;
  hasCameraPermission: boolean | null;
  hasLocationPermission: boolean | null;
  requestMediaLibraryPermission: () => Promise<boolean>;
  requestCameraPermission: () => Promise<boolean>;
  requestLocationPermission: () => Promise<boolean>;
}

interface UseAppStateResult {
  appState: AppStateStatus;
  isActive: boolean;
  isBackground: boolean;
  isInactive: boolean;
}

// ========================================
// HOOK PARA OPERACIONES ASÍNCRONAS
// ========================================
export const useAsyncOperation = <T = any>(): UseAsyncOperationResult<T> => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(async (asyncFn: () => Promise<T>) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await asyncFn();
      setData(result);
    } catch (err: any) {
      console.error('AsyncOperation error:', err);
      setError(err.message || 'Ha ocurrido un error inesperado');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    execute,
    isLoading,
    error,
    data,
    reset
  };
};

// ========================================
// HOOK PARA TECLADO
// ========================================
export const useKeyboard = (): UseKeyboardResult => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardWillShow = (e: KeyboardEvent) => {
      setKeyboardHeight(e.endCoordinates.height);
      setIsKeyboardVisible(true);
    };

    const keyboardWillHide = () => {
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
    };

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showListener = Keyboard.addListener(showEvent, keyboardWillShow);
    const hideListener = Keyboard.addListener(hideEvent, keyboardWillHide);

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  return { keyboardHeight, isKeyboardVisible };
};

// ========================================
// HOOK PARA ESTADO ONLINE/OFFLINE
// ========================================
export const useOnlineStatus = (): UseOnlineStatusResult => {
  const [connectionInfo, setConnectionInfo] = useState<{
    isOnline: boolean;
    isConnected: boolean;
    connectionType: string | null;
  }>({
    isOnline: true,
    isConnected: true,
    connectionType: null,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setConnectionInfo({
        isOnline: !!state.isConnected && !!state.isInternetReachable,
        isConnected: !!state.isConnected,
        connectionType: state.type || null,
      });
    });

    return unsubscribe;
  }, []);

  return connectionInfo;
};

// ========================================
// HOOK PARA PERMISOS
// ========================================
export const usePermissions = (): UsePermissionsResult => {
    const [cameraPermission, requestCameraPermission] = Camera.useCameraPermissions();
    const [mediaLibraryPermission, requestMediaLibraryPermission] = MediaLibrary.usePermissions();
    const [locationPermission, requestLocationPermission] = Location.useForegroundPermissions();

    return {
        hasCameraPermission: cameraPermission?.granted ?? null,
        hasMediaLibraryPermission: mediaLibraryPermission?.granted ?? null,
        hasLocationPermission: locationPermission?.granted ?? null,
        requestCameraPermission: async () => {
            const result = await requestCameraPermission();
            return result.granted;
        },
        requestMediaLibraryPermission: async () => {
            const result = await requestMediaLibraryPermission();
            return result.granted;
        },
        requestLocationPermission: async () => {
            const result = await requestLocationPermission();
            return result.granted;
        }
    };
};

// ========================================
// HOOK PARA ESTADO DE LA APP
// ========================================
export const useAppState = (): UseAppStateResult => {
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      setAppState(nextAppState);
    });

    return () => {
        subscription.remove();
    };
  }, []);

  return {
    appState,
    isActive: appState === 'active',
    isBackground: appState === 'background',
    isInactive: appState === 'inactive'
  };
};

// ========================================
// HOOK PARA ALMACENAMIENTO LOCAL
// ========================================
export const useAsyncStorage = <T>(
  key: string,
  defaultValue: T
): {
  storedValue: T;
  setValue: (value: T | ((val: T) => T)) => Promise<void>;
  removeValue: () => Promise<void>;
  loading: boolean;
} => {
  const [storedValue, setStoredValue] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStoredValue = async () => {
      try {
        const value = await AsyncStorage.getItem(key);
        if (value !== null) {
          setStoredValue(JSON.parse(value));
        }
      } catch (error) {
        console.error(`Error loading value for key "${key}":`, error);
      } finally {
        setLoading(false);
      }
    };

    loadStoredValue();
  }, [key]);

  const setValue = async (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      await AsyncStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting value for key "${key}":`, error);
    }
  };

  const removeValue = async () => {
    try {
      await AsyncStorage.removeItem(key);
      setStoredValue(defaultValue);
    } catch (error) {
      console.error(`Error removing value for key "${key}":`, error);
    }
  };

  return { storedValue, setValue, removeValue, loading };
};

// ========================================
// HOOK PARA DEBOUNCE
// ========================================
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Aquí podrían ir las implementaciones reales de los hooks de chat, voz, etc.
// Por ahora, las versiones mock son suficientes para que el resto del código compile.
export const useChat = () => ({ sendMessage: async () => {}, isTyping: false, error: null });
export const useSpeechRecognition = () => ({ isListening: false, transcript: '', startListening: () => {}, stopListening: () => {} });
export const useTextToSpeech = () => ({ isSpeaking: false, speak: async () => {}, stop: () => {} });