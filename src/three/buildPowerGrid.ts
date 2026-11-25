import * as THREE from 'three';
import { MaterialLibrary } from './materials';
import { PlantControlState, PlantKey, STAGES } from '../types/energy';

interface StreamTrack {
  curve: THREE.CatmullRomCurve3;
  points: THREE.Points;
  mat: THREE.PointsMaterial;
  cableMat: THREE.MeshStandardMaterial;
  count: number;
  baseSize: number;
  terminalMat?: THREE.MeshStandardMaterial;
}

export interface PowerGridSystem {
  group: THREE.Group;
  substationCoreHit: THREE.Mesh;
  update: (
    dt: number,
    elapsed: number,
    plants: Record<PlantKey, PlantControlState>,
    totalMw: number,
    cityDemandMw: number,
    energyView: boolean,
    flowHighlight: boolean
  ) => void;
}

const PLANT_COLORS: Record<PlantKey, number> = {
  coil: 0x38bdf8,
  bicycle: 0xfb7185,
  hydro: 0x60a5fa,
  thermal: 0xfb923c,
  wave: 0x22d3ee,
  nuclear: 0x34d399,
};

const _tmpPt = new THREE.Vector3();

function createTransmissionPylon(mats: MaterialLibrary, height = 7.4): THREE.Group {
  const pylon = new THREE.Group();

  const legSpreadBot = 0.85;
  const legSpreadTop = 0.28;
  const corners = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ];
  const up = new THREE.Vector3(0, 1, 0);

  corners.forEach(([sx, sz]) => {
    const p1 = new THREE.Vector3(sx * legSpreadBot, 0, sz * legSpreadBot);
    const p2 = new THREE.Vector3(sx * legSpreadTop, height, sz * legSpreadTop);
    const len = p1.distanceTo(p2);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.09, len, 6), mats.steelBrushed);
    leg.position.copy(p1).add(p2).multiplyScalar(0.5);
    leg.quaternion.setFromUnitVectors(up, p2.clone().sub(p1).normalize());
    pylon.add(leg);
  });

  [1.8, 3.8, 5.6].forEach((hy) => {
    const t = hy / height;
    const w = THREE.MathUtils.lerp(legSpreadBot * 2, legSpreadTop * 2, t);
    const brace = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, w), mats.darkIron);
    brace.position.y = hy;
    pylon.add(brace);
  });

  const arm = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.16, 0.2), mats.steelBrushed);
  arm.position.y = height - 0.55;
  pylon.add(arm);

  [-1.1, 1.1].forEach((ix) => {
    const ins = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.45, 8),
      mats.ceramicWhite
    );
    ins.position.set(ix, height - 0.82, 0);
    pylon.add(ins);
  });

  const spire = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.9, 4), mats.steelBrushed);
  spire.position.y = height + 0.45;
  pylon.add(spire);

  return pylon;
}

