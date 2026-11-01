// O carro de corrida do Gustavo em 3D, montado com peças simples:
// vermelho, faixa amarela, aerofólio, o G na porta e olhinhos nas janelas.
// A frente aponta para -z.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { StickerId } from '../storage.ts';
import { CAR_RED, roundelSvg, STRIPE, stickerSvg, svgImage } from './art.ts';

const mat = (color: THREE.ColorRepresentation, extra: THREE.MeshLambertMaterialParameters = {}) =>
  new THREE.MeshLambertMaterial({ color, ...extra });

function svgTexture(svg: string, size = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  void svgImage(svg).then((img) => {
    const c = canvas.getContext('2d')!;
    c.clearRect(0, 0, size, size);
    c.drawImage(img, 0, 0, size, size);
    tex.needsUpdate = true;
  });
  return tex;
}

/** Olho desenhado (branco com pupila e brilho). */
function eyeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.ellipse(64, 64, 46, 58, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#263238';
  c.beginPath();
  c.ellipse(70, 70, 24, 30, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.arc(78, 58, 9, 0, Math.PI * 2);
  c.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class Car {
  readonly root = new THREE.Group();
  /** Corpo (balança e inclina sem mexer na sombra). */
  readonly body = new THREE.Group();
  private readonly wheels: THREE.Group[] = [];
  private readonly flames: THREE.Mesh[] = [];
  private readonly mud = new THREE.Group();
  private readonly aura: THREE.Mesh;
  private readonly sticker: THREE.Mesh;
  private stickerId: StickerId | null = null;
  private spin = 0;
  private t = 0;

  constructor() {
    const red = mat(CAR_RED);
    const glass = mat('#2B3A55');
    const yellow = mat(STRIPE);
    const black = mat('#263238');
    const grey = mat('#CFD8DC');
    const darkGrey = mat('#546E7A');

    const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = this.body) => {
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    };

    // Chassi, cabine com janelas (a janela é uma faixa um pouco para fora da cabine).
    add(new RoundedBoxGeometry(1.5, 0.5, 2.7, 4, 0.2), red, 0, 0.47, 0);
    add(new RoundedBoxGeometry(1.17, 0.3, 1.24, 4, 0.12), glass, 0, 0.92, 0.22);
    add(new RoundedBoxGeometry(1.12, 0.52, 1.18, 4, 0.22), red, 0, 0.95, 0.22);
    // Faixa amarela no capô, no teto e na tampa de trás.
    add(new THREE.BoxGeometry(0.3, 0.04, 0.9), yellow, 0, 0.72, -0.86);
    add(new THREE.BoxGeometry(0.3, 0.04, 0.5), yellow, 0, 0.72, 1.06);
    add(new THREE.BoxGeometry(0.3, 0.04, 1.05), yellow, 0, 1.21, 0.22);
    // Aerofólio.
    add(new RoundedBoxGeometry(1.56, 0.1, 0.42, 2, 0.04), yellow, 0, 1.06, 1.18);
    for (const sx of [-0.48, 0.48]) add(new THREE.BoxGeometry(0.08, 0.36, 0.12), black, sx, 0.86, 1.18);
    // Faróis e lanternas.
    for (const sx of [-0.48, 0.48]) {
      add(new THREE.BoxGeometry(0.32, 0.13, 0.05), mat('#FFF59D', { emissive: '#FFF176', emissiveIntensity: 0.6 }), sx, 0.55, -1.36);
      add(new THREE.BoxGeometry(0.34, 0.13, 0.05), mat('#FF1744', { emissive: '#FF1744', emissiveIntensity: 0.7 }), sx, 0.56, 1.36);
    }
    // Escapamentos e o fogo do turbo.
    for (const sx of [-0.3, 0.3]) {
      const pipe = add(new THREE.CylinderGeometry(0.075, 0.075, 0.22, 12), darkGrey, sx, 0.3, 1.38);
      pipe.rotation.x = Math.PI / 2;
      // Fogo: cone laranja por fora e amarelo por dentro.
      const flame = add(new THREE.ConeGeometry(0.17, 0.95, 12), new THREE.MeshBasicMaterial({ color: '#FF6D00' }), sx, 0.3, 1.92);
      flame.rotation.x = -Math.PI / 2;
      const core = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.6, 10), new THREE.MeshBasicMaterial({ color: '#FFEB3B' }));
      core.position.y = -0.12;
      flame.add(core);
      flame.visible = false;
      this.flames.push(flame);
    }
    // Rodas.
    const tire = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 22);
    tire.rotateZ(Math.PI / 2);
    const hub = new THREE.CylinderGeometry(0.17, 0.17, 0.32, 14);
    hub.rotateZ(Math.PI / 2);
    for (const [x, z] of [
      [-0.72, -0.86],
      [0.72, -0.86],
      [-0.72, 0.88],
      [0.72, 0.88],
    ]) {
      const w = new THREE.Group();
      w.position.set(x, 0.36, z);
      w.add(new THREE.Mesh(tire, black));
      const h = new THREE.Mesh(hub, grey);
      w.add(h);
      // Um raio na calota, para ver a roda girando.
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.06, 0.3), yellow);
      w.add(spoke);
      this.body.add(w);
      this.wheels.push(w);
    }
    // O G nas portas e os olhos nas janelas laterais.
    const roundel = new THREE.MeshLambertMaterial({ map: svgTexture(roundelSvg(256)), transparent: true });
    const eye = new THREE.MeshBasicMaterial({ map: eyeTexture(), transparent: true });
    for (const side of [-1, 1]) {
      const r = add(new THREE.CircleGeometry(0.25, 24), roundel, side * 0.762, 0.47, -0.15);
      r.rotation.y = (side * Math.PI) / 2;
      for (const dz of [-0.04, 0.26]) {
        const e = add(new THREE.PlaneGeometry(0.2, 0.25), eye, side * 0.592, 0.94, dz);
        e.rotation.y = (side * Math.PI) / 2;
      }
    }
    // Adesivo no teto (o que ele escolheu no Pit Stop).
    this.sticker = add(new THREE.PlaneGeometry(0.72, 0.72), new THREE.MeshLambertMaterial({ transparent: true }), 0, 1.235, 0.22);
    this.sticker.rotation.x = -Math.PI / 2;
    this.sticker.visible = false;
    // Lama (aparece depois da poça).
    const mudMat = mat('#6D4C41');
    for (let i = 0; i < 16; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.12 + (i % 3) * 0.05, 8, 6), mudMat);
      const side = i % 2 ? 1 : -1;
      if (i < 10) s.position.set(side * 0.74, 0.3 + (i % 4) * 0.1, -1.1 + (i / 10) * 2.2);
      else s.position.set(-0.5 + (i - 10) * 0.2, 0.7 + (i % 2) * 0.02, -1 + (i % 3) * 0.9);
      s.scale.set(i < 10 ? 0.35 : 1, i < 10 ? 1 : 0.3, 1);
      this.mud.add(s);
    }
    this.mud.visible = false;
    this.body.add(this.mud);
    // Brilho do ímã do turbo.
    this.aura = new THREE.Mesh(
      new THREE.TorusGeometry(1.75, 0.07, 8, 48),
      new THREE.MeshBasicMaterial({ color: '#FFEB3B', transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    this.aura.rotation.x = Math.PI / 2;
    this.aura.position.y = 0.55;
    this.aura.visible = false;
    this.root.add(this.aura);
    // Sombra redonda.
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(1, 32),
      new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.25, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.set(0.95, 1.6, 1);
    shadow.position.y = 0.02;
    this.root.add(shadow);
    this.root.add(this.body);
  }

  setSticker(id: StickerId | null): void {
    if (id === this.stickerId) return;
    this.stickerId = id;
    const m = this.sticker.material as THREE.MeshLambertMaterial;
    m.map?.dispose();
    m.map = id ? svgTexture(stickerSvg(id, 256)) : null;
    m.needsUpdate = true;
    this.sticker.visible = !!id;
  }

  /**
   * Anima o carro: rodas pela velocidade, inclinação ao trocar de faixa,
   * balanço do erro, fogo do turbo, brilho do ímã e a lama.
   */
  update(dt: number, o: { speed: number; steer: number; wobble: number; turbo: boolean; magnet: boolean; muddy: boolean }): void {
    this.t += dt;
    this.spin += (o.speed * dt) / 0.36;
    for (const w of this.wheels) w.rotation.x = -this.spin;
    // Vira um pouco para o lado da faixa nova e inclina.
    this.body.rotation.y = THREE.MathUtils.clamp(-o.steer * 0.12, -0.35, 0.35);
    this.body.rotation.z = THREE.MathUtils.clamp(o.steer * 0.05, -0.12, 0.12);
    // Erro: pneus balançando.
    if (o.wobble > 0) {
      const k = o.wobble;
      this.body.rotation.z += Math.sin(this.t * 38) * 0.09 * k;
      this.body.rotation.y += Math.sin(this.t * 24) * 0.12 * k;
      this.body.position.y = Math.abs(Math.sin(this.t * 19)) * 0.18 * k;
    } else {
      // Motor ligado: tremidinha.
      this.body.position.y = Math.sin(this.t * 40) * 0.008 * Math.min(1, o.speed / 5);
    }
    for (const f of this.flames) {
      f.visible = o.turbo;
      if (o.turbo) f.scale.set(1, 0.7 + Math.random() * 0.6, 1);
    }
    this.aura.visible = o.magnet;
    if (o.magnet) {
      this.aura.rotation.z += dt * 3;
      const s = 1 + Math.sin(this.t * 8) * 0.06;
      this.aura.scale.set(s, s, 1);
    }
    this.mud.visible = o.muddy;
  }
}
