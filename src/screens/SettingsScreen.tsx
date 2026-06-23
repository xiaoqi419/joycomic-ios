// 设置页 - 樱花绯红主题
// @author Jason

import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useSettingsStore, saveSettings } from '../store/useSettings';
import { Colors, Radius, Spacing, FontSize } from '../theme';

export function SettingsScreen() {
  const { readingMode, setReadingMode, readingDirection, setReadingDirection } = useSettingsStore();
  useEffect(() => { useSettingsStore.getState().loadSettings(); }, []);

  const Seg = ({ opts, val, onChange }: { opts: { id: string; label: string }[]; val: string; onChange: (id: string) => void }) => (
    <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, overflow: 'hidden' }}>
      {opts.map((o, i) => (
        <TouchableOpacity key={o.id}
          style={{ paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm - 2, backgroundColor: val === o.id ? Colors.primary : Colors.surfaceLowest,
            borderTopLeftRadius: i === 0 ? Radius.sm : 0, borderBottomLeftRadius: i === 0 ? Radius.sm : 0,
            borderTopRightRadius: i === opts.length - 1 ? Radius.sm : 0, borderBottomRightRadius: i === opts.length - 1 ? Radius.sm : 0 }}
          onPress={() => onChange(o.id)} activeOpacity={0.7}>
          <Text style={{ fontSize: FontSize.body, color: val === o.id ? Colors.textOnPrimary : Colors.textSecondary, fontWeight: '500' }}>{o.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={{ marginBottom: Spacing.lg }}>
      <Text style={{ fontSize: FontSize.label, fontWeight: '700', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm, marginLeft: Spacing.xs }}>{title}</Text>
      <View style={{ backgroundColor: Colors.surfaceLowest, borderRadius: Radius.card, padding: Spacing.md, borderWidth: 1, borderColor: Colors.divider }}>
        {children}
      </View>
    </View>
  );

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm + 2 }}>
      <Text style={{ fontSize: FontSize.bodyLarge, color: Colors.textPrimary }}>{label}</Text>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ padding: Spacing.marginEdge, paddingBottom: Spacing.xl * 2 }}>
        <Text style={{ fontSize: FontSize.largeTitle, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.lg }}>设置</Text>

        <Section title="阅读设置">
          <Row label="阅读模式">
            <Seg opts={[{ id: 'scroll', label: '滚动' }, { id: 'page', label: '翻页' }]} val={readingMode} onChange={v => { setReadingMode(v as any); saveSettings({ readingMode: v as any }); }} />
          </Row>
          <View style={{ height: 1, backgroundColor: Colors.divider }} />
          <Row label="阅读方向">
            <Seg opts={[{ id: 'ltr', label: '从左到右' }, { id: 'rtl', label: '从右到左' }]} val={readingDirection} onChange={v => { setReadingDirection(v as any); saveSettings({ readingDirection: v as any }); }} />
          </Row>
        </Section>

        <Section title="关于">
          <Row label="应用名称"><Text style={{ fontSize: FontSize.body, color: Colors.textSecondary }}>JMComic</Text></Row>
          <View style={{ height: 1, backgroundColor: Colors.divider }} />
          <Row label="版本"><Text style={{ fontSize: FontSize.body, color: Colors.textSecondary }}>1.0.0</Text></Row>
          <View style={{ height: 1, backgroundColor: Colors.divider }} />
          <Row label="数据来源"><Text style={{ fontSize: FontSize.body, color: Colors.textSecondary }}>18comic.vip</Text></Row>
        </Section>

        <Text style={{ marginTop: Spacing.lg, fontSize: FontSize.label, color: Colors.textTertiary, lineHeight: 18, textAlign: 'center' }}>
          本应用为第三方客户端，仅供学习交流使用。所有内容版权归原作者及平台所有。
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
