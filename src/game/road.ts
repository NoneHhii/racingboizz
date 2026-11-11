import type { RoadParams } from './types';

export interface RoadDecoration {
  y: number;
  type: 'lamp' | 'sign' | 'skid' | 'arrow';
  side?: 'left' | 'right';
  text?: string;
  lane?: number;
}

export class RoadRenderer {
  public params: RoadParams;
  private roadOffset: number = 0;
  private decorations: RoadDecoration[] = [];
  private nextDecoY: number = -200;

  constructor() {
    const laneWidth = 96;
    const shoulderWidth = 46;
    const laneCount = 3;
    const totalWidth = laneCount * laneWidth + shoulderWidth * 2; // 380px

    const leftBound = shoulderWidth;
    const rightBound = totalWidth - shoulderWidth;

    const laneCenters = [
      leftBound + laneWidth * 0.5, // 94px
      leftBound + laneWidth * 1.5, // 190px
      leftBound + laneWidth * 2.5  // 286px
    ];

    const splitLines = [
      leftBound + laneWidth,       // 142px
      leftBound + laneWidth * 2    // 238px
    ];

    this.params = {
      totalWidth,
      laneCount,
      laneWidth,
      shoulderWidth,
      laneCenters,
      splitLines,
      leftBound,
      rightBound
    };

    // Initialize initial decorations
    for (let y = -400; y < 1200; y += 220) {
      this.decorations.push({
        y,
        type: 'lamp',
        side: Math.random() > 0.5 ? 'left' : 'right'
      });
      if (Math.random() > 0.6) {
        this.decorations.push({
          y: y + 90,
          type: 'skid',
          lane: Math.floor(Math.random() * 3)
        });
      }
    }
  }

  public update(deltaRoadDistance: number) {
    this.roadOffset = (this.roadOffset + deltaRoadDistance) % 60;

    // Scroll decorations
    for (const d of this.decorations) {
      d.y += deltaRoadDistance;
    }

    // Remove off-screen decorations
    this.decorations = this.decorations.filter((d) => d.y < 1200);

    // Spawn new decorations up top
    this.nextDecoY += deltaRoadDistance;
    if (this.nextDecoY > 200) {
      this.nextDecoY = 0;
      const y = -250;
      // Add lamppost
      this.decorations.push({
        y,
        type: 'lamp',
        side: Math.random() > 0.5 ? 'left' : 'right'
      });

      // Occasional highway sign or arrow
      const rand = Math.random();
      if (rand < 0.25) {
        this.decorations.push({
          y: y - 80,
          type: 'sign',
          text: 'SPEEDWAY'
        });
      } else if (rand < 0.5) {
        this.decorations.push({
          y: y - 50,
          type: 'arrow',
          lane: Math.floor(Math.random() * 3)
        });
      } else if (rand < 0.75) {
        this.decorations.push({
          y: y - 30,
          type: 'skid',
          lane: Math.floor(Math.random() * 3)
        });
      }
    }
  }

