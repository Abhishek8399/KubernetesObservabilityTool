import { pianoSamples, pianoChords, midiFrequency } from "./piano.ts";

export type SoundCue = "select" | "step" | "failure" | "enable" | "flight";

/** Original piano-only score. The browser's first user gesture unlocks playback. */
export class Soundscape {
  private context: AudioContext | null = null;
  private enabled = false;
  private master: GainNode | null = null;
  private musicBus: BiquadFilterNode | null = null;
  private effects: AudioNode[] = [];
  private sources = new Set<AudioBufferSourceNode>();
  private buffers = new Map<number, AudioBuffer>();
  private musicTimer: ReturnType<typeof setTimeout> | null = null;
  private musicStep = 0;
  private volume = 0.45;
  private generation = 0;

  setVolume(value: number) {
    if (!Number.isFinite(value)) return;
    this.volume = Math.max(0, Math.min(1, value));
    if (this.context && this.master)
      this.master.gain.setValueAtTime(this.volume, this.context.currentTime);
  }

  async enable() {
    if (typeof window === "undefined" || !window.AudioContext)
      throw new Error("This browser does not support the audio experience.");
    this.context ??= new window.AudioContext();
    const context = this.context;
    const generation = this.generation;
    await context.resume();
    // A mute or unmount while resume is pending must not restart the soundtrack.
    if (generation !== this.generation || context !== this.context) return;
    if (!this.master) {
      this.master = context.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(context.destination);
      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 5200;
      filter.Q.value = 0.3;
      const reverb = context.createConvolver();
      const rate = Math.min(context.sampleRate, 24000);
      const impulse = context.createBuffer(2, Math.ceil(rate * 3.2), rate);
      let seed = 73991;
      for (let channel = 0; channel < 2; channel++) {
        const data = impulse.getChannelData(channel);
        for (let i = 0; i < data.length; i++) {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          data[i] = ((seed / 4294967296) * 2 - 1) * Math.exp((-i / rate) * 2.3);
        }
      }
      reverb.buffer = impulse;
      const wet = context.createGain();
      wet.gain.value = 0.22;
      filter.connect(this.master);
      filter.connect(reverb);
      reverb.connect(wet);
      wet.connect(this.master);
      this.musicBus = filter;
      this.effects = [filter, reverb, wet];
    }
    if (this.enabled) return;
    this.enabled = true;
    this.scheduleMusic();
  }

  private note(midi: number, velocity: number, delay = 0) {
    const context = this.context;
    if (
      !this.enabled ||
      !context ||
      context.state !== "running" ||
      !this.musicBus
    )
      return;
    let buffer = this.buffers.get(midi);
    if (!buffer) {
      const rate = Math.min(context.sampleRate, 24000);
      const samples = pianoSamples(midiFrequency(midi), rate);
      buffer = context.createBuffer(1, samples.length, rate);
      buffer.getChannelData(0).set(samples);
      this.buffers.set(midi, buffer);
    }
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(velocity, context.currentTime + delay);
    source.connect(gain);
    gain.connect(this.musicBus);
    this.sources.add(source);
    source.onended = () => {
      this.sources.delete(source);
      source.disconnect();
      gain.disconnect();
    };
    source.start(context.currentTime + delay);
  }

  private scheduleMusic() {
    if (!this.enabled || !this.context || this.context.state !== "running")
      return;
    // Slow original broken chords, occasional bass, and intentional silence.
    const beat = this.musicStep++;
    const chord = pianoChords[Math.floor(beat / 12) % pianoChords.length];
    const pattern = [2, 4, 3, 5, 4, null, 2, 3, 4, 5, 3, null];
    const index = pattern[beat % pattern.length];
    if (beat % 12 === 0) this.note(chord[0], 0.17);
    if (index !== null)
      this.note(chord[index], beat % 3 === 0 ? 0.22 : 0.17, 0.03);
    this.musicTimer = setTimeout(() => {
      this.musicTimer = null;
      this.scheduleMusic();
    }, 1050);
  }

  disable() {
    this.generation++;
    this.enabled = false;
    if (this.musicTimer) clearTimeout(this.musicTimer);
    this.musicTimer = null;
    if (this.context?.state === "running") return this.context.suspend();
  }

  play(cue: SoundCue) {
    // Interaction accents use the same piano; no electronic beeps or drone voices.
    if (cue === "flight" || cue === "enable") return;
    this.note({ select: 72, step: 76, failure: 57 }[cue], 0.065);
  }

  async close() {
    this.generation++;
    this.enabled = false;
    if (this.musicTimer) clearTimeout(this.musicTimer);
    this.musicTimer = null;
    for (const source of this.sources) source.stop();
    this.sources.clear();
    this.buffers.clear();
    this.master?.disconnect();
    this.master = null;
    for (const effect of this.effects) effect.disconnect();
    this.effects = [];
    this.musicBus = null;
    const context = this.context;
    this.context = null;
    if (context && context.state !== "closed") await context.close();
  }
}
