import type { FloatingText, Particle } from './types';

export class ParticleSystem {
  public particles: Particle[] = [];
  public floatingTexts: FloatingText[] = [];
  private nextId = 1;

  public addSpark(x: number, y: number, count = 5) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 180;
      this.particles.push({
        id: this.nextId++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 2.5,
        maxSize: 4,
        life: 1.0,
        decay: 1.8 + Math.random() * 1.5,
        color: Math.random() > 0.4 ? '#facc15' : '#fb923c',
        alpha: 1,
        type: 'spark'
      });
    }
  }

  public addSmoke(x: number, y: number, count = 2) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        id: this.nextId++,
        x: x + (Math.random() - 0.5) * 8,
        y: y + Math.random() * 6,
        vx: (Math.random() - 0.5) * 30,
        vy: 20 + Math.random() * 40,
        size: 4 + Math.random() * 4,
        maxSize: 14 + Math.random() * 6,
        life: 1.0,
        decay: 1.2 + Math.random() * 0.8,
        color: '#64748b',
        alpha: 0.6,
        type: 'smoke'
      });
    }
  }

  public addExplosion(x: number, y: number) {
    // 1. Fireball burst
    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 260;
      const colors = ['#ef4444', '#f97316', '#facc15', '#ffffff'];
      this.particles.push({
        id: this.nextId++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 8 + Math.random() * 8,
        maxSize: 24,
        life: 1.0,
        decay: 0.9 + Math.random() * 0.8,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0.9,
        type: 'fire'
      });
    }

    // 2. Heavy black smoke
    for (let i = 0; i < 25; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 120;
      this.particles.push({
        id: this.nextId++,
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        size: 10 + Math.random() * 10,
        maxSize: 32,
        life: 1.0,
        decay: 0.5 + Math.random() * 0.4,
        color: '#1e293b',
        alpha: 0.8,
        type: 'smoke'
      });
    }

    // 3. Sparks flying outward
    this.addSpark(x, y, 30);
  }

  public addSpeedLines(canvasWidth: number, count = 2) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        id: this.nextId++,
        x: Math.random() * canvasWidth,
        y: -50,
        vx: 0,
        vy: 900 + Math.random() * 400,
        size: 25 + Math.random() * 45,
        maxSize: 70,
        life: 1.0,
        decay: 1.8,
        color: 'rgba(255, 255, 255, 0.4)',
        alpha: 0.5,
        type: 'speedline'
      });
    }
  }

  public addFloatingText(x: number, y: number, text: string, color = '#38bdf8', fontSize = 16) {
    this.floatingTexts.push({
      id: this.nextId++,
      x,
      y,
      text,
      color,
      fontSize,
      life: 1.0,
      vy: -70,
      scale: 1.4
    });
  }

  public update(dt: number) {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= p.decay * dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.type === 'smoke') {
        p.size += 14 * dt;
      } else if (p.type === 'fire') {
        p.size += 8 * dt;
      }
    }

    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= 1.3 * dt;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
        continue;
      }
      ft.y += ft.vy * dt;
      ft.scale = Math.max(1.0, ft.scale - 1.5 * dt);
    }
  }

  public draw(ctx: CanvasRenderingContext2D) {
    // 1. Draw Particles
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life * p.alpha);

      if (p.type === 'speedline') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x, p.y + p.size);
        ctx.stroke();
      } else if (p.type === 'smoke') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'fire') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'spark') {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }

      ctx.restore();
    }

    // 2. Draw Floating Texts
    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, ft.life * 1.5);
      ctx.translate(ft.x, ft.y);
      ctx.scale(ft.scale, ft.scale);

      // Text shadow / outline
      ctx.font = `900 ${ft.fontSize}px 'Impact', 'Segoe UI Black', sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#09090b';
      ctx.strokeText(ft.text, 0, 0);

      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, 0, 0);

      ctx.restore();
    }
  }

  public clear() {
    this.particles = [];
    this.floatingTexts = [];
  }
}