  public draw(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number
  ) {
    const { totalWidth, shoulderWidth, splitLines, leftBound, rightBound } = this.params;
    const startX = (canvasWidth - totalWidth) / 2;

    ctx.save();
    ctx.translate(startX, 0);

    // 1. Off-Road Shoulders / Grass / Barriers
    // Left off-road
    ctx.fillStyle = '#090d16';
    ctx.fillRect(-120, 0, 120, canvasHeight);
    // Right off-road
    ctx.fillStyle = '#090d16';
    ctx.fillRect(totalWidth, 0, 120, canvasHeight);

    // 2. Asphalt Road Surface
    ctx.fillStyle = '#181b22';
    ctx.fillRect(0, 0, totalWidth, canvasHeight);

    // Subtle Asphalt Texture grain / stripe
    ctx.fillStyle = '#1e222b';
    for (let y = (this.roadOffset % 30) - 30; y < canvasHeight; y += 30) {
      ctx.fillRect(0, y, totalWidth, 1.5);
    }

    // 3. Road Shoulders (Left & Right)
    // Left Shoulder
    ctx.fillStyle = '#222630';
    ctx.fillRect(0, 0, shoulderWidth, canvasHeight);
    // Left Rumble Strip
    for (let y = (this.roadOffset % 40) - 40; y < canvasHeight; y += 40) {
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(4, y, 10, 20);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(4, y + 20, 10, 20);
    }
    // Solid Yellow Edge Line
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(leftBound, 0);
    ctx.lineTo(leftBound, canvasHeight);
    ctx.stroke();

    // Right Shoulder
    ctx.fillStyle = '#222630';
    ctx.fillRect(rightBound, 0, shoulderWidth, canvasHeight);
    // Right Rumble Strip
    for (let y = (this.roadOffset % 40) - 40; y < canvasHeight; y += 40) {
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(totalWidth - 14, y, 10, 20);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(totalWidth - 14, y + 20, 10, 20);
    }
    // Solid White Edge Line
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(rightBound, 0);
    ctx.lineTo(rightBound, canvasHeight);
    ctx.stroke();

    // 4. Dashed White Lane Lines (Split 0-1 and Split 1-2)
    const dashLength = 32;
    const dashGap = 28;

    ctx.strokeStyle = 'rgba(248, 250, 252, 0.9)';
    ctx.lineWidth = 3.5;
    ctx.setLineDash([dashLength, dashGap]);
    ctx.lineDashOffset = -this.roadOffset;

    for (const splitX of splitLines) {
      ctx.beginPath();
      ctx.moveTo(splitX, -60);
      ctx.lineTo(splitX, canvasHeight + 60);
      ctx.stroke();
    }
    ctx.setLineDash([]); // Reset line dash

    // 5. Metal Guardrails on Edges
    // Left guardrail
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, 4, canvasHeight);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(1, 0, 2, canvasHeight);

    // Right guardrail
    ctx.fillStyle = '#334155';
    ctx.fillRect(totalWidth - 4, 0, 4, canvasHeight);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(totalWidth - 3, 0, 2, canvasHeight);

    // 6. Draw Road Decorations (Signs, Skids, Arrows, Lampposts)
    for (const d of this.decorations) {
      if (d.y < -150 || d.y > canvasHeight + 100) continue;

      if (d.type === 'skid' && d.lane !== undefined) {
        const laneCenterX = this.params.laneCenters[d.lane];
        ctx.strokeStyle = 'rgba(10, 15, 26, 0.5)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(laneCenterX - 12, d.y);
        ctx.quadraticCurveTo(laneCenterX - 8, d.y + 40, laneCenterX - 14, d.y + 80);
        ctx.moveTo(laneCenterX + 12, d.y);
        ctx.quadraticCurveTo(laneCenterX + 16, d.y + 40, laneCenterX + 10, d.y + 80);
        ctx.stroke();
      } else if (d.type === 'arrow' && d.lane !== undefined) {
        const laneCenterX = this.params.laneCenters[d.lane];
        ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.beginPath();
        ctx.moveTo(laneCenterX, d.y);
        ctx.lineTo(laneCenterX - 10, d.y + 20);
        ctx.lineTo(laneCenterX - 4, d.y + 20);
        ctx.lineTo(laneCenterX - 4, d.y + 45);
        ctx.lineTo(laneCenterX + 4, d.y + 45);
        ctx.lineTo(laneCenterX + 4, d.y + 20);
        ctx.lineTo(laneCenterX + 10, d.y + 20);
        ctx.closePath();
        ctx.fill();
      } else if (d.type === 'lamp') {
        const lampX = d.side === 'left' ? -15 : totalWidth + 15;
        // Post
        ctx.fillStyle = '#475569';
        ctx.fillRect(lampX - 2, d.y, 4, 18);
        // Bulb glow
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(lampX, d.y, 6, 0, Math.PI * 2);
        ctx.fill();

        // Soft warm ambient pool on road
        const poolGrad = ctx.createRadialGradient(
          d.side === 'left' ? 40 : totalWidth - 40,
          d.y,
          10,
          d.side === 'left' ? 40 : totalWidth - 40,
          d.y,
          90
        );
        poolGrad.addColorStop(0, 'rgba(254, 240, 138, 0.12)');
        poolGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
        ctx.fillStyle = poolGrad;
        ctx.fillRect(0, d.y - 80, totalWidth, 160);
      } else if (d.type === 'sign') {
        // Overhead Gantries
        ctx.fillStyle = '#047857';
        ctx.fillRect(16, d.y - 12, totalWidth - 32, 24);
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(18, d.y - 10, totalWidth - 36, 20);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('EXPRESSWAY 120+ KM/H', totalWidth / 2, d.y + 4);
      }
    }

    ctx.restore();
  }
}
