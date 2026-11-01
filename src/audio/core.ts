// Áudio com Web Audio (sem arquivos). No iPad, o som só começa depois de um
// toque, e pode parar quando o app vai para o segundo plano: o contexto é
// criado no primeiro toque, liberado a cada toque e recriado se não voltar.

import { store } from '../storage.ts';

let ctx: AudioContext | null = null;
let sfxBus: GainNode | null = null;
let musicBus: GainNode | null = null;
let noise: AudioBuffer | null = null;
const listeners: (() => void)[] = [];

function create(): void {
  ctx = new AudioContext();
  const comp = ctx.createDynamicsCompressor();
  comp.connect(ctx.destination);
  sfxBus = ctx.createGain();
  sfxBus.gain.value = 0.7;
  sfxBus.connect(comp);
  musicBus = ctx.createGain();
  musicBus.gain.value = 0.16;
  musicBus.connect(comp);
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  for (const fn of listeners) fn();
}

function unlock(): void {
  try {
    if (!ctx) create();
    if (ctx && ctx.state !== 'running') {
      void ctx.resume().catch(() => {});
      const src = ctx.createBufferSource();
      src.buffer = ctx.createBuffer(1, 1, 22050);
      src.connect(ctx.destination);
      src.start(0);
    }
  } catch {
    // sem áudio
  }
}

export function initAudio(): void {
  const nav = navigator as Navigator & { audioSession?: { type: string } };
  try {
    if (nav.audioSession) nav.audioSession.type = 'playback';
  } catch {
    // não suportado
  }
  for (const ev of ['pointerdown', 'pointerup', 'touchend', 'keydown']) {
    window.addEventListener(ev, unlock, { capture: true, passive: true });
  }
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.visibilityState !== 'visible') {
      void ctx.suspend().catch(() => {});
      return;
    }
    void ctx.resume().catch(() => {});
    setTimeout(() => {
      if (ctx && ctx.state !== 'running') {
        void ctx.close().catch(() => {});
        ctx = null;
        sfxBus = musicBus = null;
      }
    }, 400);
  });
}

/** Avisa quando o áudio fica pronto (para a música começar). */
export function onAudioReady(fn: () => void): void {
  listeners.push(fn);
}

export function audio(): { ac: AudioContext; sfx: GainNode; music: GainNode; noise: AudioBuffer } | null {
  if (!ctx || !sfxBus || !musicBus || !noise || ctx.state !== 'running') return null;
  return { ac: ctx, sfx: sfxBus, music: musicBus, noise };
}

export function tone(
  type: OscillatorType,
  freq: number,
  at: number,
  dur: number,
  peak: number,
  freqEnd?: number,
  bus: 'sfx' | 'music' = 'sfx',
  absolute = false,
): void {
  const o = audio();
  if (!o) return;
  if (bus === 'sfx' && !store.sound) return;
  const t = absolute ? at : o.ac.currentTime + at;
  const osc = o.ac.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
  const g = o.ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(bus === 'sfx' ? o.sfx : o.music);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

export function noiseBurst(
  at: number,
  dur: number,
  peak: number,
  filter: BiquadFilterType,
  f1: number,
  f2 = f1,
  bus: 'sfx' | 'music' = 'sfx',
  absolute = false,
): void {
  const o = audio();
  if (!o) return;
  if (bus === 'sfx' && !store.sound) return;
  const t = absolute ? at : o.ac.currentTime + at;
  const src = o.ac.createBufferSource();
  src.buffer = o.noise;
  const bq = o.ac.createBiquadFilter();
  bq.type = filter;
  bq.frequency.setValueAtTime(f1, t);
  bq.frequency.exponentialRampToValueAtTime(f2, t + dur);
  const g = o.ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bq).connect(g).connect(bus === 'sfx' ? o.sfx : o.music);
  src.start(t);
  src.stop(t + dur + 0.05);
}

/** Abaixa a música enquanto a voz fala (1 = normal). */
export function setMusicLevel(level: number): void {
  if (!ctx || !musicBus) return;
  musicBus.gain.setTargetAtTime(0.16 * level, ctx.currentTime, 0.08);
}
