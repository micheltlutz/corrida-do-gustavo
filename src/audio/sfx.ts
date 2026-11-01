// Efeitos sonoros sintetizados (sem arquivos de áudio) e o ronco do motor.

import { store } from '../storage.ts';
import { audio, noiseBurst, tone } from './core.ts';

function chime(notes: number[], gap: number, dur: number, peak: number, type: OscillatorType = 'triangle'): void {
  notes.forEach((f, i) => tone(type, f, i * gap, dur, peak));
}

export const sfx = {
  pop(): void {
    tone('sine', 500, 0, 0.1, 0.35, 900);
  },
  /** Trocou de faixa: "fiu". */
  lane(dir: -1 | 1): void {
    noiseBurst(0, 0.22, 0.12, 'bandpass', dir < 0 ? 1600 : 900, dir < 0 ? 700 : 2000);
    tone('sine', 300, 0, 0.16, 0.06, 420);
  },
  /** Tentou sair da pista: "tum" de leve. */
  edge(): void {
    tone('sine', 160, 0, 0.18, 0.2, 90);
  },
  star(charge: number): void {
    const base = [1046.5, 1318.51, 1567.98][Math.max(0, charge - 1)] ?? 1046.5;
    tone('triangle', base, 0, 0.12, 0.16);
    tone('triangle', base * 1.5, 0.07, 0.2, 0.14);
  },
  /** Turbo cheio, pronto para usar. */
  turboReady(): void {
    chime([783.99, 1046.5, 1318.51, 1567.98], 0.05, 0.16, 0.1, 'square');
  },
  turbo(): void {
    tone('sawtooth', 90, 0, 1.2, 0.12, 260);
    tone('sawtooth', 135, 0, 1.2, 0.06, 390);
    noiseBurst(0, 1, 0.16, 'bandpass', 500, 3500);
    chime([1318.51, 1567.98, 2093], 0.08, 0.2, 0.06, 'sine');
  },
  turboEmpty(): void {
    noiseBurst(0, 0.25, 0.1, 'lowpass', 600, 200);
  },
  /** Ímã puxando a letra. */
  magnet(): void {
    for (let i = 0; i < 6; i++) tone('sine', 700 + i * 180, i * 0.05, 0.1, 0.07);
  },
  /** Pegou a letra certa. */
  letter(): void {
    chime([783.99, 987.77, 1174.66, 1567.98], 0.07, 0.24, 0.2);
    tone('sine', 2093, 0.3, 0.35, 0.06);
  },
  /** Letra errada: "bóin-óin-óin". */
  miss(): void {
    const o = audio();
    if (!o || !store.sound) return;
    const t = o.ac.currentTime;
    const osc = o.ac.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(330, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.7);
    const lfo = o.ac.createOscillator();
    lfo.frequency.value = 9;
    const lfoGain = o.ac.createGain();
    lfoGain.gain.value = 40;
    lfo.connect(lfoGain).connect(osc.frequency);
    const g = o.ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);
    osc.connect(g).connect(o.sfx);
    osc.start(t);
    lfo.start(t);
    osc.stop(t + 0.8);
    lfo.stop(t + 0.8);
  },
  /** Bateu num obstáculo: "tum-bóin". */
  bump(): void {
    tone('sine', 190, 0, 0.22, 0.3, 70);
    noiseBurst(0, 0.18, 0.2, 'lowpass', 900, 200);
    tone('triangle', 520, 0.08, 0.35, 0.12, 260);
  },
  /** O turbo derrubou o obstáculo: "pá!" e brilho. */
  smash(): void {
    noiseBurst(0, 0.3, 0.3, 'bandpass', 2400, 600);
    tone('square', 160, 0, 0.12, 0.1, 80);
    chime([1318.51, 1760, 2093], 0.05, 0.18, 0.07, 'sine');
  },
  /** Obstáculo aparecendo na pista: "plop". */
  plop(): void {
    tone('sine', 300, 0, 0.12, 0.08, 620);
  },
  mud(): void {
    noiseBurst(0, 0.3, 0.3, 'lowpass', 700, 150);
    noiseBurst(0.18, 0.3, 0.25, 'lowpass', 600, 120);
    tone('sine', 120, 0.05, 0.25, 0.15, 60);
  },
  /** Contagem: "pi, pi, pi, PIIII". */
  beep(go: boolean): void {
    tone('square', go ? 1046.5 : 523.25, 0, go ? 0.5 : 0.18, 0.1);
  },
  /** Buzina de festa: "fom-fom". */
  horn(at = 0): void {
    for (const k of [0, 0.22]) {
      tone('square', 392, at + k, 0.16, 0.08);
      tone('square', 494, at + k, 0.16, 0.06);
    }
  },
  /** Torcida: "êêêê". */
  crowd(): void {
    for (let i = 0; i < 6; i++) noiseBurst(i * 0.25, 0.6, 0.06, 'bandpass', 900 + (i % 3) * 300, 1300);
  },
  /** Pneus cantando no cavalo de pau. */
  screech(): void {
    for (let i = 0; i < 5; i++) noiseBurst(i * 0.3, 0.5, 0.08, 'bandpass', 2600, 2200);
    tone('sawtooth', 1900, 0, 1.6, 0.012, 1500);
  },
  win(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => tone('triangle', f, i * 0.11, 0.22, 0.3));
    for (const f of [523.25, 659.25, 783.99]) tone('triangle', f, 0.5, 0.9, 0.22);
    [1568, 2093, 1760, 2637].forEach((f, i) => tone('sine', f, 0.55 + i * 0.09, 0.12, 0.08));
  },
  /** Painel: cada letra soletrada. */
  spell(i: number): void {
    tone('triangle', [523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77][i % 7], 0, 0.3, 0.16);
  },
  // ---------- Pit Stop ----------
  /** Roda velha saindo. */
  wheelOff(): void {
    tone('square', 220, 0, 0.06, 0.08, 120);
    for (let i = 0; i < 8; i++) noiseBurst(i * 0.03, 0.025, 0.12, 'highpass', 3000);
    tone('sine', 300, 0.25, 0.2, 0.15, 120);
  },
  /** Roda nova apertada (parafusadeira). */
  wheelOn(): void {
    for (let i = 0; i < 12; i++) {
      tone('square', 180, i * 0.035, 0.03, 0.07, 140);
      noiseBurst(i * 0.035, 0.02, 0.06, 'highpass', 2500);
    }
    chime([1318.51, 1760], 0.08, 0.2, 0.1);
  },
  /** Esponja esfregando. */
  scrub(): void {
    noiseBurst(0, 0.09, 0.06, 'bandpass', 1800 + Math.random() * 800, 1200);
  },
  bubble(): void {
    const f = 700 + Math.random() * 900;
    tone('sine', f, 0, 0.08, 0.06, f * 1.8);
  },
  sparkle(): void {
    chime([1567.98, 2093, 2637.02, 3135.96], 0.06, 0.25, 0.07, 'sine');
  },
  sticker(): void {
    noiseBurst(0, 0.08, 0.2, 'lowpass', 1200, 400);
    tone('sine', 600, 0.02, 0.15, 0.15, 1200);
  },
};

