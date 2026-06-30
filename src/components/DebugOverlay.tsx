// DebugOverlay — 浮动日志面板 + 导出按钮
// @author Jason

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet, SafeAreaView, Platform,
} from 'react-native';
import { jmLogger, LogEntry } from '../utils/JmLogger';

export function DebugOverlay() {
  const [visible, setVisible] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const unsub = jmLogger.subscribe(() => {
      setLogs(jmLogger.getAll());
    });
    return () => { unsub(); };
  }, []);

  useEffect(() => {
    if (visible) {
      setLogs(jmLogger.getAll());
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, [visible]);

  const levelColors: Record<string, string> = {
    info: '#0af', ok: '#0f0', warn: '#fa0', err: '#f00', wv: '#f0f',
  };

  return (
    <>
      {/* 浮动调试按钮 */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>JM</Text>
        {logs.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{logs.length}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" transparent>
        <SafeAreaView style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>JM 调试日志</Text>
            <View style={styles.headerBtns}>
              <TouchableOpacity onPress={() => { jmLogger.clear(); setLogs([]); }} style={styles.btn}>
                <Text style={styles.btnText}>清空</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => jmLogger.export()} style={[styles.btn, { backgroundColor: '#0a0' }]}>
                <Text style={styles.btnText}>导出</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setVisible(false)} style={styles.btnClose}>
                <Text style={styles.btnText}>X</Text>
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
          >
            {logs.length === 0 && (
              <Text style={styles.empty}>暂无日志</Text>
            )}
            {logs.map((entry, i) => (
              <Text key={i} style={[styles.line, { color: levelColors[entry.level] || '#aaa' }]}>
                <Text style={styles.time}>[{entry.time}]</Text> {entry.msg}
              </Text>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute', bottom: 80, right: 16, zIndex: 9999,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#222', borderWidth: 2, borderColor: '#0f0',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#0f0', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 8,
  },
  fabText: { color: '#0f0', fontSize: 14, fontWeight: 'bold' },
  badge: {
    position: 'absolute', top: -4, right: -4,
    width: 20, height: 20, borderRadius: 10, backgroundColor: '#f00',
    justifyContent: 'center', alignItems: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  modal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', margin: 8, borderRadius: 12 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 12, borderBottomWidth: 1, borderBottomColor: '#333',
  },
  title: { color: '#0f0', fontSize: 16, fontWeight: 'bold' },
  headerBtns: { flexDirection: 'row', gap: 8 },
  btn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: '#444',
  },
  btnClose: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: '#600',
  },
  btnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  scroll: { flex: 1 },
  scrollContent: { padding: 8 },
  empty: { color: '#555', textAlign: 'center', marginTop: 40, fontSize: 14 },
  line: { fontSize: 11, lineHeight: 18, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  time: { color: '#666' },
});
