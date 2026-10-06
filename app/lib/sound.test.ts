import test from "node:test";
import assert from "node:assert/strict";
import { Soundscape } from "./sound.ts";

test("piano requires a gesture, respects mute, reuses its device, and closes cleanly", async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  let devices = 0,
    notes = 0,
    closes = 0,
    buffers = 0,
    stops = 0;
  let holdResume = false;
  let releaseResume: (() => void) | undefined;
  class Device {
    state = "suspended";
    currentTime = 0;
    destination = {};
    sampleRate = 8000;
    constructor() {
      devices++;
    }
    async resume() {
      if (holdResume)
        await new Promise<void>((resolve) => {
          releaseResume = resolve;
        });
      this.state = "running";
    }
    async suspend() {
      this.state = "suspended";
    }
    async close() {
      this.state = "closed";
      closes++;
    }
    createBuffer(channels: number, length: number) {
      buffers++;
      const data = Array.from(
        { length: channels },
        () => new Float32Array(length),
      );
      return {
        getChannelData(channel: number) {
          return data[channel];
        },
      };
    }
    createConvolver() {
      return { buffer: null, connect() {}, disconnect() {} };
    }
    createBufferSource() {
      return {
        buffer: null,
        connect() {},
        disconnect() {},
        start() {
          notes++;
        },
        stop() {
          stops++;
        },
        onended: null,
      };
    }
    createBiquadFilter() {
      return {
        type: "lowpass",
        frequency: { value: 0 },
        Q: { value: 0 },
        connect() {},
        disconnect() {},
      };
    }
    createGain() {
      return {
        gain: {
          setValueAtTime() {},
          linearRampToValueAtTime() {},
          exponentialRampToValueAtTime() {},
        },
        connect() {},
        disconnect() {},
      };
    }
  }
  Object.defineProperty(globalThis, "window", {
    value: { AudioContext: Device },
    configurable: true,
  });
  try {
    const sound = new Soundscape();
    sound.play("select");
    assert.equal(devices, 0, "muted startup must not create an audio device");
    assert.equal(notes, 0);
    holdResume = true;
    const pendingEnable = sound.enable();
    await sound.disable();
    releaseResume!();
    await pendingEnable;
    assert.equal(
      notes,
      0,
      "muting while audio unlock is pending cannot start the score",
    );
    holdResume = false;
    await sound.enable();
    assert.equal(devices, 1);
    assert.ok(notes > 0);
    const startedNotes = notes;
    await sound.enable();
    assert.equal(
      notes,
      startedNotes,
      "enabling twice must not stack the score",
    );
    sound.play("select");
    const cachedBuffers = buffers;
    sound.play("select");
    assert.equal(
      buffers,
      cachedBuffers,
      "repeat notes reuse their piano sample",
    );
    sound.setVolume(0);
    sound.setVolume(0.45);
    sound.setVolume(NaN);
    await sound.disable();
    const mutedNotes = notes;
    sound.play("failure");
    assert.equal(notes, mutedNotes, "muted actions cannot emit notes");
    await sound.enable();
    assert.equal(devices, 1, "enabling again must reuse the existing device");
    await sound.close();
    await sound.close();
    sound.play("step");
    assert.equal(closes, 1);
    assert.equal(stops, notes, "closing stops every remaining piano source");
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("unsupported browsers get an explicit audio error", async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    value: {},
    configurable: true,
  });
  try {
    await assert.rejects(new Soundscape().enable(), /does not support/);
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
