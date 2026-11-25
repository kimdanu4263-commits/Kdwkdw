import * as THREE from 'three';
import { MaterialLibrary } from '../materials';
import { STAGES, StageId } from '../../types/energy';

export interface RoomLightingRig {
  stageId: StageId;
  stageIndex: number;
  bulbMesh: THREE.Mesh;
  bulbMat: THREE.MeshStandardMaterial;
  switchPedestal: THREE.Group;
  switchCap: THREE.Mesh;
  switchCapMat: THREE.MeshStandardMaterial;
  mastGroup: THREE.Group;
  mainLight: THREE.PointLight;
  frontFillLight: THREE.PointLight;
  surroundLight: THREE.PointLight;
  accentLight: THREE.SpotLight | null;
  targetGroup: THREE.Group | null;
}

export interface CorridorSystem {
  group: THREE.Group;
  rooms: RoomLightingRig[];
  interactiveObjects: THREE.Object3D[];
  conduitMaterials: THREE.MeshStandardMaterial[];
  registerStageGroup: (stageId: StageId, grp: THREE.Group) => void;
  update: (
    dt: number,
    elapsed: number,
    bulbLit: Record<StageId, boolean>,
    cityLit: boolean
  ) => void;
}

export function buildCorridorAndShell(mats: MaterialLibrary): CorridorSystem {
  const group = new THREE.Group();
  const rooms: RoomLightingRig[] = [];
  const interactiveObjects: THREE.Object3D[] = [];
  const conduitMaterials: THREE.MeshStandardMaterial[] = [];

  // Vast open-world ground plane spanning the Energy Valley + City Basin
  const floorMat = mats.concreteFloor.clone();
  const floorTex = floorMat.map;
  if (floorTex) {
    const clonedTex = floorTex.clone();
    clonedTex.needsUpdate = true;
    clonedTex.repeat.set(58, 58);
    floorMat.map = clonedTex;
  }
  floorMat.envMapIntensity = 0.0;
  floorMat.roughness = 0.94;

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, -60);
  floor.receiveShadow = true;
  group.add(floor);

  // Subtle Central Promenade Plaza at (0, 0.015, -20) linking to Substation & each generator pad
  const walkwayMat = new THREE.MeshStandardMaterial({
    color: 0x0b111d,
    roughness: 0.9,
    metalness: 0.1,
    envMapIntensity: 0.0,
  });

  const centralSpineCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.02, -8),
    new THREE.Vector3(0, 0.02, -26),
    new THREE.Vector3(0, 0.02, -48),
  ]);

  const makePath = (curve: THREE.CatmullRomCurve3, segments = 16) => {
    const neonMat = new THREE.MeshStandardMaterial({
      color: 0x0b1526,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.35,
      roughness: 0.45,
      metalness: 0.1,
      envMapIntensity: 0.0,
    });
    conduitMaterials.push(neonMat);

    const up = new THREE.Vector3(0, 1, 0);
    const leftPts: THREE.Vector3[] = [];
    const rightPts: THREE.Vector3[] = [];

    for (let s = 0; s <= segments; s++) {
      const t = s / segments;
      const pt = curve.getPoint(t);
      const tan = curve.getTangent(t).normalize();
      const side = new THREE.Vector3().crossVectors(tan, up).normalize();

      leftPts.push(pt.clone().addScaledVector(side, -0.95).setY(0.032));
      rightPts.push(pt.clone().addScaledVector(side, 0.95).setY(0.032));

      if (s < segments) {
        const nextPt = curve.getPoint((s + 1) / segments);
        const segLen = pt.distanceTo(nextPt) + 0.06;
        const pad = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.024, segLen), walkwayMat);
        pad.position.copy(pt).add(nextPt).multiplyScalar(0.5);
        pad.position.y = 0.012;
        pad.lookAt(nextPt.x, 0.012, nextPt.z);
        group.add(pad);
      }
    }

    const leftCurve = new THREE.CatmullRomCurve3(leftPts);
    const rightCurve = new THREE.CatmullRomCurve3(rightPts);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(leftCurve, 24, 0.04, 6, false), neonMat));
    group.add(new THREE.Mesh(new THREE.TubeGeometry(rightCurve, 24, 0.04, 6, false), neonMat));
  };

  makePath(centralSpineCurve, 18);

  // Branch walkways from central spine to each of the 6 power stations
  STAGES.forEach((stage) => {
    if (stage.index === 6) return;
    const [cx, , cz] = stage.centerPos;
    const spineZ = THREE.MathUtils.clamp(cz + 6, -45, -14);
    const branch = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.02, spineZ),
      new THREE.Vector3(cx * 0.5, 0.02, THREE.MathUtils.lerp(spineZ, cz + 3.8, 0.5)),
      new THREE.Vector3(cx, 0.02, cz + 4.0),
    ]);
    makePath(branch, 12);
  });

  // Open-map Light Masts, Facility Lighting & Toggle Switches for all 6 Power Plants
  STAGES.forEach((stage) => {
    if (stage.index === 6) return;

    const [cx, , cz] = stage.centerPos;

    const mastGroup = new THREE.Group();
    const mastPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.11, 6.4, 12),
      mats.darkIron
    );
    mastPole.position.set(cx - 6.2, 3.2, cz - 3.8);
    mastGroup.add(mastPole);

    const mastArm = new THREE.Mesh(
      new THREE.BoxGeometry(7.0, 0.12, 0.14),
      mats.darkIron
    );
    mastArm.position.set(cx - 3.1, 6.3, cz - 1.9);
    mastArm.rotation.y = -0.45;
    mastGroup.add(mastArm);

    const shade = new THREE.Mesh(
      new THREE.ConeGeometry(0.55, 0.38, 20, 1, true),
      mats.darkIron
    );
    shade.position.set(cx, 5.95, cz);
    mastGroup.add(shade);

    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.15,
      roughness: 0.35,
      envMapIntensity: 0.0,
    });

    const bulbMesh = new THREE.Mesh(new THREE.SphereGeometry(0.26, 20, 16), bulbMat);
    bulbMesh.position.set(cx, 5.7, cz);
    bulbMesh.userData = {
      interactType: 'light_bulb',
      stageId: stage.id,
      stageIndex: stage.index,
      label: `${stage.shortTitle} 시설 조명 켜기/끄기`,
    };
    mastGroup.add(bulbMesh);
    group.add(mastGroup);

    // Facility Light Switch Pedestal beside front-right of each station
    const switchPedestal = new THREE.Group();
    switchPedestal.position.set(cx + 2.8, 0, cz + 5.2);

    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.12, 1.1, 12),
      mats.darkIron
    );
    post.position.y = 0.55;
    switchPedestal.add(post);

    const box = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.42, 0.28), mats.steelBrushed);
    box.position.y = 1.2;
    box.rotation.x = -0.3;
    switchPedestal.add(box);

    const switchCapMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x22c55e,
      emissiveIntensity: 0.75,
      roughness: 0.35,
      envMapIntensity: 0.0,
    });

    const switchCap = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), switchCapMat);
    switchCap.position.set(0, 1.29, 0.14);
    switchCap.userData = {
      interactType: 'light_bulb',
      stageId: stage.id,
      stageIndex: stage.index,
      label: `${stage.shortTitle} 시설 조명 켜기 / 끄기`,
    };
    switchPedestal.add(switchCap);

    interactiveObjects.push(bulbMesh, switchCap);
    group.add(switchPedestal);

    const mainLight = new THREE.PointLight(
      stage.index === 5 ? 0xe0f2fe : 0xfff7e6,
      28,
      26,
      1.3
    );
    mainLight.position.set(cx, 5.4, cz + 0.8);
    group.add(mainLight);

    const frontFillLight = new THREE.PointLight(0xf8fafc, 12, 18, 1.4);
    frontFillLight.position.set(cx, 2.8, cz + 5.0);
    group.add(frontFillLight);

    const surroundLight = new THREE.PointLight(0xe2e8f0, 10, 42, 1.25);
    surroundLight.position.set(cx, 11.0, cz);
    group.add(surroundLight);

    let accentLight: THREE.SpotLight | null = null;
    if (stage.index === 0) {
      accentLight = new THREE.SpotLight(0xffedd5, 18, 15, Math.PI / 4, 0.7, 1.3);
      accentLight.position.set(cx, 4.8, cz + 0.5);
      accentLight.target.position.set(cx, 0.9, cz - 1.2);
      group.add(accentLight);
      group.add(accentLight.target);
    }

    rooms.push({
      stageId: stage.id,
      stageIndex: stage.index,
      bulbMesh,
      bulbMat,
      switchPedestal,
      switchCap,
      switchCapMat,
      mastGroup,
      mainLight,
      frontFillLight,
      surroundLight,
      accentLight,
      targetGroup: null,
    });
  });

  return {
    group,
    rooms,
    interactiveObjects,
    conduitMaterials,
    registerStageGroup: (stageId, grp) => {
      const rig = rooms.find((r) => r.stageId === stageId);
      if (rig) {
        rig.targetGroup = grp;
        // All 6 power plants are always visible in the open valley so users can discover & operate them
        grp.visible = true;
      }
    },
    update: (dt, elapsed, bulbLit, cityLit) => {
      rooms.forEach((rig) => {
        const isLit = bulbLit[rig.stageId];

        if (rig.targetGroup) {
          rig.targetGroup.visible = true;
        }
        rig.mastGroup.visible = true;
        rig.switchPedestal.visible = true;

        const targetMain = isLit ? (cityLit ? 46 : 34) : 2.5;
        const targetFill = isLit ? (cityLit ? 20 : 14) : 1.5;
        const targetSurround = isLit ? (cityLit ? 28 : 14) : 0.0;

        rig.mainLight.intensity = THREE.MathUtils.damp(rig.mainLight.intensity, targetMain, 5.0, dt);
        rig.frontFillLight.intensity = THREE.MathUtils.damp(
          rig.frontFillLight.intensity,
          targetFill,
          5.0,
          dt
        );
        rig.surroundLight.intensity = THREE.MathUtils.damp(
          rig.surroundLight.intensity,
          targetSurround,
          3.5,
          dt
        );

        if (rig.accentLight) {
          rig.accentLight.intensity = THREE.MathUtils.damp(
            rig.accentLight.intensity,
            isLit ? 18 : 2.0,
            5.0,
            dt
          );
        }

        rig.bulbMat.emissiveIntensity = THREE.MathUtils.damp(
          rig.bulbMat.emissiveIntensity,
          isLit ? 1.45 : 0.15,
          5.0,
          dt
        );

        if (isLit) {
          rig.bulbMat.color.setHex(0xfef9c3);
          rig.switchCapMat.color.setHex(0x22c55e);
          rig.switchCapMat.emissive.setHex(0x22c55e);
          rig.switchCapMat.emissiveIntensity = 0.75;
        } else {
          rig.bulbMat.color.setHex(0x334155);
          rig.switchCapMat.color.setHex(0xf59e0b);
          rig.switchCapMat.emissive.setHex(0xf59e0b);
          rig.switchCapMat.emissiveIntensity = 0.4 + Math.sin(elapsed * 2.5) * 0.15;
        }
      });

      conduitMaterials.forEach((mat) => {
        mat.emissiveIntensity = THREE.MathUtils.damp(
          mat.emissiveIntensity,
          cityLit ? 0.85 : 0.35,
          4.0,
          dt
        );
      });
    },
  };
}
