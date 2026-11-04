import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame, staticFile, Easing } from 'remotion';

// v10（11/04）：乾淨選物風（參考闆娘 shop19.gallery 的版面）
//   米白底＋商品照為主＋宋體短標題；沒有動漫人物、沒有貼紙、沒有大印章
//   價格放在影片裡（第 2.5 秒淡入），封面縮圖只看得到商品和標題
export const GW = 1080, GH = 1440;
export const GLEN = { hook: 120, point: 100, scene: 110, cta: 120 };
const C = { bg: '#F6F2EC', card: '#FFFFFF', ink: '#2E2925', mute: '#8C8279', line: '#D9D0C5', accent: '#9A6B52' };
const SERIF = '"Noto Serif CJK TC","Noto Serif TC","Source Han Serif TC","PMingLiU",serif';
const SANS = '"Noto Sans CJK TC","Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif';
const src = (s) => (!s ? staticFile('logo.png') : /^https?:/.test(s) ? s : staticFile(s));
const ease = Easing.out(Easing.cubic);
const fade = (f, a, b) => interpolate(f, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });

/** 標題一行放得下就一行，太長才平均分兩行（不會剩一個字） */
const cw = (ch) => (/[\u0000-ÿ]/.test(ch) ? 0.58 : /\p{Extended_Pictographic}/u.test(ch) ? 1.2 : 1.0);
const fit = (text, maxW, maxSize, minSize) => {
  const chars = Array.from(String(text || '').replace(/\p{Extended_Pictographic}/gu, '').trim());
  const units = (a) => a.reduce((s, c) => s + cw(c), 0) * 1.08 + 0.2;
  const one = Math.floor(maxW / Math.max(1, units(chars)));
  if (one >= minSize || chars.length < 6) return { size: Math.min(maxSize, Math.max(one, 40)), lines: [chars.join('')] };
  let best = null;
  for (let k = 2; k <= chars.length - 2; k++) {
    const w = Math.max(units(chars.slice(0, k)), units(chars.slice(k))) + (/[，,、。！!？?～~ ｜|]/.test(chars[k - 1]) ? -0.8 : 0);
    if (!best || w < best.w) best = { w, k };
  }
  return { size: Math.min(maxSize, Math.floor(maxW / best.w)), lines: [chars.slice(0, best.k).join('').replace(/[ ｜|，,]$/, ''), chars.slice(best.k).join('')] };
};

/** 上方：19號舖子字樣＋國家／類型小字＋一條細線 */
const Header = ({ tag }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: 'absolute', top: 58, left: 90, right: 90, opacity: fade(f, 0, 10) }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Img src={staticFile('logo.png')} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
          <span style={{ fontFamily: SERIF, fontSize: 32, fontWeight: 700, color: C.ink, letterSpacing: 6 }}>19號舖子</span>
        </div>
        {tag ? <span style={{ fontFamily: SANS, fontSize: 26, color: C.mute, letterSpacing: 4 }}>{String(tag).replace(/\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}]/gu, '').trim()}</span> : null}
      </div>
      <div style={{ marginTop: 22, height: 2, background: C.line }} />
    </div>
  );
};

/** 商品照：白色細框卡片，慢慢推近 */
const Photo = ({ img, L, contain = false, top = 150, size = 900 }) => {
  const f = useCurrentFrame();
  const zoom = interpolate(f, [0, L], [1.06, 1.0], { easing: Easing.out(Easing.quad) });
  return (
    <div style={{ position: 'absolute', left: (GW - size) / 2, top, width: size, height: size, background: C.card, padding: 14, boxSizing: 'border-box',
      boxShadow: '0 18px 40px rgba(46,41,37,.10)', opacity: fade(f, 0, 6) }}>
      <div style={{ width: '100%', height: '100%', overflow: 'hidden', background: contain ? C.bg : '#EEE9E2' }}>
        <Img src={src(img)} style={{ width: '100%', height: '100%', objectFit: contain ? 'contain' : 'cover', transform: `scale(${zoom})` }} />
      </div>
    </div>
  );
};

