// O Pit Stop da Pipoca, no meio da corrida: trocar os pneus (tocar nas
// rodas velhas), lavar a lama (esfregar a esponja) e colar um adesivo.

import { sfx } from '../audio/sfx.ts';
import { voice } from '../audio/speech.ts';
import type { Word } from '../game/words.ts';
import { stickerSvg } from '../render/art.ts';
import { STICKER_IDS, store, type StickerId } from '../storage.ts';
import { BODY_PATH, carBodySvg, pipocaSvg, STICKER_SPOT, VIEW_H, VIEW_W, WHEELS, wheelSvg } from './carSide.ts';
import { h } from './dom.ts';

type Step = 'tires' | 'wash' | 'sticker' | 'leave';

const SPONGE = `<svg viewBox="0 0 100 70" aria-hidden="true">
  <rect x="6" y="10" width="88" height="52" rx="16" fill="#FDD835" stroke="#F9A825" stroke-width="4"/>
  <rect x="6" y="10" width="88" height="18" rx="9" fill="#66BB6A" stroke="#388E3C" stroke-width="4"/>
  <circle cx="30" cy="44" r="5" fill="#F9A825"/><circle cx="56" cy="50" r="4" fill="#F9A825"/><circle cx="74" cy="40" r="5" fill="#F9A825"/>
</svg>`;

/** Parede da garagem: bandeirinhas, quadro de ferramentas, janela e pilha de pneus. */
const BUNTING = `<svg class="bunting" viewBox="0 0 1000 60" preserveAspectRatio="none" aria-hidden="true">
  <path d="M0 8 Q500 40 1000 8" fill="none" stroke="#546E7A" stroke-width="3"/>
  ${Array.from({ length: 14 }, (_, i) => {
    const x = 20 + i * 70;
    const y = 8 + 32 * (1 - ((x - 500) / 500) ** 2);
    const c = ['#E53935', '#FDD835', '#1E88E5', '#43A047'][i % 4];
    return `<path d="M${x - 22} ${y - 2} L${x + 22} ${y - 2} L${x} ${y + 40} Z" fill="${c}"/>`;
  }).join('')}
</svg>`;

const TOOLS = `<svg class="tools" viewBox="0 0 200 160" aria-hidden="true">
  <rect x="4" y="4" width="192" height="152" rx="14" fill="#A1887F" stroke="#6D4C41" stroke-width="6"/>
  <g fill="#8D6E63">${Array.from({ length: 30 }, (_, i) => `<circle cx="${24 + (i % 6) * 30}" cy="${24 + Math.floor(i / 6) * 28}" r="3"/>`).join('')}</g>
  <g transform="translate(46 80) rotate(-30)"><rect x="-7" y="-45" width="14" height="80" rx="7" fill="#B0BEC5"/><circle cy="-50" r="17" fill="#B0BEC5"/><rect x="-6" y="-72" width="12" height="22" fill="#A1887F"/></g>
  <g transform="translate(104 78)"><rect x="-6" y="-14" width="12" height="62" rx="5" fill="#FDD835"/><rect x="-26" y="-36" width="52" height="24" rx="6" fill="#78909C"/></g>
  <g transform="translate(160 80) rotate(20)"><rect x="-9" y="-6" width="18" height="44" rx="7" fill="#E53935"/><rect x="-3" y="-50" width="6" height="46" fill="#CFD8DC"/></g>
</svg>`;

const TIRES = `<svg class="tires" viewBox="0 0 120 170" aria-hidden="true">
  ${[0, 1, 2].map((i) => `<ellipse cx="60" cy="${148 - i * 46}" rx="56" ry="24" fill="#37474F"/><ellipse cx="60" cy="${140 - i * 46}" rx="56" ry="24" fill="#263238"/><ellipse cx="60" cy="${140 - i * 46}" rx="26" ry="10" fill="#546E7A"/>`).join('')}
  <rect x="34" y="40" width="52" height="8" rx="4" fill="#FDD835"/>
</svg>`;

const STEP_ICONS: Record<Exclude<Step, 'leave'>, string> = {
  tires: wheelSvg(false),
  wash: SPONGE,
  sticker: stickerSvg('star', 100),
};

