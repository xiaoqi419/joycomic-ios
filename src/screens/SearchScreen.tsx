// 搜索页 — 原生组件重写
// @author Jason

import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { ComicCard } from '../components/ComicCard';
import { searchAlbums } from '../api/mobile';
import { Colors, Radius, Spacing, FontSize, Shadow } from '../theme';

const TAGS = ['全彩', '无修正', '同人', 'CG', '韩漫', '纯爱', 'NTR', '后宫', '姐系', '母系'];

export function SearchScreen({ navigation }: any) {
  const [kw, setKw] = useState(''); const [res, setRes] = useState<any[]>([]); const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false); const [page, setPage] = useState(1); const [more, setMore] = useState(true);

  const search = useCallback(async (p: number, refresh = false) => {
    const keyword = kw.trim();
    if (!keyword) return;
    setLoading(true);
    if (/^\d{4,}$/.test(keyword)) { setLoading(false); setSearched(true); navigation.navigate('AlbumDetail', { albumId: keyword }); return; }
    try { const r = await searchAlbums({ keyword, page: p, sort: 'mv' }); if (refresh || p === 1) setRes(r.content); else setRes(prev => [...prev, ...r.content]); setMore(r.content.length >= 20); setSearched(true); } catch {} finally { setLoading(false); }
  }, [kw, navigation]);

  const onSearch = () => { setPage(1); search(1, true); };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <FlatList data={res} numColumns={3} keyExtractor={i => i.id}
        contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: Spacing.xl }}
        ListHeaderComponent={
          <View style={{ paddingTop: Spacing.sm }}>
            {/* 原生风格搜索框 */}
            <View style={styles.searchWrap}>
              <MaterialIcons name="search" size={20} color={Colors.textTertiary} style={{ marginLeft: 10 }} />
              <TextInput style={styles.input} placeholder="搜索漫画、作者、标签，或车号..."
                placeholderTextColor={Colors.textTertiary} value={kw} onChangeText={setKw}
                onSubmitEditing={onSearch} returnKeyType="search" />
              {kw.length > 0 && (
                <Pressable onPress={() => { setKw(''); setSearched(false); setRes([]); }}
                  style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, paddingRight: 8 })}>
                  <MaterialIcons name="close" size={18} color={Colors.textTertiary} />
                </Pressable>
              )}
            </View>

            {/* 搜索按钮 */}
            <Pressable onPress={onSearch} style={({ pressed }) => [styles.searchBtn, { opacity: pressed ? 0.7 : 1 }]}>
              <MaterialIcons name="search" size={18} color="#fff" />
              <Text style={styles.searchBtnText}>搜索</Text>
            </Pressable>

            {!searched && (
              <View style={{ marginTop: Spacing.md }}>
                <Text style={styles.sectionTitle}>
                  <MaterialIcons name="local-fire-department" size={16} color={Colors.accent} /> 热门搜索
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {TAGS.map(t => (
                    <Pressable key={t} onPress={() => { setKw(t); setTimeout(onSearch, 100); }}
                      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.surfaceContainerLow, borderWidth: 1, borderColor: Colors.border })}>
                      <Text style={{ fontSize: 13, color: Colors.textSecondary }}>{t}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={{ fontSize: 11, color: Colors.textTertiary, marginTop: 8, textAlign: 'center' }}>
                  纯数字车号（如 480715）直达漫画
                </Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={!loading && searched ? (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <MaterialIcons name="search-off" size={48} color={Colors.textTertiary} />
            <Text style={{ fontSize: 15, color: Colors.textSecondary, marginTop: 12 }}>未找到相关结果</Text>
          </View>
        ) : null}
        renderItem={({ item }) => <ComicCard id={item.id} title={item.name} coverUrl={item.coverUrl} tags={item.tags} onPress={id => navigation.navigate('AlbumDetail', { albumId: id })} />}
        ListFooterComponent={loading ? <ActivityIndicator style={{ paddingVertical: Spacing.lg }} color={Colors.primary} /> : null}
        onEndReached={async () => { if (!more || loading) return; const np = page + 1; setPage(np); search(np); }}
        onEndReachedThreshold={0.5}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  sectionTitle: { fontSize: FontSize.headline, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceLowest,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.border,
  },
  input: { flex: 1, height: 40, paddingHorizontal: 8, color: Colors.textPrimary, fontSize: 15 },
  searchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 8, height: 40, borderRadius: 10, backgroundColor: Colors.primary, gap: 6,
  },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
