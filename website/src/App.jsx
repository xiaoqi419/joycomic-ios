// JOYComic 官网 — HeroUI + 自定义动画
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button, Card, CardTitle, CardDescription } from '@heroui/react';
import Aurora from './components/Aurora';

const APP_VERSION = '1.0.0';

const FEATURES = [
  { icon: 'books', title: '海量漫画', desc: '聚合 JMComic + Pica 双源，百万漫画任你翻阅' },
  { icon: 'shuffle', title: '智能去混淆', desc: '自动还原加密图片，原生级阅读体验' },
  { icon: 'read', title: '双模式阅读', desc: '竖滑 + 分页翻页随心切换' },
  { icon: 'download', title: '离线下载', desc: '一键下载整本漫画，没网也能看' },
  { icon: 'folder', title: '文件夹管理', desc: '创建收藏夹分类整理最爱' },
  { icon: 'search', title: '双源搜索', desc: '同时搜索 JMComic + Pica 资源' },
  { icon: 'media', title: '影视模块', desc: '内置播放器与下载' },
  { icon: 'moon', title: '深色主题', desc: 'Material 3 设计护眼模式' },
];

const CHANGELOG = [
  { version: '1.1.0', date: '2025-07', items: ['收藏夹系统', '评论无限滚动', 'Pica 分类接入', '阅读进度记录', '阅读器分页模式'] },
  { version: '1.0.0', date: '2025-06', items: ['双源聚合 JMComic + Pica', '漫画阅读器竖滑+分页', '搜索分类周榜', '图片去混淆', '下载管理器'] },
];

/* ===== Canvas 极光背景 ===== */
function AuroraBg() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let anim, t = 0;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    const draw = () => {
      t += 0.008;
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      // 多层渐变极光
      for (let l = 0; l < 3; l++) {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 2) {
          const y = h * (0.3 + l * 0.15) + Math.sin(x * 0.005 + t + l * 2) * (50 + l * 15) + Math.sin(x * 0.01 + t * 0.6 + l) * 25;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
        const g = ctx.createLinearGradient(0, 0, w, 0);
        g.addColorStop(0, '#E85D3A');
        g.addColorStop(0.2, '#FF6B4A');
        g.addColorStop(0.5, '#FF8C5A');
        g.addColorStop(0.8, '#e040a0');
        g.addColorStop(1, 'rgba(10,10,15,0)');
        ctx.fillStyle = g;
        ctx.globalAlpha = 0.18 - l * 0.04;
        ctx.fill();
      }
      anim = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(anim); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', display: 'block', pointerEvents: 'none', zIndex: 0 }} />;
}

/* ===== 浮动粒子 ===== */
function Particles() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let anim;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    const pts = Array.from({ length: 80 }, () => ({
      x: Math.random() * (canvas.width || 800), y: Math.random() * (canvas.height || 600),
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      s: Math.random() * 2 + 1,
    }));
    const draw = () => {
      if (canvas.width === 0 || canvas.height === 0) { anim = requestAnimationFrame(draw); return; }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // DEBUG: green background
      ctx.fillStyle = 'rgba(0,255,100,0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
        ctx.fillStyle = '#E85D3A'; ctx.globalAlpha = 0.3;
        ctx.fill();
      }
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, d = Math.sqrt(dx * dx + dy * dy);
          if (d < 120) {
            ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = '#E85D3A'; ctx.globalAlpha = 0.05 * (1 - d / 120); ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      anim = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(anim); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', display: 'block', pointerEvents: 'none', zIndex: 0 }} />;
}

