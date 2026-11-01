// "Mundo curvo": tudo que está à frente do carro desce e vira de lado aos
// poucos (no desenho, não na corrida). Assim a pista parece ter subidas e
// curvas, e as coisas novas aparecem subindo do horizonte.

import * as THREE from 'three';

export const bend = {
  carZ: { value: 0 },
  x: { value: 0 },
  y: { value: 0.00025 },
};

const CHUNK = /* glsl */ `
vec4 bentW = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
  bentW = batchingMatrix * bentW;
#endif
#ifdef USE_INSTANCING
  bentW = instanceMatrix * bentW;
#endif
bentW = modelMatrix * bentW;
float bendD = max( 0.0, uCarZ - bentW.z );
bentW.x += bendD * bendD * uBendX;
bentW.y -= bendD * bendD * uBendY;
vec4 mvPosition = viewMatrix * bentW;
gl_Position = projectionMatrix * mvPosition;
`;

/** Faz o material seguir a curva do mundo. */
export function bent<T extends THREE.Material>(m: T): T {
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uCarZ = bend.carZ;
    shader.uniforms.uBendX = bend.x;
    shader.uniforms.uBendY = bend.y;
    shader.vertexShader =
      'uniform float uCarZ;\nuniform float uBendX;\nuniform float uBendY;\n' +
      shader.vertexShader.replace('#include <project_vertex>', CHUNK);
  };
  m.customProgramCacheKey = () => 'bent';
  return m;
}

/** O mesmo cálculo na CPU (para saber onde uma coisa aparece na tela). */
export function bendPoint(p: THREE.Vector3): THREE.Vector3 {
  const d = Math.max(0, bend.carZ.value - p.z);
  return p.set(p.x + d * d * bend.x.value, p.y - d * d * bend.y.value, p.z);
}

export function lambert(color: THREE.ColorRepresentation, extra: THREE.MeshLambertMaterialParameters = {}): THREE.MeshLambertMaterial {
  return bent(new THREE.MeshLambertMaterial({ color, ...extra }));
}
