/**
 * Áudio sintetizado (Web Audio API) — sem arquivos externos.
 * SFX retrô + trilha chiptune/synthwave em loop.
 */
const MUTE_KEY = "jumpcoins:muted";
export const AUDIO_EVENT = "jumpcoins:audio-change";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let musicTimer: ReturnType<typeof setInterval> | null = null;
let step = 0;

const isBrowser = () => typeof window !== "undefined";

export function isMuted() {
  if (!isBrowser()) return false;
  return window.localStorage.getItem(MUTE_KEY) === "1";
}

function ensureCtx(): AudioContext | null {
  if (!isBrowser()) return null;
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.35;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function initAudio() {
  muted = isMuted();
  ensureCtx();
  if (master) master.gain.value = muted ? 0 : 0.35;
}

export function toggleMute(): boolean {
  muted = !muted;
  if (isBrowser()) window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  ensureCtx();
  if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : 0.35, ctx.currentTime, 0.02);
  if (isBrowser()) window.dispatchEvent(new Event(AUDIO_EVENT));
  return muted;
}

type ToneOpts = {
  type?: OscillatorType;
  from: number;
  to?: number;
  duration: number;
  gain?: number;
  delay?: number;
};

function tone({ type = "square", from, to, duration, gain = 0.25, delay = 0 }: ToneOpts) {
  const c = ensureCtx();
  if (!c || !master) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + duration);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

function noise(duration = 0.25, gain = 0.35) {
  const c = ensureCtx();
  if (!c || !master) return;
  const frames = Math.floor(c.sampleRate * duration);
  const buffer = c.createBuffer(1, frames, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 900;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(filter).connect(g).connect(master);
  src.start();
}

export function sfxJump() {
  tone({ type: "square", from: 420, to: 880, duration: 0.14, gain: 0.2 });
}

export function sfxHit() {
  tone({ type: "sawtooth", from: 220, to: 60, duration: 0.35, gain: 0.3 });
  noise(0.3, 0.25);
}

export function sfxCoin() {
  tone({ type: "square", from: 988, duration: 0.08, gain: 0.18 });
  tone({ type: "square", from: 1319, duration: 0.12, gain: 0.18, delay: 0.08 });
}

export function sfxWin() {
  [523, 659, 784, 1047].forEach((f, i) =>
    tone({ type: "square", from: f, duration: 0.18, gain: 0.2, delay: i * 0.11 }),
  );
}

export function sfxClick() {
  tone({ type: "triangle", from: 600, to: 300, duration: 0.06, gain: 0.15 });
}

/* ── trilha chiptune/synthwave em loop ─────────────────── */

const BASS = [110, 110, 146.83, 110, 130.81, 130.81, 98, 98];
const LEAD = [440, 523.25, 659.25, 523.25, 587.33, 659.25, 783.99, 659.25];

export function startMusic() {
  if (musicTimer || !isBrowser()) return;
  ensureCtx();
  step = 0;
  musicTimer = setInterval(() => {
    const i = step % 8;
    tone({ type: "triangle", from: BASS[i] ?? 110, duration: 0.22, gain: 0.16 });
    if (step % 2 === 0) tone({ type: "square", from: LEAD[i] ?? 440, duration: 0.16, gain: 0.07 });
    if (step % 4 === 2) noise(0.06, 0.06);
    step++;
  }, 250);
}

export function stopMusic() {
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
}
