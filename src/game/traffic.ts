import type { RoadParams, TrafficCar, VehicleDefinition } from './types';
import { spriteCache } from './sprites';
import { sound } from './audio';

export interface TrafficWarning {
  lane: number;
  type: 'police' | 'ambulance' | 'speeder';
  timer: number;
  y: number;
}

export class TrafficManager {
  private roadParams: RoadParams;
  public cars: TrafficCar[] = [];
  public warnings: TrafficWarning[] = [];
  private spawnTimer: number = 0;
  private nextCarId: number = 1;
  private sirenNearTimer: number = 0;

  constructor(roadParams: RoadParams) {
    this.roadParams = roadParams;
  }

  public reset() {
    this.cars = [];
    this.warnings = [];
    this.spawnTimer = 0;
    this.sirenNearTimer = 0;
  }

  public update(
    dt: number,
    roadScrollSpeed: number,
    difficultyLevel: number,
    playerX: number,
    playerY: number
  ) {
    // 1. Spawning Traffic Cars with gentle pacing
    this.updateSpawning(dt, roadScrollSpeed, difficultyLevel);

    // 2. Update warnings for fast approaching vehicles from behind
    this.updateWarnings(dt);

    // 3. Update Inter-Vehicle Traffic Physics (Prevent NPC cars from passing through each other!)
    this.updateInterVehiclePhysics(dt);

    // 4. Update each traffic car behavior and movement
    let priorityNear = false;
    let priorityType: 'police' | 'ambulance' | null = null;

    for (let i = this.cars.length - 1; i >= 0; i--) {
      const car = this.cars[i];

      // Animating frames (for flashing sirens or engine vibrations)
      if (car.def.frames.length > 1) {
        car.animTimer += dt;
        if (car.animTimer > 0.08) {
          car.animTimer = 0;
          car.animFrame = (car.animFrame + 1) % car.def.frames.length;
        }
      }

      // Check if priority car is close to player to trigger siren audio
      const distToPlayer = Math.abs(car.y - playerY);
      if (distToPlayer < 450 && (car.def.behavior === 'police' || car.def.behavior === 'ambulance')) {
        priorityNear = true;
        priorityType = car.def.behavior;
      }

      // Smooth acceleration / deceleration toward targetSpeed
      car.speed += (car.targetSpeed - car.speed) * Math.min(1, 3.0 * dt);

      // Relative vertical movement: (roadScrollSpeed - car.speed) * dt
      const relativeVy = roadScrollSpeed - car.speed;
      car.y += relativeVy * dt;

      // Update AI behavior (lane changes, surprise cuts, drifting)
      this.updateCarBehavior(car, dt, difficultyLevel, playerX, playerY);

      // Handle lane change transition
      if (car.isChangingLane) {
        car.laneChangeProgress += car.laneChangeSpeed * dt;
        const startX = this.roadParams.laneCenters[car.lane];
        const endX = this.roadParams.laneCenters[car.targetLane];

        // Smoothstep interpolation (3t^2 - 2t^3)
        const t = Math.min(1, car.laneChangeProgress);
        const smoothT = t * t * (3 - 2 * t);
        car.x = startX + (endX - startX) * smoothT + car.laneOffset * (1 - t);

        // Visual tilt angle during lane shift
        const dir = endX > startX ? 1 : -1;
        car.angle = dir * Math.sin(t * Math.PI) * 0.18;

        if (car.laneChangeProgress >= 1.0) {
          car.x = endX;
          car.lane = car.targetLane;
          car.isChangingLane = false;
          car.turnSignal = null;
          car.angle = 0;
          car.laneChangeCooldown = 2.5 + Math.random() * 3.0;
          car.laneOffset = (Math.random() - 0.5) * 12;
        }
      } else {
        // Natural subtle drift inside lane
        car.driftTimer -= dt;
        if (car.driftTimer <= 0) {
          car.driftTimer = 2.0 + Math.random() * 3.0;
          const maxDrift = car.def.behavior === 'taxi' ? 14 : 10;
          car.targetLaneOffset = (Math.random() - 0.5) * maxDrift * 2;
        }
        car.laneOffset += (car.targetLaneOffset - car.laneOffset) * Math.min(1, 1.8 * dt);

        const targetX = this.roadParams.laneCenters[car.lane] + car.laneOffset;
        car.x += (targetX - car.x) * Math.min(1, 7 * dt);
        car.angle = 0;
      }

      // Despawn cars off-screen
      if (car.y > 1150 || car.y < -700) {
        this.cars.splice(i, 1);
      }
    }

    // Manage ambient siren audio
    if (priorityNear && priorityType) {
      sound.startSiren(priorityType);
      this.sirenNearTimer = 0.3;
    } else {
      if (this.sirenNearTimer > 0) {
        this.sirenNearTimer -= dt;
        if (this.sirenNearTimer <= 0) {
          sound.stopSiren();
        }
      }
    }
  }

