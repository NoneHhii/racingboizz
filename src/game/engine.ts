import type {
  BikeColorTheme,
  GameState,
  GameStats,
  PlayerMotorcycle,
  TrafficCar
} from './types';
import { RoadRenderer } from './road';
import { TrafficManager } from './traffic';
import { ParticleSystem } from './particles';
import { motorcycleRenderer } from './motorcycleRenderer';
import { sound } from './audio';

export class GameEngine {
  public state: GameState = 'menu';
  public roadRenderer: RoadRenderer;
  public trafficManager: TrafficManager;
  public particles: ParticleSystem;
  public player: PlayerMotorcycle;
  public stats: GameStats;

  // Screen & Camera
  public canvasWidth: number = 480;
  public canvasHeight: number = 720;
  private screenShake: number = 0;
  private timeScale: number = 1.0;

  // Input tracking
  private keys: Record<string, boolean> = {};
  private touchTargetX: number | null = null;
  private isTouchThrottling: boolean = false;
  private isTouchBraking: boolean = false;

  // Scoring & Lane Split tracking
  private lastSplitCarPair: string = '';
  private splitCooldown: number = 0;
  private nearMissCars: Set<string> = new Set();
  private flyOverCars: Set<string> = new Set();

  constructor() {
    this.roadRenderer = new RoadRenderer();
    this.trafficManager = new TrafficManager(this.roadRenderer.params);
    this.particles = new ParticleSystem();

    const roadParams = this.roadRenderer.params;

    // Sweet-spot starting cruise speed: 410 px/s (~120 km/h)
    this.player = {
      x: roadParams.laneCenters[1],
      y: 560,
      vx: 0,
      vy: 0,
      lean: 0,
      targetLean: 0,
      speedKmh: 120,
      roadSpeed: 410,
      minRoadSpeed: 260,
      maxRoadSpeed: 580,
      baseRoadSpeed: 410,
      throttle: 0,
      isAirborne: false,
      jumpZ: 0,
      jumpProgress: 0,
      jumpDuration: 1.05,
      jumpCooldown: 0,
      jumpMaxCooldown: 3.0,
      isCrashed: false,
      crashTimer: 0,
      colorTheme: (localStorage.getItem('racingboizz_theme') as BikeColorTheme) || 'lime',
      hitbox: { w: 20, h: 48 },
      wheelie: 0,
      adrenaline: 0,
      headlightAngle: 0
    };

    const savedHigh = Number(localStorage.getItem('racingboizz_highscore')) || 0;
    const savedDist = Number(localStorage.getItem('racingboizz_best_dist')) || 0;

    this.stats = {
      score: 0,
      distance: 0,
      timeAlive: 0,
      speedKmh: 120,
      maxSpeedKmh: 120,
      laneSplitsCount: 0,
      closeCallsCount: 0,
      comboMultiplier: 1,
      comboTimer: 0,
      difficultyLevel: 1,
      difficultyName: 'Cruiser',
      highScore: savedHigh,
      bestDistance: savedDist
    };

    this.setupInputs();
  }

  public setDimensions(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.player.y = Math.min(height - 120, height * 0.78);
  }

  public setBikeTheme(theme: BikeColorTheme) {
    this.player.colorTheme = theme;
    localStorage.setItem('racingboizz_theme', theme);
  }

  public start() {
    sound.init();
    sound.startEngine();
    this.state = 'playing';

    const roadParams = this.roadRenderer.params;
    this.player.x = roadParams.laneCenters[1];
    this.player.vx = 0;
    this.player.lean = 0;
    this.player.isCrashed = false;
    this.player.crashTimer = 0;
    this.player.isAirborne = false;
    this.player.jumpZ = 0;
    this.player.jumpProgress = 0;
    this.player.jumpCooldown = 0;
    this.player.roadSpeed = 410;
    this.player.baseRoadSpeed = 410;
    this.player.speedKmh = 120;

    this.trafficManager.reset();
    this.particles.clear();
    this.nearMissCars.clear();
    this.flyOverCars.clear();
    this.lastSplitCarPair = '';
    this.splitCooldown = 0;

    this.stats.score = 0;
    this.stats.distance = 0;
    this.stats.timeAlive = 0;
    this.stats.speedKmh = 120;
    this.stats.maxSpeedKmh = 120;
    this.stats.laneSplitsCount = 0;
    this.stats.closeCallsCount = 0;
    this.stats.comboMultiplier = 1;
    this.stats.comboTimer = 0;
    this.stats.difficultyLevel = 1;
    this.stats.difficultyName = 'Cruiser';

    this.timeScale = 1.0;
    this.screenShake = 0;
  }

