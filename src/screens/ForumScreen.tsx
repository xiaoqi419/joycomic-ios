// 论坛 — 复刻 APK Forum.tsx
// @author nyx

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, FontSize } from '../theme';
import { fetchForumPosts } from '../api/endpoints';
import type { ForumPost } from '../api/types';
import { formatTime } from '../utils/helpers';

export function ForumScreen() {
  const nav = useNavigation<any>();
  const { t } = useTranslation();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForumPosts().then((d) => setPosts(d.list || [])).finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: Colors.background }}>
      <FlatList
        data={posts}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: Spacing.marginEdge, paddingBottom: 100 }}
        ListHeaderComponent={
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: FontSize.largeTitle, fontWeight: '800', color: Colors.textPrimary }}>{t('forum.title')}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ backgroundColor: Colors.surface, borderRadius: Radius.sm, padding: 12, marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{(item.username || '?')[0]}</Text>
              </View>
              <Text style={{ fontWeight: '600', color: Colors.textPrimary }}>{item.username}</Text>
              <Text style={{ fontSize: FontSize.caption, color: Colors.textTertiary }}>{formatTime(item.addtime)}</Text>
            </View>
            <Text style={{ fontSize: FontSize.bodyLarge, fontWeight: '600', color: Colors.text, marginBottom: 4 }}>{item.title}</Text>
            <Text style={{ color: Colors.textSecondary, lineHeight: 20 }} numberOfLines={3}>{item.content}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
              <MaterialIcons name="chat-bubble-outline" size={14} color={Colors.textTertiary} />
              <Text style={{ fontSize: FontSize.caption, color: Colors.textTertiary }}>{item.reply_count || 0}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={loading ? null : <Text style={{ color: Colors.textTertiary, textAlign: 'center', marginTop: 40 }}>{t('common.empty')}</Text>}
      />
    </SafeAreaView>
  );
}
