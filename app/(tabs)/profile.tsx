// app/(tabs)/profile.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Share,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence
} from 'react-native-reanimated';

import { theme } from '../../src/styles/theme';
import { Card, Button, Loading, CustomModal } from '../../src/components/base';
import { useAuth } from '../../src/contexts/AuthContext';
import { useConversations } from '../../src/contexts/ConversationContext';

// ========================================
// INTERFACES
// ========================================
interface StatCard {
  title: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

interface MenuOption {
  id: string;
  title: string;
  description?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  showBadge?: boolean;
  disabled?: boolean;
}

// ========================================
// COMPONENTES
// ========================================
const StatCardComponent: React.FC<{ stat: StatCard }> = ({ stat }) => {
  const scaleValue = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scaleValue.value }],
    };
  });

  const handlePress = () => {
    scaleValue.value = withSequence(
      withSpring(0.95, { duration: 150 }),
      withSpring(1, { duration: 150 })
    );
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
        <Card style={[styles.statCard, { borderColor: stat.color + '40' }]}>
          <View style={[styles.statIcon, { backgroundColor: stat.color + '20' }]}>
            <Ionicons name={stat.icon} size={24} color={stat.color} />
          </View>
          <Text style={styles.statValue}>{stat.value}</Text>
          <Text style={styles.statTitle}>{stat.title}</Text>
        </Card>
      </TouchableOpacity>
    </Animated.View>
  );
};

