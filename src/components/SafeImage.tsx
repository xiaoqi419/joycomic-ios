// SafeImage - expo-file-system download -> base64 -> WebView Canvas
// @author Jason

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import { buildDescrambleHtml, buildSimpleImageHtml, extractFilename } from '../utils/scramble';
import { jmLogger } from '../utils/JmLogger';

interface Props {
  imageUrl: string;
  epsId: string;
  pictureName?: string;
  style?: any;
  onLoad?: () => void;
  containerWidth?: number;
  onDimension?: (w: number, h: number) => void;
}

const SC_ID = '220980';

const DL_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 13) Chrome/120 Mobile',
  Referer: 'https://18comic.vip/',
  Accept: 'image/webp,image/apng,image/*,*/*;q=0.8',
};

async function urlToDataUri(url: string): Promise<string> {
  const ext = (url.split('.').pop() || 'webp').replace(/\?.*/, '');
  const dest = FileSystem.cacheDirectory + 'jm_' + Date.now() + '_' + Math.random().toString(36).slice(2) + '.' + ext;
  const dl = await FileSystem.downloadAsync(url, dest, { headers: DL_HEADERS });
  if (dl.status !== 200) throw new Error('Download ' + dl.status);
  const b64 = await FileSystem.readAsStringAsync(dl.uri, { encoding: FileSystem.EncodingType.Base64 });
  FileSystem.deleteAsync(dl.uri, { idempotent: true }).catch(() => {});
  return 'data:image/' + ext + ';base64,' + b64;
}

export function SafeImage({ imageUrl, epsId, pictureName, style, onLoad, containerWidth, onDimension }: Props) {
  const [dataUri, setDataUri] = useState<string | null>(null);
  const [fallback, setFallback] = useState(false);
  const picName = pictureName || extractFilename(imageUrl);

  useEffect(() => {
    let cancel = false;
    urlToDataUri(imageUrl).then(uri => { if (!cancel) setDataUri(uri); }).catch((e) => {
      jmLogger.warn(`SafeImage download fail: ${e?.message}`);
      if (!cancel) { setDataUri(imageUrl); setFallback(true); }
    });
    return () => { cancel = true; };
  }, [imageUrl]);

  const html = useMemo(() => {
    if (!dataUri) return '';
    if (fallback) return buildSimpleImageHtml(dataUri);
    try { return buildDescrambleHtml(dataUri, epsId, SC_ID, picName); }
    catch { return buildSimpleImageHtml(dataUri); }
  }, [dataUri, epsId, picName, fallback]);

  const handleMessage = useCallback((event: any) => {
    const msg = event?.nativeEvent?.data || '';
    if (msg.startsWith('DIM:')) {
      const parts = msg.slice(4).split(',');
      const w = parseInt(parts[0], 10);
      const h = parseInt(parts[1], 10);
      if (w > 0 && h > 0 && onDimension) {
        onDimension(w, h);
      }
    }
  }, [onDimension]);

  if (!dataUri) return <View style={[{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }, style]}><ActivityIndicator size="small" color="#ff6b35" /></View>;

  return (
    <View style={[{ flex: 1, backgroundColor: '#000' }, style]}>
      <WebView style={{ flex: 1, backgroundColor: 'transparent' }} source={{ html }}
        scrollEnabled={false} bounces={false} overScrollMode="never"
        javaScriptEnabled domStorageEnabled originWhitelist={['*']} mixedContentMode="always"
        onLoad={onLoad}
        onMessage={handleMessage}
      />
    </View>
  );
}
