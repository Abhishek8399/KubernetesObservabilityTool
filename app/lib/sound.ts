export type SoundCue = "select" | "step" | "failure" | "enable" | "flight";

/** Synthesized locally. Audio only starts after the listener enables it. */
export class Soundscape {
  private context: AudioContext | null = null;
  private enabled = false;
  private master: GainNode | null = null;
  private ambient: OscillatorNode[] = [];
  private musicBus: BiquadFilterNode | null = null;
  private effects: AudioNode[] = [];
  private musicTimer: ReturnType<typeof setTimeout> | null = null;
  private musicStep = 0;
  private volume = 0.45;

  setVolume(value: number) {
    if (!Number.isFinite(value)) return;
    this.volume = Math.max(0, Math.min(1, value));
    if (this.context && this.master)
      this.master.gain.setValueAtTime(this.volume, this.context.currentTime);
  }

  async enable() {
    if (typeof window === "undefined" || !window.AudioContext) {
      throw new Error("This browser does not support the audio experience.");
    }
    this.context ??= new window.AudioContext();
    await this.context.resume();
    if (!this.master) {
      this.master = this.context.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.context.destination);
      // Soft minor-key pads and a filtered echo, rather than a continuous bass drone.
      const filter = this.context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1500;
      filter.Q.value = 0.4;
      const delay = this.context.createDelay(2);
      delay.delayTime.value = 0.48;
      const feedback = this.context.createGain();
      feedback.gain.value = 0.24;
      filter.connect(this.master);
      filter.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(this.master);
      this.musicBus = filter;
      this.effects = [filter, delay, feedback];
      for (const frequency of [220, 261.63, 329.63]) {
        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, this.context.currentTime);
        gain.gain.linearRampToValueAtTime(0.0035, this.context.currentTime + 3);
        oscillator.connect(gain);
        gain.connect(filter);
        oscillator.onended = () => {
          oscillator.disconnect();
          gain.disconnect();
        };
        oscillator.start();
        this.ambient.push(oscillator);
      }
    }
    this.enabled = true;
    if (!this.musicTimer) this.scheduleMusic();
    this.play("enable");
  }

  private scheduleMusic() {
    const context = this.context;
    if (
      !this.enabled ||
      !context ||
      context.state !== "running" ||
      !this.musicBus
    )
      return;
    // Original, sparse cyber-ambient motif: room to breathe between notes.
    const pattern = [
      440,
      null,
      523.25,
      659.25,
      null,
      493.88,
      392,
      null,
      440,
      523.25,
      null,
      329.63,
      392,
      493.88,
      null,
      null,
    ];
    const frequency = pattern[this.musicStep++ % pattern.length];
    if (frequency) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, context.currentTime);
      gain.gain.linearRampToValueAtTime(0.011, context.currentTime + 0.09);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 1.8);
      oscillator.connect(gain);
      gain.connect(this.musicBus);
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 1.9);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    }
    this.musicTimer = setTimeout(() => {
      this.musicTimer = null;
      this.scheduleMusic();
    }, 1600);
  }

  disable() {
    this.enabled = false;
    if (this.musicTimer) clearTimeout(this.musicTimer);
    this.musicTimer = null;
    if (this.context?.state === "running") return this.context.suspend();
  }

  play(cue: SoundCue) {
    const context = this.context;
    if (!this.enabled || !context || context.state !== "running") return;
    const notes = {
      flight: [164.81, 220, 329.63, 440],
      select: [440, 659.25],
      step: [523.25, 783.99],
      failure: [220, 164.81],
      enable: [329.63, 440, 659.25],
    }[cue];
    notes.forEach((frequency, index) => {
      const start = context.currentTime + index * 0.075;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.008, start + 0.045);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
      oscillator.connect(gain);
      gain.connect(this.musicBus!);
      oscillator.start(start);
      oscillator.stop(start + 0.3);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    });
  }

  async close() {
    this.enabled = false;
    if (this.musicTimer) clearTimeout(this.musicTimer);
    this.musicTimer = null;
    for (const oscillator of this.ambient) oscillator.stop();
    this.ambient = [];
    this.master?.disconnect();
    this.master = null;
    for (const effect of this.effects) effect.disconnect();
    this.effects = [];
    this.musicBus = null;
    if (this.context && this.context.state !== "closed")
      await this.context.close();
    this.context = null;
  }
}
