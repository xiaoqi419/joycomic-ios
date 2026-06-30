// SafeImage — expo-file-system 下载 → base64 → WebView Canvas
// @author Jason

import React, { useState, useEffect, useMemo } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import { buildDescrambleHtml, buildSimpleImageHtml, extractFilename } from '../utils/scramble';

interface Props { imageUrl: string; epsId: string; pictureName?: string; style?: any; onLoad?: () => void; }

const SC_ID = '220980';

async function urlToDataUri(url: string): Promise<string> {
  const ext = url.split('.').pop()?.replace(/\?.*/, '') || 'webp';
  const dest = \`\${FileSystem.cacheDirectory}jm_\${Date.now()}_\${Math.random().toString(36).slice(2)}.\${ext}\`;
  const dl = await FileSystem.downloadAsync(url, dest);
  if (dl.status !== 200) throw new Error(\`Download \${dl.status}\`);
  const b64 = await FileSystem.readAsStringAsync(dl.uri, { encoding: FileSystem.EncodingType.Base64 });
  FileSystem.deleteAsync(dl.uri, { idempotent: true }).catch(() => {});
  return \`data:image/\${ext};base64,\${b64}\`;
}

export function SafeImage({ imageUrl, epsId, pictureName, style, onLoad }: Props) {
  const [dataUri, setDataUri] = useState<string | null>(null);
  const [fallback, setFallback] = useState(false);
  const picName = pictureName || extractFilename(imageUrl);

  useEffect(() => {
    let cancel = false;
    urlToDataUri(imageUrl).then(uri => { if (!cancel) setDataUri(uri); }).catch(() => { if (!cancel) { setDataUri(imageUrl); setFallback(true); } });
    return () => { cancel = true; };
  }, [imageUrl]);

  const html = useMemo(() => {
    if (!dataUri) return '';
    if (fallback) return buildSimpleImageHtml(dataUri);
    try { return buildDescrambleHtml(dataUri, epsId, SC_ID, picName); }
    catch { return buildSimpleImageHtml(dataUri); }
  }, [dataUri, epsId, picName, fallback]);

  if (!dataUri) return <View style={[{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }, style]}><ActivityIndicator size="small" color="#ff6b35" /></View>;

  return (
    <View style={[{ flex: 1, backgroundColor: '#000' }, style]}>
      <WebView style={{ flex: 1, backgroundColor: 'transparent' }} source={{ html }}
        scrollEnabled={false} bounces={false} overScrollMode="never"
        javaScriptEnabled domStorageEnabled originWhitelist={['*']} mixedContentMode="always"
        onLoad={onLoad}
      />
    </View>
  );
}
