import test from "node:test";
import assert from "node:assert/strict";
import { pianoSamples, midiFrequency } from "./piano.ts";

test("piano notes have a quiet attack, finite unclipped harmonics and an acoustic decay", () => {
  const rate = 8000;
  for (const midi of [41, 60, 72]) {
    const samples = pianoSamples(midiFrequency(midi), rate);
    assert.equal(samples[0], 0);
    assert.ok(
      samples.every(
        (sample) => Number.isFinite(sample) && Math.abs(sample) < 1,
      ),
    );
    const rms = (start: number, end: number) =>
      Math.sqrt(
        samples
          .slice(start * rate, end * rate)
          .reduce((sum, sample) => sum + sample * sample, 0) /
          ((end - start) * rate),
      );
    assert.ok(rms(0.02, 0.2) > rms(3, 3.5) * 15);
    assert.ok(Math.abs(samples.at(-1)!) < 0.00001);
    assert.ok(rms(0.02, 0.2) > 0.1);
  }
  assert.equal(midiFrequency(69), 440);
});

test("piano generation rejects invalid input and excessive buffers", () => {
  for (const [frequency, rate, seconds] of [
    [NaN, 8000, 5],
    [440, 0, 5],
    [440, 48000, Infinity],
    [440, 48000, 60],
  ])
    assert.throws(() => pianoSamples(frequency, rate, seconds), RangeError);
});
