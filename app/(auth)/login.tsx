// app/(auth)/login.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  interpolateColor
} from 'react-native-reanimated';

import { theme } from '../../src/styles/theme';
import { Button, Card, Input } from '../../src/components/base';
import { useAuth } from '../../src/contexts/AuthContext';

// ========================================
// COMPONENTE PRINCIPAL
// ========================================
export default function LoginScreen() {
  // Estados
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Refs
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  // Hooks
  const { signIn, isSigningIn } = useAuth();

  // Valores animados
  const logoScale = useSharedValue(0.8);
  const formOpacity = useSharedValue(0);
  const formTranslateY = useSharedValue(50);
  const buttonScale = useSharedValue(1);

  // ========================================
  // EFECTOS
  // ========================================
  useEffect(() => {
    // Animaciones de entrada
    logoScale.value = withDelay(100, withSpring(1, { damping: 10, stiffness: 100 }));
    formOpacity.value = withDelay(300, withSpring(1));
    formTranslateY.value = withDelay(300, withSpring(0));
  }, []);

  // ========================================
  // ESTILOS ANIMADOS
  // ========================================
  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  const formAnimatedStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [{ translateY: formTranslateY.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      buttonScale.value,
      [1, 0.95],
      [theme.colors.primary[500], theme.colors.primary[600]]
    );
    return {
      transform: [{ scale: buttonScale.value }],
      backgroundColor,
    };
  });

  // ========================================
  // VALIDACIONES
  // ========================================
  const isFormValid = (): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim()) && password.length >= 6;
  };

  // ========================================
  // MANEJADORES DE EVENTOS
  // ========================================
  const handleLogin = async () => {
    if (!isFormValid()) {
      Alert.alert('Error', 'Por favor, introduce un email y contraseña válidos.');
      return;
    }

    buttonScale.value = withSpring(0.95, {}, () => {
      buttonScale.value = withSpring(1);
    });

    try {
      await signIn(email.trim(), password);
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert(
        'Error de inicio de sesión',
        error.message || 'No se pudo iniciar sesión. Verifica tus credenciales.'
      );
    }
  };

  // ========================================
  // RENDERIZADO
  // ========================================
  return (
    <LinearGradient
      colors={[theme.colors.background.primary, theme.colors.background.tertiary]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo y Header */}
          <View style={styles.header}>
            <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
              <LinearGradient
                colors={[theme.colors.primary[500], theme.colors.primary[700]]}
                style={styles.logo}
              >
                <Ionicons name="chatbubbles" size={40} color="#ffffff" />
              </LinearGradient>
            </Animated.View>
            <Text style={styles.title}>NORA AI</Text>
            <Text style={styles.subtitle}>Tu asistente de inteligencia artificial</Text>
          </View>

          {/* Formulario */}
          <Animated.View style={[styles.formContainer, formAnimatedStyle]}>
            <Card style={styles.formCard}>
              <Text style={styles.formTitle}>Iniciar Sesión</Text>
              
              <Input
                ref={emailRef}
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="tu@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                icon={<Ionicons name="mail" size={20} color={theme.colors.text.tertiary} />}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />

              <Input
                ref={passwordRef}
                label="Contraseña"
                value={password}
                onChangeText={setPassword}
                placeholder="Tu contraseña"
                secureTextEntry={!showPassword}
                autoComplete="password"
                icon={<Ionicons name="lock-closed" size={20} color={theme.colors.text.tertiary} />}
                rightIcon={
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons 
                      name={showPassword ? "eye-off" : "eye"} 
                      size={20} 
                      color={theme.colors.text.tertiary} 
                    />
                  </TouchableOpacity>
                }
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />

              <View style={styles.optionsContainer}>
                <TouchableOpacity style={styles.rememberMeContainer} onPress={() => setRememberMe(!rememberMe)}>
                  <Ionicons 
                    name={rememberMe ? "checkbox" : "square-outline"} 
                    size={20} 
                    color={rememberMe ? theme.colors.primary[500] : theme.colors.text.tertiary}
                  />
                  <Text style={styles.rememberMeText}>Recordarme</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/forgot-password')}>
                  <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
                </TouchableOpacity>
              </View>

              <Animated.View style={buttonAnimatedStyle}>
                <Button
                  title={isSigningIn ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                  onPress={handleLogin}
                  loading={isSigningIn}
                  disabled={!isFormValid() || isSigningIn}
                  variant="filled"
                  size="lg"
                  fullWidth
                />
              </Animated.View>

              <View style={styles.separator}>
                <View style={styles.separatorLine} />
                <Text style={styles.separatorText}>o</Text>
                <View style={styles.separatorLine} />
              </View>

              <Button
                  title="Continuar con Google"
                  variant="outlined"
                  size="lg"
                  fullWidth
                  icon={<Ionicons name="logo-google" size={20} color={theme.colors.text.primary} />}
                  onPress={() => Alert.alert('Próximamente', 'Autenticación con Google estará disponible pronto')}
                />
            </Card>
          </Animated.View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              ¿No tienes cuenta?{' '}
              <TouchableOpacity onPress={() => router.push('/register')}>
                <Text style={styles.footerLink}>Regístrate</Text>
              </TouchableOpacity>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

// ========================================
// ESTILOS
// ========================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[6],
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing[8],
  },
  logoContainer: {
    marginBottom: theme.spacing[4],
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.lg,
  },
  title: {
    fontSize: theme.typography.fontSize['4xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing[2],
  },
  subtitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  formCard: {
    padding: theme.spacing[6],
  },
  formTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing[6],
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[6],
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rememberMeText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing[2],
  },
  forgotPasswordText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary[500],
    fontWeight: theme.typography.fontWeight.semibold,
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing[6],
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border.primary,
  },
  separatorText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
    marginHorizontal: theme.spacing[4],
  },
  footer: {
    alignItems: 'center',
    marginTop: theme.spacing[8],
  },
  footerText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  footerLink: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary[500],
    fontWeight: theme.typography.fontWeight.semibold,
  },
});