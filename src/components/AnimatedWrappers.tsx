// 动画工具组件 — 基于 Moti + Reanimated
// @author Jason

import React from 'react';
import { Pressable, PressableProps, ViewStyle } from 'react-native';
import { MotiView } from 'moti';

/** 页面入场动画包裹 — fadeIn + slideUp */
export function AnimateEntrance({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 300, delay }}
      style={{ flex: 1 }}
    >
      {children}
    </MotiView>
  );
}

/** 列表 Item 入场动画 — 错开效果 */
export function AnimateListItem({ children, index = 0 }: { children: React.ReactNode; index?: number }) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 16 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 250, delay: index * 50 }}
    >
      {children}
    </MotiView>
  );
}

/** 带动画的 Pressable（按下缩放） */
export function AnimatePressable({ children, style, ...props }: PressableProps & { style?: ViewStyle }) {
  return (
    <Pressable {...props}>
      {({ pressed }) => (
        <MotiView
          animate={{ scale: pressed ? 0.96 : 1 }}
          transition={{ type: 'spring', duration: 150 }}
          style={style}
        >
          {children as React.ReactNode}
        </MotiView>
      )}
    </Pressable>
  );
}

/** 淡入组件 */
export function AnimateFadeIn({ children, duration = 300, delay = 0 }: { children: React.ReactNode; duration?: number; delay?: number }) {
  return (
    <MotiView
      from={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'timing', duration, delay }}
    >
      {children}
    </MotiView>
  );
}
