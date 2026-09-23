import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { Crosshair, Gauge, Keyboard, Pause, Play, RotateCcw, Settings2, Target, X } from 'lucide-react';
import * as THREE from 'three';
import { CROSSHAIR_PRESETS, DEFAULT_CROSSHAIR, DEFAULT_KEYBINDS, DEFAULT_SETTINGS, normalizeSettings, WEAPONS } from './game/config';
import { TRAINING_MAPS, buildTrainingWorld } from './game/trainingMaps';
import type { BotBehavior, CrosshairConfig, Drill, FlickMode, HistoryItem, Keybinds, RunStats, RunStatus, Settings, TrainingConfig, TrainingMapId, View, WeaponId } from './game/types';
import { readStorage, saveStorage } from './persistence/storage';

const queryClient = new QueryClient();

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
  onEnterRange,
}: {
  settings: Settings;
  onSettings: () => void;
  onStart: (drill: Drill, duration: number, difficulty: string, feedbackEnabled?: boolean, aimCoach?: boolean, flickMode?: FlickMode, flickBotCount?: number) => void;
  history: HistoryItem[];
  onNavigate: (view: View) => void;
  onSettingsChange: (next: Settings) => void;
  onSelectDrill: (drill: Drill) => void;
  onEnterRange: () => void;
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
    flick: { icon: '🎯', tag: '01', title: 'FLICK', korean: '정밀 전환', desc: '타겟이 나오면 바로 끌어가서 맞히는 기본 플릭 훈련.', active: true },
    reaction: { icon: '⚡', tag: '02', title: '시각반응', korean: '반응속도', desc: '언제 뜰지 모르는 신호를 보고 얼마나 빨리 반응하는지 확인.', active: false },
    tracking: { icon: '◎', tag: '02', title: 'TRACKING', korean: '움직임 추적', desc: '움직이는 타겟을 놓치지 않고 따라가는 연습.', active: true },
    braking: { icon: '↔', tag: '03', title: 'BRAKING', korean: '브레이킹', desc: 'A/D 반전으로 멈추고 바로 쏘는 감각을 잡는 훈련.', active: true },
    switching: { icon: '🔀', tag: '04', title: 'SWITCHING', korean: '타겟 스위칭', desc: '하나 잡자마자 다음 타겟으로 얼마나 빨리 넘어가는지 본다.', active: false },
    micro: { icon: '✦', tag: '05', title: 'MICRO FLICK', korean: '미세 플릭', desc: '짧은 거리에서 오버슈트 없이 딱 붙여 맞히는 연습.', active: false },
  };

  return (
    <div className="aim-app">
      <header className="app-header">
        <Brand />

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
              AIM TRAINING
              <br />
              <em>START HERE.</em>
            </h1>

            <p className="hero-copy">
              훈련할 모드를 고르고 시설로 바로 들어가세요.
              <br />
              세션과 장비 설정은 시설 터미널에서 조정할 수 있습니다.
            </p>
            <button className="facility-entry-button" onClick={onEnterRange}>
              훈련 시설 입장 <span>ENTER FACILITY ↗</span>
            </button>
          </section>

          <section className="training-section">
            <div className="section-title">
              <div>
                <p className="eyebrow">TRAINING MODULES</p>
                <h2>훈련실</h2>
              </div>

              <span className="phase">3 ACTIVE MODULES</span>
            </div>

            <div className="drill-grid">
              {(Object.keys(drillInfo) as Drill[]).filter((type) => drillInfo[type].active).map((type) => {
                const item = drillInfo[type];
                const selected = drill === type;

                return (
                  <button
                    key={type}
                    className={`drill-card ${selected ? 'selected' : ''} ${item.active ? '' : 'disabled'}`}
                    onClick={() => { if (item.active) { setDrill(type); onSelectDrill(type); } }}
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

        <aside className="home-quick-actions">
          <div className="panel-kicker">
            <span>LAB CONTROL</span>
            <span>READY</span>
          </div>
          <h2 className="panel-title">훈련 도구</h2>
          <div className="quick-action-grid">
            <button onClick={() => onNavigate('sensitivity')}>
              <span>01</span>
              <div><strong>감도 설정</strong><small>VALORANT 감도 / eDPI</small></div>
              <b>→</b>
            </button>
            <button onClick={() => onNavigate('growth')}>
              <span>02</span>
              <div><strong>연습 기록</strong><small>전체 세션과 성장 추이</small></div>
              <b>→</b>
            </button>
            <button onClick={() => onNavigate('crosshair')}>
              <span>03</span>
              <div><strong>설정</strong><small>조준선 / 훈련 표시</small></div>
              <b>→</b>
            </button>
          </div>
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
  onStart: (drill: Drill, duration: number, difficulty: string, feedbackEnabled?: boolean, aimCoach?: boolean, flickMode?: FlickMode, flickBotCount?: number) => void;
  onBack: () => void;
}) {
  const [difficulty, setDifficulty] = useState('operator');
  const [duration, setDuration] = useState(30);
  const [feedbackEnabled, setFeedbackEnabled] = useState(true);
  const [aimCoach, setAimCoach] = useState(false);
  const [flickBotCount, setFlickBotCount] = useState(3);
  const [flickMode, setFlickMode] = useState<FlickMode>('random');
  const [launchStep, setLaunchStep] = useState<null | 'count'>(null);

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

        {drill === 'flick' && (
        <section className="setup-section setup-mode-section">
          <div className="setup-section-head">
            <span>02</span>
            <div>
              <h2>TRAINING MODE</h2>
              <p>어디를 맞힐지 선택해.</p>
            </div>
          </div>

          <div className="mode-options">
            {([
              ['random', 'RANDOM', '전방위', '화면 상하좌우에 구형 타겟이 랜덤 등장'],
              ['headline', 'HEADLINE', '헤드라인', '화면 중앙 높이에 로봇 타겟이 등장'],
              ['robot', 'ROBOT HEAD', '훈련봇', '훈련봇의 머리 중심을 정확히 클릭'],
            ] as const).map(([id, title, label, desc], index) => (
              <button
                key={id}
                type="button"
                className={`training-mode-card ${flickMode === id ? 'selected' : ''}`}
                onClick={() => setFlickMode(id)}
              >
                <span className="training-mode-index">0{index + 1}</span>
                <span className="training-mode-copy">
                  <strong>{title}</strong>
                  <b>{label}</b>
                  <small>{desc}</small>
                </span>
                <span className="training-mode-check">
                  {flickMode === id ? '✓ SELECTED' : '→'}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

        <section className="setup-section feedback-section">
          <div className="setup-section-head">
            <span>{drill === 'flick' ? '03' : '02'}</span>
            <div><h2>FEEDBACK</h2><p>훈련 중 표시할 교정 기능을 선택하세요.</p></div>
          </div>
          <div className="mode-options">
            <button type="button" className={`mode-option ${feedbackEnabled ? 'selected' : ''}`} onClick={() => setFeedbackEnabled((value) => !value)}>
              <div><strong>⚔️ 전투 피드백</strong><span>명중·미스 점수를 화면에 표시합니다.</span></div>
              <span className="option-on">{feedbackEnabled ? 'ON' : 'OFF'}</span>
            </button>
            <button type="button" className={`mode-option ${aimCoach ? 'selected' : ''}`} onClick={() => setAimCoach((value) => !value)}>
              <div><strong>📐 실시간 에임 코치</strong><span>현재 타겟 대비 조준 위치를 실시간으로 알려줍니다.</span></div>
              <span className="option-on">{aimCoach ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </section>

        <section className="setup-section compact">
          <div className="setup-section-head">
            <span>{drill === 'flick' ? '04' : '03'}</span>
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

          <button className="setup-start" onClick={() => drill === 'flick' ? setLaunchStep('count') : onStart(drill, duration, difficulty, feedbackEnabled, aimCoach)}>훈련 시작 <span>→</span></button>
          {launchStep === 'count' && (
            <div className="modal-dim setup-launch-dim">
              <div className="pause-modal setup-launch-modal">
                <span className="launch-kicker">01 // TARGET COUNT</span>
                <h2>동시 소환 타겟 수</h2>
                <p>타겟 수를 선택하면 바로 훈련실로 들어갑니다. 시간은 위에서 선택한 {duration}초가 적용됩니다.</p>
                <div className="launch-choice-grid">
                  {[1, 3, 5, 7, 12].map((count) => (
                    <button key={count} className={flickBotCount === count ? 'selected' : ''} onClick={() => { setFlickBotCount(count); setLaunchStep(null); onStart(drill, duration, difficulty, feedbackEnabled, aimCoach, flickMode, count); }}>
                      {count}<small>TARGETS · START</small>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}

  function RangeScene({ drill, duration, difficulty, feedbackEnabled, aimCoach, flickBotCount, flickMode, customTargetSize = 0.4, customTargetSpeed = 1, botBehavior = 'peek', peekCueEnabled = true, damageModelEnabled = true, mapId, onMapChange, onConfigChange, onLeave, settings, onSettingsChange, onFinish }: { drill: Drill; duration: number; difficulty: string; feedbackEnabled: boolean; aimCoach: boolean; flickBotCount: number; flickMode: FlickMode; customTargetSize?: number; customTargetSpeed?: number; botBehavior?: BotBehavior; peekCueEnabled?: boolean; damageModelEnabled?: boolean; mapId: TrainingMapId; onMapChange: (map: TrainingMapId) => void; onConfigChange: (config: TrainingConfig) => void; onLeave: () => void; settings: Settings; onSettingsChange: (next: Settings) => void; onFinish: (stats: RunStats) => void }) {
    const mountRef = useRef<HTMLDivElement>(null);
    const statsRef = useRef<RunStats>({ score: 0, accuracy: 100, streak: 0, hits: 0, shots: 0, drill, duration, avgReaction: undefined, bestReaction: undefined, overshoots: 0, maxStreak: 0 });
    const timeRef = useRef(duration);
    const statusRef = useRef<RunStatus>('paused');
    const [status, setStatus] = useState<RunStatus>('paused');
    const [timeLeft, setTimeLeft] = useState(duration);
    const [stats, setStats] = useState(statsRef.current);
    const [feedback, setFeedback] = useState<{ text: string; miss: boolean; id: number } | null>(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [terminalOpen, setTerminalOpen] = useState(true);
    const [terminalMap, setTerminalMap] = useState<TrainingMapId>(mapId);
    const [terminalDrill, setTerminalDrill] = useState<Drill>(drill);
    const [terminalDuration, setTerminalDuration] = useState(duration);
    const [terminalDifficulty, setTerminalDifficulty] = useState(difficulty);
    const [terminalFeedback, setTerminalFeedback] = useState(feedbackEnabled);
    const [terminalAimCoach, setTerminalAimCoach] = useState(aimCoach);
    const [terminalFlickMode, setTerminalFlickMode] = useState<FlickMode>(flickMode);
    const [terminalTargetCount, setTerminalTargetCount] = useState(flickBotCount);
    const [terminalTargetSize, setTerminalTargetSize] = useState(customTargetSize);
    const [terminalTargetSpeed, setTerminalTargetSpeed] = useState(customTargetSpeed);
    const [terminalBotBehavior, setTerminalBotBehavior] = useState<BotBehavior>(botBehavior);
    const [terminalPeekCue, setTerminalPeekCue] = useState(peekCueEnabled);
    const [terminalDamageModel, setTerminalDamageModel] = useState(damageModelEnabled);
    const [hasStarted, setHasStarted] = useState(false);
    const [pointerLocked, setPointerLocked] = useState(false);
    const pointerLockBlockedUntilRef = useRef(0);
    const pointerLockRequestPendingRef = useRef(false);
    const [fps, setFps] = useState(0);
    const [shotError, setShotError] = useState<number | null>(null);
    const [shotErrorHistory, setShotErrorHistory] = useState<number[]>([]);
    const [aimCoachState, setAimCoachState] = useState<{ message: string; tone: string }>({ message: '● CENTERED', tone: 'center' });
    const reactionSamplesRef = useRef<number[]>([]);
    const targetSpawnAtRef = useRef(performance.now());
    const lastShotAtRef = useRef(0);
    const targetRootRef = useRef<THREE.Group | null>(null);
    const aimCoachGuideRef = useRef<THREE.Line | null>(null);
    const brakingMovedRef = useRef(false);
    const jumpVelocityRef = useRef(0);
    const groundedRef = useRef(true);
    const crouchRef = useRef(false);
    const walkRef = useRef(false);
    const aimCoachStampRef = useRef(0);
    const sensitivityRef = useRef(settings.sensitivity);
    const difficultySize = difficulty === 'foundation' || difficulty === 'trainee' ? 0.55 : difficulty === 'pressure' || difficulty === 'hell' ? 0.27 : difficulty === 'custom' ? terminalTargetSize : 0.4;
    const map = TRAINING_MAPS.find((item) => item.id === mapId) ?? TRAINING_MAPS[0];
    const openTrainingTerminal = useCallback(() => {
      statusRef.current = 'paused';
      setStatus('paused');
      setTerminalOpen(true);
      document.exitPointerLock?.();
    }, []);
    const launchTraining = () => {
      const nextConfig: TrainingConfig = {
        drill: terminalDrill,
        duration: terminalDuration,
        difficulty: terminalDifficulty,
        feedbackEnabled: terminalFeedback,
        aimCoach: terminalAimCoach,
        flickBotCount: terminalTargetCount,
        flickMode: terminalFlickMode,
        customTargetSize: terminalTargetSize,
        customTargetSpeed: terminalTargetSpeed,
        botBehavior: terminalBotBehavior,
        peekCueEnabled: terminalPeekCue,
        damageModelEnabled: terminalDamageModel,
      };
      onMapChange(terminalMap);
      onConfigChange(nextConfig);
      statsRef.current = { score: 0, accuracy: 100, streak: 0, hits: 0, shots: 0, drill: terminalDrill, duration: terminalDuration, overshoots: 0, maxStreak: 0, headHits: 0, bodyHits: 0, legHits: 0, kills: 0, damageDealt: 0, movingShots: 0, averageSpread: 0 };
      setStats(statsRef.current);
      reactionSamplesRef.current = [];
      targetSpawnAtRef.current = performance.now();
      lastShotAtRef.current = 0;
      timeRef.current = terminalDuration;
      setTimeLeft(terminalDuration);
      setFeedback(null);
      statusRef.current = 'active';
      setStatus('active');
      setTerminalOpen(false);
      setHasStarted(true);
    };
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
      scene.background = new THREE.Color('#aeb8b5');
      scene.fog = new THREE.Fog('#aeb8b5', 30, 62);
      const camera = new THREE.PerspectiveCamera(70.53, mount.clientWidth / mount.clientHeight, 0.1, 100);
      camera.position.set(0, 1.6, 6);
      camera.rotation.order = 'YXZ';
      let yaw = 0;
      let pitch = -0.02;
      camera.rotation.set(pitch, yaw, 0);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      renderer.shadowMap.enabled = false;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      mount.appendChild(renderer.domElement);
      scene.background = new THREE.Color('#121817');
      scene.fog = new THREE.FogExp2('#121817', 0.009);
      scene.add(new THREE.HemisphereLight('#f3f0e5', '#27302f', 1.5));
      const key = new THREE.DirectionalLight('#f4dfc0', 2.2);
      key.position.set(-7, 11, 8);
      key.castShadow = false;
      key.shadow.mapSize.set(1024, 1024);
      key.shadow.camera.left = -18;
      key.shadow.camera.right = 18;
      key.shadow.camera.top = 18;
      key.shadow.camera.bottom = -18;
      scene.add(key);
      scene.add(new THREE.AmbientLight('#d5e0d7', 0.32));
      const world = buildTrainingWorld(scene, mapId);
      const HEADLINE_Y = 1.65;
      const HEADLINE_Z = -9.0;
      const HEADLINE_HALF_WIDTH = 12.5;
      const aimGuideGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-HEADLINE_HALF_WIDTH, HEADLINE_Y, HEADLINE_Z),
        new THREE.Vector3(HEADLINE_HALF_WIDTH, HEADLINE_Y, HEADLINE_Z),
      ]);
      const aimGuideMaterial = new THREE.LineBasicMaterial({ color: '#bbdfc3', transparent: true, opacity: .46, depthTest: false });
      const aimGuide = new THREE.Line(aimGuideGeometry, aimGuideMaterial);
      aimGuide.visible = aimCoach;
      aimGuide.renderOrder = 20;
      scene.add(aimGuide);
      aimCoachGuideRef.current = aimGuide;
      const group = new THREE.Group(); scene.add(group);

      // Simple first-person rifle model: intentionally low-poly so it stays lightweight in-browser.
      const weapon = new THREE.Group();
      weapon.scale.setScalar(.46);
      weapon.position.set(.24, -.2, -.8);
      weapon.rotation.set(-.03, -.03, -.02);
      const weaponBody = new THREE.Mesh(
        new THREE.BoxGeometry(.2, .13, .39),
        new THREE.MeshStandardMaterial({ color: '#46534f', roughness: .54, metalness: .48 })
      );
      weaponBody.position.set(0, 0, -.2);
      weapon.add(weaponBody);
      const handguard = new THREE.Mesh(
        new THREE.BoxGeometry(.155, .105, .3),
        new THREE.MeshStandardMaterial({ color: '#303b38', roughness: .68, metalness: .25 })
      );
      handguard.position.set(0, -.004, -.52);
      weapon.add(handguard);
      const stock = new THREE.Mesh(
        new THREE.BoxGeometry(.18, .105, .22),
        new THREE.MeshStandardMaterial({ color: '#35403c', roughness: .72, metalness: .12 })
      );
      stock.position.set(0, -.012, .11);
      weapon.add(stock);
      const magazine = new THREE.Mesh(
        new THREE.BoxGeometry(.105, .2, .13),
        new THREE.MeshStandardMaterial({ color: '#29332f', roughness: .76, metalness: .18 })
      );
      magazine.position.set(0, -.15, -.15);
      magazine.rotation.x = -.12;
      weapon.add(magazine);
      const weaponGrip = new THREE.Mesh(
        new THREE.BoxGeometry(.105, .2, .12),
        new THREE.MeshStandardMaterial({ color: '#242e2b', roughness: .8, metalness: .1 })
      );
      weaponGrip.position.set(.015, -.145, -.005);
      weaponGrip.rotation.x = -.18;
      weapon.add(weaponGrip);
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(.022, .026, .42, 12),
        new THREE.MeshStandardMaterial({ color: '#090d0f', roughness: .4, metalness: .8 })
      );
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, .006, -.82);
      weapon.add(barrel);
      const sight = new THREE.Mesh(
        new THREE.BoxGeometry(.055, .045, .16),
        new THREE.MeshStandardMaterial({ color: '#b5c6a0', emissive: '#53654a', emissiveIntensity: .18, roughness: .44 })
      );
      sight.position.set(0, .105, -.25);
      weapon.add(sight);
      const frontSight = new THREE.Mesh(
        new THREE.BoxGeometry(.035, .06, .035),
        new THREE.MeshStandardMaterial({ color: '#8da77d', roughness: .42, metalness: .52 })
      );
      frontSight.position.set(0, .065, -.67);
      weapon.add(frontSight);
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
        const material = new THREE.LineBasicMaterial({ color: '#f1d7ad', transparent: true, opacity: .84 });
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
      const sightRaycaster = new THREE.Raycaster();
      const hasClearLineOfSight = (point: THREE.Vector3) => {
        const direction = point.clone().sub(camera.position);
        const distance = direction.length();
        sightRaycaster.set(camera.position, direction.normalize());
        const firstBlocker = sightRaycaster.intersectObjects(world.bulletBlockers, true)[0];
        return !firstBlocker || firstBlocker.distance > distance - 0.45;
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
          if (isPositionClear(point.x, point.y, point.z, radius) && hasClearLineOfSight(point)) return point;
        }
        return new THREE.Vector3(0, 1.65, -7);
      };
      const findRobotPosition = (radius: number) => {
        for (let attempt = 0; attempt < 100; attempt += 1) {
          const x = THREE.MathUtils.randFloat(-11, 11);
          const z = THREE.MathUtils.randFloat(-9.15, -2.2);
          const point = new THREE.Vector3(x, 1.65, z);
          if (isPositionClear(x, 0, z, radius) && hasClearLineOfSight(point)) return new THREE.Vector3(x, 0, z);
        }
        return new THREE.Vector3(0, 0, -8);
      };
      const buildRobot = () => {
        const root = new THREE.Group();
        const rig = new THREE.Group();
        rig.name = 'bot-rig';
        const armorMat = new THREE.MeshStandardMaterial({ color: '#35423f', roughness: .48, metalness: .34 });
        const darkMat = new THREE.MeshStandardMaterial({ color: '#202a28', roughness: .68, metalness: .16 });
        const redAccentMat = new THREE.MeshStandardMaterial({ color: '#a3ad82', emissive: '#39432e', emissiveIntensity: .12, roughness: .48 });
        const whiteHeadMat = new THREE.MeshStandardMaterial({ color: '#e1ddd1', roughness: .36, metalness: .32 });
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(.08,.1,.15,8),darkMat); neck.name='body'; neck.position.y=1.47;
        const head = new THREE.Mesh(new THREE.BoxGeometry(.24,.28,.24),whiteHeadMat); head.name='head'; head.position.y=1.65;
        const headTop = new THREE.Mesh(new THREE.BoxGeometry(.20,.05,.22),redAccentMat); headTop.name='head'; headTop.position.set(0,.15,0); head.add(headTop);
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
        const hips = new THREE.Mesh(new THREE.BoxGeometry(.45,.2,.25),armorMat); hips.name='legs'; hips.position.y=.7;
        const thighL = new THREE.Mesh(new THREE.CylinderGeometry(.08,.06,.45,8),armorMat); thighL.name='legs'; thighL.position.set(-.15,.4,0); thighL.rotation.z=-.1;
        const thighR = new THREE.Mesh(new THREE.CylinderGeometry(.08,.06,.45,8),armorMat); thighR.name='legs'; thighR.position.set(.15,.4,0); thighR.rotation.z=.1;
        const calfL = new THREE.Mesh(new THREE.CylinderGeometry(.06,.05,.45,8),darkMat); calfL.name='legs'; calfL.position.set(-.18,.225,.05);
        const calfR = new THREE.Mesh(new THREE.CylinderGeometry(.06,.05,.45,8),darkMat); calfR.name='legs'; calfR.position.set(.18,.225,-.05);
        rig.add(neck,head,torso,chestCore,shoulderL,shoulderR,gunBody,rightUpperArm,rightLowerArm,leftUpperArm,leftLowerArm,waist,hips,thighL,thighR,calfL,calfR);
        const cue = new THREE.Mesh(
          new THREE.RingGeometry(.25,.34,28),
          new THREE.MeshBasicMaterial({ color:'#d4b06c', transparent:true, opacity:.8, side:THREE.DoubleSide, depthWrite:false })
        );
        cue.name = 'peek-cue';
        cue.rotation.x = -Math.PI / 2;
        cue.position.y = .035;
        cue.visible = false;
        cue.raycast = () => undefined;
        root.add(rig,cue);
        root.userData.targetRadius=.72; root.userData.head=head; root.userData.rig=rig; root.userData.peekCue=cue;
        root.traverse((object)=>{if(object instanceof THREE.Mesh)object.castShadow=true;});
        return root;
      };
      const chooseRobotPosition = () => {
        if (botBehavior === 'peek' && mapId === 'corridor') {
          const side = Math.random() < .5 ? -1 : 1;
          return new THREE.Vector3(side * 6.8, 0, -11.4 + Math.random() * .4);
        }
        if (botBehavior === 'peek' && mapId === 'arena') {
          const side = Math.random() < .5 ? -1 : 1;
          return new THREE.Vector3(side * 8.3, 0, -1.3 + Math.random() * .3);
        }
        return findRobotPosition(.72);
      };
      const configureBot = (root: THREE.Group) => {
        root.userData.isTrainingBot = true;
        root.userData.hp = 100;
        root.userData.maxHp = 100;
        root.userData.botBehavior = botBehavior;
        root.userData.baseX = root.position.x;
        root.userData.baseZ = root.position.z;
        root.userData.spawnedAt = performance.now();
        root.userData.reacted = false;
        root.userData.strafeDirection = Math.random() < .5 ? -1 : 1;
        root.userData.strafeTimer = .35 + Math.random() * .75;
        root.userData.strafeSpeed = 1.4 + Math.random() * 1.2;
        if (botBehavior === 'peek') {
          root.userData.peekPhase = 'warning';
          root.userData.peekTimer = peekCueEnabled ? .42 + Math.random() * .28 : .35 + Math.random() * 1.05;
          root.userData.peekOffset = (root.position.x > 0 ? -1 : 1) * (mapId === 'corridor' ? 1.9 : 2.4);
          const rig = root.userData.rig as THREE.Group;
          const cue = root.userData.peekCue as THREE.Mesh;
          // Put the cue beyond the cover edge so the player can see the warning before the bot peeks.
          cue.position.x = Number(root.userData.peekOffset) * 1.12;
          rig.visible = false;
          cue.visible = peekCueEnabled;
        }
      };
      const disposeTarget = (root: THREE.Object3D) => {
        root.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((current) => current.dispose());
        });
      };
      const spawn = () => {
        targetSpawnAtRef.current = performance.now();
        if (drill === 'flick') {
          const root = flickMode === 'random' ? new THREE.Group() : buildRobot();
          if (flickMode === 'random') {
            const radius=difficultySize;
            const sphere=new THREE.Mesh(new THREE.SphereGeometry(radius,24,24),new THREE.MeshStandardMaterial({color:'#ca8969',emissive:'#4d291f',emissiveIntensity:.16,roughness:.52,metalness:.12}));
            sphere.name='target'; root.add(sphere); root.userData.targetRadius=radius; root.userData.hp=100; root.userData.maxHp=100; root.userData.spawnedAt=performance.now(); root.userData.reacted=false; root.position.copy(findFlickPosition(radius));
          } else {
            const pos=chooseRobotPosition(); root.position.set(pos.x,HEADLINE_Y-1.65,pos.z); configureBot(root);
          }
          group.add(root); targetRootRef.current=group; return;
        }
        if (targetRootRef.current) { group.remove(targetRootRef.current); disposeTarget(targetRootRef.current); }
        const root=buildRobot(); const robotRootY=HEADLINE_Y-1.65;
        if (drill === 'braking') {
          const position = chooseRobotPosition();
          root.position.set(position.x, robotRootY, position.z);
        }
        else root.position.set(0,robotRootY,-9);
        configureBot(root);
        group.add(root); targetRootRef.current=root; brakingMovedRef.current=false;
      };
      const raycaster = new THREE.Raycaster();
      const isTargetVisible = (object: THREE.Object3D) => {
        let current: THREE.Object3D | null = object;
        while (current && current !== group) {
          if (!current.visible) return false;
          current = current.parent;
        }
        return true;
      };
      const keys = new Set<string>();
      const velocity = new THREE.Vector3();
      let aimingWithMouse = false;
      let frame = 0;
      let previous = performance.now();
      let fpsFrames = 0;
      let fpsStarted = previous;
      const onPointerMove = (event: PointerEvent) => {
        const pointerLocked = document.pointerLockElement === renderer.domElement;
        if (statusRef.current !== 'active' || (!pointerLocked && !aimingWithMouse)) return;
        const lookScale = THREE.MathUtils.degToRad(0.07) * sensitivityRef.current;
        yaw -= (event.movementX || 0) * lookScale;
        pitch = THREE.MathUtils.clamp(pitch - (event.movementY || 0) * lookScale, -1.08, 1.08);
        camera.rotation.set(pitch, yaw, 0);
      };
      const requestPointerLockSafe = () => {
        if (pointerLockRequestPendingRef.current) return;
        if (Date.now() < pointerLockBlockedUntilRef.current) return;
        if (document.pointerLockElement === renderer.domElement) return;
        pointerLockRequestPendingRef.current = true;
        try {
          const result = renderer.domElement.requestPointerLock?.();
          if (result && typeof (result as Promise<void>).catch === 'function') {
            void (result as Promise<void>).catch(() => {}).finally(() => {
              pointerLockRequestPendingRef.current = false;
            });
          } else {
            pointerLockRequestPendingRef.current = false;
          }
        } catch {
          pointerLockRequestPendingRef.current = false;
        }
      };
      const onShoot = (event: MouseEvent) => {
        if (statusRef.current !== 'active') return;
        if (event.button !== 0) return;
        if (event.target !== renderer.domElement) return;
        event.preventDefault();

        const now = performance.now();
        const movementSpeed = velocity.length();
        const stableForDrill = drill === 'braking'
          ? movementSpeed <= brakingStopThreshold
          : movementSpeed <= .06;
        const profile = WEAPONS[settings.weapon];
        const baseSpread = profile.spread;
        const movementSpread = stableForDrill ? 0 : Math.min(1.4, movementSpeed / Math.max(settings.moveSpeed, .1) * 1.4);
        const jumpSpread = groundedRef.current ? 0 : .85;
        const minimumFireInterval = 1000 / Math.max(profile.fireRate, .1);
        const sincePreviousShot = now - lastShotAtRef.current;
        const rapidSpread = lastShotAtRef.current > 0 && sincePreviousShot < minimumFireInterval
          ? Math.min(.55, (1 - sincePreviousShot / minimumFireInterval) * .55)
          : 0;
        const spreadAngle = Math.min(4.5, baseSpread + movementSpread + jumpSpread + rapidSpread);
        lastShotAtRef.current = now;
        setShotError(spreadAngle);
        setShotErrorHistory((current) => [...current.slice(-17), spreadAngle]);

        const rect = renderer.domElement.getBoundingClientRect();
        const shotNdc = document.pointerLockElement === renderer.domElement
          ? new THREE.Vector2(0, 0)
          : new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1,
          );
        raycaster.setFromCamera(shotNdc, camera);
        const shotDirection = raycaster.ray.direction.clone();
        const spreadRadius = Math.tan(THREE.MathUtils.degToRad(spreadAngle)) * Math.sqrt(Math.random());
        const spreadRotation = Math.random() * Math.PI * 2;
        const cameraRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        const cameraUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
        shotDirection
          .addScaledVector(cameraRight, Math.cos(spreadRotation) * spreadRadius)
          .addScaledVector(cameraUp, Math.sin(spreadRotation) * spreadRadius)
          .normalize();
        raycaster.set(camera.position, shotDirection);
        const allTargetIntersections = targetRootRef.current
          ? raycaster.intersectObject(targetRootRef.current, true).filter((item) => isTargetVisible(item.object))
          : [];
        const firstBlocker = raycaster.intersectObjects(world.bulletBlockers, true)[0];
        const intersections = firstBlocker
          ? allTargetIntersections.filter((item) => item.distance <= firstBlocker.distance + 0.02)
          : allTargetIntersections;

        const hitObject = intersections[0]?.object ?? null;
        let zoneObject: THREE.Object3D | null = hitObject;
        while (zoneObject && !['head', 'body', 'legs', 'target'].includes(zoneObject.name)) zoneObject = zoneObject.parent;
        const zone = zoneObject?.name === 'target' ? 'head' : zoneObject?.name;
        const headHit = zone === 'head';
        const bodyHit = zone === 'body';
        const legHit = zone === 'legs';
        let hitRoot: THREE.Object3D | null = null;
        if (hitObject) {
          let cursor: THREE.Object3D | null = hitObject;
          while (cursor && cursor.parent && cursor.parent !== group) cursor = cursor.parent;
          hitRoot = cursor && cursor.parent === group ? cursor : null;
        }
        if (hitRoot && !hitRoot.userData.reacted) {
          const targetReaction = performance.now() - Number(hitRoot.userData.spawnedAt ?? targetSpawnAtRef.current);
          if (Number.isFinite(targetReaction) && (drill === 'flick' || botBehavior !== 'static')) {
            reactionSamplesRef.current.push(targetReaction);
            if (reactionSamplesRef.current.length > 100) reactionSamplesRef.current.shift();
          }
          hitRoot.userData.reacted = true;
        }
        const next = {
          ...statsRef.current,
          shots: statsRef.current.shots + 1,
          overshoots: statsRef.current.overshoots ?? 0,
          headHits: statsRef.current.headHits ?? 0,
          bodyHits: statsRef.current.bodyHits ?? 0,
          legHits: statsRef.current.legHits ?? 0,
          kills: statsRef.current.kills ?? 0,
          damageDealt: statsRef.current.damageDealt ?? 0,
          movingShots: statsRef.current.movingShots ?? 0,
        };

        if (movementSpeed > .06) next.movingShots += 1;
        next.averageSpread = (((statsRef.current.averageSpread ?? 0) * (next.shots - 1)) + spreadAngle) / next.shots;
        const brakingMoving =
          drill === 'braking' && velocity.length() > brakingStopThreshold;

        const brakingNoMovement =
          drill === 'braking' && !brakingMovedRef.current;

        const tracerEnd = camera.position
          .clone()
          .addScaledVector(shotDirection, 30);

        fireVisual(tracerEnd);

        if (hitObject && hitRoot && (headHit || bodyHit || legHit)) {
          const zoneMultiplier = headHit ? 1 : bodyHit ? .5 : .35;
          const rawDamage = Math.max(1, Math.round(profile.damage * zoneMultiplier));
          const currentHealth = Number(hitRoot.userData.hp ?? 100);
          const actualDamage = damageModelEnabled ? Math.min(currentHealth, rawDamage) : 0;
          if (damageModelEnabled) hitRoot.userData.hp = Math.max(0, currentHealth - rawDamage);
          const eliminated = damageModelEnabled && Number(hitRoot.userData.hp) <= 0;
          if (headHit) next.headHits += 1;
          else if (bodyHit) next.bodyHits += 1;
          else next.legHits += 1;
          next.hits += 1;
          next.damageDealt += actualDamage;
          if (eliminated) next.kills += 1;
          next.streak += 1;
          next.maxStreak = Math.max(next.maxStreak ?? 0, next.streak);

          const stopQuality = drill === 'braking'
            ? Math.max(0, 1 - velocity.length() / .9)
            : 1;
          const zonePoints = headHit ? 100 : bodyHit ? 54 : 34;
          const points = Math.round(
            zonePoints *
            (1 + Math.min(next.streak, 15) * .08) *
            (.65 + stopQuality * .35) *
            (difficulty === 'pressure' || difficulty === 'hell' ? 1.35 : difficulty === 'foundation' || difficulty === 'trainee' ? .9 : 1.12)
          );
          next.score += points - (drill === 'braking' && brakingNoMovement ? 20 : 0);

          if (feedbackEnabled) setFeedback({
            text: !damageModelEnabled
              ? `${headHit ? '헤드' : bodyHit ? '몸통' : '다리'} 명중 · 기록만 +${points}`
              : `${headHit ? '헤드' : bodyHit ? '몸통' : '다리'} ${actualDamage} 피해 · ${eliminated ? '제압' : `HP ${Math.max(0, currentHealth - rawDamage)}`} +${points}`,
            miss: false,
            id: Date.now(),
          });

          if (eliminated) {
            group.remove(hitRoot);
            disposeTarget(hitRoot);
            if (drill === 'flick') {
              targetRootRef.current = group;
              spawn();
            } else spawn();
          }
        } else if (drill === 'braking' && brakingNoMovement) {
          next.streak = 0;
          next.overshoots = (next.overshoots ?? 0) + 1;
          next.score = Math.max(0, next.score - 20);

          if (feedbackEnabled) setFeedback({
            text: '이동 후 정지 사격 -20',
            miss: true,
            id: Date.now(),
          });
        } else {
          next.streak = 0;
          next.score = Math.max(0, next.score - 20);

          if (feedbackEnabled) setFeedback({
            text: brakingMoving
              ? '브레이킹 전에 발사 · 퍼짐 증가 -20'
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
        if (event.code === 'KeyT' && !event.repeat) {
          event.preventDefault();
          openTrainingTerminal();
          return;
        }
        const allowed = new Set(Object.values(settings.keybinds));
        if (allowed.has(event.code)) {
          keys.add(event.code);
          event.preventDefault();
        }
      };
      const onKeyUp = (event: KeyboardEvent) => { keys.delete(event.code); };
      const onBlur = () => { keys.clear(); aimingWithMouse = false; };
      const onPointerDown = (event: MouseEvent) => {
        if (event.button !== 0) return;
        if (event.target !== renderer.domElement) return;
        aimingWithMouse = true;
        if (statusRef.current === 'active') requestPointerLockSafe();
      };
      const onPointerUp = () => { aimingWithMouse = false; };
      const onPointerLockChange = () => {
        const locked = document.pointerLockElement === renderer.domElement;
        setPointerLocked(locked);
      };
      const onCanvasClick = (event: MouseEvent) => onShoot(event);
      const runSpeed = settings.moveSpeed;
      const walkSpeed = settings.moveSpeed * .55;
      const crouchSpeed = settings.moveSpeed * .45;
      const standingEyeHeight = 1.62;
      const crouchingEyeHeight = 1.08;
      const gravity = 19.0;
      const jumpSpeed = 5.0;
      const applyMovement = (delta: number) => {
        const horizontal = Number(keys.has(settings.keybinds.right)) - Number(keys.has(settings.keybinds.left));
        const forwardInput = Number(keys.has(settings.keybinds.forward)) - Number(keys.has(settings.keybinds.back));
        const input = new THREE.Vector3(horizontal, 0, forwardInput);
        if (input.lengthSq() > 1) input.normalize();
        walkRef.current = keys.has(settings.keybinds.walk);
        crouchRef.current = keys.has(settings.keybinds.crouch);

        if (keys.has(settings.keybinds.jump) && groundedRef.current && !crouchRef.current) {
          jumpVelocityRef.current = jumpSpeed;
          groundedRef.current = false;
        }

        const currentSpeed = crouchRef.current ? crouchSpeed : walkRef.current ? walkSpeed : runSpeed;
        const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
        const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
        const desired = forward.multiplyScalar(input.z * currentSpeed).add(right.multiplyScalar(input.x * currentSpeed));

        if (drill === 'braking' && input.lengthSq() > 0) brakingMovedRef.current = true;
        const accel = input.lengthSq() > 0 ? 28 : 22;
        const blend = 1 - Math.exp(-accel * Math.min(delta, .05));
        velocity.lerp(desired, blend);
        const playerRadius = 0.34;
        const collidesAt = (x: number, z: number) => world.colliders.some((collider) =>
          x > collider.minX - playerRadius && x < collider.maxX + playerRadius &&
          z > collider.minZ - playerRadius && z < collider.maxZ + playerRadius
        );
        const nextX = THREE.MathUtils.clamp(camera.position.x + velocity.x * delta, -14.05, 14.05);
        if (!collidesAt(nextX, camera.position.z)) camera.position.x = nextX;
        else velocity.x = 0;
        const nextZ = THREE.MathUtils.clamp(camera.position.z + velocity.z * delta, -14.05, 9.05);
        if (!collidesAt(camera.position.x, nextZ)) camera.position.z = nextZ;
        else velocity.z = 0;

        if (!groundedRef.current) {
          jumpVelocityRef.current -= gravity * delta;
          camera.position.y += jumpVelocityRef.current * delta;
          if (camera.position.y <= standingEyeHeight) {
            camera.position.y = standingEyeHeight;
            jumpVelocityRef.current = 0;
            groundedRef.current = true;
          }
        } else {
          const targetEye = crouchRef.current ? crouchingEyeHeight : standingEyeHeight;
          camera.position.y += (targetEye - camera.position.y) * (1 - Math.exp(-18 * Math.min(delta, .05)));
        }

      };
      // 최초 진입 시 타겟을 반드시 생성합니다.
      // Flick은 선택한 동시 소환 수만큼, Tracking/Braking은 1개를 생성합니다.
      if (drill === 'flick') {
        for (let index = 0; index < flickBotCount; index += 1) spawn();
      } else {
        spawn();
      }

      const resize = () => {
        camera.aspect = mount.clientWidth / Math.max(1, mount.clientHeight);
        camera.updateProjectionMatrix();
        renderer.setSize(mount.clientWidth, mount.clientHeight);
      };
      window.addEventListener('resize', resize);
      document.addEventListener('mousemove', onPointerMove);
      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('keyup', onKeyUp);
      renderer.domElement.addEventListener('pointerdown', onPointerDown);
      renderer.domElement.addEventListener('mousedown', onCanvasClick);
      document.addEventListener('pointerlockchange', onPointerLockChange);
      document.addEventListener('pointerup', onPointerUp);

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
            // 실제 머리 히트박스 위치를 기준으로만 교정선을 움직입니다.
            // 고정된 HEADLINE_Y를 기준으로 경고하지 않아, 가까이/멀리 생성된 봇도 정확히 따라갑니다.
            let bestHead: THREE.Object3D | null = null;
            let bestDistance = Infinity;
            const candidates: THREE.Object3D[] = [];
            group.traverse((object) => {
              if (object.name === 'head' || object.name === 'target') candidates.push(object);
            });
            const center = new THREE.Vector2(0, 0);
            for (const candidate of candidates) {
              if (!isTargetVisible(candidate)) continue;
              const projected = candidate.getWorldPosition(new THREE.Vector3()).project(camera);
              const distance = Math.hypot(projected.x - center.x, projected.y - center.y);
              if (distance < bestDistance) {
                bestDistance = distance;
                bestHead = candidate;
              }
            }
            if (bestHead) {
              const headWorld = bestHead.getWorldPosition(new THREE.Vector3());
              const left = new THREE.Vector3(headWorld.x - HEADLINE_HALF_WIDTH, headWorld.y, headWorld.z);
              const right = new THREE.Vector3(headWorld.x + HEADLINE_HALF_WIDTH, headWorld.y, headWorld.z);
              aimGuide.geometry.setFromPoints([left, right]);
              aimGuide.visible = true;
            } else {
              aimGuide.visible = false;
            }
          } else {
            aimGuide.visible = false;
          }
          for (const root of group.children) {
            if (!root.userData.isTrainingBot) continue;
            const rig = root.userData.rig as THREE.Group;
            const cue = root.userData.peekCue as THREE.Mesh;
            const phase = root.userData.peekPhase as string | undefined;
            if (root.userData.botBehavior === 'peek' && phase) {
              root.userData.peekTimer -= delta;
              if (phase === 'warning') {
                if (root.userData.peekTimer <= 0) {
                  root.userData.peekPhase = 'exposed';
                  root.userData.peekTimer = .9 + Math.random() * .55;
                  root.userData.exposedDuration = root.userData.peekTimer;
                  rig.visible = true;
                  cue.visible = false;
                  targetSpawnAtRef.current = performance.now();
                  if (!peekCueEnabled) {
                    root.userData.spawnedAt = performance.now();
                    root.userData.reacted = false;
                  }
                }
              } else if (phase === 'exposed') {
                const duration = Number(root.userData.exposedDuration ?? 1.1);
                const progress = THREE.MathUtils.clamp(1 - root.userData.peekTimer / duration, 0, 1);
                const reveal = THREE.MathUtils.smoothstep(progress, 0, .22);
                const strafeOffset = drill === 'tracking' ? Math.sin(progress * Math.PI * 3) * .7 : 0;
                root.position.x = Number(root.userData.baseX) + Number(root.userData.peekOffset) * reveal + strafeOffset;
                if (root.userData.peekTimer <= 0) {
                  root.userData.peekPhase = 'warning';
                  root.userData.peekTimer = peekCueEnabled ? .45 + Math.random() * .5 : .3 + Math.random() * 1.05;
                  root.userData.exposedDuration = 0;
                  root.position.x = Number(root.userData.baseX);
                  rig.visible = false;
                  cue.visible = peekCueEnabled;
                  if (peekCueEnabled) {
                    targetSpawnAtRef.current = performance.now();
                    root.userData.spawnedAt = performance.now();
                    root.userData.reacted = false;
                  }
                }
              }
            } else if (root.userData.botBehavior === 'strafe' || (drill === 'tracking' && root.userData.botBehavior !== 'static')) {
              root.userData.strafeTimer -= delta;
              const baseX = Number(root.userData.baseX ?? root.position.x);
              const direction = Number(root.userData.strafeDirection ?? 1);
              if (root.userData.strafeTimer <= 0 || Math.abs(root.position.x - baseX) >= 1.8) {
                root.userData.strafeDirection = Math.abs(root.position.x - baseX) >= 1.8 ? -direction : (Math.random() < .5 ? -1 : 1);
                root.userData.strafeTimer = .35 + Math.random() * .8;
              }
              root.position.x += Number(root.userData.strafeDirection) * Number(root.userData.strafeSpeed) * delta;
            }
            const dx = camera.position.x - root.position.x;
            const dz = camera.position.z - root.position.z;
            root.rotation.y = Math.atan2(dx, dz);
          }
        }
        if (aimCoach && performance.now() - aimCoachStampRef.current > 120) {
          aimCoachStampRef.current = performance.now();
          let bestHead: THREE.Object3D | null = null;
          let bestDistance = Infinity;
          group.traverse((object) => {
            if ((object.name !== 'head' && object.name !== 'target') || !isTargetVisible(object)) return;
            const projected = object.getWorldPosition(new THREE.Vector3()).project(camera);
            const distance = Math.hypot(projected.x, projected.y);
            if (projected.z > -1 && projected.z < 1 && distance < bestDistance) {
              bestDistance = distance;
              bestHead = object;
            }
          });
          if (bestHead) {
            const coachTarget = bestHead as THREE.Object3D;
            const projected = coachTarget.getWorldPosition(new THREE.Vector3()).project(camera);
            if (Math.abs(projected.x) > .075) {
              setAimCoachState({ message: projected.x > 0 ? '→ TARGET RIGHT' : '← TARGET LEFT', tone: 'horizontal' });
            } else if (Math.abs(projected.y) > .075) {
              setAimCoachState({ message: projected.y > 0 ? '↑ TOO HIGH' : '↓ TOO LOW', tone: 'vertical' });
            } else {
              setAimCoachState({ message: '● CENTERED', tone: 'center' });
            }
          }
        }

        renderer.render(scene, camera);
      };
      frame = requestAnimationFrame(animate);
      return () => {
        aimCoachGuideRef.current = null;
        aimGuideGeometry.dispose();
        aimGuideMaterial.dispose();
        cancelAnimationFrame(frame);
        document.removeEventListener('mousemove', onPointerMove);
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('keyup', onKeyUp);
        renderer.domElement.removeEventListener('pointerdown', onPointerDown);
        renderer.domElement.removeEventListener('mousedown', onCanvasClick);
        document.removeEventListener('pointerlockchange', onPointerLockChange);
        document.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('blur', onBlur);
        window.removeEventListener('resize', resize);
        const disposedGeometry = new Set<THREE.BufferGeometry>();
        const disposedMaterials = new Set<THREE.Material>();
        scene.traverse((object) => {
          if ('geometry' in object && object.geometry instanceof THREE.BufferGeometry && !disposedGeometry.has(object.geometry)) {
            disposedGeometry.add(object.geometry);
            object.geometry.dispose();
          }
          if ('material' in object && object.material) {
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach((current) => {
              if (!disposedMaterials.has(current)) {
                disposedMaterials.add(current);
                current.dispose();
              }
            });
          }
        });
        renderer.renderLists.dispose();
        renderer.dispose();
        if (renderer.domElement.parentElement === mount) mount.removeChild(renderer.domElement);
      };
    }, [difficulty, drill, finish, difficultySize, flickBotCount, flickMode, mapId, openTrainingTerminal, terminalTargetSpeed, botBehavior, peekCueEnabled, damageModelEnabled]);

    useEffect(() => {
      if (duration === 0) {
        timeRef.current = 0;
        setTimeLeft(0);
        return;
      }
      const timer = window.setInterval(() => {
        if (statusRef.current !== 'active') return;
        timeRef.current = Math.max(0, timeRef.current - .1);
        setTimeLeft(timeRef.current);
        if (timeRef.current <= 0) finish();
      }, 100);
      return () => window.clearInterval(timer);
    }, [finish, duration]);
    const togglePause = () => {
      const next = statusRef.current === 'active' ? 'paused' : 'active';
      if (next === 'paused') setPointerLocked(false);
      statusRef.current = next;
      setStatus(next);
    };
    const exit = () => {
      pointerLockBlockedUntilRef.current = Date.now() + 1000;
      finish();
    };
    const closeTerminal = () => {
      setTerminalOpen(false);
      if (hasStarted) {
        statusRef.current = 'active';
        setStatus('active');
      }
    };
    const leaveTerminal = () => {
      if (hasStarted) closeTerminal();
      else onLeave();
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
              {map.callout}
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
                className="hud-button terminal-open-button"
                onClick={openTrainingTerminal}
                aria-label="훈련 터미널 열기"
                title="훈련 터미널 · T"
              >
                <Keyboard size={16} />
              </button>
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
              {duration === 0 ? '무제한' : `${timeLeft.toFixed(1)}초`}
            </strong>
          </div>

          <CrosshairView
            config={settings.crosshair}
            className="crosshair-live"
          />

          {aimCoach && (
            <div className={`aim-coach-live ${aimCoachState.tone}`}>
              <span>AIM COACH</span>
              <strong>{aimCoachState.message}</strong>
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
                  <small>무기 기본 정확도 + 이동 · 공중 · 연사 퍼짐</small>
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
              <kbd>SHIFT</kbd>
              <span>걷기</span>
              <kbd>CTRL</kbd>
              <span>앉기</span>
              <kbd>SPACE</kbd>
              <span>점프</span>
              <span>마우스 시점 / 클릭 사격</span>
              <kbd>T</kbd><span>터미널</span>
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
                {difficulty === 'foundation'
                  ? '기본기'
                  : difficulty === 'pressure'
                    ? '압박'
                    : '실전'}
              </b>
            </div>
          </div>
        </div>

        {status === 'paused' && !terminalOpen && (
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

        {terminalOpen && (
          <div className="facility-terminal-overlay" role="dialog" aria-modal="true" aria-label="훈련 시설 터미널">
            <section className="facility-terminal">
              <header className="facility-terminal-header">
                <div>
                  <span className="facility-terminal-kicker">SANGHYEON TRAINING FACILITY · CONTROL LINK 01</span>
                  <h1>훈련 터미널</h1>
                  <p>공간을 선택하고 오늘의 훈련을 준비하세요.</p>
                </div>
                <button className="terminal-close" onClick={leaveTerminal} aria-label="터미널 닫기"><X size={19} /></button>
              </header>

              <section className="terminal-section">
                <div className="terminal-section-heading"><span>01</span><div><b>훈련 구역</b><small>이동을 누르면 선택한 구역으로 바로 이동합니다.</small></div></div>
                <div className="terminal-map-grid">
                  {TRAINING_MAPS.map((item, index) => (
                    <article key={item.id} className={`terminal-map-card ${terminalMap === item.id ? 'selected' : ''}`}>
                      <span className="terminal-map-index">0{index + 1} / {item.callout}</span>
                      <strong>{item.name}</strong>
                      <p>{item.description}</p>
                      <button onClick={() => { setTerminalMap(item.id); onMapChange(item.id); }}>{terminalMap === item.id ? '현재 구역' : '구역 이동'}</button>
                    </article>
                  ))}
                </div>
              </section>

              <section className="terminal-section terminal-training-options">
                <div className="terminal-section-heading"><span>02</span><div><b>훈련 프로토콜</b><small>플릭 · 트래킹 · 브레이킹</small></div></div>
                <div className="terminal-drill-row">
                  {([
                    ['flick', 'FLICK', '정밀 조준'],
                    ['tracking', 'TRACKING', '움직임 추적'],
                    ['braking', 'BRAKING', '이동 후 정지 사격'],
                  ] as const).map(([id, title, detail]) => (
                    <button key={id} className={terminalDrill === id ? 'selected' : ''} onClick={() => setTerminalDrill(id)}>
                      <b>{title}</b><small>{detail}</small>
                    </button>
                  ))}
                </div>

                <div className="terminal-setting-grid">
                  <div className="terminal-setting-block">
                    <b>난이도</b>
                    <div className="terminal-chip-row">
                      {([
                        ['foundation', '기본기'],
                        ['duel', '실전'],
                        ['pressure', '압박'],
                        ['custom', '직접 설정'],
                      ] as const).map(([value, label]) => (
                        <button key={value} className={terminalDifficulty === value ? 'selected' : ''} onClick={() => setTerminalDifficulty(value)}>{label}</button>
                      ))}
                    </div>
                  </div>
                  <div className="terminal-setting-block">
                    <b>세션 시간</b>
                    <div className="terminal-chip-row">
                      {([[30, '30초'], [60, '60초'], [120, '120초'], [0, '무제한']] as const).map(([value, label]) => (
                        <button key={value} className={terminalDuration === value ? 'selected' : ''} onClick={() => setTerminalDuration(value)}>{label}</button>
                      ))}
                    </div>
                  </div>
                </div>

                {terminalDifficulty === 'custom' && (
                  <div className="terminal-setting-grid terminal-custom-settings">
                    <label className="terminal-range-setting"><span>타겟 크기 <b>{terminalTargetSize.toFixed(2)}</b></span><input type="range" min="0.2" max="0.65" step="0.01" value={terminalTargetSize} onChange={(event) => setTerminalTargetSize(Number(event.target.value))} /></label>
                    <label className="terminal-range-setting"><span>타겟 속도 <b>{terminalTargetSpeed.toFixed(1)}×</b></span><input type="range" min="0.5" max="1.8" step="0.1" value={terminalTargetSpeed} onChange={(event) => setTerminalTargetSpeed(Number(event.target.value))} /></label>
                  </div>
                )}

                {terminalDrill === 'flick' && (
                  <div className="terminal-setting-grid terminal-flick-settings">
                    <div className="terminal-setting-block">
                      <b>타겟 유형</b>
                      <div className="terminal-chip-row">
                        {([
                          ['random', '구형 표적'],
                          ['headline', '헤드라인 봇'],
                          ['robot', '훈련봇'],
                        ] as const).map(([value, label]) => (
                          <button key={value} className={terminalFlickMode === value ? 'selected' : ''} onClick={() => setTerminalFlickMode(value)}>{label}</button>
                        ))}
                      </div>
                    </div>
                    <div className="terminal-setting-block">
                      <b>동시 타겟 <strong>{terminalTargetCount}</strong></b>
                      <input type="range" min="1" max="7" step="1" value={terminalTargetCount} onChange={(event) => setTerminalTargetCount(Number(event.target.value))} />
                    </div>
                  </div>
                )}

                <div className="terminal-bot-settings">
                    <div className="terminal-setting-block">
                      <b>봇 행동 / 전투 판정</b>
                      <div className="terminal-chip-row">
                        {([
                          ['static', '고정'],
                          ['peek', '불규칙 피킹'],
                          ['strafe', '좌우 이동'],
                        ] as const).map(([value, label]) => (
                          <button key={value} className={terminalBotBehavior === value ? 'selected' : ''} onClick={() => setTerminalBotBehavior(value)}>{label}</button>
                        ))}
                      </div>
                    </div>
                    <div className="terminal-bot-toggles">
                      <label><input type="checkbox" checked={terminalDamageModel} onChange={(event) => setTerminalDamageModel(event.target.checked)} /> 무기 피해와 타겟 체력 적용</label>
                      {terminalBotBehavior === 'peek' && (
                        <label><input type="checkbox" checked={terminalPeekCue} onChange={(event) => setTerminalPeekCue(event.target.checked)} /> 피킹 전 약한 신호</label>
                      )}
                    </div>
                </div>

                <div className="terminal-toggle-row">
                  <label><input type="checkbox" checked={terminalFeedback} onChange={(event) => setTerminalFeedback(event.target.checked)} /> 명중 피드백</label>
                  <label><input type="checkbox" checked={terminalAimCoach} onChange={(event) => setTerminalAimCoach(event.target.checked)} /> 실시간 에임 코치</label>
                  <span>무기: {WEAPONS[settings.weapon].name} · 설정에서 변경</span>
                </div>
              </section>

              <footer className="facility-terminal-footer">
                <span><b>{map.name}</b> / {terminalDrill.toUpperCase()} / {terminalDuration === 0 ? '무제한' : `${terminalDuration}초`}</span>
                <button className="terminal-launch" onClick={launchTraining}>훈련 시작 <span>→</span></button>
              </footer>
            </section>
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
      Number(settings.sensitivity.toFixed(3)),
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
        sensitivity: Math.max(0.05, Math.min(2.0, candidate)),
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
    const headshotRate = stats.hits ? ((stats.headHits ?? 0) / stats.hits) * 100 : 0;
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
            <div className="result-zone-grid">
              <div><b>{stats.headHits ?? 0}</b><span>HEAD · {headshotRate.toFixed(0)}%</span></div>
              <div><b>{stats.bodyHits ?? 0}</b><span>BODY HITS</span></div>
              <div><b>{stats.legHits ?? 0}</b><span>LEG HITS</span></div>
              <div><b>{stats.kills ?? 0}</b><span>ELIMINATIONS</span></div>
              <div><b>{stats.damageDealt ?? 0}</b><span>DAMAGE</span></div>
              <div><b>{stats.averageSpread?.toFixed(2) ?? '--'}°</b><span>AVG SPREAD</span></div>
            </div>
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
            <div className="settings-subsection">
              <p className="eyebrow">WEAPON</p>
              <strong>훈련 무기</strong>
              <select className="settings-select" value={settings.weapon} onChange={(e) => onChange({ ...settings, weapon: e.target.value as WeaponId })}>
                {Object.entries(WEAPONS).map(([id, weapon]) => <option key={id} value={id}>{weapon.name} · {weapon.type}</option>)}
              </select>
              <p className="settings-note">무기 수치는 훈련용 근사값이며 실제 게임과 완전히 동일하지 않습니다.</p>
            </div>
            <div className="settings-subsection">
              <p className="eyebrow">MOVEMENT</p>
              <strong>이동 설정</strong>
              <label className="settings-inline">이동 속도 <input type="range" min="2" max="7" step=".1" value={settings.moveSpeed} onChange={(e) => onChange({ ...settings, moveSpeed: Number(e.target.value) })} /><output>{settings.moveSpeed.toFixed(1)}</output></label>
              <div className="keybind-grid">
                {([
                  ['forward','앞','W'],['left','왼쪽','A'],['back','뒤','S'],['right','오른쪽','D'],
                  ['crouch','앉기','C'],['walk','걷기','Shift'],['jump','점프','Space'],
                ] as const).map(([key,label,placeholder]) => (
                  <label className="keybind-item" key={key}>
                    <span>{label}</span>
                    <input value={settings.keybinds[key]} placeholder={placeholder} onChange={(e) => onChange({ ...settings, keybinds: { ...settings.keybinds, [key]: e.target.value || DEFAULT_KEYBINDS[key] } })} />
                  </label>
                ))}
              </div>
              <p className="settings-note">키 입력은 브라우저 KeyboardEvent.code 기준입니다. 기본값: W/A/S/D · C · Shift · Space</p>
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
    const [mapId, setMapId] = useState<TrainingMapId>('range');
    const [config, setConfig] = useState<TrainingConfig>({ drill: 'flick', duration: 30, difficulty: 'duel', feedbackEnabled: true, aimCoach: false, flickBotCount: 3, flickMode: 'random', botBehavior: 'peek', peekCueEnabled: true, damageModelEnabled: true });
    const [results, setResults] = useState<RunStats | null>(null);
    useEffect(() => saveStorage('sanghyeon-settings', settings), [settings]);
    const start = (drill: Drill, duration: number, difficulty: string, feedbackEnabled = true, aimCoach = false, flickMode: FlickMode = 'random', flickBotCount = 3) => { setConfig({ drill, duration, difficulty, feedbackEnabled, aimCoach, flickBotCount, flickMode }); setView('range'); };
    const complete = (stats: RunStats) => { setResults(stats); const item: HistoryItem = { score: stats.score, accuracy: stats.accuracy, drill: stats.drill, hits: stats.hits, shots: stats.shots, streak: stats.streak, headHits: stats.headHits, bodyHits: stats.bodyHits, legHits: stats.legHits, kills: stats.kills, date: new Date().toLocaleDateString('ko-KR') }; const next = [item, ...history].slice(0, 50); setHistory(next); saveStorage('sanghyeon-history', next); setView('results'); };
    if (view === 'home') return <Home settings={settings} onSettings={() => undefined} onStart={start} history={history} onNavigate={setView} onSettingsChange={setSettings} onSelectDrill={(drill) => { setConfig((current) => ({ ...current, drill })); }} onEnterRange={() => setView('range')} />;
    if (view === 'setup') return <TrainingSetup drill={config.drill} onStart={start} onBack={() => setView('home')} />;
    if (view === 'range') return <RangeScene {...config} mapId={mapId} onMapChange={setMapId} onConfigChange={setConfig} onLeave={() => setView('home')} settings={settings} onSettingsChange={setSettings} onFinish={complete} />;
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
