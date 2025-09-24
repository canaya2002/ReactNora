// src/components/ImageGenerator.tsx - GENERADOR DE IMÁGENES (CORREGIDO)
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Dimensions,
  Share,
  Image
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
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// Hooks y contextos
import { useAuth } from '../contexts/AuthContext';
import { cloudFunctions } from '../lib/firebase';
import { useAsyncOperation, usePermissions } from '../hooks';

// Componentes
import { Button, Card, IconButton, Loading } from './base';

// Estilos y tipos
import { theme } from '../styles/theme';
import { IMAGE_STYLES, GenerateImageInput, GenerateImageOutput } from '../lib/types';

// ========================================
// INTERFACES
// ========================================
interface ImageGeneratorProps {
  onImageGenerated?: (imageUrl: string) => void;
  initialPrompt?: string;
}

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  style: string;
  timestamp: Date;
  isDownloading?: boolean;
  isDownloaded?: boolean;
}

interface StyleOption {
  id: string;
  name: string;
  premium: boolean;
}

interface AspectRatioOption {
  id: string;
  name: string;
  ratio: string;
}

// ========================================
// CONSTANTES
// ========================================
const { width } = Dimensions.get('window');

const ASPECT_RATIOS: AspectRatioOption[] = [
  { id: '1:1', name: 'Cuadrado', ratio: '1:1' },
  { id: '16:9', name: 'Horizontal', ratio: '16:9' },
  { id: '9:16', name: 'Vertical', ratio: '9:16' },
  { id: '4:3', name: 'Clásico', ratio: '4:3' }
];

