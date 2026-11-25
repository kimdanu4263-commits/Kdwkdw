import * as THREE from 'three';
import { MaterialLibrary } from '../materials';
import { StageId } from '../../types/energy';

export interface PrincipleShowcase {
  group: THREE.Group;
  hitBox: THREE.Mesh;
  update: (dt: number, elapsed: number, isLit: boolean) => void;
}

export function buildPrincipleShowcase(
  stageId: StageId,
  stageIndex: number,
  position: THREE.Vector3,
  mats: MaterialLibrary
): PrincipleShowcase {
  const group = new THREE.Group();
  group.position.copy(position);

  // Heavy industrial display pedestal
  const plinth = new THREE.Mesh(
    new THREE.CylinderGeometry(0.68, 0.78, 0.95, 24),
    mats.darkIron
  );
  plinth.position.y = 0.475;
  group.add(plinth);

  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.72, 0.72, 0.08, 24),
    mats.steelBrushed
  );
  collar.position.y = 0.96;
  group.add(collar);

  // Glowing accent ring around top of pedestal
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.9,
    roughness: 0.25,
  });
  const topRing = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.025, 8, 28), ringMat);
  topRing.rotation.x = Math.PI / 2;
  topRing.position.y = 1.01;
  group.add(topRing);

  // Protective transparent glass dome
  const dome = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.62, 0.95, 24),
    mats.glass
  );
  dome.position.y = 1.5;
  dome.renderOrder = 5;
  group.add(dome);

  const domeCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.65, 0.06, 24),
    mats.steelBrushed
  );
  domeCap.position.y = 2.0;
  group.add(domeCap);

  // Stage-specific miniature cutaway core mechanism inside the glass showcase
  const modelGroup = new THREE.Group();
  modelGroup.position.y = 1.48;
  group.add(modelGroup);

  const animatedParts: { update: (dt: number, elapsed: number) => void }[] = [];

  if (stageId === 'coil') {
    // Cutaway miniature coil + oscillating magnet + glowing flux ring
    const miniCoil = new THREE.Mesh(
      new THREE.TorusGeometry(0.24, 0.065, 12, 24),
      mats.copper
    );
    modelGroup.add(miniCoil);

    const miniMag = new THREE.Group();
    const n = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.22), mats.magnetNorth);
    n.position.z = 0.11;
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.22), mats.magnetSouth);
    s.position.z = -0.11;
    miniMag.add(n, s);
    modelGroup.add(miniMag);

    const fluxGlow = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.015, 8, 24),
      ringMat
    );
    modelGroup.add(fluxGlow);

    animatedParts.push({
      update: (_dt, elapsed) => {
        miniMag.position.z = Math.sin(elapsed * 3.2) * 0.26;
        fluxGlow.scale.setScalar(0.9 + Math.abs(Math.cos(elapsed * 3.2)) * 0.25);
      },
    });
  } else if (stageId === 'bicycle') {
    // Cutaway dynamo: spinning magnet rotor inside stationary copper stator
    const stator = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.34, 0.24, 20, 1, true),
      mats.copper
    );
    stator.rotation.z = Math.PI / 2;
    modelGroup.add(stator);

    const rotor = new THREE.Group();
    const rN = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.24, 0.12), mats.magnetNorth);
    rN.position.y = 0.12;
    const rS = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.24, 0.12), mats.magnetSouth);
    rS.position.y = -0.12;
    rotor.add(rN, rS);
    modelGroup.add(rotor);

    animatedParts.push({
      update: (dt) => {
        rotor.rotation.x += dt * 4.5;
      },
    });
  } else if (stageId === 'hydro') {
    // Cutaway potential energy water column -> turbine wheel
    const upperBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.22, 0.28),
      mats.water
    );
    upperBox.position.set(-0.15, 0.28, 0);
    modelGroup.add(upperBox);

    const jet = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.45, 10),
      mats.water
    );
    jet.position.set(0.05, 0.05, 0);
    jet.rotation.z = -0.45;
    modelGroup.add(jet);

    const wheel = new THREE.Group();
    wheel.position.set(0.18, -0.18, 0);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.14, 14), mats.chrome);
    hub.rotation.x = Math.PI / 2;
    wheel.add(hub);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.12), mats.steelBrushed);
      b.position.set(Math.cos(a) * 0.16, Math.sin(a) * 0.16, 0);
      b.rotation.z = a;
      wheel.add(b);
    }
    modelGroup.add(wheel);

    animatedParts.push({
      update: (dt) => {
        wheel.rotation.z -= dt * 4.2;
      },
    });
  } else if (stageId === 'thermal') {
    // Cutaway flame -> boiling water -> rising steam -> mini turbine
    const ember = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 12, 10),
      new THREE.MeshStandardMaterial({
        color: 0xf97316,
        emissive: 0xf97316,
        emissiveIntensity: 1.6,
      })
    );
    ember.position.y = -0.28;
    modelGroup.add(ember);

    const drum = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.22, 16),
      mats.water
    );
    drum.position.y = -0.02;
    modelGroup.add(drum);

    const miniTurbine = new THREE.Group();
    miniTurbine.position.y = 0.28;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.08), mats.chrome);
      blade.position.set(Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12);
      blade.rotation.y = -a;
      miniTurbine.add(blade);
    }
    modelGroup.add(miniTurbine);

    animatedParts.push({
      update: (dt, elapsed) => {
        miniTurbine.rotation.y += dt * 5.0;
        ember.scale.setScalar(0.92 + Math.sin(elapsed * 8) * 0.12);
      },
    });
  } else if (stageId === 'wave') {
    // Cutaway oscillating water column + floating magnet inside coil
    const coilSleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.34, 18, 1, true),
      mats.copper
    );
    coilSleeve.position.y = 0.12;
    modelGroup.add(coilSleeve);

    const floatMag = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 0.28, 14),
      mats.magnetNorth
    );
    modelGroup.add(floatMag);

    const waveDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.36, 0.08, 20),
      mats.water
    );
    waveDisc.position.y = -0.25;
    modelGroup.add(waveDisc);

    animatedParts.push({
      update: (_dt, elapsed) => {
        const y = Math.sin(elapsed * 2.8) * 0.16;
        floatMag.position.y = y;
        waveDisc.position.y = -0.24 + y * 0.55;
      },
    });
  } else if (stageId === 'nuclear') {
    // Cutaway U-235 nucleus splitting into two daughter nuclei + neutrons
    const core = new THREE.Group();
    const nucA = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.11, 1),
      new THREE.MeshStandardMaterial({
        color: 0x34d399,
        emissive: 0x10b981,
        emissiveIntensity: 1.4,
      })
    );
    const nucB = nucA.clone();
    core.add(nucA, nucB);

    const n1 = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), ringMat);
    const n2 = n1.clone();
    const n3 = n1.clone();
    core.add(n1, n2, n3);
    modelGroup.add(core);

    animatedParts.push({
      update: (_dt, elapsed) => {
        const phase = (elapsed * 0.7) % 1;
        const sep = phase < 0.25 ? 0.02 : Math.sin(((phase - 0.25) / 0.75) * Math.PI) * 0.25;
        nucA.position.x = -sep;
        nucB.position.x = sep;
        n1.position.set(sep * 1.4, sep * 0.9, 0);
        n2.position.set(-sep * 1.2, -sep * 1.1, sep * 0.6);
        n3.position.set(0, sep * 1.4, -sep * 0.8);
        core.rotation.y = elapsed * 0.8;
      },
    });
  }

  // Front Info Plaque + Clickable Terminal Sign
  const plaque = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.36, 0.08),
    mats.darkIron
  );
  plaque.position.set(0, 0.72, 0.72);
  plaque.rotation.x = -0.35;
  group.add(plaque);

  const plaqueGlow = new THREE.Mesh(
    new THREE.BoxGeometry(0.76, 0.26, 0.02),
    ringMat
  );
  plaqueGlow.position.set(0, 0.73, 0.76);
  plaqueGlow.rotation.x = -0.35;
  group.add(plaqueGlow);

  const hitBox = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 0.85, 2.3, 14),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitBox.position.y = 1.15;
  hitBox.userData = {
    interactType: 'open_explanation',
    stageId,
    stageIndex,
    label: '핵심 발전 원리 설명 보기',
  };
  group.add(hitBox);

  const showcaseLight = new THREE.PointLight(0x38bdf8, 0, 5, 1.8);
  showcaseLight.position.set(0, 2.1, 0.6);
  group.add(showcaseLight);

  return {
    group,
    hitBox,
    update: (dt, elapsed, isLit) => {
      ringMat.emissiveIntensity = THREE.MathUtils.damp(
        ringMat.emissiveIntensity,
        isLit ? 1.1 : 0.0,
        5,
        dt
      );
      showcaseLight.intensity = THREE.MathUtils.damp(
        showcaseLight.intensity,
        isLit ? 5.5 : 0.0,
        5,
        dt
      );
      if (isLit) {
        animatedParts.forEach((p) => p.update(dt, elapsed));
      }
    },
  };
}
