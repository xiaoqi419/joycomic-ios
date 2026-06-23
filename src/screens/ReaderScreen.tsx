// 阅读器 - 樱花绯红主题
// @author Jason

import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Dimensions, StatusBar } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useReaderStore } from '../store/useReader';
import { useSettingsStore } from '../store/useSettings';
import { Colors, Spacing, FontSize } from '../theme';

const W = Dimensions.get('window').width;

export function ReaderScreen({ route, navigation }: any) {
  const { imageUrls, currentPage, setPage, nextPage, prevPage } = useReaderStore();
  const readingMode = useSettingsStore(s => s.readingMode);
  const [showUI, setShowUI] = useState(true);
  const toggle = () => { setShowUI(p => !p); StatusBar.setHidden(!showUI); };

  if (readingMode === 'page') {
    return (
      <View style={{ flex: 1, backgroundColor: '#F1F5F9' }}>
        <StatusBar hidden={!showUI} />
        <TouchableOpacity style={{ flex: 1, justifyContent: 'center', alignItems: 'center', position: 'relative' }} activeOpacity={1} onPress={toggle}>
          <TouchableOpacity style={{ position: 'absolute', left: 0, top: 0, width: '35%', height: '100%', zIndex: 10 }} onPress={prevPage} />
          <TouchableOpacity style={{ position: 'absolute', right: 0, top: 0, width: '35%', height: '100%', zIndex: 10 }} onPress={nextPage} />
          <Image source={{ uri: imageUrls[currentPage] }} style={{ width: W, height: '100%' }} contentFit="contain" />
        </TouchableOpacity>
        {showUI && <SafeAreaView style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 4, backgroundColor: 'rgba(255,248,247,0.92)', borderBottomWidth: 1, borderBottomColor: Colors.divider }}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Text style={{ color: Colors.primary, fontSize: FontSize.bodyLarge, fontWeight: '600' }}>← 返回</Text></TouchableOpacity>
          <Text style={{ color: Colors.textSecondary, fontSize: FontSize.body }}>{currentPage + 1} / {imageUrls.length}</Text>
        </SafeAreaView>}
        {showUI && <SafeAreaView style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100, paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl, paddingTop: Spacing.sm, backgroundColor: 'rgba(255,248,247,0.92)' }}>
          <View style={{ height: 3, backgroundColor: Colors.divider, borderRadius: 2, overflow: 'hidden' }}>
            <View style={{ height: '100%', backgroundColor: Colors.primary, borderRadius: 2, width: `${((currentPage + 1) / imageUrls.length) * 100}%` }} />
          </View>
        </SafeAreaView>}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F1F5F9' }}>
      <StatusBar hidden={!showUI} />
      {showUI && <SafeAreaView style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 4, backgroundColor: 'rgba(255,248,247,0.92)', borderBottomWidth: 1, borderBottomColor: Colors.divider }}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={{ color: Colors.primary, fontSize: FontSize.bodyLarge, fontWeight: '600' }}>← 返回</Text></TouchableOpacity>
        <Text style={{ color: Colors.textSecondary, fontSize: FontSize.body }}>{currentPage + 1} / {imageUrls.length}</Text>
      </SafeAreaView>}
      <FlatList data={imageUrls} keyExtractor={(_, i) => String(i)} showsVerticalScrollIndicator={false}
        onScroll={e => { const o = e.nativeEvent.contentOffset.y; const p = Math.round(o / (W * 1.4)); if (p !== currentPage && p >= 0 && p < imageUrls.length) setPage(p); }}
        scrollEventThrottle={100}
        renderItem={({ item, index }) => (
          <TouchableOpacity activeOpacity={1} onPress={toggle}>
            <Image source={{ uri: item }} style={{ width: W, height: W * 1.4, backgroundColor: '#E2E8F0' }} contentFit="contain" />
          </TouchableOpacity>
        )}
      />
      {showUI && <SafeAreaView style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100, paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl, paddingTop: Spacing.sm, backgroundColor: 'rgba(255,248,247,0.92)' }}>
        <View style={{ height: 3, backgroundColor: Colors.divider, borderRadius: 2, overflow: 'hidden' }}>
          <View style={{ height: '100%', backgroundColor: Colors.primary, borderRadius: 2, width: `${((currentPage + 1) / imageUrls.length) * 100}%` }} />
        </View>
      </SafeAreaView>}
    </View>
  );
}