const MenuOptionComponent: React.FC<{ option: MenuOption }> = ({ option }) => {
  const rippleValue = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: rippleValue.value }],
    };
  });

  const handlePress = () => {
    if (option.disabled) return;
    
    rippleValue.value = withSequence(
      withSpring(0.98, { duration: 100 }),
      withSpring(1, { duration: 100 })
    );
    
    setTimeout(option.onPress, 150);
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={[styles.menuOption, option.disabled && styles.menuOptionDisabled]}
        onPress={handlePress}
        disabled={option.disabled}
        activeOpacity={0.8}
      >
        <View style={styles.menuOptionLeft}>
          <View style={styles.menuOptionIcon}>
            <Ionicons 
              name={option.icon} 
              size={20} 
              color={option.disabled ? theme.colors.text.tertiary : theme.colors.text.secondary} 
            />
          </View>
          <View style={styles.menuOptionContent}>
            <Text style={[
              styles.menuOptionTitle,
              option.disabled && styles.menuOptionTitleDisabled
            ]}>
              {option.title}
            </Text>
            {option.description && (
              <Text style={styles.menuOptionDescription}>
                {option.description}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.menuOptionRight}>
          {option.showBadge && (
            <View style={styles.menuBadge}>
              <Text style={styles.menuBadgeText}>Pro</Text>
            </View>
          )}
          <Ionicons 
            name="chevron-forward" 
            size={16} 
            color={theme.colors.text.tertiary} 
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ========================================
// COMPONENTE PRINCIPAL
// ========================================
export default function ProfileScreen() {
  // Estados
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Hooks
  const { user, userProfile, signOut } = useAuth();
  const { conversations } = useConversations();

  // Valores animados
  const headerScale = useSharedValue(1);
  const upgradeButtonPulse = useSharedValue(1);

  // ========================================
  // EFECTOS DE ANIMACIÓN
  // ========================================
  React.useEffect(() => {
    if (userProfile?.planInfo?.plan === 'free') {
      upgradeButtonPulse.value = withRepeat(
        withSequence(
          withSpring(1.05, { duration: 1000 }),
          withSpring(1, { duration: 1000 })
        ),
        -1,
        true
      );
    }
  }, [userProfile?.planInfo?.plan]);

  // ========================================
  // FUNCIONES AUXILIARES
  // ========================================
  const executeWithLoading = async (operation: () => Promise<void>) => {
    try {
      await operation();
    } catch (error) {
      console.error('Operation error:', error);
    }
  };

  const executeSignOut = async (operation: () => Promise<void>) => {
    try {
      setIsSigningOut(true);
      await operation();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  // ========================================
  // MANEJADORES DE EVENTOS
  // ========================================
  const handleSignOut = useCallback(() => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: () => executeSignOut(async () => {
            setIsSigningOut(true);
            await signOut();
          })
        }
      ]
    );
  }, [executeSignOut, signOut]);

  const handleUpgrade = useCallback(() => {
    setShowUpgradeModal(true);
  }, []);

  const handleSupport = useCallback(() => {
    Linking.openURL('mailto:support@nora-ai.com');
  }, []);

  const handlePrivacy = useCallback(() => {
    Linking.openURL('https://nora-ai.com/privacy');
  }, []);

  const handleTerms = useCallback(() => {
    Linking.openURL('https://nora-ai.com/terms');
  }, []);

  const handleShare = useCallback(() => {
    Linking.openURL('https://nora-ai.com/download');
  }, []);

  // ========================================
  // DATOS DE CONFIGURACIÓN
  // ========================================
  const statCards: StatCard[] = [
    {
      title: 'Conversaciones',
      value: conversations.length,
      icon: 'chatbubbles',
      color: theme.colors.primary[500]
    },
    {
      title: 'Imágenes generadas',
      // CORREGIDO: Acceso correcto a la estructura de objetos
      value: userProfile?.usage?.imageGeneration?.monthly?.used || 0,
      icon: 'image',
      color: theme.colors.success
    },
    {
      title: 'Días activo',
      // CORREGIDO: Manejo correcto de la fecha
      value: userProfile ? Math.floor((Date.now() - new Date(userProfile.user.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0,
      icon: 'calendar',
      color: theme.colors.warning
    }
  ];

  const menuOptions: MenuOption[] = [
    {
      id: 'upgrade',
      title: 'Plan Premium',
      description: userProfile?.planInfo?.plan === 'pro' ? 
        'Gestionar suscripción' : 
        'Desbloquea todas las funciones',
      icon: userProfile?.planInfo?.plan === 'pro' ? 'diamond' : 'diamond-outline',
      onPress: handleUpgrade,
      showBadge: userProfile?.planInfo?.plan !== 'pro'
    },
    {
      id: 'settings',
      title: 'Configuración',
      description: 'Personaliza tu experiencia',
      icon: 'settings-outline',
      onPress: () => setShowSettingsModal(true)
    },
    {
      id: 'support',
      title: 'Ayuda y soporte',
      description: 'Obtén ayuda cuando la necesites',
      icon: 'help-circle-outline',
      onPress: handleSupport
    },
    {
      id: 'share',
      title: 'Compartir NORA AI',
      description: 'Invita a tus amigos',
      icon: 'share-outline',
      onPress: handleShare
    },
    {
      id: 'privacy',
      title: 'Política de privacidad',
      icon: 'shield-checkmark-outline',
      onPress: handlePrivacy
    },
    {
      id: 'terms',
      title: 'Términos y condiciones',
      icon: 'document-text-outline',
      onPress: handleTerms
    },
    {
      id: 'signout',
      title: 'Cerrar sesión',
      icon: 'log-out-outline',
      onPress: handleSignOut
    }
  ];

  // ========================================
  // RENDERIZADO
  // ========================================
  if (!userProfile || !user) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Loading text="Cargando perfil..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header con perfil del usuario */}
        <LinearGradient
          colors={[theme.colors.primary[600], theme.colors.primary[800]]}
          style={styles.profileHeader}
        >
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              {userProfile.user.photoURL ? (
                <View style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={40} color="#ffffff" />
                </View>
              )}
              <TouchableOpacity style={styles.avatarBadge}>
                <Ionicons name="camera" size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.userInfo}>
              {/* CORREGIDO: fontWeight usando valor correcto del theme */}
              <Text style={styles.userName}>
                {userProfile.user.displayName || 'Usuario NORA AI'}
              </Text>
              <Text style={styles.userEmail}>{userProfile.user.email}</Text>
              
              <View style={styles.planBadge}>
                <Ionicons 
                  name={userProfile.planInfo.plan === 'pro' ? 'diamond' : 'person'}
                  size={14}
                  color="#ffffff"
                />
                <Text style={styles.planBadgeText}>
                  {userProfile.planInfo.plan === 'pro' ? 'NORA AI Pro' : 'Plan Gratuito'}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Estadísticas */}
        <View style={styles.statsSection}>
          {/* CORREGIDO: fontWeight usando valor correcto del theme */}
          <Text style={styles.sectionTitle}>Estadísticas</Text>
          <View style={styles.statsGrid}>
            {statCards.map((stat, index) => (
              <StatCardComponent key={index} stat={stat} />
            ))}
          </View>
        </View>

        {/* Límites de uso para usuarios gratuitos */}
        {userProfile.planInfo.plan === 'free' && (
          <View style={styles.limitsSection}>
            {/* CORREGIDO: fontWeight usando valor correcto del theme */}
            <Text style={styles.sectionTitle}>Límites de uso</Text>
            <Card style={styles.limitsCard}>
              <Text style={styles.limitsTitle}>
                {/* CORREGIDO: Acceso correcto a la estructura de objetos */}
                {userProfile.usage.imageGeneration?.monthly?.used || 0}/10 imágenes gratuitas utilizadas
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${((userProfile.usage.imageGeneration?.monthly?.used || 0) / 10) * 100}%` }
                  ]}
                />
              </View>
              <Text style={styles.limitsDescription}>
                Actualiza a Pro para generar imágenes ilimitadas
              </Text>
            </Card>
          </View>
        )}

        {/* Menú de opciones */}
        <View style={styles.menuSection}>
          {/* CORREGIDO: fontWeight usando valor correcto del theme */}
          <Text style={styles.sectionTitle}>Configuración</Text>
          <Card style={styles.menuCard} noPadding>
            {menuOptions.map((option, index) => (
              <View key={option.id}>
                <MenuOptionComponent option={option} />
                {index < menuOptions.length - 1 && <View style={styles.menuDivider} />}
              </View>
            ))}
          </Card>
        </View>

        {/* Información de la app */}
        <View style={styles.appInfoSection}>
          <Text style={styles.appVersion}>NORA AI Mobile v1.0.0</Text>
          <Text style={styles.appCopyright}>© 2024 NORA AI. Todos los derechos reservados.</Text>
        </View>
      </ScrollView>

      {/* Modal de configuración */}
      <CustomModal
        visible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        title="Configuración"
        size="lg"
      >
        <Text style={styles.modalText}>
          Configuración de la aplicación estará disponible en la próxima actualización.
        </Text>
      </CustomModal>

      {/* Modal de actualización */}
      <CustomModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="NORA AI Pro"
        size="lg"
        glassmorphism
      >
        <View style={styles.upgradeModalContent}>
          <View style={styles.upgradeHeader}>
            <LinearGradient
              colors={[theme.colors.primary[500], theme.colors.primary[700]]}
              style={styles.upgradeIcon}
            >
              <Ionicons name="diamond" size={32} color="#ffffff" />
            </LinearGradient>
            
            {/* CORREGIDO: fontWeight usando valor correcto del theme */}
            <Text style={styles.upgradeTitle}>¿Por qué elegir NORA AI Pro?</Text>
          </View>

          <View style={styles.upgradeFeatures}>
            {[
              'Generación ilimitada de imágenes',
              'Acceso a modelos de IA premium',
              'Soporte prioritario 24/7',
              'Funciones avanzadas de personalización',
              'Análisis y métricas detalladas'
            ].map((feature, index) => (
              <View key={index} style={styles.upgradeFeature}>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                <Text style={styles.upgradeFeatureText}>{feature}</Text>
              </View>
            ))}
          </View>

          <View style={styles.upgradeActions}>
            <Button
              title="Actualizar ahora"
              variant="filled"
              size="lg"
              fullWidth
              style={styles.upgradeButton}
              onPress={() => {
                setShowUpgradeModal(false);
                Alert.alert('Próximamente', 'La actualización estará disponible pronto');
              }}
            />
            <Button
              title="Tal vez más tarde"
              variant="ghost"
              size="lg"
              fullWidth
              onPress={() => setShowUpgradeModal(false)}
            />
          </View>
        </View>
      </CustomModal>

      {/* Loading overlay para cerrar sesión */}
      {isSigningOut && (
        <View style={styles.loadingOverlay}>
          <Loading text="Cerrando sesión..." overlay />
        </View>
      )}
    </View>
  );
}

// ========================================
// ESTILOS - CORREGIDOS
// ========================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    paddingVertical: theme.spacing[8],
    paddingHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[6],
  },
  profileSection: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: theme.spacing[4],
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background.secondary,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  userInfo: {
    alignItems: 'center',
  },
  // CORREGIDO: fontWeight usando valor correcto
  userName: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: '#ffffff',
    marginBottom: theme.spacing[1],
  },
  userEmail: {
    fontSize: theme.typography.fontSize.base,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: theme.spacing[3],
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.full,
  },
  planBadgeText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: '#ffffff',
    marginLeft: theme.spacing[1],
  },
  statsSection: {
    paddingHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[6],
  },
  // CORREGIDO: fontWeight usando valor correcto
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing[4],
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  statCard: {
    width: '31%',
    alignItems: 'center',
    padding: theme.spacing[4],
    borderWidth: 1,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
  },
  // CORREGIDO: fontWeight usando valor correcto
  statValue: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing[1],
  },
  statTitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  limitsSection: {
    paddingHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[6],
  },
  limitsCard: {
    padding: theme.spacing[4],
  },
  limitsTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing[3],
  },
  progressBar: {
    height: 6,
    backgroundColor: theme.colors.background.tertiary,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing[2],
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary[500],
    borderRadius: theme.borderRadius.sm,
  },
  limitsDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
  },
  menuSection: {
    paddingHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[6],
  },
  menuCard: {
    overflow: 'hidden',
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing[4],
    paddingHorizontal: theme.spacing[4],
  },
  menuOptionDisabled: {
    opacity: 0.5,
  },
  menuOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing[3],
  },
  menuOptionContent: {
    flex: 1,
  },
  menuOptionTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  menuOptionTitleDisabled: {
    color: theme.colors.text.tertiary,
  },
  menuOptionDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing[1],
  },
  menuOptionRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuBadge: {
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing[2],
  },
  menuBadgeText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    color: '#ffffff',
  },
  menuDivider: {
    height: 1,
    backgroundColor: theme.colors.border.primary,
    marginHorizontal: theme.spacing[4],
  },
  appInfoSection: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[8],
  },
  appVersion: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
    marginBottom: theme.spacing[1],
  },
  appCopyright: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    textAlign: 'center',
  },
  modalText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  upgradeModalContent: {
    alignItems: 'center',
  },
  upgradeHeader: {
    alignItems: 'center',
    marginBottom: theme.spacing[6],
  },
  upgradeIcon: {
    width: 60,
    height: 60,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing[4],
  },
  // CORREGIDO: fontWeight usando valor correcto
  upgradeTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing[2],
  },
  upgradeFeatures: {
    width: '100%',
    marginBottom: theme.spacing[6],
  },
  upgradeFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[3],
  },
  upgradeFeatureText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing[3],
    flex: 1,
  },
  upgradeActions: {
    width: '100%',
    gap: theme.spacing[3],
  },
  upgradeButton: {
    backgroundColor: theme.colors.primary[500],
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});