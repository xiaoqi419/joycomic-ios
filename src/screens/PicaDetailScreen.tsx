// Pica 漫画详情页
// @author Jason

import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator,
  Dimensions, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useLegacyColors, LegacyColors, FontSize, Radius, Spacing } from '../theme';
import { picaSource } from '../sources/pica';
import type { SourceDetail, SourceChapter } from '../sources/types';

const { width: W } = Dimensions.get('window');
const COVER_H = W * 0.65;
const TABS = ['详情', '章节'];

export function PicaDetailScreen() {
  const nav = useNavigation<any>();
  const p = useRoute<any>().params;
  const comicId = p?.comicId || p?.albumId || p?.id || '';
  const C = useLegacyColors();
  const styles = useMemo(() => getStyles(C), [C]);

  const [detail, setDetail] = useState<SourceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    picaSource.fetchDetail(comicId).then(setDetail).catch(() => {}).finally(() => setLoading(false));
  }, [comicId]);

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

          {/* 开始阅读按钮 */}
          {detail.chapters.length > 0 && (
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

          {/* 标签 */}
          {detail.tags.length > 0 && (
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

        {activeTab === 1 && (
          <View style={{ paddingHorizontal: Spacing.marginEdge, marginTop: 8 }}>
            {detail.chapters
              .slice()
              .reverse()
              .map((ch) => (
                <Pressable
                  key={ch.id}
                  onPress={() => nav.navigate('PicaReader', {
                    comicId: detail.id,
                    chapterOrder: ch.order,
                    chapterId: ch.id,
                    title: detail.title,
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
    backBtn: {
      position: 'absolute', top: Platform.OS === 'ios' ? 0 : 8, left: 8,
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: 'rgba(0,0,0,0.4)',
      alignItems: 'center', justifyContent: 'center',
    },
    infoWrap: { paddingHorizontal: Spacing.marginEdge, marginTop: -40 },
    title: { fontSize: FontSize.title, fontWeight: '800', color: C.textPrimary },
    author: { fontSize: FontSize.body, color: C.textSecondary, marginTop: 4 },
    readBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      height: 48, borderRadius: Radius.button, backgroundColor: C.primary,
      marginTop: 16, gap: 6,
    },
    readBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.body },
    tag: {
      paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.xl,
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    },
    tagText: { fontSize: FontSize.label, color: C.textSecondary },
    tabBar: {
      flexDirection: 'row', marginHorizontal: Spacing.marginEdge, marginTop: 20,
      borderRadius: Radius.card, backgroundColor: C.surface, padding: 4,
    },
    tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: Radius.card - 2 },
    tabActive: { backgroundColor: C.primary },
    tabText: { fontSize: FontSize.body, color: C.textSecondary, fontWeight: '600' },
    tabTextActive: { color: C.textOnPrimary },
    descText: { fontSize: FontSize.body, color: C.textSecondary, lineHeight: 22 },
    epCard: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 14, paddingHorizontal: 14,
      backgroundColor: C.surface, borderRadius: Radius.card,
      marginBottom: 8, borderWidth: 1, borderColor: C.border,
    },
    epTitle: { flex: 1, fontSize: FontSize.body, color: C.textPrimary, fontWeight: '500' },
  });
}
