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
import { Video, ResizeMode } from 'expo-av';

import { theme } from '../styles/theme';
import { Button } from './base';
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
  gradient: readonly [string, string];
}

// ========================================
// CONSTANTES
// ========================================
const VIDEO_STYLES: VideoStyle[] = [
  { id: 'cinematic', name: 'Cinematográfico', gradient: ['#667eea', '#764ba2'] },
  { id: 'documentary', name: 'Documental', gradient: ['#f093fb', '#f5576c'] },
  { id: 'animation', name: 'Animación', gradient: ['#4facfe', '#00f2fe'] },
  { id: 'abstract', name: 'Abstracto', gradient: ['#43e97b', '#38f9d7'] },
];

const DURATION_OPTIONS = [5, 10, 15, 30];
const FORMAT_OPTIONS = [
    { value: '16:9', label: 'Horizontal' },
    { value: '9:16', label: 'Vertical' },
    { value: '1:1', label: 'Cuadrado' }
];
const MAX_PROMPT_LENGTH = 300;
const MIN_PROMPT_LENGTH = 10;

// ========================================
// COMPONENTE PRINCIPAL
// ========================================
export const VideoGenerator: React.FC<VideoGeneratorProps> = ({ onVideoGenerated }) => {
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('cinematic');
  const [selectedDuration, setSelectedDuration] = useState(10);
  const [selectedFormat, setSelectedFormat] = useState('16:9');
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { userProfile } = useAuth();
  const promptProgress = useSharedValue(0);
  const premiumPulse = useSharedValue(1);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (userProfile?.planInfo?.plan === 'free') {
      premiumPulse.value = withRepeat(withSequence(withSpring(1.05), withSpring(1)), -1, true);
    }
  }, [userProfile?.planInfo?.plan, premiumPulse]);

  const promptProgressAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(promptProgress.value, [0, 1], [theme.colors.gray[300], theme.colors.success]),
    width: `${promptProgress.value * 100}%`,
  }));

  const premiumAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: premiumPulse.value }],
  }));

  const handlePromptChange = useCallback((text: string) => {
    setPrompt(text);
    promptProgress.value = withSpring(Math.min(text.length / MAX_PROMPT_LENGTH, 1));
  }, [promptProgress]);

  const handleGenerateVideo = async () => {
    if (prompt.trim().length < MIN_PROMPT_LENGTH) {
        Alert.alert('Prompt inválido', `El prompt debe tener al menos ${MIN_PROMPT_LENGTH} caracteres.`);
        return;
    }
    if (userProfile?.planInfo?.plan === 'free') {
        Alert.alert('Función Premium', 'La generación de videos es una función Pro. Actualiza tu plan para continuar.');
        return;
    }

    setIsGenerating(true);
    try {
      const result = await cloudFunctions.generateVideo({
        prompt: prompt.trim(),
        style: selectedStyle,
        duration: selectedDuration,
        aspectRatio: selectedFormat,
      });

      const newVideo: GeneratedVideo = {
        id: result.videoId,
        videoId: result.videoId,
        ...result,
        timestamp: new Date(),
      };
      setGeneratedVideos(prev => [newVideo, ...prev]);

      if (result.status === 'processing') {
        startVideoPolling(result.videoId);
      } else if (result.status === 'completed' && onVideoGenerated && result.videoUrl) {
        onVideoGenerated(result.videoUrl);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo generar el video.');
    } finally {
      setIsGenerating(false);
    }
  };

  const startVideoPolling = (videoId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const statusResult = await cloudFunctions.checkVideoStatus(videoId);
        setGeneratedVideos(prev =>
          prev.map(v => (v.videoId === videoId ? { ...v, ...statusResult } : v))
        );

        if (statusResult.status === 'completed' || statusResult.status === 'failed') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          if (statusResult.status === 'completed' && onVideoGenerated && statusResult.videoUrl) {
            onVideoGenerated(statusResult.videoUrl);
          }
        }
      } catch (error) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      }
    }, 5000);
  };

  const shareVideo = async (videoUrl: string) => {
    await Share.share({ url: videoUrl, message: `Video generado con NORA AI: ${prompt}` });
  };
  
  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
            <Text style={styles.title}>Generador de Videos</Text>
            <Text style={styles.subtitle}>Crea videos únicos a partir de texto con IA.</Text>
        </View>

        {userProfile?.planInfo?.plan === 'free' && (
            <Animated.View style={[styles.premiumSection, premiumAnimatedStyle]}>
                <LinearGradient colors={[theme.colors.primary[600], theme.colors.primary[800]]} style={styles.premiumCard}>
                    <Ionicons name="diamond" size={32} color="#ffffff" />
                    <Text style={styles.upgradeTitle}>Función Premium</Text>
                    <Text style={styles.premiumDescription}>Actualiza a Pro para desbloquear la generación de videos.</Text>
                    <Button title="Actualizar a Pro" variant="filled" size="lg" onPress={() => Alert.alert('Próximamente', 'La actualización estará disponible pronto')} />
                </LinearGradient>
            </Animated.View>
        )}

        <View style={[styles.formSection, { opacity: userProfile?.planInfo?.plan === 'free' ? 0.5 : 1 }]}>
            {/* Prompt, Estilos, Duración y Formato aquí */}
            <Button
                title={isGenerating ? 'Generando...' : 'Generar Video'}
                onPress={handleGenerateVideo}
                loading={isGenerating}
                disabled={isGenerating || prompt.trim().length < MIN_PROMPT_LENGTH || userProfile?.planInfo?.plan === 'free'}
                variant="filled"
                size="lg"
                fullWidth
            />
        </View>

        {generatedVideos.length > 0 && (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Videos Generados</Text>
                {generatedVideos.map(video => (
                    <View key={video.id} style={styles.videoContainer}>
                        {video.status === 'completed' && video.url ? (
                            <Video source={{ uri: video.url }} style={styles.generatedVideo} useNativeControls resizeMode={ResizeMode.COVER} />
                        ) : (
                            <View style={styles.videoPlaceholder}>
                                <Ionicons name={video.status === 'processing' ? "time-outline" : "alert-circle-outline"} size={32} color={theme.colors.text.secondary} />
                                <Text style={styles.placeholderText}>{video.status === 'processing' ? 'Procesando...' : 'Error'}</Text>
                            </View>
                        )}
                        <Text style={styles.videoPrompt}>{video.prompt}</Text>
                        {video.url && <Button title="Compartir" onPress={() => shareVideo(video.url!)} variant="ghost" size="sm" />}
                    </View>
                ))}
            </View>
        )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background.primary },
    header: { padding: theme.spacing[5], alignItems: 'center' },
    title: { fontSize: theme.typography.fontSize['2xl'], fontWeight: theme.typography.fontWeight.bold, color: theme.colors.text.primary, marginBottom: theme.spacing[2], textAlign: 'center' },
    subtitle: { fontSize: theme.typography.fontSize.base, color: theme.colors.text.secondary, textAlign: 'center' },
    premiumSection: { paddingHorizontal: theme.spacing[4], marginBottom: theme.spacing[6] },
    premiumCard: { borderRadius: theme.borderRadius.lg, padding: theme.spacing[6], alignItems: 'center' },
    upgradeTitle: { fontSize: theme.typography.fontSize.xl, fontWeight: theme.typography.fontWeight.bold, color: '#ffffff', marginTop: theme.spacing[3], marginBottom: theme.spacing[2] },
    premiumDescription: { fontSize: theme.typography.fontSize.base, color: 'rgba(255, 255, 255, 0.9)', textAlign: 'center', marginBottom: theme.spacing[4] },
    formSection: { paddingHorizontal: theme.spacing[4], gap: theme.spacing[6] },
    section: { marginTop: theme.spacing[6], paddingHorizontal: theme.spacing[4] },
    sectionTitle: { fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.text.primary, marginBottom: theme.spacing[3] },
    videoContainer: { marginBottom: theme.spacing[4], backgroundColor: theme.colors.background.secondary, borderRadius: theme.borderRadius.lg, overflow: 'hidden' },
    generatedVideo: { width: '100%', aspectRatio: 16 / 9 },
    videoPlaceholder: { width: '100%', aspectRatio: 16 / 9, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background.tertiary },
    placeholderText: { marginTop: theme.spacing[2], color: theme.colors.text.secondary },
    videoPrompt: { padding: theme.spacing[3], color: theme.colors.text.primary },
    promptContainer: { position: 'relative' },
    promptInput: { backgroundColor: theme.colors.background.secondary, borderRadius: theme.borderRadius.lg, padding: theme.spacing[4], fontSize: theme.typography.fontSize.base, color: theme.colors.text.primary, minHeight: 100, borderWidth: 1, borderColor: theme.colors.border.primary },
    promptProgress: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: theme.colors.background.tertiary, borderBottomLeftRadius: theme.borderRadius.lg, borderBottomRightRadius: theme.borderRadius.lg },
    promptProgressFill: { height: '100%', borderRadius: theme.borderRadius.lg },
});

export default VideoGenerator;