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
type View = 'home' | 'range' | 'results';
type RunStatus = 'active' | 'paused' | 'done';
type Settings = { sensitivity: number; crosshair: number };
type RunStats = { score: number; accuracy: number; streak: number; hits: number; shots: number; drill: Drill; duration: number };
type HistoryItem = { score: number; accuracy: number; drill: Drill; date: string };

const queryClient = new QueryClient();
const DEFAULT_SETTINGS: Settings = { sensitivity: 1.15, crosshair: 36 };

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

function Brand() {
  return (
    <div className="brand" data-testid="brand-sanghyeon">
      <div className="brand-mark" aria-hidden="true"><span /></div>
      <div><div className="brand-name">Sanghyeon Aim Lab</div><div className="brand-sub">3D 정밀 사격장 / 온라인</div></div>
    </div>
  );
}

function SettingsPanel({ settings, onChange, onClose }: { settings: Settings; onChange: (next: Settings) => void; onClose: () => void }) {
  return (
    <div className="modal-dim" role="dialog" aria-modal="true" aria-label="Range settings" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <div className="pause-modal settings-modal">
        <div className="panel-kicker"><span>감도 설정 / 02</span><button className="hud-button" onClick={onClose} data-testid="button-close-settings" aria-label="설정 닫기"><X size={16} /></button></div>
        <h2>조작 설정</h2>
        <p>내 마우스와 손에 맞게 훈련 환경을 조정하세요.</p>
        <div className="settings-row">
          <label htmlFor="sensitivity">마우스 감도</label>
          <input id="sensitivity" type="range" min="0.4" max="2.4" step="0.05" value={settings.sensitivity} onChange={(event) => onChange({ ...settings, sensitivity: Number(event.target.value) })} data-testid="input-sensitivity" />
          <output htmlFor="sensitivity">{settings.sensitivity.toFixed(2)}</output>
        </div>
        <div className="settings-row">
          <label htmlFor="crosshair">크로스헤어 크기</label>
          <input id="crosshair" type="range" min="22" max="56" step="2" value={settings.crosshair} onChange={(event) => onChange({ ...settings, crosshair: Number(event.target.value) })} data-testid="input-crosshair-size" />
          <output htmlFor="crosshair">{settings.crosshair}px</output>
        </div>
        <div className="modal-actions"><button className="secondary-button" onClick={onClose} data-testid="button-done-settings">설정 저장</button></div>
      </div>
    </div>
  );
}

