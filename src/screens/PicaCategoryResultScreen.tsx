// Pica 分类结果页 — 显示某分类下的漫画列表
// @author Jason

import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useLegacyColors, LegacyColors, FontSize, Radius, Spacing } from '../theme';
import { comicsByCategory } from '../pica/endpoints';
import { thumbUrl } from '../pica/types';
import type { PicaComicBrief } from '../pica/types';

const { width: W } = Dimensions.get('window');
const CARD_W = (W - Spacing.marginEdge * 2 - 10 * 2) / 3;

export function PicaCategoryResultScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { category, sort } = route.params as { category: string; sort?: string };
  const C = useLegacyColors();

  const [comics, setComics] = useState<PicaComicBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadComics = async (p: number, refresh = false) => {
    setLoading(true);
    try {
      const res = await comicsByCategory(category, p, (sort as any) || 'ua');
      const data = (res as any).comics || res;
      const docs = data.docs || [];
      if (refresh || p === 1) setComics(docs);
      else setComics((prev) => [...prev, ...docs]);
      setHasMore(docs.length >= 20);
      setPage(p);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadComics(1, true); }, [category, sort]);

  const renderItem = ({ item }: { item: PicaComicBrief }) => (
    <Pressable
      onPress={() => nav.navigate('PicaDetail', { comicId: item._id })}
      style={{ width: CARD_W, marginBottom: 14 }}
    >
      <View style={{ width: '100%', aspectRatio: 0.7, borderRadius: Radius.card, overflow: 'hidden', backgroundColor: C.surfaceContainer }}>
        <Image source={{ uri: thumbUrl(item.thumb) }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
      </View>
      <Text style={{ fontSize: FontSize.label, fontWeight: '600', color: C.textPrimary, marginTop: 6 }} numberOfLines={2}>{item.title}</Text>
      {item.author ? <Text style={{ fontSize: FontSize.caption, color: C.textSecondary, marginTop: 2 }} numberOfLines={1}>{item.author}</Text> : null}
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <FlatList
        data={comics}
        renderItem={renderItem}
        keyExtractor={(i) => i._id}
        numColumns={3}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        contentContainerStyle={{ paddingHorizontal: Spacing.marginEdge, paddingTop: 12, paddingBottom: 40 }}
        onEndReached={() => { if (hasMore && !loading) loadComics(page + 1); }}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={
          <Text style={{ fontSize: FontSize.headline, fontWeight: '700', color: C.textPrimary, marginBottom: 12 }}>{category}</Text>
        }
        ListEmptyComponent={
          loading ? <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} /> :
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <MaterialIcons name="info-outline" size={48} color={C.textTertiary} />
            <Text style={{ color: C.textSecondary, marginTop: 8 }}>暂无漫画</Text>
          </View>
        }
      />
    </View>
  );
}
