// A voz do narrador: a voz em português do próprio iPad (sem gravações).
// No iOS, a voz só funciona depois de ser usada uma vez dentro de um toque.
// Enquanto ela fala, a música abaixa.

import { store } from '../storage.ts';
import { setMusicLevel } from './core.ts';

let ready = false;
let speaking = 0;
let duckTimer = 0;

function unlock(): void {
  if (ready || !('speechSynthesis' in window)) return;
  ready = true;
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    speechSynthesis.speak(u);
  } catch {
    // sem voz
  }
}

export function initSpeech(): void {
  for (const ev of ['touchend', 'click', 'keydown']) {
    window.addEventListener(ev, unlock, { capture: true, passive: true });
  }
}

function ptVoice(): SpeechSynthesisVoice | undefined {
  const voices = speechSynthesis.getVoices();
  return voices.find((v) => v.lang === 'pt-BR') ?? voices.find((v) => v.lang.startsWith('pt'));
}

/** A música volta quando a última fala acabar (com um tempo máximo, porque o fim nem sempre avisa). */
function duck(text: string): void {
  speaking++;
  setMusicLevel(0.35);
  window.clearTimeout(duckTimer);
  duckTimer = window.setTimeout(() => {
    speaking = 0;
    setMusicLevel(1);
  }, 900 + text.length * 85);
}

function utter(text: string, rate: number): SpeechSynthesisUtterance {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'pt-BR';
  const voice = ptVoice();
  if (voice) u.voice = voice;
  u.rate = rate;
  u.pitch = 1.1;
  u.onend = () => {
    speaking = Math.max(0, speaking - 1);
    if (!speaking) setMusicLevel(1);
  };
  return u;
}

export const voice = {
  /** Fala agora (interrompe o que estava falando). */
  say(text: string, rate = 1): void {
    if (!store.sound || !('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      speaking = 0;
      duck(text);
      speechSynthesis.speak(utter(text, rate));
    } catch {
      // sem voz
    }
  },
  /** Fala depois do que já está na fila. */
  queue(text: string, rate = 1): void {
    if (!store.sound || !('speechSynthesis' in window)) return;
    try {
      duck(text);
      speechSynthesis.speak(utter(text, rate));
    } catch {
      // sem voz
    }
  },
  stop(): void {
    if (!('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
    } catch {
      // sem voz
    }
    speaking = 0;
    setMusicLevel(1);
  },
};
