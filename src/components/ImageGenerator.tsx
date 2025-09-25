// src/components/ImageGenerator.tsx
import React, { useState, useCallback, useRef } from 'react';
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
  interpolateColor
} from 'react-native-reanimated';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

import { theme } from '../styles/theme';
import { Button } from './base';
import { useAuth } from '../contexts/AuthContext';
import { cloudFunctions } from '../lib/firebase';
import { GeneratedImage } from '../lib/types';

const { width: screenWidth } = Dimensions.get('window');

// ========================================
// INTERFACES Y TIPOS
// ========================================
interface ImageGeneratorProps {
  onImageGenerated?: (imageUrl: string) => void;
}

interface ImageStyle {
  id: string;
  name: string;
  gradient: readonly [string, string];
}

// ========================================
// CONSTANTES
// ========================================
const IMAGE_STYLES: ImageStyle[] = [
  { id: 'realistic', name: 'Realista', gradient: ['#667eea', '#764ba2'] },
  { id: 'artistic', name: 'Artístico', gradient: ['#f093fb', '#f5576c'] },
  { id: 'cartoon', name: 'Cartoon', gradient: ['#4facfe', '#00f2fe'] },
  { id: 'abstract', name: 'Abstracto', gradient: ['#43e97b', '#38f9d7'] },
];

const MAX_PROMPT_LENGTH = 500;
const MIN_PROMPT_LENGTH = 10;

