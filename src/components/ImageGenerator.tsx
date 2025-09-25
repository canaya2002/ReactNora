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
// CORREGIDO: Import correcto para expo-file-system
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

import { theme } from '../styles/theme';
import { Button, Card } from './base';
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
  description: string;
  gradient: string[];
  example: string;
}

// ========================================
// CONSTANTES
// ========================================
const IMAGE_STYLES: ImageStyle[] = [
  {
    id: 'realistic',
    name: 'Realista',
    description: 'Fotografía realista de alta calidad',
    gradient: ['#667eea', '#764ba2'],
    example: 'Una persona caminando en un parque'
  },
  {
    id: 'artistic',
    name: 'Artístico',
    description: 'Estilo artístico y creativo',
    gradient: ['#f093fb', '#f5576c'],
    example: 'Una pintura al óleo de un paisaje'
  },
  {
    id: 'cartoon',
    name: 'Cartoon',
    description: 'Estilo de dibujos animados',
    gradient: ['#4facfe', '#00f2fe'],
    example: 'Un personaje de dibujos animados'
  },
  {
    id: 'abstract',
    name: 'Abstracto',
    description: 'Arte abstracto moderno',
    gradient: ['#43e97b', '#38f9d7'],
    example: 'Formas geométricas coloridas'
  }
];

const MAX_PROMPT_LENGTH = 500;
const MIN_PROMPT_LENGTH = 10;

