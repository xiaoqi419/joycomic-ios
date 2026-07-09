// 个人中心 v3 — 双源账号管理
// @author Jason

import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useLegacyColors, LegacyColors, Radius, Spacing, FontSize } from '../theme';
import { AnimateEntrance } from '../components/AnimatedWrappers';
import { AnimatePressable } from '../components/AnimatedWrappers';
import { useAuthStore } from '../store/useAuth';
import { usePicaStore } from '../store/usePica';
import { useMemberStore } from '../store/useMember';
import { useSettingsStore } from '../store/useSettings';
import { login as jmLogin } from '../api/endpoints';
import { userProfile as picaProfile, punchIn as picaPunch } from '../pica/endpoints';
import { isPicaEnabled } from '../sources/pica';

export function MemberScreen() {
  const nav = useNavigation<any>();
  const { t, i18n } = useTranslation();
  const C = useLegacyColors();
  const styles = useMemo(() => getStyles(C), [C]);
  const { username: jmUser, loggedIn: jmLoggedIn, login: jmDoLogin, logout: jmDoLogout } = useAuthStore();
  const { username: picaUser, loggedIn: picaLoggedIn, login: picaDoLogin, logout: picaDoLogout, apiSource: picaApiSource, setApiSource: setPicaApiSource } = usePicaStore();
  const { info, signData, signed, doSignIn, loadInfo, loadSign, loadAchievements, achievements, notifications, loadNotifications, unread } = useMemberStore();
  const { language, setLanguage, readingMode, setReadingMode, showDebugLog, setShowDebugLog, theme, setTheme, shunts, selectedShuntKey, selectShunt, prefetchCount, setPrefetchCount, imageLayout, setImageLayout, lockOrientation, setLockOrientation, downloadToGallery, setDownloadToGallery, favoriteMode, setFavoriteMode, customConfigUrl, setCustomConfigUrl } = useSettingsStore();

  const [showJmLogin, setShowJmLogin] = useState(false);
  const [jmUserInput, setJmUserInput] = useState('');
  const [jmPassInput, setJmPassInput] = useState('');
  const [jmLoginLoading, setJmLoginLoading] = useState(false);

  const [showPicaLogin, setShowPicaLogin] = useState(false);
  const [picaUserInput, setPicaUserInput] = useState('');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configUrlDraft, setConfigUrlDraft] = useState('');
  const [picaPassInput, setPicaPassInput] = useState('');
  const [picaLoginLoading, setPicaLoginLoading] = useState(false);

  const dualSearch = usePicaStore((s) => s.loggedIn);

  useEffect(() => {
    if (jmLoggedIn) {
      loadInfo();
      loadSign().then(() => {
        if (!useMemberStore.getState().signed) doSignIn().catch(() => {});
      });
      loadAchievements();
      loadNotifications();
    }
  }, [jmLoggedIn]);

  const handleJmLogin = async () => {
    if (!jmUserInput.trim() || !jmPassInput.trim()) return;
    setJmLoginLoading(true);
    try {
      const data = await jmLogin(jmUserInput.trim(), jmPassInput.trim());
      if (data.s) {
        await jmDoLogin(data.username || jmUserInput, data.s, data.photo || '');
        setShowJmLogin(false);
        setJmUserInput('');
        setJmPassInput('');
        Alert.alert('', `欢迎回来, ${data.username || jmUserInput}`);
      }
    } catch (e: any) {
      Alert.alert('登录失败', e.message || '请检查用户名和密码');
    }
    setJmLoginLoading(false);
  };

  const handlePicaLogin = async () => {
    if (!picaUserInput.trim() || !picaPassInput.trim()) return;
    setPicaLoginLoading(true);
    try {
      await picaDoLogin(picaUserInput.trim(), picaPassInput.trim());
      setShowPicaLogin(false);
      setPicaUserInput('');
      setPicaPassInput('');
      Alert.alert('', 'Pica 账号已绑定');
    } catch (e: any) {
      Alert.alert('Pica 登录失败', e.message || '请检查用户名和密码');
    }
    setPicaLoginLoading(false);
  };

  const handleJmLogout = () => {
    Alert.alert('退出账号', '', [
      { text: '取消', style: 'cancel' },
      { text: '退出', onPress: () => jmDoLogout() },
    ]);
  };

  const handlePicaLogout = () => {
    Alert.alert('解绑 Pica', '', [
      { text: '取消', style: 'cancel' },
      { text: '解绑', onPress: () => picaDoLogout() },
    ]);
  };

  const handleSign = async () => {
    try {
      const data = await doSignIn();
      Alert.alert('签到成功', `+${data.coin} 金币, +${data.exp} 经验`);
    } catch {}
  };

  const Section = ({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) => (
    <View style={{ marginBottom: Spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, marginLeft: 4 }}>
        <MaterialIcons name={icon as any} size={18} color={C.primary} />
        <Text style={{ fontSize: FontSize.body, fontWeight: '700', color: C.primary }}>{title}</Text>
      </View>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );

  const Row = ({ label, right }: { label: string; right: React.ReactNode }) => (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {right}
    </View>
  );

  return (
    <AnimateEntrance><SafeAreaView edges={["top"]} style={styles.cont}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: Spacing.marginEdge, paddingBottom: 100 }}>
        <Text style={styles.pageTitle}>我的</Text>

        {/* ===== JMComic 账号 ===== */}
        <Section title="JMComic 账号" icon="person">
          {jmLoggedIn ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(jmUser || 'U')[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.username}>{jmUser}</Text>
                  <View style={{ flexDirection: 'row', gap: 14, marginTop: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <MaterialIcons name="monetization-on" size={14} color={C.primary} />
                      <Text style={styles.statVal}>{info?.coin || '-'}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <MaterialIcons name="star" size={14} color={C.primary} />
                      <Text style={styles.statVal}>Lv.{info?.level || '-'}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <MaterialIcons name="trending-up" size={14} color={C.primary} />
                      <Text style={styles.statVal}>{info?.experience || '-'}</Text>
                    </View>
                  </View>
                </View>
              </View>
              <Pressable onPress={signed ? undefined : handleSign} style={[styles.signBtn, signed && styles.signedBtn]}>
                <MaterialIcons name={signed ? 'check-circle' : 'today'} size={20} color={signed ? C.success : C.primary} />
                <Text style={{ color: signed ? C.success : C.primary, fontWeight: '600' }}>
                  {signed ? `${t('member.signed')}${signData?.days ? ` (${signData.days}d)` : ''}` : t('member.sign_in')}
                </Text>
              </Pressable>
              {unread && (unread.comic_follow > 0 || unread.site_notice > 0) && (
                <Pressable onPress={() => loadNotifications()} style={styles.notifBanner}>
                  <MaterialIcons name="notifications" size={18} color={C.primary} />
                  <Text style={{ color: C.primary, fontWeight: '600', flex: 1, fontSize: FontSize.label }}>
                    未读: {unread.comic_follow + unread.site_notice}
                  </Text>
                </Pressable>
              )}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <Pressable onPress={() => nav.navigate('Library', { source: 'jm', type: 'favorite' })} style={[styles.signBtn, { marginTop: 0, flex: 1 }]}>
                  <MaterialIcons name="bookmark" size={20} color={C.primary} />
                  <Text style={{ color: C.primary, fontWeight: '600' }}>我的收藏</Text>
                </Pressable>
                <Pressable onPress={() => nav.navigate('Library', { source: 'jm', type: 'like' })} style={[styles.signBtn, { marginTop: 0, flex: 1 }]}>
                  <MaterialIcons name="favorite" size={20} color={C.error} />
                  <Text style={{ color: C.error, fontWeight: '600' }}>我的喜欢</Text>
                </Pressable>
              </View>
              <Pressable onPress={handleJmLogout} style={styles.logoutSmall}>
                <Text style={styles.logoutSmallText}>退出登录</Text>
              </Pressable>
            </>
          ) : showJmLogin ? (
            <JmLoginForm />
          ) : (
            <>
              <Text style={{ color: C.textSecondary, fontSize: FontSize.body, marginBottom: 12 }}>
                登录后可查看收藏、签到、成就
              </Text>
              <Pressable onPress={() => setShowJmLogin(true)} style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>{t('member.login')}</Text>
              </Pressable>
            </>
          )}
        </Section>

        {/* ===== Pica 账号 ===== */}
        <Section title="Pica 账号" icon="bookmark">
          {picaLoggedIn ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <MaterialIcons name="check-circle" size={24} color={C.success} />
                <Text style={styles.username}>{picaUser}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <Pressable onPress={() => nav.navigate('Library', { source: 'pica', type: 'favorite' })} style={[styles.signBtn, { marginTop: 0, flex: 1 }]}>
                  <MaterialIcons name="bookmark" size={20} color="#9B59B6" />
                  <Text style={{ color: '#9B59B6', fontWeight: '600' }}>我的收藏</Text>
                </Pressable>
                <Pressable onPress={() => nav.navigate('Library', { source: 'pica', type: 'like' })} style={[styles.signBtn, { marginTop: 0, flex: 1 }]}>
                  <MaterialIcons name="favorite" size={20} color="#9B59B6" />
                  <Text style={{ color: '#9B59B6', fontWeight: '600' }}>我的喜欢</Text>
                </Pressable>
              </View>
              <Pressable onPress={handlePicaLogout} style={styles.logoutSmall}>
                <Text style={styles.logoutSmallText}>解绑</Text>
              </Pressable>
            </>
          ) : showPicaLogin ? (
            <PicaLoginForm />
          ) : (
            <>
              <Text style={{ color: C.textSecondary, fontSize: FontSize.body, marginBottom: 12 }}>
                绑定后可同时搜索 JMComic + Pica 双源内容
              </Text>
              <Pressable onPress={() => setShowPicaLogin(true)} style={styles.secondaryBtn}>
                <Text style={styles.secondaryBtnText}>绑定 Pica 账号</Text>
              </Pressable>
            </>
          )}
        </Section>

        {/* ===== Pica API 源 ===== */}
        <Section title="Pica API 源" icon="cloud">
          <Row label="服务器" right={
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['go2778', 'picacomic'] as const).map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setPicaApiSource(s)}
                  style={[styles.toggleBtn, picaApiSource === s && styles.toggleBtnActive]}
                >
                  <Text style={[styles.toggleText, picaApiSource === s && styles.toggleTextActive]}>
                    {s === 'go2778' ? '中转' : '直连'}
                  </Text>
                </Pressable>
              ))}
            </View>
          } />
        </Section>

        {/* ===== 搜索源状态 ===== */}
        <Section title="搜索源" icon="search">
          <Row label="当前状态" right={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialIcons name={dualSearch ? 'hub' : 'person-search'} size={18} color={dualSearch ? C.success : C.textTertiary} />
              <Text style={[styles.statusText, { color: dualSearch ? C.success : C.textSecondary }]}>
                {dualSearch ? '双源搜索 (JM + Pica)' : '仅 JMComic'}
              </Text>
            </View>
          } />
          {!dualSearch && (
            <Text style={{ color: C.textTertiary, fontSize: FontSize.label, marginTop: 4 }}>
              在上方绑定 Pica 账号后即可双源聚合搜索
            </Text>
          )}
        </Section>

        {/* ===== 成就 ===== */}
        {jmLoggedIn && achievements.length > 0 && (
          <Section title={t('member.achievements')} icon="emoji-events">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {achievements.slice(0, 6).map((a) => (
                <View key={a.id} style={{ alignItems: 'center', width: '30%', paddingVertical: 6 }}>
                  <View style={styles.achieveIcon}>
                    <MaterialIcons name="emoji-events" size={22} color={C.primary} />
                  </View>
                  <Text style={styles.achieveLabel} numberOfLines={1}>{a.name}</Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        {/* ===== 追更 / 通知 ===== */}
        {jmLoggedIn && notifications.length > 0 && (
          <Section title={`追更 (${unread?.comic_follow || 0})`} icon="notifications">
            {notifications.slice(0, 8).map((n) => (
              <View key={n.id} style={styles.notifItem}>
                <Text style={styles.notifTitle}>{n.title}</Text>
                <Text style={styles.notifContent} numberOfLines={2}>{n.content}</Text>
              </View>
            ))}
            <Pressable onPress={() => loadNotifications()} style={{ marginTop: 6 }}>
              <Text style={{ color: C.primary, fontSize: FontSize.label, textAlign: 'center' }}>刷新</Text>
            </Pressable>
          </Section>
        )}

        {/* ===== 设置 ===== */}
        <Section title={t('member.settings')} icon="settings">
          <Row label={t('member.reading_mode')} right={
            <View style={styles.toggleGroup}>
              {['scroll', 'page'].map((m) => (
                <Pressable key={m} onPress={() => setReadingMode(m as any)} style={[styles.toggleBtn, readingMode === m && styles.toggleBtnActive]}>
                  <Text style={[styles.toggleText, readingMode === m && styles.toggleTextActive]}>{t(`member.${m}`)}</Text>
                </Pressable>
              ))}
            </View>
          } />
          <Row label="主题" right={
            <View style={styles.toggleGroup}>
              {(['auto', 'light', 'dark'] as const).map((t) => (
                <Pressable key={t} onPress={() => setTheme(t)} style={[styles.toggleBtn, theme === t && styles.toggleBtnActive]}>
                  <Text style={[styles.toggleText, theme === t && styles.toggleTextActive]}>{t === 'auto' ? '自动' : t === 'light' ? '浅色' : '深色'}</Text>
                </Pressable>
              ))}
            </View>
          } />
          <Row label="预加载页数" right={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pressable onPress={() => setPrefetchCount(Math.max(1, prefetchCount - 1))} style={styles.toggleBtn}>
                <Text style={styles.toggleText}>−</Text>
              </Pressable>
              <Text style={{ color: C.textPrimary, fontWeight: '600', minWidth: 20, textAlign: 'center' }}>{prefetchCount}</Text>
              <Pressable onPress={() => setPrefetchCount(Math.min(10, prefetchCount + 1))} style={styles.toggleBtn}>
                <Text style={styles.toggleText}>+</Text>
              </Pressable>
            </View>
          } />
          <Row label="图片布局" right={
            <View style={styles.toggleGroup}>
              {(['contain', 'fitWidth', 'fitHeight'] as const).map((m) => (
                <Pressable key={m} onPress={() => setImageLayout(m)} style={[styles.toggleBtn, imageLayout === m && styles.toggleBtnActive]}>
                  <Text style={[styles.toggleText, imageLayout === m && styles.toggleTextActive]}>{m === 'contain' ? '适配' : m === 'fitWidth' ? '宽屏' : '高屏'}</Text>
                </Pressable>
              ))}
            </View>
          } />
          <Row label="阅读器方向" right={
            <View style={styles.toggleGroup}>
              {([{ v: 0, l: '自动' }, { v: 1, l: '横屏' }, { v: 2, l: '竖屏' }] as const).map((opt) => (
                <Pressable key={opt.v} onPress={() => setLockOrientation(opt.v)} style={[styles.toggleBtn, lockOrientation === opt.v && styles.toggleBtnActive]}>
                  <Text style={[styles.toggleText, lockOrientation === opt.v && styles.toggleTextActive]}>{opt.l}</Text>
                </Pressable>
              ))}
            </View>
          } />
          <Row label="下载位置" right={
            <View style={styles.toggleGroup}>
              <Pressable onPress={() => setDownloadToGallery(true)} style={[styles.toggleBtn, downloadToGallery && styles.toggleBtnActive]}>
                <Text style={[styles.toggleText, downloadToGallery && styles.toggleTextActive]}>图库</Text>
              </Pressable>
              <Pressable onPress={() => setDownloadToGallery(false)} style={[styles.toggleBtn, !downloadToGallery && styles.toggleBtnActive]}>
                <Text style={[styles.toggleText, !downloadToGallery && styles.toggleTextActive]}>文件夹</Text>
              </Pressable>
            </View>
          } />
          {shunts.length > 0 && (
            <Pressable onPress={() => nav.navigate('ShuntSelector')}>
              <Row label="源/线路" right={
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.rowValue}>{shunts.find((s) => s.key === selectedShuntKey)?.title || '快速通道'}</Text>
                  <MaterialIcons name="chevron-right" size={18} color={C.textTertiary} />
                </View>
              } />
            </Pressable>
          )}
          <Row label={t('member.language')} right={
            <View style={styles.toggleGroup}>
              {(['zh', 'en'] as const).map((l) => (
                <Pressable key={l} onPress={() => { setLanguage(l); i18n.changeLanguage(l); }} style={[styles.toggleBtn, language === l && styles.toggleBtnActive]}>
                  <Text style={[styles.toggleText, language === l && styles.toggleTextActive]}>{l === 'zh' ? '中文' : 'English'}</Text>
                </Pressable>
              ))}
            </View>
          } />
          <Row label="调试日志" right={
            <Pressable onPress={() => setShowDebugLog(!showDebugLog)} style={[styles.toggleBtn, showDebugLog && styles.toggleBtnActive]}>
              <Text style={[styles.toggleText, showDebugLog && styles.toggleTextActive]}>{showDebugLog ? '开启' : '关闭'}</Text>
            </Pressable>
          } />
          <Pressable onPress={() => nav.navigate('Logs')}>
            <Row label="日志查看" right={
              <MaterialIcons name="chevron-right" size={20} color={C.textTertiary} />
            } />
          </Pressable>
          <Pressable onPress={() => nav.navigate('DownloadList')}>
            <Row label="下载管理" right={
              <MaterialIcons name="chevron-right" size={20} color={C.textTertiary} />
            } />
          </Pressable>
                    <Row label="自定义配置地址" right={
            <Pressable onPress={() => {
              setConfigUrlDraft(customConfigUrl);
              setShowConfigModal(true);
            }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[styles.rowValue, { fontSize: 13, maxWidth: 140 }]} numberOfLines={1}>
                {customConfigUrl || '未设置'}
              </Text>
              <MaterialIcons name="chevron-right" size={18} color={C.textTertiary} />
            </Pressable>
          } />

          {/* 配置地址弹窗 */}
          <Modal visible={showConfigModal} transparent animationType="fade" onRequestClose={() => setShowConfigModal(false)}>
            <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setShowConfigModal(false)} />
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, paddingBottom: 40 }}>
              <Text style={{ color: C.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 4 }}>自定义配置地址</Text>
              <Text style={{ color: C.textTertiary, fontSize: 12, marginBottom: 12 }}>填入 CDN 地址加速首页加载，留空则使用默认</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: C.divider, borderRadius: 10, padding: 12, color: C.textPrimary, backgroundColor: C.background, fontSize: 14 }}
                placeholder="http://comic.ojason.top/jm-config.json" placeholderTextColor={C.textTertiary}
                value={configUrlDraft} onChangeText={setConfigUrlDraft}
                autoCapitalize="none" autoCorrect={false}
              />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <Pressable onPress={() => setShowConfigModal(false)} style={{ flex: 1, borderRadius: 10, padding: 12, alignItems: 'center', backgroundColor: C.surface, borderWidth: 1, borderColor: C.divider }}>
                  <Text style={{ color: C.textPrimary, fontWeight: '600' }}>取消</Text>
                </Pressable>
                <Pressable onPress={() => {
                  setCustomConfigUrl(configUrlDraft);
                  setShowConfigModal(false);
                }} style={{ flex: 1, borderRadius: 10, padding: 12, alignItems: 'center', backgroundColor: C.primary }}>
                  <Text style={{ color: '#fff', fontWeight: '600' }}>保存</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
            <View style={styles.toggleGroup}>
              <Pressable onPress={() => setFavoriteMode('cloud')} style={[styles.toggleBtn, favoriteMode === 'cloud' && styles.toggleBtnActive]}>
                <Text style={[styles.toggleText, favoriteMode === 'cloud' && styles.toggleTextActive]}>云端</Text>
              </Pressable>
              <Pressable onPress={() => setFavoriteMode('local')} style={[styles.toggleBtn, favoriteMode === 'local' && styles.toggleBtnActive]}>
                <Text style={[styles.toggleText, favoriteMode === 'local' && styles.toggleTextActive]}>本地</Text>
              </Pressable>
            </View>
          } />
          <Pressable onPress={() => nav.navigate('About')}>
            <Row label={t('member.about')} right={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.rowValue}>v{Constants.expoConfig?.version || '1.0.0'}</Text>
                <MaterialIcons name="chevron-right" size={20} color={C.textTertiary} />
              </View>
            } />
          </Pressable>
        </Section>
      </ScrollView>
    </SafeAreaView></AnimateEntrance>
  );
}

