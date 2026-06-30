// SafeImage — 原生下载 + base64 DataURL + Canvas 解扰
// 带 JM 日志系统
// @author Jason

import React, { useState, useEffect, useMemo } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import { buildDescrambleHtml, buildSimpleImageHtml, extractFilename } from '../utils/scramble';
import { jmLogger } from '../utils/JmLogger';

const IMG_HEADERS: Record<string, string> = {
  Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
  Referer: 'https://www.jmapibranch2.cc/',
  'Sec-Fetch-Mode': 'no-cors',
  'Sec-Fetch-Site': 'cross-site',
  'User-Agent': 'Mozilla/5.0 (Linux; Android 13; WD5DDE5 Build/TQ1A.230205.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/114.0.5735.196 Safari/537.36',
  'X-Requested-With': 'com.jiaohua_browser',
};

interface Props { imageUrl: string; epsId: string; pictureName?: string; style?: any; onLoad?: () => void; }

const SC_ID = '220980';

async function urlToDataUri(url: string): Promise<string> {
  const ext = (url.split('.').pop() || 'webp').replace(/\?.*/, '');
  const dest = FileSystem.cacheDirectory + 'jm_' + Date.now() + '_' + Math.random().toString(36).slice(2) + '.' + ext;
  jmLogger.log(`下载: ${url} -> ${dest}`);
  const dl = await FileSystem.downloadAsync(url, dest, { headers: IMG_HEADERS });
  jmLogger.log(`HTTP ${dl.status} uri=${dl.uri}`);
  if (dl.status !== 200) throw new Error('Download ' + dl.status);
  const b64 = await FileSystem.readAsStringAsync(dl.uri, { encoding: FileSystem.EncodingType.Base64 });
  FileSystem.deleteAsync(dl.uri, { idempotent: true }).catch(() => {});
  jmLogger.ok(`dataURI len=${b64.length}`);
  return 'data:image/' + ext.replace('jpg', 'jpeg') + ';base64,' + b64;
}

export function SafeImage({ imageUrl, epsId, pictureName, style, onLoad }: Props) {
  const [dataUri, setDataUri] = useState<string | null>(null);
  const [fallback, setFallback] = useState(false);
  const picName = (pictureName || extractFilename(imageUrl)).replace(/\.\w+$/, '');

  useEffect(() => {
    let cancel = false;
    jmLogger.log(`SafeImage: epsId=${epsId} picName=${picName} fallback=${fallback}`);
    urlToDataUri(imageUrl)
      .then(uri => { if (!cancel) { jmLogger.ok('下载完成, 准备解扰'); setDataUri(uri); } })
      .catch(e => { if (!cancel) { jmLogger.err(`下载失败: ${e.message}, 降级到原始 URL`); setDataUri(imageUrl); setFallback(true); } });
    return () => { cancel = true; };
  }, [imageUrl]);

  const html = useMemo(() => {
    if (!dataUri) return '';
    if (fallback) {
      jmLogger.warn('降级模式: 直接显示图片（无解扰）');
      return buildSimpleImageHtml(dataUri);
    }
    try {
      const h = buildDescrambleHtml(dataUri, epsId, SC_ID, picName);
      jmLogger.ok(`HTML 生成完毕`);
      return h;
    } catch (e: any) {
      jmLogger.err(`HTML 生成失败: ${e.message}`);
      return buildSimpleImageHtml(dataUri);
    }
  }, [dataUri, epsId, picName, fallback]);

  if (!dataUri) return <View style={[{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }, style]}><ActivityIndicator size="small" color="#ff6b35" /></View>;

  return (
    <View style={[{ flex: 1, backgroundColor: '#000' }, style]}>
      <WebView style={{ flex: 1, backgroundColor: 'transparent' }} source={{ html }}
        scrollEnabled={false} bounces={false} overScrollMode="never"
        javaScriptEnabled domStorageEnabled originWhitelist={['*']} mixedContentMode="always"
        onLoad={onLoad}
        onMessage={(e) => { jmLogger.wv(e.nativeEvent?.data || ''); }}
      />
    </View>
  );
}
