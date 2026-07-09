// 源选择页 — 手动测速 + 切换
// @author Jason

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useSettingsStore } from '../store/useSettings';
import { useLegacyColors, Spacing } from '../theme';
import { testAllShunts, ShuntInfo } from '../utils/SourceSelector';

export function ShuntSelectorScreen() {
  const C = useLegacyColors();
  const { shunts, selectedShuntKey, selectShunt } = useSettingsStore();
  const [results, setResults] = useState<ShuntInfo[]>([]);
  const [testing, setTesting] = useState(false);

  const handleTest = useCallback(async () => {
    setTesting(true);
    setResults([]);
    try {
      const r = await testAllShunts(shunts);
      setResults(r);
    } catch {}
    setTesting(false);
  }, [shunts]);

  // 自动测速一次
  useEffect(() => {
    if (shunts.length > 0 && results.length === 0) handleTest();
  }, []);

  const selectAndSave = async (key: number) => {
    await selectShunt(key);
    Alert.alert('', '已切换');
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 }}>
        <Text style={{ color: C.textPrimary, fontSize: 18, fontWeight: '700' }}>源/线路</Text>
        <Pressable onPress={handleTest} style={{ padding: 8 }} disabled={testing}>
          <MaterialIcons name="speed" size={22} color={C.primary} />
        </Pressable>
      </View>
      <View style={{ paddingHorizontal: 14, marginBottom: 8 }}>
        <Text style={{ color: C.textTertiary, fontSize: 12 }}>点击⚡测速，绿色延迟最低，点击源切换</Text>
      </View>

      {testing ? (
        <View style={{ alignItems: 'center', marginTop: 40 }}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={{ color: C.textSecondary, marginTop: 8 }}>测速中…</Text>
        </View>
      ) : results.length > 0 ? (
        <ScrollView style={{ flex: 1, paddingHorizontal: 14 }}>
          {results.map((r) => {
            const active = selectedShuntKey === r.key;
            const color = r.latency < 0 ? C.textTertiary : r.latency < 500 ? '#2ecc71' : r.latency < 1500 ? '#f39c12' : '#e74c3c';
            return (
              <Pressable key={r.key} onPress={() => selectAndSave(r.key)} style={[s.card, { backgroundColor: C.surface, borderColor: active ? C.primary : C.divider, borderWidth: active ? 2 : 1 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.textPrimary, fontSize: 15, fontWeight: '600' }}>{r.title}</Text>
                  {r.latency > 0 && <Text style={{ color: color, fontSize: 12, marginTop: 2 }}>{r.latency} ms</Text>}
                  {r.latency === -1 && <Text style={{ color: C.textTertiary, fontSize: 12, marginTop: 2 }}>超时</Text>}
                  {r.imgHost ? <Text style={{ color: C.textTertiary, fontSize: 10, marginTop: 2 }} numberOfLines={1}>{r.imgHost}</Text> : null}
                </View>
                <View style={[s.badge, { backgroundColor: color + '20' }]}>
                  <Text style={{ color, fontSize: 11, fontWeight: '700' }}>{active ? '使用中' : '点击切换'}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        <View style={{ alignItems: 'center', marginTop: 40 }}>
          <MaterialIcons name="wifi-off" size={40} color={C.textTertiary} />
          <Text style={{ color: C.textSecondary, marginTop: 8 }}>暂无数据</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 14, marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
});
