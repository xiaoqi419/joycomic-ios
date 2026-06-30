// SafeImage — 原生下载 + base64 DataURL + Canvas 解扰
// 自适应高宽比，无缝衔接
// @author Jason

import React, { useState, useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { buildDescrambleHtml, buildSimpleImageHtml, extractFilename } from '../utils/scramble';
import { jmLogger } from '../utils/JmLogger';
import { downloadQueue } from '../utils/DownloadQueue';

const IMG_HEADERS: Record<string, string> = {
  Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
  Referer: 'https://www.jmapibranch2.cc/',
  'Sec-Fetch-Mode': 'no-cors',
  'Sec-Fetch-Site': 'cross-site',
  'User-Agent': 'Mozilla/5.0 (Linux; Android 13; WD5DDE5 Build/TQ1A.230205.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/114.0.5735.196 Safari/537.36',
  'X-Requested-With': 'com.jiaohua_browser',
};

interface Props { imageUrl: string; epsId: string; pictureName?: string; containerWidth: number; height?: number; onLoad?: () => void; onDimension?: (w: number, h: number) => void; }

const SC_ID = '220980';

async function urlToDataUri(url: string): Promise<string> {
  // 检查磁盘缓存
  const { getCachedImageDataUri, saveCachedImageDataUri } = await import('../utils/ImageCache');
  const cached = await getCachedImageDataUri(url);
  if (cached) { jmLogger.log(`cache hit: ${url.slice(0, 60)}`); return cached; }
  jmLogger.log(`fetch: ${url}`);
  const response = await fetch(url, { headers: IMG_HEADERS });
  if (!response.ok) throw new Error(`fetch HTTP ${response.status}`);
  const blob = await response.blob();
  jmLogger.ok(`blob size=${blob.size}`);
  const dataUri = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
  jmLogger.ok(`dataURI len=${dataUri.length}`);
  // 异步写入磁盘缓存（不阻塞）
  saveCachedImageDataUri(url, dataUri).catch(() => {});
  return dataUri;
}

export function SafeImage({ imageUrl, epsId, pictureName, containerWidth, height: overrideHeight, onLoad, onDimension }: Props) {
  const [dataUri, setDataUri] = useState<string | null>(null);
  const [fallback, setFallback] = useState(false);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const picName = (pictureName || extractFilename(imageUrl)).replace(/\.\w+$/, '');

  useEffect(() => {
    let cancel = false;
    downloadQueue.enqueue(() => urlToDataUri(imageUrl))
      .then(uri => { if (!cancel) { setDataUri(uri); } })
      .catch(e => { if (!cancel) { setDataUri(imageUrl); setFallback(true); } });
    return () => { cancel = true; };
  }, [imageUrl]);

  const height = overrideHeight || (natural ? (containerWidth * natural.h / natural.w) : containerWidth * 1.45);

  useEffect(() => {
    if (natural && onDimension) onDimension(natural.w, natural.h);
  }, [natural]);

  const html = useMemo(() => {
    if (!dataUri) return '';
    if (fallback) {
      return buildSimpleImageHtml(dataUri);
    }
    try {
      return buildDescrambleHtml(dataUri, epsId, SC_ID, picName);
    } catch (e: any) {
      jmLogger.err(`HTML 生成失败: ${e.message}`);
      return buildSimpleImageHtml(dataUri);
    }
  }, [dataUri, epsId, picName, fallback]);

  const handleMessage = (e: any) => {
    const msg = e.nativeEvent?.data || '';
    if (msg.startsWith('DIM:')) {
      const parts = msg.slice(4).split(',');
      const w = parseInt(parts[0], 10);
      const h = parseInt(parts[1], 10);
      if (w > 0 && h > 0) setNatural({ w, h });
    } else {
      jmLogger.wv(msg);
    }
  };

  return (
    <View style={{ width: containerWidth, height, backgroundColor: '#000' }}>
      {html ? (
        <WebView style={{ flex: 1, backgroundColor: 'transparent' }} source={{ html }}
          scrollEnabled={false} bounces={false} overScrollMode="never"
          javaScriptEnabled domStorageEnabled originWhitelist={['*']} mixedContentMode="always"
          onLoad={onLoad}
          onMessage={handleMessage}
        />
      ) : null}
    </View>
  );
}
