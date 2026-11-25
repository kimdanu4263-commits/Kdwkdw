import * as THREE from 'three';
import { MaterialLibrary } from '../materials';
import { ParticlePool } from '../particles';
import { buildPrincipleShowcase } from './buildPrincipleShowcase';
import { STAGES } from '../../types/energy';
import { createEnergyPathStream } from '../energyPathParticles';

export interface ThermalRoom {
  group: THREE.Group;
  interactiveObjects: THREE.Object3D[];
  update: (
    dt: number,
    elapsed: number,
    coalFuel: number,
    steamPressure: number,
    isLit: boolean
  ) => void;
}

export function buildThermalRoom(
  mats: MaterialLibrary,
  firePool: ParticlePool,
  steamPool: ParticlePool,
  sparkPool: ParticlePool
): ThermalRoom {
  const group = new THREE.Group();
  const [cx, cy, cz] = STAGES[3].centerPos;
  const origin = new THREE.Vector3(cx, cy, cz - 0.8);
  const root = new THREE.Group();
  root.position.copy(origin);

  const interactiveObjects: THREE.Object3D[] = [];

  // 1. Coal Bunker & Clickable Coal Chunks on left (x = -2.7, z = 0.6)
  const bunker = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.75, 1.5), mats.darkIron);
  bunker.position.set(-2.75, 0.375, 0.7);
  bunker.receiveShadow = true;
  root.add(bunker);

  const coalCluster = new THREE.Group();
  coalCluster.position.set(-2.75, 0.82, 0.7);
  const coalGeo = new THREE.DodecahedronGeometry(0.18, 0);
  for (let i = 0; i < 16; i++) {
    const chunk = new THREE.Mesh(coalGeo, mats.coal);
    const angle = (i / 16) * Math.PI * 2;
    const rad = (i % 3) * 0.22;
    chunk.position.set(
      Math.cos(angle) * rad,
      (i < 5 ? 0.22 : 0.05) + Math.random() * 0.08,
      Math.sin(angle) * rad
    );
    chunk.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    chunk.scale.set(0.8 + Math.random() * 0.5, 0.7 + Math.random() * 0.4, 0.8 + Math.random() * 0.5);
    chunk.userData = {
      interactType: 'add_coal',
      label: '석탄을 화로에 투입하기',
    };
    coalCluster.add(chunk);
    interactiveObjects.push(chunk);
  }
  root.add(coalCluster);

  // Coal Hitbox for effortless clicking
  const coalHitBox = new THREE.Mesh(
    new THREE.BoxGeometry(1.65, 1.3, 1.65),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  coalHitBox.position.set(-2.75, 0.65, 0.7);
  coalHitBox.userData = {
    interactType: 'add_coal',
    label: '석탄 투입하기 (+연료)',
  };
  root.add(coalHitBox);
  interactiveObjects.push(coalHitBox);

  // 2. Furnace & Boiler Assembly (x = -0.8, z = -0.2)
  const furnaceBody = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.55, 1.8), mats.darkIron);
  furnaceBody.position.set(-0.8, 0.775, -0.2);
  furnaceBody.castShadow = true;
  root.add(furnaceBody);

  // Glowing Firebox Hearth Window on front of furnace
  const emberMat = new THREE.MeshStandardMaterial({
    color: 0x450a0a,
    emissive: 0xf97316,
    emissiveIntensity: 0.15,
    roughness: 0.7,
  });
  const fireboxBed = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.62, 0.25), emberMat);
  fireboxBed.position.set(-0.8, 0.65, 0.66);
  fireboxBed.userData = {
    interactType: 'add_coal',
    label: '화로에 석탄 넣기',
  };
  root.add(fireboxBed);
  interactiveObjects.push(fireboxBed);

  // Firebox grate bars
  for (let i = -3; i <= 3; i++) {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.65, 6), mats.steelBrushed);
    bar.position.set(-0.8 + i * 0.14, 0.65, 0.8);
    root.add(bar);
  }

  const fireLight = new THREE.PointLight(0xff6b1a, 0, 8, 1.6);
  fireLight.position.set(-0.8, 0.9, 1.2);
  root.add(fireLight);

  // Transparent Glass Boiler Drum above Furnace (y = 2.45)
  const boilerFrameTop = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.16, 28), mats.steelBrushed);
  boilerFrameTop.position.set(-0.8, 3.25, -0.2);
  root.add(boilerFrameTop);
  const boilerFrameBot = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.16, 28), mats.steelBrushed);
  boilerFrameBot.position.set(-0.8, 1.62, -0.2);
  root.add(boilerFrameBot);

  const boilerGlass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.78, 0.78, 1.55, 28),
    mats.glass
  );
  boilerGlass.position.set(-0.8, 2.44, -0.2);
  boilerGlass.renderOrder = 3;
  root.add(boilerGlass);

  // Water inside Boiler
  const boilerWaterMat = mats.water.clone();
  const boilerWater = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.7, 0.95, 24),
    boilerWaterMat
  );
  boilerWater.position.set(-0.8, 2.18, -0.2);
  root.add(boilerWater);

  // Red-hot heat exchanger tubes submerged inside boiler
  const heatPipeMat = new THREE.MeshStandardMaterial({
    color: 0x3f2e2b,
    emissive: 0xef4444,
    emissiveIntensity: 0.0,
    metalness: 0.8,
    roughness: 0.35,
  });
  for (let i = -2; i <= 2; i++) {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 10), heatPipeMat);
    tube.position.set(-0.8 + i * 0.22, 2.25, -0.2);
    root.add(tube);
  }

  // 3. Steam Pipe & Pressure Gauge leading to Turbine (x = 1.9)
  const steamPipeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.8, 3.3, -0.2),
    new THREE.Vector3(-0.8, 3.85, -0.2),
    new THREE.Vector3(1.55, 3.85, -0.2),
    new THREE.Vector3(1.55, 2.35, -0.2),
  ]);
  const steamPipe = new THREE.Mesh(
    new THREE.TubeGeometry(steamPipeCurve, 28, 0.14, 12, false),
    mats.steelBrushed
  );
  root.add(steamPipe);

  // Pressure Gauge Dial on Pipe
  const gaugeRing = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 20), mats.hazard);
  gaugeRing.rotation.x = Math.PI / 2;
  gaugeRing.position.set(0.38, 3.85, 0.02);
  root.add(gaugeRing);

  const gaugeNeedlePivot = new THREE.Group();
  gaugeNeedlePivot.position.set(0.38, 3.85, 0.07);
  const gaugeNeedle = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.16, 0.02),
    new THREE.MeshBasicMaterial({ color: 0xef4444 })
  );
  gaugeNeedle.position.y = 0.07;
  gaugeNeedlePivot.add(gaugeNeedle);
  root.add(gaugeNeedlePivot);

  // 4. Cutaway Multi-Stage Steam Turbine & Generator (x = 1.85, y = 1.4, z = -0.2)
  const turbineStand = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.85, 1.3), mats.darkIron);
  turbineStand.position.set(2.0, 0.425, -0.2);
  root.add(turbineStand);

  const steamTurbineRotor = new THREE.Group();
  steamTurbineRotor.position.set(1.55, 1.45, -0.2);

  const tShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.2, 16), mats.chrome);
  tShaft.rotation.z = Math.PI / 2;
  tShaft.position.x = 0.5;
  steamTurbineRotor.add(tShaft);

  // 3 stages of turbine discs with angled blades
  [-0.35, 0.0, 0.35].forEach((offsetX, stageIdx) => {
    const r = 0.32 + stageIdx * 0.08;
    for (let b = 0; b < 10; b++) {
      const ang = (b / 10) * Math.PI * 2;
      const fin = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, r * 0.85, 0.04),
        mats.steelBrushed
      );
      fin.position.set(offsetX, Math.cos(ang) * r, Math.sin(ang) * r);
      fin.rotation.x = ang;
      fin.rotation.y = 0.4;
      steamTurbineRotor.add(fin);
    }
  });
  root.add(steamTurbineRotor);

  // Glass turbine shroud so the spinning blades are clearly visible
  const shroud = new THREE.Mesh(
    new THREE.CylinderGeometry(0.66, 0.66, 1.15, 24),
    mats.glass
  );
  shroud.rotation.z = Math.PI / 2;
  shroud.position.set(1.55, 1.45, -0.2);
  shroud.renderOrder = 3;
  root.add(shroud);

  // Generator Unit coupled on right (x = 2.7)
  const genBody = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.54, 0.9, 24), mats.darkIron);
  genBody.rotation.z = Math.PI / 2;
  genBody.position.set(2.72, 1.45, -0.2);
  root.add(genBody);

  const genCopperMat = mats.copper.clone();
  const genCopper = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, 0.96, 24),
    genCopperMat
  );
  genCopper.rotation.z = Math.PI / 2;
  genCopper.position.set(2.72, 1.45, -0.2);
  root.add(genCopper);

  // 5. Industrial Smokestack Flue & Condenser Cooling Unit
  const flue = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 4.4, 20), mats.darkIron);
  flue.position.set(-1.35, 2.2, -1.55);
  root.add(flue);
  const flueBand = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.25, 20), mats.hazard);
  flueBand.position.set(-1.35, 3.85, -1.55);
  root.add(flueBand);

  const chute = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.14, 0.48), mats.steelBrushed);
  chute.position.set(-1.85, 0.86, 0.35);
  chute.rotation.z = -0.18;
  chute.rotation.y = 0.45;
  root.add(chute);

  const condenser = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.35, 20), mats.steelBrushed);
  condenser.rotation.z = Math.PI / 2;
  condenser.position.set(1.55, 0.55, -1.45);
  root.add(condenser);

  // Condenser cooling fan spinning at back
  const condenserFan = new THREE.Group();
  condenserFan.position.set(2.26, 0.55, -1.45);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const fBlade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.36, 0.1), mats.chrome);
    fBlade.position.set(0, Math.cos(a) * 0.22, Math.sin(a) * 0.22);
    fBlade.rotation.x = a;
    condenserFan.add(fBlade);
  }
  root.add(condenserFan);

  // Visible pressurized steam jet cone shooting into turbine blades from overhead pipe
  const jetMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    emissive: 0xbae6fd,
    emissiveIntensity: 0.4,
    transparent: true,
    opacity: 0.0,
    roughness: 0.8,
  });
  const steamJetCone = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.72, 16), jetMat);
  steamJetCone.position.set(1.55, 1.98, -0.2);
  root.add(steamJetCone);

  // Steam flow rings moving along steamPipeCurve
  const steamPulseGeo = new THREE.SphereGeometry(0.11, 8, 8);
  const steamPulses: { mesh: THREE.Mesh; offset: number }[] = [];
  for (let i = 0; i < 5; i++) {
    const sp = new THREE.Mesh(steamPulseGeo, jetMat);
    sp.visible = false;
    root.add(sp);
    steamPulses.push({ mesh: sp, offset: i / 5 });
  }

  // Mechanical Steam Throttle Governor Linkage & Cam Piston beside turbine
  const govPiston = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.7, 10), mats.chrome);
  govPiston.position.set(0.75, 2.65, 0.05);
  root.add(govPiston);
  const govValveWheel = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.03, 8, 16), mats.hazard);
  govValveWheel.position.set(0.75, 3.05, 0.05);
  root.add(govValveWheel);

  // High-Resolution Energy Flow Particle Streams (Heat -> Steam Pipe -> Turbine -> Generator)
  const thermalHeatCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.8, 0.65, 0.1),
    new THREE.Vector3(-0.8, 1.9, -0.2),
    new THREE.Vector3(-0.8, 3.2, -0.2),
    new THREE.Vector3(-0.8, 3.85, -0.2),
    new THREE.Vector3(1.55, 3.85, -0.2),
    new THREE.Vector3(1.55, 1.6, -0.2),
  ]);
  const thermalSteamStream = createEnergyPathStream(thermalHeatCurve, 64, 0xfb923c, 0.14);
  root.add(thermalSteamStream.points);

  const thermalElectricCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.55, 1.45, -0.2),
    new THREE.Vector3(2.25, 1.45, -0.2),
    new THREE.Vector3(2.75, 1.45, -0.2),
    new THREE.Vector3(2.95, 2.1, -0.2),
  ]);
  root.add(
    new THREE.Mesh(new THREE.TubeGeometry(thermalElectricCurve, 16, 0.03, 8, false), mats.copper)
  );
  const thermalElectricStream = createEnergyPathStream(thermalElectricCurve, 48, 0xfde047, 0.14);
  root.add(thermalElectricStream.points);

  group.add(root);

  const showcase = buildPrincipleShowcase(
    'thermal',
    3,
    new THREE.Vector3(origin.x - 5.2, 0, origin.z + 1.0),
    mats
  );
  group.add(showcase.group);
  interactiveObjects.push(showcase.hitBox);

  let thermalRpmNorm = 0;

  return {
    group,
    interactiveObjects,
    update: (dt, elapsed, coalFuel, steamPressure, isLit) => {
      showcase.update(dt, elapsed, isLit);
      const heatNorm = Math.min(1, coalFuel / 80);

      emberMat.emissiveIntensity = THREE.MathUtils.damp(
        emberMat.emissiveIntensity,
        isLit ? 0.1 + heatNorm * (2.2 + Math.sin(elapsed * 9) * 0.4) : 0.0,
        6,
        dt
      );
      fireLight.intensity = THREE.MathUtils.damp(
        fireLight.intensity,
        heatNorm * (14 + Math.sin(elapsed * 11) * 3),
        8,
        dt
      );
      heatPipeMat.emissiveIntensity = THREE.MathUtils.damp(
        heatPipeMat.emissiveIntensity,
        heatNorm * 1.8,
        4,
        dt
      );

      // Gauge needle & turbine spin
      gaugeNeedlePivot.rotation.z = THREE.MathUtils.damp(
        gaugeNeedlePivot.rotation.z,
        1.1 - steamPressure * 2.2,
        6,
        dt
      );
      thermalRpmNorm = THREE.MathUtils.damp(thermalRpmNorm, steamPressure, 2.5, dt);
      steamTurbineRotor.rotation.x += thermalRpmNorm * 26.0 * dt;
      condenserFan.rotation.x += (0.5 + thermalRpmNorm * 14.0) * dt;
      govValveWheel.rotation.z = THREE.MathUtils.damp(
        govValveWheel.rotation.z,
        steamPressure * Math.PI * 3,
        4,
        dt
      );
      govPiston.position.y = 2.62 + Math.sin(elapsed * (3 + thermalRpmNorm * 12)) * 0.08 * thermalRpmNorm;

      thermalSteamStream.update(elapsed, 0.4 + steamPressure * 0.95, Math.max(heatNorm * 0.4, steamPressure), isLit);
      thermalElectricStream.update(elapsed, 0.45 + thermalRpmNorm * 1.15, thermalRpmNorm, isLit);

      jetMat.opacity = steamPressure * 0.55;
      steamJetCone.scale.set(
        0.6 + steamPressure * 0.6,
        0.7 + Math.sin(elapsed * 22) * 0.15,
        0.6 + steamPressure * 0.6
      );
      steamPulses.forEach((sp) => {
        sp.mesh.visible = isLit && steamPressure > 0.08;
        if (sp.mesh.visible) {
          const u = (elapsed * (0.8 + steamPressure * 1.7) + sp.offset) % 1;
          sp.mesh.position.copy(steamPipeCurve.getPoint(u));
        }
      });

      genCopperMat.emissive.setHex(0xf59e0b);
      genCopperMat.emissiveIntensity = THREE.MathUtils.damp(
        genCopperMat.emissiveIntensity,
        isLit ? steamPressure * 0.85 : 0,
        6,
        dt
      );

      // Fire & ember particles in hearth + smokestack exhaust when burning coal
      if (heatNorm > 0.08) {
        if (Math.random() < heatNorm * 0.85) {
          firePool.spawn({
            x: origin.x - 0.8 + (Math.random() - 0.5) * 0.9,
            y: origin.y + 0.5 + Math.random() * 0.3,
            z: origin.z + 0.65,
            vx: (Math.random() - 0.5) * 0.4,
            vy: 1.0 + Math.random() * 1.6,
            vz: 0.2 + Math.random() * 0.4,
            r: 1.0,
            g: 0.42 + Math.random() * 0.35,
            b: 0.08,
            life: 0.45 + Math.random() * 0.25,
          });
        }
        if (Math.random() < heatNorm * 0.55) {
          steamPool.spawn({
            x: origin.x - 1.35 + (Math.random() - 0.5) * 0.25,
            y: origin.y + 4.45,
            z: origin.z - 1.55 + (Math.random() - 0.5) * 0.25,
            vx: (Math.random() - 0.5) * 0.4,
            vy: 1.4 + heatNorm * 1.6,
            vz: (Math.random() - 0.5) * 0.4,
            r: 0.65,
            g: 0.7,
            b: 0.78,
            life: 1.15,
          });
        }
      }

      // Boiling bubbles inside glass boiler + pressurized downward steam jet onto turbine
      if (steamPressure > 0.08) {
        if (Math.random() < steamPressure * 0.85) {
          steamPool.spawn({
            x: origin.x - 0.8 + (Math.random() - 0.5) * 0.9,
            y: origin.y + 1.85 + Math.random() * 0.6,
            z: origin.z - 0.2 + (Math.random() - 0.5) * 0.9,
            vx: (Math.random() - 0.5) * 0.3,
            vy: 0.8 + Math.random() * 0.9,
            vz: (Math.random() - 0.5) * 0.3,
            r: 0.9,
            g: 0.96,
            b: 1.0,
            life: 0.6,
          });
        }
        // High-pressure nozzle jet spraying directly across turbine blades
        const nozzleCount = Math.ceil(steamPressure * 4);
        for (let i = 0; i < nozzleCount; i++) {
          steamPool.spawn({
            x: origin.x + 1.55 + (Math.random() - 0.5) * 0.35,
            y: origin.y + 2.25,
            z: origin.z - 0.2 + (Math.random() - 0.5) * 0.25,
            vx: (Math.random() - 0.5) * 1.2,
            vy: -2.2 - steamPressure * 1.8,
            vz: (Math.random() - 0.5) * 1.2,
            r: 0.92,
            g: 0.96,
            b: 1.0,
            life: 0.45,
          });
        }
        if (isLit && Math.random() < steamPressure * 0.45) {
          sparkPool.spawn({
            x: origin.x + 2.72 + (Math.random() - 0.5) * 0.5,
            y: origin.y + 1.55 + Math.random() * 0.4,
            z: origin.z - 0.2 + (Math.random() - 0.5) * 0.5,
            vx: (Math.random() - 0.5) * 1.8,
            vy: 0.8 + Math.random() * 1.3,
            vz: (Math.random() - 0.5) * 1.8,
            r: 1.0,
            g: 0.78,
            b: 0.25,
            life: 0.3,
          });
        }
      }
    },
  };
}
