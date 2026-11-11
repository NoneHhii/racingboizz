import type { BikeColorTheme, BikeThemeConfig, PlayerMotorcycle } from './types';

export const BIKE_THEMES: Record<BikeColorTheme, BikeThemeConfig> = {
  lime: {
    id: 'lime',
    name: 'Ninja ZX Lime',
    primary: '#10b981',
    secondary: '#047857',
    accent: '#facc15',
    glow: 'rgba(16, 185, 129, 0.6)',
    helmet: '#0f172a',
    visor: '#38bdf8'
  },
  crimson: {
    id: 'crimson',
    name: 'Ducati Panigale Red',
    primary: '#ef4444',
    secondary: '#991b1b',
    accent: '#ffffff',
    glow: 'rgba(239, 68, 68, 0.6)',
    helmet: '#111827',
    visor: '#f59e0b'
  },
  phantom: {
    id: 'phantom',
    name: 'Yamaha R1 Blue',
    primary: '#2563eb',
    secondary: '#1e3a8a',
    accent: '#38bdf8',
    glow: 'rgba(37, 99, 235, 0.6)',
    helmet: '#0f172a',
    visor: '#e0e7ff'
  },
  gold: {
    id: 'gold',
    name: 'Cyber Gold Edition',
    primary: '#f59e0b',
    secondary: '#78350f',
    accent: '#fef08a',
    glow: 'rgba(245, 158, 11, 0.6)',
    helmet: '#18181b',
    visor: '#f43f5e'
  },
  stealth: {
    id: 'stealth',
    name: 'Stealth Black Carbon',
    primary: '#27272a',
    secondary: '#09090b',
    accent: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.4)',
    helmet: '#18181b',
    visor: '#ef4444'
  },
  synthwave: {
    id: 'synthwave',
    name: 'Neon Cyberpunk',
    primary: '#d946ef',
    secondary: '#701a75',
    accent: '#06b6d4',
    glow: 'rgba(217, 70, 239, 0.7)',
    helmet: '#1e1b4b',
    visor: '#06b6d4'
  }
};

export class MotorcycleRenderer {
  public draw(
    ctx: CanvasRenderingContext2D,
    player: PlayerMotorcycle,
    now: number
  ) {
    const theme = BIKE_THEMES[player.colorTheme] || BIKE_THEMES.lime;
    const { x, y, lean, isAirborne, jumpZ, throttle, isCrashed } = player;

    if (isCrashed) {
      // Don't render intact bike if crashed (particles and wreckage handle it)
      return;
    }

    // 1. Draw Ground Shadow
    this.drawShadow(ctx, x, y, lean, jumpZ);

    // 2. Draw Headlight Cone (cast onto the asphalt)
    this.drawHeadlights(ctx, x, y - jumpZ * 35, lean, player.speedKmh);

    // 3. Render the Superbike
    ctx.save();

    // Altitude offset and scale when jumping
    const renderY = y - jumpZ * 35;
    const scale = 1.0 + jumpZ * 0.35;

    ctx.translate(x, renderY);
    ctx.scale(scale, scale);

    // Lean tilt (rotation up to ~22 degrees = 0.38 rad)
    const leanAngle = lean * 0.35;
    ctx.rotate(leanAngle);

    // Draw the actual bike parts
    this.drawBikeChassis(ctx, theme, lean, throttle, now, isAirborne);

    // Draw Airborne Indicator / Altitude Ring when in flight
    if (isAirborne && jumpZ > 0.05) {
      this.drawAirborneAura(ctx, jumpZ, now);
    }

    ctx.restore();
  }

