// A corrida, sem desenho: o carro anda sozinho numa pista de 3 faixas e, a
// cada rodada, aparecem 3 portões com letras. Passar pelo portão da letra
// certa guarda a letra no painel; pelo errado, o carro balança e os portões
// voltam logo à frente. No meio da palavra tem o Pit Stop; no fim, a chegada.
//
// Distâncias em metros "de brinquedo"; o carro está sempre em `dist`.

import { distractors, rng, type Word } from './words.ts';

export const LANE_W = 2.6;
export const SPEED = 13;
export const TURBO_SPEED = 22;
/** Onde aparecem os portões de uma rodada nova (à frente do carro). */
export const GATE_AHEAD = 95;
/** Onde aparecem os portões depois de um erro. */
export const RETRY_AHEAD = 72;
/** O ímã do turbo puxa a letra quando os portões estão a esta distância. */
export const MAGNET_RANGE = 40;
/** Estrelas para encher o turbo. */
export const TURBO_STARS = 3;
export const TURBO_TIME = 1.6;
/** Tempo de festa na chegada (frear + cavalo de pau) antes do troféu. */
export const FINISH_TIME = 4.5;

export type Phase = 'ready' | 'drive' | 'pit' | 'finish' | 'done';

export interface Gate {
  id: number;
  z: number;
  /** Letra de cada faixa (esquerda, meio, direita). */
  letters: string[];
  /** Faixa da letra certa (na 3ª tentativa, todas são certas). */
  correct: number;
  attempt: number;
  /** Depois do primeiro erro, a letra certa brilha. */
  hint: boolean;
  state: 'open' | 'hit' | 'miss' | 'magnet';
  /** Faixa por onde o carro passou. */
  lane: number;
}

export interface Star {
  id: number;
  z: number;
  lane: number;
  taken: boolean;
}

export interface Zone {
  id: number;
  kind: 'mud' | 'pit' | 'finish';
  z: number;
  len: number;
  done: boolean;
}

export type RaceEvent =
  | { t: 'gate'; gate: Gate; letter: string }
  | { t: 'collect'; gate: Gate; letter: string; index: number; magnet: boolean }
  | { t: 'miss'; gate: Gate; wrong: string; want: string }
  | { t: 'star'; star: Star; charge: number }
  | { t: 'turbo' }
  | { t: 'turboEmpty' }
  | { t: 'lane'; lane: number; dir: -1 | 1 }
  | { t: 'edge'; dir: -1 | 1 }
  | { t: 'mud' }
  | { t: 'pit' }
  | { t: 'finish' }
  | { t: 'done' };

export function laneX(lane: number): number {
  return (lane - 1) * LANE_W;
}

export class Race {
  readonly word: Word;
  readonly pitAfter: number;
  phase: Phase = 'ready';
  dist = 0;
  speed = 0;
  /** Faixa de destino (0, 1, 2) e posição de lado de verdade (anda até a faixa). */
  lane = 1;
  x = 0;
  /** Letras já guardadas. */
  got = 0;
  /** Estrelas no turbo (começa cheio para ele descobrir o botão). */
  charge = TURBO_STARS;
  turboT = 0;
  /** O próximo portão vem direto para o carro. */
  magnet = false;
  muddy = false;
  wobbleT = 0;
  finishT = 0;
  time = 0;
  misses = 0;
  readonly gates: Gate[] = [];
  readonly stars: Star[] = [];
  readonly zones: Zone[] = [];
  readonly events: RaceEvent[] = [];
  private readonly rand: () => number;
  private nextId = 1;
  /** Segundos até a próxima rodada (null = nenhuma marcada). */
  private roundIn: number | null = null;
  private attempt = 0;
  private pair: [string, string] | null = null;
  private pitDone = false;

  constructor(word: Word, seed = Date.now()) {
    this.word = word;
    this.rand = rng(seed);
    this.pitAfter = Math.ceil(word.letters.length / 2);
  }

  /** Larga (depois da contagem). */
  go(): void {
    if (this.phase !== 'ready') return;
    this.phase = 'drive';
    this.roundIn = 0.4;
  }

  get target(): string | null {
    return this.word.letters[this.got] ?? null;
  }

  /** Gesto para o lado: muda uma faixa. */
  steer(dir: -1 | 1): void {
    if (this.phase !== 'drive') return;
    const next = this.lane + dir;
    if (next < 0 || next > 2) {
      this.events.push({ t: 'edge', dir });
      return;
    }
    this.lane = next;
    this.events.push({ t: 'lane', lane: next, dir });
  }

  /** Botão do turbo: acelera e o ímã puxa a próxima letra certa. */
  turbo(): void {
    if (this.phase !== 'drive') return;
    if (this.charge < TURBO_STARS) {
      this.events.push({ t: 'turboEmpty' });
      return;
    }
    this.charge = 0;
    this.turboT = TURBO_TIME;
    this.magnet = true;
    this.events.push({ t: 'turbo' });
  }

  /** Voltou do Pit Stop: carro limpo e segue a corrida. */
  leavePit(): void {
    if (this.phase !== 'pit') return;
    this.phase = 'drive';
    this.muddy = false;
    this.roundIn = 0.8;
  }

