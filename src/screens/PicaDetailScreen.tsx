// Pica 漫画详情页 + 评论系统
// @author Jason

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator,
  Dimensions, Platform, TextInput, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useLegacyColors, LegacyColors, FontSize, Radius, Spacing } from '../theme';
import { picaSource } from '../sources/pica';
import { comicComments, sendComment, likeComment, replyComment } from '../pica/endpoints';
import type { SourceDetail } from '../sources/types';

const { width: W } = Dimensions.get('window');
const COVER_H = W * 0.65;
const TABS = ['详情', '章节', '评论'];

interface PicaComment {
  _id: string;
  content: string;
  user: { name: string; avatar?: any };
  _user: { name: string; avatar?: any };
  likesCount: number;
  isLiked?: boolean;
  created_at: string;
  totalComments?: number;
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

  // 评论
  const [comments, setComments] = useState<PicaComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentPage, setCommentPage] = useState(1);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    picaSource.fetchDetail(comicId).then(setDetail).catch(() => {}).finally(() => setLoading(false));
  }, [comicId]);

  // 加载评论
  const loadComments = useCallback(async (page = 1, refresh = false) => {
    if (commentsLoading) return;
    setCommentsLoading(true);
    try {
      const raw = await comicComments(comicId, page);
      const data = (raw as any).comments || raw;
      const docs: PicaComment[] = data.docs || [];
      if (refresh || page === 1) setComments(docs);
      else setComments((prev) => [...prev, ...docs]);
      setHasMoreComments(docs.length >= 20);
      setCommentPage(page);
    } catch {}
    setCommentsLoading(false);
  }, [comicId, commentsLoading]);

  useEffect(() => {
    if (activeTab === 2 && comments.length === 0 && !commentsLoading) {
      loadComments(1, true);
    }
  }, [activeTab]);

  // 发表评论 / 回复
  const handleSend = async () => {
    const text = commentText.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      if (replyTo) {
        await replyComment(replyTo.id, text);
      } else {
        await sendComment(comicId, text);
      }
      setCommentText('');
      setReplyTo(null);
      loadComments(1, true);
    } catch {}
    setSending(false);
  };

  // 点赞评论
  const handleLike = async (commentId: string) => {
    try {
      await likeComment(commentId);
      setComments((prev) => prev.map((c) =>
        c._id === commentId ? { ...c, isLiked: !c.isLiked, likesCount: c.likesCount + (c.isLiked ? -1 : 1) } : c
      ));
    } catch {}
  };

  // 格式化时间
  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}-${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <SafeAreaView edges={["top"]} style={styles.cont}>
        <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  if (!detail) {
    return (
      <SafeAreaView edges={["top"]} style={styles.cont}>
        <View style={{ alignItems: 'center', marginTop: 100 }}>
          <MaterialIcons name="error-outline" size={48} color={C.textTertiary} />
          <Text style={{ color: C.textSecondary, marginTop: 12 }}>加载失败</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.cont}>
      <StatusBar style="light" />

      {/* 顶部渐变封面 */}
      <View style={styles.coverWrap}>
        <Image source={{ uri: detail.coverUrl }} style={styles.cover} contentFit="cover" />
        <LinearGradient colors={['transparent', C.background]} style={styles.coverGradient} pointerEvents="none" />
        <Pressable onPress={() => nav.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* 标题区 */}
        <View style={styles.infoWrap}>
          <Text style={styles.title}>{detail.title}</Text>
          <Text style={styles.author}>{detail.author}</Text>

          {Array.isArray(detail.chapters) && detail.chapters.length > 0 && (
            <Pressable
              onPress={() => nav.navigate('PicaReader', {
                comicId: detail.id,
                chapterOrder: detail.chapters[detail.chapters.length - 1].order,
                chapterId: detail.chapters[detail.chapters.length - 1].id,
                title: detail.title,
              })}
              style={({ pressed }) => [styles.readBtn, { opacity: pressed ? 0.8 : 1 }]}
            >
              <MaterialIcons name="play-arrow" size={22} color="#fff" />
              <Text style={styles.readBtnText}>开始阅读</Text>
            </Pressable>
          )}

          {Array.isArray(detail.tags) && detail.tags.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
              {detail.tags.map((tag) => (
                <Pressable key={tag} onPress={() => nav.navigate('Main', { screen: 'Search', params: { query: tag } })}>
                  <View style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Tab 栏 */}
        <View style={styles.tabBar}>
          {TABS.map((label, i) => (
            <Pressable key={label} onPress={() => setActiveTab(i)} style={[styles.tab, activeTab === i && styles.tabActive]}>
              <Text style={[styles.tabText, activeTab === i && styles.tabTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {activeTab === 0 && (
          <View style={{ paddingHorizontal: Spacing.marginEdge, marginTop: 12 }}>
            <Text style={styles.descText}>{detail.description || '暂无简介'}</Text>
          </View>
        )}

        {activeTab === 1 && Array.isArray(detail.chapters) && (
          <View style={{ paddingHorizontal: Spacing.marginEdge, marginTop: 8 }}>
            {detail.chapters.slice().reverse().map((ch) => (
              <Pressable
                key={ch.id}
                onPress={() => nav.navigate('PicaReader', {
                  comicId: detail.id, chapterOrder: ch.order, chapterId: ch.id, title: detail.title,
                })}
                style={({ pressed }) => [styles.epCard, pressed && { opacity: 0.7 }]}
              >
                <MaterialIcons name="book" size={18} color={C.textTertiary} style={{ marginRight: 8 }} />
                <Text style={styles.epTitle} numberOfLines={1}>{ch.title}</Text>
                <MaterialIcons name="chevron-right" size={20} color={C.textTertiary} />
              </Pressable>
            ))}
          </View>
        )}

        {/* ===== 评论 Tab ===== */}
        {activeTab === 2 && (
          <View style={{ paddingHorizontal: Spacing.marginEdge, marginTop: 8 }}>
            {/* 评论输入框 */}
            <View style={styles.commentInputWrap}>
              {replyTo && (
                <View style={styles.replyIndicator}>
                  <Text style={{ color: C.primary, fontSize: FontSize.label, flex: 1 }}>
                    回复 @{replyTo.name}
                  </Text>
                  <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
                    <MaterialIcons name="close" size={16} color={C.textTertiary} />
                  </Pressable>
                </View>
              )}
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <TextInput
                  style={[styles.commentInput, { color: C.textPrimary, borderColor: C.border }]}
                  placeholder={replyTo ? `回复 @${replyTo.name}` : '说点什么...'}
                  placeholderTextColor={C.textTertiary}
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                />
                <Pressable onPress={handleSend} style={[styles.sendBtn, { opacity: sending || !commentText.trim() ? 0.5 : 1 }]} disabled={sending || !commentText.trim()}>
                  <MaterialIcons name="send" size={18} color="#fff" />
                </Pressable>
              </View>
            </View>

            {commentsLoading && comments.length === 0 ? (
              <ActivityIndicator color={C.primary} style={{ marginTop: 20 }} />
            ) : comments.length === 0 ? (
              <View style={{ alignItems: 'center', marginTop: 40 }}>
                <MaterialIcons name="chat-bubble-outline" size={40} color={C.textTertiary} />
                <Text style={{ color: C.textSecondary, marginTop: 8, fontSize: FontSize.body }}>暂无评论</Text>
              </View>
            ) : (
              <>
                {comments.map((c) => {
                  const user = c._user || c.user || {};
                  const uname = user.name || '匿名';
                  return (
                    <View key={c._id} style={styles.commentItem}>
                      <View style={styles.commentHeader}>
                        <View style={[styles.avatar, { backgroundColor: C.primary + '40' }]}>
                          <Text style={styles.avatarText}>{(uname[0] || '?').toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: '600', color: C.textPrimary, fontSize: FontSize.body }}>{uname}</Text>
                          <Text style={{ fontSize: FontSize.caption, color: C.textTertiary, marginTop: 1 }}>{fmtTime(c.created_at)}</Text>
                        </View>
                        {/* 点赞按钮 */}
                        <Pressable onPress={() => handleLike(c._id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <MaterialIcons name={c.isLiked ? 'favorite' : 'favorite-border'} size={16} color={c.isLiked ? '#e74c3c' : C.textTertiary} />
                          <Text style={{ fontSize: FontSize.caption, color: c.isLiked ? '#e74c3c' : C.textTertiary }}>{c.likesCount || 0}</Text>
                        </Pressable>
                      </View>
                      <Text style={{ color: C.textSecondary, fontSize: FontSize.body, marginTop: 4, lineHeight: 20 }}>{c.content}</Text>
                      {/* 回复按钮 */}
                      <Pressable onPress={() => setReplyTo({ id: c._id, name: uname })} style={{ marginTop: 6 }}>
                        <Text style={{ color: C.primary, fontSize: FontSize.label, fontWeight: '600' }}>回复</Text>
                      </Pressable>
                    </View>
                  );
                })}
                {hasMoreComments && (
                  <Pressable onPress={() => loadComments(commentPage + 1)} style={{ paddingVertical: 14, alignItems: 'center' }}>
                    <Text style={{ color: C.primary, fontSize: FontSize.body }}>加载更多</Text>
                  </Pressable>
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function getStyles(C: LegacyColors) {
  return StyleSheet.create({
    cont: { flex: 1, backgroundColor: C.background },
    coverWrap: { height: COVER_H, position: 'relative' },
    cover: { width: '100%', height: '100%' },
    coverGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%' },
    backBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 0 : 8, left: 8, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
    infoWrap: { paddingHorizontal: Spacing.marginEdge, marginTop: -40 },
    title: { fontSize: FontSize.title, fontWeight: '800', color: C.textPrimary },
    author: { fontSize: FontSize.body, color: C.textSecondary, marginTop: 4 },
    readBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: Radius.button, backgroundColor: C.primary, marginTop: 16, gap: 6 },
    readBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.body },
    tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.xl, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
    tagText: { fontSize: FontSize.label, color: C.textSecondary },
    tabBar: { flexDirection: 'row', marginHorizontal: Spacing.marginEdge, marginTop: 20, borderRadius: Radius.card, backgroundColor: C.surface, padding: 4 },
    tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: Radius.card - 2 },
    tabActive: { backgroundColor: C.primary },
    tabText: { fontSize: FontSize.body, color: C.textSecondary, fontWeight: '600' },
    tabTextActive: { color: C.textOnPrimary },
    descText: { fontSize: FontSize.body, color: C.textSecondary, lineHeight: 22 },
    epCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, backgroundColor: C.surface, borderRadius: Radius.card, marginBottom: 8, borderWidth: 1, borderColor: C.border },
    epTitle: { flex: 1, fontSize: FontSize.body, color: C.textPrimary, fontWeight: '500' },
    // 评论样式
    commentInputWrap: { marginBottom: 16, marginTop: 8 },
    replyIndicator: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, paddingHorizontal: 4 },
    commentInput: { flex: 1, borderWidth: 1, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 8, fontSize: FontSize.body, maxHeight: 80, backgroundColor: C.surface },
    sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
    commentItem: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.divider },
    commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  });
}
