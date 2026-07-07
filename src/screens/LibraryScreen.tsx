// 收藏库 v3 — 文件夹管理 + 双源支持
// @author Jason

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Alert,
  RefreshControl, TextInput, Modal,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { useLegacyColors, LegacyColors, Radius, Spacing, FontSize, Shadow } from '../theme';
import { useAuthStore } from '../store/useAuth';
import { useFavoritesStore } from '../store/useFavorites';
import { fetchFavorites, getCoverUrl as getCover, createFolder as apiCreateFolder, deleteFolder as apiDeleteFolder, renameFolder as apiRenameFolder } from '../api/endpoints';
import { myFavourites, myLikes } from '../pica/endpoints';
import type { FavoriteItem, FavoriteFolder } from '../api/types';
import type { PicaComic } from '../pica/types';

type LibraryParams = {
  source?: 'jm' | 'pica';
  type?: 'favorite' | 'like';
};

export function LibraryScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<RouteProp<{ Library: LibraryParams }, 'Library'>>();
  const source = route.params?.source || 'jm';
  const type = route.params?.type || 'favorite';
  const { t } = useTranslation();
  const C = useLegacyColors();
  const styles = useMemo(() => getStyles(C), [C]);
  const { loggedIn } = useAuthStore();
  const { local, loadLocal, folders, createFolder, renameFolder, deleteFolder, loadFolders } = useFavoritesStore();
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');

  const title = source === 'pica'
    ? (type === 'like' ? 'Pica 喜欢' : 'Pica 收藏')
    : (type === 'like' ? '我的喜欢' : '我的收藏');

  const loadData = useCallback(async (silent = false) => {
    // Pica 源：API + 本地合并
    if (source === 'pica') {
      try {
        setLoading(true);
        const d = type === 'like' ? await myLikes() : await myFavourites();
        const data = (d as any).comics || d;
        const cloudDocs = (data.docs || []).map((c: any) => ({
          ...c,
          _source: 'cloud' as const,
        }));
        const cloudIds = new Set(cloudDocs.map((c: any) => c._id));
        const localItems = local.filter((l: any) => !cloudIds.has(l.id)).map((f: any) => ({ ...f, _source: 'local' as const }));
        setItems([...cloudDocs, ...localItems]);
        setTotal(cloudDocs.length + localItems.length);
      } catch {}
      if (!silent) setLoading(false);
      return;
    }

    // JM 源：本地 + 云端合并
    await loadLocal();
    let cloudItems: any[] = [];
    const storeState = useFavoritesStore.getState();
    let localItems = storeState.local.map((f: any) => ({ ...f, _source: 'local' as const }));

    if (loggedIn) {
      try {
        const o = type === 'like' ? 'ml' : 'mr';
        const folderId = selectedFolder || '0';
        const d = await fetchFavorites({ page: 1, o, folder_id: folderId });
        cloudItems = (d.list || []).map((f: any) => ({ ...f, _source: 'cloud' as const }));
        const cloudIds = new Set(cloudItems.map((c: any) => c.id));
        localItems = localItems.filter((l: any) => !cloudIds.has(l.id));
      } catch {}
    }

    setItems([...cloudItems, ...localItems]);
    setTotal(cloudItems.length + localItems.length);
    if (!silent) setLoading(false);
  }, [loggedIn, source, type, loadLocal, selectedFolder]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [loggedIn, source, type, selectedFolder, loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  }, [loadData]);

  const displayItems: any[] = source === 'jm' && items.length === 0 ? local : items;

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await createFolder(newFolderName.trim());
      setNewFolderName('');
      setShowNewFolder(false);
      loadData(true);
    } catch {}
  };

  const handleRenameFolder = async () => {
    if (!renameFolderId || !renameText.trim()) return;
    try {
      await renameFolder(renameFolderId, renameText.trim());
      setRenameFolderId(null);
      setRenameText('');
      loadData(true);
    } catch {}
  };

  const handleDeleteFolder = (fid: string) => {
    Alert.alert('删除文件夹', '确定删除？文件夹内的收藏不会丢失', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: async () => {
        await deleteFolder(fid);
        if (selectedFolder === fid) setSelectedFolder(null);
        loadData(true);
      }},
    ]);
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.cont}>
      <FlashList
        data={displayItems}
        estimatedItemSize={120}
        keyExtractor={(i) => i.id || i._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />}
        contentContainerStyle={{ padding: Spacing.marginEdge, paddingBottom: 100 }}
        ListHeaderComponent={
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={styles.title}>{selectedFolder ? folders.find(f => (f.FID || f.folder_id) === selectedFolder)?.name || title : title}</Text>
              <Text style={styles.total}>{t('library.total', { n: total || displayItems.length })}</Text>
            </View>

            {/* 文件夹列表 */}
            {source === 'jm' && type === 'favorite' && (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                  {/* "全部" 按钮 */}
                  <Pressable
                    onPress={() => setSelectedFolder(null)}
                    style={[styles.folderChip, selectedFolder === null && styles.folderChipActive]}
                  >
                    <MaterialIcons name="view-list" size={14} color={selectedFolder === null ? '#fff' : C.primary} style={{ marginRight: 4 }} />
                    <Text style={[styles.folderChipText, selectedFolder === null && { color: '#fff' }]}>全部</Text>
                  </Pressable>
                  {folders.map((f) => {
                    const fid = f.FID || f.folder_id;
                    const isActive = fid === selectedFolder;
                    return (
                      <Pressable
                        key={fid}
                        onPress={() => setSelectedFolder(fid || null)}
                        onLongPress={() => {
                          setRenameText(f.name);
                          setRenameFolderId(fid || null);
                        }}
                        style={[styles.folderChip, isActive && styles.folderChipActive]}
                      >
                        <MaterialIcons name="folder" size={14} color={isActive ? '#fff' : C.primary} style={{ marginRight: 4 }} />
                        <Text style={[styles.folderChipText, isActive && { color: '#fff' }]}>{f.name}</Text>
                        {f.count ? <Text style={[styles.folderCount, isActive && { color: 'rgba(255,255,255,0.7)' }]}>{f.count}</Text> : null}
                      </Pressable>
                    );
                  })}
                  <Pressable onPress={() => setShowNewFolder(true)} style={styles.folderAddBtn}>
                    <MaterialIcons name="add" size={18} color={C.primary} />
                  </Pressable>
                </ScrollView>

                {/* 重命名输入行 */}
                {renameFolderId && (
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'center' }}>
                    <TextInput
                      style={styles.inlineInput}
                      value={renameText}
                      onChangeText={setRenameText}
                      placeholder="重命名文件夹"
                      placeholderTextColor={C.textTertiary}
                      onSubmitEditing={handleRenameFolder}
                      autoFocus
                    />
                    <Pressable onPress={handleRenameFolder} style={styles.inlineBtn}>
                      <MaterialIcons name="check" size={20} color="#fff" />
                    </Pressable>
                    <Pressable onPress={() => setRenameFolderId(null)}>
                      <MaterialIcons name="close" size={20} color={C.textSecondary} />
                    </Pressable>
                    <Pressable onPress={() => renameFolderId && handleDeleteFolder(renameFolderId)}>
                      <MaterialIcons name="delete-outline" size={20} color={C.error} />
                    </Pressable>
                  </View>
                )}
              </>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const isPica = source === 'pica';
          const comicId = isPica ? (item as PicaComic)._id : (item as FavoriteItem).id;
          const coverUrl = isPica
            ? (item as PicaComic).thumb?.fileServer?.replace('picacomic', 'go2778') + '/static/' + (item as PicaComic).thumb?.path
            : (item as any).image || getCover(comicId);
          return (
            <Pressable
              onPress={() => nav.navigate(isPica ? 'PicaDetail' : 'ComicDetail', { albumId: comicId })}
              style={styles.item}
            >
              <Image
                source={{ uri: coverUrl }}
                style={styles.itemCover}
                contentFit="cover"
              />
              <View style={{ flex: 1, marginLeft: 12, justifyContent: 'center' }}>
                <Text style={styles.itemTitle} numberOfLines={2}>
                  {isPica ? (item as PicaComic).title : (item as any).name || (item as any).title}
                </Text>
                {(item as any).author && <Text style={styles.itemAuthor}>{(item as any).author}</Text>}
              </View>
              {(item as any)._source && (
                <View style={{ position: 'absolute', top: 4, right: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: (item as any)._source === 'cloud' ? 'rgba(232,93,58,0.15)' : 'rgba(255,255,255,0.1)' }}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: (item as any)._source === 'cloud' ? '#E85D3A' : '#9895A0' }}>
                    {(item as any)._source === 'cloud' ? '云端' : '本地'}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 80 }}>
            <MaterialIcons name="bookmark-border" size={48} color={C.textTertiary} />
            <Text style={{ color: C.textSecondary, marginTop: 12, fontSize: FontSize.body }}>
              {source === 'pica' ? '暂无内容' : t('library.empty')}
            </Text>
          </View>
        }
      />

      {/* 新建文件夹 Modal */}
      <Modal visible={showNewFolder} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalDialog}>
            <Text style={{ color: C.textPrimary, fontSize: FontSize.bodyLarge, fontWeight: '700', marginBottom: 12, textAlign: 'center' }}>新建文件夹</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="文件夹名称"
              placeholderTextColor={C.textTertiary}
              value={newFolderName}
              onChangeText={setNewFolderName}
              onSubmitEditing={handleCreateFolder}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16, justifyContent: 'center' }}>
              <Pressable onPress={() => { setShowNewFolder(false); setNewFolderName(''); }} style={[styles.dialogBtn, { backgroundColor: C.surfaceLight }]}>
                <Text style={{ color: C.textSecondary, fontWeight: '600' }}>取消</Text>
              </Pressable>
              <Pressable onPress={handleCreateFolder} disabled={!newFolderName.trim()} style={[styles.dialogBtn, { backgroundColor: newFolderName.trim() ? C.primary : C.surfaceContainer }]}>
                <Text style={{ color: newFolderName.trim() ? '#fff' : C.textTertiary, fontWeight: '600' }}>创建</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function getStyles(C: LegacyColors) {
  return StyleSheet.create({
    cont: { flex: 1, backgroundColor: C.background },
    title: { fontSize: FontSize.largeTitle, fontWeight: '800', color: C.textPrimary },
    total: { color: C.textSecondary, fontSize: FontSize.body },
    folderChip: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.xl,
      backgroundColor: C.surface, marginRight: 8,
      borderWidth: 1, borderColor: C.border,
    },
    folderChipActive: {
      backgroundColor: C.primary, borderColor: C.primary,
    },
    folderChipText: { fontSize: FontSize.label, color: C.textSecondary, fontWeight: '500' },
    folderCount: { fontSize: FontSize.caption, color: C.textTertiary, marginLeft: 4 },
    folderAddBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
      justifyContent: 'center', alignItems: 'center',
    },
    inlineInput: {
      flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: Radius.sm,
      paddingHorizontal: 12, paddingVertical: 6, color: C.textPrimary,
      fontSize: FontSize.body, backgroundColor: C.surface,
    },
    inlineBtn: {
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center',
    },
    item: {
      flexDirection: 'row',
      backgroundColor: C.surface, borderRadius: Radius.card,
      padding: 12, marginBottom: 10,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2, shadowRadius: 4, elevation: 2,
    },
    itemCover: { width: 60, height: 80, borderRadius: Radius.sm, backgroundColor: C.surfaceContainer },
    itemTitle: { fontWeight: '600', color: C.textPrimary, fontSize: FontSize.body },
    itemAuthor: { fontSize: FontSize.label, color: C.textSecondary, marginTop: 4 },
    modalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center', alignItems: 'center',
    },
    modalDialog: {
      backgroundColor: C.surface, borderRadius: Radius.lg,
      padding: 24, width: '80%', maxWidth: 340,
    },
    modalInput: {
      borderWidth: 1, borderColor: C.border, borderRadius: Radius.sm,
      paddingHorizontal: 14, paddingVertical: 10, color: C.textPrimary,
      fontSize: FontSize.body, backgroundColor: C.surfaceContainer,
    },
    dialogBtn: {
      paddingHorizontal: 24, paddingVertical: 10, borderRadius: Radius.chip,
    },
  });
}