function getStyles(C: LegacyColors) {
  return StyleSheet.create({
    cont: { flex: 1, backgroundColor: C.background },
    pageTitle: { fontSize: FontSize.largeTitle, fontWeight: '800', color: C.textPrimary, marginBottom: Spacing.lg },
    sectionCard: {
      backgroundColor: C.surface, borderRadius: Radius.card, padding: Spacing.md,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2,
    },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
    rowLabel: { fontSize: FontSize.bodyLarge, color: C.textPrimary },
    rowValue: { color: C.textSecondary, fontSize: FontSize.body },

    avatar: {
      width: 48, height: 48, borderRadius: 24,
      backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center',
    },
    avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
    username: { fontSize: FontSize.title, fontWeight: '700', color: C.textPrimary },
    statVal: { color: C.textSecondary, fontSize: FontSize.body },

    input: {
      height: 46, backgroundColor: C.surfaceLight, borderRadius: Radius.button,
      borderWidth: 1, borderColor: C.border, paddingHorizontal: 14,
      color: C.textPrimary, marginBottom: 10, fontSize: FontSize.body,
    },
    primaryBtn: {
      backgroundColor: C.primary, padding: 14, borderRadius: Radius.button,
      alignItems: 'center', marginTop: 4,
    },
    primaryBtnText: { color: C.textOnPrimary, fontWeight: '700', fontSize: FontSize.bodyLarge },
    secondaryBtn: {
      borderWidth: 1, borderColor: C.primary, padding: 14, borderRadius: Radius.button,
      alignItems: 'center',
    },
    secondaryBtnText: { color: C.primary, fontWeight: '700', fontSize: FontSize.bodyLarge },

    signBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      padding: 12, borderRadius: Radius.button,
      borderWidth: 1, borderColor: C.primary, marginTop: 12,
    },
    signedBtn: { borderColor: C.success, backgroundColor: C.success + '15' },

    notifBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: C.primary + '15', borderRadius: Radius.card,
      padding: 10, marginTop: 10,
    },

    achieveIcon: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: C.primary + '20', justifyContent: 'center', alignItems: 'center',
    },
    achieveLabel: { fontSize: FontSize.caption, color: C.textSecondary, textAlign: 'center', marginTop: 4 },

    notifItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.divider },
    notifTitle: { color: C.text, fontWeight: '600', fontSize: FontSize.body },
    notifContent: { color: C.textSecondary, fontSize: FontSize.body, marginTop: 2 },

    toggleGroup: { flexDirection: 'row', borderWidth: 1, borderColor: C.border, borderRadius: Radius.sm, overflow: 'hidden' },
    toggleBtn: { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: C.surface },
    toggleBtnActive: { backgroundColor: C.primary },
    toggleText: { color: C.textSecondary, fontWeight: '500', fontSize: FontSize.label },
    toggleTextActive: { color: C.textOnPrimary },

    logoutSmall: { marginTop: 10, alignSelf: 'flex-end' },
    logoutSmallText: { color: C.error, fontSize: FontSize.label, fontWeight: '600' },

    statusText: { fontSize: FontSize.body, fontWeight: '600' },
  });
}

