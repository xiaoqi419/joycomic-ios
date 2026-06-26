// 个人中心 — 复刻 APK Member.tsx
// 用户卡片 + 签到 + 成就 + 通知 + 设置
// @author nyx

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, FontSize } from '../theme';
import { useAuthStore } from '../store/useAuth';
import { useMemberStore } from '../store/useMember';
import { useSettingsStore } from '../store/useSettings';
import { getImgHost } from '../api/endpoints';
import { login, register as apiRegister, forgotPassword } from '../api/endpoints';
import type { LoginData } from '../api/types';

export function MemberScreen() {
  const nav = useNavigation<any>();
  const { t, i18n } = useTranslation();
  const { username, loggedIn, login: doLogin, logout: doLogout } = useAuthStore();
  const { info, signData, signed, doSignIn, loadInfo, loadSign, loadAchievements, achievements, notifications, loadNotifications, unread } = useMemberStore();
  const { language, setLanguage, readingMode, setReadingMode, darkMode, setDarkMode, shunts, selectedShuntKey, selectShunt } = useSettingsStore();

  // Login form state
  const [showLogin, setShowLogin] = useState(false);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    if (loggedIn) {
      loadInfo();
      loadSign();
      loadAchievements();
      loadNotifications();
    }
  }, [loggedIn]);

  const handleLogin = async () => {
    if (!loginUser.trim() || !loginPass.trim()) return;
    setLoginLoading(true);
    try {
      const data = await login(loginUser.trim(), loginPass.trim());
      if (data.s) {
        await doLogin(data.username || loginUser, data.s, data.photo || '');
        setShowLogin(false);
        setLoginUser('');
        setLoginPass('');
        Alert.alert('', `欢迎回来, ${data.username || loginUser}`);
      }
    } catch (e: any) {
      Alert.alert('登录失败', e.message || '请检查用户名和密码');
    }
    setLoginLoading(false);
  };

  const handleLogout = () => {
    Alert.alert('确认退出', '', [
      { text: '取消', style: 'cancel' },
      { text: '退出', onPress: () => doLogout() },
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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, marginLeft: 4 }}>
        <MaterialIcons name={icon as any} size={16} color={Colors.primary} />
        <Text style={{ fontSize: FontSize.label, fontWeight: '700', color: Colors.primary, textTransform: 'uppercase' }}>{title}</Text>
      </View>
      <View style={{ backgroundColor: Colors.surfaceLowest, borderRadius: Radius.card, padding: Spacing.md, borderWidth: 1, borderColor: Colors.divider }}>
        {children}
      </View>
    </View>
  );

  const Row = ({ label, right }: { label: string; right: React.ReactNode }) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 }}>
      <Text style={{ fontSize: FontSize.bodyLarge, color: Colors.textPrimary }}>{label}</Text>
      {right}
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView contentContainerStyle={{ padding: Spacing.marginEdge, paddingBottom: 100 }}>
        <Text style={{ fontSize: FontSize.largeTitle, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.lg }}>
          {loggedIn ? t('member.welcome') : t('member.login')}
        </Text>

        {/* 用户卡片 / 登录区 */}
        {loggedIn ? (
          <View style={{ backgroundColor: Colors.surfaceLowest, borderRadius: Radius.card, padding: Spacing.md, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.divider }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700' }}>{(username || 'U')[0].toUpperCase()}</Text>
              </View>
              <View>
                <Text style={{ fontSize: FontSize.title, fontWeight: '700', color: Colors.textPrimary }}>{username}</Text>
                <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
                  <Text style={{ color: Colors.textSecondary }}>🪙 {info?.coin || '-'}</Text>
                  <Text style={{ color: Colors.textSecondary }}>⭐ {info?.level || '-'}</Text>
                  <Text style={{ color: Colors.textSecondary }}>📊 {info?.exp || '-'}</Text>
                </View>
              </View>
            </View>
            {/* 签到 */}
            <Pressable onPress={signed ? undefined : handleSign} style={[s.signBtn, signed && { backgroundColor: Colors.surfaceLight }]}>
              <MaterialIcons name={signed ? 'check-circle' : 'today'} size={20} color={signed ? Colors.success : Colors.primary} />
              <Text style={{ color: signed ? Colors.success : Colors.primary, fontWeight: '600' }}>
                {signed ? `${t('member.signed')}${signData?.days ? ` (${signData.days}d)` : ''}` : t('member.sign_in')}
              </Text>
            </Pressable>
          </View>
        ) : showLogin ? (
          <View style={{ backgroundColor: Colors.surfaceLowest, borderRadius: Radius.card, padding: Spacing.md, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.divider }}>
            <TextInput style={s.input} placeholder="用户名" placeholderTextColor={Colors.textTertiary} value={loginUser} onChangeText={setLoginUser} autoCapitalize="none" />
            <TextInput style={s.input} placeholder="密码" placeholderTextColor={Colors.textTertiary} value={loginPass} onChangeText={setLoginPass} secureTextEntry />
            <Pressable onPress={handleLogin} disabled={loginLoading} style={s.primaryBtn}>
              <Text style={{ color: Colors.textOnPrimary, fontWeight: '700' }}>{loginLoading ? '...' : t('member.login')}</Text>
            </Pressable>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 8 }}>
              <Pressable onPress={() => nav.navigate('Register')}><Text style={{ color: Colors.primary }}>{t('member.register')}</Text></Pressable>
              <Pressable onPress={() => nav.navigate('ForgotPassword')}><Text style={{ color: Colors.primary }}>{t('member.forgot')}</Text></Pressable>
            </View>
          </View>
        ) : (
          <View style={{ backgroundColor: Colors.surfaceLowest, borderRadius: Radius.card, padding: Spacing.md, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.divider }}>
            <Pressable onPress={() => setShowLogin(true)} style={s.primaryBtn}>
              <Text style={{ color: Colors.textOnPrimary, fontWeight: '700' }}>{t('member.login')}</Text>
            </Pressable>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 8 }}>
              <Pressable onPress={() => nav.navigate('Register')}><Text style={{ color: Colors.primary }}>{t('member.register')}</Text></Pressable>
              <Pressable onPress={() => nav.navigate('ForgotPassword')}><Text style={{ color: Colors.primary }}>{t('member.forgot')}</Text></Pressable>
            </View>
          </View>
        )}

        {/* 未读通知 */}
        {loggedIn && unread && (unread.comic_follow > 0 || unread.site_notice > 0) && (
          <Pressable onPress={() => loadNotifications()} style={{ backgroundColor: Colors.primary + '20', borderRadius: Radius.sm, padding: 10, marginBottom: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MaterialIcons name="notifications" size={20} color={Colors.primary} />
            <Text style={{ color: Colors.primary, fontWeight: '600' }}>
              未读通知: {unread.comic_follow + unread.site_notice}
            </Text>
          </Pressable>
        )}

        {/* 成就 */}
        {loggedIn && achievements.length > 0 && (
          <Section title={t('member.achievements')} icon="emoji-events">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {achievements.slice(0, 6).map((a) => (
                <View key={a.id} style={{ alignItems: 'center', width: '30%' }}>
                  <Text style={{ fontSize: 24 }}>{a.icon || '🏆'}</Text>
                  <Text style={{ fontSize: FontSize.caption, color: Colors.textSecondary, textAlign: 'center' }}>{a.name}</Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        {/* 通知列表 */}
        {loggedIn && notifications.length > 0 && (
          <Section title={t('member.notifications')} icon="notifications">
            {notifications.slice(0, 5).map((n) => (
              <View key={n.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.divider }}>
                <Text style={{ color: Colors.text, fontWeight: '600' }}>{n.title}</Text>
                <Text style={{ color: Colors.textSecondary, fontSize: FontSize.body }} numberOfLines={2}>{n.content}</Text>
              </View>
            ))}
          </Section>
        )}

        {/* 设置 */}
        <Section title={t('member.settings')} icon="settings">
          <Row label={t('member.reading_mode')} right={
            <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, overflow: 'hidden' }}>
              {['scroll', 'page'].map((m) => (
                <Pressable key={m} onPress={() => setReadingMode(m as any)} style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: readingMode === m ? Colors.primary : Colors.surfaceLowest }}>
                  <Text style={{ color: readingMode === m ? Colors.textOnPrimary : Colors.textSecondary, fontWeight: '500' }}>{t(`member.${m}`)}</Text>
                </Pressable>
              ))}
            </View>
          } />
          {/* 源选择（从 /api/setting 动态获取） */}
          {shunts.length > 0 && (
            <Row label="源/线路" right={
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, maxWidth: 200 }}>
                {shunts.map((s) => (
                  <Pressable
                    key={s.key}
                    onPress={() => selectShunt(s.key)}
                    style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: selectedShuntKey === s.key ? Colors.primary : Colors.surfaceLight }}
                  >
                    <Text style={{ fontSize: FontSize.label, color: selectedShuntKey === s.key ? Colors.textOnPrimary : Colors.textSecondary }}>
                      {s.title}
                    </Text>
                  </Pressable>
                ))}
              </View>
            } />
          )}
          <Row label={t('member.language')} right={
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['zh', 'en'] as const).map((l) => (
                <Pressable key={l} onPress={() => { setLanguage(l); i18n.changeLanguage(l); }} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.sm, backgroundColor: language === l ? Colors.primary : Colors.surfaceLight }}>
                  <Text style={{ color: language === l ? Colors.textOnPrimary : Colors.textSecondary, fontWeight: '500' }}>{l === 'zh' ? '中文' : 'English'}</Text>
                </Pressable>
              ))}
            </View>
          } />
          <Row label={t('member.about')} right={<Text style={{ color: Colors.textSecondary }}>v1.0.0</Text>} />
        </Section>

        {/* 退出登录 */}
        {loggedIn && (
          <Pressable onPress={handleLogout} style={{ backgroundColor: Colors.error + '20', borderRadius: Radius.button, padding: 14, alignItems: 'center', marginTop: Spacing.md }}>
            <Text style={{ color: Colors.error, fontWeight: '700' }}>{t('member.logout')}</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  signBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.primary, marginTop: 12 },
  primaryBtn: { backgroundColor: Colors.primary, padding: 12, borderRadius: Radius.button, alignItems: 'center', marginTop: 8 },
  input: { height: 44, backgroundColor: Colors.surface, borderRadius: Radius.button, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, color: Colors.textPrimary, marginBottom: 8 },
});
