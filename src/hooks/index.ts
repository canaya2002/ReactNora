// src/hooks/index.ts - HOOKS PERSONALIZADOS CORREGIDOS
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Keyboard,
  KeyboardEvent,
  AppState,
  AppStateStatus,
  BackHandler,
  Alert,
  Vibration,
  Platform,
  Dimensions
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import * as MediaLibrary from 'expo-media-library';
import * as Camera from 'expo-camera';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Tipos
interface UseAsyncOperationResult<T = any> {
  execute: (asyncFn: () => Promise<T>) => Promise<void>;
  isLoading: boolean;  // CORREGIDO: Añadido isLoading
  loading: boolean;    // MANTENIDO: Para compatibilidad
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
  hasMediaLibraryPermission: boolean;
  hasCameraPermission: boolean;
  hasLocationPermission: boolean;
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

interface UseChatResult {
  sendMessage: (message: string) => Promise<void>;
  isTyping: boolean;
  error: string | null;
}

interface UseSpeechRecognitionResult {
  isListening: boolean;
  transcript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

interface UseTextToSpeechResult {
  isSpeaking: boolean;
  speak: (text: string) => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
}

// ========================================
// HOOK PARA OPERACIONES ASÍNCRONAS
// ========================================
export const useAsyncOperation = <T = any>(): UseAsyncOperationResult<T> => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(async (asyncFn: () => Promise<T>) => {
    try {
      setLoading(true);
      setError(null);
      const result = await asyncFn();
      setData(result);
    } catch (err: any) {
      console.error('AsyncOperation error:', err);
      setError(err.message || 'Ha ocurrido un error inesperado');
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    execute,
    isLoading: loading,  // CORREGIDO: Añadido isLoading
    loading,            // MANTENIDO: Para compatibilidad
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
      showListener?.remove();
      hideListener?.remove();
    };
  }, []);

  return { keyboardHeight, isKeyboardVisible };
};

// ========================================
// HOOK PARA ESTADO ONLINE/OFFLINE
// ========================================
export const useOnlineStatus = (): UseOnlineStatusResult => {
  const [connectionInfo, setConnectionInfo] = useState({
    isOnline: true,
    isConnected: true,
    connectionType: null as string | null
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setConnectionInfo({
        isOnline: !!state.isConnected,
        isConnected: !!state.isConnected,
        connectionType: state.type
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
  const [hasMediaLibraryPermission, setHasMediaLibraryPermission] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);

  // CORREGIDO: Usar los nuevos hooks de Expo Camera
  const [cameraPermission, requestCameraPermission] = Camera.useCameraPermissions();

  useEffect(() => {
    checkAllPermissions();
  }, []);

  const checkAllPermissions = async () => {
    const [mediaLibrary, location] = await Promise.all([
      MediaLibrary.getPermissionsAsync(),
      Location.getForegroundPermissionsAsync()
    ]);

    setHasMediaLibraryPermission(mediaLibrary.granted);
    setHasCameraPermission(cameraPermission?.granted || false);
    setHasLocationPermission(location.granted);
  };

  const requestMediaLibraryPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    const granted = status === 'granted';
    setHasMediaLibraryPermission(granted);
    return granted;
  }, []);

  const requestCameraPermissionAsync = useCallback(async (): Promise<boolean> => {
    const permission = await requestCameraPermission();
    const granted = permission?.granted || false;
    setHasCameraPermission(granted);
    return granted;
  }, [requestCameraPermission]);

  const requestLocationPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    const granted = status === 'granted';
    setHasLocationPermission(granted);
    return granted;
  }, []);

  return {
    hasMediaLibraryPermission,
    hasCameraPermission,
    hasLocationPermission,
    requestMediaLibraryPermission,
    requestCameraPermission: requestCameraPermissionAsync,
    requestLocationPermission
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

    return () => subscription?.remove();
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

// ========================================
// HOOK PARA THROTTLING
// ========================================
export const useThrottle = <T extends any[]>(
  callback: (...args: T) => void,
  delay: number
) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  // Actualizar callback ref
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback((...args: T) => {
    if (timeoutRef.current) return;

    callbackRef.current(...args);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
    }, delay);
  }, [delay]);
};

// ========================================
// HOOK PARA ELEMENTOS PREVIOS
// ========================================
export const usePrevious = <T>(value: T): T | undefined => {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
};

// ========================================
// HOOK PARA MONTAJE/DESMONTAJE
// ========================================
export const useIsMounted = () => {
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return useCallback(() => isMountedRef.current, []);
};

// ========================================
// HOOK PARA CHAT (MOCK)
// ========================================
export const useChat = (): UseChatResult => {
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (message: string) => {
    try {
      setIsTyping(true);
      setError(null);

      // Aquí iría la lógica real de envío de mensaje
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Simular respuesta
      console.log('Message sent:', message);
    } catch (err: any) {
      setError(err.message || 'Error sending message');
    } finally {
      setIsTyping(false);
    }
  }, []);

  return { sendMessage, isTyping, error };
};

// ========================================
// HOOK PARA RECONOCIMIENTO DE VOZ (MOCK)
// ========================================
export const useSpeechRecognition = (): UseSpeechRecognitionResult => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const startListening = useCallback(() => {
    setIsListening(true);
    setError(null);
    // Mock implementation
    setTimeout(() => {
      setTranscript('Texto de ejemplo');
      setIsListening(false);
    }, 2000);
  }, []);

  const stopListening = useCallback(() => {
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setError(null);
  }, []);

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    resetTranscript
  };
};

// ========================================
// HOOK PARA TEXT-TO-SPEECH (MOCK)
// ========================================
export const useTextToSpeech = (): UseTextToSpeechResult => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = useCallback(async (text: string) => {
    setIsSpeaking(true);
    // Mock implementation
    setTimeout(() => {
      setIsSpeaking(false);
    }, text.length * 50); // Simular duración basada en texto
  }, []);

  const stop = useCallback(() => {
    setIsSpeaking(false);
  }, []);

  const pause = useCallback(() => {
    // Mock implementation
  }, []);

  const resume = useCallback(() => {
    // Mock implementation
  }, []);

  return {
    isSpeaking,
    speak,
    stop,
    pause,
    resume
  };
};