  /**
   * Inter-Vehicle Traffic Collision & Following Distance
   * Ensures NPC cars NEVER pass through each other!
   */
  private updateInterVehiclePhysics(dt: number) {
    const numCars = this.cars.length;

    for (let i = 0; i < numCars; i++) {
      const carA = this.cars[i];
      if (carA.isBurnt) continue;

      const laneA = carA.isChangingLane ? carA.targetLane : carA.lane;

      let nearestCarAhead: TrafficCar | null = null;
      let minDistanceAhead = Infinity;

      for (let j = 0; j < numCars; j++) {
        if (i === j) continue;
        const carB = this.cars[j];

        const laneB = carB.isChangingLane ? carB.targetLane : carB.lane;

        if (laneA === laneB || carA.lane === carB.lane || carA.targetLane === carB.lane) {
          const distY = carA.y - carB.y;

          if (distY > 0 && distY < minDistanceAhead) {
            minDistanceAhead = distY;
            nearestCarAhead = carB;
          }
        }
      }

      if (nearestCarAhead) {
        const carB = nearestCarAhead;
        const halfLengths = (carA.def.hitbox.h + carB.def.hitbox.h) * 0.5 * 1.25;
        const hardMinDist = halfLengths + 20;
        const safeFollowDist = hardMinDist + 70;

        if (minDistanceAhead < hardMinDist) {
          carA.y = Math.max(carA.y, carB.y + hardMinDist);
          carA.speed = Math.min(carA.speed, carB.speed * 0.96);
          carA.targetSpeed = Math.min(carA.targetSpeed, carB.speed * 0.95);

          if (carA.isChangingLane && carA.laneChangeProgress < 0.4) {
            carA.targetLane = carA.lane;
            carA.isChangingLane = false;
            carA.turnSignal = null;
          }
        } else if (minDistanceAhead < safeFollowDist) {
          const followFactor = (minDistanceAhead - hardMinDist) / (safeFollowDist - hardMinDist);
          carA.targetSpeed = Math.min(carA.targetSpeed, carB.speed * (0.88 + 0.12 * followFactor));

          carA.tailgatingTimer += dt;
          if (carA.tailgatingTimer > 1.2 && !carA.isChangingLane && !carA.turnSignal && carA.laneChangeCooldown <= 0) {
            this.tryOvertake(carA);
          }
        } else {
          carA.tailgatingTimer = Math.max(0, carA.tailgatingTimer - dt);
          carA.targetSpeed = carA.baseSpeed;
        }
      } else {
        carA.tailgatingTimer = Math.max(0, carA.tailgatingTimer - dt);
        carA.targetSpeed = carA.baseSpeed;
      }
    }
  }

  private tryOvertake(car: TrafficCar) {
    const candidateLanes: number[] = [];
    if (car.lane > 0) candidateLanes.push(car.lane - 1);
    if (car.lane < 2) candidateLanes.push(car.lane + 1);

    for (const targetL of candidateLanes) {
      if (this.isLaneClear(targetL, car.y, 140)) {
        car.targetLane = targetL;
        car.turnSignal = targetL < car.lane ? 'left' : 'right';
        car.turnSignalTimer = 0.5 + Math.random() * 0.3;
        car.laneChangeSpeed = 1.1;
        car.tailgatingTimer = 0;
        return;
      }
    }
  }

  private isLaneClear(lane: number, y: number, safeSpan = 140): boolean {
    for (const other of this.cars) {
      if (other.lane === lane || other.targetLane === lane) {
        if (Math.abs(other.y - y) < safeSpan) {
          return false;
        }
      }
    }
    return true;
  }

