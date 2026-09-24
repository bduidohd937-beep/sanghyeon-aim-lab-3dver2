import type { CrosshairConfig, Keybinds, Settings, WeaponId } from './types';

export const WEAPON_DATA_REVISION = 'VALORANT PC 13.06';

export const WEAPONS: Record<
  WeaponId,
  {
    name: string;
    type: string;
    fireRate: number;
    spread: number;
    damage: number;
    magazine: number;
    reloadTime: number;
    headDamage: number;
    bodyDamage: number;
    legDamage: number;
    recoil: number;
    recoilPattern: ReadonlyArray<readonly [number, number]>;
    automatic: boolean;
    damageBands: ReadonlyArray<{ maxDistance: number; head: number; body: number; legs: number }>;
  }
> = {
  classic: { name: '클래식', type: '보조', fireRate: 6.75, spread: 0.38, damage: 78, magazine: 12, reloadTime: 1.75, headDamage: 78, bodyDamage: 26, legDamage: 22, recoil: 0.72, recoilPattern: [[0,.02],[.05,.06],[-.04,.13],[.08,.22],[-.09,.3],[.11,.38]], automatic: false, damageBands: [{maxDistance:30,head:78,body:26,legs:22},{maxDistance:Infinity,head:66,body:22,legs:18}] },
  ghost: { name: '고스트', type: '보조', fireRate: 6.75, spread: 0.3, damage: 105, magazine: 13, reloadTime: 1.5, headDamage: 105, bodyDamage: 30, legDamage: 25, recoil: 0.62, recoilPattern: [[0,.01],[.02,.03],[-.03,.06],[.04,.1],[-.04,.14],[.05,.18]], automatic: false, damageBands: [{maxDistance:30,head:105,body:30,legs:25},{maxDistance:Infinity,head:88,body:25,legs:21}] },
  sheriff: { name: '셰리프', type: '보조', fireRate: 4, spread: 0.25, damage: 159, magazine: 6, reloadTime: 2.25, headDamage: 159, bodyDamage: 55, legDamage: 46, recoil: 0.95, recoilPattern: [[0,.08],[.12,.2],[-.1,.34],[.18,.49],[-.2,.63],[.24,.78]], automatic: false, damageBands: [{maxDistance:30,head:159,body:55,legs:46},{maxDistance:Infinity,head:145,body:50,legs:42}] },
  guardian: { name: '가디언', type: '소총', fireRate: 5.25, spread: 0.18, damage: 195, magazine: 12, reloadTime: 2.5, headDamage: 195, bodyDamage: 65, legDamage: 49, recoil: 0.82, recoilPattern: [[0,.02],[.02,.05],[-.03,.08],[.04,.12],[-.04,.16],[.05,.2]], automatic: false, damageBands: [{maxDistance:Infinity,head:195,body:65,legs:49}] },
  vandal: { name: '밴달', type: '소총', fireRate: 9.75, spread: 0.25, damage: 160, magazine: 25, reloadTime: 2.5, headDamage: 160, bodyDamage: 40, legDamage: 34, recoil: 1, recoilPattern: [[0,.04],[.03,.11],[-.04,.2],[.08,.32],[-.12,.46],[.18,.61],[-.22,.77],[.28,.94]], automatic: true, damageBands: [{maxDistance:Infinity,head:160,body:40,legs:34}] },
  phantom: { name: '팬텀', type: '소총', fireRate: 11, spread: 0.2, damage: 156, magazine: 30, reloadTime: 2.5, headDamage: 156, bodyDamage: 39, legDamage: 33, recoil: 0.86, recoilPattern: [[0,.03],[-.02,.09],[.04,.17],[-.07,.26],[.11,.36],[-.16,.47],[.19,.58],[-.23,.7]], automatic: true, damageBands: [{maxDistance:20,head:156,body:39,legs:33},{maxDistance:Infinity,head:140,body:35,legs:30}] },
  marshal: { name: '마샬', type: '저격', fireRate: 1.5, spread: 0.05, damage: 202, magazine: 5, reloadTime: 2.5, headDamage: 202, bodyDamage: 101, legDamage: 85, recoil: 1.15, recoilPattern: [[0,.08],[0,.12]], automatic: false, damageBands: [{maxDistance:Infinity,head:202,body:101,legs:85}] },
  operator: { name: '오퍼레이터', type: '저격', fireRate: 0.6, spread: 0.035, damage: 255, magazine: 5, reloadTime: 3.7, headDamage: 255, bodyDamage: 150, legDamage: 127, recoil: 1.35, recoilPattern: [[0,.18],[0,.22]], automatic: false, damageBands: [{maxDistance:Infinity,head:255,body:150,legs:127}] },
  ares: { name: '아레스', type: '중기관총', fireRate: 13, spread: 0.42, damage: 75, magazine: 50, reloadTime: 3.25, headDamage: 75, bodyDamage: 30, legDamage: 25, recoil: 1.08, recoilPattern: [[0,.02],[.04,.08],[-.05,.16],[.1,.26],[-.13,.37],[.17,.49],[-.2,.62],[.24,.76]], automatic: true, damageBands: [{maxDistance:30,head:75,body:30,legs:25},{maxDistance:Infinity,head:70,body:28,legs:24}] },
  odin: { name: '오딘', type: '중기관총', fireRate: 12, spread: 0.46, damage: 95, magazine: 100, reloadTime: 5, headDamage: 95, bodyDamage: 38, legDamage: 32, recoil: 1.12, recoilPattern: [[0,.02],[-.03,.07],[.06,.14],[-.1,.23],[.15,.34],[-.2,.46],[.26,.6],[-.32,.75]], automatic: true, damageBands: [{maxDistance:Infinity,head:95,body:38,legs:32}] },
};

