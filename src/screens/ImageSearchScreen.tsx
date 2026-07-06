// 以图搜图 — SauceNAO API + soutubot WebView
// @author Jason

import React, { useState, useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView,
  Image, Linking, Alert, Dimensions, TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize } from '../theme';

const API_KEY_STORAGE = '@joycomic.saucenao_key';
const W = Dimensions.get('window').width;

interface SauceResult {
  header: { similarity: string; thumbnail: string; index_name: string };
  data: { ext_urls?: string[]; title?: string; author_name?: string; pixiv_id?: string; member_name?: string; creator?: string };
}

export function ImageSearchScreen() {
  const [apiKey, setApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [results, setResults] = useState<SauceResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(API_KEY_STORAGE).then((k) => { if (k) setApiKey(k); });
  }, []);

  const saveKey = async () => {
    const trimmed = keyInput.trim();
    if (trimmed.length < 10) { Alert.alert('', 'Key 格式不正确'); return; }
    setApiKey(trimmed);
    setShowKeyInput(false);
    await AsyncStorage.setItem(API_KEY_STORAGE, trimmed);
  };

  const pickImage = async () => {
    if (!apiKey) { Alert.alert('需要 API Key', '请先设置 SauceNAO API Key'); setShowKeyInput(true); return; }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('需要权限', '请允许访问相册'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled || !result.assets?.[0]) return;
    setImage(result.assets[0].uri);
    await doSauceNAO(result.assets[0]);
  };

  const takePhoto = async () => {
    if (!apiKey) { Alert.alert('需要 API Key', '请先设置 SauceNAO API Key'); setShowKeyInput(true); return; }
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('需要权限', '请允许使用相机'); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (result.canceled || !result.assets?.[0]) return;
    setImage(result.assets[0].uri);
    await doSauceNAO(result.assets[0]);
  };

  const doSauceNAO = async (asset: ImagePicker.ImagePickerAsset) => {
    setLoading(true); setResults([]);
    const formData = new FormData();
    formData.append('file', { uri: asset.uri, type: asset.mimeType || 'image/jpeg', name: `upload.${asset.uri.split('.').pop() || 'jpg'}` } as any);
    try {
      const res = await fetch(`https://saucenao.com/search.php?output_type=2&numres=6&api_key=${apiKey}`, { method: 'POST', body: formData });
      const json = await res.json();
      if (json.results?.length) setResults(json.results);
      else Alert.alert('', '未找到匹配结果');
    } catch (e: any) { Alert.alert('搜索失败', e.message || '网络错误'); }
    setLoading(false);
  };

  const openSoutubot = () => { WebBrowser.openBrowserAsync('https://soutubot.moe/'); };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#0A0A0F' }} contentContainerStyle={{ padding: 16 }}>
      {/* API Key 设置 */}
      {showKeyInput ? (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: '#9895A0', fontSize: 13, marginBottom: 8 }}>SauceNAO API Key 在 https://saucenao.com/user.php?page=search-api</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              style={{ flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 10, color: '#F0EDE8', backgroundColor: '#12121E' }}
              placeholder="输入 API Key" placeholderTextColor="#6B6873" value={keyInput} onChangeText={setKeyInput} autoFocus
            />
            <Pressable onPress={saveKey} style={{ paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#E85D3A', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '600' }}>保存</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 }}>
          <Pressable onPress={() => { setKeyInput(apiKey); setShowKeyInput(true); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <MaterialIcons name="vpn-key" size={14} color="#6B6873" />
            <Text style={{ color: '#6B6873', fontSize: 12 }}>{apiKey ? 'Key 已设置' : '设置 API Key'}</Text>
          </Pressable>
        </View>
      )}

      {/* 操作按钮 */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
        <Pressable onPress={pickImage} style={styles.btn}>
          <MaterialIcons name="photo-library" size={20} color="#fff" />
          <Text style={styles.btnText}>相册选图</Text>
        </Pressable>
        <Pressable onPress={takePhoto} style={styles.btn}>
          <MaterialIcons name="camera-alt" size={20} color="#fff" />
          <Text style={styles.btnText}>拍照</Text>
        </Pressable>
        <Pressable onPress={openSoutubot} style={[styles.btn, { backgroundColor: '#1A1A24', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }]}>
          <MaterialIcons name="open-in-browser" size={20} color="#E85D3A" />
          <Text style={[styles.btnText, { color: '#E85D3A' }]}>soutubot</Text>
        </Pressable>
      </View>

      {image && <Image source={{ uri: image }} style={{ width: W - 32, height: 200, borderRadius: 10, marginBottom: 16 }} resizeMode="contain" />}
      {loading && <ActivityIndicator color="#E85D3A" style={{ marginVertical: 30 }} />}

      {results.map((r, i) => {
        const sim = parseFloat(r.header.similarity);
        const urls = r.data.ext_urls || [];
        return (
          <View key={i} style={styles.resultCard}>
            {r.header.thumbnail && <Image source={{ uri: r.header.thumbnail }} style={{ width: 80, height: 80, borderRadius: 6, backgroundColor: '#1A1A24' }} />}
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ color: sim > 80 ? '#4CAF50' : '#FF9800', fontWeight: '700', fontSize: 14 }}>相似度 {sim.toFixed(1)}%</Text>
              <Text style={{ color: '#9895A0', fontSize: 12, marginTop: 2 }}>{r.header.index_name}</Text>
              {r.data.title && <Text style={{ color: '#F0EDE8', fontSize: 13, marginTop: 4 }} numberOfLines={2}>{r.data.title}</Text>}
              {r.data.author_name && <Text style={{ color: '#E85D3A', fontSize: 12, marginTop: 2 }}>作者: {r.data.author_name}</Text>}
              {urls.map((u, j) => (
                <Text key={j} style={{ color: '#64B5F6', fontSize: 12, marginTop: 2 }} onPress={() => Linking.openURL(u)} numberOfLines={1}>{u}</Text>
              ))}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 12, backgroundColor: '#E85D3A' },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  resultCard: { flexDirection: 'row', backgroundColor: '#12121E', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
});
