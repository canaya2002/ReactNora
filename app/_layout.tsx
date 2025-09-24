// app/_layout.tsx - LAYOUT PRINCIPAL CON NAVEGACIÓN
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import Toast from 'react-native-toast-message';
import { View, Platform } from 'react-native';

// Contextos
import { AuthProvider } from '../src/contexts/AuthContext';
import { ConversationProvider } from '../src/contexts/ConversationContext';

// Estilos y configuraciones
import { theme } from '../src/styles/theme';

// Configurar Toast
const toastConfig = {
  success: (props: any) => (
    <View style={{
      backgroundColor: theme.colors.success,
      padding: theme.spacing[4],
      borderRadius: theme.borderRadius.lg,
      marginHorizontal: theme.spacing[4],
      flexDirection: 'row',
      alignItems: 'center'
    }}>
      {/* Implementar toast personalizado */}
    </View>
  ),
  error: (props: any) => (
    <View style={{
      backgroundColor: theme.colors.error,
      padding: theme.spacing[4],
      borderRadius: theme.borderRadius.lg,
      marginHorizontal: theme.spacing[4],
      flexDirection: 'row',
      alignItems: 'center'
    }}>
      {/* Implementar toast personalizado */}
    </View>
  )
};

// Mantener splash screen visible hasta que las fuentes estén cargadas
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Cargar fuentes personalizadas
  const [fontsLoaded] = useFonts({
    // Aquí puedes cargar fuentes personalizadas si las tienes
    // 'Lastica-Regular': require('../assets/fonts/Lastica-Regular.ttf'),
    // 'Lastica-Bold': require('../assets/fonts/Lastica-Bold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ConversationProvider>
          <StatusBar style="light" backgroundColor={theme.colors.background.primary} />
          
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.colors.background.primary },
              animation: Platform.OS === 'ios' ? 'slide_from_right' : 'fade_from_bottom',
            }}
          >
            {/* Pantalla de autenticación */}
            <Stack.Screen 
              name="(auth)" 
              options={{
                headerShown: false,
                presentation: 'modal'
              }}
            />
            
            {/* Pantalla principal con tabs */}
            <Stack.Screen 
              name="(tabs)" 
              options={{
                headerShown: false,
                gestureEnabled: false
              }}
            />
            
            {/* Pantallas modales */}
            <Stack.Screen 
              name="chat/[id]" 
              options={{
                headerShown: false,
                presentation: 'modal',
                animation: 'slide_from_right'
              }}
            />
            
            <Stack.Screen 
              name="settings" 
              options={{
                headerShown: false,
                presentation: 'modal',
                animation: 'slide_from_right'
              }}
            />
            
            <Stack.Screen 
              name="profile" 
              options={{
                headerShown: false,
                presentation: 'modal',
                animation: 'slide_from_right'
              }}
            />
            
            <Stack.Screen 
              name="subscription" 
              options={{
                headerShown: false,
                presentation: 'modal',
                animation: 'slide_from_bottom'
              }}
            />
          </Stack>

          {/* Toast global */}
          <Toast config={toastConfig} />
        </ConversationProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}