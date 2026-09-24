export type Drill = 'flick' | 'tracking' | 'braking';
export type FlickMode = 'random' | 'headline' | 'robot';
export type TrainingMapId = 'range' | 'corridor' | 'arena';
export type BotBehavior = 'static' | 'peek' | 'strafe';

export type TrainingConfig = {
  drill: Drill;
  duration: number;
  difficulty: string;
  feedbackEnabled: boolean;
  aimCoach: boolean;
  flickBotCount: number;
  flickMode: FlickMode;
  customTargetSize?: number;
  customTargetSpeed?: number;
  botBehavior?: BotBehavior;
  peekCueEnabled?: boolean;
  damageModelEnabled?: boolean;
};

export type View =
  | 'home'
  | 'setup'
  | 'range'
  | 'results'
  | 'sensitivity'
  | 'growth'
  | 'crosshair';

export type RunStatus = 'active' | 'paused' | 'done';

export type CrosshairConfig = {
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

export type TelemetryMode = 'off' | 'text' | 'graph' | 'both';
export type WeaponId =
  | 'classic'
  | 'ghost'
  | 'sheriff'
  | 'guardian'
  | 'vandal'
  | 'phantom'
  | 'marshal'
  | 'operator'
  | 'ares'
  | 'odin';

export type WeaponPerformance = {
  shots: number;
  hits: number;
  headHits: number;
  bodyHits: number;
  legHits: number;
  kills: number;
  damageDealt: number;
  movingShots: number;
  totalSpread: number;
};

export type Keybinds = {
  forward: string;
  left: string;
  back: string;
  right: string;
  crouch: string;
  walk: string;
  jump: string;
};

export type Settings = {
  sensitivity: number;
  crosshair: CrosshairConfig;
  telemetryMode: TelemetryMode;
  weapon: WeaponId;
  moveSpeed: number;
  keybinds: Keybinds;
};

export type RunStats = {
  score: number;
  accuracy: number;
  streak: number;
  hits: number;
  shots: number;
  drill: Drill;
  duration: number;
  avgReaction?: number;
  bestReaction?: number;
  overshoots?: number;
  maxStreak?: number;
  headHits?: number;
  bodyHits?: number;
  legHits?: number;
  kills?: number;
  damageDealt?: number;
  movingShots?: number;
  averageSpread?: number;
  weaponStats?: Partial<Record<WeaponId, WeaponPerformance>>;
};

export type HistoryItem = {
  score: number;
  accuracy: number;
  drill: Drill;
  date: string;
  hits?: number;
  shots?: number;
  streak?: number;
  headHits?: number;
  bodyHits?: number;
  legHits?: number;
  kills?: number;
  damageDealt?: number;
  movingShots?: number;
  averageSpread?: number;
  weaponStats?: Partial<Record<WeaponId, WeaponPerformance>>;
};
