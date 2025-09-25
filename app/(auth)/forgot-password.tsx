// app/(auth)/forgot-password.tsx
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
  withDelay
} from 'react-native-reanimated';

import { theme } from '../../src/styles/theme';
import { Button, Card, Input } from '../../src/components/base';
import { useAuth } from '../../src/contexts/AuthContext';

// ========================================
// COMPONENTE PRINCIPAL
// ========================================
export default function ForgotPasswordScreen() {
  // Estados
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Refs
  const emailRef = useRef<TextInput>(null);

  // Hooks
  const { resetPassword } = useAuth();

  // Valores animados
  const formOpacity = useSharedValue(0);
  const formTranslateY = useSharedValue(50);

  // ========================================
  // EFECTOS
  // ========================================
  useEffect(() => {
    // Animación de entrada
    formOpacity.value = withDelay(100, withSpring(1));
    formTranslateY.value = withDelay(100, withSpring(0));
  }, []);

  // ========================================
  // ESTILOS ANIMADOS
  // ========================================
  const formAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: formOpacity.value,
      transform: [{ translateY: formTranslateY.value }],
    };
  });

  // ========================================
  // MANEJADORES DE EVENTOS
  // ========================================
  const handleResetPassword = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Por favor, introduce un email válido.');
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(email.trim());
      setEmailSent(true);
    } catch (error: any) {
      console.error('Reset password error:', error);
      Alert.alert(
        'Error',
        error.message || 'No se pudo enviar el email de recuperación. Inténtalo de nuevo.'
      );
    } finally {
      setIsLoading(false);
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
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
            
            <View style={styles.headerContent}>
              <Text style={styles.title}>Recuperar Contraseña</Text>
              <Text style={styles.subtitle}>
                {emailSent 
                  ? 'Email enviado. Revisa tu bandeja de entrada.'
                  : 'Introduce tu email para recibir un enlace de recuperación.'
                }
              </Text>
            </View>
          </View>

          {/* Formulario */}
          <Animated.View style={[styles.formContainer, formAnimatedStyle]}>
            <Card style={styles.formCard}>
              {!emailSent ? (
                <>
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
                    returnKeyType="send"
                    onSubmitEditing={handleResetPassword}
                  />
                  <Button
                    title={isLoading ? 'Enviando...' : 'Enviar Email'}
                    onPress={handleResetPassword}
                    loading={isLoading}
                    disabled={!email || isLoading}
                    variant="filled"
                    size="lg"
                    fullWidth
                    style={styles.submitButton}
                  />
                </>
              ) : (
                <>
                  <View style={styles.successContainer}>
                    <View style={styles.successIcon}>
                      <Ionicons name="checkmark-circle" size={60} color={theme.colors.success} />
                    </View>
                    <Text style={styles.successTitle}>Email Enviado</Text>
                    <Text style={styles.successMessage}>
                      Se ha enviado un enlace a:
                    </Text>
                    <Text style={styles.emailDisplay}>{email}</Text>
                    <Text style={styles.instructionsText}>
                      Revisa tu bandeja de entrada para restablecer tu contraseña.
                    </Text>
                  </View>
                  <Button
                    title="Volver a Inicio de Sesión"
                    onPress={() => router.replace('/login')}
                    variant="filled"
                    size="lg"
                    fullWidth
                    style={styles.loginButton}
                  />
                  <Button
                      title={isLoading ? 'Reenviando...' : 'Reenviar Email'}
                      onPress={handleResetPassword}
                      loading={isLoading}
                      variant="outlined"
                      size="lg"
                      fullWidth
                      style={styles.resendButton}
                    />
                </>
              )}
            </Card>
          </Animated.View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={() => router.replace('/login')}>
              <Text style={styles.footerLink}>Volver a Inicio de Sesión</Text>
            </TouchableOpacity>
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
    marginBottom: theme.spacing[6],
    position: 'absolute',
    top: Platform.OS === 'ios' ? theme.spacing[12] : theme.spacing[6],
    left: theme.spacing[4],
    right: theme.spacing[4],
    alignItems: 'center'
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 1,
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing[3],
  },
  subtitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  formContainer: {
    width: '100%',
  },
  formCard: {
    padding: theme.spacing[6],
  },
  submitButton: {
    marginTop: theme.spacing[6],
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing[4],
  },
  successIcon: {
    marginBottom: theme.spacing[4],
  },
  successTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing[2],
  },
  successMessage: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing[1],
  },
  emailDisplay: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary[500],
    marginBottom: theme.spacing[4],
  },
  instructionsText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  loginButton: {
    marginTop: theme.spacing[6],
  },
  resendButton: {
    marginTop: theme.spacing[3],
    borderColor: theme.colors.text.tertiary,
  },
  footer: {
    alignItems: 'center',
    marginTop: theme.spacing[8],
  },
  footerLink: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary[500],
    fontWeight: theme.typography.fontWeight.semibold,
  },
});