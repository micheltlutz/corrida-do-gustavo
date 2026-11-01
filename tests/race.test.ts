import { describe, expect, it } from 'vitest';
import { GATE_AHEAD, Race, type RaceEvent } from '../src/game/race.ts';
import { distractors, letterName, letterRef, rng, similar, WORDS } from '../src/game/words.ts';

const DT = 1 / 60;

interface Driver {
  /** O que fazer quando aparecem portões. */
  onGate?(race: Race, ev: Extract<RaceEvent, { t: 'gate' }>): void;
  /** A cada passo (antes da física). */
  tick?(race: Race): void;
}

/** Corre até o fim (o Pit Stop termina na hora). Devolve todos os eventos. */
function run(race: Race, driver: Driver, maxSeconds = 600): RaceEvent[] {
  const all: RaceEvent[] = [];
  race.go();
  for (let i = 0; i < maxSeconds / DT && race.phase !== 'done'; i++) {
    driver.tick?.(race);
    race.step(DT);
    for (const ev of race.events.splice(0)) {
      all.push(ev);
      if (ev.t === 'gate') driver.onGate?.(race, ev);
      if (ev.t === 'pit') race.leavePit();
    }
  }
  return all;
}

/** Vai trocando de faixa até a da letra certa. */
const perfect: Driver = {
  tick(race) {
    const g = race.gates.find((x) => x.state === 'open');
    if (!g || race.lane === g.correct) return;
    race.steer(g.correct > race.lane ? 1 : -1);
  },
};

describe('corrida', () => {
  for (const word of WORDS) {
    it(`piloto perfeito monta ${word.text} sem erro, com Pit Stop no meio`, () => {
      const race = new Race(word, 7);
      const events = run(race, perfect);
      const letters = events.filter((e) => e.t === 'collect').map((e) => (e as { letter: string }).letter);
      expect(letters.join('')).toBe(word.letters.join(''));
      expect(race.misses).toBe(0);
      expect(race.phase).toBe('done');
      // O Pit Stop vem depois da metade (arredondada para cima) e antes da próxima letra.
      const kinds = events.filter((e) => e.t === 'collect' || e.t === 'pit' || e.t === 'mud').map((e) => e.t);
      const pitAt = kinds.indexOf('pit');
      expect(kinds.slice(0, pitAt).filter((k) => k === 'collect')).toHaveLength(race.pitAfter);
      expect(kinds[pitAt - 1]).toBe('mud');
      expect(events.filter((e) => e.t === 'pit')).toHaveLength(1);
    });
  }

  it('GUSTAVO tem o Pit Stop depois do T (GUST + AVO)', () => {
    expect(new Race(WORDS[0]).pitAfter).toBe(4);
  });

  it('quem nunca troca de faixa também chega (a 3ª tentativa tem a letra em todas as faixas)', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const race = new Race(WORDS[0], seed);
      const events = run(race, {});
      expect(race.phase).toBe('done');
      expect(race.misses).toBe(2 * WORDS[0].letters.length);
      for (const e of events) {
        if (e.t !== 'gate') continue;
        if (e.gate.attempt === 0) expect(e.gate.hint).toBe(false);
        if (e.gate.attempt >= 1) expect(e.gate.hint).toBe(true);
        if (e.gate.attempt >= 2) expect(e.gate.letters).toEqual([e.letter, e.letter, e.letter]);
      }
    }
  });

  it('a letra certa nunca começa na faixa onde o carro já está', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const race = new Race(WORDS[0], seed);
      run(race, {
        onGate(r, ev) {
          if (ev.gate.attempt < 2) expect(ev.gate.correct).not.toBe(r.lane);
          expect(ev.gate.letters[ev.gate.correct]).toBe(ev.letter);
        },
        tick(r) {
          // Às vezes troca de faixa à toa.
          if (r.time % 3 < 1 / 60) r.steer(r.lane === 0 ? 1 : -1);
        },
      });
      expect(race.phase).toBe('done');
    }
  });

  it('errar mostra qual letra era e qual faltava, e os portões voltam mais perto', () => {
    const race = new Race(WORDS[0], 3);
    race.go();
    let miss: Extract<RaceEvent, { t: 'miss' }> | undefined;
    for (let i = 0; i < 3000 && !miss; i++) {
      race.step(DT);
      for (const ev of race.events.splice(0)) if (ev.t === 'miss') miss = ev;
    }
    expect(miss).toBeDefined();
    expect(miss!.want).toBe('G');
    expect(miss!.wrong).not.toBe('G');
    expect(race.wobbleT).toBeGreaterThan(0);
    // Depois do erro, a nova fileira aparece antes de GATE_AHEAD.
    for (let i = 0; i < 60; i++) race.step(DT);
    const next = race.gates.find((g) => g.state === 'open')!;
    expect(next.attempt).toBe(1);
    expect(next.z - race.dist).toBeLessThan(GATE_AHEAD);
  });

  it('o turbo começa cheio, puxa a letra certa e depois precisa de 3 estrelas', () => {
    const race = new Race(WORDS[1], 11);
    race.go();
    race.turbo();
    const events: RaceEvent[] = [];
    for (let i = 0; i < 900; i++) {
      race.step(DT);
      events.push(...race.events.splice(0));
    }
    const c = events.find((e) => e.t === 'collect') as Extract<RaceEvent, { t: 'collect' }>;
    expect(events[0].t).toBe('turbo');
    expect(c.magnet).toBe(true);
    expect(c.letter).toBe('M');
    expect(race.charge).toBe(0);
    race.turbo();
    expect(race.events.at(-1)?.t).toBe('turboEmpty');
  });

  it('pegar as estrelas enche o turbo', () => {
    const race = new Race(WORDS[2], 5);
    race.turbo(); // ainda não largou: não gasta
    expect(race.charge).toBe(3);
    race.go();
    race.turbo();
    let charged = false;
    for (let i = 0; i < 4000 && !charged; i++) {
      const s = race.stars.find((x) => !x.taken);
      if (s && race.lane !== s.lane) race.steer(s.lane > race.lane ? 1 : -1);
      race.step(DT);
      race.events.splice(0);
      if (race.phase === 'pit') race.leavePit();
      charged = race.charge === 3;
    }
    expect(charged).toBe(true);
  });

  it('não sai da pista pelos lados', () => {
    const race = new Race(WORDS[0], 1);
    race.go();
    race.steer(-1);
    race.steer(-1);
    expect(race.lane).toBe(0);
    expect(race.events.map((e) => e.t)).toEqual(['lane', 'edge']);
  });

  it('o Pit Stop para o carro até voltar, e volta limpo', () => {
    const race = new Race(WORDS[2], 9);
    race.go();
    let t = 0;
    while (race.phase !== 'pit' && t++ < 60 * 300) {
      perfect.tick!(race);
      race.step(DT);
      race.events.splice(0);
    }
    expect(race.phase).toBe('pit');
    expect(race.muddy).toBe(true);
    const d = race.dist;
    for (let i = 0; i < 120; i++) race.step(DT);
    expect(race.dist).toBe(d);
    race.leavePit();
    expect(race.muddy).toBe(false);
    expect(race.phase).toBe('drive');
  });
});

