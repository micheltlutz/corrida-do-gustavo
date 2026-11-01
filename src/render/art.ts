// Cores e desenhos 2D que servem tanto para o 3D (texturas) quanto para a
// tela (SVG): placas das letras, adesivos, o G da porta.

import type { StickerId as Sticker } from '../storage.ts';

export const FONT = `ui-rounded, 'SF Pro Rounded', 'Arial Rounded MT Bold', system-ui, -apple-system, sans-serif`;

const LETTER_COLORS = ['#E53935', '#1E88E5', '#43A047', '#8E24AA', '#FB8C00', '#00897B', '#D81B60', '#3949AB'];

export function letterColor(l: string): string {
  const code = l === 'Ã' ? 65 : l.charCodeAt(0);
  return LETTER_COLORS[(code - 65) % LETTER_COLORS.length];
}

/** Cores dos arcos (não dizem qual é a letra certa). */
export const ARCH_COLORS = ['#E53935', '#1E88E5', '#FDD835', '#8E24AA', '#43A047', '#FB8C00', '#00ACC1'];

export const CAR_RED = '#E53935';
export const CAR_DARK = '#B71C1C';
export const STRIPE = '#FDD835';

/** Selo branco com o G vermelho (porta do carro). */
export function roundelSvg(size = 100): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -50 100 100" width="${size}" height="${size}">
    <circle r="46" fill="#fff" stroke="${STRIPE}" stroke-width="7"/>
    <text y="4" text-anchor="middle" dominant-baseline="middle" font-family="${FONT.replace(/'/g, '')}" font-weight="900" font-size="62" fill="${CAR_RED}">G</text>
  </svg>`;
}


/** Adesivos do Pit Stop (centrados, cabem num quadrado de 100). */
export function stickerSvg(id: Sticker, size = 100): string {
  const wrap = (body: string, vb = '-50 -50 100 100') =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${size}" height="${size}">${body}</svg>`;
  const font = `font-family="${FONT.replace(/'/g, '')}" font-weight="900"`;
  switch (id) {
    case 'g':
      return wrap(
        `<circle r="45" fill="#1E88E5" stroke="#fff" stroke-width="7"/><circle r="45" fill="none" stroke="#0D47A1" stroke-width="2"/>
         <text y="5" text-anchor="middle" dominant-baseline="middle" ${font} font-size="64" fill="#fff">G</text>`,
      );
    case 'name':
      return wrap(
        `<rect x="-48" y="-20" width="96" height="40" rx="12" fill="#FDD835" stroke="#fff" stroke-width="5"/>
         <rect x="-48" y="-20" width="96" height="40" rx="12" fill="none" stroke="#F57F17" stroke-width="2"/>
         <text y="2" text-anchor="middle" dominant-baseline="middle" ${font} font-size="21" fill="#C62828" letter-spacing="-0.5">GUSTAVO</text>`,
      );
    case 'star':
      return wrap(
        `<path d="M0 -46 L13.5 -16 L45 -14 L21 8 L28 41 L0 24 L-28 41 L-21 8 L-45 -14 L-13.5 -16 Z" fill="#FFCA28" stroke="#fff" stroke-width="6" stroke-linejoin="round"/>
         <path d="M0 -46 L13.5 -16 L45 -14 L21 8 L28 41 L0 24 L-28 41 L-21 8 L-45 -14 L-13.5 -16 Z" fill="none" stroke="#F57F17" stroke-width="2" stroke-linejoin="round"/>`,
      );
    case 'heart':
      return wrap(
        `<path d="M0 40 L-36 4 Q-52 -16 -36 -32 Q-18 -46 0 -26 Q18 -46 36 -32 Q52 -16 36 4 Z" fill="#EC407A" stroke="#fff" stroke-width="6" stroke-linejoin="round"/>
         <path d="M0 40 L-36 4 Q-52 -16 -36 -32 Q-18 -46 0 -26 Q18 -46 36 -32 Q52 -16 36 4 Z" fill="none" stroke="#AD1457" stroke-width="2" stroke-linejoin="round"/>
         <ellipse cx="-22" cy="-20" rx="8" ry="5" fill="#fff" opacity=".5" transform="rotate(-30 -22 -20)"/>`,
      );
    case 'flame':
      return wrap(
        `<path d="M0 46 Q-38 40 -36 6 Q-34 -18 -16 -30 Q-18 -10 -6 -6 Q-14 -30 6 -46 Q8 -22 26 -10 Q40 2 36 18 Q30 44 0 46 Z" fill="#FF7043" stroke="#fff" stroke-width="6" stroke-linejoin="round"/>
         <path d="M0 40 Q-20 36 -18 16 Q-16 2 -4 -6 Q-2 8 8 10 Q20 18 16 28 Q12 40 0 40 Z" fill="#FFCA28"/>`,
      );
  }
}

/** Carrega um SVG como imagem (para virar textura). */
export function svgImage(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

export function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/** Placa da letra (quadrado arredondado branco com borda colorida). */
export function drawLetterSign(c: CanvasRenderingContext2D, size: number, letter: string, border: string): void {
  c.clearRect(0, 0, size, size);
  const m = size * 0.04;
  roundRect(c, m, m, size - 2 * m, size - 2 * m, size * 0.2);
  c.fillStyle = border;
  c.fill();
  roundRect(c, size * 0.1, size * 0.1, size * 0.8, size * 0.8, size * 0.14);
  c.fillStyle = '#ffffff';
  c.fill();
  c.fillStyle = letterColor(letter);
  c.font = `900 ${Math.round(size * 0.62)}px ${FONT}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  // Letras com acento ficam um pouco mais baixas para caber o til.
  c.fillText(letter, size / 2, size * (letter === 'Ã' ? 0.56 : 0.53));
}
