// 设置页面 - 樱花绯红主题 + MaterialIcons
// @author Jason

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { useSettingsStore, saveSettings } from '../store/useSettings';
import { detectServers } from '../utils/serverDetect';
import { Colors, Radius, Spacing, FontSize } from '../theme';

export function SettingsScreen() {
  const { readingMode, setReadingMode, readingDirection, setReadingDirection,
    selectedServer, setSelectedServer, autoSelectServer, setAutoSelectServer,
    servers, setServers, setDetectingServers, detectingServers } = useSettingsStore();
  const [testing, setTesting] = useState(false);

  useEffect(() => { useSettingsStore.getState().loadSettings(); }, []);

  const testNow = async () => {
    setTesting(true);
    setDetectingServers(true);
    const s = await detectServers();
    setServers(s);
    setDetectingServers(false);
    setTesting(false);
    const fastest = s.find(x => x.available);
    if (fastest && autoSelectServer) {
      setSelectedServer(fastest.domain);
      saveSettings({ selectedServer: fastest.domain });
    }
  };

  const Seg = ({ opts, val, onChange }: { opts: { id: string; label: string }[]; val: string; onChange: (id: string) => void }) => (
    <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, overflow: 'hidden' }}>
      {opts.map((o, i) => (
        <TouchableOpacity key={o.id}
          style={{
            paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm - 2,
            backgroundColor: val === o.id ? Colors.primary : Colors.surfaceLowest,
            borderTopLeftRadius: i === 0 ? Radius.sm : 0,
            borderBottomLeftRadius: i === 0 ? Radius.sm : 0,
            borderTopRightRadius: i === opts.length - 1 ? Radius.sm : 0,
            borderBottomRightRadius: i === opts.length - 1 ? Radius.sm : 0,
          }}
          onPress={() => onChange(o.id)} activeOpacity={0.7}>
          <Text style={{ fontSize: FontSize.body, color: val === o.id ? Colors.textOnPrimary : Colors.textSecondary, fontWeight: '500' }}>{o.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const Section = ({ title, icon, children }: { title: string; icon: keyof typeof MaterialIcons.glyphMap; children: React.ReactNode }) => (
    <View style={{ marginBottom: Spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm, marginLeft: Spacing.xs }}>
        <MaterialIcons name={icon} size={16} color={Colors.primary} />
        <Text style={{ fontSize: FontSize.label, fontWeight: '700', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 4 }}>{title}</Text>
      </View>
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

        <Section title="线路选择" icon="signal-cellular-alt">
          <Row label="自动选择最快线路">
            <TouchableOpacity
              style={[styles.switch, autoSelectServer && styles.switchOn]}
              onPress={() => {
                const v = !autoSelectServer;
                setAutoSelectServer(v);
                saveSettings({ autoSelectServer: v });
                if (v) testNow();
              }}>
              <View style={[styles.switchThumb, autoSelectServer && styles.switchThumbOn]} />
            </TouchableOpacity>
          </Row>

          {!autoSelectServer && (
            <View style={{ marginTop: Spacing.sm }}>
              {servers.length === 0 && !detectingServers && (
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: Spacing.sm }} onPress={testNow}>
                  <MaterialIcons name="wifi-find" size={18} color={Colors.primary} />
                  <Text style={{ color: Colors.primary, marginLeft: 4, fontSize: FontSize.body }}>检测服务器</Text>
                </TouchableOpacity>
              )}
              {detectingServers || testing ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: Spacing.sm }}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={{ color: Colors.textSecondary, marginLeft: 6, fontSize: FontSize.body }}>检测中...</Text>
                </View>
              ) : (
                servers.map(s => (
                  <TouchableOpacity key={s.domain} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}
                    onPress={() => { setSelectedServer(s.domain); saveSettings({ selectedServer: s.domain }); }}
                    activeOpacity={0.7}>
                    <MaterialIcons
                      name={selectedServer === s.domain ? 'radio-button-checked' : 'radio-button-unchecked'}
                      size={18}
                      color={selectedServer === s.domain ? Colors.primary : Colors.textTertiary}
                    />
                    <Text style={{ flex: 1, marginLeft: 8, fontSize: FontSize.body, color: Colors.textPrimary }}>{s.name}</Text>
                    <Text style={{ fontSize: FontSize.label, color: s.available ? Colors.success : Colors.error, marginHorizontal: 4 }}>
                      {s.available ? `${s.latency}ms` : '超时'}
                    </Text>
                    <MaterialIcons name={s.available ? 'check-circle' : 'error'} size={14} color={s.available ? Colors.success : Colors.error} />
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </Section>

        <Section title="阅读设置" icon="menu-book">
          <Row label="阅读模式">
            <Seg opts={[{ id: 'scroll', label: '滚动' }, { id: 'page', label: '翻页' }]}
              val={readingMode}
              onChange={v => { setReadingMode(v as any); saveSettings({ readingMode: v as any }); }} />
          </Row>
          <View style={{ height: 1, backgroundColor: Colors.divider }} />
          <Row label="阅读方向">
            <Seg opts={[{ id: 'ltr', label: '从左到右' }, { id: 'rtl', label: '从右到左' }]}
              val={readingDirection}
              onChange={v => { setReadingDirection(v as any); saveSettings({ readingDirection: v as any }); }} />
          </Row>
        </Section>

        <Section title="关于" icon="info">
          <Row label="应用名称"><Text style={{ fontSize: FontSize.body, color: Colors.textSecondary }}>JMComic</Text></Row>
          <View style={{ height: 1, backgroundColor: Colors.divider }} />
          <Row label="版本"><Text style={{ fontSize: FontSize.body, color: Colors.textSecondary }}>1.0.0</Text></Row>
          <View style={{ height: 1, backgroundColor: Colors.divider }} />
          <Row label="数据来源"><Text style={{ fontSize: FontSize.body, color: Colors.textSecondary }}>18comic.vip</Text></Row>
        </Section>

        <Text style={{ marginTop: Spacing.lg, fontSize: FontSize.label, color: Colors.textTertiary, lineHeight: 18, textAlign: 'center' }}>
          本应用为第三方客户端，仅供学习交流使用。
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  switch: {
    width: 44, height: 24, borderRadius: 12, backgroundColor: '#CBD5E1', justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchOn: { backgroundColor: Colors.primary },
  switchThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  switchThumbOn: { alignSelf: 'flex-end' },
});