/* ===== App ===== */
export default function App() {
  const [page, setPage] = useState('home');
  const featureRef = useRef(null);
  const downloadRef = useRef(null);

  const scrollTo = (r) => r.current?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="relative min-h-screen bg-[#07070D] text-[#F0EDE8] overflow-x-hidden">
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0, pointerEvents: 'none' }}>
        <Aurora colorStops={['#E85D3A', '#FF8C5A', '#0A0A0F']} amplitude={0.5} blend={0.5} speed={0.5} />
        <Particles />
      </div>

      {/* Nav */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-400 ${typeof window !== 'undefined' && window.scrollY > 60 ? 'bg-[rgba(7,7,13,0.82)] backdrop-blur-[20px] border-b border-[rgba(255,255,255,0.05)]' : ''}`}>
        <div className="max-w-[1100px] mx-auto px-6 py-[18px] flex items-center justify-between">
          <button onClick={() => setPage('home')} className="text-[22px] font-extrabold bg-gradient-to-r from-[#E85D3A] to-[#FF8C5A] bg-clip-text text-transparent tracking-tight border-none cursor-pointer">
            JOYComic
          </button>
          <div className="flex gap-7 items-center">
            <button onClick={() => setPage('home')} className={`bg-none border-none text-sm font-medium cursor-pointer ${page === 'home' ? 'text-[#F0EDE8] font-semibold' : 'text-[#9895A0]'} hover:text-[#F0EDE8] transition-colors`}>首页</button>
            <button onClick={() => setPage('history')} className={`bg-none border-none text-sm font-medium cursor-pointer ${page === 'history' ? 'text-[#F0EDE8] font-semibold' : 'text-[#9895A0]'} hover:text-[#F0EDE8] transition-colors`}>Git 历史</button>
            <a href="https://github.com/xiaoqi419/joycomic-ios" target="_blank" rel="noreferrer" className="text-[#9895A0] text-sm hover:text-[#F0EDE8] transition-colors no-underline">GitHub</a>
          </div>
        </div>
      </nav>

      <div className="relative z-10">
        {page === 'home' && (
          <>
            {/* Hero */}
            <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-[140px] pb-20 relative">
              <div className="relative z-10 max-w-[720px]">
                <h1 className="text-[clamp(44px,9vw,76px)] font-black leading-[1.1] mb-5 bg-gradient-to-r from-[#E85D3A] via-[#FF8C5A] to-[#F0EDE8] bg-clip-text text-transparent animate-[fadeUp_0.8s_ease-out_0.1s_both]">
                  JOYComic
                </h1>
                <p className="text-[clamp(15px,2vw,20px)] text-[#9895A0] font-medium max-w-[540px] mx-auto mb-9 leading-relaxed animate-[fadeUp_0.8s_ease-out_0.2s_both]">
                  聚合双源 · 畅享漫画 · 全功能 iOS 客户端
                </p>
                <div className="flex gap-3.5 justify-center flex-wrap animate-[fadeUp_0.8s_ease-out_0.3s_both]">
                  <button onClick={() => scrollTo(downloadRef)}
                    className="inline-flex items-center gap-2.5 px-8 py-4 rounded-[14px] text-[15px] font-semibold bg-[#E85D3A] text-white border-none cursor-pointer shadow-lg hover:brightness-110 active:scale-[0.97] transition-all duration-200">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    下载 App
                  </button>
                  <a href="https://github.com/xiaoqi419/joycomic-ios" target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-2.5 px-8 py-4 rounded-[14px] text-[15px] font-semibold bg-transparent text-[#F0EDE8] border border-[rgba(255,255,255,0.12)] no-underline hover:bg-[rgba(255,255,255,0.06)] active:scale-[0.97] transition-all duration-200">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                    GitHub
                  </a>
                </div>
              </div>
            </section>

            {/* Features */}
            <section ref={featureRef} className="px-6 py-[120px]">
              <div className="text-center mb-16">
                <span className="inline-flex px-[14px] py-[5px] rounded-full bg-[rgba(232,93,58,0.08)] text-[#E85D3A] text-[11px] font-bold tracking-[1.5px] uppercase border border-[rgba(232,93,58,0.12)] mb-4">功能</span>
                <h2 className="text-[clamp(30px,3.5vw,42px)] font-extrabold mb-3">强大而优雅</h2>
                <p className="text-[#9895A0] text-base max-w-[500px] mx-auto">专为漫画爱好者打造的全能阅读工具</p>
              </div>
              <div className="max-w-[1100px] mx-auto grid grid-cols-3 gap-3.5 max-md:grid-cols-2 max-sm:grid-cols-1">
                {FEATURES.map((f, i) => (
                  <div key={i} className="bg-[#12121E] border border-[rgba(255,255,255,0.05)] rounded-[20px] p-7 transition-all duration-400 hover:-translate-y-1.5 hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)] hover:border-[rgba(232,93,58,0.15)] animate-[fadeUp_0.6s_ease-out_both]"
                    style={{ animationDelay: `${i * 0.06}s`, gridColumn: i === 0 ? 'span 1 / span 2' : undefined, gridRow: i === 0 ? 'span 2' : undefined }}>
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#E85D3A" strokeWidth="1.8" className="mb-4">
                      {f.icon === 'books' && <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15z"/></>}
                      {f.icon === 'shuffle' && <><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/></>}
                      {f.icon === 'read' && <><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></>}
                      {f.icon === 'download' && <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>}
                      {f.icon === 'folder' && <><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></>}
                      {f.icon === 'search' && <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>}
                      {f.icon === 'media' && <><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></>}
                      {f.icon === 'moon' && <><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></>}
                    </svg>
                    <CardTitle className="text-[17px] font-bold text-[#F0EDE8] mb-2">{f.title}</CardTitle>
                    <CardDescription className="text-[13px] text-[#9895A0] leading-relaxed">{f.desc}</CardDescription>
                  </div>
                ))}
              </div>
            </section>

            {/* Screenshots */}
            <section className="px-6 py-[120px]">
              <div className="text-center mb-16">
                <span className="inline-flex px-[14px] py-[5px] rounded-full bg-[rgba(232,93,58,0.08)] text-[#E85D3A] text-[11px] font-bold tracking-[1.5px] uppercase border border-[rgba(232,93,58,0.12)] mb-4">预览</span>
                <h2 className="text-[clamp(30px,3.5vw,42px)] font-extrabold mb-3">一睹为快</h2>
              </div>
              <div className="max-w-[1100px] mx-auto flex gap-6 overflow-x-auto pb-3 snap-x snap-mandatory">
                {['首页推荐', '搜索页面', '阅读器', '分类'].map((label, i) => (
                  <div key={i} className="snap-start shrink-0">
                    <div className="w-[240px] h-[480px] bg-[#111120] rounded-[32px] border-2 border-[rgba(255,255,255,0.06)] p-3.5 relative transition-transform duration-300 hover:-translate-y-2 hover:border-[rgba(232,93,58,0.2)]">
                      <div className="w-full h-full bg-gradient-to-b from-[#E85D3A]/20 to-[#0A0A14] rounded-[22px] flex items-center justify-center">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#E85D3A" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                      </div>
                    </div>
                    <p className="text-center mt-2.5 text-[13px] text-[#9895A0] font-medium">{label}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Download */}
            <section ref={downloadRef} className="px-6 py-[120px]">
              <div className="text-center mb-16">
                <span className="inline-flex px-[14px] py-[5px] rounded-full bg-[rgba(232,93,58,0.08)] text-[#E85D3A] text-[11px] font-bold tracking-[1.5px] uppercase border border-[rgba(232,93,58,0.12)] mb-4">下载</span>
                <h2 className="text-[clamp(30px,3.5vw,42px)] font-extrabold mb-3">立即获取</h2>
              </div>
              <div className="max-w-[1100px] mx-auto flex justify-center gap-6 flex-wrap">
                <div className="flex-1 max-w-[340px] bg-[rgba(18,18,30,0.8)] border border-[rgba(232,93,58,0.2)] rounded-[20px] p-10 text-center relative backdrop-blur-[10px] transition-all duration-400 hover:-translate-y-2 hover:shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
                  <span className="absolute -top-[11px] left-1/2 -translate-x-1/2 bg-[#E85D3A] text-white text-[11px] font-bold px-4 py-1 rounded-full">推荐</span>
                  <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#E85D3A" strokeWidth="1.5" className="mx-auto mb-[18px]"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18"/></svg>
                  <h3 className="text-[19px] font-bold text-[#F0EDE8] mb-1.5">iOS 版本</h3>
                  <p className="text-[13px] text-[#9895A0] mb-[18px]">iOS 15.0+ · IPA 安装</p>
                  <div className="flex justify-center gap-4 mb-[22px] text-[12px] text-[#6B6873]">
                    <span>v{APP_VERSION}</span>
                    <span>~30 MB</span>
                  </div>
                  <a href="https://github.com/xiaoqi419/joycomic-ios/releases" target="_blank" rel="noreferrer"
                    style={{ display:'block', textAlign:'center', backgroundColor:'#E85D3A', color:'#fff', padding:'16px 34px', borderRadius:14, fontSize:15, fontWeight:600, textDecoration:'none', boxShadow:'0 4px 24px rgba(232,93,58,0.25)' }}
                    className="hover:bg-[#D44D2E] hover:-translate-y-0.5 transition-all">下载 IPA</a>
                </div>
                <div className="flex-1 max-w-[340px] bg-[#12121E] border border-[rgba(255,255,255,0.05)] rounded-[20px] p-10 text-center transition-all duration-400 hover:-translate-y-2 hover:shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
                  <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#E85D3A" strokeWidth="1.5" className="mx-auto mb-[18px]"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                  <h3 className="text-[19px] font-bold text-[#F0EDE8] mb-1.5">源代码</h3>
                  <p className="text-[13px] text-[#9895A0] mb-[18px]">MIT 协议 · 开源</p>
                  <div className="flex justify-center gap-4 mb-[22px] text-[12px] text-[#6B6873]">
                    <span>React Native</span>
                    <span>Expo SDK 54</span>
                  </div>
                  <a href="https://github.com/xiaoqi419/joycomic-ios" target="_blank" rel="noreferrer"
                    style={{ display:'block', textAlign:'center', backgroundColor:'rgba(255,255,255,0.04)', color:'#F0EDE8', padding:'16px 34px', borderRadius:14, fontSize:15, fontWeight:600, textDecoration:'none', border:'1px solid rgba(255,255,255,0.08)' }}
                    className="hover:bg-[rgba(255,255,255,0.08)] hover:-translate-y-0.5 transition-all">查看源码</a>
                </div>
              </div>
              <p className="max-w-[540px] mx-auto mt-8 text-[12px] text-[#6B6873] text-center leading-relaxed">仅供学习研究使用，24h 内删除</p>
            </section>

            {/* Footer */}
            <footer className="border-t border-[rgba(255,255,255,0.05)] px-6 pt-[60px] pb-8">
              <div className="max-w-[1100px] mx-auto text-center">
                <span className="text-[22px] font-extrabold bg-gradient-to-r from-[#E85D3A] to-[#FF8C5A] bg-clip-text text-transparent">JOYComic</span>
                <p className="text-[#9895A0] text-[14px] mt-1.5">聚合双源 · 畅享漫画</p>
                <div className="flex justify-center gap-7 my-6">
                  <a href="https://github.com/xiaoqi419/joycomic-ios" target="_blank" rel="noreferrer" className="text-[#9895A0] text-[13px] hover:text-[#E85D3A] transition-colors no-underline">GitHub</a>
                </div>
                <p className="text-[11px] text-[#6B6873]">© 2025 JOYComic</p>
              </div>
            </footer>
          </>
        )}

        {page === 'history' && <HistoryPage />}
      </div>
    </div>
  );
}

/* ===== Git History ===== */
function HistoryPage() {
  const [commits, setCommits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCommits = useCallback(async () => {
    setLoading(true); setError(null);
    const PROXIES = [
      `https://api.github.com/repos/xiaoqi419/joycomic-ios/commits?per_page=50`,
      `https://cdn.jsdelivr.net/gh/xiaoqi419/joycomic-ios@main/latest-version.json`,
    ];
    for (const url of PROXIES) {
      try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 8000);
        const res = await fetch(url, { headers: { 'User-Agent': 'JOYComic-Site/1.0' }, signal: ctrl.signal });
        clearTimeout(tid);
        if (!res.ok) continue;
        const data = await res.json();
        if (Array.isArray(data)) { setCommits(data); setLoading(false); return; }
      } catch {}
    }
    setError('无法连接到 GitHub'); setLoading(false);
  }, []);

  useEffect(() => { fetchCommits(); }, [fetchCommits]);

  return (
    <section className="pt-[120px] min-h-[80vh] max-w-[720px] mx-auto px-6">
      <div className="text-center mb-16">
        <span className="inline-flex px-[14px] py-[5px] rounded-full bg-[rgba(232,93,58,0.08)] text-[#E85D3A] text-[11px] font-bold tracking-[1.5px] uppercase border border-[rgba(232,93,58,0.12)] mb-4">Git 历史</span>
        <h2 className="text-[clamp(30px,3.5vw,42px)] font-extrabold mb-3">提交记录</h2>
      </div>
      {loading && <div className="text-center py-[60px] text-[#9895A0]"><div className="w-9 h-9 border-3 border-[rgba(232,93,58,0.15)] border-t-[#E85D3A] rounded-full mx-auto mb-4 animate-spin" /><p>正在获取提交记录…</p></div>}
      {error && <div className="text-center py-[60px] text-[#9895A0]"><p>{error}</p><button onClick={fetchCommits} className="mt-4 px-[34px] py-4 bg-[#E85D3A] text-white rounded-[14px] text-[15px] font-semibold border-none cursor-pointer">重试</button></div>}
      {!loading && !error && (
        <div className="relative pl-[34px] before:content-[''] before:absolute before:left-[12px] before:top-0 before:bottom-0 before:w-[2px] before:bg-gradient-to-b before:from-[rgba(232,93,58,0.2)] before:to-transparent">
          {commits.map((c, i) => (
            <div key={c.sha} className="relative mb-5 animate-[fadeUp_0.5s_ease-out_both]" style={{ animationDelay: `${i * 0.03}s` }}>
              <div className="absolute -left-[28px] top-[6px] w-3 h-3 rounded-full bg-[#07070D] border-2 border-[#E85D3A]" />
              <div className="bg-[#12121E] rounded-[12px] p-[18px_22px] border border-[rgba(255,255,255,0.05)] hover:border-[rgba(232,93,58,0.15)] hover:translate-x-1 transition-all">
                <div className="flex items-center gap-3.5 mb-1.5">
                  <a href={c.html_url} target="_blank" rel="noreferrer" className="text-[12px] font-bold text-[#E85D3A] no-underline hover:underline font-mono">#{c.sha.slice(0, 7)}</a>
                  <span className="text-[11px] text-[#6B6873]">{new Date(c.commit.committer.date).toISOString().slice(0, 10)}</span>
                </div>
                <p className="text-[14px] text-[#F0EDE8] leading-relaxed break-words">{c.commit.message.split('\n')[0]}</p>
                <div className="flex items-center gap-2 mt-2.5 text-[12px] text-[#9895A0]">
                  <img src={c.author?.avatar_url || ''} alt="" className="w-5 h-5 rounded-full" />
                  <span>{c.commit.author.name}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
