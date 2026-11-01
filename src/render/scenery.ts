// Cenário que se repete ao longo da pista: árvores, arbustos, cones,
// arquibancadas com torcida, outdoors, nuvens e morros. Quando uma coisa fica
// para trás do carro, ela pula lá para a frente.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { lambert } from './bend.ts';
import { billboard, CURB, ROAD_HALF } from './textures.ts';

export const SPAN = 260;
export const BEHIND = 25;
const EDGE = ROAD_HALF + CURB;

interface Item {
  z: number;
  x: number;
  s: number;
  r: number;
}

function rand(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

/** Um grupo de instâncias (mesma forma) que se recicla ao longo da pista. */
class Instances {
  readonly items: Item[] = [];
  private readonly meshes: THREE.InstancedMesh[];
  private readonly place: (it: Item, first: boolean) => void;
  private readonly offsets: { y: number; sy: number }[];
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly v = new THREE.Vector3();
  private readonly sc = new THREE.Vector3();

  constructor(
    parts: { geo: THREE.BufferGeometry; mat: THREE.Material; y?: number; sy?: number; colors?: string[] }[],
    count: number,
    place: (it: Item, first: boolean) => void,
    scene: THREE.Scene,
  ) {
    this.place = place;
    this.offsets = parts.map((p) => ({ y: p.y ?? 0, sy: p.sy ?? 1 }));
    this.meshes = parts.map((p) => {
      const mesh = new THREE.InstancedMesh(p.geo, p.mat, count);
      mesh.frustumCulled = false;
      if (p.colors) {
        const c = new THREE.Color();
        for (let i = 0; i < count; i++) mesh.setColorAt(i, c.set(p.colors[i % p.colors.length]));
      }
      scene.add(mesh);
      return mesh;
    });
    for (let i = 0; i < count; i++) {
      const it: Item = { z: 0, x: 0, s: 1, r: 0 };
      place(it, true);
      this.items.push(it);
    }
    this.write();
  }

  update(carZ: number): void {
    let changed = false;
    for (const it of this.items) {
      if (it.z > carZ + BEHIND) {
        it.z -= SPAN;
        this.place(it, false);
        changed = true;
      }
    }
    if (changed) this.write();
  }

  /** Recomeça (corrida nova a partir do zero). */
  reset(): void {
    for (const it of this.items) this.place(it, true);
    this.write();
  }

  private write(): void {
    this.items.forEach((it, i) => {
      this.meshes.forEach((mesh, k) => {
        const o = this.offsets[k];
        this.q.setFromAxisAngle(this.v.set(0, 1, 0), it.r);
        this.v.set(it.x, o.y * it.s, it.z);
        this.sc.set(it.s, it.s * o.sy, it.s);
        this.m.compose(this.v, this.q, this.sc);
        mesh.setMatrixAt(i, this.m);
      });
    });
    for (const mesh of this.meshes) mesh.instanceMatrix.needsUpdate = true;
  }
}

/** Arquibancada com torcida colorida e bandeirinhas. */
export function grandstand(): THREE.Group {
  const g = new THREE.Group();
  const steps = lambert('#B0BEC5');
  const roof = lambert('#1E88E5');
  for (let i = 0; i < 4; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(14, 0.6, 1.2), steps);
    b.position.set(0, 0.3 + i * 0.6, -i * 1.1);
    b.scale.y = 1 + i;
    b.position.y = (0.6 * (1 + i)) / 2;
    g.add(b);
  }
  const back = new THREE.Mesh(new THREE.BoxGeometry(14, 4.4, 0.3), lambert('#90A4AE'));
  back.position.set(0, 2.2, -4);
  g.add(back);
  const top = new THREE.Mesh(new THREE.BoxGeometry(15, 0.25, 5.4), roof);
  top.position.set(0, 4.5, -1.8);
  g.add(top);
  for (const x of [-7, 7]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.25, 4.5, 0.25), lambert('#ECEFF1'));
    post.position.set(x, 2.25, 0.4);
    g.add(post);
  }
  // Torcida: bolinhas coloridas em cada degrau.
  const fans = new THREE.InstancedMesh(new THREE.SphereGeometry(0.28, 8, 6), lambert('#ffffff'), 52);
  const m = new THREE.Matrix4();
  const c = new THREE.Color();
  const colors = ['#E53935', '#FDD835', '#1E88E5', '#43A047', '#FB8C00', '#8E24AA', '#FFFFFF', '#F06292'];
  for (let i = 0; i < 52; i++) {
    const row = i % 4;
    const col = Math.floor(i / 4);
    m.makeTranslation(-6.2 + col * 1.0 + (row % 2) * 0.4, 0.6 * (1 + row) + 0.3, -row * 1.1);
    fans.setMatrixAt(i, m);
    fans.setColorAt(i, c.set(colors[(i * 7) % colors.length]));
  }
  fans.frustumCulled = false;
  g.add(fans);
  g.userData.fans = fans;
  // Bandeirinhas no telhado.
  const flagColors = ['#E53935', '#FDD835', '#1E88E5', '#43A047'];
  for (let i = 0; i < 7; i++) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.8, 3), lambert(flagColors[i % 4]));
    f.rotation.z = Math.PI;
    f.position.set(-6.6 + i * 2.2, 4.25, 0.7);
    g.add(f);
  }
  return g;
}

