// src/components/VideoGenerator.tsx - GENERADOR DE VIDEOS (CORREGIDO)
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  FadeInDown, 
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming 
} from 'react-native-reanimated';
import { Video, ResizeMode } from 'expo-av';
import * as Sharing from 'expo-sharing';

// Hooks y contextos
import { useAuth } from '../contexts/AuthContext';
import { cloudFunctions } from '../lib/firebase';
import { useAsyncOperation } from '../hooks';

// Componentes
import { Button, Card, IconButton, Loading } from './base';

// Estilos y tipos
import { theme } from '../styles/theme';
import { VIDEO_STYLES, GenerateVideoInput, GenerateVideoOutput } from '../lib/types';

// ========================================
// INTERFACES
// ========================================
interface VideoGeneratorProps {
  onVideoGenerated?: (videoUrl: string) => void;
  initialPrompt?: string;
}

interface GeneratedVideo {
  id: string;
  videoId: string;
  url?: string;
  thumbnailUrl?: string;
  prompt: string;
  style: string;
  status: 'processing' | 'completed' | 'failed';
  estimatedTime?: number;
  timestamp: Date;
  duration?: number;
}

interface DurationOption {
  value: number;
  label: string;
  premium: boolean;
}

interface AspectRatioOption {
  id: string;
  name: string;
  ratio: string;
  premium: boolean;
}

// ========================================
// CONSTANTES
// ========================================
const { width } = Dimensions.get('window');

const DURATION_OPTIONS: DurationOption[] = [
  { value: 5, label: '5 segundos', premium: false },
  { value: 10, label: '10 segundos', premium: false },
  { value: 15, label: '15 segundos', premium: true },
  { value: 30, label: '30 segundos', premium: true }
];

const ASPECT_RATIOS: AspectRatioOption[] = [
  { id: '16:9', name: 'Horizontal', ratio: '16:9', premium: false },
  { id: '9:16', name: 'Vertical', ratio: '9:16', premium: false },
  { id: '1:1', name: 'Cuadrado', ratio: '1:1', premium: true }
];