describe('letras de distração', () => {
  it('nunca parecidas com a certa, nem entre si, nem da própria palavra', () => {
    const rand = rng(42);
    for (const word of WORDS) {
      for (const l of word.letters) {
        for (let i = 0; i < 200; i++) {
          const [a, b] = distractors(l, word, rand);
          expect(similar(a, l)).toBe(false);
          expect(similar(b, l)).toBe(false);
          expect(similar(a, b)).toBe(false);
          expect(word.letters).not.toContain(a);
          expect(word.letters).not.toContain(b);
        }
      }
    }
  });

  it('MAMÃE tem o Ã como uma letra só', () => {
    expect(WORDS[1].letters).toEqual(['M', 'A', 'M', 'Ã', 'E']);
  });
});

describe('voz', () => {
  it('toda letra das palavras e das distrações tem nome para a voz', () => {
    for (const l of [...'ABCDEFGHIJLMNOPRSTUVXZ', ...WORDS.flatMap((w) => w.letters)]) {
      expect(letterName(l)).not.toBe(l);
    }
    expect(letterRef('G')).toBe('a letra gê');
    expect(letterRef('Ã')).toBe('o á com til');
  });

  it('a voz fala as palavras em minúsculas (em maiúsculas ela soletraria)', () => {
    for (const w of WORDS) expect(w.spoken).toBe(w.spoken.toLowerCase().replace(/^g/, 'G'));
    expect(WORDS[0].intro).toBe('Vamos montar o nome Gustavo!');
  });
});