function cloud(): THREE.Group {
  const g = new THREE.Group();
  const m = new THREE.MeshLambertMaterial({ color: '#FFFFFF', fog: false, emissive: '#FFFFFF', emissiveIntensity: 0.35 });
  const puffs = [
    [0, 0, 4],
    [4, -0.6, 3],
    [-4, -0.8, 2.8],
    [1.8, 1.8, 2.8],
    [-1.8, 1.4, 2.6],
  ];
  for (const [x, y, r] of puffs) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), m);
    s.position.set(x, y, 0);
    s.scale.z = 0.6;
    g.add(s);
  }
  return g;
}

export class Scenery {
  private readonly groups: Instances[] = [];
  private readonly stands: { g: THREE.Group; z: number; side: number }[] = [];
  private readonly boards: { g: THREE.Group; z: number; side: number }[] = [];
  private readonly sky = new THREE.Group();
  private readonly clouds: THREE.Group[] = [];
  private t = 0;

  constructor(scene: THREE.Scene) {
    const side = () => (Math.random() < 0.5 ? -1 : 1);
    const spread = (it: Item, first: boolean) => {
      if (first) it.z = rand(-SPAN + BEHIND, BEHIND);
    };
    // Árvores: tronco e copa.
    const trunk = new THREE.CylinderGeometry(0.22, 0.3, 1.6, 7);
    trunk.translate(0, 0.8, 0);
    const crown = new THREE.IcosahedronGeometry(1.3, 1);
    crown.translate(0, 2.6, 0);
    this.groups.push(
      new Instances(
        [
          { geo: trunk, mat: lambert('#8D6E63') },
          { geo: crown, mat: lambert('#ffffff', { flatShading: true }), colors: ['#43A047', '#66BB6A', '#2E7D32', '#7CB342', '#388E3C'] },
        ],
        90,
        (it, first) => {
          spread(it, first);
          const far = Math.random() < 0.6;
          it.x = side() * (EDGE + (far ? rand(9, 40) : rand(3.5, 8)));
          it.s = rand(0.8, 1.7);
          it.r = rand(0, 6);
        },
        scene,
      ),
    );
    // Pinheiros (cone).
    const pine = new THREE.ConeGeometry(1.2, 3.4, 7);
    pine.translate(0, 2.4, 0);
    const pineTrunk = new THREE.CylinderGeometry(0.2, 0.25, 0.8, 6);
    pineTrunk.translate(0, 0.4, 0);
    this.groups.push(
      new Instances(
        [
          { geo: pineTrunk, mat: lambert('#795548') },
          { geo: pine, mat: lambert('#ffffff', { flatShading: true }), colors: ['#2E7D32', '#388E3C', '#1B5E20'] },
        ],
        40,
        (it, first) => {
          spread(it, first);
          it.x = side() * (EDGE + rand(12, 45));
          it.s = rand(1, 2);
          it.r = rand(0, 6);
        },
        scene,
      ),
    );
    // Arbustos com florzinhas perto da pista.
    const bush = new THREE.IcosahedronGeometry(0.7, 1);
    bush.translate(0, 0.35, 0);
    const flower = new THREE.SphereGeometry(0.14, 6, 5);
    flower.translate(0.35, 0.95, 0.35);
    this.groups.push(
      new Instances(
        [
          { geo: bush, mat: lambert('#ffffff', { flatShading: true }), colors: ['#558B2F', '#689F38', '#33691E'] },
          { geo: flower, mat: lambert('#ffffff'), colors: ['#F06292', '#FFEB3B', '#FFFFFF', '#BA68C8'] },
        ],
        50,
        (it, first) => {
          spread(it, first);
          it.x = side() * (EDGE + rand(1.4, 3.2));
          it.s = rand(0.7, 1.3);
          it.r = rand(0, 6);
        },
        scene,
      ),
    );
    // Cones e pilhas de pneus na beirada.
    const cone = new THREE.ConeGeometry(0.28, 0.75, 12);
    cone.translate(0, 0.375, 0);
    const coneBand = new THREE.CylinderGeometry(0.17, 0.2, 0.12, 12);
    coneBand.translate(0, 0.42, 0);
    this.groups.push(
      new Instances(
        [
          { geo: cone, mat: lambert('#FF7043') },
          { geo: coneBand, mat: lambert('#FFFFFF') },
        ],
        26,
        (it, first) => {
          spread(it, first);
          it.x = side() * (EDGE + 0.6);
          it.s = 1;
        },
        scene,
      ),
    );
    const tyre = new THREE.TorusGeometry(0.38, 0.17, 8, 16);
    tyre.rotateX(Math.PI / 2);
    const tyreStack: { geo: THREE.BufferGeometry; mat: THREE.Material; y: number; colors: string[] }[] = [];
    for (let k = 0; k < 3; k++) {
      tyreStack.push({ geo: tyre, mat: lambert('#ffffff'), y: 0.17 + k * 0.32, colors: k === 1 ? ['#E53935', '#FFFFFF'] : ['#37474F'] });
    }
    this.groups.push(
      new Instances(
        tyreStack,
        14,
        (it, first) => {
          spread(it, first);
          it.x = side() * (EDGE + rand(4.5, 6.5));
          it.s = 1;
        },
        scene,
      ),
    );

    // Arquibancadas e outdoors (poucos, grandes).
    for (let i = 0; i < 2; i++) {
      const g = grandstand();
      scene.add(g);
      this.stands.push({ g, z: 0, side: i ? 1 : -1 });
    }
    for (let i = 0; i < 3; i++) {
      const g = new THREE.Group();
      const board = new THREE.Mesh(
        new RoundedBoxGeometry(6, 3, 0.25, 2, 0.1),
        [lambert('#ECEFF1'), lambert('#ECEFF1'), lambert('#ECEFF1'), lambert('#ECEFF1'), lambert('#ffffff', { map: billboard(i) }), lambert('#ECEFF1')],
      );
      board.position.y = 3.6;
      g.add(board);
      for (const x of [-2, 2]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.2, 0.25), lambert('#78909C'));
        post.position.set(x, 1.1, -0.1);
        g.add(post);
      }
      scene.add(g);
      this.boards.push({ g, z: 0, side: i % 2 ? 1 : -1 });
    }

    // Céu: nuvens e morros longe (andam junto com o carro).
    for (let i = 0; i < 9; i++) {
      const c = cloud();
      c.position.set(rand(-170, 170), rand(26, 48), -rand(150, 210));
      const s = rand(0.9, 1.8);
      c.scale.set(s, s, s);
      this.sky.add(c);
      this.clouds.push(c);
    }
    const hillMat = new THREE.MeshLambertMaterial({ color: '#A5D6A7', fog: false });
    const hillMat2 = new THREE.MeshLambertMaterial({ color: '#C5E1A5', fog: false });
    for (let i = 0; i < 12; i++) {
      const r = rand(28, 60);
      const h = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 12), i % 2 ? hillMat : hillMat2);
      h.position.set(-230 + i * 42 + rand(-10, 10), -r * rand(0.45, 0.62), -rand(200, 240));
      h.scale.z = 0.5;
      this.sky.add(h);
    }
    scene.add(this.sky);
    this.reset();
  }

  reset(): void {
    for (const g of this.groups) g.reset();
    this.stands.forEach((s, i) => (s.z = -60 - i * 130));
    this.boards.forEach((b, i) => (b.z = -30 - i * 87));
    this.update(0, 0);
  }

  update(carZ: number, dt: number): void {
    this.t += dt;
    for (const g of this.groups) g.update(carZ);
    for (const s of this.stands) {
      if (s.z > carZ + BEHIND + 10) s.z -= SPAN;
      s.g.position.set(s.side * (EDGE + 9), 0, s.z);
      s.g.rotation.y = (-s.side * Math.PI) / 2;
      // Torcida pulando.
      const fans = s.g.userData.fans as THREE.InstancedMesh;
      fans.position.y = Math.abs(Math.sin(this.t * 6)) * 0.12;
    }
    for (const b of this.boards) {
      if (b.z > carZ + BEHIND) b.z -= SPAN;
      b.g.position.set(b.side * (EDGE + 6.5), 0, b.z);
      b.g.rotation.y = -b.side * 0.5;
    }
    this.sky.position.z = carZ;
    for (const c of this.clouds) {
      c.position.x += dt * 1.2;
      if (c.position.x > 190) c.position.x = -190;
    }
  }
}
