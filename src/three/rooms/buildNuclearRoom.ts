import * as THREE from 'three';
import { MaterialLibrary } from '../materials';
import { ParticlePool } from '../particles';
import { buildPrincipleShowcase } from './buildPrincipleShowcase';
import { STAGES } from '../../types/energy';
import { createEnergyPathStream } from '../energyPathParticles';

export interface NuclearRoom {
  group: THREE.Group;
  interactiveObjects: THREE.Object3D[];
  update: (
    dt: number,
    elapsed: number,
    rodWithdraw: number,
    steamPressure: number,
    isLit: boolean
  ) => void;
}

export function buildNuclearRoom(
  mats: MaterialLibrary,
  steamPool: ParticlePool,
  sparkPool: ParticlePool
): NuclearRoom {
  const group = new THREE.Group();
  const [cx, cy, cz] = STAGES[5].centerPos;
  const origin = new THREE.Vector3(cx, cy, cz - 0.8);
  const root = new THREE.Group();
  root.position.copy(origin);
  const interactiveObjects: THREE.Object3D[] = [];

  // 1. Cutaway Nuclear Reactor Pressure Vessel (left-center x = -1.75)
  const reactorBase = new THREE.Mesh(
    new THREE.CylinderGeometry(1.45, 1.55, 0.6, 28),
    mats.darkIron
  );
  reactorBase.position.set(-1.75, 0.3, -0.3);
  root.add(reactorBase);

  const reactorCap = new THREE.Mesh(
    new THREE.CylinderGeometry(1.4, 1.45, 0.45, 28),
    mats.steelBrushed
  );
  reactorCap.position.set(-1.75, 3.25, -0.3);
  root.add(reactorCap);

  // Heavy glass containment cylinder so fission reaction is clearly visible
  const reactorGlass = new THREE.Mesh(
    new THREE.CylinderGeometry(1.32, 1.32, 2.55, 32),
    mats.glass
  );
  reactorGlass.position.set(-1.75, 1.85, -0.3);
  reactorGlass.renderOrder = 4;
  root.add(reactorGlass);

  // Cherenkov Blue Radiation Water Core Glow (glare-free)
  const cherenkovMat = new THREE.MeshStandardMaterial({
    color: 0x0ea5e9,
    emissive: 0x0284c7,
    emissiveIntensity: 0.12,
    roughness: 0.45,
    transparent: true,
    opacity: 0.36,
    envMapIntensity: 0.0,
  });
  const cherenkovPool = new THREE.Mesh(
    new THREE.CylinderGeometry(1.18, 1.18, 2.2, 24),
    cherenkovMat
  );
  cherenkovPool.position.set(-1.75, 1.75, -0.3);
  root.add(cherenkovPool);

  const cherenkovLight = new THREE.PointLight(0x38bdf8, 0, 9, 1.5);
  cherenkovLight.position.set(-1.75, 1.85, 0.6);
  root.add(cherenkovLight);

  // Uranium Fuel Rods (vertical glowing bundles)
  const fuelMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.2,
    metalness: 0.7,
    roughness: 0.25,
  });
  const fuelOffsets = [
    [-0.45, -0.45],
    [0.45, -0.45],
    [-0.45, 0.45],
    [0.45, 0.45],
    [0, 0],
  ];
  fuelOffsets.forEach(([fx, fz]) => {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.85, 12), fuelMat);
    rod.position.set(-1.75 + fx, 1.55, -0.3 + fz);
    root.add(rod);
  });

  // Movable Boron Control Rods Assembly (raise = more fission, lower = damped)
  const controlRodGroup = new THREE.Group();
  controlRodGroup.position.set(-1.75, 1.65, -0.3);

  const rodMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.85,
    roughness: 0.25,
  });
  const rodOffsets = [
    [-0.24, 0],
    [0.24, 0],
    [0, -0.24],
    [0, 0.24],
  ];
  rodOffsets.forEach(([rx, rz]) => {
    const cRod = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 1.9, 12), rodMat);
    cRod.position.set(rx, 0, rz);
    controlRodGroup.add(cRod);
  });

  const rodSpider = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.1, 16), mats.hazard);
  rodSpider.position.y = 0.95;
  controlRodGroup.add(rodSpider);

  const rodHandle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.5, 12),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.5 })
  );
  rodHandle.position.y = 2.05;
  rodHandle.userData = {
    interactType: 'toggle_rods',
    label: '제어봉 올리기 / 내리기 (핵분열 조절)',
  };
  controlRodGroup.add(rodHandle);
  interactiveObjects.push(rodHandle);

  // Reactor interactive hitbox
  const reactorHit = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 1.5, 3.2, 16),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  reactorHit.position.set(-1.75, 1.8, -0.3);
  reactorHit.userData = {
    interactType: 'toggle_rods',
    label: '원자로 제어봉 조절',
  };
  root.add(reactorHit);
  interactiveObjects.push(reactorHit);

  root.add(controlRodGroup);

  // Animated Uranium-235 Atoms + Flying Neutrons inside Core for Fission Visualization
  const uraniumAtoms: { mesh: THREE.Mesh; basePos: THREE.Vector3; splitPhase: number }[] = [];
  const uGeo = new THREE.IcosahedronGeometry(0.11, 1);
  const uMat = new THREE.MeshStandardMaterial({
    color: 0x34d399,
    emissive: 0x10b981,
    emissiveIntensity: 0.8,
    roughness: 0.2,
  });

  for (let i = 0; i < 14; i++) {
    const ang = (i / 14) * Math.PI * 2;
    const rad = 0.35 + (i % 3) * 0.22;
    const y = 0.95 + (i % 5) * 0.32;
    const uMesh = new THREE.Mesh(uGeo, uMat);
    const bp = new THREE.Vector3(-1.75 + Math.cos(ang) * rad, y, -0.3 + Math.sin(ang) * rad);
    uMesh.position.copy(bp);
    root.add(uMesh);
    uraniumAtoms.push({ mesh: uMesh, basePos: bp, splitPhase: Math.random() * 10 });
  }

  const neutrons: { mesh: THREE.Mesh; pos: THREE.Vector3; vel: THREE.Vector3 }[] = [];
  const nGeo = new THREE.SphereGeometry(0.045, 8, 8);
  const nMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc });
  for (let i = 0; i < 24; i++) {
    const nMesh = new THREE.Mesh(nGeo, nMat);
    const pos = new THREE.Vector3(
      -1.75 + (Math.random() - 0.5) * 1.4,
      1.0 + Math.random() * 1.5,
      -0.3 + (Math.random() - 0.5) * 1.4
    );
    const vel = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    )
      .normalize()
      .multiplyScalar(2.4);
    nMesh.position.copy(pos);
    root.add(nMesh);
    neutrons.push({ mesh: nMesh, pos, vel });
  }

  // 2. Primary Coolant Heat Pipe Loop -> Steam Generator Tank (x = 0.65)
  const hotPipeMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    emissive: 0xef4444,
    emissiveIntensity: 0.0,
    metalness: 0.78,
    roughness: 0.28,
  });
  const hotPipeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.6, 2.5, -0.3),
    new THREE.Vector3(0.0, 2.5, -0.3),
    new THREE.Vector3(0.65, 2.1, -0.3),
  ]);
  root.add(new THREE.Mesh(new THREE.TubeGeometry(hotPipeCurve, 16, 0.11, 10, false), hotPipeMat));

  // Glowing thermal coolant orbs traveling from reactor to steam generator
  const coolantOrbMat = new THREE.MeshStandardMaterial({
    color: 0xfca5a5,
    emissive: 0xf97316,
    emissiveIntensity: 1.5,
  });
  const coolantOrbs: { mesh: THREE.Mesh; offset: number }[] = [];
  for (let i = 0; i < 4; i++) {
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), coolantOrbMat);
    orb.visible = false;
    root.add(orb);
    coolantOrbs.push({ mesh: orb, offset: i / 4 });
  }

  const steamGenGlass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.68, 0.68, 2.0, 24),
    mats.glass
  );
  steamGenGlass.position.set(0.65, 1.65, -0.3);
  steamGenGlass.renderOrder = 3;
  root.add(steamGenGlass);

  const steamGenBase = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.8, 0.5, 24), mats.darkIron);
  steamGenBase.position.set(0.65, 0.4, -0.3);
  root.add(steamGenBase);

  const steamGenWater = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.6, 1.15, 20),
    mats.water
  );
  steamGenWater.position.set(0.65, 1.25, -0.3);
  root.add(steamGenWater);

  // Steam Pipe to Nuclear Turbine (x = 2.35) + steam flow orbs & nozzle jet
  const steamOutCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.65, 2.7, -0.3),
    new THREE.Vector3(0.65, 3.3, -0.3),
    new THREE.Vector3(2.35, 3.3, -0.3),
    new THREE.Vector3(2.35, 2.15, -0.3),
  ]);
  root.add(
    new THREE.Mesh(new THREE.TubeGeometry(steamOutCurve, 22, 0.13, 12, false), mats.steelBrushed)
  );

  const nucJetMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    emissive: 0xbae6fd,
    emissiveIntensity: 0.4,
    transparent: true,
    opacity: 0.0,
    roughness: 0.8,
  });
  const nucSteamCone = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.72, 16), nucJetMat);
  nucSteamCone.position.set(2.35, 1.9, -0.3);
  root.add(nucSteamCone);

  const nucSteamOrbs: { mesh: THREE.Mesh; offset: number }[] = [];
  for (let i = 0; i < 5; i++) {
    const so = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), nucJetMat);
    so.visible = false;
    root.add(so);
    nucSteamOrbs.push({ mesh: so, offset: i / 5 });
  }

  // 3. Heavy Nuclear Steam Turbine & Alternator (x = 2.65)
  const turbBed = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.85, 1.35), mats.darkIron);
  turbBed.position.set(2.75, 0.425, -0.3);
  root.add(turbBed);

  const nucTurbineRotor = new THREE.Group();
  nucTurbineRotor.position.set(2.35, 1.42, -0.3);
  const nucShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 2.2, 16), mats.chrome);
  nucShaft.rotation.z = Math.PI / 2;
  nucShaft.position.x = 0.45;
  nucTurbineRotor.add(nucShaft);

  [-0.3, 0, 0.3].forEach((ox, idx) => {
    const r = 0.36 + idx * 0.09;
    for (let b = 0; b < 12; b++) {
      const ang = (b / 12) * Math.PI * 2;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, r * 0.82, 0.04), mats.steelBrushed);
      blade.position.set(ox, Math.cos(ang) * r, Math.sin(ang) * r);
      blade.rotation.x = ang;
      blade.rotation.y = 0.4;
      nucTurbineRotor.add(blade);
    }
  });
  root.add(nucTurbineRotor);

  const nucShroud = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.7, 1.1, 24),
    mats.glass
  );
  nucShroud.rotation.z = Math.PI / 2;
  nucShroud.position.set(2.35, 1.42, -0.3);
  nucShroud.renderOrder = 3;
  root.add(nucShroud);

  const altHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.95, 24), mats.darkIron);
  altHousing.rotation.z = Math.PI / 2;
  altHousing.position.set(3.45, 1.42, -0.3);
  root.add(altHousing);

  const altCopperMat = mats.copper.clone();
  const altCopper = new THREE.Mesh(
    new THREE.CylinderGeometry(0.47, 0.47, 1.0, 24),
    altCopperMat
  );
  altCopper.rotation.z = Math.PI / 2;
  altCopper.position.set(3.45, 1.42, -0.3);
  root.add(altCopper);

  // 4. Pressurizer Tank + Hyperboloid Cooling Tower behind turbine
  const pressurizer = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 2.1, 20), mats.steelBrushed);
  pressurizer.position.set(-0.25, 1.45, -1.35);
  root.add(pressurizer);

  const towerPts = [
    new THREE.Vector2(1.45, 0),
    new THREE.Vector2(1.1, 1.4),
    new THREE.Vector2(0.88, 2.8),
    new THREE.Vector2(0.98, 4.0),
    new THREE.Vector2(1.12, 4.6),
  ];
  const coolingTower = new THREE.Mesh(new THREE.LatheGeometry(towerPts, 28), mats.wallDark);
  coolingTower.position.set(2.9, 0, -2.6);
  root.add(coolingTower);

  // Mechanical Control-Rod Drive Gear Wheel + Steam Governor Valve
  const rodGearWheel = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.04, 8, 18), mats.hazard);
  rodGearWheel.position.set(-1.75, 3.62, 0.15);
  root.add(rodGearWheel);

  // High-Resolution Multi-Stage Energy Flow Particle Streams
  const nucPrimaryLoopCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.75, 1.3, -0.3),
    new THREE.Vector3(-1.75, 2.5, -0.3),
    new THREE.Vector3(0.0, 2.5, -0.3),
    new THREE.Vector3(0.65, 2.0, -0.3),
    new THREE.Vector3(0.65, 0.9, -0.3),
    new THREE.Vector3(-0.6, 0.9, -0.3),
  ], true);
  const nucPrimaryStream = createEnergyPathStream(nucPrimaryLoopCurve, 64, 0xf97316, 0.14);
  root.add(nucPrimaryStream.points);

  const nucSteamLoopCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.65, 1.5, -0.3),
    new THREE.Vector3(0.65, 3.3, -0.3),
    new THREE.Vector3(2.35, 3.3, -0.3),
    new THREE.Vector3(2.35, 1.45, -0.3),
    new THREE.Vector3(3.45, 1.45, -0.3),
    new THREE.Vector3(3.65, 2.15, -0.3),
  ]);
  const nucBusRiser = new THREE.CatmullRomCurve3([
    new THREE.Vector3(3.45, 1.45, -0.3),
    new THREE.Vector3(3.65, 2.15, -0.3),
  ]);
  root.add(
    new THREE.Mesh(new THREE.TubeGeometry(nucBusRiser, 8, 0.032, 8, false), mats.copper)
  );
  const nucSteamStream = createEnergyPathStream(nucSteamLoopCurve, 64, 0x38bdf8, 0.15);
  root.add(nucSteamStream.points);

  group.add(root);

  const showcase = buildPrincipleShowcase(
    'nuclear',
    5,
    new THREE.Vector3(origin.x - 5.2, 0, origin.z + 1.0),
    mats
  );
  group.add(showcase.group);
  interactiveObjects.push(showcase.hitBox);

  let currentRodHeight = 0;
  let nucRpmNorm = 0;

  return {
    group,
    interactiveObjects,
    update: (dt, elapsed, rodWithdraw, steamPressure, isLit) => {
      showcase.update(dt, elapsed, isLit);
      currentRodHeight = THREE.MathUtils.damp(currentRodHeight, rodWithdraw, 4.5, dt);
      controlRodGroup.position.y = 1.65 + currentRodHeight * 1.45;

      const fissionRate = currentRodHeight;
      cherenkovMat.emissiveIntensity = THREE.MathUtils.damp(
        cherenkovMat.emissiveIntensity,
        isLit ? 0.15 + fissionRate * 2.4 : 0.0,
        5,
        dt
      );
      cherenkovLight.intensity = THREE.MathUtils.damp(
        cherenkovLight.intensity,
        isLit ? 2.5 + fissionRate * 18 : 0.0,
        5,
        dt
      );
      fuelMat.emissiveIntensity = isLit ? 0.15 + fissionRate * 1.8 : 0.0;
      uMat.emissiveIntensity = isLit ? 0.8 : 0.0;
      rodHandle.material.emissiveIntensity = isLit ? 0.5 : 0.0;
      hotPipeMat.emissiveIntensity = THREE.MathUtils.damp(
        hotPipeMat.emissiveIntensity,
        isLit ? fissionRate * 1.6 : 0.0,
        3.5,
        dt
      );

      // Animate Uranium atoms vibrating & splitting
      uraniumAtoms.forEach((atom, i) => {
        const vib = fissionRate * 0.08;
        const splitOffset =
          fissionRate > 0.1
            ? Math.max(0, Math.sin(elapsed * (3 + fissionRate * 6) + atom.splitPhase)) *
              0.12 *
              fissionRate
            : 0;
        atom.mesh.position.set(
          atom.basePos.x + Math.sin(elapsed * 8 + i) * vib + splitOffset,
          atom.basePos.y + Math.cos(elapsed * 7 + i) * vib,
          atom.basePos.z + Math.sin(elapsed * 9 + i) * vib
        );
        atom.mesh.rotation.y += dt * (1 + fissionRate * 5);
      });

      // Animate Neutrons bouncing inside core & emitting fission sparks
      const neutronSpeed = 0.4 + fissionRate * 4.5;
      neutrons.forEach((n) => {
        n.mesh.visible = fissionRate > 0.04;
        if (!n.mesh.visible) return;
        n.pos.addScaledVector(n.vel, dt * neutronSpeed);

        const dx = n.pos.x - -1.75;
        const dz = n.pos.z - -0.3;
        if (dx * dx + dz * dz > 0.95) {
          n.vel.x = -n.vel.x;
          n.vel.z = -n.vel.z;
          n.pos.x = -1.75 + dx * 0.9;
          n.pos.z = -0.3 + dz * 0.9;
          if (Math.random() < fissionRate * 0.3) {
            sparkPool.spawn({
              x: origin.x + n.pos.x,
              y: origin.y + n.pos.y,
              z: origin.z + n.pos.z,
              vx: (Math.random() - 0.5) * 1.4,
              vy: (Math.random() - 0.5) * 1.4,
              vz: (Math.random() - 0.5) * 1.4,
              r: 0.25,
              g: 0.9,
              b: 1.0,
              life: 0.28,
            });
          }
        }
        if (n.pos.y < 0.85 || n.pos.y > 2.75) {
          n.vel.y = -n.vel.y;
          n.pos.y = THREE.MathUtils.clamp(n.pos.y, 0.86, 2.74);
        }
        n.mesh.position.copy(n.pos);
      });

      // Animate coolant heat flow & steam nozzle blast into nuclear turbine
      coolantOrbs.forEach((o) => {
        o.mesh.visible = isLit && fissionRate > 0.05;
        if (o.mesh.visible) {
          const u = (elapsed * (0.7 + fissionRate * 1.6) + o.offset) % 1;
          o.mesh.position.copy(hotPipeCurve.getPoint(u));
        }
      });
      nucJetMat.opacity = steamPressure * 0.55;
      nucSteamCone.scale.set(
        0.65 + steamPressure * 0.6,
        0.75 + Math.sin(elapsed * 24) * 0.14,
        0.65 + steamPressure * 0.6
      );
      nucSteamOrbs.forEach((o) => {
        o.mesh.visible = isLit && steamPressure > 0.08;
        if (o.mesh.visible) {
          const u = (elapsed * (0.9 + steamPressure * 1.9) + o.offset) % 1;
          o.mesh.position.copy(steamOutCurve.getPoint(u));
        }
      });

      // Nuclear Turbine & High-Resolution Energy Flow Streams
      nucRpmNorm = THREE.MathUtils.damp(nucRpmNorm, steamPressure, 2.4, dt);
      nucTurbineRotor.rotation.x += nucRpmNorm * 30.0 * dt;
      rodGearWheel.rotation.z = -currentRodHeight * Math.PI * 4;

      nucPrimaryStream.update(elapsed, 0.3 + fissionRate * 0.8, fissionRate, isLit);
      nucSteamStream.update(elapsed, 0.4 + nucRpmNorm * 1.15, steamPressure, isLit);

      altCopperMat.emissive.setHex(0x38bdf8);
      altCopperMat.emissiveIntensity = THREE.MathUtils.damp(
        altCopperMat.emissiveIntensity,
        isLit ? steamPressure * 1.1 : 0,
        5,
        dt
      );

      if (steamPressure > 0.08) {
        if (Math.random() < steamPressure * 0.8) {
          steamPool.spawn({
            x: origin.x + 0.65 + (Math.random() - 0.5) * 0.7,
            y: origin.y + 1.0 + Math.random() * 0.7,
            z: origin.z - 0.3 + (Math.random() - 0.5) * 0.7,
            vx: 0,
            vy: 0.9 + Math.random() * 0.9,
            vz: 0,
            r: 0.85,
            g: 0.95,
            b: 1.0,
            life: 0.6,
          });
        }
        // Steam jet spraying directly across turbine blades
        const jetCount = Math.ceil(steamPressure * 3);
        for (let i = 0; i < jetCount; i++) {
          steamPool.spawn({
            x: origin.x + 2.35 + (Math.random() - 0.5) * 0.35,
            y: origin.y + 2.1,
            z: origin.z - 0.3 + (Math.random() - 0.5) * 0.25,
            vx: (Math.random() - 0.5) * 1.1,
            vy: -2.1 - steamPressure * 1.8,
            vz: (Math.random() - 0.5) * 1.1,
            r: 0.92,
            g: 0.97,
            b: 1.0,
            life: 0.42,
          });
        }
        // Billowing white vapor plume from hyperboloid cooling tower top (y = 4.6)
        const towerCount = Math.ceil(steamPressure * 3);
        for (let i = 0; i < towerCount; i++) {
          steamPool.spawn({
            x: origin.x + 2.9 + (Math.random() - 0.5) * 1.1,
            y: origin.y + 4.65,
            z: origin.z - 2.6 + (Math.random() - 0.5) * 1.1,
            vx: (Math.random() - 0.5) * 0.6,
            vy: 1.8 + steamPressure * 2.2,
            vz: (Math.random() - 0.5) * 0.6,
            r: 0.94,
            g: 0.97,
            b: 1.0,
            life: 1.35,
          });
        }
        if (isLit && Math.random() < steamPressure * 0.5) {
          sparkPool.spawn({
            x: origin.x + 3.45 + (Math.random() - 0.5) * 0.5,
            y: origin.y + 1.55 + Math.random() * 0.4,
            z: origin.z - 0.3 + (Math.random() - 0.5) * 0.5,
            vx: (Math.random() - 0.5) * 1.8,
            vy: 0.8 + Math.random() * 1.4,
            vz: (Math.random() - 0.5) * 1.8,
            r: 0.28,
            g: 0.9,
            b: 1.0,
            life: 0.3,
          });
        }
      }
    },
  };
}
