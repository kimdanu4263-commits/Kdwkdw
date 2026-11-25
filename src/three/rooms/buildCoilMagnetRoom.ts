import * as THREE from 'three';
import { MaterialLibrary } from '../materials';
import { ProceduralTextureSet } from '../../utils/textures';
import { ParticlePool } from '../particles';
import { buildPrincipleShowcase } from './buildPrincipleShowcase';
import { STAGES } from '../../types/energy';
import { createEnergyPathStream } from '../energyPathParticles';

export interface CoilMagnetRoom {
  group: THREE.Group;
  magnetHitBox: THREE.Mesh;
  interactiveObjects: THREE.Object3D[];
  coilPosition: THREE.Vector3;
  update: (
    dt: number,
    elapsed: number,
    magnetOffset: THREE.Vector2,
    fluxLevel: number,
    isLit: boolean
  ) => void;
}

export function buildCoilMagnetRoom(
  mats: MaterialLibrary,
  textures: ProceduralTextureSet,
  sparkPool: ParticlePool
): CoilMagnetRoom {
  const group = new THREE.Group();
  const [cx, cy, cz] = STAGES[0].centerPos;
  const benchCenter = new THREE.Vector3(cx, cy, cz - 1.2);

  // Heavy steel & oak-trimmed physics workbench (composite 5+ parts)
  const benchGroup = new THREE.Group();
  benchGroup.position.copy(benchCenter);

  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.14, 1.9), mats.darkIron);
  tableTop.position.y = 0.96;
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  benchGroup.add(tableTop);

  const rubberMat = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.02, 1.6), mats.rubber);
  rubberMat.position.y = 1.04;
  rubberMat.receiveShadow = true;
  benchGroup.add(rubberMat);

  const legGeo = new THREE.BoxGeometry(0.14, 0.96, 0.14);
  [
    [-1.7, 0.48, -0.78],
    [1.7, 0.48, -0.78],
    [-1.7, 0.48, 0.78],
    [1.7, 0.48, 0.78],
  ].forEach(([lx, ly, lz]) => {
    const leg = new THREE.Mesh(legGeo, mats.steelBrushed);
    leg.position.set(lx, ly, lz);
    leg.castShadow = true;
    benchGroup.add(leg);
  });

  // Copper Solenoid Coil Assembly (composite 8+ parts)
  const coilGroup = new THREE.Group();
  coilGroup.position.set(-0.45, 1.38, 0);

  // Bobbin flanges
  const flangeGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.06, 28);
  const flangeL = new THREE.Mesh(flangeGeo, mats.darkIron);
  flangeL.rotation.z = Math.PI / 2;
  flangeL.position.x = -0.62;
  coilGroup.add(flangeL);

  const flangeR = new THREE.Mesh(flangeGeo, mats.darkIron);
  flangeR.rotation.z = Math.PI / 2;
  flangeR.position.x = 0.62;
  coilGroup.add(flangeR);

  // Inner iron core tube
  const coreTube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.24, 1.32, 24),
    mats.steelBrushed
  );
  coreTube.rotation.z = Math.PI / 2;
  coilGroup.add(coreTube);

  // Wound copper coil body + individual copper rings for realistic 3D depth
  const coilMat = mats.copper.clone();
  const coilBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.36, 1.16, 32),
    coilMat
  );
  coilBody.rotation.z = Math.PI / 2;
  coilBody.castShadow = true;
  coilGroup.add(coilBody);

  const ringGeo = new THREE.TorusGeometry(0.365, 0.022, 10, 28);
  for (let i = -8; i <= 8; i++) {
    const ring = new THREE.Mesh(ringGeo, coilMat);
    ring.rotation.y = Math.PI / 2;
    ring.position.x = i * 0.065;
    coilGroup.add(ring);
  }

  // Coil mounting brackets
  const mountGeo = new THREE.BoxGeometry(0.14, 0.35, 0.52);
  [-0.58, 0.58].forEach((mx) => {
    const mount = new THREE.Mesh(mountGeo, mats.darkIron);
    mount.position.set(mx, -0.2, 0);
    coilGroup.add(mount);
  });

  // Glowing induction light inside coil
  const inductionLight = new THREE.PointLight(0x38bdf8, 0, 5.5, 1.8);
  inductionLight.position.set(0, 0.25, 0.35);
  coilGroup.add(inductionLight);

  benchGroup.add(coilGroup);

  // Analog Galvanometer + LED Charge Indicator on right side of bench
  const meterGroup = new THREE.Group();
  meterGroup.position.set(1.05, 1.05, -0.25);

  const meterCasing = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.58, 0.36), mats.darkIron);
  meterCasing.position.y = 0.29;
  meterCasing.castShadow = true;
  meterGroup.add(meterCasing);

  const dialFace = new THREE.Mesh(
    new THREE.CircleGeometry(0.22, 28),
    new THREE.MeshBasicMaterial({ map: textures.galvanometerDial })
  );
  dialFace.position.set(0, 0.33, 0.185);
  meterGroup.add(dialFace);

  const needlePivot = new THREE.Group();
  needlePivot.position.set(0, 0.28, 0.195);
  const needle = new THREE.Mesh(
    new THREE.BoxGeometry(0.018, 0.17, 0.01),
    new THREE.MeshBasicMaterial({ color: 0xef4444 })
  );
  needle.position.y = 0.075;
  needlePivot.add(needle);
  meterGroup.add(needlePivot);

  // Copper lead wires from coil to meter
  const wireCurve1 = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.3, 1.12, 0.3),
    new THREE.Vector3(0.35, 1.08, 0.35),
    new THREE.Vector3(0.85, 1.12, -0.1),
  ]);
  const wireMesh1 = new THREE.Mesh(
    new THREE.TubeGeometry(wireCurve1, 20, 0.018, 8, false),
    mats.copper
  );
  benchGroup.add(wireMesh1);

  const wireCurve2 = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.15, 1.12, 0.26),
    new THREE.Vector3(0.55, 1.07, 0.22),
    new THREE.Vector3(1.15, 1.12, -0.1),
  ]);
  const wireMesh2 = new THREE.Mesh(
    new THREE.TubeGeometry(wireCurve2, 20, 0.018, 8, false),
    mats.copper
  );
  benchGroup.add(wireMesh2);

  // Flowing electron beads along copper wires to visualize current flow
  const electronMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0x38bdf8,
    emissiveIntensity: 1.5,
  });
  const electronGeo = new THREE.SphereGeometry(0.032, 8, 8);
  const electronBeads: { mesh: THREE.Mesh; curve: THREE.CatmullRomCurve3; offset: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const curve = i % 2 === 0 ? wireCurve1 : wireCurve2;
    const bead = new THREE.Mesh(electronGeo, electronMat);
    bead.visible = false;
    benchGroup.add(bead);
    electronBeads.push({ mesh: bead, curve, offset: (i / 6) });
  }

  // Output bus cable & energy stream from coil/meter -> plant transmission terminal (0.55, 1.85, -0.45)
  const outBusCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.45, 1.38, -0.1),
    new THREE.Vector3(0.45, 1.22, -0.25),
    new THREE.Vector3(1.05, 1.25, -0.25),
    new THREE.Vector3(0.55, 1.55, -0.45),
    new THREE.Vector3(0.55, 1.85, -0.45),
  ]);
  benchGroup.add(
    new THREE.Mesh(new THREE.TubeGeometry(outBusCurve, 20, 0.024, 8, false), mats.copper)
  );
  const coilOutStream = createEnergyPathStream(
    outBusCurve,
    36,
    0x38bdf8,
    0.13,
    textures.particleGlow
  );
  benchGroup.add(coilOutStream.points);

  // Test Desk Bulb mounted on meter that flickers brightly when shaking magnet
  const deskBulbMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.1,
    roughness: 0.15,
  });
  const deskBulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 14), deskBulbMat);
  deskBulb.position.set(0.24, 0.66, 0);
  meterGroup.add(deskBulb);

  benchGroup.add(meterGroup);

  // Draggable Bar Magnet (Red North / Blue South poles + metallic handle grip)
  const magnetGroup = new THREE.Group();
  magnetGroup.position.set(0.55, 1.38, 0.45);

  const northHalf = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.2, 0.22),
    mats.magnetNorth
  );
  northHalf.position.x = -0.23;
  northHalf.castShadow = true;
  magnetGroup.add(northHalf);

  const southHalf = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.2, 0.22),
    mats.magnetSouth
  );
  southHalf.position.x = 0.23;
  southHalf.castShadow = true;
  magnetGroup.add(southHalf);

  const magnetBand = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.215, 0.235),
    mats.chrome
  );
  magnetGroup.add(magnetBand);

  // Invisible slightly larger hitbox for comfortable mouse/touch grabbing
  const magnetHitBox = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 0.55, 0.55),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  magnetHitBox.userData = {
    interactType: 'drag_magnet',
    label: '자석을 누른 채 좌우로 흔들어 전기 발생',
  };
  magnetGroup.add(magnetHitBox);

  // Subtle magnetic field rings around magnet
  const fieldRingMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.18,
    wireframe: true,
  });
  const fieldRing = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.008, 6, 28), fieldRingMat);
  fieldRing.rotation.x = Math.PI / 2;
  magnetGroup.add(fieldRing);

  benchGroup.add(magnetGroup);
  group.add(benchGroup);

  const showcase = buildPrincipleShowcase(
    'coil',
    0,
    new THREE.Vector3(cx - 3.8, cy, cz - 0.8),
    mats
  );
  group.add(showcase.group);

  const coilWorldPos = new THREE.Vector3(benchCenter.x - 0.45, benchCenter.y + 1.38, benchCenter.z);

  return {
    group,
    magnetHitBox,
    interactiveObjects: [magnetHitBox, showcase.hitBox],
    coilPosition: coilWorldPos,
    update: (dt, elapsed, magnetOffset, fluxLevel, isLit) => {
      showcase.update(dt, elapsed, isLit);
      // Move magnet smoothly toward user drag offset around coil
      const targetX = 0.35 + magnetOffset.x;
      const targetY = 1.38 + magnetOffset.y;
      const targetZ = 0.35 + Math.sin(magnetOffset.x * 2.5) * 0.12;

      magnetGroup.position.x = THREE.MathUtils.damp(magnetGroup.position.x, targetX, 18, dt);
      magnetGroup.position.y = THREE.MathUtils.damp(magnetGroup.position.y, targetY, 18, dt);
      magnetGroup.position.z = THREE.MathUtils.damp(magnetGroup.position.z, targetZ, 18, dt);
      magnetGroup.rotation.z = THREE.MathUtils.damp(
        magnetGroup.rotation.z,
        -magnetOffset.x * 0.25,
        14,
        dt
      );

      // Induction glow & needle deflection
      inductionLight.intensity = THREE.MathUtils.damp(
        inductionLight.intensity,
        fluxLevel * 12,
        12,
        dt
      );
      coilMat.emissive.setHex(0x38bdf8);
      coilMat.emissiveIntensity = THREE.MathUtils.damp(
        coilMat.emissiveIntensity,
        fluxLevel * 0.9,
        10,
        dt
      );
      deskBulbMat.emissiveIntensity = THREE.MathUtils.damp(
        deskBulbMat.emissiveIntensity,
        0.15 + fluxLevel * 3.5,
        12,
        dt
      );

      const targetNeedle = (Math.sin(elapsed * 22) * 0.5 + 0.45) * fluxLevel * 1.1;
      needlePivot.rotation.z = THREE.MathUtils.damp(needlePivot.rotation.z, -targetNeedle, 14, dt);

      fieldRingMat.opacity = 0.12 + fluxLevel * 0.45;
      fieldRing.scale.setScalar(0.95 + Math.sin(elapsed * 8) * fluxLevel * 0.2);

      // Animate electron beads & output stream when induced current exists
      electronBeads.forEach((eb) => {
        eb.mesh.visible = fluxLevel > 0.06;
        if (eb.mesh.visible) {
          const u = (elapsed * (0.6 + fluxLevel * 1.8) + eb.offset) % 1;
          eb.mesh.position.copy(eb.curve.getPoint(u));
        }
      });
      coilOutStream.update(elapsed, 0.55 + fluxLevel * 1.4, fluxLevel, isLit);

      // Emit electric sparks around coil during strong flux
      if (fluxLevel > 0.15 && Math.random() < fluxLevel * 0.75) {
        sparkPool.spawn({
          x: coilWorldPos.x + (Math.random() - 0.5) * 1.0,
          y: coilWorldPos.y + (Math.random() - 0.5) * 0.45,
          z: coilWorldPos.z + (Math.random() - 0.5) * 0.5,
          vx: (Math.random() - 0.5) * 2.2,
          vy: 0.8 + Math.random() * 1.8,
          vz: (Math.random() - 0.5) * 2.2,
          r: 0.3,
          g: 0.85,
          b: 1.0,
          life: 0.35 + Math.random() * 0.25,
        });
      }
    },
  };
}
