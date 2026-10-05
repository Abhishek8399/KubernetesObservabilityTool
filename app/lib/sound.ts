export type SoundCue = "select" | "step" | "failure" | "enable";

/** Synthesized locally. Audio only starts after the listener enables it. */
export class Soundscape {
  private context: AudioContext | null = null;
  private enabled = false;

  async enable() {
    if (typeof window === "undefined" || !window.AudioContext) {
      throw new Error("This browser does not support the audio experience.");
    }
    this.context ??= new window.AudioContext();
    await this.context.resume();
    this.enabled = true;
    this.play("enable");
  }

  disable() {
    this.enabled = false;
    if (this.context?.state === "running") return this.context.suspend();
  }

  play(cue: SoundCue) {
    const context = this.context;
    if (!this.enabled || !context || context.state !== "running") return;
    const notes = {
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
      gain.gain.linearRampToValueAtTime(0.025, start + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
      oscillator.connect(gain);
      gain.connect(context.destination);
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
    if (this.context && this.context.state !== "closed")
      await this.context.close();
    this.context = null;
  }
}