const formStyles = StyleSheet.create({
  input: { height: 46, backgroundColor: '#1C1C1E', borderRadius: Radius.button, borderWidth: 1, borderColor: '#333', paddingHorizontal: 14, color: '#fff', marginBottom: 10, fontSize: FontSize.body },
  btn: { backgroundColor: '#0af', padding: 14, borderRadius: Radius.button, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.bodyLarge },
});

const JmLoginForm = React.memo(function JmLoginForm() {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const nav = useNavigation<any>();

  const handleLogin = async () => {
    if (!user.trim() || !pass.trim()) return;
    setLoading(true);
    try {
      const data = await jmLogin(user.trim(), pass.trim());
      const storeLogin = useAuthStore.getState().login;
      await storeLogin(data.username || user, data.s, data.photo || '');
      Alert.alert('', `欢迎回来, ${data.username || user}`);
    } catch (e: any) {
      Alert.alert('登录失败', e.message || '请检查用户名和密码');
    }
    setLoading(false);
  };

  return (
    <>
      <TextInput key="jm-user" style={formStyles.input} placeholder="用户名" placeholderTextColor="#666" value={user} onChangeText={setUser} autoCapitalize="none" />
      <TextInput key="jm-pass" style={formStyles.input} placeholder="密码" placeholderTextColor="#666" value={pass} onChangeText={setPass} secureTextEntry />
      <Pressable onPress={handleLogin} disabled={loading} style={formStyles.btn}>
        <Text style={formStyles.btnText}>{loading ? '...' : t('member.login')}</Text>
      </Pressable>
    </>
  );
});

