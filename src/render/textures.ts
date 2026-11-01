// Texturas desenhadas na hora em canvas (sem arquivos de imagem).

import * as THREE from 'three';
import { LANE_W } from '../game/race.ts';
import { drawLetterSign, FONT, roundRect } from './art.ts';

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  return [cv, cv.getContext('2d')!];
}

function texture(cv: HTMLCanvasElement, repeat = false): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export const ROAD_TILE = 16;
export const ROAD_HALF = LANE_W * 1.5 + 0.5;
export const CURB = 0.7;

/** Asfalto com as 3 faixas, um pedaço de 16 m (repete). */
export function roadTexture(): THREE.CanvasTexture {
  const W = 512;
  const H = 512;
  const [cv, c] = canvas(W, H);
  const total = ROAD_HALF * 2 + CURB * 2;
  const px = (m: number) => ((m + total / 2) / total) * W;
  c.fillStyle = '#5E6B73';
  c.fillRect(0, 0, W, H);
  // Pontinhos do asfalto.
  for (let i = 0; i < 2600; i++) {
    c.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    c.fillRect(Math.random() * W, Math.random() * H, 2, 2);
  }
  // Zebrinhas vermelhas e brancas nas bordas.
  const seg = H / 8;
  for (let i = 0; i < 8; i++) {
    c.fillStyle = i % 2 ? '#FFFFFF' : '#E53935';
    c.fillRect(0, i * seg, px(-ROAD_HALF) - 0, seg);
    c.fillRect(px(ROAD_HALF), i * seg, W - px(ROAD_HALF), seg);
  }
  // Linhas brancas das bordas e tracejadas entre as faixas.
  c.fillStyle = '#FFFFFF';
  const line = 0.16;
  for (const m of [-ROAD_HALF + 0.25, ROAD_HALF - 0.25]) c.fillRect(px(m - line / 2), 0, px(line) - px(0), H);
  for (const m of [-LANE_W / 2, LANE_W / 2]) {
    for (let i = 0; i < 2; i++) c.fillRect(px(m - line / 2), i * (H / 2) + H * 0.1, px(line) - px(0), H * 0.3);
  }
  const t = texture(cv, true);
  t.anisotropy = 8;
  return t;
}

/** Grama com faixas de cortador (repete). */
export function grassTexture(): THREE.CanvasTexture {
  const [cv, c] = canvas(256, 256);
  c.fillStyle = '#7CC24E';
  c.fillRect(0, 0, 256, 256);
  c.fillStyle = '#86CC57';
  c.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 900; i++) {
    c.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,60,0,0.07)';
    c.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
  }
  return texture(cv, true);
}

/** Xadrez preto e branco (largada e chegada). */
export function checkerTexture(cols = 12, rows = 2): THREE.CanvasTexture {
  const s = 32;
  const [cv, c] = canvas(cols * s, rows * s);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      c.fillStyle = (x + y) % 2 ? '#212121' : '#FFFFFF';
      c.fillRect(x * s, y * s, s, s);
    }
  }
  const t = texture(cv);
  t.magFilter = THREE.NearestFilter;
  return t;
}

/** Poça de lama (manchas marrons, fundo transparente). */
export function mudTexture(): THREE.CanvasTexture {
  const [cv, c] = canvas(256, 384);
  for (let i = 0; i < 46; i++) {
    const x = 20 + Math.random() * 216;
    const y = 20 + Math.random() * 344;
    const r = 18 + Math.random() * 34;
    c.fillStyle = i % 4 ? '#6D4C41' : '#5D4037';
    c.beginPath();
    c.ellipse(x, y, r, r * (0.6 + Math.random() * 0.5), Math.random() * 3, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = 'rgba(255,255,255,0.18)';
  for (let i = 0; i < 12; i++) {
    c.beginPath();
    c.ellipse(30 + Math.random() * 196, 30 + Math.random() * 324, 10, 4, 0.4, 0, Math.PI * 2);
    c.fill();
  }
  return texture(cv);
}

const signCache = new Map<string, THREE.CanvasTexture>();

/** Placa de uma letra com a borda da cor do arco. */
export function signTexture(letter: string, border: string): THREE.CanvasTexture {
  const key = `${letter}|${border}`;
  let t = signCache.get(key);
  if (!t) {
    const [cv, c] = canvas(256, 256);
    drawLetterSign(c, 256, letter, border);
    t = texture(cv);
    signCache.set(key, t);
  }
  return t;
}

/** Placa com um desenho e texto curto (Pit Stop, outdoors). */
export function boardTexture(draw: (c: CanvasRenderingContext2D, w: number, h: number) => void, w = 512, h = 256): THREE.CanvasTexture {
  const [cv, c] = canvas(w, h);
  draw(c, w, h);
  return texture(cv);
}

export function pitBoard(): THREE.CanvasTexture {
  return boardTexture((c, w, h) => {
    roundRect(c, 6, 6, w - 12, h - 12, 40);
    c.fillStyle = '#1E88E5';
    c.fill();
    c.lineWidth = 12;
    c.strokeStyle = '#FFFFFF';
    c.stroke();
    // Chave de boca.
    c.save();
    c.translate(110, h / 2);
    c.rotate(-0.6);
    c.fillStyle = '#FFFFFF';
    roundRect(c, -14, -70, 28, 140, 14);
    c.fill();
    c.beginPath();
    c.arc(0, -78, 34, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#1E88E5';
    c.fillRect(-12, -118, 24, 44);
    c.restore();
    c.fillStyle = '#FFFFFF';
    c.font = `900 130px ${FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('PIT', w * 0.62, h * 0.54);
  });
}

/** Outdoor com estrela e "G" (decoração da pista). */
export function billboard(kind: number): THREE.CanvasTexture {
  const bg = ['#FDD835', '#1E88E5', '#E53935', '#43A047'][kind % 4];
  return boardTexture((c, w, h) => {
    c.fillStyle = bg;
    c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,0.25)';
    for (let i = 0; i < 6; i++) c.fillRect(i * 100 - 40, 0, 40, h);
    c.fillStyle = '#FFFFFF';
    c.font = `900 170px ${FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const marks = ['★ G ★', 'G', '★ ★ ★', '♥ G ♥'];
    c.fillText(marks[kind % 4], w / 2, h * 0.55);
  });
}

/** Caixote de madeira (tábuas e travessa em X). */
export function crateTexture(): THREE.CanvasTexture {
  const [cv, c] = canvas(128, 128);
  c.fillStyle = '#C8A26B';
  c.fillRect(0, 0, 128, 128);
  c.strokeStyle = '#9C7643';
  c.lineWidth = 3;
  for (let y = 32; y < 128; y += 32) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(128, y);
    c.stroke();
  }
  c.strokeStyle = '#7A5530';
  c.lineWidth = 14;
  c.strokeRect(7, 7, 114, 114);
  c.lineWidth = 12;
  c.beginPath();
  c.moveTo(12, 12);
  c.lineTo(116, 116);
  c.stroke();
  c.fillStyle = '#5D4037';
  for (const [x, y] of [
    [14, 14],
    [114, 14],
    [14, 114],
    [114, 114],
  ]) {
    c.beginPath();
    c.arc(x, y, 4, 0, Math.PI * 2);
    c.fill();
  }
  return texture(cv);
}
