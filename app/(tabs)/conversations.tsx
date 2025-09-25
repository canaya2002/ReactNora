// app/(tabs)/conversations.tsx - PANTALLA DE CONVERSACIONES (CORREGIDA)
import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  RefreshControl,
  Share
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
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
import { Conversation, ChatMessage, FilterType, SortType, SPECIALISTS } from '../../src/lib/types';

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
  onShare: () => void;
}

// ========================================
// COMPONENTE CONVERSACIÓN ITEM
// ========================================
const ConversationItem = React.memo(({ 
  conversation, 
  onPress, 
  onDelete, 
  onFavorite, 
  onArchive,
  onShare 
}: ConversationItemProps) => {
  const scale = useSharedValue(1);
  
  const lastMessage = conversation.messages[conversation.messages.length - 1];
  const specialist = SPECIALISTS.find(s => s.id === conversation.specialist);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <Animated.View style={animatedStyle} layout={Layout.springify()}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <Card style={styles.conversationCard}>
          <View style={styles.conversationHeader}>
            <View style={styles.conversationInfo}>
              <View style={styles.titleRow}>
                <Text style={styles.conversationTitle} numberOfLines={1}>
                  {conversation.title}
                </Text>
                {conversation.isFavorite && (
                  <Ionicons name="heart" size={16} color={theme.colors.red[500]} />
                )}
              </View>
              
              {specialist && (
                <View style={styles.specialistRow}>
                  <View style={[styles.specialistDot, { backgroundColor: specialist.color }]} />
                  <Text style={styles.specialistText}>{specialist.name}</Text>
                </View>
              )}
              
              {lastMessage && (
                <Text style={styles.lastMessageText} numberOfLines={2}>
                  {lastMessage.content || lastMessage.message}
                </Text>
              )}
            </View>
            
            <View style={styles.conversationMeta}>
              <Text style={styles.timeText}>
                {formatTime(conversation.updatedAt)}
              </Text>
              <View style={styles.messageCount}>
                <Text style={styles.messageCountText}>
                  {conversation.messageCount}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.conversationActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={onFavorite}
            >
              <Ionicons 
                name={conversation.isFavorite ? "heart" : "heart-outline"} 
                size={18} 
                color={conversation.isFavorite ? theme.colors.red[500] : theme.colors.gray[500]} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={onArchive}
            >
              <Ionicons 
                name={conversation.isArchived ? "archive" : "archive"} 
                size={18} 
                color={theme.colors.gray[500]} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={onShare}
            >
              <Ionicons name="share-outline" size={18} color={theme.colors.gray[500]} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={onDelete}
            >
              <Ionicons name="trash-outline" size={18} color={theme.colors.red[500]} />
            </TouchableOpacity>
          </View>
        </Card>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ========================================
// COMPONENTE PRINCIPAL
// ========================================
export default function ConversationsScreen() {
  const { user } = useAuth();
  const {
    conversations,
    loading, // CORREGIDO: Usar 'loading' en lugar de 'isLoading'
    deleteConversation,
    toggleFavorite,
    toggleArchive,
    selectConversation,
    loadConversations,
    filteredConversations,
    setSearchTerm,
    searchTerm,
    setFilterStatus,
    filterStatus,
    shareConversation
  } = useConversations();

  // Estados locales
  const [sortBy, setSortBy] = useState<SortType>('recent');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);

  // Hook para operaciones async
  const { execute: executeDelete, isLoading: isDeleting } = useAsyncOperation();
  const { execute: executeFavorite, isLoading: isFavoriting } = useAsyncOperation();
  const { execute: executeArchive, isLoading: isArchiving } = useAsyncOperation();

  // ========================================
  // CONVERSACIONES ORDENADAS Y FILTRADAS
  // ========================================
  const sortedConversations = useMemo(() => {
    let sorted = [...filteredConversations];
    
    switch (sortBy) {
      case 'recent':
        sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
      case 'oldest':
        sorted.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
        break;
      case 'alphabetical':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default:
        break;
    }
    
    return sorted;
  }, [filteredConversations, sortBy]);

  // ========================================
  // EFECTOS
  // ========================================
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user, loadConversations]);

  // ========================================
  // FUNCIONES DE ACCIÓN
  // ========================================
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadConversations();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDeleteConversation = (conversationId: string, title: string) => {
    Alert.alert(
      'Eliminar conversación',
      `¿Estás seguro de que quieres eliminar "${title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            executeDelete(async () => {
              await deleteConversation(conversationId);
            });
          }
        }
      ]
    );
  };

  const handleFavoriteConversation = (conversationId: string) => {
    executeFavorite(async () => {
      await toggleFavorite(conversationId);
    });
  };

  const handleArchiveConversation = (conversationId: string) => {
    executeArchive(async () => {
      await toggleArchive(conversationId);
    });
  };

  const handleShareConversation = async (conversationId: string) => {
    try {
      await shareConversation(conversationId);
    } catch (error) {
      console.error('Error sharing conversation:', error);
    }
  };

  const handleConversationPress = (conversation: Conversation) => {
    selectConversation(conversation);
    // Aquí podrías navegar a la pantalla de chat
    // navigation.navigate('Chat', { conversationId: conversation.id });
  };

  // ========================================
  // RENDERIZADO
  // ========================================
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubbles-outline" size={64} color={theme.colors.gray[400]} />
      <Text style={styles.emptyTitle}>No hay conversaciones</Text>
      <Text style={styles.emptySubtitle}>
        {filterStatus === 'favorites' ? 'No tienes conversaciones favoritas' :
         filterStatus === 'archived' ? 'No tienes conversaciones archivadas' :
         'Inicia una nueva conversación para comenzar'}
      </Text>
    </View>
  );

  const renderFilterChips = () => (
    <View style={styles.filterChips}>
      {(['all', 'favorites', 'archived'] as FilterType[]).map((filter) => (
        <TouchableOpacity
          key={filter}
          style={[
            styles.filterChip,
            filterStatus === filter && styles.activeFilterChip
          ]}
          onPress={() => setFilterStatus(filter)}
        >
          <Text style={[
            styles.filterChipText,
            filterStatus === filter && styles.activeFilterChipText
          ]}>
            {filter === 'all' ? 'Todas' : 
             filter === 'favorites' ? 'Favoritas' : 'Archivadas'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Debes iniciar sesión para ver las conversaciones</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Conversaciones</Text>
        <View style={styles.headerActions}>
          <IconButton
            icon="funnel-outline"
            onPress={() => setShowFilters(!showFilters)}
            size="sm"
          />
          <IconButton
            icon="swap-vertical"
            onPress={() => setShowSortModal(true)}
            size="sm"
          />
        </View>
      </View>

      {/* Barra de búsqueda */}
      <View style={styles.searchContainer}>
        <Input
          placeholder="Buscar conversaciones..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          style={styles.searchInput}
        />
      </View>

      {/* Filtros */}
      {showFilters && (
        <Animated.View entering={FadeInDown} style={styles.filtersContainer}>
          {renderFilterChips()}
        </Animated.View>
      )}

      {/* Lista de conversaciones */}
      <FlatList
        data={sortedConversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConversationItem
            conversation={item}
            onPress={() => handleConversationPress(item)}
            onDelete={() => handleDeleteConversation(item.id, item.title)}
            onFavorite={() => handleFavoriteConversation(item.id)}
            onArchive={() => handleArchiveConversation(item.id)}
            onShare={() => handleShareConversation(item.id)}
          />
        )}
        contentContainerStyle={[
          styles.listContainer,
          sortedConversations.length === 0 && styles.emptyListContainer
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary[500]}
          />
        }
        ListEmptyComponent={renderEmptyState}
      />

      {/* Indicador de carga */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <Loading size="large" />
        </View>
      )}

      {/* Modal de ordenamiento */}
      <CustomModal
        visible={showSortModal}
        onClose={() => setShowSortModal(false)}
        title="Ordenar por"
      >
        <View style={styles.sortOptions}>
          {([
            { key: 'recent', label: 'Más recientes' },
            { key: 'oldest', label: 'Más antiguos' },
            { key: 'alphabetical', label: 'Alfabéticamente' }
          ] as const).map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.sortOption,
                sortBy === option.key && styles.selectedSortOption
              ]}
              onPress={() => {
                setSortBy(option.key);
                setShowSortModal(false);
              }}
            >
              <Text style={[
                styles.sortOptionText,
                sortBy === option.key && styles.selectedSortOptionText
              ]}>
                {option.label}
              </Text>
              {sortBy === option.key && (
                <Ionicons name="checkmark" size={20} color={theme.colors.primary[500]} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </CustomModal>
    </SafeAreaView>
  );
}

// ========================================
// FUNCIONES AUXILIARES
// ========================================
function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) {
    return new Date(date).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } else if (days === 1) {
    return 'Ayer';
  } else if (days < 7) {
    return `${days} días`;
  } else {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit'
    });
  }
}

// ========================================
// ESTILOS
// ========================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.gray[50]
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200]
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.gray[900]
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white'
  },
  searchInput: {
    backgroundColor: theme.colors.gray[50]
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200]
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.gray[100],
    borderRadius: 20
  },
  activeFilterChip: {
    backgroundColor: theme.colors.primary[500]
  },
  filterChipText: {
    fontSize: 14,
    color: theme.colors.gray[600],
    fontWeight: '500'
  },
  activeFilterChipText: {
    color: 'white'
  },
  listContainer: {
    padding: 16,
    gap: 12
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center'
  },
  conversationCard: {
    padding: 16,
    marginHorizontal: 0,
    marginVertical: 0
  },
  archivedCard: {
    opacity: 0.7,
    backgroundColor: theme.colors.gray[100]
  },
  conversationHeader: {
    flexDirection: 'row',
    marginBottom: 12
  },
  conversationInfo: {
    flex: 1,
    marginRight: 12
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.gray[900],
    flex: 1
  },
  specialistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4
  },
  specialistDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  specialistText: {
    fontSize: 12,
    color: theme.colors.gray[600]
  },
  lastMessageText: {
    fontSize: 14,
    color: theme.colors.gray[600],
    lineHeight: 20
  },
  conversationMeta: {
    alignItems: 'flex-end',
    gap: 4
  },
  timeText: {
    fontSize: 12,
    color: theme.colors.gray[500]
  },
  messageCount: {
    backgroundColor: theme.colors.primary[500],
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center'
  },
  messageCountText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600'
  },
  conversationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[100]
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.gray[50]
  },
  emptyState: {
    alignItems: 'center',
    padding: 32
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.gray[700],
    marginTop: 16,
    marginBottom: 8
  },
  emptySubtitle: {
    fontSize: 16,
    color: theme.colors.gray[500],
    textAlign: 'center',
    lineHeight: 24
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.gray[500],
    textAlign: 'center'
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  sortOptions: {
    gap: 8
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.gray[50]
  },
  selectedSortOption: {
    backgroundColor: theme.colors.primary[50],
    borderWidth: 1,
    borderColor: theme.colors.primary[200]
  },
  sortOptionText: {
    fontSize: 16,
    color: theme.colors.gray[700]
  },
  selectedSortOptionText: {
    color: theme.colors.primary[600],
    fontWeight: '600'
  }
});