import React from 'react';
import type { BikeColorTheme } from '../game/types';
import { BIKE_THEMES } from '../game/motorcycleRenderer';
import { Award, Flame, Play, ShieldAlert, Sparkles, Wind, Zap } from 'lucide-react';

interface StartScreenProps {
  onStart: () => void;
  selectedTheme: BikeColorTheme;
  onSelectTheme: (theme: BikeColorTheme) => void;
  highScore: number;
  bestDistance: number;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  onStart,
  selectedTheme,
  onSelectTheme,
  highScore,
  bestDistance
}) => {
  const themes = Object.values(BIKE_THEMES);

  return (
    <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-between p-4 overflow-y-auto z-20">
      {/* Title & Brand */}
      <div className="flex flex-col items-center text-center mt-2">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-widest mb-2">
          <Zap className="w-3.5 h-3.5" /> High-Octane Arcade Racing
        </div>

        <h1 className="text-4xl sm:text-5xl font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 via-amber-400 to-red-500 drop-shadow-[0_4px_20px_rgba(245,158,11,0.6)]">
          LANE SPLITTER
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-sm mt-1">
          Lách qua 3 làn xe xa lộ, kích hoạt combo và bay qua những chướng ngại vật tử thần!
        </p>
      </div>

      {/* Center Card: Motorcycle Customization & Features */}
      <div className="w-full max-w-md flex flex-col gap-3 my-auto">
        {/* Bike Liveries Selector */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Chọn màu xe moto phân khối lớn
            </span>
            <span className="text-xs font-extrabold text-cyan-400">
              {BIKE_THEMES[selectedTheme]?.name}
            </span>
          </div>

          <div className="grid grid-cols-6 gap-2">
            {themes.map((t) => {
              const isSelected = selectedTheme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => onSelectTheme(t.id)}
                  className={`group relative flex flex-col items-center p-2 rounded-xl transition-all duration-150 ${
                    isSelected
                      ? 'bg-slate-800 border-2 border-cyan-400 scale-105 shadow-lg shadow-cyan-500/20'
                      : 'bg-slate-950/60 border border-slate-800 hover:border-slate-700 hover:scale-100'
                  }`}
                >
                  <div
                    className="w-7 h-7 rounded-full border-2 border-white/40 shadow-md transition-transform group-hover:scale-110"
                    style={{ backgroundColor: t.primary }}
                  />
                  <span className="text-[9px] font-bold text-slate-400 mt-1 capitalize truncate w-full text-center">
                    {t.id}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Game Rules / Highlights */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 text-left space-y-2 text-xs shadow-xl">
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-cyan-300">LANE SPLIT (Lách giữa 2 xe):</span>{' '}
              <span className="text-slate-300">
                Chạy sát vạch kẻ đường giữa 2 xe để x2 x3 x5 x10 điểm thưởng!
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 shrink-0">
              <Wind className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sky-300">BAY QUA XE (JUMP):</span>{' '}
              <span className="text-slate-300">
                Bấm <b>SPACE</b> để bay lên không trung vượt qua xe phía trước an toàn!
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-rose-400">ĐỘ KHÓ & XE ĐẶC BIỆT:</span>{' '}
              <span className="text-slate-300">
                Càng chạy xa tốc độ càng tăng! Cảnh sát, Cứu thương và Taxi sẽ đột ngột tạt đầu chuyển làn!
              </span>
            </div>
          </div>
        </div>

        {/* High Score / Best Distance */}
        {(highScore > 0 || bestDistance > 0) && (
          <div className="flex items-center justify-around px-4 py-2 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <div className="text-left">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Kỷ lục điểm</div>
                <div className="text-sm font-black text-amber-300">
                  {highScore.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="h-6 w-px bg-slate-800" />

            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              <div className="text-left">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Quãng đường xa nhất</div>
                <div className="text-sm font-black text-orange-300">
                  {bestDistance.toLocaleString()} m
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Start Button */}
      <div className="w-full max-w-md pb-2 mt-3">
        <button
          onClick={onStart}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 active:scale-98 text-white font-black text-lg tracking-wider shadow-xl shadow-teal-500/30 transition-all cursor-pointer border border-white/20"
        >
          <Play className="w-6 h-6 fill-white" />
          <span>BẮT ĐẦU CHẠY (START)</span>
        </button>

        <p className="text-[11px] text-slate-400 font-medium text-center mt-2">
          Phím tắt: <b>A / D / ⬅️ ➡️</b> lách làn, <b>W / ⬆️</b> tăng tốc, <b>S / ⬇️</b> phanh, <b>SPACE</b> nhảy
        </p>
      </div>
    </div>
  );
};