  private drawShadow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    lean: number,
    jumpZ: number
  ) {
    ctx.save();
    // Shadow stays on road, expands slightly and fades as bike gets higher
    const shadowAlpha = Math.max(0.12, 0.45 - jumpZ * 0.3);
    const shadowScaleX = 1 + jumpZ * 0.4;
    const shadowScaleY = 1 + jumpZ * 0.2;
    const offsetX = lean * 5 * (1 - jumpZ);

    ctx.translate(x + offsetX, y + 4 + jumpZ * 15);
    ctx.scale(shadowScaleX, shadowScaleY);

    ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
    ctx.beginPath();
    // Oval shadow matching bike footprint
    ctx.ellipse(0, 0, 11, 26, lean * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawHeadlights(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    lean: number,
    speedKmh: number
  ) {
    ctx.save();
    ctx.translate(x, y - 24);
    ctx.rotate(lean * 0.15);

    // Twin projector headlight beam
    const beamLength = 170 + Math.min(speedKmh, 260) * 0.4;
    const beamSpread = 42;

    const grad = ctx.createRadialGradient(0, 0, 8, 0, -beamLength * 0.7, beamLength);
    grad.addColorStop(0, 'rgba(255, 255, 240, 0.45)');
    grad.addColorStop(0.3, 'rgba(254, 240, 138, 0.22)');
    grad.addColorStop(0.7, 'rgba(250, 204, 21, 0.08)');
    grad.addColorStop(1, 'rgba(250, 204, 21, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(-beamSpread, -beamLength);
    ctx.lineTo(beamSpread, -beamLength);
    ctx.lineTo(5, 0);
    ctx.closePath();
    ctx.fill();

    // Hot-spot headlight bulbs
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(-4, 0, 2.5, 0, Math.PI * 2);
    ctx.arc(4, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawBikeChassis(
    ctx: CanvasRenderingContext2D,
    theme: BikeThemeConfig,
    lean: number,
    throttle: number,
    now: number,
    isAirborne: boolean
  ) {
    // Top-down superbike geometry:
    // Length: 54px (-27 to +27)
    // Width: 22px (-11 to +11)

    // 1. REAR WHEEL
    ctx.fillStyle = '#18181b';
    ctx.fillRect(-5, 12, 10, 15);
    // Tire tread center line
    ctx.fillStyle = '#27272a';
    ctx.fillRect(-2, 12, 4, 15);
    // Tire rim highlight
    ctx.fillStyle = theme.accent;
    ctx.fillRect(-1, 17, 2, 5);

    // 2. DUAL EXHAUST PIPES
    // Left pipe
    ctx.fillStyle = '#71717a';
    ctx.fillRect(-8, 14, 3, 11);
    ctx.fillStyle = '#3f3f46';
    ctx.fillRect(-8, 23, 3, 2);
    // Right pipe
    ctx.fillStyle = '#71717a';
    ctx.fillRect(5, 14, 3, 11);
    ctx.fillStyle = '#3f3f46';
    ctx.fillRect(5, 23, 3, 2);

    // Exhaust Nitro / Throttle Glow
    if (throttle > 0 || isAirborne) {
      const flicker = Math.sin(now * 0.05) * 3;
      const flameLen = 8 + (throttle > 0 ? 8 : 4) + flicker;

      const flameGrad = ctx.createLinearGradient(0, 25, 0, 25 + flameLen);
      flameGrad.addColorStop(0, '#ffffff');
      flameGrad.addColorStop(0.3, '#38bdf8');
      flameGrad.addColorStop(0.7, '#f97316');
      flameGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');

      ctx.fillStyle = flameGrad;
      // Left flame
      ctx.beginPath();
      ctx.moveTo(-8, 25);
      ctx.lineTo(-6.5, 25 + flameLen);
      ctx.lineTo(-5, 25);
      ctx.closePath();
      ctx.fill();

      // Right flame
      ctx.beginPath();
      ctx.moveTo(5, 25);
      ctx.lineTo(6.5, 25 + flameLen);
      ctx.lineTo(8, 25);
      ctx.closePath();
      ctx.fill();
    }

    // 3. REAR COWL & TAIL LIGHT
    ctx.fillStyle = theme.secondary;
    ctx.beginPath();
    ctx.moveTo(-6, 8);
    ctx.lineTo(6, 8);
    ctx.lineTo(4, 18);
    ctx.lineTo(-4, 18);
    ctx.closePath();
    ctx.fill();

    // Red LED tail light
    ctx.fillStyle = throttle < 0 ? '#ff1e1e' : '#dc2626';
    ctx.fillRect(-4, 17, 8, 2.5);
    if (throttle < 0) {
      // Brake light bloom
      ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
      ctx.beginPath();
      ctx.arc(0, 18, 9, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. FRONT WHEEL
    ctx.fillStyle = '#18181b';
    ctx.fillRect(-3.5, -27, 7, 13);
    ctx.fillStyle = '#27272a';
    ctx.fillRect(-1.5, -27, 3, 13);

    // 5. MAIN CHASSIS / AERODYNAMIC FAIRINGS
    ctx.fillStyle = theme.primary;
    ctx.beginPath();
    ctx.moveTo(0, -25); // Nose tip
    ctx.lineTo(7, -18);  // Front fairing right
    ctx.lineTo(10, -8);  // Mid fairing right
    ctx.lineTo(8, 4);    // Side pod right
    ctx.lineTo(5, 12);   // Tail taper
    ctx.lineTo(-5, 12);  // Tail taper left
    ctx.lineTo(-8, 4);   // Side pod left
    ctx.lineTo(-10, -8); // Mid fairing left
    ctx.lineTo(-7, -18); // Front fairing left
    ctx.closePath();
    ctx.fill();

    // Fairing Accent Stripes
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-6, -16);
    ctx.lineTo(-8, -6);
    ctx.moveTo(6, -16);
    ctx.lineTo(8, -6);
    ctx.stroke();

    // Carbon / Dark Inner Frame
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.ellipse(0, 0, 5, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fuel Tank
    ctx.fillStyle = theme.secondary;
    ctx.beginPath();
    ctx.ellipse(0, -5, 4.5, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fuel Tank Racing Stripe
    ctx.fillStyle = theme.accent;
    ctx.fillRect(-1, -11, 2, 11);

    // 6. CLIP-ON HANDLEBARS & MIRRORS
    // Handlebar bar
    ctx.strokeStyle = '#52525b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-11, -16);
    ctx.lineTo(11, -16);
    ctx.stroke();

    // Bar grips
    ctx.fillStyle = '#09090b';
    ctx.fillRect(-12, -17.5, 3.5, 3);
    ctx.fillRect(8.5, -17.5, 3.5, 3);

    // Mirrors
    ctx.fillStyle = '#3f3f46';
    ctx.fillRect(-12, -20, 3, 2);
    ctx.fillRect(9, -20, 3, 2);
    ctx.fillStyle = '#93c5fd';
    ctx.fillRect(-11.5, -20, 2, 1);
    ctx.fillRect(9.5, -20, 2, 1);

    // 7. RIDER
    // Shift rider position and knee based on lean
    const riderShiftX = lean * 2.5;

    // Leather Racing Suit Shoulders
    ctx.fillStyle = theme.secondary;
    ctx.beginPath();
    ctx.ellipse(riderShiftX, 2, 8, 5, lean * 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Aerodynamic Spine Hump (gù lưng thể thao)
    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.ellipse(riderShiftX, 4, 3, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Knee Slider (sticks out on the side of lean!)
    if (Math.abs(lean) > 0.3) {
      ctx.fillStyle = theme.accent;
      if (lean < 0) {
        // Left knee down
        ctx.fillRect(-12 + riderShiftX, -1, 3, 4);
      } else {
        // Right knee down
        ctx.fillRect(9 + riderShiftX, -1, 3, 4);
      }
    }

    // Helmet
    ctx.fillStyle = theme.helmet;
    ctx.beginPath();
    ctx.ellipse(riderShiftX, -4, 5.5, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Helmet visor (tinted reflective glass)
    ctx.fillStyle = theme.visor;
    ctx.beginPath();
    ctx.arc(riderShiftX, -6.5, 4, Math.PI, 0, false);
    ctx.fill();

    // Visor reflection gloss
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillRect(riderShiftX - 2.5, -8, 2, 1.5);
  }

  private drawAirborneAura(
    ctx: CanvasRenderingContext2D,
    jumpZ: number,
    now: number
  ) {
    // Energy shockwave ring below bike indicating mid-air flight
    ctx.save();
    const pulse = (Math.sin(now * 0.015) + 1) * 0.5;
    ctx.strokeStyle = `rgba(56, 189, 248, ${0.4 + pulse * 0.4})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    ctx.ellipse(0, 0, 16 + jumpZ * 6, 32 + jumpZ * 8, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Airborne badge text
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('AIRBORNE', 0, 42);

    ctx.restore();
  }
}

export const motorcycleRenderer = new MotorcycleRenderer();
