// app/(tabs)/_layout.tsx
import React from 'react';
import { Platform, ViewStyle, StyleSheet } from 'react-native';
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
// LAYOUT PRINCIPAL DE TABS
// ========================================
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: theme.layout.tabBarHeight,
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : theme.colors.background.secondary,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border.primary,
          paddingBottom: Platform.OS === 'ios' ? 0 : theme.spacing[2], // Padding for notch is handled by SafeAreaView in screens
          paddingTop: theme.spacing[2],
          elevation: 0,
          position: 'absolute',
        },
        tabBarBackground: () => Platform.OS === 'ios' ? (
          <BlurView
            intensity={30}
            tint="dark"
            style={{
              ...StyleSheet.absoluteFillObject,
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
          paddingBottom: Platform.OS === 'ios' ? theme.spacing[4] : theme.spacing[2], // Adjust padding for iOS bottom safe area
          paddingTop: theme.spacing[1],
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chat',
          tabBarIcon: (props) => (
            <TabBarIcon
              {...props}
              name={props.focused ? 'chatbubbles' : 'chatbubbles-outline'}
            />
          )
        }}
      />
      <Tabs.Screen
        name="conversations"
        options={{
          title: 'Conversaciones',
          tabBarIcon: (props) => (
            <TabBarIcon
              {...props}
              name={props.focused ? 'list' : 'list-outline'}
            />
          )
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          title: 'Herramientas',
          tabBarIcon: (props) => (
            <TabBarIcon
              {...props}
              name={props.focused ? 'construct' : 'construct-outline'}
            />
          )
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: (props) => (
            <TabBarIcon
              {...props}
              name={props.focused ? 'person' : 'person-outline'}
            />
          )
        }}
      />
    </Tabs>
  );
}