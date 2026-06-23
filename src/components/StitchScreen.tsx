// StitchScreen - 已禁用（WebView 不兼容 Expo Go）
// 保留此文件仅为占位，未来使用 EAS Dev Build 时可启用
// @author Jason

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StitchScreenProps {
  htmlUrl?: string;
  htmlContent?: string;
  onMessage?: (event: any) => void;
}

export function StitchScreen(_props: StitchScreenProps) {
  return (
    <View style={styles.center}>
      <Text style={styles.text}>Stitch WebView 预览</Text>
      <Text style={styles.hint}>需要 EAS Dev Build 才能使用此功能</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF8F7' },
  text: { fontSize: 16, color: '#5A4041', marginBottom: 8 },
  hint: { fontSize: 13, color: '#8E6F70' },
});
