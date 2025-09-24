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
  loading: boolean;
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

  return { execute, loading, error, data, reset };
};

// ========================================
// HOOK PARA TECLADO
// ========================================
export const useKeyboard = (): UseKeyboardResult => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', (e: KeyboardEvent) => {
      setKeyboardHeight(e.endCoordinates.height);
      setIsKeyboardVisible(true);
    });

    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return { keyboardHeight, isKeyboardVisible };
};

// ========================================
// HOOK PARA ESTADO DE CONEXIÓN
// ========================================
export const useOnlineStatus = (): UseOnlineStatusResult => {
  const [isOnline, setIsOnline] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [connectionType, setConnectionType] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
      setIsConnected(state.isInternetReachable ?? false);
      setConnectionType(state.type);
    });

    return () => unsubscribe();
  }, []);

  return { isOnline, isConnected, connectionType };
};

// ========================================
// HOOK PARA PERMISOS
// ========================================
export const usePermissions = (): UsePermissionsResult => {
  const [hasMediaLibraryPermission, setHasMediaLibraryPermission] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);

  // Verificar permisos al inicializar
  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      // Media Library
      const mediaLibraryStatus = await MediaLibrary.getPermissionsAsync();
      setHasMediaLibraryPermission(mediaLibraryStatus.granted);

      // Camera
      const cameraStatus = await Camera.getCameraPermissionsAsync();
      setHasCameraPermission(cameraStatus.granted);

      // Location
      const locationStatus = await Location.getForegroundPermissionsAsync();
      setHasLocationPermission(locationStatus.granted);
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const requestMediaLibraryPermission = useCallback(async (): Promise<boolean> => {
    try {
      const result = await MediaLibrary.requestPermissionsAsync();
      setHasMediaLibraryPermission(result.granted);
      return result.granted;
    } catch (error) {
      console.error('Error requesting media library permission:', error);
      return false;
    }
  }, []);

  const requestCameraPermission = useCallback(async (): Promise<boolean> => {
    try {
      const result = await Camera.requestCameraPermissionsAsync();
      setHasCameraPermission(result.granted);
      return result.granted;
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      return false;
    }
  }, []);

  const requestLocationPermission = useCallback(async (): Promise<boolean> => {
    try {
      const result = await Location.requestForegroundPermissionsAsync();
      setHasLocationPermission(result.granted);
      return result.granted;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  }, []);

  return {
    hasMediaLibraryPermission,
    hasCameraPermission,
    hasLocationPermission,
    requestMediaLibraryPermission,
    requestCameraPermission,
    requestLocationPermission
  };
};

// ========================================
// HOOK PARA ESTADO DE LA APP
// ========================================
export const useAppState = (): UseAppStateResult => {
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription?.remove();
  }, []);

  const isActive = appState === 'active';
  const isBackground = appState === 'background';
  const isInactive = appState === 'inactive';

  return { appState, isActive, isBackground, isInactive };
};

// ========================================
// HOOK PARA BACK HANDLER
// ========================================
export const useBackHandler = (handler: () => boolean) => {
  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handler);
    return () => BackHandler.removeEventListener('hardwareBackPress', handler);
  }, [handler]);
};

// ========================================
// HOOK PARA VIBRACIÓN
// ========================================
export const useVibration = () => {
  const vibrate = useCallback((pattern?: number | number[]) => {
    if (Platform.OS === 'ios') {
      Vibration.vibrate();
    } else {
      if (pattern) {
        Vibration.vibrate(pattern);
      } else {
        Vibration.vibrate(100);
      }
    }
  }, []);

  const cancel = useCallback(() => {
    Vibration.cancel();
  }, []);

  return { vibrate, cancel };
};

// ========================================
// HOOK PARA DIMENSIONES DE PANTALLA
// ========================================
export const useScreenDimensions = () => {
  const [screenData, setScreenData] = useState(Dimensions.get('window'));

  useEffect(() => {
    const onChange = (result: { window: any; screen: any }) => {
      setScreenData(result.window);
    };

    const subscription = Dimensions.addEventListener('change', onChange);
    return () => subscription?.remove();
  }, []);

  return screenData;
};

// ========================================
// HOOK PARA ALMACENAMIENTO LOCAL
// ========================================
export const useAsyncStorage = <T>(key: string, defaultValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadValue();
  }, [key]);

  const loadValue = async () => {
    try {
      setLoading(true);
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
    // Aquí iría la lógica real de reconocimiento de voz
  }, []);

  const stopListening = useCallback(() => {
    setIsListening(false);
    // Aquí iría la lógica para detener el reconocimiento
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return { isListening, transcript, error, startListening, stopListening, resetTranscript };
};

// ========================================
// HOOK PARA TEXT-TO-SPEECH (MOCK)
// ========================================
export const useTextToSpeech = (): UseTextToSpeechResult => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = useCallback(async (text: string) => {
    try {
      setIsSpeaking(true);
      // Aquí iría la lógica real de TTS
      await new Promise(resolve => setTimeout(resolve, text.length * 50));
    } catch (error) {
      console.error('TTS error:', error);
    } finally {
      setIsSpeaking(false);
    }
  }, []);

  const stop = useCallback(() => {
    setIsSpeaking(false);
    // Aquí iría la lógica para detener TTS
  }, []);

  const pause = useCallback(() => {
    // Aquí iría la lógica para pausar TTS
  }, []);

  const resume = useCallback(() => {
    // Aquí iría la lógica para reanudar TTS
  }, []);

  return { isSpeaking, speak, stop, pause, resume };
};

// ========================================
// HOOK PARA DEBOUNCING
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