import * as THREE from 'three';
import { MaterialLibrary } from '../materials';
import { ProceduralTextureSet } from '../../utils/textures';
import { STAGES } from '../../types/energy';
import { createEnergyPathStream } from '../energyPathParticles';

export interface CityHall {
  group: THREE.Group;
  interactiveObjects: THREE.Object3D[];
  update: (
    dt: number,
    elapsed: number,
    cityLit: boolean,
    powerRatio: number,
    flowHighlight: boolean
  ) => void;
}

function seededRand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function buildCityHall(
  mats: MaterialLibrary,
  textures: ProceduralTextureSet
): CityHall {
  const group = new THREE.Group();
  const interactiveObjects: THREE.Object3D[] = [];

  // Aligns local z = -110 to STAGES[6].spawnPos[2] (-55.0)
  // Aligns local seoulCenterZ = -142.5 to world z = -87.5
  const cityRoot = new THREE.Group();
  cityRoot.position.z = STAGES[6].spawnPos[2] + 110.0;
  group.add(cityRoot);

  // Energy City (Seoul) is ALWAYS visible from frame 1 so users immediately observe its dark -> lit response
  const seoulGroup = new THREE.Group();
  seoulGroup.visible = true;
  cityRoot.add(seoulGroup);

  // Foreground Substation Overlook Terrace at local (0, 0, -110.0) -> world z = -55.0
  const terraceGroup = new THREE.Group();
  terraceGroup.visible = true;
  cityRoot.add(terraceGroup);

  const terraceDeck = new THREE.Mesh(
    new THREE.BoxGeometry(24, 2.5, 8.6),
    mats.concreteFloor
  );
  terraceDeck.position.set(0, 1.25, -110.0);
  terraceDeck.receiveShadow = true;
  terraceGroup.add(terraceDeck);

  // Entry stairs from Substation plaza (local z = -101.4 -> -105.6)
  for (let s = 0; s < 8; s++) {
    const h = ((s + 1) / 8) * 2.5;
    const step = new THREE.Mesh(new THREE.BoxGeometry(10, h, 0.56), mats.concreteFloor);
    step.position.set(0, h / 2, -101.6 - s * 0.52);
    terraceGroup.add(step);
  }

  // Overlook balustrade rail facing north toward Seoul
  const railGlass = new THREE.Mesh(new THREE.BoxGeometry(17.2, 0.95, 0.06), mats.glass);
  railGlass.position.set(0, 2.98, -114.22);
  terraceGroup.add(railGlass);

  const railTop = new THREE.Mesh(new THREE.BoxGeometry(17.4, 0.07, 0.1), mats.steelBrushed);
  railTop.position.set(0, 3.48, -114.22);
  terraceGroup.add(railTop);

  // Left & Right Walk-In Stairways descending into Miniature Seoul Streets
  [-10.4, 10.4].forEach((sx) => {
    for (let st = 0; st < 8; st++) {
      const h = 2.5 - ((st + 1) / 8) * 2.1;
      const step = new THREE.Mesh(new THREE.BoxGeometry(3.2, h, 0.72), mats.concreteFloor);
      step.position.set(sx, h / 2, -114.5 - st * 0.68);
      terraceGroup.add(step);
    }
    const signOrb = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 12, 10),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.75,
      })
    );
    signOrb.position.set(sx, 2.95, -114.2);
    signOrb.userData = {
      interactType: 'enter_seoul',
      label: '서울 도시 안으로 들어가기',
    };
    terraceGroup.add(signOrb);
    interactiveObjects.push(signOrb);
  });

  // Terrace City Grid Master Switch on Overlook (toggles city lighting ON/OFF)
  const subGroup = new THREE.Group();
  subGroup.position.set(0, 2.5, -112.2);
  const subBase = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.95, 1.0), mats.darkIron);
  subBase.position.y = 0.475;
  subGroup.add(subBase);

  const breakerMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x22c55e,
    emissiveIntensity: 0.65,
    roughness: 0.45,
    envMapIntensity: 0.0,
  });
  const breakerOrb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 14), breakerMat);
  breakerOrb.position.set(0, 1.32, 0.22);
  breakerOrb.userData = {
    interactType: 'light_city',
    label: '도시 배전 스위치 켜기 / 끄기',
  };
  subGroup.add(breakerOrb);
  interactiveObjects.push(breakerOrb);
  terraceGroup.add(subGroup);

  const terraceLight = new THREE.PointLight(0xfff7e6, 7.5, 22, 1.4);
  terraceLight.position.set(0, 7.0, -110.0);
  terraceGroup.add(terraceLight);

  // =========================================================================
  // ULTRA-DETAILED POWER-REACTIVE MINIATURE SEOUL (x: -35..+35, z: -117..-168)
  // =========================================================================
  const seoulCenterZ = -142.5;
  const rand = seededRand(202607);

  // 1. Seoul Basin Ground
  const terrainMat = new THREE.MeshStandardMaterial({
    color: 0x141a24,
    roughness: 0.92,
    metalness: 0.05,
    envMapIntensity: 0.0,
  });
  const terrain = new THREE.Mesh(new THREE.BoxGeometry(74, 0.4, 54), terrainMat);
  terrain.position.set(0, 0.2, seoulCenterZ);
  terrain.receiveShadow = true;
  seoulGroup.add(terrain);

  const plinthRim = new THREE.Mesh(new THREE.BoxGeometry(75.2, 0.52, 55.2), mats.darkIron);
  plinthRim.position.set(0, 0.08, seoulCenterZ);
  seoulGroup.add(plinthRim);

  // Arterial Road Network
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x0b1018,
    roughness: 0.95,
    envMapIntensity: 0.0,
  });
  [-126.5, -130.5, -148.0, -153.5].forEach((rz) => {
    const avenue = new THREE.Mesh(new THREE.BoxGeometry(64, 0.03, 0.95), roadMat);
    avenue.position.set(0, 0.42, rz);
    seoulGroup.add(avenue);
  });
  [-20, -6.5, 4, 16].forEach((rx) => {
    const avenueNS = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.03, 44), roadMat);
    avenueNS.position.set(rx, 0.42, seoulCenterZ);
    seoulGroup.add(avenueNS);
  });

  // 2. Seoul Mountain Ring
  const mountainMat = new THREE.MeshStandardMaterial({
    color: 0x16261f,
    roughness: 0.96,
    metalness: 0.0,
    envMapIntensity: 0.0,
  });
  const rockRidgeMat = new THREE.MeshStandardMaterial({
    color: 0x242d37,
    roughness: 0.94,
    metalness: 0.0,
    envMapIntensity: 0.0,
  });

  const addPeak = (
    x: number,
    z: number,
    radius: number,
    height: number,
    rocky = false,
    sx = 1,
    sz = 1
  ) => {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(radius, height, 7),
      rocky ? rockRidgeMat : mountainMat
    );
    cone.scale.set(sx, 1, sz);
    cone.rotation.y = rand() * Math.PI;
    cone.position.set(x, 0.4 + height * 0.45, z);
    seoulGroup.add(cone);
  };

  addPeak(-16, -163.5, 6.2, 5.2, true, 1.3, 0.9);
  addPeak(-9, -165.0, 7.2, 6.4, true, 1.2, 0.85);
  addPeak(-1, -164.0, 6.4, 5.5, true, 1.3, 0.9);
  addPeak(8, -164.5, 5.8, 4.9, false, 1.4, 0.85);
  addPeak(18, -163.5, 6.0, 4.4, false, 1.3, 0.9);
  addPeak(27, -161.5, 5.4, 3.8, false, 1.2, 1.0);
  addPeak(-12.5, -157.5, 4.2, 3.3, true, 1.1, 1.0);
  addPeak(-5.5, -158.8, 4.5, 3.5, true, 1.2, 0.9);
  addPeak(30.5, -148.0, 4.8, 3.4, false, 0.9, 1.5);
  addPeak(31.0, -141.0, 4.2, 2.8, false, 0.9, 1.4);
  addPeak(-18, -120.5, 5.5, 3.8, true, 1.4, 0.85);
  addPeak(-8, -119.8, 5.0, 3.4, true, 1.3, 0.85);
  addPeak(2, -120.2, 4.6, 2.9, false, 1.4, 0.85);
  addPeak(14, -120.5, 4.4, 2.5, false, 1.3, 0.85);

  // 3. Han River + Tributaries + Islands
  const riverShape = new THREE.Shape();
  riverShape.moveTo(-36.5, -2.5);
  riverShape.bezierCurveTo(-24, -0.8, -14, -4.4, -4, -3.2);
  riverShape.bezierCurveTo(6, -2.0, 16, -0.5, 25, -2.2);
  riverShape.bezierCurveTo(31, -3.2, 34, -2.6, 36.5, -2.2);
  riverShape.lineTo(36.5, 2.5);
  riverShape.bezierCurveTo(30, 2.2, 23, 3.2, 14, 1.8);
  riverShape.bezierCurveTo(4, 0.4, -6, 3.8, -17, 2.8);
  riverShape.bezierCurveTo(-26, 1.9, -32, 2.8, -36.5, 2.4);
  riverShape.closePath();

  const riverGeo = new THREE.ShapeGeometry(riverShape, 36);
  riverGeo.rotateX(-Math.PI / 2);
  const riverMat = new THREE.MeshStandardMaterial({
    color: 0x0c3d5e,
    emissive: 0x0369a1,
    emissiveIntensity: 0.04,
    roughness: 0.45,
    metalness: 0.1,
    envMapIntensity: 0.0,
  });
  const hanRiver = new THREE.Mesh(riverGeo, riverMat);
  hanRiver.position.set(0, 0.43, -137.0);
  seoulGroup.add(hanRiver);

  [
    { x: 14.2, z: -146.5, w: 0.9, l: 16, rot: 0.25 },
    { x: 18.8, z: -127.0, w: 0.85, l: 14, rot: -0.18 },
    { x: -24.5, z: -128.0, w: 0.9, l: 15, rot: 0.14 },
  ].forEach((tr) => {
    const trib = new THREE.Mesh(new THREE.BoxGeometry(tr.w, 0.04, tr.l), riverMat);
    trib.position.set(tr.x, 0.43, tr.z);
    trib.rotation.y = tr.rot;
    seoulGroup.add(trib);
  });

  const islandMat = new THREE.MeshStandardMaterial({
    color: 0x1b2230,
    roughness: 0.9,
    envMapIntensity: 0.0,
  });
  const yeouido = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.4, 0.14, 20), islandMat);
  yeouido.scale.set(1.65, 1, 0.56);
  yeouido.position.set(-12.0, 0.48, -136.5);
  seoulGroup.add(yeouido);

  const nodeul = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 0.12, 12), mountainMat);
  nodeul.scale.set(1.3, 1, 0.7);
  nodeul.position.set(-4.2, 0.47, -136.8);
  seoulGroup.add(nodeul);

  // 4. 12 Han River Bridges
  const bridgeLightMats: { mat: THREE.MeshStandardMaterial; isBanpo: boolean; thr: number }[] = [];
  const bridgeSpecs = [
    { x: -30.0, z: -137.0, len: 6.2, style: 'pylon', thr: 0.52 },
    { x: -25.0, z: -136.8, len: 6.4, style: 'arch', thr: 0.38 },
    { x: -19.8, z: -136.6, len: 6.5, style: 'truss', thr: 0.30 },
    { x: -15.2, z: -136.5, len: 6.6, style: 'girder', thr: 0.22 },
    { x: -10.5, z: -136.6, len: 6.5, style: 'arch', thr: 0.16 },
    { x: -5.8, z: -136.8, len: 6.5, style: 'truss', thr: 0.26 },
    { x: -1.6, z: -137.2, len: 6.4, style: 'arch', thr: 0.34 },
    { x: 2.8, z: -137.4, len: 6.2, style: 'banpo', thr: 0.18 },
    { x: 7.4, z: -137.5, len: 6.2, style: 'girder', thr: 0.28 },
    { x: 12.6, z: -137.5, len: 6.0, style: 'arch', thr: 0.44 },
    { x: 18.2, z: -137.2, len: 6.2, style: 'pylon', thr: 0.56 },
    { x: 24.8, z: -136.8, len: 6.2, style: 'girder', thr: 0.68 },
  ];

  bridgeSpecs.forEach((br) => {
    const bg = new THREE.Group();
    bg.position.set(br.x, 0.62, br.z);
    bg.add(new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.12, br.len), mats.darkIron));

    if (br.style === 'arch') {
      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(1.5, 0.06, 6, 16, Math.PI),
        mats.steelBrushed
      );
      arch.rotation.y = Math.PI / 2;
      arch.position.y = 0.06;
      bg.add(arch);
    } else if (br.style === 'pylon') {
      [-1.3, 1.3].forEach((pz) => {
        const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.15, 0.12), mats.steelBrushed);
        pylon.position.set(0, 0.58, pz);
        bg.add(pylon);
      });
    } else if (br.style === 'truss') {
      const truss = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.38, br.len * 0.72), mats.steelBrushed);
      truss.position.y = 0.22;
      bg.add(truss);
    }

    const isBanpo = br.style === 'banpo';
    const ledMat = new THREE.MeshStandardMaterial({
      color: isBanpo ? 0x38bdf8 : 0xfbbf24,
      emissive: isBanpo ? 0x38bdf8 : 0xf59e0b,
      emissiveIntensity: 0.0,
      roughness: 0.4,
      envMapIntensity: 0.0,
    });
    bridgeLightMats.push({ mat: ledMat, isBanpo, thr: br.thr });

    [-0.36, 0.36].forEach((sx) => {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, br.len - 0.1), ledMat);
      strip.position.set(sx, -0.02, 0);
      bg.add(strip);
    });
    seoulGroup.add(bg);
  });

  // Track power-reactive structures: threshold = powerRatio where this zone comes alive!
  const litStructures: {
    mat: THREE.MeshStandardMaterial;
    threshold: number;
    maxEmissive: number;
    idleEmissive?: number;
  }[] = [];

  const createBuildingMat = (
    repX: number,
    repY: number,
    thr: number,
    tintHex = 0xffffff,
    maxEm = 1.25
  ) => {
    const facadeMap = textures.cityBuildingFacade.clone();
    facadeMap.needsUpdate = true;
    facadeMap.repeat.set(Math.max(1, repX), Math.max(1, repY));

    const emissiveMap = textures.cityBuildingEmissive.clone();
    emissiveMap.needsUpdate = true;
    emissiveMap.repeat.copy(facadeMap.repeat);

    const mat = new THREE.MeshStandardMaterial({
      map: facadeMap,
      color: tintHex,
      emissive: tintHex,
      emissiveMap,
      emissiveIntensity: 0.01,
      roughness: 0.65,
      metalness: 0.18,
      envMapIntensity: 0.0,
    });
    litStructures.push({ mat, threshold: thr, maxEmissive: maxEm, idleEmissive: 0.01 });
    return mat;
  };

  // =========================================================================
  // 5. APARTMENTS & URBAN BUILDINGS (Tiered Response: 0.28 -> 0.45 -> 0.65)
  // =========================================================================
  interface BuildingSpec {
    x: number;
    z: number;
    w: number;
    d: number;
    h: number;
    rotY: number;
    tint: number;
    tier: 0 | 1 | 2;
  }
  const specs: BuildingSpec[] = [];

  const pushBldg = (
    x: number,
    z: number,
    w: number,
    d: number,
    h: number,
    rotY = 0,
    tint = 0xe2e8f0
  ) => {
    const tier = h > 3.2 ? 1 : rand() < 0.5 ? 0 : 2;
    specs.push({ x, z, w, d, h, rotY, tint, tier });
  };

  const addAptComplex = (cx: number, cz: number, cols: number, rows: number, angle = 0) => {
    const tints = [0xdbeafe, 0xfef3c7, 0xe2e8f0, 0xf1f5f9];
    const tint = tints[Math.floor(rand() * tints.length)];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const lx = (c - (cols - 1) / 2) * 1.45;
        const lz = (r - (rows - 1) / 2) * 0.95;
        const rx = cx + lx * Math.cos(angle) - lz * Math.sin(angle);
        const rz = cz + lx * Math.sin(angle) + lz * Math.cos(angle);
        const h = 1.65 + rand() * 0.85;
        pushBldg(rx, rz, 1.05, 0.36, h, angle, tint);
      }
    }
  };

  const addUrbanCluster = (
    cx: number,
    cz: number,
    radX: number,
    radZ: number,
    count: number,
    minH: number,
    maxH: number,
    tints: number[]
  ) => {
    for (let i = 0; i < count; i++) {
      const x = cx + (rand() * 2 - 1) * radX;
      const z = cz + (rand() * 2 - 1) * radZ;
      const w = 0.55 + rand() * 0.85;
      const d = 0.55 + rand() * 0.85;
      const h = minH + rand() * (maxH - minH);
      const tint = tints[Math.floor(rand() * tints.length)];
      pushBldg(x, z, w, d, h, (rand() - 0.5) * 0.15, tint);
    }
  };

  const officeTints = [0xe0f2fe, 0xfef3c7, 0xcbd5e1, 0xf1f5f9, 0xbae6fd];
  const townTints = [0xfde68a, 0xe2e8f0, 0xfecaca, 0xdbeafe];

  // Gangbuk Districts
  addUrbanCluster(-6.0, -149.8, 5.0, 2.2, 40, 1.8, 5.2, officeTints);
  addUrbanCluster(1.5, -149.5, 4.5, 2.2, 32, 1.6, 4.6, officeTints);
  addUrbanCluster(-18.5, -143.5, 5.5, 2.8, 42, 1.3, 3.9, officeTints);
  addUrbanCluster(-26.5, -144.5, 4.5, 3.0, 30, 0.9, 2.5, townTints);
  addUrbanCluster(-7.5, -142.2, 4.2, 2.0, 26, 1.5, 4.4, officeTints);
  addUrbanCluster(3.5, -142.5, 3.5, 2.0, 22, 1.0, 2.8, townTints);
  addUrbanCluster(10.5, -144.2, 4.8, 2.6, 34, 1.2, 3.8, officeTints);
  addUrbanCluster(22.0, -143.0, 4.8, 2.6, 28, 1.0, 2.9, townTints);
  addAptComplex(18.5, -152.0, 4, 3, 0.12);
  addAptComplex(25.5, -151.0, 3, 3, -0.08);
  addAptComplex(12.0, -155.5, 3, 2, 0.05);
  addUrbanCluster(4.5, -155.5, 4.0, 2.0, 24, 0.9, 2.3, townTints);
  addUrbanCluster(-20.5, -153.5, 4.5, 2.5, 26, 0.9, 2.2, townTints);

  // Gangnam Districts (leaving clean parcels for School at (-13.5,-126.5) and Factory at (-26,-126.5))
  addUrbanCluster(1.5, -128.5, 6.2, 2.2, 46, 2.0, 5.8, officeTints);
  addUrbanCluster(11.0, -128.8, 5.2, 2.4, 40, 2.0, 5.6, officeTints);
  addAptComplex(-3.5, -132.5, 4, 2, 0.0);
  addAptComplex(5.5, -132.8, 4, 2, 0.05);
  addAptComplex(14.0, -132.4, 3, 2, -0.05);
  addAptComplex(25.5, -129.0, 4, 3, 0.08);
  addAptComplex(-27.0, -132.0, 3, 2, 0.0);
  addUrbanCluster(-7.5, -124.2, 3.6, 1.8, 22, 0.9, 2.4, townTints);
  addUrbanCluster(28.5, -133.5, 3.6, 2.2, 22, 1.1, 2.8, townTints);

  const tierGroups: BuildingSpec[][] = [[], [], []];
  specs.forEach((s) => tierGroups[s.tier].push(s));
  const tierThresholds = [0.28, 0.45, 0.65];
  const unitBoxGeo = new THREE.BoxGeometry(1, 1, 1);
  const dummy = new THREE.Object3D();
  const tmpColor = new THREE.Color();

  const roofUnitMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.85,
    metalness: 0.25,
    envMapIntensity: 0.0,
  });

  tierGroups.forEach((list, tierIdx) => {
    if (list.length === 0) return;
    const mat = createBuildingMat(2, 5, tierThresholds[tierIdx], 0xffffff, 1.35);
    const inst = new THREE.InstancedMesh(unitBoxGeo, mat, list.length);
    const roofInst = new THREE.InstancedMesh(unitBoxGeo, roofUnitMat, list.length);

    list.forEach((b, i) => {
      dummy.position.set(b.x, 0.4 + b.h / 2, b.z);
      dummy.rotation.set(0, b.rotY, 0);
      dummy.scale.set(b.w, b.h, b.d);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
      tmpColor.setHex(b.tint);
      inst.setColorAt(i, tmpColor);

      dummy.position.set(b.x, 0.4 + b.h + 0.09, b.z);
      dummy.scale.set(b.w * 0.46, 0.18, b.d * 0.46);
      dummy.updateMatrix();
      roofInst.setMatrixAt(i, dummy.matrix);
    });

    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    roofInst.instanceMatrix.needsUpdate = true;
    seoulGroup.add(inst, roofInst);
  });

  // =========================================================================
  // 6. EXPLICIT URBAN CONSUMERS: SCHOOL, SHOPS & SIGNS, FACTORY, TRAFFIC, STREETLIGHTS
  // =========================================================================

  // (A) SCHOOL CAMPUS ("서울 에너지 초등학교" at local x = -14.2, z = -126.5)
  const schoolGroup = new THREE.Group();
  schoolGroup.position.set(-14.2, 0.4, -126.5);
  const schoolYard = new THREE.Mesh(
    new THREE.BoxGeometry(5.6, 0.08, 4.0),
    new THREE.MeshStandardMaterial({ color: 0x164e32, roughness: 0.92, envMapIntensity: 0 })
  );
  schoolYard.position.y = 0.04;
  schoolGroup.add(schoolYard);

  // Oval running track
  const trackMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.88, envMapIntensity: 0 });
  const track = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.28, 24), trackMat);
  track.rotation.x = -Math.PI / 2;
  track.scale.set(1.45, 0.82, 1);
  track.position.set(0.4, 0.09, 0.8);
  schoolGroup.add(track);

  // Main 3-story classroom wing
  const schoolBodyMat = createBuildingMat(4, 2, 0.36, 0xfef3c7, 1.35);
  const schoolMain = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.35, 1.15), schoolBodyMat);
  schoolMain.position.set(0, 0.72, -1.05);
  schoolGroup.add(schoolMain);

  // Sloped school roof + central clock tower
  const schoolRoofMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.75, envMapIntensity: 0 });
  const schoolRoof = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.22, 1.28), schoolRoofMat);
  schoolRoof.position.set(0, 1.48, -1.05);
  schoolGroup.add(schoolRoof);

  const clockTower = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.85, 0.7), mats.steelBrushed);
  clockTower.position.set(0, 1.95, -1.05);
  schoolGroup.add(clockTower);

  const clockFaceMat = new THREE.MeshStandardMaterial({
    color: 0xfef9c3,
    emissive: 0xfde047,
    emissiveIntensity: 0.0,
    envMapIntensity: 0,
  });
  litStructures.push({ mat: clockFaceMat, threshold: 0.36, maxEmissive: 1.4 });
  const clockFace = new THREE.Mesh(new THREE.CircleGeometry(0.24, 16), clockFaceMat);
  clockFace.position.set(0, 2.02, -0.69);
  schoolGroup.add(clockFace);
  seoulGroup.add(schoolGroup);

  // (B) COMMERCIAL SHOPS & GLOWING SIGNBOARDS (Teheran-ro & Myeongdong Strips)
  const shopSignPalette = [0x38bdf8, 0xf43f5e, 0xfbbf24, 0x34d399, 0xa855f7];
  const shopCoords: [number, number][] = [
    [-4.2, -125.4],
    [-2.5, -125.4],
    [-0.8, -125.4],
    [1.0, -125.4],
    [2.8, -125.4],
    [4.6, -125.4],
    [-3.5, -148.6],
    [-1.8, -148.6],
    [0.0, -148.6],
    [1.8, -148.6],
  ];
  shopCoords.forEach(([sx, sz], idx) => {
    const sg = new THREE.Group();
    sg.position.set(sx, 0.4, sz);
    const shopBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.85, 0.9),
      createBuildingMat(2, 1, 0.50, 0xfef3c7, 1.35)
    );
    shopBody.position.y = 0.425;
    sg.add(shopBody);

    const signColor = shopSignPalette[idx % shopSignPalette.length];
    const signMat = new THREE.MeshStandardMaterial({
      color: signColor,
      emissive: signColor,
      emissiveIntensity: 0.0,
      roughness: 0.35,
      envMapIntensity: 0,
    });
    litStructures.push({ mat: signMat, threshold: 0.50, maxEmissive: 1.65 });

    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.26, 0.1), signMat);
    signBoard.position.set(0, 0.98, 0.42);
    sg.add(signBoard);

    const verticalSign = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.52, 0.16), signMat);
    verticalSign.position.set(0.46, 0.65, 0.46);
    sg.add(verticalSign);
    seoulGroup.add(sg);
  });

  // (C) INDUSTRIAL FACTORY COMPLEX (local x = -25.8, z = -126.5)
  const factoryGroup = new THREE.Group();
  factoryGroup.position.set(-25.8, 0.4, -126.5);
  const factoryMat = createBuildingMat(4, 2, 0.65, 0x93c5fd, 1.45);
  const factoryHall = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.7, 2.8), factoryMat);
  factoryHall.position.y = 0.85;
  factoryGroup.add(factoryHall);

  // Sawtooth roof ridges
  for (let r = -1; r <= 1; r++) {
    const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 2.8, 3), mats.steelBrushed);
    ridge.rotation.x = Math.PI / 2;
    ridge.position.set(r * 1.55, 1.9, 0);
    factoryGroup.add(ridge);
  }

  // Dual Smokestacks with warning lights
  const factoryBeaconMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xf97316,
    emissiveIntensity: 0.0,
    envMapIntensity: 0,
  });
  litStructures.push({ mat: factoryBeaconMat, threshold: 0.65, maxEmissive: 1.8 });

  [-1.6, 1.6].forEach((fx) => {
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 3.6, 12), mats.steelBrushed);
    stack.position.set(fx, 1.8, -1.1);
    factoryGroup.add(stack);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.26, 0.35, 12), mats.hazard);
    band.position.set(fx, 3.1, -1.1);
    factoryGroup.add(band);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), factoryBeaconMat);
    tip.position.set(fx, 3.68, -1.1);
    factoryGroup.add(tip);
  });

  // Spinning rooftop industrial exhaust turbines
  const factoryFans: THREE.Group[] = [];
  [-0.9, 0.9].forEach((rx) => {
    const fan = new THREE.Group();
    fan.position.set(rx, 2.15, 0.65);
    for (let b = 0; b < 4; b++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.06, 0.14), mats.chrome);
      blade.rotation.y = (b * Math.PI) / 2;
      fan.add(blade);
    }
    factoryGroup.add(fan);
    factoryFans.push(fan);
  });

  // High-load industrial transformer coils on Factory south wall (consumes heavy electricity)
  const factoryLoadMat = new THREE.MeshStandardMaterial({
    color: 0x34d399,
    emissive: 0x10b981,
    emissiveIntensity: 0.0,
    roughness: 0.35,
    envMapIntensity: 0,
  });
  [-1.1, 0, 1.1].forEach((cx) => {
    const coil = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.75, 12), factoryLoadMat);
    coil.position.set(cx, 0.65, 1.48);
    factoryGroup.add(coil);
  });

  // Rising Smokestack Vapor Puffs when Factory is powered & operating (zero-GC pre-allocated Points)
  const puffCount = 24;
  const puffPositions = new Float32Array(puffCount * 3);
  const puffGeo = new THREE.BufferGeometry();
  puffGeo.setAttribute('position', new THREE.BufferAttribute(puffPositions, 3));
  const puffMat = new THREE.PointsMaterial({
    color: 0xcbd5e1,
    map: textures.waterDroplet,
    size: 0.72,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const factoryPuffs = new THREE.Points(puffGeo, puffMat);
  factoryPuffs.frustumCulled = false;
  factoryGroup.add(factoryPuffs);

  seoulGroup.add(factoryGroup);

  // (C2) URBAN CONSUMER MICRO-FEEDER STREAMS & LOAD RINGS
  // Connects each Feeder landing box to Streetlights, School/Traffic, Shops/Apartments, and Factory
  const urbanMicroStreams: {
    stream: ReturnType<typeof createEnergyPathStream>;
    threshold: number;
    baseSpeed: number;
    ringMat: THREE.MeshStandardMaterial;
    ringMesh: THREE.Mesh;
    maxRingEmissive: number;
  }[] = [];

  const microZones: {
    points: [number, number, number][];
    color: number;
    size: number;
    threshold: number;
    baseSpeed: number;
    ringPos: [number, number, number];
    ringRadius: number;
    maxRingEmissive: number;
  }[] = [
    // 1. Streetlight Corridor (small load)
    {
      points: [
        [-4.5, 1.4, -123.5],
        [-4.5, 0.9, -126.0],
        [-2.0, 0.9, -133.2],
        [-14.0, 0.9, -133.2],
      ],
      color: 0xfbbf24,
      size: 0.28,
      threshold: 0.04,
      baseSpeed: 0.32,
      ringPos: [-4.5, 0.48, -126.0],
      ringRadius: 0.55,
      maxRingEmissive: 0.75,
    },
    // 2. School Campus & Traffic Intersections (medium load)
    {
      points: [
        [-14.2, 1.4, -125.0],
        [-14.2, 1.35, -126.5],
        [-6.5, 1.32, -126.5],
        [4.0, 1.32, -126.5],
      ],
      color: 0x38bdf8,
      size: 0.34,
      threshold: 0.16,
      baseSpeed: 0.38,
      ringPos: [-14.2, 0.49, -126.5],
      ringRadius: 1.55,
      maxRingEmissive: 0.95,
    },
    // 3. Apartments & Commercial Strip (medium-high load)
    {
      points: [
        [4.5, 1.8, -143.5],
        [1.8, 1.25, -148.6],
        [-3.5, 1.25, -148.6],
        [18.5, 1.5, -152.0],
      ],
      color: 0xfde047,
      size: 0.36,
      threshold: 0.28,
      baseSpeed: 0.42,
      ringPos: [0.0, 0.48, -125.4],
      ringRadius: 1.35,
      maxRingEmissive: 1.05,
    },
    // 4. Industrial Factory Complex (high load)
    {
      points: [
        [-25.8, 1.6, -125.0],
        [-25.8, 1.45, -125.1],
        [-25.8, 1.9, -126.5],
        [-25.8, 2.6, -126.5],
      ],
      color: 0x34d399,
      size: 0.44,
      threshold: 0.50,
      baseSpeed: 0.55,
      ringPos: [-25.8, 0.49, -126.5],
      ringRadius: 2.35,
      maxRingEmissive: 1.35,
    },
  ];

  microZones.forEach((mz) => {
    const curve = new THREE.CatmullRomCurve3(mz.points.map((p) => new THREE.Vector3(...p)));
    const stream = createEnergyPathStream(curve, 32, mz.color, mz.size, textures.particleGlow);
    seoulGroup.add(stream.points);

    const ringMat = new THREE.MeshStandardMaterial({
      color: mz.color,
      emissive: mz.color,
      emissiveIntensity: 0.0,
      transparent: true,
      opacity: 0.55,
      roughness: 0.4,
      envMapIntensity: 0,
    });
    const ringMesh = new THREE.Mesh(
      new THREE.TorusGeometry(mz.ringRadius, 0.045, 6, 28),
      ringMat
    );
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.set(...mz.ringPos);
    seoulGroup.add(ringMesh);

    urbanMicroStreams.push({
      stream,
      threshold: mz.threshold,
      baseSpeed: mz.baseSpeed,
      ringMat,
      ringMesh,
      maxRingEmissive: mz.maxRingEmissive,
    });
  });

  // (D) TRAFFIC SIGNALS & ANIMATED URBAN VEHICLES (threshold: 0.16)
  const trafficNodes: { redMat: THREE.MeshStandardMaterial; greenMat: THREE.MeshStandardMaterial; phase: number }[] = [];
  const intersections: [number, number][] = [
    [-20, -126.5],
    [-6.5, -126.5],
    [4, -126.5],
    [16, -126.5],
    [-20, -148.0],
    [-6.5, -148.0],
    [4, -148.0],
    [16, -148.0],
  ];

  intersections.forEach(([ix, iz], idx) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.95, 8), mats.darkIron);
    post.position.set(ix + 0.65, 0.88, iz + 0.65);
    seoulGroup.add(post);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.08, 0.08), mats.darkIron);
    arm.position.set(ix + 0.25, 1.32, iz + 0.65);
    seoulGroup.add(arm);

    const redMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 0.0,
      envMapIntensity: 0,
    });
    const greenMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x22c55e,
      emissiveIntensity: 0.0,
      envMapIntensity: 0,
    });

    const rLed = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), redMat);
    rLed.position.set(ix + 0.05, 1.32, iz + 0.72);
    const gLed = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), greenMat);
    gLed.position.set(ix + 0.28, 1.32, iz + 0.72);
    seoulGroup.add(rLed, gLed);
    trafficNodes.push({ redMat, greenMat, phase: idx * 0.9 });
  });

  // 14 Miniature Vehicles gliding along East-West avenues
  const carHeadMat = new THREE.MeshStandardMaterial({
    color: 0xfef9c3,
    emissive: 0xfef08a,
    emissiveIntensity: 0.08,
    envMapIntensity: 0,
  });
  const cars: { mesh: THREE.Group; laneZ: number; dir: 1 | -1; speed: number; offset: number }[] = [];
  const laneZs = [-126.3, -126.7, -130.5, -147.8, -148.2, -153.5];
  for (let c = 0; c < 14; c++) {
    const cg = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.14, 0.18),
      c % 3 === 0 ? mats.hazard : mats.steelBrushed
    );
    body.position.y = 0.09;
    cg.add(body);
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.14), carHeadMat);
    hl.position.set(0.18, 0.08, 0);
    cg.add(hl);
    const laneZ = laneZs[c % laneZs.length];
    const dir = c % 2 === 0 ? 1 : -1;
    cg.rotation.y = dir === 1 ? 0 : Math.PI;
    cg.position.set(0, 0.43, laneZ);
    seoulGroup.add(cg);
    cars.push({ mesh: cg, laneZ, dir, speed: 1.8 + (c % 4) * 0.45, offset: c * 4.5 });
  }

  // (E) HERO LANDMARKS (Namsan, Lotte, Yeouido, Gyeongbokgung, Blue House, City Hall, DDP, Stadiums)
  const namsan = new THREE.Group();
  namsan.position.set(-1.5, 0.4, -146.2);
  const nHill1 = new THREE.Mesh(new THREE.ConeGeometry(4.2, 2.9, 14), mountainMat);
  nHill1.position.y = 1.4;
  namsan.add(nHill1);
  const nHill2 = new THREE.Mesh(new THREE.ConeGeometry(3.1, 2.1, 12), mountainMat);
  nHill2.position.set(1.6, 1.0, 0.6);
  namsan.add(nHill2);
  const nBase = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.85, 0.65, 8), mats.darkIron);
  nBase.position.y = 2.85;
  namsan.add(nBase);
  const nShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 4.8, 12), mats.steelBrushed);
  nShaft.position.y = 5.5;
  namsan.add(nShaft);

  const podMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.0,
    roughness: 0.45,
    envMapIntensity: 0.0,
  });
  litStructures.push({ mat: podMat, threshold: 0.72, maxEmissive: 1.65 });
  const nPod = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.52, 0.85, 12), podMat);
  nPod.position.y = 7.95;
  namsan.add(nPod);
  const nSpire = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.11, 2.5, 10), mats.steelBrushed);
  nSpire.position.y = 9.6;
  namsan.add(nSpire);

  const namsanBeaconMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xef4444,
    emissiveIntensity: 0.35,
    envMapIntensity: 0.0,
  });
  const nBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), namsanBeaconMat);
  nBeacon.position.y = 10.9;
  namsan.add(nBeacon);
  seoulGroup.add(namsan);

  // Lotte World Tower & Seokchon Lake
  const lotteGroup = new THREE.Group();
  lotteGroup.position.set(22.5, 0.4, -128.5);
  const lotteMat = createBuildingMat(3, 14, 0.72, 0xe0f2fe, 1.45);
  const lotteBody = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 1.18, 13.8, 8), lotteMat);
  lotteBody.position.y = 6.9;
  lotteGroup.add(lotteBody);

  const lotteCrownMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfbbf24,
    emissiveIntensity: 0.0,
    roughness: 0.4,
    envMapIntensity: 0.0,
  });
  litStructures.push({ mat: lotteCrownMat, threshold: 0.78, maxEmissive: 1.75 });
  const lotteCrown = new THREE.Mesh(new THREE.ConeGeometry(0.36, 2.0, 4), lotteCrownMat);
  lotteCrown.position.y = 14.8;
  lotteGroup.add(lotteCrown);
  const seokchon = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.04, 0.9), riverMat);
  seokchon.position.set(-0.2, 0.04, 1.4);
  lotteGroup.add(seokchon);
  seoulGroup.add(lotteGroup);

  // Yeouido Landmarks
  const b63 = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 7.6, 0.85),
    createBuildingMat(2, 8, 0.42, 0xfde68a, 1.4)
  );
  b63.position.set(-8.6, 4.3, -136.5);
  seoulGroup.add(b63);
  const parc1 = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 8.4, 1.3),
    createBuildingMat(2, 9, 0.56, 0xfca5a5, 1.35)
  );
  parc1.position.set(-12.4, 4.7, -136.4);
  seoulGroup.add(parc1);
  const ifc = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 6.4, 1.15),
    createBuildingMat(2, 7, 0.62, 0xbae6fd, 1.25)
  );
  ifc.position.set(-14.2, 3.7, -136.7);
  seoulGroup.add(ifc);

  const assemblyBase = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.85, 1.2), mats.steelBrushed);
  assemblyBase.position.set(-16.2, 0.95, -136.2);
  seoulGroup.add(assemblyBase);
  const domeMat = new THREE.MeshStandardMaterial({
    color: 0x0d9488,
    emissive: 0x14b8a6,
    emissiveIntensity: 0.0,
    roughness: 0.55,
    envMapIntensity: 0.0,
  });
  litStructures.push({ mat: domeMat, threshold: 0.44, maxEmissive: 0.9 });
  const assemblyDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    domeMat
  );
  assemblyDome.position.set(-16.2, 1.38, -136.2);
  seoulGroup.add(assemblyDome);

  // Gyeongbokgung & Blue House & City Hall
  const palaceGroup = new THREE.Group();
  palaceGroup.position.set(-6.5, 0.4, -154.0);
  palaceGroup.add(new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.08, 3.8), roadMat));
  const palaceRoofMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.0,
    roughness: 0.72,
    envMapIntensity: 0.0,
  });
  litStructures.push({ mat: palaceRoofMat, threshold: 0.52, maxEmissive: 0.6 });
  const palaceHall = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 1.1), mats.copper);
  palaceHall.position.set(0, 0.3, -0.3);
  palaceGroup.add(palaceHall);
  const palaceRoof = new THREE.Mesh(new THREE.ConeGeometry(1.35, 0.55, 4), palaceRoofMat);
  palaceRoof.rotation.y = Math.PI / 4;
  palaceRoof.position.set(0, 0.75, -0.3);
  palaceGroup.add(palaceRoof);
  const gwanghwa = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.45, 0.45), palaceRoofMat);
  gwanghwa.position.set(0, 0.26, 1.7);
  palaceGroup.add(gwanghwa);
  seoulGroup.add(palaceGroup);

  const blueRoofMat = new THREE.MeshStandardMaterial({
    color: 0x0f766e,
    emissive: 0x14b8a6,
    emissiveIntensity: 0.0,
    roughness: 0.5,
    envMapIntensity: 0.0,
  });
  litStructures.push({ mat: blueRoofMat, threshold: 0.58, maxEmissive: 0.7 });
  const blueHouse = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.45, 0.95), mats.steelBrushed);
  blueHouse.position.set(-6.5, 0.65, -157.0);
  seoulGroup.add(blueHouse);
  const blueHouseRoof = new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.45, 4), blueRoofMat);
  blueHouseRoof.rotation.y = Math.PI / 4;
  blueHouseRoof.scale.set(1.3, 1, 0.7);
  blueHouseRoof.position.set(-6.5, 1.08, -157.0);
  seoulGroup.add(blueHouseRoof);

  // DDP, Stadiums, City Hall, COEX Trade Tower
  const ddpMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.0,
    roughness: 0.52,
    metalness: 0.35,
    envMapIntensity: 0.0,
  });
  litStructures.push({ mat: ddpMat, threshold: 0.62, maxEmissive: 0.7 });
  const ddp = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.58, 12, 24), ddpMat);
  ddp.rotation.x = Math.PI / 2;
  ddp.scale.set(1.35, 0.72, 0.5);
  ddp.position.set(6.2, 0.62, -149.0);
  seoulGroup.add(ddp);

  const stadiumRoofMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.0,
    roughness: 0.6,
    envMapIntensity: 0.0,
  });
  litStructures.push({ mat: stadiumRoofMat, threshold: 0.68, maxEmissive: 0.75 });
  const turfMat = new THREE.MeshStandardMaterial({
    color: 0x15803d,
    emissive: 0x22c55e,
    emissiveIntensity: 0.0,
    roughness: 0.85,
    envMapIntensity: 0.0,
  });
  litStructures.push({ mat: turfMat, threshold: 0.55, maxEmissive: 0.55 });

  [
    { x: 16.8, z: -129.0 },
    { x: -23.5, z: -149.0 },
  ].forEach((st) => {
    const bowl = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.36, 10, 24), stadiumRoofMat);
    bowl.rotation.x = Math.PI / 2;
    bowl.scale.set(1.25, 1.0, 0.7);
    bowl.position.set(st.x, 0.66, st.z);
    seoulGroup.add(bowl);

    const field = new THREE.Mesh(new THREE.CircleGeometry(1.1, 18), turfMat);
    field.rotation.x = -Math.PI / 2;
    field.scale.set(1.2, 0.9, 1);
    field.position.set(st.x, 0.45, st.z);
    seoulGroup.add(field);
  });

  // Han River Parks & Cheonggyecheon
  const parkMat = new THREE.MeshStandardMaterial({
    color: 0x15442b,
    emissive: 0x14532d,
    emissiveIntensity: 0.0,
    roughness: 0.92,
    envMapIntensity: 0.0,
  });
  litStructures.push({ mat: parkMat, threshold: 0.32, maxEmissive: 0.25 });
  [
    { x: -12.0, z: -134.2, w: 7.5, d: 1.0 },
    { x: 3.5, z: -134.8, w: 12.0, d: 1.1 },
    { x: 18.0, z: -134.5, w: 11.0, d: 1.0 },
    { x: 12.5, z: -140.2, w: 10.0, d: 1.0 },
    { x: -21.5, z: -140.4, w: 9.0, d: 1.0 },
  ].forEach((pk) => {
    const lawn = new THREE.Mesh(new THREE.BoxGeometry(pk.w, 0.06, pk.d), parkMat);
    lawn.position.set(pk.x, 0.44, pk.z);
    seoulGroup.add(lawn);
  });

  const cheonggye = new THREE.Mesh(new THREE.BoxGeometry(15.5, 0.05, 0.42), riverMat);
  cheonggye.position.set(0.2, 0.44, -150.6);
  seoulGroup.add(cheonggye);

  const cityHallWave = new THREE.Mesh(
    new THREE.CylinderGeometry(0.95, 1.1, 1.25, 12, 1, false, 0, Math.PI),
    createBuildingMat(2, 3, 0.42, 0xbae6fd, 1.25)
  );
  cityHallWave.position.set(-6.5, 1.05, -148.2);
  seoulGroup.add(cityHallWave);
  const seoulPlaza = new THREE.Mesh(new THREE.CircleGeometry(0.85, 18), turfMat);
  seoulPlaza.rotation.x = -Math.PI / 2;
  seoulPlaza.position.set(-6.5, 0.46, -146.9);
  seoulGroup.add(seoulPlaza);

  const tradeTower = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.88, 7.2, 4),
    createBuildingMat(2, 7, 0.48, 0xe0f2fe, 1.4)
  );
  tradeTower.rotation.y = Math.PI / 4;
  tradeTower.position.set(12.6, 4.0, -128.0);
  seoulGroup.add(tradeTower);

  // Namsan Cable Car & Han River Cruise Ferries (slow subtle living motion even when dim)
  const cableLineCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-4.2, 0.85, -147.8),
    new THREE.Vector3(-1.8, 3.1, -146.4),
  ]);
  seoulGroup.add(
    new THREE.Mesh(new THREE.TubeGeometry(cableLineCurve, 8, 0.025, 5, false), mats.steelBrushed)
  );
  const cableCar = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 0.22), mats.hazard);
  seoulGroup.add(cableCar);

  const boatMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.12,
    roughness: 0.5,
  });
  const ferry1 = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.16, 0.26), boatMat);
  ferry1.position.set(-8, 0.52, -137.0);
  seoulGroup.add(ferry1);
  const ferry2 = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.16, 0.26), boatMat);
  ferry2.position.set(10, 0.52, -137.2);
  seoulGroup.add(ferry2);

  // 7. INSTANCED STREETLIGHT POLES & LAMP HEADS (Threshold: 0.04 — lights up FIRST!)
  const lampOrbMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfbbf24,
    emissiveIntensity: 0.0,
    roughness: 0.35,
    envMapIntensity: 0.0,
  });

  const lampCoords: [number, number][] = [];
  for (let x = -32; x <= 32; x += 2.6) {
    lampCoords.push([x, -133.2]);
    lampCoords.push([x, -140.5]);
    if (x >= -18 && x <= 20) lampCoords.push([x, -126.0]);
  }
  for (let z = -153; z <= -141; z += 2.0) {
    lampCoords.push([-6.5, z]);
  }

  const lampPoleInst = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.022, 0.03, 0.55, 6),
    mats.darkIron,
    lampCoords.length
  );
  const lampInst = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.095, 8, 8),
    lampOrbMat,
    lampCoords.length
  );
  lampCoords.forEach(([lx, lz], idx) => {
    dummy.position.set(lx, 0.65, lz);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    lampPoleInst.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(lx, 0.94, lz);
    dummy.updateMatrix();
    lampInst.setMatrixAt(idx, dummy.matrix);
  });
  lampPoleInst.instanceMatrix.needsUpdate = true;
  lampInst.instanceMatrix.needsUpdate = true;
  seoulGroup.add(lampPoleInst, lampInst);

  // 4 Quadrant Overhead Floodlights (dim moonlight at 0 MW -> full city glow at high MW)
  const cityGlowSouth = new THREE.PointLight(0xfde68a, 3.0, 75, 1.25);
  cityGlowSouth.position.set(4, 18, -128);
  seoulGroup.add(cityGlowSouth);

  const cityGlowNorth = new THREE.PointLight(0x93c5fd, 3.0, 78, 1.25);
  cityGlowNorth.position.set(-4, 20, -153);
  seoulGroup.add(cityGlowNorth);

  const cityGlowWest = new THREE.PointLight(0xe0f2fe, 2.5, 68, 1.25);
  cityGlowWest.position.set(-22, 16, -140);
  seoulGroup.add(cityGlowWest);

  const cityGlowEast = new THREE.PointLight(0xfef3c7, 2.5, 68, 1.25);
  cityGlowEast.position.set(22, 16, -140);
  seoulGroup.add(cityGlowEast);

  // Starry Night Sky above the Valley & City (always visible)
  const starCount = 340;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = rand() * Math.PI * 2;
    const phi = rand() * Math.PI * 0.42;
    const r = 115;
    starPos[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
    starPos[i * 3 + 1] = Math.cos(phi) * r + 10;
    starPos[i * 3 + 2] = seoulCenterZ + 12 + Math.sin(phi) * Math.sin(theta) * r;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ color: 0xe2e8f0, size: 0.34, sizeAttenuation: true })
  );
  cityRoot.add(stars);

  return {
    group,
    interactiveObjects,
    update: (dt, elapsed, cityLit, powerRatio, flowHighlight) => {
      // If city lighting switch is explicitly turned OFF, gently hold at minimal standby
      const effectiveRatio = cityLit ? THREE.MathUtils.clamp(powerRatio, 0, 1.25) : 0.0;

      if (!cityLit) {
        breakerMat.color.setHex(0xf59e0b);
        breakerMat.emissive.setHex(0xf59e0b);
        breakerMat.emissiveIntensity = 0.45 + Math.sin(elapsed * 2.5) * 0.15;
      } else if (effectiveRatio >= 0.65) {
        breakerMat.color.setHex(0x22c55e);
        breakerMat.emissive.setHex(0x22c55e);
        breakerMat.emissiveIntensity = 0.85;
      } else {
        breakerMat.color.setHex(0x38bdf8);
        breakerMat.emissive.setHex(0x38bdf8);
        breakerMat.emissiveIntensity = 0.45 + effectiveRatio * 0.5;
      }

      terraceLight.intensity = THREE.MathUtils.damp(
        terraceLight.intensity,
        cityLit ? 9 + effectiveRatio * 10 : 5,
        3.5,
        dt
      );

      // Living City Motion: gentle standby crawl even at 0 MW, full flow when powered
      const motionScale = 0.18 + Math.min(1, effectiveRatio * 1.2) * 0.82;
      const cableU = (Math.sin(elapsed * 0.4 * motionScale) + 1) * 0.5;
      cableCar.position.copy(cableLineCurve.getPoint(cableU));
      cableCar.position.y -= 0.14;
      ferry1.position.x = -24 + ((elapsed * (0.35 + effectiveRatio * 0.85)) % 48);
      ferry2.position.x = 24 - ((elapsed * (0.3 + effectiveRatio * 0.75)) % 48);
      boatMat.emissiveIntensity = THREE.MathUtils.damp(
        boatMat.emissiveIntensity,
        0.12 + effectiveRatio * 0.75,
        3.5,
        dt
      );

      // Traffic signals (threshold 0.16) & vehicles
      const trafficOn = effectiveRatio >= 0.16;
      trafficNodes.forEach((tn) => {
        if (!trafficOn) {
          // Standby dim amber/red blink when city is low on power
          const standbyBlink = Math.sin(elapsed * 2.0 + tn.phase) > 0 ? 0.18 : 0.02;
          tn.redMat.emissiveIntensity = THREE.MathUtils.damp(tn.redMat.emissiveIntensity, standbyBlink, 6, dt);
          tn.greenMat.emissiveIntensity = THREE.MathUtils.damp(tn.greenMat.emissiveIntensity, 0.0, 6, dt);
        } else {
          const isGreen = Math.sin(elapsed * 1.4 + tn.phase) > 0;
          tn.greenMat.emissiveIntensity = THREE.MathUtils.damp(
            tn.greenMat.emissiveIntensity,
            isGreen ? 1.45 : 0.05,
            8,
            dt
          );
          tn.redMat.emissiveIntensity = THREE.MathUtils.damp(
            tn.redMat.emissiveIntensity,
            isGreen ? 0.05 : 1.45,
            8,
            dt
          );
        }
      });

      const carSpeedMul = trafficOn ? 0.45 + Math.min(1, effectiveRatio) * 0.75 : 0.14;
      carHeadMat.emissiveIntensity = THREE.MathUtils.damp(
        carHeadMat.emissiveIntensity,
        trafficOn ? 1.25 : 0.12,
        4.5,
        dt
      );
      cars.forEach((c) => {
        const span = 62;
        const pos = ((elapsed * c.speed * carSpeedMul + c.offset) % span) - span / 2;
        c.mesh.position.x = c.dir === 1 ? pos : -pos;
      });

      // Industrial Factory exhaust turbines, power coils & smokestack vapor respond to heavy load (0.65)
      const factoryActive = effectiveRatio >= 0.65;
      const fanSpeed = factoryActive ? 3.5 + Math.min(1, effectiveRatio) * 5.5 : 0;
      factoryFans.forEach((fan) => {
        fan.rotation.y += dt * fanSpeed;
      });
      factoryLoadMat.emissiveIntensity = THREE.MathUtils.damp(
        factoryLoadMat.emissiveIntensity,
        factoryActive ? 0.95 + Math.sin(elapsed * 4) * 0.25 : 0.02,
        4.5,
        dt
      );
      puffMat.opacity = THREE.MathUtils.damp(
        puffMat.opacity,
        factoryActive ? 0.45 : 0.0,
        2.5,
        dt
      );
      if (puffMat.opacity > 0.02) {
        const puffAttr = puffGeo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < puffCount; i++) {
          const stackX = i % 2 === 0 ? -1.6 : 1.6;
          const phase = (elapsed * 0.48 + i / puffCount) % 1;
          const driftX = Math.sin(elapsed * 1.3 + i) * 0.24 * phase;
          const driftZ = Math.cos(elapsed * 1.1 + i) * 0.18 * phase;
          puffAttr.setXYZ(i, stackX + driftX, 3.75 + phase * 3.1, -1.1 + driftZ);
        }
        puffAttr.needsUpdate = true;
      }

      // Urban Consumer Micro-Feeder Streams & Consumption Load Rings
      urbanMicroStreams.forEach((uz) => {
        const active = effectiveRatio >= uz.threshold;
        const zoneLoad = active
          ? THREE.MathUtils.clamp(
              0.38 + (effectiveRatio - uz.threshold) / Math.max(0.25, 1 - uz.threshold),
              0.35,
              1.15
            )
          : 0;
        const boost = flowHighlight ? 1.35 : 1.0;
        uz.stream.update(
          elapsed,
          uz.baseSpeed * (0.65 + zoneLoad * 0.8),
          zoneLoad * boost,
          cityLit && active
        );
        uz.ringMesh.visible = cityLit && active;
        uz.ringMat.emissiveIntensity = THREE.MathUtils.damp(
          uz.ringMat.emissiveIntensity,
          active ? uz.maxRingEmissive * zoneLoad * boost : 0.0,
          4.5,
          dt
        );
        if (uz.ringMesh.visible) {
          const pulse = 1 + Math.sin(elapsed * 3.2) * 0.035;
          uz.ringMesh.scale.setScalar(pulse);
        }
      });

      // Han River subtle moonlight -> vibrant city reflection
      riverMat.emissiveIntensity = THREE.MathUtils.damp(
        riverMat.emissiveIntensity,
        0.04 + effectiveRatio * 0.24,
        3.5,
        dt
      );

      // Streetlights activate FIRST (threshold 0.04) and scale smoothly with power
      const streetOn = effectiveRatio >= 0.04;
      const streetStrength = streetOn
        ? Math.min(1.6, 0.45 + effectiveRatio * 1.15)
        : 0.02;
      lampOrbMat.emissiveIntensity = THREE.MathUtils.damp(
        lampOrbMat.emissiveIntensity,
        streetStrength,
        4.5,
        dt
      );

      // Bridges respond progressively
      bridgeLightMats.forEach((b) => {
        const factor =
          effectiveRatio < b.thr
            ? 0.02
            : Math.min(1.2, 0.55 + ((effectiveRatio - b.thr) / Math.max(0.2, 1 - b.thr)) * 0.65);
        b.mat.emissiveIntensity = THREE.MathUtils.damp(
          b.mat.emissiveIntensity,
          1.35 * factor,
          4.0,
          dt
        );
        if (b.isBanpo && effectiveRatio >= b.thr) {
          b.mat.emissive.setHSL((elapsed * 0.12) % 1, 0.8, 0.52);
        }
      });

      // Progressive & reversible building / school / shop / factory / landmark activation
      litStructures.forEach(({ mat, threshold, maxEmissive, idleEmissive = 0.01 }) => {
        let targetEm = idleEmissive;
        if (effectiveRatio >= threshold) {
          const ramp = THREE.MathUtils.clamp(
            (effectiveRatio - threshold) / 0.24,
            0.38,
            1.1
          );
          targetEm = maxEmissive * ramp;
        }
        mat.emissiveIntensity = THREE.MathUtils.damp(mat.emissiveIntensity, targetEm, 3.8, dt);
      });

      // Pilot aviation beacon always gently blinks on Namsan even in low-power dark city
      const beaconPulse = Math.sin(elapsed * 2.8) > 0;
      namsanBeaconMat.emissiveIntensity = beaconPulse
        ? effectiveRatio > 0.5
          ? 1.6
          : 0.45
        : 0.08;

      // Overhead city ambient floodlights scale from dim twilight (2.5-3.0) to full urban glow
      const glowScale = effectiveRatio > 0.03 ? effectiveRatio : 0.0;
      cityGlowSouth.intensity = THREE.MathUtils.damp(cityGlowSouth.intensity, 3.5 + 58 * glowScale, 3.0, dt);
      cityGlowNorth.intensity = THREE.MathUtils.damp(cityGlowNorth.intensity, 3.5 + 52 * glowScale, 3.0, dt);
      cityGlowWest.intensity = THREE.MathUtils.damp(cityGlowWest.intensity, 2.8 + 44 * glowScale, 3.0, dt);
      cityGlowEast.intensity = THREE.MathUtils.damp(cityGlowEast.intensity, 2.8 + 44 * glowScale, 3.0, dt);
    },
  };
}
