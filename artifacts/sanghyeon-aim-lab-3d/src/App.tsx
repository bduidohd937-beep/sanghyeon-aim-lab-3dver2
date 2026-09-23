import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { Crosshair, Gauge, Keyboard, Pause, Play, RotateCcw, Settings2, Target, X } from 'lucide-react';
import * as THREE from 'three';

type Drill = 'flick' | 'tracking' | 'braking';
type FlickMode = 'random' | 'headline' | 'robot';
type TrainingConfig = {
  drill: Drill;
  duration: number;
  difficulty: string;
  feedbackEnabled: boolean;
  aimCoach: boolean;
  flickBotCount: number;
  flickMode: FlickMode;
};
type View =
  | 'home'
  | 'setup'
  | 'range'
  | 'results'
  | 'sensitivity'
  | 'growth'
  | 'crosshair';
type RunStatus = 'active' | 'paused' | 'done';
type  CrosshairConfig = {
  style:
    | 'classic'
    | 'dot'
    | 'cross-dot'
    | 'box'
    | 'circle'
    | 't-cross'
    | 'plus'
    | 'four-dot'
    | 'small-cross'
    | 'wide-cross';
  color: string;
  size: number;
  gap: number;
  thickness: number;
  outline: boolean;
  centerDot: boolean;
};
type TelemetryMode = 'off' | 'text' | 'graph' | 'both';
type Settings = { sensitivity: number; crosshair: CrosshairConfig; telemetryMode: TelemetryMode };
type RunStats = { score: number; accuracy: number; streak: number; hits: number; shots: number; drill: Drill; duration: number; avgReaction?: number; bestReaction?: number; overshoots?: number; maxStreak?: number };
type HistoryItem = { score: number; accuracy: number; drill: Drill; date: string; hits?: number; shots?: number; streak?: number };

const queryClient = new QueryClient();
const DEFAULT_CROSSHAIR: CrosshairConfig = { style: 'classic', color: '#ffffff', size: 36, gap: 5, thickness: 2, outline: true, centerDot: false };
const DEFAULT_SETTINGS: Settings = { sensitivity: 1.15, crosshair: DEFAULT_CROSSHAIR, telemetryMode: 'off' };

const CROSSHAIR_PRESETS: Record<string, CrosshairConfig> = {
  'CLASSIC': {
    style: 'classic',
    color: '#ffffff',
    size: 32,
    gap: 5,
    thickness: 2,
    outline: true,
    centerDot: false,
  },

  'DOT': {
    style: 'dot',
    color: '#ffffff',
    size: 14,
    gap: 0,
    thickness: 3,
    outline: true,
    centerDot: true,
  },

  'CROSS DOT': {
    style: 'cross-dot',
    color: '#00ff88',
    size: 30,
    gap: 6,
    thickness: 2,
    outline: true,
    centerDot: true,
  },

  'BOX': {
    style: 'box',
    color: '#00ffff',
    size: 32,
    gap: 5,
    thickness: 2,
    outline: true,
    centerDot: false,
  },

  'CIRCLE': {
    style: 'circle',
    color: '#ffffff',
    size: 30,
    gap: 3,
    thickness: 2,
    outline: true,
    centerDot: false,
  },

  'T-CROSS': {
    style: 't-cross',
    color: '#ff5555',
    size: 32,
    gap: 5,
    thickness: 2,
    outline: true,
    centerDot: false,
  },

  'FOUR DOT': {
    style: 'four-dot',
    color: '#ffff00',
    size: 28,
    gap: 7,
    thickness: 4,
    outline: false,
    centerDot: false,
  },

  'PLUS': {
    style: 'plus',
    color: '#ffffff',
    size: 28,
    gap: 0,
    thickness: 2,
    outline: true,
    centerDot: false,
  },
};

function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveStorage(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage is optional */ }
}

function normalizeSettings(raw: unknown): Settings {
  if (!raw || typeof raw !== 'object') return DEFAULT_SETTINGS;
  const value = raw as { sensitivity?: unknown; crosshair?: unknown; telemetryMode?: unknown };
  const sensitivity = typeof value.sensitivity === 'number' ? value.sensitivity : DEFAULT_SETTINGS.sensitivity;
  const telemetryMode: TelemetryMode = value.telemetryMode === 'text' || value.telemetryMode === 'graph' || value.telemetryMode === 'both' ? value.telemetryMode : 'off';
  if (typeof value.crosshair === 'number') return { sensitivity, crosshair: { ...DEFAULT_CROSSHAIR, size: value.crosshair }, telemetryMode };
  if (value.crosshair && typeof value.crosshair === 'object') return { sensitivity, crosshair: { ...DEFAULT_CROSSHAIR, ...(value.crosshair as Partial<CrosshairConfig>) }, telemetryMode };
  return { sensitivity, crosshair: DEFAULT_CROSSHAIR, telemetryMode };
}

