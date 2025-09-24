// app/(tabs)/index.tsx - PANTALLA PRINCIPAL DE CHAT (CORREGIDA)
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

// Componentes
import ChatInterface from '../../src/components/ChatInterface';

// Hooks y contextos
import { useAuth } from '../../src/contexts/AuthContext';
import { useConversations } from '../../src/contexts/ConversationContext';

// Estilos
import { theme } from '../../src/styles/theme';

// ========================================
// PANTALLA PRINCIPAL
// ========================================
export default function ChatScreen() {
  const { user, userProfile } = useAuth();
  const { currentConversation, startNewConversation } = useConversations();

  // Animación para el fondo
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    // Animación continua del fondo
    opacity.value = withRepeat(
      withTiming(0.1, { duration: 3000 }),
      -1,
      true
    );
  }, []);

  const backgroundAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value
    };
  });

  // Efecto al enfocar la pantalla
  useFocusEffect(
    React.useCallback(() => {
      // Iniciar nueva conversación si no hay una actual
      if (!currentConversation) {
        startNewConversation();
      }
    }, [currentConversation, startNewConversation])
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor={theme.colors.background.primary} />
      
      {/* Fondo animado con gradiente */}
      <Animated.View style={[styles.backgroundVideo, backgroundAnimatedStyle]}>
        <LinearGradient
          colors={[
            theme.colors.background.primary,
            theme.colors.primary[900] + '20',
            theme.colors.background.primary,
            theme.colors.primary[800] + '10'
          ] as const}
          style={styles.gradientBackground}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      {/* Overlay para efectos visuales */}
      <View style={styles.overlay}>
        {/* Partículas flotantes simuladas */}
        <Animated.View 
          entering={FadeIn.duration(2000)}
          style={[styles.particle, styles.particle1]}
        />
        <Animated.View 
          entering={FadeIn.duration(2000).delay(500)}
          style={[styles.particle, styles.particle2]}
        />
        <Animated.View 
          entering={FadeIn.duration(2000).delay(1000)}
          style={[styles.particle, styles.particle3]}
        />
      </View>

      {/* Componente de chat principal */}
      <View style={styles.chatContainer}>
        <ChatInterface conversationId={currentConversation?.id} />
      </View>
    </View>
  );
}

// ========================================
// ESTILOS
// ========================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary
  },
  
  // Fondo animado
  backgroundVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0
  },
  gradientBackground: {
    flex: 1,
    opacity: 0.6
  },

  // Overlay con efectos
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1
  },

  // Partículas flotantes
  particle: {
    position: 'absolute',
    borderRadius: 50,
    backgroundColor: theme.colors.primary[500] + '30'
  },
  particle1: {
    width: 4,
    height: 4,
    top: '20%',
    left: '10%'
  },
  particle2: {
    width: 8,
    height: 8,
    top: '60%',
    right: '15%'
  },
  particle3: {
    width: 6,
    height: 6,
    bottom: '30%',
    left: '80%'
  },

  // Container del chat
  chatContainer: {
    flex: 1,
    zIndex: 10
  }
});