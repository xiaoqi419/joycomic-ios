// 统一阅读器 v5 — JM + Pica 双源共用
// @author Jason

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, useWindowDimensions, StatusBar,
  Pressable, ActivityIndicator, Modal, Alert, Animated, Dimensions,
} from 'react-native';
import { SafeImage } from '../components/SafeImage';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Linking } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useReaderStore } from '../store/useReader';
import { useHistoryStore } from '../store/useHistory';
import { useSettingsStore } from '../store/useSettings';
import { usePicaStore } from '../store/usePica';
import { fetchComicRead, fetchAlbumDetail } from '../api/endpoints';
import { picaSource } from '../sources/pica';
import * as Brightness from 'expo-brightness';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { downloadManager } from '../utils/DownloadManager';
import { ReaderSettingsModal } from '../components/ReaderSettingsModal';
import { ZoomableImage } from '../components/ZoomableImage';
import type { Episode } from '../api/types';

const ANIM_DUR = 150;
let _W: number = 0;
let _H: number = 0;

type ReaderSource = 'jm' | 'pica';

const ImageItem = React.memo(({ item, index, isVertical, imageHeight, source, chapterId, imageLayout, onLoad }: {
  item: string; index: number; isVertical: boolean; imageHeight: number; source: string; chapterId: string; imageLayout: string; onLoad: (index: number, h: number) => void;
}) => (
  <View style={{ width: W }}>
    <ZoomableImage uri={item}
      epsId={source === 'jm' ? chapterId : undefined}
      pictureName={source === 'jm' ? item.split('/').pop()?.split('.')[0] : undefined}
      containerWidth={W}
    >
      {source === 'jm' ? (
        <SafeImage imageUrl={item} epsId={chapterId}
          pictureName={item.split('/').pop()?.split('.')[0] || ''}
          containerWidth={W}
          style={{ width: W, height: isVertical ? (imageHeight || W * 1.4) : H }}
        />
      ) : (
        <Image source={{ uri: item }}
          style={{ width: W, height: isVertical ? (imageHeight || W * 1.4) : H }}
          contentFit={imageLayout === 'contain' ? 'contain' : imageLayout === 'fitWidth' ? 'cover' : 'contain'}
          onLoad={(e) => {
            const src = (e as any).source || {};
            const rh = src.height || H;
            const rw = src.width || W;
            const ratio = Math.min(rh / rw, 3);
            if (W * ratio > H * 0.3) onLoad(index, W * ratio);
          }}
        />
      )}
    </ZoomableImage>
  </View>
));

