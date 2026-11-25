import * as THREE from 'three';
import { MaterialLibrary } from '../materials';
import { ParticlePool } from '../particles';
import { buildPrincipleShowcase } from './buildPrincipleShowcase';
import { STAGES } from '../../types/energy';
import { createEnergyPathStream } from '../energyPathParticles';

export interface HydroRoom {
  group: THREE.Group;
  gateInteractiveObjects: THREE.Object3D[];
  update: (dt: number, elapsed: number, gateOpen: number, isLit: boolean) => void;
}

export function buildHydroRoom(
  mats: MaterialLibrary,
  waterPool: ParticlePool,
  sparkPool: ParticlePool
): HydroRoom {
  const group = new THREE.Group();
  const [cx, cy, cz] = STAGES[2].centerPos;
  const origin = new THREE.Vector3(cx, cy, cz - 0.8);
  const root = new THREE.Group();
  root.position.copy(origin);

  // Lower Tailrace Splash Pool
  const poolBase = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.3, 4.2), mats.darkIron);
  poolBase.position.set(0, 0.15, 0.8);
  poolBase.receiveShadow = true;
  root.add(poolBase);

  const poolWallGeo = new THREE.BoxGeometry(7.2, 0.7, 0.16);
  const poolFront = new THREE.Mesh(poolWallGeo, mats.glass);
  poolFront.position.set(0, 0.55, 2.85);
  root.add(poolFront);

  const lowerWater = new THREE.Mesh(new THREE.PlaneGeometry(7.0, 3.9, 24, 14), mats.water);
  lowerWater.rotation.x = -Math.PI / 2;
  lowerWater.position.set(0, 0.62, 0.85);
  root.add(lowerWater);

  // Upper Concrete & Glass Dam Reservoir (elevated high on back side z = -1.6)
  const damWall = new THREE.Mesh(new THREE.BoxGeometry(7.4, 3.2, 2.4), mats.wallDark);
  damWall.position.set(0, 1.6, -1.8);
  damWall.castShadow = true;
  damWall.receiveShadow = true;
  root.add(damWall);

  // Glass tank walls at top holding high water (y = 3.2..5.0)
  const tankBack = new THREE.Mesh(new THREE.BoxGeometry(7.2, 1.8, 0.14), mats.darkIron);
  tankBack.position.set(0, 4.1, -2.9);
  root.add(tankBack);

  const tankSideGeo = new THREE.BoxGeometry(0.14, 1.8, 2.4);
  const tankL = new THREE.Mesh(tankSideGeo, mats.glass);
  tankL.position.set(-3.55, 4.1, -1.75);
  root.add(tankL);
  const tankR = new THREE.Mesh(tankSideGeo, mats.glass);
  tankR.position.set(3.55, 4.1, -1.75);
  root.add(tankR);

  // Front reservoir glass panels flanking the sluice gate opening (width 1.4m in center)
  const frontTankGeo = new THREE.BoxGeometry(2.85, 1.8, 0.14);
  const frontL = new THREE.Mesh(frontTankGeo, mats.glass);
  frontL.position.set(-2.15, 4.1, -0.62);
  root.add(frontL);
  const frontR = new THREE.Mesh(frontTankGeo, mats.glass);
  frontR.position.set(2.15, 4.1, -0.62);
  root.add(frontR);

  // Upper Reservoir Water Volume
  const upperWaterMat = mats.water.clone();
  const upperWater = new THREE.Mesh(new THREE.BoxGeometry(6.95, 1.45, 2.15), upperWaterMat);
  upperWater.position.set(0, 3.92, -1.75);
  root.add(upperWater);

  // Steel Sluice Gate Frame & Movable Gate Door (at x=0, y=3.2..4.6, z=-0.62)
  const gatePostGeo = new THREE.BoxGeometry(0.16, 2.2, 0.24);
  const postL = new THREE.Mesh(gatePostGeo, mats.hazard);
  postL.position.set(-0.78, 4.1, -0.6);
  root.add(postL);
  const postR = new THREE.Mesh(gatePostGeo, mats.hazard);
  postR.position.set(0.78, 4.1, -0.6);
  root.add(postR);

  const sluiceGate = new THREE.Mesh(new THREE.BoxGeometry(1.42, 1.45, 0.12), mats.steelBrushed);
  sluiceGate.position.set(0, 3.92, -0.58);
  sluiceGate.userData = {
    interactType: 'toggle_hydro_gate',
    label: '수문 열기 / 닫기',
  };
  root.add(sluiceGate);

  // Handwheel Actuator on Front Platform (easy to click at eye level!)
  const wheelStand = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.25, 12), mats.darkIron);
  wheelStand.position.set(-1.55, 0.625, 2.55);
  root.add(wheelStand);

  const handWheelGroup = new THREE.Group();
  handWheelGroup.position.set(-1.55, 1.32, 2.65);
  const wheelRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.28, 0.035, 10, 24),
    new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.35, metalness: 0.4 })
  );
  handWheelGroup.add(wheelRim);
  for (let i = 0; i < 4; i++) {
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.54, 8), mats.chrome);
    spoke.rotation.z = (i / 4) * Math.PI;
    handWheelGroup.add(spoke);
  }
  const wheelHit = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 12, 10),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  wheelHit.userData = {
    interactType: 'toggle_hydro_gate',
    label: '수문 밸브 조절 (열기/닫기)',
  };
  handWheelGroup.add(wheelHit);
  root.add(handWheelGroup);

  // Curved Spillway / Penstock Chute from gate down to turbine
  const chuteCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 3.25, -0.55),
    new THREE.Vector3(0, 2.7, -0.05),
    new THREE.Vector3(0, 2.05, 0.38),
  ]);
  const chuteMesh = new THREE.Mesh(
    new THREE.TubeGeometry(chuteCurve, 16, 0.38, 12, false),
    mats.glass
  );
  root.add(chuteMesh);

  // Volumetric Water Jet Stream (scales with gate opening, glare-free)
  const waterStreamMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.25,
    roughness: 0.35,
    transparent: true,
    opacity: 0.0,
    envMapIntensity: 0.0,
  });
  const waterStream = new THREE.Mesh(
    new THREE.TubeGeometry(chuteCurve, 16, 0.28, 12, false),
    waterStreamMat
  );
  root.add(waterStream);

  // Flowing water pulse packets inside spillway chute
  const waterDropMat = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.55,
    roughness: 0.3,
  });
  const waterDrops: { mesh: THREE.Mesh; offset: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), waterDropMat);
    drop.visible = false;
    root.add(drop);
    waterDrops.push({ mesh: drop, offset: i / 6 });
  }

  // Pelton Water Turbine & Generator Assembly at (0, 1.35, 0.65)
  const turbineSupportL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.35, 0.6), mats.darkIron);
  turbineSupportL.position.set(-0.95, 0.72, 0.65);
  root.add(turbineSupportL);
  const turbineSupportR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.35, 0.6), mats.darkIron);
  turbineSupportR.position.set(0.95, 0.72, 0.65);
  root.add(turbineSupportR);

  const turbineRotor = new THREE.Group();
  turbineRotor.position.set(0, 1.38, 0.65);

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.72, 24), mats.chrome);
  hub.rotation.z = Math.PI / 2;
  turbineRotor.add(hub);

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 3.2, 16), mats.steelBrushed);
  shaft.rotation.z = Math.PI / 2;
  shaft.position.x = 0.6;
  turbineRotor.add(shaft);

  // 12 curved turbine buckets
  const bladeGeo = new THREE.BoxGeometry(0.56, 0.42, 0.06);
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2;
    const blade = new THREE.Mesh(bladeGeo, mats.steelBrushed);
    blade.position.set(0, Math.cos(ang) * 0.56, Math.sin(ang) * 0.56);
    blade.rotation.x = ang + 0.35;
    blade.castShadow = true;
    turbineRotor.add(blade);
  }
  root.add(turbineRotor);

  // Copper/Steel Generator Drum on the right (x = 1.95)
  const genDrum = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.65, 1.1, 28),
    mats.darkIron
  );
  genDrum.rotation.z = Math.PI / 2;
  genDrum.position.set(1.95, 1.38, 0.65);
  genDrum.castShadow = true;
  root.add(genDrum);

  const genCoilMat = mats.copper.clone();
  const genCoil = new THREE.Mesh(
    new THREE.CylinderGeometry(0.54, 0.54, 1.18, 28),
    genCoilMat
  );
  genCoil.rotation.z = Math.PI / 2;
  genCoil.position.set(1.95, 1.38, 0.65);
  root.add(genCoil);

  const genLight = new THREE.PointLight(0x38bdf8, 0, 6, 1.6);
  genLight.position.set(1.95, 2.2, 1.2);
  root.add(genLight);

  // Concrete Dam Buttresses & Step-up Transformer with Cooling Fins
  [-3.2, 3.2].forEach((bx) => {
    const buttress = new THREE.Mesh(new THREE.BoxGeometry(0.45, 3.3, 1.4), mats.wallDark);
    buttress.position.set(bx, 1.65, -0.45);
    root.add(buttress);
  });
  const xfmr = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.1, 0.8), mats.darkIron);
  xfmr.position.set(3.25, 0.55, 0.65);
  root.add(xfmr);
  for (let f = -3; f <= 3; f++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.85, 0.92), mats.steelBrushed);
    fin.position.set(3.25 + f * 0.12, 0.58, 0.65);
    root.add(fin);
  }

  // Copper busbar from generator to transformer + glowing electricity packets
  const busCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(2.45, 1.38, 0.65),
    new THREE.Vector3(2.88, 1.32, 0.65),
    new THREE.Vector3(3.25, 1.08, 0.65),
  ]);
  root.add(new THREE.Mesh(new THREE.TubeGeometry(busCurve, 12, 0.035, 8, false), mats.copper));
  const hydroOrbs: { mesh: THREE.Mesh; offset: number }[] = [];
  const hydroOrbMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0x38bdf8,
    emissiveIntensity: 1.5,
  });
  for (let i = 0; i < 4; i++) {
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), hydroOrbMat);
    orb.visible = false;
    root.add(orb);
    hydroOrbs.push({ mesh: orb, offset: i / 4 });
  }

  // Mechanical Flyball Speed Governor mounted on turbine coupling (spins & spreads out with RPM!)
  const governorGroup = new THREE.Group();
  governorGroup.position.set(1.18, 1.38, 0.65);
  const govPivot = new THREE.Group();
  governorGroup.add(govPivot);
  const govArmL = new THREE.Group();
  const govArmR = new THREE.Group();
  const ballGeo = new THREE.SphereGeometry(0.08, 10, 10);
  const armGeo = new THREE.BoxGeometry(0.025, 0.34, 0.025);
  const bL = new THREE.Mesh(ballGeo, mats.hazard);
  bL.position.y = 0.32;
  govArmL.add(new THREE.Mesh(armGeo, mats.chrome).translateY(0.16), bL);
  const bR = new THREE.Mesh(ballGeo, mats.hazard);
  bR.position.y = 0.32;
  govArmR.add(new THREE.Mesh(armGeo, mats.chrome).translateY(0.16), bR);
  govPivot.add(govArmL, govArmR);
  root.add(governorGroup);

  // High-Resolution Energy Flow Particle Streams (Upper Reservoir -> Chute -> Turbine -> Generator -> Transformer)
  const hydroKineticCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 4.05, -1.75),
    new THREE.Vector3(0, 3.35, -0.6),
    new THREE.Vector3(0, 2.7, -0.05),
    new THREE.Vector3(0, 1.9, 0.45),
    new THREE.Vector3(0, 1.38, 0.65),
  ]);
  const hydroKineticStream = createEnergyPathStream(hydroKineticCurve, 54, 0x38bdf8, 0.14);
  root.add(hydroKineticStream.points);

  const hydroElectricCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1.38, 0.65),
    new THREE.Vector3(1.1, 1.38, 0.65),
    new THREE.Vector3(1.95, 1.38, 0.65),
    new THREE.Vector3(2.85, 1.32, 0.65),
    new THREE.Vector3(3.25, 0.95, 0.65),
    new THREE.Vector3(3.25, 1.95, 0.65),
  ]);
  const hydroElectricStream = createEnergyPathStream(hydroElectricCurve, 52, 0xfde047, 0.15);
  root.add(hydroElectricStream.points);

  group.add(root);

  const showcase = buildPrincipleShowcase(
    'hydro',
    2,
    new THREE.Vector3(origin.x - 5.5, 0, origin.z + 1.2),
    mats
  );
  group.add(showcase.group);

  let currentGateY = 0;
  let wheelAngle = 0;
  let turbineRpmNorm = 0;

  return {
    group,
    gateInteractiveObjects: [sluiceGate, wheelHit, showcase.hitBox],
    update: (dt, elapsed, gateOpen, isLit) => {
      showcase.update(dt, elapsed, isLit);
      currentGateY = THREE.MathUtils.damp(currentGateY, gateOpen, 5.0, dt);
      sluiceGate.position.y = 3.92 + currentGateY * 1.15;

      const targetWheel = gateOpen * Math.PI * 4;
      wheelAngle = THREE.MathUtils.damp(wheelAngle, targetWheel, 6.0, dt);
      handWheelGroup.rotation.z = -wheelAngle;

      // Water stream visibility & inertia-damped Pelton turbine RPM
      waterStreamMat.opacity = currentGateY * 0.78;
      waterStream.scale.set(0.4 + currentGateY * 0.6, 1, 0.4 + currentGateY * 0.6);

      turbineRpmNorm = THREE.MathUtils.damp(turbineRpmNorm, currentGateY, 2.8, dt);
      turbineRotor.rotation.x += turbineRpmNorm * 16.5 * dt;

      // Governor flyballs spin & flare outward cleanly with turbine speed
      govPivot.rotation.x += turbineRpmNorm * 16.5 * dt;
      govArmL.rotation.z = 0.25 + turbineRpmNorm * 0.75;
      govArmR.rotation.z = -(0.25 + turbineRpmNorm * 0.75);

      hydroKineticStream.update(elapsed, 0.35 + currentGateY * 0.9, currentGateY, isLit);
      hydroElectricStream.update(elapsed, 0.4 + turbineRpmNorm * 1.15, turbineRpmNorm, isLit);

      // Upper reservoir level gently breathes
      upperWater.position.y = 3.92 - currentGateY * 0.08 + Math.sin(elapsed * 2.2) * 0.015;

      genCoilMat.emissive.setHex(0x38bdf8);
      genCoilMat.emissiveIntensity = THREE.MathUtils.damp(
        genCoilMat.emissiveIntensity,
        isLit ? currentGateY * 0.95 : 0,
        6,
        dt
      );
      genLight.intensity = THREE.MathUtils.damp(
        genLight.intensity,
        isLit ? currentGateY * 10 : 0,
        6,
        dt
      );

      // Animate water pulse packets falling down spillway & electric orbs to transformer
      waterDrops.forEach((d) => {
        d.mesh.visible = currentGateY > 0.04;
        if (d.mesh.visible) {
          const u = (elapsed * (0.9 + currentGateY * 1.6) + d.offset) % 1;
          d.mesh.position.copy(chuteCurve.getPoint(u));
          d.mesh.scale.setScalar(0.5 + currentGateY * 0.7);
        }
      });
      hydroOrbs.forEach((o) => {
        o.mesh.visible = isLit && currentGateY > 0.06;
        if (o.mesh.visible) {
          const u = (elapsed * (0.8 + currentGateY * 1.9) + o.offset) % 1;
          o.mesh.position.copy(busCurve.getPoint(u));
        }
      });

      // Waterfall & Pelton splash spray particles bouncing off spinning turbine
      if (currentGateY > 0.05) {
        const spawns = Math.ceil(currentGateY * 8);
        for (let i = 0; i < spawns; i++) {
          waterPool.spawn({
            x: origin.x + (Math.random() - 0.5) * 0.75,
            y: origin.y + 1.85 + Math.random() * 0.45,
            z: origin.z + 0.42 + Math.random() * 0.35,
            vx: (Math.random() - 0.5) * 2.2,
            vy: -1.4 - Math.random() * 2.2,
            vz: 0.7 + Math.random() * 2.1,
            r: 0.72,
            g: 0.92,
            b: 1.0,
            life: 0.6 + Math.random() * 0.35,
          });
        }
        if (isLit && Math.random() < currentGateY * 0.55) {
          sparkPool.spawn({
            x: origin.x + 1.95 + (Math.random() - 0.5) * 0.6,
            y: origin.y + 1.5 + Math.random() * 0.5,
            z: origin.z + 0.65 + (Math.random() - 0.5) * 0.5,
            vx: (Math.random() - 0.5) * 1.8,
            vy: 0.8 + Math.random() * 1.5,
            vz: (Math.random() - 0.5) * 1.8,
            r: 0.3,
            g: 0.85,
            b: 1.0,
            life: 0.32,
          });
        }
      }
    },
  };
}