  private updateSpawning(
    dt: number,
    roadScrollSpeed: number,
    difficultyLevel: number
  ) {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      // GENTLE PROGRESSIVE SPAWN DELAY:
      // Level 1: ~2.8s to 3.4s (relaxed, spaced out, easy to practice!)
      // Level 2: ~2.3s to 2.8s
      // Level 3: ~1.8s to 2.3s
      // Level 4: ~1.4s to 1.8s
      // Level 5: ~1.0s to 1.3s
      const baseDelay = Math.max(0.95, 2.9 - (difficultyLevel - 1) * 0.45);
      const jitter = (Math.random() - 0.5) * 0.4;
      this.spawnTimer = baseDelay + jitter;

      const occupiedLanes = new Set<number>();
      for (const car of this.cars) {
        if (car.y < 90 && car.y > -280) {
          occupiedLanes.add(car.lane);
          if (car.isChangingLane) occupiedLanes.add(car.targetLane);
        }
      }

      const availableLanes = [0, 1, 2].filter((l) => !occupiedLanes.has(l));
      if (availableLanes.length === 0) return;

      const lane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
      const def = this.pickVehicleDefinition(difficultyLevel);
      if (!def) return;

      const baseCarSpeed = roadScrollSpeed * (0.55 + Math.random() * 0.22) * def.speedMultiplier;
      const initialOffset = (Math.random() - 0.5) * 12;

      const car: TrafficCar = {
        id: `car_${this.nextCarId++}`,
        def,
        x: this.roadParams.laneCenters[lane] + initialOffset,
        y: -190,
        lane,
        targetLane: lane,
        laneOffset: initialOffset,
        targetLaneOffset: initialOffset,
        driftTimer: 2.0 + Math.random() * 2.5,
        isChangingLane: false,
        laneChangeProgress: 0,
        laneChangeSpeed: 1.0,
        turnSignal: null,
        turnSignalTimer: 0,
        speed: baseCarSpeed,
        baseSpeed: baseCarSpeed,
        targetSpeed: baseCarSpeed,
        angle: 0,
        animFrame: 0,
        animTimer: 0,
        isBurnt: false,
        burntSpriteKey: def.category === 'priority' ? def.id : def.category,
        specialTimer: 0,
        laneChangeCooldown: 2.0 + Math.random() * 2.5,
        tailgatingTimer: 0,
        renderScale: 1.25
      };

      this.cars.push(car);

      // High-speed chasers only appear at Level 3+
      if (difficultyLevel >= 3 && Math.random() < 0.10 + (difficultyLevel - 2) * 0.05) {
        this.spawnRearChaser(roadScrollSpeed);
      }
    }
  }

  private spawnRearChaser(roadScrollSpeed: number) {
    if (this.warnings.length > 0) return;

    const occupiedLanes = new Set<number>();
    for (const car of this.cars) {
      if (car.y > 600) occupiedLanes.add(car.lane);
    }
    const freeLanes = [0, 1, 2].filter((l) => !occupiedLanes.has(l));
    if (freeLanes.length === 0) return;

    const lane = freeLanes[Math.floor(Math.random() * freeLanes.length)];
    const isPolice = Math.random() < 0.6;
    const cat = spriteCache.getCatalog();
    const def = isPolice
      ? cat.vehicles.find((v) => v.id === 'police') || cat.vehicles[0]
      : cat.vehicles.find((v) => v.category === 'speedster') || cat.vehicles[0];

    const chaserSpeed = roadScrollSpeed * (1.28 + Math.random() * 0.2);

    this.warnings.push({
      lane,
      type: isPolice ? 'police' : 'speeder',
      timer: 1.2,
      y: 750
    });

    setTimeout(() => {
      const chaser: TrafficCar = {
        id: `chaser_${this.nextCarId++}`,
        def,
        x: this.roadParams.laneCenters[lane],
        y: 860,
        lane,
        targetLane: lane,
        laneOffset: 0,
        targetLaneOffset: 0,
        driftTimer: 2.5,
        isChangingLane: false,
        laneChangeProgress: 0,
        laneChangeSpeed: 1.3,
        turnSignal: null,
        turnSignalTimer: 0,
        speed: chaserSpeed,
        baseSpeed: chaserSpeed,
        targetSpeed: chaserSpeed,
        angle: 0,
        animFrame: 0,
        animTimer: 0,
        isBurnt: false,
        burntSpriteKey: def.category === 'priority' ? def.id : 'sport',
        specialTimer: 0,
        laneChangeCooldown: 4.0,
        tailgatingTimer: 0,
        renderScale: 1.25
      };
      this.cars.push(chaser);
    }, 1100);
  }

  private updateWarnings(dt: number) {
    for (let i = this.warnings.length - 1; i >= 0; i--) {
      this.warnings[i].timer -= dt;
      if (this.warnings[i].timer <= 0) {
        this.warnings.splice(i, 1);
      }
    }
  }

  private pickVehicleDefinition(difficultyLevel: number): VehicleDefinition | null {
    const catalog = spriteCache.getCatalog();
    if (!catalog.vehicles || catalog.vehicles.length === 0) return null;

    const specials = catalog.vehicles.filter((v) => v.isSpecial);
    const normals = catalog.vehicles.filter((v) => !v.isSpecial && v.category !== 'bus' && v.category !== 'truck');
    const heavies = catalog.vehicles.filter((v) => v.category === 'bus' || v.category === 'truck' || v.category === 'limo');

    const rand = Math.random();
    // Special cars scale gently
    const specialProb = Math.min(0.38, 0.05 + (difficultyLevel - 1) * 0.07);

    if (rand < specialProb && specials.length > 0) {
      return specials[Math.floor(Math.random() * specials.length)];
    }

    const heavyProb = 0.15 + Math.min(0.2, (difficultyLevel - 1) * 0.04);
    if (rand < specialProb + heavyProb && heavies.length > 0) {
      return heavies[Math.floor(Math.random() * heavies.length)];
    }

    return normals[Math.floor(Math.random() * normals.length)];
  }

  /**
   * Turn Signals and Lane Changes calibrated with gentle pacing
   */
  private updateCarBehavior(
    car: TrafficCar,
    dt: number,
    difficultyLevel: number,
    playerX: number,
    playerY: number
  ) {
    car.laneChangeCooldown -= dt;

    // 1. Turn Signal Countdown -> ACTUALLY START THE LANE CHANGE!
    if (car.turnSignal && !car.isChangingLane) {
      car.turnSignalTimer -= dt;
      if (car.turnSignalTimer <= 0) {
        if (this.isLaneClear(car.targetLane, car.y, 90)) {
          car.isChangingLane = true;
          car.laneChangeProgress = 0;
        } else {
          car.turnSignal = null;
          car.targetLane = car.lane;
          car.laneChangeCooldown = 1.5;
        }
      }
    }

    // 2. Decide if car should initiate a new lane change
    if (!car.isChangingLane && !car.turnSignal && car.laneChangeCooldown <= 0) {
      const distY = car.y - playerY;

      // Gentle lane change chance scaling:
      // Level 1: 0.04 (rare & peaceful)
      // Level 2: 0.08
      // Level 3: 0.14
      // Level 4: 0.22
      // Level 5: 0.30
      let changeChance = 0.04 + (difficultyLevel - 1) * 0.065;
      if (car.def.behavior === 'taxi') changeChance *= 1.6;
      if (car.def.behavior === 'police' || car.def.behavior === 'ambulance') changeChance *= 1.3;

      // Surprise cutoff only activates from Level 2 onwards:
      const isPlayerBehind = distY < -90 && distY > -240;
      let forceSurpriseCut = false;

      if (difficultyLevel >= 2 && isPlayerBehind && (Math.random() < 0.10 + (difficultyLevel - 1) * 0.05)) {
        forceSurpriseCut = true;
      }

      if (Math.random() < changeChance * dt || forceSurpriseCut) {
        const candidateLanes: number[] = [];
        if (car.lane > 0) candidateLanes.push(car.lane - 1);
        if (car.lane < 2) candidateLanes.push(car.lane + 1);

        const safeLanes = candidateLanes.filter((tl) => this.isLaneClear(tl, car.y, 110));

        if (safeLanes.length > 0) {
          let chosen = safeLanes[Math.floor(Math.random() * safeLanes.length)];

          if (isPlayerBehind) {
            const playerLane = playerX < this.roadParams.splitLines[0] ? 0 : playerX < this.roadParams.splitLines[1] ? 1 : 2;
            if (safeLanes.includes(playerLane)) {
              chosen = playerLane;
              car.hasCutOffPlayer = true;
            }
          }

          car.targetLane = chosen;
          car.turnSignal = chosen < car.lane ? 'left' : 'right';

          // Turn signal blinker warning notice:
          // Generous notice at early levels:
          // Level 1: ~1.2s
          // Level 2: ~1.0s
          // Level 3: ~0.8s
          // Level 4: ~0.6s
          // Level 5: ~0.4s
          if (car.def.behavior === 'taxi' && difficultyLevel >= 3) {
            car.turnSignalTimer = 0.35;
            car.laneChangeSpeed = 1.3;
          } else {
            car.turnSignalTimer = Math.max(0.38, 1.35 - (difficultyLevel - 1) * 0.22);
            car.laneChangeSpeed = 0.85 + (difficultyLevel - 1) * 0.1;
          }
        }
      }
    }
  }

  public draw(ctx: CanvasRenderingContext2D, now: number) {
    const sorted = [...this.cars].sort((a, b) => a.y - b.y);

    for (const car of sorted) {
      this.drawCar(ctx, car, now);
    }

    this.drawWarnings(ctx, now);
  }

  private drawCar(ctx: CanvasRenderingContext2D, car: TrafficCar, now: number) {
    ctx.save();
    ctx.translate(car.x, car.y);
    if (car.angle) {
      ctx.rotate(car.angle);
    }

    const scale = car.renderScale || 1.25;
    ctx.scale(scale, scale);

    const halfW = car.def.hitbox.w * 0.5;
    const halfH = car.def.hitbox.h * 0.5;

    // 1. Car Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.beginPath();
    ctx.ellipse(0, 4, halfW * 1.1, halfH * 0.95, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Car Sprite
    if (car.isBurnt) {
      const burntImg = spriteCache.getBurntImage(car.burntSpriteKey);
      if (burntImg) {
        ctx.drawImage(burntImg, -car.def.width / 2, -car.def.height / 2, car.def.width, car.def.height);
      }
    } else {
      const frameUrl = car.def.frames[car.animFrame] || car.def.frames[0];
      const img = spriteCache.getImage(frameUrl);
      if (img && img.complete) {
        ctx.drawImage(img, -car.def.width / 2, -car.def.height / 2, car.def.width, car.def.height);
      } else {
        ctx.fillStyle = car.def.category === 'priority' ? '#ef4444' : '#3b82f6';
        ctx.fillRect(-halfW, -halfH, car.def.hitbox.w, car.def.hitbox.h);
      }
    }

    // 3. Siren Flash Halos (Police & Ambulance)
    if (car.def.behavior === 'police' && !car.isBurnt) {
      const isRed = Math.floor(now / 90) % 2 === 0;
      const sirenColor = isRed ? 'rgba(239, 68, 68, 0.55)' : 'rgba(59, 130, 246, 0.55)';
      ctx.fillStyle = sirenColor;
      ctx.beginPath();
      ctx.arc(isRed ? -10 : 10, -5, 30, 0, Math.PI * 2);
      ctx.fill();
    } else if (car.def.behavior === 'ambulance' && !car.isBurnt) {
      const flash = Math.floor(now / 110) % 2 === 0;
      if (flash) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
        ctx.beginPath();
        ctx.arc(0, -10, 36, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4. Turn Signal Blinkers
    if (car.turnSignal && !car.isBurnt) {
      const blink = Math.floor(now / 140) % 2 === 0;
      if (blink) {
        ctx.fillStyle = '#fbbf24';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 10;
        const blinkX = car.turnSignal === 'left' ? -halfW * 0.95 : halfW * 0.95;
        ctx.beginPath();
        ctx.arc(blinkX, halfH * 0.85, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(blinkX, -halfH * 0.85, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    ctx.restore();
  }

  private drawWarnings(ctx: CanvasRenderingContext2D, _now: number) {
    const now = performance.now();
    for (const w of this.warnings) {
      const laneX = this.roadParams.laneCenters[w.lane];
      const blink = Math.floor(now / 140) % 2 === 0;
      if (!blink) continue;

      ctx.save();
      ctx.translate(laneX, 680);

      ctx.fillStyle = w.type === 'police' ? '#ef4444' : '#eab308';
      ctx.beginPath();
      ctx.roundRect(-45, -16, 90, 32, 6);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(w.type === 'police' ? '🚨 POLICE' : '⚡ FAST CAR', 0, 0);

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -22);
      ctx.lineTo(-8, -16);
      ctx.lineTo(8, -16);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  }
}
