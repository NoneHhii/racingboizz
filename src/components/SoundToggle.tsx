import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { sound } from '../game/audio';

export const SoundToggle: React.FC = () => {
  const [muted, setMuted] = useState(sound.getMuted());

  const handleToggle = () => {
    const next = sound.toggleMute();
    setMuted(next);
  };

  return (
    <button
      onClick={handleToggle}
      aria-label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
      className="absolute top-3 right-3 z-40 p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 backdrop-blur-md text-slate-300 hover:text-white shadow-lg transition-transform active:scale-95 cursor-pointer"
    >
      {muted ? (
        <VolumeX className="w-5 h-5 text-rose-400" />
      ) : (
        <Volume2 className="w-5 h-5 text-cyan-400" />
      )}
    </button>
  );
};
