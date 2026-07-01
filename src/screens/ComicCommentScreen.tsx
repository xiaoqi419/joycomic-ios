// 评论列表页 — 支持分页加载、回复输入
// 数据来源：fetchComments（分页评论列表）+ postComment（发布评论）
// @author Jason

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  View, Text, FlatList, Pressable, TextInput,
  ActivityIndicator, StyleSheet, Keyboard, KeyboardAvoidingView,
  Platform, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RenderHtml from 'react-native-render-html';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { fetchComments, postComment } from '../api/endpoints';
import { useAppTheme } from '../theme';
import { Spacing, FontSize, Radius } from '../theme';
import type { CommentItem } from '../api/types';

type Props = NativeStackScreenProps<any, 'ComicComment'>;

/** 时间显示 */
function formatTime(addtime: string): string {
  if (!addtime) return '';
  // API 返回 YYYY-MM-DD HH:mm:ss 格式
  return addtime.slice(0, 16);
}

export function ComicCommentScreen({ route, navigation }: Props) {
  const { albumId, total } = route.params as { albumId: string; total?: number };
  const nav = navigation || useNavigation();
  const { colors } = useAppTheme();
  const { width: screenWidth } = useWindowDimensions();
  const htmlContentWidth = useMemo(() => screenWidth - Spacing.marginEdge * 2 - 10 - 36 - 10, [screenWidth]);

  const [comments, setComments] = useState<CommentItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [inputText, setInputText] = useState('');
  const [posting, setPosting] = useState(false);
  const [replyTo, setReplyTo] = useState<{ username: string; cid: string } | null>(null);
  const inputRef = useRef<TextInput>(null);

  /** 加载一页评论 */
  const loadPage = useCallback(async (p: number, append: boolean) => {
    try {
      const res = await fetchComments(albumId, p, 'manhua');
      const list = res.list || [];
      if (list.length < 20) setHasMore(false);
      else setHasMore(true);
      if (append) {
        setComments((prev) => [...prev, ...list]);
      } else {
        setComments(list);
      }
      setPage(p);
    } catch {
      if (!append) setComments([]);
    }
  }, [albumId]);

  /** 首次加载 */
  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadPage(1, false);
      setLoading(false);
    })();
  }, []);

  /** 加载更多 */
  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await loadPage(page + 1, true);
    setLoadingMore(false);
  }, [page, loadingMore, hasMore, loadPage]);

  /** 发布评论 */
  const handlePost = useCallback(async () => {
    const text = inputText.trim();
    if (!text || posting) return;
    setPosting(true);
    try {
      await postComment(albumId, text);
      setInputText('');
      setReplyTo(null);
      // 刷新列表
      setPage(1);
      setHasMore(true);
      await loadPage(1, false);
    } catch {
      // 错误静默处理
    } finally {
      setPosting(false);
    }
  }, [inputText, posting, albumId, loadPage]);

  /** 点击回复 */
  const handleReply = useCallback((item: CommentItem) => {
    setReplyTo({ username: item.username, cid: item.CID });
    inputRef.current?.focus();
  }, []);

  /** 取消回复 */
  const cancelReply = useCallback(() => {
    setReplyTo(null);
    Keyboard.dismiss();
  }, []);

  const renderComment = ({ item }: { item: CommentItem }) => {
    const baseStyle = useMemo(() => ({
      color: colors.onSurface,
      fontSize: FontSize.body,
      lineHeight: 20,
    }), [colors.onSurface]);

    const tagStyles = useMemo(() => ({
      a: { color: colors.primary, textDecorationLine: 'underline' as const },
      p: { marginVertical: 2 },
    }), [colors.primary]);

    return (
      <View style={[css.commentItem, { borderBottomColor: colors.outlineVariant }]}>
        <View style={css.commentRow}>
          {/* 头像 */}
          <View style={[css.avatar, { backgroundColor: colors.primaryContainer }]}>
            {item.photo ? (
              <Image source={{ uri: item.photo }} style={css.avatarImg} contentFit="cover" />
            ) : (
              <Text style={[css.avatarText, { color: colors.onPrimaryContainer }]}>
                {item.username[0]?.toUpperCase() || '?'}
              </Text>
            )}
          </View>
          {/* 内容 */}
          <View style={css.commentBody}>
            <View style={css.commentHeader}>
              <Text style={[css.username, { color: colors.primary }]}>{item.username}</Text>
              <Text style={[css.time, { color: colors.outline }]}>{formatTime(item.addtime)}</Text>
            </View>
            <RenderHtml
              source={{ html: item.content }}
              contentWidth={htmlContentWidth}
              baseStyle={baseStyle}
              tagsStyles={tagStyles}
              enableExperimentalBRCollapsing
            />

            {/* 回复列表 */}
            {item.replys && item.replys.length > 0 && (
              <View style={[css.replyWrap, { backgroundColor: colors.surfaceContainerLow }]}>
                {item.replys.map((reply) => (
                  <View key={reply.CID} style={css.replyItem}>
                    <Text style={[css.replyUser, { color: colors.primary }]}>
                      {reply.username}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <RenderHtml
                        source={{ html: reply.content }}
                        contentWidth={htmlContentWidth - 80}
                        baseStyle={{ ...baseStyle, fontSize: FontSize.label }}
                        tagsStyles={tagStyles}
                        enableExperimentalBRCollapsing
                      />
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* 操作按钮 */}
            <Pressable onPress={() => handleReply(item)} style={css.replyBtn}>
              <Text style={[css.replyBtnText, { color: colors.outline }]}>回复</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[css.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* 标题栏 */}
      <View style={[css.header, { borderBottomColor: colors.outlineVariant }]}>
        <Pressable onPress={() => nav.goBack()} style={css.backBtn}>
          <Text style={[css.backText, { color: colors.primary }]}>← 返回</Text>
        </Pressable>
        <Text style={[css.headerTitle, { color: colors.onSurface }]}>
          评论{total != null ? ` (${total})` : ''}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      {/* 评论列表 */}
      {loading ? (
        <View style={css.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(i) => i.CID}
          renderItem={renderComment}
          contentContainerStyle={css.listContent}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <Text style={[css.empty, { color: colors.outline }]}>暂无评论，来发表第一条吧</Text>
          }
          ListFooterComponent={
            loadingMore ? <View style={css.footer}><ActivityIndicator size="small" color={colors.primary} /></View> : null
          }
        />
      )}

      {/* 底部输入栏 */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[css.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.outlineVariant }]}>
          {replyTo && (
            <View style={css.replyIndicator}>
              <Text style={[css.replyIndicatorText, { color: colors.outline }]}>
                回复 @{replyTo.username}
              </Text>
              <Pressable onPress={cancelReply}>
                <Text style={[css.cancelReply, { color: colors.error }]}>取消</Text>
              </Pressable>
            </View>
          )}
          <View style={css.inputRow}>
            <TextInput
              ref={inputRef}
              style={[css.textInput, { backgroundColor: colors.surfaceContainerHigh, color: colors.onSurface }]}
              placeholder={replyTo ? `回复 @${replyTo.username}...` : '写下你的评论...'}
              placeholderTextColor={colors.outline}
              value={inputText}
              onChangeText={setInputText}
              multiline={false}
              returnKeyType="send"
              onSubmitEditing={handlePost}
            />
            <Pressable
              onPress={handlePost}
              disabled={!inputText.trim() || posting}
              style={[
                css.sendBtn,
                { backgroundColor: inputText.trim() ? colors.primary : colors.surfaceContainerHigh },
              ]}
            >
              {posting ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <Text style={[css.sendText, { color: inputText.trim() ? colors.onPrimary : colors.outline }]}>
                  发送
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const css = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.marginEdge, paddingVertical: 12, borderBottomWidth: 0.5 },
  backBtn: { width: 60 },
  backText: { fontSize: FontSize.body, fontWeight: '600' },
  headerTitle: { fontSize: FontSize.headline, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 120 },
  commentItem: { paddingHorizontal: Spacing.marginEdge, paddingVertical: 14, borderBottomWidth: 0.5 },
  commentRow: { flexDirection: 'row' },
  avatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImg: { width: 36, height: 36, borderRadius: 18 },
  avatarText: { fontSize: FontSize.body, fontWeight: '700' },
  commentBody: { flex: 1, marginLeft: 10 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  username: { fontSize: FontSize.label, fontWeight: '700' },
  time: { fontSize: FontSize.caption },
  commentContent: { fontSize: FontSize.body, lineHeight: 20, marginTop: 4 },
  replyWrap: { marginTop: 8, padding: 10, borderRadius: Radius.sm },
  replyItem: { flexDirection: 'row', marginBottom: 4 },
  replyUser: { fontSize: FontSize.label, fontWeight: '700' },
  replyContent: { fontSize: FontSize.label, flex: 1 },
  replyBtn: { marginTop: 6 },
  replyBtnText: { fontSize: FontSize.caption, fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 60, fontSize: FontSize.body },
  footer: { paddingVertical: 20 },
  inputBar: { borderTopWidth: 0.5, paddingHorizontal: Spacing.marginEdge, paddingVertical: 10, paddingBottom: Platform.OS === 'ios' ? 30 : 10 },
  replyIndicator: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  replyIndicatorText: { fontSize: FontSize.label },
  cancelReply: { fontSize: FontSize.label, fontWeight: '600' },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  textInput: { flex: 1, borderRadius: Radius.chip, paddingHorizontal: 14, paddingVertical: 10, fontSize: FontSize.body, maxHeight: 40 },
  sendBtn: { marginLeft: 8, borderRadius: Radius.chip, paddingHorizontal: 16, paddingVertical: 10 },
  sendText: { fontSize: FontSize.label, fontWeight: '700' },
});
