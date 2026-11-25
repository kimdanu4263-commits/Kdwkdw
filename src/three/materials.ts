import * as THREE from 'three';
import { ProceduralTextureSet } from '../utils/textures';

export interface MaterialLibrary {
  concreteFloor: THREE.MeshStandardMaterial;
  wallDark: THREE.MeshStandardMaterial;
  steelBrushed: THREE.MeshStandardMaterial;
  chrome: THREE.MeshStandardMaterial;
  copper: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  water: THREE.MeshStandardMaterial;
  coal: THREE.MeshStandardMaterial;
  hazard: THREE.MeshStandardMaterial;
  darkIron: THREE.MeshStandardMaterial;
  rubber: THREE.MeshStandardMaterial;
  magnetNorth: THREE.MeshStandardMaterial;
  magnetSouth: THREE.MeshStandardMaterial;
  asphalt: THREE.MeshStandardMaterial;
  ceramicWhite: THREE.MeshStandardMaterial;
  dispose: () => void;
}

export function createMaterialLibrary(
  textures: ProceduralTextureSet,
  _isSoftwareGl: boolean
): MaterialLibrary {
  // Calibrated matte/satin PBR materials without blinding specular glare
  const concreteFloor = new THREE.MeshStandardMaterial({
    map: textures.concreteFloor,
    roughness: 0.9,
    metalness: 0.04,
  });

  const wallDark = new THREE.MeshStandardMaterial({
    color: 0x1a202c,
    roughness: 0.82,
    metalness: 0.14,
  });

  const steelBrushed = new THREE.MeshStandardMaterial({
    map: textures.brushedMetal,
    color: 0x8e99a8,
    metalness: 0.62,
    roughness: 0.52,
  });

  const chrome = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    metalness: 0.72,
    roughness: 0.36,
  });

  const copper = new THREE.MeshStandardMaterial({
    map: textures.copperWire,
    color: 0xd97742,
    metalness: 0.65,
    roughness: 0.45,
  });

  const glass = new THREE.MeshStandardMaterial({
    color: 0xbfdbfe,
    metalness: 0.05,
    roughness: 0.25,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
  });

  const water = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    metalness: 0.08,
    roughness: 0.28,
    transparent: true,
    opacity: 0.82,
    side: THREE.DoubleSide,
  });

  const coal = new THREE.MeshStandardMaterial({
    map: textures.coalSurface,
    color: 0x22252b,
    roughness: 0.95,
    metalness: 0.04,
  });

  const hazard = new THREE.MeshStandardMaterial({
    map: textures.hazardStripe,
    roughness: 0.65,
    metalness: 0.1,
  });

  const darkIron = new THREE.MeshStandardMaterial({
    color: 0x232933,
    roughness: 0.72,
    metalness: 0.45,
  });

  const rubber = new THREE.MeshStandardMaterial({
    color: 0x121418,
    roughness: 0.92,
    metalness: 0.02,
  });

  const magnetNorth = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.55,
    metalness: 0.2,
  });

  const magnetSouth = new THREE.MeshStandardMaterial({
    color: 0x2563eb,
    roughness: 0.55,
    metalness: 0.2,
  });

  const asphalt = new THREE.MeshStandardMaterial({
    map: textures.asphaltRoad,
    roughness: 0.88,
    metalness: 0.05,
  });

  const ceramicWhite = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.28,
    metalness: 0.08,
  });

  const all = [
    concreteFloor,
    wallDark,
    steelBrushed,
    chrome,
    copper,
    glass,
    water,
    coal,
    hazard,
    darkIron,
    rubber,
    magnetNorth,
    magnetSouth,
    asphalt,
    ceramicWhite,
  ];

  return {
    concreteFloor,
    wallDark,
    steelBrushed,
    chrome,
    copper,
    glass,
    water,
    coal,
    hazard,
    darkIron,
    rubber,
    magnetNorth,
    magnetSouth,
    asphalt,
    ceramicWhite,
    dispose: () => {
      all.forEach((m) => m.dispose());
    },
  };
}
