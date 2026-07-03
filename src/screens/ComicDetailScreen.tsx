// 漫画详情 v2 — 暖琥珀暗色重设计
// 3-Tab: 简介 | 章节（分组） | 评论 + 购买 + 分享 + 阅读历史
// @author nyx

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator,
  Alert, TextInput, Modal, Share, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useLegacyColors, LegacyColors, Radius, Spacing, FontSize } from '../theme';
import { fetchAlbumDetail, fetchComicRead, fetchComments, postComment, buyAlbum, getCoverUrl, getImgHost } from '../api/endpoints';
import { jmLogger } from '../utils/JmLogger';
import { useFavoritesStore } from '../store/useFavorites';
import { useReaderStore } from '../store/useReader';
import { useHistoryStore } from '../store/useHistory';
import { HtmlText } from '../components/HtmlText';
import { useAuthStore } from '../store/useAuth';
import { chunkArray } from '../utils/helpers';
// DebugOverlay moved to App.tsx
import type { AlbumDetail, Episode, CommentItem as ApiComment } from '../api/types';

export function ComicDetailScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { albumId } = route.params || {};
  if (!albumId) { jmLogger.err('ComicDetailScreen: albumId is undefined'); }
  const { t } = useTranslation();
  const { loggedIn } = useAuthStore();
  const C = useLegacyColors();
  const { width: winW } = useWindowDimensions();
  const styles = useMemo(() => getStyles(C), [C]);

  const [detail, setDetail] = useState<AlbumDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(1);
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [commentTotal, setCommentTotal] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [showShare, setShowShare] = useState(false);
  const [showBuy, setShowBuy] = useState(false);
  const [seriesGroups, setSeriesGroups] = useState<Episode[][]>([]);
  const [groupIdx, setGroupIdx] = useState(0);
  const { isFav, addLocal, removeLocal, folders, createFolder, deleteFolder, renameFolder, moveToFolder, loadFolders, toggle } = useFavoritesStore();
  const fav = isFav(albumId);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [showFolderManager, setShowFolderManager] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [folderRename, setFolderRename] = useState<{ id: string; name: string } | null>(null);

  const [readEp, setReadEp] = useState<{ readId: string; episode: string } | null>(null);
  const [commentPage, setCommentPage] = useState(1);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    load();
    if (loggedIn) loadFolders();
    try {
      const { default: AsyncStorage } = require('@react-native-async-storage/async-storage');
      AsyncStorage.getItem(`@jmcomic.readEp.${albumId}`).then((json: string | null) => {
        if (json) try { setReadEp(JSON.parse(json)); } catch {}
      });
    } catch {}
  }, [albumId]);

  const load = async () => {
    setLoading(true);
    try {
      const d = await fetchAlbumDetail(albumId);
      setDetail(d);
      const keys = Object.keys(d as any);
      const hasSeries = d.series?.length;
      jmLogger.log(`【详情】albumId=${albumId} keys=${keys.join(',')} hasSeries=${!!hasSeries} seriesLen=${d.series?.length || 0}`);
      if (hasSeries) {
        jmLogger.log(`【详情】第一条章节: ${JSON.stringify(d.series![0])}`);
      } else {
        const sample: Record<string, any> = {};
        for (const k of keys) {
          const v = (d as any)[k];
          if (Array.isArray(v)) sample[k] = `Array(${v.length})`;
          else if (v && typeof v === 'object') sample[k] = Object.keys(v).join(',');
          else if (typeof v === 'string' && v.length > 100) sample[k] = v.slice(0, 60) + '...';
          else sample[k] = v;
        }
        jmLogger.log(`【详情】字段快照: ${JSON.stringify(sample)}`);
      }
      if (Array.isArray(d.series) && d.series.length) {
        setSeriesGroups(chunkArray(d.series, 10));
      }
      loadComments();
    } catch (e: any) {
      jmLogger.err(`【详情】加载失败 albumId=${albumId}: ${e.message}`);
    }
    setLoading(false);
  };

  const loadComments = async () => {
    setCommentPage(1);
    setHasMoreComments(true);
    try {
      const data = await fetchComments(albumId);
      setComments(data.list || []);
      setCommentTotal(parseInt(data.total) || 0);
    } catch {}
  };

  /** 加载更多评论（无限滚动） */
  const loadMoreComments = useCallback(async () => {
    if (loadingMoreComments || !hasMoreComments) return;
    setLoadingMoreComments(true);
    try {
      const np = commentPage + 1;
      const data = await fetchComments(albumId, np);
      const list = data.list || [];
      if (list.length < 20) setHasMoreComments(false);
      setComments((prev) => [...prev, ...list]);
      setCommentPage(np);
    } catch {}
    setLoadingMoreComments(false);
  }, [commentPage, hasMoreComments, loadingMoreComments, albumId]);

  const openChapter = async (chId: string, chName: string) => {
    try {
      let images: string[];
      const host = getImgHost();

      // 单章本：chId === albumId，从 detail.images 拿（album API 已有）
      if (chId === albumId && Array.isArray(detail?.images) && detail.images.length) {
        images = detail.images.map((url: any) => {
          let u = typeof url === 'string' ? url : url.image || String(url);
          if (u && !u.includes('://')) u = `https://${host}/media/photos/${chId}/${u}`;
          return u;
        });
        jmLogger.log(`openChapter: 使用 detail.images chId=${chId} count=${images.length} [0]=${images[0]}`);
      } else {
        const data = await fetchComicRead(chId);
        jmLogger.log(`openChapter chId=${chId} imagesLen=${data.images?.length} page_count=${data.page_count} hasImages=!!${!!data.images?.length}`);
        if (Array.isArray(data.images) && data.images.length) {
          images = data.images.map((item: any) => item.image);
          jmLogger.log(`openChapter: 使用 API images[0]=${images[0]}`);
        } else {
          const count = data.page_count || 20;
          images = [];
          for (let i = 1; i <= count; i++) {
            const fn = String(i).padStart(5, '0') + '.webp';
            images.push(`https://${host}/media/photos/${chId}/${fn}`);
          }
          jmLogger.log(`openChapter: 合成图片URL count=${count} [0]=${images[0]}`);
        }
      }
      if (!images || images.length === 0) {
        jmLogger.err(`openChapter: images为空 chId=${chId} albumId=${albumId}`);
        Alert.alert('错误', '无法加载图片，该章节可能格式异常');
        setLoading(false);
        return;
      }
      useReaderStore.getState().startReading(albumId, chId, chName, images, 220980);
      useHistoryStore.getState().add({
        id: albumId, title: detail?.name || '', coverUrl: getCoverUrl(albumId),
        chapterId: chId, chapterTitle: chName, page: 0, readAt: Date.now(),
      });
      try {
        const { default: AsyncStorage } = require('@react-native-async-storage/async-storage');
        AsyncStorage.setItem(`@jmcomic.readEp.${albumId}`, JSON.stringify({ readId: chId, episode: chName }));
      } catch {}
      nav.navigate('Reader', { chapterId: chId, albumId, chapterTitle: chName });
    } catch (e: any) {
      Alert.alert('错误', e.message || '加载失败');
    }
  };

  const handleStartReading = () => {
    if (!detail?.series?.length) return;
    if (readEp?.readId) {
      const ep = detail.series.find((s) => s.id === readEp.readId);
      openChapter(readEp.readId, ep?.name || readEp.episode);
    } else {
      openChapter(detail.series[0].id, detail.series[0].name);
    }
  };

  const handleBuy = async () => {
    if (!loggedIn) { Alert.alert('提示', t('error.login_required')); return; }
    try {
      const res = await buyAlbum(albumId);
      if (res.status === 'ok') {
        Alert.alert('', res.msg || '购买成功');
        load();
      } else {
        Alert.alert('', res.msg || '购买失败');
      }
    } catch (e: any) {
      Alert.alert('错误', e.message);
    }
    setShowBuy(false);
  };

  const handleToggleFav = async () => {
    if (fav) {
      if (loggedIn) await toggle(albumId);
      removeLocal(albumId);
    } else if (!loggedIn) {
      Alert.alert('提示', '请先登录后再收藏', [
        { text: '取消', style: 'cancel' },
        { text: '去登录', onPress: () => nav.navigate('Member') },
      ]);
    } else {
      setShowFolderPicker(true);
    }
  };

  const handleFolderSelect = async (folderId?: string) => {
    await toggle(albumId);
    if (folderId) {
      await moveToFolder(folderId, albumId);
    }
    addLocal({
      id: albumId, title: detail?.name || '', coverUrl: getCoverUrl(albumId),
      author: Array.isArray(detail?.author) ? detail.author.join(', ') : String(detail?.author || ''), addedAt: Date.now(),
    });
    setShowFolderPicker(false);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolder(newFolderName.trim());
    setNewFolderName('');
  };

  const handleDeleteFolder = async (id: string) => {
    Alert.alert('删除文件夹', '确定删除？收藏不会丢失', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => deleteFolder(id) },
    ]);
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    try {
      await postComment(albumId, commentText.trim());
      setCommentText('');
      loadComments();
    } catch {}
  };

  const handleShare = async () => {
    try {
      await Share.share({ title: detail?.name || '', url: `https://18comic.vip/album/${albumId}/` });
    } catch {}
    setShowShare(false);
  };

  const fmt = (n: number | string) => { const v = Number(n); return v >= 10000 ? (v / 10000).toFixed(1) + '万' : String(v || 0); };

  if (loading) {
    return (
      <SafeAreaView style={styles.cont}>
        <StatusBar style="light" />
        <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>
      </SafeAreaView>
    );
  }
  if (!detail) {
    return (
      <SafeAreaView style={styles.cont}>
        <StatusBar style="light" />
        <View style={styles.center}>
          <Text style={{ color: C.error }}>{t('common.error')}</Text>
          <Pressable onPress={load} style={{ marginTop: 12 }}><Text style={{ color: C.primary }}>{t('common.retry')}</Text></Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const relatedList = Array.isArray(detail.related_list) ? detail.related_list : [];
  const purchased = detail.purchased !== undefined || detail.bought === true;

  // 从阅读历史中查找该漫画的进度
  const historyItem = useHistoryStore((s) => s.items.find((h) => h.id === albumId));

  return (
    <SafeAreaView style={styles.cont} edges={['top']}>
      <StatusBar style="light" />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingBottom: 80 }}
        onMomentumScrollEnd={(e) => {
          if (tab !== 3) return;
          const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
          if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 60) {
            loadMoreComments();
          }
        }}>
        {/* 封面 + 渐变 */}
        <View style={{ position: 'relative' }}>
          <Image source={{ uri: getCoverUrl(albumId) }} style={{ width: '100%', height: winW * 4 / 3 }} contentFit="cover" />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.coverGrad} pointerEvents="none" />
          <View style={styles.coverInfo}>
            <Text style={styles.title}>{detail.name}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
              {(Array.isArray(detail.author) ? detail.author : [detail.author].filter(Boolean)).map((a, i) => (
                <Pressable key={i} onPress={() => nav.navigate('Main', { screen: 'Search', params: { query: a } })}>
                  <Text style={{ color: C.primaryLight, fontSize: FontSize.body }}>{a}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* 开始阅读按钮 */}
        <Pressable onPress={handleStartReading} style={styles.readBtn}>
          <MaterialIcons name={readEp ? 'play-arrow' : 'play-circle-outline'} size={22} color={C.textOnPrimary} />
          <Text style={styles.readBtnText}>{readEp ? `${t('detail.continue_reading')}${historyItem?.chapterTitle ? ' ' + historyItem.chapterTitle : ''}${historyItem && historyItem.page > 0 ? ` P${historyItem.page}` : ''}` : t('detail.start_reading')}</Text>
        </Pressable>

        {/* 状态栏 */}
        <View style={styles.statRow}>
          <View style={styles.statItem}><MaterialIcons name="visibility" size={16} color={C.textSecondary} /><Text style={styles.statLabel}>{fmt(detail.total_views)}</Text></View>
          <View style={styles.statDot} />
          <View style={styles.statItem}><MaterialIcons name="favorite-border" size={16} color={C.textSecondary} /><Text style={styles.statLabel}>{fmt(detail.likes)}</Text></View>
          <View style={styles.statDot} />
          <View style={styles.statItem}><MaterialIcons name="chat-bubble-outline" size={16} color={C.textSecondary} /><Text style={styles.statLabel}>{fmt(detail.comment_total)}</Text></View>
        </View>

        {/* 3-Tab 导航 */}
        <View style={styles.tabBar}>
          {(() => {
            const items = t('detail.menu_items', { returnObjects: true });
            if (!Array.isArray(items)) return null;
            return (items as string[]).map((label: string, i: number) => (
              <Pressable key={i} onPress={() => setTab(i + 1)} style={[styles.tab, tab === i + 1 && styles.tabActive]}>
                <Text style={[styles.tabText, tab === i + 1 && styles.tabTextActive]}>{label}</Text>
              </Pressable>
            ));
          })()}
        </View>

        {/* Tab 1: 简介 */}
        {tab === 1 && (
          <View style={{ paddingHorizontal: Spacing.marginEdge, paddingTop: Spacing.md }}>
            {Array.isArray(detail.tags) && detail.tags.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {detail.tags.map((tag, i) => (
                  <Pressable key={i} onPress={() => nav.navigate('Main', { screen: 'Search', params: { query: tag } })}>
                    <View style={styles.tagChip}><Text style={styles.tagText}>{tag}</Text></View>
                  </Pressable>
                ))}
              </View>
            )}
            <Text style={{ color: C.textSecondary, fontSize: FontSize.body, lineHeight: 22 }}>{detail.description}</Text>

            {!purchased && (
              <Pressable onPress={() => setShowBuy(true)} style={styles.buyBtn}>
                <MaterialIcons name="lock-open" size={18} color={C.textOnPrimary} />
                <Text style={styles.buyText}>{t('detail.buy')}</Text>
              </Pressable>
            )}

            {/* 相关漫画 */}
            {relatedList.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={{ fontSize: FontSize.headline, fontWeight: '700', color: C.textPrimary, marginBottom: 10 }}>{t('blogs.related_comics')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {relatedList.slice(0, 8).map((rc) => (
                    <Pressable
                      key={rc.id}
                      onPress={() => nav.push('ComicDetail', { albumId: rc.id })}
                      style={{ marginRight: 10, width: 100 }}
                    >
                      <Image source={{ uri: rc.image || getCoverUrl(rc.id) }} style={{ width: 100, height: 140, borderRadius: Radius.sm, backgroundColor: C.surfaceContainer }} contentFit="cover" />
                      <Text style={{ fontSize: FontSize.label, color: C.textPrimary, marginTop: 4 }} numberOfLines={2}>{rc.name}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 20 }}>
              <Pressable onPress={handleToggleFav} style={[styles.actionBtn, fav && styles.actionBtnActive]}>
                <MaterialIcons name={fav ? 'favorite' : 'favorite-border'} size={18} color={fav ? C.textOnPrimary : C.primary} />
                <Text style={[styles.actionBtnText, fav && { color: C.textOnPrimary }]}>
                  {fav ? t('common.unfavorite') : t('common.favorite')}
                </Text>
              </Pressable>
              <Pressable onPress={() => setShowShare(true)} style={styles.actionBtn}>
                <MaterialIcons name="share" size={18} color={C.primary} />
                <Text style={styles.actionBtnText}>{t('detail.share')}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Tab 2: 章节 */}
        {tab === 2 && (
          <View style={{ paddingHorizontal: Spacing.marginEdge, paddingTop: 8 }}>
            {seriesGroups.length === 0 ? (
              <Text style={{ color: C.textTertiary, textAlign: 'center', padding: 20 }}>{t('detail.no_chapter')}</Text>
            ) : (
              <>
                {seriesGroups.length > 1 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                    {seriesGroups.map((_, i) => (
                      <Pressable
                        key={i}
                        onPress={() => setGroupIdx(i)}
                        style={[styles.groupTab, groupIdx === i && styles.groupTabActive]}
                      >
                        <Text style={[styles.groupTabText, groupIdx === i && styles.groupTabTextActive]}>
                          {i * 10 + 1}-{Math.min((i + 1) * 10, detail.series.length)}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
                {seriesGroups[groupIdx]?.map((ep) => (
                  <Pressable key={ep.id} onPress={() => openChapter(ep.id, ep.name)} style={styles.episodeItem}>
                    <View style={styles.epBadge}>
                      <MaterialIcons name="auto-stories" size={16} color={C.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.epTitle}>{ep.name || "第" + ep.sort + "话"}</Text>
                      {ep.page_count ? <Text style={styles.epPage}>{ep.page_count}P</Text> : null}
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color={C.textTertiary} />
                  </Pressable>
                ))}
              </>
            )}
          </View>
        )}

        {/* Tab 3: 评论 */}
        {tab === 3 && (
          <View style={{ paddingHorizontal: Spacing.marginEdge, paddingTop: 8 }}>
            {loggedIn && (
              <View style={styles.commentInputWrap}>
                <TextInput
                  style={styles.commentInput}
                  placeholder={t('common.comment_placeholder')}
                  placeholderTextColor={C.textTertiary}
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                />
                <Pressable onPress={handleComment} style={styles.sendBtn}>
                  <Text style={{ color: '#fff', fontWeight: '600' }}>{t('common.send')}</Text>
                </Pressable>
              </View>
            )}
            {comments.length === 0 ? (
              <Text style={{ color: C.textTertiary, textAlign: 'center', padding: 20 }}>{t('common.empty')}</Text>
            ) : (
              comments.map((c, i) => (
                <View key={c.CID || i} style={styles.commentItem}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={styles.avatar}><Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{(c.username || '?')[0]}</Text></View>
                    <Text style={{ fontWeight: '600', color: C.textPrimary, fontSize: FontSize.body }}>{c.username}</Text>
                    <Text style={{ fontSize: FontSize.caption, color: C.textTertiary }}>{c.addtime}</Text>
                  </View>
                  <HtmlText html={c.content} style={{ color: C.textSecondary, marginTop: 4, lineHeight: 20 }} linkColor={C.primary} />
                  {Array.isArray(c.replys) && c.replys.length > 0 && (
                    <View style={{ marginTop: 6, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: C.divider }}>
                      {c.replys.slice(0, 2).map((r, ri) => (
                        <View key={ri} style={{ flexDirection: 'row', marginTop: 2 }}>
                          <Text style={{ color: C.primary, fontSize: FontSize.label }}>{r.username}: </Text>
                          <HtmlText html={r.content} style={{ color: C.textTertiary, fontSize: FontSize.label, flex: 1 }} linkColor={C.primary} />
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))
            )}
            {loadingMoreComments && (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={C.primary} />
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <Modal visible={showBuy} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalDialog}>
            <MaterialIcons name="lock" size={40} color={C.primary} style={{ alignSelf: 'center', marginBottom: 12 }} />
            <Text style={{ color: C.textPrimary, fontSize: FontSize.bodyLarge, textAlign: 'center', marginBottom: 8 }}>{t('detail.buy_confirm')}</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <Pressable onPress={() => setShowBuy(false)} style={[styles.dialogBtn, { backgroundColor: C.surfaceLight }]}>
                <Text style={{ color: C.textSecondary, fontWeight: '600' }}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable onPress={handleBuy} style={[styles.dialogBtn, { backgroundColor: C.primary }]}>
                <Text style={{ color: C.textOnPrimary, fontWeight: '600' }}>{t('common.confirm')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showShare} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalDialog}>
            <MaterialIcons name="share" size={40} color={C.primary} style={{ alignSelf: 'center', marginBottom: 12 }} />
            <Text style={{ color: C.textPrimary, fontSize: FontSize.bodyLarge, textAlign: 'center', marginBottom: 4 }}>{t('detail.share')}</Text>
            <Text style={{ color: C.textTertiary, fontSize: FontSize.body, textAlign: 'center', marginBottom: 12 }}>{detail.name}</Text>
            <Pressable onPress={handleShare} style={[styles.dialogBtn, { backgroundColor: C.primary }]}>
              <Text style={{ color: C.textOnPrimary, fontWeight: '600' }}>分享到...</Text>
            </Pressable>
            <Pressable onPress={() => setShowShare(false)} style={{ marginTop: 8 }}>
              <Text style={{ color: C.textSecondary, textAlign: 'center' }}>{t('common.cancel')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showFolderPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalDialog, { maxWidth: 360 }]}>
            <Text style={{ color: C.textPrimary, fontSize: FontSize.bodyLarge, fontWeight: '700', textAlign: 'center', marginBottom: 12 }}>收藏到文件夹</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {folders.map((f) => {
                const fid2 = f.FID || f.folder_id || '';
                return (
                <Pressable
                  key={fid2}
                  onPress={() => handleFolderSelect(fid2)}
                  style={styles.folderItem}
                >
                  <MaterialIcons name="folder" size={20} color={C.primary} style={{ marginRight: 8 }} />
                  <Text style={{ flex: 1, color: C.textPrimary, fontSize: FontSize.body }}>{f.name}</Text>
                  <Text style={{ color: C.textTertiary, fontSize: FontSize.caption }}>{f.count || '0'}</Text>
                </Pressable>
                );
              })}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TextInput
                style={styles.modalInput}
                placeholder="新建文件夹"
                placeholderTextColor={C.textTertiary}
                value={newFolderName}
                onChangeText={setNewFolderName}
                onSubmitEditing={handleCreateFolder}
              />
              <Pressable onPress={handleCreateFolder} style={styles.modalAddBtn}>
                <MaterialIcons name="add" size={20} color="#fff" />
              </Pressable>
            </View>
            <Pressable onPress={() => setShowFolderManager(true)} style={{ marginTop: 8 }}>
              <Text style={{ color: C.textSecondary, fontSize: FontSize.label, textAlign: 'center' }}>管理文件夹</Text>
            </Pressable>
            <Pressable onPress={() => handleFolderSelect()} style={{ marginTop: 4 }}>
              <Text style={{ color: C.textTertiary, fontSize: FontSize.label, textAlign: 'center' }}>（不选择，仅本地收藏）</Text>
            </Pressable>
            <Pressable onPress={() => setShowFolderPicker(false)} style={{ marginTop: 8 }}>
              <Text style={{ color: C.textSecondary, textAlign: 'center' }}>{t('common.cancel')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showFolderManager} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalDialog, { maxWidth: 360 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ color: C.textPrimary, fontSize: FontSize.bodyLarge, fontWeight: '700' }}>管理文件夹</Text>
              <Pressable onPress={() => setShowFolderManager(false)}>
                <MaterialIcons name="close" size={22} color={C.textSecondary} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              {folders.map((f) => {
                const fid = f.FID || f.folder_id || '';
                return (
                <View key={fid} style={styles.folderRow}>
                  {folderRename?.id === fid ? (
                    <TextInput
                      style={styles.folderRenameInput}
                      value={folderRename.name}
                      onChangeText={(t) => setFolderRename({ ...folderRename!, name: t })}
                      onSubmitEditing={() => { renameFolder(fid, folderRename!.name); setFolderRename(null); }}
                      autoFocus
                    />
                  ) : (
                    <>
                      <MaterialIcons name="folder" size={18} color={C.primary} style={{ marginRight: 6 }} />
                      <Text style={{ flex: 1, color: C.textPrimary, fontSize: FontSize.body }}>{f.name}</Text>
                      <Pressable onPress={() => setFolderRename({ id: fid, name: f.name })} hitSlop={8} style={{ padding: 4 }}>
                        <MaterialIcons name="edit" size={18} color={C.textSecondary} />
                      </Pressable>
                      <Pressable onPress={() => handleDeleteFolder(fid)} hitSlop={8} style={{ padding: 4 }}>
                        <MaterialIcons name="delete-outline" size={18} color={C.error} />
                      </Pressable>
                    </>
                  )}
                </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

function getStyles(C: LegacyColors) {
  return StyleSheet.create({
    cont: { flex: 1, backgroundColor: C.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    coverGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%' },
    coverInfo: { position: 'absolute', bottom: 14, left: Spacing.marginEdge, right: Spacing.marginEdge },
    title: { fontSize: FontSize.title, fontWeight: '700', color: '#fff', marginBottom: 2 },

    readBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: C.primary, paddingVertical: 14, marginHorizontal: Spacing.marginEdge,
      marginTop: -20, borderRadius: Radius.button,
      shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    },
    readBtnText: { color: C.textOnPrimary, fontSize: FontSize.bodyLarge, fontWeight: '700' },

    statRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      paddingVertical: 14, gap: 8,
    },
    statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    statLabel: { fontSize: FontSize.body, color: C.textSecondary },
    statDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: C.textTertiary },

    tabBar: {
      flexDirection: 'row', marginHorizontal: Spacing.marginEdge,
      backgroundColor: C.surface, borderRadius: Radius.sm,
      padding: 3, marginBottom: 8,
    },
    tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: Radius.sm - 2 },
    tabActive: { backgroundColor: C.primary },
    tabText: { fontSize: FontSize.body, color: C.textSecondary, fontWeight: '500' },
    tabTextActive: { color: C.textOnPrimary, fontWeight: '700' },

    tagChip: {
      paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.chip,
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.primary + '40',
    },
    tagText: { fontSize: FontSize.label, color: C.primary, fontWeight: '500' },

    buyBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      backgroundColor: C.primary, padding: 12, borderRadius: Radius.button, marginTop: 12,
    },
    buyText: { color: C.textOnPrimary, fontWeight: '700' },

    actionBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 18, paddingVertical: 10,
      borderRadius: Radius.button, borderWidth: 1, borderColor: C.primary,
    },
    actionBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
    actionBtnText: { color: C.primary, fontWeight: '600', fontSize: FontSize.body },

    episodeItem: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 12, paddingHorizontal: 12,
      backgroundColor: C.surface, borderRadius: Radius.card,
      marginBottom: 8,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2, shadowRadius: 4, elevation: 2,
    },
    epBadge: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: C.primary + '20', justifyContent: 'center', alignItems: 'center',
      marginRight: 10,
    },
    epTitle: { fontSize: FontSize.body, color: C.textPrimary, fontWeight: '500' },
    epPage: { fontSize: FontSize.caption, color: C.textTertiary, marginTop: 2 },

    commentInputWrap: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    commentInput: {
      flex: 1, minHeight: 40, maxHeight: 80,
      backgroundColor: C.surface, borderRadius: Radius.sm,
      borderWidth: 1, borderColor: C.border,
      paddingHorizontal: 12, color: C.textPrimary, fontSize: FontSize.body,
    },
    sendBtn: { height: 40, paddingHorizontal: 18, backgroundColor: C.primary, borderRadius: Radius.sm, justifyContent: 'center', alignItems: 'center' },
    commentItem: { backgroundColor: C.surface, borderRadius: Radius.card, padding: 12, marginBottom: 10 },
    avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center' },

    groupTab: {
      paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.xl,
      backgroundColor: C.surfaceLight, marginRight: 8,
      borderWidth: 1, borderColor: C.border,
    },
    groupTabActive: { backgroundColor: C.primary, borderColor: C.primary },
    groupTabText: { fontSize: FontSize.label, color: C.textSecondary },
    groupTabTextActive: { color: C.textOnPrimary, fontWeight: '600' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 40 },
    modalDialog: {
      backgroundColor: C.surface, borderRadius: Radius.xl,
      padding: 24, width: '100%', maxWidth: 320,
    },
    dialogBtn: { flex: 1, padding: 12, borderRadius: Radius.button, alignItems: 'center' },

    folderItem: {
      flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8,
      borderBottomWidth: 0.5, borderBottomColor: C.divider,
    },
    modalInput: {
      flex: 1, height: 36, backgroundColor: C.surfaceLight, borderRadius: Radius.sm,
      paddingHorizontal: 10, color: C.textPrimary, fontSize: FontSize.body,
      borderWidth: 1, borderColor: C.border,
    },
    modalAddBtn: { width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center' },
    folderRow: {
      flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
      borderBottomWidth: 0.5, borderBottomColor: C.divider,
    },
    folderRenameInput: {
      flex: 1, height: 32, backgroundColor: C.surfaceLight, borderRadius: Radius.sm,
      paddingHorizontal: 8, color: C.textPrimary, fontSize: FontSize.body,
    },
  });
}
