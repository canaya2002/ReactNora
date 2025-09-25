// app/(tabs)/profile.tsx
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Share,
  Platform,
  SafeAreaView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  Layout,
  FadeInDown
} from 'react-native-reanimated';

import { theme } from '../../src/styles/theme';
import { Card, Button, Loading, CustomModal, IconButton } from '../../src/components/base';
import { useAuth } from '../../src/contexts/AuthContext';
import { useConversations } from '../../src/contexts/ConversationContext';

// ========================================
// INTERFACES
// ========================================
interface StatCardProps {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

interface MenuOption {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  isDestructive?: boolean;
}

// ========================================
// COMPONENTES
// ========================================
const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => (
  <Animated.View style={styles.statCardContainer} entering={FadeInDown}>
    <Card style={[styles.statCard, { borderColor: color + '40' }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </Card>
  </Animated.View>
);

const MenuOptionItem: React.FC<MenuOption> = ({ id, title, icon, onPress, isDestructive }) => (
    <TouchableOpacity
        style={styles.menuOption}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <Ionicons 
            name={icon} 
            size={22} 
            color={isDestructive ? theme.colors.error : theme.colors.text.secondary} 
        />
        <Text style={[styles.menuOptionTitle, isDestructive && styles.menuOptionDestructive]}>
            {title}
        </Text>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.text.tertiary} />
    </TouchableOpacity>
);


// ========================================
// COMPONENTE PRINCIPAL
// ========================================
export default function ProfileScreen() {
  const { user, userProfile, signOut, isSigningOut } = useAuth();
  const { conversations } = useConversations();

  const handleSignOut = useCallback(() => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que quieres cerrar tu sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: signOut }
      ]
    );
  }, [signOut]);

  const statCards: StatCardProps[] = useMemo(() => [
    {
      title: 'Conversaciones',
      value: conversations.length,
      icon: 'chatbubbles-outline',
      color: theme.colors.primary[500]
    },
    {
      title: 'Imágenes / Mes',
      value: `${userProfile?.usage?.imageGeneration?.monthly?.used || 0} / ${userProfile?.usage?.imageGeneration?.monthly?.limit || 10}`,
      icon: 'image-outline',
      color: theme.colors.success
    },
    {
      title: 'Días Activo',
      value: userProfile?.user?.createdAt ? Math.floor((Date.now() - new Date(userProfile.user.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0,
      icon: 'calendar-outline',
      color: theme.colors.warning
    }
  ], [conversations.length, userProfile]);

  const menuOptions: MenuOption[] = useMemo(() => [
    { id: 'settings', title: 'Configuración', icon: 'settings-outline', onPress: () => Alert.alert("Próximamente", "La configuración estará disponible pronto.") },
    { id: 'support', title: 'Ayuda y Soporte', icon: 'help-circle-outline', onPress: () => Linking.openURL('mailto:support@nora-ai.com') },
    { id: 'share', title: 'Compartir NORA AI', icon: 'share-social-outline', onPress: () => Share.share({ message: "Descubre NORA AI, tu asistente personal inteligente. ¡Descárgala ahora!", url: "https://nora-ai.com" }) },
    { id: 'signout', title: 'Cerrar sesión', icon: 'log-out-outline', onPress: handleSignOut, isDestructive: true },
  ], [handleSignOut]);


  if (!userProfile || !user) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Loading text="Cargando perfil..." />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: theme.layout.tabBarHeight }}
      >
        <View style={styles.profileHeader}>
            <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color={theme.colors.primary[300]} />
            </View>
            <Text style={styles.userName}>{userProfile.user.displayName || 'Usuario de NORA AI'}</Text>
            <Text style={styles.userEmail}>{userProfile.user.email}</Text>
            <View style={styles.planBadge}>
                <Ionicons name={userProfile.planInfo.plan === 'pro' ? 'diamond' : 'person'} size={14} color={theme.colors.primary[300]} />
                <Text style={styles.planBadgeText}>
                    {userProfile.planInfo.planDisplayName || 'Plan Gratuito'}
                </Text>
            </View>
        </View>

        <View style={styles.statsGrid}>
            {statCards.map((stat) => <StatCard key={stat.title} {...stat} />)}
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>General</Text>
          <Card style={styles.menuCard} noPadding>
            {menuOptions.map((option, index) => (
              <React.Fragment key={option.id}>
                <MenuOptionItem {...option} />
                {index < menuOptions.length - 1 && <View style={styles.menuDivider} />}
              </React.Fragment>
            ))}
          </Card>
        </View>

        <View style={styles.appInfoSection}>
          <Text style={styles.appVersion}>NORA AI Mobile v1.0.0</Text>
        </View>

      </ScrollView>

      {isSigningOut && (
        <View style={styles.loadingOverlay}>
          <Loading text="Cerrando sesión..." />
        </View>
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: theme.spacing[6],
    paddingHorizontal: theme.spacing[4],
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing[4],
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  userName: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing[1],
  },
  userEmail: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing[3],
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.full,
  },
  planBadgeText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.primary[300],
    marginLeft: theme.spacing[2],
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[6],
  },
  statCardContainer: {
      width: '32%',
  },
  statCard: {
    alignItems: 'center',
    padding: theme.spacing[3],
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
  statValue: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing[1],
  },
  statTitle: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  menuSection: {
    paddingHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[6],
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing[3],
    paddingHorizontal: theme.spacing[2],
  },
  menuCard: {
    overflow: 'hidden',
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing[4],
    paddingHorizontal: theme.spacing[4],
  },
  menuOptionTitle: {
    flex: 1,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
    marginLeft: theme.spacing[4],
  },
  menuOptionDestructive: {
      color: theme.colors.error,
  },
  menuDivider: {
    height: 1,
    backgroundColor: theme.colors.border.primary,
    marginHorizontal: theme.spacing[4],
  },
  appInfoSection: {
    alignItems: 'center',
    paddingBottom: theme.spacing[4],
  },
  appVersion: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});