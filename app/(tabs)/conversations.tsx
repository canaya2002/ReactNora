// app/(tabs)/conversations.tsx - PANTALLA DE CONVERSACIONES (CORREGIDA)
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Animated, { 
  FadeInDown, 
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  Layout
} from 'react-native-reanimated';

// Hooks y contextos
import { useAuth } from '../../src/contexts/AuthContext';
import { useConversations } from '../../src/contexts/ConversationContext';
import { useAsyncOperation } from '../../src/hooks';

// Componentes
import { Button, Card, IconButton, Input, CustomModal, Loading } from '../../src/components/base';

// Estilos y tipos
import { theme } from '../../src/styles/theme';
import { Conversation } from '../../src/lib/types';

const { width } = Dimensions.get('window');

// ========================================
// INTERFACES
// ========================================
interface ConversationItemProps {
  conversation: Conversation;
  onPress: () => void;
  onDelete: () => void;
  onFavorite: () => void;
  onArchive: () => void;
}

type FilterType = 'all' | 'favorites' | 'archived';
type SortType = 'recent' | 'oldest' | 'alphabetical';

// ========================================
// COMPONENTE PRINCIPAL
// ========================================
export default function ConversationsScreen() {
  const { user } = useAuth();
  const {
    conversations,
    isLoading,
    loadConversation,
    deleteConversation,
    archiveConversation,
    toggleFavoriteConversation,
    refreshConversations,
    searchConversations,
    getConversationStats
  } = useConversations();

  // Estados locales
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('recent');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  // Hook para operaciones async
  const { execute: executeDelete, loading: isDeleting } = useAsyncOperation();
  const { execute: executeFavorite, loading: isFavoriting } = useAsyncOperation();
  const { execute: executeArchive, loading: isArchiving } = useAsyncOperation();

  // Estadísticas
  const stats = getConversationStats();

  // ========================================
  // FILTROS Y BÚSQUEDA
  // ========================================
  const filteredAndSortedConversations = useMemo(() => {
    let filtered = [...conversations];

    // Aplicar búsqueda
    if (searchQuery.trim()) {
      filtered = searchConversations(searchQuery);
    }

    // Aplicar filtros
    switch (activeFilter) {
      case 'favorites':
        filtered = filtered.filter(conv => conv.isFavorite);
        break;
      case 'archived':
        filtered = filtered.filter(conv => conv.isArchived);
        break;
      default:
        filtered = filtered.filter(conv => !conv.isArchived);
    }

    // Aplicar ordenamiento
    switch (sortBy) {
      case 'oldest':
        return filtered.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
      case 'alphabetical':
        return filtered.sort((a, b) => a.title.localeCompare(b.title));
      default:
        return filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }
  }, [conversations, searchQuery, activeFilter, sortBy, searchConversations]);

  // ========================================
  // HANDLERS
  // ========================================
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshConversations();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleConversationPress = async (conversation: Conversation) => {
    try {
      await loadConversation(conversation.id);
      // Navegar a la pantalla de chat
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar la conversación');
    }
  };

  const handleDeleteConversation = (conversation: Conversation) => {
    Alert.alert(
      'Eliminar conversación',
      '¿Estás seguro de que quieres eliminar esta conversación? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => executeDelete(async () => {
            await deleteConversation(conversation.id);
          })
        }
      ]
    );
  };

  const handleToggleFavorite = (conversation: Conversation) => {
    executeFavorite(async () => {
      await toggleFavoriteConversation(conversation.id);
    });
  };

  const handleToggleArchive = (conversation: Conversation) => {
    executeArchive(async () => {
      await archiveConversation(conversation.id);
    });
  };

  // ========================================
  // COMPONENTE DE CONVERSACIÓN
  // ========================================
  const ConversationItem: React.FC<ConversationItemProps> = ({
    conversation,
    onPress,
    onDelete,
    onFavorite,
    onArchive
  }) => {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }]
    }));

    const handlePressIn = () => {
      scale.value = withSpring(0.98);
    };

    const handlePressOut = () => {
      scale.value = withSpring(1);
    };

    const lastMessage = conversation.messages[conversation.messages.length - 1];
    const formattedDate = new Date(conversation.updatedAt).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });

    const cardStyles: any[] = [
      styles.conversationCard,
      conversation.isArchived && { opacity: 0.7 },
      conversation.isFavorite && { marginBottom: theme.spacing.xs, padding: theme.spacing.sm }
    ].filter(Boolean);

    return (
      <Animated.View
        style={animatedStyle}
        entering={FadeInDown}
        layout={Layout.springify()}
      >
        <Card
          style={cardStyles}
          onPress={onPress}
          noPadding
        >
          <View style={styles.conversationHeader}>
            <View style={styles.conversationInfo}>
              <View style={styles.titleRow}>
                <Text style={styles.conversationTitle} numberOfLines={1}>
                  {conversation.title}
                </Text>
                {conversation.isFavorite && (
                  <Ionicons
                    name="heart"
                    size={16}
                    color={theme.colors.error[500]}
                    style={styles.favoriteIcon}
                  />
                )}
              </View>
              
              {lastMessage && (
                <Text style={styles.lastMessage} numberOfLines={2}>
                  {lastMessage.message}
                </Text>
              )}
              
              <View style={styles.conversationMeta}>
                <Text style={styles.conversationDate}>
                  {formattedDate}
                </Text>
                <Text style={styles.messageCount}>
                  {conversation.messageCount} mensajes
                </Text>
                {conversation.specialist && (
                  <View style={styles.specialistBadge}>
                    <Text style={styles.specialistText}>{conversation.specialist}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.conversationActions}>
              <IconButton
                icon={
                  <Ionicons
                    name={conversation.isFavorite ? "heart" : "heart-outline"}
                    size={20}
                    color={conversation.isFavorite ? theme.colors.error[500] : theme.colors.text.secondary}
                  />
                }
                onPress={onFavorite}
                variant="ghost"
                size="sm"
              />
              
              <IconButton
                icon={
                  <Ionicons
                    name={conversation.isArchived ? "unarchive" : "archive"}
                    size={20}
                    color={theme.colors.text.secondary}
                  />
                }
                onPress={onArchive}
                variant="ghost"
                size="sm"
              />
              
              <IconButton
                icon={
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color={theme.colors.error[500]}
                  />
                }
                onPress={onDelete}
                variant="ghost"
                size="sm"
              />
            </View>
          </View>
        </Card>
      </Animated.View>
    );
  };

  // ========================================
  // COMPONENTE DE FILTROS
  // ========================================
  const FilterButton = ({ filter, label, count }: { filter: FilterType; label: string; count?: number }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        activeFilter === filter && styles.filterButtonActive
      ]}
      onPress={() => setActiveFilter(filter)}
    >
      <Text
        style={[
          styles.filterButtonText,
          activeFilter === filter && styles.filterButtonTextActive
        ]}
      >
        {label} {count !== undefined && `(${count})`}
      </Text>
    </TouchableOpacity>
  );

  // ========================================
  // RENDER PRINCIPAL
  // ========================================
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Loading text="Cargando conversaciones..." overlay />
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
          <Text style={styles.headerTitle}>Conversaciones</Text>
          <View style={styles.headerStats}>
            <Text style={styles.headerStatsText}>
              {stats.total} conversaciones
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Barra de búsqueda */}
      <View style={styles.searchSection}>
        <Input
          placeholder="Buscar conversaciones..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          icon={
            <Ionicons
              name="search"
              size={20}
              color={theme.colors.text.secondary}
            />
          }
          style={styles.searchInput}
        />
        
        <IconButton
          icon={
            <Ionicons
              name="options"
              size={20}
              color={theme.colors.text.primary}
            />
          }
          onPress={() => setShowFilters(!showFilters)}
          variant="outlined"
          color={theme.colors.primary[500]}
        />
      </View>

      {/* Filtros */}
      {showFilters && (
        <Animated.View entering={FadeIn} style={styles.filtersSection}>
          <View style={styles.filterRow}>
            <FilterButton filter="all" label="Todas" count={stats.total - stats.archived} />
            <FilterButton filter="favorites" label="Favoritas" count={stats.favorites} />
            <FilterButton filter="archived" label="Archivadas" count={stats.archived} />
          </View>
          
          <View style={styles.sortRow}>
            <Text style={styles.sortLabel}>Ordenar por:</Text>
            <TouchableOpacity
              style={[styles.sortButton, sortBy === 'recent' && styles.sortButtonActive]}
              onPress={() => setSortBy('recent')}
            >
              <Text style={styles.sortButtonText}>Reciente</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortButton, sortBy === 'oldest' && styles.sortButtonActive]}
              onPress={() => setSortBy('oldest')}
            >
              <Text style={styles.sortButtonText}>Antigua</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortButton, sortBy === 'alphabetical' && styles.sortButtonActive]}
              onPress={() => setSortBy('alphabetical')}
            >
              <Text style={styles.sortButtonText}>A-Z</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Lista de conversaciones */}
      {filteredAndSortedConversations.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons
            name="chatbubbles-outline"
            size={64}
            color={theme.colors.text.tertiary}
          />
          <Text style={styles.emptyStateTitle}>
            {searchQuery ? 'No se encontraron conversaciones' : 'No hay conversaciones'}
          </Text>
          <Text style={styles.emptyStateText}>
            {searchQuery
              ? 'Intenta con otros términos de búsqueda'
              : 'Inicia una nueva conversación para comenzar'
            }
          </Text>
          {!searchQuery && (
            <Button
              title="Nueva conversación"
              onPress={() => {/* Navegar a nueva conversación */}}
              icon={<Ionicons name="add" size={20} color="#ffffff" />}
              style={styles.emptyStateButton}
            />
          )}
        </View>
      ) : (
        <FlatList
          data={filteredAndSortedConversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ConversationItem
              conversation={item}
              onPress={() => handleConversationPress(item)}
              onDelete={() => handleDeleteConversation(item)}
              onFavorite={() => handleToggleFavorite(item)}
              onArchive={() => handleToggleArchive(item)}
            />
          )}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary[500]}
            />
          }
        />
      )}
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
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
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
  headerStats: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  headerStatsText: {
    color: '#ffffff',
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '500',
  },
  searchSection: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
  },
  filtersSection: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface.secondary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  filterButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface.tertiary,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary[500],
  },
  filterButtonText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  sortLabel: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
    marginRight: theme.spacing.xs,
  },
  sortButton: {
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  sortButtonActive: {
    backgroundColor: theme.colors.primary[100],
  },
  sortButtonText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
  },
  listContainer: {
    padding: theme.spacing.md,
  },
  conversationCard: {
    marginBottom: theme.spacing.sm,
  },
  conversationHeader: {
    flexDirection: 'row',
    padding: theme.spacing.md,
  },
  conversationInfo: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  conversationTitle: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.text.primary,
    flex: 1,
  },
  favoriteIcon: {
    marginLeft: theme.spacing.xs,
  },
  lastMessage: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
    lineHeight: 18,
  },
  conversationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  conversationDate: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.tertiary,
  },
  messageCount: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.tertiary,
  },
  specialistBadge: {
    backgroundColor: theme.colors.primary[100],
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  specialistText: {
    fontSize: 10,
    color: theme.colors.primary[700],
    fontWeight: '500',
  },
  conversationActions: {
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  emptyStateTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight as any,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  emptyStateText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    lineHeight: 22,
  },
  emptyStateButton: {
    marginTop: theme.spacing.md,
  },
});