// ========================================
// COMPONENTE PRINCIPAL
// ========================================
export const ImageGenerator: React.FC<ImageGeneratorProps> = ({ onImageGenerated }) => {
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('realistic');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('1:1');
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const { userProfile } = useAuth();
  const promptProgress = useSharedValue(0);

  const promptProgressAnimatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      promptProgress.value,
      [0, 0.5, 1],
      [theme.colors.gray[300], theme.colors.warning, theme.colors.success]
    );
    return { backgroundColor, width: `${promptProgress.value * 100}%` };
  });

  const handlePromptChange = useCallback((text: string) => {
    setPrompt(text);
    promptProgress.value = withSpring(Math.min(text.length / MAX_PROMPT_LENGTH, 1));
  }, [promptProgress]);

  const generateImage = useCallback(async () => {
    if (prompt.trim().length < MIN_PROMPT_LENGTH) {
      Alert.alert('Prompt inválido', `El prompt debe tener al menos ${MIN_PROMPT_LENGTH} caracteres.`);
      return;
    }
    if (userProfile?.planInfo?.plan === 'free' && (userProfile.usage.imageGeneration.monthly.used >= userProfile.usage.imageGeneration.monthly.limit)) {
        Alert.alert('Límite alcanzado', 'Has alcanzado tu límite mensual de imágenes gratuitas. Actualiza a Pro para generar más.');
        return;
    }

    setIsGenerating(true);
    try {
      const result = await cloudFunctions.generateImage({
        prompt: prompt.trim(),
        style: selectedStyle,
        aspectRatio: selectedAspectRatio,
        enhance: true,
      });

      const newImage: GeneratedImage = {
        id: Date.now().toString(),
        url: result.imageUrl,
        prompt: result.prompt,
        style: selectedStyle,
        timestamp: new Date(),
        aspectRatio: selectedAspectRatio
      };

      setGeneratedImages(prev => [newImage, ...prev]);
      onImageGenerated?.(result.imageUrl);
      setPrompt('');
      promptProgress.value = withSpring(0);
    } catch (error: any) {
      console.error('Error generating image:', error);
      Alert.alert('Error', error.message || 'No se pudo generar la imagen.');
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, selectedStyle, selectedAspectRatio, userProfile, onImageGenerated, promptProgress]);

  const saveImageToGallery = async (imageUrl: string) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se necesitan permisos para guardar la imagen en la galería.');
        return;
      }

      const fileUri = FileSystem.documentDirectory + `NORA_AI_${Date.now()}.jpg`;
      const { uri } = await FileSystem.downloadAsync(imageUrl, fileUri);
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Éxito', 'Imagen guardada en la galería.');
    } catch (error) {
      console.error('Error saving image:', error);
      Alert.alert('Error', 'No se pudo guardar la imagen.');
    }
  };

  const shareImage = async (imageUrl: string) => {
    try {
      await Share.share({
        message: `Imagen generada con NORA AI: ${prompt}`,
        url: imageUrl,
      });
    } catch (error) {
      Alert.alert('Error', 'No se pudo compartir la imagen.');
    }
  };

  const renderStyleOption = (style: ImageStyle) => (
    <TouchableOpacity
      key={style.id}
      style={[styles.styleOption, selectedStyle === style.id && styles.styleOptionSelected]}
      onPress={() => setSelectedStyle(style.id)}
    >
      <LinearGradient colors={style.gradient} style={styles.styleGradient}>
        <Text style={styles.styleName}>{style.name}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderAspectRatioOption = (ratio: string, label: string) => (
    <TouchableOpacity
      key={ratio}
      style={[styles.aspectRatioOption, selectedAspectRatio === ratio && styles.aspectRatioSelected]}
      onPress={() => setSelectedAspectRatio(ratio)}
    >
      <Text style={[styles.aspectRatioText, selectedAspectRatio === ratio && styles.aspectRatioTextSelected]}>{label}</Text>
      <Text style={[styles.aspectRatioSubtext, selectedAspectRatio === ratio && styles.aspectRatioSubtextSelected]}>{ratio}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>Generador de Imágenes</Text>
        <Text style={styles.subtitle}>Describe lo que quieres crear y nuestra IA lo hará realidad.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Describe tu idea</Text>
        <View style={styles.promptContainer}>
          <TextInput
            style={styles.promptInput}
            placeholder="Ej: Un astronauta montando a caballo en Marte, fotorrealista..."
            placeholderTextColor={theme.colors.text.tertiary}
            value={prompt}
            onChangeText={handlePromptChange}
            multiline
            maxLength={MAX_PROMPT_LENGTH}
          />
          <View style={styles.promptProgress}>
            <Animated.View style={[styles.promptProgressFill, promptProgressAnimatedStyle]} />
          </View>
        </View>
        <Text style={styles.promptCounter}>{prompt.length}/{MAX_PROMPT_LENGTH}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Elige un estilo</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {IMAGE_STYLES.map(renderStyleOption)}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. Selecciona el formato</Text>
        <View style={styles.aspectRatiosContainer}>
          {renderAspectRatioOption('1:1', 'Cuadrado')}
          {renderAspectRatioOption('16:9', 'Horizontal')}
          {renderAspectRatioOption('9:16', 'Vertical')}
        </View>
      </View>

      <View style={styles.section}>
        <Button
          title={isGenerating ? 'Generando...' : 'Generar Imagen'}
          onPress={generateImage}
          loading={isGenerating}
          disabled={isGenerating || prompt.trim().length < MIN_PROMPT_LENGTH}
          variant="filled"
          size="lg"
          fullWidth
        />
      </View>

      {generatedImages.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resultados</Text>
          {generatedImages.map((image) => (
            <View key={image.id} style={styles.imageContainer}>
              <Image source={{ uri: image.url }} style={styles.generatedImage} />
              <View style={styles.imageOverlay}>
                <TouchableOpacity style={styles.actionButton} onPress={() => saveImageToGallery(image.url)}>
                  <Ionicons name="download-outline" size={20} color="#ffffff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => shareImage(image.url)}>
                  <Ionicons name="share-outline" size={20} color="#ffffff" />
                </TouchableOpacity>
              </View>
              <Text style={styles.imagePrompt}>{image.prompt}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

// ========================================
// ESTILOS
// ========================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: theme.spacing[5],
    alignItems: 'center',
  },
  title: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing[2],
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  section: {
    marginBottom: theme.spacing[6],
    paddingHorizontal: theme.spacing[4],
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing[3],
  },
  promptContainer: {
    position: 'relative',
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    borderRadius: theme.borderRadius.lg,
  },
  promptInput: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    paddingBottom: theme.spacing[6],
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.primary,
    minHeight: 100,
    textAlignVertical: 'top',
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
    borderRadius: theme.borderRadius.lg,
  },
  promptCounter: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
    textAlign: 'right',
    marginTop: theme.spacing[2],
  },
  styleOption: {
    marginRight: theme.spacing[3],
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  styleOptionSelected: {
    borderColor: theme.colors.primary[500],
  },
  styleGradient: {
    width: 120,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  styleName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: '#ffffff',
  },
  aspectRatiosContainer: {
    flexDirection: 'row',
    gap: theme.spacing[3],
  },
  aspectRatioOption: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing[3],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  aspectRatioSelected: {
    borderColor: theme.colors.primary[500],
    backgroundColor: theme.colors.primary[900],
  },
  aspectRatioText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  aspectRatioTextSelected: {
    color: theme.colors.primary[300],
  },
  aspectRatioSubtext: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing[1],
  },
  aspectRatioSubtextSelected: {
    color: theme.colors.primary[300],
  },
  imageContainer: {
    marginBottom: theme.spacing[4],
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.background.secondary,
  },
  generatedImage: {
    width: '100%',
    aspectRatio: 1,
  },
  imageOverlay: {
    position: 'absolute',
    top: theme.spacing[2],
    right: theme.spacing[2],
    flexDirection: 'row',
    gap: theme.spacing[2],
  },
  actionButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: theme.borderRadius.full,
    padding: theme.spacing[2],
  },
  imagePrompt: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    padding: theme.spacing[3],
  },
});

export default ImageGenerator;