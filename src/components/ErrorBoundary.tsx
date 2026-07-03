// 错误边界 — 捕获渲染异常，展示可复制的错误信息
// 参考 haka_comic ErrorPage + Log 系统

import React, { Component, ErrorInfo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

interface Props {
  children: React.ReactNode;
  onError?: (error: Error, stack: string) => void;
  title?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  stack: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, stack: '' };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const stack = error.stack || info.componentStack || '';
    this.setState({ stack });
    console.error('[ErrorBoundary]', error.message, stack);
    this.props.onError?.(error, stack);
  }

  handleCopy = () => {
    const text = `Error: ${this.state.error?.message || '未知错误'}\n\nStack:\n${this.state.stack}`;
    try {
      const { Clipboard } = require('react-native');
      if (Clipboard?.setString) Clipboard.setString(text);
    } catch {}
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <MaterialIcons name="error-outline" size={56} color="#E85D3A" />
            <Text style={styles.title}>{this.props.title || '页面渲染错误'}</Text>
            <Text style={styles.subtitle}>错误已捕获，请复制下面信息发送给开发者。</Text>

            <ScrollView style={styles.stackBox}>
              <Text style={styles.errorMsg}>
                {this.state.error?.message || '未知错误'}
              </Text>
              <Text style={styles.stackText}>
                {this.state.stack || '(无堆栈信息)'}
              </Text>
            </ScrollView>

            <View style={styles.actions}>
              <Pressable onPress={this.handleCopy} style={styles.btn}>
                <MaterialIcons name="content-copy" size={18} color="#fff" />
                <Text style={styles.btnText}>复制错误信息</Text>
              </Pressable>
              <Pressable
                onPress={() => this.setState({ hasError: false, error: null, stack: '' })}
                style={[styles.btn, { backgroundColor: 'rgba(255,255,255,0.08)' }]}
              >
                <MaterialIcons name="refresh" size={18} color="#E85D3A" />
                <Text style={[styles.btnText, { color: '#E85D3A' }]}>重试</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07070D' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: '800', color: '#F0EDE8', marginTop: 16 },
  subtitle: { fontSize: 13, color: '#9895A0', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  stackBox: {
    width: '100%', maxHeight: 300,
    backgroundColor: '#13131A', borderRadius: 12,
    padding: 14, marginTop: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  errorMsg: { fontSize: 13, fontWeight: '700', color: '#E85D3A', marginBottom: 8 },
  stackText: { fontSize: 11, color: '#6B6873', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', lineHeight: 16 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 20, flexWrap: 'wrap', justifyContent: 'center' },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#E85D3A', paddingVertical: 12, paddingHorizontal: 20,
    borderRadius: 12,
  },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
