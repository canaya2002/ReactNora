// src/components/VideoGenerator.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  Dimensions,
  Share,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
  withSequence,
  withRepeat
} from 'react-native-reanimated';
import { Video } from 'expo-av';

import { theme } from '../styles/theme';
import { Button, Card } from './base';
import { useAuth } from '../contexts/AuthContext';
import { cloudFunctions } from '../lib/firebase';
import { GeneratedVideo } from '../lib/types';

const { width: screenWidth } = Dimensions.get('window');

// ========================================
// INTERFACES Y TIPOS
// ========================================
interface VideoGeneratorProps {
  onVideoGenerated?: (videoUrl: string) => void;
}

interface VideoStyle {
  id: string;
  name: string;
  description: string;
  gradient: string[];
  example: string;
}

interface DurationOption {
  value: number;
  label: string;
  description: string;
}

interface FormatOption {
  value: string;
  label: string;
  aspectRatio: string;
}

// ========================================
// CONSTANTES
// ========================================
const VIDEO_STYLES: VideoStyle[] = [
  {
    id: 'cinematic',
    name: 'Cinematográfico',
    description: 'Estilo de película profesional',
    gradient: ['#667eea', '#764ba2'],
    example: 'Toma dramática con iluminación profesional'
  },
  {
    id: 'documentary',
    name: 'Documental',
    description: 'Estilo de documental realista',
    gradient: ['#f093fb', '#f5576c'],
    example: 'Narración educativa con imágenes reales'
  },
  {
    id: 'animation',
    name: 'Animación',
    description: 'Estilo de animación 3D',
    gradient: ['#4facfe', '#00f2fe'],
    example: 'Personajes animados en 3D'
  },
  {
    id: 'abstract',
    name: 'Abstracto',
    description: 'Arte visual abstracto en movimiento',
    gradient: ['#43e97b', '#38f9d7'],
    example: 'Formas y colores en movimiento'
  }
];

const DURATION_OPTIONS: DurationOption[] = [
  { value: 5, label: '5 segundos', description: 'Video corto' },
  { value: 10, label: '10 segundos', description: 'Duración estándar' },
  { value: 15, label: '15 segundos', description: 'Video extendido' },
  { value: 30, label: '30 segundos', description: 'Video largo (Premium)' }
];

const FORMAT_OPTIONS: FormatOption[] = [
  { value: '16:9', label: 'Horizontal', aspectRatio: '16:9' },
  { value: '9:16', label: 'Vertical', aspectRatio: '9:16' },
  { value: '1:1', label: 'Cuadrado', aspectRatio: '1:1' }
];

const MAX_PROMPT_LENGTH = 300;
const MIN_PROMPT_LENGTH = 10;

