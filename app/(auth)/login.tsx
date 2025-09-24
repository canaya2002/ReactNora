// app/(auth)/login.tsx - PANTALLA DE LOGIN (CORREGIDA)
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
import { Button, Input, Card } from '../../src/components/base';
import { useAsyncOperation } from '../../src/hooks';
import { helpers } from '../../src/lib/firebase';

// Estilos
import { theme } from '../../src/styles/theme';

// ========================================
// PANTALLA DE LOGIN
// ========================================
export default function LoginScreen() {
  const { signIn } = useAuth();
  const { execute, isLoading } = useAsyncOperation();

  // Estados del formulario
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // ========================================
  // FUNCIONES DEL FORMULARIO
  // ========================================
  
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const { email, password } = formData;
    
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
    
    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return false;
    }

    return true;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    await execute(async () => {
      await signIn(formData.email, formData.password);
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
          {/* Header con logo */}
          <Animated.View entering={FadeInUp.duration(400)} style={styles.header}>
            <LinearGradient
              colors={theme.colors.gradients.nora}
              style={styles.logo}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.logoText}>N</Text>
            </LinearGradient>
            
            <Text style={styles.title}>Bienvenido de vuelta</Text>
            <Text style={styles.subtitle}>
              Inicia sesión para continuar con tu asistente de IA personalizado
            </Text>
          </Animated.View>

          {/* Formulario */}
          <Animated.View 
            entering={FadeInDown.duration(400).delay(200)}
          >
            <BlurView intensity={20} style={styles.formContainer}>
              <View style={styles.form}>
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
                  placeholder="Tu contraseña"
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

                {/* Opciones del formulario */}
                <View style={styles.formOptions}>
                  <TouchableOpacity 
                    style={styles.rememberMe}
                    onPress={() => setRememberMe(!rememberMe)}
                  >
                    <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                      {rememberMe && (
                        <Ionicons name="checkmark" size={14} color="#ffffff" />
                      )}
                    </View>
                    <Text style={styles.rememberMeText}>Recordarme</Text>
                  </TouchableOpacity>

                  <Link href="/(auth)/forgot-password" asChild>
                    <TouchableOpacity>
                      <Text style={styles.forgotPassword}>
                        ¿Olvidaste tu contraseña?
                      </Text>
                    </TouchableOpacity>
                  </Link>
                </View>

                {/* Botón de login */}
                <Button
                  title="Iniciar Sesión"
                  onPress={handleLogin}
                  loading={isLoading}
                  fullWidth
                  icon={<Ionicons name="log-in-outline" size={20} color="#ffffff" />}
                  style={{ marginTop: theme.spacing[4] }}
                />
              </View>
            </BlurView>
          </Animated.View>

          {/* Separador */}
          <Animated.View 
            entering={FadeInDown.duration(400).delay(400)}
            style={styles.separator}
          >
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>O continúa con</Text>
            <View style={styles.separatorLine} />
          </Animated.View>

          {/* Botones sociales */}
          <Animated.View 
            entering={FadeInDown.duration(400).delay(600)}
            style={styles.socialButtons}
          >
            <Button
              title="Google"
              variant="outlined"
              icon={<Ionicons name="logo-google" size={20} color={theme.colors.text.primary} />}
              style={styles.socialButton}
              onPress={() => {
                // TODO: Implementar login con Google
                Alert.alert('Próximamente', 'Login con Google estará disponible pronto');
              }}
            />
            
            <Button
              title="Apple"
              variant="outlined"
              icon={<Ionicons name="logo-apple" size={20} color={theme.colors.text.primary} />}
              style={styles.socialButton}
              onPress={() => {
                // TODO: Implementar login con Apple
                Alert.alert('Próximamente', 'Login con Apple estará disponible pronto');
              }}
            />
          </Animated.View>

          {/* Link a registro */}
          <Animated.View 
            entering={FadeInDown.duration(400).delay(800)}
            style={styles.registerContainer}
          >
            <Text style={styles.registerText}>
              ¿No tienes una cuenta?{' '}
            </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text style={styles.registerTextLink}>Regístrate aquí</Text>
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
    paddingVertical: theme.spacing[8]
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing[10]
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing[6],
    ...theme.shadows.glow
  },
  logoText: {
    fontSize: theme.typography.fontSize['3xl'],
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
    marginBottom: theme.spacing[8],
    backgroundColor: theme.colors.background.glass,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    overflow: 'hidden'
  },
  form: {
    gap: theme.spacing[4]
  },
  formOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: theme.spacing[2]
  },
  rememberMe: {
    flexDirection: 'row',
    alignItems: 'center'
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
    marginRight: theme.spacing[2]
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500]
  },
  rememberMeText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary
  },
  forgotPassword: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary[400],
    fontWeight: theme.typography.fontWeight.medium
  },

  // Separador
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing[8]
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

  // Registro
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  registerText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary
  },
  registerTextLink: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.primary[400],
    fontWeight: theme.typography.fontWeight.semibold
  }
});