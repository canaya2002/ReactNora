// app/(tabs)/_layout.tsx
import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '../../src/styles/theme';

// ========================================
// COMPONENTE DE ICONO DE TAB
// ========================================
interface TabBarIconProps {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  color: string;
  size: number;
}

const TabBarIcon: React.FC<TabBarIconProps> = ({ name, focused, color, size }) => (
  <Ionicons 
    name={name} 
    size={size} 
    color={color}
    style={{ 
      opacity: focused ? 1 : 0.7,
      transform: [{ scale: focused ? 1.1 : 1 }] 
    }}
  />
);

// ========================================
// LAYOUT PRINCIPAL
// ========================================
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          // CORREGIDO: Usar theme.layout
          height: theme.layout.tabBarHeight,
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : theme.colors.background.secondary,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border.primary,
          // CORREGIDO: Usar theme.layout.bottomSafeArea
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
        // CORREGIDO: fontWeight usando valores del theme
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
          tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number; }) => (
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
          tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number; }) => (
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
          tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number; }) => (
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
          tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number; }) => (
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