// ========================================
// COMPONENTE PRINCIPAL
// ========================================
export const VideoGenerator: React.FC<VideoGeneratorProps> = ({ onVideoGenerated }) => {
  // Estados
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('cinematic');
  const [selectedDuration, setSelectedDuration] = useState(10);
  const [selectedFormat, setSelectedFormat] = useState('16:9');
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Refs
  const promptInputRef = useRef<TextInput>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Hooks
  const { userProfile } = useAuth();

  // Valores animados
  const promptProgress = useSharedValue(0);
  const generateButtonScale = useSharedValue(1);
  const premiumPulse = useSharedValue(1);

  // ========================================
  // EFECTOS
  // ========================================
  useEffect(() => {
    // Cleanup del polling cuando se desmonte el componente
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Animación para funciones premium
    if (userProfile?.planInfo?.plan === 'free') {
      premiumPulse.value = withRepeat(
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
  // ESTILOS ANIMADOS
  // ========================================
  const promptProgressAnimatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      promptProgress.value,
      [0, 0.5, 1],
      [theme.colors.gray[300], theme.colors.warning, theme.colors.success]
    );

    return {
      backgroundColor,
      width: `${promptProgress.value * 100}%`,
    };
  });

  const generateButtonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: generateButtonScale.value }],
    };
  });

  const premiumAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: premiumPulse.value }],
    };
  });

  // ========================================
  // FUNCIONES DE VALIDACIÓN
  // ========================================
  const validatePrompt = (text: string): boolean => {
    return text.trim().length >= MIN_PROMPT_LENGTH && text.trim().length <= MAX_PROMPT_LENGTH;
  };

  const canGenerate = (): { allowed: boolean; reason?: string } => {
    if (!userProfile) {
      return { allowed: false, reason: 'Perfil de usuario no disponible' };
    }

    // Verificar límites para usuarios gratuitos
    if (userProfile.planInfo.plan === 'free') {
      return { 
        allowed: false, 
        reason: 'La generación de videos es una función premium. Actualiza para desbloquear esta función.' 
      };
    }

    // Verificar límites para usuarios premium
    if (userProfile.planInfo.plan === 'pro') {
      // CORREGIDO: Acceso correcto a la estructura de objetos
      const used = userProfile.usage.videoGeneration?.daily?.used || 0;
      const limit = userProfile.usage.videoGeneration?.daily?.limit || 5;

      if (used >= limit) {
        return { allowed: false, reason: 'Has alcanzado tu límite diario de videos' };
      }
    }

    return { allowed: true };
  };

  // ========================================
  // FUNCIONES AUXILIARES
  // ========================================
  const executeGeneration = async (operation: () => Promise<void>) => {
    try {
      await operation();
    } catch (error) {
      console.error('Generation operation error:', error);
    }
  };

  // ========================================
  // MANEJADORES DE EVENTOS
  // ========================================
  const handlePromptChange = useCallback((text: string) => {
    setPrompt(text);
    promptProgress.value = withSpring(Math.min(text.length / MAX_PROMPT_LENGTH, 1));
  }, []);

  const handleStyleSelect = useCallback((styleId: string) => {
    setSelectedStyle(styleId);
  }, []);

  const handleDurationSelect = useCallback((duration: number) => {
    if (duration > 15 && userProfile?.planInfo?.plan === 'free') {
      Alert.alert(
        'Función Premium',
        'Los videos de más de 15 segundos están disponibles solo para usuarios Pro. ¿Te gustaría actualizar?'
      );
      return;
    }
    setSelectedDuration(duration);
  }, [userProfile?.planInfo?.plan]);

  // ========================================
  // GENERACIÓN DE VIDEOS
  // ========================================
  const handleGenerateVideo = async () => {
    const validation = canGenerate();
    if (!validation.allowed) {
      Alert.alert('No disponible', validation.reason);
      return;
    }

    await executeGeneration(async () => {
      setIsGenerating(true);

      try {
        const selectedDurationData = DURATION_OPTIONS.find(d => d.value === selectedDuration);

        const input = {
          prompt: prompt.trim(),
          style: selectedStyle,
          aspectRatio: selectedFormat,
          duration: selectedDurationData?.value || 10
        };

        const result = await cloudFunctions.generateVideo(input);

        const newVideo: GeneratedVideo = {
          id: Date.now().toString(),
          videoId: result.videoId,
          url: result.videoUrl,
          thumbnailUrl: result.thumbnailUrl,
          prompt: result.prompt,
          style: selectedStyle,
          status: result.status,
          estimatedTime: result.estimatedTime,
          timestamp: new Date(),
          duration: selectedDuration
        };

        setGeneratedVideos(prev => [newVideo, ...prev]);

        // Si el video está en procesamiento, iniciar polling
        if (result.status === 'processing') {
          startVideoPolling(newVideo.videoId);
        } else if (result.status === 'completed' && onVideoGenerated && result.videoUrl) {
          onVideoGenerated(result.videoUrl);
        }

      } catch (error: any) {
        console.error('Error generating video:', error);
        Alert.alert('Error', error.message || 'No se pudo generar el video');
      } finally {
        setIsGenerating(false);
      }
    });
  };

  // ========================================
  // POLLING DE ESTADO
  // ========================================
  const startVideoPolling = (videoId: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        // CORREGIDO: Método existe en CloudFunctions
        const status = await cloudFunctions.getVideoStatus(videoId);

        setGeneratedVideos(prev =>
          prev.map(video =>
            video.videoId === videoId
              ? { ...video, ...status }
              : video
          )
        );

        // Si el video está completado o falló, detener el polling
        if (status.status === 'completed' || status.status === 'failed') {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }

          if (status.status === 'completed' && onVideoGenerated && status.videoUrl) {
            onVideoGenerated(status.videoUrl);
          }
        }

      } catch (error) {
        console.error('Error polling video status:', error);
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      }
    }, 5000); // Polling cada 5 segundos
  };

  // ========================================
  // FUNCIONES DE COMPARTIR
  // ========================================
  const shareVideo = async (videoUrl: string) => {
    try {
      if (Platform.OS === 'web') {
        Alert.alert('URL copiada', 'La URL del video se copió al portapapeles');
        return;
      }

      await Share.share({
        url: videoUrl,
        message: `Video generado con NORA AI: ${videoUrl}`
      });
    } catch (error) {
      console.error('Error sharing video:', error);
      Alert.alert('Error', 'No se pudo compartir el video');
    }
  };

  // ========================================
  // COMPONENTES DE RENDERIZADO
  // ========================================
  const renderStyleOption = (style: VideoStyle) => (
    <TouchableOpacity
      key={style.id}
      style={[
        styles.styleOption,
        selectedStyle === style.id && styles.styleOptionSelected
      ]}
      onPress={() => handleStyleSelect(style.id)}
    >
      <LinearGradient
        colors={style.gradient}
        style={styles.styleGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.styleName}>{style.name}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderDurationOption = (option: DurationOption) => (
    <TouchableOpacity
      key={option.value}
      style={[
        styles.durationOption,
        selectedDuration === option.value && styles.durationSelected,
        option.value > 15 && userProfile?.planInfo?.plan === 'free' && styles.durationPremium
      ]}
      onPress={() => handleDurationSelect(option.value)}
    >
      <Text style={[
        styles.durationText,
        selectedDuration === option.value && styles.durationTextSelected
      ]}>
        {option.label}
      </Text>
      {option.value > 15 && userProfile?.planInfo?.plan === 'free' && (
        <View style={styles.premiumBadge}>
          <Ionicons name="diamond" size={12} color="#ffffff" />
        </View>
      )}
    </TouchableOpacity>
  );

  const renderFormatOption = (option: FormatOption) => (
    <TouchableOpacity
      key={option.value}
      style={[
        styles.formatOption,
        selectedFormat === option.value && styles.formatSelected
      ]}
      onPress={() => setSelectedFormat(option.value)}
    >
      <Text style={[
        styles.formatText,
        selectedFormat === option.value && styles.formatTextSelected
      ]}>
        {option.label}
      </Text>
      <Text style={[
        styles.formatSubtext,
        selectedFormat === option.value && styles.formatSubtextSelected
      ]}>
        {option.aspectRatio}
      </Text>
    </TouchableOpacity>
  );

  const renderGeneratedVideo = (video: GeneratedVideo, index: number) => (
    <View key={video.id} style={styles.videoContainer}>
      {video.status === 'processing' ? (
        <View style={styles.videoPlaceholder}>
          <View style={styles.processingIndicator}>
            <Ionicons name="time" size={32} color={theme.colors.primary[500]} />
            <Text style={styles.processingText}>Procesando...</Text>
            {video.estimatedTime && (
              <Text style={styles.estimatedTime}>
                Tiempo estimado: {video.estimatedTime}s
              </Text>
            )}
          </View>
        </View>
      ) : video.status === 'completed' && video.url ? (
        <Video
          source={{ uri: video.url }}
          style={styles.generatedVideo}
          useNativeControls
          resizeMode="cover"
          shouldPlay={false}
        />
      ) : (
        <View style={styles.videoPlaceholder}>
          <Ionicons name="alert-circle" size={32} color={theme.colors.error} />
          <Text style={styles.errorText}>Error al generar video</Text>
        </View>
      )}
      
      <View style={styles.videoInfo}>
        <Text style={styles.videoPrompt} numberOfLines={2}>
          {video.prompt}
        </Text>
        <View style={styles.videoMeta}>
          <Text style={styles.videoTimestamp}>
            {video.timestamp.toLocaleDateString('es-ES', {
              day: '2-digit',
              month: '2-digit',
              year: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
          {video.url && (
            <TouchableOpacity
              style={styles.shareButton}
              onPress={() => shareVideo(video.url!)}
            >
              <Ionicons name="share-outline" size={16} color={theme.colors.primary[500]} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  // ========================================
  // RENDERIZADO PRINCIPAL
  // ========================================
  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          {/* CORREGIDO: fontWeight usando valor correcto del theme */}
          <Text style={styles.title}>Generar Video</Text>
          <Text style={styles.subtitle}>
            Crea videos únicos con inteligencia artificial
          </Text>
        </View>

        {/* Función Premium para usuarios gratuitos */}
        {userProfile?.planInfo?.plan === 'free' && (
          <Animated.View style={[styles.premiumSection, premiumAnimatedStyle]}>
            <LinearGradient
              colors={[theme.colors.primary[600], theme.colors.primary[800]]}
              style={styles.premiumCard}
            >
              <View style={styles.premiumContent}>
                <Ionicons name="diamond" size={32} color="#ffffff" />
                {/* CORREGIDO: fontWeight usando valor correcto del theme */}
                <Text style={styles.upgradeTitle}>Función Premium</Text>
                <Text style={styles.premiumDescription}>
                  La generación de videos está disponible solo para usuarios Pro
                </Text>
                <Button
                  title="Actualizar a Pro"
                  variant="filled"
                  size="lg"
                  style={styles.premiumButton}
                  onPress={() => Alert.alert('Próximamente', 'La actualización estará disponible pronto')}
                />
              </View>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Formulario de generación */}
        <View style={[styles.formSection, { opacity: userProfile?.planInfo?.plan === 'free' ? 0.5 : 1 }]}>
          {/* Prompt Input */}
          <View style={styles.section}>
            {/* CORREGIDO: fontWeight usando valor correcto del theme */}
            <Text style={styles.selectorTitle}>Descripción</Text>
            <View style={styles.promptContainer}>
              <TextInput
                ref={promptInputRef}
                style={styles.promptInput}
                placeholder="Describe el video que quieres generar..."
                placeholderTextColor={theme.colors.text.tertiary}
                value={prompt}
                onChangeText={handlePromptChange}
                multiline
                maxLength={MAX_PROMPT_LENGTH}
                textAlignVertical="top"
                editable={userProfile?.planInfo?.plan !== 'free'}
              />
              
              <View style={styles.promptProgress}>
                <Animated.View style={[styles.promptProgressFill, promptProgressAnimatedStyle]} />
              </View>
            </View>
            
            <Text style={styles.promptCounter}>
              {prompt.length}/{MAX_PROMPT_LENGTH}
            </Text>
          </View>

          {/* Style Selection */}
          <View style={styles.section}>
            {/* CORREGIDO: fontWeight usando valor correcto del theme */}
            <Text style={styles.selectorTitle}>Estilo de Video</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.stylesContainer}
            >
              {VIDEO_STYLES.map((style) => renderStyleOption(style))}
            </ScrollView>
          </View>

          {/* Duration Selection */}
          <View style={styles.section}>
            {/* CORREGIDO: fontWeight usando valor correcto del theme */}
            <Text style={styles.selectorTitle}>Duración</Text>
            <View style={styles.durationsContainer}>
              {DURATION_OPTIONS.map((option) => renderDurationOption(option))}
            </View>
          </View>

          {/* Format Selection */}
          <View style={styles.section}>
            {/* CORREGIDO: fontWeight usando valor correcto del theme */}
            <Text style={styles.selectorTitle}>Formato</Text>
            <View style={styles.formatsContainer}>
              {FORMAT_OPTIONS.map((option) => renderFormatOption(option))}
            </View>
          </View>

          {/* Generate Button */}
          <Animated.View style={[styles.section, generateButtonAnimatedStyle]}>
            <Button
              title={isGenerating ? 'Generando...' : 'Generar Video'}
              onPress={handleGenerateVideo}
              loading={isGenerating}
              disabled={!validatePrompt(prompt) || isGenerating || userProfile?.planInfo?.plan === 'free'}
              variant="filled"
              size="lg"
              fullWidth
            />
          </Animated.View>
        </View>

        {/* Generated Videos */}
        {generatedVideos.length > 0 && (
          <View style={styles.section}>
            {/* CORREGIDO: fontWeight usando valor correcto del theme */}
            <Text style={styles.videosTitle}>
              Videos Generados ({generatedVideos.length})
            </Text>
            <View style={styles.videosGrid}>
              {generatedVideos.map((video, index) => renderGeneratedVideo(video, index))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// ========================================
// ESTILOS - CORREGIDOS
// ========================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: theme.spacing[5],
    paddingBottom: theme.spacing[3],
  },
  // CORREGIDO: fontWeight usando valor correcto
  title: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing[2],
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  premiumSection: {
    paddingHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[6],
  },
  premiumCard: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[6],
  },
  premiumContent: {
    alignItems: 'center',
  },
  // CORREGIDO: fontWeight usando valor correcto
  upgradeTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: '#ffffff',
    marginTop: theme.spacing[3],
    marginBottom: theme.spacing[2],
  },
  premiumDescription: {
    fontSize: theme.typography.fontSize.base,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: theme.spacing[4],
  },
  premiumButton: {
    backgroundColor: '#ffffff',
    borderWidth: 0,
  },
  formSection: {
    paddingHorizontal: theme.spacing[4],
  },
  section: {
    marginBottom: theme.spacing[6],
  },
  // CORREGIDO: fontWeight usando valor correcto
  selectorTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing[3],
  },
  promptContainer: {
    position: 'relative',
  },
  promptInput: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.primary,
    minHeight: 100,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  promptProgress: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: theme.colors.background.tertiary,
    borderBottomLeftRadius: theme.borderRadius.lg,
    borderBottomRightRadius: theme.borderRadius.lg,
  },
  promptProgressFill: {
    height: '100%',
    borderBottomLeftRadius: theme.borderRadius.lg,
    borderBottomRightRadius: theme.borderRadius.lg,
  },
  promptCounter: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
    textAlign: 'right',
    marginTop: theme.spacing[1],
  },
  stylesContainer: {
    paddingVertical: theme.spacing[2],
  },
  styleOption: {
    marginRight: theme.spacing[3],
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  styleOptionSelected: {
    transform: [{ scale: 1.05 }],
  },
  styleGradient: {
    width: 120,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[3],
  },
  styleName: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: '#ffffff',
    textAlign: 'center',
  },
  durationsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  durationOption: {
    width: '48%',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing[3],
    marginBottom: theme.spacing[2],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    position: 'relative',
  },
  durationSelected: {
    borderColor: theme.colors.primary[500],
    backgroundColor: theme.colors.primary[500] + '20',
  },
  durationPremium: {
    opacity: 0.6,
  },
  durationText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  durationTextSelected: {
    color: theme.colors.primary[500],
  },
  premiumBadge: {
    position: 'absolute',
    top: theme.spacing[1],
    right: theme.spacing[1],
    backgroundColor: theme.colors.primary[500],
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing[1],
  },
  formatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  formatOption: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing[3],
    marginHorizontal: theme.spacing[1],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  formatSelected: {
    borderColor: theme.colors.primary[500],
    backgroundColor: theme.colors.primary[500] + '20',
  },
  formatText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  formatTextSelected: {
    color: theme.colors.primary[500],
  },
  formatSubtext: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing[1],
  },
  formatSubtextSelected: {
    color: theme.colors.primary[500],
  },
  // CORREGIDO: fontWeight usando valor correcto
  videosTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing[4],
  },
  videosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  videoContainer: {
    width: '48%',
    marginBottom: theme.spacing[4],
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.background.secondary,
  },
  generatedVideo: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  videoPlaceholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.tertiary,
  },
  processingIndicator: {
    alignItems: 'center',
  },
  processingText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing[2],
  },
  estimatedTime: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing[1],
  },
  errorText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error,
    marginTop: theme.spacing[2],
  },
  videoInfo: {
    padding: theme.spacing[3],
  },
  videoPrompt: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.primary,
    lineHeight: 18,
    marginBottom: theme.spacing[2],
  },
  videoMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  videoTimestamp: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
  },
  shareButton: {
    padding: theme.spacing[1],
  },
});

export default VideoGenerator;