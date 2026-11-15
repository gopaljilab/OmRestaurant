/**
 * KDS Audio Synthesizer using Web Audio API.
 * Synthesizes restaurant kitchen chimes directly without needing external audio files.
 */

class KdsAudioAlerts {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    // Read user preference from localStorage
    const saved = localStorage.getItem('om_kds_muted');
    this.isMuted = saved === 'true';
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    localStorage.setItem('om_kds_muted', String(muted));
  }

  public toggleMuted(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  /**
   * Pleasant 2-tone chime for incoming orders (D5 -> A5)
   */
  public playNewOrderChime(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Note 1: D5 (587.33 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.25, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Note 2: A5 (880 Hz) - plays 120ms later
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.0, now + 0.12);
      gain2.gain.setValueAtTime(0.001, now);
      gain2.gain.setValueAtTime(0.28, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.65);
    } catch (e) {
      console.warn('Audio alert could not play:', e);
    }
  }

  /**
   * Urgent short warning pulse for delayed tickets (F#5 warning chime)
   */
  public playDelayedWarning(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      [0, 0.16, 0.32].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(739.99, now + offset); // F#5
        gain.gain.setValueAtTime(0.2, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.12);
      });
    } catch (e) {
      console.warn('Delayed alert could not play:', e);
    }
  }

  /**
   * Satisfying quick bump click for keyboard or touch actions
   */
  public playBumpFeedback(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.5, now); // C6
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch {
      // Ignore
    }
  }
}

export const kdsAudio = new KdsAudioAlerts();

// Alias for compatibility
export const soundService = {
  isMuted: () => kdsAudio.getMuted(),
  setMuted: (muted: boolean) => kdsAudio.setMuted(muted),
  toggleMuted: () => kdsAudio.toggleMuted(),
  playChime: () => kdsAudio.playNewOrderChime(),
  playNewOrderChime: () => kdsAudio.playNewOrderChime(),
  playDelayedWarning: () => kdsAudio.playDelayedWarning(),
  playBumpSound: () => kdsAudio.playBumpFeedback(),
  playBumpFeedback: () => kdsAudio.playBumpFeedback(),
};