export function ReaderScreen() {
  // 延迟获取屏幕尺寸
  const dim = Dimensions.get('window');
  const W = dim.width || 390;
  const H = dim.height || 750;
  _W = W; _H = H;
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const params = route.params || {};

  // 判断源类型
  const source: ReaderSource = params.comicId ? 'pica' : 'jm';
  const albumId = params.albumId as string || (params as any).comicId || '';
  const chapterId = params.chapterId as string || (params as any).chapterId || '';
  const chapterTitle = params.chapterTitle as string || params.title || '';
  const initialPage = (params.initialPage as number) || 0;
  const chapterOrder = (params.chapterOrder as number) || 0;

  const store = useReaderStore();
  const isVertical = useReaderStore((s) => s.isVertical);
  const setReadingMode = useSettingsStore((s) => s.setReadingMode);
  const readingMode = useSettingsStore((s) => s.readingMode);
  const imageLayout = useSettingsStore((s) => s.imageLayout);
  const prefetchCount = useSettingsStore((s) => s.prefetchCount);

  const [loading, setLoading] = useState(true);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [pages, setPages] = useState<string[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSourceSelect, setShowSourceSelect] = useState(false);
  const [autoPageRunning, setAutoPageRunning] = useState(false);
  const [autoInterval, setAutoInterval] = useState(3);
  const shunts = useSettingsStore((s) => s.shunts);
  const selectShunt = useSettingsStore((s) => s.selectShunt);
  const selectedShuntKey = useSettingsStore((s) => s.selectedShuntKey);
  const picaApiSource = usePicaStore((s) => s.apiSource);
  const setPicaApiSource = usePicaStore((s) => s.setApiSource);
  const [brightness, setBrightnessVal] = useState(1);
  const flatRef = useRef<FlatList>(null);
  const [imageHeights, setImageHeights] = useState<Record<number, number>>({});

  const topAnim = useRef(new Animated.Value(0)).current;
  const bottomAnim = useRef(new Animated.Value(0)).current;
  const [showUI, setShowUI] = useState(true);

  // 自动翻页
  useEffect(() => {
    if (!autoPageRunning) return;
    const timer = setInterval(() => {
      const next = currentIdx + 1;
      if (next < pages.length) {
        setCurrentIdx(next);
        flatRef.current?.scrollToIndex({ index: next, animated: true });
      } else {
        setAutoPageRunning(false);
      }
    }, autoInterval * 1000);
    return () => clearInterval(timer);
  }, [autoPageRunning, pages.length, autoInterval]);

  useEffect(() => {
    Brightness.getBrightnessAsync().then(setBrightnessVal).catch(() => {});
    topAnim.setValue(1);
    bottomAnim.setValue(1);
    store.setVertical(readingMode === 'scroll');
    loadImages();
    if (source === 'jm') {
      fetchAlbumDetail(albumId).then((d) => setEpisodes(d.series || [])).catch(() => {});
    }
  }, []);

  useEffect(() => {
    store.setVertical(readingMode === 'scroll');
  }, [readingMode]);

  useEffect(() => {
    if (initialPage && initialPage > 0) {
      store.setPage(initialPage);
      setTimeout(() => flatRef.current?.scrollToIndex({ index: initialPage, animated: false, viewPosition: 0 }), 300);
    }
  }, [initialPage]);

  const loadImages = async (epId?: string, epOrder?: number) => {
    setLoading(true);
    setImageHeights({});
    try {
      if (source === 'jm') {
        const chId = epId || chapterId;
        const data = await fetchComicRead(albumId, chId);
        const host = data.data_original_domain || (await import('../api/endpoints')).getImgHost();
        let images: string[];
        if (data.images?.length) {
          images = data.images.map((item: any) => item.image);
        } else {
          const count = data.page_count || 20;
          images = [];
          for (let i = 1; i <= count; i++) {
            images.push(`https://${host}/media/photos/${chId}/${String(i).padStart(5, '0')}.webp`);
          }
        }
        setPages(images);
        setCurrentIdx(0);
        store.startReading(albumId, chId, chapterTitle || '', images, 220980);
        useHistoryStore.getState().add({
          id: albumId, title: chapterTitle || data.name, coverUrl: '',
          chapterId: chId, chapterTitle: data.name, page: 0, readAt: Date.now(),
        });
      } else {
        const imgs = await picaSource.fetchImages(albumId, epOrder ?? chapterOrder);
        const urls = (imgs || []).map((i: any) => i.url || i);
        setPages(urls);
        setCurrentIdx(0);
        store.startReading(albumId, epId || chapterId, chapterTitle || '', urls, 220980);
      }
    } catch {}
    setLoading(false);
  };

  const switchChapter = async (chId: string, chName: string, epOrder?: number) => {
    setShowChapterModal(false);
    await loadImages(chId, epOrder);
  };

  const toggleUI = useCallback(() => {
    const next = showUI ? 0 : 1;
    Animated.parallel([
      Animated.timing(topAnim, { toValue: next, duration: ANIM_DUR, useNativeDriver: true }),
      Animated.timing(bottomAnim, { toValue: next, duration: ANIM_DUR, useNativeDriver: true }),
    ]).start();
    setShowUI(!showUI);
  }, [showUI]);

  const handleSaveImage = async () => {
    const url = pages[currentIdx];
    if (!url) return;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') { Alert.alert('权限', '需要相册权限才能保存', [{ text: '取消', style: 'cancel' }, { text: '去设置', onPress: () => Linking.openSettings() }]); return; }
      const response = await fetch(url);
      await MediaLibrary.saveToLibraryAsync(URL.createObjectURL(await response.blob()));
      Alert.alert('', '已保存到相册');
    } catch {}
  };

  const handleTap = useCallback((evt: any) => {
    const x = evt.nativeEvent.locationX;
    const y = evt.nativeEvent.locationY;
    const range = 0.2;
    if (showUI && (y < 60 || y > H - 130)) { toggleUI(); return; }
    if (x < W * range && currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
      flatRef.current?.scrollToIndex({ index: currentIdx - 1, animated: true });
    } else if (x > W * (1 - range) && currentIdx < pages.length - 1) {
      setCurrentIdx(currentIdx + 1);
      flatRef.current?.scrollToIndex({ index: currentIdx + 1, animated: true });
    } else toggleUI();
  }, [currentIdx, pages.length, toggleUI, showUI]);

  const handleImageLoad = useCallback((index: number, h: number) => {
    setImageHeights((prev) => (prev[index] === h ? prev : { ...prev, [index]: h }));
  }, []);

  const renderItem = useCallback(({ item, index }: { item: string; index: number }) => (
    <ImageItem item={item} index={index} isVertical={isVertical} imageHeight={imageHeights[index]} source={source} chapterId={chapterId} imageLayout={imageLayout} onLoad={handleImageLoad} />
  ), [isVertical, imageHeights, source, chapterId, imageLayout]);

  const totalPages = pages.length;

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
            windowSize={7}
            maxToRenderPerBatch={5}
            {...(isVertical
              ? { showsVerticalScrollIndicator: false, pagingEnabled: false, horizontal: false }
              : { horizontal: true, pagingEnabled: true, showsHorizontalScrollIndicator: false }
            )}
            onScrollBeginDrag={() => { topAnim.setValue(0); bottomAnim.setValue(0); }}
            onMomentumScrollEnd={(e) => {
              if (isVertical) {
                // 垂直模式：按累计高度估算页面索引
                const y = e.nativeEvent.contentOffset.y;
                let acc = 0;
                for (let i = 0; i < pages.length; i++) {
                  acc += imageHeights[i] || W * 1.4;
                  if (y < acc) { setCurrentIdx(i); break; }
                }
              } else {
                const idx = Math.round(e.nativeEvent.contentOffset.x / W);
                setCurrentIdx(Math.min(idx, pages.length - 1));
              }
            }}
            getItemLayout={(_, index) => ({
              length: isVertical ? (imageHeights[index] || W * 1.4) : W,
              offset: isVertical ? (imageHeights[index] || W * 1.4) * index : W * index,
              index,
            })}
          />
        </Pressable>
      )}

      {/* 深色遮罩 */}
      <View style={s.dimOverlay} pointerEvents="none" />

      {/* 页面信息浮层 */}
      {showUI && (
        <View style={s.pageInfo}>
          <Text style={s.pageInfoText}>P{currentIdx + 1}/{totalPages || 1}</Text>
        </View>
      )}

      {/* 顶部栏 */}
      <Animated.View style={[s.topBar, { transform: [{ translateY: topAnim.interpolate({ inputRange: [0, 1], outputRange: [-120, 0] }) }] }]}>
        <SafeAreaView edges={['top']} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}>
          <TouchableOpacity onPress={() => nav.goBack()} style={{ padding: 8 }}>
            <MaterialIcons name="arrow-back" size={25} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center', height: 50, justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '600' }} numberOfLines={1}>{chapterTitle || '阅读'}</Text>
          </View>
          <TouchableOpacity onPress={() => setShowSourceSelect(true)} style={{ padding: 8 }}>
            <MaterialIcons name="dns" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowSettings(true)} style={{ padding: 8 }}>
            <MaterialIcons name="settings" size={25} color="#fff" />
          </TouchableOpacity>
        </SafeAreaView>
      </Animated.View>

      {/* 底部栏 */}
      <Animated.View style={[s.bottomBar, { transform: [{ translateY: bottomAnim.interpolate({ inputRange: [0, 1], outputRange: [140, 0] }) }] }]}>
        <SafeAreaView edges={['bottom']} style={{ paddingBottom: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 8 }}>
            <TouchableOpacity onPress={() => { setCurrentIdx(0); flatRef.current?.scrollToIndex({ index: 0, animated: true }); }} disabled={currentIdx === 0}>
              <MaterialIcons name="first-page" size={24} color={currentIdx === 0 ? 'rgba(255,255,255,0.3)' : '#fff'} />
            </TouchableOpacity>
            <Pressable style={{ flex: 1, height: 28, justifyContent: 'center', marginHorizontal: 8 }}
              onStartShouldSetResponder={() => true}
              onResponderGrant={(e) => {
                const ratio = Math.max(0, Math.min(1, e.nativeEvent.locationX / (W - 96)));
                const target = Math.round(ratio * (pages.length - 1));
                setCurrentIdx(target);
                flatRef.current?.scrollToIndex({ index: target, animated: true });
              }}
            >
              <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3 }}>
                <View style={{ width: `${totalPages > 1 ? (currentIdx / (totalPages - 1)) * 100 : 0}%`, height: 6, backgroundColor: '#E85D3A', borderRadius: 3 }} />
              </View>
            </Pressable>
            <TouchableOpacity onPress={() => { setCurrentIdx(totalPages - 1); flatRef.current?.scrollToIndex({ index: totalPages - 1, animated: true }); }} disabled={currentIdx === totalPages - 1}>
              <MaterialIcons name="last-page" size={24} color={currentIdx === totalPages - 1 ? 'rgba(255,255,255,0.3)' : '#fff'} />
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 6 }}>
            <View style={s.pageBadge}><Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>P{currentIdx + 1}</Text></View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity onPress={() => {
                Alert.alert('下载', '选择下载方式', [
                  { text: '取消', style: 'cancel' },
                  { text: '当前话', onPress: async () => {
                    await downloadManager.addDownload({
                      comicId: albumId, title: chapterTitle || '章节', coverUrl: '', chapterCount: 1,
                      downloadFn: async (onProgress) => {
                        for (let i = 0; i < pages.length; i++) {
                          const local = FileSystem.documentDirectory + 'downloads/' + albumId + '/' + i + '.jpg';
                          await FileSystem.makeDirectoryAsync(FileSystem.documentDirectory + 'downloads/' + albumId, { intermediates: true }).catch(() => {});
                          await FileSystem.downloadAsync(pages[i], local);
                          onProgress(i + 1, pages.length);
                        }
                      },
                    });
                    Alert.alert('', '已添加下载任务');
                  }},
                  ...(episodes.length > 0 ? [{
                    text: '全部话' as const, style: 'destructive' as const, onPress: async () => {
                      await downloadManager.addDownload({
                        comicId: albumId, title: chapterTitle || '全部', coverUrl: '', chapterCount: episodes.length,
                        downloadFn: async (onProgress) => {
                          for (let ci = 0; ci < episodes.length; ci++) {
                            try {
                              if (source === 'jm') {
                                const data = await fetchComicRead(albumId, episodes[ci].id);
                                const urls = (data.images || []).map((i: any) => i.image).filter(Boolean);
                                for (let i = 0; i < urls.length; i++) {
                                  const local = FileSystem.documentDirectory + 'downloads/' + albumId + '/' + ci + '_' + i + '.jpg';
                                  await FileSystem.makeDirectoryAsync(FileSystem.documentDirectory + 'downloads/' + albumId, { intermediates: true }).catch(() => {});
                                  await FileSystem.downloadAsync(urls[i], local);
                                }
                              } else {
                                const imgs = await picaSource.fetchImages(albumId, episodes[ci].order ?? ci);
                                for (let i = 0; i < (imgs || []).length; i++) {
                                  const local = FileSystem.documentDirectory + 'downloads/' + albumId + '/' + ci + '_' + i + '.jpg';
                                  await FileSystem.makeDirectoryAsync(FileSystem.documentDirectory + 'downloads/' + albumId, { intermediates: true }).catch(() => {});
                                  await FileSystem.downloadAsync((imgs || [])[i]?.url || (imgs || [])[i], local);
                                }
                              }
                            } catch {}
                            onProgress(ci + 1, episodes.length);
                          }
                        },
                      });
                      Alert.alert('', '已添加全部下载任务');
                    },
                  }] : []),
                ]);
              }}>
                <MaterialIcons name="download" size={22} color="#fff" />
              </TouchableOpacity>
              {episodes.length > 0 && (
                <TouchableOpacity onPress={() => setShowChapterModal(true)}><MaterialIcons name="format-list-numbered" size={22} color="#fff" /></TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setAutoPageRunning(!autoPageRunning)}>
                <MaterialIcons name={autoPageRunning ? 'timer' : 'timer-off'} size={22} color={autoPageRunning ? '#E85D3A' : '#fff'} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { store.setVertical(!isVertical); setReadingMode(!isVertical ? 'scroll' : 'page'); }}>
                <MaterialIcons name={isVertical ? 'view-stream' : 'view-carousel'} size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Animated.View>

      {/* 横屏侧边按钮 */}
      {H < W && (
        <>
          <TouchableOpacity style={s.sideLeft} onPress={() => { if (currentIdx > 0) { setCurrentIdx(currentIdx - 1); flatRef.current?.scrollToIndex({ index: currentIdx - 1, animated: true }); } }}>
            <MaterialIcons name="keyboard-arrow-left" size={32} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          <TouchableOpacity style={s.sideRight} onPress={() => { if (currentIdx < pages.length - 1) { setCurrentIdx(currentIdx + 1); flatRef.current?.scrollToIndex({ index: currentIdx + 1, animated: true }); } }}>
            <MaterialIcons name="keyboard-arrow-right" size={32} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          <TouchableOpacity style={s.sideClose} onPress={() => nav.goBack()}><MaterialIcons name="close" size={22} color="#fff" /></TouchableOpacity>
        </>
      )}

      <ReaderSettingsModal visible={showSettings} onClose={() => setShowSettings(false)}
        isVertical={isVertical} onSetVertical={(v) => store.setVertical(v)}
        readingMode={readingMode} onSetReadingMode={setReadingMode}
        autoInterval={autoInterval} onSetAutoInterval={(v) => { setAutoInterval(v); }}
      />

      {/* 章节选择弹窗 — 仅 JM 源 */}
      <Modal visible={showChapterModal} transparent animationType="slide" onRequestClose={() => setShowChapterModal(false)}>
        <Pressable style={{ flex: 1 }} onPress={() => setShowChapterModal(false)}>
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#1C1C24', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: 400, paddingBottom: 40 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>章节</Text>
              <TouchableOpacity onPress={() => setShowChapterModal(false)}><MaterialIcons name="close" size={22} color="#fff" /></TouchableOpacity>
            </View>
            <FlatList data={episodes} keyExtractor={(i) => i.id} renderItem={({ item, index }) => (
              <TouchableOpacity onPress={() => switchChapter(item.id, item.name)} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
                <Text style={{ color: item.id === chapterId ? '#E85D3A' : '#fff', fontWeight: item.id === chapterId ? '700' : '400', fontSize: 14, flex: 1 }}>
                  {item.name || `第${index + 1}话`}
                </Text>
                {item.id === chapterId && <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: 'rgba(232,93,58,0.2)' }}><Text style={{ color: '#E85D3A', fontSize: 11 }}>当前</Text></View>}
              </TouchableOpacity>
            )} />
          </View>
        </Pressable>
      </Modal>

      {/* 源选择弹窗 */}
      <Modal visible={showSourceSelect} transparent animationType="fade" onRequestClose={() => setShowSourceSelect(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setShowSourceSelect(false)}>
          <View style={{ backgroundColor: '#1C1C24', borderRadius: 16, padding: 20, width: W * 0.75 }}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' }}>
              {source === 'jm' ? '图片源' : 'Pica API 源'}
            </Text>
            {source === 'jm'
              ? shunts.map((shunt) => (
                <TouchableOpacity key={shunt.key} onPress={() => { selectShunt(shunt.key); setShowSourceSelect(false); loadImages(); }} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
                  <Text style={{ color: selectedShuntKey === shunt.key ? '#E85D3A' : '#fff', fontWeight: selectedShuntKey === shunt.key ? '700' : '400', fontSize: 15 }}>{shunt.title}</Text>
                </TouchableOpacity>
              ))
              : [
                { key: 'go2778' as const, label: '中转 (go2778)' },
                { key: 'picacomic' as const, label: '直连 (picacomic)' },
              ].map((opt) => (
                <TouchableOpacity key={opt.key} onPress={() => { setPicaApiSource(opt.key); setShowSourceSelect(false); loadImages(); }} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
                  <Text style={{ color: picaApiSource === opt.key ? '#E85D3A' : '#fff', fontWeight: picaApiSource === opt.key ? '700' : '400', fontSize: 15 }}>{opt.label}</Text>
                </TouchableOpacity>
              ))
            }
          </View>
        </Pressable>
      </Modal>

    </View>
  );
}

const s = {
  topBar: { position: 'absolute' as const, top: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.8)', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  bottomBar: { position: 'absolute' as const, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.8)', borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  dimOverlay: { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.2)' },
  pageInfo: { position: 'absolute' as const, bottom: 120, left: 16, backgroundColor: 'transparent' as const },
  pageInfoText: { color: '#fff', fontSize: 14, fontWeight: '500', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  pageBadge: { backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, height: 26, justifyContent: 'center' as const },
  sideLeft: { position: 'absolute' as const, left: 8, top: '50%' as const, marginTop: -20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center' as const, justifyContent: 'center' as const },
  sideRight: { position: 'absolute' as const, right: 8, top: '50%' as const, marginTop: -20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center' as const, justifyContent: 'center' as const },
  sideClose: { position: 'absolute' as const, top: 60, left: 8, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center' as const, justifyContent: 'center' as const },
};
