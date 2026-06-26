// 漫画详情 — 复刻 APK Detail.tsx
// 3-Tab: 简介 | 章节（分组） | 评论 + 购买 + 分享 + 阅读历史
// @author nyx

import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator,
  Alert, TextInput, Modal, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors, Radius, Spacing, FontSize } from '../theme';
import { fetchAlbumDetail, fetchComicRead, fetchComments, postComment, buyAlbum, getCoverUrl, getImgHost } from '../api/endpoints';
import { useFavoritesStore } from '../store/useFavorites';
import { useReaderStore } from '../store/useReader';
import { useHistoryStore } from '../store/useHistory';
import { useAuthStore } from '../store/useAuth';
import { buildChapterImageUrls } from '../utils/scramble';
import { chunkArray } from '../utils/helpers';
import type { AlbumDetail, Episode, CommentItem as ApiComment } from '../api/types';

export function ComicDetailScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { albumId } = route.params;
  const { t } = useTranslation();
  const { loggedIn } = useAuthStore();

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
  const { isFav, addLocal, removeLocal } = useFavoritesStore();
  const fav = isFav(albumId);

  // 从 AsyncStorage 读取上次阅读位置
  const [readEp, setReadEp] = useState<{ readId: string; episode: string } | null>(null);

  useEffect(() => {
    load();
    // 异步加载上次阅读位置
    try {
      const { default: AsyncStorage } = require('@react-native-async-storage/async-storage');
      AsyncStorage.getItem(`@jmcomic.readEp.${albumId}`).then((json) => {
        if (json) setReadEp(JSON.parse(json));
      });
    } catch {}
  }, [albumId]);

  const load = async () => {
    setLoading(true);
    try {
      const d = await fetchAlbumDetail(albumId);
      setDetail(d);
      // 章节分组（每 10 个一组，与原版一致）
      if (d.series?.length) {
        setSeriesGroups(chunkArray(d.series, 10));
      }
      loadComments();
    } catch {}
    setLoading(false);
  };

  const loadComments = async () => {
    try {
      const data = await fetchComments(albumId);
      setComments(data.list || []);
      setCommentTotal(parseInt(data.total) || 0);
    } catch {}
  };

  const openChapter = async (chId: string, chName: string) => {
    try {
      const data = await fetchComicRead(chId);
      const host = getImgHost();
      const images = buildChapterImageUrls(host, chId, data.page_count || data.images?.length || 20, data.scramble_id, data.images as any);

      useReaderStore.getState().startReading(albumId, chId, chName, images, data.scramble_id);
      useHistoryStore.getState().add({
        id: albumId, title: detail?.name || '', coverUrl: getCoverUrl(albumId),
        chapterId: chId, chapterTitle: chName, page: 0, readAt: Date.now(),
      });

      // 保存上次阅读位置
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

    // 如果有上次阅读记录，从那里继续
    if (readEp?.readId) {
      const ep = detail.series.find((s) => s.id === readEp.readId);
      openChapter(readEp.readId, ep?.name || readEp.episode);
    } else {
      // 否则从头开始
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

  const handleToggleFav = () => {
    if (fav) removeLocal(albumId);
    else addLocal({
      id: albumId, title: detail?.name || '', coverUrl: getCoverUrl(albumId),
      author: detail?.author?.join(', ') || '', addedAt: Date.now(),
    });
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
      await Share.share({
        title: detail?.name || '',
        url: `https://18comic.vip/album/${albumId}/`,
      });
    } catch {}
    setShowShare(false);
  };

  const fmt = (n: number) => n >= 10000 ? (n / 10000).toFixed(1) + '万' : String(n || 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.cont}>
        <StatusBar style="light" />
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }
  if (!detail) {
    return (
      <SafeAreaView style={styles.cont}>
        <StatusBar style="light" />
        <View style={styles.center}>
          <Text style={{ color: Colors.error }}>{t('common.error')}</Text>
          <Pressable onPress={load} style={{ marginTop: 12 }}><Text style={{ color: Colors.primary }}>{t('common.retry')}</Text></Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const purchased = detail.purchased !== undefined || detail.bought === true;

  return (
    <SafeAreaView style={styles.cont} edges={['top']}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        {/* 封面大图 */}
        <View style={{ position: 'relative' }}>
          <Image source={{ uri: getCoverUrl(albumId) }} style={{ width: '100%', height: 300 }} contentFit="cover" />
          <View style={styles.coverOverlay} />
          <View style={styles.coverInfo}>
            <Text style={styles.title}>{detail.name}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(detail.author || []).map((a, i) => (
                <Text key={i} style={{ color: Colors.primary, fontSize: FontSize.body }}>{a}</Text>
              ))}
            </View>
          </View>
        </View>

        {/* 开始阅读 / 继续阅读 */}
        <Pressable onPress={handleStartReading} style={styles.readBtn}>
          <MaterialIcons name={readEp ? 'play-arrow' : 'play-circle-outline'} size={20} color={Colors.textOnPrimary} />
          <Text style={styles.readBtnText}>{readEp ? t('detail.continue_reading') : t('detail.start_reading')}</Text>
        </Pressable>

        {/* 3-Tab 导航 */}
        <View style={styles.tabBar}>
          {t('detail.menu_items', { returnObjects: true }).map((label: string, i: number) => (
            <Pressable key={i} onPress={() => setTab(i + 1)} style={[styles.tab, tab === i + 1 && styles.tabActive]}>
              <Text style={[styles.tabText, tab === i + 1 && styles.tabTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Tab 1: 简介 */}
        {tab === 1 && (
          <View style={{ paddingHorizontal: Spacing.marginEdge, paddingTop: Spacing.md }}>
            <View style={{ flexDirection: 'row', gap: 16, marginBottom: 8 }}>
              <View style={{flexDirection:"row",alignItems:"center",gap:4}}><MaterialIcons name="visibility" size={16} color={Colors.textSecondary} /><Text style={styles.stat}>{fmt(detail.total_views)}</Text></View>
              <View style={{flexDirection:"row",alignItems:"center",gap:4}}><MaterialIcons name="favorite-border" size={16} color={Colors.textSecondary} /><Text style={styles.stat}>{fmt(detail.likes)}</Text></View>
              <View style={{flexDirection:"row",alignItems:"center",gap:4}}><MaterialIcons name="chat-bubble-outline" size={16} color={Colors.textSecondary} /><Text style={styles.stat}>{fmt(detail.comment_total)}</Text></View>
            </View>
            {detail.tags?.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {detail.tags.map((tag, i) => (
                  <View key={i} style={styles.tagChip}><Text style={styles.tagText}>{tag}</Text></View>
                ))}
              </View>
            )}
            <Text style={{ color: Colors.textSecondary, fontSize: FontSize.body, lineHeight: 20 }}>{detail.description}</Text>

            {/* 购买去码 */}
            {!purchased && (
              <Pressable onPress={() => setShowBuy(true)} style={styles.buyBtn}>
                <MaterialIcons name="lock-open" size={18} color={Colors.textOnPrimary} />
                <Text style={styles.buyText}>{t('detail.buy')}</Text>
              </Pressable>
            )}

            {/* 操作按钮 */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12, marginBottom: 20 }}>
              <Pressable onPress={handleToggleFav} style={[styles.actionBtn, fav && { backgroundColor: Colors.primary }]}>
                <MaterialIcons name={fav ? 'favorite' : 'favorite-border'} size={18} color={fav ? Colors.textOnPrimary : Colors.primary} />
                <Text style={{ color: fav ? Colors.textOnPrimary : Colors.primary, fontWeight: '600', fontSize: FontSize.body }}>
                  {fav ? t('common.unfavorite') : t('common.favorite')}
                </Text>
              </Pressable>
              <Pressable onPress={() => setShowShare(true)} style={styles.actionBtn}>
                <MaterialIcons name="share" size={18} color={Colors.primary} />
                <Text style={{ color: Colors.primary, fontWeight: '600', fontSize: FontSize.body }}>{t('detail.share')}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Tab 2: 章节（分组） */}
        {tab === 2 && (
          <View style={{ paddingHorizontal: Spacing.marginEdge, paddingTop: 8 }}>
            {seriesGroups.length === 0 ? (
              <Text style={{ color: Colors.textTertiary, textAlign: 'center', padding: 20 }}>{t('detail.no_chapter')}</Text>
            ) : (
              <>
                {/* 分组标签 */}
                {seriesGroups.length > 1 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
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
                {/* 当前分组章节列表 */}
                {seriesGroups[groupIdx]?.map((ep) => (
                  <Pressable key={ep.id} onPress={() => openChapter(ep.id, ep.name)} style={styles.episodeItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.epTitle}>{ep.name || "第" + ep.sort + "话"}</Text>
                      {ep.page_count ? <Text style={{ fontSize: FontSize.caption, color: Colors.textTertiary }}>{ep.page_count}P</Text> : null}
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color={Colors.textTertiary} />
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
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <TextInput
                  style={styles.commentInput}
                  placeholder={t('common.comment_placeholder')}
                  placeholderTextColor={Colors.textTertiary}
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
              <Text style={{ color: Colors.textTertiary, textAlign: 'center', padding: 20 }}>{t('common.empty')}</Text>
            ) : (
              comments.map((c, i) => (
                <View key={c.CID || i} style={styles.commentItem}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={styles.avatar}><Text style={{ color: '#fff', fontWeight: '700' }}>{(c.username || '?')[0]}</Text></View>
                    <Text style={{ fontWeight: '600', color: Colors.textPrimary, fontSize: FontSize.body }}>{c.username}</Text>
                    <Text style={{ fontSize: FontSize.caption, color: Colors.textTertiary }}>{c.addtime}</Text>
                  </View>
                  <Text style={{ color: Colors.textSecondary, marginTop: 4, lineHeight: 18 }}>{c.content}</Text>
                  {c.replys?.length > 0 && (
                    <View style={{ marginTop: 6, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: Colors.divider }}>
                      {c.replys.slice(0, 2).map((r, ri) => (
                        <Text key={ri} style={{ fontSize: FontSize.body, color: Colors.textTertiary, marginTop: 2 }}>
                          <Text style={{ color: Colors.primary }}>{r.username}</Text>: {r.content}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* 购买弹窗 */}
      <Modal visible={showBuy} transparent animationType="fade">
        <View style={styles.buyOverlay}>
          <View style={styles.buyDialog}>
            <MaterialIcons name="lock" size={40} color={Colors.primary} style={{ alignSelf: 'center', marginBottom: 12 }} />
            <Text style={{ color: Colors.textPrimary, fontSize: FontSize.bodyLarge, textAlign: 'center', marginBottom: 8 }}>{t('detail.buy_confirm')}</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <Pressable onPress={() => setShowBuy(false)} style={[styles.dialogBtn, { backgroundColor: Colors.surfaceLight }]}>
                <Text style={{ color: Colors.textSecondary, fontWeight: '600' }}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable onPress={handleBuy} style={[styles.dialogBtn, { backgroundColor: Colors.primary }]}>
                <Text style={{ color: Colors.textOnPrimary, fontWeight: '600' }}>{t('common.confirm')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* 分享弹窗 */}
      <Modal visible={showShare} transparent animationType="fade">
        <View style={styles.buyOverlay}>
          <View style={styles.buyDialog}>
            <MaterialIcons name="share" size={40} color={Colors.primary} style={{ alignSelf: 'center', marginBottom: 12 }} />
            <Text style={{ color: Colors.textPrimary, fontSize: FontSize.bodyLarge, textAlign: 'center', marginBottom: 4 }}>{t('detail.share')}</Text>
            <Text style={{ color: Colors.textTertiary, fontSize: FontSize.body, textAlign: 'center', marginBottom: 12 }}>{detail.name}</Text>
            <Pressable onPress={handleShare} style={[styles.dialogBtn, { backgroundColor: Colors.primary }]}>
              <Text style={{ color: Colors.textOnPrimary, fontWeight: '600' }}>分享到...</Text>
            </Pressable>
            <Pressable onPress={() => setShowShare(false)} style={{ marginTop: 8 }}>
              <Text style={{ color: Colors.textSecondary, textAlign: 'center' }}>{t('common.cancel')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  cont: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  coverOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  coverInfo: { position: 'absolute', bottom: 12, left: 14, right: 14 },
  title: { fontSize: FontSize.title, fontWeight: '700', color: '#fff', marginBottom: 4 },
  readBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.primary, padding: 14 },
  readBtnText: { color: Colors.textOnPrimary, fontSize: FontSize.bodyLarge, fontWeight: '700' },
  tabBar: { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabText: { fontSize: FontSize.body, color: Colors.textSecondary },
  tabTextActive: { color: Colors.primary, fontWeight: '600' },
  stat: { fontSize: FontSize.body, color: Colors.textSecondary },
  tagChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.chip, backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.primaryLight },
  tagText: { fontSize: FontSize.label, color: Colors.primary, fontWeight: '500' },
  buyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.primary, padding: 12, borderRadius: Radius.button, marginTop: 12 },
  buyText: { color: Colors.textOnPrimary, fontWeight: '700' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.button, borderWidth: 1, borderColor: Colors.primary },
  episodeItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, backgroundColor: Colors.surface, borderRadius: Radius.sm, marginBottom: 6 },
  epTitle: { fontSize: FontSize.body, color: Colors.textPrimary, fontWeight: '500' },
  commentInput: { flex: 1, minHeight: 40, maxHeight: 80, backgroundColor: Colors.surface, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12, color: Colors.textPrimary, fontSize: FontSize.body },
  sendBtn: { height: 40, paddingHorizontal: 16, backgroundColor: Colors.primary, borderRadius: Radius.sm, justifyContent: 'center', alignItems: 'center' },
  commentItem: { backgroundColor: Colors.surface, borderRadius: Radius.sm, padding: 12, marginBottom: 8 },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  groupTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.sm, backgroundColor: Colors.surfaceLight, marginRight: 6, borderWidth: 1, borderColor: Colors.border },
  groupTabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  groupTabText: { fontSize: FontSize.label, color: Colors.textSecondary },
  groupTabTextActive: { color: Colors.textOnPrimary, fontWeight: '600' },
  buyOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 40 },
  buyDialog: { backgroundColor: Colors.surface, borderRadius: Radius.card, padding: 24, width: '100%', maxWidth: 320 },
  dialogBtn: { flex: 1, padding: 12, borderRadius: Radius.button, alignItems: 'center' },
});
