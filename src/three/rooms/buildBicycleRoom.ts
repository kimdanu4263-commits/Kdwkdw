import * as THREE from 'three';
import { MaterialLibrary } from '../materials';
import { ParticlePool } from '../particles';
import { buildPrincipleShowcase } from './buildPrincipleShowcase';
import { STAGES } from '../../types/energy';
import { createEnergyPathStream } from '../energyPathParticles';

export interface BicycleRoom {
  group: THREE.Group;
  interactiveObjects: THREE.Object3D[];
  rideCameraPos: THREE.Vector3;
  update: (dt: number, elapsed: number, rpm: number, isLit: boolean) => void;
}

export function buildBicycleRoom(
  mats: MaterialLibrary,
  sparkPool: ParticlePool
): BicycleRoom {
  const group = new THREE.Group();
  const [cx, cy, cz] = STAGES[1].centerPos;
  const origin = new THREE.Vector3(cx, cy, cz - 0.5);

  const bikeGroup = new THREE.Group();
  bikeGroup.position.copy(origin);

  // Heavy steel trainer stand base
  const basePlate = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 2.4), mats.darkIron);
  basePlate.position.y = 0.04;
  basePlate.receiveShadow = true;
  bikeGroup.add(basePlate);

  // Trainer A-frame supports for rear hub
  const standGeo = new THREE.CylinderGeometry(0.04, 0.055, 0.65, 12);
  [-0.22, 0.22].forEach((sx) => {
    const post = new THREE.Mesh(standGeo, mats.steelBrushed);
    post.position.set(sx, 0.36, 0.65);
    post.rotation.z = sx > 0 ? 0.2 : -0.2;
    bikeGroup.add(post);
  });

  // Bicycle Frame (composite 8+ tubular members)
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0xe11d48,
    metalness: 0.45,
    roughness: 0.48,
    envMapIntensity: 0.15,
  });

  const makeTube = (p1: [number, number, number], p2: [number, number, number], r: number, mat: THREE.Material) => {
    const v1 = new THREE.Vector3(...p1);
    const v2 = new THREE.Vector3(...p2);
    const len = v1.distanceTo(v2);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 12), mat);
    mesh.position.copy(v1).add(v2).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      v2.clone().sub(v1).normalize()
    );
    mesh.castShadow = true;
    return mesh;
  };

  // Bottom bracket at (0, 0.52, 0.05), Rear hub at (0, 0.58, 0.68), Seat cluster (0, 1.05, 0.2), Head tube top (0, 1.12, -0.46)
  bikeGroup.add(makeTube([0, 0.52, 0.05], [0, 1.05, 0.2], 0.032, frameMat)); // seat tube
  bikeGroup.add(makeTube([0, 1.05, 0.2], [0, 1.12, -0.46], 0.032, frameMat)); // top tube
  bikeGroup.add(makeTube([0, 0.52, 0.05], [0, 0.96, -0.44], 0.036, frameMat)); // down tube
  bikeGroup.add(makeTube([0, 1.16, -0.48], [0, 0.88, -0.42], 0.035, frameMat)); // head tube
  bikeGroup.add(makeTube([0, 0.52, 0.05], [-0.1, 0.58, 0.68], 0.022, frameMat)); // chainstay L
  bikeGroup.add(makeTube([0, 0.52, 0.05], [0.1, 0.58, 0.68], 0.022, frameMat)); // chainstay R
  bikeGroup.add(makeTube([0, 1.02, 0.2], [-0.09, 0.58, 0.68], 0.018, frameMat)); // seatstay L
  bikeGroup.add(makeTube([0, 1.02, 0.2], [0.09, 0.58, 0.68], 0.018, frameMat)); // seatstay R
  bikeGroup.add(makeTube([0, 0.9, -0.43], [0, 0.54, -0.58], 0.028, mats.chrome)); // front fork

  // Saddle & Handlebars
  const seatPost = makeTube([0, 1.05, 0.2], [0, 1.24, 0.25], 0.022, mats.chrome);
  bikeGroup.add(seatPost);
  const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.07, 0.34), mats.rubber);
  saddle.position.set(0, 1.27, 0.26);
  bikeGroup.add(saddle);

  const stem = makeTube([0, 1.14, -0.46], [0, 1.32, -0.42], 0.024, mats.chrome);
  bikeGroup.add(stem);
  const handlebar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.62, 12), mats.chrome);
  handlebar.rotation.z = Math.PI / 2;
  handlebar.position.set(0, 1.32, -0.42);
  bikeGroup.add(handlebar);

  // Rear Drive Wheel with spokes
  const rearWheelGroup = new THREE.Group();
  rearWheelGroup.position.set(0, 0.58, 0.68);
  const tireGeo = new THREE.TorusGeometry(0.42, 0.045, 14, 36);
  const rearTire = new THREE.Mesh(tireGeo, mats.rubber);
  rearTire.rotation.y = Math.PI / 2;
  rearWheelGroup.add(rearTire);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.022, 10, 36), mats.chrome);
  rim.rotation.y = Math.PI / 2;
  rearWheelGroup.add(rim);

  for (let i = 0; i < 8; i++) {
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.74, 6), mats.chrome);
    spoke.rotation.x = (i / 8) * Math.PI;
    rearWheelGroup.add(spoke);
  }
  bikeGroup.add(rearWheelGroup);

  // Front Wheel (stationary)
  const frontWheel = new THREE.Mesh(tireGeo, mats.rubber);
  frontWheel.rotation.y = Math.PI / 2;
  frontWheel.position.set(0, 0.54, -0.58);
  bikeGroup.add(frontWheel);

  // Crankset & Pedals
  const crankGroup = new THREE.Group();
  crankGroup.position.set(0, 0.52, 0.05);
  const chainring = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.02, 24), mats.steelBrushed);
  chainring.rotation.z = Math.PI / 2;
  chainring.position.x = 0.08;
  crankGroup.add(chainring);

  const crankArmL = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.24, 0.04), mats.chrome);
  crankArmL.position.set(-0.1, -0.1, 0);
  crankGroup.add(crankArmL);
  const pedalL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.09), mats.hazard);
  pedalL.position.set(-0.18, -0.21, 0);
  crankGroup.add(pedalL);

  const crankArmR = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.24, 0.04), mats.chrome);
  crankArmR.position.set(0.1, 0.1, 0);
  crankGroup.add(crankArmR);
  const pedalR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.09), mats.hazard);
  pedalR.position.set(0.18, 0.21, 0);
  crankGroup.add(pedalR);

  bikeGroup.add(crankGroup);

  // Rear sprocket + Moving 3D Chain Loop between crankset and rear hub
  const rearSprocket = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.065, 0.02, 16),
    mats.steelBrushed
  );
  rearSprocket.rotation.z = Math.PI / 2;
  rearSprocket.position.set(0.08, 0.58, 0.68);
  bikeGroup.add(rearSprocket);

  const chainCurve = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(0.08, 0.66, 0.05),
      new THREE.Vector3(0.08, 0.65, 0.68),
      new THREE.Vector3(0.08, 0.58, 0.74),
      new THREE.Vector3(0.08, 0.51, 0.68),
      new THREE.Vector3(0.08, 0.38, 0.05),
      new THREE.Vector3(0.08, 0.52, -0.09),
    ],
    true
  );
  bikeGroup.add(
    new THREE.Mesh(new THREE.TubeGeometry(chainCurve, 32, 0.014, 6, true), mats.darkIron)
  );
  const chainLinks: { mesh: THREE.Mesh; offset: number }[] = [];
  const linkGeo = new THREE.BoxGeometry(0.026, 0.026, 0.045);
  for (let i = 0; i < 14; i++) {
    const link = new THREE.Mesh(linkGeo, mats.chrome);
    bikeGroup.add(link);
    chainLinks.push({ mesh: link, offset: i / 14 });
  }

  // Dynamo Roller & Copper Stator Generator behind rear wheel
  const dynamoGroup = new THREE.Group();
  dynamoGroup.position.set(0, 0.58, 1.18);

  const dynamoHousing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 0.34, 24),
    mats.darkIron
  );
  dynamoHousing.rotation.z = Math.PI / 2;
  dynamoGroup.add(dynamoHousing);

  const dynamoCopper = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.14, 0.38, 24),
    mats.copper
  );
  dynamoCopper.rotation.z = Math.PI / 2;
  dynamoGroup.add(dynamoCopper);

  const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.22, 18), mats.chrome);
  roller.rotation.z = Math.PI / 2;
  roller.position.z = -0.09;
  dynamoGroup.add(roller);

  bikeGroup.add(dynamoGroup);

  // Energy Storage Capacitor Tower beside bike
  const capGroup = new THREE.Group();
  capGroup.position.set(1.15, 0, 0.65);

  const capBase = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.25, 24), mats.darkIron);
  capBase.position.y = 0.125;
  capGroup.add(capBase);

  const capCoreMat = new THREE.MeshStandardMaterial({
    color: 0x0ea5e9,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.1,
    roughness: 0.2,
  });
  const capCore = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.15, 20), capCoreMat);
  capCore.position.y = 0.85;
  capGroup.add(capCore);

  const capGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 1.25, 24), mats.glass);
  capGlass.position.y = 0.88;
  capGroup.add(capGlass);

  const capLight = new THREE.PointLight(0x38bdf8, 0, 5, 1.8);
  capLight.position.set(0, 0.9, 0.4);
  capGroup.add(capLight);

  bikeGroup.add(capGroup);

  // Power cable from dynamo to capacitor + flowing energy pulses
  const cableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.2, 0.58, 1.18),
    new THREE.Vector3(0.65, 0.15, 1.0),
    new THREE.Vector3(1.15, 0.2, 0.65),
  ]);
  bikeGroup.add(new THREE.Mesh(new THREE.TubeGeometry(cableCurve, 18, 0.025, 8, false), mats.copper));

  const chargeOrbGeo = new THREE.SphereGeometry(0.042, 8, 8);
  const chargeOrbMat = new THREE.MeshStandardMaterial({
    color: 0x7dd3fc,
    emissive: 0x38bdf8,
    emissiveIntensity: 1.6,
  });
  const chargeOrbs: { mesh: THREE.Mesh; offset: number }[] = [];
  for (let i = 0; i < 4; i++) {
    const orb = new THREE.Mesh(chargeOrbGeo, chargeOrbMat);
    orb.visible = false;
    bikeGroup.add(orb);
    chargeOrbs.push({ mesh: orb, offset: i / 4 });
  }

  // Output bus conduit + particle stream from capacitor -> step-up transmission terminal
  const bikeOutCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.2, 0.58, 1.18),
    new THREE.Vector3(0.68, 0.28, 0.96),
    new THREE.Vector3(1.15, 0.85, 0.65),
    new THREE.Vector3(1.15, 1.85, 0.65),
  ]);
  bikeGroup.add(
    new THREE.Mesh(new THREE.TubeGeometry(bikeOutCurve, 18, 0.025, 8, false), mats.copper)
  );
  const bikeOutStream = createEnergyPathStream(bikeOutCurve, 36, 0xfb7185, 0.13);
  bikeGroup.add(bikeOutStream.points);

  // Interactive Hitbox — clicking the bicycle enters/exits riding camera view
  const hitBox = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 1.65, 2.6),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitBox.position.set(0, 0.85, 0.1);
  hitBox.userData = {
    interactType: 'toggle_bicycle',
    label: '자전거에 올라타기 / 내리기',
  };
  bikeGroup.add(hitBox);

  group.add(bikeGroup);

  const showcase = buildPrincipleShowcase(
    'bicycle',
    1,
    new THREE.Vector3(origin.x - 3.6, 0, origin.z),
    mats
  );
  group.add(showcase.group);

  const rideCameraPos = new THREE.Vector3(origin.x, 1.72, origin.z + 0.35);

  let chainPhase = 0;
  const chainTmp = new THREE.Vector3();

  return {
    group,
    interactiveObjects: [hitBox, showcase.hitBox],
    rideCameraPos,
    update: (dt, elapsed, rpm, isLit) => {
      showcase.update(dt, elapsed, isLit);
      const omega = (rpm / 60) * Math.PI * 2;
      crankGroup.rotation.x -= omega * dt;
      rearWheelGroup.rotation.x -= omega * dt * 2.4;
      rearSprocket.rotation.x -= omega * dt * 2.4;
      roller.rotation.x += omega * dt * 8.0;

      chainPhase = (chainPhase + (rpm / 120) * dt * 1.4) % 1;
      for (let i = 0; i < chainLinks.length; i++) {
        const cl = chainLinks[i];
        chainCurve.getPointAt((chainPhase + cl.offset) % 1, chainTmp);
        cl.mesh.position.copy(chainTmp);
      }

      const norm = Math.min(1, rpm / 140);
      capCore.scale.y = 0.25 + norm * 0.85;
      capCore.position.y = 0.25 + (capCore.scale.y * 1.15) * 0.5;
      capCoreMat.emissiveIntensity = THREE.MathUtils.damp(
        capCoreMat.emissiveIntensity,
        isLit ? 0.25 + norm * 2.2 : 0.0,
        8,
        dt
      );
      capLight.intensity = THREE.MathUtils.damp(capLight.intensity, isLit ? norm * 8 : 0, 8, dt);

      chargeOrbs.forEach((o) => {
        o.mesh.visible = isLit && norm > 0.06;
        if (o.mesh.visible) {
          const u = (elapsed * (0.7 + norm * 2.2) + o.offset) % 1;
          o.mesh.position.copy(cableCurve.getPoint(u));
        }
      });
      bikeOutStream.update(elapsed, 0.55 + norm * 1.35, norm, isLit);

      if (isLit && norm > 0.15 && Math.random() < norm * 0.6) {
        sparkPool.spawn({
          x: origin.x + (Math.random() - 0.5) * 0.3,
          y: origin.y + 0.58 + (Math.random() - 0.5) * 0.2,
          z: origin.z + 1.18,
          vx: (Math.random() - 0.5) * 1.5,
          vy: 0.6 + Math.random() * 1.4,
          vz: (Math.random() - 0.5) * 1.5,
          r: 0.25,
          g: 0.9,
          b: 1.0,
          life: 0.32,
        });
      }
    },
  };
}
