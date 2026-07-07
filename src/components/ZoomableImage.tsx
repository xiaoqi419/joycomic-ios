// 可缩放图片容器 — 双击缩放 + 双指捏合
// @author Jason

import React, { useRef } from 'react';
import { Animated } from 'react-native';
import {
  GestureDetector, Gesture,
} from 'react-native-gesture-handler';

interface Props {
  children?: React.ReactNode;
}

export function ZoomableImage({ children }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const curScale = useRef(1);
  const curX = useRef(0);
  const curY = useRef(0);

  const pinch = Gesture.Pinch()
    .onStart(() => {
    })
    .onUpdate((e) => {
      try {
        const next = Math.max(1, Math.min(3, curScale.current * e.scale));
        scale.setValue(next);
        curScale.current = next;
      } catch {}
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (curScale.current > 1.1) {
        curScale.current = 1;
        curX.current = 0;
        curY.current = 0;
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 200, useNativeDriver: false }),
          Animated.timing(translateX, { toValue: 0, duration: 200, useNativeDriver: false }),
          Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: false }),
        ]).start();
      } else {
        curScale.current = 1.75;
        Animated.timing(scale, { toValue: 1.75, duration: 200, useNativeDriver: false }).start();
      }
    });

  const pan = Gesture.Pan()
    .minPointers(2)
    .onUpdate((e) => {
      if (curScale.current > 1) {
        translateX.setValue(curX.current + e.translationX);
        translateY.setValue(curY.current + e.translationY);
      }
    })
    .onEnd((e) => {
      curX.current = curX.current + e.translationX;
      curY.current = curY.current + e.translationY;
    });

  const composed = Gesture.Simultaneous(pinch, pan);
  const all = Gesture.Exclusive(doubleTap, composed);

  return (
    <GestureDetector gesture={all}>
      <Animated.View style={{
        flex: 1,
        transform: [{ translateX }, { translateY }, { scale }],
      }}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
