// 注册 + 忘记密码 — 复刻 APK 登录弹窗
// @author nyx

import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, FontSize } from '../theme';
import { register as apiRegister, forgotPassword } from '../api/endpoints';

export function RegisterScreen() {
  const nav = useNavigation<any>();
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!username.trim() || !password.trim()) { Alert.alert('提示', '请填写用户名和密码'); return; }
    if (password !== confirm) { Alert.alert('提示', '两次密码不一致'); return; }
    setLoading(true);
    try {
      await apiRegister({
        username: username.trim(), password: password.trim(),
        password_confirm: confirm.trim(), email: email.trim(),
        gender: '', adult: true, PrivacyPolicy: true,
      } as any);
      Alert.alert('注册成功', '请返回登录', [{ text: '确定', onPress: () => nav.goBack() }]);
    } catch (e: any) { Alert.alert('注册失败', e.message); }
    setLoading(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
        <MaterialIcons name="person-add" size={48} color={Colors.primary} style={{ alignSelf: 'center', marginBottom: 16 }} />
        <Text style={styles.title}>{t('member.register')}</Text>
        <TextInput style={styles.input} placeholder="邮箱（选填）" placeholderTextColor={Colors.textTertiary} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="用户名" placeholderTextColor={Colors.textTertiary} value={username} onChangeText={setUsername} autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="密码" placeholderTextColor={Colors.textTertiary} value={password} onChangeText={setPassword} secureTextEntry />
        <TextInput style={styles.input} placeholder="确认密码" placeholderTextColor={Colors.textTertiary} value={confirm} onChangeText={setConfirm} secureTextEntry />
        <Pressable onPress={handleRegister} disabled={loading} style={styles.btn}>
          <Text style={styles.btnText}>{loading ? '...' : t('member.register')}</Text>
        </Pressable>
        <Pressable onPress={() => nav.goBack()} style={{ marginTop: 16, alignItems: 'center' }}>
          <Text style={{ color: Colors.textSecondary }}>{t('common.back')}</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function ForgotPasswordScreen() {
  const nav = useNavigation<any>();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleForgot = async () => {
    if (!email.trim()) { Alert.alert('提示', '请输入邮箱'); return; }
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      Alert.alert('找回成功', '重置邮件已发送，请查看邮箱', [{ text: '确定', onPress: () => nav.goBack() }]);
    } catch (e: any) { Alert.alert('找回失败', e.message); }
    setLoading(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
        <MaterialIcons name="lock-reset" size={48} color={Colors.primary} style={{ alignSelf: 'center', marginBottom: 16 }} />
        <Text style={styles.title}>{t('member.forgot')}</Text>
        <TextInput style={styles.input} placeholder="邮箱" placeholderTextColor={Colors.textTertiary} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Pressable onPress={handleForgot} disabled={loading} style={styles.btn}>
          <Text style={styles.btnText}>{loading ? '...' : t('member.forgot')}</Text>
        </Pressable>
        <Pressable onPress={() => nav.goBack()} style={{ marginTop: 16, alignItems: 'center' }}>
          <Text style={{ color: Colors.textSecondary }}>{t('common.back')}</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: FontSize.largeTitle, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', marginBottom: 20 },
  input: { height: 48, backgroundColor: Colors.surface, borderRadius: Radius.button, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 16, color: Colors.textPrimary, fontSize: 15, marginBottom: 12 },
  btn: { height: 48, backgroundColor: Colors.primary, borderRadius: Radius.button, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  btnText: { color: Colors.textOnPrimary, fontSize: 16, fontWeight: '700' },
});
