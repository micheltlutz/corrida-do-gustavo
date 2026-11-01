// A tela da corrida: a cena 3D, o painel com as letras, o botão de turbo,
// os gestos, a voz do narrador, o Pit Stop e a festa da chegada.

import { music } from '../audio/music.ts';
import { engine, sfx } from '../audio/sfx.ts';
import { voice } from '../audio/speech.ts';
import { Race, TURBO_STARS, type RaceEvent } from '../game/race.ts';
import { letterName, letterRef, WORDS, type Word } from '../game/words.ts';
import { letterColor } from '../render/art.ts';
import { Stage } from '../render/stage.ts';
import { store } from '../storage.ts';
import { clearConfetti, confetti } from './confetti.ts';
import { h, makeScreen, onTap, TROPHY_SVG } from './dom.ts';
import { ICONS, iconButton } from './icons.ts';
import { PitStop } from './pitstop.ts';

export interface RaceNav {
  title(): void;
  play(wordIndex: number): void;
}

const STEP = 1 / 60;
const PRAISE = ['Muito bem!', 'Isso!', 'Boa!', 'Demais!', 'Mandou bem!'];

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export class RaceScreen {
  readonly el = makeScreen('race');
  private readonly nav: RaceNav;
  private stage: Stage | null = null;
  private race: Race | null = null;
  private word: Word = WORDS[0];
  private wordIndex = 0;
  private readonly view = h('div', 'view');
  private readonly panel = h('div', 'panel');
  private slots: HTMLElement[] = [];
  private readonly turboBtn = h('button', 'turbo');
  private readonly pips = h('div', 'pips');
  private readonly touch = h('div', 'touch');
  private readonly lights = h('div', 'lights', '<i></i><i></i><i></i>');
  private readonly hand = h('div', 'hand', '👆');
  private readonly fade = h('div', 'fade');
  private readonly flyLayer = h('div', 'fly-layer');
  private readonly confirmEl = h('div', 'overlay confirm');
  private readonly trophyEl = h('div', 'overlay trophy');
  private readonly pit: PitStop;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private paused = false;
  private active = false;
  private timers: number[] = [];
  private gateAt = 0;
  private steeredAt = -99;
  private shownHand = false;
  private lastTurboHint = -99;
  private firstGate = true;
  private turboWasFull = true;
  private down: { id: number; x: number; y: number; t: number; fired: boolean } | null = null;

  constructor(nav: RaceNav) {
    this.nav = nav;
    this.turboBtn.type = 'button';
    this.turboBtn.setAttribute('aria-label', 'Turbo');
    this.turboBtn.innerHTML = `${ICONS.flame}`;
    this.turboBtn.append(this.pips);
    this.pips.innerHTML = Array.from({ length: TURBO_STARS }, () => `<i>${ICONS.star}</i>`).join('');
    const home = onTap(iconButton('home', 'Início', 'small home-btn'), () => this.askHome());
    this.hand.hidden = true;
    this.lights.hidden = true;
    this.fade.hidden = true;
    this.confirmEl.hidden = true;
    this.trophyEl.hidden = true;
    this.pit = new PitStop();
    this.el.append(this.view, this.touch, this.panel, home, this.turboBtn, this.lights, this.hand, this.flyLayer, this.pit.el, this.fade, this.confirmEl, this.trophyEl);

    this.turboBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.race?.turbo();
    });
    this.touch.addEventListener('pointerdown', (e) => this.onDown(e));
    this.touch.addEventListener('pointermove', (e) => this.onMove(e));
    this.touch.addEventListener('pointerup', (e) => this.onUp(e));
    this.touch.addEventListener('pointercancel', () => (this.down = null));
    window.addEventListener('keydown', (e) => this.onKey(e));
    window.addEventListener('resize', () => this.resize());
  }

  // ---------- abrir e fechar ----------

  open(wordIndex: number): void {
    this.close();
    this.wordIndex = wordIndex;
    this.word = WORDS[wordIndex];
    if (!this.stage) {
      this.stage = new Stage();
      this.view.append(this.stage.canvas);
    }
    this.stage.reset();
    this.stage.car.setSticker(store.sticker);
    this.race = new Race(this.word);
    this.active = true;
    this.paused = false;
    this.acc = 0;
    this.steeredAt = -99;
    this.shownHand = false;
    this.turboWasFull = true;
    this.trophyEl.hidden = true;
    this.confirmEl.hidden = true;
    this.fade.hidden = true;
    this.pit.close();
    this.buildPanel();
    this.resize();
    music.setSong('race');
    // Narrador, contagem e largada.
    this.later(300, () => voice.say(this.word.intro));
    this.later(1900, () => this.light(1));
    this.later(2600, () => this.light(2));
    this.later(3300, () => {
      this.light(3);
      this.race?.go();
    });
    this.later(4300, () => (this.lights.hidden = true));
    this.last = performance.now();
    this.raf = requestAnimationFrame((t) => this.frame(t));
    if (import.meta.env.DEV) (window as unknown as { __race: unknown }).__race = this;
  }

  close(): void {
    this.active = false;
    cancelAnimationFrame(this.raf);
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
    engine.stop();
    voice.stop();
    clearConfetti(this.el);
    this.flyLayer.textContent = '';
    this.pit.close();
  }

  pause(): void {
    if (!this.active) return;
    this.paused = true;
    engine.stop();
    voice.stop();
  }

  resume(): void {
    if (!this.active || !this.confirmEl.hidden) return;
    this.paused = false;
    this.last = performance.now();
  }

  private later(ms: number, fn: () => void): void {
    this.timers.push(window.setTimeout(fn, ms));
  }

  private resize(): void {
    if (!this.stage) return;
    const r = this.el.getBoundingClientRect();
    if (r.width > 0) this.stage.resize(r.width, r.height);
  }

  private light(n: number): void {
    this.lights.hidden = false;
    this.lights.dataset.on = String(n);
    sfx.beep(n === 3);
  }

  private buildPanel(): void {
    this.panel.textContent = '';
    this.panel.classList.remove('gold');
    this.slots = this.word.letters.map((l) => {
      const s = h('div', 'slot', `<span>${l}</span>`);
      s.style.setProperty('--c', letterColor(l));
      this.panel.append(s);
      return s;
    });
    this.updatePanel();
  }

  private updatePanel(): void {
    const got = this.race?.got ?? 0;
    this.slots.forEach((s, i) => s.classList.toggle('now', i === got && this.race?.phase !== 'finish'));
  }

  // ---------- gestos ----------

  private onDown(e: PointerEvent): void {
    this.down = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), fired: false };
  }

  private onMove(e: PointerEvent): void {
    const d = this.down;
    if (!d || d.id !== e.pointerId || d.fired) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) > 26 && Math.abs(dx) > Math.abs(dy) * 0.8) {
      d.fired = true;
      this.steer(dx < 0 ? -1 : 1);
    }
  }

  private onUp(e: PointerEvent): void {
    const d = this.down;
    this.down = null;
    if (!d || d.id !== e.pointerId || d.fired || !this.race || !this.stage) return;
    // Toque rápido do lado do carro também troca de faixa.
    if (performance.now() - d.t > 450 || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 20) return;
    const car = this.stage.carScreen(this.race);
    if (Math.abs(e.clientX - car.x) < 40) return;
    this.steer(e.clientX < car.x ? -1 : 1);
  }

  private onKey(e: KeyboardEvent): void {
    if (!this.active || this.el.hidden || !this.pit.el.hidden) return;
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') this.steer(-1);
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') this.steer(1);
    else if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W') this.race?.turbo();
    else if (k === 'Escape') this.askHome();
    else return;
    e.preventDefault();
  }

  private steer(dir: -1 | 1): void {
    if (!this.race || this.paused) return;
    this.steeredAt = this.race.time;
    this.race.steer(dir);
  }

  // ---------- quadro a quadro ----------

  private frame(now: number): void {
    if (!this.active) return;
    this.raf = requestAnimationFrame((t) => this.frame(t));
    const race = this.race!;
    const stage = this.stage!;
    let dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    if (this.paused || !this.pit.el.hidden) dt = 0;
    this.acc += dt;
    while (this.acc >= STEP) {
      this.acc -= STEP;
      race.step(STEP);
      for (const ev of race.events.splice(0)) this.onEvent(ev);
    }
    if (this.pit.el.hidden) stage.render(dt, race);
    this.updateHud();
    engine.set(race.speed, race.turboT > 0, !this.paused && this.pit.el.hidden && race.phase !== 'done');
  }

  private updateHud(): void {
    const race = this.race!;
    const full = race.charge >= TURBO_STARS;
    this.turboBtn.classList.toggle('full', full);
    this.turboBtn.classList.toggle('on', race.turboT > 0 || race.magnet);
    [...this.pips.children].forEach((p, i) => p.classList.toggle('on', i < race.charge));
    // Mãozinha mostrando para que lado deslizar (primeira rodada e depois de errar).
    const g = race.gates.find((x) => x.state === 'open');
    let show = false;
    if (g && race.phase === 'drive' && race.lane !== g.correct && !race.magnet) {
      const near = g.z - race.dist < 70;
      const idle = race.time - Math.max(this.gateAt, this.steeredAt) > 1.2;
      show = near && idle && (g.hint || !this.shownHand);
      if (show) this.hand.dataset.dir = g.correct < race.lane ? 'left' : 'right';
    }
    if (this.hand.hidden === show) this.hand.hidden = !show;
  }

  private onEvent(ev: RaceEvent): void {
    const race = this.race!;
    const stage = this.stage!;
    switch (ev.t) {
      case 'gate': {
        this.gateAt = race.time;
        const ref = letterRef(ev.letter);
        if (ev.gate.attempt === 0) {
          const line = this.firstGate
            ? `Gustavo, troque de faixa para pegar ${ref}!`
            : pick([`Agora, ${ref}!`, `Cadê ${ref}?`, `Vamos pegar ${ref}!`, `Troque de faixa para pegar ${ref}!`]);
          voice.queue(line);
          this.firstGate = false;
        } else if (ev.gate.attempt >= 2) {
          voice.queue(`Olha! Agora todas as placas são ${ref}!`);
        }
        this.updatePanel();
        break;
      }
      case 'collect': {
        sfx.letter();
        if (ev.magnet) sfx.magnet();
        this.shownHand = true;
        voice.say(`${cap(letterName(ev.letter))}! ${pick(PRAISE)}`);
        stage.signHit(ev.gate, ev.magnet, (x, y) => this.flyToSlot(ev.index, ev.letter, x, y));
        break;
      }
      case 'miss':
        sfx.miss();
        stage.signMiss(ev.gate);
        voice.say(`Ops! Essa é ${letterRef(ev.wrong)}, vamos procurar ${letterRef(ev.want)}!`);
        break;
      case 'star':
        sfx.star(ev.charge);
        stage.starTaken(ev.star);
        if (ev.charge >= TURBO_STARS && !this.turboWasFull) sfx.turboReady();
        this.turboWasFull = ev.charge >= TURBO_STARS;
        break;
      case 'turbo':
        sfx.turbo();
        this.turboWasFull = false;
        break;
      case 'turboEmpty':
        sfx.turboEmpty();
        this.turboBtn.classList.remove('nope');
        void this.turboBtn.offsetWidth;
        this.turboBtn.classList.add('nope');
        if (race.time - this.lastTurboHint > 12) {
          this.lastTurboHint = race.time;
          voice.say('Pegue as estrelas para encher o turbo!');
        }
        break;
      case 'lane':
        sfx.lane(ev.dir);
        break;
      case 'edge':
        sfx.edge();
        break;
      case 'mud':
        sfx.mud();
        stage.mudSplash(race);
        voice.say('Ih, lama! O carro ficou sujinho! Vamos para o Pit Stop!');
        break;
      case 'pit':
        this.enterPit();
        break;
      case 'finish':
        this.celebrate();
        break;
      case 'done':
        break;
    }
  }

  /** A letra voa da placa até o lugar dela no painel. */
  private flyToSlot(index: number, letter: string, x: number, y: number): void {
    const slot = this.slots[index];
    if (!slot) return;
    const tile = h('div', 'fly', letter);
    tile.style.setProperty('--c', letterColor(letter));
    tile.style.left = `${x}px`;
    tile.style.top = `${y}px`;
    this.flyLayer.append(tile);
    const r = slot.getBoundingClientRect();
    const tx = r.left + r.width / 2 - x;
    const ty = r.top + r.height / 2 - y;
    const anim = tile.animate(
      [
        { transform: 'translate(-50%, -50%) scale(1.6)' },
        { transform: `translate(calc(-50% + ${tx * 0.35}px), calc(-50% + ${ty * 0.2 - 60}px)) scale(1.9)`, offset: 0.35 },
        { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(${r.width / 90})` },
      ],
      { duration: 750, easing: 'ease-in-out', fill: 'forwards' },
    );
    anim.onfinish = () => {
      tile.remove();
      slot.classList.add('got');
      sfx.pop();
    };
  }

  // ---------- Pit Stop ----------

  private enterPit(): void {
    this.fade.hidden = false;
    this.fade.classList.remove('out');
    this.later(450, () => {
      music.setSong('pit');
      this.pit.open(this.word, () => this.leavePit());
      this.fade.classList.add('out');
      this.later(450, () => (this.fade.hidden = true));
    });
  }

  private leavePit(): void {
    this.fade.hidden = false;
    this.fade.classList.remove('out');
    this.later(450, () => {
      this.pit.close();
      this.stage?.car.setSticker(store.sticker);
      this.race?.leavePit();
      music.setSong('race');
      this.last = performance.now();
      this.fade.classList.add('out');
      this.later(450, () => (this.fade.hidden = true));
    });
  }

  // ---------- chegada ----------

  private celebrate(): void {
    const race = this.race!;
    const stage = this.stage!;
    music.stop();
    voice.stop();
    store.win(this.word.id);
    this.panel.classList.add('gold');
    this.updatePanel();
    sfx.win();
    sfx.horn(0.6);
    sfx.crowd();
    this.later(1100, () => {
      sfx.screech();
      sfx.horn(0.2);
      stage.party(race);
      confetti(this.el, 120);
    });
    // Soletra devagar, letra por letra.
    const letters = this.word.letters;
    const gap = 850;
    letters.forEach((l, i) => {
      this.later(900 + i * gap, () => {
        this.slots[i].classList.remove('say');
        void this.slots[i].offsetWidth;
        this.slots[i].classList.add('say');
        sfx.spell(i);
        voice.queue(cap(letterName(l)), 0.95);
      });
    });
    const end = 900 + letters.length * gap;
    this.later(end, () => {
      this.panel.classList.add('shine');
      voice.queue(`${cap(this.word.spoken)}!`, 0.9);
      voice.queue(this.word.end);
      sfx.horn();
    });
    this.later(end + 3800, () => this.showTrophy());
  }

  private showTrophy(): void {
    const t = this.trophyEl;
    t.textContent = '';
    const card = h('div', 'card');
    const word = h('div', 'word', this.word.letters.map((l) => `<span>${l}</span>`).join(''));
    const buttons = h('div', 'buttons');
    buttons.append(
      onTap(iconButton('home', 'Início', 'small'), () => this.nav.title()),
      onTap(iconButton('restart', 'Correr de novo', 'small'), () => this.nav.play(this.wordIndex)),
    );
    const next = (this.wordIndex + 1) % WORDS.length;
    buttons.append(onTap(iconButton('next', 'Próxima palavra', 'big go'), () => this.nav.play(next)));
    card.append(h('div', 'cup', TROPHY_SVG), word, buttons);
    t.append(card);
    t.hidden = false;
    confetti(this.el, 80);
  }

  // ---------- voltar ao início ----------

  private askHome(): void {
    if (!this.active) return;
    if (this.race?.phase === 'done' || !this.trophyEl.hidden) {
      this.nav.title();
      return;
    }
    this.pause();
    const c = this.confirmEl;
    c.textContent = '';
    const card = h('div', 'card');
    card.append(
      onTap(iconButton('close', 'Continuar correndo', 'big stay'), () => {
        c.hidden = true;
        this.resume();
      }),
      onTap(iconButton('home', 'Sair da corrida', 'big leave'), () => this.nav.title()),
    );
    c.append(card);
    c.hidden = false;
  }
}
