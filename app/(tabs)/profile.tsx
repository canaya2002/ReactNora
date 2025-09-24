// app/(tabs)/profile.tsx - PANTALLA DE PERFIL (CORREGIDA)
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  Dimensions,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Animated, { 
  FadeInDown, 
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';

// Hooks y contextos
import { useAuth } from '../../src/contexts/AuthContext';
import { useConversations } from '../../src/contexts/ConversationContext';
import { useAsyncOperation } from '../../src/hooks';

// Componentes
import { Button, Card, IconButton, CustomModal, Loading } from '../../src/components/base';

// Estilos
import { theme } from '../../src/styles/theme';

const { width } = Dimensions.get('window');

// ========================================
// INTERFACES
// ========================================
interface MenuOption {
  id: string;
  title: string;
  description?: string;
  icon: string;
  iconColor?: string;
  action: () => void;
  destructive?: boolean;
  isPremium?: boolean;
  badge?: string | number;
}

interface StatCard {
  title: string;
  value: number | string;
  icon: string;
  color: string;
}

// ========================================
// COMPONENTE PRINCIPAL
// ========================================
export default function ProfileScreen() {
  const { user, userProfile, signOut, updateProfile } = useAuth();
  const { getConversationStats } = useConversations();

  // Estados locales
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Hook para operaciones async
  const { execute: executeSignOut, loading: isExecutingSignOut } = useAsyncOperation();

  // Estadísticas de conversaciones
  const conversationStats = getConversationStats();

  // ========================================
  // HANDLERS
  // ========================================
  const handleSignOut = useCallback(async () => {
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
      value: conversationStats.total,
      icon: 'chatbubbles',
      color: theme.colors.primary[500]
    },
    {
      title: 'Imágenes generadas',
      value: userProfile?.usage?.imageGeneration?.monthly?.used || userProfile?.usage?.imagesGenerated || 0,
      icon: 'image',
      color: theme.colors.success[500]
    },
    {
      title: 'Días activo',
      value: userProfile ? Math.floor((Date.now() - new Date(userProfile.user.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0,
      icon: 'calendar',
      color: theme.colors.warning[500]
    }
  ];

  const menuOptions: MenuOption[] = [
    {
      id: 'upgrade',
      title: 'Plan Premium',
      description: userProfile?.planInfo?.plan === 'pro' ? 'Plan Pro Activo' : 'Actualizar a Pro',
      icon: 'diamond',
      iconColor: theme.colors.warning[500],
      action: handleUpgrade,
      isPremium: userProfile?.planInfo?.plan !== 'pro'
    },
    {
      id: 'settings',
      title: 'Configuración',
      description: 'Personaliza tu experiencia',
      icon: 'settings',
      iconColor: theme.colors.text.secondary,
      action: () => setShowSettingsModal(true)
    },
    {
      id: 'support',
      title: 'Soporte',
      description: 'Obtén ayuda y asistencia',
      icon: 'help-circle',
      iconColor: theme.colors.info[500],
      action: handleSupport
    },
    {
      id: 'share',
      title: 'Compartir App',
      description: 'Invita a tus amigos',
      icon: 'share',
      iconColor: theme.colors.success[500],
      action: handleShare
    },
    {
      id: 'privacy',
      title: 'Privacidad',
      description: 'Política de privacidad',
      icon: 'shield-checkmark',
      iconColor: theme.colors.text.secondary,
      action: handlePrivacy
    },
    {
      id: 'terms',
      title: 'Términos',
      description: 'Términos y condiciones',
      icon: 'document-text',
      iconColor: theme.colors.text.secondary,
      action: handleTerms
    },
    {
      id: 'signout',
      title: 'Cerrar sesión',
      description: 'Salir de tu cuenta',
      icon: 'log-out',
      iconColor: theme.colors.error[500],
      action: handleSignOut,
      destructive: true
    }
  ];

  // ========================================
  // COMPONENTES AUXILIARES
  // ========================================
  const StatCardComponent = ({ stat }: { stat: StatCard }) => (
    <Animated.View entering={FadeInDown}>
      <Card style={styles.statCard}>
        <View style={[styles.statIcon, { backgroundColor: `${stat.color}20` }]}>
          <Ionicons name={stat.icon as any} size={24} color={stat.color} />
        </View>
        <Text style={styles.statValue}>{stat.value}</Text>
        <Text style={styles.statTitle}>{stat.title}</Text>
      </Card>
    </Animated.View>
  );

  const MenuOptionComponent = ({ option }: { option: MenuOption }) => (
    <TouchableOpacity
      style={[styles.menuOption, option.destructive && styles.menuOptionDestructive]}
      onPress={option.action}
      activeOpacity={0.7}
    >
      <View style={styles.menuOptionIcon}>
        <Ionicons
          name={option.icon as any}
          size={22}
          color={option.iconColor || theme.colors.text.secondary}
        />
      </View>
      <View style={styles.menuOptionContent}>
        <Text style={[styles.menuOptionTitle, option.destructive && styles.menuOptionTitleDestructive]}>
          {option.title}
        </Text>
        {option.description && (
          <Text style={styles.menuOptionDescription}>
            {option.description}
          </Text>
        )}
      </View>
      <View style={styles.menuOptionAction}>
        {option.isPremium && (
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumBadgeText}>PRO</Text>
          </View>
        )}
        <Ionicons
          name="chevron-forward"
          size={20}
          color={theme.colors.text.tertiary}
        />
      </View>
    </TouchableOpacity>
  );

  // ========================================
  // RENDER PRINCIPAL
  // ========================================
  if (!user || !userProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <Loading text="Cargando perfil..." overlay />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header con información del usuario */}
        <LinearGradient
          colors={[theme.colors.primary[600], theme.colors.primary[400]]}
          style={styles.header}
        >
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                {userProfile.user.photoURL ? (
                  <Image source={{ uri: userProfile.user.photoURL }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {userProfile.user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {userProfile.user.displayName || 'Usuario'}
              </Text>
              <Text style={styles.userEmail}>{user.email}</Text>
              
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
            <Text style={styles.sectionTitle}>Límites de uso</Text>
            <Card style={styles.limitsCard}>
              <Text style={styles.limitsTitle}>
                {userProfile.usage.imageGeneration.monthly.used || 0}/10 imágenes gratuitas utilizadas
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${((userProfile.usage.imageGeneration.monthly.used || 0) / 10) * 100}%` }
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
        title="Actualizar a Pro"
        size="lg"
      >
        <View style={styles.upgradeContent}>
          <Text style={styles.upgradeTitle}>¿Por qué elegir NORA AI Pro?</Text>
          <View style={styles.upgradeFeatures}>
            <View style={styles.upgradeFeature}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success[500]} />
              <Text style={styles.upgradeFeatureText}>Imágenes ilimitadas</Text>
            </View>
            <View style={styles.upgradeFeature}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success[500]} />
              <Text style={styles.upgradeFeatureText}>Videos HD</Text>
            </View>
            <View style={styles.upgradeFeature}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success[500]} />
              <Text style={styles.upgradeFeatureText}>Procesamiento prioritario</Text>
            </View>
            <View style={styles.upgradeFeature}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success[500]} />
              <Text style={styles.upgradeFeatureText}>Soporte premium</Text>
            </View>
          </View>
          
          <Button
            title="Actualizar ahora - $9.99/mes"
            onPress={() => {
              setShowUpgradeModal(false);
              // Implementar lógica de suscripción
            }}
            style={styles.upgradeButton}
            icon={<Ionicons name="diamond" size={20} color="#ffffff" />}
          />
        </View>
      </CustomModal>

      {/* Loading overlay */}
      {(isExecutingSignOut || isSigningOut) && (
        <Loading text="Cerrando sesión..." overlay />
      )}
    </SafeAreaView>
  );
}

// ========================================
// ESTILOS
// ========================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  profileSection: {
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: theme.spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  userInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight as any,
    color: '#ffffff',
    marginBottom: theme.spacing.xs,
  },
  userEmail: {
    fontSize: theme.typography.body.fontSize,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: theme.spacing.sm,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.xs,
  },
  planBadgeText: {
    color: '#ffffff',
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '600',
  },
  statsSection: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight as any,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  statValue: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight as any,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  statTitle: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  limitsSection: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  limitsCard: {
    padding: theme.spacing.lg,
  },
  limitsTitle: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: theme.colors.surface.tertiary,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.warning[500],
  },
  limitsDescription: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
  },
  menuSection: {
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  menuCard: {
    overflow: 'hidden',
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  menuOptionDestructive: {
    // Estilos adicionales para opciones destructivas si es necesario
  },
  menuOptionIcon: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuOptionContent: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  menuOptionTitle: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  menuOptionTitleDestructive: {
    color: theme.colors.error[500],
  },
  menuOptionDescription: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  menuOptionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  premiumBadge: {
    backgroundColor: theme.colors.warning[500],
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  menuDivider: {
    height: 1,
    backgroundColor: theme.colors.border.primary,
    marginLeft: 56, // Offset para alinear con el contenido
  },
  appInfoSection: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
  },
  appVersion: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.tertiary,
    marginBottom: theme.spacing.xs,
  },
  appCopyright: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.tertiary,
    textAlign: 'center',
  },
  modalText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.primary,
    textAlign: 'center',
    lineHeight: 24,
  },
  upgradeContent: {
    alignItems: 'center',
  },
  upgradeTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight as any,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  upgradeFeatures: {
    width: '100%',
    marginBottom: theme.spacing.xl,
  },
  upgradeFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  upgradeFeatureText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.primary,
  },
  upgradeButton: {
    width: '100%',
  },
});