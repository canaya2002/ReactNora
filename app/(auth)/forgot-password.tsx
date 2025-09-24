// app/(auth)/forgot-password.tsx - PANTALLA RECUPERAR CONTRASEÑA (CORREGIDA)
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';

// Hooks y componentes
import { useAuth } from '../../src/contexts/AuthContext';
import { Button, Input } from '../../src/components/base';
import { useAsyncOperation } from '../../src/hooks';
import { helpers } from '../../src/lib/firebase';

// Estilos
import { theme } from '../../src/styles/theme';

// ========================================
// PANTALLA RECUPERAR CONTRASEÑA
// ========================================
export default function ForgotPasswordScreen() {
  const { resetPassword } = useAuth();
  const { execute, isLoading } = useAsyncOperation();

  const [email, setEmail] = useState('');
  const [isEmailSent, setIsEmailSent] = useState(false);

  // ========================================
  // FUNCIONES
  // ========================================
  
  const validateEmail = () => {
    if (!email.trim()) {
      Alert.alert('Error', 'El email es requerido');
      return false;
    }
    
    if (!helpers.isValidEmail(email)) {
      Alert.alert('Error', 'El email no es válido');
      return false;
    }

    return true;
  };

  const handleResetPassword = async () => {
    if (!validateEmail()) return;

    await execute(async () => {
      await resetPassword(email);
      setIsEmailSent(true);
    });
  };

  const handleBackToLogin = () => {
    router.replace('/(auth)/login');
  };

  // ========================================
  // RENDERIZADO
  // ========================================
  
  if (isEmailSent) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Header con botón atrás */}
          <Animated.View entering={FadeInUp.duration(400)} style={styles.headerNav}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons 
                name="chevron-back" 
                size={24} 
                color={theme.colors.text.primary} 
              />
            </TouchableOpacity>
          </Animated.View>

          {/* Contenido de confirmación */}
          <Animated.View 
            entering={ZoomIn.duration(600).delay(200)}
            style={styles.successContainer}
          >
            <BlurView intensity={20} style={styles.successCard}>
              <View style={styles.successIconContainer}>
                <LinearGradient
                  colors={[theme.colors.success, theme.colors.primary[500]]}
                  style={styles.successIcon}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="checkmark" size={40} color="#ffffff" />
                </LinearGradient>
              </View>

              <Text style={styles.successTitle}>¡Email enviado!</Text>
              <Text style={styles.successMessage}>
                Te hemos enviado un enlace para restablecer tu contraseña a:
              </Text>
              <Text style={styles.emailText}>{email}</Text>
              <Text style={styles.successInstructions}>
                Revisa tu bandeja de entrada y sigue las instrucciones para crear una nueva contraseña.
              </Text>

              <View style={styles.successActions}>
                <Button
                  title="Volver al Login"
                  onPress={handleBackToLogin}
                  fullWidth
                  icon={<Ionicons name="log-in-outline" size={20} color="#ffffff" />}
                  style={{ marginBottom: theme.spacing[3] }}
                />
                
                <Button
                  title="Reenviar Email"
                  variant="outlined"
                  onPress={handleResetPassword}
                  loading={isLoading}
                  fullWidth
                  icon={<Ionicons name="refresh-outline" size={20} color={theme.colors.primary[400]} />}
                />
              </View>

              <Text style={styles.helpText}>
                ¿No encuentras el email? Revisa tu carpeta de spam o promociones.
              </Text>
            </BlurView>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header con botón atrás */}
        <Animated.View entering={FadeInUp.duration(400)} style={styles.headerNav}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons 
              name="chevron-back" 
              size={24} 
              color={theme.colors.text.primary} 
            />
          </TouchableOpacity>
        </Animated.View>

        {/* Icono y header */}
        <Animated.View 
          entering={FadeInUp.duration(400).delay(200)} 
          style={styles.header}
        >
          <LinearGradient
            colors={[theme.colors.warning, theme.colors.primary[500]]}
            style={styles.iconContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="key-outline" size={40} color="#ffffff" />
          </LinearGradient>
          
          <Text style={styles.title}>¿Olvidaste tu contraseña?</Text>
          <Text style={styles.subtitle}>
            No te preocupes, te ayudaremos a recuperar el acceso a tu cuenta
          </Text>
        </Animated.View>

        {/* Formulario */}
        <Animated.View 
          entering={FadeInDown.duration(400).delay(400)}
          style={styles.formSection}
        >
          <BlurView intensity={20} style={styles.formContainer}>
            <View style={styles.form}>
              <Text style={styles.formTitle}>Ingresa tu email</Text>
              <Text style={styles.formDescription}>
                Te enviaremos un enlace para restablecer tu contraseña
              </Text>
              
              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="tu@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                icon={<Ionicons name="mail-outline" size={20} color={theme.colors.text.secondary} />}
              />

              <Button
                title="Enviar Enlace"
                onPress={handleResetPassword}
                loading={isLoading}
                fullWidth
                icon={<Ionicons name="send-outline" size={20} color="#ffffff" />}
                style={{ marginTop: theme.spacing[4] }}
              />
            </View>
          </BlurView>
        </Animated.View>

        {/* Alternativas */}
        <Animated.View 
          entering={FadeInDown.duration(400).delay(600)}
          style={styles.alternatives}
        >
          <Text style={styles.alternativesTitle}>¿Sigues teniendo problemas?</Text>
          
          <View style={styles.alternativesList}>
            <TouchableOpacity style={styles.alternativeItem}>
              <Ionicons name="help-circle-outline" size={20} color={theme.colors.primary[400]} />
              <Text style={styles.alternativeText}>Centro de ayuda</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.alternativeItem}>
              <Ionicons name="chatbubble-outline" size={20} color={theme.colors.primary[400]} />
              <Text style={styles.alternativeText}>Contactar soporte</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Footer */}
        <Animated.View 
          entering={FadeInDown.duration(400).delay(800)}
          style={styles.footer}
        >
          <Text style={styles.footerText}>
            ¿Recordaste tu contraseña?{' '}
          </Text>
          <TouchableOpacity onPress={handleBackToLogin}>
            <Text style={styles.footerLink}>Volver al login</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

