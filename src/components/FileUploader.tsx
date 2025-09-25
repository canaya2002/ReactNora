// src/components/FileUploader.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ScrollView,
  Platform,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  runOnJS
} from 'react-native-reanimated';

import { theme } from '../styles/theme';
import { Button, Card } from './base';
import { FileAttachment } from '../lib/types';
import { cloudFunctions } from '../lib/firebase';

const { width: screenWidth } = Dimensions.get('window');

// ========================================
// INTERFACES Y TIPOS
// ========================================
interface FileUploaderProps {
  onFilesSelected?: (files: FileAttachment[]) => void;
  onFileProcessed?: (result: any) => void;
  maxFiles?: number;
  allowedTypes?: string[];
  maxFileSize?: number; // en MB
}

interface UploadState {
  uploading: boolean;
  processing: boolean;
  progress: number;
}

// ========================================
// CONSTANTES
// ========================================
const SUPPORTED_FILE_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  document: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  spreadsheet: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  presentation: ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
  video: ['video/mp4', 'video/quicktime', 'video/x-msvideo']
};

const MAX_FILE_SIZE_MB = 10;
const MAX_FILES = 5;

// ========================================
// COMPONENTE PRINCIPAL
// ========================================
export const FileUploader: React.FC<FileUploaderProps> = ({
  onFilesSelected,
  onFileProcessed,
  maxFiles = MAX_FILES,
  allowedTypes = Object.values(SUPPORTED_FILE_TYPES).flat(),
  maxFileSize = MAX_FILE_SIZE_MB
}) => {
  // Estados
  const [selectedFiles, setSelectedFiles] = useState<FileAttachment[]>([]);
  const [uploadState, setUploadState] = useState<UploadState>({
    uploading: false,
    processing: false,
    progress: 0
  });

  // Valores animados
  const dropZoneScale = useSharedValue(1);
  const uploadProgress = useSharedValue(0);

  // ========================================
  // FUNCIONES DE VALIDACIÓN
  // ========================================
  const validateFile = (file: any): { valid: boolean; error?: string } => {
    // Validar tipo de archivo
    if (!allowedTypes.includes(file.mimeType || file.type)) {
      return {
        valid: false,
        error: `Tipo de archivo no soportado: ${file.mimeType || file.type}`
      };
    }

    // Validar tamaño
    const fileSizeMB = (file.size || 0) / (1024 * 1024);
    if (fileSizeMB > maxFileSize) {
      return {
        valid: false,
        error: `El archivo es demasiado grande. Máximo: ${maxFileSize}MB`
      };
    }

    // Validar cantidad de archivos
    if (selectedFiles.length >= maxFiles) {
      return {
        valid: false,
        error: `Máximo ${maxFiles} archivos permitidos`
      };
    }

    return { valid: true };
  };

  const getFileIcon = (mimeType: string): keyof typeof Ionicons.glyphMap => {
    if (SUPPORTED_FILE_TYPES.image.includes(mimeType)) return 'image';
    if (SUPPORTED_FILE_TYPES.document.includes(mimeType)) return 'document-text';
    if (SUPPORTED_FILE_TYPES.spreadsheet.includes(mimeType)) return 'grid';
    if (SUPPORTED_FILE_TYPES.presentation.includes(mimeType)) return 'easel';
    if (SUPPORTED_FILE_TYPES.audio.includes(mimeType)) return 'musical-note';
    if (SUPPORTED_FILE_TYPES.video.includes(mimeType)) return 'videocam';
    return 'document';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // ========================================
  // MANEJADORES DE EVENTOS
  // ========================================
  const handleDocumentPicker = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: allowedTypes.length > 0 ? allowedTypes : '*/*',
        multiple: maxFiles > 1,
        copyToCacheDirectory: true
      });

      if (result.assets && result.assets.length > 0) {
        const files: FileAttachment[] = [];

        for (const asset of result.assets) {
          const validation = validateFile(asset);
          if (!validation.valid) {
            Alert.alert('Error', validation.error);
            continue;
          }

          const fileAttachment: FileAttachment = {
            id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: asset.name,
            type: asset.mimeType || 'application/octet-stream',
            size: asset.size || 0,
            uri: asset.uri,
            data: undefined // Se llenará al procesar
          };

          files.push(fileAttachment);
        }

        if (files.length > 0) {
          setSelectedFiles(prev => [...prev, ...files]);
          if (onFilesSelected) {
            onFilesSelected(files);
          }
        }
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'No se pudo seleccionar el archivo');
    }
  }, [allowedTypes, maxFiles, selectedFiles.length, validateFile, onFilesSelected]);

  const handleImagePicker = useCallback(async () => {
    try {
      // Solicitar permisos
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos necesarios', 'Se necesitan permisos para acceder a la galería');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
        allowsMultipleSelection: maxFiles > 1,
      });

      if (!result.canceled && result.assets) {
        const files: FileAttachment[] = [];

        for (const asset of result.assets) {
          const fileSize = asset.fileSize || 0;
          const validation = validateFile({
            mimeType: asset.type === 'image' ? 'image/jpeg' : asset.type,
            size: fileSize
          });

          if (!validation.valid) {
            Alert.alert('Error', validation.error);
            continue;
          }

          const fileAttachment: FileAttachment = {
            id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: asset.fileName || `imagen_${Date.now()}.jpg`,
            type: 'image/jpeg',
            size: fileSize,
            uri: asset.uri,
            data: undefined
          };

          files.push(fileAttachment);
        }

        if (files.length > 0) {
          setSelectedFiles(prev => [...prev, ...files]);
          if (onFilesSelected) {
            onFilesSelected(files);
          }
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  }, [maxFiles, selectedFiles.length, validateFile, onFilesSelected]);

  const handleRemoveFile = useCallback((fileId: string) => {
    setSelectedFiles(prev => prev.filter(file => file.id !== fileId));
  }, []);

  const handleProcessFiles = useCallback(async () => {
    if (selectedFiles.length === 0) {
      Alert.alert('Error', 'No hay archivos seleccionados');
      return;
    }

    setUploadState({ uploading: true, processing: false, progress: 0 });

    try {
      const results = [];
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        // Simular progreso
        const progress = ((i + 1) / selectedFiles.length) * 100;
        uploadProgress.value = withSpring(progress);
        setUploadState(prev => ({ ...prev, progress }));

        // Procesar archivo
        const result = await cloudFunctions.processFile(file.data || '', file.type);
        results.push(result);
      }

      setUploadState({ uploading: false, processing: false, progress: 100 });
      
      if (onFileProcessed) {
        onFileProcessed(results);
      }

      Alert.alert('Éxito', 'Archivos procesados correctamente');

    } catch (error: any) {
      console.error('Error processing files:', error);
      Alert.alert('Error', error.message || 'No se pudieron procesar los archivos');
    } finally {
      setUploadState({ uploading: false, processing: false, progress: 0 });
      uploadProgress.value = withSpring(0);
    }
  }, [selectedFiles, onFileProcessed]);

  // ========================================
  // ESTILOS ANIMADOS
  // ========================================
  const dropZoneAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: dropZoneScale.value }],
    };
  });

  const progressAnimatedStyle = useAnimatedStyle(() => {
    return {
      width: `${uploadProgress.value}%`,
    };
  });

  // ========================================
  // COMPONENTES DE RENDERIZADO
  // ========================================
  const renderFileItem = (file: FileAttachment, index: number) => (
    <Animated.View
      key={file.id}
      style={[styles.fileItem]}
      entering={undefined} // Removed complex animations for compatibility
    >
      <View style={styles.fileInfo}>
        <View style={styles.fileIconContainer}>
          {SUPPORTED_FILE_TYPES.image.includes(file.type) ? (
            // CORREGIDO: Usar style correctamente tipado
            <Image source={{ uri: file.uri }} style={styles.fileThumbnail as any} />
          ) : (
            <Ionicons 
              name={getFileIcon(file.type)} 
              size={32} 
              color={theme.colors.primary[500]} 
            />
          )}
        </View>
        
        <View style={styles.fileDetails}>
          <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
          <Text style={styles.fileSize}>{formatFileSize(file.size)}</Text>
          <Text style={styles.fileType}>{file.type}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveFile(file.id)}
      >
        <Ionicons name="close-circle" size={24} color={theme.colors.error} />
      </TouchableOpacity>
    </Animated.View>
  );

  const renderDropZone = () => (
    <Animated.View style={[styles.dropZone, dropZoneAnimatedStyle]}>
      <LinearGradient
        colors={[theme.colors.primary[100], theme.colors.primary[50]]}
        style={styles.dropZoneGradient}
      >
        <View style={styles.dropZoneContent}>
          <Ionicons 
            name="cloud-upload-outline" 
            size={48} 
            color={theme.colors.primary[500]} 
          />
          {/* CORREGIDO: fontWeight usando valor correcto del theme */}
          <Text style={styles.dropZoneTitle}>Subir archivos</Text>
          <Text style={styles.dropZoneSubtitle}>
            Toca para seleccionar archivos o arrastra y suelta aquí
          </Text>
          
          <View style={styles.uploadButtons}>
            <Button
              title="Documentos"
              onPress={handleDocumentPicker}
              variant="outlined"
              size="sm"
              icon={<Ionicons name="document-outline" size={16} color={theme.colors.primary[500]} />}
              style={styles.uploadButton}
            />
            
            <Button
              title="Imágenes"
              onPress={handleImagePicker}
              variant="outlined"
              size="sm"
              icon={<Ionicons name="image-outline" size={16} color={theme.colors.primary[500]} />}
              style={styles.uploadButton}
            />
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  // ========================================
  // RENDERIZADO PRINCIPAL
  // ========================================
  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          {/* CORREGIDO: fontWeight usando valor correcto del theme */}
          <Text style={styles.title}>Análisis de Archivos</Text>
          <Text style={styles.subtitle}>
            Sube documentos, imágenes y otros archivos para analizar con IA
          </Text>
        </View>

        {/* Drop Zone */}
        {selectedFiles.length === 0 && renderDropZone()}

        {/* Lista de archivos seleccionados */}
        {selectedFiles.length > 0 && (
          <View style={styles.filesSection}>
            <View style={styles.filesSectionHeader}>
              {/* CORREGIDO: fontWeight usando valor correcto del theme */}
              <Text style={styles.filesSectionTitle}>
                Archivos seleccionados ({selectedFiles.length})
              </Text>
              
              {selectedFiles.length < maxFiles && (
                <TouchableOpacity
                  style={styles.addMoreButton}
                  onPress={handleDocumentPicker}
                >
                  <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary[500]} />
                </TouchableOpacity>
              )}
            </View>

            <Card style={styles.filesContainer} noPadding>
              {selectedFiles.map((file, index) => renderFileItem(file, index))}
            </Card>
          </View>
        )}

        {/* Progreso de subida */}
        {uploadState.uploading && (
          <View style={styles.progressSection}>
            <Text style={styles.progressText}>
              Procesando archivos... {Math.round(uploadState.progress)}%
            </Text>
            <View style={styles.progressBar}>
              <Animated.View style={[styles.progressFill, progressAnimatedStyle]} />
            </View>
          </View>
        )}

        {/* Botones de acción */}
        {selectedFiles.length > 0 && !uploadState.uploading && (
          <View style={styles.actionsSection}>
            <Button
              title="Procesar Archivos"
              onPress={handleProcessFiles}
              variant="filled"
              size="lg"
              fullWidth
              style={styles.processButton}
            />
            
            <Button
              title="Limpiar Todo"
              onPress={() => setSelectedFiles([])}
              variant="ghost"
              size="lg"
              fullWidth
              style={styles.clearButton}
            />
          </View>
        )}

        {/* Información de soporte */}
        <View style={styles.infoSection}>
          <Card style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="information-circle-outline" size={24} color={theme.colors.info} />
              <Text style={styles.infoTitle}>Formatos soportados</Text>
            </View>
            
            <View style={styles.supportedFormats}>
              <Text style={styles.formatCategory}>Documentos:</Text>
              <Text style={styles.formatList}>PDF, DOC, DOCX, TXT</Text>
              
              <Text style={styles.formatCategory}>Imágenes:</Text>
              <Text style={styles.formatList}>JPG, PNG, GIF, WEBP</Text>
              
              <Text style={styles.formatCategory}>Hojas de cálculo:</Text>
              <Text style={styles.formatList}>XLS, XLSX</Text>
            </View>
            
            <Text style={styles.infoNote}>
              Tamaño máximo por archivo: {maxFileSize}MB
            </Text>
          </Card>
        </View>
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
  header: {
    padding: theme.spacing[5],
    alignItems: 'center',
  },
  // CORREGIDO: fontWeight usando valor correcto
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
    lineHeight: 24,
  },
  dropZone: {
    marginHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[6],
  },
  dropZoneGradient: {
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: theme.colors.primary[200],
    borderStyle: 'dashed',
  },
  dropZoneContent: {
    padding: theme.spacing[8],
    alignItems: 'center',
  },
  // CORREGIDO: fontWeight usando valor correcto
  dropZoneTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[2],
  },
  dropZoneSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing[6],
  },
  uploadButtons: {
    flexDirection: 'row',
    gap: theme.spacing[3],
  },
  uploadButton: {
    minWidth: 120,
  },
  filesSection: {
    paddingHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[6],
  },
  filesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[3],
  },
  // CORREGIDO: fontWeight usando valor correcto
  filesSectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  addMoreButton: {
    padding: theme.spacing[1],
  },
  filesContainer: {
    overflow: 'hidden',
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileIconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing[3],
  },
  // CORREGIDO: Estilo correcto para imagen
  fileThumbnail: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing[1],
  },
  fileSize: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  fileType: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing[1],
  },
  removeButton: {
    padding: theme.spacing[1],
  },
  progressSection: {
    paddingHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[6],
  },
  progressText: {
    fontSize: theme.typography.fontSize.base,
    // CORREGIDO: fontWeight usando valor correcto
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing[3],
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.background.tertiary,
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary[500],
  },
  actionsSection: {
    paddingHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[6],
    gap: theme.spacing[3],
  },
  processButton: {
    backgroundColor: theme.colors.primary[500],
  },
  clearButton: {
    marginTop: theme.spacing[2],
  },
  infoSection: {
    paddingHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[6],
  },
  infoCard: {
    padding: theme.spacing[4],
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[4],
  },
  infoTitle: {
    fontSize: theme.typography.fontSize.base,
    // CORREGIDO: fontWeight usando valor correcto
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginLeft: theme.spacing[2],
  },
  supportedFormats: {
    marginBottom: theme.spacing[4],
  },
  formatCategory: {
    fontSize: theme.typography.fontSize.sm,
    // CORREGIDO: fontWeight usando valor correcto
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
    marginTop: theme.spacing[2],
    marginBottom: theme.spacing[1],
  },
  formatList: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing[2],
  },
  infoNote: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
    fontStyle: 'italic',
  },
});

export default FileUploader;