// Músicas originais da corrida, tocadas na hora por um sequenciador simples
// (colcheias, compasso de 4/4). Notação: cada palavra é uma colcheia — nota
// ("C5", "F#4"), "-" segura a anterior e "." é pausa. "|" é só para ler.

import { store } from '../storage.ts';
import { audio, noiseBurst, onAudioReady, tone } from './core.ts';

type Inst = 'flute' | 'bell' | 'marimba' | 'pluck' | 'bass';
export type SongId = 'race' | 'pit';

interface Voice {
  inst: Inst;
  notes: string;
  vol?: number;
}

interface Song {
  bpm: number;
  voices: Voice[];
  /** Acordes, um por compasso (tríade suave). */
  chords?: string[];
  /** Percussão por compasso: k (bumbo), s (chocalho), h (tique). */
  perc?: string;
}

const SONGS: Record<SongId, Song> = {
  race: {
    bpm: 138,
    voices: [
      {
        inst: 'marimba',
        notes:
          'G4 C5 . E5 G5 - E5 C5 | D5 - F5 - A5 - G5 . | E5 G5 . C6 B5 - G5 E5 | D5 - - - . . G4 . | A4 C5 . F5 A5 - F5 C5 | B4 - D5 - G5 - F5 D5 | C5 E5 G5 C6 D6 - B5 G5 | C6 - - - . . . .',
      },
      {
        inst: 'flute',
        notes:
          'E5 - - - - - - - | F5 - - - - - - - | G5 - - - - - - - | B4 - - - - - - - | C5 - - - - - - - | D5 - - - - - - - | E5 - - - F5 - - - | E5 - - - - - . .',
        vol: 0.35,
      },
      {
        inst: 'pluck',
        notes:
          'C3 . C3 . G2 . G2 . | D3 . D3 . A2 . A2 . | C3 . C3 . E3 . E3 . | G2 . G2 . B2 . D3 . | F2 . F2 . C3 . C3 . | G2 . G2 . D3 . D3 . | C3 . E3 . G3 . E3 . | C3 . G2 . C3 . . .',
      },
    ],
    chords: ['C', 'Dm', 'C', 'G', 'F', 'G', 'C', 'C'],
    perc: 'k h s h k k s h',
  },
  pit: {
    bpm: 108,
    voices: [
      {
        inst: 'bell',
        notes:
          'E5 . G5 . A5 . G5 . | E5 . D5 . C5 - - . | D5 . E5 . G5 . E5 . | D5 - - - . . . . | E5 . G5 . A5 . C6 . | B5 . A5 . G5 - - . | A5 . G5 . E5 . D5 . | C5 - - - . . . .',
      },
      {
        inst: 'pluck',
        notes:
          'C3 . . . G3 . . . | A2 . . . E3 . . . | C3 . . . G3 . . . | G2 . . . D3 . . . | F2 . . . C3 . . . | G2 . . . D3 . . . | D3 . . . A2 . . . | C3 . G2 . C3 . . .',
      },
    ],
    chords: ['C', 'Am', 'C', 'G', 'F', 'G', 'Dm', 'C'],
    perc: 'k . s . k . s .',
  },
};

