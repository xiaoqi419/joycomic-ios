// JmLogger — JM 调试日志单例，实时记录 + 导出
// @author Jason

import * as FileSystem from 'expo-file-system/legacy';
import { Share, Platform } from 'react-native';

export interface LogEntry {
  time: string;
  msg: string;
  level: 'info' | 'ok' | 'warn' | 'err' | 'wv';
}

class JmLogger {
  private logs: LogEntry[] = [];
  private listeners: Set<() => void> = new Set();
  private enabled = true;

  setEnabled(v: boolean) { this.enabled = v; }

  log(msg: string, level: LogEntry['level'] = 'info') {
    if (!this.enabled) return;
    const entry: LogEntry = { time: new Date().toLocaleTimeString(), msg, level };
    this.logs.push(entry);
    // 同时输出到控制台方便 RN 调试器
    console.log(`[JM] ${msg}`);
    this.listeners.forEach(fn => fn());
  }

  /** 从 WebView 接收的消息 */
  wv(msg: string) { this.log(msg, 'wv'); }

  ok(msg: string) { this.log(msg, 'ok'); }
  warn(msg: string) { this.log(msg, 'warn'); }
  err(msg: string) { this.log(msg, 'err'); }

  getAll(): LogEntry[] { return [...this.logs]; }
  clear() { this.logs = []; this.listeners.forEach(fn => fn()); }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** 导出日志到文件并唤起分享 */
  async export() {
    const text = this.logs.map(e => `[${e.time}][${e.level.toUpperCase()}] ${e.msg}`).join('\n');
    const header = `=== JM Descramble Log ===\nApp: jmcomic-ios\nDate: ${new Date().toISOString()}\nEntries: ${this.logs.length}\n${'-'.repeat(50)}\n\n`;
    const path = `${FileSystem.cacheDirectory}jm_log_${Date.now()}.txt`;
    await FileSystem.writeAsStringAsync(path, header + text);
    await Share.share(
      Platform.OS === 'ios'
        ? { url: path }
        : { title: 'JM Log', message: text },
    );
  }
}

export const jmLogger = new JmLogger();
