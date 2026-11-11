import React, { useEffect, useRef } from 'react';
import { GameEngine } from '../game/engine';

interface GameCanvasProps {
  engine: GameEngine;
  onJump: () => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ engine, onJump }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();

    const handleResize = () => {
      const container = canvas.parentElement;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      const targetWidth = Math.min(520, rect.width);
      const targetHeight = rect.height;

      canvas.width = targetWidth * dpr;
      canvas.height = targetHeight * dpr;
      canvas.style.width = `${targetWidth}px`;
      canvas.style.height = `${targetHeight}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      engine.setDimensions(targetWidth, targetHeight);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      engine.update(dt);

      ctx.clearRect(0, 0, engine.canvasWidth, engine.canvasHeight);
      engine.render(ctx);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [engine]);

  // Touch / Mouse Direct Dragging & Double Tap to Jump
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    engine.setTouchTarget(localX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.buttons > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      engine.setTouchTarget(localX);
    }
  };

  const handlePointerUp = () => {
    engine.setTouchTarget(null);
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={onJump}
      className="relative z-10 touch-none shadow-2xl cursor-grab active:cursor-grabbing select-none"
    />
  );
};
