import * as THREE from 'three';
import { MaterialLibrary } from '../materials';
import { ParticlePool } from '../particles';
import { buildPrincipleShowcase } from './buildPrincipleShowcase';
import { STAGES } from '../../types/energy';
import { createEnergyPathStream } from '../energyPathParticles';

interface WaveImpulse {
  x: number;
  z: number;
  startTime: number;
  strength: number;
}

export interface WaveRoom {
  group: THREE.Group;
  oceanHitMesh: THREE.Mesh;
  interactiveObjects: THREE.Object3D[];
  addWaveImpulse: (worldX: number, worldZ: number, strength?: number) => void;
  update: (
    dt: number,
    elapsed: number,
    sensitivity: number,
    isLit: boolean
  ) => number;
}

export function buildWaveRoom(
  mats: MaterialLibrary,
  waterPool: ParticlePool,
  sparkPool: ParticlePool
): WaveRoom {
  const group = new THREE.Group();
  const [cx, cy, cz] = STAGES[4].centerPos;
  const origin = new THREE.Vector3(cx, cy, cz - 0.8);
  const root = new THREE.Group();
  root.position.copy(origin);

  // Coastal Ocean Tank Basin (9.2m wide x 6.4m deep)
  const basinBase = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.3, 6.6), mats.darkIron);
  basinBase.position.set(0, 0.15, 0);
  basinBase.receiveShadow = true;
  root.add(basinBase);

  // Glass tank perimeter walls
  const wallFBGeo = new THREE.BoxGeometry(9.4, 1.15, 0.16);
  const frontWall = new THREE.Mesh(wallFBGeo, mats.glass);
  frontWall.position.set(0, 0.85, 3.25);
  root.add(frontWall);
  const backWall = new THREE.Mesh(wallFBGeo, mats.glass);
  backWall.position.set(0, 0.85, -3.25);
  root.add(backWall);

  const wallLRGeo = new THREE.BoxGeometry(0.16, 1.15, 6.4);
  const leftWall = new THREE.Mesh(wallLRGeo, mats.glass);
  leftWall.position.set(-4.65, 0.85, 0);
  root.add(leftWall);
  const rightWall = new THREE.Mesh(wallLRGeo, mats.glass);
  rightWall.position.set(4.65, 0.85, 0);
  root.add(rightWall);

  // High-res vertex-displaced PBR Ocean Surface
  const segX = 56;
  const segZ = 40;
  const waterGeo = new THREE.PlaneGeometry(9.1, 6.3, segX, segZ);
  waterGeo.rotateX(-Math.PI / 2);

  const oceanMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: 0x0369a1,
    emissiveIntensity: 0.12,
    metalness: 0.08,
    roughness: 0.34,
    transparent: true,
    opacity: 0.88,
    envMapIntensity: 0.15,
  });

  const oceanMesh = new THREE.Mesh(waterGeo, oceanMat);
  oceanMesh.position.set(0, 0.95, 0);
  oceanMesh.userData = {
    interactType: 'trigger_wave',
    label: '바다 수면을 터치해 파도 일으키기',
  };
  root.add(oceanMesh);

  // Overhead Steel Gantry supporting 3 Floating Wave Energy Converter Buoys & Rotary Generator
  const gantryPillarGeo = new THREE.BoxGeometry(0.24, 2.8, 0.24);
  [-3.8, 3.8].forEach((px) => {
    const p = new THREE.Mesh(gantryPillarGeo, mats.darkIron);
    p.position.set(px, 1.4, -0.4);
    root.add(p);
  });
  const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(8.0, 0.24, 0.34), mats.steelBrushed);
  crossBeam.position.set(0, 2.75, -0.4);
  root.add(crossBeam);

  // 3 Floating Buoys + Hydraulic Pistons + Hinged Arms
  const buoys: {
    group: THREE.Group;
    pistonRod: THREE.Mesh;
    arm: THREE.Mesh;
    xPos: number;
    zPos: number;
    prevY: number;
  }[] = [];

  [-2.2, 0, 2.2].forEach((bx) => {
    const bGroup = new THREE.Group();
    bGroup.position.set(bx, 0.95, -0.4);

    // Buoy hull (bright safety orange/yellow composite)
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.48,
      metalness: 0.18,
      envMapIntensity: 0.15,
    });
    const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.42, 0.36, 20), hullMat);
    hull.castShadow = true;
    bGroup.add(hull);

    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.06, 10, 20), mats.hazard);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.08;
    bGroup.add(collar);

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.85, 10), mats.chrome);
    mast.position.y = 0.5;
    bGroup.add(mast);

    root.add(bGroup);

    // Hydraulic piston cylinder hanging from gantry
    const cylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, 1.0, 14),
      mats.darkIron
    );
    cylinder.position.set(bx, 2.2, -0.4);
    root.add(cylinder);

    const pistonRod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 1.3, 12),
      mats.chrome
    );
    pistonRod.position.set(bx, 1.65, -0.4);
    root.add(pistonRod);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.45), mats.steelBrushed);
    arm.position.set(bx, 2.9, -0.4);
    root.add(arm);

    buoys.push({ group: bGroup, pistonRod, arm, xPos: bx, zPos: -0.4, prevY: 0.95 });
  });

  // Central Wave Rotary Generator on Gantry
  const waveGenBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.36, 0.95, 22),
    mats.darkIron
  );
  waveGenBody.rotation.z = Math.PI / 2;
  waveGenBody.position.set(0, 3.05, -0.4);
  root.add(waveGenBody);

  const waveGenCopperMat = mats.copper.clone();
  const waveGenRotor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.28, 1.05, 22),
    waveGenCopperMat
  );
  waveGenRotor.rotation.z = Math.PI / 2;
  waveGenRotor.position.set(0, 3.05, -0.4);
  root.add(waveGenRotor);

  const genLight = new THREE.PointLight(0x38bdf8, 0, 6, 1.6);
  genLight.position.set(0, 3.5, 0.4);
  root.add(genLight);

  // Hydraulic Accumulator Tank & High-Pressure Manifold Pipes on Gantry
  const accum = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.05, 20), mats.hazard);
  accum.position.set(2.8, 3.2, -0.4);
  root.add(accum);

  const manifold = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 5.4, 10), mats.chrome);
  manifold.rotation.z = Math.PI / 2;
  manifold.position.set(0.2, 2.95, -0.4);
  root.add(manifold);

  // Mechanical Flywheel Gear converting vertical piston motion to rotary spin
  const flywheel = new THREE.Group();
  flywheel.position.set(-0.72, 3.05, -0.4);
  const flyRing = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.05, 10, 20), mats.chrome);
  flyRing.rotation.y = Math.PI / 2;
  flywheel.add(flyRing);
  for (let i = 0; i < 4; i++) {
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.62, 0.06), mats.steelBrushed);
    sp.rotation.x = (i / 4) * Math.PI;
    flywheel.add(sp);
  }
  root.add(flywheel);

  // Energy Flow Stream: Ocean Buoys -> Hydraulic Manifold -> Central Rotary Generator -> Accumulator Terminal
  const waveBusCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.2, 2.95, -0.4),
    new THREE.Vector3(-0.7, 3.05, -0.4),
    new THREE.Vector3(0.0, 3.05, -0.4),
    new THREE.Vector3(2.2, 2.95, -0.4),
    new THREE.Vector3(2.8, 3.25, -0.4),
  ]);
  const waveElectricStream = createEnergyPathStream(waveBusCurve, 48, 0x22d3ee, 0.15);
  root.add(waveElectricStream.points);

  group.add(root);

  const showcase = buildPrincipleShowcase(
    'wave',
    4,
    new THREE.Vector3(origin.x - 6.4, 0, origin.z + 1.2),
    mats
  );
  group.add(showcase.group);

  const impulses: WaveImpulse[] = [];
  let lastElapsed = 0;

  const evalHeight = (lx: number, lz: number, t: number): number => {
    // Gentle ambient swell
    let h =
      Math.sin(lx * 0.9 + t * 1.4) * 0.035 +
      Math.cos(lz * 1.1 - t * 1.1) * 0.025;

    for (let i = 0; i < impulses.length; i++) {
      const imp = impulses[i];
      const age = t - imp.startTime;
      if (age < 0 || age > 5.5) continue;
      const dx = lx - imp.x;
      const dz = lz - imp.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const speed = 3.4;
      const front = age * speed;
      const ringDist = Math.abs(dist - front);
      const envelope = Math.exp(-age * 0.72) * Math.exp(-ringDist * 0.9);
      h += Math.sin((dist - front) * 4.0) * envelope * imp.strength * 0.22;
    }
    return h;
  };

  let smoothedPower = 0;

  return {
    group,
    oceanHitMesh: oceanMesh,
    interactiveObjects: [oceanMesh, showcase.hitBox],
    addWaveImpulse: (worldX, worldZ, strength = 1.0) => {
      const lx = THREE.MathUtils.clamp(worldX - origin.x, -4.3, 4.3);
      const lz = THREE.MathUtils.clamp(worldZ - origin.z, -2.9, 2.9);
      impulses.push({ x: lx, z: lz, startTime: lastElapsed, strength });
      if (impulses.length > 14) impulses.shift();

      // Gentle splash droplets where user touched the ocean
      for (let i = 0; i < 8; i++) {
        waterPool.spawn({
          x: origin.x + lx + (Math.random() - 0.5) * 0.35,
          y: origin.y + 1.0,
          z: origin.z + lz + (Math.random() - 0.5) * 0.35,
          vx: (Math.random() - 0.5) * 1.6,
          vy: 1.0 + Math.random() * 1.4,
          vz: (Math.random() - 0.5) * 1.6,
          r: 0.78,
          g: 0.95,
          b: 1.0,
          life: 0.42 + Math.random() * 0.25,
        });
      }
    },
    update: (dt, elapsed, sensitivity, isLit) => {
      showcase.update(dt, elapsed, isLit);
      oceanMat.emissiveIntensity = isLit ? 0.15 : 0.0;
      lastElapsed = elapsed;
      const posAttr = waterGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < posAttr.count; i++) {
        const vx = posAttr.getX(i);
        const vz = posAttr.getZ(i);
        posAttr.setY(i, evalHeight(vx, vz, elapsed));
      }
      posAttr.needsUpdate = true;
      waterGeo.computeVertexNormals();

      // Update floating buoys & measure vertical heave velocity for power generation
      let totalMotion = 0;
      buoys.forEach((b) => {
        const hCenter = evalHeight(b.xPos, b.zPos, elapsed);
        const hRight = evalHeight(b.xPos + 0.3, b.zPos, elapsed);
        const hFront = evalHeight(b.xPos, b.zPos + 0.3, elapsed);

        const targetY = 0.95 + hCenter;
        const vel = Math.abs(targetY - b.prevY) / Math.max(0.001, dt);
        b.prevY = targetY;
        totalMotion += vel;

        b.group.position.y = targetY;
        b.group.rotation.z = THREE.MathUtils.clamp((hCenter - hRight) * 1.4, -0.45, 0.45);
        b.group.rotation.x = THREE.MathUtils.clamp((hFront - hCenter) * 1.4, -0.45, 0.45);

        b.pistonRod.position.y = (targetY + 2.2) * 0.5;
        b.arm.rotation.x = hCenter * 1.5;
      });

      const instantPower = THREE.MathUtils.clamp(totalMotion * 0.36 * sensitivity, 0, 1);
      smoothedPower = THREE.MathUtils.damp(smoothedPower, instantPower, 3.0, dt);

      waveGenRotor.rotation.x += smoothedPower * 16.0 * dt;
      flywheel.rotation.x += smoothedPower * 16.0 * dt;
      waveGenCopperMat.emissive.setHex(0x38bdf8);
      waveGenCopperMat.emissiveIntensity = THREE.MathUtils.damp(
        waveGenCopperMat.emissiveIntensity,
        isLit ? smoothedPower * 1.1 : 0,
        6,
        dt
      );
      genLight.intensity = THREE.MathUtils.damp(
        genLight.intensity,
        isLit ? smoothedPower * 9 : 0,
        6,
        dt
      );
      waveElectricStream.update(elapsed, 0.45 + smoothedPower * 1.1, smoothedPower, isLit);

      if (isLit && smoothedPower > 0.15 && Math.random() < smoothedPower * 0.5) {
        sparkPool.spawn({
          x: origin.x + (Math.random() - 0.5) * 0.8,
          y: origin.y + 3.05,
          z: origin.z - 0.4,
          vx: (Math.random() - 0.5) * 1.6,
          vy: 0.7 + Math.random() * 1.3,
          vz: (Math.random() - 0.5) * 1.6,
          r: 0.25,
          g: 0.9,
          b: 1.0,
          life: 0.3,
        });
      }

      return smoothedPower;
    },
  };
}
