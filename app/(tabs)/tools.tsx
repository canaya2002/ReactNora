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
  Modal,
  Linking
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  interpolateColor
} from 'react-native-reanimated';

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
  gradient: string[];
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
  const scaleValue = useSharedValue(1);
  const opacityValue = useSharedValue(0);

  React.useEffect(() => {
    opacityValue.value = withDelay(index * 100, withSpring(1));
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacityValue.value,
      transform: [
        { scale: scaleValue.value },
        { translateY: (1 - opacityValue.value) * 20 }
      ],
    };
  });

  const handlePress = () => {
    if (tool.isComingSoon) {
      Alert.alert(
        'Próximamente',
        'Esta herramienta estará disponible en una próxima actualización.'
      );
      return;
    }

    scaleValue.value = withSpring(0.95, {}, () => {
      scaleValue.value = withSpring(1);
    });

    setTimeout(tool.onPress, 150);
  };

  return (
    <Animated.View style={[styles.toolCard, animatedStyle]}>
      <TouchableOpacity
        onPress={handlePress}
        disabled={tool.isComingSoon}
        activeOpacity={0.8}
        style={styles.toolCardTouchable}
      >
        <LinearGradient
          colors={tool.gradient}
          style={styles.toolCardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Header del card */}
          <View style={styles.toolCardHeader}>
            <View style={styles.toolIconContainer}>
              <Ionicons name={tool.icon} size={32} color="#ffffff" />
            </View>
            
            {tool.isPremium && (
              <View style={styles.premiumBadge}>
                <Ionicons name="diamond" size={12} color="#ffffff" />
              </View>
            )}
            
            {tool.isComingSoon && (
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>Pronto</Text>
              </View>
            )}
          </View>

          {/* Contenido del card */}
          <View style={styles.toolCardContent}>
            {/* CORREGIDO: fontWeight usando valor correcto del theme */}
            <Text style={styles.toolName}>{tool.name}</Text>
            <Text style={styles.toolDescription}>{tool.description}</Text>
          </View>

          {/* Footer del card */}
          <View style={styles.toolCardFooter}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>
                {tool.category === 'creative' ? 'Creativo' :
                 tool.category === 'productivity' ? 'Productividad' :
                 tool.category === 'analysis' ? 'Análisis' : 'Premium'}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const ComingSoonOverlay: React.FC<{ visible: boolean; onClose: () => void }> = ({ 
  visible, 
  onClose 
}) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={styles.comingSoonOverlay}>
      <View style={styles.comingSoonModal}>
        <View style={styles.comingSoonIcon}>
          <Ionicons name="construct" size={48} color={theme.colors.primary[500]} />
        </View>
        
        {/* CORREGIDO: fontWeight usando valor correcto del theme */}
        <Text style={styles.comingSoonTitle}>Herramienta en desarrollo</Text>
        <Text style={styles.comingSoonMessage}>
          Estamos trabajando en esta increíble funcionalidad. 
          ¡Te notificaremos cuando esté lista!
        </Text>
        
        <Button
          title="Entendido"
          onPress={onClose}
          variant="filled"
          size="lg"
          style={styles.comingSoonButton}
        />
      </View>
    </View>
  </Modal>
);

