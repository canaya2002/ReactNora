// app/(auth)/forgot-password.tsx
import React, { useState, useRef } from 'react';
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
  React.useEffect(() => {
    // Animación de entrada
    formOpacity.value = withDelay(300, withSpring(1));
    formTranslateY.value = withDelay(300, withSpring(0));
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
  // VALIDACIONES
  // ========================================
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const isFormValid = (): boolean => {
    return validateEmail(email);
  };

  // ========================================
  // MANEJADORES DE EVENTOS
  // ========================================
  const handleResetPassword = async () => {
    if (!isFormValid()) {
      Alert.alert('Error', 'Por favor, introduce un email válido');
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword(email.trim());
      setEmailSent(true);
      Alert.alert(
        'Email enviado',
        'Se ha enviado un email de recuperación a tu dirección de correo electrónico. Revisa tu bandeja de entrada y sigue las instrucciones.'
      );
    } catch (error: any) {
      console.error('Reset password error:', error);
      Alert.alert(
        'Error',
        error.message || 'No se pudo enviar el email de recuperación. Por favor, inténtalo de nuevo.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  const handleGoToLogin = () => {
    router.replace('/login');
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
            <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
            
            <View style={styles.headerContent}>
              <Text style={styles.title}>Recuperar Contraseña</Text>
              <Text style={styles.subtitle}>
                {emailSent 
                  ? 'Email enviado. Revisa tu bandeja de entrada.'
                  : 'Introduce tu email para recuperar tu contraseña'
                }
              </Text>
            </View>
          </View>

          {/* Formulario */}
          <Animated.View style={[styles.formContainer, formAnimatedStyle]}>
            <Card style={styles.formCard}>
              {!emailSent ? (
                <>
                  {/* Campo Email */}
                  <Input
                    ref={emailRef}
                    label="Email"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="tu@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect={false}
                    icon={<Ionicons name="mail" size={20} color={theme.colors.text.tertiary} />}
                    returnKeyType="send"
                    onSubmitEditing={handleResetPassword}
                  />

                  {/* Botón de Enviar */}
                  <Button
                    title={isLoading ? 'Enviando...' : 'Enviar Email de Recuperación'}
                    onPress={handleResetPassword}
                    loading={isLoading}
                    disabled={!isFormValid() || isLoading}
                    // CORREGIDO: variant correcto
                    variant="filled"
                    // CORREGIDO: size correcto
                    size="lg"
                    fullWidth
                    style={styles.submitButton}
                  />

                  {/* Volver al Login */}
                  <Button
                    title="Volver al Login"
                    onPress={handleGoToLogin}
                    // CORREGIDO: variant correcto
                    variant="outlined"
                    // CORREGIDO: size correcto
                    size="lg"
                    fullWidth
                    style={styles.backToLoginButton}
                  />
                </>
              ) : (
                <>
                  {/* Confirmación de envío */}
                  <View style={styles.successContainer}>
                    <View style={styles.successIcon}>
                      <Ionicons name="checkmark-circle" size={60} color={theme.colors.success} />
                    </View>
                    
                    <Text style={styles.successTitle}>Email Enviado</Text>
                    <Text style={styles.successMessage}>
                      Se ha enviado un email de recuperación a:
                    </Text>
                    <Text style={styles.emailDisplay}>{email}</Text>
                    
                    <Text style={styles.instructionsText}>
                      Revisa tu bandeja de entrada y sigue las instrucciones para restablecer tu contraseña.
                    </Text>
                  </View>

                  {/* Botones de acción */}
                  <View style={styles.actionButtons}>
                    <Button
                      title="Reenviar Email"
                      onPress={handleResetPassword}
                      loading={isLoading}
                      variant="outlined"
                      size="lg"
                      fullWidth
                      style={styles.resendButton}
                    />
                    
                    <Button
                      title="Volver al Login"
                      onPress={handleGoToLogin}
                      variant="filled"
                      size="lg"
                      fullWidth
                      style={styles.loginButton}
                    />
                  </View>
                </>
              )}
            </Card>
          </Animated.View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              ¿Recordaste tu contraseña?{' '}
              <TouchableOpacity onPress={handleGoToLogin}>
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
    paddingHorizontal: theme.spacing[4],
    paddingTop: Platform.OS === 'ios' ? theme.spacing[12] : theme.spacing[8],
    paddingBottom: theme.spacing[6],
  },
  header: {
    marginBottom: theme.spacing[8],
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: theme.spacing[2],
    marginBottom: theme.spacing[4],
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
    flex: 1,
    justifyContent: 'center',
  },
  formCard: {
    padding: theme.spacing[6],
  },
  submitButton: {
    marginTop: theme.spacing[4],
  },
  backToLoginButton: {
    marginTop: theme.spacing[3],
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
    marginBottom: theme.spacing[2],
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
  actionButtons: {
    gap: theme.spacing[3],
    marginTop: theme.spacing[6],
  },
  resendButton: {
    borderColor: theme.colors.text.tertiary,
  },
  loginButton: {
    backgroundColor: theme.colors.primary[500],
  },
  footer: {
    alignItems: 'center',
    marginTop: theme.spacing[8],
    paddingBottom: theme.spacing[4],
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