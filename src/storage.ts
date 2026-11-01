// Progresso salvo no próprio iPad. Se o armazenamento falhar (modo privado,
// por exemplo), o jogo continua funcionando, só não lembra o progresso.

const KEY = 'corrida-do-gustavo:v1';

export type StickerId = 'g' | 'name' | 'star' | 'heart' | 'flame';
export const STICKER_IDS: readonly StickerId[] = ['g', 'name', 'star', 'heart', 'flame'];

interface SaveData {
  /** Quantas vezes cada palavra foi completada. */
  trophies: Record<string, number>;
  /** Adesivo escolhido no Pit Stop (fica no carro). */
  sticker: StickerId | null;
  sound: boolean;
  music: boolean;
}

function read(): SaveData {
  const empty: SaveData = { trophies: {}, sticker: null, sound: true, music: true };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    const d = JSON.parse(raw) as Partial<SaveData>;
    return {
      trophies: d.trophies && typeof d.trophies === 'object' ? d.trophies : {},
      sticker: STICKER_IDS.includes(d.sticker as StickerId) ? (d.sticker as StickerId) : null,
      sound: d.sound !== false,
      music: d.music !== false,
    };
  } catch {
    return empty;
  }
}

const state = read();

function write(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // sem armazenamento disponível
  }
}

export const store = {
  trophies: (word: string) => state.trophies[word] ?? 0,
  win(word: string): void {
    state.trophies[word] = (state.trophies[word] ?? 0) + 1;
    write();
  },
  get sticker(): StickerId | null {
    return state.sticker;
  },
  set sticker(id: StickerId | null) {
    state.sticker = id;
    write();
  },
  get sound(): boolean {
    return state.sound;
  },
  set sound(on: boolean) {
    state.sound = on;
    write();
  },
  get music(): boolean {
    return state.music;
  },
  set music(on: boolean) {
    state.music = on;
    write();
  },
};
