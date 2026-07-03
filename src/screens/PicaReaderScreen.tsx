// Pica 阅读器 v3 — 连续无缝纵向滚动 + 章节切换
// @author Jason

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, StyleSheet, ActivityIndicator, Dimensions,
  FlatList, Text, Pressable, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize } from '../theme';
import { picaSource } from '../sources/pica';
import type { SourceImage, SourceChapter } from '../sources/types';

const { width: W, height: H } = Dimensions.get('window');

export function PicaReaderScreen() {
  const nav = useNavigation<any>();
  const { comicId, chapterOrder, chapterId, title } = useRoute<any>().params;

  const [images, setImages] = useState<SourceImage[]>([]);
  const [chapters, setChapters] = useState<SourceChapter[]>([]);
  const [currentChIdx, setCurrentChIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showUI, setShowUI] = useState(false);
  const [imgLayout, setImgLayout] = useState<'contain' | 'fitWidth'>('fitWidth');
  const [imgHeights, setImgHeights] = useState<Record<number, number>>({});
  const flatRef = useRef<FlatList>(null);

  // 加载章节列表 + 当前章节图片
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const chs = await picaSource.fetchChapters(comicId);
        if (cancelled) return;
        setChapters(chs);
        const idx = chs.findIndex((c) => c.id === chapterId || c.order === chapterOrder);
        setCurrentChIdx(idx >= 0 ? idx : 0);
      } catch {}
    })();
    picaSource.fetchImages(comicId, chapterOrder ?? 1)
      .then((imgs) => { if (!cancelled) setImages(imgs); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [comicId, chapterOrder, chapterId]);

  // 切换到指定章节
  const goChapter = useCallback((order: number) => {
    setLoading(true);
    setImages([]);
    setImgHeights({});
    setCurrentIndex(0);
    picaSource.fetchImages(comicId, order)
      .then(setImages)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [comicId]);

  const goPrev = useCallback(() => {
    const prev = chapters[currentChIdx - 1];
    if (prev) { setCurrentChIdx(currentChIdx - 1); goChapter(prev.order); }
  }, [chapters, currentChIdx, goChapter]);

  const goNext = useCallback(() => {
    const next = chapters[currentChIdx + 1];
    if (next) { setCurrentChIdx(currentChIdx + 1); goChapter(next.order); }
  }, [chapters, currentChIdx, goChapter]);

  const handleLoad = useCallback((index: number, w: number, h: number) => {
    if (w > 0 && h > 0) {
      setImgHeights((prev) => {
        const nh = (W * h) / w;
        if (prev[index] === nh) return prev;
        return { ...prev, [index]: nh };
      });
    }
  }, []);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems?.length > 0) {
      setCurrentIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const pageStr = images.length > 0 ? `${currentIndex + 1} / ${images.length}` : '';
  const hasPrev = currentChIdx > 0;
  const hasNext = currentChIdx < chapters.length - 1;
  const chTitle = chapters[currentChIdx]?.title || title || '';

  if (loading) {
    return (
      <SafeAreaView edges={["top"]} style={styles.cont}>
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.cont}>
      <StatusBar style="light" />

      {/* 主体 */}
      <FlatList
        ref={flatRef}
        data={images}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item, index }) => {
          const imgH = imgHeights[index];
          return (
            <Pressable onPress={() => setShowUI(!showUI)}>
              <View style={{ width: W, height: imgH || W * 1.4, backgroundColor: '#000' }}>
                <Image
                  source={{ uri: item.url }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit={imgLayout === 'fitWidth' ? 'contain' : 'cover'}
                  cachePolicy="memory-disk"
                  placeholder={null}
                  onLoad={(e) => {
                    const { width: nw, height: nh } = e.source;
                    if (nw && nh) handleLoad(index, nw, nh);
                  }}
                />
              </View>
            </Pressable>
          );
        }}
        horizontal={false}
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 30 }}
        removeClippedSubviews={Platform.OS === 'android'}
        windowSize={5}
        initialNumToRender={3}
        maxToRenderPerBatch={5}
      />

      {/* 底栏（章节切换 + 进度） */}
      {showUI && (
        <SafeAreaView edges={["bottom"]} style={styles.bottomBar}>
          <Pressable onPress={goPrev} disabled={!hasPrev} style={[styles.chBtn, { opacity: hasPrev ? 1 : 0.3 }]}>
            <MaterialIcons name="skip-previous" size={22} color="#fff" />
          </Pressable>

          {/* 进度条 */}
          <View style={styles.sliderWrap}>
            <View style={styles.sliderTrack}>
              <View style={[styles.sliderFill, { width: `${((currentIndex + 1) / Math.max(1, images.length)) * 100}%` }]} />
            </View>
            <Text style={styles.sliderLabel}>{pageStr}</Text>
          </View>

          <Pressable onPress={goNext} disabled={!hasNext} style={[styles.chBtn, { opacity: hasNext ? 1 : 0.3 }]}>
            <MaterialIcons name="skip-next" size={22} color="#fff" />
          </Pressable>
        </SafeAreaView>
      )}

      {/* 顶栏 */}
      {showUI && (
        <SafeAreaView edges={["top"]} style={styles.topBar}>
          <Pressable onPress={() => nav.goBack()} hitSlop={12} style={styles.topBtn}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.pageInfo} numberOfLines={1}>{chTitle}</Text>
          <Pressable onPress={() => setImgLayout(imgLayout === 'contain' ? 'fitWidth' : 'contain')} hitSlop={8} style={styles.topBtn}>
            <MaterialIcons name={imgLayout === 'contain' ? 'fullscreen' : 'fullscreen-exit'} size={22} color="#fff" />
          </Pressable>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cont: { flex: 1, backgroundColor: '#000' },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  topBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  pageInfo: { flex: 1, color: '#fff', fontSize: FontSize.body, textAlign: 'center', fontWeight: '500' },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.65)', gap: 8,
  },
  chBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  sliderWrap: { flex: 1, alignItems: 'center', gap: 2 },
  sliderTrack: { width: '100%', height: 3, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2 },
  sliderFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },
  sliderLabel: { color: '#fff', fontSize: FontSize.caption, fontWeight: '500' },
});
