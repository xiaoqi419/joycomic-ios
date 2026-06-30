// ScrambledImage — 原生下载 + base64 DataURL + Canvas 解扰
// 先通过 expo-file-system 原生 HTTP 下载图片（绕过 CORS），
// 转为 base64 data URL（同源），再传给 WebView Canvas 解扰
// @author Jason

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import { Colors } from '../theme';
import { buildDescrambleHtml, buildSimpleImageHtml, extractFilenameWithoutExt } from '../utils/scramble';

/**
 * PicaComic 完整图片请求头 — 绕过防盗链 + Sec-Fetch-Mode: no-cors
 */
const IMG_HEADERS: Record<string, string> = {
  Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
  Referer: 'https://localhost/',
  'Sec-Fetch-Mode': 'no-cors',
  'Sec-Fetch-Site': 'cross-site',
  'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K; wv) AppleWebKit/537.36 Chrome/138.0.0.0 Mobile Safari/537.36',
  'X-Requested-With': 'com.example.app',
};

interface Props {
  /** 原始图片 URL */
  imageUrl: string;
  /** 章节 ID (epsId) */
  epsId: string;
  /** scramble_id (从 API 获取, 回退 220980) */
  scrambleId: number | string;
  /** 图片文件名 (extracted from URL if not provided) */
  pictureName?: string;
  style?: any;
  onLoad?: () => void;
}

export function ScrambledImage({
  imageUrl,
  epsId,
  scrambleId,
  pictureName,
  style,
  onLoad,
}: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState(false);
  const webRef = useRef<any>(null);

  const picName = pictureName || extractFilenameWithoutExt(imageUrl) + '.webp';
  const scId = String(scrambleId);

  // Step 1: 通过 expo-file-system 原生 HTTP 下载图片 — 完全绕过浏览器 CORS
  useEffect(() => {
    let cancelled = false;
    setDataUrl(null);
    setDownloadError(false);

    const ext = (imageUrl.split('.').pop()?.split('?')[0] || 'webp').replace(/[^a-zA-Z0-9]/g, '');
    const dest = `${FileSystem.cacheDirectory}jm_${Date.now()}.${ext}`;

    (async () => {
      try {
        const dl = await FileSystem.downloadAsync(imageUrl, dest, { headers: IMG_HEADERS });
        if (cancelled) return;
        if (dl.status !== 200) throw new Error(`HTTP ${dl.status}`);

        const base64 = await FileSystem.readAsStringAsync(dl.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        if (cancelled) return;
        setDataUrl(`data:image/${ext.replace('jpg', 'jpeg')};base64,${base64}`);
      } catch {
        if (!cancelled) {
          // 下载失败: 降级直接用原始 URL（WebView 可能受限，但试试看）
          setDownloadError(true);
          setDataUrl(imageUrl);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [imageUrl]);

  // Step 2: 生成解扰 HTML
  const html = useMemo(() => {
    if (!dataUrl) return '';
    if (downloadError) return buildSimpleImageHtml(dataUrl);
    try {
      return buildDescrambleHtml(dataUrl, epsId, scId, picName);
    } catch {
      return buildSimpleImageHtml(dataUrl);
    }
  }, [dataUrl, epsId, scId, picName, downloadError]);

  const handleMessage = useCallback((event: any) => {
    if (event.nativeEvent?.data === 'loaded' && onLoad) {
      onLoad();
    }
  }, [onLoad]);

  // 还在下载中 → 显示 loading
  if (!dataUrl) {
    return (
      <View style={[{ flex: 1, width: '100%', backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }, style]}>
        <ActivityIndicator color={Colors.primary} size="small" />
      </View>
    );
  }

  return (
    <View style={[{ flex: 1, width: '100%', backgroundColor: '#000' }, style]}>
      <WebView
        ref={webRef}
        style={{ flex: 1, backgroundColor: 'transparent' }}
        source={{ html }}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        originWhitelist={['*']}
        mixedContentMode="always"
        onLoad={onLoad}
        onMessage={handleMessage}
        allowFileAccess={true}
      />
    </View>
  );
}
