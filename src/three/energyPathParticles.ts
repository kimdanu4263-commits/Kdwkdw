import * as THREE from 'three';

export interface EnergyPathStream {
  points: THREE.Points;
  update: (elapsed: number, speedScale: number, intensity: number, visible: boolean) => void;
}

/**
 * High-resolution GPU Points stream flowing continuously along a 3D CatmullRomCurve3
 * to clearly visualize kinetic, thermal, coolant, steam, or electrical energy transfer.
 */
export function createEnergyPathStream(
  curve: THREE.CatmullRomCurve3,
  count: number,
  colorHex: number,
  size = 0.14,
  glowTexture?: THREE.Texture
): EnergyPathStream {
  const positions = new Float32Array(count * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    color: colorHex,
    map: glowTexture,
    size,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  const tmpPt = new THREE.Vector3();

  return {
    points,
    update: (elapsed, speedScale, intensity, visible) => {
      points.visible = visible && intensity > 0.03;
      if (!points.visible) return;

      mat.opacity = THREE.MathUtils.clamp(0.25 + intensity * 0.75, 0, 1);
      const posAttr = geo.attributes.position as THREE.BufferAttribute;

      for (let i = 0; i < count; i++) {
        const u = (elapsed * speedScale + i / count) % 1;
        curve.getPointAt(u, tmpPt);
        // Subtle radial spiral jitter for energetic stream look
        const wobble = Math.sin(elapsed * 8 + i * 1.7) * 0.025;
        posAttr.setXYZ(i, tmpPt.x + wobble, tmpPt.y + wobble * 0.5, tmpPt.z - wobble);
      }
      posAttr.needsUpdate = true;
    },
  };
}
