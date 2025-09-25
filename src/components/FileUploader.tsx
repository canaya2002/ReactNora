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
  ImageStyle
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { theme } from '../styles/theme';
import { Button, Card } from './base';
import { FileAttachment } from '../lib/types';

// ========================================
// INTERFACES Y TIPOS
// ========================================
interface FileUploaderProps {
  onFilesSelected: (files: FileAttachment[]) => void;
  onFileProcessed?: (result: any) => void;
  maxFiles?: number;
  maxFileSize?: number; // en MB
}

// ========================================
// CONSTANTES
// ========================================
const MAX_FILE_SIZE_MB = 10;
const MAX_FILES = 5;

// ========================================
// COMPONENTE PRINCIPAL
// ========================================
export const FileUploader: React.FC<FileUploaderProps> = ({
  onFilesSelected,
  onFileProcessed,
  maxFiles = MAX_FILES,
  maxFileSize = MAX_FILE_SIZE_MB
}) => {
  const [selectedFiles, setSelectedFiles] = useState<FileAttachment[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDocumentPicker = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
      });

      if (result.assets) {
        const newFiles: FileAttachment[] = result.assets.map(asset => ({
          id: asset.uri,
          name: asset.name,
          type: asset.mimeType ?? 'application/octet-stream',
          size: asset.size ?? 0,
          uri: asset.uri,
        }));
        onFilesSelected(newFiles);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudieron seleccionar los documentos.');
    }
  }, [onFilesSelected]);

  const handleImagePicker = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se necesita acceso a la galería para seleccionar imágenes.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 1,
      });

      if (!result.canceled) {
        const newFiles: FileAttachment[] = result.assets.map(asset => ({
          id: asset.uri,
          name: asset.fileName ?? `imagen_${Date.now()}.jpg`,
          type: asset.mimeType ?? 'image/jpeg',
          size: asset.fileSize ?? 0,
          uri: asset.uri,
        }));
        onFilesSelected(newFiles);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudieron seleccionar las imágenes.');
    }
  }, [onFilesSelected]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Analizador de Archivos</Text>
          <Text style={styles.subtitle}>
            Sube documentos o imágenes para que la IA los analice.
          </Text>
        </View>

        <View style={styles.dropZone}>
            <Ionicons name="cloud-upload-outline" size={48} color={theme.colors.primary[500]} />
            <Text style={styles.dropZoneTitle}>Selecciona tus archivos</Text>
            <Text style={styles.dropZoneSubtitle}>
                Puedes seleccionar documentos o imágenes desde tu dispositivo.
            </Text>
            
            <View style={styles.uploadButtons}>
                <Button
                    title="Documentos"
                    onPress={handleDocumentPicker}
                    variant="outlined"
                    size="sm"
                    icon={<Ionicons name="document-text-outline" size={16} color={theme.colors.primary[500]} />}
                />
                <Button
                    title="Imágenes"
                    onPress={handleImagePicker}
                    variant="outlined"
                    size="sm"
                    icon={<Ionicons name="image-outline" size={16} color={theme.colors.primary[500]} />}
                />
            </View>
        </View>
        
        <View style={styles.infoSection}>
            <Text style={styles.infoNote}>
              Tamaño máximo por archivo: {maxFileSize}MB.
            </Text>
        </View>
    </View>
  );
};

// ========================================
// ESTILOS
// ========================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing[4],
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing[6],
  },
  title: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing[2],
  },
  subtitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  dropZone: {
    alignItems: 'center',
    paddingVertical: theme.spacing[8],
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: theme.colors.border.primary,
    borderStyle: 'dashed',
    backgroundColor: theme.colors.background.secondary,
    marginBottom: theme.spacing[6],
  },
  dropZoneTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[2],
  },
  dropZoneSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing[6],
    paddingHorizontal: theme.spacing[4],
  },
  uploadButtons: {
    flexDirection: 'row',
    gap: theme.spacing[4],
  },
  infoSection: {
    alignItems: 'center',
  },
  infoNote: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
    fontStyle: 'italic',
  },
});

export default FileUploader;