const NOTE = /^([A-G])(#|b)?(\d)$/;
const SEMI: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function freq(name: string): number {
  const m = NOTE.exec(name);
  if (!m) return 0;
  const semi = SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const midi = 12 * (Number(m[3]) + 1) + semi;
  return 440 * 2 ** ((midi - 69) / 12);
}

const CHORDS: Record<string, string[]> = {
  C: ['C4', 'E4', 'G4'],
  Dm: ['D4', 'F4', 'A4'],
  Em: ['E4', 'G4', 'B4'],
  F: ['F4', 'A4', 'C5'],
  G: ['G4', 'B4', 'D5'],
  Am: ['A4', 'C5', 'E5'],
  Bb: ['A#3', 'D4', 'F4'],
  E: ['E4', 'G#4', 'B4'],
  D: ['D4', 'F#4', 'A4'],
  B: ['B3', 'D#4', 'F#4'],
};

interface Parsed {
  /** Por colcheia: notas que começam (frequência, duração em colcheias, instrumento, volume). */
  steps: { f: number; len: number; inst: Inst; vol: number }[][];
  chords: number[][];
  perc: string[];
  bpm: number;
}

function parse(song: Song): Parsed {
  let total = 0;
  const steps: Parsed['steps'] = [];
  for (const v of song.voices) {
    const toks = v.notes.split(/\s+/).filter((t) => t && t !== '|');
    total = Math.max(total, toks.length);
    for (let i = 0; i < toks.length; i++) {
      const f = freq(toks[i]);
      if (!f) continue;
      let len = 1;
      while (toks[i + len] === '-') len++;
      (steps[i] ??= []).push({ f, len, inst: v.inst, vol: v.vol ?? 1 });
    }
  }
  for (let i = 0; i < total; i++) steps[i] ??= [];
  return {
    steps,
    chords: (song.chords ?? []).map((c) => CHORDS[c].map(freq)),
    perc: song.perc ? song.perc.split(/\s+/) : [],
    bpm: song.bpm,
  };
}

function play(inst: Inst, f: number, t: number, dur: number, vol: number): void {
  const v = vol;
  switch (inst) {
    case 'flute':
      tone('sine', f, t, dur + 0.08, 0.22 * v, undefined, 'music', true);
      tone('triangle', f * 2, t, dur * 0.5, 0.025 * v, undefined, 'music', true);
      break;
    case 'bell':
      tone('sine', f, t, dur + 0.7, 0.2 * v, undefined, 'music', true);
      tone('sine', f * 2, t, 0.5, 0.06 * v, undefined, 'music', true);
      tone('sine', f * 3.01, t, 0.25, 0.025 * v, undefined, 'music', true);
      break;
    case 'marimba':
      tone('triangle', f, t, 0.45, 0.26 * v, undefined, 'music', true);
      tone('sine', f * 4, t, 0.06, 0.05 * v, undefined, 'music', true);
      break;
    case 'pluck':
      tone('triangle', f, t, 0.28, 0.28 * v, undefined, 'music', true);
      break;
    case 'bass':
      tone('triangle', f, t, dur * 0.95, 0.26 * v, undefined, 'music', true);
      break;
  }
}

class Player {
  private song: Parsed | null = null;
  private id: SongId | null = null;
  private step = 0;
  private next = 0;
  private timer: number | null = null;

  constructor() {
    onAudioReady(() => this.restart());
  }

  setSong(id: SongId): void {
    if (this.id === id) return;
    this.id = id;
    this.song = parse(SONGS[id]);
    this.restart();
  }

  restart(): void {
    const o = audio();
    this.step = 0;
    this.next = o ? o.ac.currentTime + 0.15 : 0;
    if (this.timer === null) this.timer = window.setInterval(() => this.tick(), 40);
  }

  stop(): void {
    this.id = null;
    this.song = null;
  }

  private tick(): void {
    const o = audio();
    const s = this.song;
    if (!o || !s || !store.music || !store.sound) {
      if (o) this.next = o.ac.currentTime + 0.1;
      return;
    }
    const stepDur = 60 / s.bpm / 2;
    if (this.next < o.ac.currentTime - 0.3) this.next = o.ac.currentTime + 0.05;
    while (this.next < o.ac.currentTime + 0.2) {
      const t = this.next;
      const i = this.step % s.steps.length;
      for (const n of s.steps[i]) play(n.inst, n.f, t, n.len * stepDur, n.vol);
      if (i % 8 === 0 && s.chords.length) {
        const ch = s.chords[(i / 8) % s.chords.length];
        for (const f of ch) tone('triangle', f, t, stepDur * 8, 0.035, undefined, 'music', true);
      }
      const p = s.perc[i % 8];
      if (p === 'k') tone('sine', 120, t, 0.16, 0.3, 50, 'music', true);
      else if (p === 's') noiseBurst(t, 0.06, 0.06, 'highpass', 6000, 6000, 'music', true);
      else if (p === 'h') noiseBurst(t, 0.03, 0.05, 'bandpass', 8000, 8000, 'music', true);
      this.step++;
      this.next += stepDur;
    }
  }
}

export const music = new Player();
