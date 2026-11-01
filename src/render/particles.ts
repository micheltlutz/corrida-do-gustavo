// Partículas simples: confete, brilhos, respingos de lama e fumaça dos pneus.

import * as THREE from 'three';

interface P {
  alive: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rot: THREE.Euler;
  spin: THREE.Vector3;
  life: number;
  max: number;
  size: number;
  grow: number;
  gravity: number;
}

class Pool {
  readonly mesh: THREE.InstancedMesh;
  private readonly ps: P[] = [];
  private next = 0;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly s = new THREE.Vector3();
  private readonly c = new THREE.Color();

  constructor(geo: THREE.BufferGeometry, mat: THREE.Material, count: number) {
    this.mesh = new THREE.InstancedMesh(geo, mat, count);
    this.mesh.frustumCulled = false;
    for (let i = 0; i < count; i++) {
      this.ps.push({
        alive: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        rot: new THREE.Euler(),
        spin: new THREE.Vector3(),
        life: 0,
        max: 1,
        size: 1,
        grow: 0,
        gravity: 0,
      });
      this.mesh.setMatrixAt(i, this.m.makeScale(0, 0, 0));
      this.mesh.setColorAt(i, this.c.set('#fff'));
    }
  }

  emit(pos: THREE.Vector3, vel: THREE.Vector3, color: string, o: { life: number; size: number; grow?: number; gravity?: number }): void {
    const i = this.next;
    this.next = (this.next + 1) % this.ps.length;
    const p = this.ps[i];
    p.alive = true;
    p.pos.copy(pos);
    p.vel.copy(vel);
    p.rot.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    p.spin.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14);
    p.life = 0;
    p.max = o.life;
    p.size = o.size;
    p.grow = o.grow ?? 0;
    p.gravity = o.gravity ?? 9;
    this.mesh.setColorAt(i, this.c.set(color));
    this.mesh.instanceColor!.needsUpdate = true;
  }

  update(dt: number): void {
    let any = false;
    this.ps.forEach((p, i) => {
      if (!p.alive) return;
      any = true;
      p.life += dt;
      if (p.life >= p.max) {
        p.alive = false;
        this.mesh.setMatrixAt(i, this.m.makeScale(0, 0, 0));
        return;
      }
      p.vel.y -= p.gravity * dt;
      p.vel.multiplyScalar(1 - dt * 0.8);
      p.pos.addScaledVector(p.vel, dt);
      if (p.pos.y < 0.05) {
        p.pos.y = 0.05;
        p.vel.y = Math.abs(p.vel.y) * 0.3;
      }
      p.rot.x += p.spin.x * dt;
      p.rot.y += p.spin.y * dt;
      p.rot.z += p.spin.z * dt;
      const k = p.life / p.max;
      // Some encolhendo no fim.
      const size = (p.size + p.grow * k) * (k > 0.7 ? (1 - k) / 0.3 : 1);
      this.q.setFromEuler(p.rot);
      this.mesh.setMatrixAt(i, this.m.compose(p.pos, this.q, this.s.set(size, size, size)));
    });
    if (any) this.mesh.instanceMatrix.needsUpdate = true;
  }
}

const CONFETTI = ['#FFEB3B', '#42A5F5', '#66BB6A', '#AB47BC', '#FFFFFF', '#E53935', '#26C6DA', '#FF7043'];

export class Particles {
  private readonly bits: Pool;
  private readonly smoke: Pool;
  private readonly v = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    this.bits = new Pool(new THREE.BoxGeometry(0.2, 0.2, 0.05), new THREE.MeshBasicMaterial({ color: '#fff' }), 420);
    this.smoke = new Pool(
      new THREE.IcosahedronGeometry(0.5, 1),
      new THREE.MeshLambertMaterial({ color: '#fff', transparent: true, opacity: 0.75, depthWrite: false }),
      90,
    );
    scene.add(this.bits.mesh, this.smoke.mesh);
  }

  confetti(at: THREE.Vector3, n = 40, power = 6): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * power;
      this.v.set(Math.cos(a) * r, power * (0.6 + Math.random() * 0.8), Math.sin(a) * r);
      this.bits.emit(at, this.v, CONFETTI[i % CONFETTI.length], { life: 1.6 + Math.random(), size: 1 + Math.random() * 0.6, gravity: 7 });
    }
  }

  sparkle(at: THREE.Vector3, color = '#FFEB3B', n = 14): void {
    for (let i = 0; i < n; i++) {
      this.v.set((Math.random() - 0.5) * 6, Math.random() * 5, (Math.random() - 0.5) * 6);
      this.bits.emit(at, this.v, i % 3 ? color : '#FFFFFF', { life: 0.6 + Math.random() * 0.3, size: 0.8, gravity: 4 });
    }
  }

  mud(at: THREE.Vector3, n = 26): void {
    for (let i = 0; i < n; i++) {
      this.v.set((Math.random() - 0.5) * 7, 2 + Math.random() * 5, (Math.random() - 0.2) * 5);
      this.bits.emit(at, this.v, i % 3 ? '#6D4C41' : '#5D4037', { life: 0.9, size: 1.6 + Math.random(), gravity: 14 });
    }
  }

  puff(at: THREE.Vector3, vel: THREE.Vector3): void {
    this.smoke.emit(at, vel, '#ECEFF1', { life: 1.1, size: 0.5, grow: 1.6, gravity: -0.8 });
  }

  update(dt: number): void {
    this.bits.update(dt);
    this.smoke.update(dt);
  }
}