/** O ronco do motor: sobe com a velocidade. Fica bem baixinho. */
class Engine {
  private osc: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private ac: AudioContext | null = null;

  set(speed: number, turbo: boolean, on: boolean): void {
    const o = audio();
    const want = on && !!o && store.sound;
    if (!want) {
      this.stop();
      return;
    }
    if (!this.osc || this.ac !== o!.ac) this.start(o!.ac, o!.sfx);
    const t = this.ac!.currentTime;
    const f = 48 + speed * 3.2 + (turbo ? 25 : 0);
    this.osc!.frequency.setTargetAtTime(f, t, 0.15);
    this.osc2!.frequency.setTargetAtTime(f * 1.5, t, 0.15);
    this.gain!.gain.setTargetAtTime(speed > 0.5 ? (turbo ? 0.05 : 0.032) : 0.012, t, 0.2);
  }

  private start(ac: AudioContext, dest: AudioNode): void {
    this.stop();
    this.ac = ac;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    this.gain = ac.createGain();
    this.gain.gain.value = 0;
    this.osc = ac.createOscillator();
    this.osc.type = 'sawtooth';
    this.osc2 = ac.createOscillator();
    this.osc2.type = 'triangle';
    this.osc.connect(lp);
    this.osc2.connect(lp);
    lp.connect(this.gain).connect(dest);
    this.osc.start();
    this.osc2.start();
  }

  stop(): void {
    if (!this.osc) return;
    const t = this.ac!.currentTime;
    this.gain!.gain.setTargetAtTime(0, t, 0.05);
    const a = this.osc;
    const b = this.osc2!;
    a.stop(t + 0.3);
    b.stop(t + 0.3);
    this.osc = this.osc2 = null;
    this.gain = null;
  }
}

export const engine = new Engine();
