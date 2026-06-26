// 游戏 — 复刻 APK Games.tsx
// @author nyx

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Linking, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, FontSize } from '../theme';
import { fetchGames } from '../api/endpoints';
import type { GameItem } from '../api/types';

const { width: W } = Dimensions.get('window');
const CARD_W = (W - Spacing.marginEdge * 2 - 8) / 2;

export function GamesScreen() {
  const { t } = useTranslation();
  const [hot, setHot] = useState<GameItem[]>([]);
  const [games, setGames] = useState<GameItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGames().then((d) => {
      setHot(d.hot_games || []);
      setGames(d.games || []);
    }).finally(() => setLoading(false));
  }, []);

  const renderGame = (item: GameItem) => (
    <Pressable
      key={item.gid}
      onPress={() => { if (item.link) Linking.openURL(item.link); }}
      style={{ width: CARD_W, margin: 4, marginBottom: 12 }}
    >
      <Image source={{ uri: item.photo }} style={{ width: CARD_W, height: CARD_W * 0.75, borderRadius: Radius.sm, backgroundColor: Colors.surfaceContainer }} contentFit="cover" />
      <Text style={{ fontSize: FontSize.body, fontWeight: '600', color: Colors.text, marginTop: 4 }} numberOfLines={2}>{item.title}</Text>
      <Text style={{ fontSize: FontSize.caption, color: Colors.textTertiary }}>{item.tags}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: Colors.background }}>
      <FlatList
        data={games}
        numColumns={2}
        keyExtractor={(i) => i.gid}
        contentContainerStyle={{ padding: Spacing.marginEdge, paddingBottom: 100 }}
        ListHeaderComponent={
          <View>
            <Text style={{ fontSize: FontSize.largeTitle, fontWeight: '800', color: Colors.textPrimary, marginBottom: 12 }}>{t('games.title')}</Text>
            {hot.length > 0 && (
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: FontSize.headline, fontWeight: '700', color: Colors.primary, marginBottom: 8 }}>{t('games.hot')}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {hot.map(renderGame)}
                </View>
              </View>
            )}
            <Text style={{ fontSize: FontSize.headline, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 }}>{t('games.all')}</Text>
          </View>
        }
        renderItem={({ item }) => renderGame(item)}
        ListEmptyComponent={loading ? null : <Text style={{ color: Colors.textTertiary, textAlign: 'center', marginTop: 40 }}>{t('common.empty')}</Text>}
      />
    </SafeAreaView>
  );
}
