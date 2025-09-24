// app/(tabs)/_layout.tsx - NAVEGACIÓN POR TABS
import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { View, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

// Hooks y contextos
import { useAuth } from '../../src/contexts/AuthContext';

// Estilos
import { theme } from '../../src/styles/theme';

// ========================================
// COMPONENTE TAB BAR PERSONALIZADO
// ========================================
interface TabBarIconProps {
  name: string;
  focused: boolean;
  color: string;
  size: number;
}

const TabBarIcon: React.FC<TabBarIconProps> = ({ name, focused, color, size }) => {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: withSpring(focused ? 1.1 : 1, { damping: 15 }) }
      ]
    };
  });

  return (
    <Animated.View style={[animatedStyle, { alignItems: 'center', justifyContent: 'center' }]}>
      <View style={{
        padding: theme.spacing[2],
        borderRadius: theme.borderRadius.full,
        backgroundColor: focused ? theme.colors.primary[500] + '20' : 'transparent'
      }}>
        <Ionicons name={name as any} size={size} color={color} />
      </View>
    </Animated.View>
  );
};

// ========================================
// LAYOUT PRINCIPAL DE TABS
// ========================================
export default function TabsLayout() {
  const { user, isInitialized } = useAuth();

  // Redirigir a auth si no hay usuario
  if (isInitialized && !user) {
    return <Redirect href="/(auth)/login" />;
  }

  // Mostrar loading mientras se inicializa
  if (!isInitialized) {
    return null; // O un componente de loading
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: theme.layout.tabBarHeight,
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : theme.colors.background.secondary,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border.primary,
          paddingBottom: Platform.OS === 'ios' ? theme.layout.bottomSafeArea : theme.spacing[4],
          paddingTop: theme.spacing[2],
          elevation: 0,
        },
        tabBarBackground: () => Platform.OS === 'ios' ? (
          <BlurView
            intensity={20}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: theme.colors.background.glass
            }}
          />
        ) : null,
        tabBarActiveTintColor: theme.colors.primary[500],
        tabBarInactiveTintColor: theme.colors.text.tertiary,
        tabBarLabelStyle: {
          fontSize: theme.typography.fontSize.xs,
          fontWeight: theme.typography.fontWeight.medium,
          marginTop: theme.spacing[1]
        },
        tabBarItemStyle: {
          paddingVertical: theme.spacing[1]
        }
      }}
    >
      {/* Tab Chat */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chat',
          tabBarIcon: ({ focused, color, size }) => (
            <TabBarIcon
              name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
              focused={focused}
              color={color}
              size={size}
            />
          )
        }}
      />

      {/* Tab Conversaciones */}
      <Tabs.Screen
        name="conversations"
        options={{
          title: 'Conversaciones',
          tabBarIcon: ({ focused, color, size }) => (
            <TabBarIcon
              name={focused ? 'list' : 'list-outline'}
              focused={focused}
              color={color}
              size={size}
            />
          )
        }}
      />

      {/* Tab Herramientas */}
      <Tabs.Screen
        name="tools"
        options={{
          title: 'Herramientas',
          tabBarIcon: ({ focused, color, size }) => (
            <TabBarIcon
              name={focused ? 'construct' : 'construct-outline'}
              focused={focused}
              color={color}
              size={size}
            />
          )
        }}
      />

      {/* Tab Perfil */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused, color, size }) => (
            <TabBarIcon
              name={focused ? 'person' : 'person-outline'}
              focused={focused}
              color={color}
              size={size}
            />
          )
        }}
      />
    </Tabs>
  );
}