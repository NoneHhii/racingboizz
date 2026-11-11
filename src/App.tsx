import { useEffect, useMemo, useState } from 'react';
import { GameEngine } from './game/engine';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { StartScreen } from './components/StartScreen';
import { GameOverModal } from './components/GameOverModal';
import { SoundToggle } from './components/SoundToggle';
import type { BikeColorTheme, GameState, GameStats, PlayerMotorcycle } from './game/types';
import { spriteCache } from './game/sprites';
import { sound } from './game/audio';

export function App() {
  const engine = useMemo(() => new GameEngine(), []);

  const [isLoading, setIsLoading] = useState(true);
  const [gameState, setGameState] = useState<GameState>('menu');
  const [stats, setStats] = useState<GameStats>({ ...engine.stats });
  const [player, setPlayer] = useState<PlayerMotorcycle>({ ...engine.player });
  const [selectedTheme, setSelectedTheme] = useState<BikeColorTheme>(engine.player.colorTheme);

  // Preload vehicle images on boot
  useEffect(() => {
    spriteCache.preloadAll().then(() => {
      setIsLoading(false);
    });

    // Start background music loop on first user interaction (browser policy)
    const handleFirstInteraction = () => {
      sound.startBGM();
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };

    window.addEventListener('pointerdown', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);

    return () => {
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  // Sync state between game engine and React UI at ~20fps
  useEffect(() => {
    const timer = setInterval(() => {
      setGameState(engine.state);
      setStats({ ...engine.stats });
      setPlayer({ ...engine.player });
    }, 45);

    return () => clearInterval(timer);
  }, [engine]);

  const handleStart = () => {
    sound.restoreBGM();
    sound.startBGM();
    engine.start();
    setGameState('playing');
  };

  const handleJump = () => {
    engine.jump();
  };

  const handleSelectTheme = (theme: BikeColorTheme) => {
    setSelectedTheme(theme);
    engine.setBikeTheme(theme);
    sound.startBGM();
  };

  const handleMenu = () => {
    sound.restoreBGM();
    engine.state = 'menu';
    setGameState('menu');
  };

  // Touch Steer handlers
  const handleSteerLeftStart = () => engine.setTouchTarget(engine.player.x - 70);
  const handleSteerLeftEnd = () => engine.setTouchTarget(null);
  const handleSteerRightStart = () => engine.setTouchTarget(engine.player.x + 70);
  const handleSteerRightEnd = () => engine.setTouchTarget(null);

  // Touch Throttle & Brake
  const handleThrottleStart = () => engine.setTouchTarget(null, true, false);
  const handleThrottleEnd = () => engine.setTouchTarget(null, false, false);
  const handleBrakeStart = () => engine.setTouchTarget(null, false, true);
  const handleBrakeEnd = () => engine.setTouchTarget(null, false, false);

  if (isLoading) {
    return (
      <div className="w-full h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
        <div className="text-xl font-black italic tracking-widest text-cyan-400">
          ĐANG TẢI XE & DỮ LIỆU...
        </div>
        <div className="text-xs text-slate-400 mt-2 font-mono">
          Nạp 117+ xe TopDown Vehicles v1.17
        </div>
      </div>
    );
  }

  return (
    <main className="w-full h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black flex items-center justify-center overflow-hidden relative">
      {/* Sound Toggle Button */}
      <SoundToggle />

      {/* Main Game Frame Container */}
      <div className="relative w-full max-w-[500px] h-full flex flex-col items-center justify-center overflow-hidden shadow-2xl bg-slate-950 border-x border-slate-800">
        {/* Game Canvas */}
        <GameCanvas engine={engine} onJump={handleJump} />

        {/* HUD Overlay (Playing & Crashed) */}
        {(gameState === 'playing' || gameState === 'crashed') && (
          <HUD
            stats={stats}
            player={player}
            onJump={handleJump}
            onSteerLeftStart={handleSteerLeftStart}
            onSteerLeftEnd={handleSteerLeftEnd}
            onSteerRightStart={handleSteerRightStart}
            onSteerRightEnd={handleSteerRightEnd}
            onThrottleStart={handleThrottleStart}
            onThrottleEnd={handleThrottleEnd}
            onBrakeStart={handleBrakeStart}
            onBrakeEnd={handleBrakeEnd}
          />
        )}

        {/* Start / Menu Overlay */}
        {gameState === 'menu' && (
          <StartScreen
            onStart={handleStart}
            selectedTheme={selectedTheme}
            onSelectTheme={handleSelectTheme}
            highScore={stats.highScore}
            bestDistance={stats.bestDistance}
          />
        )}

        {/* Game Over Modal */}
        {gameState === 'gameover' && (
          <GameOverModal
            stats={stats}
            onRestart={handleStart}
            onMenu={handleMenu}
          />
        )}
      </div>
    </main>
  );
}

export default App;
