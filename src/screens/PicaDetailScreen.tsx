// Pica 漫画详情页 v3 — Tab: 详情/章节/评论 + 相关推荐 + 动态主题
// @author Jason

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator,
  Dimensions, TextInput, Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useLegacyColors, LegacyColors, FontSize, Radius, Spacing } from '../theme';
import { picaSource } from '../sources/pica';
import { useFavoritesStore } from '../store/useFavorites';
import { comicComments, sendComment, likeComment, replyComment, recommendation, likeComic, favouriteComic } from '../pica/endpoints';
import { thumbUrl } from '../pica/types';
import type { SourceDetail } from '../sources/types';

const { width: W } = Dimensions.get('window');
const COVER_W = 115;
const COVER_H = 165;
const TABS = ['详情', '章节', '评论'];

interface PicaComment {
  _id: string;
  content: string;
  _user?: { name: string; avatar?: any };
  user?: { name: string; avatar?: any };
  likesCount: number;
  isLiked?: boolean;
  created_at: string;
}

interface RecommendItem {
  id: string;
  title: string;
  coverUrl: string;
}

export function PicaDetailScreen() {
  const nav = useNavigation<any>();
  const p = useRoute<any>().params;
  const comicId = p?.comicId || p?.albumId || p?.id || '';
  const C = useLegacyColors();
  const styles = useMemo(() => getStyles(C), [C]);

  const [detail, setDetail] = useState<SourceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [sortAsc, setSortAsc] = useState(false);
  const [related, setRelated] = useState<RecommendItem[]>([]);
  const [creatorInfo, setCreatorInfo] = useState<{ id: string; name: string; avatar?: string } | null>(null);
  const [comments, setComments] = useState<PicaComment[]>([]);
  const [commLoading, setCommLoading] = useState(false);
  const [commPage, setCommPage] = useState(1);
  const [hasMoreComm, setHasMoreComm] = useState(true);
  const [commText, setCommText] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const addLocal = useFavoritesStore((s) => s.addLocal);

  useEffect(() => {
    picaSource.fetchDetail(comicId).then((d) => {
      setDetail(d);
      const rawCreator = (d as any)._creator;
      if (rawCreator?._id) setCreatorInfo({ id: rawCreator._id, name: rawCreator.name || '', avatar: rawCreator.avatar ? thumbUrl(rawCreator.avatar) : undefined });
      recommendation(comicId).then((raw) => {
        const data = (raw as any).comics || [];
        if (Array.isArray(data)) setRelated(data.map((r: any) => ({ id: r._id, title: r.title, coverUrl: thumbUrl(r.thumb) })));
      }).catch(() => {});
    }).catch(() => {}).finally(() => setLoading(false));
  }, [comicId]);

  const loadComments = useCallback(async (page = 1, refresh = false) => {
    if (commLoading) return;
    setCommLoading(true);
    try {
      const raw = await comicComments(comicId, page);
      const data = (raw as any).comments || raw;
      const docs: PicaComment[] = data.docs || [];
      if (refresh || page === 1) setComments(docs);
      else setComments((prev) => [...prev, ...docs]);
      setHasMoreComm(docs.length >= 20);
      setCommPage(page);
    } catch {}
    setCommLoading(false);
  }, [comicId, commLoading]);

  useEffect(() => { if (detail && comments.length === 0 && activeTab === 2) loadComments(1, true); }, [detail, activeTab]);

  const handleSend = async () => {
    const text = commText.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      if (replyTo) await replyComment(replyTo.id, text);
      else await sendComment(comicId, text);
      setCommText(''); setReplyTo(null); loadComments(1, true);
    } catch {}
    setSending(false);
  };
  const handleLike = async (cid: string) => {
    try {
      await likeComment(cid);
      setComments((prev) => prev.map((c) => c._id === cid ? { ...c, isLiked: !c.isLiked, likesCount: c.likesCount + (c.isLiked ? -1 : 1) } : c));
    } catch {}
  };
  const fmtTime = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.getMonth() + 1}-${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  const handleDownload = () => {
    if (!detail) return;
    Alert.alert('下载', `${detail.title} 共 ${(detail.chapters || []).length} 话`, [
      { text: '取消', style: 'cancel' },
      { text: '下载全部', onPress: async () => { for (const ch of detail.chapters || []) { try { await picaSource.fetchImages(detail.id, ch.order); } catch {} } Alert.alert('', '下载任务已添加'); }},
    ]);
  };

  if (loading) return <View style={{ flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color={C.primary} /></View>;
  if (!detail) return <View style={{ flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: C.textSecondary }}>加载失败</Text></View>;

  const chs = detail.chapters || [];
  const sortedChs = sortAsc ? [...chs].sort((a, b) => a.order - b.order) : [...chs].sort((a, b) => b.order - a.order);

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* 头部 */}
        <View style={styles.headerRow}>
          <Image source={{ uri: detail.coverUrl }} style={styles.coverThumb} contentFit="cover" />
          <View style={styles.headerInfo}>
            <Text style={styles.title} numberOfLines={2}>{detail.title}</Text>
            {detail.author ? <Pressable onPress={() => nav.navigate('Main', { screen: 'Search', params: { query: detail.author } })}><Text style={styles.author}>{detail.author}</Text></Pressable> : null}
            {Array.isArray(detail.categories) && detail.categories.length > 0 && (
              <View style={styles.tagRow}>{detail.categories.slice(0, 4).map((cat) => (
                <Pressable key={cat} onPress={() => nav.navigate('Main', { screen: 'Search', params: { query: cat } })}>
                  <View style={styles.catTag}><Text style={styles.catText}>{cat}</Text></View>
                </Pressable>
              ))}</View>
            )}
            {Array.isArray(detail.tags) && detail.tags.length > 0 && (
              <View style={styles.tagRow}>{detail.tags.slice(0, 6).map((tag) => (
                <Pressable key={tag} onPress={() => nav.navigate('Main', { screen: 'Search', params: { query: tag } })}>
                  <View style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>
                </Pressable>
              ))}</View>
            )}
          </View>
        </View>
        {/* 统计 */}
        <View style={styles.statRow}>
          <View style={styles.statItem}><MaterialIcons name="favorite-border" size={14} color={C.textTertiary} /><Text style={styles.statLabel}>{detail.likesCount ?? detail.totalLikes ?? 0}</Text></View>
          <View style={styles.statDot} />
          <View style={styles.statItem}><MaterialIcons name="visibility" size={14} color={C.textTertiary} /><Text style={styles.statLabel}>{detail.viewsCount ?? detail.totalViews ?? 0}</Text></View>
          <View style={styles.statDot} />
          <View style={styles.statItem}><MaterialIcons name="collections" size={14} color={C.textTertiary} /><Text style={styles.statLabel}>{chs.length || 0}</Text></View>
          <View style={styles.statDot} />
          <View style={styles.statItem}><MaterialIcons name="chat-bubble-outline" size={14} color={C.textTertiary} /><Text style={styles.statLabel}>{detail.commentsCount ?? 0}</Text></View>
        </View>
        {/* 操作 */}
                <View style={styles.actionRow}>
          <Pressable style={styles.actionBtn} onPress={async () => {
            try {
              await likeComic(comicId);
              setDetail({ ...detail, isLiked: !detail?.isLiked } as any);
            } catch {}
          }}><MaterialIcons name={detail?.isLiked ? 'favorite' : 'favorite-outline'} size={18} color={detail?.isLiked ? '#e74c3c' : C.primary} /><Text style={styles.actionText}>{detail?.isLiked ? '已点赞' : '点赞'}</Text></Pressable>
          <Pressable style={styles.actionBtn} onPress={async () => {
            try {
              await favouriteComic(comicId);
              const next = !detail?.isFavourite;
              setDetail({ ...detail, isFavourite: next } as any);
              if (next) addLocal({ id: comicId, title: detail?.title || '', coverUrl: (detail as any)?.coverUrl || '', author: detail?.author || '', addedAt: Date.now() });
            } catch {
              addLocal({ id: comicId, title: detail?.title || '', coverUrl: (detail as any)?.coverUrl || '', author: detail?.author || '', addedAt: Date.now() });
            }
          }}><MaterialIcons name={detail?.isFavourite ? 'bookmark' : 'bookmark-outline'} size={18} color={detail?.isFavourite ? '#E85D3A' : C.primary} /><Text style={styles.actionText}>{detail?.isFavourite ? '已收藏' : '收藏'}</Text></Pressable>
          <Pressable style={styles.actionBtn} onPress={handleDownload}><MaterialIcons name="download" size={18} color={C.primary} /><Text style={styles.actionText}>下载</Text></Pressable>
          <Pressable style={styles.actionBtn} onPress={handleDownload}><MaterialIcons name="download" size={18} color={C.primary} /><Text style={styles.actionText}>下载</Text></Pressable>
        </View>
        {/* 开始阅读 */}
        {chs.length > 0 && (
          <Pressable onPress={() => nav.navigate('PicaReader', { comicId: detail.id, chapterOrder: chs[chs.length - 1].order, chapterId: chs[chs.length - 1].id, title: detail.title })} style={styles.readBtn}>
            <MaterialIcons name="play-arrow" size={20} color="#fff" />
            <Text style={styles.readBtnText}>开始阅读</Text>
          </Pressable>
        )}
        {/* Tab */}
        <View style={styles.tabBar}>
          {TABS.map((label, i) => (
            <Pressable key={label} onPress={() => setActiveTab(i)} style={[styles.tab, activeTab === i && styles.tabActive]}>
              <Text style={[styles.tabText, activeTab === i && styles.tabTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        {/* Tab 0: 详情 */}
        {activeTab === 0 && (
          <View style={{ paddingHorizontal: Spacing.marginEdge, marginTop: 12 }}>
            {creatorInfo && (
              <Pressable onPress={() => nav.navigate('PicaCreatorResult', { creatorId: creatorInfo.id, creatorName: creatorInfo.name })} style={styles.creatorRow}>
                {creatorInfo.avatar ? <Image source={{ uri: creatorInfo.avatar }} style={styles.creatorAvatar} contentFit="cover" /> : <View style={[styles.creatorAvatar, { backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' }]}><Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{(creatorInfo.name[0] || '').toUpperCase()}</Text></View>}
                <View style={{ flex: 1 }}><Text style={{ fontWeight: '600', color: C.textPrimary, fontSize: 14 }}>{creatorInfo.name}</Text><Text style={{ color: C.textTertiary, fontSize: 12 }}>上传者</Text></View>
                <MaterialIcons name="chevron-right" size={20} color={C.textTertiary} />
              </Pressable>
            )}
            {detail.description ? <Text style={{ color: C.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 12 }} numberOfLines={10}>{detail.description}</Text> : null}
          </View>
        )}
        {/* Tab 1: 章节 */}
        {activeTab === 1 && chs.length > 0 && (
          <View style={{ paddingHorizontal: Spacing.marginEdge, marginTop: 8 }}>
            <View style={styles.chapterHeader}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: C.textPrimary }}>章节 ({chs.length})</Text>
              <Pressable onPress={() => setSortAsc(!sortAsc)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MaterialIcons name="sort" size={14} color={C.textTertiary} />
                <Text style={{ color: C.textTertiary, fontSize: 12 }}>{sortAsc ? '正序' : '倒序'}</Text>
              </Pressable>
            </View>
            {sortedChs.map((ch) => (
              <Pressable key={ch.id} onPress={() => nav.navigate('PicaReader', { comicId: detail.id, chapterOrder: ch.order, chapterId: ch.id, title: detail.title })} style={styles.epCard}>
                <MaterialIcons name="book" size={14} color={C.textTertiary} style={{ marginRight: 6 }} />
                <Text style={styles.epTitle} numberOfLines={1}>{ch.title}</Text>
                <MaterialIcons name="chevron-right" size={16} color={C.textTertiary} />
              </Pressable>
            ))}
          </View>
        )}
        {/* Tab 2: 评论 */}
        {activeTab === 2 && (
          <View style={{ paddingHorizontal: Spacing.marginEdge, marginTop: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end', marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                {replyTo && (<View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}><Text style={{ color: C.primary, fontSize: 12, flex: 1 }}>回复 @{replyTo.name}</Text><Pressable onPress={() => setReplyTo(null)} hitSlop={8}><MaterialIcons name="close" size={14} color={C.textTertiary} /></Pressable></View>)}
                <TextInput style={styles.commentInput} placeholder={replyTo ? `回复 @${replyTo.name}...` : '说点什么...'} placeholderTextColor={C.textTertiary} value={commText} onChangeText={setCommText} multiline />
              </View>
              <Pressable onPress={handleSend} style={[styles.sendBtn, { opacity: sending || !commText.trim() ? 0.5 : 1 }]} disabled={sending || !commText.trim()}>
                <MaterialIcons name="send" size={16} color="#fff" />
              </Pressable>
            </View>
            {commLoading && comments.length === 0 ? <ActivityIndicator color={C.primary} style={{ marginVertical: 20 }} />
            : comments.length === 0 ? <Text style={{ color: C.textTertiary, fontSize: 14, textAlign: 'center', marginVertical: 20 }}>暂无评论</Text>
            : comments.map((c) => {
                const user: any = c._user || c.user || {};
                const uname = user?.name || '匿名';
                return (
                  <View key={c._id} style={styles.commentItem}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={[styles.avatar, { backgroundColor: C.primary + '40' }]}><Text style={styles.avatarText}>{(uname[0] || '?').toUpperCase()}</Text></View>
                      <View style={{ flex: 1 }}><Text style={{ fontWeight: '600', color: C.textPrimary, fontSize: 14 }}>{uname}</Text><Text style={{ fontSize: 11, color: C.textTertiary, marginTop: 1 }}>{fmtTime(c.created_at)}</Text></View>
                      <Pressable onPress={() => handleLike(c._id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <MaterialIcons name={c.isLiked ? 'favorite' : 'favorite-border'} size={14} color={c.isLiked ? '#e74c3c' : C.textTertiary} />
                        <Text style={{ fontSize: 11, color: c.isLiked ? '#e74c3c' : C.textTertiary }}>{c.likesCount || 0}</Text>
                      </Pressable>
                    </View>
                    <Text style={{ color: C.textSecondary, fontSize: 14, marginTop: 4, lineHeight: 20 }}>{c.content}</Text>
                    <Pressable onPress={() => setReplyTo({ id: c._id, name: uname })} style={{ marginTop: 4 }}><Text style={{ color: C.primary, fontSize: 12, fontWeight: '600' }}>回复</Text></Pressable>
                  </View>
                );
              })}
            {hasMoreComm && comments.length > 0 && (<Pressable onPress={() => loadComments(commPage + 1)} style={{ paddingVertical: 12, alignItems: 'center' }}><Text style={{ color: C.primary, fontSize: 14 }}>加载更多</Text></Pressable>)}
          </View>
        )}
        {/* 相关推荐 */}
        {related.length > 0 && (
          <View style={{ marginTop: 24, paddingHorizontal: Spacing.marginEdge }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: C.textPrimary, marginBottom: 10 }}>相关推荐</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {related.slice(0, 10).map((rc) => (
                <Pressable key={rc.id} onPress={() => nav.replace('PicaDetail', { comicId: rc.id })} style={{ marginRight: 10, width: 100 }}>
                  <Image source={{ uri: rc.coverUrl }} style={{ width: 100, height: 140, borderRadius: 8, backgroundColor: C.surfaceContainer }} contentFit="cover" />
                  <Text style={{ color: C.textPrimary, fontSize: 12, marginTop: 4 }} numberOfLines={2}>{rc.title}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function getStyles(C: LegacyColors) {
  return StyleSheet.create({
    headerRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 14 },
    coverThumb: { width: COVER_W, height: COVER_H, borderRadius: 10, backgroundColor: C.surfaceContainer },
    headerInfo: { flex: 1, justifyContent: 'flex-start' },
    title: { fontSize: 18, fontWeight: '800', color: C.textPrimary, lineHeight: 24 },
    author: { fontSize: 14, color: C.primary, marginTop: 6 },
    tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    catTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, backgroundColor: C.primaryLight + '20', borderWidth: 1, borderColor: C.primary + '30' },
    catText: { fontSize: 11, color: C.primary, fontWeight: '600' },
    tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
    tagText: { fontSize: 11, color: C.textSecondary },
    statRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingHorizontal: 16 },
    statItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    statLabel: { fontSize: 12, color: C.textTertiary },
    statDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: C.divider },
    actionRow: { flexDirection: 'row', gap: 10, marginTop: 10, paddingHorizontal: 16 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderRadius: 10, backgroundColor: C.primary + '14', borderWidth: 1, borderColor: C.primary + '25' },
    actionText: { color: C.primary, fontSize: 14, fontWeight: '600' },
    readBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 16, marginTop: 10, height: 46, borderRadius: 12, backgroundColor: C.primary, gap: 6 },
    readBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    tabBar: { flexDirection: 'row', marginHorizontal: 16, marginTop: 14, borderRadius: 10, backgroundColor: C.surface, padding: 3, borderWidth: 1, borderColor: C.border },
    tab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 8 },
    tabActive: { backgroundColor: C.primary },
    tabText: { fontSize: 14, color: C.textSecondary, fontWeight: '600' },
    tabTextActive: { color: '#fff' },
    creatorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: C.border },
    creatorAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.surfaceContainer },
    chapterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    epCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, backgroundColor: C.surface, borderRadius: 8, marginBottom: 5, borderWidth: 1, borderColor: C.border },
    epTitle: { flex: 1, fontSize: 14, color: C.textPrimary, fontWeight: '500' },
    commentInput: { borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: C.textPrimary, backgroundColor: C.surface, maxHeight: 60 },
    sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
    commentItem: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.divider },
    avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  });
}
