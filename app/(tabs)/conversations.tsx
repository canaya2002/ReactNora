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
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  FadeIn,
  Layout
} from 'react-native-reanimated';

// Hooks y contextos
import { useAuth } from '../../src/contexts/AuthContext';
import { useConversations } from '../../src/contexts/ConversationContext';
import { useAsyncOperation } from '../../src/hooks';

// Componentes
import { IconButton, Input, CustomModal, Loading } from '../../src/components/base';

// Estilos y tipos
import { theme } from '../../src/styles/theme';
import { Conversation, FilterType, SortType, SPECIALISTS } from '../../src/lib/types';

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
  const lastMessage = conversation.messages[conversation.messages.length - 1];
  const specialist = SPECIALISTS.find(s => s.id === conversation.specialist);

  return (
    <Animated.View layout={Layout.springify()}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.conversationCard}>
        <View style={styles.conversationHeader}>
          <View style={styles.conversationInfo}>
            <View style={styles.titleRow}>
              {specialist && (
                <View style={[styles.specialistDot, { backgroundColor: specialist.color }]} />
              )}
              <Text style={styles.conversationTitle} numberOfLines={1}>
                {conversation.title}
              </Text>
            </View>
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
            {conversation.isFavorite && (
              <Ionicons name="heart" size={16} color={theme.colors.red[500]} style={{ marginTop: 4 }} />
            )}
          </View>
        </View>
        <View style={styles.conversationActions}>
          <IconButton icon={<Ionicons name={conversation.isFavorite ? "heart" : "heart-outline"} size={18} color={conversation.isFavorite ? theme.colors.red[500] : theme.colors.text.tertiary} />} onPress={onFavorite} variant="ghost" size="sm" />
          <IconButton icon={<Ionicons name={conversation.isArchived ? "archive" : "archive-outline"} size={18} color={theme.colors.text.tertiary} />} onPress={onArchive} variant="ghost" size="sm" />
          <IconButton icon={<Ionicons name="share-outline" size={18} color={theme.colors.text.tertiary} />} onPress={onShare} variant="ghost" size="sm" />
          <IconButton icon={<Ionicons name="trash-outline" size={18} color={theme.colors.error} />} onPress={onDelete} variant="ghost" size="sm" />
        </View>
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
    loading,
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

  const [sortBy, setSortBy] = useState<SortType>('recent');
  const [showFilters, setShowFilters] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);

  const { execute: executeDelete } = useAsyncOperation();

  const sortedConversations = useMemo(() => {
    return [...filteredConversations].sort((a, b) => {
      switch (sortBy) {
        case 'oldest': return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        case 'alphabetical': return a.title.localeCompare(b.title);
        case 'recent':
        default: return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });
  }, [filteredConversations, sortBy]);

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  const handleDeleteConversation = (conversationId: string, title: string) => {
    Alert.alert(
      'Eliminar conversación',
      `¿Estás seguro de que quieres eliminar "${title}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => executeDelete(() => deleteConversation(conversationId)) }
      ]
    );
  };

  const handleConversationPress = (conversation: Conversation) => {
    selectConversation(conversation);
    router.push('/(tabs)');
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubbles-outline" size={64} color={theme.colors.gray[400]} />
      <Text style={styles.emptyTitle}>No hay conversaciones</Text>
      <Text style={styles.emptySubtitle}>
        {filterStatus === 'favorites' ? 'Aún no tienes conversaciones favoritas.' :
         filterStatus === 'archived' ? 'No tienes conversaciones archivadas.' :
         'Inicia un nuevo chat para comenzar.'}
      </Text>
    </View>
  );

  const renderFilterChips = () => (
    <View style={styles.filterChips}>
      {(['all', 'favorites', 'archived'] as FilterType[]).map((filter) => (
        <TouchableOpacity
          key={filter}
          style={[styles.filterChip, filterStatus === filter && styles.activeFilterChip]}
          onPress={() => setFilterStatus(filter)}
        >
          <Text style={[styles.filterChipText, filterStatus === filter && styles.activeFilterChipText]}>
            {filter === 'all' ? 'Todas' : filter === 'favorites' ? 'Favoritas' : 'Archivadas'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Conversaciones</Text>
        <View style={styles.headerActions}>
          <IconButton icon={<Ionicons name="funnel-outline" size={20} color={theme.colors.text.primary} />} onPress={() => setShowFilters(!showFilters)} size="sm" variant="ghost" />
          <IconButton icon={<Ionicons name="swap-vertical" size={20} color={theme.colors.text.primary} />} onPress={() => setShowSortModal(true)} size="sm" variant="ghost" />
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Input
          placeholder="Buscar en conversaciones..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          icon={<Ionicons name="search-outline" size={20} color={theme.colors.text.tertiary} />}
        />
      </View>

      {showFilters && (
        <Animated.View entering={FadeInDown} style={styles.filtersContainer}>
          {renderFilterChips()}
        </Animated.View>
      )}

      {loading && sortedConversations.length === 0 ? (
        <View style={styles.emptyState}>
            <Loading text="Cargando tus conversaciones..." />
        </View>
      ) : (
        <FlatList
          data={sortedConversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ConversationItem
              conversation={item}
              onPress={() => handleConversationPress(item)}
              onDelete={() => handleDeleteConversation(item.id, item.title)}
              onFavorite={() => toggleFavorite(item.id)}
              onArchive={() => toggleArchive(item.id)}
              onShare={() => shareConversation(item.id)}
            />
          )}
          contentContainerStyle={[
            styles.listContainer,
            sortedConversations.length === 0 && styles.emptyListContainer
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadConversations} tintColor={theme.colors.primary[500]} />}
          ListEmptyComponent={!loading ? renderEmptyState : null}
        />
      )}

      <CustomModal visible={showSortModal} onClose={() => setShowSortModal(false)} title="Ordenar por">
        <View style={styles.sortOptions}>
          {([
            { key: 'recent', label: 'Más recientes' },
            { key: 'oldest', label: 'Más antiguos' },
            { key: 'alphabetical', label: 'Alfabéticamente (A-Z)' }
          ] as const).map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[styles.sortOption, sortBy === option.key && styles.selectedSortOption]}
              onPress={() => { setSortBy(option.key); setShowSortModal(false); }}
            >
              <Text style={[styles.sortOptionText, sortBy === option.key && styles.selectedSortOptionText]}>{option.label}</Text>
              {sortBy === option.key && <Ionicons name="checkmark" size={20} color={theme.colors.primary[500]} />}
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
  const d = new Date(date);
  const diffSeconds = Math.round((now.getTime() - d.getTime()) / 1000);
  if (diffSeconds < 60) return 'Ahora';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h`;
  if (diffSeconds < 604800) return d.toLocaleDateString('es-ES', { weekday: 'short' });
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

// ========================================
// ESTILOS
// ========================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
  },
  headerTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary
  },
  headerActions: {
    flexDirection: 'row',
  },
  searchContainer: {
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[3]
  },
  filtersContainer: {
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[3]
  },
  filterChips: {
    flexDirection: 'row',
    gap: theme.spacing[2]
  },
  filterChip: {
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[2],
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.full
  },
  activeFilterChip: {
    backgroundColor: theme.colors.primary[500]
  },
  filterChipText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeight.medium
  },
  activeFilterChipText: {
    color: 'white'
  },
  listContainer: {
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.layout.tabBarHeight + theme.spacing[4],
  },
  emptyListContainer: {
    flex: 1,
  },
  conversationCard: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    marginBottom: theme.spacing[3],
  },
  conversationHeader: {
    flexDirection: 'row',
    marginBottom: theme.spacing[3]
  },
  conversationInfo: {
    flex: 1,
    marginRight: theme.spacing[3]
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    marginBottom: theme.spacing[1]
  },
  specialistDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  conversationTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '600',
    color: theme.colors.text.primary,
    flex: 1
  },
  lastMessageText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
    lineHeight: 20
  },
  conversationMeta: {
    alignItems: 'flex-end',
    gap: theme.spacing[1]
  },
  timeText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary
  },
  conversationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: theme.spacing[2],
    marginTop: theme.spacing[2],
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.secondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
    opacity: 0.7,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[2]
  },
  emptySubtitle: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24
  },
  sortOptions: {
    gap: theme.spacing[2]
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    borderRadius: theme.borderRadius.md,
  },
  selectedSortOption: {
    backgroundColor: theme.colors.primary[900]
  },
  sortOptionText: {
    fontSize: 16,
    color: theme.colors.text.secondary
  },
  selectedSortOptionText: {
    color: theme.colors.primary[300],
    fontWeight: '600'
  }
});