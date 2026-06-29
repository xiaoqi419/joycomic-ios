// ScrambledImage — WebView Canvas 解扰图片组件
// 将禁漫天堂的百叶窗图片通过 Canvas 逆序重排还原
// @author nyx

import React, { useMemo, useRef, useCallback } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Colors } from '../theme';
import { buildDescrambleHtml, buildSimpleImageHtml, extractFilenameWithoutExt } from '../utils/scramble';

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
  const webRef = useRef<any>(null);

  // 如果未提供 pictureName, 从 URL 提取
  const picName = pictureName || extractFilenameWithoutExt(imageUrl) + '.webp';
  const scId = String(scrambleId);

  // 生成 HTML — 仅在参数变化时重新计算
  const html = useMemo(() => {
    try {
      return buildDescrambleHtml(imageUrl, epsId, scId, picName);
    } catch {
      // 降级: 直接显示原图
      return buildSimpleImageHtml(imageUrl);
    }
  }, [imageUrl, epsId, scId, picName]);

  const handleMessage = useCallback((event: any) => {
    if (event.nativeEvent?.data === 'loaded' && onLoad) {
      onLoad();
    }
  }, [onLoad]);

  return (
    <View style={[{ flex: 1, width: '100%', backgroundColor: '#000' }, style]}>
      {/* loading indicator shown while WebView loads */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
        <ActivityIndicator
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }}
          color={Colors.primary}
          size="small"
        />
      </View>
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
        // 允许通过 file:// 加载缓存图片（如果需要）
        allowFileAccess={true}
      />
    </View>
  );
}
