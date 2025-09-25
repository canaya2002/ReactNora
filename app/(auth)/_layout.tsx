// app/(auth)/_layout.tsx - LAYOUT DE AUTENTICACIÓN
import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';

// Hooks
import { useAuth } from '../../src/contexts/AuthContext';

// Estilos
import { theme } from '../../src/styles/theme';
import { Loading } from '../../src/components/base';

// ========================================
// LAYOUT DE AUTENTICACIÓN
// ========================================
export default function AuthLayout() {
  const { user, isInitialized } = useAuth();

  // Muestra una pantalla de carga mientras se verifica el estado de autenticación
  if (!isInitialized) {
    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[
                    theme.colors.background.primary,
                    theme.colors.primary[900] + '40',
                    theme.colors.background.primary
                ]}
                style={styles.background}
            />
            <Loading text="Cargando..." />
        </View>
    );
  }

  // Redirigir a tabs si el usuario está autenticado y la carga ha finalizado
  if (isInitialized && user) {
    return <Redirect href="/(tabs)" />;
  }

  // Si no está inicializado o no hay usuario, muestra las pantallas de autenticación
  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor={theme.colors.background.primary} />
      
      <LinearGradient
        colors={[
          theme.colors.background.primary,
          theme.colors.primary[900] + '40',
          theme.colors.background.primary
        ]}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
          animation: 'slide_from_right'
        }}
      >
        <Stack.Screen 
          name="login" 
          options={{
            gestureEnabled: false
          }}
        />
        <Stack.Screen name="register" />
        <Stack.Screen name="forgot-password" />
        {/* welcome screen is not present in the files, so commenting it out for now */}
        {/* <Stack.Screen name="welcome" /> */}
      </Stack>
    </View>
  );
}

// ========================================
// ESTILOS
// ========================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  }
});