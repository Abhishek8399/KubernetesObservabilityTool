/** Original struck-string piano timbre; no recordings or borrowed melody. */
export function pianoSamples(
  frequency: number,
  sampleRate: number,
  seconds = 5,
) {
  if (
    !Number.isFinite(frequency) ||
    frequency < 20 ||
    frequency > 4000 ||
    !Number.isFinite(sampleRate) ||
    sampleRate < 8000 ||
    sampleRate > 96000 ||
    !Number.isFinite(seconds) ||
    seconds < 0.25 ||
    seconds > 8
  ) {
    throw new RangeError("Invalid piano note parameters.");
  }
  const samples = new Float32Array(Math.ceil(seconds * sampleRate));
  const partials = [1, 0.42, 0.22, 0.11, 0.065, 0.035, 0.018];
  // Higher strings decay sooner; two slightly detuned strings give a gentle acoustic beating.
  for (let harmonic = 1; harmonic <= partials.length; harmonic++) {
    const f =
      frequency * harmonic * Math.sqrt(1 + 0.000035 * harmonic * harmonic);
    if (f >= sampleRate / 2) continue;
    const decay = 1.05 + harmonic * 0.26 + frequency / 1800;
    for (let i = 0; i < samples.length; i++) {
      const t = i / sampleRate;
      const attack = 1 - Math.exp(-t * 650);
      const release = Math.min(1, (seconds - t) / 0.12);
      const phase = 2 * Math.PI * f * t;
      samples[i] +=
        partials[harmonic - 1] *
        attack *
        Math.exp(-t * decay) *
        release *
        (0.72 * Math.sin(phase) + 0.28 * Math.sin(phase * 1.0008)) *
        0.48;
    }
  }
  return samples;
}

export const pianoChords = [
  [45, 52, 57, 60, 64, 69],
  [41, 48, 53, 57, 60, 65],
  [48, 55, 60, 64, 67, 72],
  [43, 50, 55, 59, 62, 67],
] as const;

export function midiFrequency(note: number) {
  return 440 * 2 ** ((note - 69) / 12);
}
