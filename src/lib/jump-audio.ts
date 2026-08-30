/** Chiptune-style synthesized SFX using the Web Audio API (no audio files). */

let ctx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function setMuted(value: boolean) {
  muted = value;
}

export function isMuted() {
  return muted;
}

type ToneOptions = {
  freq: number;
  to?: number;
  duration?: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
};

function tone({ freq, to, duration = 0.12, type = "square", gain = 0.08, delay = 0 }: ToneOptions) {
  const audio = getCtx();
  if (!audio || muted) return;
  const start = audio.currentTime + delay;
  const osc = audio.createOscillator();
  const vol = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(40, to), start + duration);
  vol.gain.setValueAtTime(0.0001, start);
  vol.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  vol.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(vol).connect(audio.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export const sfx = {
  jump: () => tone({ freq: 320, to: 780, duration: 0.16, type: "square", gain: 0.07 }),
  coin: () => {
    tone({ freq: 880, duration: 0.07, type: "square", gain: 0.06 });
    tone({ freq: 1320, duration: 0.1, type: "square", gain: 0.05, delay: 0.06 });
  },
  hit: () => {
    tone({ freq: 220, to: 60, duration: 0.32, type: "sawtooth", gain: 0.09 });
    tone({ freq: 90, to: 45, duration: 0.4, type: "triangle", gain: 0.07 });
  },
  click: () => tone({ freq: 620, duration: 0.05, type: "square", gain: 0.045 }),
  achievement: () => {
    [523, 659, 784, 1047].forEach((f, i) =>
      tone({ freq: f, duration: 0.14, type: "square", gain: 0.06, delay: i * 0.09 }),
    );
  },
  reward: () => {
    [784, 988, 1319].forEach((f, i) =>
      tone({ freq: f, duration: 0.12, type: "triangle", gain: 0.07, delay: i * 0.07 }),
    );
    tone({ freq: 1568, duration: 0.25, type: "square", gain: 0.05, delay: 0.24 });
  },
  gameOver: () => {
    [440, 349, 262].forEach((f, i) =>
      tone({ freq: f, duration: 0.22, type: "sawtooth", gain: 0.06, delay: i * 0.16 }),
    );
  },
};
