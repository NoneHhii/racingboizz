export type VehicleCategory =
  | 'priority'
  | 'taxi'
  | 'speedster'
  | 'normal'
  | 'heavy'
  | 'truck'
  | 'bus'
  | 'limo';

export type VehicleBehavior =
  | 'normal'
  | 'police'
  | 'ambulance'
  | 'taxi'
  | 'speeder'
  | 'truck';

export interface VehicleDefinition {
  id: string;
  name: string;
  category: VehicleCategory;
  frames: string[];
  width: number;
  height: number;
  hitbox: { w: number; h: number };
  speedMultiplier: number;
  isSpecial?: boolean;
  behavior: VehicleBehavior;
  color?: string;
}

export interface TrafficCar {
  id: string;
  def: VehicleDefinition;
  x: number;
  y: number;
  lane: number; // 0, 1, 2
  targetLane: number;
  laneOffset: number; // -14 to +14 px drift within/across lane
  targetLaneOffset: number;
  driftTimer: number;
  isChangingLane: boolean;
  laneChangeProgress: number; // 0 to 1
  laneChangeSpeed: number; // speed of lane shift
  turnSignal: 'left' | 'right' | null;
  turnSignalTimer: number;
  speed: number; // current relative road speed in px/s
  baseSpeed: number; // nominal cruising speed
  targetSpeed: number;
  angle: number; // radians
  animFrame: number;
  animTimer: number;
  isBurnt: boolean;
  burntSpriteKey: string;
  specialTimer: number; // used for siren / swerving logic
  laneChangeCooldown: number;
  tailgatingTimer: number;
  renderScale: number;
  hasCutOffPlayer?: boolean;
}

export type BikeColorTheme = 'lime' | 'crimson' | 'phantom' | 'gold' | 'stealth' | 'synthwave';

export interface BikeThemeConfig {
  id: BikeColorTheme;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  glow: string;
  helmet: string;
  visor: string;
}

export interface PlayerMotorcycle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  lean: number; // -1 (full left) to 1 (full right)
  targetLean: number;
  speedKmh: number;
  roadSpeed: number; // current road scroll speed px/s
  minRoadSpeed: number;
  maxRoadSpeed: number;
  baseRoadSpeed: number;
  throttle: number; // -1 (brake) to 1 (boost/accel)
  isAirborne: boolean;
  jumpZ: number; // 0 (ground) to 1 (apex)
  jumpProgress: number; // 0 to 1
  jumpDuration: number; // seconds
  jumpCooldown: number; // seconds remaining
  jumpMaxCooldown: number; // total cooldown seconds
  isCrashed: boolean;
  crashTimer: number;
  colorTheme: BikeColorTheme;
  hitbox: { w: number; h: number };
  wheelie: number; // 0 to 1
  adrenaline: number; // 0 to 100
  headlightAngle: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  maxSize: number;
  life: number; // 0 to 1
  decay: number;
  color: string;
  alpha: number;
  type: 'smoke' | 'fire' | 'spark' | 'speedline' | 'skid' | 'air';
}

export interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
  life: number; // 0 to 1
  vy: number;
  scale: number;
}

export interface RoadParams {
  totalWidth: number;
  laneCount: number;
  laneWidth: number;
  shoulderWidth: number;
  laneCenters: number[]; // x center for lane 0, 1, 2
  splitLines: number[]; // x coordinate for splits between lane 0-1 and 1-2
  leftBound: number;
  rightBound: number;
}

export type GameState = 'menu' | 'playing' | 'paused' | 'crashed' | 'gameover';

export interface GameStats {
  score: number;
  distance: number; // meters
  timeAlive: number; // seconds
  speedKmh: number;
  maxSpeedKmh: number;
  laneSplitsCount: number;
  closeCallsCount: number;
  comboMultiplier: number;
  comboTimer: number;
  difficultyLevel: number;
  difficultyName: string;
  highScore: number;
  bestDistance: number;
}