export const DEFAULT_KEYBINDS: Keybinds = {
  forward: 'KeyW',
  left: 'KeyA',
  back: 'KeyS',
  right: 'KeyD',
  crouch: 'KeyC',
  walk: 'ShiftLeft',
  jump: 'Space',
  reload: 'KeyR',
  armory: 'KeyB',
  pause: 'Escape',
  terminal: 'KeyT',
};

export const DEFAULT_CROSSHAIR: CrosshairConfig = {
  style: 'classic',
  color: '#ffffff',
  size: 36,
  gap: 5,
  thickness: 2,
  outline: true,
  centerDot: false,
};

export const DEFAULT_SETTINGS: Settings = {
  sensitivity: 1.15,
  crosshair: DEFAULT_CROSSHAIR,
  telemetryMode: 'off',
  weapon: 'vandal',
  moveSpeed: 4.5,
  keybinds: DEFAULT_KEYBINDS,
};

export const CROSSHAIR_PRESETS: Record<string, CrosshairConfig> = {
  CLASSIC: { style: 'classic', color: '#ffffff', size: 32, gap: 5, thickness: 2, outline: true, centerDot: false },
  DOT: { style: 'dot', color: '#ffffff', size: 14, gap: 0, thickness: 3, outline: true, centerDot: true },
  'CROSS DOT': { style: 'cross-dot', color: '#00ff88', size: 30, gap: 6, thickness: 2, outline: true, centerDot: true },
  BOX: { style: 'box', color: '#00ffff', size: 32, gap: 5, thickness: 2, outline: true, centerDot: false },
  CIRCLE: { style: 'circle', color: '#ffffff', size: 30, gap: 3, thickness: 2, outline: true, centerDot: false },
  'T-CROSS': { style: 't-cross', color: '#ff5555', size: 32, gap: 5, thickness: 2, outline: true, centerDot: false },
  'FOUR DOT': { style: 'four-dot', color: '#ffff00', size: 28, gap: 7, thickness: 4, outline: false, centerDot: false },
  PLUS: { style: 'plus', color: '#ffffff', size: 28, gap: 0, thickness: 2, outline: true, centerDot: false },
};

export function normalizeSettings(raw: unknown): Settings {
  if (!raw || typeof raw !== 'object') return DEFAULT_SETTINGS;
  const value = raw as {
    sensitivity?: unknown;
    crosshair?: unknown;
    telemetryMode?: unknown;
    weapon?: unknown;
    moveSpeed?: unknown;
    keybinds?: unknown;
  };
  const sensitivity = typeof value.sensitivity === 'number' ? value.sensitivity : DEFAULT_SETTINGS.sensitivity;
  const telemetryMode =
    value.telemetryMode === 'text' || value.telemetryMode === 'graph' || value.telemetryMode === 'both'
      ? value.telemetryMode
      : DEFAULT_SETTINGS.telemetryMode;
  const weapon = typeof value.weapon === 'string' && value.weapon in WEAPONS
    ? value.weapon as WeaponId
    : DEFAULT_SETTINGS.weapon;
  const moveSpeed = typeof value.moveSpeed === 'number' && value.moveSpeed >= 1 && value.moveSpeed <= 10
    ? value.moveSpeed
    : DEFAULT_SETTINGS.moveSpeed;
  const keybinds = {
    ...DEFAULT_KEYBINDS,
    ...(value.keybinds && typeof value.keybinds === 'object' ? value.keybinds as Partial<Keybinds> : {}),
  };
  const crosshair = typeof value.crosshair === 'number'
    ? { ...DEFAULT_CROSSHAIR, size: value.crosshair }
    : value.crosshair && typeof value.crosshair === 'object'
      ? { ...DEFAULT_CROSSHAIR, ...(value.crosshair as Partial<CrosshairConfig>) }
      : DEFAULT_CROSSHAIR;

  return { sensitivity, crosshair, telemetryMode, weapon, moveSpeed, keybinds };
}
