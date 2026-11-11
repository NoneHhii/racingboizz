import React from 'react';
import type { GameStats } from '../game/types';
import { Award, Flame, Gauge, RotateCcw, Sparkles, Trophy } from 'lucide-react';

interface GameOverModalProps {
  stats: GameStats;
  onRestart: () => void;
  onMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  onRestart,
  onMenu
}) => {
  const isNewRecord = stats.score >= stats.highScore && stats.score > 0;

  return (
    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-30 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col items-center text-center">
        {/* Crash Header */}
        <div className="w-16 h-16 rounded-3xl bg-red-500/20 border-2 border-red-500/60 flex items-center justify-center text-3xl mb-3 shadow-lg shadow-red-500/20 animate-bounce">
          💥
        </div>

        <h2 className="text-3xl font-black italic tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-400 to-orange-400">
          TAI NẠN THẢM KHỐC!
        </h2>
        <p className="text-xs text-slate-400 mt-1 font-medium">
          Mọi va chạm trên xa lộ đều phải trả giá đắt!
        </p>

        {/* New Record Banner */}
        {isNewRecord && (
          <div className="flex items-center gap-1.5 mt-3 px-4 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-xs font-black uppercase tracking-wider animate-pulse">
            <Trophy className="w-4 h-4 text-amber-400" />
            KỶ LỤC ĐIỂM MỚI!
          </div>
        )}

        {/* Stats Grid */}
        <div className="w-full grid grid-cols-2 gap-2.5 my-4">
          {/* Final Score */}
          <div className="col-span-2 bg-slate-950/70 border border-slate-800 rounded-2xl p-3 flex flex-col items-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Tổng điểm (Score)
            </span>
            <span className="text-3xl font-black italic text-cyan-300 drop-shadow-[0_2px_8px_rgba(6,182,212,0.4)]">
              {Math.floor(stats.score).toLocaleString()}
            </span>
          </div>

          {/* Distance */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-2.5 flex flex-col items-center">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <Flame className="w-3.5 h-3.5 text-orange-400" /> Quãng đường
            </div>
            <div className="text-lg font-black text-white mt-0.5">
              {Math.floor(stats.distance).toLocaleString()} m
            </div>
          </div>

          {/* Top Speed */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-2.5 flex flex-col items-center">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" /> Tốc độ tối đa
            </div>
            <div className="text-lg font-black text-white mt-0.5">
              {stats.maxSpeedKmh} km/h
            </div>
          </div>

          {/* Lane Splits Count */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-2.5 flex flex-col items-center">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Lách qua 2 xe
            </div>
            <div className="text-lg font-black text-amber-300 mt-0.5">
              {stats.laneSplitsCount} lần
            </div>
          </div>

          {/* Close Calls */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-2.5 flex flex-col items-center">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <Award className="w-3.5 h-3.5 text-purple-400" /> Né sát nút
            </div>
            <div className="text-lg font-black text-purple-300 mt-0.5">
              {stats.closeCallsCount} lần
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2 mt-1">
          <button
            onClick={onRestart}
            className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-500 to-orange-500 hover:from-red-500 hover:to-orange-400 active:scale-98 text-white font-black text-base tracking-wider shadow-xl shadow-red-500/30 transition-all cursor-pointer border border-white/20"
          >
            <RotateCcw className="w-5 h-5" />
            <span>CHƠI LẠI (TRY AGAIN)</span>
          </button>

          <button
            onClick={onMenu}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer border border-slate-700/60"
          >
            ĐỔI MÀU XE / MENU CHÍNH
          </button>
        </div>
      </div>
    </div>
  );
};