// ========================================
// COMPONENTE PRINCIPAL
// ========================================
export default function ToolsScreen() {
  // Estados
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Hooks
  const { userProfile } = useAuth();

  // Valores animados
  const headerScale = useSharedValue(1);

  // ========================================
  // EFECTOS
  // ========================================
  React.useEffect(() => {
    headerScale.value = withSpring(1.02, {}, () => {
      headerScale.value = withSpring(1);
    });
  }, []);

  // ========================================
  // DATOS DE HERRAMIENTAS
  // ========================================
  const tools = useMemo<Tool[]>(() => [
    {
      id: 'image-generator',
      name: 'Generador de Imágenes',
      description: 'Crea imágenes increíbles con IA',
      icon: 'image',
      gradient: [theme.colors.primary[500], theme.colors.primary[700]],
      category: 'creative',
      isPremium: false,
      isComingSoon: false,
      onPress: () => setActiveTool('image-generator')
    },
    {
      id: 'video-generator',
      name: 'Generador de Videos',
      description: 'Genera videos con inteligencia artificial',
      icon: 'videocam',
      gradient: [theme.colors.secondary[500], theme.colors.secondary[700]],
      category: 'creative',
      isPremium: true,
      isComingSoon: false,
      onPress: () => {
        if (userProfile?.planInfo?.plan === 'free') {
          setShowUpgradeModal(true);
        } else {
          setActiveTool('video-generator');
        }
      }
    },
    {
      id: 'file-analyzer',
      name: 'Analizador de Archivos',
      description: 'Analiza y extrae información de documentos',
      icon: 'document-text',
      gradient: ['#667eea', '#764ba2'],
      category: 'analysis',
      isPremium: false,
      isComingSoon: false,
      onPress: () => setActiveTool('file-analyzer')
    },
    {
      id: 'code-assistant',
      name: 'Asistente de Código',
      description: 'Ayuda con programación y desarrollo',
      icon: 'code-slash',
      gradient: ['#f093fb', '#f5576c'],
      category: 'productivity',
      isPremium: true,
      isComingSoon: true,
      onPress: () => setShowComingSoon(true)
    },
    {
      id: 'text-summarizer',
      name: 'Resumidor de Textos',
      description: 'Resume documentos largos automáticamente',
      icon: 'list',
      gradient: ['#4facfe', '#00f2fe'],
      category: 'productivity',
      isPremium: false,
      isComingSoon: true,
      onPress: () => setShowComingSoon(true)
    },
    {
      id: 'voice-assistant',
      name: 'Asistente de Voz',
      description: 'Interactúa usando comandos de voz',
      icon: 'mic',
      gradient: ['#43e97b', '#38f9d7'],
      category: 'premium',
      isPremium: true,
      isComingSoon: true,
      onPress: () => setShowComingSoon(true)
    }
  ], [userProfile?.planInfo?.plan]);

  // ========================================
  // FUNCIONES AUXILIARES
  // ========================================
  const getToolsByCategory = (category: Tool['category']) => {
    return tools.filter(tool => tool.category === category);
  };

  const closeActiveTool = useCallback(() => {
    setActiveTool(null);
  }, []);

  // ========================================
  // RENDERIZADO DE HERRAMIENTAS
  // ========================================
  const renderActiveTool = () => {
    switch (activeTool) {
      case 'image-generator':
        return (
          <View style={styles.activeToolContainer}>
            <View style={styles.activeToolHeader}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={closeActiveTool}
              >
                <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
              
              {/* CORREGIDO: fontWeight usando valor correcto del theme */}
              <Text style={styles.activeToolTitle}>
                Generador de Imágenes
              </Text>
              
              <View style={{ width: 32 }} />
            </View>
            <ImageGenerator />
          </View>
        );

      case 'video-generator':
        return (
          <View style={styles.activeToolContainer}>
            <View style={styles.activeToolHeader}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={closeActiveTool}
              >
                <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
              
              <Text style={styles.activeToolTitle}>
                Generador de Videos
              </Text>
              
              <View style={{ width: 32 }} />
            </View>
            <VideoGenerator />
          </View>
        );

      case 'file-analyzer':
        return (
          <View style={styles.activeToolContainer}>
            <View style={styles.activeToolHeader}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={closeActiveTool}
              >
                <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
              
              <Text style={styles.activeToolTitle}>
                Analizador de Archivos
              </Text>
              
              <View style={{ width: 32 }} />
            </View>
            <FileUploader />
          </View>
        );

      default:
        return null;
    }
  };

  // ========================================
  // RENDERIZADO PRINCIPAL
  // ========================================
  if (activeTool) {
    return (
      <View style={styles.container}>
        {renderActiveTool()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            {/* CORREGIDO: fontWeight usando valor correcto del theme */}
            <Text style={styles.headerTitle}>Herramientas IA</Text>
            <Text style={styles.headerSubtitle}>
              Potencia tu creatividad con nuestras herramientas de inteligencia artificial
            </Text>
          </View>
        </View>

        {/* Herramientas principales */}
        <View style={styles.section}>
          <View style={styles.toolsGrid}>
            {tools.slice(0, 3).map((tool, index) => (
              <ToolCard key={tool.id} tool={tool} index={index} />
            ))}
          </View>
        </View>

        {/* Sección de ayuda */}
        <View style={styles.infoSection}>
          <Card style={styles.infoCard}>
            <View style={styles.infoContent}>
              <View style={styles.infoIcon}>
                <Ionicons name="information-circle" size={32} color={theme.colors.primary[500]} />
              </View>
              
              <View style={styles.infoText}>
                {/* CORREGIDO: fontWeight usando valor correcto del theme */}
                <Text style={styles.infoTitle}>¿Necesitas ayuda?</Text>
                <Text style={styles.infoDescription}>
                  Explora nuestras herramientas y descubre todo lo que puedes crear
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Más herramientas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Más herramientas</Text>
          <View style={styles.toolsGrid}>
            {tools.slice(3).map((tool, index) => (
              <ToolCard key={tool.id} tool={tool} index={index + 3} />
            ))}
          </View>
        </View>

        {/* Sección de actualización para usuarios gratuitos */}
        {userProfile?.planInfo?.plan === 'free' && (
          <View style={styles.upgradeSection}>
            <LinearGradient
              colors={[theme.colors.primary[600], theme.colors.primary[800]]}
              style={styles.upgradeCard}
            >
              <View style={styles.upgradeContent}>
                {/* CORREGIDO: fontWeight usando valor correcto del theme */}
                <Text style={styles.upgradeTitle}>Desbloquea todo el potencial</Text>
                <Text style={styles.upgradeDescription}>
                  Accede a herramientas premium y funciones avanzadas
                </Text>
                
                <Button
                  title="Actualizar a Pro"
                  variant="filled"
                  size="lg"
                  fullWidth
                  style={styles.upgradeButton}
                  onPress={() => setShowUpgradeModal(true)}
                />
              </View>
            </LinearGradient>
          </View>
        )}
      </ScrollView>

      {/* Modal de herramienta en desarrollo */}
      <ComingSoonOverlay 
        visible={showComingSoon} 
        onClose={() => setShowComingSoon(false)} 
      />

      {/* Modal de actualización */}
      <CustomModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="NORA AI Pro"
        size="lg"
        glassmorphism
      >
        <View style={styles.upgradeModalContent}>
          <Text style={styles.upgradeModalTitle}>
            Desbloquea herramientas premium
          </Text>
          <Text style={styles.upgradeModalDescription}>
            Accede a todas las funciones avanzadas y herramientas exclusivas
          </Text>
          
          <View style={styles.upgradeFeatures}>
            {[
              'Generador de videos con IA',
              'Asistente de código avanzado',
              'Análisis de documentos ilimitado',
              'Soporte prioritario'
            ].map((feature, index) => (
              <View key={index} style={styles.upgradeFeature}>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                <Text style={styles.upgradeFeatureText}>{feature}</Text>
              </View>
            ))}
          </View>
          
          <Button
            title="Actualizar ahora"
            variant="filled"
            size="lg"
            fullWidth
            style={styles.upgradeModalButton}
            onPress={() => {
              setShowUpgradeModal(false);
              Alert.alert('Próximamente', 'La actualización estará disponible pronto');
            }}
          />
        </View>
      </CustomModal>
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
  header: {
    paddingVertical: theme.spacing[6],
    paddingHorizontal: theme.spacing[4],
  },
  headerContent: {
    alignItems: 'center',
  },
  // CORREGIDO: fontWeight usando valor correcto del theme
  headerTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing[2],
  },
  headerSubtitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    paddingHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[6],
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing[4],
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  toolCard: {
    width: '48%',
    marginBottom: theme.spacing[4],
  },
  toolCardTouchable: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  toolCardGradient: {
    padding: theme.spacing[4],
    minHeight: 160,
    justifyContent: 'space-between',
  },
  toolCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing[1],
  },
  comingSoonBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
  },
  comingSoonText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  toolCardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  // CORREGIDO: fontWeight usando valor correcto del theme
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
  toolCardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  categoryBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
  },
  categoryText: {
    fontSize: theme.typography.fontSize.xs,
    color: '#ffffff',
    fontWeight: theme.typography.fontWeight.medium,
  },
  activeToolContainer: {
    flex: 1,
  },
  activeToolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing[4],
    paddingHorizontal: theme.spacing[4],
    backgroundColor: theme.colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  backButton: {
    padding: theme.spacing[2],
  },
  // CORREGIDO: fontWeight usando valor correcto del theme
  activeToolTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: theme.spacing[4],
  },
  infoSection: {
    paddingHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[6],
  },
  infoCard: {
    padding: theme.spacing[4],
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    marginRight: theme.spacing[3],
  },
  infoText: {
    flex: 1,
  },
  // CORREGIDO: fontWeight usando valor correcto del theme
  infoTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginLeft: theme.spacing[3],
  },
  infoDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing[1],
    marginLeft: theme.spacing[3],
  },
  upgradeSection: {
    paddingHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[6],
  },
  upgradeCard: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[6],
  },
  upgradeContent: {
    alignItems: 'center',
  },
  // CORREGIDO: fontWeight usando valor correcto del theme
  upgradeTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: theme.spacing[2],
  },
  upgradeDescription: {
    fontSize: theme.typography.fontSize.base,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: theme.spacing[4],
  },
  upgradeButton: {
    backgroundColor: '#ffffff',
    borderWidth: 0,
  },
  comingSoonOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[4],
  },
  comingSoonModal: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing[6],
    alignItems: 'center',
    width: '90%',
    maxWidth: 400,
  },
  comingSoonIcon: {
    marginBottom: theme.spacing[4],
  },
  // CORREGIDO: fontWeight usando valor correcto del theme
  comingSoonTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginTop: theme.spacing[2],
    marginBottom: theme.spacing[3],
  },
  comingSoonMessage: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: theme.spacing[6],
  },
  comingSoonButton: {
    backgroundColor: theme.colors.primary[500],
  },
  upgradeModalContent: {
    alignItems: 'center',
  },
  upgradeModalTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing[2],
  },
  upgradeModalDescription: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing[6],
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
  upgradeModalButton: {
    backgroundColor: theme.colors.primary[500],
    width: '100%',
  },
});