// ========================================
// ESTILOS
// ========================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent'
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing[6],
    paddingVertical: theme.spacing[4]
  },

  // Header navegación
  headerNav: {
    marginBottom: theme.spacing[8]
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background.glass,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },

  // Header principal
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing[10]
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing[6],
    ...theme.shadows.lg
  },
  title: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing[3]
  },
  subtitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: theme.typography.lineHeight.relaxed,
    paddingHorizontal: theme.spacing[4]
  },

  // Formulario
  formSection: {
    marginBottom: theme.spacing[10]
  },
  formContainer: {
    borderRadius: theme.borderRadius['2xl'],
    padding: theme.spacing[6],
    backgroundColor: theme.colors.background.glass,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    overflow: 'hidden'
  },
  form: {
    gap: theme.spacing[4]
  },
  formTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    textAlign: 'center'
  },
  formDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: theme.typography.lineHeight.relaxed,
    marginBottom: theme.spacing[2]
  },

  // Confirmación exitosa
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: theme.spacing[8]
  },
  successCard: {
    borderRadius: theme.borderRadius['2xl'],
    padding: theme.spacing[8],
    backgroundColor: theme.colors.background.glass,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    alignItems: 'center',
    overflow: 'hidden'
  },
  successIconContainer: {
    marginBottom: theme.spacing[6]
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.glow
  },
  successTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing[4]
  },
  successMessage: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: theme.typography.lineHeight.relaxed,
    marginBottom: theme.spacing[2]
  },
  emailText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary[400],
    textAlign: 'center',
    marginBottom: theme.spacing[4]
  },
  successInstructions: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
    textAlign: 'center',
    lineHeight: theme.typography.lineHeight.relaxed,
    marginBottom: theme.spacing[6]
  },
  successActions: {
    width: '100%',
    marginBottom: theme.spacing[4]
  },
  helpText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.muted,
    textAlign: 'center',
    lineHeight: theme.typography.lineHeight.relaxed
  },

  // Alternativas
  alternatives: {
    alignItems: 'center',
    marginBottom: theme.spacing[8]
  },
  alternativesTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing[4]
  },
  alternativesList: {
    gap: theme.spacing[3]
  },
  alternativeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[4]
  },
  alternativeText: {
    marginLeft: theme.spacing[3],
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary[400],
    fontWeight: theme.typography.fontWeight.medium
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  footerText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary
  },
  footerLink: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary[400],
    fontWeight: theme.typography.fontWeight.semibold
  }
});