function Home({ settings, onSettings, onStart, history }: { settings: Settings; onSettings: () => void; onStart: (drill: Drill, duration: number, difficulty: string) => void; history: HistoryItem[] }) {
  const [drill, setDrill] = useState<Drill>('flick');
  const [duration, setDuration] = useState(30);
  const [difficulty, setDifficulty] = useState('operator');
  const best = history.length ? Math.max(...history.map((item) => item.score)) : 0;
  const lastAccuracy = history[0]?.accuracy ?? 0;
  return (
    <div className="aim-app">
      <header className="app-header">
        <Brand />
        <div className="header-meta"><span><span className="live-dot" style={{ display: 'inline-block', marginRight: 8 }} /> RANGE 01 / READY</span><strong>LOCAL SESSION</strong><button className="hud-button" onClick={onSettings} aria-label="Open settings" data-testid="button-open-settings"><Settings2 size={16} /></button></div>
      </header>
      <div className="home-layout">
        <main className="home-main">
          <div className="eyebrow"><span className="eyebrow-line" /> 훈련 콘솔 / 3D 전환</div>
          <h1 className="hero-title">조준을<br /><em>정교하게.</em></h1>
          <p className="hero-copy">발로란트식 1인칭 사격장에서 조준 감각을 다듬으세요. 훈련을 고르고 시간을 정하면 실시간 기록이 바로 시작됩니다.</p>
          <div className="drill-heading"><h2>훈련 선택</h2><span>01 — 03</span></div>
          <div className="drill-grid">
            <button className={`drill-card ${drill === 'flick' ? 'selected' : ''}`} onClick={() => setDrill('flick')} data-testid="button-drill-flick">
              <Crosshair className="drill-icon" size={24} /><h3>플릭 / 순간 조준</h3><p>서로 다른 거리의 표적을 빠르게 전환하세요. 첫 발의 속도와 정확도를 측정합니다.</p>
            </button>
            <button className={`drill-card ${drill === 'tracking' ? 'selected' : ''}`} onClick={() => setDrill('tracking')} data-testid="button-drill-tracking">
              <Target className="drill-icon" size={24} /><h3>트래킹 / 추적 조준</h3><p>움직이는 표적을 조준선 안에 유지하세요. 안정적인 컨트롤을 훈련합니다.</p>
            </button>
            <button className={`drill-card ${drill === 'braking' ? 'selected' : ''}`} onClick={() => setDrill('braking')} data-testid="button-drill-braking">
              <Gauge className="drill-icon" size={24} /><h3>브레이킹 / 감속 조준</h3><p>빠르게 이동한 표적이 감속해 멈추는 순간 정확하게 첫 발을 꽂습니다.</p>
            </button>
          </div>
          <div className="setup-row">
            <div><label className="field-label" htmlFor="duration">훈련 시간</label><select id="duration" className="select-field" value={duration} onChange={(event) => setDuration(Number(event.target.value))} data-testid="select-duration"><option value={15}>15초</option><option value={30}>30초</option><option value={60}>60초</option></select></div>
            <div><label className="field-label" htmlFor="difficulty">표적 난이도</label><select id="difficulty" className="select-field" value={difficulty} onChange={(event) => setDifficulty(event.target.value)} data-testid="select-difficulty"><option value="trainee">연습생 / 넓은 표적</option><option value="operator">요원 / 기본</option><option value="elite">엘리트 / 작은 표적</option></select></div>
            <button className="start-button" onClick={() => onStart(drill, duration, difficulty)} data-testid="button-start-run"><Play size={16} fill="currentColor" /> 훈련 시작</button>
          </div>
          <div className="utility-note"><Keyboard size={14} /> <span>이동</span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><span>마우스 시점 / 클릭 사격</span></div>
        </main>
        <aside className="side-panel">
          <div className="panel-kicker"><span>개인 기록</span><span>v.03</span></div>
          <h2 className="panel-title">훈련 기록</h2>
          <div className="telemetry-hero"><span className="metric-label">최고 점수</span><strong className="metric-value" data-testid="text-best-score">{best ? best.toLocaleString() : '—'}</strong><span className="metric-caption">{history.length ? '나의 최고 기록' : '훈련을 완료하면 기록이 저장됩니다'}</span></div>
          <div className="side-rule" />
          <div className="stat-list"><div className="stat-row"><span>훈련 횟수</span><strong data-testid="text-runs-logged">{history.length.toString().padStart(2, '0')}</strong></div><div className="stat-row"><span>최근 명중률</span><strong data-testid="text-last-accuracy">{history.length ? `${lastAccuracy.toFixed(1)}%` : '—'}</strong></div><div className="stat-row"><span>현재 감도</span><strong>{settings.sensitivity.toFixed(2)}</strong></div></div>
          <div className="side-rule" />
          <div className="history-title">최근 훈련</div>
          {history.length === 0 ? <div className="history-row"><small>아직 기록이 없습니다</small><strong>—</strong></div> : history.slice(0, 4).map((item, index) => <div className="history-row" key={`${item.date}-${index}`} data-testid={`row-history-${index}`}><div><strong>{item.score.toLocaleString()}</strong><small style={{ display: 'block', marginTop: 4 }}>{item.drill === 'flick' ? '플릭' : item.drill === 'tracking' ? '트래킹' : '브레이킹'} / {item.date}</small></div><em>{item.accuracy.toFixed(1)}%</em></div>)}
        </aside>
      </div>
    </div>
  );
}

