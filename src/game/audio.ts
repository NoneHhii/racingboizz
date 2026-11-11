// Web Audio API Procedural Sound Engine & Continuous Looping BGM for Lane Splitter

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private sirenOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private sirenInterval: number | null = null;
  private initialized: boolean = false;

  // Background Music
  private bgmAudio: HTMLAudioElement | null = null;
  private bgmInitialized: boolean = false;

  constructor() {
    const saved = localStorage.getItem('racingboizz_muted');
    if (saved !== null) {
      this.isMuted = saved === 'true';
    }
  }

  public init() {
    if (this.initialized && this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.initialized = true;
    } catch {
      // AudioContext not supported
    }
    this.initBGM();
  }

  // --- Background Music (BGM) ---
  private initBGM() {
    if (this.bgmInitialized && this.bgmAudio) return;
    try {
      this.bgmAudio = new Audio('/music/bgm.mp3');
      this.bgmAudio.loop = true;
      this.bgmAudio.volume = this.isMuted ? 0 : 0.45;
      this.bgmAudio.preload = 'auto';
      this.bgmInitialized = true;
    } catch {
      // Audio element not supported
    }
  }

  public startBGM() {
    this.init();
    if (!this.bgmAudio) return;

    if (this.isMuted) {
      this.bgmAudio.volume = 0;
      return;
    }

    this.bgmAudio.volume = 0.45;
    if (this.bgmAudio.paused) {
      const playPromise = this.bgmAudio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Auto-play was prevented; will retry upon next interaction
        });
      }
    }
  }

  public pauseBGM() {
    if (this.bgmAudio && !this.bgmAudio.paused) {
      this.bgmAudio.pause();
    }
  }

  public duckBGM(volume = 0.18) {
    if (this.bgmAudio && !this.isMuted) {
      this.bgmAudio.volume = volume;
    }
  }

  public restoreBGM() {
    if (this.bgmAudio && !this.isMuted) {
      this.bgmAudio.volume = 0.45;
      if (this.bgmAudio.paused) {
        this.bgmAudio.play().catch(() => {});
      }
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    localStorage.setItem('racingboizz_muted', String(this.isMuted));
    if (this.isMuted) {
      this.stopEngine();
      this.stopSiren();
      if (this.bgmAudio) {
        this.bgmAudio.pause();
      }
    } else {
      if (this.bgmAudio) {
        this.bgmAudio.volume = 0.45;
        this.bgmAudio.play().catch(() => {});
      }
    }
    return this.isMuted;
  }

  // --- Engine Sound ---
  public startEngine() {
    if (this.isMuted || !this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (this.engineOsc1) return;

    try {
      const now = this.ctx.currentTime;
      // Main tone
      this.engineOsc1 = this.ctx.createOscillator();
      this.engineOsc1.type = 'sawtooth';
      this.engineOsc1.frequency.setValueAtTime(65, now);

      // Sub-harmonic / throat growl
      this.engineOsc2 = this.ctx.createOscillator();
      this.engineOsc2.type = 'triangle';
      this.engineOsc2.frequency.setValueAtTime(130, now);

      // Lowpass filter to give high-RPM superbike acoustics
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(450, now);
      this.engineFilter.Q.setValueAtTime(3.5, now);

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0.08, now);

      this.engineOsc1.connect(this.engineFilter);
      this.engineOsc2.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);

      this.engineOsc1.start(now);
      this.engineOsc2.start(now);
    } catch {
      // failed to start engine audio
    }
  }

  public updateEngine(speedKmh: number, throttle: number) {
    if (this.isMuted || !this.ctx || !this.engineOsc1 || !this.engineGain || !this.engineFilter) return;

    try {
      const now = this.ctx.currentTime;
      const baseFreq = 70 + (speedKmh / 280) * 160 + (throttle > 0 ? throttle * 35 : 0);
      this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.05);
      if (this.engineOsc2) {
        this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.5, now, 0.05);
      }

      const cutoff = 380 + (speedKmh / 280) * 900 + (throttle > 0 ? 300 : -100);
      this.engineFilter.frequency.setTargetAtTime(Math.min(cutoff, 2400), now, 0.05);

      const targetGain = throttle < 0 ? 0.04 : 0.07 + (speedKmh / 280) * 0.06;
      this.engineGain.gain.setTargetAtTime(targetGain, now, 0.05);
    } catch {
      // Ignore
    }
  }

  public stopEngine() {
    if (!this.engineOsc1) return;
    try {
      this.engineOsc1.stop();
      this.engineOsc2?.stop();
      this.engineOsc1.disconnect();
      this.engineOsc2?.disconnect();
      this.engineGain?.disconnect();
      this.engineFilter?.disconnect();
    } catch {
      // Ignore
    }
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineGain = null;
    this.engineFilter = null;
  }

  // --- Jump Whoosh ---
  public playJump() {
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 0.35;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(300, now);
      filter.frequency.exponentialRampToValueAtTime(1800, now + 0.3);
      filter.Q.setValueAtTime(4.0, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.25);

      const oscGain = this.ctx.createGain();
      oscGain.gain.setValueAtTime(0.12, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);

      noise.start(now);
      osc.start(now);
      noise.stop(now + 0.35);
      osc.stop(now + 0.3);
    } catch {
      // Ignore
    }
  }

  // --- Landing Thud ---
  public playLand() {
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch {
      // Ignore
    }
  }

  // --- Lane Split Streak / Close Call ---
  public playLaneSplit(combo: number) {
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;

      const notes = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
      const freq = notes[Math.min(combo - 1, notes.length - 1)];

      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, now);

      const osc2 = this.ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 1.5, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.25);
      osc2.stop(now + 0.25);
    } catch {
      // Ignore
    }
  }

  public playCloseCall() {
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.12);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // Ignore
    }
  }

  // --- Car Horn ---
  public playHorn() {
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(349.23, now);
      osc2.frequency.setValueAtTime(415.3, now);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.setValueAtTime(0.12, now + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.25);
      osc2.stop(now + 0.25);
    } catch {
      // Ignore
    }
  }

  // --- Siren (Police / Ambulance) ---
  public startSiren(type: 'police' | 'ambulance') {
    if (this.isMuted || !this.ctx || this.sirenOsc) return;
    try {
      const now = this.ctx.currentTime;
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'sawtooth';

      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.setValueAtTime(0.08, now);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now);

      this.sirenOsc.connect(filter);
      filter.connect(this.sirenGain);
      this.sirenGain.connect(this.ctx.destination);

      this.sirenOsc.start(now);

      let step = 0;
      this.sirenInterval = window.setInterval(() => {
        if (!this.sirenOsc || !this.ctx) return;
        const curTime = this.ctx.currentTime;
        if (type === 'police') {
          const f = step % 2 === 0 ? 920 : 620;
          this.sirenOsc.frequency.setTargetAtTime(f, curTime, 0.12);
        } else {
          const f = step % 2 === 0 ? 820 : 580;
          this.sirenOsc.frequency.setTargetAtTime(f, curTime, 0.22);
        }
        step++;
      }, type === 'police' ? 180 : 380);
    } catch {
      // Ignore
    }
  }

  public stopSiren() {
    if (this.sirenInterval) {
      clearInterval(this.sirenInterval);
      this.sirenInterval = null;
    }
    if (this.sirenOsc) {
      try {
        this.sirenOsc.stop();
        this.sirenOsc.disconnect();
        this.sirenGain?.disconnect();
      } catch {
        // Ignore
      }
      this.sirenOsc = null;
      this.sirenGain = null;
    }
  }

  // --- Crash / Game Over ---
  public playCrash() {
    if (this.isMuted || !this.ctx) return;
    this.stopEngine();
    this.stopSiren();
    this.duckBGM(0.18); // Duck background rock music so crash explosion booms!

    try {
      const now = this.ctx.currentTime;

      const bass = this.ctx.createOscillator();
      bass.type = 'triangle';
      bass.frequency.setValueAtTime(110, now);
      bass.frequency.exponentialRampToValueAtTime(20, now + 0.6);

      const bassGain = this.ctx.createGain();
      bassGain.gain.setValueAtTime(0.4, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      bass.connect(bassGain);
      bassGain.connect(this.ctx.destination);
      bass.start(now);
      bass.stop(now + 0.6);

      const bufferSize = this.ctx.sampleRate * 0.8;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-3 * (i / bufferSize));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, now);
      filter.frequency.exponentialRampToValueAtTime(200, now + 0.7);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.35, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      noise.start(now);
      noise.stop(now + 0.8);
    } catch {
      // Ignore
    }
  }
}

export const sound = new SoundEngine();