const PicaLoginForm = React.memo(function PicaLoginForm() {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);
  const picaLogin = usePicaStore((s) => s.login);

  const handleLogin = async () => {
    if (!user.trim() || !pass.trim()) return;
    setLoading(true);
    try {
      await picaLogin(user.trim(), pass.trim());
      Alert.alert('', 'Pica 账号已绑定');
      // 自动签到
      try {
        const profile = await picaProfile();
        const u = (profile as any).user || profile;
        if (!u.isPunched) {
          await picaPunch();
        }
      } catch {}
    } catch (e: any) {
      Alert.alert('Pica 登录失败', e.message || '请检查用户名和密码');
    }
    setLoading(false);
  };

  return (
    <>
      <Text style={{ color: '#aaa', fontSize: FontSize.body, marginBottom: 8 }}>
        绑定 Pica 账号后可搜到 Pica 源内容
      </Text>
      <TextInput key="pica-user" style={formStyles.input} placeholder="Pica 账号/邮箱" placeholderTextColor="#666" value={user} onChangeText={setUser} autoCapitalize="none" keyboardType="email-address" />
      <TextInput key="pica-pass" style={formStyles.input} placeholder="Pica 密码" placeholderTextColor="#666" value={pass} onChangeText={setPass} secureTextEntry />
      <Pressable onPress={handleLogin} disabled={loading} style={formStyles.btn}>
        <Text style={formStyles.btnText}>{loading ? '...' : '绑定'}</Text>
      </Pressable>
    </>
  );
});
