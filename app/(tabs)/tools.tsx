// app/(tabs)/tools.tsx - PANTALLA DE HERRAMIENTAS (CORREGIDA)
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import Animated, { 
  FadeInDown, 
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';

// Hooks y contextos
import { useAuth } from '../../src/contexts/AuthContext';

// Componentes
import { Button, Card, IconButton, CustomModal } from '../../src/components/base';

// Importar componentes de herramientas
import ImageGenerator from '../../src/components/ImageGenerator';
import VideoGenerator from '../../src/components/VideoGenerator';
import FileUploader from '../../src/components/FileUploader';

// Estilos
import { theme } from '../../src/styles/theme';

const { width } = Dimensions.get('window');

// ========================================
// INTERFACES Y TIPOS
// ========================================
interface Tool {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  gradient: readonly [string, string];
  isPremium?: boolean;
  isNew?: boolean;
  isComingSoon?: boolean;
  category: 'ai' | 'productivity' | 'media' | 'analysis';
}

type ActiveTool = 'image' | 'video' | 'files' | 'code' | 'chat' | null;
type Category = 'all' | 'ai' | 'productivity' | 'media' | 'analysis';

// ========================================
// DATOS DE HERRAMIENTAS
// ========================================
const TOOLS: Tool[] = [
  {
    id: 'image',
    name: 'Generar Imágenes',
    description: 'Crea imágenes únicas con IA',
    icon: <Ionicons name="image" size={32} color="#ffffff" />,
    gradient: [theme.colors.primary[500], theme.colors.primary[700]] as const,
    category: 'ai'
  },
  {
    id: 'video',
    name: 'Generar Videos',
    description: 'Crea videos con inteligencia artificial',
    icon: <Ionicons name="videocam" size={32} color="#ffffff" />,
    gradient: [theme.colors.success[500], theme.colors.success[700]] as const,
    isPremium: true,
    category: 'ai'
  },
  {
    id: 'files',
    name: 'Analizar Archivos',
    description: 'Analiza documentos, PDFs e imágenes',
    icon: <Ionicons name="document-text" size={32} color="#ffffff" />,
    gradient: [theme.colors.info[500], theme.colors.info[700]] as const,
    category: 'analysis'
  },
  {
    id: 'code',
    name: 'Asistente de Código',
    description: 'Ayuda con programación y desarrollo',
    icon: <Ionicons name="code-slash" size={32} color="#ffffff" />,
    gradient: [theme.colors.warning[500], theme.colors.warning[700]] as const,
    category: 'productivity'
  },
  {
    id: 'chat',
    name: 'Chat Avanzado',
    description: 'Conversaciones con especialistas IA',
    icon: <Ionicons name="chatbubbles" size={32} color="#ffffff" />,
    gradient: [theme.colors.secondary[500], theme.colors.secondary[700]] as const,
    category: 'ai'
  },
  {
    id: 'translation',
    name: 'Traductor IA',
    description: 'Traduce texto a múltiples idiomas',
    icon: <Ionicons name="language" size={32} color="#ffffff" />,
    gradient: ['#8B5CF6', '#7C3AED'] as const,
    category: 'productivity'
  },
  {
    id: 'voice',
    name: 'Síntesis de Voz',
    description: 'Convierte texto a voz natural',
    icon: <Ionicons name="mic" size={32} color="#ffffff" />,
    gradient: ['#EC4899', '#DB2777'] as const,
    isPremium: true,
    isComingSoon: true,
    category: 'media'
  },
  {
    id: 'summary',
    name: 'Resumir Textos',
    description: 'Resume documentos largos automáticamente',
    icon: <Ionicons name="list" size={32} color="#ffffff" />,
    gradient: ['#10B981', '#059669'] as const,
    category: 'productivity'
  },
  {
    id: 'ocr',
    name: 'Reconocer Texto',
    description: 'Extrae texto de imágenes (OCR)',
    icon: <Ionicons name="scan" size={32} color="#ffffff" />,
    gradient: ['#F59E0B', '#D97706'] as const,
    isNew: true,
    category: 'analysis'
  },
  {
    id: 'search',
    name: 'Búsqueda Web IA',
    description: 'Busca información en internet con IA',
    icon: <Ionicons name="search" size={32} color="#ffffff" />,
    gradient: ['#6366F1', '#4F46E5'] as const,
    category: 'productivity'
  }
];

const CATEGORIES = [
  { id: 'all' as const, name: 'Todas', icon: 'apps' },
  { id: 'ai' as const, name: 'IA Generativa', icon: 'sparkles' },
  { id: 'productivity' as const, name: 'Productividad', icon: 'briefcase' },
  { id: 'media' as const, name: 'Multimedia', icon: 'play-circle' },
  { id: 'analysis' as const, name: 'Análisis', icon: 'analytics' }
];

// ========================================
// COMPONENTE PRINCIPAL
// ========================================
export default function ToolsScreen() {
  const { userProfile } = useAuth();

  // Estados
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [activeTool, setActiveTool] = useState<ActiveTool>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // ========================================
  // FILTRADO DE HERRAMIENTAS
  // ========================================
  const filteredTools = TOOLS.filter(tool => {
    if (selectedCategory === 'all') return true;
    return tool.category === selectedCategory;
  });

  // ========================================
  // HANDLERS
  // ========================================
  const handleToolPress = (tool: Tool) => {
    // Verificar si requiere premium
    if (tool.isPremium && userProfile?.planInfo?.plan === 'free') {
      Alert.alert(
        'Función Premium',
        `${tool.name} requiere una cuenta Pro. ¿Te gustaría actualizar?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Ver Planes', onPress: () => setShowUpgradeModal(true) }
        ]
      );
      return;
    }

    // Verificar si está próximamente
    if (tool.isComingSoon) {
      Alert.alert(
        'Próximamente',
        `${tool.name} estará disponible pronto. Te notificaremos cuando esté listo.`
      );
      return;
    }

    // Abrir herramienta
    setActiveTool(tool.id as ActiveTool);
  };

  const closeActiveTool = () => {
    setActiveTool(null);
  };

  // ========================================
  // COMPONENTES DE RENDERIZADO
  // ========================================
  const CategoryFilter = () => (
    <View style={styles.categorySection}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryContainer}
      >
        {CATEGORIES.map((category, index) => (
          <Animated.View key={category.id} entering={FadeInDown.delay(index * 50)}>
            <TouchableOpacity
              style={[
                styles.categoryButton,
                selectedCategory === category.id && styles.categoryButtonActive
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Ionicons
                name={category.icon as any}
                size={20}
                color={selectedCategory === category.id ? '#ffffff' : theme.colors.text.secondary}
              />
              <Text style={[
                styles.categoryButtonText,
                selectedCategory === category.id && styles.categoryButtonTextActive
              ]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );

  const ToolCard = ({ tool, index }: { tool: Tool; index: number }) => {
    const scale = useSharedValue(1);
    
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }]
    }));

    const handlePressIn = () => {
      scale.value = withSpring(0.95);
    };

    const handlePressOut = () => {
      scale.value = withSpring(1);
    };

    const isDisabled = tool.isPremium && userProfile?.planInfo?.plan === 'free';

    return (
      <Animated.View
        entering={FadeInDown.delay(index * 100)}
        style={[animatedStyle, styles.toolCardWrapper]}
      >
        <TouchableOpacity
          style={[
            styles.toolCard,
            isDisabled && styles.toolCardDisabled
          ]}
          onPress={() => handleToolPress(tool)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={tool.gradient}
            style={styles.toolGradient}
          >
            <View style={styles.toolHeader}>
              <View style={styles.toolIcon}>
                {tool.icon}
              </View>
              
              <View style={styles.toolBadges}>
                {tool.isNew && (
                  <View style={[styles.badge, styles.newBadge]}>
                    <Text style={styles.badgeText}>NUEVO</Text>
                  </View>
                )}
                {tool.isPremium && (
                  <View style={[styles.badge, styles.premiumBadge]}>
                    <Ionicons name="diamond" size={12} color="#ffffff" />
                  </View>
                )}
                {tool.isComingSoon && (
                  <View style={[styles.badge, styles.comingSoonBadge]}>
                    <Text style={styles.badgeText}>PRONTO</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.toolContent}>
              <Text style={styles.toolName}>{tool.name}</Text>
              <Text style={styles.toolDescription}>{tool.description}</Text>
            </View>

            <View style={styles.toolFooter}>
              <Ionicons 
                name="arrow-forward" 
                size={20} 
                color="rgba(255,255,255,0.8)" 
              />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // ========================================
  // RENDER DE HERRAMIENTAS ACTIVAS
  // ========================================
  const renderActiveTool = () => {
    switch (activeTool) {
      case 'image':
        return (
          <ImageGenerator
            onImageGenerated={(imageUrl) => {
              console.log('Image generated:', imageUrl);
            }}
          />
        );
      case 'video':
        return (
          <VideoGenerator
            onVideoGenerated={(videoUrl) => {
              console.log('Video generated:', videoUrl);
            }}
          />
        );
      case 'files':
        return (
          <FileUploader
            onFilesSelected={(files) => {
              console.log('Files selected:', files);
            }}
          />
        );
      default:
        return (
          <View style={styles.comingSoonContainer}>
            <Ionicons name="construct" size={64} color={theme.colors.text.tertiary} />
            <Text style={styles.comingSoonTitle}>Herramienta en desarrollo</Text>
            <Text style={styles.comingSoonText}>
              Esta herramienta estará disponible pronto
            </Text>
          </View>
        );
    }
  };

  // ========================================
  // RENDER PRINCIPAL
  // ========================================
  if (activeTool) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        
        {/* Header de herramienta activa */}
        <View style={styles.activeToolHeader}>
          <IconButton
            icon={<Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />}
            onPress={closeActiveTool}
            variant="ghost"
          />
          <Text style={styles.activeToolTitle}>
            {TOOLS.find(t => t.id === activeTool)?.name || 'Herramienta'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Contenido de la herramienta */}
        <View style={styles.activeToolContent}>
          {renderActiveTool()}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header con gradiente */}
      <LinearGradient
        colors={[theme.colors.primary[600], theme.colors.primary[400]]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Herramientas IA</Text>
          <Text style={styles.headerSubtitle}>
            Potencia tu creatividad con inteligencia artificial
          </Text>
        </View>
      </LinearGradient>

      {/* Filtros de categoría */}
      <CategoryFilter />

      {/* Grid de herramientas */}
      <ScrollView
        style={styles.toolsContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.toolsContent}
      >
        <View style={styles.toolsGrid}>
          {filteredTools.map((tool, index) => (
            <ToolCard key={tool.id} tool={tool} index={index} />
          ))}
        </View>

        {/* Información adicional */}
        <View style={styles.infoSection}>
          <Card style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="information-circle" size={24} color={theme.colors.info[500]} />
              <Text style={styles.infoTitle}>¿Necesitas ayuda?</Text>
            </View>
            <Text style={styles.infoText}>
              Explora nuestras herramientas de IA para mejorar tu productividad. 
              Las funciones premium están disponibles con una suscripción Pro.
            </Text>
          </Card>
        </View>
      </ScrollView>

      {/* Modal de actualización */}
      <CustomModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="Actualizar a Pro"
        size="lg"
      >
        <View style={styles.upgradeContent}>
          <View style={styles.upgradeIcon}>
            <Ionicons name="diamond" size={48} color={theme.colors.warning[500]} />
          </View>
          
          <Text style={styles.upgradeTitle}>Desbloquea todo el potencial</Text>
          
          <View style={styles.upgradeFeatures}>
            <View style={styles.upgradeFeature}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success[500]} />
              <Text style={styles.upgradeFeatureText}>Todas las herramientas IA</Text>
            </View>
            <View style={styles.upgradeFeature}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success[500]} />
              <Text style={styles.upgradeFeatureText}>Generación ilimitada</Text>
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
              // Implementar navegación a suscripción
            }}
            icon={<Ionicons name="diamond" size={20} color="#ffffff" />}
            style={styles.upgradeButton}
          />
        </View>
      </CustomModal>
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
    paddingHorizontal: theme.spacing.lg,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight as any,
    color: '#ffffff',
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    fontSize: theme.typography.body.fontSize,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  categorySection: {
    paddingVertical: theme.spacing.md,
  },
  categoryContainer: {
    paddingHorizontal: theme.spacing.lg,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface.secondary,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  categoryButtonActive: {
    backgroundColor: theme.colors.primary[500],
  },
  categoryButtonText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: '#ffffff',
  },
  toolsContainer: {
    flex: 1,
  },
  toolsContent: {
    padding: theme.spacing.lg,
  },
  toolsGrid: {
    gap: theme.spacing.md,
  },
  toolCardWrapper: {
    marginBottom: theme.spacing.md,
  },
  toolCard: {
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  toolCardDisabled: {
    opacity: 0.7,
  },
  toolGradient: {
    padding: theme.spacing.lg,
    minHeight: 120,
  },
  toolHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  toolIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolBadges: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  badge: {
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
  },
  newBadge: {
    backgroundColor: theme.colors.success[500],
  },
  premiumBadge: {
    backgroundColor: theme.colors.warning[500],
    paddingHorizontal: theme.spacing.xs,
  },
  comingSoonBadge: {
    backgroundColor: theme.colors.info[500],
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  toolContent: {
    flex: 1,
  },
  toolName: {
    fontSize: theme.typography.h4.fontSize,
    fontWeight: theme.typography.h4.fontWeight as any,
    color: '#ffffff',
    marginBottom: theme.spacing.xs,
  },
  toolDescription: {
    fontSize: theme.typography.body.fontSize,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
  },
  toolFooter: {
    alignItems: 'flex-end',
    marginTop: theme.spacing.md,
  },
  activeToolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  activeToolTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight as any,
    color: theme.colors.text.primary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: theme.spacing.md,
  },
  headerSpacer: {
    width: 44, // Mismo ancho que el botón de back
  },
  activeToolContent: {
    flex: 1,
  },
  comingSoonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  comingSoonTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight as any,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  comingSoonText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  infoSection: {
    marginTop: theme.spacing.xl,
  },
  infoCard: {
    backgroundColor: `${theme.colors.info[500]}10`,
    borderWidth: 1,
    borderColor: theme.colors.info[500],
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  infoTitle: {
    fontSize: theme.typography.h4.fontSize,
    fontWeight: theme.typography.h4.fontWeight as any,
    color: theme.colors.text.primary,
    marginLeft: theme.spacing.sm,
  },
  infoText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
    lineHeight: 22,
  },
  upgradeContent: {
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  upgradeIcon: {
    marginBottom: theme.spacing.lg,
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
    marginBottom: theme.spacing.md,
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