import React from 'react';
import { AbsoluteFill, OffthreadVideo, Sequence, Img, staticFile, useCurrentFrame, interpolate, Easing } from 'remotion';

// v1（11/04）：AI 短劇剪輯（9:16）
//   多段 Gemini 影片接起來＋上方劇名＋下方字幕＋最後定格預告＋19號舖子小 logo＋「AI 生成」標示
export const DW = 1080, DH = 1920, FPS = 30;
const SANS = '"Noto Sans CJK TC","Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif';
const SERIF = '"Noto Serif CJK TC","Noto Serif TC",serif';
const src = (s) => (/^https?:/.test(s) ? s : staticFile(s));
const fade = (f, a, b) => interpolate(f, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });

export const END_LEN = 75; // 片尾定格 2.5 秒
export const dramaLen = (clips = []) => clips.reduce((s, c) => s + Math.round((c.to - (c.from || 0)) * FPS), 0) + END_LEN;

const Sub = ({ text }) => (
  <div style={{ position: 'absolute', left: 60, right: 60, bottom: 330, textAlign: 'center' }}>
    <span style={{ fontFamily: SANS, fontWeight: 900, fontSize: 64, lineHeight: 1.3, whiteSpace: 'pre-line', color: '#fff',
      WebkitTextStroke: '10px #111', paintOrder: 'stroke fill', letterSpacing: 2 }}>{text}</span>
  </div>
);

const Title = ({ title, ep }) => (
  <div style={{ position: 'absolute', top: 120, left: 50, right: 50, textAlign: 'center' }}>
    {ep ? <div style={{ display: 'inline-block', padding: '6px 22px', background: '#C8102E', color: '#fff', fontFamily: SANS, fontWeight: 900, fontSize: 38, borderRadius: 10, marginBottom: 14 }}>{ep}</div> : null}
    <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 62, lineHeight: 1.25, whiteSpace: 'pre-line', color: '#FFE45C', WebkitTextStroke: '10px #111', paintOrder: 'stroke fill' }}>{title}</div>
  </div>
);

const AiTag = () => (
  <div style={{ position: 'absolute', top: 40, right: 40, padding: '6px 14px', borderRadius: 8, background: 'rgba(0,0,0,.45)', color: '#fff', fontFamily: SANS, fontSize: 26 }}>AI 生成內容</div>
);

const End = ({ next, lastFrame }) => {
  const f = useCurrentFrame();
  const a = fade(f, 4, 18);
  return (
    <AbsoluteFill>
      {lastFrame ? <Img src={src(lastFrame)} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: `brightness(${1 - 0.45 * a})` }} /> : <AbsoluteFill style={{ background: '#111' }} />}
      <div style={{ position: 'absolute', top: 760, left: 60, right: 60, textAlign: 'center', opacity: a, transform: `scale(${0.9 + 0.1 * a})` }}>
        <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 52, color: '#fff', marginBottom: 18, letterSpacing: 6 }}>下集預告</div>
        <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 76, lineHeight: 1.25, color: '#FFE45C', WebkitTextStroke: '8px #111', paintOrder: 'stroke fill' }}>{next}</div>
      </div>
      <div style={{ position: 'absolute', bottom: 150, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, opacity: fade(f, 20, 34) }}>
        <Img src={staticFile('logo.png')} style={{ width: 64, height: 64, borderRadius: '50%' }} />
        <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 40, color: '#fff', letterSpacing: 6 }}>19號舖子</span>
      </div>
    </AbsoluteFill>
  );
};

/** 一段影片：zoom＝局部放大 {from,to,x,y}（x,y 為放大中心 %）；mute＝[[t0,t1]] 該段內靜音（秒，以該段開頭為 0） */
const ClipVideo = ({ c, len }) => {
  const f = useCurrentFrame();
  const z = c.zoom ? interpolate(f, [0, len], [c.zoom.from || 1, c.zoom.to || 1.15], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad) }) : 1;
  const vol = (fr) => ((c.mute || []).some(([a, b]) => fr / FPS >= a && fr / FPS < b) ? 0 : 1);
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <OffthreadVideo src={src(c.src)} startFrom={Math.round((c.from || 0) * FPS)} volume={vol}
        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z})`, transformOrigin: c.zoom ? `${c.zoom.x ?? 50}% ${c.zoom.y ?? 40}%` : '50% 50%' }} />
    </AbsoluteFill>
  );
};

/** clips: [{src, from, to, zoom, mute, subs:[{t0,t1,text}]}]（秒，subs 的時間以該段開頭為 0） */
export const Drama = ({ clips = [], title = '', ep = '', next = '', lastFrame = '' }) => {
  let at = 0;
  const seqs = clips.map((c, k) => {
    const len = Math.round((c.to - (c.from || 0)) * FPS);
    const s = (
      <Sequence key={k} from={at} durationInFrames={len}>
        <ClipVideo c={c} len={len} />
        {(c.subs || []).map((u, j) => (
          <Sequence key={j} from={Math.round(u.t0 * FPS)} durationInFrames={Math.max(1, Math.round((u.t1 - u.t0) * FPS))}><Sub text={u.text} /></Sequence>
        ))}
      </Sequence>
    );
    at += len;
    return s;
  });
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {seqs}
      <Sequence from={0} durationInFrames={at}><Title title={title} ep={ep} /></Sequence>
      <Sequence from={at} durationInFrames={END_LEN}><End next={next} lastFrame={lastFrame} /></Sequence>
      <AiTag />
    </AbsoluteFill>
  );
};
