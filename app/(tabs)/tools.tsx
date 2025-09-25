// app/(tabs)/tools.tsx
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  SafeAreaView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import { router } from 'expo-router';

import { theme } from '../../src/styles/theme';
import { Card, Button, CustomModal } from '../../src/components/base';
import { ImageGenerator } from '../../src/components/ImageGenerator';
import { VideoGenerator } from '../../src/components/VideoGenerator';
import { FileUploader } from '../../src/components/FileUploader';
import { useAuth } from '../../src/contexts/AuthContext';

const { width: screenWidth } = Dimensions.get('window');

// ========================================
// INTERFACES Y TIPOS
// ========================================
interface Tool {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: readonly [string, string];
  category: 'creative' | 'productivity' | 'analysis' | 'premium';
  isPremium: boolean;
  isComingSoon: boolean;
  onPress: () => void;
}

interface ToolCardProps {
  tool: Tool;
  index: number;
}

// ========================================
// COMPONENTES
// ========================================
const ToolCard: React.FC<ToolCardProps> = ({ tool, index }) => {
  const scaleValue = useSharedValue(0.9);
  const opacityValue = useSharedValue(0);

  React.useEffect(() => {
    opacityValue.value = withDelay(index * 100, withSpring(1));
    scaleValue.value = withDelay(index * 100, withSpring(1));
  }, [index, opacityValue, scaleValue]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacityValue.value,
      transform: [{ scale: scaleValue.value }],
    };
  });

  const handlePress = () => {
    if (tool.isComingSoon) {
      Alert.alert('Próximamente', 'Esta herramienta estará disponible en una futura actualización.');
      return;
    }
    scaleValue.value = withSpring(0.95, {}, () => {
      scaleValue.value = withSpring(1);
    });
    setTimeout(tool.onPress, 150);
  };

  return (
    <Animated.View style={[styles.toolCard, animatedStyle]}>
      <TouchableOpacity onPress={handlePress} disabled={tool.isComingSoon} activeOpacity={0.8}>
        <LinearGradient colors={tool.gradient} style={styles.toolCardGradient}>
          <View style={styles.toolCardHeader}>
            <View style={styles.toolIconContainer}>
              <Ionicons name={tool.icon} size={28} color="#ffffff" />
            </View>
            {tool.isPremium && (
              <View style={styles.premiumBadge}>
                <Ionicons name="diamond" size={12} color="#ffffff" />
              </View>
            )}
            {tool.isComingSoon && (
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>PRONTO</Text>
              </View>
            )}
          </View>
          <View style={styles.toolCardContent}>
            <Text style={styles.toolName}>{tool.name}</Text>
            <Text style={styles.toolDescription}>{tool.description}</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ========================================
// COMPONENTE PRINCIPAL
// ========================================
export default function ToolsScreen() {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const { userProfile } = useAuth();

  const handleUpgrade = () => {
    router.push('/(tabs)/profile'); 
    Alert.alert("Actualiza a Pro", "Visita tu perfil para ver los planes premium.");
  };

  const tools = useMemo<Tool[]>(() => [
    {
      id: 'image-generator',
      name: 'Generador de Imágenes',
      description: 'Crea imágenes increíbles desde texto.',
      icon: 'image-outline',
      gradient: [theme.colors.primary[500], theme.colors.primary[700]],
      category: 'creative',
      isPremium: false,
      isComingSoon: false,
      onPress: () => setActiveTool('image-generator'),
    },
    {
      id: 'video-generator',
      name: 'Generador de Videos',
      description: 'Genera videos cortos con IA.',
      icon: 'videocam-outline',
      gradient: [theme.colors.secondary[500], theme.colors.secondary[700]],
      category: 'creative',
      isPremium: true,
      isComingSoon: false,
      onPress: () => {
        if (userProfile?.planInfo?.plan === 'free') {
          handleUpgrade();
        } else {
          setActiveTool('video-generator');
        }
      },
    },
    {
      id: 'file-analyzer',
      name: 'Analizador de Archivos',
      description: 'Extrae información de documentos.',
      icon: 'document-text-outline',
      gradient: ['#667eea', '#764ba2'] as const,
      category: 'analysis',
      isPremium: false,
      isComingSoon: false,
      onPress: () => setActiveTool('file-analyzer'),
    },
    {
      id: 'code-assistant',
      name: 'Asistente de Código',
      description: 'Ayuda para programadores.',
      icon: 'code-slash-outline',
      gradient: ['#f093fb', '#f5576c'] as const,
      category: 'productivity',
      isPremium: true,
      isComingSoon: true,
      onPress: () => {},
    },
  ], [userProfile?.planInfo?.plan]);

  const renderActiveTool = () => {
    const toolMap: { [key: string]: { title: string; component: React.ReactNode } } = {
        'image-generator': { title: 'Generador de Imágenes', component: <ImageGenerator /> },
        'video-generator': { title: 'Generador de Videos', component: <VideoGenerator /> },
        'file-analyzer': { title: 'Analizador de Archivos', component: <FileUploader /> },
    };
    
    const active = toolMap[activeTool!];
    if (!active) return null;

    return (
      <SafeAreaView style={styles.activeToolContainer} edges={['top']}>
        <View style={styles.activeToolHeader}>
          <TouchableOpacity onPress={() => setActiveTool(null)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.activeToolTitle}>{active.title}</Text>
          <View style={{ width: 40 }} />
        </View>
        {active.component}
      </SafeAreaView>
    );
  };

  if (activeTool) {
    return renderActiveTool();
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Herramientas IA</Text>
          <Text style={styles.headerSubtitle}>Potencia tu creatividad y productividad.</Text>
        </View>

        <View style={styles.toolsGrid}>
          {tools.map((tool, index) => (
            <ToolCard key={tool.id} tool={tool} index={index} />
          ))}
        </View>

        {userProfile?.planInfo?.plan === 'free' && (
          <View style={styles.upgradeSection}>
            <LinearGradient colors={[theme.colors.primary[600], theme.colors.primary[800]]} style={styles.upgradeCard}>
              <View style={styles.upgradeContent}>
                <Ionicons name="diamond-outline" size={32} color="#ffffff" />
                <Text style={styles.upgradeTitle}>Desbloquea todo el potencial</Text>
                <Text style={styles.upgradeDescription}>Accede a herramientas premium y funciones avanzadas.</Text>
                <Button title="Actualizar a Pro" variant="filled" size="md" onPress={handleUpgrade} />
              </View>
            </LinearGradient>
          </View>
        )}
      </ScrollView>
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
    paddingVertical: theme.spacing[6],
    paddingHorizontal: theme.spacing[4],
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing[2],
  },
  headerSubtitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing[4],
  },
  toolCard: {
    width: '48%',
    marginBottom: theme.spacing[4],
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  toolCardGradient: {
    padding: theme.spacing[4],
    height: 180,
    justifyContent: 'space-between',
  },
  toolCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  toolIconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumBadge: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: theme.borderRadius.full,
    padding: theme.spacing[1],
  },
  comingSoonBadge: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
  },
  comingSoonText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.secondary,
  },
  toolCardContent: {},
  toolName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: '#ffffff',
    marginBottom: theme.spacing[1],
  },
  toolDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
  },
  activeToolContainer: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  activeToolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    backgroundColor: theme.colors.background.secondary,
  },
  backButton: {
    padding: theme.spacing[2],
  },
  activeToolTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  upgradeSection: {
    padding: theme.spacing[4],
    paddingBottom: theme.layout.tabBarHeight,
  },
  upgradeCard: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[6],
    alignItems: 'center',
  },
  upgradeContent: {
    alignItems: 'center',
  },
  upgradeTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: '#ffffff',
    textAlign: 'center',
    marginTop: theme.spacing[3],
    marginBottom: theme.spacing[2],
  },
  upgradeDescription: {
    fontSize: theme.typography.fontSize.base,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: theme.spacing[4],
  },
});