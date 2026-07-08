// 日志查看页面 v2 — 小巧 tab + 浅色适配 + 完整 JSON
// @author Jason

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator,
  Clipboard, Alert, Platform, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { logger, LogEntry } from '../utils/HaKaLogger';
import { useLegacyColors, Spacing } from '../theme';

const LEVEL_CONFIG: Record<string, { color: string; icon: string }> = {
  fatal: { color: '#e74c3c', icon: 'error' },
  error: { color: '#e74c3c', icon: 'bug-report' },
  warn: { color: '#f39c12', icon: 'warning' },
  ok: { color: '#2ecc71', icon: 'check-circle' },
  info: { color: '#3498db', icon: 'info' },
  debug: { color: '#9895A0', icon: 'code' },
  trace: { color: '#6B6873', icon: 'more-horiz' },
};

export function LogsScreen() {
  const C = useLegacyColors();
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const fileLogs = await logger.loadFromFile();
      const memLogs = logger.getEntries();
      setEntries([...fileLogs, ...memLogs].sort((a, b) => b.time - a.time));
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadLogs(); }, []);

  const copyLog = (entry: LogEntry) => {
    const full = JSON.stringify(entry, null, 2);
    try {
      Clipboard.setString(full);
      Alert.alert('', '已复制完整 JSON');
    } catch {}
  };

  const levels = Object.keys(LEVEL_CONFIG);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.background }}>
      {/* 顶栏：紧凑布局 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 }}>
        <Text style={{ color: C.textPrimary, fontSize: 18, fontWeight: '700' }}>日志</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Pressable onPress={loadLogs} style={{ padding: 6 }}><MaterialIcons name="refresh" size={20} color={C.primary} /></Pressable>
                    <Pressable onPress={async () => {
            const fileLogs = await logger.loadFromFile();
            const all = [...fileLogs, ...logger.getEntries()]
              .sort((a, b) => b.time - a.time)
              .map((e) => JSON.stringify(e))
              .join('\n');
            await Share.share({ message: all || '无日志', title: 'JOYComic 日志' });
          }} style={{ padding: 6 }}>
            <MaterialIcons name="file-upload" size={20} color={C.primary} />
          </Pressable>
          <Pressable onPress={async () => { await logger.clear(); setEntries([]); }} style={{ padding: 6 }}><MaterialIcons name="delete-sweep" size={20} color={C.error} /></Pressable>
        </View>
      </View>

      {/* 分级过滤 — 紧凑一排 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 14, marginBottom: 6, maxHeight: 32 }}>
        {[{ key: null, label: 'ALL' } as any, ...levels.map((l) => ({ key: l, label: l.toUpperCase() }))].map((item) => (
          <Pressable key={item.key || 'all'} onPress={() => setFilter(item.key)} style={[s.chip, filter === item.key && s.chipActive]}>
            <Text style={[s.chipText, filter === item.key && s.chipTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* 日志列表 */}
      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
      ) : entries.length === 0 ? (
        <View style={{ alignItems: 'center', marginTop: 60 }}>
          <MaterialIcons name="inbox" size={36} color={C.textTertiary} />
          <Text style={{ color: C.textSecondary, marginTop: 8, fontSize: 14 }}>暂无日志</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1, paddingHorizontal: 14 }}>
          {(filter ? entries.filter((e) => e.level === filter) : entries).map((entry, i) => {
            const cfg = LEVEL_CONFIG[entry.level] || LEVEL_CONFIG.info;
            return (
              <Pressable key={i} onPress={() => copyLog(entry)} style={[s.card, { backgroundColor: C.surface, borderColor: C.divider }]}>
                {/* 顶行：级别 + 时间 */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialIcons name={cfg.icon as any} size={14} color={cfg.color} />
                  <Text style={{ color: cfg.color, fontSize: 10, fontWeight: '700' }}>{entry.level.toUpperCase()}</Text>
                  <Text style={{ color: C.textTertiary, fontSize: 10, marginLeft: 'auto' }}>{new Date(entry.time).toLocaleTimeString()}</Text>
                </View>
                {/* 消息 */}
                <Text style={{ color: C.textPrimary, fontSize: 12, marginTop: 4, lineHeight: 16 }} numberOfLines={3}>{entry.msg}</Text>
                {/* 错误 + 堆栈 — 仅简略 */}
                {entry.error && <Text style={{ color: C.error, fontSize: 11, marginTop: 3 }} numberOfLines={2}>{entry.error}</Text>}
                {/* JSON 摘要 */}
                <Text style={{ color: C.textTertiary, fontSize: 9, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginTop: 4 }}>
                  {JSON.stringify(entry).substring(0, 80)}...
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  chip: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
    backgroundColor: 'rgba(128,128,128,0.12)', marginRight: 5,
  },
  chipActive: { backgroundColor: '#E85D3A' },
  chipText: { color: '#9895A0', fontSize: 11, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  card: {
    borderRadius: 8, padding: 10, marginBottom: 6,
    borderWidth: 1,
  },
});
