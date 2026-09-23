import type { CrosshairConfig, Keybinds, Settings, WeaponId } from './types';

export const WEAPONS: Record<
  WeaponId,
  {
    name: string;
    type: string;
    fireRate: number;
    spread: number;
    damage: number;
    magazine: number;
    recoil: number;
    automatic: boolean;
  }
> = {
  classic: { name: '클래식', type: '보조', fireRate: 6.75, spread: 0.38, damage: 78, magazine: 12, recoil: 0.72, automatic: false },
  ghost: { name: '고스트', type: '보조', fireRate: 6.75, spread: 0.3, damage: 105, magazine: 13, recoil: 0.62, automatic: false },
  sheriff: { name: '셰리프', type: '보조', fireRate: 4, spread: 0.25, damage: 159, magazine: 6, recoil: 0.95, automatic: false },
  guardian: { name: '가디언', type: '소총', fireRate: 5.25, spread: 0.18, damage: 195, magazine: 12, recoil: 0.82, automatic: false },
  vandal: { name: '밴달', type: '소총', fireRate: 9.75, spread: 0.25, damage: 160, magazine: 25, recoil: 1, automatic: true },
  phantom: { name: '팬텀', type: '소총', fireRate: 11, spread: 0.2, damage: 156, magazine: 30, recoil: 0.86, automatic: true },
  marshal: { name: '마샬', type: '저격', fireRate: 1.5, spread: 0.05, damage: 202, magazine: 5, recoil: 1.15, automatic: false },
  operator: { name: '오퍼레이터', type: '저격', fireRate: 0.6, spread: 0.035, damage: 255, magazine: 5, recoil: 1.35, automatic: false },
  ares: { name: '아레스', type: '중기관총', fireRate: 13, spread: 0.42, damage: 160, magazine: 50, recoil: 1.08, automatic: true },
  odin: { name: '오딘', type: '중기관총', fireRate: 12, spread: 0.46, damage: 160, magazine: 100, recoil: 1.12, automatic: true },
};

export const DEFAULT_KEYBINDS: Keybinds = {
  forward: 'KeyW',
  left: 'KeyA',
  back: 'KeyS',
  right: 'KeyD',
  crouch: 'KeyC',
  walk: 'ShiftLeft',
  jump: 'Space',
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
