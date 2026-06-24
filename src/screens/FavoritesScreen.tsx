// 收藏页 - 樱花绯红主题
// @author Jason

import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { useFavoritesStore } from '../store/useFavorites';
import { Colors, Radius, Spacing, FontSize } from '../theme';

export function FavoritesScreen({ navigation }: any) {
  const { items, isLoading, loadFavorites, removeFavorite } = useFavoritesStore();
  useEffect(() => { loadFavorites(); }, []);

  if (isLoading) return <SafeAreaView style={styles.container}><View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <FlatList data={items} keyExtractor={i => i.id} contentContainerStyle={{ padding: Spacing.marginEdge, paddingBottom: Spacing.xl * 2 }}
        ListHeaderComponent={<Text style={{ fontSize: FontSize.title, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.md }}>我的收藏 <Text style={{ fontSize: FontSize.body, color: Colors.textSecondary, fontWeight: '400' }}>({items.length})</Text></Text>}
        ListEmptyComponent={<View style={{ alignItems: 'center', marginTop: 60 }}><Text style={{ fontSize: 48, marginBottom: Spacing.md }}>📚</Text><Text style={{ fontSize: FontSize.bodyLarge, color: Colors.textSecondary, marginBottom: Spacing.xs }}>还没有收藏</Text><Text style={{ fontSize: FontSize.body, color: Colors.textTertiary }}>在漫画详情页点击收藏按钮即可添加</Text></View>}
        renderItem={({ item }) => (
          <TouchableOpacity style={{ flexDirection: 'row', backgroundColor: Colors.surfaceLowest, borderRadius: Radius.sm, padding: 10, marginBottom: 10, alignItems: 'center' }}
            onPress={() => navigation.navigate('AlbumDetail', { albumId: item.id })} activeOpacity={0.8}>
            <Image source={{ uri: item.coverUrl }} style={{ width: 60, height: 80, borderRadius: Radius.xs, backgroundColor: Colors.surfaceContainer }} contentFit="cover" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ fontSize: FontSize.bodyLarge, fontWeight: '600', color: Colors.textPrimary, marginBottom: 2 }} numberOfLines={2}>{item.title}</Text>
              <Text style={{ fontSize: FontSize.label, color: Colors.textSecondary }}>{item.author}</Text>
            </View>
            <TouchableOpacity style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.xs, borderWidth: 1, borderColor: Colors.error + '40' }}
              onPress={() => removeFavorite(item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={{ fontSize: FontSize.label, color: Colors.error, fontWeight: '500' }}>删除</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
