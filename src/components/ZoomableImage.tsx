// 可缩放图片容器 — 双击缩放 + 双指捏合 + 日志捕获
// @author Jason

import React, { useRef } from 'react';
import { Animated } from 'react-native';
import {
  GestureDetector, Gesture,
} from 'react-native-gesture-handler';

interface Props {
  children?: React.ReactNode;
}

function logGestureError(name: string, err: any) {
  try {
    require('../utils/HaKaLogger').logger.error('ZoomableImage ' + name, err);
  } catch {}
}

export function ZoomableImage({ children }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const curScale = useRef(1);
  const curX = useRef(0);
  const curY = useRef(0);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      try {
        const next = Math.max(1, Math.min(3, curScale.current * e.scale));
        scale.setValue(next);
        curScale.current = next;
      } catch (err) { logGestureError('pinch', err); }
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      try {
        if (curScale.current > 1.1) {
          curScale.current = 1; curX.current = 0; curY.current = 0;
          Animated.parallel([
            Animated.timing(scale, { toValue: 1, duration: 200, useNativeDriver: false }),
            Animated.timing(translateX, { toValue: 0, duration: 200, useNativeDriver: false }),
            Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: false }),
          ]).start();
        } else {
          curScale.current = 1.75;
          Animated.timing(scale, { toValue: 1.75, duration: 200, useNativeDriver: false }).start();
        }
      } catch (err) { logGestureError('doubleTap', err); }
    });

  const pan = Gesture.Pan()
    .minPointers(2)
    .onUpdate((e) => {
      try {
        if (curScale.current > 1) {
          translateX.setValue(curX.current + e.translationX);
          translateY.setValue(curY.current + e.translationY);
        }
      } catch (err) { logGestureError('pan', err); }
    })
    .onEnd((e) => {
      try {
        curX.current = curX.current + e.translationX;
        curY.current = curY.current + e.translationY;
      } catch (err) { logGestureError('panEnd', err); }
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
