/**
 * Telemetry Feedback Helper: Haptics and Audio
 * Safely handles device limitations:
 * - iOS Safari has no navigator.vibrate
 * - Web Audio API requires user gesture before playing
 * Never promises feedback; fails silently when unsupported.
 */

class FeedbackManager {
  private audioCtx: AudioContext | null = null;
  public soundEnabled: boolean = true;
  public hapticsEnabled: boolean = true;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const savedSound = localStorage.getItem("life_sound_enabled");
        const savedHaptics = localStorage.getItem("life_haptics_enabled");
        if (savedSound !== null) this.soundEnabled = savedSound === "true";
        if (savedHaptics !== null) this.hapticsEnabled = savedHaptics === "true";
      } catch {
        // localStorage unavailable
      }
    }
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("life_sound_enabled", String(enabled));
      } catch {}
    }
  }

  public setHapticsEnabled(enabled: boolean) {
    this.hapticsEnabled = enabled;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("life_haptics_enabled", String(enabled));
      } catch {}
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.audioCtx) {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public playChime(frequency: number = 880, durationMs: number = 150) {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + durationMs / 1000);
    } catch {
      // Audio playback blocked or unsupported
    }
  }

  public playCorrect() {
    this.playChime(784, 120); // G5 note
    setTimeout(() => this.playChime(1046, 180), 80); // C6 note
    this.triggerHaptic("light");
  }

  public playIncorrect() {
    this.playChime(220, 200); // A3 low note
    this.triggerHaptic("medium");
  }

  public triggerHaptic(style: "light" | "medium" | "heavy" = "light") {
    if (!this.hapticsEnabled) return;
    if (typeof window === "undefined" || !("vibrate" in navigator)) return;

    try {
      if (typeof navigator.vibrate === "function") {
        if (style === "light") navigator.vibrate(15);
        else if (style === "medium") navigator.vibrate(40);
        else if (style === "heavy") navigator.vibrate([60, 40, 60]);
      }
    } catch {
      // Vibration not permitted
    }
  }
}

export const feedbackManager = new FeedbackManager();
