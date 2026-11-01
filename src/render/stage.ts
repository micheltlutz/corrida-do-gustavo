// A cena 3D da corrida: pista, cenário, portões das letras, estrelas, lama,
// Pit Stop, largada/chegada, o carro e a câmera atrás dele.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { LANE_W, laneX, type Gate, type Race, type Star, type Zone } from '../game/race.ts';
import { ARCH_COLORS } from './art.ts';
import { bend, bendPoint, bent, lambert } from './bend.ts';
import { Car } from './car.ts';
import { Particles } from './particles.ts';
import { grandstand, Scenery } from './scenery.ts';
import { checkerTexture, CURB, grassTexture, mudTexture, pitBoard, ROAD_HALF, ROAD_TILE, roadTexture, signTexture } from './textures.ts';

const AHEAD = 230;
const BACK = 20;
const SIGN = 2.0;
const SIGN_Y = 2.05;
const ARCH_H = 3.5;

interface GateView {
  g: THREE.Group;
  signs: THREE.Mesh[];
  glow: THREE.Mesh | null;
  arrow: THREE.Mesh | null;
  /** Animações das placas: tempo desde o evento. */
  anim: { lane: number; kind: 'pop' | 'shake' | 'fly'; t: number; from?: THREE.Vector3; done?: (x: number, y: number) => void }[];
}

interface StarView {
  m: THREE.Mesh;
  pop: number;
}

function starShape(r: number): THREE.Shape {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  s.closePath();
  return s;
}

function glowTexture(): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const c = cv.getContext('2d')!;
  const g = c.createRadialGradient(64, 64, 10, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,245,157,1)');
  g.addColorStop(0.5, 'rgba(255,235,59,0.6)');
  g.addColorStop(1, 'rgba(255,235,59,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(cv);
}

export class Stage {
  readonly canvas: HTMLCanvasElement;
  readonly car = new Car();
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(55, 1, 0.1, 500);
  private readonly roadTex = roadTexture();
  private readonly grassTex = grassTexture();
  private readonly road: THREE.Mesh;
  private readonly ground: THREE.Mesh;
  private readonly scenery: Scenery;
  private readonly fx: Particles;
  private readonly gates = new Map<number, GateView>();
  private readonly stars = new Map<number, StarView>();
  private readonly zones = new Map<number, THREE.Object3D>();
  private readonly startLine: THREE.Group;
  private readonly signMats = new Map<string, THREE.MeshBasicMaterial>();
  private readonly archMats = new Map<string, THREE.MeshLambertMaterial>();
  private readonly geo = {
    pillar: new RoundedBoxGeometry(0.3, ARCH_H, 0.3, 2, 0.08),
    beam: new RoundedBoxGeometry(LANE_W - 0.05, 0.4, 0.4, 2, 0.12),
    sign: new THREE.PlaneGeometry(SIGN, SIGN),
    glow: new THREE.PlaneGeometry(SIGN * 1.9, SIGN * 1.9),
    arrow: new THREE.ConeGeometry(0.4, 0.8, 4),
    star: new THREE.ExtrudeGeometry(starShape(0.55), { depth: 0.16, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 1 }),
  };
  private readonly glowMat = new THREE.MeshBasicMaterial({
    map: glowTexture(),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  private readonly starMat = lambert('#FFCA28', { emissive: '#FF8F00', emissiveIntensity: 0.35 });
  private readonly arrowMat = lambert('#FFEB3B', { emissive: '#FFC107', emissiveIntensity: 0.5 });
  private camX = 0;
  /** Torcida das arquibancadas da chegada (pula). */
  private readonly cheer: THREE.InstancedMesh[] = [];
  private fov = 55;
  private t = 0;
  private intro = 1;
  private lastSmoke = 0;
  private readonly v = new THREE.Vector3();
  private readonly v2 = new THREE.Vector3();

  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.canvas = this.renderer.domElement;
    this.canvas.className = 'stage';

    const sky = '#CFEFFD';
    this.scene.background = this.skyTexture();
    this.scene.fog = new THREE.Fog(sky, 60, 175);
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#6d9f45', 2.2));
    const sun = new THREE.DirectionalLight('#fffaf0', 1.6);
    sun.position.set(-4, 10, 6);
    this.scene.add(sun);

    // Chão e pista andam junto com o carro; a textura é que "corre".
    this.grassTex.repeat.set(60, 16);
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(480, AHEAD + BACK, 4, 60), lambert('#ffffff', { map: this.grassTex }));
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = -0.01;
    this.scene.add(this.ground);
    this.roadTex.repeat.set(1, (AHEAD + BACK) / ROAD_TILE);
    this.road = new THREE.Mesh(
      new THREE.PlaneGeometry((ROAD_HALF + CURB) * 2, AHEAD + BACK, 1, 120),
      lambert('#ffffff', { map: this.roadTex }),
    );
    this.road.rotation.x = -Math.PI / 2;
    this.scene.add(this.road);

    this.scenery = new Scenery(this.scene);
    this.fx = new Particles(this.scene);
    this.scene.add(this.car.root);
    this.startLine = this.line(false);
    this.startLine.position.z = -4;
    this.scene.add(this.startLine);
  }

