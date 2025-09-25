// app/(auth)/register.tsx
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
import { Button, Card, Input, IconButton } from '../../src/components/base';
import { useAuth } from '../../src/contexts/AuthContext';

// ========================================
// COMPONENTE PRINCIPAL
// ========================================
export default function RegisterScreen() {
  // Estados
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Refs
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  // Hooks
  const { signUp, isSigningUp } = useAuth();

  // Valores animados
  const logoScale = useSharedValue(0.8);
  const formOpacity = useSharedValue(0);
  const formTranslateY = useSharedValue(50);
  const buttonScale = useSharedValue(1);

  // ========================================
  // EFECTOS
  // ========================================
  useEffect(() => {
    logoScale.value      = withDelay(100, withSpring(1, { damping: 10, stiffness: 100 }));
    formOpacity.value    = withDelay(300, withSpring(1));
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
    return (
      name.trim().length >= 2 &&
      emailRegex.test(email.trim()) &&
      password.length >= 6 &&
      password === confirmPassword &&
      acceptedTerms
    );
  };

  // ========================================
  // MANEJADORES DE EVENTOS
  // ========================================
  const handleRegister = async () => {
    if (!acceptedTerms) {
      Alert.alert('Error', 'Debes aceptar los términos y condiciones para continuar.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      return;
    }
    if (!isFormValid()) {
      Alert.alert('Error', 'Por favor, completa todos los campos correctamente.');
      return;
    }

    buttonScale.value = withSpring(0.95, {}, () => {
      buttonScale.value = withSpring(1);
    });

    try {
      await signUp(email.trim(), password, name.trim());
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Register error:', error);
      Alert.alert(
        'Error de registro',
        error.message || 'No se pudo crear la cuenta. Por favor, inténtalo de nuevo.'
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
            <Text style={styles.subtitle}>Crea tu cuenta y comienza a explorar</Text>
          </View>

          {/* Formulario */}
          <Animated.View style={[styles.formContainer, formAnimatedStyle]}>
            <Card style={styles.formCard}>
              <Text style={styles.formTitle}>Crear Cuenta</Text>
              
              <Input
                label="Nombre completo"
                value={name}
                onChangeText={setName}
                placeholder="Tu nombre completo"
                autoCapitalize="words"
                autoComplete="name"
                icon={<Ionicons name="person-outline" size={20} color={theme.colors.text.tertiary} />}
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
              />

              <Input
                ref={emailRef}
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="tu@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                icon={<Ionicons name="mail-outline" size={20} color={theme.colors.text.tertiary} />}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />

              <Input
                ref={passwordRef}
                label="Contraseña"
                value={password}
                onChangeText={setPassword}
                placeholder="Mínimo 6 caracteres"
                secureTextEntry={!showPassword}
                autoComplete="new-password"
                icon={<Ionicons name="lock-closed-outline" size={20} color={theme.colors.text.tertiary} />}
                rightIcon={
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons 
                      name={showPassword ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      color={theme.colors.text.tertiary} 
                    />
                  </TouchableOpacity>
                }
                returnKeyType="next"
                onSubmitEditing={() => confirmPasswordRef.current?.focus()}
              />

              <Input
                ref={confirmPasswordRef}
                label="Confirmar contraseña"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repite tu contraseña"
                secureTextEntry={!showConfirmPassword}
                autoComplete="new-password"
                icon={<Ionicons name="lock-closed-outline" size={20} color={theme.colors.text.tertiary} />}
                rightIcon={
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <Ionicons 
                      name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      color={theme.colors.text.tertiary} 
                    />
                  </TouchableOpacity>
                }
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />

              <TouchableOpacity style={styles.termsContainer} onPress={() => setAcceptedTerms(!acceptedTerms)}>
                <Ionicons 
                  name={acceptedTerms ? "checkbox" : "square-outline"} 
                  size={20} 
                  color={acceptedTerms ? theme.colors.primary[500] : theme.colors.text.tertiary}
                />
                <Text style={styles.termsText}>
                  Acepto los{' '}
                  <Text style={styles.termsLink}>términos</Text>
                  {' y la '}
                  <Text style={styles.termsLink}>política de privacidad</Text>
                </Text>
              </TouchableOpacity>

              <Animated.View style={buttonAnimatedStyle}>
                <Button
                  title={isSigningUp ? 'Creando cuenta...' : 'Crear Cuenta'}
                  onPress={handleRegister}
                  loading={isSigningUp}
                  disabled={!isFormValid() || isSigningUp}
                  variant="filled"
                  size="lg"
                  fullWidth
                />
              </Animated.View>

              <View style={styles.separator}>
                <View style={styles.separatorLine} />
                <Text style={styles.separatorText}>o regístrate con</Text>
                <View style={styles.separatorLine} />
              </View>

              <View style={styles.socialButtonsContainer}>
                <IconButton
                  icon={<Ionicons name="logo-google" size={20} color={theme.colors.text.primary} />}
                  variant="outlined"
                  size="lg"
                  style={styles.socialButton}
                  onPress={() => Alert.alert('Próximamente', 'Autenticación con Google estará disponible pronto')}
                />
                <IconButton
                  icon={<Ionicons name="logo-apple" size={20} color={theme.colors.text.primary} />}
                  variant="outlined"
                  size="lg"
                  style={styles.socialButton}
                  onPress={() => Alert.alert('Próximamente', 'Autenticación con Apple estará disponible pronto')}
                />
                <IconButton
                  icon={<Ionicons name="logo-facebook" size={20} color={theme.colors.text.primary} />}
                  variant="outlined"
                  size="lg"
                  style={styles.socialButton}
                  onPress={() => Alert.alert('Próximamente', 'Autenticación con Facebook estará disponible pronto')}
                />
              </View>
            </Card>
          </Animated.View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              ¿Ya tienes cuenta?{' '}
              <TouchableOpacity onPress={() => router.push('/login')}>
                <Text style={styles.footerLink}>Iniciar sesión</Text>
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
    marginBottom: theme.spacing[6],
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
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[6],
  },
  termsText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing[2],
    flex: 1,
    lineHeight: 20,
  },
  termsLink: {
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
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing[4],
  },
  socialButton: {
    borderColor: theme.colors.border.primary,
    flex: 1,
  },
  footer: {
    alignItems: 'center',
    marginTop: theme.spacing[6],
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