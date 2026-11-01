// Tela inicial: o carro do Gustavo e as palavras para correr.

import { music } from '../audio/music.ts';
import { sfx } from '../audio/sfx.ts';
import { WORDS } from '../game/words.ts';
import { letterColor, stickerSvg } from '../render/art.ts';
import { store } from '../storage.ts';
import { carBodySvg, STICKER_SPOT, VIEW_H, VIEW_W, WHEELS, wheelSvg } from './carSide.ts';
import { backToGames, h, makeScreen, onTap, TROPHY_SVG } from './dom.ts';
import { ICONS, iconButton } from './icons.ts';

export class TitleScreen {
  readonly el = makeScreen('title-screen');
  private readonly cards = h('div', 'words');
  private readonly car = h('div', 'car-side title-car');
  private readonly soundBtn: HTMLButtonElement;
  private readonly musicBtn: HTMLButtonElement;

  constructor(play: (wordIndex: number) => void) {
    const title = h('h1', 'title', '<span>Corrida do</span>Gustavo');
    this.car.innerHTML = carBodySvg();
    for (const w of WHEELS) {
      const el = h('div', 'wheel new spin', wheelSvg(false));
      el.style.left = `${((w.x - w.r) / VIEW_W) * 100}%`;
      el.style.top = `${((w.y - w.r) / VIEW_H) * 100}%`;
      el.style.width = `${((w.r * 2) / VIEW_W) * 100}%`;
      this.car.append(el);
    }
    this.car.addEventListener('pointerdown', () => {
      sfx.horn();
      this.car.classList.remove('honk');
      void this.car.offsetWidth;
      this.car.classList.add('honk');
    });
    const road = h('div', 'road');
    road.append(this.car);
    WORDS.forEach((w, i) => {
      const card = h('button', 'word-card');
      card.type = 'button';
      card.setAttribute('aria-label', w.spoken);
      card.dataset.word = w.id;
      onTap(card, () => play(i));
      this.cards.append(card);
    });
    this.soundBtn = onTap(iconButton('soundOn', 'Som', 'small'), () => {
      store.sound = !store.sound;
      this.refresh();
    });
    this.musicBtn = onTap(iconButton('music', 'Música', 'small'), () => {
      store.music = !store.music;
      this.refresh();
    });
    const corner = h('div', 'corner');
    corner.append(this.musicBtn, this.soundBtn);
    this.el.append(title, road, this.cards, corner);
    backToGames(this.el);
  }

  show(): void {
    music.setSong('pit');
    this.refresh();
  }

  private refresh(): void {
    this.soundBtn.innerHTML = store.sound ? ICONS.soundOn : ICONS.soundOff;
    this.soundBtn.classList.toggle('off', !store.sound);
    this.musicBtn.classList.toggle('off', !store.music || !store.sound);
    // O adesivo escolhido no Pit Stop aparece no carro.
    this.car.querySelector('.sticker-on')?.remove();
    if (store.sticker) {
      const s = h('div', 'sticker-on', stickerSvg(store.sticker));
      s.style.left = `${((STICKER_SPOT.x - STICKER_SPOT.size / 2) / VIEW_W) * 100}%`;
      s.style.top = `${((STICKER_SPOT.y - STICKER_SPOT.size / 2) / VIEW_H) * 100}%`;
      s.style.width = `${(STICKER_SPOT.size / VIEW_W) * 100}%`;
      this.car.append(s);
    }
    [...this.cards.children].forEach((card, i) => {
      const w = WORDS[i];
      const n = store.trophies(w.id);
      card.innerHTML =
        `<span class="tiles">${w.letters.map((l) => `<b style="--c:${letterColor(l)}">${l}</b>`).join('')}</span>` +
        (n > 0 ? `<span class="cup">${TROPHY_SVG}${n > 1 ? `<em>${n}</em>` : ''}</span>` : '');
    });
  }
}
