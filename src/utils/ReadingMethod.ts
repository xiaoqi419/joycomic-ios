// 阅读模式枚举 — 参照 PicaComic reading_type.dart
// @author Jason

export enum ReadingMethod {
  /** 从左至右（单页横向翻页） */
  leftToRight,
  /** 从右至左（单页横向翻页） */
  rightToLeft,
  /** 从上至下（单页竖向翻页） */
  topToBottom,
  /** 从上至下连续滚动 */
  topToBottomContinuously,
  /** 双页 */
  twoPage,
  /** 双页反向 */
  twoPageReversed,
}

export function readingMethodLabel(m: ReadingMethod): string {
  switch (m) {
    case ReadingMethod.leftToRight: return '从左至右';
    case ReadingMethod.rightToLeft: return '从右至左';
    case ReadingMethod.topToBottom: return '从上至下';
    case ReadingMethod.topToBottomContinuously: return '连续滚动';
    case ReadingMethod.twoPage: return '双页';
    case ReadingMethod.twoPageReversed: return '双页反向';
  }
}

/** 判断当前模式是否为竖向模式 */
export function isVerticalMethod(m: ReadingMethod): boolean {
  return m === ReadingMethod.topToBottom ||
         m === ReadingMethod.topToBottomContinuously;
}

/** 判断当前模式是否使用双页布局 */
export function isTwoPage(m: ReadingMethod): boolean {
  return m === ReadingMethod.twoPage || m === ReadingMethod.twoPageReversed;
}