// ========================================
// COMPONENTE PRINCIPAL
// ========================================
export const ImageGenerator: React.FC<ImageGeneratorProps> = ({ onImageGenerated }) => {
  // Estados
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('realistic');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('1:1');
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Refs y hooks
  const promptInputRef = useRef<TextInput>(null);
  const { userProfile } = useAuth();

  // Valores animados
  const promptProgress = useSharedValue(0);
  const generateButtonScale = useSharedValue(1);

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
      const used = userProfile.usage.imageGeneration?.monthly?.used || 0;
      if (used >= 10) {
        return { 
          allowed: false, 
          reason: 'Has alcanzado tu límite mensual de 10 imágenes gratuitas. Actualiza para generar más.' 
        };
      }
    }

    return { allowed: true };
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

  const generateImage = useCallback(async () => {
    const validation = canGenerate();
    if (!validation.allowed) {
      Alert.alert('No disponible', validation.reason);
      return;
    }

    if (!validatePrompt(prompt)) {
      Alert.alert('Prompt inválido', 'El prompt debe tener entre 10 y 500 caracteres');
      return;
    }

    generateButtonScale.value = withSpring(0.95, {}, () => {
      generateButtonScale.value = withSpring(1);
    });

    setIsGenerating(true);

    try {
      const result = await cloudFunctions.generateImage({
        prompt: prompt.trim(),
        style: selectedStyle,
        aspectRatio: selectedAspectRatio,
        enhance: true
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
      
      if (onImageGenerated) {
        onImageGenerated(result.imageUrl);
      }

      // Limpiar prompt después de generar
      setPrompt('');
      promptProgress.value = withSpring(0);

    } catch (error: any) {
      console.error('Error generating image:', error);
      Alert.alert(
        'Error',
        error.message || 'No se pudo generar la imagen. Por favor, inténtalo de nuevo.'
      );
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, selectedStyle, selectedAspectRatio, canGenerate, onImageGenerated]);

  // ========================================
  // FUNCIONES DE GUARDADO Y COMPARTIR
  // ========================================
  const saveImageToGallery = async (imageUrl: string, index: number) => {
    try {
      // Solicitar permisos
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Error', 'Se necesitan permisos para guardar la imagen');
        return;
      }

      // CORREGIDO: Usar documentDirectory correctamente
      const documentDirectory = FileSystem.documentDirectory;
      if (!documentDirectory) {
        throw new Error('No se pudo acceder al directorio de documentos');
      }

      const fileName = `nora_image_${Date.now()}_${index}.jpg`;
      const fileUri = documentDirectory + fileName;

      // Descargar imagen
      const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);
      
      if (downloadResult.status === 200) {
        // Guardar en galería
        await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
        Alert.alert('Éxito', 'Imagen guardada en la galería');
      } else {
        throw new Error('Error al descargar la imagen');
      }

    } catch (error) {
      console.error('Error saving image:', error);
      Alert.alert('Error', 'No se pudo guardar la imagen');
    }
  };

  const shareImage = async (imageUrl: string) => {
    try {
      if (Platform.OS === 'web') {
        // En web, copiar URL al portapapeles
        Alert.alert('URL copiada', 'La URL de la imagen se copió al portapapeles');
        return;
      }

      await Share.share({
        url: imageUrl,
        message: `Imagen generada con NORA AI: ${imageUrl}`
      });
    } catch (error) {
      console.error('Error sharing image:', error);
      Alert.alert('Error', 'No se pudo compartir la imagen');
    }
  };

  // ========================================
  // COMPONENTES DE RENDERIZADO
  // ========================================
  const renderStyleOption = (style: ImageStyle) => (
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

  const renderAspectRatioOption = (ratio: string, label: string) => (
    <TouchableOpacity
      key={ratio}
      style={[
        styles.aspectRatioOption,
        selectedAspectRatio === ratio && styles.aspectRatioSelected
      ]}
      onPress={() => setSelectedAspectRatio(ratio)}
    >
      <Text style={[
        styles.aspectRatioText,
        selectedAspectRatio === ratio && styles.aspectRatioTextSelected
      ]}>
        {label}
      </Text>
      <Text style={[
        styles.aspectRatioSubtext,
        selectedAspectRatio === ratio && styles.aspectRatioSubtextSelected
      ]}>
        {ratio}
      </Text>
    </TouchableOpacity>
  );

  const renderGeneratedImage = (image: GeneratedImage, index: number) => (
    <View key={image.id} style={styles.imageContainer}>
      <Image source={{ uri: image.url }} style={styles.generatedImage} />
      
      <View style={styles.imageOverlay}>
        <View style={styles.imageActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => saveImageToGallery(image.url, index)}
          >
            <Ionicons name="download-outline" size={20} color="#ffffff" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => shareImage(image.url)}
          >
            <Ionicons name="share-outline" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.imageInfo}>
        <Text style={styles.imagePrompt} numberOfLines={2}>
          {image.prompt}
        </Text>
        <Text style={styles.imageTimestamp}>
          {image.timestamp.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
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
          <Text style={styles.title}>Generar Imagen</Text>
          <Text style={styles.subtitle}>
            Describe lo que quieres crear y nuestra IA generará una imagen única para ti
          </Text>
        </View>

        {/* Prompt Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Descripción</Text>
          <View style={styles.promptContainer}>
            <TextInput
              ref={promptInputRef}
              style={styles.promptInput}
              placeholder="Describe la imagen que quieres generar..."
              placeholderTextColor={theme.colors.text.tertiary}
              value={prompt}
              onChangeText={handlePromptChange}
              multiline
              maxLength={MAX_PROMPT_LENGTH}
              textAlignVertical="top"
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
          <Text style={styles.sectionTitle}>Estilo</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.stylesContainer}
          >
            {IMAGE_STYLES.map((style) => renderStyleOption(style))}
          </ScrollView>
        </View>

        {/* Aspect Ratio Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Formato</Text>
          <View style={styles.aspectRatiosContainer}>
            {renderAspectRatioOption('1:1', 'Cuadrado')}
            {renderAspectRatioOption('16:9', 'Panorámico')}
            {renderAspectRatioOption('9:16', 'Vertical')}
            {renderAspectRatioOption('4:3', 'Clásico')}
          </View>
        </View>

        {/* Generate Button */}
        <Animated.View style={[styles.section, generateButtonAnimatedStyle]}>
          <Button
            title={isGenerating ? 'Generando...' : 'Generar Imagen'}
            onPress={generateImage}
            loading={isGenerating}
            disabled={!validatePrompt(prompt) || isGenerating}
            // CORREGIDO: variant debe ser 'filled', no 'primary'
            variant="filled"
            // CORREGIDO: size debe ser 'lg', no 'large'
            size="lg"
            fullWidth
          />
        </Animated.View>

        {/* Generated Images */}
        {generatedImages.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Imágenes Generadas ({generatedImages.length})
            </Text>
            <View style={styles.imagesGrid}>
              {generatedImages.map((image, index) => renderGeneratedImage(image, index))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// ========================================
// ESTILOS
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
    alignItems: 'center',
  },
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
  },
  promptInput: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.primary,
    minHeight: 120,
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
  aspectRatiosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  aspectRatioOption: {
    width: '48%',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing[3],
    marginBottom: theme.spacing[2],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  aspectRatioSelected: {
    borderColor: theme.colors.primary[500],
    backgroundColor: theme.colors.primary[500] + '20',
  },
  aspectRatioText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  aspectRatioTextSelected: {
    color: theme.colors.primary[500],
  },
  aspectRatioSubtext: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing[1],
  },
  aspectRatioSubtextSelected: {
    color: theme.colors.primary[500],
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  imageContainer: {
    width: '48%',
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
    top: 0,
    right: 0,
    left: 0,
    bottom: 0,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    padding: theme.spacing[2],
  },
  imageActions: {
    flexDirection: 'row',
  },
  actionButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: theme.borderRadius.full,
    padding: theme.spacing[2],
    marginLeft: theme.spacing[1],
  },
  imageInfo: {
    padding: theme.spacing[3],
  },
  imagePrompt: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.primary,
    lineHeight: 18,
    marginBottom: theme.spacing[1],
  },
  imageTimestamp: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
  },
});

export default ImageGenerator;