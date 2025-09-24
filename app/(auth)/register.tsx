// app/(auth)/register.tsx - PANTALLA DE REGISTRO (CORREGIDA)
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
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
// PANTALLA DE REGISTRO
// ========================================
export default function RegisterScreen() {
  const { signUp } = useAuth();
  const { execute, isLoading } = useAsyncOperation();

  // Estados del formulario
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  // ========================================
  // FUNCIONES DEL FORMULARIO
  // ========================================
  
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const { displayName, email, password, confirmPassword } = formData;
    
    if (!displayName.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return false;
    }
    
    if (!email.trim()) {
      Alert.alert('Error', 'El email es requerido');
      return false;
    }
    
    if (!helpers.isValidEmail(email)) {
      Alert.alert('Error', 'El email no es válido');
      return false;
    }
    
    if (!password.trim()) {
      Alert.alert('Error', 'La contraseña es requerida');
      return false;
    }
    
    if (password.length < 8) {
      Alert.alert('Error', 'La contraseña debe tener al menos 8 caracteres');
      return false;
    }
    
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return false;
    }
    
    if (!acceptTerms) {
      Alert.alert('Error', 'Debes aceptar los términos y condiciones');
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    await execute(async () => {
      await signUp(formData.email, formData.password, formData.displayName);
      // El contexto de auth redirigirá automáticamente
      router.replace('/(tabs)');
    });
  };

  // ========================================
  // RENDERIZADO
  // ========================================
  
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
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

          {/* Header principal */}
          <Animated.View entering={FadeInUp.duration(400).delay(200)} style={styles.header}>
            <LinearGradient
              colors={theme.colors.gradients.nora}
              style={styles.logo}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.logoText}>N</Text>
            </LinearGradient>
            
            <Text style={styles.title}>Crea tu cuenta</Text>
            <Text style={styles.subtitle}>
              Únete a miles de usuarios que ya disfrutan de NORA AI
            </Text>
          </Animated.View>

          {/* Formulario */}
          <Animated.View 
            entering={FadeInDown.duration(400).delay(400)}
          >
            <BlurView intensity={20} style={styles.formContainer}>
              <View style={styles.form}>
                {/* Input Nombre */}
                <Input
                  label="Nombre completo"
                  value={formData.displayName}
                  onChangeText={(value: string) => handleInputChange('displayName', value)}
                  placeholder="Tu nombre completo"
                  autoCapitalize="words"
                  autoCorrect={false}
                  icon={<Ionicons name="person-outline" size={20} color={theme.colors.text.secondary} />}
                />

                {/* Input Email */}
                <Input
                  label="Email"
                  value={formData.email}
                  onChangeText={(value: string) => handleInputChange('email', value)}
                  placeholder="tu@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  icon={<Ionicons name="mail-outline" size={20} color={theme.colors.text.secondary} />}
                />

                {/* Input Contraseña */}
                <Input
                  label="Contraseña"
                  value={formData.password}
                  onChangeText={(value: string) => handleInputChange('password', value)}
                  placeholder="Mínimo 8 caracteres"
                  secureTextEntry={!showPassword}
                  icon={<Ionicons name="lock-closed-outline" size={20} color={theme.colors.text.secondary} />}
                  rightIcon={
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      <Ionicons 
                        name={showPassword ? "eye-outline" : "eye-off-outline"} 
                        size={20} 
                        color={theme.colors.text.secondary} 
                      />
                    </TouchableOpacity>
                  }
                />

                {/* Input Confirmar Contraseña */}
                <Input
                  label="Confirmar contraseña"
                  value={formData.confirmPassword}
                  onChangeText={(value: string) => handleInputChange('confirmPassword', value)}
                  placeholder="Repite tu contraseña"
                  secureTextEntry={!showConfirmPassword}
                  icon={<Ionicons name="lock-closed-outline" size={20} color={theme.colors.text.secondary} />}
                  rightIcon={
                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                      <Ionicons 
                        name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} 
                        size={20} 
                        color={theme.colors.text.secondary} 
                      />
                    </TouchableOpacity>
                  }
                />

                {/* Términos y condiciones */}
                <TouchableOpacity 
                  style={styles.termsContainer}
                  onPress={() => setAcceptTerms(!acceptTerms)}
                >
                  <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]}>
                    {acceptTerms && (
                      <Ionicons name="checkmark" size={14} color="#ffffff" />
                    )}
                  </View>
                  <View style={styles.termsTextContainer}>
                    <Text style={styles.termsText}>
                      Acepto los{' '}
                      <Text style={styles.termsLink}>términos y condiciones</Text>
                      {' '}y la{' '}
                      <Text style={styles.termsLink}>política de privacidad</Text>
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Botón de registro */}
                <Button
                  title="Crear Cuenta"
                  onPress={handleRegister}
                  loading={isLoading}
                  fullWidth
                  icon={<Ionicons name="person-add-outline" size={20} color="#ffffff" />}
                  style={{ marginTop: theme.spacing[6] }}
                />
              </View>
            </BlurView>
          </Animated.View>

          {/* Separador */}
          <Animated.View 
            entering={FadeInDown.duration(400).delay(600)}
            style={styles.separator}
          >
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>O regístrate con</Text>
            <View style={styles.separatorLine} />
          </Animated.View>

          {/* Botones sociales */}
          <Animated.View 
            entering={FadeInDown.duration(400).delay(800)}
            style={styles.socialButtons}
          >
            <Button
              title="Google"
              variant="outlined"
              icon={<Ionicons name="logo-google" size={20} color={theme.colors.text.primary} />}
              style={styles.socialButton}
              onPress={() => {
                Alert.alert('Próximamente', 'Registro con Google estará disponible pronto');
              }}
            />
            
            <Button
              title="Apple"
              variant="outlined"
              icon={<Ionicons name="logo-apple" size={20} color={theme.colors.text.primary} />}
              style={styles.socialButton}
              onPress={() => {
                Alert.alert('Próximamente', 'Registro con Apple estará disponible pronto');
              }}
            />
          </Animated.View>

          {/* Link a login */}
          <Animated.View 
            entering={FadeInDown.duration(400).delay(1000)}
            style={styles.loginContainer}
          >
            <Text style={styles.loginText}>
              ¿Ya tienes una cuenta?{' '}
            </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.loginTextLink}>Inicia sesión</Text>
              </TouchableOpacity>
            </Link>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  keyboardAvoid: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing[6],
    paddingBottom: theme.spacing[8]
  },

  // Header navegación
  headerNav: {
    paddingTop: theme.spacing[4],
    marginBottom: theme.spacing[4]
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
    marginBottom: theme.spacing[8]
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing[4],
    ...theme.shadows.glow
  },
  logoText: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.black,
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4
  },
  title: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing[2]
  },
  subtitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: theme.typography.lineHeight.relaxed
  },

  // Formulario
  formContainer: {
    borderRadius: theme.borderRadius['2xl'],
    padding: theme.spacing[6],
    marginBottom: theme.spacing[6],
    backgroundColor: theme.colors.background.glass,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    overflow: 'hidden'
  },
  form: {
    gap: theme.spacing[4]
  },

  // Términos y condiciones
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: theme.spacing[2]
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: theme.colors.border.secondary,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing[3],
    marginTop: 2
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500]
  },
  termsTextContainer: {
    flex: 1
  },
  termsText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    lineHeight: theme.typography.lineHeight.relaxed
  },
  termsLink: {
    color: theme.colors.primary[400],
    fontWeight: theme.typography.fontWeight.medium
  },

  // Separador
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing[6]
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border.primary
  },
  separatorText: {
    marginHorizontal: theme.spacing[4],
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary
  },

  // Botones sociales
  socialButtons: {
    flexDirection: 'row',
    gap: theme.spacing[4],
    marginBottom: theme.spacing[8]
  },
  socialButton: {
    flex: 1
  },

  // Login
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  loginText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary
  },
  loginTextLink: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.primary[400],
    fontWeight: theme.typography.fontWeight.semibold
  }
});