import './styles.css';
import { initAudio } from './audio/core.ts';
import { initSpeech } from './audio/speech.ts';
import { applyPendingUpdate, setupPWA } from './pwa.ts';
import { RaceScreen } from './ui/race.ts';
import { TitleScreen } from './ui/title.ts';

/** Bloqueia zoom, menu de toque longo, seleção e rolagem do Safari. */
function blockBrowserGestures(): void {
  const prevent = (e: Event) => e.preventDefault();
  for (const type of ['gesturestart', 'gesturechange', 'gestureend', 'dblclick', 'contextmenu', 'selectstart']) {
    document.addEventListener(type, prevent, { passive: false });
  }
  document.addEventListener('touchmove', prevent, { passive: false });
  // Sem um listener de touchstart, o iOS não mostra o efeito de botão apertado (:active).
  document.addEventListener('touchstart', () => {}, { passive: true });
}

blockBrowserGestures();
initAudio();
initSpeech();

let current: 'title' | 'race' = 'title';

const title = new TitleScreen((i) => play(i));
const race = new RaceScreen({ title: () => show('title'), play: (i) => play(i) });
document.getElementById('app')!.append(title.el, race.el);

function play(i: number): void {
  current = 'race';
  title.el.hidden = true;
  race.el.hidden = false;
  race.open(i);
}

function show(name: 'title'): void {
  void name;
  race.close();
  current = 'title';
  race.el.hidden = true;
  title.el.hidden = false;
  title.show();
  // Atualizações só fora das corridas.
  applyPendingUpdate();
}

document.addEventListener('visibilitychange', () => {
  if (current !== 'race') return;
  if (document.visibilityState === 'hidden') race.pause();
  else race.resume();
});

show('title');
setupPWA(() => current !== 'race');
