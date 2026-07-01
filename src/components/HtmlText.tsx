// 轻量 HTML 行内渲染器 — 只处理评论常见的标签
// <br> <a> <b> <i> <u> <div> <span> <p> 等
// @author Jason

import React, { Fragment } from 'react';
import { Text, Pressable, Linking } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';

interface HtmlTextProps {
  html: string;
  style?: StyleProp<TextStyle>;
  linkColor?: string;
  fontSize?: number;
}

interface Seg {
  type: 'tag' | 'text';
  raw: string;
  name?: string;
  attrs?: Record<string, string>;
  isClose?: boolean;
}

const TAG_RE = /<\/?(\w+)([^>]*)>/g;

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  raw.replace(/(\w+)=["']([^"']*)["']/g, (_, k: string, v: string) => {
    attrs[k] = v;
    return '';
  });
  return attrs;
}

function tokenize(html: string): Seg[] {
  const segs: Seg[] = [];
  let last = 0;
  TAG_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TAG_RE.exec(html)) !== null) {
    if (m.index > last) {
      segs.push({ type: 'text', raw: html.slice(last, m.index) });
    }
    const name = m[1].toLowerCase();
    const isClose = m[0][1] === '/';
    segs.push({
      type: 'tag',
      raw: m[0],
      name,
      isClose,
      attrs: isClose ? {} : parseAttrs(m[2]),
    });
    last = m.index + m[0].length;
  }
  if (last < html.length) {
    segs.push({ type: 'text', raw: html.slice(last) });
  }
  return segs;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, '\u00A0')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(+code));
}

export function HtmlText({ html, style, linkColor, fontSize }: HtmlTextProps) {
  if (!html) return null;

  const decodedHtml = decodeEntities(html);
  const segs = tokenize(decodedHtml);
  const blocks: React.ReactNode[] = [];
  const fmtStack: { bold: boolean; italic: boolean; underline: boolean }[] = [{ bold: false, italic: false, underline: false }];

  function currentFmt() { return fmtStack[fmtStack.length - 1]; }

  function fmtStyle(): StyleProp<TextStyle> {
    const f = currentFmt();
    return [
      f.bold && { fontWeight: '700' as const },
      f.italic && { fontStyle: 'italic' as const },
      f.underline && { textDecorationLine: 'underline' as const },
    ];
  }

  let textBuffer = '';
  let linkHref = '';
  let inLink = false;

  function flushText() {
    if (!textBuffer) return;
    const txt = textBuffer;
    if (inLink && linkHref) {
      blocks.push(
        <Pressable key={`l-${blocks.length}`} onPress={() => Linking.openURL(linkHref)}>
          <Text style={[{ color: linkColor, textDecorationLine: 'underline' }, fmtStyle(), style as any]}>
            {txt}
          </Text>
        </Pressable>
      );
    } else {
      blocks.push(
        <Text key={`t-${blocks.length}`} style={[fmtStyle(), style as any]}>
          {txt}
        </Text>
      );
    }
    textBuffer = '';
  }

  for (const seg of segs) {
    if (seg.type === 'text') {
      // Split by newline for <br> simulation
      const parts = seg.raw.split(/\n+/);
      parts.forEach((p, i) => {
        if (i > 0) blocks.push(<Text key={`br-${blocks.length}`}>{'\n'}</Text>);
        textBuffer += p;
      });
      continue;
    }

    const { name, isClose } = seg!;

    switch (name) {
      case 'br':
        flushText();
        blocks.push(<Text key={`br-${blocks.length}`}>{'\n'}</Text>);
        break;

      case 'b':
      case 'strong':
        if (!isClose) {
          flushText();
          fmtStack.push({ ...currentFmt(), bold: true });
        } else {
          flushText();
          fmtStack.pop();
        }
        break;

      case 'i':
      case 'em':
        if (!isClose) {
          flushText();
          fmtStack.push({ ...currentFmt(), italic: true });
        } else {
          flushText();
          fmtStack.pop();
        }
        break;

      case 'u':
      case 'ins':
        if (!isClose) {
          flushText();
          fmtStack.push({ ...currentFmt(), underline: true });
        } else {
          flushText();
          fmtStack.pop();
        }
        break;

      case 'a':
        if (!isClose) {
          flushText();
          inLink = true;
          linkHref = seg.attrs?.href || '';
          fmtStack.push({ ...currentFmt(), underline: true });
        } else {
          flushText();
          inLink = false;
          linkHref = '';
          fmtStack.pop();
        }
        break;

      default:
        // div, span, p 等块级/行内容器 — 忽略标签，只处理内部文本
        break;
    }
  }

  flushText();

  if (blocks.length === 0) {
    return <Text style={style}>{decodedHtml}</Text>;
  }

  return <Fragment>{blocks}</Fragment>;
}