  public jump() {
    if (this.state !== 'playing' || this.player.isCrashed) return;
    if (this.player.jumpCooldown > 0 || this.player.isAirborne) return;

    this.player.isAirborne = true;
    this.player.jumpProgress = 0;
    this.player.jumpZ = 0;
    this.player.jumpCooldown = this.player.jumpMaxCooldown;

    sound.playJump();
    this.particles.addSpark(this.player.x, this.player.y, 8);
    this.particles.addFloatingText(this.player.x, this.player.y - 40, 'JUMP!', '#38bdf8', 18);
  }

  private setupInputs() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      this.keys[e.code] = true;

      if (e.code === 'Space' || e.key.toLowerCase() === 'j') {
        e.preventDefault();
        if (this.state === 'playing') {
          this.jump();
        } else if (this.state === 'menu' || this.state === 'gameover') {
          this.start();
        }
      }

      if (e.key === 'Enter') {
        if (this.state === 'menu' || this.state === 'gameover') {
          this.start();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
      this.keys[e.code] = false;
    });
  }

  public setTouchTarget(x: number | null, isThrottle = false, isBrake = false) {
    this.touchTargetX = x;
    this.isTouchThrottling = isThrottle;
    this.isTouchBraking = isBrake;
  }

  public update(rawDt: number) {
    const dt = Math.min(rawDt, 0.05) * this.timeScale;

    if (this.state === 'playing') {
      this.updatePlaying(dt);
    } else if (this.state === 'crashed') {
      // CRITICAL FIX: Pass rawDt (unscaled real wall-clock seconds) so crash modal appears fast!
      this.updateCrashed(rawDt);
    }

    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - 25 * rawDt);
    }

    this.particles.update(rawDt);
  }

  private updatePlaying(dt: number) {
    const roadParams = this.roadRenderer.params;
    const p = this.player;

    // 1. Difficulty & Continuous Smooth Speed Progression
    this.stats.timeAlive += dt;
    this.updateDifficulty();

    // Throttle / Brake input
    let targetThrottle = 0;
    if (this.keys['arrowup'] || this.keys['w'] || this.isTouchThrottling) {
      targetThrottle = 1.0;
    } else if (this.keys['arrowdown'] || this.keys['s'] || this.isTouchBraking) {
      targetThrottle = -1.0;
    }
    p.throttle += (targetThrottle - p.throttle) * Math.min(1, 8 * dt);

    // BALANCED SPEED RAMPING (Nhịp game hào hứng ngay từ đầu và tăng đều đặn mượt mà):
    // Khởi đầu: 410 px/s (~120 km/h)
    // Tăng dần đều: +12 px/s mỗi 100m quãng đường, +1.8 px/s mỗi giây
    const speedProgress = Math.min(540, (this.stats.distance / 100) * 12 + this.stats.timeAlive * 1.8);
    const continuousBaseSpeed = 410 + speedProgress;

    p.baseRoadSpeed = continuousBaseSpeed;
    p.maxRoadSpeed = continuousBaseSpeed * 1.40; // Boost tăng 40% tốc độ
    p.minRoadSpeed = Math.max(250, continuousBaseSpeed * 0.60); // Phanh giảm 40%

    if (p.throttle > 0) {
      p.roadSpeed += (p.maxRoadSpeed - p.roadSpeed) * Math.min(1, 2.8 * dt);
    } else if (p.throttle < 0) {
      p.roadSpeed += (p.minRoadSpeed - p.roadSpeed) * Math.min(1, 4.2 * dt);
    } else {
      p.roadSpeed += (p.baseRoadSpeed - p.roadSpeed) * Math.min(1, 2.0 * dt);
    }

    // km/h maps 410 px/s -> 120 km/h
    p.speedKmh = Math.round((p.roadSpeed / 410) * 120);
    this.stats.speedKmh = p.speedKmh;
    if (p.speedKmh > this.stats.maxSpeedKmh) {
      this.stats.maxSpeedKmh = p.speedKmh;
    }

    sound.updateEngine(p.speedKmh, p.throttle);

    // 2. Distance & Score accumulation
    const deltaMeters = (p.speedKmh / 3.6) * dt;
    this.stats.distance += deltaMeters;

    const speedBonus = p.throttle > 0 ? 2.2 : 1.0;
    const pointGain = deltaMeters * 3.2 * this.stats.comboMultiplier * speedBonus;
    this.stats.score += pointGain;

    // Scroll road surface
    const deltaRoadPx = p.roadSpeed * dt;
    this.roadRenderer.update(deltaRoadPx);

    // 3. Horizontal Steering & Leaning Physics
    let steerInput = 0;
    if (this.keys['arrowleft'] || this.keys['a']) steerInput -= 1.0;
    if (this.keys['arrowright'] || this.keys['d']) steerInput += 1.0;

    if (this.touchTargetX !== null) {
      const roadStartX = (this.canvasWidth - roadParams.totalWidth) / 2;
      const targetLocalX = this.touchTargetX - roadStartX;
      const diffX = targetLocalX - p.x;
      if (Math.abs(diffX) > 5) {
        steerInput = Math.sign(diffX) * Math.min(1, Math.abs(diffX) / 40);
      }
    }

    const steerSpeed = 390;
    p.vx = steerInput * steerSpeed;
    p.x += p.vx * dt;

    p.targetLean = steerInput;
    p.lean += (p.targetLean - p.lean) * Math.min(1, 14 * dt);

    // Guardrail bounds
    const roadLeft = roadParams.leftBound + 6;
    const roadRight = roadParams.rightBound - 6;

    if (p.x < roadLeft) {
      p.x = roadLeft;
      p.vx = 0;
      this.particles.addSpark(roadParams.leftBound, p.y, 2);
      this.screenShake = 2.5;
    } else if (p.x > roadRight) {
      p.x = roadRight;
      p.vx = 0;
      this.particles.addSpark(roadParams.rightBound, p.y, 2);
      this.screenShake = 2.5;
    }

    // 4. Jump Physics & Airborne state
    if (p.jumpCooldown > 0) {
      p.jumpCooldown = Math.max(0, p.jumpCooldown - dt);
    }

    if (p.isAirborne) {
      p.jumpProgress += dt / p.jumpDuration;
      p.jumpZ = Math.sin(Math.min(1, p.jumpProgress) * Math.PI);

      if (Math.random() < 0.4) {
        this.particles.addSpeedLines(this.canvasWidth, 1);
      }

      if (p.jumpProgress >= 1.0) {
        p.isAirborne = false;
        p.jumpZ = 0;
        sound.playLand();
        this.particles.addSmoke(p.x, p.y + 15, 3);

        this.checkLandingCollision();
      }
    }

    // 5. Visual effects on speed
    if (p.throttle > 0) {
      this.particles.addSmoke(p.x, p.y + 20, 1);
    }

    if (p.speedKmh > 190 && Math.random() < 0.35) {
      this.particles.addSpeedLines(this.canvasWidth, 1);
    }

    // 6. Update Traffic Manager & AI
    this.trafficManager.update(
      dt,
      p.roadSpeed,
      this.stats.difficultyLevel,
      p.x,
      p.y
    );

    // 7. Collision Detection (Any touch on ground = CRASH!)
    this.checkCarCollisions();

    // 8. Lane Splitting & Close Call detection
    this.checkLaneSplitting(dt);

    // 9. Combo decay
    if (this.stats.comboTimer > 0) {
      this.stats.comboTimer -= dt;
      if (this.stats.comboTimer <= 0) {
        this.stats.comboMultiplier = 1;
      }
    }
  }

  private updateDifficulty() {
    const dist = this.stats.distance;
    let level = 1;
    let name = 'Cruiser';

    // Difficulty tiers tuned for fun progressive milestones
    if (dist > 3800) {
      level = 5;
      name = 'Highway Hell';
    } else if (dist > 2200) {
      level = 4;
      name = 'Speed Demon';
    } else if (dist > 1100) {
      level = 3;
      name = 'Rush Hour';
    } else if (dist > 400) {
      level = 2;
      name = 'Commuter';
    }

    this.stats.difficultyLevel = level;
    this.stats.difficultyName = name;
  }

  private checkCarCollisions() {
    const p = this.player;
    if (p.isCrashed) return;

    if (p.isAirborne && p.jumpZ > 0.2) {
      for (const car of this.trafficManager.cars) {
        if (!this.flyOverCars.has(car.id)) {
          if (Math.abs(car.x - p.x) < 38 && Math.abs(car.y - p.y) < 55) {
            this.flyOverCars.add(car.id);
            this.stats.score += 150 * this.stats.comboMultiplier;
            this.particles.addFloatingText(p.x, p.y - 45, 'FLY OVER! +150', '#a855f7', 16);
          }
        }
      }
      return;
    }

    for (const car of this.trafficManager.cars) {
      if (car.isBurnt) continue;

      const scale = car.renderScale || 1.25;
      const carW = car.def.hitbox.w * scale;
      const carH = car.def.hitbox.h * scale;

      if (this.intersects(p.x, p.y, p.hitbox.w, p.hitbox.h, car.x, car.y, carW, carH)) {
        this.triggerCrash(car);
        break;
      }
    }
  }

  private checkLandingCollision() {
    const p = this.player;
    if (p.isCrashed) return;

    for (const car of this.trafficManager.cars) {
      const scale = car.renderScale || 1.25;
      const carW = car.def.hitbox.w * scale;
      const carH = car.def.hitbox.h * scale;

      if (this.intersects(p.x, p.y, p.hitbox.w, p.hitbox.h, car.x, car.y, carW, carH)) {
        this.triggerCrash(car);
        break;
      }
    }
  }

  private triggerCrash(car: TrafficCar) {
    this.player.isCrashed = true;
    this.player.crashTimer = 0;
    this.state = 'crashed';
    car.isBurnt = true;

    sound.playCrash();
    this.particles.addExplosion(this.player.x, this.player.y);
    this.screenShake = 22;
    this.timeScale = 0.22;

    if (navigator.vibrate) {
      try {
        navigator.vibrate([150, 50, 150]);
      } catch {
        // Ignore
      }
    }

    const finalScore = Math.floor(this.stats.score);
    const finalDist = Math.floor(this.stats.distance);
    if (finalScore > this.stats.highScore) {
      this.stats.highScore = finalScore;
      localStorage.setItem('racingboizz_highscore', String(finalScore));
    }
    if (finalDist > this.stats.bestDistance) {
      this.stats.bestDistance = finalDist;
      localStorage.setItem('racingboizz_best_dist', String(finalDist));
    }
  }

  /**
   * CRITICAL FIX: Rapid Game Over modal appearance!
   * Uses real wall-clock seconds (rawDt), showing Game Over in just 0.65s instead of 8 seconds!
   */
  private updateCrashed(rawDt: number) {
    this.player.crashTimer += rawDt;
    if (Math.random() < 0.4) {
      this.particles.addSmoke(this.player.x + (Math.random() - 0.5) * 15, this.player.y + (Math.random() - 0.5) * 15, 1);
    }

    // Exactly 0.65 real seconds of slow-mo explosion burst, then immediately display Game Over modal!
    if (this.player.crashTimer > 0.65) {
      this.state = 'gameover';
      this.timeScale = 1.0;
    }
  }

  private checkLaneSplitting(dt: number) {
    const p = this.player;
    if (p.isCrashed || p.isAirborne) return;

    const roadParams = this.roadRenderer.params;
    const splitLines = roadParams.splitLines;

    this.splitCooldown = Math.max(0, this.splitCooldown - dt);

    let isNearSplitLine = false;
    let activeSplitX = 0;
    for (const splitX of splitLines) {
      if (Math.abs(p.x - splitX) < 16) {
        isNearSplitLine = true;
        activeSplitX = splitX;
        break;
      }
    }

    if (isNearSplitLine && this.splitCooldown <= 0) {
      let leftCar: TrafficCar | null = null;
      let rightCar: TrafficCar | null = null;

      for (const car of this.trafficManager.cars) {
        if (car.isBurnt) continue;
        const vertDist = Math.abs(car.y - p.y);
        if (vertDist < 60) {
          if (car.x < activeSplitX && activeSplitX - car.x < 70) {
            leftCar = car;
          } else if (car.x > activeSplitX && car.x - activeSplitX < 70) {
            rightCar = car;
          }
        }
      }

      if (leftCar && rightCar) {
        const pairKey = `${leftCar.id}_${rightCar.id}`;
        if (pairKey !== this.lastSplitCarPair) {
          this.lastSplitCarPair = pairKey;
          this.splitCooldown = 0.35;

          this.stats.laneSplitsCount++;
          this.stats.comboMultiplier = Math.min(10, this.stats.comboMultiplier + 1);
          this.stats.comboTimer = 3.8;

          const bonus = 250 * this.stats.comboMultiplier;
          this.stats.score += bonus;

          sound.playLaneSplit(this.stats.comboMultiplier);
          this.particles.addSpark(p.x, p.y, 10);
          this.particles.addFloatingText(
            p.x,
            p.y - 45,
            `LANE SPLIT! +${bonus}`,
            '#06b6d4',
            20
          );
          this.screenShake = 3;

          if (navigator.vibrate) {
            try {
              navigator.vibrate(40);
            } catch {
              // Ignore
            }
          }
          return;
        }
      }
    }

    // Near miss check
    for (const car of this.trafficManager.cars) {
      if (car.isBurnt || this.nearMissCars.has(car.id)) continue;
      const dx = Math.abs(car.x - p.x);
      const dy = Math.abs(car.y - p.y);

      if (dx > 20 && dx < 36 && dy < 45) {
        this.nearMissCars.add(car.id);
        this.stats.closeCallsCount++;
        const bonus = 100 * this.stats.comboMultiplier;
        this.stats.score += bonus;

        sound.playCloseCall();
        if (Math.random() < 0.35) sound.playHorn();

        this.particles.addFloatingText(p.x, p.y - 30, `CLOSE CALL! +${bonus}`, '#f59e0b', 14);
      }
    }
  }

  private intersects(
    x1: number,
    y1: number,
    w1: number,
    h1: number,
    x2: number,
    y2: number,
    w2: number,
    h2: number
  ): boolean {
    return (
      Math.abs(x1 - x2) * 2 < w1 + w2 &&
      Math.abs(y1 - y2) * 2 < h1 + h2
    );
  }

  public render(ctx: CanvasRenderingContext2D) {
    const now = performance.now();
    ctx.save();

    if (this.screenShake > 0) {
      const sx = (Math.random() - 0.5) * this.screenShake;
      const sy = (Math.random() - 0.5) * this.screenShake;
      ctx.translate(sx, sy);
    }

    // 1. Draw 3-Lane Road
    this.roadRenderer.draw(ctx, this.canvasWidth, this.canvasHeight);

    const roadStartX = (this.canvasWidth - this.roadRenderer.params.totalWidth) / 2;
    ctx.save();
    ctx.translate(roadStartX, 0);

    // 2. Draw Traffic Cars
    this.trafficManager.draw(ctx, now);

    // 3. Draw Player Motorcycle
    motorcycleRenderer.draw(ctx, this.player, now);

    // 4. Draw Particles & Floating Texts
    this.particles.draw(ctx);

    ctx.restore();
    ctx.restore();
  }
}
