// Pica 阅读器 v2 — PicaComic 完全移植（与 JM 阅读器统一 UI）
// @author Jason

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, useWindowDimensions,
  Pressable, ActivityIndicator, Alert, Animated, StatusBar, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { picaSource } from '../sources/pica';
import { useReaderStore } from '../store/useReader';
import { useSettingsStore } from '../store/useSettings';
import * as MediaLibrary from 'expo-media-library';
import * as Brightness from 'expo-brightness';
import * as FileSystem from 'expo-file-system';

const { width: W } = Dimensions.get('window');
const ANIM_DUR = 150;
const { height: H } = Dimensions.get('window');

export function PicaReaderScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { comicId, chapterOrder, chapterId, title } = route.params || {};
  const isVertical = useReaderStore((s) => s.isVertical);
  const setVertical = useReaderStore((s) => s.setVertical);
  const readingMode = useSettingsStore((s) => s.readingMode);
  const setReadingMode = useSettingsStore((s) => s.setReadingMode);

  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState<{ url: string; index: number }[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const flatRef = useRef<FlatList>(null);
  const [imageHeights, setImageHeights] = useState<Record<number, number>>({});

  const topAnim = useRef(new Animated.Value(0)).current;
  const bottomAnim = useRef(new Animated.Value(0)).current;
  const [showUI, setShowUI] = useState(true);

  const toggleUI = useCallback(() => {
    const next = showUI ? 0 : 1;
    Animated.parallel([
      Animated.timing(topAnim, { toValue: next, duration: ANIM_DUR, useNativeDriver: true }),
      Animated.timing(bottomAnim, { toValue: next, duration: ANIM_DUR, useNativeDriver: true }),
    ]).start();
    setShowUI(!showUI);
  }, [showUI, topAnim, bottomAnim]);

  useEffect(() => {
    Brightness.getBrightnessAsync().catch(() => {});
    topAnim.setValue(1);
    bottomAnim.setValue(1);
    setVertical(readingMode === 'scroll');
    loadPages();
  }, []);

  const loadPages = async () => {
    setLoading(true);
    try {
      const imgs = await picaSource.fetchImages(comicId, chapterOrder || 0);
      setPages(imgs || []);
    } catch {}
    setLoading(false);
  };

  const handleSaveImage = async () => {
    const img = pages[currentIdx];
    if (!img) return;
    try {
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) { Alert.alert('需要权限', '请允许访问相册'); return; }
      const local = FileSystem.cacheDirectory + 'pica_save.jpg';
      await FileSystem.downloadAsync(img.url, local);
      await MediaLibrary.saveToLibraryAsync(local);
      Alert.alert('', '已保存到相册');
    } catch {}
  };

  const handleTap = useCallback((evt: any) => {
    const x = evt.nativeEvent.locationX;
    const y = evt.nativeEvent.locationY;
    const range = 0.2;

    if (showUI) {
      if (y < 60 || y > H - 130) { toggleUI(); return; }
    }

    if (x < W * range && currentIdx > 0) {
      flatRef.current?.scrollToIndex({ index: currentIdx - 1, animated: true });
      setCurrentIdx(currentIdx - 1);
    } else if (x > W * (1 - range) && currentIdx < pages.length - 1) {
      flatRef.current?.scrollToIndex({ index: currentIdx + 1, animated: true });
      setCurrentIdx(currentIdx + 1);
    } else {
      toggleUI();
    }
  }, [currentIdx, pages.length, toggleUI, showUI]);

  const renderItem = ({ item, index }: { item: { url: string }; index: number }) => (
    <View style={{ width: W }}>
      <Image
        source={{ uri: item.url }}
        style={{ width: W, height: isVertical ? (imageHeights[index] || W * 1.4) : H }}
        contentFit="contain"
        onLoad={(e) => {
          const src = (e as any).source || {};
          const h = src.height || H;
          const w = src.width || W;
          const ratio = Math.min(h / w, 3);
          const calcH = W * ratio;
          if (calcH > H * 0.3) {
            setImageHeights((prev) => ({ ...prev, [index]: calcH }));
          }
        }}
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar hidden={!showUI} />

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#E85D3A" />
        </View>
      ) : pages.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#9895A0' }}>暂无内容</Text>
        </View>
      ) : (
        <Pressable style={{ flex: 1 }} onPress={handleTap}>
          <FlatList
            ref={flatRef}
            data={pages}
            keyExtractor={(_, i) => String(i)}
            renderItem={renderItem}
            {...(isVertical
              ? { showsVerticalScrollIndicator: false, pagingEnabled: false, horizontal: false }
              : { horizontal: true, pagingEnabled: true, showsHorizontalScrollIndicator: false }
            )}
            onMomentumScrollEnd={(e) => {
              const offset = isVertical ? e.nativeEvent.contentOffset.y : e.nativeEvent.contentOffset.x;
              const dim = isVertical ? H : W;
              setCurrentIdx(Math.min(Math.round(offset / dim), pages.length - 1));
            }}
            getItemLayout={(_, index) => ({
              length: isVertical ? (imageHeights[index] || W * 1.4) : W,
              offset: isVertical ? (imageHeights[index] || W * 1.4) * index : W * index,
              index,
            })}
          />
        </Pressable>
      )}

      {/* 页面信息浮层 */}
      {showUI && (
        <View style={styles.pageInfo}>
          <Text style={styles.pageInfoText}>
            P{currentIdx + 1}/{pages.length || 1}
          </Text>
        </View>
      )}

      {/* 顶部栏 */}
      <Animated.View style={[styles.topBar, { transform: [{ translateY: topAnim.interpolate({ inputRange: [0, 1], outputRange: [-120, 0] }) }] }]}>
        <SafeAreaView edges={['top']} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}>
          <TouchableOpacity onPress={() => nav.goBack()} style={{ padding: 8 }}>
            <MaterialIcons name="arrow-back" size={25} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center', height: 50, justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '600' }} numberOfLines={1}>{title || '阅读'}</Text>
          </View>
          <TouchableOpacity style={{ padding: 8, opacity: 0 }}>
            <MaterialIcons name="settings" size={25} color="#fff" />
          </TouchableOpacity>
        </SafeAreaView>
      </Animated.View>

      {/* 底部栏 */}
      <Animated.View style={[styles.bottomBar, { transform: [{ translateY: bottomAnim.interpolate({ inputRange: [0, 1], outputRange: [140, 0] }) }] }]}>
        <SafeAreaView edges={['bottom']} style={{ paddingBottom: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 8 }}>
            <TouchableOpacity onPress={() => { flatRef.current?.scrollToIndex({ index: 0, animated: true }); setCurrentIdx(0); }} disabled={currentIdx === 0}>
              <MaterialIcons name="first-page" size={24} color={currentIdx === 0 ? 'rgba(255,255,255,0.3)' : '#fff'} />
            </TouchableOpacity>
            <Pressable
              style={{ flex: 1, height: 28, justifyContent: 'center', marginHorizontal: 8 }}
              onStartShouldSetResponder={() => true}
              onResponderGrant={(e) => {
                const ratio = Math.max(0, Math.min(1, e.nativeEvent.locationX / (W - 96)));
                const target = Math.round(ratio * (pages.length - 1));
                setCurrentIdx(target);
                flatRef.current?.scrollToIndex({ index: target, animated: true });
              }}
            >
              <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3 }}>
                <View style={{ width: `${pages.length > 1 ? (currentIdx / (pages.length - 1)) * 100 : 0}%`, height: 6, backgroundColor: '#E85D3A', borderRadius: 3 }} />
              </View>
            </Pressable>
            <TouchableOpacity onPress={() => { flatRef.current?.scrollToIndex({ index: pages.length - 1, animated: true }); setCurrentIdx(pages.length - 1); }} disabled={currentIdx === pages.length - 1}>
              <MaterialIcons name="last-page" size={24} color={currentIdx === pages.length - 1 ? 'rgba(255,255,255,0.3)' : '#fff'} />
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 6 }}>
            <View style={styles.pageBadge}>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>P{currentIdx + 1}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity onPress={handleSaveImage}><MaterialIcons name="save-alt" size={22} color="#fff" /></TouchableOpacity>
              <TouchableOpacity onPress={() => { setVertical(!isVertical); setReadingMode(!isVertical ? 'scroll' : 'page'); }}>
                <MaterialIcons name={isVertical ? 'view-stream' : 'view-carousel'} size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={loadPages}><MaterialIcons name="refresh" size={22} color="#fff" /></TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Animated.View>

      {/* 横屏侧边按钮 */}
      {H < W && (
        <>
          <TouchableOpacity style={styles.sideLeft} onPress={() => { if (currentIdx > 0) { setCurrentIdx(currentIdx - 1); flatRef.current?.scrollToIndex({ index: currentIdx - 1, animated: true }); } }} activeOpacity={0.6}>
            <MaterialIcons name="keyboard-arrow-left" size={32} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.sideRight} onPress={() => { if (currentIdx < pages.length - 1) { setCurrentIdx(currentIdx + 1); flatRef.current?.scrollToIndex({ index: currentIdx + 1, animated: true }); } }} activeOpacity={0.6}>
            <MaterialIcons name="keyboard-arrow-right" size={32} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.sideClose} onPress={() => nav.goBack()}>
            <MaterialIcons name="close" size={22} color="#fff" />
          </TouchableOpacity>
        </>
      )}

      {/* 深色模式遮罩 */}
      <View style={styles.dimOverlay} pointerEvents="none" />
    </View>
  );
}

const styles = {
  topBar: {
    position: 'absolute' as const, top: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
  },
  bottomBar: {
    position: 'absolute' as const, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
  },
  pageInfo: {
    position: 'absolute' as const, bottom: 120, left: 16,
    backgroundColor: 'transparent',
  },
  pageInfoText: {
    color: '#fff', fontSize: 14, fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  pageBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, height: 26, justifyContent: 'center',
  },
  sideLeft: {
    position: 'absolute' as const, left: 8, top: '50%' as const, marginTop: -20,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  sideRight: {
    position: 'absolute' as const, right: 8, top: '50%' as const, marginTop: -20,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  sideClose: {
    position: 'absolute' as const, top: 60, left: 8,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  dimOverlay: {
    position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
};
