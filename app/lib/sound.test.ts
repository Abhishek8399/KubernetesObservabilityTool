import test from "node:test";
import assert from "node:assert/strict";
import { Soundscape } from "./sound.ts";

test("sound requires opt-in, respects mute, reuses its device, and closes cleanly", async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  let devices = 0,
    notes = 0,
    closes = 0,
    ambientStarts = 0;
  class Device {
    state = "suspended";
    currentTime = 0;
    destination = {};
    constructor() {
      devices++;
    }
    async resume() {
      this.state = "running";
    }
    async suspend() {
      this.state = "suspended";
    }
    async close() {
      this.state = "closed";
      closes++;
    }
    createOscillator() {
      return {
        type: "sine",
        frequency: { value: 0 },
        connect() {},
        disconnect() {},
        start(time?: number) {
          if (time === undefined) ambientStarts++;
          notes++;
        },
        stop() {},
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
    createDelay() {
      return { delayTime: { value: 0 }, connect() {}, disconnect() {} };
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
    await sound.enable();
    assert.equal(devices, 1);
    assert.ok(notes > 0);
    assert.equal(
      ambientStarts,
      3,
      "continuous ambience has three quiet voices",
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
    assert.equal(
      ambientStarts,
      3,
      "resuming cannot stack duplicate background soundtracks",
    );
    await sound.close();
    await sound.close();
    sound.play("step");
    assert.equal(closes, 1);
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
