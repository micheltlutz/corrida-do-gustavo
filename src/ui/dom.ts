// Ajudantes de interface.

import { sfx } from '../audio/sfx.ts';
import { iconButton } from './icons.ts';

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', html = ''): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (html) el.innerHTML = html;
  return el;
}

export function makeScreen(className: string): HTMLElement {
  const el = h('section', `screen ${className}`);
  el.hidden = true;
  return el;
}

export function onTap<T extends HTMLElement>(el: T, action: () => void, sound = true): T {
  el.addEventListener('click', () => {
    if (sound) sfx.pop();
    action();
  });
  return el;
}

/** Botão de voltar para "Jogos do Gustavo" (só quando aberto por ela). */
export function backToGames(screen: HTMLElement): void {
  if (location.hash !== '#jogos') return;
  screen.append(onTap(iconButton('back', 'Todos os jogos', 'back-to-games'), () => location.assign('/jogos-do-gustavo/')));
}

export function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export const TROPHY_SVG = `<svg viewBox="0 0 120 120" aria-hidden="true">
  <path d="M34 14 H86 V44 Q86 74 60 78 Q34 74 34 44 Z" fill="#FFCA28" stroke="#F57F17" stroke-width="4" stroke-linejoin="round"/>
  <path d="M34 22 H18 V32 Q18 52 38 56 M86 22 H102 V32 Q102 52 82 56" fill="none" stroke="#F57F17" stroke-width="7" stroke-linecap="round"/>
  <path d="M42 22 Q44 52 56 64" fill="none" stroke="#FFF59D" stroke-width="6" stroke-linecap="round"/>
  <rect x="52" y="76" width="16" height="16" fill="#FFB300" stroke="#F57F17" stroke-width="4"/>
  <rect x="36" y="92" width="48" height="16" rx="5" fill="#8D6E63" stroke="#5D4037" stroke-width="4"/>
  <path d="M60 30 L64.5 39 L74 40 L67 46.5 L69 56 L60 51 L51 56 L53 46.5 L46 40 L55.5 39 Z" fill="#FFF8E1"/>
</svg>`;
