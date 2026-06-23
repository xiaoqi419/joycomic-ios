// 漫画卡片 - 樱花绯红主题
// @author Jason

import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Colors, Radius, Spacing, FontSize, Shadow } from '../theme';

const W = Dimensions.get('window').width;
const CARD_W = (W - Spacing.marginEdge * 2 - Spacing.gutter) / 2;
const CARD_H = CARD_W * 1.4;

interface Props {
  id: string; title: string; coverUrl: string;
  tags?: string[]; onPress: (id: string) => void;
}

function Inner({ id, title, coverUrl, tags, onPress }: Props) {
  return (
    <TouchableOpacity style={[styles.card, Shadow.card]} onPress={() => onPress(id)} activeOpacity={0.85}>
      <Image source={{ uri: coverUrl }} style={styles.cover} contentFit="cover" transition={300} />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        {tags?.length ? <Text style={styles.tags} numberOfLines={1}>{tags.slice(0, 2).join(' · ')}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

export const ComicCard = memo(Inner);

const styles = StyleSheet.create({
  card: { width: CARD_W, marginBottom: Spacing.gutter, borderRadius: Radius.card, overflow: 'hidden', backgroundColor: Colors.surfaceLowest },
  cover: { width: '100%', height: CARD_H, backgroundColor: Colors.surfaceContainer },
  info: { padding: 10, paddingTop: Spacing.sm },
  title: { fontSize: FontSize.body, fontWeight: '600', color: Colors.textPrimary, lineHeight: 20 },
  tags: { fontSize: FontSize.label, color: Colors.textTertiary, marginTop: 4 },
});
