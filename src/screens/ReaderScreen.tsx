// 阅读器 — 复刻 APK Read.tsx 全部功能
// 竖屏滚动 + 横屏翻页 + scramble + 进度滑块 + 章节切换 + 阅读跟踪
// @author nyx

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, useWindowDimensions, StatusBar,
  ScrollView, Pressable, ActivityIndicator, Modal, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { ScrambledImage } from '../components/ScrambledImage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useReaderStore } from '../store/useReader';
import { useSettingsStore } from '../store/useSettings';
import { useHistoryStore } from '../store/useHistory';
import { fetchComicRead, fetchAlbumDetail } from '../api/endpoints';
import { buildChapterImageUrls } from '../utils/scramble';
import { Colors, FontSize, Radius, Spacing } from '../theme';
import type { Episode } from '../api/types';

export function ReaderScreen() {
  const { width: W, height: H } = useWindowDimensions();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { t } = useTranslation();
  const { albumId, chapterId, chapterTitle } = route.params || {};

  const { imageUrls, currentPage, setPage, isVertical, setVertical, startReading } = useReaderStore();
  const [showUI, setShowUI] = useState(true);
  const [loading, setLoading] = useState(false);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [showChapterModal, setShowChapterModal] = useState(false);
  const flatRef = useRef<FlatList>(null);
  const scrollRef = useRef<ScrollView>(null);

  const toggleUI = () => setShowUI((p) => !p);

  // 加载章节列表
  useEffect(() => {
    if (albumId) {
      fetchAlbumDetail(albumId).then((d) => {
        setEpisodes(d.series || []);
      }).catch(() => {});
    }
  }, [albumId]);

  const switchChapter = async (chId: string, chName: string) => {
    setShowChapterModal(false);
    setLoading(true);
    try {
      const data = await fetchComicRead(chId);
      const images = buildChapterImageUrls(
        getImgHost(), chId,
        data.page_count || data.images?.length || 20,
        data.scramble_id,
        albumId,
        data.images as any,
      );
      startReading(albumId || data.album_id, chId, chName, images, data.scramble_id);
      useHistoryStore.getState().add({
        id: albumId || data.album_id,
        title: chapterTitle || chName,
        coverUrl: '',
        chapterId: chId,
        chapterTitle: chName,
        page: 0,
        readAt: Date.now(),
      });
      // 切换章节后滚回顶部
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    } catch {}
    setLoading(false);
  };

  const goPage = (p: number) => {
    const clamped = Math.max(0, Math.min(p, imageUrls.length - 1));
    setPage(clamped);
    if (!isVertical) {
      flatRef.current?.scrollToIndex({ index: clamped, animated: true });
    }
  };

  const totalPages = imageUrls.length;

  // 找到当前章节在列表中的下标
  const currentEpIdx = episodes.findIndex((ep) => ep.id === (useReaderStore.getState().chapterId || chapterId));

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar hidden={!showUI} />

      {loading && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}

      {/* 主内容 */}
      {isVertical ? (
        <ScrollView
          ref={scrollRef}
          onScroll={(e) => {
            const offsetY = e.nativeEvent.contentOffset.y;
            const maxScroll = Math.max(1, e.nativeEvent.contentSize.height - H);
            const progress = Math.min(totalPages, Math.round((offsetY / maxScroll) * totalPages));
            setPage(Math.min(progress, totalPages - 1));
          }}
          scrollEventThrottle={16}
          style={{ flex: 1 }}
        >
          <TouchableOpacity activeOpacity={1} onPress={toggleUI} style={{ minHeight: H + 1 }}>
            {imageUrls.map((url, i) => (
              <ScrambledImage
                key={i}
                imageUrl={url}
                scrambleId={useReaderStore.getState().scrambleId}
                style={{ width: W, height: H }}
              />
            ))}
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <FlatList
          ref={flatRef}
          data={imageUrls}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={currentPage}
          getItemLayout={(_, index) => ({ length: W, offset: W * index, index })}
          onMomentumScrollEnd={(e) => {
            const page = Math.round(e.nativeEvent.contentOffset.x / W);
            setPage(page);
          }}
          renderItem={({ item }) => (
            <TouchableOpacity activeOpacity={1} onPress={toggleUI} style={{ width: W, height: H }}>
              <Image source={{ uri: item }} style={{ flex: 1, width: '100%', height: '100%' }} contentFit="contain" transition={200} />
            </TouchableOpacity>
          )}
        />
      )}

      {/* 顶部栏 */}
      {showUI && (
        <SafeAreaView edges={["top"]} style={styles.topBar}>
          <TouchableOpacity onPress={() => nav.goBack()} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <MaterialIcons name="arrow-back" size={22} color="#fff" />
            <Text style={styles.topText}>{t('common.back')}</Text>
          </TouchableOpacity>

          {/* 章节切换 */}
          <TouchableOpacity onPress={() => setShowChapterModal(true)} style={{ flex: 1, alignItems: 'center', paddingHorizontal: 8 }}>
            <Text style={[styles.topText, { fontSize: 13 }]} numberOfLines={1}>
              {chapterTitle || `第${currentEpIdx + 1}话`}
            </Text>
            <Text style={{ color: '#aaa', fontSize: 11 }}>
              {currentPage + 1}/{totalPages}
            </Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            {/* 切换阅读模式 */}
            <TouchableOpacity onPress={() => setVertical(!isVertical)}>
              <MaterialIcons name={isVertical ? 'view-carousel' : 'view-stream'} size={22} color="#fff" />
            </TouchableOpacity>
            {/* 上一章 */}
            <TouchableOpacity
              onPress={() => {
                const prev = episodes[currentEpIdx - 1];
                if (prev) switchChapter(prev.id, prev.name);
              }}
              disabled={currentEpIdx <= 0}
            >
              <MaterialIcons name="skip-previous" size={22} color={currentEpIdx > 0 ? '#fff' : '#555'} />
            </TouchableOpacity>
            {/* 下一章 */}
            <TouchableOpacity
              onPress={() => {
                const next = episodes[currentEpIdx + 1];
                if (next) switchChapter(next.id, next.name);
              }}
              disabled={currentEpIdx >= episodes.length - 1}
            >
              <MaterialIcons name="skip-next" size={22} color={currentEpIdx < episodes.length - 1 ? '#fff' : '#555'} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}

      {/* 底部进度条 */}
      {showUI && (
        <SafeAreaView edges={["top"]} style={styles.bottomBar}>
          {/* 进度滑块 */}
          <View style={styles.sliderContainer}>
            <Text style={styles.progressLabel}>1</Text>
            <View
              style={styles.sliderTrack}
              onStartShouldSetResponder={() => true}
              onResponderGrant={(e) => {
                const x = e.nativeEvent.locationX;
                const trackW = e.nativeEvent.target ? W - 120 : W - 120;
                const ratio = Math.max(0, Math.min(1, x / trackW));
                goPage(Math.round(ratio * (totalPages - 1)));
              }}
              onResponderMove={(e) => {
                const x = e.nativeEvent.locationX;
                const trackW = W - 120;
                const ratio = Math.max(0, Math.min(1, x / trackW));
                goPage(Math.round(ratio * (totalPages - 1)));
              }}
            >
              <View style={[styles.sliderFill, { width: `${((currentPage + 1) / Math.max(1, totalPages)) * 100}%` }]} />
              <View style={[styles.sliderThumb, { left: `${((currentPage + 1) / Math.max(1, totalPages)) * 100}%` }]} />
            </View>
            <Text style={styles.progressLabel}>{totalPages}</Text>
          </View>
        </SafeAreaView>
      )}

      {/* 章节选择弹窗 */}
      <Modal visible={showChapterModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('reader.chapter')}</Text>
              <TouchableOpacity onPress={() => setShowChapterModal(false)}>
                <MaterialIcons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={episodes}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  onPress={() => {
                    if (item.id !== chapterId) switchChapter(item.id, item.name);
                    else setShowChapterModal(false);
                  }}
                  style={[styles.chapterItem, item.id === chapterId && styles.chapterItemActive]}
                >
                  <Text style={[styles.chapterItemText, item.id === chapterId && styles.chapterItemTextActive]}>
                    {item.name}
                  </Text>
                  {item.id === chapterId && <MaterialIcons name="check" size={18} color={Colors.primary} />}
                </TouchableOpacity>
              )}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = {
  topBar: {
    position: 'absolute' as const,
    top: 0, left: 0, right: 0, zIndex: 100,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 14, paddingTop: 8, paddingBottom: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  topText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  bottomBar: {
    position: 'absolute' as const,
    bottom: 0, left: 0, right: 0, zIndex: 100,
    paddingHorizontal: 14, paddingBottom: 24, paddingTop: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sliderContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  progressLabel: { color: '#aaa', fontSize: 11, width: 30, textAlign: 'center' as const },
  sliderTrack: {
    flex: 1,
    height: 32,
    justifyContent: 'center' as const,
    position: 'relative' as const,
  },
  sliderFill: {
    height: 4,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute' as const,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    marginLeft: -8,
    top: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end' as const,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '70%' as const,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  modalTitle: { fontSize: FontSize.headline, fontWeight: '700', color: Colors.textPrimary },
  chapterItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.divider,
  },
  chapterItemActive: { backgroundColor: Colors.primary + '15' },
  chapterItemText: { fontSize: FontSize.body, color: Colors.textSecondary },
  chapterItemTextActive: { color: Colors.primary, fontWeight: '600' },
};