/** 標題（宋體）＋副標（細字），由下往上淡入 */
const Title = ({ title, sub, top, start = 4, big = 76, small }) => {
  const f = useCurrentFrame();
  const t = fit(title, 900, big, Math.round(big * 0.7));
  const a = fade(f, start, start + 12), b = fade(f, start + 8, start + 20);
  return (
    <div style={{ position: 'absolute', left: 90, right: 90, top, textAlign: 'center' }}>
      {small ? <div style={{ fontFamily: SANS, fontSize: 24, color: C.accent, letterSpacing: 8, marginBottom: 16, opacity: a }}>{small}</div> : null}
      <div style={{ fontFamily: SERIF, fontWeight: 700, color: C.ink, fontSize: t.size, lineHeight: 1.25, letterSpacing: 3, opacity: a, transform: `translateY(${(1 - a) * 24}px)` }}>
        {t.lines.map((l, k) => <div key={k} style={{ whiteSpace: 'nowrap' }}>{l}</div>)}
      </div>
      {sub ? <div style={{ marginTop: 18, fontFamily: SANS, fontSize: sub.length > 18 ? 28 : 32, color: C.mute, letterSpacing: 2, opacity: b }}>{sub}</div> : null}
    </div>
  );
};

/** 價格：第 2.5 秒淡入；只有一個價格（字尾 =）就不寫「起」 */
const Price = ({ price, top, start = 75 }) => {
  const f = useCurrentFrame();
  if (!price) return null;
  const p = String(price).replace(/=$/, '');
  const one = /=$/.test(String(price));
  const a = fade(f, start, start + 14);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 22, opacity: a }}>
      <div style={{ width: 60 * a, height: 2, background: C.line }} />
      <span style={{ fontFamily: SERIF, fontSize: 46, fontWeight: 700, color: C.ink, letterSpacing: 2 }}>NT${p}{one ? '' : <span style={{ fontSize: 30, color: C.mute, marginLeft: 6 }}>起</span>}</span>
      <div style={{ width: 60 * a, height: 2, background: C.line }} />
    </div>
  );
};

const Foot = ({ text, start = 30 }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 50, textAlign: 'center', fontFamily: SANS, fontSize: 26, color: C.mute, letterSpacing: 4, opacity: fade(f, start, start + 12) }}>{text}</div>
  );
};

/* ---------- 封面：商品照＋短標題（第一秒就看得到商品和標題） ---------- */
export const CoverG = ({ img, title = '', sub = '', tag = '', price = '' }) => (
  <AbsoluteFill style={{ background: C.bg, overflow: 'hidden' }}>
    <Header tag={tag} />
    <Photo img={img} L={GLEN.hook} />
    <Title title={title} sub={sub} top={1088} start={2} />
    <Price price={price} top={1262} />
    <Foot text="往右滑，看細節 →" start={40} />
  </AbsoluteFill>
);

/* ---------- 內頁：point＝細節、scene＝情境示意、cta＝最後一張 ---------- */
export const SlideG = ({ img, mode = 'point', title = '', sub = '', tag = '', point = 1, i = 0, n = 1, price = '', cut }) => {
  const L = GLEN[mode] || GLEN.point;
  const isCta = mode === 'cta';
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: 'hidden' }}>
      <Header tag={tag} />
      <Photo img={isCta && cut ? cut : img} contain={isCta && !!cut} L={L} />
      <Title title={title} sub={sub} top={1078} start={3} big={isCta ? 70 : 64}
        small={mode === 'point' ? `POINT ${String(point).padStart(2, '0')}` : mode === 'scene' ? '情境示意' : ''} />
      {isCta ? <Price price={price} top={1256} start={20} /> : null}
      <Foot text={isCta ? '到官方 LINE 或網站下單' : mode === 'scene' ? '實品以照片為準' : `${i + 1} / ${n}`} start={isCta ? 36 : 20} />
    </AbsoluteFill>
  );
};