/** Quanto do desenho a lama cobre (pixels com tinta). */
function inkCount(c: CanvasRenderingContext2D): number {
  const data = c.getImageData(0, 0, VIEW_W, VIEW_H).data;
  let n = 0;
  for (let i = 3; i < data.length; i += 16) if (data[i] > 40) n++;
  return n;
}

export class PitStop {
  readonly el = h('div', 'pit');
  private readonly car = h('div', 'car-side');
  private readonly mud = h('canvas', 'mud');
  private readonly mudCtx: CanvasRenderingContext2D;
  private readonly wheels: HTMLElement[] = [];
  private readonly tray = h('div', 'tray');
  private readonly sponge = h('div', 'sponge', SPONGE);
  private readonly progress = h('div', 'steps');
  private readonly pipoca = h('div', 'pipoca', pipocaSvg());
  private readonly ghost = h('div', 'ghost', '👆');
  private step: Step = 'tires';
  private done: (() => void) | null = null;
  private timers: number[] = [];
  private mudStart = 1;
  private scrubs = 0;
  private lastScrubSound = 0;
  private idleTimer = 0;
  private dragging: { el: HTMLElement; id: StickerId; pointer: number } | null = null;

  constructor() {
    this.el.hidden = true;
    this.mud.width = VIEW_W;
    this.mud.height = VIEW_H;
    this.mudCtx = this.mud.getContext('2d', { willReadFrequently: true })!;
    this.car.innerHTML = carBodySvg();
    for (const w of WHEELS) {
      const el = h('div', 'wheel');
      el.style.left = `${((w.x - w.r) / VIEW_W) * 100}%`;
      el.style.top = `${((w.y - w.r) / VIEW_H) * 100}%`;
      el.style.width = `${((w.r * 2) / VIEW_W) * 100}%`;
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.tapWheel(el);
      });
      this.wheels.push(el);
    }
    this.car.append(...this.wheels, this.mud);
    const floor = h('div', 'floor');
    const wall = h('div', 'wall', `${BUNTING}${TOOLS}<i class="window"></i>${TIRES}`);
    this.el.append(wall, floor, this.progress, this.pipoca, this.car, this.sponge, this.tray, this.ghost);
    this.el.addEventListener('pointerdown', (e) => this.onDown(e));
    this.el.addEventListener('pointermove', (e) => this.onMove(e));
    this.el.addEventListener('pointerup', (e) => this.onUp(e));
    this.el.addEventListener('pointercancel', (e) => this.onUp(e));
  }

  open(word: Word, done: () => void): void {
    void word;
    this.done = done;
    this.el.hidden = false;
    this.el.classList.remove('leaving');
    this.car.classList.remove('drive-off', 'shine');
    this.car.querySelector('.sticker-on')?.remove();
    for (const w of this.wheels) {
      w.className = 'wheel old';
      w.innerHTML = wheelSvg(true);
      w.style.transform = '';
    }
    this.drawMud();
    this.tray.hidden = true;
    this.sponge.hidden = true;
    this.go('tires');
    this.say('Pit Stop! Oi, Gustavo! Vamos trocar os pneus. Toque nas rodas velhas!', 400);
  }

  close(): void {
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
    window.clearTimeout(this.idleTimer);
    this.el.hidden = true;
    this.dragging = null;
    this.ghost.hidden = true;
  }

  private later(ms: number, fn: () => void): void {
    this.timers.push(window.setTimeout(fn, ms));
  }

  private say(text: string, delay = 0): void {
    this.later(delay, () => voice.say(text));
    this.pipoca.classList.remove('talk');
    void this.pipoca.offsetWidth;
    this.pipoca.classList.add('talk');
  }

  private go(step: Step): void {
    this.step = step;
    this.el.dataset.step = step;
    const order: Step[] = ['tires', 'wash', 'sticker'];
    const at = order.indexOf(step);
    this.progress.innerHTML = order
      .map((s, i) => `<div class="${i < at || step === 'leave' ? 'ok' : i === at ? 'now' : ''}">${STEP_ICONS[s as Exclude<Step, 'leave'>]}</div>`)
      .join('');
    this.sponge.hidden = step !== 'wash';
    if (step === 'wash') this.sponge.style.left = this.sponge.style.top = '';
    this.tray.hidden = step !== 'sticker';
    if (step === 'sticker') this.buildTray();
    this.armHint();
  }

  /** Se ficar parado, a mãozinha mostra o que fazer. */
  private armHint(): void {
    window.clearTimeout(this.idleTimer);
    this.ghost.hidden = true;
    if (this.step === 'leave') return;
    this.idleTimer = window.setTimeout(() => this.showHint(), 5000);
  }

  private showHint(): void {
    let target: HTMLElement | null = null;
    if (this.step === 'tires') target = this.wheels.find((w) => w.classList.contains('old')) ?? null;
    else if (this.step === 'wash') target = this.car;
    else if (this.step === 'sticker') target = this.tray.querySelector('.st');
    if (!target) return;
    const r = target.getBoundingClientRect();
    const base = this.el.getBoundingClientRect();
    this.ghost.style.left = `${r.left - base.left + r.width / 2}px`;
    this.ghost.style.top = `${r.top - base.top + r.height / 2}px`;
    this.ghost.dataset.kind = this.step === 'wash' ? 'scrub' : 'tap';
    this.ghost.hidden = false;
  }

  // ---------- pneus ----------

  private tapWheel(el: HTMLElement): void {
    if (this.step !== 'tires' || !el.classList.contains('old')) return;
    el.classList.remove('old');
    el.classList.add('off');
    sfx.wheelOff();
    this.armHint();
    this.later(650, () => {
      el.innerHTML = wheelSvg(false);
      el.classList.remove('off');
      el.classList.add('roll-in');
      this.later(700, () => {
        el.classList.remove('roll-in');
        el.classList.add('new');
        sfx.wheelOn();
        if (this.wheels.every((w) => w.classList.contains('new'))) {
          this.later(500, () => {
            this.go('wash');
            this.say('Pneus novinhos! Agora, esfregue a esponja para tirar a lama!');
          });
        }
      });
    });
  }

  // ---------- lama ----------

  private drawMud(): void {
    const c = this.mudCtx;
    c.globalCompositeOperation = 'source-over';
    c.clearRect(0, 0, VIEW_W, VIEW_H);
    const body = new Path2D(BODY_PATH);
    c.save();
    c.clip(body);
    for (let i = 0; i < 70; i++) {
      const x = 40 + Math.random() * 530;
      const y = 60 + Math.random() * 150;
      const r = 16 + Math.random() * 30;
      c.fillStyle = i % 3 ? '#6D4C41' : '#5D4037';
      c.beginPath();
      c.ellipse(x, y, r, r * 0.75, Math.random() * 3, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = 'rgba(255,255,255,0.15)';
    for (let i = 0; i < 14; i++) {
      c.beginPath();
      c.ellipse(60 + Math.random() * 480, 80 + Math.random() * 110, 8, 4, 0.5, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
    this.mudStart = Math.max(1, inkCount(c));
    this.scrubs = 0;
  }

  private scrub(clientX: number, clientY: number): void {
    const r = this.mud.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * VIEW_W;
    const y = ((clientY - r.top) / r.height) * VIEW_H;
    const c = this.mudCtx;
    c.globalCompositeOperation = 'destination-out';
    c.beginPath();
    c.arc(x, y, 38, 0, Math.PI * 2);
    c.fill();
    c.globalCompositeOperation = 'source-over';
    const now = performance.now();
    if (now - this.lastScrubSound > 110) {
      this.lastScrubSound = now;
      sfx.scrub();
      if (Math.random() < 0.5) sfx.bubble();
      this.bubble(clientX, clientY);
    }
    if (++this.scrubs % 8 === 0 && inkCount(c) / this.mudStart < 0.12) this.washed();
  }

  private bubble(x: number, y: number): void {
    const base = this.el.getBoundingClientRect();
    for (let i = 0; i < 2; i++) {
      const b = h('i', 'bubble');
      const s = 14 + Math.random() * 22;
      b.style.width = b.style.height = `${s}px`;
      b.style.left = `${x - base.left + (Math.random() - 0.5) * 60}px`;
      b.style.top = `${y - base.top + (Math.random() - 0.5) * 40}px`;
      this.el.append(b);
      b.animate(
        [
          { transform: 'translate(-50%, -50%) scale(0.4)', opacity: 1 },
          { transform: `translate(-50%, calc(-50% - ${60 + Math.random() * 80}px)) scale(1)`, opacity: 0 },
        ],
        { duration: 900 + Math.random() * 400, easing: 'ease-out' },
      ).onfinish = () => b.remove();
    }
  }

  private washed(): void {
    if (this.step !== 'wash') return;
    this.step = 'sticker';
    this.mudCtx.clearRect(0, 0, VIEW_W, VIEW_H);
    this.sponge.classList.remove('held');
    this.car.classList.add('shine');
    sfx.sparkle();
    this.later(900, () => {
      this.go('sticker');
      this.say('Brilhando! Escolha um adesivo para o seu carro!');
    });
  }

  // ---------- adesivo ----------

  private buildTray(): void {
    this.tray.textContent = '';
    for (const id of STICKER_IDS) {
      const b = h('div', 'st', stickerSvg(id));
      b.dataset.id = id;
      this.tray.append(b);
    }
  }

  private placeSticker(id: StickerId, from: DOMRect | null): void {
    if (this.step !== 'sticker') return;
    this.step = 'leave';
    window.clearTimeout(this.idleTimer);
    this.ghost.hidden = true;
    store.sticker = id;
    const el = h('div', 'sticker-on', stickerSvg(id));
    el.style.left = `${((STICKER_SPOT.x - STICKER_SPOT.size / 2) / VIEW_W) * 100}%`;
    el.style.top = `${((STICKER_SPOT.y - STICKER_SPOT.size / 2) / VIEW_H) * 100}%`;
    el.style.width = `${(STICKER_SPOT.size / VIEW_W) * 100}%`;
    this.car.append(el);
    if (from) {
      const to = el.getBoundingClientRect();
      el.animate(
        [
          { transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / Math.max(1, to.width)}) rotate(-20deg)` },
          { transform: 'translate(0, 0) scale(1.3) rotate(8deg)', offset: 0.75 },
          { transform: 'translate(0, 0) scale(1) rotate(0deg)' },
        ],
        { duration: 600, easing: 'ease-out' },
      );
    }
    this.later(450, () => sfx.sticker());
    this.tray.hidden = true;
    this.go('leave');
    this.say('Ficou lindo! De volta para a pista!', 500);
    this.later(2600, () => {
      this.car.classList.add('drive-off');
      for (const w of this.wheels) w.classList.add('spin');
      sfx.horn();
    });
    this.later(3600, () => this.done?.());
  }

  // ---------- toque (esponja e adesivos) ----------

  private onDown(e: PointerEvent): void {
    if (this.step === 'wash') {
      this.sponge.classList.add('held');
      this.moveSponge(e.clientX, e.clientY);
      this.scrub(e.clientX, e.clientY);
      this.armHint();
      return;
    }
    if (this.step === 'sticker') {
      const st = (e.target as HTMLElement).closest<HTMLElement>('.st');
      if (!st) return;
      e.preventDefault();
      this.armHint();
      const ghost = st.cloneNode(true) as HTMLElement;
      ghost.classList.add('dragging');
      const r = st.getBoundingClientRect();
      ghost.style.width = `${r.width}px`;
      ghost.style.height = `${r.height}px`;
      document.body.append(ghost);
      this.dragging = { el: ghost, id: st.dataset.id as StickerId, pointer: e.pointerId };
      this.dragTo(e.clientX, e.clientY);
      (st as HTMLElement).dataset.start = `${e.clientX},${e.clientY}`;
      sfx.pop();
    }
  }

  private onMove(e: PointerEvent): void {
    if (this.step === 'wash' && this.sponge.classList.contains('held')) {
      this.moveSponge(e.clientX, e.clientY);
      this.scrub(e.clientX, e.clientY);
    } else if (this.dragging && this.dragging.pointer === e.pointerId) {
      this.dragTo(e.clientX, e.clientY);
    }
  }

  private onUp(e: PointerEvent): void {
    this.sponge.classList.remove('held');
    const d = this.dragging;
    if (!d || d.pointer !== e.pointerId) return;
    this.dragging = null;
    const r = d.el.getBoundingClientRect();
    d.el.remove();
    // Soltou em qualquer lugar (ou só tocou): o adesivo vai para o carro.
    this.placeSticker(d.id, r);
  }

  private dragTo(x: number, y: number): void {
    const el = this.dragging!.el;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }

  private moveSponge(x: number, y: number): void {
    const base = this.el.getBoundingClientRect();
    this.sponge.style.left = `${x - base.left}px`;
    this.sponge.style.top = `${y - base.top}px`;
  }
}
