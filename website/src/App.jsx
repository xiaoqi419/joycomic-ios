import { useState, useEffect, useRef } from 'react';
import './App.css';

const APP_VERSION = '1.0.0';

const FEATURES = [
  { icon: 'books', title: '海量漫画', desc: '聚合 JMComic + Pica 双源，百万漫画任你翻阅' },
  { icon: 'shuffle', title: '智能去混淆', desc: '自动还原百叶窗加密图片，原生级阅读体验' },
  { icon: 'read', title: '双模式阅读', desc: '竖滑无限滚动 + 分页翻页，随心切换' },
  { icon: 'download', title: '离线下载', desc: '一键下载整本漫画，没网也能看' },
  { icon: 'folder', title: '文件夹管理', desc: '创建收藏文件夹，分类整理你的最爱' },
  { icon: 'search', title: '双源搜索', desc: '同时搜索 JMComic 与 Pica，找到最多资源' },
  { icon: 'media', title: '影视 & 小说', desc: '内置影视播放与小说阅读，一站式娱乐' },
  { icon: 'moon', title: '深色主题', desc: 'Material 3 设计，护眼暗色模式' },
];

const CHANGELOG = [
  { version: '1.1.0', date: '2025-07', items: ['收藏夹系统：新建/管理文件夹', '评论无限滚动加载', '详情页封面比例优化', '继续阅读跳转详情页', '阅读进度实时记录', '预加载页数可配置'] },
  { version: '1.0.0', date: '2025-06', items: ['🎉 JOYComic 首个正式版发布', 'JMComic + Pica 双源聚合', '漫画阅读器（竖滑+分页）', '搜索、分类、周榜', '登录/注册/签到/成就', '下载管理器'] },
];

function App() {
  const [scrolled, setScrolled] = useState(false);
  const featuresRef = useRef(null);
  const downloadRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (ref) => ref.current?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="app">
      {/* Nav */}
      <nav className={`nav ${scrolled ? 'nav-scrolled' : ''}`}>
        <div className="nav-inner">
          <span className="nav-logo">JOYComic</span>
          <div className="nav-links">
            <button onClick={() => scrollTo(featuresRef)}>功能</button>
            <button onClick={() => scrollTo(downloadRef)}>下载</button>
            <a href="https://github.com/xiaoqi419/jmcomic-ios" target="_blank" rel="noreferrer">GitHub</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-content">
          <div className="hero-badge">v{APP_VERSION}</div>
          <h1 className="hero-title">
            <span className="hero-gradient">JOYComic</span>
          </h1>
          <p className="hero-subtitle">
            聚合双源 · 畅享漫画 · 全功能 iOS 客户端
          </p>
          <p className="hero-desc">
            基于 Expo/React Native 构建，Material 3 设计，支持 JMComic + Pica 双数据源聚合搜索，
            竖滑/分页双模式阅读器，智能图片去混淆，离线下载，文件夹管理……
          </p>
          <div className="hero-btns">
            <a href="#download" className="btn-primary" onClick={(e) => { e.preventDefault(); scrollTo(downloadRef); }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              下载 App
            </a>
            <a href="https://github.com/xiaoqi419/jmcomic-ios" target="_blank" rel="noreferrer" className="btn-secondary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              GitHub
            </a>
          </div>
        </div>
        <div className="hero-scroll-indicator">
          <div className="scroll-dot" />
        </div>
      </section>

      {/* Features */}
      <section className="features" ref={featuresRef}>
        <div className="section-header">
          <span className="section-tag">功能</span>
          <h2>强大而优雅</h2>
          <p>专为漫画爱好者打造的全能阅读工具</p>
        </div>
        <div className="features-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="feature-card" style={{ '--i': i }}>
              <div className="feature-icon">
                {f.icon === 'books' && <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15z"/></svg>}
                {f.icon === 'shuffle' && <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/></svg>}
                {f.icon === 'read' && <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>}
                {f.icon === 'download' && <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}
                {f.icon === 'folder' && <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>}
                {f.icon === 'search' && <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>}
                {f.icon === 'media' && <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>}
                {f.icon === 'moon' && <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>}
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Screenshots */}
      <section className="screenshots">
        <div className="section-header">
          <span className="section-tag">预览</span>
          <h2>一睹为快</h2>
          <p>简洁沉浸的阅读体验</p>
        </div>
        <div className="screenshot-showcase">
          <div className="phone-mockup">
            <div className="phone-notch" />
            <div className="phone-screen">
              <div className="mock-content">
                <div className="mock-header" />
                <div className="mock-card" />
                <div className="mock-card" />
                <div className="mock-card" />
              </div>
            </div>
          </div>
          <div className="screenshot-desc">
            <h3>Material 3 设计</h3>
            <p>暖琥珀珊瑚橙主题色，支持深色/浅色自动切换，沉浸式全屏阅读。</p>
            <ul>
              <li>✅ 双源聚合搜索</li>
              <li>✅ 竖滑 + 分页双模式</li>
              <li>✅ 智能图片去混淆</li>
              <li>✅ 离线下载与本地阅读</li>
              <li>✅ 文件夹管理收藏</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Download */}
      <section className="download" ref={downloadRef}>
        <div className="section-header">
          <span className="section-tag">下载</span>
          <h2>立即获取</h2>
          <p>选择你的平台，开始畅快阅读</p>
        </div>
        <div className="download-cards">
          <div className="download-card featured">
            <div className="download-badge">推荐</div>
            <div className="download-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12" y2="18"/></svg>
            </div>
            <h3>iOS 版本</h3>
            <p>iOS 15.0+ · IPA 安装</p>
            <div className="download-meta">
              <span>v{APP_VERSION}</span>
              <span>~30 MB</span>
            </div>
            <a href="https://github.com/xiaoqi419/jmcomic-ios/releases" target="_blank" rel="noreferrer" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              下载 IPA
            </a>
          </div>
          <div className="download-card">
            <div className="download-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            </div>
            <h3>源代码</h3>
            <p>MIT 协议 · 开源</p>
            <div className="download-meta">
              <span>React Native</span>
              <span>Expo SDK 54</span>
            </div>
            <a href="https://github.com/xiaoqi419/jmcomic-ios" target="_blank" rel="noreferrer" className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
              查看源码
            </a>
          </div>
        </div>
        <p className="download-note">
          ⚠️ 本应用仅供学习研究使用，请于 24 小时内删除。所有内容来自第三方 API，与开发者无关。
        </p>
      </section>

      {/* Changelog */}
      <section className="changelog">
        <div className="section-header">
          <span className="section-tag">更新</span>
          <h2>版本历史</h2>
          <p>持续迭代，不断进步</p>
        </div>
        <div className="changelog-timeline">
          {CHANGELOG.map((log, i) => (
            <div key={i} className="changelog-item">
              <div className="changelog-dot" />
              <div className="changelog-content">
                <div className="changelog-header">
                  <span className="changelog-version">v{log.version}</span>
                  <span className="changelog-date">{log.date}</span>
                </div>
                <ul>
                  {log.items.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="footer-logo">JOYComic</span>
            <p>聚合双源 · 畅享漫画</p>
          </div>
          <div className="footer-links">
            <a href="https://github.com/xiaoqi419/jmcomic-ios" target="_blank" rel="noreferrer">GitHub</a>
            <a href="https://18comic.vip" target="_blank" rel="noreferrer">JMComic</a>
          </div>
          <p className="footer-copy">© 2025 JOYComic. 仅供学习研究使用。</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
