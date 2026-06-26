// ScrambledImage — WebView Canvas 解码 scramble 图片
// iOS EAS Build: expo-file-system 下载 → WebView Canvas 处理 → 显示解码图
// @author nyx

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { Image } from 'expo-image';

interface Props {
  imageUrl: string;
  scrambleId: number;
  style?: any;
  onLoad?: () => void;
}

function buildHtml(base64Data: string, gridSize: number): string {
  return `<!DOCTYPE html>
<html><body>
<script>
(function(){
  var img = new Image();
  img.onload = function(){
    var c = document.createElement('canvas');
    var ctx = c.getContext('2d');
    var w = img.naturalWidth, h = img.naturalHeight;
    c.width = w; c.height = h;
    var n = ${gridSize};
    var sh = Math.floor(h / n);
    var r = h % n;
    for(var i=0; i<n; i++){
      var sy = h - sh*(i+1) - (i===0?0:r);
      var dy = sh * i;
      var ch = sh + (i===0?r:0);
      ctx.drawImage(img, 0, sy, w, ch, 0, dy, w, ch);
    }
    window.ReactNativeWebView.postMessage(c.toDataURL('image/jpeg',0.85));
  };
  img.onerror = function(){ window.ReactNativeWebView.postMessage('ERR'); };
  img.src = '${base64Data}';
})();
<\/script>
</body></html>`;
}

function calcGridSize(scrambleId: number): number {
  if (scrambleId <= 0) return 10;
  const r = scrambleId % 10;
  const gridMap: Record<number, number> = {
    0: 2, 1: 4, 2: 6, 3: 8, 4: 10,
    5: 12, 6: 14, 7: 16, 8: 18, 9: 20,
  };
  return gridMap[r] || 10;
}

export function ScrambledImage({ imageUrl, scrambleId, style, onLoad }: Props) {
  const [decoded, setDecoded] = useState<string | null>(null);
  const needsScramble = scrambleId !== 0 && scrambleId !== 220980;

  if (!needsScramble) {
    return <Image source={{ uri: imageUrl }} style={[{ flex: 1, width: '100%' }, style]} contentFit="contain" onLoad={onLoad} />;
  }

  if (decoded) {
    return <Image source={{ uri: decoded }} style={[{ flex: 1, width: '100%' }, style]} contentFit="contain" onLoad={onLoad} />;
  }

  // Web/Expo Go 无法解码，直接显示原图
  if (Platform.OS === 'web') {
    return <Image source={{ uri: imageUrl }} style={[{ flex: 1, width: '100%' }, style]} contentFit="contain" onLoad={onLoad} />;
  }

  // iOS EAS Build: 下载 → WebView 解码
  return <DescrambleRunner imageUrl={imageUrl} scrambleId={scrambleId} onResult={setDecoded} onLoad={onLoad} />;
}

function DescrambleRunner({ imageUrl, scrambleId, onResult, onLoad }: {
  imageUrl: string; scrambleId: number; onResult: (uri: string) => void; onLoad: () => void;
}) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // 动态导入 expo-file-system（web 上不加载）
        const FileSystem = require('expo-file-system');
        const dest = FileSystem.cacheDirectory + 'tmp_scramble_' + Date.now() + '.jpg';
        const result = await FileSystem.downloadAsync(imageUrl, dest);
        const base64 = await FileSystem.readAsStringAsync(result.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const dataUri = 'data:image/jpeg;base64,' + base64;
        const gridSize = calcGridSize(scrambleId);
        setHtml(buildHtml(dataUri, gridSize));
        FileSystem.deleteAsync(dest, { idempotent: true }).catch(() => {});
      } catch { onLoad(); }
    })();
  }, []);

  if (!html) {
    return (
      <View style={[{ flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }, style]}>
        <ActivityIndicator size="small" color="#F59E0B" />
      </View>
    );
  }

  try {
    const WebView = require('react-native-webview').WebView;
    return (
      <View style={[{ flex: 1, width: '100%' }, style]}>
        <WebView
          source={{ html }}
          style={{ flex: 1, opacity: 0, height: 0 }}
          onMessage={(e: any) => {
            if (e.nativeEvent.data !== 'ERR') onResult(e.nativeEvent.data);
            onLoad();
          }}
          javaScriptEnabled
          domStorageEnabled
        />
      </View>
    );
  } catch {
    onLoad();
    return <Image source={{ uri: imageUrl }} style={[{ flex: 1, width: '100%' }, style]} contentFit="contain" />;
  }
}