function RangeScene({ drill, duration, difficulty, settings, onSettingsChange, onFinish }: { drill: Drill; duration: number; difficulty: string; settings: Settings; onSettingsChange: (next: Settings) => void; onFinish: (stats: RunStats) => void }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<RunStats>({ score: 0, accuracy: 100, streak: 0, hits: 0, shots: 0, drill, duration });
  const timeRef = useRef(duration);
  const statusRef = useRef<RunStatus>('active');
  const [status, setStatus] = useState<RunStatus>('active');
  const [timeLeft, setTimeLeft] = useState(duration);
  const [stats, setStats] = useState(statsRef.current);
  const [feedback, setFeedback] = useState<{ text: string; miss: boolean; id: number } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pointerLocked, setPointerLocked] = useState(false);
  const targetMeshRef = useRef<THREE.Mesh | null>(null);
  const sensitivityRef = useRef(settings.sensitivity);
  const difficultySize = difficulty === 'trainee' ? 0.55 : difficulty === 'elite' ? 0.31 : 0.42;
  const finish = useCallback(() => {
    if (statusRef.current === 'done') return;
    statusRef.current = 'done';
    const current = { ...statsRef.current, accuracy: statsRef.current.shots ? statsRef.current.hits / statsRef.current.shots * 100 : 0 };
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
    const camera = new THREE.PerspectiveCamera(72, mount.clientWidth / mount.clientHeight, 0.1, 100);
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
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(26, 7, .3), wallMaterial); backWall.position.set(0, 3.5, -7); scene.add(backWall);
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
      window.setTimeout(() => { muzzleFlash.material.opacity = 0; }, 45);
      createTracer(end);
    };

    let brakingElapsed = 0;
    let brakingDirection = 0;
    let brakingCycles = 0;
    const brakingStopThreshold = .16;
    const brakingTargetY = 2.25;
    const brakingTargetZ = -4.2;
    const spawn = () => {
      if (targetMeshRef.current) group.remove(targetMeshRef.current);
      const geometry = new THREE.CylinderGeometry(difficultySize, difficultySize, .12, 32);
      const material = new THREE.MeshStandardMaterial({ color: '#ddff65', emissive: '#628c1b', emissiveIntensity: 1.2, metalness: .1, roughness: .38 });
      const target = new THREE.Mesh(geometry, material);
      target.rotation.x = Math.PI / 2;
      if (drill === 'braking') {
        brakingElapsed = 0;
        brakingDirection = Math.random() < 0.5 ? 1 : -1;
        brakingCycles += 1;
        target.position.set((Math.random() - .5) * 2.6, brakingTargetY + (Math.random() - .5) * .35, brakingTargetZ);
      } else {
        target.position.set((Math.random() - .5) * 8, 1.25 + Math.random() * 3.7, -1.2 - Math.random() * 4.8);
      }
      target.castShadow = true;
      group.add(target); targetMeshRef.current = target;
    };
    spawn();
    const raycaster = new THREE.Raycaster();
    const keys = new Set<string>();
    const velocity = new THREE.Vector3();
    const onPointerMove = (event: PointerEvent) => {
      if (statusRef.current !== 'active' || document.pointerLockElement !== renderer.domElement) return;
      const lookScale = .0016 * sensitivityRef.current;
      yaw -= (event.movementX || 0) * lookScale;
      pitch = THREE.MathUtils.clamp(pitch - (event.movementY || 0) * lookScale, -1.08, 1.08);
      camera.rotation.set(pitch, yaw, 0);
    };
    const onShoot = (event: MouseEvent) => {
      if (statusRef.current !== 'active') return;
      event.preventDefault();
      if (document.pointerLockElement !== renderer.domElement) renderer.domElement.requestPointerLock?.();
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
      const hit = targetMeshRef.current ? raycaster.intersectObject(targetMeshRef.current).length > 0 : false;
      const next = { ...statsRef.current, shots: statsRef.current.shots + 1 };
      const brakingMoving = drill === 'braking' && velocity.length() > brakingStopThreshold;
      const targetPoint = targetMeshRef.current ? targetMeshRef.current.getWorldPosition(new THREE.Vector3()) : camera.position.clone().add(new THREE.Vector3(0, 0, -30).applyQuaternion(camera.quaternion));
      const tracerEnd = targetPoint.clone().add(new THREE.Vector3((Math.random() - .5) * .03, (Math.random() - .5) * .03, (Math.random() - .5) * .03));
      fireVisual(tracerEnd);
      if (hit && !brakingMoving) {
        next.hits += 1;
        next.streak += 1;
        const stopQuality = drill === 'braking' ? Math.max(0, 1 - velocity.length() / .9) : 1;
        const points = Math.round(100 * (1 + Math.min(next.streak, 15) * .08) * (1 + stopQuality * .5) * (difficulty === 'elite' ? 1.35 : difficulty === 'trainee' ? .8 : 1));
        next.score += points;
        setFeedback({ text: drill === 'braking' ? `브레이크 명중 +${points}` : `명중 +${points}`, miss: false, id: Date.now() });
        spawn();
      } else {
        next.streak = 0;
        next.score = Math.max(0, next.score - 20);
        setFeedback({ text: brakingMoving ? '이동 중 발사 -20' : '빗나감 -20', miss: true, id: Date.now() });
      }
      next.accuracy = next.shots ? next.hits / next.shots * 100 : 0; statsRef.current = next; setStats({ ...next });
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (['w', 'a', 's', 'd'].includes(key)) { keys.add(key); event.preventDefault(); }
    };
    const onKeyUp = (event: KeyboardEvent) => { keys.delete(event.key.toLowerCase()); };
    const onBlur = () => keys.clear();
    const onPointerLockChange = () => setPointerLocked(document.pointerLockElement === renderer.domElement);
    const onCanvasClick = (event: MouseEvent) => onShoot(event);
    const moveSpeed = 4.5;
    const applyMovement = (delta: number) => {
      const horizontal = Number(keys.has('d')) - Number(keys.has('a'));
      const forwardInput = drill === 'braking' ? 0 : Number(keys.has('w')) - Number(keys.has('s'));
      const input = new THREE.Vector3(horizontal, 0, forwardInput);
      if (input.lengthSq() > 1) input.normalize();
      const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
      const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      const desired = forward.multiplyScalar(input.z * moveSpeed).add(right.multiplyScalar(input.x * (drill === 'braking' ? 3.8 : moveSpeed)));
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
    let frame = 0; let previous = performance.now();
    const animate = (now: number) => {
      frame = requestAnimationFrame(animate);
      const delta = Math.min((now - previous) / 1000, .05);
      previous = now;
      if (statusRef.current === 'active') {
        applyMovement(delta);
        if (drill === 'tracking' && targetMeshRef.current) {
          const target = targetMeshRef.current;
          target.position.x += Math.sin(now * .0012) * delta * .8;
          target.position.y += Math.cos(now * .001) * delta * .45;
          target.position.x = THREE.MathUtils.clamp(target.position.x, -4.8, 4.8);
          target.position.y = THREE.MathUtils.clamp(target.position.y, .8, 5.1);
        }
        if (drill === 'braking' && targetMeshRef.current) {
          const target = targetMeshRef.current;
          // The target stays still. The exercise is about YOUR strafe -> stop -> shot rhythm.
          // Change the target's position only after a successful shot so each repetition is a fresh read.
          if (brakingCycles === 0) spawn();
        }
      }
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(frame); renderer.domElement.removeEventListener('pointermove', onPointerMove); renderer.domElement.removeEventListener('click', onCanvasClick); document.removeEventListener('pointerlockchange', onPointerLockChange); window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); window.removeEventListener('blur', onBlur); window.removeEventListener('resize', resize); if (document.pointerLockElement === renderer.domElement) document.exitPointerLock(); renderer.dispose(); mount.removeChild(renderer.domElement); };
  }, [difficulty, drill, finish, difficultySize]);

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
      <div ref={mountRef} className="range-canvas-wrap" data-testid="canvas-3d-range" />
      <div className="range-hud">
         <div className="hud-top"><div className="hud-brand"><b>사격장 01</b> / {drill === 'flick' ? '순간 조준' : drill === 'tracking' ? '추적 조준' : '브레이킹'} / 진행 중</div><div className="hud-actions"><button className="hud-button" onClick={() => setSettingsOpen(true)} aria-label="훈련 설정 열기" data-testid="button-range-settings"><Settings2 size={16} /></button><button className="hud-button" onClick={togglePause} aria-label={status === 'paused' ? '훈련 재개' : '훈련 일시정지'} data-testid="button-pause-run">{status === 'paused' ? <Play size={16} /> : <Pause size={16} />}</button><button className="hud-button" onClick={exit} aria-label="훈련 종료" data-testid="button-exit-run"><X size={17} /></button></div></div>
         <div className="hud-metrics"><div className="hud-stat accent"><label>점수</label><strong data-testid="telemetry-score">{stats.score.toString().padStart(4, '0')}</strong></div><div className="hud-stat"><label>명중률</label><strong data-testid="telemetry-accuracy">{stats.accuracy.toFixed(1)}%</strong></div><div className="hud-stat"><label>연속 명중</label><strong data-testid="telemetry-streak">{stats.streak.toString().padStart(2, '0')}</strong></div></div>
         <div className={`hud-time ${timeLeft < 5 ? 'low' : ''}`}><label>남은 시간</label><strong data-testid="telemetry-time">{timeLeft.toFixed(1)}초</strong></div>
        <div className="crosshair" style={{ width: settings.crosshair, height: settings.crosshair }}><i /></div>
        {drill === 'braking' && <div className="braking-guide"><b>브레이킹</b><span>A / D 이동 → 손을 떼거나 반대 입력 → 완전 정지 → CLICK</span></div>}
        {feedback && <div key={feedback.id} className={`hit-feedback ${feedback.miss ? 'miss' : ''}`}>{feedback.text}</div>}
         {!pointerLocked && status === 'active' && <div className="pointer-lock-hint">클릭하여 시점 잠금 · 조준 시작</div>}
         <div className="hud-bottom"><div className="move-hint"><span>이동</span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><span>마우스 시점 / 클릭 사격</span></div><div className="range-status"><Gauge size={13} style={{ verticalAlign: 'middle', marginRight: 7 }} /> 표적 프로필: <b>{difficulty === 'trainee' ? '연습생' : difficulty === 'elite' ? '엘리트' : '요원'}</b></div></div>
      </div>
       {status === 'paused' && <div className="modal-dim"><div className="pause-modal"><Pause size={25} color="hsl(71 100% 61%)" /><h2>훈련 일시정지</h2><p>시간은 멈춰 있습니다. 준비가 되면 계속하세요.</p><div className="modal-actions"><button className="secondary-button" onClick={togglePause} data-testid="button-resume-run"><Play size={13} style={{ verticalAlign: 'middle', marginRight: 7 }} /> 계속하기</button><button className="danger-button" onClick={exit} data-testid="button-exit-paused">훈련 종료</button></div></div></div>}
      {settingsOpen && <SettingsPanel settings={settings} onChange={onSettingsChange} onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

function Results({ stats, onAgain, onHome }: { stats: RunStats; onAgain: () => void; onHome: () => void }) {
  return (
    <div className="aim-app results-screen"><div className="results-shell"><div className="results-top"><Brand /><div className="results-kicker">훈련 결과 / 01</div></div><div className="results-kicker">{stats.drill === 'flick' ? '순간 조준' : stats.drill === 'tracking' ? '추적 조준' : '브레이킹'} 훈련 완료</div><h1 className="results-title">기록이<br /><span>저장되었습니다.</span></h1><p className="results-sub">결과를 확인하고 다음 훈련에서 더 정교하게 조준해보세요.</p><div className="results-grid"><div className="result-score"><label>최종 점수</label><strong data-testid="results-score">{stats.score.toLocaleString()}</strong><small>{stats.hits}회 명중 / {stats.shots}회 사격</small></div><div className="result-metrics"><div className="result-metric"><label>명중률</label><strong data-testid="results-accuracy">{stats.accuracy.toFixed(1)}%</strong></div><div className="result-metric"><label>최고 연속</label><strong data-testid="results-streak">{stats.streak.toString().padStart(2, '0')}</strong></div><div className="result-metric"><label>훈련 시간</label><strong>{stats.duration}초</strong></div><div className="result-metric"><label>프로토콜</label><strong>{stats.drill === 'flick' ? '플릭' : stats.drill === 'tracking' ? '트래킹' : '브레이킹'}</strong></div></div></div><div className="result-actions"><button className="start-button" onClick={onAgain} data-testid="button-run-again"><RotateCcw size={15} /> 다시 훈련</button><button className="secondary-button" onClick={onHome} data-testid="button-return-home">훈련 선택으로</button></div><footer className="results-footer"><span>기록은 이 브라우저에 자동 저장됩니다</span><span>Sanghyeon / 3D 에임랩</span></footer></div></div>
  );
}

function HomeRoute() {
  const [view, setView] = useState<View>('home');
  const [settings, setSettings] = useState<Settings>(() => readStorage('sanghyeon-settings', DEFAULT_SETTINGS));
  const [history, setHistory] = useState<HistoryItem[]>(() => readStorage('sanghyeon-history', []));
  const [config, setConfig] = useState<{ drill: Drill; duration: number; difficulty: string }>({ drill: 'flick', duration: 30, difficulty: 'operator' });
  const [results, setResults] = useState<RunStats | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => saveStorage('sanghyeon-settings', settings), [settings]);
  const start = (drill: Drill, duration: number, difficulty: string) => { setConfig({ drill, duration, difficulty }); setView('range'); };
  const complete = (stats: RunStats) => { setResults(stats); const item: HistoryItem = { score: stats.score, accuracy: stats.accuracy, drill: stats.drill, date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }; const next = [item, ...history].slice(0, 8); setHistory(next); saveStorage('sanghyeon-history', next); setView('results'); };
  return view === 'home' ? <><Home settings={settings} onSettings={() => setSettingsOpen(true)} onStart={start} history={history} />{settingsOpen && <SettingsPanel settings={settings} onChange={setSettings} onClose={() => setSettingsOpen(false)} />}</> : view === 'range' ? <RangeScene {...config} settings={settings} onSettingsChange={setSettings} onFinish={complete} /> : results ? <Results stats={results} onAgain={() => setView('range')} onHome={() => setView('home')} /> : null;
}

function Router() {
  return <RoutedErrorBoundary><Switch><Route path="/" component={HomeRoute} /><Route component={NotFound} /></Switch></RoutedErrorBoundary>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;