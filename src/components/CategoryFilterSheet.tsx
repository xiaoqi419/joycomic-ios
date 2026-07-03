// 分类筛选 BottomSheet — 参考 haka_comic dev category_filter_panel.dart
// 支持 JM + Pica 分类多选过滤

import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useLegacyColors, LegacyColors, FontSize, Radius } from '../theme';
import { fetchCategories } from '../api/endpoints';
import { picaCategories } from '../pica/endpoints';
import { usePicaStore } from '../store/usePica';

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (selected: { jm?: string[]; pica?: string[] }) => void;
  initialSelected?: { jm?: string[]; pica?: string[] };
  source?: 'jm' | 'pica' | 'all';
}

interface CatNode {
  id: string;
  name: string;
  slug: string;
  children?: CatNode[];
}

export function CategoryFilterSheet({ visible, onClose, onConfirm, initialSelected, source = 'all' }: Props) {
  const C = useLegacyColors();
  const [jmCats, setJmCats] = useState<CatNode[]>([]);
  const [picaCats, setPicaCats] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedJm, setSelectedJm] = useState<Set<string>>(new Set(initialSelected?.jm || []));
  const [selectedPica, setSelectedPica] = useState<Set<string>>(new Set(initialSelected?.pica || []));
  const picaLoggedIn = usePicaStore((s) => s.loggedIn);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    let completed = 0;
    const done = () => { completed++; if (completed >= 2) setLoading(false); };

    if (source === 'all' || source === 'jm') {
      fetchCategories().then((d) => {
        const cats = (d.categories || []).map((c: any) => ({
          id: c.slug || c.name,
          name: c.name || c.title || '',
          slug: c.slug || '0',
          children: (c.sub_categories || []).map((sc: any) => ({
            id: sc.slug || sc.CID || sc.name,
            name: sc.name || '',
            slug: sc.slug || '0',
          })),
        }));
        setJmCats(cats);
      }).catch(() => {}).finally(done);
    } else { done(); }

    if ((source === 'all' || source === 'pica') && picaLoggedIn) {
      picaCategories().then((d) => {
        const all = ((d as any).categories || []).filter((c: any) => c.isWeb !== true);
        setPicaCats(all.map((c: any) => ({ id: c._id || c.title, name: c.title })));
      }).catch(() => {}).finally(done);
    } else { done(); }
  }, [visible, source, picaLoggedIn]);

  const toggleJm = (slug: string) => {
    setSelectedJm((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug); else next.add(slug);
      return next;
    });
  };

  const togglePica = (name: string) => {
    setSelectedPica((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm({ jm: Array.from(selectedJm), pica: Array.from(selectedPica) });
    onClose();
  };

  const handleClear = () => { setSelectedJm(new Set()); setSelectedPica(new Set()); };
  const hasSelection = selectedJm.size > 0 || selectedPica.size > 0;
  const hasAnyCats = jmCats.length > 0 || (picaLoggedIn && picaCats.length > 0);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: C.background }]} onPress={() => {}}>
          <SafeAreaView style={{ flex: 1 }}>
            {/* 头部 */}
            <View style={[styles.header, { borderBottomColor: 'rgba(255,255,255,0.06)' }]}>
              <Pressable onPress={onClose} hitSlop={8}>
                <Text style={{ color: C.textSecondary, fontSize: FontSize.body }}>取消</Text>
              </Pressable>
              <Text style={{ fontSize: FontSize.headline, fontWeight: '700', color: C.textPrimary }}>分类筛选</Text>
              <Pressable onPress={handleClear} hitSlop={8}>
                <Text style={{ color: hasSelection ? C.primary : C.textTertiary, fontSize: FontSize.body }}>清除</Text>
              </Pressable>
            </View>

            {loading ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
                <ActivityIndicator size="large" color={C.primary} />
                <Text style={{ color: C.textSecondary, marginTop: 12, fontSize: FontSize.body }}>加载分类中…</Text>
              </View>
            ) : !hasAnyCats ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
                <MaterialIcons name="info-outline" size={48} color={C.textTertiary} />
                <Text style={{ color: C.textSecondary, marginTop: 12, fontSize: FontSize.body }}>暂无分类数据</Text>
              </View>
            ) : (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 80 }}>
                {/* JM 分类 */}
                {(source === 'all' || source === 'jm') && jmCats.length > 0 && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>JM 分类</Text>
                    {jmCats.map((cat) => (
                      <View key={cat.id}>
                        <Pressable onPress={() => toggleJm(cat.slug)} style={styles.row}>
                          <MaterialIcons name={selectedJm.has(cat.slug) ? 'check-box' : 'check-box-outline-blank'} size={22} color={selectedJm.has(cat.slug) ? C.primary : C.textTertiary} />
                          <Text style={{ color: C.textPrimary, fontSize: FontSize.body, marginLeft: 10, flex: 1 }}>{cat.name}</Text>
                        </Pressable>
                        {cat.children && cat.children.length > 0 && (
                          <View style={{ paddingLeft: 36 }}>
                            {cat.children.map((sub) => (
                              <Pressable key={sub.id} onPress={() => toggleJm(sub.slug)} style={styles.row}>
                                <MaterialIcons name={selectedJm.has(sub.slug) ? 'check-box' : 'check-box-outline-blank'} size={20} color={selectedJm.has(sub.slug) ? C.primary : C.textTertiary} />
                                <Text style={{ color: C.textSecondary, fontSize: FontSize.label, marginLeft: 10, flex: 1 }}>{sub.name}</Text>
                              </Pressable>
                            ))}
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}

                {/* Pica 分类 */}
                {(source === 'all' || source === 'pica') && picaLoggedIn && picaCats.length > 0 && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>Pica 分类</Text>
                    {picaCats.map((cat) => (
                      <Pressable key={cat.id} onPress={() => togglePica(cat.name)} style={styles.row}>
                        <MaterialIcons name={selectedPica.has(cat.name) ? 'check-box' : 'check-box-outline-blank'} size={22} color={selectedPica.has(cat.name) ? C.primary : C.textTertiary} />
                        <Text style={{ color: C.textPrimary, fontSize: FontSize.body, marginLeft: 10 }}>{cat.name}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </ScrollView>
            )}

            {/* 底部确认按钮 */}
            {!loading && (
              <Pressable onPress={handleConfirm} style={[styles.confirmBtn, { backgroundColor: C.primary }]}>
                <Text style={styles.confirmText}>确定 ({selectedJm.size + selectedPica.size})</Text>
              </Pressable>
            )}
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { maxHeight: '85%', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  section: { paddingHorizontal: 16, paddingTop: 16 },
  sectionTitle: { fontSize: FontSize.headline, fontWeight: '700', marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  confirmBtn: { marginHorizontal: 16, marginTop: 8, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  confirmText: { color: '#fff', fontSize: FontSize.body, fontWeight: '700' },
});