function CrosshairView({
  config,
  className = '',
}: {
  config: CrosshairConfig;
  className?: string;
}) {
  const size = config.size;
  const center = size / 2;
  const gap = Math.max(0, config.gap);
  const thickness = Math.max(1, config.thickness);

  const line = {
    position: 'absolute' as const,
    background: config.color,
    boxShadow: config.outline ? '0 0 0 1px #050709' : 'none',
  };

  // gap은 중앙에서 떨어지는 거리
  const armLength = Math.max(2, center - gap);

  const wrapper = {
    width: size,
    height: size,
    position: 'relative' as const,
  };

  if (config.style === 'dot') {
    return (
      <div className={`crosshair-view ${className}`} style={wrapper}>
        <i
          style={{
            ...line,
            width: thickness * 2,
            height: thickness * 2,
            borderRadius: '50%',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />
      </div>
    );
  }

  if (config.style === 'circle') {
    return (
      <div className={`crosshair-view ${className}`} style={wrapper}>
        <div
          style={{
            position: 'absolute',
            inset: gap,
            border: `${thickness}px solid ${config.color}`,
            borderRadius: '50%',
            boxShadow: config.outline
              ? '0 0 0 1px #050709'
              : 'none',
          }}
        />
      </div>
    );
  }

  if (config.style === 'box') {
    return (
      <div className={`crosshair-view ${className}`} style={wrapper}>
        <div
          style={{
            position: 'absolute',
            inset: gap,
            border: `${thickness}px solid ${config.color}`,
            boxShadow: config.outline
              ? '0 0 0 1px #050709'
              : 'none',
          }}
        />
      </div>
    );
  }

  if (config.style === 'plus') {
    return (
      <div className={`crosshair-view ${className}`} style={wrapper}>
        <span
          style={{
            ...line,
            width: thickness,
            height: size,
            left: center - thickness / 2,
            top: 0,
          }}
        />
        <span
          style={{
            ...line,
            width: size,
            height: thickness,
            left: 0,
            top: center - thickness / 2,
          }}
        />
      </div>
    );
  }

  if (config.style === 'four-dot') {
    const dot = Math.max(2, thickness);

    return (
      <div className={`crosshair-view ${className}`} style={wrapper}>
        <span
          style={{
            ...line,
            width: dot,
            height: dot,
            left: center - dot / 2,
            top: center - gap - dot / 2,
          }}
        />
        <span
          style={{
            ...line,
            width: dot,
            height: dot,
            left: center - dot / 2,
            top: center + gap - dot / 2,
          }}
        />
        <span
          style={{
            ...line,
            width: dot,
            height: dot,
            left: center - gap - dot / 2,
            top: center - dot / 2,
          }}
        />
        <span
          style={{
            ...line,
            width: dot,
            height: dot,
            left: center + gap - dot / 2,
            top: center - dot / 2,
          }}
        />
      </div>
    );
  }

  if (config.style === 't-cross') {
    return (
      <div className={`crosshair-view ${className}`} style={wrapper}>
        <span
          style={{
            ...line,
            width: armLength,
            height: thickness,
            left: center + gap,
            top: center - thickness / 2,
          }}
        />
        <span
          style={{
            ...line,
            width: armLength,
            height: thickness,
            right: center + gap,
            top: center - thickness / 2,
          }}
        />
        <span
          style={{
            ...line,
            width: thickness,
            height: armLength,
            left: center - thickness / 2,
            top: center + gap,
          }}
        />
      </div>
    );
  }

  // CLASSIC / CROSS DOT / SMALL CROSS / WIDE CROSS
  return (
    <div className={`crosshair-view ${className}`} style={wrapper}>
      {/* TOP */}
      <span
        style={{
          ...line,
          width: thickness,
          height: armLength,
          left: center - thickness / 2,
          top: 0,
        }}
      />

      {/* BOTTOM */}
      <span
        style={{
          ...line,
          width: thickness,
          height: armLength,
          left: center - thickness / 2,
          top: center + gap,
        }}
      />

      {/* LEFT */}
      <span
        style={{
          ...line,
          width: armLength,
          height: thickness,
          left: 0,
          top: center - thickness / 2,
        }}
      />

      {/* RIGHT */}
      <span
        style={{
          ...line,
          width: armLength,
          height: thickness,
          left: center + gap,
          top: center - thickness / 2,
        }}
      />

      {config.centerDot && (
        <i
          style={{
            position: 'absolute',
            width: thickness * 2,
            height: thickness * 2,
            borderRadius: '50%',
            background: config.color,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />
      )}
    </div>
  );
}

function Brand() {
  return (
    <div className="brand" data-testid="brand-sanghyeon">
      <div className="brand-mark" aria-hidden="true"><span /></div>
      <div><div className="brand-name">Sanghyeon Aim Lab</div><div className="brand-sub">3D VALORANT AIM TRAINING</div></div>
    </div>
  );
}

function SettingsPanel({ settings, onChange, onClose }: { settings: Settings; onChange: (next: Settings) => void; onClose: () => void }) {
  return (
    <div className="modal-dim" role="dialog" aria-modal="true" aria-label="Range settings" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <div className="pause-modal settings-modal">
        <div className="panel-kicker"><span>媛먮룄 ?ㅼ젙 / 02</span><button className="hud-button" onClick={onClose} data-testid="button-close-settings" aria-label="?ㅼ젙 ?リ린"><X size={16} /></button></div>
        <h2>議곗옉 ?ㅼ젙</h2>
        <p>??留덉슦?ㅼ? ?먯뿉 留욊쾶 ?덈젴 ?섍꼍??議곗젙?섏꽭??</p>
        <div className="settings-row">
          <label htmlFor="sensitivity">留덉슦??媛먮룄</label>
          <input id="sensitivity" type="range" min="0.4" max="2.4" step="0.05" value={settings.sensitivity} onChange={(event) => onChange({ ...settings, sensitivity: Number(event.target.value) })} data-testid="input-sensitivity" />
          <output htmlFor="sensitivity">{settings.sensitivity.toFixed(2)}</output>
        </div>
        <div className="settings-row">
          <label htmlFor="crosshair">?щ줈?ㅽ뿤???ш린</label>
          <input id="crosshair" type="range" min="22" max="56" step="2" value={settings.crosshair.size} onChange={(event) => onChange({ ...settings, crosshair: { ...settings.crosshair, size: Number(event.target.value) } })} data-testid="input-crosshair-size" />
          <output htmlFor="crosshair">{settings.crosshair.size}px</output>
        </div>
        <div className="modal-actions"><button className="secondary-button" onClick={onClose} data-testid="button-done-settings">설정 저장</button></div>
      </div>
    </div>
  );
}

function Home({
  settings,
  onSettings,
  onStart,
  history,
  onNavigate,
  onSettingsChange,
  onSelectDrill,
}: {
  settings: Settings;
  onSettings: () => void;
  onStart: (drill: Drill, duration: number, difficulty: string, feedbackEnabled?: boolean, aimCoach?: boolean, flickMode?: FlickMode, flickBotCount?: number) => void;
  history: HistoryItem[];
  onNavigate: (view: View) => void;
  onSettingsChange: (next: Settings) => void;
  onSelectDrill: (drill: Drill) => void;
}) {
  const [drill, setDrill] = useState<Drill>('flick');

  const best = history.length
    ? Math.max(...history.map((item) => item.score))
    : 0;

  const lastAccuracy = history[0]?.accuracy ?? 0;

  const updateCrosshair = (next: CrosshairConfig) => {
    onSettingsChange({
      ...settings,
      crosshair: next,
    });
  };

  const drillInfo = {
    flick: { icon: <Crosshair size={30} />, tag: '01', title: 'FLICK', korean: '정밀 전환', desc: '타겟이 나오면 바로 끌어가서 맞히는 기본 플릭 훈련.', active: true },
    reaction: { icon: <Target size={30} />, tag: '02', title: '시각반응', korean: '반응속도', desc: '언제 뜰지 모르는 신호를 보고 얼마나 빨리 반응하는지 확인.', active: false },
    tracking: { icon: <Target size={30} />, tag: '03', title: 'TRACKING', korean: '움직임 추적', desc: '움직이는 타겟을 놓치지 않고 따라가는 연습.', active: true },
    braking: { icon: <Gauge size={30} />, tag: '04', title: 'BRAKING', korean: '브레이킹', desc: 'A/D 반전으로 멈추고 바로 쏘는 감각을 잡는 훈련.', active: true },
    switching: { icon: <Crosshair size={30} />, tag: '05', title: 'SWITCHING', korean: '타겟 스위칭', desc: '하나 잡자마자 다음 타겟으로 얼마나 빨리 넘어가는지 본다.', active: false },
    micro: { icon: <Crosshair size={30} />, tag: '06', title: 'MICRO FLICK', korean: '미세 플릭', desc: '짧은 거리에서 오버슈트 없이 딱 붙여 맞히는 연습.', active: false },
  };

  return (
    <div className="aim-app">
      <header className="app-header">
        <Brand />

        <nav className="main-nav">
          <button onClick={() => onNavigate('sensitivity')}>🎯 감도 설정</button>
          <button onClick={() => onNavigate('growth')}>📊 연습 기록</button>
          <button onClick={() => onNavigate('crosshair')}>⚙️ 설정</button>
        </nav>

        <div className="header-meta">
          <span>
            <span
              className="live-dot"
              style={{ display: 'inline-block', marginRight: 8 }}
            />
            RANGE 01 / READY
          </span>

          <strong>
            LV.{Math.max(1, Math.floor(history.length / 5) + 1)}
          </strong>

          <span className="header-ready">READY</span>
        </div>
      </header>

      <div className="home-layout">
        <main className="home-main">
          <section className="home-hero">
            <div className="eyebrow">
              <span className="eyebrow-line" />
              SANGHYEON AIM LAB // 3D RANGE
            </div>

            <h1 className="hero-title">
              경쟁하기 전
              <br />
              <em>손풀기.</em>
            </h1>

            <p className="hero-copy">
              실제 1인칭 3D 공간에서
              <br />
              에임 감각을 빠르게 끌어올리세요.
            </p>
          </section>

          <section className="training-section">
            <div className="section-title">
              <div>
                <p className="eyebrow">TRAINING MODULES</p>
                <h2>훈련실</h2>
              </div>

              <span className="phase">6 MODULES · PICK ONE</span>
            </div>

            <div className="drill-grid">
              {(Object.keys(drillInfo) as Drill[]).map((type) => {
                const item = drillInfo[type];
                const selected = drill === type;

                return (
                  <button
                    key={type}
                    className={`drill-card ${selected ? 'selected' : ''} ${item.active ? '' : 'disabled'}`}
                  onClick={() => item.active && onSelectDrill(type)}
                  >
                    <div className="drill-card-top">
                      <span className="drill-number">
                        {item.tag}
                      </span>

                      <span className="drill-icon">
                        {item.icon}
                      </span>
                    </div>

                    <div className="drill-card-body">
                      <span className="drill-name">
                        {item.title}
                      </span>

                      <h3>{item.korean}</h3>

                      <p>{item.desc}</p>
                    </div>

                    <div className="drill-card-bottom">
                      <span>
                        {selected ? 'SELECTED' : item.active ? 'SELECT' : 'PREPARING'}
                      </span>

                      <span>→</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </main>

        <aside className="side-panel">
          <div className="panel-kicker">
            <span>PERSONAL RECORD</span>
            <span>LIVE</span>
          </div>

          <h2 className="panel-title">
            오늘의 기록
          </h2>

          <div className="telemetry-hero">
            <span className="metric-label">
              최고 점수
            </span>

            <strong className="metric-value">
              {best ? best.toLocaleString() : '--'}
            </strong>

            <span className="metric-caption">
              {history.length
                ? '현재 최고 기록'
                : '훈련 기록이 없습니다'}
            </span>
          </div>

          <div className="side-rule" />

          <div className="stat-list">
            <div className="stat-row">
              <span>훈련 횟수</span>
              <strong>
                {history.length
                  .toString()
                  .padStart(2, '0')}
              </strong>
            </div>

            <div className="stat-row">
              <span>최근 명중률</span>
              <strong>
                {history.length
                  ? `${lastAccuracy.toFixed(1)}%`
                  : '--'}
              </strong>
            </div>

            <div className="stat-row">
              <span>현재 감도</span>
              <strong>
                {settings.sensitivity.toFixed(2)}
              </strong>
            </div>
          </div>

          <div className="side-rule" />

          <div className="history-title">
            RECENT TRAINING
          </div>

          {history.length === 0 ? (
            <div className="history-row">
              <small>첫 훈련을 시작해보세요.</small>
              <strong>--</strong>
            </div>
          ) : (
            history.slice(0, 6).map((item, index) => (
              <div
                className="history-row"
                key={`${item.date}-${index}`}
              >
                <div>
                  <strong>
                    {item.score.toLocaleString()}
                  </strong>

                  <small
                    style={{
                      display: 'block',
                      marginTop: 4,
                    }}
                  >
                    {item.drill === 'flick'
                      ? 'FLICK'
                      : item.drill === 'tracking'
                        ? 'TRACKING'
                        : 'BRAKING'}{' '}
                    / {item.date}
                  </small>
                </div>

                <em>
                  {item.accuracy.toFixed(1)}%
                </em>
              </div>
            ))
          )}
        </aside>
      </div>
    </div>
  );
}

function TrainingSetup({
  drill,
  onStart,
  onBack,
}: {
  drill: Drill;
  onStart: (drill: Drill, duration: number, difficulty: string, feedbackEnabled?: boolean, aimCoach?: boolean) => void;
  onBack: () => void;
}) {
  const [difficulty, setDifficulty] = useState('operator');
  const [duration, setDuration] = useState(30);
  const [feedbackEnabled, setFeedbackEnabled] = useState(true);
  const [aimCoach, setAimCoach] = useState(false);
  const [flickBotCount, setFlickBotCount] = useState(3);
  const [flickMode, setFlickMode] = useState<FlickMode>('random');
  const [launchStep, setLaunchStep] = useState<null | 'count' | 'time'>(null);

  const drillInfo = {
    flick: {
      title: 'FLICK',
      korean: '순간 조준',
      desc: '빠르게 등장하는 목표를 정확하게 클릭합니다.',
      icon: '🎯',
    },
    tracking: {
      title: 'TRACKING',
      korean: '추적 조준',
      desc: '움직이는 목표의 머리 라인을 안정적으로 따라갑니다.',
      icon: '👁️',
    },
    braking: {
      title: 'BRAKING',
      korean: '감속 조준',
      desc: '이동 후 정확히 멈추고 첫 발을 맞춥니다.',
      icon: '⚡',
    },
  }[drill] ?? {
    title: 'TRAINING',
    korean: '에임 훈련',
    desc: '선택한 훈련 모드를 준비합니다.',
    icon: '🎯',
  };

  const difficulties = [
    {
      id: 'trainee',
      title: '응애 나 뉴비에요',
      sub: '기본적인 조준 감각부터',
    },
    {
      id: 'operator',
      title: '이제 사람 구실 좀 해볼게요',
      sub: '실전 기본 난이도',
    },
    {
      id: 'elite',
      title: '나 정도면 실력자지',
      sub: '빠른 타겟과 높은 정확도',
    },
    {
      id: 'hell',
      title: '경쟁에서 캐리할게요',
      sub: '극한의 에임 컨트롤',
    },
  ];

  return (
    <div className="app-shell">
      <main className="setup-screen">

        <button
          className="setup-back"
          onClick={onBack}
        >
          ← LAB으로 돌아가기
        </button>

        <div className="setup-header">
          <span className="setup-eyebrow">
            TRAINING PROTOCOL // 01
          </span>

          <div className="setup-mode">
            <span className="setup-mode-icon">
              {drillInfo.icon}
            </span>

            <div>
              <h1>{drillInfo.title}</h1>
              <p>
                {drillInfo.korean} · {drillInfo.desc}
              </p>
            </div>
          </div>
        </div>

        <section className="setup-section">
          <div className="setup-section-head">
            <span>01</span>
            <div>
              <h2>난이도 선택</h2>
              <p>훈련 강도를 선택하세요.</p>
            </div>
          </div>

          <div className="difficulty-grid">
            {difficulties.map((item) => (
              <button
                key={item.id}
                className={`difficulty-card ${
                  difficulty === item.id ? 'selected' : ''
                } ${
                  item.id === 'hell' ? 'hell' : ''
                }`}
                style={difficulty === item.id ? { borderColor: item.id === 'trainee' ? '#62d5a0' : item.id === 'operator' ? '#42b7ff' : item.id === 'elite' ? '#ffb347' : '#c25cff', background: item.id === 'trainee' ? '#14231f' : item.id === 'operator' ? '#10212d' : item.id === 'elite' ? '#2b2114' : '#21152a' } : undefined}
                onClick={() => setDifficulty(item.id)}
              >
                <strong>{item.title}</strong>
                <span>{item.sub}</span>

                {difficulty === item.id && (
                  <b>✓ SELECTED</b>
                )}
              </button>
            ))}
          </div>
        </section>

        <section className="setup-section">
          <div className="setup-section-head">
            <span>02</span>
            <div>
              <h2>모드 설정</h2>
              <p>훈련 방식을 설정하세요.</p>
            </div>
          </div>

          <div className="mode-options">
            {drill === 'flick' && (
              <>
                <div className="setup-section-head flick-mode-head">
                  <span>02</span>
                  <div><h2>TRAINING MODE</h2><p>어디를 맞힐지 선택해.</p></div>
                </div>
                {([
                  ['random', 'RANDOM', '전방위', '화면 상하좌우에 구형 타겟이 랜덤 등장'],
                  ['headline', 'HEADLINE', '헤드라인', '화면 중앙 높이에 로봇 타겟이 등장'],
                  ['robot', 'ROBOT HEAD', '훈련봇', '훈련봇의 머리 중심을 정확히 클릭'],
                ] as const).map(([id, title, label, desc]) => (
                  <button key={id} type="button" className={`training-mode-card ${flickMode === id ? 'selected' : ''}`} onClick={() => setFlickMode(id)}>
                    <span className="training-mode-index">{id === 'random' ? '01' : id === 'headline' ? '02' : '03'}</span>
                    <span className="training-mode-copy"><strong>{title}</strong><b>{label}</b><small>{desc}</small></span>
                    <span className="training-mode-check">{flickMode === id ? 'SELECTED' : '→'}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </section>

        <section className="setup-section feedback-section">
          <div className="setup-section-head">
            <span>03</span>
            <div><h2>FEEDBACK</h2><p>훈련 중 표시할 교정 기능을 선택하세요.</p></div>
          </div>
          <div className="mode-options">
            <button type="button" className={`mode-option ${feedbackEnabled ? 'selected' : ''}`} onClick={() => setFeedbackEnabled((value) => !value)}>
              <div><strong>⚔️ 전투 피드백</strong><span>명중·미스 점수를 화면에 표시합니다.</span></div>
              <span className="option-on">{feedbackEnabled ? 'ON' : 'OFF'}</span>
            </button>
            <button type="button" className={`mode-option ${aimCoach ? 'selected' : ''}`} onClick={() => setAimCoach((value) => !value)}>
              <div><strong>📐 에임 높이 교정</strong><span>헤드라인 높이를 기준으로 조준선을 교정합니다.</span></div>
              <span className="option-on">{aimCoach ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </section>
        </section>

        <section className="setup-section compact">
          <div className="setup-section-head">
            <span>04</span>
            <div>
              <h2>훈련 시간</h2>
              <p>한 세션의 길이를 선택하세요.</p>
            </div>
          </div>

          <div className="duration-row">
            {[15, 30, 60].map((time) => (
              <button
                key={time}
                className={
                  duration === time
                    ? 'duration-button selected'
                    : 'duration-button'
                }
                onClick={() => setDuration(time)}
              >
                {time}
                <small>SEC</small>
              </button>
            ))}
          </div>
        </section>

        <div className="setup-footer">
          <div>
            <span>READY TO TRAIN</span>
            <strong>
              {drillInfo.title} /{' '}
              {duration} SEC
            </strong>
          </div>

          <button className="setup-start" onClick={() => setLaunchStep('count')}>훈련 시작 <span>→</span></button>
          {launchStep && (
            <div className="modal-dim setup-launch-dim">
              <div className="pause-modal setup-launch-modal">
                {launchStep === 'count' ? (
                  <>
                    <span className="launch-kicker">01 // TARGET COUNT</span><h2>동시 소환 타겟 수</h2>
                    <p>선택한 수만큼 동시에 존재하며, 명중하면 즉시 새 타겟이 보충됩니다.</p>
                    <div className="launch-choice-grid">
                      {[1, 3, 5, 7, 12].map((count) => <button key={count} className={flickBotCount === count ? 'selected' : ''} onClick={() => { setFlickBotCount(count); setLaunchStep('time'); }}>{count}<small>TARGETS</small></button>)}
                    </div>
                  </>
                ) : (
                  <>
                    <span className="launch-kicker">02 // TRAINING TIME</span><h2>훈련 시간</h2>
                    <p>이번 세션의 훈련 시간을 선택하세요.</p>
                    <div className="launch-choice-grid time">
                      {[15, 30, 60].map((time) => <button key={time} className={duration === time ? 'selected' : ''} onClick={() => setDuration(time)}>{time}<small>SEC</small></button>)}
                    </div>
                    <div className="modal-actions">
                      <button className="secondary-button" onClick={() => setLaunchStep('count')}>← 이전</button>
                      <button className="setup-start" onClick={() => { setLaunchStep(null); onStart(drill, duration, difficulty, feedbackEnabled, aimCoach, flickMode, flickBotCount); }}>훈련 시작 →</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}

  function RangeScene({ drill, duration, difficulty, feedbackEnabled, aimCoach, flickBotCount, flickMode, settings, onSettingsChange, onFinish }: { drill: Drill; duration: number; difficulty: string; feedbackEnabled: boolean; aimCoach: boolean; flickBotCount: number; flickMode: FlickMode; settings: Settings; onSettingsChange: (next: Settings) => void; onFinish: (stats: RunStats) => void }) {
    const mountRef = useRef<HTMLDivElement>(null);
    const statsRef = useRef<RunStats>({ score: 0, accuracy: 100, streak: 0, hits: 0, shots: 0, drill, duration, avgReaction: undefined, bestReaction: undefined, overshoots: 0, maxStreak: 0 });
    const timeRef = useRef(duration);
    const statusRef = useRef<RunStatus>('active');
    const [status, setStatus] = useState<RunStatus>('active');
    const [timeLeft, setTimeLeft] = useState(duration);
    const [stats, setStats] = useState(statsRef.current);
    const [feedback, setFeedback] = useState<{ text: string; miss: boolean; id: number } | null>(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [pointerLocked, setPointerLocked] = useState(false);
    const [aimCoachWarning, setAimCoachWarning] = useState(false);
    const [aimCoachState, setAimCoachState] = useState<'low' | 'high' | 'ok'>('ok');
    const [fps, setFps] = useState(0);
    const [shotError, setShotError] = useState<number | null>(null);
    const [shotErrorHistory, setShotErrorHistory] = useState<number[]>([]);
    const reactionSamplesRef = useRef<number[]>([]);
    const targetSpawnAtRef = useRef(performance.now());
    const targetMeshRef = useRef<THREE.Mesh | null>(null);
    const targetRootRef = useRef<THREE.Group | null>(null);
    const aimCoachGuideRef = useRef<THREE.Line | null>(null);
    const brakingMovedRef = useRef(false);
    const sensitivityRef = useRef(settings.sensitivity);
    const difficultySize = difficulty === 'trainee' ? 0.55 : difficulty === 'hell' ? 0.25 : difficulty === 'elite' ? 0.31 : 0.42;
    const finish = useCallback(() => {
      if (statusRef.current === 'done') return;
      statusRef.current = 'done';
      const samples = reactionSamplesRef.current;
      const current = { ...statsRef.current, accuracy: statsRef.current.shots ? statsRef.current.hits / statsRef.current.shots * 100 : 0, avgReaction: samples.length ? samples.reduce((a, b) => a + b, 0) / samples.length : undefined, bestReaction: samples.length ? Math.min(...samples) : undefined };
      statsRef.current = current;
      setStats(current);
      onFinish(current);
    }, [onFinish]);
    useEffect(() => { sensitivityRef.current = settings.sensitivity; }, [settings.sensitivity]);

    useEffect(() => {
      const mount = mountRef.current;
      if (!mount) return;
      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#081116');
      scene.fog = new THREE.Fog('#081116', 8, 34);
      const camera = new THREE.PerspectiveCamera(70.53, mount.clientWidth / mount.clientHeight, 0.1, 100);
      camera.position.set(0, 1.6, 6);
      camera.rotation.order = 'YXZ';
      let yaw = 0;
      let pitch = -0.02;
      camera.rotation.set(pitch, yaw, 0);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.setSize(mount.clientWidth, mount.clientHeight); renderer.shadowMap.enabled = true; mount.appendChild(renderer.domElement);
      scene.add(new THREE.HemisphereLight('#bfd5d0', '#10171a', 1.7));
      const key = new THREE.DirectionalLight('#d8ffab', 3); key.position.set(-3, 8, 5); key.castShadow = true; scene.add(key);
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), new THREE.MeshStandardMaterial({ color: '#111c21', roughness: .88, metalness: .2 })); floor.rotation.x = -Math.PI / 2; floor.position.y = 0; floor.receiveShadow = true; scene.add(floor);
      const grid = new THREE.GridHelper(26, 26, '#29443e', '#18282d'); grid.position.y = .01; (grid.material as THREE.Material).opacity = .6; (grid.material as THREE.Material).transparent = true; scene.add(grid);
      const wallMaterial = new THREE.MeshStandardMaterial({ color: '#17262d', roughness: .9 });
      const backWall = new THREE.Mesh(new THREE.BoxGeometry(26, 7, .3), wallMaterial); backWall.position.set(0, 3.5, -10.5); scene.add(backWall);
      const HEADLINE_Y = 1.65;
      const HEADLINE_Z = -9.0;
      const HEADLINE_HALF_WIDTH = 12.5;
      const aimGuideGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-HEADLINE_HALF_WIDTH, HEADLINE_Y, HEADLINE_Z),
        new THREE.Vector3(HEADLINE_HALF_WIDTH, HEADLINE_Y, HEADLINE_Z),
      ]);
      const aimGuideMaterial = new THREE.LineBasicMaterial({ color: '#a3ff27', transparent: true, opacity: .58, depthTest: false });
      const aimGuide = new THREE.Line(aimGuideGeometry, aimGuideMaterial);
      aimGuide.visible = aimCoach;
      aimGuide.renderOrder = 20;
      scene.add(aimGuide);
      aimCoachGuideRef.current = aimGuide;
      const leftWall = new THREE.Mesh(new THREE.BoxGeometry(.3, 7, 26), wallMaterial); leftWall.position.set(-13, 3.5, -1); scene.add(leftWall);
      const rangeLights = [-8, -4, 0, 4, 8].map((x) => { const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.6, .04, .04), new THREE.MeshBasicMaterial({ color: '#a3ff27' })); lamp.position.set(x, 6.6, -6.7); scene.add(lamp); return lamp; }); void rangeLights;
      const group = new THREE.Group(); scene.add(group);

      // Simple first-person rifle model: intentionally low-poly so it stays lightweight in-browser.
      const weapon = new THREE.Group();
      weapon.position.set(.34, -.27, -.72);
      weapon.rotation.set(-.03, -.03, -.02);
      const weaponBody = new THREE.Mesh(
        new THREE.BoxGeometry(.24, .16, .55),
        new THREE.MeshStandardMaterial({ color: '#20282c', roughness: .62, metalness: .55 })
      );
      weaponBody.position.z = -.12;
      weapon.add(weaponBody);
      const weaponGrip = new THREE.Mesh(
        new THREE.BoxGeometry(.11, .25, .13),
        new THREE.MeshStandardMaterial({ color: '#111719', roughness: .8, metalness: .1 })
      );
      weaponGrip.position.set(.01, -.16, .04);
      weaponGrip.rotation.x = -.18;
      weapon.add(weaponGrip);
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(.035, .035, .55, 12),
        new THREE.MeshStandardMaterial({ color: '#090d0f', roughness: .4, metalness: .8 })
      );
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, .01, -.57);
      weapon.add(barrel);
      const sight = new THREE.Mesh(
        new THREE.BoxGeometry(.055, .045, .16),
        new THREE.MeshStandardMaterial({ color: '#7dff39', emissive: '#406d20', emissiveIntensity: .7, roughness: .3 })
      );
      sight.position.set(0, .105, -.25);
      weapon.add(sight);
      camera.add(weapon);
      scene.add(camera);

      let recoilKick = 0;
      let recoilRoll = 0;
      const baseWeaponZ = weapon.position.z;
      const baseWeaponY = weapon.position.y;

      const muzzleFlash = new THREE.Mesh(
        new THREE.SphereGeometry(.065, 8, 8),
        new THREE.MeshBasicMaterial({ color: '#fff2a3', transparent: true, opacity: 0 })
      );
      muzzleFlash.position.set(.34, -.26, -1.3);
      camera.add(muzzleFlash);

      const createTracer = (end: THREE.Vector3) => {
        const start = new THREE.Vector3();
        muzzleFlash.getWorldPosition(start);
        const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
        const material = new THREE.LineBasicMaterial({ color: '#eaff9a', transparent: true, opacity: .9 });
        const tracer = new THREE.Line(geometry, material);
        scene.add(tracer);
        window.setTimeout(() => {
          scene.remove(tracer);
          geometry.dispose();
          material.dispose();
        }, 55);
      };

      const fireVisual = (end: THREE.Vector3) => {
        muzzleFlash.material.opacity = 1;
        recoilKick = Math.min(.075, recoilKick + .045);
        recoilRoll += (Math.random() - .5) * .045;
        window.setTimeout(() => { muzzleFlash.material.opacity = 0; }, 45);
        createTracer(end);
      };

      const brakingStopThreshold = .16;
      const isPositionClear = (x: number, y: number, z: number, radius: number) => {
        const candidate = new THREE.Vector3(x, y, z);
        for (const child of group.children) {
          const existingRadius = child.userData.targetRadius ?? 0.5;
          if (candidate.distanceTo(child.position) < radius + existingRadius + 0.18) return false;
        }
        return true;
      };
      const findFlickPosition = (radius: number) => {
        for (let attempt = 0; attempt < 80; attempt += 1) {
          const ndcX = THREE.MathUtils.randFloat(-0.86, 0.86);
          const ndcY = THREE.MathUtils.randFloat(-0.72, 0.72);
          const distance = THREE.MathUtils.randFloat(7.2, 12);
          const direction = new THREE.Vector3(ndcX, ndcY, -1).unproject(camera).sub(camera.position).normalize();
          const point = camera.position.clone().addScaledVector(direction, distance);
          point.x = THREE.MathUtils.clamp(point.x, -11.3 + radius, 11.3 - radius);
          point.y = THREE.MathUtils.clamp(point.y, 0.9, 4.9);
          point.z = THREE.MathUtils.clamp(point.z, -9.9, -1.8);
          if (isPositionClear(point.x, point.y, point.z, radius)) return point;
        }
        return new THREE.Vector3(0, 1.65, -8);
      };
      const findRobotPosition = (radius: number) => {
        for (let attempt = 0; attempt < 100; attempt += 1) {
          const x = THREE.MathUtils.randFloat(-11, 11);
          const z = THREE.MathUtils.randFloat(-9.15, -2.2);
          if (isPositionClear(x, 0, z, radius)) return new THREE.Vector3(x, 0, z);
        }
        return new THREE.Vector3(0, 0, -8);
      };
      const buildRobot = () => {
        const root = new THREE.Group();
        const armorMat = new THREE.MeshStandardMaterial({ color: '#2b2d35', roughness: .4, metalness: .8 });
        const darkMat = new THREE.MeshStandardMaterial({ color: '#15171a', roughness: .6, metalness: .9 });
        const redAccentMat = new THREE.MeshStandardMaterial({ color: '#ff4655', emissive: '#ff2222', emissiveIntensity: .8, roughness: .3 });
        const whiteHeadMat = new THREE.MeshStandardMaterial({ color: '#dce2eb', roughness: .2, metalness: .5, emissive: '#88aacc', emissiveIntensity: .2 });
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(.08,.1,.15,8),darkMat); neck.name='body'; neck.position.y=1.47;
        const head = new THREE.Mesh(new THREE.BoxGeometry(.24,.28,.24),whiteHeadMat); head.name='head'; head.position.y=1.65;
        const headTop = new THREE.Mesh(new THREE.BoxGeometry(.20,.05,.22),redAccentMat); headTop.name='body'; headTop.position.set(0,.15,0); head.add(headTop);
        const torso = new THREE.Mesh(new THREE.BoxGeometry(.55,.5,.3),armorMat); torso.name='body'; torso.position.y=1.15;
        const chestCore = new THREE.Mesh(new THREE.SphereGeometry(.08,16,16),redAccentMat); chestCore.name='body'; chestCore.position.set(0,1.15,.16);
        const shoulderL = new THREE.Mesh(new THREE.BoxGeometry(.22,.15,.25),redAccentMat); shoulderL.name='body'; shoulderL.position.set(-.38,1.35,0);
        const shoulderR = new THREE.Mesh(new THREE.BoxGeometry(.22,.15,.25),redAccentMat); shoulderR.name='body'; shoulderR.position.set(.38,1.35,0);
        const gunBody = new THREE.Mesh(new THREE.BoxGeometry(.07,.12,.4),armorMat); gunBody.name='body'; gunBody.position.set(.08,1.05,.58);
        const rightUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.35,8),armorMat); rightUpperArm.name='body'; rightUpperArm.position.set(.28,1.2,.18); rightUpperArm.rotation.x=-1.1;
        const rightLowerArm = new THREE.Mesh(new THREE.CylinderGeometry(.045,.04,.35,8),armorMat); rightLowerArm.name='body'; rightLowerArm.position.set(.15,1.06,.42); rightLowerArm.rotation.x=-1.5;
        const leftUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.35,8),armorMat); leftUpperArm.name='body'; leftUpperArm.position.set(-.28,1.2,.18); leftUpperArm.rotation.x=-1.1;
        const leftLowerArm = new THREE.Mesh(new THREE.CylinderGeometry(.045,.04,.35,8),armorMat); leftLowerArm.name='body'; leftLowerArm.position.set(.02,1.06,.44); leftLowerArm.rotation.x=-1.5; leftLowerArm.rotation.y=-.2;
        const waist = new THREE.Mesh(new THREE.CylinderGeometry(.12,.15,.2,8),darkMat); waist.name='body'; waist.position.y=.85;
        const hips = new THREE.Mesh(new THREE.BoxGeometry(.45,.2,.25),armorMat); hips.name='body'; hips.position.y=.7;
        const thighL = new THREE.Mesh(new THREE.CylinderGeometry(.08,.06,.45,8),armorMat); thighL.name='body'; thighL.position.set(-.15,.4,0); thighL.rotation.z=-.1;
        const thighR = new THREE.Mesh(new THREE.CylinderGeometry(.08,.06,.45,8),armorMat); thighR.name='body'; thighR.position.set(.15,.4,0); thighR.rotation.z=.1;
        const calfL = new THREE.Mesh(new THREE.CylinderGeometry(.06,.05,.45,8),darkMat); calfL.name='body'; calfL.position.set(-.18,.225,.05);
        const calfR = new THREE.Mesh(new THREE.CylinderGeometry(.06,.05,.45,8),darkMat); calfR.name='body'; calfR.position.set(.18,.225,-.05);
        root.add(neck,head,torso,chestCore,shoulderL,shoulderR,gunBody,rightUpperArm,rightLowerArm,leftUpperArm,leftLowerArm,waist,hips,thighL,thighR,calfL,calfR);
        root.userData.targetRadius=.72; root.userData.head=head;
        root.traverse((object)=>{if(object instanceof THREE.Mesh)object.castShadow=true;});
        return root;
      };
      const spawn = () => {
        targetSpawnAtRef.current = performance.now();
        if (drill === 'flick') {
          const root = flickMode === 'random' ? new THREE.Group() : buildRobot();
          if (flickMode === 'random') {
            const radius=difficultySize;
            const sphere=new THREE.Mesh(new THREE.SphereGeometry(radius,24,24),new THREE.MeshStandardMaterial({color:'#ff4655',emissive:'#7a111b',emissiveIntensity:.55,roughness:.35,metalness:.25}));
            sphere.name='target'; root.add(sphere); root.userData.targetRadius=radius; root.position.copy(findFlickPosition(radius));
          } else {
            const pos=findRobotPosition(.72); root.position.set(pos.x,HEADLINE_Y-1.65,pos.z);
          }
          group.add(root); targetRootRef.current=group; targetMeshRef.current=null; return;
        }
        if (targetRootRef.current) group.remove(targetRootRef.current);
        const root=buildRobot(); const robotRootY=HEADLINE_Y-1.65;
        if(drill==='braking') root.position.set((Math.random()-.5)*8,robotRootY,-8-Math.random()*1.5);
        else root.position.set(0,robotRootY,-9);
        group.add(root); targetRootRef.current=root; targetMeshRef.current=root.userData.head as THREE.Mesh; brakingMovedRef.current=false;
      };
      const raycaster = new THREE.Raycaster();
      const keys = new Set<string>();
      const velocity = new THREE.Vector3();
      const onPointerMove = (event: PointerEvent) => {
        if (statusRef.current !== 'active' || document.pointerLockElement !== renderer.domElement) return;
        const lookScale = THREE.MathUtils.degToRad(0.07) * sensitivityRef.current;
        yaw -= (event.movementX || 0) * lookScale;
        pitch = THREE.MathUtils.clamp(pitch - (event.movementY || 0) * lookScale, -1.08, 1.08);
        camera.rotation.set(pitch, yaw, 0);
      };
      const onShoot = (event: MouseEvent) => {
        if (statusRef.current !== 'active') return;
        event.preventDefault();
        if (document.pointerLockElement !== renderer.domElement) {
          renderer.domElement.requestPointerLock?.();
          return;
        }

        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const intersections = targetRootRef.current
          ? raycaster.intersectObject(targetRootRef.current, true)
          : [];

        const hitObject = intersections[0]?.object ?? null;
        const hitHead = intersections.find((item) =>
          drill === 'flick'
            ? (flickMode === 'random' ? item.object.name === 'target' : item.object.name === 'head')
            : item.object === targetMeshRef.current
        );
        const headHit = Boolean(hitHead);
        const bodyHit = intersections.length > 0 && !headHit;
        let hitRoot: THREE.Object3D | null = null;
        if (hitObject) {
          let cursor: THREE.Object3D | null = hitObject;
          while (cursor && cursor.parent && cursor.parent !== group) cursor = cursor.parent;
          hitRoot = cursor && cursor.parent === group ? cursor : null;
        }
        const reaction = performance.now() - targetSpawnAtRef.current;
        if (drill === 'flick' && Number.isFinite(reaction)) {
          reactionSamplesRef.current.push(reaction);
          if (reactionSamplesRef.current.length > 100) reactionSamplesRef.current.shift();
        }
        // 발사 오차는 발사 순간의 이동 상태를 측정합니다.
        // 정지 또는 확실한 브레이킹 상태에서는 0, 움직이는 중 발사하면 오차가 커집니다.
        const movementSpeed = velocity.length();
        const isBrakingStable = drill === 'braking'
          ? movementSpeed <= brakingStopThreshold
          : movementSpeed <= 0.06;
        const shotErrorValue = isBrakingStable ? 0 : Math.min(12, movementSpeed * 2.8);
        setShotError(shotErrorValue);
        setShotErrorHistory((current) => [...current.slice(-17), shotErrorValue]);
        const next = {
          ...statsRef.current,
          shots: statsRef.current.shots + 1,
          overshoots: statsRef.current.overshoots ?? 0,
        };

        const brakingMoving =
          drill === 'braking' && velocity.length() > brakingStopThreshold;

        const brakingNoMovement =
          drill === 'braking' && !brakingMovedRef.current;

        const shotDirection = new THREE.Vector3();
        camera.getWorldDirection(shotDirection);

        const tracerEnd = camera.position
          .clone()
          .addScaledVector(shotDirection, 30);

        fireVisual(tracerEnd);

        if (drill === 'braking' && brakingNoMovement) {
          next.streak = 0;
          next.overshoots = (next.overshoots ?? 0) + 1;
          next.score = Math.max(0, next.score - 20);

          if (feedbackEnabled) setFeedback({
            text: '쏘기 전에 움직이세요 -20',
            miss: true,
            id: Date.now(),
          });
        } else if (headHit && !brakingMoving) {
          next.hits += 1;
          next.streak += 1;
          next.maxStreak = Math.max(next.maxStreak ?? 0, next.streak);

          const stopQuality =
            drill === 'braking'
              ? Math.max(0, 1 - velocity.length() / .9)
              : 1;

          const points = Math.round(
            100 *
            (1 + Math.min(next.streak, 15) * .08) *
            (1 + stopQuality * .5) *
            (difficulty === 'hell'
              ? 1.55
              : difficulty === 'elite'
                ? 1.35
                : difficulty === 'trainee'
                ? .8
                : 1)
          );

          next.score += points;

          if (feedbackEnabled) setFeedback({
            text:
              drill === 'braking'
                ? `브레이킹 + 헤드샷 +${points}`
                : `헤드 명중 +${points}`,
            miss: false,
            id: Date.now(),
          });

          if (drill === 'flick' && hitRoot) {
            group.remove(hitRoot);
            hitRoot.traverse((object) => {
              if (object instanceof THREE.Mesh) {
                object.geometry.dispose();
                const material = object.material;
                if (Array.isArray(material)) material.forEach((m) => m.dispose());
                else material.dispose();
              }
            });
            spawn();
            targetRootRef.current = group;
            targetMeshRef.current = null;
          } else {
            spawn();
          }
        } else {
          next.streak = 0;
          next.score = Math.max(0, next.score - 20);

          if (feedbackEnabled) setFeedback({
            text: brakingMoving
              ? '쏘기 전에 움직이세요 -20'
              : bodyHit
                ? '몸통 명중 · 헤드라인 연습 실패 -20'
                : '빗나감 -20',
            miss: true,
            id: Date.now(),
          });
        }

        next.accuracy = next.shots
          ? (next.hits / next.shots) * 100
          : 0;

        if (drill === 'braking') brakingMovedRef.current = false;
        statsRef.current = next;
        setStats({ ...next });
      };
      const onKeyDown = (event: KeyboardEvent) => {
        const key = event.key.toLowerCase();
        if (['w', 'a', 's', 'd'].includes(key)) { keys.add(key); event.preventDefault(); }
      };
      const onKeyUp = (event: KeyboardEvent) => { keys.delete(event.key.toLowerCase()); };
      const onBlur = () => keys.clear();
      const onPointerLockChange = () => {
        const locked = document.pointerLockElement === renderer.domElement;
        setPointerLocked(locked);
      };
      const onCanvasClick = (event: MouseEvent) => onShoot(event);
      const moveSpeed = 4.5;
      const applyMovement = (delta: number) => {
        const horizontal = Number(keys.has('d')) - Number(keys.has('a'));
        const forwardInput = Number(keys.has('w')) - Number(keys.has('s'));
        const input = new THREE.Vector3(horizontal, 0, forwardInput);
        if (input.lengthSq() > 1) input.normalize();
        const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
        const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
        const desired = forward.multiplyScalar(input.z * moveSpeed).add(right.multiplyScalar(input.x * (drill === 'braking' ? 3.8 : moveSpeed)));
        if (drill === 'braking' && input.lengthSq() > 0) brakingMovedRef.current = true;
        const blend = 1 - Math.exp(-(input.lengthSq() > 0 ? (drill === 'braking' ? 18 : 32) : (drill === 'braking' ? 52 : 42)) * Math.min(delta, .05));
        velocity.lerp(desired, blend);
        camera.position.addScaledVector(velocity, delta);
        camera.position.x = THREE.MathUtils.clamp(camera.position.x, -10.5, 10.5);
        camera.position.z = THREE.MathUtils.clamp(camera.position.z, -5.7, 5.8);
        camera.position.y = 1.6;
      };
      renderer.domElement.addEventListener('pointermove', onPointerMove); renderer.domElement.addEventListener('click', onCanvasClick); document.addEventListener('pointerlockchange', onPointerLockChange); window.addEventListener('keydown', onKeyDown); window.addEventListener('keyup', onKeyUp); window.addEventListener('blur', onBlur);
      const resize = () => { if (!mount || !renderer) return; camera.aspect = mount.clientWidth / mount.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(mount.clientWidth, mount.clientHeight); };
      window.addEventListener('resize', resize);
      const trackingState = {
        direction: Math.random() < .5 ? -1 : 1,
        velocity: 0,
        timer: .35 + Math.random() * .45,
      };
      let frame = 0; let previous = performance.now();
      let fpsFrames = 0; let fpsStarted = performance.now();
      const animate = (now: number) => {
        frame = requestAnimationFrame(animate);
        const delta = Math.min((now - previous) / 1000, .05);
        previous = now;
        fpsFrames += 1;
        if (now - fpsStarted >= 500) {
          setFps(Math.round(fpsFrames * 1000 / (now - fpsStarted)));
          fpsFrames = 0;
          fpsStarted = now;
        }
        if (statusRef.current === 'active') {
          applyMovement(delta);
          recoilKick = THREE.MathUtils.damp(recoilKick, 0, 14, delta);
          recoilRoll = THREE.MathUtils.damp(recoilRoll, 0, 12, delta);
          weapon.position.z = baseWeaponZ + recoilKick;
          weapon.position.y = baseWeaponY + recoilKick * .32;
          weapon.rotation.x = -.03 + recoilKick * 1.7;
          weapon.rotation.z = -.02 + recoilRoll;
          if (aimCoach) {
            // 피드백은 타겟의 머리/히트박스를 사용하지 않고 고정 헤드라인만 기준으로 합니다.
            const screenHeight = renderer.domElement.clientHeight;
            const cameraDirection = new THREE.Vector3();
            camera.getWorldDirection(cameraDirection);

            let headlineX = 0;
            if (Math.abs(cameraDirection.z) > 0.0001) {
              const t = (HEADLINE_Z - camera.position.z) / cameraDirection.z;
              if (t > 0) {
                headlineX = THREE.MathUtils.clamp(
                  camera.position.x + cameraDirection.x * t,
                  -HEADLINE_HALF_WIDTH,
                  HEADLINE_HALF_WIDTH,
                );
              }
            }

            const headlineScreen = new THREE.Vector3(
              headlineX,
              HEADLINE_Y,
              HEADLINE_Z,
            ).project(camera);
            const headlineYpx = (1 - headlineScreen.y) * .5 * screenHeight;
            const crosshairY = screenHeight * .5;
            const pixelPadding = 4;
            const deltaY = crosshairY - headlineYpx;

            const nextAimState: 'low' | 'high' | 'ok' =
              Math.abs(deltaY) <= pixelPadding
                ? 'ok'
                : deltaY < 0
                  ? 'high'
                  : 'low';

            setAimCoachState(nextAimState);
            setAimCoachWarning(nextAimState !== 'ok');
            aimGuide.visible = true;
          } else {
            setAimCoachState('ok');
            setAimCoachWarning(false);
            aimGuide.visible = false;
          }
          if (drill === 'tracking' && targetRootRef.current) {
            // Valorant-style strafing: the bot stays grounded and moves in
            // unpredictable left/right bursts instead of floating in an orbit.
            const root = targetRootRef.current;
            const maxX = difficulty === 'hell' ? 3.0 : difficulty === 'elite' ? 3.15 : difficulty === 'trainee' ? 3.9 : 3.55;
            const tracking = trackingState;

            // Pick a new strafe direction after each segment. Same-direction
            // repeats are intentionally possible (e.g. L-L-L-R-R-L).
            if (tracking.timer <= 0) {
              const atLeft = root.position.x <= -maxX + .08;
              const atRight = root.position.x >= maxX - .08;
              if (atLeft) tracking.direction = 1;
              else if (atRight) tracking.direction = -1;
              else if (Math.random() < .38) tracking.direction *= -1;
              else tracking.direction = Math.random() < .5 ? -1 : 1;

              tracking.timer = .42 + Math.random() * .62;
            }

            const distanceToEdge = maxX - Math.abs(root.position.x);
            const edgeSlowdown = THREE.MathUtils.clamp(distanceToEdge / .8, .22, 1);
            const targetSpeed = (difficulty === 'hell' ? 3.25 : difficulty === 'elite' ? 2.7 : 3.05) * edgeSlowdown;
            const accel = 10.5;
            tracking.velocity = THREE.MathUtils.damp(tracking.velocity, tracking.direction * targetSpeed, accel, delta);

            root.position.x += tracking.velocity * delta;
            root.position.x = THREE.MathUtils.clamp(root.position.x, -maxX, maxX);
            root.position.y = HEADLINE_Y - 1.65;
            root.position.z = -9.0;
            root.rotation.y = 0;

            tracking.timer -= delta;
          }
        }
        renderer.render(scene, camera);
      };
      frame = requestAnimationFrame(animate);
      return () => {
        aimCoachGuideRef.current = null;
        aimGuideGeometry.dispose();
        aimGuideMaterial.dispose();
        cancelAnimationFrame(frame); renderer.domElement.removeEventListener('pointermove', onPointerMove); renderer.domElement.removeEventListener('click', onCanvasClick); document.removeEventListener('pointerlockchange', onPointerLockChange); window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); window.removeEventListener('blur', onBlur); window.removeEventListener('resize', resize); if (document.pointerLockElement === renderer.domElement) document.exitPointerLock(); renderer.dispose(); mount.removeChild(renderer.domElement); };
    }, [difficulty, drill, finish, difficultySize, flickBotCount, flickMode]);

    useEffect(() => {
      const timer = window.setInterval(() => {
        if (statusRef.current !== 'active') return;
        timeRef.current = Math.max(0, timeRef.current - .1);
        setTimeLeft(timeRef.current);
        if (timeRef.current <= 0) finish();
      }, 100);
      return () => window.clearInterval(timer);
    }, [finish]);
    const togglePause = () => {
      const next = statusRef.current === 'active' ? 'paused' : 'active';
      if (next === 'paused' && document.pointerLockElement) document.exitPointerLock();
      statusRef.current = next;
      setStatus(next);
    };
    const exit = () => {
      if (document.pointerLockElement) document.exitPointerLock();
      finish();
    };
    return (
      <div className="range-screen">
        <div
          ref={mountRef}
          className="range-canvas-wrap"
          data-testid="canvas-3d-range"
        />

        <div className="range-hud">
          <div className="hud-top">
            <div className="hud-brand">
              <b>SANGHYEON 01</b>
              {' / '}
              {drill === 'flick'
                ? '플릭 조준'
                : drill === 'tracking'
                  ? '트래킹 조준'
                  : '브레이킹'}
              {' / 진행 중'}
            </div>

            <div className="hud-actions">
              <button
                className="hud-button"
                onClick={() => setSettingsOpen(true)}
                aria-label="훈련 설정 열기"
                data-testid="button-range-settings"
              >
                <Settings2 size={16} />
              </button>

              <button
                className="hud-button"
                onClick={togglePause}
                aria-label={
                  status === 'paused'
                    ? '훈련 재개'
                    : '훈련 일시정지'
                }
                data-testid="button-pause-run"
              >
                {status === 'paused' ? (
                  <Play size={16} />
                ) : (
                  <Pause size={16} />
                )}
              </button>

              <button
                className="hud-button"
                onClick={exit}
                aria-label="훈련 종료"
                data-testid="button-exit-run"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          <div className="hud-metrics">
            <div className="hud-stat accent">
              <label>점수</label>
              <strong data-testid="telemetry-score">
                {stats.score.toString().padStart(4, '0')}
              </strong>
            </div>

            <div className="hud-stat">
              <label>명중률</label>
              <strong data-testid="telemetry-accuracy">
                {stats.accuracy.toFixed(1)}%
              </strong>
            </div>

            <div className="hud-stat">
              <label>연속 명중</label>
              <strong data-testid="telemetry-streak">
                {stats.streak.toString().padStart(2, '0')}
              </strong>
            </div>
          </div>

          <div
            className={`hud-time ${timeLeft < 5 ? 'low' : ''
              }`}
          >
            <label>남은 시간</label>
            <strong data-testid="telemetry-time">
              {timeLeft.toFixed(1)}초
            </strong>
          </div>

          <CrosshairView
            config={settings.crosshair}
            className="crosshair-live"
          />

          {aimCoach && aimCoachWarning && aimCoachState !== 'ok' && (
            <div className={`aim-coach-warning ${aimCoachState === 'high' ? 'high' : ''}`}>
              {aimCoachState === 'high'
                ? '↓ 에임이 너무 높습니다 · 헤드라인 아래로 내리세요'
                : '↑ 에임이 너무 낮습니다 · 헤드라인 위로 올리세요'}
            </div>
          )}

          {drill === 'braking' && (
            <div className="braking-guide">
              <b>브레이킹 · 카운터 스트레이프</b>
              <span>
                A / D 이동 후 반대 방향 입력으로 완전히 멈춘
                뒤 조준선이 안정되면 CLICK
              </span>
            </div>
          )}

          {feedback && (
            <div
              key={feedback.id}
              className={`hit-feedback ${feedback.miss ? 'miss' : ''
                }`}
            >
              {feedback.text}
            </div>
          )}

          {!pointerLocked && status === 'active' && (
            <div className="pointer-lock-hint">
              클릭하여 시점 고정 · 조준 시작
            </div>
          )}

          {settings.telemetryMode !== 'off' && (
            <div className="range-telemetry">
              {(settings.telemetryMode === 'text' || settings.telemetryMode === 'both') && (
                <div className="telemetry-text">
                  <span>FPS <b>{fps || '--'}</b></span>
                  <span>발사 오차 <b>{shotError === null ? '--' : `${shotError.toFixed(2)}°`}</b></span>
                </div>
              )}
              {(settings.telemetryMode === 'graph' || settings.telemetryMode === 'both') && (
                <div className="telemetry-graph">
                  <span className="telemetry-graph-title">SHOT ERROR</span>
                  <div className="telemetry-bars">
                    {shotErrorHistory.length === 0
                      ? [...Array(18)].map((_, i) => <i key={i} className="telemetry-idle-dot" />)
                      : shotErrorHistory.map((value, i) => (
                        <i
                          key={i}
                          className={value > 0 ? 'telemetry-error-bar' : 'telemetry-stable-bar'}
                          style={{ height: String(Math.max(value > 0 ? 10 : 7, value * 7 + 7)) + '%' }}
                        />
                      ))}
                  </div>
                  <small>미발사 · 정지 발사 0 · 이동 발사 오차</small>
                </div>
              )}
            </div>
          )}

          <div className="hud-bottom">
            <div className="move-hint">
              <span>이동</span>
              <kbd>W</kbd>
              <kbd>A</kbd>
              <kbd>S</kbd>
              <kbd>D</kbd>
              <span>마우스 시점 / 클릭 사격</span>
            </div>

            <div className="range-status">
              <Gauge
                size={13}
                style={{
                  verticalAlign: 'middle',
                  marginRight: 7,
                }}
              />
              시작 프로토콜{' '}
              <b>
                {difficulty === 'trainee'
                  ? '연습생'
                  : difficulty === 'elite'
                    ? '엘리트'
                    : '요원'}
              </b>
            </div>
          </div>
        </div>

        {status === 'paused' && (
          <div className="modal-dim">
            <div className="pause-modal">
              <Pause
                size={25}
                color="hsl(71 100% 61%)"
              />

              <h2>훈련 일시정지</h2>

              <p>
                시간이 멈춰 있습니다. 준비가 되면 계속하세요.
              </p>

              <div className="modal-actions">
                <button
                  className="secondary-button"
                  onClick={togglePause}
                  data-testid="button-resume-run"
                >
                  <Play
                    size={13}
                    style={{
                      verticalAlign: 'middle',
                      marginRight: 7,
                    }}
                  />
                  계속하기
                </button>

                <button
                  className="danger-button"
                  onClick={exit}
                  data-testid="button-exit-paused"
                >
                  훈련 종료
                </button>
              </div>
            </div>
          </div>
        )}

        {settingsOpen && (
          <SettingsPanel
            settings={settings}
            onChange={onSettingsChange}
            onClose={() => setSettingsOpen(false)}
          />
        )}
      </div>
    );
  }
  function SensitivityPage({
    settings,
    onChange,
    onBack,
  }: {
    settings: Settings;
    onChange: (s: Settings) => void;
    onBack: () => void;
  }) {
    const [dpi, setDpi] = useState(800);
    const [sens, setSens] = useState(
      Number((settings.sensitivity * 0.35).toFixed(3)),
    );
    const [candidate, setCandidate] = useState<number | null>(null);
    const [hits, setHits] = useState(0);
    const [total, setTotal] = useState(0);
    const [running, setRunning] = useState(false);
    const [target, setTarget] = useState({ x: 50, y: 50 });

    const edpi = dpi * sens;
    const cm360 = 360 / (0.022 * dpi * sens);

    const candidates = [0.8, 0.9, 1, 1.1, 1.2].map((m) =>
      Number((sens * m).toFixed(3)),
    );

    const start = (value: number) => {
      setCandidate(value);
      setHits(0);
      setTotal(0);
      setTarget({
        x: 12 + Math.random() * 76,
        y: 12 + Math.random() * 76,
      });
      setRunning(true);
    };

    const hit = () => {
      if (!running) return;

      const nextTotal = total + 1;

      setTotal(nextTotal);
      setHits((value) => value + 1);

      if (nextTotal >= 10) {
        setRunning(false);
      } else {
        setTarget({
          x: 12 + Math.random() * 76,
          y: 12 + Math.random() * 76,
        });
      }
    };

    const applyCandidate = () => {
      if (candidate === null) return;

      onChange({
        ...settings,
        sensitivity: Math.max(
          0.4,
          Math.min(2.4, candidate / 0.35),
        ),
      });
    };

    return (
      <main className="tool-page">
        <header className="tool-header">
          <button className="back-btn" onClick={onBack}>
            AIM LAB
          </button>

          <div>
            <p className="eyebrow">
              SENSITIVITY LAB // CALIBRATION
            </p>
            <h1>감도 찾기</h1>
          </div>

          <div className="game-help">
            eDPI {Math.round(edpi)}
          </div>
        </header>

        <section className="tool-hero panel">
          <div>
            <p className="eyebrow">MOUSE CALIBRATION</p>

            <h2>나에게 맞는 감도를 찾습니다.</h2>

            <p>
              현재 DPI와 감도를 입력하고 후보 감도를 비교한 뒤
              3D 훈련에 적용하세요.
            </p>
          </div>

          <div className="tool-hero-stats">
            <span>
              <small>eDPI</small>
              <b>{Math.round(edpi)}</b>
            </span>

            <span>
              <small>CM / 360</small>
              <b>{cm360.toFixed(1)}</b>
            </span>
          </div>
        </section>

        <section className="tool-grid sensitivity-grid">
          <article className="tool-card static">
            <b>DPI</b>

            <input
              className="large-input"
              type="number"
              value={dpi}
              onChange={(event) =>
                setDpi(Number(event.target.value) || 800)
              }
            />

            <span>마우스 DPI</span>
          </article>

          <article className="tool-card static">
            <b>VALORANT SENS</b>

            <input
              className="large-input"
              type="number"
              min="0.05"
              max="2"
              step="0.01"
              value={sens}
              onChange={(event) =>
                setSens(Number(event.target.value) || 0.35)
              }
            />

            <span>게임 내 감도</span>
          </article>
        </section>

        <section className="section">
          <div className="section-title">
            <div>
              <p className="eyebrow">CANDIDATES</p>
              <h2>후보 감도 비교</h2>
            </div>
          </div>

          <div className="candidate-grid">
            {candidates.map((value) => (
              <button
                key={value}
                className={`candidate-card ${candidate === value ? 'selected' : ''
                  }`}
                onClick={() => start(value)}
              >
                <small>
                  {value === sens ? 'CURRENT' : 'CANDIDATE'}
                </small>

                <strong>{value.toFixed(3)}</strong>

                <span>
                  eDPI {Math.round(dpi * value)}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section-title">
            <div>
              <p className="eyebrow">
                MICRO TEST // 10 TARGETS
              </p>

              <h2>
                {running
                  ? `테스트 진행 ${total}/10`
                  : total >= 10
                    ? '테스트 완료'
                    : '후보를 선택하세요'}
              </h2>
            </div>
          </div>

          <div className="sensitivity-test panel">
            {running && (
              <button
                className="sensitivity-target"
                style={{
                  left: `${target.x}%`,
                  top: `${target.y}%`,
                }}
                onClick={hit}
                aria-label="감도 테스트 타겟"
              />
            )}

            {!running && (
              <div className="sensitivity-test-empty">
                {total >= 10
                  ? `선택 감도 ${candidate?.toFixed(3)} · 명중 ${hits}/${total}`
                  : '후보 감도를 하나 선택하면 10회 타겟 테스트가 시작됩니다.'}
              </div>
            )}
          </div>

          {candidate !== null && !running && total >= 10 && (
            <div className="setup-row">
              <div>
                <span className="field-label">
                  테스트 정확도
                </span>

                <strong>
                  {Math.round((hits / total) * 100)}%
                </strong>
              </div>

              <button
                className="start-button"
                onClick={applyCandidate}
              >
                이 감도를 3D에 적용
              </button>
            </div>
          )}
        </section>
      </main>
    );
  }
  function Results({ stats, onAgain, onHome }: { stats: RunStats; onAgain: () => void; onHome: () => void }) {
    const protocol = stats.drill === 'flick' ? 'FLICK' : stats.drill === 'tracking' ? 'TRACKING' : 'BRAKING';
    const reaction = stats.avgReaction ?? 0;
    const reactionScore = reaction ? Math.max(0, Math.min(100, 100 - Math.max(0, reaction - 250) / 8)) : stats.accuracy;
    const sessionScore = Math.max(0, Math.min(100, Math.round(stats.accuracy * .72 + reactionScore * .28)));
    const grade = sessionScore >= 90 ? 'A' : sessionScore >= 80 ? 'B+' : sessionScore >= 70 ? 'B' : sessionScore >= 60 ? 'C' : 'D';
    const aimGrade = stats.accuracy >= 90 ? 'GOOD' : stats.accuracy >= 75 ? 'FAIR' : 'POOR';
    const reactionGrade = !reaction ? '--' : reaction <= 450 ? 'GOOD' : 'POOR';
    const weakest = (stats.overshoots ?? 0) >= Math.max(2, Math.ceil(stats.shots * .12)) ? 'CHAOS' : 'PRECISION';
    const strongest = stats.accuracy >= 90 ? 'LONG' : 'CLEAN';
    const coaching = weakest === 'CHAOS'
      ? `CHAOS 패턴에서 ${stats.hits}/${stats.shots} 적중. 다음 세션은 이 패턴의 첫 이동을 더 작고 빠르게 가져가.`
      : `명중률 ${stats.accuracy.toFixed(1)}%. 다음 세션은 첫 조준을 더 안정적으로 가져가.`;
    return (
      <div className="aim-app results-screen">
        <div className="results-shell modern-results">
          <div className="results-top"><Brand /><div className="results-kicker">FLICK RESULT</div></div>
          <div className="result-identity">
            <div>
              <p className="eyebrow">SANGHYEON AIM LAB // {protocol} RESULT</p>
              <h1>{protocol} RESULT</h1>
              <span className="result-difficulty">HEADLINE · NEWBIE</span>
            </div>
            <div className="result-score-hero"><strong>{sessionScore}</strong><span>/ 100</span><b>SESSION SCORE</b><em>{grade}</em></div>
          </div>
          <section className="result-primary-metrics">
            <div><span>ACCURACY</span><strong>{stats.accuracy.toFixed(1)}%</strong></div>
            <div><span>AVG REACTION</span><strong>{reaction ? `${reaction.toFixed(1)}ms` : '--'}</strong></div>
            <div><span>BEST REACTION</span><strong>{stats.bestReaction ? `${stats.bestReaction.toFixed(1)}ms` : '--'}</strong></div>
            <div><span>MAX COMBO</span><strong>{stats.maxStreak ?? stats.streak}</strong></div>
          </section>
          <section className="result-core">
            <div className="result-section-title"><span>핵심 결과</span><small>이번 세션에서 가장 먼저 확인할 수치입니다.</small></div>
            <div className="result-hit-line"><strong>{stats.hits} / {stats.shots}</strong><span>HITS / SHOTS</span><b>{stats.overshoots ?? 0}</b><small>OVERSHOOTS</small></div>
            <div className="result-pattern-grid">
              <div><b>{weakest}</b><span>WEAKEST PATTERN</span></div>
              <div><b>{strongest}</b><span>STRONGEST PATTERN</span></div>
              <div><b>{reactionGrade}</b><span>REACTION</span></div>
              <div><b>{aimGrade}</b><span>AIM ACCURACY</span></div>
            </div>
          </section>
          <section className="coaching-card">
            <span>COACHING</span>
            <p>{coaching}</p>
          </section>
          <div className="result-actions">
            <button className="start-button" onClick={onAgain}><RotateCcw size={15} /> 다시 훈련</button>
            <button className="secondary-button" onClick={onHome}>훈련 선택으로</button>
          </div>
          <footer className="results-footer"><span>LAB</span><span>기록은 브라우저에 자동 저장됩니다</span></footer>
        </div>
      </div>
    );
  }
  function GrowthPage({
    history,
    onBack,
  }: {
    history: HistoryItem[];
    onBack: () => void;
  }) {
    const best = history.length
      ? Math.max(...history.map((item) => item.score))
      : 0;

    const avg = history.length
      ? Math.round(
        history
          .slice(0, 7)
          .reduce((sum, item) => sum + item.score, 0) /
        Math.min(7, history.length),
      )
      : 0;

    const modules: Drill[] = [
      'flick',
      'tracking',
      'braking',
    ];

    const moduleName = (type: Drill) => {
      if (type === 'flick') return 'FLICK';
      if (type === 'tracking') return 'TRACKING';
      return 'BRAKING';
    };

    return (
      <main className="tool-page">
        <header className="tool-header">
          <button className="back-btn" onClick={onBack}>
            AIM LAB
          </button>

          <div>
            <p className="eyebrow">
              PROGRESS DATABASE // DETAILED
            </p>

            <h1>성장 기록</h1>
          </div>

          <div className="game-help">
            {history.length} SESSIONS
          </div>
        </header>

        <section className="growth-overview panel">
          <div>
            <p className="eyebrow">
              WHAT AM I IMPROVING?
            </p>

            <h2>점수 하나만 보지 않습니다.</h2>

            <p>
              모드별 최고 기록과 최근 기록을 비교해서
              훈련 흐름과 성장 추이를 확인합니다.
            </p>
          </div>

          <div className="growth-overview-stats">
            <span>
              <small>SESSIONS</small>
              <b>{history.length}</b>
            </span>

            <span>
              <small>BEST</small>
              <b>{best || '--'}</b>
            </span>

            <span>
              <small>LAST 7 AVG</small>
              <b>{avg || '--'}</b>
            </span>
          </div>
        </section>

        <section className="growth-cards">
          {modules.map((type) => {
            const rows = history.filter(
              (item) => item.drill === type,
            );

            const bestType = rows.length
              ? Math.max(...rows.map((item) => item.score))
              : 0;

            const last = rows[0];

            return (
              <article
                className={`growth-module panel ${type}`}
                key={type}
              >
                <div className="growth-module-head">
                  <span>{moduleName(type)}</span>
                  <b>{rows.length}회</b>
                </div>

                <div className="growth-main">
                  <strong>{bestType || '--'}</strong>
                  <small>BEST SCORE</small>
                </div>

                <div className="growth-detail-grid">
                  <div>
                    <small>최근 점수</small>
                    <b>{last?.score ?? '--'}</b>
                  </div>

                  <div>
                    <small>최근 명중률</small>
                    <b>
                      {last
                        ? `${last.accuracy.toFixed(1)}%`
                        : '--'}
                    </b>
                  </div>

                  <div>
                    <small>최근 연속</small>
                    <b>{last?.streak ?? '--'}</b>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <section className="growth-timeline panel">
          {history.length ? (
            history.map((record, index) => (
              <div
                className="growth-row"
                key={`${record.date}-${record.score}-${index}`}
              >
                <time>{record.date}</time>

                <b>{record.drill.toUpperCase()}</b>

                <strong>{record.score}</strong>

                <span>
                  {record.accuracy.toFixed(1)}% ACC ·{' '}
                  {record.hits ?? 0}/{record.shots ?? 0} HITS
                </span>
              </div>
            ))
          ) : (
            <div className="empty">
              아직 완료한 훈련 기록이 없습니다.
            </div>
          )}
        </section>
      </main>
    );
  }

  function SettingsPage({ settings, onChange, onBack }: { settings: Settings; onChange: (next: Settings) => void; onBack: () => void }) {
    return (
      <main className="tool-page crosshair-page">
        <header className="tool-header">
          <button className="back-btn" onClick={onBack}>AIM LAB</button>
          <div>
            <p className="eyebrow">SETTINGS // GLOBAL</p>
            <h1>설정</h1>
          </div>
          <div className="game-help">3D RANGE</div>
        </header>
        <section className="crosshair-config-shell panel">
          <div className="crosshair-big-preview"><CrosshairView config={settings.crosshair} /></div>
          <div className="crosshair-config-body">
            <div className="preset-row">
              {Object.entries(CROSSHAIR_PRESETS).map(([name, preset]) => (
                <button key={name} className={`preset ${settings.crosshair.style === preset.style && settings.crosshair.size === preset.size ? 'selected' : ''}`} onClick={() => onChange({ ...settings, crosshair: { ...preset } })}>{name}</button>
              ))}
            </div>
            <div className="crosshair-config-grid">
              <label>색상<input type="color" value={settings.crosshair.color} onChange={(e) => onChange({ ...settings, crosshair: { ...settings.crosshair, color: e.target.value } })} /></label>
              <label>크기<input type="range" min="18" max="60" value={settings.crosshair.size} onChange={(e) => onChange({ ...settings, crosshair: { ...settings.crosshair, size: Number(e.target.value) } })} /></label>
              <label>간격<input type="range" min="0" max="14" value={settings.crosshair.gap} onChange={(e) => onChange({ ...settings, crosshair: { ...settings.crosshair, gap: Number(e.target.value) } })} /></label>
              <label>두께<input type="range" min="1" max="5" value={settings.crosshair.thickness} onChange={(e) => onChange({ ...settings, crosshair: { ...settings.crosshair, thickness: Number(e.target.value) } })} /></label>
            </div>
            <div className="crosshair-toggles">
              <label><input type="checkbox" checked={settings.crosshair.outline} onChange={(e) => onChange({ ...settings, crosshair: { ...settings.crosshair, outline: e.target.checked } })} /> 외곽선</label>
              <label><input type="checkbox" checked={settings.crosshair.centerDot} onChange={(e) => onChange({ ...settings, crosshair: { ...settings.crosshair, centerDot: e.target.checked } })} /> 중앙 점</label>
            </div>
            <div className="settings-subsection">
              <p className="eyebrow">CROSSHAIR</p>
              <strong>조준선 설정</strong>
            </div>
            <div className="settings-subsection telemetry-settings">
              <p className="eyebrow">RANGE TELEMETRY</p>
              <strong>현재 프레임 / 발사 오차 표시</strong>
              <div className="telemetry-mode-grid">
                {([
                  ['off', '표시안함'],
                  ['text', '텍스트표시'],
                  ['graph', '그래프보기'],
                  ['both', '둘다보기'],
                ] as const).map(([value, label]) => (
                  <button key={value} className={settings.telemetryMode === value ? 'selected' : ''} onClick={() => onChange({ ...settings, telemetryMode: value })}>{label}</button>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  function HomeRoute() {
    const [view, setView] = useState<View>('home');
    const [settings, setSettings] = useState<Settings>(() => normalizeSettings(readStorage('sanghyeon-settings', DEFAULT_SETTINGS)));
    const [history, setHistory] = useState<HistoryItem[]>(() => readStorage('sanghyeon-history', []));
    const [config, setConfig] = useState<TrainingConfig>({ drill: 'flick', duration: 30, difficulty: 'operator', feedbackEnabled: true, aimCoach: false, flickBotCount: 3, flickMode: 'random' });
    const [results, setResults] = useState<RunStats | null>(null);
    useEffect(() => saveStorage('sanghyeon-settings', settings), [settings]);
    const start = (drill: Drill, duration: number, difficulty: string, feedbackEnabled = true, aimCoach = false, flickMode: FlickMode = 'random', flickBotCount = 3) => { setConfig({ drill, duration, difficulty, feedbackEnabled, aimCoach, flickBotCount, flickMode }); setView('range'); };
    const complete = (stats: RunStats) => { setResults(stats); const item: HistoryItem = { score: stats.score, accuracy: stats.accuracy, drill: stats.drill, hits: stats.hits, shots: stats.shots, streak: stats.streak, date: new Date().toLocaleDateString('ko-KR') }; const next = [item, ...history].slice(0, 50); setHistory(next); saveStorage('sanghyeon-history', next); setView('results'); };
    if (view === 'home') return <Home settings={settings} onSettings={() => undefined} onStart={start} history={history} onNavigate={setView} onSettingsChange={setSettings} onSelectDrill={(drill) => { setConfig((current) => ({ ...current, drill })); setView('setup'); }} />;
    if (view === 'setup') return <TrainingSetup drill={config.drill} onStart={start} onBack={() => setView('home')} />;
    if (view === 'range') return <RangeScene {...config} settings={settings} onSettingsChange={setSettings} onFinish={complete} />;
    if (view === 'sensitivity') return <SensitivityPage settings={settings} onChange={setSettings} onBack={() => setView('home')} />;
    if (view === 'growth') return <GrowthPage history={history} onBack={() => setView('home')} />;
    if (view === 'crosshair') return <SettingsPage settings={settings} onChange={setSettings} onBack={() => setView('home')} />;
    return results ? <Results stats={results} onAgain={() => setView('range')} onHome={() => setView('home')} /> : null;
  }

function Router() {
  return (
    <ErrorBoundary>
      <Switch>
        <Route path="/" component={HomeRoute} />
        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;