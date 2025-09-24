// src/components/FileUploader.tsx - SUBIDA DE ARCHIVOS (CORREGIDO)
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  FlatList,
  Dimensions,
  Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Animated, { 
  FadeInDown, 
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Layout
} from 'react-native-reanimated';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

// Hooks y utilidades
import { usePermissions } from '../hooks';
import { FileAttachment } from '../lib/types';

// Componentes
import { Button, IconButton, Loading } from './base';

// Estilos
import { theme } from '../styles/theme';

const { width } = Dimensions.get('window');

// ========================================
// INTERFACES
// ========================================
interface FileUploaderProps {
  onFilesSelected: (files: FileAttachment[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // en MB
  acceptedTypes?: string[];
  disabled?: boolean;
  initialFiles?: FileAttachment[];
}

interface FilePickerOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  action: () => void;
}

// ========================================
// CONSTANTES
// ========================================
const ACCEPTED_TYPES = {
  'image/*': ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  'application/pdf': ['pdf'],
  'text/*': ['txt', 'md'],
  'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  'application/vnd.ms-excel': ['xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx']
};

const MAX_FILE_SIZE = 50; // 50MB por defecto

// ========================================
// COMPONENTE PRINCIPAL
// ========================================
export default function FileUploader({
  onFilesSelected,
  maxFiles = 5,
  maxFileSize = MAX_FILE_SIZE,
  acceptedTypes = ['image/*', 'application/pdf', 'text/*'],
  disabled = false,
  initialFiles = []
}: FileUploaderProps) {
  
  // Estados
  const [selectedFiles, setSelectedFiles] = useState<FileAttachment[]>(initialFiles);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  // Hooks
  const { 
    hasCameraPermission, 
    hasMediaLibraryPermission,
    requestCameraPermission,
    requestMediaLibraryPermission
  } = usePermissions();

  // ========================================
  // VALIDACIONES
  // ========================================
  const validateFile = (file: any): { valid: boolean; error?: string } => {
    // Validar tamaño
    if (file.size && file.size > maxFileSize * 1024 * 1024) {
      return {
        valid: false,
        error: `El archivo es muy grande (máximo ${maxFileSize}MB)`
      };
    }

    // Validar tipo si está especificado
    if (acceptedTypes.length > 0) {
      const fileExtension = file.name?.split('.').pop()?.toLowerCase();
      const mimeType = file.mimeType || file.type;
      
      const isAccepted = acceptedTypes.some(type => {
        if (type.endsWith('/*')) {
          return mimeType?.startsWith(type.replace('/*', '/'));
        }
        return ACCEPTED_TYPES[type as keyof typeof ACCEPTED_TYPES]?.includes(fileExtension || '');
      });

      if (!isAccepted) {
        return {
          valid: false,
          error: 'Tipo de archivo no permitido'
        };
      }
    }

    // Validar número máximo de archivos
    if (selectedFiles.length >= maxFiles) {
      return {
        valid: false,
        error: `Máximo ${maxFiles} archivos permitidos`
      };
    }

    return { valid: true };
  };

  // ========================================
  // HANDLERS DE SELECCIÓN
  // ========================================
  const handleImageFromCamera = useCallback(async () => {
    try {
      if (!hasCameraPermission) {
        const granted = await requestCameraPermission();
        if (!granted) {
          Alert.alert('Permiso requerido', 'Se necesita acceso a la cámara para tomar fotos');
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await processImageFile(asset);
      }
    } catch (error: any) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  }, [hasCameraPermission, requestCameraPermission]);

  const handleImageFromGallery = useCallback(async () => {
    try {
      if (!hasMediaLibraryPermission) {
        const granted = await requestMediaLibraryPermission();
        if (!granted) {
          Alert.alert('Permiso requerido', 'Se necesita acceso a la galería para seleccionar fotos');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: maxFiles > 1,
        selectionLimit: Math.min(maxFiles - selectedFiles.length, 10),
        quality: 0.8,
        base64: false
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        for (const asset of result.assets) {
          await processImageFile(asset);
        }
      }
    } catch (error: any) {
      console.error('Error selecting images:', error);
      Alert.alert('Error', 'No se pudieron seleccionar las imágenes');
    }
  }, [hasMediaLibraryPermission, requestMediaLibraryPermission, maxFiles, selectedFiles.length]);

  const handleDocumentPicker = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: acceptedTypes,
        copyToCacheDirectory: true,
        multiple: maxFiles > 1
      });

      if (!result.canceled) {
        if ('assets' in result && result.assets) {
          // Múltiples archivos
          const validFiles: FileAttachment[] = [];
          
          for (const file of result.assets) {
            const validation = validateFile(file);
            if (validation.valid) {
              const fileAttachment: FileAttachment = {
                id: generateFileId(),
                name: file.name,
                type: getFileType(file.name, file.mimeType),
                size: file.size || 0,
                uri: file.uri,
                mimeType: file.mimeType,
                uploadProgress: 100
              };
              validFiles.push(fileAttachment);
            } else {
              Alert.alert('Archivo rechazado', `${file.name}: ${validation.error}`);
            }
          }
          
          if (validFiles.length > 0) {
            const updated = [...selectedFiles, ...validFiles];
            setSelectedFiles(updated);
            onFilesSelected(updated);
          }
        } else if ('uri' in result) {
          // Un solo archivo
          const validation = validateFile(result);
          if (validation.valid) {
            const fileAttachment: FileAttachment = {
              id: generateFileId(),
              name: result.name || 'Documento',
              type: getFileType(result.name, result.mimeType),
              size: result.size || 0,
              uri: result.uri,
              mimeType: result.mimeType,
              uploadProgress: 100
            };
            
            const updated = [...selectedFiles, fileAttachment];
            setSelectedFiles(updated);
            onFilesSelected(updated);
          } else {
            Alert.alert('Archivo rechazado', validation.error);
          }
        }
      }
    } catch (error: any) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'No se pudo seleccionar el documento');
    }
  }, [acceptedTypes, maxFiles, selectedFiles, onFilesSelected]);

  // ========================================
  // PROCESAMIENTO DE ARCHIVOS
  // ========================================
  const processImageFile = async (asset: ImagePicker.ImagePickerAsset) => {
    try {
      // Obtener información del archivo
      const fileInfo = await FileSystem.getInfoAsync(asset.uri);
      
      const validation = validateFile({
        size: fileInfo.exists && 'size' in fileInfo ? fileInfo.size : asset.fileSize,
        name: asset.fileName || `image_${Date.now()}.jpg`,
        mimeType: 'image/jpeg'
      });

      if (!validation.valid) {
        Alert.alert('Imagen rechazada', validation.error);
        return;
      }

      const fileAttachment: FileAttachment = {
        id: generateFileId(),
        name: asset.fileName || `image_${Date.now()}.jpg`,
        type: 'image',
        size: fileInfo.exists && 'size' in fileInfo ? fileInfo.size : (asset.fileSize || 0),
        uri: asset.uri,
        mimeType: 'image/jpeg',
        uploadProgress: 100
      };

      const updated = [...selectedFiles, fileAttachment];
      setSelectedFiles(updated);
      onFilesSelected(updated);
    } catch (error: any) {
      console.error('Error processing image:', error);
      Alert.alert('Error', 'No se pudo procesar la imagen');
    }
  };

  // ========================================
  // GESTIÓN DE ARCHIVOS
  // ========================================
  const removeFile = useCallback((fileId: string) => {
    const updated = selectedFiles.filter(file => file.id !== fileId);
    setSelectedFiles(updated);
    onFilesSelected(updated);
  }, [selectedFiles, onFilesSelected]);

  const clearAllFiles = useCallback(() => {
    setSelectedFiles([]);
    onFilesSelected([]);
  }, [onFilesSelected]);

  // ========================================
  // UTILIDADES
  // ========================================
  const generateFileId = (): string => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  const getFileType = (fileName?: string, mimeType?: string): FileAttachment['type'] => {
    if (mimeType?.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType?.startsWith('video/')) return 'video';
    if (mimeType?.startsWith('audio/')) return 'audio';
    return 'document';
  };

  const getFileIcon = (fileType: FileAttachment['type']): string => {
    switch (fileType) {
      case 'image': return 'image';
      case 'pdf': return 'document-text';
      case 'video': return 'videocam';
      case 'audio': return 'musical-notes';
      default: return 'document';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // ========================================
  // OPCIONES DE SELECCIÓN
  // ========================================
  const pickerOptions: FilePickerOption[] = [
    {
      id: 'camera',
      title: 'Tomar foto',
      description: 'Usar la cámara',
      icon: 'camera',
      color: theme.colors.primary[500],
      action: handleImageFromCamera
    },
    {
      id: 'gallery',
      title: 'Galería',
      description: 'Seleccionar de galería',
      icon: 'image',
      color: theme.colors.success[500],
      action: handleImageFromGallery
    },
    {
      id: 'documents',
      title: 'Documentos',
      description: 'Archivos y documentos',
      icon: 'document',
      color: theme.colors.info[500],
      action: handleDocumentPicker
    }
  ];

  // ========================================
  // COMPONENTES DE RENDERIZADO
  // ========================================
  const FileItem = ({ file, index }: { file: FileAttachment; index: number }) => {
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
        entering={FadeInDown.delay(index * 100)}
        layout={Layout.springify()}
        style={animatedStyle}
      >
        <View style={styles.fileItem}>
          <View style={styles.fileInfo}>
            <View style={[styles.fileIcon, { backgroundColor: `${theme.colors.primary[500]}20` }]}>
              <Ionicons
                name={getFileIcon(file.type) as any}
                size={20}
                color={theme.colors.primary[500]}
              />
            </View>
            
            <View style={styles.fileDetails}>
              <Text style={styles.fileName} numberOfLines={1}>
                {file.name}
              </Text>
              <Text style={styles.fileSize}>
                {formatFileSize(file.size)}
              </Text>
            </View>
          </View>

          {file.type === 'image' && (
            <Image source={{ uri: file.uri }} style={styles.fileThumbnail} />
          )}

          <IconButton
            icon={<Ionicons name="close" size={16} color={theme.colors.error[500]} />}
            onPress={() => removeFile(file.id)}
            variant="ghost"
            size="sm"
            style={styles.removeButton}
          />
        </View>
      </Animated.View>
    );
  };

  const PickerOption = ({ option, index }: { option: FilePickerOption; index: number }) => (
    <Animated.View entering={SlideInRight.delay(index * 100)}>
      <TouchableOpacity
        style={styles.pickerOption}
        onPress={option.action}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={[`${option.color}20`, `${option.color}10`]}
          style={styles.pickerOptionGradient}
        >
          <View style={[styles.pickerOptionIcon, { backgroundColor: `${option.color}20` }]}>
            <Ionicons name={option.icon as any} size={24} color={option.color} />
          </View>
          
          <View style={styles.pickerOptionContent}>
            <Text style={styles.pickerOptionTitle}>{option.title}</Text>
            <Text style={styles.pickerOptionDescription}>{option.description}</Text>
          </View>
          
          <Ionicons name="chevron-forward" size={20} color={theme.colors.text.tertiary} />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  // ========================================
  // RENDER PRINCIPAL
  // ========================================
  return (
    <View style={styles.container}>
      {/* Header con información */}
      <View style={styles.header}>
        <Text style={styles.title}>Adjuntar archivos</Text>
        <Text style={styles.subtitle}>
          {selectedFiles.length} de {maxFiles} archivos seleccionados
        </Text>
      </View>

      {/* Lista de archivos seleccionados */}
      {selectedFiles.length > 0 && (
        <View style={styles.selectedFilesSection}>
          <View style={styles.selectedFilesHeader}>
            <Text style={styles.sectionTitle}>Archivos seleccionados</Text>
            <TouchableOpacity onPress={clearAllFiles} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>Limpiar todo</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={selectedFiles}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => <FileItem file={item} index={index} />}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Opciones de selección */}
      {selectedFiles.length < maxFiles && (
        <View style={styles.pickerSection}>
          <Text style={styles.sectionTitle}>Seleccionar archivos</Text>
          
          {pickerOptions.map((option, index) => (
            <PickerOption key={option.id} option={option} index={index} />
          ))}
        </View>
      )}

      {/* Información adicional */}
      <View style={styles.infoSection}>
        <Text style={styles.infoText}>
          • Máximo {maxFiles} archivos
        </Text>
        <Text style={styles.infoText}>
          • Tamaño máximo: {maxFileSize}MB por archivo
        </Text>
        <Text style={styles.infoText}>
          • Formatos: Imágenes, PDF, documentos
        </Text>
      </View>

      {/* Loading overlay */}
      {isUploading && (
        <Loading text="Procesando archivos..." overlay />
      )}
    </View>
  );
}

// ========================================
// ESTILOS
// ========================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight as any,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
  },
  selectedFilesSection: {
    marginBottom: theme.spacing.lg,
  },
  selectedFilesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.h4.fontSize,
    fontWeight: theme.typography.h4.fontWeight as any,
    color: theme.colors.text.primary,
  },
  clearButton: {
    padding: theme.spacing.xs,
  },
  clearButtonText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.error[500],
    fontWeight: '500',
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface.secondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  fileInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  fileSize: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
  },
  fileThumbnail: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.sm,
    marginHorizontal: theme.spacing.sm,
  },
  removeButton: {
    marginLeft: theme.spacing.xs,
  },
  pickerSection: {
    marginBottom: theme.spacing.lg,
  },
  pickerOption: {
    marginBottom: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  pickerOptionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  pickerOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  pickerOptionContent: {
    flex: 1,
  },
  pickerOptionTitle: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  pickerOptionDescription: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
  },
  infoSection: {
    backgroundColor: theme.colors.surface.secondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  infoText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
    lineHeight: 18,
  },
});