function createParticleStream(
  curve: THREE.CatmullRomCurve3,
  count: number,
  colorHex: number,
  size: number,
  glowTexture: THREE.Texture
): { points: THREE.Points; mat: THREE.PointsMaterial } {
  const positions = new Float32Array(count * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    color: colorHex,
    map: glowTexture,
    size,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return { points, mat };
}

export function buildPowerGrid(
  mats: MaterialLibrary,
  glowTexture: THREE.Texture
): PowerGridSystem {
  const group = new THREE.Group();
  const plantStreams: { key: PlantKey; track: StreamTrack }[] = [];
  const substationStreams: StreamTrack[] = [];
  const cityFeederStreams: { threshold: number; track: StreamTrack }[] = [];

  // =========================================================================
  // 1. CENTRAL SUBSTATION SWITCHYARD at (0, 0, -51.5)
  // =========================================================================
  const subPos = new THREE.Vector3(0, 0, -51.5);
  const subGroup = new THREE.Group();
  subGroup.position.copy(subPos);
  group.add(subGroup);

  const subPad = new THREE.Mesh(new THREE.BoxGeometry(15.2, 0.28, 7.6), mats.concreteFloor);
  subPad.position.y = 0.14;
  subPad.receiveShadow = true;
  subGroup.add(subPad);

  [-5.4, 0, 5.4].forEach((gx) => {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.28, 5.0, 0.28), mats.steelBrushed);
    col.position.set(gx, 2.5, 0);
    subGroup.add(col);
  });
  const topGantryBeam = new THREE.Mesh(new THREE.BoxGeometry(11.8, 0.28, 0.34), mats.steelBrushed);
  topGantryBeam.position.set(0, 4.9, 0);
  subGroup.add(topGantryBeam);

  // South Collector Copper Busbar (from generators) & North Distribution Busbar (to city)
  const busbarMat = new THREE.MeshStandardMaterial({
    color: 0xb45309,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.05,
    metalness: 0.78,
    roughness: 0.28,
  });
  const southBusbar = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 11.0, 12), busbarMat);
  southBusbar.rotation.z = Math.PI / 2;
  southBusbar.position.set(0, 4.35, 0.45);
  subGroup.add(southBusbar);

  const northBusbar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 10.2, 12), busbarMat);
  northBusbar.rotation.z = Math.PI / 2;
  northBusbar.position.set(0, 3.9, -0.6);
  subGroup.add(northBusbar);

  // 3 Heavy Step-Down Power Transformers with energized indicator rings & internal transfer streams
  const xfmrRingMats: THREE.MeshStandardMaterial[] = [];
  [-3.6, 0, 3.6].forEach((tx) => {
    const tank = new THREE.Mesh(new THREE.BoxGeometry(1.75, 1.9, 1.45), mats.darkIron);
    tank.position.set(tx, 1.2, 0.05);
    tank.castShadow = true;
    subGroup.add(tank);

    for (let f = -2; f <= 2; f++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.4, 1.7), mats.steelBrushed);
      fin.position.set(tx + f * 0.32, 1.15, 0.05);
      subGroup.add(fin);
    }

    [-0.4, 0.4].forEach((bx) => {
      const bush = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.12, 0.95, 10),
        mats.ceramicWhite
      );
      bush.position.set(tx + bx, 2.55, 0.05);
      subGroup.add(bush);
    });

    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.04,
      roughness: 0.35,
    });
    xfmrRingMats.push(ringMat);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.045, 8, 20), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(tx, 2.22, 0.05);
    subGroup.add(ring);

    // Internal flow path: South Busbar -> Transformer Core -> North Distribution Busbar
    const subTransferCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(subPos.x + tx, 4.35, subPos.z + 0.45),
      new THREE.Vector3(subPos.x + tx, 2.65, subPos.z + 0.25),
      new THREE.Vector3(subPos.x + tx, 2.25, subPos.z + 0.05),
      new THREE.Vector3(subPos.x + tx, 3.05, subPos.z - 0.35),
      new THREE.Vector3(subPos.x + tx, 3.9, subPos.z - 0.6),
    ]);
    const transferCableMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.03,
      roughness: 0.45,
      metalness: 0.6,
    });
    group.add(
      new THREE.Mesh(new THREE.TubeGeometry(subTransferCurve, 18, 0.038, 6, false), transferCableMat)
    );
    const subCount = 16;
    const { points, mat } = createParticleStream(
      subTransferCurve,
      subCount,
      0x7dd3fc,
      0.42,
      glowTexture
    );
    group.add(points);
    substationStreams.push({
      curve: subTransferCurve,
      points,
      mat,
      cableMat: transferCableMat,
      count: subCount,
      baseSize: 0.42,
    });
  });

  // Central Substation Live Energy Core Orb (clickable to open Telemetry & Grid Control)
  const subCoreMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.1,
    roughness: 0.28,
  });
  const subCoreOrb = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 16), subCoreMat);
  subCoreOrb.position.set(0, 3.55, 0.25);
  subGroup.add(subCoreOrb);

  const subCoreHit = new THREE.Mesh(
    new THREE.SphereGeometry(0.95, 12, 10),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  subCoreHit.position.copy(subCoreOrb.position);
  subCoreHit.userData = {
    interactType: 'open_dashboard',
    label: '중앙 변전소 전력 관제 패널 열기',
  };
  subGroup.add(subCoreHit);

  const subLight = new THREE.PointLight(0x38bdf8, 0.6, 22, 1.4);
  subLight.position.set(0, 5.2, 1.2);
  subGroup.add(subLight);

  // =========================================================================
  // 2. SIX TRANSMISSION LINES: [POWER PLANT] -> [PYLON] -> [SUBSTATION]
  // =========================================================================
  const plantKeys: PlantKey[] = ['coil', 'bicycle', 'hydro', 'thermal', 'wave', 'nuclear'];

  plantKeys.forEach((key, idx) => {
    const stage = STAGES[idx];
    const colorHex = PLANT_COLORS[key];
    const startPos = new THREE.Vector3(
      stage.centerPos[0] + stage.terminalOffset[0],
      stage.terminalOffset[1],
      stage.centerPos[2] + stage.terminalOffset[2]
    );

    const busX = -4.5 + (idx / 5) * 9.0;
    const endPos = new THREE.Vector3(subPos.x + busX, 4.35, subPos.z + 0.45);

    // Step-up terminal pillar right beside each generator output
    const termH = Math.max(0.8, startPos.y - 0.1);
    const termPad = new THREE.Mesh(new THREE.BoxGeometry(0.7, termH, 0.7), mats.darkIron);
    termPad.position.set(startPos.x, termH * 0.5, startPos.z);
    group.add(termPad);

    const terminalMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      emissive: colorHex,
      emissiveIntensity: 0.08,
      roughness: 0.35,
    });
    const termRing = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.05, 8, 20), terminalMat);
    termRing.rotation.x = Math.PI / 2;
    termRing.position.set(startPos.x, startPos.y, startPos.z);
    group.add(termRing);

    const pylonGround = startPos.clone().lerp(endPos, 0.52);
    pylonGround.y = 0;
    pylonGround.x += stage.centerPos[0] >= 0 ? 1.8 : -1.8;

    const pylon = createTransmissionPylon(mats, 6.8);
    pylon.position.copy(pylonGround);
    pylon.lookAt(endPos.x, 0, endPos.z);
    group.add(pylon);

    const pylonTop = new THREE.Vector3(pylonGround.x, 6.1, pylonGround.z);
    const sag1 = startPos.clone().lerp(pylonTop, 0.5);
    sag1.y -= 0.7;
    const sag2 = pylonTop.clone().lerp(endPos, 0.5);
    sag2.y -= 0.75;

    const curve = new THREE.CatmullRomCurve3([startPos, sag1, pylonTop, sag2, endPos]);

    const cableGeo = new THREE.TubeGeometry(curve, 36, 0.048, 6, false);
    const cableMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      emissive: colorHex,
      emissiveIntensity: 0.03,
      roughness: 0.45,
      metalness: 0.6,
    });
    group.add(new THREE.Mesh(cableGeo, cableMat));

    const particleCount = 56;
    const { points, mat } = createParticleStream(
      curve,
      particleCount,
      colorHex,
      0.56,
      glowTexture
    );
    group.add(points);

    plantStreams.push({
      key,
      track: {
        curve,
        points,
        mat,
        cableMat,
        count: particleCount,
        baseSize: 0.56,
        terminalMat,
      },
    });
  });

  // =========================================================================
  // 3. FOUR NON-CROSSING DISTRIBUTION FEEDERS: [SUBSTATION] -> [CITY ZONES]
  // =========================================================================
  const feederTargets: {
    startX: number;
    end: [number, number, number];
    threshold: number;
    color: number;
  }[] = [
    // Feeder 4 (West): Industrial Factory Heavy Load (local -25.8, -126.5 -> world -25.8, -71.5)
    { startX: -4.2, end: [-25.8, 2.0, -70.0], threshold: 0.50, color: 0x34d399 },
    // Feeder 2 (West-Center): School & Traffic Signals (local -14.2, -126.5 -> world -14.2, -71.5)
    { startX: -1.8, end: [-14.2, 1.8, -70.0], threshold: 0.14, color: 0x38bdf8 },
    // Feeder 1 (Center): Streetlights & Riverside South (lights up first!)
    { startX: 0.6, end: [-4.5, 1.6, -68.5], threshold: 0.03, color: 0xfbbf24 },
    // Feeder 3 (North-East): Apartments, Commercial Shops & Gangbuk Downtown
    { startX: 3.2, end: [4.5, 2.2, -88.5], threshold: 0.28, color: 0xfde047 },
  ];

  feederTargets.forEach((f) => {
    const pStart = new THREE.Vector3(subPos.x + f.startX, 3.9, subPos.z - 0.6);
    const pEnd = new THREE.Vector3(...f.end);
    const mid = pStart.clone().lerp(pEnd, 0.48);
    mid.y = 4.6;

    const distBox = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.9, 0.75), mats.darkIron);
    distBox.position.set(pEnd.x, 0.85, pEnd.z);
    group.add(distBox);

    const curve = new THREE.CatmullRomCurve3([pStart, mid, pEnd]);
    const cableMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      emissive: f.color,
      emissiveIntensity: 0.025,
      roughness: 0.5,
      metalness: 0.5,
    });
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.042, 6, false), cableMat));

    const particleCount = 42;
    const { points, mat } = createParticleStream(curve, particleCount, f.color, 0.5, glowTexture);
    group.add(points);

    cityFeederStreams.push({
      threshold: f.threshold,
      track: {
        curve,
        points,
        mat,
        cableMat,
        count: particleCount,
        baseSize: 0.5,
      },
    });
  });

  const updateTrack = (
    dt: number,
    elapsed: number,
    track: StreamTrack,
    normFlow: number,
    energyView: boolean,
    flowHighlight: boolean
  ) => {
    const active = normFlow > 0.025;
    track.points.visible = active;

    const boost = flowHighlight ? 1.4 : 1.0;

    track.cableMat.emissiveIntensity = THREE.MathUtils.damp(
      track.cableMat.emissiveIntensity,
      active ? (0.18 + normFlow * 0.95) * boost : 0.025,
      6.0,
      dt
    );

    if (track.terminalMat) {
      track.terminalMat.emissiveIntensity = THREE.MathUtils.damp(
        track.terminalMat.emissiveIntensity,
        active ? (0.3 + normFlow * 1.35) * boost : 0.06,
        6.0,
        dt
      );
    }

    if (!active) return;

    // Dynamically scale particle count, speed, size, and brightness with generation/flow
    const visibleCount = Math.max(
      6,
      Math.min(track.count, Math.round(track.count * (0.22 + normFlow * 0.78)))
    );
    track.points.geometry.setDrawRange(0, visibleCount);

    track.mat.size =
      track.baseSize *
      (energyView ? 1.68 : 1.0) *
      (flowHighlight ? 1.22 : 1.0) *
      (0.75 + normFlow * 0.5);
    track.mat.opacity = THREE.MathUtils.clamp((0.3 + normFlow * 0.68) * boost, 0, 1);

    const speed = 0.24 + normFlow * 0.78;
    const posAttr = track.points.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < visibleCount; i++) {
      const u = (elapsed * speed + i / visibleCount) % 1;
      track.curve.getPointAt(u, _tmpPt);
      posAttr.setXYZ(i, _tmpPt.x, _tmpPt.y, _tmpPt.z);
    }
    posAttr.needsUpdate = true;
  };

  return {
    group,
    substationCoreHit: subCoreHit,
    update: (dt, elapsed, plants, totalMw, cityDemandMw, energyView, flowHighlight) => {
      const totalRatio = THREE.MathUtils.clamp(totalMw / Math.max(1, cityDemandMw), 0, 1.3);

      // 1. Power Plant -> Pylon -> Substation
      plantStreams.forEach(({ key, track }) => {
        const mw = plants[key].enabled ? plants[key].currentMw : 0;
        const maxRef =
          key === 'coil' ? 14 : key === 'bicycle' ? 18 : key === 'wave' ? 24 : 42;
        const normFlow = THREE.MathUtils.clamp(mw / maxRef, 0, 1.15);
        updateTrack(dt, elapsed, track, normFlow, energyView, flowHighlight);
      });

      // 2. Central Substation Core, Busbars & Internal Transformer Step-Down Streams
      const subBoost = flowHighlight ? 1.35 : 1.0;
      subCoreMat.emissiveIntensity = THREE.MathUtils.damp(
        subCoreMat.emissiveIntensity,
        totalRatio > 0.02 ? (0.4 + totalRatio * 1.45 + Math.sin(elapsed * 5) * 0.14) * subBoost : 0.08,
        5.0,
        dt
      );
      busbarMat.emissiveIntensity = THREE.MathUtils.damp(
        busbarMat.emissiveIntensity,
        totalRatio > 0.02 ? (0.3 + totalRatio * 0.95) * subBoost : 0.04,
        5.0,
        dt
      );
      xfmrRingMats.forEach((rm) => {
        rm.emissiveIntensity = THREE.MathUtils.damp(
          rm.emissiveIntensity,
          totalRatio > 0.02 ? (0.28 + totalRatio * 1.1) * subBoost : 0.04,
          5.0,
          dt
        );
      });
      subLight.intensity = THREE.MathUtils.damp(
        subLight.intensity,
        totalRatio > 0.02 ? 3.2 + totalRatio * 13 : 0.6,
        4.0,
        dt
      );

      substationStreams.forEach((track) => {
        updateTrack(dt, elapsed, track, totalRatio, energyView, flowHighlight);
      });

      // 3. Substation -> City Consumption Zone Feeders
      cityFeederStreams.forEach(({ threshold, track }) => {
        const feederNorm =
          totalRatio <= 0.02
            ? 0
            : totalRatio >= threshold
            ? THREE.MathUtils.clamp(
                (totalRatio - threshold * 0.45) / (1 - threshold * 0.45),
                0.22,
                1.15
              )
            : THREE.MathUtils.clamp((totalRatio / Math.max(0.05, threshold)) * 0.28, 0, 0.28);
        updateTrack(dt, elapsed, track, feederNorm, energyView, flowHighlight);
      });
    },
  };
}
