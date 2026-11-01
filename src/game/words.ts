// As palavras da pista, como cada letra é falada e as letras de distração.

export interface Word {
  id: string;
  /** Como aparece no painel. */
  text: string;
  letters: string[];
  /** Como a voz fala a palavra (em maiúsculas a voz soletraria). */
  spoken: string;
  intro: string;
  end: string;
}

function word(id: string, text: string, spoken: string, kind: 'nome' | 'palavra', end?: string): Word {
  return {
    id,
    text,
    letters: [...text.normalize('NFC')],
    spoken,
    intro: `Vamos montar ${kind === 'nome' ? 'o nome' : 'a palavra'} ${spoken}!`,
    end: end ?? `Parabéns, campeão! Você montou ${kind === 'nome' ? 'o nome' : 'a palavra'} ${spoken}!`,
  };
}

/** Nomes da família e dos bichinhos (como a voz fala). */
const FAMILY: [string, string][] = [
  ['ERON', 'Eron'],
  ['ROSANE', 'Rosane'],
  ['SANDRA', 'Sandra'],
  ['LARRY', 'Larry'],
  ['ROSINHA', 'Rosinha'],
  ['SUELI', 'Sueli'],
  ['NELSON', 'Nelson'],
  ['KAREN', 'Karen'],
  ['MICHEL', 'Michel'],
  ['SIMBA', 'Simba'],
  // Escrito do jeito que se fala, senão a voz lê "isnóv".
  ['SNOW', 'Snou'],
];

export const WORDS: readonly Word[] = [
  word('gustavo', 'GUSTAVO', 'Gustavo', 'nome', 'Parabéns, campeão Gustavo! Você montou seu nome!'),
  word('mamae', 'MAMÃE', 'mamãe', 'palavra', 'Parabéns, campeão! Você montou mamãe!'),
  word('papai', 'PAPAI', 'papai', 'palavra', 'Parabéns, campeão! Você montou papai!'),
  ...FAMILY.map(([text, spoken]) => word(text.toLowerCase(), text, spoken, 'nome')),
];

/** Nome da letra para a voz (a voz lê melhor "gê" do que "G"). */
const NAMES: Record<string, string> = {
  A: 'á',
  B: 'bê',
  C: 'cê',
  D: 'dê',
  E: 'é',
  F: 'éfe',
  G: 'gê',
  H: 'agá',
  I: 'i',
  J: 'jota',
  K: 'cá',
  L: 'éle',
  M: 'ême',
  N: 'êne',
  O: 'ó',
  P: 'pê',
  Q: 'quê',
  R: 'érre',
  S: 'ésse',
  T: 'tê',
  U: 'u',
  V: 'vê',
  W: 'dáblio',
  X: 'xis',
  Y: 'ípsilon',
  Z: 'zê',
  Ã: 'á com til',
};

export function letterName(l: string): string {
  return NAMES[l] ?? l;
}

/** "a letra gê" ou "o á com til". */
export function letterRef(l: string): string {
  return l === 'Ã' ? 'o á com til' : `a letra ${letterName(l)}`;
}

/** Pares parecidos demais para uma criança de 3 anos: nunca aparecem juntos. */
const SIMILAR = [
  'CGOQD',
  'MNWV',
  'UVY',
  'BPRF',
  'EF',
  'ILTJ',
  'KXY',
  'SZ',
  'NZ',
  'AÃV',
  'HN',
];

export function similar(a: string, b: string): boolean {
  return a === b || SIMILAR.some((g) => g.includes(a) && g.includes(b));
}

/** Letras que podem aparecer como distração (sem as raras). */
const POOL = [...'ABCDEFGHIJLMNOPRSTUVXZ'];

export function distractors(target: string, word: Word, rand: () => number): [string, string] {
  const ok = POOL.filter((l) => !similar(l, target) && !word.letters.includes(l));
  const a = ok[Math.floor(rand() * ok.length)];
  const rest = ok.filter((l) => !similar(l, a));
  const b = rest[Math.floor(rand() * rest.length)];
  return [a, b];
}

/** Gerador de números previsível (para os testes repetirem a mesma corrida). */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