  step(dt: number): void {
    this.time += dt;
    if (this.phase === 'ready' || this.phase === 'pit' || this.phase === 'done') return;
    if (this.phase === 'finish') {
      this.finishT += dt;
      this.speed = Math.max(0, this.speed - SPEED * 1.1 * dt);
      this.dist += this.speed * dt;
      if (this.finishT >= FINISH_TIME) {
        this.phase = 'done';
        this.events.push({ t: 'done' });
      }
      return;
    }

    const want = this.turboT > 0 ? TURBO_SPEED : SPEED;
    this.speed += (want - this.speed) * Math.min(1, dt * (this.turboT > 0 ? 6 : 2));
    this.turboT = Math.max(0, this.turboT - dt);
    this.wobbleT = Math.max(0, this.wobbleT - dt);
    const before = this.dist;
    this.dist += this.speed * dt;
    this.x += (laneX(this.lane) - this.x) * Math.min(1, dt * 10);

    if (this.roundIn !== null) {
      this.roundIn -= dt;
      if (this.roundIn <= 0) {
        this.roundIn = null;
        this.spawnRound();
      }
    }

    const lane = this.laneNow();
    for (const s of this.stars) {
      if (s.taken || s.z <= before || s.z > this.dist || s.lane !== lane) continue;
      s.taken = true;
      this.charge = Math.min(TURBO_STARS, this.charge + 1);
      this.events.push({ t: 'star', star: s, charge: this.charge });
    }
    for (const g of this.gates) {
      if (g.state !== 'open') continue;
      if (this.magnet && g.z - this.dist <= MAGNET_RANGE) {
        this.magnet = false;
        g.state = 'magnet';
        g.lane = g.correct;
        this.collect(g, true);
      } else if (g.z > before && g.z <= this.dist) {
        g.lane = lane;
        if (g.letters[lane] === this.target) {
          g.state = 'hit';
          this.collect(g, false);
        } else {
          g.state = 'miss';
          this.miss(g);
        }
      }
    }
    for (const z of this.zones) {
      if (z.done || z.z > this.dist) continue;
      z.done = true;
      if (z.kind === 'mud') {
        this.muddy = true;
        this.events.push({ t: 'mud' });
      } else if (z.kind === 'pit') {
        this.phase = 'pit';
        this.pitDone = true;
        this.speed = 0;
        this.turboT = 0;
        this.events.push({ t: 'pit' });
      } else {
        this.phase = 'finish';
        this.turboT = 0;
        this.events.push({ t: 'finish' });
      }
    }
    this.prune();
  }

  /** Faixa mais perto de onde o carro está agora. */
  laneNow(): number {
    return Math.max(0, Math.min(2, Math.round(this.x / LANE_W) + 1));
  }

  private spawnRound(): void {
    const letter = this.target;
    if (!letter) return;
    const a = this.attempt;
    if (a === 0) this.pair = distractors(letter, this.word, this.rand);
    const [d1, d2] = this.pair!;
    // Na 1ª e na 2ª tentativa a letra certa nunca está na faixa do carro: tem que trocar.
    const others = [0, 1, 2].filter((l) => l !== this.lane);
    const correct = others[Math.floor(this.rand() * others.length)];
    const rest = this.rand() < 0.5 ? [d1, d2] : [d2, d1];
    const letters = [0, 1, 2].map((l) => (a >= 2 || l === correct ? letter : rest.shift()!));
    const gate: Gate = {
      id: this.nextId++,
      z: this.dist + (a === 0 ? GATE_AHEAD : RETRY_AHEAD),
      letters,
      correct,
      attempt: a,
      hint: a >= 1,
      state: 'open',
      lane: -1,
    };
    this.gates.push(gate);
    if (a === 0) {
      // Uma fileira de estrelas numa faixa que não é a do carro.
      const lane = others[Math.floor(this.rand() * others.length)];
      for (let i = 0; i < TURBO_STARS; i++) {
        this.stars.push({ id: this.nextId++, z: this.dist + 28 + i * 6, lane, taken: false });
      }
    }
    this.events.push({ t: 'gate', gate, letter });
  }

  private collect(g: Gate, magnet: boolean): void {
    const letter = this.target!;
    const index = this.got;
    this.got++;
    this.attempt = 0;
    this.events.push({ t: 'collect', gate: g, letter, index, magnet });
    if (this.got >= this.word.letters.length) {
      this.zones.push({ id: this.nextId++, kind: 'finish', z: g.z + 30, len: 4, done: false });
    } else if (this.got === this.pitAfter && !this.pitDone) {
      this.zones.push({ id: this.nextId++, kind: 'mud', z: g.z + 26, len: 12, done: false });
      this.zones.push({ id: this.nextId++, kind: 'pit', z: g.z + 70, len: 10, done: false });
    } else {
      this.roundIn = 1.1;
    }
  }

  private miss(g: Gate): void {
    this.misses++;
    this.attempt++;
    this.wobbleT = 0.9;
    this.events.push({ t: 'miss', gate: g, wrong: g.letters[g.lane], want: this.target! });
    this.roundIn = 0.5;
  }

  /** Tira o que já ficou bem para trás. */
  private prune(): void {
    const behind = this.dist - 30;
    for (const list of [this.gates, this.stars, this.zones] as { z: number }[][]) {
      for (let i = list.length - 1; i >= 0; i--) if (list[i].z < behind) list.splice(i, 1);
    }
  }
}