// ========================================
// COMPONENTE PRINCIPAL
// ========================================
export default function VideoGenerator({ 
  onVideoGenerated, 
  initialPrompt = '' 
}: VideoGeneratorProps) {
  const { user, userProfile } = useAuth();
  
  // Estados
  const [prompt, setPrompt] = useState(initialPrompt);
  const [selectedStyle, setSelectedStyle] = useState<string>(VIDEO_STYLES[0].id);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>('16:9');
  const [selectedDuration, setSelectedDuration] = useState<number>(10);
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Hooks para operaciones async
  const { execute: executeGeneration, loading: isExecuting } = useAsyncOperation();
  const { execute: executeShare, loading: isSharing } = useAsyncOperation();

  // Referencias
  const promptInputRef = useRef<TextInput>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ========================================
  // EFECTOS
  // ========================================
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // ========================================
  // VALIDACIONES
  // ========================================
  const canGenerate = (): { allowed: boolean; reason?: string } => {
    if (!user || !userProfile) {
      return { allowed: false, reason: 'Debes iniciar sesión' };
    }

    if (!prompt.trim()) {
      return { allowed: false, reason: 'Ingresa una descripción del video' };
    }

    // Verificar si los usuarios gratuitos pueden generar videos
    if (userProfile.planInfo.plan === 'free') {
      return { 
        allowed: false, 
        reason: 'La generación de videos requiere una cuenta Pro. Actualiza para desbloquear esta función.' 
      };
    }

    // Verificar límites para usuarios premium
    if (userProfile.planInfo.plan === 'pro') {
      const used = userProfile.usage.videoGeneration.daily.used || 0;
      const limit = userProfile.usage.videoGeneration.daily.limit || 5;
      
      if (used >= limit) {
        return { allowed: false, reason: 'Has alcanzado tu límite diario de videos' };
      }
    }

    return { allowed: true };
  };

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
        
        const input: GenerateVideoInput = {
          prompt: prompt.trim(),
          style: selectedStyle,
          aspectRatio: selectedAspectRatio,
          duration: selectedDurationData?.value || 10
        };

        const result: GenerateVideoOutput = await cloudFunctions.generateVideo(input);

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
        const status = await cloudFunctions.getVideoStatus(videoId);
        
        setGeneratedVideos(prev => 
          prev.map(video => 
            video.videoId === videoId 
              ? {
                  ...video,
                  status: status.status,
                  url: status.videoUrl || video.url,
                  thumbnailUrl: status.thumbnailUrl || video.thumbnailUrl
                }
              : video
          )
        );

        // Detener polling si el video está completo o falló
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
      }
    }, 5000); // Poll cada 5 segundos
  };

  // ========================================
  // COMPARTIR VIDEO
  // ========================================
  const shareVideo = async (video: GeneratedVideo) => {
    if (!video.url) {
      Alert.alert('Video no disponible', 'El video aún se está procesando');
      return;
    }

    await executeShare(async () => {
      try {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(video.url!, {
            mimeType: 'video/mp4',
            dialogTitle: 'Compartir video generado'
          });
        } else {
          Alert.alert('Compartir no disponible', 'No se puede compartir en este dispositivo');
        }
      } catch (error: any) {
        console.error('Error sharing video:', error);
        if (error.message !== 'User cancelled') {
          Alert.alert('Error', 'No se pudo compartir el video');
        }
      }
    });
  };

  // ========================================
  // COMPONENTES DE RENDERIZADO
  // ========================================
  const StyleSelector = () => (
    <View style={styles.selectorSection}>
      <Text style={styles.selectorTitle}>Estilo de Video</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.selectorContainer}
      >
        {VIDEO_STYLES.map((style, index) => (
          <Animated.View key={style.id} entering={FadeInDown.delay(index * 50)}>
            <TouchableOpacity
              style={[
                styles.styleOption,
                selectedStyle === style.id && styles.styleOptionSelected,
                style.premium && userProfile?.planInfo.plan !== 'pro' && styles.styleOptionDisabled
              ]}
              onPress={() => setSelectedStyle(style.id)}
              disabled={style.premium && userProfile?.planInfo.plan !== 'pro'}
            >
              <Text style={[
                styles.styleOptionText,
                selectedStyle === style.id && styles.styleOptionTextSelected,
                style.premium && userProfile?.planInfo.plan !== 'pro' && styles.styleOptionTextDisabled
              ]}>
                {style.name}
              </Text>
              {style.premium && (
                <View style={styles.premiumBadge}>
                  <Ionicons name="diamond" size={12} color={theme.colors.warning[500]} />
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );

  const DurationSelector = () => (
    <View style={styles.selectorSection}>
      <Text style={styles.selectorTitle}>Duración</Text>
      <View style={styles.optionsGrid}>
        {DURATION_OPTIONS.map((duration) => (
          <TouchableOpacity
            key={duration.value}
            style={[
              styles.durationOption,
              selectedDuration === duration.value && styles.durationOptionSelected,
              duration.premium && userProfile?.planInfo.plan !== 'pro' && styles.durationOptionDisabled
            ]}
            onPress={() => setSelectedDuration(duration.value)}
            disabled={duration.premium && userProfile?.planInfo.plan !== 'pro'}
          >
            <Text style={[
              styles.durationText,
              selectedDuration === duration.value && styles.durationTextSelected,
              duration.premium && userProfile?.planInfo.plan !== 'pro' && styles.durationTextDisabled
            ]}>
              {duration.label}
            </Text>
            {duration.premium && (
              <View style={styles.premiumBadgeSmall}>
                <Ionicons name="diamond" size={10} color={theme.colors.warning[500]} />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const AspectRatioSelector = () => (
    <View style={styles.selectorSection}>
      <Text style={styles.selectorTitle}>Formato</Text>
      <View style={styles.optionsGrid}>
        {ASPECT_RATIOS.map((ratio) => (
          <TouchableOpacity
            key={ratio.id}
            style={[
              styles.aspectRatioOption,
              selectedAspectRatio === ratio.id && styles.aspectRatioOptionSelected,
              ratio.premium && userProfile?.planInfo.plan !== 'pro' && styles.aspectRatioOptionDisabled
            ]}
            onPress={() => setSelectedAspectRatio(ratio.id)}
            disabled={ratio.premium && userProfile?.planInfo.plan !== 'pro'}
          >
            <Text style={[
              styles.aspectRatioText,
              selectedAspectRatio === ratio.id && styles.aspectRatioTextSelected,
              ratio.premium && userProfile?.planInfo.plan !== 'pro' && styles.aspectRatioTextDisabled
            ]}>
              {ratio.name}
            </Text>
            <Text style={[
              styles.aspectRatioRatio,
              selectedAspectRatio === ratio.id && styles.aspectRatioRatioSelected,
              ratio.premium && userProfile?.planInfo.plan !== 'pro' && styles.aspectRatioRatioDisabled
            ]}>
              {ratio.ratio}
            </Text>
            {ratio.premium && (
              <View style={styles.premiumBadgeSmall}>
                <Ionicons name="diamond" size={10} color={theme.colors.warning[500]} />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const VideoItem = ({ video, index }: { video: GeneratedVideo; index: number }) => (
    <Animated.View
      entering={ZoomIn.delay(index * 100)}
      style={styles.videoItem}
    >
      <Card style={styles.videoCard} noPadding>
        {video.status === 'completed' && video.url ? (
          <Video
            source={{ uri: video.url }}
            style={styles.videoPlayer}
            shouldPlay={false}
            isLooping
            resizeMode={ResizeMode.CONTAIN}
            useNativeControls
          />
        ) : (
          <View style={styles.videoPlaceholder}>
            {video.status === 'processing' ? (
              <View style={styles.processingContainer}>
                <Loading size="large" color={theme.colors.primary[500]} />
                <Text style={styles.processingText}>Generando video...</Text>
                {video.estimatedTime && (
                  <Text style={styles.estimatedTime}>
                    Tiempo estimado: {Math.ceil(video.estimatedTime / 60)} min
                  </Text>
                )}
              </View>
            ) : video.status === 'failed' ? (
              <View style={styles.failedContainer}>
                <Ionicons name="alert-circle" size={48} color={theme.colors.error[500]} />
                <Text style={styles.failedText}>Error al generar</Text>
              </View>
            ) : (
              <View style={styles.unknownContainer}>
                <Ionicons name="help-circle" size={48} color={theme.colors.text.tertiary} />
                <Text style={styles.unknownText}>Estado desconocido</Text>
              </View>
            )}
          </View>
        )}
        
        {video.status === 'completed' && (
          <View style={styles.videoActions}>
            <IconButton
              icon={<Ionicons name="share" size={20} color="#ffffff" />}
              onPress={() => shareVideo(video)}
              variant="filled"
              color="rgba(0,0,0,0.6)"
              size="sm"
            />
          </View>
        )}
      </Card>
      
      <View style={styles.videoInfo}>
        <Text style={styles.videoPrompt} numberOfLines={2}>
          {video.prompt}
        </Text>
        <View style={styles.videoMeta}>
          <Text style={styles.videoDuration}>
            {video.duration}s • {video.style}
          </Text>
          <Text style={styles.videoTimestamp}>
            {video.timestamp.toLocaleDateString('es-ES')}
          </Text>
        </View>
      </View>
    </Animated.View>
  );

  // ========================================
  // RENDER PRINCIPAL
  // ========================================
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Generar Video</Text>
        <Text style={styles.subtitle}>
          Crea videos únicos con inteligencia artificial
        </Text>
      </View>

      {/* Input de prompt */}
      <Card style={styles.promptCard}>
        <Text style={styles.inputLabel}>Descripción del video</Text>
        <TextInput
          ref={promptInputRef}
          style={styles.promptInput}
          value={prompt}
          onChangeText={setPrompt}
          placeholder="Ej: Un paisaje de montañas al amanecer con nubes moviéndose lentamente..."
          placeholderTextColor={theme.colors.text.tertiary}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </Card>

      {/* Selectores */}
      <StyleSelector />
      <DurationSelector />
      <AspectRatioSelector />

      {/* Aviso para usuarios gratuitos */}
      {userProfile?.planInfo.plan === 'free' && (
        <Card style={styles.upgradeCard}>
          <LinearGradient
            colors={[theme.colors.warning[500], theme.colors.warning[600]]}
            style={styles.upgradeGradient}
          >
            <View style={styles.upgradeContent}>
              <Ionicons name="diamond" size={32} color="#ffffff" />
              <Text style={styles.upgradeTitle}>Función Premium</Text>
              <Text style={styles.upgradeDescription}>
                La generación de videos está disponible solo para usuarios Pro
              </Text>
            </View>
          </LinearGradient>
        </Card>
      )}

      {/* Botón de generar */}
      <Button
        title={isGenerating ? "Generando..." : "Generar Video"}
        onPress={handleGenerateVideo}
        disabled={!prompt.trim() || isLoading || userProfile?.planInfo.plan === 'free'}
        loading={isGenerating}
        icon={<Ionicons name="videocam" size={20} color="#ffffff" />}
        style={styles.generateButton}
      />

      {/* Videos generados */}
      {generatedVideos.length > 0 && (
        <View style={styles.videosSection}>
          <Text style={styles.videosTitle}>
            Videos generados ({generatedVideos.length})
          </Text>
          
          {generatedVideos.map((video, index) => (
            <VideoItem key={video.id} video={video} index={index} />
          ))}
        </View>
      )}

      {/* Loading overlay */}
      {(isExecuting || isSharing) && (
        <Loading 
          text={isExecuting ? "Generando video..." : "Compartiendo..."} 
          overlay 
        />
      )}
    </ScrollView>
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
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight as any,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
    lineHeight: 22,
  },
  promptCard: {
    margin: theme.spacing.lg,
    marginTop: 0,
  },
  inputLabel: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  promptInput: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.surface.tertiary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  selectorSection: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  selectorTitle: {
    fontSize: theme.typography.h4.fontSize,
    fontWeight: theme.typography.h4.fontWeight as any,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  selectorContainer: {
    paddingRight: theme.spacing.lg,
  },
  styleOption: {
    backgroundColor: theme.colors.surface.secondary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    position: 'relative',
  },
  styleOptionSelected: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500],
  },
  styleOptionDisabled: {
    opacity: 0.5,
  },
  styleOptionText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.primary,
    fontWeight: '500',
  },
  styleOptionTextSelected: {
    color: '#ffffff',
  },
  styleOptionTextDisabled: {
    color: theme.colors.text.tertiary,
  },
  premiumBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: theme.colors.surface.primary,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumBadgeSmall: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: theme.colors.surface.primary,
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  durationOption: {
    backgroundColor: theme.colors.surface.secondary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    position: 'relative',
  },
  durationOptionSelected: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500],
  },
  durationOptionDisabled: {
    opacity: 0.5,
  },
  durationText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.primary,
    fontWeight: '500',
  },
  durationTextSelected: {
    color: '#ffffff',
  },
  durationTextDisabled: {
    color: theme.colors.text.tertiary,
  },
  aspectRatioOption: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: theme.colors.surface.secondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    position: 'relative',
  },
  aspectRatioOptionSelected: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500],
  },
  aspectRatioOptionDisabled: {
    opacity: 0.5,
  },
  aspectRatioText: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  aspectRatioTextSelected: {
    color: '#ffffff',
  },
  aspectRatioTextDisabled: {
    color: theme.colors.text.tertiary,
  },
  aspectRatioRatio: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
  },
  aspectRatioRatioSelected: {
    color: 'rgba(255,255,255,0.8)',
  },
  aspectRatioRatioDisabled: {
    color: theme.colors.text.tertiary,
  },
  upgradeCard: {
    margin: theme.spacing.lg,
    padding: 0,
    overflow: 'hidden',
  },
  upgradeGradient: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  upgradeContent: {
    alignItems: 'center',
  },
  upgradeTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight as any,
    color: '#ffffff',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  upgradeDescription: {
    fontSize: theme.typography.body.fontSize,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 22,
  },
  generateButton: {
    margin: theme.spacing.lg,
    marginTop: 0,
  },
  videosSection: {
    margin: theme.spacing.lg,
  },
  videosTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight as any,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
  },
  videoItem: {
    marginBottom: theme.spacing.xl,
  },
  videoCard: {
    position: 'relative',
    overflow: 'hidden',
  },
  videoPlayer: {
    width: '100%',
    height: 200,
  },
  videoPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: theme.colors.surface.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingContainer: {
    alignItems: 'center',
  },
  processingText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.md,
    fontWeight: '500',
  },
  estimatedTime: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  failedContainer: {
    alignItems: 'center',
  },
  failedText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.error[500],
    marginTop: theme.spacing.sm,
    fontWeight: '500',
  },
  unknownContainer: {
    alignItems: 'center',
  },
  unknownText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.sm,
  },
  videoActions: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
  },
  videoInfo: {
    padding: theme.spacing.md,
  },
  videoPrompt: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
    lineHeight: 20,
  },
  videoMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  videoDuration: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
  },
  videoTimestamp: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
  },
});