  private skyTexture(): THREE.CanvasTexture {
    const cv = document.createElement('canvas');
    cv.width = 4;
    cv.height = 256;
    const c = cv.getContext('2d')!;
    const g = c.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#3FA9F5');
    g.addColorStop(0.35, '#8FD3FA');
    g.addColorStop(0.5, '#CFEFFD');
    g.addColorStop(1, '#CFEFFD');
    c.fillStyle = g;
    c.fillRect(0, 0, 4, 256);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  private archMat(color: string): THREE.MeshLambertMaterial {
    let m = this.archMats.get(color);
    if (!m) {
      m = lambert(color);
      this.archMats.set(color, m);
    }
    return m;
  }

  private signMat(letter: string, color: string): THREE.MeshBasicMaterial {
    const key = `${letter}|${color}`;
    let m = this.signMats.get(key);
    if (!m) {
      m = bent(new THREE.MeshBasicMaterial({ map: signTexture(letter, color), alphaTest: 0.5, side: THREE.DoubleSide }));
      this.signMats.set(key, m);
    }
    return m;
  }

  /** Faixa xadrez com arco (largada ou chegada), com arquibancadas na chegada. */
  private line(finish: boolean): THREE.Group {
    const g = new THREE.Group();
    const w = (ROAD_HALF + CURB) * 2;
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.4, 1, 2), lambert('#ffffff', { map: checkerTexture(14, 2) }));
    strip.rotation.x = -Math.PI / 2;
    strip.position.y = 0.015;
    g.add(strip);
    const postMat = this.archMat(finish ? '#FDD835' : '#ECEFF1');
    for (const x of [-w / 2 - 0.3, w / 2 + 0.3]) {
      const p = new THREE.Mesh(new RoundedBoxGeometry(0.5, 6.2, 0.5, 2, 0.1), postMat);
      p.position.set(x, 3.1, 0);
      g.add(p);
    }
    const banner = new THREE.Mesh(new RoundedBoxGeometry(w + 1.1, 1.3, 0.4, 2, 0.1), [
      postMat,
      postMat,
      postMat,
      postMat,
      lambert('#ffffff', { map: checkerTexture(16, 2) }),
      lambert('#ffffff', { map: checkerTexture(16, 2) }),
    ]);
    banner.position.y = 6.1;
    g.add(banner);
    return g;
  }

  private makeGate(gate: Gate): GateView {
    const g = new THREE.Group();
    g.position.z = -gate.z;
    const signs: THREE.Mesh[] = [];
    const colors = [...ARCH_COLORS].sort(() => Math.random() - 0.5);
    for (let lane = 0; lane < 3; lane++) {
      const x = laneX(lane);
      const m = this.archMat(colors[lane]);
      for (const dx of [-LANE_W / 2 + 0.17, LANE_W / 2 - 0.17]) {
        const p = new THREE.Mesh(this.geo.pillar, m);
        p.position.set(x + dx, ARCH_H / 2, 0);
        g.add(p);
      }
      const beam = new THREE.Mesh(this.geo.beam, m);
      beam.position.set(x, ARCH_H, 0);
      g.add(beam);
      const sign = new THREE.Mesh(this.geo.sign, this.signMat(gate.letters[lane], colors[lane]));
      sign.position.set(x, SIGN_Y, 0.05);
      g.add(sign);
      signs.push(sign);
    }
    let glow: THREE.Mesh | null = null;
    let arrow: THREE.Mesh | null = null;
    if (gate.hint) {
      // Ajuda depois de um erro: a letra certa brilha e uma seta aponta.
      const lanes = gate.attempt >= 2 ? [0, 1, 2] : [gate.correct];
      for (const lane of lanes) {
        glow = new THREE.Mesh(this.geo.glow, this.glowMat);
        glow.position.set(laneX(lane), SIGN_Y, -0.05);
        g.add(glow);
        arrow = new THREE.Mesh(this.geo.arrow, this.arrowMat);
        arrow.rotation.x = Math.PI;
        arrow.position.set(laneX(lane), ARCH_H + 0.9, 0);
        g.add(arrow);
      }
    }
    this.scene.add(g);
    return { g, signs, glow, arrow, anim: [] };
  }

  private makeZone(z: Zone): THREE.Object3D {
    if (z.kind === 'mud') {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(ROAD_HALF * 2, z.len, 1, 8),
        lambert('#ffffff', { map: mudTexture(), transparent: true, depthWrite: false }),
      );
      m.rotation.x = -Math.PI / 2;
      m.position.set(0, 0.02, -(z.z + z.len / 2));
      this.scene.add(m);
      return m;
    }
    if (z.kind === 'pit') {
      const g = new THREE.Group();
      const w = (ROAD_HALF + CURB) * 2;
      const wallMat = lambert('#ECEFF1');
      const blue = lambert('#1E88E5');
      for (const side of [-1, 1]) {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(2, 5, z.len + 4), wallMat);
        wall.position.set(side * (w / 2 + 1), 2.5, -(z.len + 4) / 2);
        g.add(wall);
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.6, z.len + 4.05), blue);
        stripe.position.set(side * (w / 2 + 1), 1.2, -(z.len + 4) / 2);
        g.add(stripe);
      }
      const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 4.4, 1, z.len + 4), blue);
      roof.position.set(0, 5.5, -(z.len + 4) / 2);
      g.add(roof);
      // Por dentro do teto, mais escuro (dá a ideia de entrar na garagem).
      const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w + 2, z.len + 4), lambert('#37474F', { side: THREE.DoubleSide }));
      ceil.rotation.x = Math.PI / 2;
      ceil.position.set(0, 4.99, -(z.len + 4) / 2);
      g.add(ceil);
      const board = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.5), lambert('#ffffff', { map: pitBoard(), emissive: '#ffffff', emissiveIntensity: 0.2 }));
      board.position.set(0, 7.6, 0.2);
      g.add(board);
      g.position.z = -z.z;
      this.scene.add(g);
      return g;
    }
    const g = this.line(true);
    for (const side of [-1, 1]) {
      const st = grandstand();
      st.position.set(side * (ROAD_HALF + CURB + 9), 0, 6);
      st.rotation.y = (-side * Math.PI) / 2;
      g.add(st);
      this.cheer.push(st.userData.fans as THREE.InstancedMesh);
    }
    g.position.z = -z.z;
    this.scene.add(g);
    return g;
  }

  private makeStar(s: Star): StarView {
    const m = new THREE.Mesh(this.geo.star, this.starMat);
    m.position.set(laneX(s.lane), 1.1, -s.z);
    this.scene.add(m);
    return { m, pop: 0 };
  }

  /** Corrida nova: limpa tudo e põe o carro na largada. */
  reset(): void {
    for (const v of this.gates.values()) this.scene.remove(v.g);
    for (const v of this.stars.values()) this.scene.remove(v.m);
    for (const v of this.zones.values()) this.scene.remove(v);
    this.cheer.length = 0;
    this.gates.clear();
    this.stars.clear();
    this.zones.clear();
    this.scenery.reset();
    this.camX = 0;
    this.intro = 1;
    this.car.root.rotation.set(0, 0, 0);
    this.car.root.position.set(0, 0, 0);
  }

  resize(w: number, h: number): void {
    this.renderer.setSize(w, h, false);
    const aspect = w / Math.max(1, h);
    this.camera.aspect = aspect;
    // Em pé, abre o ângulo para caberem as 3 faixas.
    const minHalfH = THREE.MathUtils.degToRad(27);
    const v = 2 * Math.atan(Math.tan(minHalfH) / aspect);
    this.fov = Math.max(55, THREE.MathUtils.radToDeg(v));
    this.camera.fov = this.fov;
    this.camera.updateProjectionMatrix();
  }

  /** Onde um ponto do mundo aparece na tela (pixels do canvas em CSS). */
  toScreen(p: THREE.Vector3): { x: number; y: number } {
    const v = bendPoint(this.v2.copy(p)).project(this.camera);
    const r = this.canvas.getBoundingClientRect();
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
  }

  // ---------- reações aos eventos da corrida ----------

  /** Pegou a letra: a placa estoura (ou voa até o carro, no ímã) e avisa onde ela está na tela. */
  signHit(gate: Gate, magnet: boolean, done: (x: number, y: number) => void): void {
    const v = this.gates.get(gate.id);
    if (!v) return;
    const lane = magnet ? gate.correct : gate.lane;
    for (let l = 0; l < 3; l++) if (l !== lane) v.anim.push({ lane: l, kind: 'pop', t: 0 });
    if (magnet) {
      v.anim.push({ lane, kind: 'fly', t: 0, from: v.signs[lane].getWorldPosition(new THREE.Vector3()), done });
    } else {
      const p = v.signs[lane].getWorldPosition(new THREE.Vector3());
      v.signs[lane].visible = false;
      this.fx.confetti(p, 34, 5);
      const s = this.toScreen(p);
      done(s.x, s.y);
    }
    if (v.glow) v.glow.visible = false;
    if (v.arrow) v.arrow.visible = false;
  }

  signMiss(gate: Gate): void {
    const v = this.gates.get(gate.id);
    if (v) v.anim.push({ lane: gate.lane, kind: 'shake', t: 0 });
  }

  starTaken(star: Star): void {
    const v = this.stars.get(star.id);
    if (!v) return;
    v.pop = 0.001;
    this.fx.sparkle(v.m.position, '#FFEB3B', 16);
  }

  mudSplash(race: Race): void {
    for (let i = 0; i < 3; i++) this.fx.mud(this.v.set(race.x, 0.3, -race.dist - 1 - i));
  }

  /** Confete de festa em volta do carro. */
  party(race: Race): void {
    this.fx.confetti(this.v.set(race.x - 2, 1, -race.dist - 3), 60, 7);
    this.fx.confetti(this.v.set(race.x + 2, 1, -race.dist - 3), 60, 7);
  }

  carScreen(race: Race): { x: number; y: number } {
    return this.toScreen(this.v.set(race.x, 1.2, -race.dist));
  }

  // ---------- quadro a quadro ----------

  private sync(race: Race): void {
    const seen = new Set<number>();
    for (const g of race.gates) {
      seen.add(g.id);
      if (!this.gates.has(g.id)) this.gates.set(g.id, this.makeGate(g));
    }
    for (const [id, v] of this.gates) {
      if (!seen.has(id)) {
        this.scene.remove(v.g);
        this.gates.delete(id);
      }
    }
    seen.clear();
    for (const s of race.stars) {
      seen.add(s.id);
      if (!this.stars.has(s.id)) this.stars.set(s.id, this.makeStar(s));
    }
    for (const [id, v] of this.stars) {
      if (!seen.has(id)) {
        this.scene.remove(v.m);
        this.stars.delete(id);
      }
    }
    seen.clear();
    for (const z of race.zones) {
      seen.add(z.id);
      if (!this.zones.has(z.id)) this.zones.set(z.id, this.makeZone(z));
    }
    for (const [id, v] of this.zones) {
      if (!seen.has(id)) {
        this.scene.remove(v);
        this.zones.delete(id);
      }
    }
  }

  private animate(dt: number, race: Race): void {
    for (const v of this.gates.values()) {
      if (v.glow) {
        const s = 1 + Math.sin(this.t * 6) * 0.12;
        v.glow.scale.set(s, s, 1);
      }
      if (v.arrow) v.arrow.position.y = ARCH_H + 0.9 + Math.abs(Math.sin(this.t * 5)) * 0.5;
      for (const a of v.anim) {
        if (a.t < 0) continue;
        a.t += dt;
        const sign = v.signs[a.lane];
        if (a.kind === 'pop') {
          const k = Math.min(1, a.t / 0.3);
          const s = k < 0.3 ? 1 + k : Math.max(0, 1.3 * (1 - (k - 0.3) / 0.7));
          sign.scale.set(s, s, 1);
          if (k >= 1) a.t = -1;
        } else if (a.kind === 'shake') {
          sign.rotation.z = Math.sin(a.t * 30) * 0.3 * Math.max(0, 1 - a.t / 0.8);
          if (a.t > 0.8) a.t = -1;
        } else if (a.kind === 'fly') {
          // Do arco até o carro (posição do mundo; o grupo do portão não se mexe).
          const k = Math.min(1, a.t / 0.45);
          const e = k * k * (3 - 2 * k);
          this.v.set(race.x, 1.4, -race.dist).sub(v.g.position);
          const from = this.v2.copy(a.from!).sub(v.g.position);
          sign.position.lerpVectors(from, this.v, e);
          sign.position.y += Math.sin(k * Math.PI) * 1.5;
          const s = 1 - e * 0.5;
          sign.scale.set(s, s, 1);
          sign.rotation.z = e * Math.PI * 2;
          if (k >= 1) {
            sign.visible = false;
            this.fx.sparkle(this.v.set(race.x, 1.4, -race.dist), '#FFEB3B', 20);
            const p = this.carScreen(race);
            a.done?.(p.x, p.y);
            a.t = -1;
          }
        }
      }
    }
    for (const s of this.stars.values()) {
      s.m.rotation.y = this.t * 3;
      s.m.position.y = 1.1 + Math.sin(this.t * 4 + s.m.position.z) * 0.12;
      if (s.pop > 0) {
        s.pop += dt;
        const k = Math.min(1, s.pop / 0.25);
        const sc = 1 - k;
        s.m.scale.set(sc, sc, sc);
        s.m.position.y += k * 1.2;
        if (k >= 1) s.m.visible = false;
      }
    }
  }

  /** Desenha um quadro. */
  render(dt: number, race: Race): void {
    this.t += dt;
    this.sync(race);
    const carZ = -race.dist;
    bend.carZ.value = carZ;
    // Curvas: vão e voltam conforme a pista anda.
    bend.x.value = 0.0007 * Math.sin(race.dist / 140) * Math.min(1, race.dist / 60);

    this.road.position.set(0, 0, carZ - (AHEAD - BACK) / 2);
    this.ground.position.set(0, -0.01, carZ - (AHEAD - BACK) / 2);
    // A textura corre para o carro (o pedaço do mundo fica parado).
    this.roadTex.offset.y = (race.dist / ROAD_TILE) % 1;
    this.grassTex.offset.y = ((race.dist / (AHEAD + BACK)) * 16) % 1;
    this.scenery.update(carZ, dt);

    // Carro.
    const finishing = race.phase === 'finish' || race.phase === 'done';
    const root = this.car.root;
    root.position.set(race.x, 0, carZ);
    if (finishing) {
      // Cavalo de pau depois de frear.
      const k = Math.max(0, race.finishT - 1.1);
      const spin = Math.min(k, 3) / 3;
      root.rotation.y = spin * Math.PI * 4 * (1 - spin * 0.25);
      root.position.x += Math.sin(root.rotation.y) * 0.9 * Math.min(1, k);
      root.position.z += (1 - Math.cos(root.rotation.y)) * 0.9 * Math.min(1, k);
      if (k > 0 && k < 3 && this.t - this.lastSmoke > 0.04) {
        this.lastSmoke = this.t;
        root.localToWorld(this.v.set(0.7 * (Math.random() < 0.5 ? -1 : 1), 0.3, 0.9));
        this.fx.puff(this.v, this.v2.set((Math.random() - 0.5) * 2, 1, (Math.random() - 0.5) * 2));
      }
    } else {
      root.rotation.y = 0;
    }
    this.car.update(dt, {
      speed: finishing && race.finishT > 1.1 && race.finishT < 4.1 ? 20 : race.speed,
      steer: laneX(race.lane) - race.x,
      wobble: race.wobbleT / 0.9,
      turbo: race.turboT > 0,
      magnet: race.magnet,
      muddy: race.muddy,
    });

    this.animate(dt, race);
    for (const f of this.cheer) f.position.y = Math.abs(Math.sin(this.t * 9)) * 0.3;
    this.fx.update(dt);
    this.updateCamera(dt, race);
    this.renderer.render(this.scene, this.camera);
  }

  private updateCamera(dt: number, race: Race): void {
    const carZ = -race.dist;
    const cam = this.camera;
    const portrait = cam.aspect < 1;
    const back = portrait ? 7.0 : 6.6;
    const up = portrait ? 3.4 : 3.0;
    this.camX += (race.x * 0.55 - this.camX) * Math.min(1, dt * 4);
    let fov = this.fov + (race.turboT > 0 ? 9 : 0);
    if (race.phase === 'ready') {
      // Antes da largada: câmera desce de cima até atrás do carro.
      this.intro = Math.max(0, this.intro - dt * 0.45);
    } else {
      this.intro = Math.max(0, this.intro - dt * 1.2);
    }
    const e = this.intro * this.intro;
    if (race.phase === 'finish' || race.phase === 'done') {
      // Gira em volta do carro.
      const k = Math.min(1, race.finishT / 1.2);
      const a = Math.min(race.finishT * 0.5, 2.5);
      const side = race.x > 0.1 ? -1 : 1;
      const r = back + 0.6;
      const ox = side * Math.sin(a) * r * k + (this.camX - race.x) * (1 - k);
      const oz = Math.cos(a) * r * k + back * (1 - k);
      cam.position.set(race.x + ox, up + 1.4 * k, carZ + oz);
      cam.lookAt(race.x, 0.9, carZ);
      fov = this.fov;
    } else {
      cam.position.set(this.camX, up + e * 6, carZ + back + e * 9);
      cam.lookAt(this.camX + (race.x - this.camX) * 0.4, 0.9, carZ - 8);
    }
    if (Math.abs(cam.fov - fov) > 0.05) {
      cam.fov += (fov - cam.fov) * Math.min(1, dt * 5);
      cam.updateProjectionMatrix();
    }
  }
}
