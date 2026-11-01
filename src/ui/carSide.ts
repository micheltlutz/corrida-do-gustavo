// O carro do Gustavo visto de lado (tela inicial e Pit Stop), e a Pipoca
// mecânica. As rodas são peças separadas para poderem sair e entrar.

import { CAR_DARK, CAR_RED, FONT, STRIPE } from '../render/art.ts';

export const VIEW_W = 600;
export const VIEW_H = 280;

/** Lataria (também serve de "molde" para a lama). */
export const BODY_PATH =
  'M64 206 Q40 206 40 180 L42 142 Q46 118 84 114 L196 108 Q228 66 292 64 L362 64 Q414 68 444 108 L522 120 Q562 126 568 160 L570 182 Q570 206 546 206 Z';
const WIN_BACK = 'M222 108 Q248 78 292 76 L324 76 L324 108 Z';
const WIN_FRONT = 'M340 76 L360 76 Q402 80 428 108 L340 108 Z';

/** Onde ficam as rodas e o adesivo (em unidades do desenho). */
export const WHEELS = [
  { x: 150, y: 206, r: 46 },
  { x: 462, y: 206, r: 46 },
];
export const STICKER_SPOT = { x: 494, y: 152, size: 80 };

let clipId = 0;

export function carBodySvg(): string {
  const font = FONT.replace(/'/g, '');
  const clip = `car-clip-${++clipId}`;
  return `<svg class="car-body" viewBox="0 0 ${VIEW_W} ${VIEW_H}" aria-hidden="true">
    <defs><clipPath id="${clip}"><path d="${BODY_PATH}"/></clipPath>
      <linearGradient id="${clip}-g" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
    <ellipse cx="305" cy="252" rx="250" ry="14" fill="#000" opacity=".18"/>
    <path d="M78 116 L66 82 M120 112 L112 82" stroke="#263238" stroke-width="9" stroke-linecap="round"/>
    <rect x="30" y="70" width="112" height="18" rx="8" fill="${STRIPE}" stroke="#F9A825" stroke-width="3"/>
    <path d="${BODY_PATH}" fill="${CAR_RED}"/>
    <path d="M44 186 Q300 196 568 186 L570 182 Q570 206 546 206 L64 206 Q40 206 40 180 Z" fill="${CAR_DARK}" opacity=".35"/>
    <path d="M200 108 Q230 70 292 68 L362 68 Q410 72 440 108" fill="none" stroke="#fff" stroke-width="4" opacity=".25"/>
    <path d="${WIN_BACK}" fill="#2B3A55"/>
    <path d="${WIN_FRONT}" fill="#B3E5FC"/>
    <path d="M232 104 Q252 84 280 82" stroke="#fff" stroke-width="5" opacity=".35" fill="none" stroke-linecap="round"/>
    <ellipse cx="362" cy="94" rx="10" ry="13" fill="#fff"/>
    <ellipse cx="392" cy="94" rx="10" ry="13" fill="#fff"/>
    <circle cx="366" cy="97" r="6" fill="#263238"/>
    <circle cx="396" cy="97" r="6" fill="#263238"/>
    <circle cx="368" cy="94" r="2" fill="#fff"/>
    <circle cx="398" cy="94" r="2" fill="#fff"/>
    <rect x="48" y="146" width="520" height="14" rx="7" fill="${STRIPE}"/>
    <circle cx="300" cy="153" r="34" fill="#fff" stroke="${STRIPE}" stroke-width="6"/>
    <text x="300" y="156" text-anchor="middle" dominant-baseline="middle" font-family="${font}" font-weight="900" font-size="44" fill="${CAR_RED}">G</text>
    <path d="M520 178 Q540 194 560 176" stroke="#7F0000" stroke-width="7" fill="none" stroke-linecap="round"/>
    <circle cx="554" cy="138" r="10" fill="#FFF59D" stroke="#FBC02D" stroke-width="3"/>
    <rect x="38" y="128" width="12" height="22" rx="5" fill="#FF8A80"/>
    <rect x="30" y="190" width="22" height="10" rx="4" fill="#78909C"/>
    <g clip-path="url(#${clip})"><rect class="shine-bar" x="-160" y="40" width="120" height="200" fill="url(#${clip}-g)" transform="skewX(-20)"/></g>
  </svg>`;
}

export function wheelSvg(old: boolean): string {
  if (old) {
    return `<svg viewBox="-50 -50 100 100" aria-hidden="true">
      <circle r="46" fill="#6D6A66"/>
      <circle r="46" fill="none" stroke="#4E4A46" stroke-width="5" stroke-dasharray="9 7"/>
      <circle r="24" fill="#A1887F" stroke="#795548" stroke-width="4"/>
      <circle r="8" fill="#795548"/>
      <path d="M-30 -22 L-20 -14 M24 -30 L18 -18 M30 20 L20 14 M-18 32 L-12 22" stroke="#3E3A36" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="-12" cy="30" rx="12" ry="7" fill="#6D4C41"/><ellipse cx="22" cy="-26" rx="9" ry="6" fill="#6D4C41"/>
    </svg>`;
  }
  return `<svg viewBox="-50 -50 100 100" aria-hidden="true">
    <circle r="46" fill="#263238"/>
    <circle r="40" fill="none" stroke="#37474F" stroke-width="4"/>
    <circle r="25" fill="#ECEFF1" stroke="#90A4AE" stroke-width="4"/>
    <path d="M0 -20 L5 -6 L19 -6 L8 3 L12 17 L0 9 L-12 17 L-8 3 L-19 -6 L-5 -6 Z" fill="${STRIPE}" stroke="#F9A825" stroke-width="2" stroke-linejoin="round"/>
    <path d="M-30 -30 Q-40 -10 -36 8" stroke="#fff" stroke-width="5" opacity=".35" fill="none" stroke-linecap="round"/>
  </svg>`;
}

/** A Pipoca (do Estilingue e das Patinhas) com boné de mecânica. */
export function pipocaSvg(happy = true): string {
  const INK = '#3E2723';
  const mouth = happy
    ? `<path d="M-12 21 Q0 38 12 21 Z" fill="#5D4037"/><path d="M-6 28 Q0 35 6 28 Q0 25 -6 28 Z" fill="#FF8A80"/>`
    : `<path d="M0 15 V20 M-11 20 Q-5.5 26 0 20 Q5.5 26 11 20" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
  return `<svg viewBox="-80 -100 160 170" aria-hidden="true">
    <path d="M-40 -34 Q-74 -24 -62 22 Q-52 36 -38 14 Z" fill="#C98A2B"/>
    <path d="M40 -34 Q74 -24 62 22 Q52 36 38 14 Z" fill="#C98A2B"/>
    <circle r="50" fill="#F0B44C"/>
    <ellipse cy="18" rx="27" ry="20" fill="#FCE6BA"/>
    <circle cx="-31" cy="14" r="6" fill="#FF8A80" opacity=".5"/><circle cx="31" cy="14" r="6" fill="#FF8A80" opacity=".5"/>
    <circle cx="-18" cy="-6" r="8.5" fill="${INK}"/><circle cx="18" cy="-6" r="8.5" fill="${INK}"/>
    <circle cx="-15" cy="-9.5" r="3" fill="#fff"/><circle cx="21" cy="-9.5" r="3" fill="#fff"/>
    <ellipse cy="9" rx="10" ry="7" fill="${INK}"/><ellipse cx="-3" cy="6.5" rx="3" ry="1.8" fill="#fff" opacity=".7"/>
    ${mouth}
    <path d="M-44 -26 Q-46 -70 0 -72 Q46 -70 44 -26 Z" fill="#1E88E5"/>
    <path d="M-46 -28 L72 -28 Q76 -18 66 -16 L-46 -18 Z" fill="#1565C0"/>
    <circle cy="-50" r="11" fill="#fff"/>
    <text y="-49" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-weight="900" font-size="15" fill="${CAR_RED}">G</text>
    <path d="M-30 44 Q0 58 30 44 L34 64 L-34 64 Z" fill="#1E88E5"/>
  </svg>`;
}
