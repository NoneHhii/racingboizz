import React from 'react';
import type { GameStats, PlayerMotorcycle } from '../game/types';
import { Flame, Gauge, Sparkles, Wind } from 'lucide-react';

interface HUDProps {
  stats: GameStats;
  player: PlayerMotorcycle;
  onJump: () => void;
  onSteerLeftStart: () => void;
  onSteerLeftEnd: () => void;
  onSteerRightStart: () => void;
  onSteerRightEnd: () => void;
  onThrottleStart: () => void;
  onThrottleEnd: () => void;
  onBrakeStart: () => void;
  onBrakeEnd: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  stats,
  player,
  onJump,
  onSteerLeftStart,
  onSteerLeftEnd,
  onSteerRightStart,
  onSteerRightEnd,
  onThrottleStart,
  onThrottleEnd,
  onBrakeStart,
  onBrakeEnd
}) => {
  const jumpReady = player.jumpCooldown <= 0 && !player.isAirborne;

  // Difficulty badge colors
  const diffColors: Record<number, string> = {
    1: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    2: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
    3: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    4: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
    5: 'bg-red-500/30 text-red-400 border-red-500/60 animate-pulse'
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 select-none">
      {/* Top Header Stats */}
      <div className="flex items-start justify-between w-full max-w-lg mx-auto">
        {/* Score & Combo */}
        <div className="flex flex-col">
          <div className="text-xs uppercase tracking-widest text-slate-400 font-bold">
            Score
          </div>
          <div className="text-3xl font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-200 to-white drop-shadow-[0_2px_10px_rgba(6,182,212,0.5)]">
            {Math.floor(stats.score).toLocaleString()}
          </div>

          {stats.comboMultiplier > 1 && (
            <div className="flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/30 to-orange-500/30 border border-amber-400/50 backdrop-blur-sm self-start animate-bounce">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span className="text-xs font-black text-amber-300 tracking-wider">
                x{stats.comboMultiplier} COMBO
              </span>
            </div>
          )}
        </div>

        {/* Difficulty Level & Distance */}
        <div className="flex flex-col items-end gap-1">
          <div
            className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border backdrop-blur-md shadow-lg ${
              diffColors[stats.difficultyLevel] || diffColors[1]
            }`}
          >
            LVL {stats.difficultyLevel}: {stats.difficultyName}
          </div>

          <div className="flex items-baseline gap-1 text-slate-200 font-extrabold text-sm mt-0.5">
            <span className="text-xl text-white font-black">
              {Math.floor(stats.distance).toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">m</span>
          </div>
        </div>
      </div>

      {/* Airborne Center Alert */}
      {player.isAirborne && (
        <div className="self-center flex items-center gap-2 px-5 py-2 rounded-2xl bg-sky-500/30 border border-sky-400/70 backdrop-blur-md text-sky-200 font-black tracking-widest text-base shadow-[0_0_20px_rgba(56,189,248,0.6)] animate-pulse">
          <Wind className="w-5 h-5 text-sky-300" />
          BAY TRÊN KHÔNG (AIRBORNE)
        </div>
      )}

      {/* Bottom Dash: Speedometer, Jump Button & Touch Controls */}
      <div className="w-full max-w-lg mx-auto flex flex-col gap-2">
        {/* Speedometer & Jump Button Bar */}
        <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-md shadow-2xl">
          {/* Speedometer */}
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Gauge className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-white italic tracking-tight">
                  {player.speedKmh}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  km/h
                </span>
              </div>
              {/* Speed Bar */}
              <div className="w-24 h-1.5 rounded-full bg-slate-800 overflow-hidden mt-0.5">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500 transition-all duration-75"
                  style={{
                    width: `${Math.min(100, ((player.speedKmh - 70) / 210) * 100)}%`
                  }}
                />
              </div>
            </div>
          </div>

          {/* Jump Action Button (Pointer Events Enabled!) */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={onJump}
              disabled={!jumpReady}
              className={`relative group flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-150 active:scale-95 shadow-lg ${
                jumpReady
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-sky-500/40 hover:from-sky-400 hover:to-blue-500 cursor-pointer border border-sky-300/40'
                  : 'bg-slate-800/80 text-slate-500 border border-slate-700/50 cursor-not-allowed'
              }`}
            >
              <Wind
                className={`w-4 h-4 ${
                  jumpReady ? 'text-white animate-spin' : 'text-slate-500'
                }`}
              />
              <span>BAY (JUMP)</span>
              <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[9px] font-mono bg-black/40 rounded border border-white/20">
                SPACE
              </kbd>

              {/* Cooldown Circular/Linear overlay */}
              {!jumpReady && (
                <div
                  className="absolute inset-0 bg-slate-900/70 rounded-xl overflow-hidden pointer-events-none flex items-center justify-center"
                  style={{
                    backdropFilter: 'blur(1px)'
                  }}
                >
                  <span className="text-xs font-mono font-bold text-sky-400">
                    {player.jumpCooldown.toFixed(1)}s
                  </span>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Mobile / Touch On-Screen Controls */}
        <div className="flex items-center justify-between w-full pointer-events-auto pt-1 pb-1">
          {/* Left / Right Steering Buttons */}
          <div className="flex items-center gap-2">
            <button
              onPointerDown={onSteerLeftStart}
              onPointerUp={onSteerLeftEnd}
              onPointerLeave={onSteerLeftEnd}
              className="w-14 h-14 rounded-2xl bg-slate-900/80 hover:bg-slate-800 active:bg-cyan-500/30 active:scale-95 border border-slate-700/60 backdrop-blur-md flex items-center justify-center text-xl font-black text-white shadow-lg touch-none"
            >
              ◀
            </button>
            <button
              onPointerDown={onSteerRightStart}
              onPointerUp={onSteerRightEnd}
              onPointerLeave={onSteerRightEnd}
              className="w-14 h-14 rounded-2xl bg-slate-900/80 hover:bg-slate-800 active:bg-cyan-500/30 active:scale-95 border border-slate-700/60 backdrop-blur-md flex items-center justify-center text-xl font-black text-white shadow-lg touch-none"
            >
              ▶
            </button>
          </div>

          {/* Brake & Nitro Throttle Buttons */}
          <div className="flex items-center gap-2">
            <button
              onPointerDown={onBrakeStart}
              onPointerUp={onBrakeEnd}
              onPointerLeave={onBrakeEnd}
              className="w-14 h-14 rounded-2xl bg-rose-950/60 hover:bg-rose-900/80 active:bg-rose-600/40 active:scale-95 border border-rose-500/50 backdrop-blur-md flex flex-col items-center justify-center text-[10px] font-black text-rose-300 shadow-lg touch-none"
            >
              <span className="text-sm">🛑</span>
              <span>PHANH</span>
            </button>

            <button
              onPointerDown={onThrottleStart}
              onPointerUp={onThrottleEnd}
              onPointerLeave={onThrottleEnd}
              className="w-16 h-14 rounded-2xl bg-gradient-to-t from-amber-600/70 to-orange-500/80 hover:from-amber-500 hover:to-orange-400 active:scale-95 border border-amber-300/60 backdrop-blur-md flex flex-col items-center justify-center text-[10px] font-black text-white shadow-lg shadow-orange-500/30 touch-none"
            >
              <Flame className="w-4 h-4 text-amber-200 animate-pulse" />
              <span>GA (BOOST)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
