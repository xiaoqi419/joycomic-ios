// 关于页面 — 软件介绍、作者、GitHub、免责声明、更新日志
// @author Jason

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useLegacyColors, Radius, Spacing, FontSize } from '../theme';
import { checkForUpdate } from '../utils/updateCheck';

const GITHUB_REPO = 'https://github.com/xiaoqi419/jmcomic-ios';
const GITHUB_HOME = 'https://github.com/xiaoqi419';

const APP_VERSION = Constants.expoConfig?.version || '1.0.0';

export function AboutScreen() {
  const C = useLegacyColors();
  const styles = useMemo(() => getStyles(C), [C]);
  const [updateInfo, setUpdateInfo] = useState<{ checking: boolean; hasUpdate: boolean; latest: string; changelog: string; error?: string }>({ checking: true, hasUpdate: false, latest: '', changelog: '' });

  useEffect(() => {
    checkForUpdate(APP_VERSION).then((r) => {
      setUpdateInfo({
        checking: false,
        hasUpdate: r.hasUpdate,
        latest: r.latestVersion,
        changelog: r.release?.body || '',
        error: r.error,
      });
    });
  }, []);

  return (
    <SafeAreaView edges={["top"]} style={styles.cont}>
      <ScrollView contentContainerStyle={{ padding: Spacing.marginEdge, paddingBottom: 60 }}>
        {/* App 标识 */}
        <View style={styles.hero}>
          <View style={styles.iconWrap}>
            <MaterialIcons name="auto-stories" size={40} color={C.textOnPrimary} />
          </View>
          <Text style={styles.appName}>JOYComic</Text>
          <Text style={styles.version}>v{APP_VERSION}</Text>
          {updateInfo.checking && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <ActivityIndicator size="small" color={C.textTertiary} />
              <Text style={{ fontSize: FontSize.label, color: C.textTertiary }}>检查更新...</Text>
            </View>
          )}
          {!updateInfo.checking && updateInfo.hasUpdate && (
            <Pressable onPress={() => Linking.openURL(GITHUB_REPO + '/releases/latest')} style={[styles.linkRow, { borderBottomWidth: 0, marginTop: 8, justifyContent: 'center' }]}>
              <MaterialIcons name="system-update" size={18} color={C.primary} />
              <Text style={{ color: C.primary, fontWeight: '700', fontSize: FontSize.body }}>发现新版本 v{updateInfo.latest}</Text>
            </Pressable>
          )}
          {!updateInfo.checking && !updateInfo.hasUpdate && !updateInfo.error && (
            <Text style={{ fontSize: FontSize.label, color: C.success, marginTop: 8 }}>已是最新版本</Text>
          )}
          {!updateInfo.checking && updateInfo.error && (
            <Text style={{ fontSize: FontSize.label, color: C.textTertiary, marginTop: 8 }}>{updateInfo.error}</Text>
          )}
        </View>

        {/* 软件介绍 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>软件介绍</Text>
          <Text style={styles.body}>
            JOYComic 是一款 iOS 端双源聚合漫画阅读器，同时支持 JMComic（禁漫天堂）和 Pica（PicACG）双源内容搜索与阅读。
            提供高清漫画浏览、多源聚合搜索、自定义书签收藏、暗色模式等特性，致力于带来愉悦的漫画阅读体验。
          </Text>
        </View>

        {/* 作者 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>作者</Text>
          <Text style={styles.body}>JASON</Text>
        </View>

        {/* GitHub 链接 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>GitHub</Text>
          <Pressable onPress={() => Linking.openURL(GITHUB_REPO)} style={styles.linkRow}>
            <MaterialIcons name="code" size={20} color={C.primary} />
            <Text style={styles.linkText}>项目仓库</Text>
            <Text style={styles.linkHint}>{GITHUB_REPO}</Text>
          </Pressable>
          <Pressable onPress={() => Linking.openURL(GITHUB_HOME)} style={styles.linkRow}>
            <MaterialIcons name="person" size={20} color={C.primary} />
            <Text style={styles.linkText}>GitHub 主页</Text>
            <Text style={styles.linkHint}>{GITHUB_HOME}</Text>
          </Pressable>
        </View>

        {/* 更新日志 */}
        {updateInfo.changelog && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>更新日志</Text>
            <View style={styles.changelogBox}>
              <Text style={styles.changelogText}>{updateInfo.changelog}</Text>
            </View>
            <Pressable onPress={() => Linking.openURL(GITHUB_REPO + '/releases')} style={{ marginTop: 8 }}>
              <Text style={{ color: C.primary, fontSize: FontSize.body, fontWeight: '600' }}>查看全部版本 →</Text>
            </Pressable>
          </View>
        )}

        {/* 免责声明 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>免责声明</Text>
          <Text style={styles.disclaimer}>
            1. JOYComic 是一款仅供学习交流的个人开源项目，请勿用于商业用途。{"\n\n"}
            2. 本应用本身不存储任何漫画内容，所有内容均来自第三方源（JMComic、Pica 等），版权归原作者或源站所有。{"\n\n"}
            3. 用户在使用本应用时应遵守当地法律法规，下载的内容请在 24 小时内删除。{"\n\n"}
            4. 作者不对因使用本应用产生的任何问题承担法律责任，包括但不限于内容版权纠纷、数据丢失等。{"\n\n"}
            5. 如果您认为本应用侵犯了您的权益，请联系作者，我们将在核实后及时处理。
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getStyles(C: ReturnType<typeof useLegacyColors>) {
  return StyleSheet.create({
    cont: { flex: 1, backgroundColor: C.background },
    hero: { alignItems: 'center', paddingVertical: Spacing.xl },
    iconWrap: {
      width: 72, height: 72, borderRadius: 20,
      backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center',
      marginBottom: Spacing.md,
    },
    appName: { fontSize: FontSize.title, fontWeight: '800', color: C.textPrimary },
    version: { fontSize: FontSize.body, color: C.textSecondary, marginTop: 4 },
    section: { marginBottom: Spacing.lg },
    sectionTitle: { fontSize: FontSize.bodyLarge, fontWeight: '700', color: C.primary, marginBottom: Spacing.sm },
    body: { fontSize: FontSize.body, color: C.textPrimary, lineHeight: 22 },
    linkRow: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: C.divider,
    },
    linkText: { fontSize: FontSize.body, color: C.primary, fontWeight: '600' },
    linkHint: { fontSize: FontSize.caption, color: C.textTertiary, flex: 1, textAlign: 'right' },
    disclaimer: { fontSize: FontSize.body, color: C.textSecondary, lineHeight: 22 },
    changelogBox: {
      backgroundColor: C.surface, borderRadius: Radius.card, padding: Spacing.md,
      borderWidth: 1, borderColor: C.border,
    },
    changelogText: { fontSize: FontSize.body, color: C.textPrimary, lineHeight: 22 },
  });
}