// ========================================
// COMPONENTE PRINCIPAL
// ========================================
export default function ImageGenerator({ 
  onImageGenerated, 
  initialPrompt = '' 
}: ImageGeneratorProps) {
  const { user, userProfile } = useAuth();
  const { hasMediaLibraryPermission, requestMediaLibraryPermission } = usePermissions();
  
  // Estados
  const [prompt, setPrompt] = useState(initialPrompt);
  const [selectedStyle, setSelectedStyle] = useState<string>(IMAGE_STYLES[0].id);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>('1:1');
  const [enhancePrompt, setEnhancePrompt] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Hooks para operaciones async
  const { execute: executeGeneration, loading: isExecuting } = useAsyncOperation();
  const { execute: executeDownload, loading: isDownloading } = useAsyncOperation();

  // Referencias
  const promptInputRef = useRef<TextInput>(null);

  // ========================================
  // VALIDACIONES
  // ========================================
  const canGenerate = (): { allowed: boolean; reason?: string } => {
    if (!user || !userProfile) {
      return { allowed: false, reason: 'Debes iniciar sesión' };
    }

    if (!prompt.trim()) {
      return { allowed: false, reason: 'Ingresa una descripción' };
    }

    // Verificar límites para usuarios gratuitos
    if (userProfile.planInfo.plan === 'free') {
      const used = userProfile.usage.imageGeneration.daily.used || 0;
      const limit = userProfile.usage.imageGeneration.daily.limit || 10;
      
      if (used >= limit) {
        return { allowed: false, reason: 'Has alcanzado tu límite diario de imágenes gratuitas' };
      }
    }

    // Verificar si el estilo seleccionado requiere premium
    const selectedStyleData = IMAGE_STYLES.find(s => s.id === selectedStyle);
    if (selectedStyleData?.premium && userProfile.planInfo.plan === 'free') {
      return { allowed: false, reason: 'Este estilo requiere una cuenta Pro' };
    }

    return { allowed: true };
  };

  // ========================================
  // GENERACIÓN DE IMÁGENES
  // ========================================
  const handleGenerateImage = async () => {
    const validation = canGenerate();
    if (!validation.allowed) {
      Alert.alert('No disponible', validation.reason);
      return;
    }

    await executeGeneration(async () => {
      setIsGenerating(true);

      try {
        const input: GenerateImageInput = {
          prompt: prompt.trim(),
          style: selectedStyle,
          aspectRatio: selectedAspectRatio,
          enhance: enhancePrompt,
          userId: user?.uid
        };

        const result: GenerateImageOutput = await cloudFunctions.generateImage(input);

        const newImage: GeneratedImage = {
          id: Date.now().toString(),
          url: result.imageUrl,
          prompt: result.prompt,
          style: selectedStyle,
          timestamp: new Date()
        };

        setGeneratedImages(prev => [newImage, ...prev]);

        // Callback opcional
        if (onImageGenerated) {
          onImageGenerated(result.imageUrl);
        }

        // Mostrar información de uso restante
        if (userProfile?.planInfo.plan === 'free') {
          const remaining = result.remainingDaily;
          if (remaining <= 3) {
            Alert.alert(
              'Límite próximo',
              `Te quedan ${remaining} imágenes gratuitas hoy. Considera actualizar a Pro para imágenes ilimitadas.`
            );
          }
        }

      } catch (error: any) {
        console.error('Error generating image:', error);
        Alert.alert('Error', error.message || 'No se pudo generar la imagen');
      } finally {
        setIsGenerating(false);
      }
    });
  };

  // ========================================
  // DESCARGA Y COMPARTIR
  // ========================================
  const downloadImage = async (image: GeneratedImage) => {
    if (!hasMediaLibraryPermission) {
      const granted = await requestMediaLibraryPermission();
      if (!granted) {
        Alert.alert('Permiso requerido', 'Se necesita acceso a la galería para guardar imágenes');
        return;
      }
    }

    await executeDownload(async () => {
      try {
        // Actualizar estado de descarga
        setGeneratedImages(prev => 
          prev.map(img => 
            img.id === image.id 
              ? { ...img, isDownloading: true }
              : img
          )
        );

        // Crear nombre de archivo único
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `nora_image_${timestamp}.jpg`;
        
        // Verificar si FileSystem.documentDirectory existe
        if (!FileSystem.documentDirectory) {
          throw new Error('No se puede acceder al sistema de archivos');
        }
        
        const fileUri = FileSystem.documentDirectory + fileName;

        // Descargar imagen
        const downloadResult = await FileSystem.downloadAsync(image.url, fileUri);
        
        if (downloadResult.status === 200) {
          // Guardar en galería
          const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
          await MediaLibrary.createAlbumAsync('NORA AI', asset, false);

          // Actualizar estado
          setGeneratedImages(prev => 
            prev.map(img => 
              img.id === image.id 
                ? { ...img, isDownloading: false, isDownloaded: true }
                : img
            )
          );

          Alert.alert('¡Guardada!', 'La imagen se guardó en tu galería');
        } else {
          throw new Error('Error en la descarga');
        }

      } catch (error: any) {
        console.error('Error downloading image:', error);
        Alert.alert('Error', 'No se pudo guardar la imagen');
        
        // Resetear estado de descarga
        setGeneratedImages(prev => 
          prev.map(img => 
            img.id === image.id 
              ? { ...img, isDownloading: false }
              : img
          )
        );
      }
    });
  };

  const shareImage = async (image: GeneratedImage) => {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(image.url, {
          mimeType: 'image/jpeg',
          dialogTitle: 'Compartir imagen generada'
        });
      } else {
        // Fallback para Share nativo
        await Share.share({
          url: image.url,
          message: `Imagen generada con NORA AI: ${image.prompt}`
        });
      }
    } catch (error: any) {
      console.error('Error sharing image:', error);
      if (error.message !== 'User cancelled') {
        Alert.alert('Error', 'No se pudo compartir la imagen');
      }
    }
  };

  // ========================================
  // COMPONENTES DE RENDERIZADO
  // ========================================
  const StyleSelector = () => (
    <View style={styles.selectorSection}>
      <Text style={styles.selectorTitle}>Estilo</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.selectorContainer}
      >
        {IMAGE_STYLES.map((style, index) => (
          <Animated.View key={style.id} entering={FadeInDown.delay(index * 50)}>
            <TouchableOpacity
              style={[
                styles.styleOption,
                selectedStyle === style.id && styles.styleOptionSelected,
                style.premium && userProfile?.planInfo.plan === 'free' && styles.styleOptionDisabled
              ]}
              onPress={() => setSelectedStyle(style.id)}
              disabled={style.premium && userProfile?.planInfo.plan === 'free'}
            >
              <Text style={[
                styles.styleOptionText,
                selectedStyle === style.id && styles.styleOptionTextSelected,
                style.premium && userProfile?.planInfo.plan === 'free' && styles.styleOptionTextDisabled
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

  const AspectRatioSelector = () => (
    <View style={styles.selectorSection}>
      <Text style={styles.selectorTitle}>Proporción</Text>
      <View style={styles.aspectRatioGrid}>
        {ASPECT_RATIOS.map((ratio) => (
          <TouchableOpacity
            key={ratio.id}
            style={[
              styles.aspectRatioOption,
              selectedAspectRatio === ratio.id && styles.aspectRatioOptionSelected
            ]}
            onPress={() => setSelectedAspectRatio(ratio.id)}
          >
            <Text style={[
              styles.aspectRatioText,
              selectedAspectRatio === ratio.id && styles.aspectRatioTextSelected
            ]}>
              {ratio.name}
            </Text>
            <Text style={[
              styles.aspectRatioRatio,
              selectedAspectRatio === ratio.id && styles.aspectRatioRatioSelected
            ]}>
              {ratio.ratio}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const ImageItem = ({ image, index }: { image: GeneratedImage; index: number }) => {
    const scale = useSharedValue(1);
    
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }]
    }));

    const handlePress = () => {
      scale.value = withSpring(0.95, {}, () => {
        scale.value = withSpring(1);
      });
    };

    return (
      <Animated.View
        entering={ZoomIn.delay(index * 100)}
        style={[animatedStyle, styles.imageItem]}
      >
        <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
          <Card style={styles.imageCard} noPadding>
            <Image source={{ uri: image.url }} style={styles.generatedImage} />
            
            <View style={styles.imageOverlay}>
              <View style={styles.imageActions}>
                <IconButton
                  icon={
                    <Ionicons
                      name={image.isDownloaded ? "checkmark-circle" : "download"}
                      size={20}
                      color="#ffffff"
                    />
                  }
                  onPress={() => downloadImage(image)}
                  variant="filled"
                  color="rgba(0,0,0,0.6)"
                  size="sm"
                  disabled={image.isDownloading}
                />
                
                <IconButton
                  icon={<Ionicons name="share" size={20} color="#ffffff" />}
                  onPress={() => shareImage(image)}
                  variant="filled"
                  color="rgba(0,0,0,0.6)"
                  size="sm"
                />
              </View>
            </View>
            
            {image.isDownloading && (
              <View style={styles.downloadingOverlay}>
                <Loading size="small" color="#ffffff" />
              </View>
            )}
          </Card>
          
          <View style={styles.imageInfo}>
            <Text style={styles.imagePrompt} numberOfLines={2}>
              {image.prompt}
            </Text>
            <Text style={styles.imageTimestamp}>
              {image.timestamp.toLocaleDateString('es-ES')}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // ========================================
  // RENDER PRINCIPAL
  // ========================================
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Generar Imagen</Text>
        <Text style={styles.subtitle}>
          Describe lo que quieres ver y lo crearemos para ti
        </Text>
      </View>

      {/* Input de prompt */}
      <Card style={styles.promptCard}>
        <Text style={styles.inputLabel}>Descripción de la imagen</Text>
        <TextInput
          ref={promptInputRef}
          style={styles.promptInput}
          value={prompt}
          onChangeText={setPrompt}
          placeholder="Ej: Un gato naranja sentado en una ventana soleada, estilo acuarela..."
          placeholderTextColor={theme.colors.text.tertiary}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
        
        {/* Opción de mejorar prompt */}
        <TouchableOpacity
          style={styles.enhanceOption}
          onPress={() => setEnhancePrompt(!enhancePrompt)}
        >
          <View style={styles.enhanceCheckbox}>
            {enhancePrompt && (
              <Ionicons name="checkmark" size={16} color={theme.colors.primary[500]} />
            )}
          </View>
          <Text style={styles.enhanceText}>
            Mejorar descripción automáticamente
          </Text>
        </TouchableOpacity>
      </Card>

      {/* Selectores */}
      <StyleSelector />
      <AspectRatioSelector />

      {/* Límites de uso para usuarios gratuitos */}
      {userProfile?.planInfo.plan === 'free' && (
        <Card style={styles.limitsCard}>
          <View style={styles.limitsHeader}>
            <Ionicons name="information-circle" size={20} color={theme.colors.info[500]} />
            <Text style={styles.limitsTitle}>
              {userProfile.usage.imageGeneration.daily.used || 0}/10 imágenes gratuitas utilizadas hoy
            </Text>
          </View>
          
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${((userProfile.usage.imageGeneration.daily.used || 0) / 10) * 100}%` }
              ]}
            />
          </View>
          
          <Text style={styles.limitsDescription}>
            Actualiza a Pro para generar imágenes ilimitadas y acceder a estilos premium
          </Text>
        </Card>
      )}

      {/* Botón de generar */}
      <Button
        title={isGenerating ? "Generando..." : "Generar Imagen"}
        onPress={handleGenerateImage}
        disabled={!prompt.trim() || isGenerating || (userProfile?.planInfo.plan === 'free' && 
          (userProfile.usage.imageGeneration.daily.used || 0) >= 10)}
        loading={isGenerating}
        icon={<Ionicons name="sparkles" size={20} color="#ffffff" />}
        style={styles.generateButton}
      />

      {/* Galería de imágenes generadas */}
      {generatedImages.length > 0 && (
        <View style={styles.gallerySection}>
          <Text style={styles.galleryTitle}>
            Imágenes generadas ({generatedImages.length})
          </Text>
          
          <View style={styles.imagesGrid}>
            {generatedImages.map((image, index) => (
              <ImageItem key={image.id} image={image} index={index} />
            ))}
          </View>
        </View>
      )}

      {/* Loading overlay */}
      {(isExecuting || isDownloading) && (
        <Loading 
          text={isExecuting ? "Generando imagen..." : "Descargando..."} 
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
  enhanceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  enhanceCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: theme.colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  enhanceText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
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
  aspectRatioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  aspectRatioOption: {
    flex: 1,
    minWidth: '22%',
    backgroundColor: theme.colors.surface.secondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  aspectRatioOptionSelected: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500],
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
  aspectRatioRatio: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
  },
  aspectRatioRatioSelected: {
    color: 'rgba(255,255,255,0.8)',
  },
  limitsCard: {
    margin: theme.spacing.lg,
    backgroundColor: `${theme.colors.info[500]}10`,
    borderWidth: 1,
    borderColor: theme.colors.info[500],
  },
  limitsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  limitsTitle: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginLeft: theme.spacing.sm,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: theme.colors.surface.tertiary,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.warning[500],
  },
  limitsDescription: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
    lineHeight: 18,
  },
  generateButton: {
    margin: theme.spacing.lg,
    marginTop: 0,
  },
  gallerySection: {
    margin: theme.spacing.lg,
  },
  galleryTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight as any,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
  },
  imagesGrid: {
    gap: theme.spacing.md,
  },
  imageItem: {
    marginBottom: theme.spacing.lg,
  },
  imageCard: {
    position: 'relative',
    overflow: 'hidden',
  },
  generatedImage: {
    width: '100%',
    height: width - (theme.spacing.lg * 2),
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0)',
  },
  imageActions: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  downloadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageInfo: {
    padding: theme.spacing.md,
  },
  imagePrompt: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
    lineHeight: 20,
  },
  imageTimestamp: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
  },
});